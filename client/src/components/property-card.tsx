import { Property } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, MapPin } from "lucide-react";
import { Link } from "wouter";

interface PropertyCardProps {
  property: Property;
  isOwner?: boolean;
}

export default function PropertyCard({ property, isOwner }: PropertyCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-48">
        <img
          src={property.imageUrl}
          alt={property.title}
          className="w-full h-full object-cover"
        />
        {property.available && (
          <span className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-sm">
            Available
          </span>
        )}
      </div>
      
      <CardHeader>
        <CardTitle className="flex items-start justify-between">
          <span className="text-xl">{property.title}</span>
          <span className="text-lg font-bold">${property.price}/mo</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{property.address}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span className="text-sm">Property ID: {property.id}</span>
        </div>
      </CardContent>
      
      <CardFooter>
        <Link href={`/property/${property.id}`} className="w-full">
          <Button variant={isOwner ? "outline" : "default"} className="w-full">
            {isOwner ? "Manage Property" : "View Details"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
