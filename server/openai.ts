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

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
      model: "gpt-4o",
      temperature: 0.2, // Lower temperature for more consistent, structured output
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a real estate expert. Analyze property preferences and provide recommendations.
          Return a JSON object with exactly these fields:
          {
            "explanation": "A detailed explanation string",
            "score": 0.85 // A number between 0 and 1
          }`
        },
        {
          role: "user",
          content: `Analyze these property preferences: ${JSON.stringify(preferences)}`
        }
      ]
    }));

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    try {
      const parsed = JSON.parse(content);
      if (!parsed.explanation || typeof parsed.score !== 'number') {
        throw new Error("Invalid response structure");
      }
      return parsed;
    } catch (parseError) {
      console.error("Raw OpenAI response:", content);
      throw new Error("Failed to parse OpenAI response");
    }
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
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a real estate copywriter. Create property descriptions.
          Return a JSON object with exactly these fields:
          {
            "description": "A 2-3 paragraph description string",
            "highlights": ["3-5 key points as strings"],
            "seoKeywords": ["relevant SEO terms as strings"]
          }`
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

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    try {
      const parsed = JSON.parse(content);
      if (!parsed.description || !Array.isArray(parsed.highlights) || !Array.isArray(parsed.seoKeywords)) {
        throw new Error("Invalid response structure");
      }
      return parsed;
    } catch (parseError) {
      console.error("Raw OpenAI response:", content);
      throw new Error("Failed to parse OpenAI response");
    }
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
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a real estate pricing analyst. Analyze properties and suggest prices.
          Return a JSON object with exactly these fields:
          {
            "suggestedPrice": 2500, // A number
            "priceRange": {
              "min": 2300, // A number
              "max": 2700  // A number
            },
            "justification": "Price reasoning string",
            "marketInsights": ["Market insight strings"]
          }`
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

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    try {
      const parsed = JSON.parse(content);
      if (!parsed.suggestedPrice || !parsed.priceRange || !parsed.justification || !Array.isArray(parsed.marketInsights)) {
        throw new Error("Invalid response structure");
      }
      return {
        suggestedPrice: Math.round(parsed.suggestedPrice),
        priceRange: {
          min: Math.round(parsed.priceRange.min),
          max: Math.round(parsed.priceRange.max),
        },
        justification: parsed.justification,
        marketInsights: parsed.marketInsights,
      };
    } catch (parseError) {
      console.error("Raw OpenAI response:", content);
      throw new Error("Failed to parse OpenAI response");
    }
  } catch (error) {
    console.error("OpenAI API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error("Failed to analyze pricing: " + errorMessage);
  }
}