import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

export const quoteExtractionSchema = z.object({
  number: z.string().optional(),
  issueDate: z.string().optional(),
  client: z.object({
    name: z.string(),
    nit: z.string().optional(),
    city: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    contactName: z.string().optional(),
  }),
  items: z.array(z.object({
    description: z.string(),
    size: z.string().optional(),
    inks: z.string().optional(),
    materials: z.string().optional(),
    finishes: z.string().optional(),
    quantity: z.number(),
    unitPrice: z.number(),
    lineTotal: z.number(),
  })),
  subtotal: z.number(),
  vat: z.number(),
  total: z.number(),
  paymentTerms: z.string().optional(),
  deliveryTime: z.string().optional(),
  validity: z.string().optional(),
  confidence: z.object({
    overall: z.number(),
  })
});

export type ExtractedQuote = z.infer<typeof quoteExtractionSchema>;

export async function extractQuoteFromPdf(
  fileDataBuffer: Buffer, 
  mimeType: string = 'application/pdf',
  retryErrorContext?: string
): Promise<{ extracted: ExtractedQuote, rawLog: any }> {
  // Client assumes process.env.GEMINI_API_KEY is available
  const ai = new GoogleGenAI({});
  
  let promptText = `You are an expert data entry assistant for a commercial printing and packaging company.
Extract the structured quotation data from the provided document.
Ensure all numerical values like prices and totals are extracted as numbers (do not include currency symbols or text).
Calculate a confidence score (0 to 1) for the overall extraction.`;
  
  if (retryErrorContext) {
    promptText += `\n\nPREVIOUS ATTEMPT FAILED WITH ERROR: ${retryErrorContext}\nPlease correct the output to strictly match the schema.`;
  }

  const schemaForGemini = {
    type: Type.OBJECT,
    properties: {
      number: { type: Type.STRING },
      issueDate: { type: Type.STRING },
      client: { 
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          nit: { type: Type.STRING },
          city: { type: Type.STRING },
          phone: { type: Type.STRING },
          email: { type: Type.STRING },
          contactName: { type: Type.STRING }
        },
        required: ["name"]
      },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            size: { type: Type.STRING },
            inks: { type: Type.STRING },
            materials: { type: Type.STRING },
            finishes: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            unitPrice: { type: Type.NUMBER },
            lineTotal: { type: Type.NUMBER }
          },
          required: ["description", "quantity", "unitPrice", "lineTotal"]
        }
      },
      subtotal: { type: Type.NUMBER },
      vat: { type: Type.NUMBER },
      total: { type: Type.NUMBER },
      paymentTerms: { type: Type.STRING },
      deliveryTime: { type: Type.STRING },
      validity: { type: Type.STRING },
      confidence: {
        type: Type.OBJECT,
        properties: {
          overall: { type: Type.NUMBER }
        },
        required: ["overall"]
      }
    },
    required: ["client", "items", "subtotal", "vat", "total", "confidence"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: promptText },
            { inlineData: { data: fileDataBuffer.toString('base64'), mimeType } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schemaForGemini,
        temperature: 0.1,
      }
    });

    const jsonString = response.text;
    if (!jsonString) {
      throw new Error("No text returned from Gemini");
    }

    const parsedData = JSON.parse(jsonString);
    const validatedData = quoteExtractionSchema.parse(parsedData);
    
    // Independent Arithmetic Verification
    let calculatedSubtotal = 0;
    for (const item of validatedData.items) {
      calculatedSubtotal += item.lineTotal;
    }
    
    // If subtotal doesn't match sum of lines by more than 1 unit
    if (Math.abs(calculatedSubtotal - validatedData.subtotal) > 1.0) {
      validatedData.confidence.overall = Math.min(validatedData.confidence.overall, 0.5);
    }

    return {
      extracted: validatedData,
      rawLog: {
        model: 'gemini-3.6-flash',
        promptVersion: '1.0',
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
        confidence: validatedData.confidence.overall
      }
    };
  } catch (error) {
    if (!retryErrorContext && error instanceof Error) {
      return extractQuoteFromPdf(fileDataBuffer, mimeType, error.message);
    }
    throw error;
  }
}
