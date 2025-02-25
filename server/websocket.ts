import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { log } from './vite';
import { ChatMessage } from './models/chat';
import { storage } from './storage';
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
  messages?: typeof ChatMessage[]; // For history type
}

class ChatServer {
  private clients: Map<number, ChatClient> = new Map();
  private propertyGroups: Map<number, Set<number>> = new Map();

  constructor(server: Server) {
    const wss = new WebSocketServer({ 
      server,
      path: '/ws/chat',
      perMessageDeflate: false,
      verifyClient: async (info, callback) => {
        try {
          // Log headers for debugging
          log('WebSocket connection headers:', info.req.headers);
          const cookies = parse(info.req.headers.cookie || '');
          log('Parsed cookies:', cookies);

          // Temporarily allow all connections for debugging
          callback(true);
        } catch (error) {
          log('WebSocket authentication error:', error instanceof Error ? error.message : 'Unknown error');
          callback(false, 500, 'Internal server error');
        }
      }
    });

    wss.on('connection', async (ws: WebSocket, req: any) => {
      log('New WebSocket connection attempt');

      ws.on('message', async (data: string) => {
        try {
          const message = JSON.parse(data) as ChatMessageData;
          await this.handleMessage(ws, message);
        } catch (error) {
          log('Error parsing message:', error instanceof Error ? error.message : 'Unknown error');
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

      // Log received message for debugging
      log('Handling message:', {
        type: message.type,
        userId: message.userId,
        propertyId: message.propertyId,
        timestamp: message.timestamp
      });

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
        case 'delete':
          await this.handleDeleteMessage(message);
          break;
      }
    } catch (error) {
      log('Error in handleMessage:', error instanceof Error ? error.message : 'Unknown error');
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
      }
    }
  }

  private async handleDeleteMessage(message: ChatMessageData) {
    try {
      const timestamp = new Date(message.timestamp);
      log('Looking for message to delete:', {
        propertyId: message.propertyId,
        userId: message.userId,
        timestamp: timestamp
      });

      // Find the original message
      const originalMessage = await ChatMessage.findOne({ 
        propertyId: message.propertyId,
        userId: message.userId,
        type: 'message',
        timestamp: timestamp
      });

      if (!originalMessage) {
        log('Message not found for deletion:', {
          propertyId: message.propertyId,
          userId: message.userId,
          timestamp: timestamp
        });
        if (message.userId && this.clients.get(message.userId)) {
          this.clients.get(message.userId)!.ws.send(JSON.stringify({
            type: 'error',
            content: 'Message not found or unauthorized to delete'
          }));
        }
        return;
      }

      log('Found message to delete:', originalMessage);

      // Update message in MongoDB
      await ChatMessage.findOneAndUpdate(
        { _id: originalMessage._id },
        { 
          $set: { 
            isDeleted: true,
            content: 'This message was deleted'
          } 
        }
      );

      // Broadcast deletion to property group
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
      if (message.userId && this.clients.get(message.userId)) {
        this.clients.get(message.userId)!.ws.send(JSON.stringify({
          type: 'error',
          content: 'Failed to delete message'
        }));
      }
      throw error;
    }
  }

  private async handleJoin(ws: WebSocket, message: ChatMessageData & { role: 'tenant' | 'landowner' }) {
    try {
      // Check if client is already connected
      const existingClient = this.clients.get(message.userId);
      if (existingClient) {
        if (existingClient.ws.readyState === WebSocket.OPEN) {
          // Don't create duplicate connection if one exists
          return;
        } else {
          // Clean up old connection
          this.clients.delete(message.userId);
        }
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

      // Load and send previous messages first
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

      // Save join message to MongoDB
      await new ChatMessage({
        type: 'join',
        userId: message.userId,
        username: message.username,
        content: `${message.username} (${message.role}) joined the chat`,
        propertyId: message.propertyId,
        timestamp: new Date()
      }).save();

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
        this.clients.delete(message.userId);

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
        this.broadcastToPropertyGroup({
          type: 'leave',
          userId: message.userId,
          username: message.username,
          content: `${message.username} left the chat`,
          propertyId: message.propertyId,
          timestamp: Date.now()
        });
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
          // Don't send disconnect messages as reconnection will handle this
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