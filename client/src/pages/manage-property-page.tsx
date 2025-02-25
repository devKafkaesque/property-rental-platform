import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Property, insertPropertySchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Home, Hotel, Castle, Loader2, ArrowLeft, Edit2, X, Upload, BedDouble, Bath, Ruler, DollarSign, MapPin, Wifi, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import PropertyImageCarousel from "@/components/property-image-carousel";
import ViewingRequestManagement from "@/components/viewing-request-management";
import ReviewList from "@/components/review-list"; // Import ReviewList component


function getPropertyIcon(type: Property["type"], category: Property["category"]) {
  if (category === "luxury") return Castle;
  if (type === "apartment") return Building2;
  if (type === "villa") return Hotel;
  return Home;
}

export default function ManagePropertyPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: [`/api/properties/${id}`],
    enabled: !!id,
  });

  const form = useForm({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      name: property?.name || "",
      description: property?.description || "",
      address: property?.address || "",
      type: property?.type || "house",
      furnished: property?.furnished || "full",
      wifi: property?.wifi || false,
      restrictions: property?.restrictions || {},
      condition: property?.condition || "",
      category: property?.category || "standard",
      images: property?.images || [], //Added to handle default images
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/properties/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/owner/${user?.id}`] });
      toast({
        title: "Property updated",
        description: "Your property has been updated successfully.",
      });
      setIsEditing(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!property) {
    return <div>Property not found</div>;
  }

  // Redirect if user is not the owner
  if (user?.id !== property.ownerId) {
    setLocation(`/property/${id}`);
    return null;
  }

  const PropertyIcon = getPropertyIcon(property.type, property.category);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-5xl">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Property
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <PropertyImageCarousel
            images={property.images || []}
            type={property.type}
            category={property.category}
          />

          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Property Details</CardTitle>
                <span className={`
                  px-2 py-1 rounded-full text-sm font-medium
                  ${property.category === "luxury" ? "bg-amber-100 text-amber-800" :
                    property.category === "standard" ? "bg-blue-100 text-blue-800" :
                    "bg-green-100 text-green-800"}
                `}>
                  {property.category.charAt(0).toUpperCase() + property.category.slice(1)}
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{property.name}</h3>
                  <p className="text-muted-foreground">{property.description}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Address</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{property.address}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <PropertyIcon className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Property Type</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{property.type} - {property.furnished}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Bedrooms</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{property.bedrooms}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Bath className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Bathrooms</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{property.bathrooms}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Square Footage</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{property.squareFootage} sq ft</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Wifi className={`h-4 w-4 ${property.wifi ? "text-green-500" : "text-gray-400"}`} />
                      <h4 className="font-medium">WiFi</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{property.wifi ? "Available" : "Not Available"}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Monthly Rent</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">${property.rentPrice}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Security Deposit</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">${property.depositAmount}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Condition</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{property.condition}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add Viewing Requests Card */}
            <Card>
              <CardHeader>
                <CardTitle>Viewing Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <ViewingRequestManagement propertyId={Number(id)} isOwner={user?.id === property.ownerId} />
              </CardContent>
            </Card>

            {/* Add Reviews Card */}
            <Card>
              <CardHeader>
                <CardTitle>Property Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <ReviewList propertyId={Number(id)} />
              </CardContent>
            </Card>

            {/* Edit Property Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Property</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) => updatePropertyMutation.mutate(data))}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Name</FormLabel>
                          <FormControl>
                            <Input defaultValue={property.name} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              defaultValue={property.description}
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input defaultValue={property.address} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Type</FormLabel>
                            <Select defaultValue={property.type} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="house">House</SelectItem>
                                <SelectItem value="apartment">Apartment</SelectItem>
                                <SelectItem value="villa">Villa</SelectItem>
                                <SelectItem value="studio">Studio</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="furnished"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Furnished Status</FormLabel>
                            <Select defaultValue={property.furnished} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="full">Fully Furnished</SelectItem>
                                <SelectItem value="semi">Semi Furnished</SelectItem>
                                <SelectItem value="unfurnished">Unfurnished</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="wifi"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">WiFi Available</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              defaultChecked={property.wifi}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Condition</FormLabel>
                          <FormControl>
                            <Input defaultValue={property.condition} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select defaultValue={property.category} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="luxury">Luxury</SelectItem>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="budget">Budget</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Add Image Upload Section */}
                    <div className="space-y-4">
                      <FormLabel>Property Images</FormLabel>

                      {/* Display Existing Images */}
                      {property.images && property.images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                          {property.images.map((imageUrl, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={imageUrl}
                                alt={`Property ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newImages = property.images.filter((_, i) => i !== index);
                                  updatePropertyMutation.mutate({
                                    ...property,
                                    images: newImages,
                                  });
                                }}
                                className="absolute top-1 right-1 bg-background/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload New Images */}
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2" />
                            <p className="mb-2 text-sm">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PNG, JPG or WEBP (MAX. 5MB each)
                            </p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={async (e) => {
                              if (!e.target.files?.length) return;

                              const formData = new FormData();
                              Array.from(e.target.files).forEach(file => {
                                formData.append('images', file); // Changed from image${index} to images
                              });

                              try {
                                const res = await fetch("/api/upload", {
                                  method: "POST",
                                  body: formData,
                                });

                                if (!res.ok) throw new Error("Failed to upload images");

                                const { urls } = await res.json();
                                updatePropertyMutation.mutate({
                                  ...property,
                                  images: [...(property.images || []), ...urls],
                                });
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to upload images",
                                  variant: "destructive",
                                });
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                      <Button variant="outline" type="button" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updatePropertyMutation.isPending}
                      >
                        {updatePropertyMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Update Property
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}