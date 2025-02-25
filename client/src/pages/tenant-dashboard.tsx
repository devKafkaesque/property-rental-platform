import { useQuery } from "@tanstack/react-query";
import { Property, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Checkbox,
  CheckboxIndicator 
} from "@/components/ui/checkbox";
import { Loader2, BarChart2 } from "lucide-react";
import { useState } from "react";
import { PropertyComparison } from "@/components/property-comparison";
import { useToast } from "@/hooks/use-toast";

export default function TenantDashboard() {
  const { toast } = useToast();
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

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
        {selectedProperties.length > 1 && (
          <Button
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-2"
          >
            <BarChart2 className="h-4 w-4" />
            Compare Selected ({selectedProperties.length})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableProperties.map((property) => (
          <Card key={property.id} className="relative">
            <div className="absolute top-2 right-2 z-10">
              <Checkbox
                checked={selectedProperties.includes(property.id)}
                onCheckedChange={() => togglePropertySelection(property.id)}
                className="bg-white/90"
              />
            </div>
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

      <PropertyComparison
        propertyIds={selectedProperties}
        onClose={() => {
          setShowComparison(false);
          setSelectedProperties([]);
        }}
        open={showComparison}
      />
    </div>
  );
}
