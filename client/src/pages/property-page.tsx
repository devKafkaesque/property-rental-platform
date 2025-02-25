import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Property } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Home, Hotel, Castle, Loader2, X, Wifi, CheckCircle2, Info, MapPin, BedDouble, Bath, Ruler, DollarSign } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import PropertyImageCarousel from "@/components/property-image-carousel";
import ReviewForm from "@/components/review-form";
import ReviewList from "@/components/review-list";
import ViewingRequestForm from "@/components/viewing-request-form";
import ViewingRequestList from "@/components/viewing-request-list";

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
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: [`/api/properties/${id}`],
    enabled: !!id,
  });

  const handleBack = () => {
    if (user) {
      setLocation("/dashboard");
    } else {
      setLocation("/");
    }
  };

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!dateRange?.from || !dateRange?.to) {
        throw new Error("Please select start and end dates");
      }

      const booking = {
        propertyId: Number(id),
        startDate: dateRange.from,
        endDate: dateRange.to,
      };

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
      <Button
        variant="ghost"
        className="mb-6"
        onClick={handleBack}
      >
        <X className="h-4 w-4 mr-2" />
        Close
      </Button>

      <div className="container mx-auto max-w-5xl">
        <div className="grid md:grid-cols-2 gap-8">
          <PropertyImageCarousel
            images={property.images || []}
            type={property.type}
            category={property.category}
          />

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`
                px-2 py-1 rounded-full text-sm font-medium
                ${property.category === "luxury" ? "bg-amber-100 text-amber-800" :
                  property.category === "standard" ? "bg-blue-100 text-blue-800" :
                  "bg-green-100 text-green-800"}
              `}>
                {property.category.charAt(0).toUpperCase() + property.category.slice(1)}
              </span>
              <span className="bg-background/90 text-foreground px-2 py-1 rounded-full text-sm">
                {property.status}
              </span>
            </div>

            <h1 className="text-3xl font-bold mb-4">{property.name}</h1>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-5 w-5" />
                <span>{property.address}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <PropertyIcon className="h-5 w-5" />
                <span>
                  {property.type.charAt(0).toUpperCase() + property.type.slice(1)} - {property.furnished}
                </span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Wifi className={`h-5 w-5 ${property.wifi ? "text-green-500" : "text-gray-400"}`} />
                <span>WiFi {property.wifi ? "Available" : "Not Available"}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <BedDouble className="h-5 w-5" />
                <span>{property.bedrooms} Bedroom{property.bedrooms > 1 ? 's' : ''}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Bath className="h-5 w-5" />
                <span>{property.bathrooms} Bathroom{property.bathrooms > 1 ? 's' : ''}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Ruler className="h-5 w-5" />
                <span>{property.squareFootage} sq ft</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-5 w-5" />
                <span>Rent: ${property.rentPrice}/month</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-5 w-5" />
                <span>Deposit: ${property.depositAmount}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5" />
                <span>Condition: {property.condition}</span>
              </div>
            </div>

            {property.restrictions && Object.keys(property.restrictions).length > 0 && (
              <div className="flex items-start gap-2 text-muted-foreground border-t pt-4">
                <Info className="h-5 w-5 mt-1" />
                <div>
                  <span className="font-medium">Restrictions:</span>
                  <ul className="list-disc list-inside ml-2">
                    {Object.entries(property.restrictions).map(([key, value]) => (
                      <li key={key}>{`${key}: ${value}`}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{property.description}</p>
              </CardContent>
            </Card>

            {user?.role === "tenant" && (
              <>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Request a Viewing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ViewingRequestForm propertyId={Number(id)} />
                  </CardContent>
                </Card>

                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Your Viewing Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ViewingRequestList propertyId={Number(id)} />
                  </CardContent>
                </Card>

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
              </>
            )}

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <ReviewList propertyId={Number(id)} />
                {user?.role === "tenant" && (
                  <ReviewForm propertyId={Number(id)} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}