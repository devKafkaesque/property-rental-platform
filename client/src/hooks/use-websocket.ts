import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

interface ChatMessage {
  type: 'message' | 'join' | 'leave' | 'history' | 'delete';
  userId: number;
  username: string;
  content: string;
  propertyId: number;
  timestamp: number | string;
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

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/chat`;

      console.log('Attempting WebSocket connection to:', wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connection established');
        reconnectAttempts.current = 0;

        // Send join message
        ws.send(JSON.stringify({
          type: 'join',
          userId: user.id,
          username: user.username,
          role: user.role,
          propertyId,
          content: '',
          timestamp: Date.now()
        }));
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

          // Post message to window event system
          window.postMessage(message, window.location.origin);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        wsRef.current = null;

        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          console.log(`Attempting reconnection ${reconnectAttempts.current}/${maxReconnectAttempts}`);

          // Clear any existing reconnection timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          // Exponential backoff with jitter
          const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          const jitter = Math.random() * 1000;
          const delay = backoffTime + jitter;

          reconnectTimeoutRef.current = setTimeout(() => {
            if (wsRef.current === null) {
              connect();
            }
          }, delay);
        } else {
          console.log('Maximum reconnection attempts reached');
          toast({
            title: 'Connection Lost',
            description: 'Unable to connect to chat. Please refresh the page.',
            variant: 'destructive'
          });
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to establish chat connection. Please try again.',
        variant: 'destructive'
      });
    }

    return () => {
      // Clear any pending reconnection attempt
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Send leave message and close connection
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'leave',
          userId: user.id,
          username: user.username,
          propertyId,
          content: '',
          timestamp: Date.now()
        }));
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

  const sendMessage = useCallback((content: string, type: 'message' | 'delete' = 'message', timestamp?: number | string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !user || !propertyId) {
      console.warn('Cannot send message: WebSocket not connected or missing user/propertyId');
      return;
    }

    try {
      const message: ChatMessage = {
        type,
        userId: user.id,
        username: user.username,
        content,
        propertyId,
        timestamp: timestamp || Date.now()
      };

      console.log('Sending message:', message);
      wsRef.current.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    }
  }, [user, propertyId, toast]);

  return { sendMessage };
}