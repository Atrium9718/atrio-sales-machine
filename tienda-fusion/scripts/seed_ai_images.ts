import { db } from '../src/db';
import { products } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
  const allProducts = await db.select().from(products);
  
  for (const prod of allProducts) {
    if (!prod.imageUrl || prod.imageUrl.includes('placeholder')) {
      console.log(`Generating image for ${prod.name}...`);
      try {
        const prompt = `Professional product photography of ${prod.name}. High quality, 4k, studio lighting, clean background, photorealistic printing industry mockup.`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: { aspectRatio: "4:3", imageSize: "1K" }
          }
        });
        
        let imageUrl = '';
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
        
        if (imageUrl) {
          await db.update(products).set({ imageUrl }).where(eq(products.id, prod.id));
          console.log(`✅ Updated ${prod.name}`);
        } else {
           console.log(`❌ No image data for ${prod.name}`);
        }
      } catch (e) {
        console.error(`Error with ${prod.name}:`, e.message);
      }
    } else {
       console.log(`⏭️ Skipped ${prod.name}, already has image.`);
    }
  }
  console.log("Done");
  process.exit(0);
}
main();
