import { useQuery } from "@tanstack/react-query";
import { Property, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function TenantDashboard() {
  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Filter for available properties only
  const availableProperties = properties?.filter(p => p.status === "available") || [];

  if (propertiesLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Available Properties</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableProperties.map((property) => (
          <Card key={property.id}>
            <CardHeader>
              <CardTitle>{property.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{property.address}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="font-medium">Type</p>
                    <p>{property.type}</p>
                  </div>
                  <div>
                    <p className="font-medium">Price</p>
                    <p>${property.rentPrice}/month</p>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4"
                  onClick={() => window.location.href = `/properties/${property.id}`}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}