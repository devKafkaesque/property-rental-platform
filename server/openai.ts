import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
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

// Fallback responses when AI is unavailable
const fallbackResponses = {
  recommendations: {
    explanation: "Based on standard market analysis, this property appears to be a good match for your criteria.",
    score: 0.75
  },
  description: {
    description: "A well-maintained property in a desirable location.",
    highlights: ["Good location", "Well maintained", "Modern amenities"],
    seoKeywords: ["rental property", "apartment", "real estate"]
  },
  pricing: {
    suggestedPrice: 2000,
    priceRange: { min: 1800, max: 2200 },
    justification: "Price based on current market rates in the area.",
    marketInsights: ["Competitive market rates", "Good value for amenities"]
  }
};

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
          content: "Analyze property and return: {\"explanation\": \"brief explanation\", \"score\": 0.85}"
        },
        {
          role: "user",
          content: `Rate match: ${JSON.stringify(preferences)}`
        }
      ],
      max_tokens: 150 // Limit response size
    }));

    const content = completion.choices[0].message.content;
    if (!content) {
      console.log("Using fallback response due to empty OpenAI response");
      return fallbackResponses.recommendations;
    }

    try {
      const parsed = JSON.parse(content);
      if (!parsed.explanation || typeof parsed.score !== 'number') {
        throw new Error("Invalid response structure");
      }
      return parsed;
    } catch (parseError) {
      console.error("Failed to parse OpenAI response, using fallback");
      return fallbackResponses.recommendations;
    }
  } catch (error) {
    console.error("OpenAI API Error:", error);
    console.log("Using fallback response due to API error");
    return fallbackResponses.recommendations;
  }
}

export async function generatePropertyDescription(details: {
  type: string;
  location: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  amenities?: string[];
}): Promise<{
  description: string;
  highlights: string[];
  seoKeywords: string[];
}> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Generate a property description in JSON format with: description (string), highlights (array of strings), and seoKeywords (array of strings)"
        },
        {
          role: "user",
          content: `Create an engaging property description for: ${JSON.stringify(details)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    const response = JSON.parse(content || "{}");

    return {
      description: response.description || "A well-maintained property in a desirable location.",
      highlights: response.highlights || ["Location", "Well maintained", "Modern amenities"],
      seoKeywords: response.seoKeywords || ["rental property", "real estate", details.type]
    };
  } catch (error) {
    console.error('OpenAI Error:', error);
    return {
      description: "A well-maintained property in a desirable location.",
      highlights: ["Location", "Well maintained", "Modern amenities"],
      seoKeywords: ["rental property", "real estate", details.type]
    };
  }
}

export async function analyzePricing(details: {
  type: string;
  location: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  amenities?: string[];
}): Promise<{
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  justification: string;
  marketInsights: string[];
}> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Analyze property pricing and return JSON with: suggestedPrice (number), priceRange (object with min and max numbers), justification (string), and marketInsights (array of strings)"
        },
        {
          role: "user",
          content: `Suggest pricing for property: ${JSON.stringify(details)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    const response = JSON.parse(content || "{}");

    return {
      suggestedPrice: response.suggestedPrice || 2000,
      priceRange: response.priceRange || { min: 1800, max: 2200 },
      justification: response.justification || "Based on current market rates and property features",
      marketInsights: response.marketInsights || ["Competitive market rates", "Good value proposition"]
    };
  } catch (error) {
    console.error('OpenAI Error:', error);
    return {
      suggestedPrice: 2000,
      priceRange: { min: 1800, max: 2200 },
      justification: "Based on current market rates and property features",
      marketInsights: ["Competitive market rates", "Good value proposition"]
    };
  }
}