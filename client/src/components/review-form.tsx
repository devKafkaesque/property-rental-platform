import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReviewSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Star } from "lucide-react";

interface ReviewFormProps {
  propertyId: number;
  onSuccess?: () => void;
}

export default function ReviewForm({ propertyId, onSuccess }: ReviewFormProps) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertReviewSchema),
    defaultValues: {
      propertyId,
      rating: 5,
      comment: "",
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/reviews", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reviews/property/${propertyId}`] });
      toast({
        title: "Review submitted",
        description: "Your review has been submitted for approval.",
      });
      form.reset();
      onSuccess?.();
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => reviewMutation.mutate(data))}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => field.onChange(rating)}
                      className={`p-1 rounded-full hover:bg-muted/50 transition-colors ${
                        field.value >= rating ? "text-yellow-500" : "text-muted-foreground"
                      }`}
                    >
                      <Star className="h-6 w-6 fill-current" />
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comment</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share your experience with this property"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={reviewMutation.isPending}
        >
          Submit Review
        </Button>
      </form>
    </Form>
  );
}
