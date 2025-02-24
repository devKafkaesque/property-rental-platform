import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Retry configuration
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRIES = 3;

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: Error | null = null;
  let delay = INITIAL_RETRY_DELAY;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!lastError.message.includes('429') || attempt === MAX_RETRIES) {
        throw lastError;
      }

      console.log(`Rate limited, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }

  throw lastError;
}

export async function getPropertyRecommendations(
  preferences: {
    budget: number;
    location: string;
    amenities?: string[];
  }
): Promise<{ 
  explanation: string;
  score: number;
}> {
  return withRetry(async () => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a real estate expert. Analyze the property preferences and provide recommendations with a matching score (0-1) and explanation.",
          },
          {
            role: "user",
            content: JSON.stringify(preferences),
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in response");
      }

      const result = JSON.parse(content);
      return {
        explanation: result.explanation,
        score: Math.max(0, Math.min(1, result.score)),
      };
    } catch (error: unknown) {
      console.error("OpenAI API Error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error("Failed to get recommendations: " + errorMessage);
    }
  });
}

export async function generatePropertyDescription(
  details: {
    type: string;
    features: string[];
    location: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    yearBuilt?: number;
    amenities?: string[];
  }
): Promise<{
  description: string;
  highlights: string[];
  seoKeywords: string[];
}> {
  return withRetry(async () => {
    try {
      console.log("Generating description for:", JSON.stringify(details, null, 2));
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert real estate copywriter specializing in SEO-optimized property descriptions. 
            Create an engaging, detailed property description that highlights key features and appeals to potential tenants. 
            Format the response as a JSON with three fields:
            - description: A compelling 2-3 paragraph description
            - highlights: An array of 3-5 key selling points
            - seoKeywords: An array of relevant SEO keywords for the listing`,
          },
          {
            role: "user",
            content: JSON.stringify({
              ...details,
              features: details.features || [],
              amenities: details.amenities || []
            }),
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in response");
      }

      console.log("OpenAI Response:", content);
      return JSON.parse(content);
    } catch (error: unknown) {
      console.error("OpenAI API Error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error("Failed to generate description: " + errorMessage);
    }
  });
}

export async function analyzePricing(
  propertyDetails: {
    type: string;
    location: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    amenities?: string[];
    condition?: string;
    yearBuilt?: number;
    currentMarketPrices?: {
      min: number;
      max: number;
      average: number;
    };
  }
): Promise<{
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  justification: string;
  marketInsights: string[];
}> {
  return withRetry(async () => {
    try {
      console.log("Analyzing pricing for:", JSON.stringify(propertyDetails, null, 2));
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert real estate pricing analyst. Analyze the property details and market data to suggest optimal rental pricing.
            Consider location, property features, market trends, and amenities.
            Format response as JSON with fields:
            - suggestedPrice: A specific recommended monthly rental price
            - priceRange: Object with min and max monthly rental prices
            - justification: A brief explanation of the pricing recommendation
            - marketInsights: Array of key market insights that influenced the price`,
          },
          {
            role: "user",
            content: JSON.stringify({
              ...propertyDetails,
              amenities: propertyDetails.amenities || []
            }),
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in response");
      }

      console.log("OpenAI Response:", content);
      const result = JSON.parse(content);
      return {
        suggestedPrice: Math.round(result.suggestedPrice),
        priceRange: {
          min: Math.round(result.priceRange.min),
          max: Math.round(result.priceRange.max),
        },
        justification: result.justification,
        marketInsights: result.marketInsights,
      };
    } catch (error: unknown) {
      console.error("OpenAI API Error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error("Failed to analyze pricing: " + errorMessage);
    }
  });
}