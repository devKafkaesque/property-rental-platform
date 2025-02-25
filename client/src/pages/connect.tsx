import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function ConnectPage() {
  const [code, setCode] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const connectMutation = useMutation({
    mutationFn: async (code: string) => {
      // Validate code format before sending request
      if (!/^[a-f0-9]{8}$/i.test(code)) {
        throw new Error("Invalid connection code format. Code should be 8 characters long and contain only letters (a-f) and numbers.");
      }

      const res = await apiRequest("POST", `/api/properties/connect/${code}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to connect to property");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Successfully connected!",
        description: "You have been connected to the property. Redirecting to dashboard...",
      });
      // Give time for the toast to be visible
      setTimeout(() => setLocation("/dashboard"), 2000);
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
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      toast({
        title: "Error",
        description: "Please enter a connection code",
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
                  pattern="^[a-fA-F0-9]{8}$"
                  title="Connection code should be 8 characters long and contain only letters (a-f) and numbers"
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