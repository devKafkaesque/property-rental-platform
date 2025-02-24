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
      model: "gpt-3.5-turbo",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Analyze property preferences and return: {"explanation": "brief explanation", "score": 0.85}`
        },
        {
          role: "user",
          content: `Rate match for preferences: ${JSON.stringify(preferences)}`
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
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Create property description and return: {
            "description": "2-3 sentences",
            "highlights": ["3 key points"],
            "seoKeywords": ["3-5 terms"]
          }`
        },
        {
          role: "user",
          content: `Describe property: ${JSON.stringify({
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
      model: "gpt-3.5-turbo",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Analyze property pricing and return: {
            "suggestedPrice": 2500,
            "priceRange": {"min": 2300, "max": 2700},
            "justification": "1-2 sentences",
            "marketInsights": ["2-3 key points"]
          }`
        },
        {
          role: "user",
          content: `Suggest price for: ${JSON.stringify({
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