import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "./chat-window";
import { Hash, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface ChatProperty {
  id: number;
  name: string;
  otherPartyName: string; // tenant name for landowner, landowner name for tenant
}

export function ChatContainer() {
  const { user } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<ChatProperty | null>(null);
  const [, setLocation] = useLocation();

  // Fetch available properties for chat based on user role
  const { data: chatProperties = [] } = useQuery<ChatProperty[]>({
    queryKey: [user?.role === 'landowner' ? '/api/properties/owner/chats' : '/api/properties/tenant/chats'],
    enabled: !!user,
  });

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-4 gap-4 h-[600px]">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold">Property Chats</h3>
            </div>
          </div>

          <div className="space-y-2">
            {chatProperties.map((property) => (
              <button
                key={property.id}
                onClick={() => setSelectedProperty(property)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
                  ${selectedProperty?.id === property.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                  }
                `}
              >
                <Hash className="h-4 w-4" />
                <div className="flex-grow">
                  <div className="font-medium truncate">{property.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {property.otherPartyName}
                  </div>
                </div>
              </button>
            ))}

            {chatProperties.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                {user?.role === 'tenant' 
                  ? "No active property connections found. Connect to a property to start chatting."
                  : "No properties with active tenants found."}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-3">
          {selectedProperty ? (
            <ChatWindow 
              propertyId={selectedProperty.id} 
              propertyName={selectedProperty.name}
            />
          ) : (
            <div className="h-full border rounded-lg flex items-center justify-center text-muted-foreground">
              Select a property to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
}