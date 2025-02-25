import { Property } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PropertyComparisonProps {
  propertyIds: number[];
  onClose: () => void;
  open: boolean;
}

export function PropertyComparison({ propertyIds, onClose, open }: PropertyComparisonProps) {
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

  if (!selectedProperties.length) return null;

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogTitle>Compare Properties</DialogTitle>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedProperties.map(property => {
                const analysis = comparison?.properties?.[property.id];
                return (
                  <Card key={property.id}>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-2">{property.name}</h3>
                      <p className="text-muted-foreground mb-4">{property.address}</p>

                      <div className="grid grid-cols-3 gap-4 text-sm mb-4">
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

                      <p className="text-lg font-bold mb-6">${property.rentPrice}/month</p>

                      {analysis && (
                        <div className="space-y-6 border-t pt-4">
                          <div>
                            <h4 className="flex items-center gap-2 font-medium text-green-700">
                              <Star className="h-4 w-4" />
                              Advantages
                            </h4>
                            <ul className="mt-2 space-y-2">
                              {analysis.pros.map((pro, i) => (
                                <li key={i} className="text-sm text-green-600">• {pro}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="flex items-center gap-2 font-medium text-red-700">
                              <AlertCircle className="h-4 w-4" />
                              Considerations
                            </h4>
                            <ul className="mt-2 space-y-2">
                              {analysis.cons.map((con, i) => (
                                <li key={i} className="text-sm text-red-600">• {con}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-medium">Best For</h4>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {analysis.bestFor}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}