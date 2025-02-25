import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

interface ChatMessage {
  type: 'message' | 'join' | 'leave' | 'history' | 'delete';
  userId: number;
  username: string;
  content: string;
  propertyId: number;
  timestamp: number;
  messages?: ChatMessage[]; // For history type
}

export function useWebSocket(propertyId: number) {
  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!user || !propertyId) return;

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

    console.log('Connecting to WebSocket at:', wsUrl);

    // Use native WebSocket to ensure cookie passing
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket Connected');
      reconnectAttempts.current = 0;
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
        const data = event.data;
        const message = typeof data === 'string' ? JSON.parse(data) : data;

        if (!message || !message.type) {
          console.warn('Received invalid message format:', message);
          return;
        }

        console.log('Received message:', message);

        // Post message to window event system if it's relevant to this property
        if (message.propertyId === propertyId || message.type === 'history') {
          window.postMessage(message, window.location.origin);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
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
      wsRef.current = null;

      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        console.log(`Reconnecting attempt ${reconnectAttempts.current}/${maxReconnectAttempts}...`);

        // Clear any existing reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        // Set new reconnection timeout with exponential backoff
        reconnectTimeoutRef.current = setTimeout(() => {
          if (wsRef.current === null) { // Only reconnect if still disconnected
            connect();
          }
        }, 5000 * Math.min(reconnectAttempts.current, 3)); // Exponential backoff up to 15s
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
      // Clear any pending reconnection attempt
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

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
    (content: string, type: 'message' | 'delete' = 'message', timestamp?: number | string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !user || !propertyId) {
        console.warn('Cannot send message: WebSocket not connected or missing user/propertyId');
        return;
      }

      const message: ChatMessage = {
        type,
        userId: user.id,
        username: user.username,
        content,
        propertyId,
        timestamp: timestamp ? Number(new Date(timestamp)) : Date.now(),
      };

      console.log('Sending message:', message);
      wsRef.current.send(JSON.stringify(message));
    },
    [user, propertyId]
  );

  return { sendMessage };
}