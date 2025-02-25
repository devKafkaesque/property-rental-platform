import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatWindow } from "./chat-window";
import { Plus, Hash } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ChatGroup {
  id: string;
  name: string;
  memberCount: number;
}

export function ChatContainer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

  const { data: chatGroups = [], refetch: refetchGroups } = useQuery<ChatGroup[]>({
    queryKey: ['/api/chat/groups'],
    enabled: !!user,
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/chat/groups', { name });
      return response.json();
    },
    onSuccess: () => {
      refetchGroups();
      toast({
        title: "Success",
        description: "Chat group created successfully",
      });
      setNewGroupName('');
    },
  });

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroupMutation.mutate(newGroupName);
  };

  return (
    <div className="grid grid-cols-4 gap-4 h-[600px]">
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Chat Groups</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Chat Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name..."
                />
                <Button 
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || createGroupMutation.isPending}
                  className="w-full"
                >
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {chatGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group.id)}
              className={`
                w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
                ${selectedGroup === group.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
                }
              `}
            >
              <Hash className="h-4 w-4" />
              <span className="flex-grow truncate">{group.name}</span>
              <span className="text-xs text-muted-foreground">
                {group.memberCount} members
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="col-span-3">
        {selectedGroup ? (
          <ChatWindow groupId={selectedGroup} />
        ) : (
          <div className="h-full border rounded-lg flex items-center justify-center text-muted-foreground">
            Select a chat group to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
