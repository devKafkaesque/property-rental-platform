import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { log } from './vite';

interface ChatClient {
  ws: WebSocket;
  userId: number;
  username: string;
}

interface ChatMessage {
  type: 'message' | 'join' | 'leave';
  userId: number;
  username: string;
  content: string;
  groupId?: string;
  timestamp: number;
}

class ChatServer {
  private clients: Map<number, ChatClient> = new Map();
  private groups: Map<string, Set<number>> = new Map();

  constructor(server: Server) {
    const wss = new WebSocketServer({ server, path: '/ws/chat' }); // Changed path to avoid conflict with Vite

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
        this.broadcastToGroup(message);
        break;
      case 'leave':
        this.handleLeave(message);
        break;
    }
  }

  private handleJoin(ws: WebSocket, message: ChatMessage) {
    const client: ChatClient = {
      ws,
      userId: message.userId,
      username: message.username
    };

    this.clients.set(message.userId, client);

    if (message.groupId) {
      if (!this.groups.has(message.groupId)) {
        this.groups.set(message.groupId, new Set());
      }
      this.groups.get(message.groupId)!.add(message.userId);

      // Notify group about new member
      this.broadcastToGroup({
        type: 'join',
        userId: message.userId,
        username: message.username,
        content: `${message.username} joined the group`,
        groupId: message.groupId,
        timestamp: Date.now()
      });
    }
  }

  private handleLeave(message: ChatMessage) {
    if (message.groupId && this.groups.has(message.groupId)) {
      this.groups.get(message.groupId)!.delete(message.userId);

      // Notify group about member leaving
      this.broadcastToGroup({
        type: 'leave',
        userId: message.userId,
        username: message.username,
        content: `${message.username} left the group`,
        groupId: message.groupId,
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
      // Remove user from all groups
      for (const [groupId, members] of this.groups) {
        if (members.has(disconnectedClient.userId)) {
          members.delete(disconnectedClient.userId);
          this.broadcastToGroup({
            type: 'leave',
            userId: disconnectedClient.userId,
            username: disconnectedClient.username,
            content: `${disconnectedClient.username} disconnected`,
            groupId,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  private broadcastToGroup(message: ChatMessage) {
    if (!message.groupId || !this.groups.has(message.groupId)) return;

    const members = this.groups.get(message.groupId)!;
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