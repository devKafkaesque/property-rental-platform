import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { log } from './vite';
import { ChatMessage } from './models/chat';
import { parse } from 'cookie';
import session from 'express-session';
import { storage } from './storage';

interface ChatClient {
  ws: WebSocket;
  userId: number;
  username: string;
  role: 'tenant' | 'landowner';
}

interface ChatMessageData {
  type: 'message' | 'join' | 'leave' | 'history' | 'delete';
  userId: number;
  username: string;
  content: string;
  propertyId: number;
  timestamp: number | string;
  role?: 'tenant' | 'landowner';
  messages?: typeof ChatMessage[];
}

class ChatServer {
  private clients: Map<number, ChatClient> = new Map();
  private propertyGroups: Map<number, Set<number>> = new Map();

  constructor(server: Server) {
    const wss = new WebSocketServer({
      server,
      path: '/ws/chat',
      clientTracking: true,
      verifyClient: async (info, callback) => {
        try {
          // Skip verification for Vite dev server websockets
          if (info.req.url?.startsWith('/__vite')) {
            log('Allowing Vite WebSocket connection');
            return callback(true);
          }

          log('WebSocket connection attempt:', {
            url: info.req.url,
            headers: info.req.headers,
            cookie: info.req.headers.cookie
          });

          if (!info.req.headers.cookie) {
            log('No cookies found in headers');
            return callback(false, 401, 'No session cookie');
          }

          const cookies = parse(info.req.headers.cookie);
          log('Parsed cookies:', cookies);

          const sessionId = cookies['connect.sid'];
          if (!sessionId) {
            log('Session ID not found in cookies');
            return callback(false, 401, 'Session not found');
          }

          // Extract the raw session ID from signed cookie
          const rawSessionId = sessionId.substring(2).split('.')[0];
          log('Processing session ID:', rawSessionId);

          const sessionStore = storage.sessionStore as session.Store;
          sessionStore.get(rawSessionId, async (err, sessionData) => {
            if (err) {
              log('Session store error:', err);
              return callback(false, 500, 'Session store error');
            }

            log('Retrieved session data:', sessionData);

            if (!sessionData?.passport?.user) {
              log('Invalid session data:', sessionData);
              return callback(false, 401, 'Invalid session');
            }

            try {
              const userId = Number(sessionData.passport.user);
              log('Attempting to fetch user:', userId);

              const user = await storage.getUser(userId);
              if (!user) {
                log('User not found:', userId);
                return callback(false, 401, 'User not found');
              }

              log('User authenticated:', {
                id: user.id,
                username: user.username,
                role: user.role
              });

              (info.req as any).user = {
                ...user,
                id: Number(user.id)
              };

              callback(true);
            } catch (error) {
              log('User validation error:', error);
              callback(false, 500, 'Internal server error');
            }
          });
        } catch (error) {
          log('WebSocket verification error:', error);
          callback(false, 500, 'Internal server error');
        }
      }
    });

    wss.on('connection', async (ws: WebSocket, req: any) => {
      // Skip handling Vite WebSocket connections
      if (req.url?.startsWith('/__vite')) {
        log('Ignoring Vite WebSocket connection');
        return;
      }

      if (!req.user) {
        log('No user data in WebSocket connection');
        ws.close(1008, 'Authentication required');
        return;
      }

      const userId = Number(req.user.id);
      log('WebSocket connection established:', { userId, role: req.user.role });

      this.handleConnection(ws, req.user);

      ws.on('message', async (data: string) => {
        try {
          const message = JSON.parse(data) as ChatMessageData;
          log('Received message:', {
            type: message.type,
            userId: message.userId,
            propertyId: message.propertyId
          });

          // Ensure message userId matches authenticated user
          if (message.userId !== userId) {
            log('User ID mismatch:', {
              messageUserId: message.userId,
              authenticatedUserId: userId
            });
            ws.close(1008, 'Invalid user ID');
            return;
          }

          await this.handleMessage(ws, message);
        } catch (error) {
          log('Message handling error:', error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', content: 'Failed to process message' }));
          }
        }
      });

      ws.on('close', () => {
        log('Connection closed:', userId);
        this.handleDisconnect(ws);
      });

      // Setup ping/pong
      (ws as any).isAlive = true;
      ws.on('pong', () => {
        (ws as any).isAlive = true;
      });
    });

    // Heartbeat check
    const interval = setInterval(() => {
      wss.clients.forEach((ws) => {
        if ((ws as any).isAlive === false) {
          log('Terminating inactive connection');
          return ws.terminate();
        }
        (ws as any).isAlive = false;
        ws.ping();
      });
    }, 30000);

    wss.on('close', () => {
      clearInterval(interval);
    });
  }

  private handleConnection(ws: WebSocket, user: any) {
    const client: ChatClient = {
      ws,
      userId: user.id,
      username: user.username,
      role: user.role,
    };
    this.clients.set(user.id, client);
  }

