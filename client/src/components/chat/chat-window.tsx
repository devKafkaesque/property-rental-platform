import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  SendHorizontal, 
  UserCircle2, 
  MoreVertical, 
  Trash2, 
  Pencil
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  type: 'message' | 'join' | 'leave' | 'history' | 'delete';
  userId: number;
  username: string;
  content: string;
  propertyId: number;
  timestamp: number | string;
  isDeleted?: boolean;
  messages?: ChatMessage[]; // For history type
}

interface ChatWindowProps {
  propertyId: number;
  propertyName: string;
  onRename?: (newName: string) => void;
}

export function ChatWindow({ propertyId, propertyName, onRename }: ChatWindowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [newGroupName, setNewGroupName] = useState(propertyName);
  const [isProcessing, setIsProcessing] = useState(false);
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

  const handleDeleteMessage = (messageTimestamp: number | string) => {
    if (!user) return;
    sendMessage('', 'delete', messageTimestamp);
  };

  const handleRenameGroup = async () => {
    if (!newGroupName.trim() || newGroupName === propertyName || !user || user.role !== 'landowner') {
      setIsRenaming(false);
      return;
    }

    setIsProcessing(true);
    try {
      await apiRequest(`/api/properties/${propertyId}/name`, {
        method: 'PATCH',
        body: { name: newGroupName.trim() }
      });

      onRename?.(newGroupName.trim());
      toast({
        title: "Success",
        description: "Chat renamed successfully",
      });
    } catch (error) {
      console.error('Error renaming chat:', error);
      toast({
        title: "Error",
        description: "Failed to rename chat",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setIsRenaming(false);
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

            if (message.type === 'delete') {
              // Mark message as deleted
              return prev.map(m => 
                m.timestamp === message.timestamp ? { ...m, isDeleted: true } : m
              );
            }

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
      <div className="p-4 border-b bg-muted flex items-center justify-between">
        <h3 className="font-semibold">{propertyName} Chat</h3>
        {user?.role === 'landowner' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
                } ${message.isDeleted ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {message.userId === user?.id ? 'You' : message.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  {message.userId === user?.id && !message.isDeleted && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-auto"
                      onClick={() => handleDeleteMessage(message.timestamp)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {message.isDeleted ? 'This message was deleted' : message.content}
                </p>
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

      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Chat Name</Label>
              <Input
                id="name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter new chat name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenaming(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleRenameGroup} disabled={isProcessing || !newGroupName.trim() || newGroupName === propertyName}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}