import { GoogleGenerativeAI } from "@google/generative-ai";
import { Property } from "@shared/schema";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to analyze properties');
  }
}

export async function generatePropertyDescription(details: {
  type: string;
  location: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  amenities?: string[];
}) {
  try {
    const prompt = `Generate a professional property description for:\n${JSON.stringify(details)}\n\n` +
      'Include:\n' +
      '1. An engaging description\n' +
      '2. Key highlights\n' +
      '3. SEO-friendly keywords\n\n' +
      'Format as JSON:\n' +
      '{\n' +
      '  "description": "engaging property description",\n' +
      '  "highlights": ["highlight1", "highlight2", ...],\n' +
      '  "seoKeywords": ["keyword1", "keyword2", ...]\n' +
      '}';

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const parsed = JSON.parse(text);

    return {
      description: parsed.description || "A well-maintained property in a desirable location.",
      highlights: parsed.highlights || ["Location", "Well maintained", "Modern amenities"],
      seoKeywords: parsed.seoKeywords || ["rental property", "real estate", details.type]
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
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
}) {
  try {
    const prompt = `Analyze pricing for this property:\n${JSON.stringify(details)}\n\n` +
      'Provide:\n' +
      '1. Suggested monthly rent\n' +
      '2. Price range (min/max)\n' +
      '3. Justification for pricing\n' +
      '4. Market insights\n\n' +
      'Format as JSON:\n' +
      '{\n' +
      '  "suggestedPrice": 2000,\n' +
      '  "priceRange": { "min": 1800, "max": 2200 },\n' +
      '  "justification": "explanation of price",\n' +
      '  "marketInsights": ["insight1", "insight2", ...]\n' +
      '}';

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const parsed = JSON.parse(text);

    return {
      suggestedPrice: parsed.suggestedPrice || 2000,
      priceRange: parsed.priceRange || { min: 1800, max: 2200 },
      justification: parsed.justification || "Based on current market rates and property features",
      marketInsights: parsed.marketInsights || ["Competitive market rates", "Good value proposition"]
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      suggestedPrice: 2000,
      priceRange: { min: 1800, max: 2200 },
      justification: "Based on current market rates and property features",
      marketInsights: ["Competitive market rates", "Good value proposition"]
    };
  }
}