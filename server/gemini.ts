import { GoogleGenerativeAI } from "@google/generative-ai";
import { Property } from "@shared/schema";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

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
        ...(p.amenities || []),
        ...(p.utilities || []),
        ...(p.accessibility || []),
        ...(p.securityFeatures || [])
      ].filter(Boolean).join(', ')}
    `).join('\n\n');

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `As a real estate expert, analyze these properties: \n${propertyDescriptions}\n\n` +
      'For each property, provide:\n' +
      '1. A list of key advantages (pros)\n' +
      '2. A list of potential considerations (cons)\n' +
      '3. What type of tenant this property would be best suited for\n\n' +
      'Format the response as a JSON object with this structure:\n' +
      '{\n' +
      '  "properties": {\n' +
      '    "[property_id]": {\n' +
      '      "pros": ["advantage1", "advantage2", ...],\n' +
      '      "cons": ["consideration1", "consideration2", ...],\n' +
      '      "bestFor": "description of ideal tenant"\n' +
      '    }\n' +
      '  }\n' +
      '}';

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the response as JSON
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to analyze properties');
  }
}