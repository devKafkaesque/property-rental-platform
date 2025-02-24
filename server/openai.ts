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
  }
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Generate an engaging and professional property description for a real estate listing.",
        },
        {
          role: "user",
          content: JSON.stringify(details),
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in response");
    }

    return content;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error("Failed to generate description: " + errorMessage);
  }
}