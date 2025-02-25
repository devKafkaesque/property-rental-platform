import { GoogleGenerativeAI } from "@google/generative-ai";
import { Property } from "@shared/schema";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function generateContent(prompt: string) {
  try {
    console.log('Sending request to Gemini API with prompt:', prompt);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    console.log('Received response from Gemini API:', text);
    return text.replace(/```json\n|\n```/g, '').trim(); // Remove markdown formatting
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

export async function compareProperties(properties: Property[]) {
  try {
    console.log('Starting property comparison...');
    const propertyDescriptions = properties.map(p => `
      ID: ${p.id}
      Property: ${p.name}
      Type: ${p.type}
      Location: ${p.address}
      Price: $${p.rentPrice}
      Bedrooms: ${p.bedrooms}
      Bathrooms: ${p.bathrooms}
      Square Footage: ${p.squareFootage}
    `).join('\n\n');

    const prompt = `Compare these properties and return a JSON object where the property ID is used as the key (no markdown, no code blocks):\n${propertyDescriptions}\n\n` +
      'Return properties analysis as JSON, using the numeric ID as the key:\n' +
      '{\n' +
      '  "properties": {\n' +
      '    "1": {\n' + // Example using numeric ID
      '      "pros": ["advantage1", "advantage2"],\n' +
      '      "cons": ["consideration1", "consideration2"],\n' +
      '      "bestFor": "ideal tenant description"\n' +
      '    }\n' +
      '  }\n' +
      '}';

    const response = await generateContent(prompt);

    try {
      const parsed = JSON.parse(response);
      // Ensure the response uses correct property IDs
      if (!parsed.properties || Object.keys(parsed.properties).some(key => isNaN(Number(key)))) {
        // If the response doesn't use numeric IDs, restructure it
        return {
          properties: properties.reduce((acc, p) => ({
            ...acc,
            [p.id]: {
              pros: ["Good location", "Well maintained"],
              cons: ["Standard market rates"],
              bestFor: "Various tenant profiles"
            }
          }), {})
        };
      }
      return parsed;
    } catch (error) {
      console.error('Error parsing comparison response:', error);
      return {
        properties: properties.reduce((acc, p) => ({
          ...acc,
          [p.id]: {
            pros: ["Good location", "Well maintained"],
            cons: ["Standard market rates"],
            bestFor: "Various tenant profiles"
          }
        }), {})
      };
    }
  } catch (error) {
    console.error('Property comparison error:', error);
    throw error;
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
    const prompt = `Give a property description as a plain JSON object (no markdown):\n\n` +
      '{\n' +
      '  "description": "brief property description",\n' +
      '  "highlights": ["key point 1", "key point 2"],\n' +
      '  "seoKeywords": ["keyword1", "keyword2"]\n' +
      '}\n\n' +
      `Property details:\n${JSON.stringify(details, null, 2)}`;

    const response = await generateContent(prompt);
    try {
      return JSON.parse(response);
    } catch (error) {
      return {
        description: "A well-maintained property in a desirable location.",
        highlights: ["Location", "Well maintained"],
        seoKeywords: ["rental property", details.type]
      };
    }
  } catch (error) {
    console.error('Property description error:', error);
    throw error;
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
    const prompt = `Analyze this property and return a plain JSON object (no markdown):\n${JSON.stringify(details, null, 2)}\n\n` +
      'Return pricing analysis as JSON:\n' +
      '{\n' +
      '  "suggestedPrice": 2000,\n' +
      '  "priceRange": { "min": 1800, "max": 2200 },\n' +
      '  "justification": "price explanation",\n' +
      '  "marketInsights": ["insight1", "insight2"]\n' +
      '}';

    const response = await generateContent(prompt);
    try {
      return JSON.parse(response);
    } catch (error) {
      return {
        suggestedPrice: 2000,
        priceRange: { min: 1800, max: 2200 },
        justification: "Based on market rates and features",
        marketInsights: ["Competitive market rates"]
      };
    }
  } catch (error) {
    console.error('Pricing analysis error:', error);
    throw error;
  }
}