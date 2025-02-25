import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizontal, UserCircle2 } from "lucide-react";

interface ChatMessage {
  type: 'message' | 'join' | 'leave' | 'history';
  userId: number;
  username: string;
  content: string;
  propertyId: number;
  timestamp: number | string;
  messages?: ChatMessage[]; // For history type
}

interface ChatWindowProps {
  propertyId: number;
  propertyName: string;
}

export function ChatWindow({ propertyId, propertyName }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage } = useWebSocket(propertyId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !user) return;
    sendMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle incoming messages
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = event.data;
        const message = typeof data === 'string' ? JSON.parse(data) : data;

        if (!message || !message.type) return;

        console.log('Received message:', message);

        if (message.type === 'history' && Array.isArray(message.messages)) {
          setMessages(message.messages);
        } else if (message.propertyId === propertyId) {
          // Check for duplicate messages based on content and timestamp
          setMessages(prev => {
            const isDuplicate = prev.some(m => 
              m.type === message.type && 
              m.userId === message.userId && 
              m.content === message.content && 
              m.timestamp === message.timestamp
            );
            return isDuplicate ? prev : [...prev, message];
          });
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    };

    window.addEventListener('message', handleWebSocketMessage);

    return () => {
      window.removeEventListener('message', handleWebSocketMessage);
    };
  }, [propertyId]);

  // Filter out system messages for cleaner display
  const displayMessages = messages.filter(msg => 
    msg.type === 'message' || 
    (msg.type === 'join' && msg.userId !== user?.id) || 
    (msg.type === 'leave' && msg.userId !== user?.id)
  );

  return (
    <div className="flex flex-col h-[600px] border rounded-lg">
      <div className="p-4 border-b bg-muted">
        <h3 className="font-semibold">{propertyName} Chat</h3>
      </div>

      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
          {displayMessages.map((message, index) => (
            <div
              key={`${message.userId}-${message.timestamp}-${index}`}
              className={`flex items-start gap-2 ${
                message.userId === user?.id ? 'flex-row-reverse' : ''
              }`}
            >
              <UserCircle2 className="h-8 w-8 text-muted-foreground" />
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.userId === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {message.userId === user?.id ? 'You' : message.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-grow"
          />
          <Button onClick={handleSendMessage} disabled={!inputMessage.trim()}>
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}