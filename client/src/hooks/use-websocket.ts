import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

interface ChatMessage {
  type: 'message' | 'join' | 'leave';
  userId: number;
  username: string;
  content: string;
  propertyId: number;
  timestamp: number;
}

export function useWebSocket(propertyId: number) {
  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!user || !propertyId) return;

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use current window location for WebSocket connection
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

    console.log('Connecting to WebSocket at:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket Connected');
      reconnectAttempts.current = 0; // Reset on successful connection
      ws.send(
        JSON.stringify({
          type: 'join',
          userId: user.id,
          username: user.username,
          role: user.role,
          propertyId,
          content: '',
          timestamp: Date.now(),
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
        // Broadcast the message to the window so the ChatWindow component can handle it
        window.postMessage(message, window.location.origin);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to chat server',
        variant: 'destructive',
      });
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        console.log(`Reconnecting attempt ${reconnectAttempts.current}/${maxReconnectAttempts}...`);
        setTimeout(connect, 5000); // Reconnect after 5s
      } else {
        console.log('Max reconnect attempts reached. Giving up.');
        toast({
          title: 'Chat Disconnected',
          description: 'Unable to reconnect to the chat server.',
          variant: 'destructive',
        });
      }
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'leave',
            userId: user.id,
            username: user.username,
            propertyId,
            content: '',
            timestamp: Date.now(),
          })
        );
        wsRef.current.close();
      }
    };
  }, [user, propertyId, toast]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [connect]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !user || !propertyId) {
        console.warn('Cannot send message: WebSocket not connected or missing user/propertyId');
        return;
      }

      const message: ChatMessage = {
        type: 'message',
        userId: user.id,
        username: user.username,
        content,
        propertyId,
        timestamp: Date.now(),
      };

      wsRef.current.send(JSON.stringify(message));
    },
    [user, propertyId]
  );

  return { sendMessage };
}