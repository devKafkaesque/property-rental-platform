import OpenAI from "openai";
import { Property } from "@shared/schema";

const openai = new OpenAI({ baseURL: "https://api.x.ai/v1", apiKey: process.env.XAI_API_KEY });

export async function compareProperties(properties: Property[]) {
  try {
    const propertyDescriptions = properties.map(p => `
      Property: ${p.name}
      Type: ${p.type}
      Category: ${p.category}
      Bedrooms: ${p.bedrooms}
      Bathrooms: ${p.bathrooms}
      Square Footage: ${p.squareFootage}
      Rent: $${p.rentPrice}
      Features: ${[
        p.wifi ? 'WiFi' : null,
        p.petsAllowed ? 'Pet Friendly' : null,
        ...p.amenities || [],
        ...p.utilities || [],
        ...p.accessibility || [],
        ...p.securityFeatures || []
      ].filter(Boolean).join(', ')}
    `).join('\n\n');

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are a real estate expert analyzing properties for comparison. Provide a detailed analysis highlighting pros and cons for each property, and recommend the best options based on different tenant preferences (e.g., families, students, professionals)."
        },
        {
          role: "user",
          content: `Please analyze and compare these properties:\n${propertyDescriptions}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('xAI API Error:', error);
    throw new Error('Failed to analyze properties');
  }
}
