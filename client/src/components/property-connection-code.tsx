import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Copy, RefreshCw } from "lucide-react";

interface PropertyConnectionCodeProps {
  propertyId: number;
  connectionCode: string | null;
}

export default function PropertyConnectionCode({ propertyId, connectionCode }: PropertyConnectionCodeProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/properties/${propertyId}/connection-code`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection code generated",
        description: "Share this code with your tenant to establish a connection.",
      });
    },
  });

  const copyToClipboard = async () => {
    if (connectionCode) {
      await navigator.clipboard.writeText(connectionCode);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "The connection code has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = `${window.location.origin}/connect/${connectionCode}`;

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
          {connectionCode ? "Regenerate Code" : "Generate Code"}
        </Button>

        {connectionCode && (
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

      {connectionCode && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Connection Code:</p>
          <p className="font-mono text-lg">{connectionCode}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Share this code with your tenant or send them this link:
          </p>
          <p className="font-mono text-sm mt-1 break-all">{shareLink}</p>
        </div>
      )}
    </div>
  );
}
