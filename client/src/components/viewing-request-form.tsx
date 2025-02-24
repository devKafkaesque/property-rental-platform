import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertViewingRequestSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ViewingRequestFormProps {
  propertyId: number;
  onSuccess?: () => void;
}

export default function ViewingRequestForm({ propertyId, onSuccess }: ViewingRequestFormProps) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertViewingRequestSchema),
    defaultValues: {
      propertyId,
      preferredDate: new Date(),
      message: "",
    },
  });

  const viewingRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      // Convert date to ISO string before sending
      const formattedData = {
        ...data,
        preferredDate: data.preferredDate.toISOString(),
      };
      const res = await apiRequest("POST", "/api/viewing-requests", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/viewing-requests/tenant`] });
      toast({
        title: "Viewing request sent",
        description: "Your request has been sent to the property owner.",
      });
      form.reset();
      onSuccess?.();
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => viewingRequestMutation.mutate(data))}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="preferredDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Viewing Date</FormLabel>
              <FormControl>
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message to Property Owner</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Introduce yourself and specify your preferred viewing time"
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
          disabled={viewingRequestMutation.isPending}
        >
          Request Viewing
        </Button>
      </form>
    </Form>
  );
}