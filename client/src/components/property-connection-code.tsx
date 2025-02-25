import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
      const response = await fetch(`/api/properties/${propertyId}/connection-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate code');
      }

      return data;
    },
    onSuccess: (data) => {
      setCurrentCode(data.connectionCode);
      queryClient.invalidateQueries({ 
        queryKey: [`/api/properties/owner/${user?.id}`]
      });
      toast({
        title: "Success",
        description: "New code generated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const copyToClipboard = async () => {
    if (!currentCode) return;

    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      toast({
        title: "Copied",
        description: "Code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive",
      });
    }
  };

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
        </div>
      )}
    </div>
  );
}