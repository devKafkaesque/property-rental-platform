import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Property, PropertyCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import PropertyCard from "@/components/property-card";
import PropertySearch from "@/components/property-search";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function HomePage() {
  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PropertyCategory | "all">("all");

  const filteredProperties = properties?.filter(property => {
    // Only show available properties
    if (property.status !== "available") return false;

    const matchesSearch = !searchQuery || (
      property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const matchesCategory = selectedCategory === "all" || property.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Find Your Perfect Home</h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8">
            Discover amazing properties with KEYper's intelligent rental platform
          </p>
          <Link href="/auth">
            <Button size="lg" variant="secondary">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">Available Properties</h2>

        <PropertySearch 
          onSearch={(query, category) => {
            setSearchQuery(query);
            setSelectedCategory(category);
          }}
        />

        {isLoading ? (
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
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}