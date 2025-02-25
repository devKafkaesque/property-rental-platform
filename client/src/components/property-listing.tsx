import { Property, User } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Home, Bed, Bath, Square, Wifi, Trash2, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PropertyListing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });
  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Delete property mutation
  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      await apiRequest("DELETE", `/api/properties/${propertyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Property has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete property",
        variant: "destructive",
      });
    },
  });

  // Disconnect from property mutation
  const disconnectPropertyMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      await apiRequest("POST", `/api/properties/${propertyId}/disconnect`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Successfully disconnected from property.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect from property",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="w-full h-[300px] animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <h3 className="text-2xl font-semibold mb-4">Welcome to Property Listings!</h3>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          We're currently updating our property listings. Please check back soon to discover amazing properties 
          that match your preferences. You can also contact support if you need assistance finding specific properties.
        </p>
      </div>
    );
  }

  // Show all properties, with available ones first
  const sortedProperties = [...properties].sort((a, b) => {
    // Sort available properties first
    if ((a.status || "available") === "available" && (b.status || "available") !== "available") return -1;
    if ((a.status || "available") !== "available" && (b.status || "available") === "available") return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedProperties.map((property) => (
          <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {property.images && property.images.length > 0 && (
              <div className="relative h-48 overflow-hidden">
                <img
                  src={property.images[0]}
                  alt={property.name}
                  className="w-full h-full object-cover"
                />
                {property.status && property.status !== "available" && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                  </div>
                )}
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span>{property.name}</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(property.rentPrice)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    {property.type}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    {property.bedrooms} beds
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    {property.bathrooms} baths
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Square className="h-4 w-4" />
                    {property.squareFootage} sq ft
                  </span>
                  {property.wifi && (
                    <span className="flex items-center gap-1">
                      <Wifi className="h-4 w-4" />
                      WiFi
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <Button 
                    className="w-full"
                    onClick={() => setLocation(`/properties/${property.id}`)}
                    variant={(property.status || "available") === "available" ? "default" : "secondary"}
                  >
                    View Details
                  </Button>

                  {/* Show delete button for landowners */}
                  {user?.role === "landowner" && property.ownerId === user.id && (
                    <Button
                      variant="destructive"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this property?")) {
                          deletePropertyMutation.mutate(property.id);
                        }
                      }}
                      title="Delete Property"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Property
                    </Button>
                  )}

                  {/* Show disconnect button for tenants */}
                  {user?.role === "tenant" && property.status === "rented" && (
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to disconnect from this property?")) {
                          disconnectPropertyMutation.mutate(property.id);
                        }
                      }}
                      title="Disconnect from Property"
                    >
                      <LogOut className="h-4 w-4" />
                      Disconnect from Property
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}