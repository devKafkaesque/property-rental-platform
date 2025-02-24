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
import { Upload, X, Loader2 } from "lucide-react";
import { useState } from "react";

interface PropertyFormProps {
  onSuccess?: () => void;
}

export default function PropertyForm({ onSuccess }: PropertyFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

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
    },
  });

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
    selectedImages.forEach((file, index) => {
      formData.append(`image${index}`, file);
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
        const imageUrls = await uploadImages();
        const propertyData = {
          ...data,
          images: imageUrls,
        };
        const res = await apiRequest("POST", "/api/properties", propertyData);
        return res.json();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload images or create property",
          variant: "destructive",
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/owner/${user?.id}`] });
      toast({
        title: "Property created",
        description: "Your property has been listed successfully.",
      });
      onSuccess?.();
    },
  });

  return (
    <ScrollArea className="h-[80vh] pr-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => createPropertyMutation.mutate(data))}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter property name" {...field} />
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
                    placeholder="Describe your property"
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
                  <Input placeholder="Enter property address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                <FormLabel>Property Condition</FormLabel>
                <FormControl>
                  <Input placeholder="Enter property condition" {...field} />
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
        </form>
      </Form>
    </ScrollArea>
  );
}