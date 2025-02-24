import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error("Failed to get recommendations: " + errorMessage);
  }
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
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert real estate copywriter specializing in SEO-optimized property descriptions. 
          Create an engaging, detailed property description that highlights key features and appeals to potential tenants. 
          Include SEO-friendly keywords and property highlights.
          Format the response as a JSON with three fields:
          - description: A compelling 2-3 paragraph description
          - highlights: An array of 3-5 key selling points
          - seoKeywords: An array of relevant SEO keywords`,
        },
        {
          role: "user",
          content: JSON.stringify(details),
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in response");
    }

    return JSON.parse(content);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error("Failed to generate description: " + errorMessage);
  }
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
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert real estate pricing analyst. Analyze the property details and market data to suggest optimal rental pricing.
          Consider location, property features, market trends, and amenities.
          Provide a detailed analysis with:
          - A specific suggested price
          - A recommended price range
          - Justification for the pricing
          - Key market insights
          Format response as JSON with fields: suggestedPrice, priceRange (min, max), justification, and marketInsights (array)`,
        },
        {
          role: "user",
          content: JSON.stringify(propertyDetails),
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
      suggestedPrice: Math.round(result.suggestedPrice),
      priceRange: {
        min: Math.round(result.priceRange.min),
        max: Math.round(result.priceRange.max),
      },
      justification: result.justification,
      marketInsights: result.marketInsights,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error("Failed to analyze pricing: " + errorMessage);
  }
}