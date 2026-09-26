import { Router } from 'express';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { generatePreQuoteInternal } from './quotes';
import { searchCustomers, extractEntitiesFromMessage, loadAllCustomers, CustomerRecord } from '../services/customerSearchService';

const router = Router();

// Retrieve Firebase configuration
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.warn('Could not read firebase-applet-config.json', e);
}

// Initialize Firebase Admin if not already initialized
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

// Seed default agents if DB is empty
async function seedDefaultAgents() {
  try {
    const q = query(collection(getDb(), 'agents'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      const defaultAgents = [
        {
          id: 'comercial',
          name: 'Comercial',
          description: 'Lidera la venta consultiva, indaga necesidades reales y acompaña al cliente sin apresurarse a cotizar.',
          type: 'ASSISTANT',
          domain: 'COMMERCIAL',
          isActive: true,
          systemPrompt: 'Eres un asesor comercial experto en venta consultiva de Fusión. NUNCA te apresures a cotizar: diagnostica necesidades, enseña cómo se hacen las cosas y valida información suficiente antes de cotizar.',
          updatedAt: new Date().toISOString()
        },
        {
          id: 'cotizador',
          name: 'Cotizador',
          description: 'Especialista técnico que asesora pedagógicamente sobre materiales y procesos, generando borradores estructurados con información completa.',
          type: 'PLANNER',
          domain: 'QUOTING',
          isActive: true,
          systemPrompt: 'Eres un asesor técnico y cotizador experto de Fusión. Enseñas al cliente cómo se producen los empaques y piezas gráficas (sustratos, calibres, troqueles, tintas, escalas). Exiges información completa antes de emitir pre-cotizaciones.',
          updatedAt: new Date().toISOString()
        }
      ];
      
      for (const agent of defaultAgents) {
        const { id, ...data } = agent;
        await setDoc(doc(collection(getDb(), 'agents'), id), data);
      }
    }
  } catch (err) {
    console.error('Error seeding default agents', err);
  }
}

seedDefaultAgents();

// Get all agents
router.get('/', async (req, res) => {
  try {
    const snapshot = await getDocs(collection(getDb(), 'agents'));
    const agents: any[] = [];
    
    for (const d of snapshot.docs) {
      const data = d.data();
      // Load memories from subcollection
      const memoriesRef = collection(getDb(), 'agents', d.id, 'memories');
      const q = query(memoriesRef, orderBy('createdAt', 'asc'));
      const memoriesSnapshot = await getDocs(q);
      const memories = memoriesSnapshot.docs.map(mDoc => ({ id: mDoc.id, ...mDoc.data() }));
      
      agents.push({
        id: d.id,
        ...data,
        memories
      });
    }
    
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create agent
router.post('/', async (req, res) => {
  try {
    const { name, description, type, domain, systemPrompt, key } = req.body;
    const newId = key || 'ag_' + Math.random().toString(36).substring(7);
    
    const newAgent = {
      name,
      description,
      type: type || 'ASSISTANT',
      domain: domain || 'MANAGEMENT',
      systemPrompt: systemPrompt || 'Eres un asistente útil.',
      isActive: true,
      updatedAt: new Date().toISOString()
    };
    
    await setDoc(doc(collection(getDb(), 'agents'), newId), newAgent);
    
    res.json({ id: newId, ...newAgent, memories: [] });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Helper to get agent with complete training and memories from Firestore
async function getAgentFullConfig(id: string) {
  const db = getDb();
  let docRef = doc(collection(db, 'agents'), id);
  let d = await getDoc(docRef);
  
  if (!d.exists()) {
    if (id === 'comercial' || id === 'sales') {
      docRef = doc(collection(db, 'agents'), 'ag_01_valentina');
      d = await getDoc(docRef);
    } else if (id === 'cotizador' || id === 'quote') {
      docRef = doc(collection(db, 'agents'), 'ag_02_alvaro');
      d = await getDoc(docRef);
    } else if (id === 'produccion' || id === 'production') {
      docRef = doc(collection(db, 'agents'), 'ag_07_lucia');
      d = await getDoc(docRef);
    } else if (id === 'servicio' || id === 'service') {
      docRef = doc(collection(db, 'agents'), 'ag_20_sara');
      d = await getDoc(docRef);
    }
  }

  // If still not found, try to search in all agents collection
  if (!d.exists()) {
    try {
      const allDocs = await getDocs(collection(db, 'agents'));
      const found = allDocs.docs.find(item => 
        item.id.toLowerCase().includes(id.toLowerCase()) || 
        item.data().name?.toLowerCase() === id.toLowerCase()
      );
      if (found) {
        d = found;
      }
    } catch (e) {
      console.warn('Error searching agent doc', e);
    }
  }

  const agentData = d.exists() ? d.data() : { name: 'Asistente Fusión', systemPrompt: 'Eres un asistente experto de Fusión.' };
  const agentId = d.exists() ? d.id : id;

  let memories: string[] = [];
  try {
    const memoriesRef = collection(db, 'agents', agentId, 'memories');
    const q = query(memoriesRef, orderBy('createdAt', 'asc'));
    const memoriesSnapshot = await getDocs(q);
    memories = memoriesSnapshot.docs.map(mDoc => mDoc.data().content);
  } catch (err) {
    console.warn('Could not load memories for agent', agentId, err);
  }

  let fullPrompt = agentData.systemPrompt || 'Eres un asistente útil de Fusión.';
  if (memories.length > 0) {
    fullPrompt += '\n\nMEMORIA A LARGO PLAZO Y REGLAS DE ENTRENAMIENTO:\n';
    memories.forEach((m, idx) => {
      fullPrompt += `- ${m}\n`;
    });
  }

  return {
    id: agentId,
    name: agentData.name || 'Agente',
    domain: agentData.domain || 'GENERAL',
    description: agentData.description || '',
    systemPrompt: agentData.systemPrompt || '',
    fullPrompt,
    memories
  };
}

// Endpoints para consultar clientes en la base de datos (por nombre, empresa, teléfono, correo, NIT)
router.get('/customers/search', async (req, res) => {
  try {
    const { q, name, company, phone, email, nit, limit } = req.query;
    const results = await searchCustomers({
      query: q as string,
      name: name as string,
      company: company as string,
      phone: phone as string,
      email: email as string,
      nit: nit as string,
      limit: limit ? parseInt(limit as string, 10) : 15
    });
    res.json({ success: true, count: results.length, customers: results });
  } catch (err: any) {
    console.error('Error in GET /customers/search:', err);
    res.status(500).json({ success: false, error: err.message, customers: [] });
  }
});

router.post('/customers/search', async (req, res) => {
  try {
    const { query, name, company, phone, email, nit, limit } = req.body;
    const results = await searchCustomers({
      query,
      name,
      company,
      phone,
      email,
      nit,
      limit: limit || 15
    });
    res.json({ success: true, count: results.length, customers: results });
  } catch (err: any) {
    console.error('Error in POST /customers/search:', err);
    res.status(500).json({ success: false, error: err.message, customers: [] });
  }
});

// Helper de búsqueda de cliente para retrocompatibilidad
async function findCustomerInDb(phoneStr?: string, nameStr?: string, textStr?: string) {
  try {
    const results = await searchCustomers({
      query: textStr,
      phone: phoneStr,
      name: nameStr,
      limit: 1
    });
    return results[0] || null;
  } catch (err) {
    console.warn('Error in findCustomerInDb helper:', err);
    return null;
  }
}

// Endpoint interactivo multi-turno para el Simulador de WhatsApp
router.post('/simulate-chat', async (req, res) => {
  try {
    const { 
      message, 
      history = [], 
      activeAgentId = 'ag_01_valentina', 
      channel = 'WhatsApp',
      transferredContext = '',
      customerPhone = '',
      customerName = '',
      customerEmail = '',
      customerCompany = '',
      customerNit = '',
      allowHandoff = true
    } = req.body;

    // 1. Cargar agente activo con TODO su entrenamiento y memoria de Firestore
    const currentAgent = await getAgentFullConfig(activeAgentId);

    // 2. Extraer posibles identificadores directamente del mensaje del usuario
    const messageEntities = extractEntitiesFromMessage(message || '');
    const searchPhone = customerPhone || messageEntities.phone || '';
    const searchEmail = customerEmail || messageEntities.email || '';
    const searchName = customerName || messageEntities.name || '';
    const searchCompany = customerCompany || messageEntities.company || '';
    const searchNit = customerNit || messageEntities.nit || '';

    // 3. Consultar la base de datos por Teléfono, Correo, Empresa, Nombre, NIT o Texto
    const matchedCustomers = await searchCustomers({
      query: message,
      phone: searchPhone,
      email: searchEmail,
      name: searchName,
      company: searchCompany,
      nit: searchNit,
      limit: 5
    });

    const customer: CustomerRecord | null = matchedCustomers[0] || null;

    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    let systemInstruction = currentAgent.fullPrompt;
    systemInstruction += `\n\n--- CONTEXTO OPERATIVO DEL CANAL ---
Estás interactuando en vivo por el canal: ${channel}.
Cumple fielmente tu personalidad, tono colombiano respetuoso, reglas de negocio y restricciones indicadas en tu entrenamiento.\n`;

    systemInstruction += `\n--- CAPACIDAD DE CONSULTA EN BASE DE DATOS DE CLIENTES ---
Tienes acceso a la base de datos oficial de clientes y empresas de Fusión Comunicación Gráfica.
Puedes buscar clientes por:
- Nombres de personas o contactos
- Empresas y razones sociales (ej: Copidrogas, Pintuco, Colanta, Laboratorios Baxter, etc.)
- Números de teléfono fijos y celulares
- Correos electrónicos corporativos y personales
- NITs y documentos de identificación

Si el usuario te pregunta por cualquier cliente o empresa, o te solicita validar si alguien está registrado en el sistema, consulta la información y responde con precisión basándote en los datos oficiales registrados.\n`;

    // Inyectar reconocimiento del cliente si ya está en base de datos
    if (customer) {
      systemInstruction += `\n--- RECONOCIMIENTO EN BASE DE DATOS: CLIENTE DE LA CASA ---
El cliente con el que estás interactuando FUE IDENTIFICADO en nuestra base de datos de Fusión:
- Nombre / Contacto: ${customer.name}
- Empresa / Razón Social: ${customer.company}
- Teléfono(s): ${customer.phones?.join(', ') || customer.primaryPhone || 'No registrado'}
- Correo(s): ${customer.emails?.join(', ') || customer.primaryEmail || 'No registrado'}
- NIT / Documento: ${customer.nit || 'No registrado'}
- Dirección / Ciudad: ${customer.address || ''} ${customer.city ? `(${customer.city})` : ''}
- Coincidencia encontrada por: ${customer.matchedBy}

REGLA DE FAMILIARIDAD INMEDIATA (MUY IMPORTANTE):
Este cliente YA ha trabajado con nosotros. Trátalo como cliente de confianza y de la casa.
Salúdalo reconociendo su nombre o empresa con alegría y calidez familiar colombiana (ej: "¡Hola don ${customer.name}! Qué alegría saludarlo de nuevo", "Con mucho gusto, qué placer tener a la gente de ${customer.company} por acá").
Hazlo sentir en familia y que valoramos su preferencia antes de responder a su solicitud.\n`;
    } else if (customerName || customerPhone || customerEmail || customerCompany) {
      systemInstruction += `\n--- DATOS DE IDENTIFICACIÓN DEL REMITENTE ---
Datos del remitente: ${customerPhone ? 'Tel: ' + customerPhone + '. ' : ''}${customerName ? 'Nombre: ' + customerName + '. ' : ''}${customerCompany ? 'Empresa: ' + customerCompany + '. ' : ''}${customerEmail ? 'Correo: ' + customerEmail + '. ' : ''} (No registra historial previo en el sistema, trátalo con cortesía y pregúntale su nombre amablemente si no lo ha dado).\n`;
    }

    if (transferredContext) {
      systemInstruction += `\n--- CONTEXTO ACUMULADO PREVIO (NO PREGUNTAR LO QUE YA SE SABE) ---
${transferredContext}\n`;
    }

    systemInstruction += `\n--- PROTOCOLO OBLIGATORIO: VENTA CONSULTIVA Y PEDAGOGÍA TÉCNICA (NO APRESURARSE A COTIZAR) ---
1. PRINCIPIO FUNDAMENTAL: PROHIBIDO APRESURARSE A COTIZAR
   - En Fusión Comunicación Gráfica y Empaques NO somos tomadores pasivos de pedidos ni una máquina de despacho apresurado.
   - Si el cliente solicita una cotización o pide precio de inmediato (ej: "cotízame 1.000 cajas", "¿cuánto valen unos empaques?"), NUNCA generes una pre-cotización prematura ni des precios al azar.
   - Explícale con amabilidad y respeto: En Fusión cuidamos su inversión y la protección de sus productos; aplicamos una venta consultiva para garantizar que la solución estructural sea exacta, resistente y al menor costo unitario.

2. ROL PEDAGÓGICO ACTIVO: ENSEÑAR CÓMO SE HACEN LAS COSAS
   - Debes educar al cliente sobre los procesos técnicos de fabricación y las opciones de materiales para que tome la mejor decisión:
     * Explica cómo se fabrican las piezas: Plano estructural -> Troquel matriz de corte -> Planchas/clisés -> Impresión -> Troquelado/descolille -> Pegue.
     * Explica los materiales: Diferencia entre cartón corrugado kraft onda C (alta resistencia al apilamiento y carga de 5 a 20 kg), microcorrugado onda E (más estético, delgado y rígido para calzado o regalos), y cartulina plegadiza Maule (para empaque primario impreso a todo color).
     * Explica la economía de escala: El troquel y la preparación de máquina representan un costo fijo; por eso al imprimir 2.500 o 5.000 unidades en vez de 500, el costo unitario baja notablemente.
     * Explica tintas y protección: 1 tinta flexográfica para embalaje económico vs policromía con barniz o plastificado para proteger de humedad y grasa.

3. CHECKLIST DE INFORMACIÓN SUFICIENTE PARA PRE-COTIZAR:
   Para que una Pre-cotización pueda ser generada, se debe haber obtenido o acordado:
   a) Propósito y producto a contener (peso aproximado, fragilidad, apilamiento o refrigeración).
   b) Dimensiones aproximadas (Largo x Ancho x Alto cm) y si son internas o externas.
   c) Material/onda sugerido y justificado técnicamente.
   d) Impresión (número de tintas o si son neutras).
   e) Cantidad requerida (sugiriendo escalas de volumen).
   f) Ciudad o lugar de entrega.

4. REGLA ESTRICTA PARA EL DISPARADOR <<<PRE_QUOTE_TRIGGER>>>:
   - SOLO añade la etiqueta: <<<PRE_QUOTE_TRIGGER:{"ready":true}>>> si:
     * Ya se ha realizado la asesoría consultiva y pedagógica.
     * Se tiene la información suficiente del checklist anterior (producto, medidas, material, tintas y cantidad).
     * El cliente confirmó o acordó estos parámetros técnicos.
   - Si FALTA información o el cliente apenas inicia la consulta, ESTÁ TOTALMENTE PROHIBIDO incluir <<<PRE_QUOTE_TRIGGER>>>. En su lugar, indaga con calidez lo que falta y enseña por qué es importante para su producto.
`;

    if (allowHandoff) {
      systemInstruction += `\n--- REGLAS DE TRANSFERENCIA ENTRE AGENTES ---
Si la solicitud del cliente supera tu función o corresponde a otro especialista de Fusión:
- Si eres Valentina (Comercial) y el cliente ya fue orientado y requiere la formulación técnica detallada de la cotización:
  Transfiere amablemente a Álvaro (Cotizaciones, ID: ag_02_alvaro).
- Si el cliente pregunta por tiempos de producción en fábrica, pliegos o máquinas:
  Transfiere a Lucía (Producción, ID: ag_07_lucia).
- Si el cliente tiene un reclamo o soporte postventa:
  Transfiere a Sara (Servicio al Cliente, ID: ag_20_sara).

Para transferir:
1. Responde al usuario de forma natural, cálida y consultiva avisándole que lo pasas con Álvaro, nuestro especialista técnico, quien complementará la asesoría de empaque.
2. Agrega EXACTAMENTE al final de tu mensaje la etiqueta oculta:
<<<HANDOFF:{"targetAgentId":"ag_02_alvaro","targetAgentName":"Álvaro","reason":"Asesoría técnica y especificación de cotización","extractedContext":"Resumen exacto de todos los requerimientos técnicos y datos recopilados hasta el momento"}>>>

Si tú mismo puedes atender y resolver la consulta, responde normalmente SIN poner ninguna etiqueta <<<HANDOFF>>>.\n`;
    }

    // Formatear historial
    const chatHistory = history.map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    // Herramienta de consulta de base de datos para la IA
    const tools = [
      {
        functionDeclarations: [
          {
            name: "consultar_base_datos_clientes",
            description: "Busca y consulta en la base de datos oficial de Fusión información sobre clientes o empresas por nombre, empresa, teléfono, correo electrónico o NIT.",
            parameters: {
              type: "OBJECT",
              properties: {
                query: { type: "STRING", description: "Texto libre o palabra clave de búsqueda" },
                name: { type: "STRING", description: "Nombre de la persona o contacto a buscar" },
                company: { type: "STRING", description: "Nombre o razón social de la empresa" },
                phone: { type: "STRING", description: "Número de teléfono o celular" },
                email: { type: "STRING", description: "Correo electrónico" },
                nit: { type: "STRING", description: "NIT o cédula" }
              }
            }
          }
        ]
      }
    ];

    const chat = ai.chats.create({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction,
        tools: tools as any
      },
      history: chatHistory
    });

    let response = await chat.sendMessage({ message });

    // Manejar llamadas a herramientas (Tool Calling)
    let toolResultsSummary: any[] = [];
    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        if (call.name === 'consultar_base_datos_clientes') {
          const args = (call.args || {}) as any;
          const searchRes = await searchCustomers({
            query: args.query,
            name: args.name,
            company: args.company,
            phone: args.phone,
            email: args.email,
            nit: args.nit,
            limit: 5
          });
          toolResultsSummary = searchRes;

          response = await chat.sendMessage({
            message: [
              {
                functionResponse: {
                  name: 'consultar_base_datos_clientes',
                  response: {
                    encontrados: searchRes.length,
                    clientes: searchRes.map(c => ({
                      nombre: c.name,
                      empresa: c.company,
                      telefonos: c.phones,
                      correos: c.emails,
                      nit: c.nit,
                      direccion: c.address,
                      ciudad: c.city,
                      contacto: c.contactPerson,
                      coincidencia: c.matchedBy
                    }))
                  }
                }
              }
            ]
          });
        }
      }
    }

    const rawText = response.text || '';

    // Detectar si hubo transferencia (Handoff)
    const handoffMatch = rawText.match(/<<<HANDOFF:([\s\S]*?)>>>/);
    let handoffData: any = null;
    let cleanReply = rawText;

    if (handoffMatch) {
      try {
        handoffData = JSON.parse(handoffMatch[1]);
        cleanReply = rawText.replace(handoffMatch[0], '').trim();
      } catch (e) {
        console.warn('Could not parse handoff JSON', e);
      }
    }

    // Si hubo transferencia, invocamos inmediatamente al agente receptor para que asuma el chat
    let nextAgentReply: string | null = null;
    let nextAgentConfig: any = null;

    if (handoffData && handoffData.targetAgentId) {
      nextAgentConfig = await getAgentFullConfig(handoffData.targetAgentId);
      
      let targetInstruction = nextAgentConfig.fullPrompt + `\n\n--- CONTEXTO DE TRANSFERENCIA EN VIVO ---
Canal: ${channel}.
Acabas de recibir una transferencia de ${currentAgent.name}.
DATOS Y CONTEXTO TRANSFERIDO POR ${currentAgent.name}:
${handoffData.extractedContext || 'El cliente ha sido transferido.'}\n`;

      if (customer) {
        targetInstruction += `\nINFORMACIÓN DE BASE DE DATOS: Es don/doña ${customer.name} (${customer.company}), cliente de confianza de la casa. Trátalo con familiaridad y respeto.\n`;
      }

      targetInstruction += `\nINSTRUCCIÓN VITAL DE VENTA CONSULTIVA Y PEDAGOGÍA:
Saluda en tu rol de ${nextAgentConfig.name} con tu personalidad y tono cálido.
Reconoce de forma concisa los datos transferidos por ${currentAgent.name} (para que el cliente no tenga que repetir).
Actúa como especialista técnico y educador:
1. Enseña y asesora al cliente sobre los materiales, cómo se fabrican las piezas en Fusión (troquel, ondas de cartón o cartulina, clisés flexo o CTP, acabados) y cómo las escalas de volumen optimizan el costo unitario.
2. Evalúa si los datos transferidos cubren el checklist completo de información suficiente (propósito/peso, medidas, material, tintas y cantidad).
3. Si la información ya está COMPLETA y el cliente validó la propuesta técnica, confírmale que dejas registrada la Pre-cotización en el sistema para que el equipo comercial le asigne los precios y añade al final de tu mensaje: <<<PRE_QUOTE_TRIGGER:{"ready":true}>>>
4. Si FALTA algún dato clave para definir bien el empaque o producto, NO dispares pre-cotización todavía. Formula las preguntas técnicas necesarias con pedagogía y amabilidad explicando por qué cada detalle protege su producto y su bolsillo.\n`;

      const targetChat = ai.chats.create({
        model: "gemini-3.8-flash",
        config: {
          systemInstruction: targetInstruction,
          maxOutputTokens: 600
        }
      });

      const takeOverPrompt = `Hola ${nextAgentConfig.name}, te transfiero a este cliente (${customer ? customer.name : 'Cliente'}). Contexto: ${handoffData.extractedContext}. Por favor asume la conversación ahora mismo.`;
      const targetResponse = await targetChat.sendMessage({ message: takeOverPrompt });
      nextAgentReply = targetResponse.text || '';
    }

    // Detectar si se debe generar la Pre-cotización con IA
    let shouldGeneratePreQuote = false;
    const preQuoteMatch1 = cleanReply.match(/<<<PRE_QUOTE_TRIGGER:([\s\S]*?)>>>/);
    if (preQuoteMatch1) {
      shouldGeneratePreQuote = true;
      cleanReply = cleanReply.replace(preQuoteMatch1[0], '').trim();
    }
    if (nextAgentReply) {
      const preQuoteMatch2 = nextAgentReply.match(/<<<PRE_QUOTE_TRIGGER:([\s\S]*?)>>>/);
      if (preQuoteMatch2) {
        shouldGeneratePreQuote = true;
        nextAgentReply = nextAgentReply.replace(preQuoteMatch2[0], '').trim();
      }
    }

    let generatedPreQuote: any = null;
    if (shouldGeneratePreQuote) {
      try {
        const fullTranscript = [
          ...history,
          { role: 'user', content: message },
          { role: 'model', content: cleanReply },
          ...(nextAgentReply ? [{ role: 'model', content: nextAgentReply }] : [])
        ];
        const preQuoteRes = await generatePreQuoteInternal({
          conversation: fullTranscript.map(t => ({
            sender: t.role === 'user' ? 'user' : 'assistant',
            content: t.content
          })),
          customer,
          channel
        });
        if (preQuoteRes && preQuoteRes.success && preQuoteRes.preQuote) {
          generatedPreQuote = preQuoteRes.preQuote;
        }
      } catch (pqErr) {
        console.warn('Could not auto-generate pre-quote during chat:', pqErr);
      }
    }

    res.json({
      reply: cleanReply,
      activeAgent: {
        id: currentAgent.id,
        name: currentAgent.name,
        domain: currentAgent.domain
      },
      customerIdentified: customer ? {
        id: customer.id,
        name: customer.name,
        company: customer.company,
        phone: customer.primaryPhone || customer.phones?.[0] || '',
        phones: customer.phones || [],
        email: customer.primaryEmail || customer.emails?.[0] || '',
        emails: customer.emails || [],
        nit: customer.nit || '',
        address: customer.address || '',
        city: customer.city || '',
        matchedBy: customer.matchedBy
      } : null,
      matchedCustomers: matchedCustomers.map(c => ({
        id: c.id,
        name: c.name,
        company: c.company,
        phone: c.primaryPhone || c.phones?.[0] || '',
        email: c.primaryEmail || c.emails?.[0] || '',
        nit: c.nit,
        matchedBy: c.matchedBy
      })),
      toolResults: toolResultsSummary,
      handoff: handoffData ? {
        ...handoffData,
        targetAgent: nextAgentConfig ? {
          id: nextAgentConfig.id,
          name: nextAgentConfig.name,
          domain: nextAgentConfig.domain
        } : null,
        targetReply: nextAgentReply
      } : null,
      preQuote: generatedPreQuote,
      newActiveAgentId: handoffData?.targetAgentId || currentAgent.id,
      updatedContext: handoffData?.extractedContext 
        ? ((transferredContext ? transferredContext + '\n' : '') + handoffData.extractedContext)
        : transferredContext
    });

  } catch (error: any) {
    console.error('Error in simulate-chat:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Simulación de Flujo legacy
router.post('/simulate-flow', async (req, res) => {
  try {
    const { input, source } = req.body;
    
    // Usar agentes reales con su entrenamiento real
    const comercialAgent = await getAgentFullConfig('ag_01_valentina');
    const cotizadorAgent = await getAgentFullConfig('ag_02_alvaro');

    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Paso 1: Agente Comercial atiende con su entrenamiento
    const chatComercial = ai.chats.create({
      model: "gemini-3.6-flash",
      config: {
        systemInstruction: comercialAgent.fullPrompt + "\n\nIMPORTANTE DE VENTA CONSULTIVA: Eres el primer punto de contacto. Recibes un mensaje por " + source + ". NUNCA te apresures a cotizar ni des precios improvisados. Tu objetivo es saludar con calidez, iniciar el diagnóstico de necesidades (uso, peso, requerimientos), explicar pedagógicamente por qué estos datos son vitales y estructurar el contexto técnico para el cotizador. Responde en formato JSON: { \"replyToUser\": \"Tu respuesta\", \"extractedContext\": \"Resumen consultivo y técnico\", \"routeTo\": \"cotizador\" }",
        responseMimeType: "application/json",
      }
    });

    const responseComercial = await chatComercial.sendMessage({ message: input });
    const comercialData = JSON.parse(responseComercial.text);

    // Paso 2: Agente Cotizador recibe contexto
    const chatSecundario = ai.chats.create({
      model: "gemini-3.6-flash",
      config: {
        systemInstruction: cotizadorAgent.fullPrompt + "\n\nIMPORTANTE DE VENTA CONSULTIVA Y PEDAGOGÍA: Eres Álvaro el cotizador técnico de Fusión. Recibes una transferencia. NO vuelvas a preguntar lo que ya se sabe. Enseña al cliente cómo se fabrican las cosas (sustratos, ondas de cartón, troqueles, tintas y economía de escala). Evalúa si la información es suficiente antes de proceder a la pre-cotización. Responde en formato JSON: { \"replyToUser\": \"Tu respuesta pedagógica y consultiva\", \"internalAction\": \"Acción interna y evaluación técnica\" }",
        responseMimeType: "application/json",
      }
    });

    const contextMessage = "CONTEXTO TRANSFERIDO: " + comercialData.extractedContext;
    const responseSecundario = await chatSecundario.sendMessage({ message: contextMessage });
    const secundarioData = JSON.parse(responseSecundario.text);

    res.json({
      logs: [
        `[Sistema] Mensaje recibido vía ${source}`,
        `[Enrutador] Asignando a ${comercialAgent.name} (Comercial)`,
        `[${comercialAgent.name}] Aplicando protocolo de VENTA CONSULTIVA: indagando necesidades sin apresurarse a cotizar...`,
        `[${comercialAgent.name}] Enrutando con contexto técnico a Álvaro (Cotizaciones)`,
        `[Sistema] Transfiriendo contexto consultivo: "${comercialData.extractedContext}"`,
        `[Álvaro] Aplicando asesoría pedagógica: educando sobre materiales, troqueles y procesos de producción...`
      ],
      flow: {
        step1: {
          agent: comercialAgent.name + ' (Comercial)',
          reply: comercialData.replyToUser,
          contextPassed: comercialData.extractedContext
        },
        step2: {
          agent: 'Álvaro (Cotizaciones)',
          reply: secundarioData.replyToUser,
          action: secundarioData.internalAction
        }
      }
    });
  } catch (error: any) {
    console.error('Error in simulate flow:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Update agent (Train)

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { systemPrompt, name, description, isActive } = req.body;
    
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };
    
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    await updateDoc(doc(collection(getDb(), 'agents'), id), updateData);
    
    const updatedDoc = await getDoc(doc(collection(getDb(), 'agents'), id));
    
    const memoriesRef = collection(getDb(), 'agents', id, 'memories');
    const q = query(memoriesRef, orderBy('createdAt', 'asc'));
    const memoriesSnapshot = await getDocs(q);
    const memories = memoriesSnapshot.docs.map(mDoc => ({ id: mDoc.id, ...mDoc.data() }));
    
    res.json({ id: updatedDoc.id, ...updatedDoc.data(), memories });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete agent
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteDoc(doc(collection(getDb(), 'agents'), id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add Memory (Experience)
router.post('/:id/memory', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    const newMemory = {
      content,
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(getDb(), 'agents', id, 'memories'), newMemory);
    
    res.json({ id: docRef.id, ...newMemory });
  } catch (error) {
    console.error('Error adding memory:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete Memory
router.delete('/:id/memory/:memoryId', async (req, res) => {
  try {
    const { id, memoryId } = req.params;
    await deleteDoc(doc(getDb(), 'agents', id, 'memories', memoryId));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Chat with Agent
router.post('/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { message, history } = req.body;
    
    // 1. Fetch agent config & memories
    const d = await getDoc(doc(collection(getDb(), 'agents'), id));
    if (!d.exists()) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const agentData = d.data();
    
    const memoriesRef = collection(getDb(), 'agents', id, 'memories');
    const q = query(memoriesRef, orderBy('createdAt', 'asc'));
    const memoriesSnapshot = await getDocs(q);
    const memories = memoriesSnapshot.docs.map(mDoc => mDoc.data().content);
    
    // 2. Build System Instruction
    let systemInstruction = agentData?.systemPrompt || 'Eres un asistente útil.';
    if (memories.length > 0) {
      systemInstruction += '\n\nMEMORIA A LARGO PLAZO (DEBES RECORDAR ESTO SIEMPRE):\n';
      memories.forEach((mem, idx) => {
        systemInstruction += `- ${mem}\n`;
      });
    }

    // 3. Connect to Gemini API
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Formatting history for chat if provided
    const chatHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = ai.chats.create({
      model: "gemini-3.6-flash",
      config: {
        systemInstruction,
      },
      history: chatHistory
    });

    const response = await chat.sendMessage({ message });
    
    res.json({ reply: response.text });
  } catch (error) {
    console.error('Error in agent chat:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


export const agentsRouter = router;
