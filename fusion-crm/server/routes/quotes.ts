import { Router } from 'express';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, query, orderBy, limit, where, addDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { eventBus } from '../events/DomainEventBus';
import { initializeApp as initAdmin, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';

export const quotesRouter = Router();

// Retrieve Firebase configuration
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.warn('Could not read firebase-applet-config.json', e);
}

// Initialize Firebase Admin for Storage (more stable on server)
if (getAdminApps().length === 0 && firebaseConfig.projectId) {
  try {
    initAdmin({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket
    });
    console.log('Firebase Admin initialized for project:', firebaseConfig.projectId);
  } catch (err) {
    console.error('Firebase Admin init error', err);
  }
}

function ensureFirebase() {
  if (!getApps().length && firebaseConfig.projectId) {
    try {
      console.log('Initializing Firebase with Project:', firebaseConfig.projectId, 'Bucket:', firebaseConfig.storageBucket);
      initializeApp(firebaseConfig);
    } catch (err) {
      console.error('Firebase init error', err);
    }
  }
}

function getDb() {
  ensureFirebase();
  if (!getApps().length) throw new Error('Firebase not initialized');
  return getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);
}

function getAdminDb() {
  const apps = getAdminApps();
  if (apps.length === 0) {
    throw new Error('Firebase Admin not initialized');
  }
  const app = apps[0];
  // Use databaseId if provided, otherwise default
  return getAdminFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
}

// GET /api/quotes - Obtener todas las cotizaciones de Firestore
quotesRouter.get('/', async (req, res) => {
  try {
    const db = getDb();
    const snap = await getDocs(collection(db, 'quotes'));
    const quotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, quotes });
  } catch (err: any) {
    console.error('Error fetching quotes:', err);
    res.status(500).json({ success: false, error: err.message, quotes: [] });
  }
});

