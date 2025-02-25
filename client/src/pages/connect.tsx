import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function ConnectPage() {
  const [code, setCode] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const connectMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch(`/api/properties/connect/${code}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect to property");
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-contracts/tenant"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-contracts/landowner"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties/owner"] });

      toast({
        title: "Successfully connected!",
        description: "You have been connected to the property.",
      });
      setTimeout(() => setLocation("/connections"), 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      toast({
        title: "Error",
        description: "Please enter a connection code",
        variant: "destructive",
      });
      return;
    }
    if (!/^[A-F0-9]{8}$/.test(trimmedCode)) {
      toast({
        title: "Error",
        description: "Invalid connection code format",
        variant: "destructive",
      });
      return;
    }
    connectMutation.mutate(trimmedCode);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Connect to Property</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Enter 8-character connection code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={connectMutation.isPending}
                  maxLength={8}
                  pattern="^[A-Fa-f0-9]{8}$"
                  title="Connection code should be 8 characters long and contain only letters (A-F) and numbers"
                />
                <p className="text-sm text-muted-foreground">
                  Enter the 8-character code provided by your landlord
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={connectMutation.isPending}
              >
                {connectMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  "Connect to Property"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}