  private async handleMessage(ws: WebSocket, message: ChatMessageData) {
    try {
      if (!message.type || !message.userId || !message.username || !message.propertyId) {
        log('Invalid message format:', message);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'error', content: 'Missing required fields' }));
        }
        return;
      }

      switch (message.type) {
        case 'join':
          await this.handleJoin(ws, message as ChatMessageData & { role: 'tenant' | 'landowner' });
          break;
        case 'message':
          await this.handleChatMessage(message);
          break;
        case 'leave':
          await this.handleLeave(message);
          break;
        case 'delete':
          await this.handleDeleteMessage(message);
          break;
      }
    } catch (error) {
      log('Error in handleMessage:', error instanceof Error ? error.message : 'Unknown error');
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', content: 'Failed to process message' }));
      }
    }
  }

  private async handleJoin(ws: WebSocket, message: ChatMessageData & { role: 'tenant' | 'landowner' }) {
    try {
      // Add user to property group
      if (!this.propertyGroups.has(message.propertyId)) {
        this.propertyGroups.set(message.propertyId, new Set());
      }
      this.propertyGroups.get(message.propertyId)!.add(message.userId);

      // Load chat history
      const previousMessages = await ChatMessage.find({ propertyId: message.propertyId })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'history',
          messages: previousMessages.reverse()
        }));
      }

      // Create and save join message
      const joinMessage = new ChatMessage({
        type: 'join',
        userId: message.userId,
        username: message.username,
        content: `${message.username} joined the chat`,
        propertyId: message.propertyId,
        timestamp: new Date()
      });
      await joinMessage.save();

      // Broadcast join message
      this.broadcastToPropertyGroup({
        type: 'join',
        userId: message.userId,
        username: message.username,
        content: `${message.username} joined the chat`,
        propertyId: message.propertyId,
        timestamp: joinMessage.timestamp
      });
    } catch (error) {
      log('Error in handleJoin:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async handleChatMessage(message: ChatMessageData) {
    try {
      const chatMessage = new ChatMessage({
        type: 'message',
        userId: message.userId,
        username: message.username,
        content: message.content,
        propertyId: message.propertyId,
        timestamp: new Date()
      });
      await chatMessage.save();

      this.broadcastToPropertyGroup({
        ...message,
        timestamp: chatMessage.timestamp
      });
    } catch (error) {
      log('Error in handleChatMessage:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async handleDeleteMessage(message: ChatMessageData) {
    try {
      const timestamp = new Date(message.timestamp);

      const originalMessage = await ChatMessage.findOneAndUpdate(
        {
          propertyId: message.propertyId,
          userId: message.userId,
          timestamp: timestamp,
          type: 'message'
        },
        {
          $set: {
            isDeleted: true,
            content: 'This message was deleted'
          }
        }
      );

      if (!originalMessage) {
        log('Message not found for deletion');
        return;
      }

      this.broadcastToPropertyGroup({
        type: 'delete',
        userId: message.userId,
        username: message.username,
        content: 'This message was deleted',
        propertyId: message.propertyId,
        timestamp: originalMessage.timestamp
      });
    } catch (error) {
      log('Error in handleDeleteMessage:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async handleLeave(message: ChatMessageData) {
    try {
      if (this.propertyGroups.has(message.propertyId)) {
        this.propertyGroups.get(message.propertyId)!.delete(message.userId);
        this.clients.delete(message.userId);

        const leaveMessage = new ChatMessage({
          type: 'leave',
          userId: message.userId,
          username: message.username,
          content: `${message.username} left the chat`,
          propertyId: message.propertyId,
          timestamp: new Date()
        });
        await leaveMessage.save();

        this.broadcastToPropertyGroup({
          type: 'leave',
          userId: message.userId,
          username: message.username,
          content: `${message.username} left the chat`,
          propertyId: message.propertyId,
          timestamp: leaveMessage.timestamp
        });
      }
    } catch (error) {
      log('Error in handleLeave:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private handleDisconnect(ws: WebSocket) {
    for (const [userId, client] of this.clients.entries()) {
      if (client.ws === ws) {
        log('Client disconnected:', userId);
        this.clients.delete(userId);
        for (const [propertyId, members] of this.propertyGroups.entries()) {
          if (members.has(userId)) {
            members.delete(userId);
          }
        }
        break;
      }
    }
  }

  private broadcastToPropertyGroup(message: ChatMessageData) {
    if (!this.propertyGroups.has(message.propertyId)) return;

    const members = this.propertyGroups.get(message.propertyId)!;
    const messageStr = JSON.stringify(message);

    log('Broadcasting message:', {
      type: message.type,
      propertyId: message.propertyId,
      receivers: Array.from(members),
      activeClients: Array.from(this.clients.keys())
    });

    members.forEach(userId => {
      const client = this.clients.get(userId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
          log('Message sent to:', { userId, role: client.role });
        } catch (error) {
          log('Failed to send message to client:', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });
  }
}

export function setupWebSocketServer(server: Server) {
  return new ChatServer(server);
}