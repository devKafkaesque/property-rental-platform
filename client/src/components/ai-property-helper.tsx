import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AIPropertyHelperProps {
  property: {
    type: string;
    location: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    amenities?: string[];
    yearBuilt?: number;
    features: string[];
  };
  onDescriptionGenerated?: (description: string) => void;
  onPriceAnalyzed?: (pricing: {
    suggestedPrice: number;
    priceRange: { min: number; max: number };
    justification: string;
    marketInsights: string[];
  }) => void;
}

export function AIPropertyHelper({
  property,
  onDescriptionGenerated,
  onPriceAnalyzed,
}: AIPropertyHelperProps) {
  const { toast } = useToast();
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isAnalyzingPrice, setIsAnalyzingPrice] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const generateDescription = async () => {
    if (!property.location) {
      toast({
        title: "Missing Information",
        description: "Please enter a property location first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingDescription(true);
    setRetryCount(0);
    try {
      const response = await fetch("/api/ai/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...property,
          features: property.features || [],
          amenities: property.amenities || []
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate description");
      }

      const data = await response.json();
      if (onDescriptionGenerated) {
        onDescriptionGenerated(data.description);
      }

      toast({
        title: "Description Generated",
        description: "AI has created a new property description for you.",
      });
    } catch (error) {
      const message = error instanceof Error 
        ? error.message
        : "Failed to generate description. Please try again.";

      if (message.includes("rate limit") && retryCount < 3) {
        setRetryCount(prev => prev + 1);
        toast({
          title: "Retrying...",
          description: `Rate limit reached. Attempt ${retryCount + 1} of 3...`,
        });
        setTimeout(generateDescription, 2000 * Math.pow(2, retryCount));
        return;
      }

      toast({
        title: "Error",
        description: message.includes("rate limit")
          ? "Rate limit exceeded. Please try again in a few minutes."
          : message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const analyzePrice = async () => {
    if (!property.location) {
      toast({
        title: "Missing Information",
        description: "Please enter a property location first.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzingPrice(true);
    setRetryCount(0);
    try {
      const response = await fetch("/api/ai/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...property,
          amenities: property.amenities || []
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to analyze price");
      }

      const pricing = await response.json();
      if (onPriceAnalyzed) {
        onPriceAnalyzed(pricing);
      }

      toast({
        title: "Price Analysis Complete",
        description: `Suggested price: $${pricing.suggestedPrice}`,
      });
    } catch (error) {
      const message = error instanceof Error 
        ? error.message
        : "Failed to analyze price. Please try again.";

      if (message.includes("rate limit") && retryCount < 3) {
        setRetryCount(prev => prev + 1);
        toast({
          title: "Retrying...",
          description: `Rate limit reached. Attempt ${retryCount + 1} of 3...`,
        });
        setTimeout(analyzePrice, 2000 * Math.pow(2, retryCount));
        return;
      }

      toast({
        title: "Error",
        description: message.includes("rate limit")
          ? "Rate limit exceeded. Please try again in a few minutes."
          : message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingPrice(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI Property Assistant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
          <Button
            onClick={generateDescription}
            disabled={isGeneratingDescription || !property.location}
            className="flex-1"
          >
            {isGeneratingDescription && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isGeneratingDescription ? "Generating..." : "Generate Description"}
          </Button>
          <Button
            onClick={analyzePrice}
            disabled={isAnalyzingPrice || !property.location}
            className="flex-1"
          >
            {isAnalyzingPrice && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isAnalyzingPrice ? "Analyzing..." : "Analyze Price"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}