import { GoogleGenAI } from "@google/genai";

export async function summarizeProductName(longDescription: string): Promise<string> {
  const ai = new GoogleGenAI({});
  const prompt = `You are a product catalog manager.
Summarize the following long printing/packaging product description into a concise product name of maximum 8 words.
Only return the summarized name, no quotes, no extra text.

Description:
${longDescription}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        temperature: 0.1,
      }
    });
  
    return response.text ? response.text.trim() : "Producto Desconocido";
  } catch (error) {
    console.error("Failed to summarize product name", error);
    return "Producto (Revisar)";
  }
}

/**
 * Rules for auto-feeding the catalog from a quote item.
 */
export function shouldProposeToCatalog(item: {
  normalizedName: string;
  size?: string;
  materials?: string;
}): boolean {
  if (item.normalizedName.length < 3 || item.normalizedName.length > 120) {
    return false; // Must be between 3 and 120 chars
  }
  if (!item.size && !item.materials) {
    return false; // Must have at least size or materials defined
  }
  return true;
}
