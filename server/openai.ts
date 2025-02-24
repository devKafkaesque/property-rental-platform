import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
  try {
    const prompt = `You are a real estate expert. Analyze the following property preferences and provide recommendations with a matching score (0-1) and explanation. Format your response as JSON with two fields: explanation (string) and score (number between 0 and 1).

Property details: ${JSON.stringify(preferences)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error("Failed to get recommendations: " + errorMessage);
  }
}

export async function generatePropertyDescription(
  details: {
    type: string;
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
    console.log("Generating description for:", JSON.stringify(details, null, 2));

    const prompt = `You are an expert real estate copywriter specializing in SEO-optimized property descriptions. 
    Create an engaging, detailed property description that highlights key features and appeals to potential tenants.
    Format your response as a JSON object with three fields:
    - description: A compelling 2-3 paragraph description
    - highlights: An array of 3-5 key selling points
    - seoKeywords: An array of relevant SEO keywords for the listing

    Property details: ${JSON.stringify({
      ...details,
      features: [],
      amenities: details.amenities || []
    })}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("Gemini Response:", text);
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
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
    console.log("Analyzing pricing for:", JSON.stringify(propertyDetails, null, 2));

    const prompt = `You are an expert real estate pricing analyst. Analyze the property details and market data to suggest optimal rental pricing.
    Consider location, property features, market trends, and amenities.
    Format your response as a JSON object with fields:
    - suggestedPrice: A specific recommended monthly rental price (number)
    - priceRange: Object with min and max monthly rental prices (numbers)
    - justification: A brief explanation of the pricing recommendation
    - marketInsights: Array of key market insights that influenced the price

    Property details: ${JSON.stringify({
      ...propertyDetails,
      amenities: propertyDetails.amenities || []
    })}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("Gemini Response:", text);
    const pricing = JSON.parse(text);

    return {
      suggestedPrice: Math.round(pricing.suggestedPrice),
      priceRange: {
        min: Math.round(pricing.priceRange.min),
        max: Math.round(pricing.priceRange.max),
      },
      justification: pricing.justification,
      marketInsights: pricing.marketInsights,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error("Failed to analyze pricing: " + errorMessage);
  }
}