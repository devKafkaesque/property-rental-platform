import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

interface ChatMessage {
  type: 'message' | 'join' | 'leave';
  userId: number;
  username: string;
  content: string;
  groupId?: string;
  timestamp: number;
}

export function useWebSocket(groupId?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = window.location.port || '5000';
    const wsUrl = `${protocol}//${hostname}:${port}/ws/chat`;

    console.log('Connecting to WebSocket at:', wsUrl); // Debug log

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket Connected');
      if (groupId) {
        ws.send(JSON.stringify({
          type: 'join',
          userId: user.id,
          username: user.username,
          groupId,
          content: '',
          timestamp: Date.now()
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ChatMessage;
        // Handle incoming messages - this will be customized by the component using the hook
        console.log('Received message:', message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to chat server',
        variant: 'destructive'
      });
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
      // Attempt to reconnect after a delay
      setTimeout(connect, 5000);
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        if (groupId) {
          wsRef.current.send(JSON.stringify({
            type: 'leave',
            userId: user.id,
            username: user.username,
            groupId,
            content: '',
            timestamp: Date.now()
          }));
        }
        wsRef.current.close();
      }
    };
  }, [user, groupId, toast]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [connect]);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || !user || !groupId) return;

    const message: ChatMessage = {
      type: 'message',
      userId: user.id,
      username: user.username,
      content,
      groupId,
      timestamp: Date.now()
    };

    wsRef.current.send(JSON.stringify(message));
  }, [user, groupId]);

  return { sendMessage };
}