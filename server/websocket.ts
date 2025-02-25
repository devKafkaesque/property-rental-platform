import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { log } from './vite';
import { ChatMessage } from './models/chat';

interface ChatClient {
  ws: WebSocket;
  userId: number;
  username: string;
  role: 'tenant' | 'landowner';
}

interface ChatMessageData {
  type: 'message' | 'join' | 'leave' | 'history';
  userId: number;
  username: string;
  content: string;
  propertyId: number;
  timestamp: number;
}

class ChatServer {
  private clients: Map<number, ChatClient> = new Map();
  private propertyGroups: Map<number, Set<number>> = new Map();

  constructor(server: Server) {
    const wss = new WebSocketServer({ 
      server,
      path: '/ws/chat',
      perMessageDeflate: false
    });

    wss.on('connection', (ws: WebSocket) => {
      log('New WebSocket connection');

      ws.on('message', async (data: string) => {
        try {
          const message = JSON.parse(data) as ChatMessageData;
          await this.handleMessage(ws, message);
        } catch (error) {
          log('Error handling message:', error instanceof Error ? error.message : 'Unknown error');
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
          }
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        log('WebSocket error:', error instanceof Error ? error.message : 'Unknown error');
      });
    });

    wss.on('error', (error) => {
      log('WebSocket server error:', error instanceof Error ? error.message : 'Unknown error');
    });
  }

  private async handleMessage(ws: WebSocket, message: ChatMessageData & { role?: 'tenant' | 'landowner' }) {
    try {
      if (!message.type || !message.userId || !message.username || !message.propertyId) {
        log('Invalid message format:', message);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'error', message: 'Missing required fields' }));
        }
        return;
      }

      switch (message.type) {
        case 'join':
          if (!message.role) {
            log('Error: Role not provided in join message');
            return;
          }
          await this.handleJoin(ws, { ...message, role: message.role });
          break;
        case 'message':
          await this.handleChatMessage(message);
          break;
        case 'leave':
          await this.handleLeave(message);
          break;
      }
    } catch (error) {
      log('Error in handleMessage:', error instanceof Error ? error.message : 'Unknown error');
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
      }
    }
  }

  private async handleJoin(ws: WebSocket, message: ChatMessageData & { role: 'tenant' | 'landowner' }) {
    try {
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

      // Save join message to MongoDB
      await new ChatMessage({
        type: 'join',
        userId: message.userId,
        username: message.username,
        content: `${message.username} (${message.role}) joined the chat`,
        propertyId: message.propertyId,
        timestamp: new Date()
      }).save();

      // Load and send previous messages
      const previousMessages = await ChatMessage.find({ propertyId: message.propertyId })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'history',
          messages: previousMessages.reverse()
        }));
      }

      // Notify others about the new member
      this.broadcastToPropertyGroup({
        type: 'join',
        userId: message.userId,
        username: message.username,
        content: `${message.username} (${message.role}) joined the chat`,
        propertyId: message.propertyId,
        timestamp: Date.now()
      });
    } catch (error) {
      log('Error in handleJoin:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async handleChatMessage(message: ChatMessageData) {
    try {
      // Save message to MongoDB
      await new ChatMessage({
        type: 'message',
        userId: message.userId,
        username: message.username,
        content: message.content,
        propertyId: message.propertyId,
        timestamp: new Date()
      }).save();

      // Broadcast message to property group
      this.broadcastToPropertyGroup(message);
    } catch (error) {
      log('Error in handleChatMessage:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async handleLeave(message: ChatMessageData) {
    try {
      if (this.propertyGroups.has(message.propertyId)) {
        this.propertyGroups.get(message.propertyId)!.delete(message.userId);

        // Save leave message to MongoDB
        await new ChatMessage({
          type: 'leave',
          userId: message.userId,
          username: message.username,
          content: `${message.username} left the chat`,
          propertyId: message.propertyId,
          timestamp: new Date()
        }).save();

        // Notify group about member leaving
        this.broadcastToPropertyGroup(message);
      }
    } catch (error) {
      log('Error in handleLeave:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private handleDisconnect(ws: WebSocket) {
    let disconnectedClient: ChatClient | undefined;

    for (const [userId, client] of this.clients.entries()) {
      if (client.ws === ws) {
        disconnectedClient = client;
        this.clients.delete(userId);
        break;
      }
    }

    if (disconnectedClient) {
      for (const [propertyId, members] of this.propertyGroups.entries()) {
        if (members.has(disconnectedClient.userId)) {
          members.delete(disconnectedClient.userId);

          // Don't save disconnect messages to avoid cluttering the history
          this.broadcastToPropertyGroup({
            type: 'leave',
            userId: disconnectedClient.userId,
            username: disconnectedClient.username,
            content: `${disconnectedClient.username} disconnected`,
            propertyId,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  private broadcastToPropertyGroup(message: ChatMessageData) {
    if (!this.propertyGroups.has(message.propertyId)) return;

    const members = this.propertyGroups.get(message.propertyId)!;
    const messageStr = JSON.stringify(message);

    for (const userId of members) {
      const client = this.clients.get(userId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    }
  }
}

export function setupWebSocketServer(server: Server) {
  return new ChatServer(server);
}