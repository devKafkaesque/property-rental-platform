import { Property } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Home, Bed, Bath, Square, Wifi } from "lucide-react";
import { useLocation } from "wouter";

export default function PropertyListing() {
  const [, setLocation] = useLocation();
  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Filter for available properties only
  const availableProperties = properties.filter(
    (property) => property.status === "available"
  );

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

  if (availableProperties.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium">No Available Properties</h3>
        <p className="text-muted-foreground">
          Check back later for new listings.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {availableProperties.map((property) => (
        <Card key={property.id} className="overflow-hidden">
          {property.images && property.images.length > 0 && (
            <div className="relative h-48 overflow-hidden">
              <img
                src={property.images[0]}
                alt={property.name}
                className="w-full h-full object-cover"
              />
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
              <Button 
                className="w-full mt-4"
                onClick={() => setLocation(`/properties/${property.id}`)}
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}