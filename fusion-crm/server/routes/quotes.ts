import { recordGeminiUsage } from '../omnichannel/usage';
import { geminiModel } from '../omnichannel/llm';
import { Router } from 'express';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, query, orderBy, limit, where, addDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { eventBus } from '../events/DomainEventBus';
import { reviewQuote, approvalBlockReason } from '../services/quoteReviewService';
import { isApprovedStatus } from '../../packages/core/src/pricing/quoteReview';
import { repositories, writeContextFrom } from '../repositories';
import { systemConfig } from '../services/systemConfig';
import { inventoryService } from '../services/inventoryService';
import { getTariffVersion } from '../services/tariffStore';
import { paperPlanFromItems } from '../../packages/core/src/inventory/paperPlan';
import { orderNumberFor } from '../../packages/core/src/numbering/numbering';
import { dueDateFor } from '../../packages/core/src/calendar/workCalendar';

import { initializeApp as initAdmin, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

export const quotesRouter = Router();

/**
 * Quién hace la acción: la identidad verificada por la sesión (server/auth/session.ts
 * sobrescribe x-user-*). No se acepta el nombre que envíe el navegador.
 */
function actor(req: { headers: Record<string, any> }) {
  return { id: String(req.headers['x-user-id'] || ''), name: String(req.headers['x-user-name'] || '') };
}

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
    const quotes = await repositories().quotes.list();
    res.json({ success: true, quotes });
  } catch (err: any) {
    console.error('Error fetching quotes:', err);
    res.status(500).json({ success: false, error: err.message, quotes: [] });
  }
});

/** OT creada a partir de la cotización (si la hay). */
async function orderForQuote(quoteId: string) {
  return (await repositories().projects.list()).find((p: any) => p.quoteId === quoteId) ?? null;
}
const orderLockMessage = (order: any) =>
  `La cotización ya tiene la orden de trabajo ${order.number || order.id} en Producción. Elimina o cancela la OT primero.`;

async function isQuoteNumberTaken(number: string, exceptId: string) {
  const target = String(number).trim().toUpperCase();
  return (await repositories().quotes.list()).some((q: any) => q.id !== exceptId && String(q.number || '').trim().toUpperCase() === target);
}

