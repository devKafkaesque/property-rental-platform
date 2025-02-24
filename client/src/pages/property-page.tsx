import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Property, insertBookingSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";

export default function PropertyPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: [`/api/properties/${id}`],
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-5xl">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <img
              src={property.imageUrl}
              alt={property.title}
              className="w-full h-[400px] object-cover rounded-lg"
            />
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-4">{property.title}</h1>
            <p className="text-2xl font-semibold mb-2">${property.price}/month</p>
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