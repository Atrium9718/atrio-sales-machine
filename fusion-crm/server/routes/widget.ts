import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, collection, getDoc, doc, getDocs, query, orderBy, setDoc, updateDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

export const widgetRouter = Router();

// Retrieve Firebase configuration
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.warn('Could not read firebase-applet-config.json', e);
}

// Initialize Firebase if not already initialized
if (!getApps().length && firebaseConfig.projectId) {
  try {
    initializeApp(firebaseConfig);
  } catch (err) {
    console.error('Firebase init error', err);
  }
}

function getDb() {
  if (!getApps().length) throw new Error('Firebase not initialized');
  return getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);
}

// Lazy initialization
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } 
    });
  }
  return aiClient;
}


widgetRouter.get('/sync/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const chatDoc = await getDoc(doc(getDb(), 'chats', sessionId));
    if (!chatDoc.exists()) {
      return res.json({ messages: [] });
    }
    res.json({ messages: chatDoc.data().messages || [] });
  } catch (error) {
    console.error('Error syncing widget chat:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

widgetRouter.post('/message', async (req, res) => {

  try {
    
    const { message, history, context, sessionId = 'default-session' } = req.body;
    
    // Save User message immediately
    const chatRef = doc(getDb(), 'chats', sessionId);
    const chatDoc = await getDoc(chatRef);
    let messages = chatDoc.exists() ? chatDoc.data().messages || [] : [];
    const isHumanPaused = chatDoc.exists() && chatDoc.data().status === 'human';
    
    const newUserMsg = { id: Date.now(), sender: 'user', text: message, time: new Date().toISOString() };
    messages.push(newUserMsg);
    
    await setDoc(chatRef, {
      updatedAt: new Date().toISOString(),
      status: 'active',
      messages: messages
    }, { merge: true });

    
    if (isHumanPaused) {
       return res.json({ reply: '', messages }); // Human will reply, don't generate AI
    }

    let ai;
    try {
      ai = getAiClient();
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }

    const contents = messages
      .filter((m: any) => m.sender !== 'human') // Human counts as bot for Gemini context
      .map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));


    // 1. Fetch Agent Profile and Memories from Firestore
    let agentSystemPrompt = 'Eres Joaquín, el asistente de servicio al cliente de Fusión.';
    let agentMemories: string[] = [];

    try {
      const comercialAgentDoc = await getDoc(doc(getDb(), 'agents', 'comercial'));
      if (comercialAgentDoc.exists()) {
        agentSystemPrompt = comercialAgentDoc.data()?.systemPrompt || agentSystemPrompt;
        
        const memoriesRef = collection(getDb(), 'agents', 'comercial', 'memories');
        const q = query(memoriesRef, orderBy('createdAt', 'asc'));
        const memoriesSnapshot = await getDocs(q);
        agentMemories = memoriesSnapshot.docs.map(mDoc => mDoc.data().content);
      }
    } catch (err) {
      console.error('Error fetching agent from Firestore, using default fallback.', err);
    }

    let systemInstruction = agentSystemPrompt;
    
    if (agentMemories.length > 0) {
      systemInstruction += '\n\nMEMORIA A LARGO PLAZO (DEBES RECORDAR ESTO EN TODAS TUS CONVERSACIONES):\n';
      agentMemories.forEach(mem => {
        systemInstruction += `- ${mem}\n`;
      });
    }

    systemInstruction += `\n\nDIRECTRICES DE CONSULTA (BÚSQUEDA EXHAUSTIVA):
Tienes acceso a TODO el sistema mediante la siguiente base de datos en tiempo real de Fusión:
CONTEXTO DE PROYECTOS EN PRODUCCIÓN (JSON):
${JSON.stringify(context?.projects || [])}
CONTEXTO DE INVENTARIO (JSON):
${JSON.stringify(context?.inventory || [])}
CONTEXTO DE CLIENTES (JSON):
${JSON.stringify(context?.customers || [])}
CONTEXTO GENERAL:
${JSON.stringify(context || {})}
1. Cuando el usuario pregunte por CUALQUIER información (un pedido, un cliente, material en inventario, etc.), BUSCA EXHAUSTIVAMENTE en toda la información disponible en los contextos (JSON) de arriba.
2. Si LO ENCUENTRAS, dale la información de manera natural.
3. Si NO LO ENCUENTRAS a la primera, infórmale que no logras encontrarlo con esos datos, y HAZLE MÁS PREGUNTAS. Intenta ayudarle a encontrar lo que busca.
4. Si definitivamente no lo encuentras, indícale de forma muy amable que se comunique con su asesor. NO inventes datos.`;

    let response;
    let retries = 1; 
    let lastError;

    while (retries >= 0) {
      try {
        const fetchPromise = ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7
          }
        });
        
        const timeoutPromise = new Promise((_, reject) => 
           setTimeout(() => reject(new Error('Timeout de API')), 10000)
        );
        
        response = await Promise.race([fetchPromise, timeoutPromise]);
        break; // Success!
      } catch (error: any) {
        lastError = error;
        retries--;
        if (retries >= 0) {
          console.warn(`Gemini API error/timeout. Retrying...`);
          await new Promise(r => setTimeout(r, 500)); 
        }
      }
    }

    if (!response) {
      throw lastError;
    }

    
    const aiText = response.text;
    const newBotMsg = { id: Date.now(), sender: 'bot', text: aiText, time: new Date().toISOString() };
    
    messages.push(newBotMsg);
    await updateDoc(chatRef, {
      updatedAt: new Date().toISOString(),
      messages: messages
    });

    res.json({ reply: aiText, messages });

  } catch (error: any) {
    console.error('Error in AI widget route:', error);
    res.status(503).json({ error: String(error) });
  }
});
