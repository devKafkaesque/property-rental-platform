import { MaintenanceRequest } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

interface MaintenanceRequestListProps {
  propertyId: number;
}

interface MaintenanceRequestWithTenant extends MaintenanceRequest {
  tenantName?: string;
}

export default function MaintenanceRequestList({ propertyId }: MaintenanceRequestListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isLandowner = user?.role === "landowner";
  const [notes, setNotes] = useState<{ [key: number]: string }>({});

  const { data: requests = [], isLoading } = useQuery<MaintenanceRequestWithTenant[]>({
    queryKey: [isLandowner ? `/api/maintenance-requests/property/${propertyId}` : `/api/maintenance-requests/tenant/${propertyId}`],
    enabled: !!user && !!propertyId,
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, landlordNotes }: { id: number; status: string; landlordNotes?: string }) => {
      const res = await apiRequest("POST", `/api/maintenance-requests/${id}/update`, { status, landlordNotes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/maintenance-requests/property/${propertyId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/maintenance-requests/tenant/${propertyId}`] });
      toast({
        title: "Request Updated",
        description: "The maintenance request has been updated.",
      });
    },
  });

  const reviewRequestMutation = useMutation({
    mutationFn: async ({ id, status, tenantReview }: { id: number; status: string; tenantReview: string }) => {
      const res = await apiRequest("POST", `/api/maintenance-requests/${id}/review`, { status, tenantReview });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/maintenance-requests/property/${propertyId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/maintenance-requests/tenant/${propertyId}`] });
      toast({
        title: "Review Submitted",
        description: "Your review has been submitted.",
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

  if (requests.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-4">
        No maintenance requests for this property
      </div>
    );
  }

  const getPriorityColor = (priority: MaintenanceRequest["priority"]) => {
    switch (priority) {
      case "low": return "bg-blue-100 text-blue-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "emergency": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: MaintenanceRequest["status"]) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "needs_review": return "bg-purple-100 text-purple-800";
      case "reviewed": return "bg-teal-100 text-teal-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-2">
                <Badge className={getPriorityColor(request.priority)}>
                  {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} Priority
                </Badge>
                <Badge className={getStatusColor(request.status)}>
                  {request.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {format(new Date(request.createdAt), "PPP")}
              </span>
            </div>

            {isLandowner && request.tenantName && (
              <p className="text-sm font-medium mt-2">
                Requested by: {request.tenantName}
              </p>
            )}

            <p className="mt-2">{request.description}</p>

            {request.landlordNotes && (
              <div className="mt-4 text-sm text-muted-foreground">
                <strong>Landlord Notes:</strong> {request.landlordNotes}
              </div>
            )}

            {request.tenantReview && (
              <div className="mt-4 text-sm text-muted-foreground">
                <strong>Tenant Review:</strong> {request.tenantReview}
              </div>
            )}

            {/* Landlord Actions */}
            {isLandowner && request.status === "pending" && (
              <div className="mt-4 space-y-4">
                <Textarea
                  placeholder="Add notes about the maintenance work..."
                  value={notes[request.id] || ""}
                  onChange={(e) => setNotes({ ...notes, [request.id]: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => updateRequestMutation.mutate({
                      id: request.id,
                      status: "in_progress",
                      landlordNotes: notes[request.id]
                    })}
                  >
                    Start Work
                  </Button>
                </div>
              </div>
            )}

            {isLandowner && request.status === "in_progress" && (
              <div className="mt-4 space-y-4">
                <Textarea
                  placeholder="Add notes about the completed work..."
                  value={notes[request.id] || ""}
                  onChange={(e) => setNotes({ ...notes, [request.id]: e.target.value })}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => updateRequestMutation.mutate({
                    id: request.id,
                    status: "needs_review",
                    landlordNotes: notes[request.id]
                  })}
                >
                  Submit for Review
                </Button>
              </div>
            )}

            {/* Tenant Actions */}
            {!isLandowner && request.status === "needs_review" && (
              <div className="mt-4 space-y-4">
                <Textarea
                  placeholder="Add your review of the maintenance work..."
                  value={notes[request.id] || ""}
                  onChange={(e) => setNotes({ ...notes, [request.id]: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1"
                    onClick={() => reviewRequestMutation.mutate({
                      id: request.id,
                      status: "completed",
                      tenantReview: notes[request.id]
                    })}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Close
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => reviewRequestMutation.mutate({
                      id: request.id,
                      status: "cancelled",
                      tenantReview: notes[request.id]
                    })}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}