// POST /api/quotes/issue-number - Reserva el siguiente consecutivo (p. ej. para el PDF de una cotización nueva)
quotesRouter.post('/issue-number', async (_req, res) => {
  try {
    res.json({ success: true, number: await systemConfig().issueQuoteNumber() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/quotes - Guardar o actualizar cotización en Firestore
quotesRouter.post('/', async (req, res) => {
  try {
    const quote = req.body;
    if (!quote || typeof quote !== 'object' || Array.isArray(quote)) {
      return res.status(400).json({ success: false, error: 'Datos de cotización inválidos' });
    }

    const quoteId = quote.id || `quote-${Date.now()}`;
    const previous: any = await repositories().quotes.get(quoteId);

    // El número lo pone el servidor: una cotización existente conserva el suyo y una nueva
    // recibe el siguiente consecutivo (salvo que traiga uno emitido antes y libre)
    if (previous?.number) {
      quote.number = previous.number;
    } else if (!quote.number || (await isQuoteNumberTaken(quote.number, quoteId))) {
      quote.number = await systemConfig().issueQuoteNumber();
    }

    const dataToSave: any = {
      ...quote,
      id: quoteId,
      updatedAt: new Date().toISOString(),
      createdAt: quote.createdAt || new Date().toISOString()
    };

    // Una cotización aprobada con OT no vuelve a otro estado desde aquí
    if (isApprovedStatus(previous?.status) && quote.status !== undefined && !isApprovedStatus(quote.status)) {
      const order = await orderForQuote(quoteId);
      if (order) return res.status(409).json({ success: false, code: 'HAS_ORDER', error: orderLockMessage(order) });
    }

    // Los montos los calcula el servidor a partir de los ítems (no se confía en los del navegador)
    const itemsToReview = Array.isArray(quote.items) ? quote.items : previous?.items;
    if (Array.isArray(itemsToReview)) {
      const { totals, pricingReview } = await reviewQuote(itemsToReview);
      Object.assign(dataToSave, {
        items: totals.items,
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        total: totals.total,
        pricingReview,
      });

      const becomingApproved = isApprovedStatus(quote.status) && !isApprovedStatus(previous?.status);
      if (becomingApproved) {
        // Aprobar crea la OT y reserva el papel: eso lo hace POST /:id/approve
        if (!quote.allowWithoutOrder) {
          return res.status(400).json({ success: false, code: 'USE_APPROVE', error: 'Para aprobar usa "Aprobar" (crea la orden de trabajo).' });
        }
        delete dataToSave.allowWithoutOrder;
        const blocked = approvalBlockReason(pricingReview, req.headers['x-user-role']);
        if (blocked) return res.status(403).json({ success: false, code: 'BELOW_COST', error: blocked, pricingReview });
        Object.assign(dataToSave, { approvedBy: actor(req).name, approvedById: actor(req).id, approvedAt: new Date().toISOString() });
      }
    }

    // Equivale a { merge: true }: los campos no enviados se conservan
    const saved = await repositories().quotes.upsert({ ...(previous || {}), ...dataToSave }, writeContextFrom(req));
    res.json({ success: true, quote: saved });
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
    const current: any = await repositories().quotes.get(id);

    if (!current) {
      return res.status(404).json({ success: false, error: 'Cotización no encontrada' });
    }
    const snap = { data: () => current };

    const updates: any = {
      status: status || snap.data().status,
      updatedAt: new Date().toISOString()
    };

    if (isApprovedStatus(snap.data().status) && status && !isApprovedStatus(status)) {
      const order = await orderForQuote(id);
      if (order) return res.status(409).json({ success: false, code: 'HAS_ORDER', error: orderLockMessage(order) });
    }

    if (isApprovedStatus(status) && !isApprovedStatus(snap.data().status)) {
      // Aprobar crea la OT: eso lo hace POST /:id/approve
      if (!req.body?.allowWithoutOrder) {
        return res.status(400).json({ success: false, code: 'USE_APPROVE', error: 'Para aprobar usa "Aprobar" (crea la orden de trabajo).' });
      }
      const { totals, pricingReview } = await reviewQuote(snap.data().items);
      const blocked = approvalBlockReason(pricingReview, req.headers['x-user-role']);
      if (blocked) return res.status(403).json({ success: false, code: 'BELOW_COST', error: blocked, pricingReview });
      Object.assign(updates, { items: totals.items, subtotal: totals.subtotal, vatAmount: totals.vatAmount, total: totals.total, pricingReview });
      updates.approvedBy = actor(req).name;
      updates.approvedById = actor(req).id;
      updates.approvedAt = new Date().toISOString();
    }

    if (status === 'Enviada') {
      updates.sentAt = new Date().toISOString();
      updates.sentVia = sentVia || 'WHATSAPP';
    }

    if (notes !== undefined) {
      updates.commercialNotes = notes;
    }

    const saved = await repositories().quotes.patch(id, updates, writeContextFrom(req));
    res.json({ success: true, quote: saved });
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
    
    const stored: any = await repositories().quotes.get(id);

    let quoteData: any = {};
    if (stored) {
      quoteData = stored;
    } else if (incomingQuote) {
      quoteData = incomingQuote;
    } else {
      quoteData = {
        id,
        number: req.body.number || (await systemConfig().issueQuoteNumber()),
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
      approvedBy: actor(req).name,
      approvedById: actor(req).id,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Montos y revisión de precios calculados en el servidor
    const { totals, pricingReview } = await reviewQuote(Array.isArray(items) ? items : quoteData.items);
    const blocked = approvalBlockReason(pricingReview, req.headers['x-user-role']);
    if (blocked) return res.status(403).json({ success: false, code: 'BELOW_COST', error: blocked, pricingReview });
    Object.assign(updates, { items: totals.items, subtotal: totals.subtotal, vatAmount: totals.vatAmount, total: totals.total, pricingReview });
    if (paymentTerms) updates.paymentTerms = paymentTerms;
    if (deliveryTime) updates.deliveryTime = deliveryTime;

    await repositories().quotes.upsert(updates, writeContextFrom(req));
    console.log(`Quote ${id} aprobada`);

    // Publicar evento de cotización aprobada en el bus de dominio
    eventBus.publish('QUOTE_APPROVED', {
      quoteId: id,
      totalValue: Number(updates.total || quoteData.total || 0)
    });

    // --- INTEGRACIÓN CON PRODUCCIÓN: Crear Proyecto/OT ---
    let newProject: any = null;
    try {
      const existingProjects = (await repositories().projects.list()).filter((p: any) => p.quoteId === id);

      if (existingProjects.length === 0) {
        const quoteNumber = updates.number || quoteData.number || (await systemConfig().issueQuoteNumber());
        const projectNumber = orderNumberFor(quoteNumber, systemConfig().numbering());
        const deliveryText = updates.deliveryTime || quoteData.deliveryTime || null;
        
        newProject = {
          id: `proj-${id || Date.now()}`,
          quoteId: id,
          quoteNumber,
          number: projectNumber,
          name: updates.items?.[0]?.name || updates.items?.[0]?.description || 'Proyecto desde Cotización',
          client: updates.clientName || quoteData.clientName || 'Cliente General',
          stageId: '1', // "Por Revisar" (Etapa 1)
          priority: 'MEDIUM',
          // Fecha real según el calendario laboral ("3 a 5 días hábiles" → 5 días hábiles desde hoy)
          dueDate: dueDateFor(new Date(), deliveryText, systemConfig().calendar()),
          deliveryTime: deliveryText,
          progress: 0,
          hasPO: false,
          // Sin responsable hasta que producción lo asigne
          assignments: [],
          daysLeft: 0,
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
          // Escala aprobada con el cliente (lo que se debe producir)
          approvedScaleUnits: (updates.items || quoteData.items || []).reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0),
          scaleApprovalCertified: true,
          scaleApprovalCertifiedAt: new Date().toISOString(),
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

        // Papel de la OT calculado de la cotización y apartado en bodega
        try {
          const plan = paperPlanFromItems(newProject.itemsDetail, getTariffVersion(updates.tariffVersionId || quoteData.tariffVersionId).snapshot.sheetCuts);
          newProject.paperPlan = await inventoryService().reservePlan({ id: newProject.id, number: projectNumber }, plan, actor(req).name || 'Sistema');
        } catch (planErr) {
          console.warn('No se pudo reservar el papel de la OT:', planErr);
        }

        await repositories().projects.upsert(newProject);
        console.log(`Proyecto (OT) creado: ${projectNumber}`);

        // Publicar evento de entrada de proyecto al Kanban de producción
        eventBus.publish('PROJECT_STAGE_CHANGED', {
          projectId: newProject.id,
          fromStage: 'COTIZACION',
          toStage: 'Por Revisar (Etapa 1)'
        });
      } else {
        newProject = existingProjects[0];
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
    const current: any = await repositories().quotes.get(id);

    if (!current) {
      return res.status(404).json({ success: false, error: 'Cotización no encontrada' });
    }
    const snap = { data: () => current };

    // Reenviar una cotización ya aprobada o rechazada registra el envío sin cambiar su estado
    const keepStatus = isApprovedStatus(current.status) || current.status === 'Rechazada';
    const updates: any = {
      ...(keepStatus ? {} : { status: 'Enviada' }),
      sentAt: new Date().toISOString(),
      sentVia: channel,
      sentDestination: destination || snap.data().clientPhone || snap.data().clientEmail,
      sentBy: actor(req).name,
      sentById: actor(req).id,
      updatedAt: new Date().toISOString()
    };

    const saved = await repositories().quotes.patch(id, updates, writeContextFrom(req));
    res.json({ success: true, quote: saved });
  } catch (err: any) {
    console.error('Error registering quote send:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/quotes/:id - Eliminar o descartar cotización
quotesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderForQuote(id);
    if (order) return res.status(409).json({ success: false, code: 'HAS_ORDER', error: orderLockMessage(order) });
    await repositories().quotes.delete(id);
    res.json({ success: true, message: 'Cotización eliminada correctamente' });
  } catch (err: any) {
    console.error('Error deleting quote:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// Función centralizada para generar la Pre-cotización con IA y persistirla
function extractionPrompt(transcript: string, customer: any) {
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
  return prompt;
}

/** Llama a Gemini (con un PDF o imagen opcional) y devuelve el JSON de la solicitud. */
async function runExtraction(prompt: string, attachment?: { mimeType: string; data: string }) {
  if (!process.env.GEMINI_API_KEY) throw Object.assign(new Error('La IA no está configurada (falta GEMINI_API_KEY)'), { status: 503 });
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 45000 } });
  const model = geminiModel();
  const response = await ai.models.generateContent({
    model,
    contents: attachment ? [{ role: 'user', parts: [{ inlineData: attachment }, { text: prompt }] }] : prompt,
    config: { responseMimeType: 'application/json', temperature: 0.1 },
  });
  recordGeminiUsage(response, model, 'precotizaciones');
  const text = response.text || '{}';
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
  }
}

/** Ítems en el formato del cotizador, sin inventar datos que el cliente no dio. */
function extractedItems(parsed: any) {
  return (Array.isArray(parsed?.items) ? parsed.items : [])
    .filter((it: any) => it && (it.description || it.size || it.material))
    .map((it: any, index: number) => ({
      id: `it-${Date.now()}-${index + 1}`,
      order: index + 1,
      description: String(it.description || 'Ítem').trim(),
      productionMode: it.productionMode === 'OUTSOURCED' ? 'OUTSOURCED' : 'IN_HOUSE',
      size: String(it.size || '').trim(),
      inks: String(it.inks || '').trim(),
      material: String(it.material || '').trim(),
      finishes: String(it.finishes || '').trim(),
      quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
      quantityAssumed: !(Number(it.quantity) > 0),
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
      lastEditedField: 'quantity',
      aiSuggested: true,
    }));
}

const EXTRACT_MIME = /^(application\/pdf|image\/(png|jpeg|webp)|text\/plain)$/;

// POST /api/quotes/extract-items - La IA lee un chat, un PDF o una imagen y propone los ítems (no guarda nada)
quotesRouter.post('/extract-items', async (req, res) => {
  try {
    const { text, fileBase64, mimeType, fileName } = req.body ?? {};
    let transcript = typeof text === 'string' ? text.slice(0, 30000) : '';
    let attachment: { mimeType: string; data: string } | undefined;
    if (fileBase64) {
      const mt = String(mimeType || '');
      if (!EXTRACT_MIME.test(mt)) return res.status(400).json({ success: false, error: 'Sube un PDF, una imagen (JPG, PNG) o un .txt' });
      if (String(fileBase64).length > 14_000_000) return res.status(413).json({ success: false, error: 'El archivo supera 10 MB' });
      if (mt === 'text/plain') transcript += `\n${Buffer.from(fileBase64, 'base64').toString('utf8').slice(0, 30000)}`;
      else attachment = { mimeType: mt, data: fileBase64 };
    }
    if (!transcript.trim() && !attachment) return res.status(400).json({ success: false, error: 'Pega el texto o sube un archivo' });
    const source = attachment ? `(la solicitud está en el archivo adjunto${fileName ? ` "${fileName}"` : ''})\n${transcript}` : transcript;
    const parsed = await runExtraction(extractionPrompt(source, null), attachment);
    const items = extractedItems(parsed);
    if (!items.length) return res.status(422).json({ success: false, error: 'La IA no encontró productos para cotizar en ese contenido' });
    res.json({
      success: true,
      items,
      client: { name: parsed.clientName || '', nit: parsed.clientNit || '', phone: parsed.clientPhone || '', email: parsed.clientEmail || '', address: parsed.clientAddress || '' },
      deliveryTime: parsed.deliveryTime || '',
      notes: parsed.notes || '',
      summary: parsed.summary || '',
    });
  } catch (err: any) {
    console.error('Error extrayendo ítems con IA:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'No se pudo leer con la IA' });
  }
});

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

  const prompt = extractionPrompt(transcript, customer);

  const parsed = await runExtraction(prompt);

  // Sin productos identificables la solicitud igual queda registrada para el asesor, con una
  // línea que solo describe lo pedido: no se inventan material, tintas ni cantidades.
  const formattedItems = extractedItems(parsed);
  if (formattedItems.length === 0) {
    formattedItems.push(
      ...extractedItems({ items: [{ description: `Por definir con el cliente: ${parsed.summary || 'solicitud de cotización'}` }] }),
    );
  }

  // Consecutivo de la serie de cotizaciones (la pre-cotización es una cotización en borrador)
  const preQuoteNumber = await systemConfig().issueQuoteNumber();
  const quoteId = `quote-pre-${Date.now()}`;

  const preQuoteDoc = {
    id: quoteId,
    number: preQuoteNumber,
    status: 'Borrador',
    isPreQuote: true,
    aiExtracted: true,
    source: 'WHATSAPP_AI',
    clientId: customer?.id || undefined,
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
    // El asesor que la revise pone sus datos; la IA no firma la cotización
    advisorName: '',
    advisorRole: '',
    advisorPhone: '',
    advisorEmail: '',
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

  await repositories().quotes.upsert(preQuoteDoc as any);
  console.log(`Pre-cotización guardada: ${preQuoteNumber} (${quoteId})`);

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
    res.status(err.status || 500).json({ 
      success: false, 
      error: err.message || 'Error al generar la pre-cotización con IA' 
    });
  }
});

// GET /api/quotes/projects-sync - Obtener proyectos de producción sincronizados
quotesRouter.get('/projects-sync', async (req, res) => {
  try {
    const projects = await repositories().projects.list();
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
    const { quoteId, quoteNumber } = req.body || {};
    const projects = repositories().projects;

    // Se elimina el proyecto y los que pertenezcan a la misma cotización (por id o número)
    const targetQuoteId = quoteId || (id.startsWith('proj-') ? id.replace('proj-', '') : null);
    const related = (await projects.list()).filter(
      (p: any) => p.id === id || (targetQuoteId && p.quoteId === targetQuoteId) || (quoteNumber && p.quoteNumber === quoteNumber)
    );
    const ids = new Set([id, ...related.map((p: any) => p.id)]);
    // El papel apartado para esas OT vuelve a quedar libre
    for (const p of related) {
      if (p.paperPlan?.status === 'RESERVADO') await inventoryService().releasePlan(p, actor(req).name || 'Sistema').catch((e) => console.warn('No se pudo liberar el papel:', e));
    }
    for (const projectId of ids) await projects.delete(projectId);

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

    const projects = repositories().projects;
    const current: any = await projects.get(id);
    const fromStage = current ? String(current.stage || current.stageId || 'Etapa Previa') : 'Sin Etapa';
    const now = new Date().toISOString();
    await projects.upsert({ ...(current || { id }), id, stageId: toStage, stage: toStage, stageEnteredAt: now, updatedAt: now });

    // Al entrar a producción se descarga el papel reservado (si falta, la OT avanza igual y se avisa)
    let paperDischarge: { ok: boolean; message: string } | null = null;
    if ((toStage === '3' || toStage === 'EN_PRODUCCION') && current?.paperPlan?.status === 'RESERVADO') {
      try {
        const r = await inventoryService().dischargePlan({ ...current, id }, actor(req).name || 'Sistema');
        await projects.patch(id, {
          paperPlan: r.plan,
          consumedMaterials: [...(current.consumedMaterials || []), ...r.consumed],
          materialCost: Math.round(((Number(current.materialCost) || 0) + r.total) * 100) / 100,
        });
        paperDischarge = { ok: true, message: `Papel descargado: $${Math.round(r.total).toLocaleString('es-CO')}` };
      } catch (err: any) {
        paperDischarge = { ok: false, message: err.message };
      }
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
      paperDischarge,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error transitioning project stage:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

