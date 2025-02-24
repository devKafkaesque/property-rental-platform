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

  const generateDescription = async () => {
    setIsGeneratingDescription(true);
    try {
      const response = await fetch("/api/ai/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(property),
      });

      if (!response.ok) throw new Error("Failed to generate description");

      const data = await response.json();
      if (onDescriptionGenerated) {
        onDescriptionGenerated(data.description);
      }
      
      toast({
        title: "Description Generated",
        description: "AI has created a new property description for you.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const analyzePrice = async () => {
    setIsAnalyzingPrice(true);
    try {
      const response = await fetch("/api/ai/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(property),
      });

      if (!response.ok) throw new Error("Failed to analyze price");

      const pricing = await response.json();
      if (onPriceAnalyzed) {
        onPriceAnalyzed(pricing);
      }

      toast({
        title: "Price Analysis Complete",
        description: `Suggested price: $${pricing.suggestedPrice}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze price. Please try again.",
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
            disabled={isGeneratingDescription}
            className="flex-1"
          >
            {isGeneratingDescription && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Generate Description
          </Button>
          <Button
            onClick={analyzePrice}
            disabled={isAnalyzingPrice}
            className="flex-1"
          >
            {isAnalyzingPrice && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Analyze Price
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
