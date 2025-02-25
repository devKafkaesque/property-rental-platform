import { Property, User } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import { Home, Bed, Bath, Square, Wifi, Trash2, LogOut, BarChart2 } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { PropertyComparison } from "./property-comparison";

export default function PropertyListing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });
  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // State for property comparison
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Handle property selection for comparison
  const togglePropertySelection = (propertyId: number) => {
    setSelectedProperties(prev => {
      const isSelected = prev.includes(propertyId);
      if (isSelected) {
        return prev.filter(id => id !== propertyId);
      }
      if (prev.length >= 3) {
        toast({
          title: "Maximum Selection Reached",
          description: "You can compare up to 3 properties at a time.",
          variant: "destructive",
        });
        return prev;
      }
      return [...prev, propertyId];
    });
  };

  // Sort properties - Available properties first
  const sortedProperties = [...properties].sort((a, b) => {
    if (a.status === "available" && b.status !== "available") return -1;
    if (a.status !== "available" && b.status === "available") return 1;
    return 0;
  });

  // Show comparison button if user is tenant and has selected properties
  const showComparisonButton = user?.role === "tenant" && selectedProperties.length > 1;

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

  return (
    <div className="space-y-6">
      {/* Comparison Button */}
      {showComparisonButton && (
        <div className="flex justify-end mb-4">
          <Button
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-2"
          >
            <BarChart2 className="h-4 w-4" />
            Compare Selected ({selectedProperties.length})
          </Button>
        </div>
      )}

      {/* Property Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedProperties.map((property) => (
          <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow relative">
            {/* Show checkbox only for tenants and available properties */}
            {user?.role === "tenant" && property.status === "available" && (
              <div className="absolute top-2 right-2 z-10">
                <Checkbox
                  checked={selectedProperties.includes(property.id)}
                  onCheckedChange={() => togglePropertySelection(property.id)}
                  className="bg-white/90"
                />
              </div>
            )}

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

      {/* Property Comparison Modal */}
      {showComparison && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <PropertyComparison
              propertyIds={selectedProperties}
              onClose={() => {
                setShowComparison(false);
                setSelectedProperties([]);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}