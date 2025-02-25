import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { log } from './vite';

interface ChatClient {
  ws: WebSocket;
  userId: number;
  username: string;
  role: 'tenant' | 'landowner';
}

interface ChatMessage {
  type: 'message' | 'join' | 'leave';
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
      perMessageDeflate: false // Disable per-message deflate to avoid conflicts
    });

    wss.on('connection', (ws: WebSocket) => {
      log('New WebSocket connection');

      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data) as ChatMessage;
          this.handleMessage(ws, message);
        } catch (error) {
          log('Error handling message:', error);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });
    });
  }

  private handleMessage(ws: WebSocket, message: ChatMessage) {
    switch (message.type) {
      case 'join':
        this.handleJoin(ws, message);
        break;
      case 'message':
        this.broadcastToPropertyGroup(message);
        break;
      case 'leave':
        this.handleLeave(message);
        break;
    }
  }

  private handleJoin(ws: WebSocket, message: ChatMessage & { role: 'tenant' | 'landowner' }) {
    const client: ChatClient = {
      ws,
      userId: message.userId,
      username: message.username,
      role: message.role
    };

    this.clients.set(message.userId, client);

    // Add to property-specific group
    if (!this.propertyGroups.has(message.propertyId)) {
      this.propertyGroups.set(message.propertyId, new Set());
    }
    this.propertyGroups.get(message.propertyId)!.add(message.userId);

    // Notify group about new member
    this.broadcastToPropertyGroup({
      type: 'join',
      userId: message.userId,
      username: message.username,
      content: `${message.username} (${message.role}) joined the chat`,
      propertyId: message.propertyId,
      timestamp: Date.now()
    });
  }

  private handleLeave(message: ChatMessage) {
    if (this.propertyGroups.has(message.propertyId)) {
      this.propertyGroups.get(message.propertyId)!.delete(message.userId);

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
  }

  private handleDisconnect(ws: WebSocket) {
    let disconnectedClient: ChatClient | undefined;

    for (const [userId, client] of this.clients) {
      if (client.ws === ws) {
        disconnectedClient = client;
        this.clients.delete(userId);
        break;
      }
    }

    if (disconnectedClient) {
      // Remove user from all property groups
      for (const [propertyId, members] of this.propertyGroups) {
        if (members.has(disconnectedClient.userId)) {
          members.delete(disconnectedClient.userId);
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

  private broadcastToPropertyGroup(message: ChatMessage) {
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