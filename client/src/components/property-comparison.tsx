import { useState } from "react";
import { Property } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Home, Hotel, Castle, Loader2, Star, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PropertyComparisonProps {
  propertyIds: number[];
  onClose: () => void;
  open: boolean;
}

function getPropertyIcon(type: Property["type"], category: Property["category"]) {
  if (category === "luxury") return Castle;
  if (type === "apartment") return Building2;
  if (type === "villa") return Hotel;
  return Home;
}

export function PropertyComparison({ propertyIds, onClose, open }: PropertyComparisonProps) {
  const { toast } = useToast();

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: comparison, isLoading } = useQuery({
    queryKey: ["/api/properties/compare", propertyIds],
    enabled: !!propertyIds.length && !!properties,
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/properties/compare", { propertyIds });
      return response.json();
    },
  });

  const selectedProperties = properties?.filter(p => propertyIds.includes(p.id)) || [];

  const content = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {selectedProperties.map(property => {
          const PropertyIcon = getPropertyIcon(property.type, property.category);
          const propertyAnalysis = comparison?.properties?.[property.id];

          return (
            <Card key={property.id} className="relative">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <PropertyIcon className="h-5 w-5" />
                  <CardTitle>{property.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Property Info */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{property.address}</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="font-medium">Bedrooms</p>
                      <p>{property.bedrooms}</p>
                    </div>
                    <div>
                      <p className="font-medium">Bathrooms</p>
                      <p>{property.bathrooms}</p>
                    </div>
                    <div>
                      <p className="font-medium">Sq. Ft.</p>
                      <p>{property.squareFootage}</p>
                    </div>
                  </div>
                  <p className="font-medium text-lg">${property.rentPrice}/month</p>
                </div>

                {/* AI Analysis */}
                {propertyAnalysis && (
                  <div className="space-y-4">
                    {/* Pros */}
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Star className="h-4 w-4 text-green-500" />
                        Advantages
                      </h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {propertyAnalysis.pros.map((pro: string, index: number) => (
                          <li key={index} className="text-green-700">{pro}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Cons */}
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        Considerations
                      </h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {propertyAnalysis.cons.map((con: string, index: number) => (
                          <li key={index} className="text-red-700">{con}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Best For */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Best Suited For</h4>
                      <p className="text-sm text-muted-foreground">
                        {propertyAnalysis.bestFor}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Property Comparison</DialogTitle>
          <DialogDescription>
            Compare selected properties to make an informed decision
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}