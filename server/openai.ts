import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is not set. Please configure your OpenAI API key.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const completion = await withRetry(async () => openai.chat.completions.create({
      model: "gpt-4",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a real estate expert. Analyze the property preferences and provide recommendations with a matching score and explanation. Respond with JSON containing 'explanation' (string) and 'score' (number between 0 and 1)."
        },
        {
          role: "user",
          content: `Analyze these property preferences: ${JSON.stringify(preferences)}`
        }
      ]
    }));

    return JSON.parse(completion.choices[0].message.content!);
  } catch (error) {
    console.error("OpenAI API Error:", error);
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
    const completion = await withRetry(async () => openai.chat.completions.create({
      model: "gpt-4",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an expert real estate copywriter specializing in SEO-optimized property descriptions. Create engaging descriptions that highlight key features. Respond with JSON containing 'description' (2-3 paragraphs), 'highlights' (3-5 key points), and 'seoKeywords' (relevant SEO terms)."
        },
        {
          role: "user",
          content: `Create a property description for: ${JSON.stringify({
            ...details,
            amenities: details.amenities || []
          })}`
        }
      ]
    }));

    return JSON.parse(completion.choices[0].message.content!);
  } catch (error) {
    console.error("OpenAI API Error:", error);
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
    const completion = await withRetry(async () => openai.chat.completions.create({
      model: "gpt-4",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an expert real estate pricing analyst. Analyze property details and market data to suggest optimal rental pricing. Respond with JSON containing 'suggestedPrice' (number), 'priceRange' (object with min/max), 'justification' (string), and 'marketInsights' (array of strings)."
        },
        {
          role: "user",
          content: `Analyze pricing for this property: ${JSON.stringify({
            ...propertyDetails,
            amenities: propertyDetails.amenities || []
          })}`
        }
      ]
    }));

    const pricing = JSON.parse(completion.choices[0].message.content!);
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
    console.error("OpenAI API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error("Failed to analyze pricing: " + errorMessage);
  }
}