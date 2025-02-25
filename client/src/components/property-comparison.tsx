import { useState } from "react";
import { Property } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PropertyComparisonProps {
  propertyIds: number[];
  onClose: () => void;
  open: boolean;
}

export function PropertyComparison({ propertyIds, onClose, open }: PropertyComparisonProps) {
  // Generate unique IDs for accessibility
  const titleId = "property-comparison-title";
  const descriptionId = "property-comparison-description";

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[900px] h-[80vh] overflow-y-auto"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <DialogHeader>
          <DialogTitle id={titleId}>Compare Properties</DialogTitle>
          <DialogDescription id={descriptionId}>
            Review and compare selected properties
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedProperties.map(property => {
                const analysis = comparison?.properties?.[property.id];

                return (
                  <Card key={property.id}>
                    <CardHeader>
                      <CardTitle>{property.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{property.address}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="font-medium">Beds</p>
                            <p>{property.bedrooms}</p>
                          </div>
                          <div>
                            <p className="font-medium">Baths</p>
                            <p>{property.bathrooms}</p>
                          </div>
                          <div>
                            <p className="font-medium">Area</p>
                            <p>{property.squareFootage} sq ft</p>
                          </div>
                        </div>
                        <p className="text-lg font-semibold">${property.rentPrice}/month</p>

                        {analysis && (
                          <div className="space-y-4 border-t pt-4">
                            <div>
                              <h4 className="flex items-center gap-2 font-medium">
                                <Star className="h-4 w-4 text-green-500" />
                                Advantages
                              </h4>
                              <ul className="mt-2 space-y-1">
                                {analysis.pros.map((pro, i) => (
                                  <li key={i} className="text-sm text-green-700">• {pro}</li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h4 className="flex items-center gap-2 font-medium">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                                Considerations
                              </h4>
                              <ul className="mt-2 space-y-1">
                                {analysis.cons.map((con, i) => (
                                  <li key={i} className="text-sm text-red-700">• {con}</li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h4 className="font-medium">Best For</h4>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {analysis.bestFor}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}