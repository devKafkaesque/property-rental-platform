import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { log } from './vite';
import { ChatMessage } from './models/chat';
import { parse } from 'cookie';

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
  messages?: typeof ChatMessage[]; // For history type
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
          // Log connection attempt details
          log('WebSocket connection attempt:', {
            url: info.req.url,
            headers: info.req.headers,
            origin: info.origin,
            secure: info.req.socket.encrypted,
            cookies: info.req.headers.cookie ? parse(info.req.headers.cookie) : {}
          });

          // For now, allow all connections for debugging
          callback(true);
        } catch (error) {
          log('WebSocket connection error:', error instanceof Error ? error.message : 'Unknown error');
          callback(false, 403, 'Unauthorized');
        }
      }
    });

    wss.on('connection', async (ws: WebSocket) => {
      log('New WebSocket connection established');

      ws.on('message', async (data: string) => {
        try {
          const message = JSON.parse(data) as ChatMessageData;
          log('Received message:', {
            type: message.type,
            userId: message.userId,
            propertyId: message.propertyId,
            timestamp: message.timestamp
          });
          await this.handleMessage(ws, message);
        } catch (error) {
          log('Error handling message:', error instanceof Error ? error.message : 'Unknown error');
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'error',
              content: 'Failed to process message'
            }));
          }
        }
      });

      ws.on('error', (error) => {
        log('WebSocket error:', error instanceof Error ? error.message : 'Unknown error');
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      // Add ping/pong for connection health check
      (ws as any).isAlive = true;
      ws.on('pong', () => {
        (ws as any).isAlive = true;
      });
    });

    // Heartbeat to check connection health
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
      const existingClient = this.clients.get(message.userId);
      if (existingClient) {
        if (existingClient.ws.readyState === WebSocket.OPEN) {
          log('Client already connected, skipping join');
          return;
        }
        this.clients.delete(message.userId);
      }

      const client: ChatClient = {
        ws,
        userId: message.userId,
        username: message.username,
        role: message.role
      };

      this.clients.set(message.userId, client);

      if (!this.propertyGroups.has(message.propertyId)) {
        this.propertyGroups.set(message.propertyId, new Set());
      }
      this.propertyGroups.get(message.propertyId)!.add(message.userId);

      // Load and send chat history
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

      // Save join message
      const joinMessage = new ChatMessage({
        type: 'join',
        userId: message.userId,
        username: message.username,
        content: `${message.username} joined the chat`,
        propertyId: message.propertyId,
        timestamp: new Date()
      });
      await joinMessage.save();

      // Broadcast join
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

      // Find and update the message
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

      // Broadcast deletion
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