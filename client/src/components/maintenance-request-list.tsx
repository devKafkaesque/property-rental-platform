import { MaintenanceRequest } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface MaintenanceRequestListProps {
  propertyId: number;
}

export default function MaintenanceRequestList({ propertyId }: MaintenanceRequestListProps) {
  const { data: requests = [], isLoading } = useQuery<MaintenanceRequest[]>({
    queryKey: [`/api/maintenance-requests/tenant/${propertyId}`],
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
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {format(new Date(request.createdAt), "PPP")}
              </span>
            </div>
            <p className="mt-2">{request.description}</p>
            {request.notes && (
              <div className="mt-4 text-sm text-muted-foreground">
                <strong>Notes:</strong> {request.notes}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