// POST /api/quotes - Guardar o actualizar cotización en Firestore
quotesRouter.post('/', async (req, res) => {
  try {
    const quote = req.body;
    if (!quote || !quote.number) {
      return res.status(400).json({ success: false, error: 'Datos de cotización inválidos' });
    }

    const quoteId = quote.id || `quote-${Date.now()}`;
    const db = getDb();
    const docRef = doc(db, 'quotes', quoteId);

    const dataToSave = {
      ...quote,
      id: quoteId,
      updatedAt: new Date().toISOString(),
      createdAt: quote.createdAt || new Date().toISOString()
    };

    await setDoc(docRef, dataToSave, { merge: true });
    res.json({ success: true, quote: dataToSave });
  } catch (err: any) {
    console.error('Error saving quote:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/quotes/:id/status - Actualizar estado y metadatos de aprobación o envío
quotesRouter.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvedBy, notes, sentVia } = req.body;
    const db = getDb();
    const docRef = doc(db, 'quotes', id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: 'Cotización no encontrada' });
    }

    const updates: any = {
      status: status || snap.data().status,
      updatedAt: new Date().toISOString()
    };

    if (status === 'Aprobada') {
      updates.approvedBy = approvedBy || 'Asesor Comercial';
      updates.approvedAt = new Date().toISOString();
    }

    if (status === 'Enviada') {
      updates.sentAt = new Date().toISOString();
      updates.sentVia = sentVia || 'WHATSAPP';
    }

    if (notes !== undefined) {
      updates.commercialNotes = notes;
    }

    await updateDoc(docRef, updates);
    res.json({ success: true, quote: { ...snap.data(), ...updates } });
  } catch (err: any) {
    console.error('Error updating quote status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/quotes/:id/approve - Aprobar pre-cotización comercialmente
quotesRouter.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, items, subtotal, total, paymentTerms, deliveryTime, quote: incomingQuote } = req.body;
    console.log(`Approving quote ${id}`);
    
    const db = getDb();
    const quoteRef = doc(db, 'quotes', id);
    const snap = await getDoc(quoteRef);

    let quoteData: any = {};
    if (snap.exists()) {
      quoteData = snap.data() || {};
    } else if (incomingQuote) {
      quoteData = incomingQuote;
    } else {
      quoteData = {
        id,
        number: req.body.number || `COT-${Date.now().toString().slice(-4)}`,
        clientName: req.body.clientName || 'Cliente General',
        items: items || [],
        total: total || 0,
        subtotal: subtotal || 0
      };
    }

    const updates: any = {
      ...quoteData,
      id,
      status: 'Aprobada',
      approvedBy: approvedBy || 'Jorge Enrique Escobar G. (Gerencia Comercial)',
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (Array.isArray(items)) updates.items = items;
    if (subtotal !== undefined) updates.subtotal = subtotal;
    if (total !== undefined) updates.total = total;
    if (paymentTerms) updates.paymentTerms = paymentTerms;
    if (deliveryTime) updates.deliveryTime = deliveryTime;

    await setDoc(quoteRef, updates, { merge: true });
    console.log(`Quote ${id} updated to Aprobada in Firestore`);

    // Publicar evento de cotización aprobada en el bus de dominio
    eventBus.publish('QUOTE_APPROVED', {
      quoteId: id,
      totalValue: Number(updates.total || quoteData.total || 0)
    });

    // --- INTEGRACIÓN CON PRODUCCIÓN: Crear Proyecto/OT ---
    let newProject: any = null;
    try {
      const projectsCol = collection(db, 'projects');
      const q = query(projectsCol, where('quoteId', '==', id));
      const snapProjects = await getDocs(q);

      if (snapProjects.empty) {
        const numberParts = (updates.number || quoteData.number || "").split('-');
        const numberPart = numberParts.length > 1 ? numberParts.pop() : (updates.number || Date.now());
        const projectNumber = `OT-${numberPart}`;
        
        newProject = {
          id: `proj-${id || Date.now()}`,
          quoteId: id,
          quoteNumber: updates.number || quoteData.number || 'N/A',
          number: projectNumber,
          name: updates.items?.[0]?.name || updates.items?.[0]?.description || 'Proyecto desde Cotización',
          client: updates.clientName || quoteData.clientName || 'Cliente General',
          stageId: '1', // "Por Revisar" (Etapa 1)
          priority: 'MEDIUM',
          dueDate: updates.deliveryTime || quoteData.deliveryTime || null,
          progress: 0,
          hasPO: false,
          assignments: [
            {
              role: 'REVISION',
              user: { id: 'me', name: 'Andres Admin', initial: 'AA', color: 'bg-indigo-500' }
            }
          ],
          daysLeft: 5,
          stageEnteredAt: new Date().toISOString(),
          totalRealHours: 0,
          timeEntries: [],
          consumedMaterials: [],
          artworkKeys: [],
          completedAt: null,
          qualityApprovals: [],
          partialDeliveries: [],
          systemComments: [`Orden de trabajo generada automáticamente desde cotización ${updates.number || quoteData.number}`],
          itemsDetail: updates.items || quoteData.items || [],
          quoteTotal: updates.total || quoteData.total || 0,
          productType: updates.productType || quoteData.productType || 'Impresión Digital',
          tasks: (updates.items || quoteData.items || []).map((it: any, idx: number) => ({
            id: `t-auto-${it.id || idx + 1}-${Date.now()}`,
            title: `${it.name || it.description || 'Ítem'} (${Number(it.quantity) || 1} uds)`,
            description: 'Revisión técnica y preparación',
            status: 'PENDING',
            assignedRole: 'REVISION',
            priority: 'MEDIUM',
            dueDate: null,
            completedAt: null
          })),
          laborCost: 0,
          materialCost: 0,
          outsourcedCost: 0,
          otherCost: 0,
          isBilled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'projects', newProject.id), newProject);
        console.log(`Proyecto (OT) creado con éxito en Firestore: ${projectNumber}`);

        // Publicar evento de entrada de proyecto al Kanban de producción
        eventBus.publish('PROJECT_STAGE_CHANGED', {
          projectId: newProject.id,
          fromStage: 'COTIZACION',
          toStage: 'Por Revisar (Etapa 1)'
        });
      } else {
        newProject = { id: snapProjects.docs[0].id, ...snapProjects.docs[0].data() };
        console.log(`Project already exists for quote ${id}`);
      }
    } catch (projErr) {
      console.warn('Error al crear proyecto en Producción:', projErr);
    }

    res.json({ success: true, quote: updates, project: newProject });
  } catch (err: any) {
    console.error('Error approving quote:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/quotes/:id/send - Registrar envío a cliente (WhatsApp, Email)
quotesRouter.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const { channel = 'WHATSAPP', destination, sentBy } = req.body;
    const db = getDb();
    const docRef = doc(db, 'quotes', id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: 'Cotización no encontrada' });
    }

    const updates: any = {
      status: 'Enviada',
      sentAt: new Date().toISOString(),
      sentVia: channel,
      sentDestination: destination || snap.data().clientPhone || snap.data().clientEmail,
      sentBy: sentBy || 'Asesor Comercial',
      updatedAt: new Date().toISOString()
    };

    await updateDoc(docRef, updates);
    res.json({ success: true, quote: { ...snap.data(), ...updates } });
  } catch (err: any) {
    console.error('Error registering quote send:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/quotes/:id - Eliminar o descartar cotización
quotesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    await deleteDoc(doc(db, 'quotes', id));
    res.json({ success: true, message: 'Cotización eliminada correctamente' });
  } catch (err: any) {
    console.error('Error deleting quote:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/quotes/upload-pdf - Subir PDF a Firebase Storage para compartir
quotesRouter.post('/upload-pdf', async (req, res) => {
  try {
    const { pdfBase64, fileName, quoteId } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ success: false, error: 'No se recibió el contenido del PDF' });
    }

    console.log(`Uploading PDF via Admin SDK: quotes/${quoteId}/${fileName}`);
    
    try {
      const apps = getAdminApps();
      if (apps.length === 0) throw new Error('Firebase Admin not initialized');
      const app = apps[0];
      const bucket = getAdminStorage(app).bucket();
      const file = bucket.file(`quotes/${quoteId || Date.now()}/${fileName || 'cotizacion.pdf'}`);
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      // Save file to bucket
      await file.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
        },
        resumable: false
      });

      let url = '';
      try {
        // Try to generate a signed URL (requires service account credentials or signing ability)
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: '03-01-2500' 
        });
        url = signedUrl;
      } catch (signErr) {
        console.warn('Could not sign URL, attempting public access:', signErr);
        // Fallback: Make public and use storage.googleapis.com URL
        await file.makePublic();
        url = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      }

      console.log('Admin SDK Upload successful. URL:', url);
      res.json({ success: true, url });
    } catch (uploadErr: any) {
      console.error('Detailed Admin Storage Error:', uploadErr);
      res.status(500).json({ 
        success: false, 
        error: `Admin Storage Error: ${uploadErr.message}`,
        details: uploadErr 
      });
    }
  } catch (err: any) {
    console.error('Error in upload-pdf route:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Función centralizada para generar la Pre-cotización con IA y persistirla
export async function generatePreQuoteInternal({
  conversation = [],
  customer = null,
  channel = 'WhatsApp',
  manualText = ''
}: {
  conversation?: any[];
  customer?: any;
  channel?: string;
  manualText?: string;
}) {
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      timeout: 45000
    }
  });

  // Formatear el historial para el análisis de la IA
  let transcript = '';
  if (Array.isArray(conversation) && conversation.length > 0) {
    transcript = conversation.map((m: any) => {
      const sender = m.sender === 'user' ? 'CLIENTE' : (m.agentName || m.sender || 'AGENTE');
      return `${sender}: ${m.content}`;
    }).join('\n');
  }

  if (manualText) {
    transcript += `\nINFORMACIÓN ADICIONAL:\n${manualText}`;
  }

  if (!transcript.trim()) {
    throw new Error('No hay conversación o datos suficientes para generar la pre-cotización.');
  }

  const prompt = `Actúas como el Director Técnico y de Costeo de Fusión Comunicación Gráfica y Empaques (Colombia).
Tu tarea es analizar detalladamente la conversación con un cliente y extraer una PRE-COTIZACIÓN COMERCIAL precisa en formato JSON.

DATOS DEL CLIENTE CONOCIDOS (si están disponibles):
- Nombre / Razón Social: ${customer?.name || 'Por definir'}
- Empresa: ${customer?.company || customer?.name || 'Cliente Fusión'}
- Teléfono: ${customer?.phone || ''}
- Correo: ${customer?.email || ''}
- Dirección: ${customer?.address || ''}

TRANSCRIPCIÓN DE LA CONVERSACIÓN:
"""
${transcript}
"""

REGLAS DE EXTRACCIÓN PARA LA PRE-COTIZACIÓN:
1. Extrae todos los ítems o productos solicitados. Si no se especificó un producto formal, usa el contexto (ej: 'Cajas de cartón corrugado ranuradas Kraft').
2. Identifica la cantidad exacta solicitada para cada ítem (número entero). Si no se mencionó, usa 1000 como referencia tentativa.
3. Especificaciones técnicas por ítem:
   - size: Medidas (Largo x Ancho x Alto cm) o formato indicado.
   - material: Tipo de material (ej: 'Cartón corrugado Kraft onda sencilla C', 'Cartulina Maule 300g', 'Lona Banner 13oz', etc.).
   - inks: Especificación de impresión (ej: 'Sin impresión (neutras)', '1 tinta flexográfica', 'Policromía 4x0 tintas').
   - finishes: Acabados (ej: 'Ranurado, troquelado y pegue lineal', 'Laminado mate + reserva UV', etc.).
   - productionMode: 'IN_HOUSE' o 'OUTSOURCED'.
4. Deja unitPrice, subtotal, vatAmount y total en 0 (cero), ya que el objetivo es que el equipo comercial llene los precios definitivos.
5. Extrae el tiempo de entrega sugerido o conversado, términos de pago y observaciones técnicas del cliente (ej: peso que soportarán las cajas, ciudad de entrega).

Devuelve ÚNICAMENTE un objeto JSON válido (sin markdown adicional, sin bloques de código \`\`\`json si es posible, o un JSON puro) con la siguiente estructura:
{
  "clientName": "Nombre de la empresa o cliente",
  "clientNit": "NIT o CC si se conoce, o vacío",
  "clientPhone": "Teléfono",
  "clientEmail": "Correo electrónico",
  "clientAddress": "Dirección o ciudad",
  "items": [
    {
      "description": "Descripción clara y comercial del producto",
      "size": "Medidas",
      "material": "Material detallado",
      "inks": "Tintas / Impresión",
      "finishes": "Acabados y procesos",
      "quantity": 2000,
      "productionMode": "IN_HOUSE"
    }
  ],
  "deliveryTime": "5 a 8 días hábiles",
  "paymentTerms": "50% anticipo, 50% contra entrega",
  "validityDays": "30 días calendario",
  "notes": "Observaciones técnicas dadas por el cliente",
  "internalNotes": "Instrucción para el comercial: completar costo unitario y margen",
  "summary": "Resumen en una frase de la solicitud"
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  });

  const responseText = response.text || '{}';
  let parsed: any = {};
  try {
    parsed = JSON.parse(responseText);
  } catch (parseErr) {
    console.error('Error parsing JSON from Gemini pre-quote:', parseErr, responseText);
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleanJson);
  }

  // Generar consecutivo formal de Pre-cotización
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const preQuoteNumber = `PRE-2026-${randomSuffix}`;
  const quoteId = `quote-pre-${Date.now()}`;

  // Estructurar ítems compatibles con el Cotizador oficial
  const formattedItems = (parsed.items || []).map((it: any, index: number) => ({
    id: `it-${Date.now()}-${index + 1}`,
    order: index + 1,
    description: it.description || 'Ítem de producción',
    productionMode: it.productionMode || 'IN_HOUSE',
    size: it.size || '',
    inks: it.inks || 'Sin impresión',
    material: it.material || 'Cartón corrugado',
    finishes: it.finishes || 'Estándar',
    quantity: Number(it.quantity) || 1000,
    unitPrice: 0,
    subtotal: 0,
    applyVat: true,
    vatAmount: 0,
    total: 0,
    laborHours: 0,
    rawMaterialCost: 0,
    marginPercent: 30,
    showCalcPanel: false,
    isManuallyAdjusted: false,
    lastEditedField: 'quantity'
  }));

  if (formattedItems.length === 0) {
    formattedItems.push({
      id: `it-${Date.now()}-1`,
      order: 1,
      description: parsed.summary || 'Cajas corrugadas según especificación WhatsApp',
      productionMode: 'IN_HOUSE',
      size: 'Estándar',
      inks: 'Sin impresión',
      material: 'Cartón Kraft',
      finishes: 'Pegue lineal',
      quantity: 1000,
      unitPrice: 0,
      subtotal: 0,
      applyVat: true,
      vatAmount: 0,
      total: 0,
      laborHours: 0,
      rawMaterialCost: 0,
      marginPercent: 30,
      showCalcPanel: false,
      isManuallyAdjusted: false,
      lastEditedField: 'quantity'
    });
  }

  const preQuoteDoc = {
    id: quoteId,
    number: preQuoteNumber,
    status: 'Borrador',
    isPreQuote: true,
    aiExtracted: true,
    source: 'WHATSAPP_AI',
    clientId: customer?.id || `cli-${Date.now()}`,
    clientName: parsed.clientName || customer?.name || 'Cliente Solicitante',
    clientNit: parsed.clientNit || customer?.nit || '',
    clientEmail: parsed.clientEmail || customer?.email || '',
    clientPhone: parsed.clientPhone || customer?.phone || '',
    clientAddress: parsed.clientAddress || customer?.address || '',
    clientData: {
      name: parsed.clientName || customer?.name || 'Cliente Solicitante',
      tradeName: customer?.company || parsed.clientName || '',
      nit: parsed.clientNit || customer?.nit || '',
      email: parsed.clientEmail || customer?.email || '',
      phone: parsed.clientPhone || customer?.phone || '',
      address: parsed.clientAddress || customer?.address || ''
    },
    date: new Date().toISOString(),
    advisorName: 'Álvaro (Agente IA) / Jorge Enrique Escobar G.',
    advisorRole: 'Especialista Técnico / Gerencia Comercial',
    advisorPhone: '+57 315 474 4830',
    advisorEmail: 'fusioncg.gerencia@gmail.com',
    items: formattedItems,
    deliveryTime: parsed.deliveryTime || '5 a 8 días hábiles',
    paymentTerms: parsed.paymentTerms || '50% anticipo, 50% contra entrega',
    validityDays: parsed.validityDays || '30 días calendario',
    commercialTerms: 'Pre-cotización elaborada por IA a partir de solicitud de cliente. Pendiente de revisión, cálculo de costos de materias primas y aprobación comercial.',
    notes: parsed.notes || '',
    internalNotes: `[Generada por IA desde ${channel}]\n${parsed.internalNotes || ''}\nResumen: ${parsed.summary || ''}`,
    aiSummary: parsed.summary || 'Solicitud de cotización vía chat',
    subtotal: 0,
    vatAmount: 0,
    total: 0,
    conversation: conversation || [],
    conversationTranscript: transcript || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Guardar en Firestore
  try {
    const db = getDb();
    await setDoc(doc(db, 'quotes', quoteId), preQuoteDoc);
    console.log(`Pre-cotización guardada con éxito en Firestore: ${preQuoteNumber} (${quoteId})`);
  } catch (dbErr) {
    console.warn('Aviso: no se pudo persistir en Firestore, devolviendo documento en memoria:', dbErr);
  }

  return {
    success: true,
    preQuote: preQuoteDoc,
    message: `Pre-cotización ${preQuoteNumber} generada exitosamente lista para que el comercial ingrese precios.`
  };
}

// POST /api/quotes/generate-pre-quote - IA analiza la conversación y extrae la Pre-cotización
quotesRouter.post('/generate-pre-quote', async (req, res) => {
  try {
    const result = await generatePreQuoteInternal(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('Error generating pre-quote with AI:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Error al generar la pre-cotización con IA' 
    });
  }
});

// GET /api/quotes/projects-sync - Obtener proyectos de producción sincronizados
quotesRouter.get('/projects-sync', async (req, res) => {
  try {
    const db = getDb();
    const snap = await getDocs(collection(db, 'projects'));
    const projects = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    res.json({ success: true, projects });
  } catch (err: any) {
    console.error('Error syncing projects:', err);
    res.status(500).json({ success: false, error: err.message, projects: [] });
  }
});

// DELETE /api/quotes/projects/:id - Eliminar proyecto de producción
quotesRouter.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quoteId, quoteNumber, number } = req.body || {};
    const db = getDb();
    
    // Direct delete by ID
    try {
      await deleteDoc(doc(db, 'projects', id));
      console.log(`Deleted project doc: ${id}`);
    } catch (e) {
      console.warn(`Could not delete project doc ${id}:`, e);
    }

    // Delete any project where quoteId == id or id == `proj-${id}`
    const targetQuoteId = quoteId || (id.startsWith('proj-') ? id.replace('proj-', '') : null);
    if (targetQuoteId) {
      try {
        const projectsCol = collection(db, 'projects');
        const q = query(projectsCol, where('quoteId', '==', targetQuoteId));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, 'projects', d.id)).catch(() => {});
        }
      } catch (e) {
        console.warn('Error querying projects by quoteId:', e);
      }
    }

    // Also delete any project where quoteNumber == quoteNumber
    if (quoteNumber) {
      try {
        const projectsCol = collection(db, 'projects');
        const q = query(projectsCol, where('quoteNumber', '==', quoteNumber));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, 'projects', d.id)).catch(() => {});
        }
      } catch (e) {
        console.warn('Error querying projects by quoteNumber:', e);
      }
    }

    res.json({ success: true, message: `Proyecto ${id} eliminado con éxito` });
  } catch (err: any) {
    console.error('Error deleting project in backend:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/quotes/projects/:id/stage - Transicionar etapa de proyecto y emitir evento de dominio
quotesRouter.patch('/projects/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, stageId } = req.body;
    const toStage = String(stage || stageId || '');

    if (!toStage) {
      return res.status(400).json({ error: 'La etapa destino (stage o stageId) es obligatoria' });
    }

    const db = getDb();
    const projRef = doc(db, 'projects', id);
    const snap = await getDoc(projRef);

    let fromStage = 'Sin Etapa';
    if (snap.exists()) {
      const data = snap.data();
      fromStage = String(data.stage || data.stageId || 'Etapa Previa');
      await updateDoc(projRef, {
        stageId: toStage,
        stage: toStage,
        stageEnteredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      await setDoc(projRef, {
        id,
        stageId: toStage,
        stage: toStage,
        stageEnteredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    // Publicar evento en el Domain Event Bus
    eventBus.publish('PROJECT_STAGE_CHANGED', {
      projectId: id,
      fromStage,
      toStage
    });

    res.json({
      success: true,
      projectId: id,
      fromStage,
      toStage,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error transitioning project stage:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

