import { ViewingRequest } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

interface ViewingRequestManagementProps {
  propertyId: number;
  isOwner?: boolean;
}

export default function ViewingRequestManagement({ propertyId, isOwner }: ViewingRequestManagementProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: requests, isLoading } = useQuery<ViewingRequest[]>({
    queryKey: [isOwner ? `/api/viewing-requests/property/${propertyId}` : `/api/viewing-requests/tenant`],
    enabled: !!user,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ViewingRequest["status"] }) => {
      const res = await apiRequest("POST", `/api/viewing-requests/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate both owner and tenant queries to ensure all views are updated
      queryClient.invalidateQueries({ queryKey: [`/api/viewing-requests/property/${propertyId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/viewing-requests/tenant`] });
      toast({
        title: "Status updated",
        description: "The viewing request status has been updated.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-4">
        No viewing requests yet
      </div>
    );
  }

  // Filter requests if tenant to only show their requests for this property
  const filteredRequests = isOwner 
    ? requests 
    : requests.filter(request => request.propertyId === propertyId);

  return (
    <div className="space-y-4">
      {filteredRequests.map((request) => (
        <Card key={request.id}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                Requested for {format(new Date(request.preferredDate), "PPP")}
              </p>
              <span className={`
                px-2 py-1 rounded-full text-sm font-medium
                ${request.status === "completed" ? "bg-green-100 text-green-800" :
                  request.status === "approved" ? "bg-blue-100 text-blue-800" :
                  request.status === "cancelled" ? "bg-red-100 text-red-800" :
                  "bg-yellow-100 text-yellow-800"}
              `}>
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </span>
            </div>
            {request.message && (
              <p className="text-sm mt-2">{request.message}</p>
            )}
            {isOwner && request.status === "pending" && (
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => updateStatusMutation.mutate({ id: request.id, status: "approved" })}
                  disabled={updateStatusMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => updateStatusMutation.mutate({ id: request.id, status: "cancelled" })}
                  disabled={updateStatusMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
            {isOwner && request.status === "approved" && (
              <Button
                size="sm"
                className="w-full mt-4"
                onClick={() => updateStatusMutation.mutate({ id: request.id, status: "completed" })}
                disabled={updateStatusMutation.isPending}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark as Completed
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}