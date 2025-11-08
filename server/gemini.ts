import { GoogleGenAI, Type } from "@google/genai";

// Using Replit's AI Integrations service for Gemini access
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  },
});

interface TripParameters {
  origin?: string;
  destination?: string;
  fuelLevel?: number;
  vehicleRange?: number;
  preferences?: {
    scenic?: boolean;
    fast?: boolean;
    avoidTolls?: boolean;
    restaurantPreferences?: {
      cuisine?: string;
      rating?: number;
      priceLevel?: string;
      kidFriendly?: boolean;
      openNow?: boolean;
    };
  };
  action?: string;
}

export async function parseUserRequest(userMessage: string, conversationHistory: string[]): Promise<TripParameters> {
  const context = conversationHistory.length > 0 
    ? `Previous conversation:\n${conversationHistory.join('\n')}\n\n` 
    : '';

  const prompt = `${context}User message: "${userMessage}"

Extract trip planning parameters from this message. Consider the conversation history for context.
If the user mentions:
- "1/4 tank" or similar fuel descriptions, estimate fuelLevel as 0.25 (25%)
- Vehicle type (RAV4, sedan, truck), estimate vehicleRange in miles (RAV4 ≈ 400 miles)
- "scenic" or "prettier route", set scenic: true
- "fast" or "fastest", set fast: true
- Restaurant requirements (cuisine, rating, price, kid-friendly, time constraints)
- "avoid tolls", set avoidTolls: true

Return ONLY the extracted parameters. Leave fields undefined if not mentioned.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          origin: { type: Type.STRING },
          destination: { type: Type.STRING },
          fuelLevel: { type: Type.NUMBER },
          vehicleRange: { type: Type.NUMBER },
          preferences: {
            type: Type.OBJECT,
            properties: {
              scenic: { type: Type.BOOLEAN },
              fast: { type: Type.BOOLEAN },
              avoidTolls: { type: Type.BOOLEAN },
              restaurantPreferences: {
                type: Type.OBJECT,
                properties: {
                  cuisine: { type: Type.STRING },
                  rating: { type: Type.NUMBER },
                  priceLevel: { type: Type.STRING },
                  kidFriendly: { type: Type.BOOLEAN },
                  openNow: { type: Type.BOOLEAN },
                }
              }
            }
          },
          action: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text || "{}") as TripParameters;
}

export async function generateStopReason(
  stopType: string,
  stopName: string,
  stopDetails: any,
  routeContext: string
): Promise<string> {
  const prompt = `Generate a concise, helpful reason (2-3 sentences) for why this ${stopType} stop is recommended:

Name: ${stopName}
Details: ${JSON.stringify(stopDetails)}
Route context: ${routeContext}

Focus on what makes this location ideal for the user's needs.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "";
}

export async function generateConversationalResponse(
  userMessage: string,
  tripParameters: TripParameters,
  hasMissingInfo: boolean
): Promise<string> {
  let prompt = `You are a helpful journey planning assistant. The user said: "${userMessage}"

Extracted parameters: ${JSON.stringify(tripParameters)}

`;

  if (hasMissingInfo) {
    prompt += `Some information is missing. Ask the user conversationally for the missing details (origin, destination, or fuel/vehicle info if they mentioned needing gas stops).`;
  } else {
    prompt += `All necessary information is available. Acknowledge the request and let them know you're planning their route.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "";
}
