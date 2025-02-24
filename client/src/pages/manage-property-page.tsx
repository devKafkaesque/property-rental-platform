import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Property } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Home, Hotel, Castle, Loader2 } from "lucide-react";

function getPropertyIcon(type: Property["type"], category: Property["category"]) {
  if (category === "luxury") return Castle;
  if (type === "apartment") return Building2;
  if (type === "villa") return Hotel;
  return Home;
}

export default function ManagePropertyPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: [`/api/properties/${id}`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!property) {
    return <div>Property not found</div>;
  }

  // Redirect if user is not the owner
  if (user?.id !== property.ownerId) {
    setLocation(`/property/${id}`);
    return null;
  }

  const PropertyIcon = getPropertyIcon(property.type, property.category);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold mb-6">Manage Property</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className={`
            h-[400px] rounded-lg flex items-center justify-center
            ${property.category === "luxury" ? "bg-gradient-to-br from-amber-100 to-amber-500" : 
              property.category === "standard" ? "bg-gradient-to-br from-blue-100 to-blue-500" :
              "bg-gradient-to-br from-green-100 to-green-500"}
          `}>
            <PropertyIcon className={`
              h-48 w-48 
              ${property.category === "luxury" ? "text-amber-700" : 
                property.category === "standard" ? "text-blue-700" :
                "text-green-700"}
            `} />
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">Name</h3>
                  <p>{property.name}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Description</h3>
                  <p>{property.description}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Address</h3>
                  <p>{property.address}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Property Type</h3>
                  <p>{property.type} - {property.furnished}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Category</h3>
                  <p>{property.category}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Status</h3>
                  <p>{property.status}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Amenities</h3>
                  <p>WiFi: {property.wifi ? "Yes" : "No"}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Condition</h3>
                  <p>{property.condition}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
