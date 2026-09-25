import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function processRecording(callId: string) {
  // In a real application, you'd fetch the recording from MinIO using the presigned URL
  // Here we simulate the processing pipeline to demonstrate the architecture
  
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) throw new Error('Call not found');

  try {
    // 1. Send Audio to Gemini using File API (mocked)
    // const audioFile = await ai.files.upload({ file: ..., mimeType: 'audio/mp3' });
    
    // 2. Transcribe & Analyze
    const prompt = `
      Eres un asistente experto analizando llamadas telefónicas comerciales de una empresa de impresión y cajas.
      Por favor, transcribe este audio, identifica los hablantes (Agente y Cliente), 
      y provee un resumen JSON con los siguientes campos:
      - transcriptText: La transcripción completa
      - summary: Resumen de 3 líneas
      - sentiment: POSITIVE, NEUTRAL o NEGATIVE
      - commitments: Array de compromisos adquiridos con fechas
      - nextSteps: Lista de acciones a seguir
    `;

    // Simulated Response from Gemini
    const analysis = {
      transcriptText: "Agente: Aló, buenas tardes. Cliente: Hola, sí, llamaba para preguntar por el estado de las 5000 cajas plegadizas. Agente: Sí, claro. Las cajas ya están en troquelado, salen el jueves. Cliente: Perfecto, muchas gracias. Quedo atento a la factura.",
      summary: "El cliente llamó para consultar el estado de su pedido de 5000 cajas plegadizas. El agente confirmó que están en troquelado y se entregarán el jueves.",
      sentiment: "POSITIVE",
      commitments: [{ task: "Enviar factura", dueDate: "Jueves" }],
      nextSteps: ["Confirmar despacho el jueves", "Enviar factura final"]
    };

    // 3. Update Call Record
    await prisma.call.update({
      where: { id: callId },
      data: {
        transcriptText: analysis.transcriptText,
        aiSummary: analysis.summary,
        aiSentiment: analysis.sentiment,
        aiNextSteps: analysis.nextSteps
      }
    });

    // 4. Inyectar resumen en el hilo de la conversación de la Bandeja (Conversation)
    if (call.conversationId) {
      await prisma.message.create({
        data: {
          organizationId: call.organizationId,
          conversationId: call.conversationId,
          content: `📞 **Llamada Finalizada** (${Math.floor((call.durationSeconds || 0) / 60)}m ${(call.durationSeconds || 0) % 60}s)\n\n**Resumen:** ${analysis.summary}\n\n**Compromisos Detectados:**\n${analysis.commitments.map(c => `- ${c.task} (${c.dueDate})`).join('\n')}`,
          direction: 'INBOUND',
          mediaType: 'voice_summary',
          mediaUrl: call.recordingUrl
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Transcription failed:', error);
    return false;
  }
}
