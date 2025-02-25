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
      const res = await apiRequest("POST", `/api/properties/connect/${code}`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Successfully connected!",
        description: "You have been connected to the property.",
      });
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Connection failed",
        description: "Invalid connection code. Please check and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast({
        title: "Error",
        description: "Please enter a connection code",
        variant: "destructive",
      });
      return;
    }
    connectMutation.mutate(code);
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
                  placeholder="Enter connection code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={connectMutation.isPending}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={connectMutation.isPending}
              >
                {connectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Connect to Property
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
