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
    if (a.status === "available" && b.status !== "available") return -1;
    if (a.status !== "available" && b.status === "available") return 1;
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
                {property.status !== "available" && (
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
                <Button 
                  className="w-full mt-4"
                  onClick={() => setLocation(`/properties/${property.id}`)}
                  variant={property.status === "available" ? "default" : "secondary"}
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