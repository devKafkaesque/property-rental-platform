import { Review } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Star, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ReviewListProps {
  propertyId: number;
}

export default function ReviewList({ propertyId }: ReviewListProps) {
  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: [`/api/reviews/property/${propertyId}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-4">
        No reviews yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews
        .filter(review => review.status === "published")
        .map((review) => (
          <Card key={review.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < review.rating ? "text-yellow-500 fill-current" : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(review.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{review.comment}</p>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
