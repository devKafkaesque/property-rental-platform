import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Property, insertBookingSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Home, Hotel, Castle, Loader2 } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";

function getPropertyIcon(type: Property["type"], category: Property["category"]) {
  if (category === "luxury") return Castle;
  if (type === "apartment") return Building2;
  if (type === "villa") return Hotel;
  return Home;
}

export default function PropertyPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: [`/api/properties/${id}`],
    enabled: !!id,
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!dateRange?.from || !dateRange?.to) {
        throw new Error("Please select start and end dates");
      }

      const booking = insertBookingSchema.parse({
        propertyId: Number(id),
        startDate: dateRange.from,
        endDate: dateRange.to,
      });

      const res = await apiRequest("POST", "/api/bookings", booking);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking request sent",
        description: "The property owner will review your request.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/tenant"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!property) return <div>Property not found</div>;

  const PropertyIcon = getPropertyIcon(property.type, property.category);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-5xl">
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
            <h1 className="text-3xl font-bold mb-4">{property.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <PropertyIcon className="h-5 w-5" />
              <span>
                {property.type.charAt(0).toUpperCase() + property.type.slice(1)} - {property.furnished}
              </span>
            </div>
            <p className="text-muted-foreground mb-4">{property.address}</p>
            <p className="mb-6">{property.description}</p>

            {user?.role === "tenant" && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Book this property</h3>
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className="rounded-md border"
                  />
                  <Button
                    className="w-full mt-4"
                    onClick={() => bookingMutation.mutate()}
                    disabled={bookingMutation.isPending || !dateRange?.from || !dateRange?.to}
                  >
                    {bookingMutation.isPending ? "Sending request..." : "Request to Book"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}