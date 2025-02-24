import { Property } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Home, Hotel, MapPin, Castle } from "lucide-react";
import { Link } from "wouter";
import { usePropertyCardAnimation, useFadeIn } from "@/lib/animations";
import { useRef } from "react";

interface PropertyCardProps {
  property: Property;
  isOwner?: boolean;
}

function getPropertyIcon(type: Property["type"], category: Property["category"]) {
  if (category === "luxury") return Castle;
  if (type === "apartment") return Building2;
  if (type === "villa") return Hotel;
  return Home;
}

export default function PropertyCard({ property, isOwner }: PropertyCardProps) {
  const PropertyIcon = getPropertyIcon(property.type, property.category);
  const cardRef = useRef<HTMLDivElement>(null);

  // Apply animations
  useFadeIn(cardRef, 0.2);
  usePropertyCardAnimation(cardRef);

  return (
    <Card ref={cardRef} className="overflow-hidden group">
      <div className="relative h-48 bg-muted flex items-center justify-center property-image">
        <div className={`
          w-full h-full flex items-center justify-center transition-all duration-300
          ${property.category === "luxury" ? "bg-gradient-to-br from-amber-100 to-amber-500" : 
            property.category === "standard" ? "bg-gradient-to-br from-blue-100 to-blue-500" :
            "bg-gradient-to-br from-green-100 to-green-500"}
        `}>
          <PropertyIcon className={`
            h-24 w-24 transition-transform duration-300
            ${property.category === "luxury" ? "text-amber-700" : 
              property.category === "standard" ? "text-blue-700" :
              "text-green-700"}
          `} />
        </div>
        <span className="absolute top-2 right-2 bg-background/90 text-foreground px-2 py-1 rounded-full text-sm transition-all duration-300">
          {property.status}
        </span>
      </div>

      <CardHeader className="property-content">
        <CardTitle className="flex items-start justify-between">
          <span className="text-xl transition-colors duration-300">{property.name}</span>
          <span className="text-lg font-bold transition-colors duration-300">{property.category}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="property-content">
        <div className="flex items-center gap-2 text-muted-foreground mb-2 transition-colors duration-300">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{property.address}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground transition-colors duration-300">
          <PropertyIcon className="h-4 w-4" />
          <span className="text-sm">
            {property.type.charAt(0).toUpperCase() + property.type.slice(1)} - {property.furnished}
          </span>
        </div>
      </CardContent>

      <CardFooter>
        <Link href={isOwner ? `/property/${property.id}/manage` : `/property/${property.id}`} className="w-full">
          <Button 
            variant={isOwner ? "outline" : "default"} 
            className="w-full transition-all duration-300 hover:scale-[1.02]"
          >
            {isOwner ? "Manage Property" : "View Details"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}