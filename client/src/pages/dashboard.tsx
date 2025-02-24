import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Property, Booking } from "@shared/schema";
import PropertyForm from "@/components/property-form";
import PropertyCard from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [, setLocation] = useLocation();

  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties/owner", user?.id],
    enabled: user?.role === "landowner",
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/tenant"],
    enabled: user?.role === "tenant",
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">
            Welcome, {user.username}!
          </h1>
          <Button 
            variant="outline" 
            onClick={() => {
              logoutMutation.mutate(undefined, {
                onSuccess: () => setLocation("/auth")
              });
            }}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            Logout
          </Button>
        </div>

        {user.role === "landowner" && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Your Properties</h2>
              <Dialog open={showAddProperty} onOpenChange={setShowAddProperty}>
                <DialogTrigger asChild>
                  <Button>Add Property</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>Add New Property</DialogTitle>
                  </DialogHeader>
                  <PropertyForm onSuccess={() => setShowAddProperty(false)} />
                </DialogContent>
              </Dialog>
            </div>

            {propertiesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties?.map((property) => (
                  <PropertyCard key={property.id} property={property} isOwner />
                ))}
              </div>
            )}
          </>
        )}

        {user.role === "tenant" && (
          <>
            <h2 className="text-2xl font-semibold mb-6">Your Bookings</h2>
            {bookingsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-4">
                {bookings?.map((booking) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <CardTitle>Booking #{booking.id}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>Status: {booking.status}</p>
                      <p>
                        Dates: {new Date(booking.startDate).toLocaleDateString()} -{" "}
                        {new Date(booking.endDate).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}