import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Property, Booking, PropertyCategory } from "@shared/schema";
import PropertyForm from "@/components/property-form";
import PropertyCard from "@/components/property-card";
import PropertySearch from "@/components/property-search";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ViewingRequestManagement from "@/components/viewing-request-management";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PropertyCategory | "all">("all");

  // For landowners, fetch their own properties
  // For tenants, fetch all available properties
  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: [user?.role === "landowner" ? `/api/properties/owner/${user?.id}` : "/api/properties"],
    enabled: !!user,
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/tenant"],
    enabled: user?.role === "tenant",
  });

  const filteredProperties = properties?.filter(property => {
    // For tenants, only show available properties
    if (user?.role === "tenant" && property.status !== "available") return false;

    const matchesSearch = !searchQuery || (
      property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const matchesCategory = selectedCategory === "all" || property.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">
            Welcome, {user.username}!
          </h1>
          <div className="flex items-center gap-4">
            {user.role === "tenant" && (
              <Link href="/connect">
                <Button variant="outline">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Connect to Property
                </Button>
              </Link>
            )}
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
        </div>

        <div className="space-y-6">
          {user.role === "landowner" && (
            <>
              <div className="flex justify-between items-center">
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

              <PropertySearch
                onSearch={(query, category) => {
                  setSearchQuery(query);
                  setSelectedCategory(category);
                }}
              />
            </>
          )}

          {user.role === "tenant" && (
            <>
              <h2 className="text-2xl font-semibold">Available Properties</h2>
              <PropertySearch
                onSearch={(query, category) => {
                  setSearchQuery(query);
                  setSelectedCategory(category);
                }}
              />
            </>
          )}

          {propertiesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {filteredProperties?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No properties found matching your search criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProperties?.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      isOwner={user.role === "landowner"}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {user.role === "landowner" && properties && properties.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold mt-12 mb-6">Property Viewing Requests</h2>
              <div className="grid gap-6">
                {properties.map((property) => (
                  <Card key={property.id}>
                    <CardHeader>
                      <CardTitle>{property.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ViewingRequestManagement propertyId={property.id} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {user.role === "tenant" && bookings && bookings.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold mt-12 mb-6">Your Bookings</h2>
              {bookingsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="grid gap-4">
                  {bookings.map((booking) => (
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
    </div>
  );
}