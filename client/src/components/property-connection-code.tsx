import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Copy, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface PropertyConnectionCodeProps {
  propertyId: number;
  connectionCode: string | null;
}

export default function PropertyConnectionCode({ propertyId, connectionCode: initialConnectionCode }: PropertyConnectionCodeProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [currentCode, setCurrentCode] = useState(initialConnectionCode);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/properties/${propertyId}/connection-code`);
      if (!res.ok) {
        throw new Error("Failed to generate connection code");
      }
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.connectionCode) {
        setCurrentCode(data.connectionCode);
        queryClient.invalidateQueries({ 
          queryKey: [`/api/properties/owner/${user?.id}`]
        });
        toast({
          title: "Connection code generated",
          description: "Share this code with your tenant to establish a connection.",
        });
      }
    },
    onError: (error) => {
      console.error('Error generating code:', error);
      toast({
        title: "Error",
        description: "Failed to generate connection code. Please try again.",
        variant: "destructive",
      });
    }
  });

  const copyToClipboard = async () => {
    if (currentCode) {
      try {
        await navigator.clipboard.writeText(currentCode);
        setCopied(true);
        toast({
          title: "Copied to clipboard",
          description: "The connection code has been copied to your clipboard.",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        toast({
          title: "Error",
          description: "Failed to copy code to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  const shareLink = `${window.location.origin}/connect`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => generateCodeMutation.mutate()}
          disabled={generateCodeMutation.isPending}
        >
          {generateCodeMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {currentCode ? "Regenerate Code" : "Generate Code"}
        </Button>

        {currentCode && (
          <Button
            variant="secondary"
            onClick={copyToClipboard}
            disabled={copied}
          >
            <Copy className="h-4 w-4 mr-2" />
            {copied ? "Copied!" : "Copy Code"}
          </Button>
        )}
      </div>

      {currentCode && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Connection Code:</p>
          <p className="font-mono text-lg">{currentCode}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Share this code with your tenant or send them this link:
          </p>
          <p className="font-mono text-sm mt-1 break-all">{shareLink}</p>
        </div>
      )}
    </div>
  );
}