import { ViewingRequest } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

interface ViewingRequestListProps {
  propertyId: number;
}

export default function ViewingRequestList({ propertyId }: ViewingRequestListProps) {
  const { user } = useAuth();

  const { data: requests = [], isLoading } = useQuery<ViewingRequest[]>({
    queryKey: [`/api/viewing-requests/tenant/${propertyId}`],
    onSuccess: (data) => {
      console.log(`Received ${data.length} viewing requests for tenant ${user?.id} and property ${propertyId}`);
    }
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
        No viewing requests for this property
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}