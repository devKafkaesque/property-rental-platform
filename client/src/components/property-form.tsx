import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPropertySchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Upload, X, Loader2, DollarSign, Home } from "lucide-react";
import { AIPropertyHelper } from "./ai-property-helper";

interface PropertyFormProps {
  onSuccess?: () => void;
}

export default function PropertyForm({ onSuccess }: PropertyFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);

  const form = useForm({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      type: "house",
      furnished: "full",
      wifi: false,
      restrictions: {},
      condition: "",
      category: "standard",
      images: [],
      rentPrice: 0,
      depositAmount: 0,
      bedrooms: 1,
      bathrooms: 1,
      squareFootage: 0,
    },
  });

  const handleDescriptionGenerated = (description: string) => {
    form.setValue("description", description);
  };

  const handlePriceAnalyzed = (pricing: {
    suggestedPrice: number;
    priceRange: { min: number; max: number };
    justification: string;
    marketInsights: string[];
  }) => {
    setSuggestedPrice(pricing.suggestedPrice);
    form.setValue("rentPrice", pricing.suggestedPrice);
    form.setValue("depositAmount", pricing.suggestedPrice);

    toast({
      title: "Price Analysis",
      description: `Suggested price range: $${pricing.priceRange.min} - $${pricing.priceRange.max}\n${pricing.justification}`,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedImages(files);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (selectedImages.length === 0) return [];

    const formData = new FormData();
    selectedImages.forEach(file => {
      formData.append('images', file);
    });

    try {
      setUploading(true);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload images");

      const data = await res.json();
      return data.urls;
    } catch (error) {
      console.error("Error uploading images:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const createPropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        console.log('Form data before submission:', data);

        if (!data.name || !data.description || !data.address) {
          throw new Error("Please fill in all required fields");
        }

        if (data.rentPrice <= 0) {
          throw new Error("Rent price must be greater than 0");
        }

        if (data.depositAmount <= 0) {
          throw new Error("Deposit amount must be greater than 0");
        }

        const formData = new FormData();
        formData.append('data', JSON.stringify(data));

        if (selectedImages.length > 0) {
          console.log('Uploading images...');
          selectedImages.forEach((file, index) => {
            formData.append(`image`, file);
          });
        }

        const response = await fetch('/api/properties', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create property");
        }

        return response.json();
      } catch (error) {
        console.error('Property creation error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/owner/${user?.id}`] });
      toast({
        title: "Success",
        description: "Your property has been listed successfully.",
      });
      onSuccess?.();
    },
  });

  return (
    <ScrollArea className="h-[80vh] pr-4">
      <AIPropertyHelper
        property={{
          type: form.watch("type"),
          location: form.watch("address"),
          features: [],
          bedrooms: form.watch("bedrooms"),
          bathrooms: form.watch("bathrooms"),
          squareFootage: form.watch("squareFootage"),
          amenities: [form.watch("wifi") ? "WiFi" : ""].filter(Boolean),
        }}
        onDescriptionGenerated={handleDescriptionGenerated}
        onPriceAnalyzed={handlePriceAnalyzed}
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => {
            console.log('Form submitted with data:', data);
            createPropertyMutation.mutate(data);
          })}
          className="space-y-4 mt-6"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property Name *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter property name" 
                    {...field} 
                    required
                  />
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
                <FormLabel>Description *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your property"
                    className="min-h-[100px]"
                    {...field}
                    required
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
                <FormLabel>Address *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter property address" 
                    {...field}
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="bedrooms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bedrooms *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Number of bedrooms"
                      {...field}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 1)}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bathrooms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bathrooms *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Number of bathrooms"
                      {...field}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 1)}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="squareFootage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Square Footage *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Square footage"
                      {...field}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select furnished status" />
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
                <FormLabel>Property Condition *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter property condition" 
                    {...field}
                    required 
                  />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property category" />
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

          <div className="space-y-4">
            <FormLabel>Property Images</FormLabel>
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
                  onChange={handleImageChange}
                />
              </label>
            </div>

            {selectedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {selectedImages.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-background/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="rentPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Rent (USD) *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Enter monthly rent"
                        className="pl-9"
                        {...field}
                        required
                        min="1"
                        value={field.value}
                        onChange={(e) => {
                          const value = e.target.valueAsNumber || 0;
                          field.onChange(value);
                          if (!form.getValues("depositAmount")) {
                            form.setValue("depositAmount", value);
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="depositAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Security Deposit (USD) *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Enter security deposit"
                        className="pl-9"
                        {...field}
                        required
                        min="1"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {suggestedPrice && (
            <div className="p-4 border rounded-lg bg-muted/50 mb-4">
              <p className="font-medium">AI Suggested Price: ${suggestedPrice}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full mt-6"
            disabled={createPropertyMutation.isPending || uploading}
          >
            {(createPropertyMutation.isPending || uploading) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploading ? "Uploading Images..." : "Creating Property..."}
              </>
            ) : (
              "Create Property"
            )}
          </Button>

          {Object.keys(form.formState.errors).length > 0 && (
            <div className="text-red-500 text-sm mt-2">
              {Object.entries(form.formState.errors).map(([key, error]) => (
                <p key={key}>{error.message}</p>
              ))}
            </div>
          )}
        </form>
      </Form>
    </ScrollArea>
  );
}