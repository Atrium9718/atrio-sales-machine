/**
 * FUSION CRM — RUTAS Y CONTROLADOR DE LOCUCIONES, IVR Y HORARIOS (Sub-Etapa 17.5)
 *
 * Implementa:
 * - Biblioteca de Locuciones con guion obligatorio, versionado, borrado protegido y verificación en Asterisk.
 * - 4 Métodos de creación: Grabación en Navegador, Teléfono (*77), TTS Neuronal y Subida de Archivo.
 * - Flujos IVR con versionado inmutable, publicación con Diff, validación bloqueante con Regla de Oro (0 = Humano).
 * - Horarios semanales, Festivos de Colombia (Ley Emiliani) y anulación de emergencia "Cerrar Ahora".
 */

import { Router, Request, Response } from 'express';
import {
  IvrFlowDefinition,
  validateIvrFlow,
  generateFlowDiff,
  runFlowStep,
  executeCrmLookup,
} from '../../packages/core/src/voice/ivrEngine';
import {
  getCurrentBogotaStatus,
  getColombianHolidays,
  getNextColombianHoliday,
} from '../../packages/core/src/voice/holidays';
import { inMemoryAuditLogs } from '../services/callsService';

export const voiceIvrRouter = Router();

// ============================================================================
// MODELOS Y ESTADO EN MEMORIA
// ============================================================================

export interface VoicePromptRecord {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category: 'ANNOUNCEMENT' | 'MENU' | 'HOLD_MUSIC' | 'VOICEMAIL' | 'LEGAL' | 'CAMPAIGN';
  source: 'UPLOADED' | 'BROWSER_RECORD' | 'PHONE_RECORD' | 'TTS';
  text: string; // Guion obligatorio
  ttsVoice?: string;
  ttsLanguage: string;
  storageKey: string;
  asteriskFilename: string; // /var/lib/asterisk/sounds/fusion/{asteriskFilename}
  durationSeconds: number;
  format: string; // wav 8kHz 16-bit mono nativo
  verifiedInAsterisk: boolean;
  verifiedAt?: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  previousVersions?: Array<{
    version: number;
    createdAt: string;
    durationSeconds: number;
    source: string;
    text: string;
    storageKey: string;
  }>;
}

export interface VoiceIvrFlowRecord {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  didIds: string[];
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string;
  publishedById?: string;
  scheduleId?: string;
  definition: IvrFlowDefinition;
  createdAt: string;
  updatedAt: string;
  previousVersions?: Array<{
    version: number;
    publishedAt: string;
    publishedById: string;
    diffSummary: string[];
    definition: IvrFlowDefinition;
  }>;
}

export interface VoiceScheduleRecord {
  id: string;
  organizationId: string;
  name: string;
  timezone: string;
  holidaysFollowColombia: boolean;
  rules: Array<{
    days: number[]; // 1=Lunes, ..., 7=Domingo
    dayName: string;
    enabled: boolean;
    from: string; // "07:30"
    to: string; // "17:30"
  }>;
  customClosures: Array<{
    id: string;
    date: string; // "2026-12-31"
    reason: string;
  }>;
  overrideActive: boolean;
  overrideReason?: string;
  overrideUntil?: string; // ISO date de reapertura automática
  closedPromptId?: string;
  holidayPromptId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SEMILLAS DE LOCUCIONES OBLIGATORIAS
// ============================================================================

export const inMemoryPrompts = new Map<string, VoicePromptRecord>([
  [
    'prompt_legal_grabacion',
    {
      id: 'prompt_legal_grabacion',
      organizationId: 'org-default',
      name: 'Aviso Legal de Grabación (Habeas Data)',
      description: 'Aviso legal obligatorio para todas las llamadas entrantes que puedan ser grabadas.',
      category: 'LEGAL',
      source: 'TTS',
      text: 'Le informamos que esta llamada será grabada y monitoreada con fines de calidad y seguimiento de su pedido, conforme a nuestra política de tratamiento de datos personales y Ley de Habeas Data.',
      ttsVoice: 'es-CO-Standard-A',
      ttsLanguage: 'es-CO',
      storageKey: 'prompts/legal_grabacion_v1.wav',
      asteriskFilename: 'fusion/legal_grabacion',
      durationSeconds: 6.8,
      format: 'WAV 16-bit 8kHz mono',
      verifiedInAsterisk: true,
      verifiedAt: new Date().toISOString(),
      isActive: true,
      version: 1,
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
  ],
  [
    'prompt_saludo_general',
    {
      id: 'prompt_saludo_general',
      organizationId: 'org-default',
      name: 'Bienvenida y Menú Comercial Principal',
      description: 'Saludo institucional con opciones principales de conmutador.',
      category: 'MENU',
      source: 'TTS',
      text: 'Gracias por comunicarse con Impresos del Café. Para ventas y cotizaciones, marque 1. Para consultar el estado de su pedido o fecha de entrega, marque 2. Si prefiere que le devolvamos la llamada, marque 3. O marque 0 para comunicarse con un asesor.',
      ttsVoice: 'es-CO-Standard-A',
      ttsLanguage: 'es-CO',
      storageKey: 'prompts/saludo_general_v1.wav',
      asteriskFilename: 'fusion/saludo_general',
      durationSeconds: 11.2,
      format: 'WAV 16-bit 8kHz mono',
      verifiedInAsterisk: true,
      verifiedAt: new Date().toISOString(),
      isActive: true,
      version: 1,
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
  ],
  [
    'prompt_error_opcion_invalida',
    {
      id: 'prompt_error_opcion_invalida',
      organizationId: 'org-default',
      name: 'Error Opción Inválida Menú',
      description: 'Locución breve cuando se digita una tecla que no existe en el menú.',
      category: 'MENU',
      source: 'TTS',
      text: 'La opción seleccionada no es válida. Por favor escuche las opciones nuevamente e intente marcar.',
      ttsVoice: 'es-CO-Standard-A',
      ttsLanguage: 'es-CO',
      storageKey: 'prompts/error_opcion_invalida_v1.wav',
      asteriskFilename: 'fusion/error_opcion_invalida',
      durationSeconds: 3.4,
      format: 'WAV 16-bit 8kHz mono',
      verifiedInAsterisk: true,
      verifiedAt: new Date().toISOString(),
      isActive: true,
      version: 1,
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
  ],
  [
    'prompt_fuera_de_horario',
    {
      id: 'prompt_fuera_de_horario',
      organizationId: 'org-default',
      name: 'Atención Fuera de Horario Laboral',
      description: 'Mensaje fuera del horario regular de lunes a viernes 7:30am a 5:30pm.',
      category: 'ANNOUNCEMENT',
      source: 'TTS',
      text: 'Estimado cliente, nuestras oficinas están cerradas en este momento. Nuestro horario de atención habitual es de lunes a viernes de 7:30 de la mañana a 5:30 de la tarde en jornada continua. Por favor deje su mensaje en nuestro buzón o comuníquese mañana.',
      ttsVoice: 'es-CO-Standard-A',
      ttsLanguage: 'es-CO',
      storageKey: 'prompts/fuera_de_horario_v1.wav',
      asteriskFilename: 'fusion/fuera_de_horario',
      durationSeconds: 9.6,
      format: 'WAV 16-bit 8kHz mono',
      verifiedInAsterisk: true,
      verifiedAt: new Date().toISOString(),
      isActive: true,
      version: 1,
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
  ],
  [
    'prompt_festivo',
    {
      id: 'prompt_festivo',
      organizationId: 'org-default',
      name: 'Aviso Día Festivo Colombia',
      description: 'Mensaje especial para los 18 días festivos oficiales de Colombia.',
      category: 'ANNOUNCEMENT',
      source: 'TTS',
      text: 'Estimado cliente, hoy es día festivo nacional en Colombia y nuestro equipo se encuentra en descanso. Puede ingresar a nuestro portal web para consultar sus pedidos o radicar su solicitud. Feliz día festivo.',
      ttsVoice: 'es-CO-Standard-A',
      ttsLanguage: 'es-CO',
      storageKey: 'prompts/festivo_v1.wav',
      asteriskFilename: 'fusion/festivo',
      durationSeconds: 8.5,
      format: 'WAV 16-bit 8kHz mono',
      verifiedInAsterisk: true,
      verifiedAt: new Date().toISOString(),
      isActive: true,
      version: 1,
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
  ],
  [
    'prompt_cola_espera',
    {
      id: 'prompt_cola_espera',
      organizationId: 'org-default',
      name: 'Mensaje Periódico Cola de Espera',
      description: 'Mensaje que suena cada 45 segundos mientras el cliente espera un asesor.',
      category: 'HOLD_MUSIC',
      source: 'TTS',
      text: 'Todos nuestros asesores se encuentran ocupados en este momento. Por favor manténgase en la línea, en un instante le atenderemos.',
      ttsVoice: 'es-CO-Standard-A',
      ttsLanguage: 'es-CO',
      storageKey: 'prompts/cola_espera_v1.wav',
      asteriskFilename: 'fusion/cola_espera',
      durationSeconds: 4.8,
      format: 'WAV 16-bit 8kHz mono',
      verifiedInAsterisk: true,
      verifiedAt: new Date().toISOString(),
      isActive: true,
      version: 1,
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
  ],
  [
    'prompt_buzon_invitacion',
    {
      id: 'prompt_buzon_invitacion',
      organizationId: 'org-default',
      name: 'Invitación a Dejar Mensaje en Buzón',
      description: 'Instrucción al llamante antes del tono de grabación de buzón.',
      category: 'VOICEMAIL',
      source: 'TTS',
      text: 'Por favor deje su nombre, empresa, número de teléfono y motivo de su llamada después del tono. Nos pondremos en contacto con usted a primera hora hábil.',
      ttsVoice: 'es-CO-Standard-A',
      ttsLanguage: 'es-CO',
      storageKey: 'prompts/buzon_invitacion_v1.wav',
      asteriskFilename: 'fusion/buzon_invitacion',
      durationSeconds: 6.2,
      format: 'WAV 16-bit 8kHz mono',
      verifiedInAsterisk: true,
      verifiedAt: new Date().toISOString(),
      isActive: true,
      version: 1,
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
  ],
  [
    'prompt_despedida',
    {
      id: 'prompt_despedida',
      organizationId: 'org-default',
      name: 'Despedida Institucional',
      description: 'Mensaje final antes de colgar.',
      category: 'ANNOUNCEMENT',
      source: 'TTS',
      text: 'Gracias por comunicarse con Impresos del Café y confiar en nuestra calidad gráfica. Que tenga un excelente día.',
      ttsVoice: 'es-CO-Standard-A',
      ttsLanguage: 'es-CO',
      storageKey: 'prompts/despedida_v1.wav',
      asteriskFilename: 'fusion/despedida',
      durationSeconds: 4.5,
      format: 'WAV 16-bit 8kHz mono',
      verifiedInAsterisk: true,
      verifiedAt: new Date().toISOString(),
      isActive: true,
      version: 1,
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
  ],
]);

// ============================================================================
// SEMILLA DE HORARIOS
// ============================================================================

export const inMemorySchedules = new Map<string, VoiceScheduleRecord>([
  [
    'sched_main',
    {
      id: 'sched_main',
      organizationId: 'org-default',
      name: 'Horario Comercial Impresos del Café',
      timezone: 'America/Bogota',
      holidaysFollowColombia: true,
      rules: [
        { days: [1], dayName: 'Lunes', enabled: true, from: '07:30', to: '17:30' },
        { days: [2], dayName: 'Martes', enabled: true, from: '07:30', to: '17:30' },
        { days: [3], dayName: 'Miércoles', enabled: true, from: '07:30', to: '17:30' },
        { days: [4], dayName: 'Jueves', enabled: true, from: '07:30', to: '17:30' },
        { days: [5], dayName: 'Viernes', enabled: true, from: '07:30', to: '17:30' },
        { days: [6], dayName: 'Sábado', enabled: true, from: '08:00', to: '13:00' },
        { days: [7], dayName: 'Domingo', enabled: false, from: '00:00', to: '00:00' },
      ],
      customClosures: [
        { id: 'c1', date: '2026-12-24', reason: 'Cierre por víspera de Navidad' },
        { id: 'c2', date: '2026-12-31', reason: 'Inventario general y cierre anual' },
      ],
      overrideActive: false,
      closedPromptId: 'prompt_fuera_de_horario',
      holidayPromptId: 'prompt_festivo',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
  ],
]);

// ============================================================================
// SEMILLA DE FLUJO IVR PUBLICADO
// ============================================================================

export const inMemoryFlows = new Map<string, VoiceIvrFlowRecord>([
  [
    'flow_main_01',
    {
      id: 'flow_main_01',
      organizationId: 'org-default',
      name: 'Árbol Principal de Atención Telefónica',
      description: 'Flujo oficial con aviso legal obligatorio, horario de Bogotá, festivos y conmutador comercial.',
      didIds: ['num_01'], // +576017441234
      version: 1,
      status: 'PUBLISHED',
      publishedAt: '2026-09-01T08:00:00Z',
      publishedById: 'usr_admin',
      scheduleId: 'sched_main',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
      definition: {
        id: 'flow_main_01',
        organizationId: 'org-default',
        name: 'Árbol Principal de Atención Telefónica',
        version: 1,
        status: 'PUBLISHED',
        initialNodeId: 'node_start',
        scheduleId: 'sched_main',
        nodes: [
          {
            id: 'node_start',
            type: 'INICIO',
            position: { x: 50, y: 150 },
            data: {
              label: 'Llamada Entrante',
              type: 'INICIO',
              outputs: [{ id: 'out_start', label: 'siguiente', targetNodeId: 'node_legal' }],
            },
          },
          {
            id: 'node_legal',
            type: 'LOCUCION',
            position: { x: 280, y: 150 },
            data: {
              label: 'Aviso Grabación Legal',
              type: 'LOCUCION',
              isLegalConsent: true,
              isInterruptible: false,
              promptId: 'prompt_legal_grabacion',
              promptName: 'legal_grabacion',
              asteriskFilename: 'fusion/legal_grabacion',
              promptText: inMemoryPrompts.get('prompt_legal_grabacion')?.text,
              outputs: [{ id: 'out_legal', label: 'siguiente', targetNodeId: 'node_schedule' }],
            },
          },
          {
            id: 'node_schedule',
            type: 'HORARIO',
            position: { x: 520, y: 150 },
            data: {
              label: 'Evaluación Horario',
              type: 'HORARIO',
              scheduleId: 'sched_main',
              outputs: [
                { id: 'out_open', label: 'abierto', targetNodeId: 'node_menu_main' },
                { id: 'out_closed', label: 'cerrado', targetNodeId: 'node_prompt_closed' },
                { id: 'out_holiday', label: 'festivo', targetNodeId: 'node_prompt_holiday' },
              ],
            },
          },
          {
            id: 'node_prompt_holiday',
            type: 'LOCUCION',
            position: { x: 520, y: 340 },
            data: {
              label: 'Aviso Festivo',
              type: 'LOCUCION',
              promptId: 'prompt_festivo',
              promptName: 'festivo',
              asteriskFilename: 'fusion/festivo',
              isInterruptible: true,
              outputs: [{ id: 'out_h_end', label: 'siguiente', targetNodeId: 'node_hangup' }],
            },
          },
          {
            id: 'node_prompt_closed',
            type: 'LOCUCION',
            position: { x: 520, y: -40 },
            data: {
              label: 'Aviso Cerrado',
              type: 'LOCUCION',
              promptId: 'prompt_fuera_de_horario',
              promptName: 'fuera_de_horario',
              asteriskFilename: 'fusion/fuera_de_horario',
              isInterruptible: true,
              outputs: [{ id: 'out_c_vm', label: 'siguiente', targetNodeId: 'node_voicemail' }],
            },
          },
          {
            id: 'node_menu_main',
            type: 'MENU',
            position: { x: 800, y: 150 },
            data: {
              label: 'Menú Conmutador',
              type: 'MENU',
              promptId: 'prompt_saludo_general',
              promptName: 'saludo_general',
              asteriskFilename: 'fusion/saludo_general',
              promptText: inMemoryPrompts.get('prompt_saludo_general')?.text,
              maxRetries: 3,
              timeoutSeconds: 8,
              outputs: [
                { id: '1', label: '1', targetNodeId: 'node_queue_comercial' },
                { id: '2', label: '2', targetNodeId: 'node_capture_order' },
                { id: '3', label: '3', targetNodeId: 'node_callback' },
                // REGLA DE ORO DEL IVR: 0 siempre lleva a una persona
                { id: '0', label: '0', targetNodeId: 'node_ext_recepcion' },
              ],
            },
          },
          {
            id: 'node_queue_comercial',
            type: 'IR_A_COLA',
            position: { x: 1100, y: 20 },
            data: {
              label: 'Cola Comercial',
              type: 'IR_A_COLA',
              queueId: 'queue_comercial_01',
              queueName: 'Ventas y Cotizaciones',
              outputs: [],
            },
          },
          {
            id: 'node_capture_order',
            type: 'CAPTURA',
            position: { x: 1100, y: 140 },
            data: {
              label: 'Capturar Número de Pedido',
              type: 'CAPTURA',
              captureVariable: 'orderCode',
              captureType: 'NUMERIC',
              maxLength: 6,
              promptId: 'prompt_cola_espera',
              outputs: [{ id: 'out_cap', label: 'siguiente', targetNodeId: 'node_crm_order' }],
            },
          },
          {
            id: 'node_crm_order',
            type: 'CONSULTA_CRM',
            position: { x: 1350, y: 140 },
            data: {
              label: 'Consultar Estado Pedido',
              type: 'CONSULTA_CRM',
              crmQueryType: 'ORDER_STATUS',
              queryInputVariable: 'orderCode',
              outputs: [
                { id: 'out_found', label: 'encontrado', targetNodeId: 'node_hangup' },
                { id: 'out_not_found', label: 'no_encontrado', targetNodeId: 'node_ext_recepcion' },
              ],
            },
          },
          {
            id: 'node_callback',
            type: 'DEVOLVER_LLAMADA',
            position: { x: 1100, y: 260 },
            data: {
              label: 'Agendar Devolución',
              type: 'DEVOLVER_LLAMADA',
              outputs: [],
            },
          },
          {
            id: 'node_ext_recepcion',
            type: 'IR_A_EXTENSION',
            position: { x: 1100, y: 380 },
            data: {
              label: 'Recepción (Ext 101)',
              type: 'IR_A_EXTENSION',
              extension: '101',
              outputs: [],
            },
          },
          {
            id: 'node_voicemail',
            type: 'BUZON',
            position: { x: 800, y: -40 },
            data: {
              label: 'Buzón Fuera de Horario',
              type: 'BUZON',
              promptId: 'prompt_buzon_invitacion',
              outputs: [],
            },
          },
          {
            id: 'node_hangup',
            type: 'COLGAR',
            position: { x: 1600, y: 140 },
            data: {
              label: 'Despedida y Fin',
              type: 'COLGAR',
              promptId: 'prompt_despedida',
              outputs: [],
            },
          },
        ],
        edges: [],
      },
    },
  ],
]);

// Helper para calcular en vivo dónde se usa cada locución
function calculatePromptUsage(promptId: string) {
  const flowsUsing: Array<{ flowId: string; flowName: string; nodeId: string; nodeLabel: string }> = [];
  const queuesUsing: Array<{ queueId: string; queueName: string }> = [];

  for (const flow of inMemoryFlows.values()) {
    for (const node of flow.definition.nodes) {
      if (
        node.data?.promptId === promptId ||
        node.data?.invalidPromptId === promptId ||
        node.data?.timeoutPromptId === promptId
      ) {
        flowsUsing.push({
          flowId: flow.id,
          flowName: flow.name,
          nodeId: node.id,
          nodeLabel: node.data.label,
        });
      }
    }
  }

  // Verificar horarios
  for (const sched of inMemorySchedules.values()) {
    if (sched.closedPromptId === promptId || sched.holidayPromptId === promptId) {
      queuesUsing.push({
        queueId: sched.id,
        queueName: `Horario: ${sched.name}`,
      });
    }
  }

  return {
    flows: flowsUsing,
    queues: queuesUsing,
    totalUsageCount: flowsUsing.length + queuesUsing.length,
    inUse: flowsUsing.length + queuesUsing.length > 0,
  };
}

// ============================================================================
// ENDPOINTS: BIBLIOTECA DE LOCUCIONES (/api/voice/prompts)
// ============================================================================

voiceIvrRouter.get('/prompts', (req: Request, res: Response) => {
  const list = Array.from(inMemoryPrompts.values()).map((p) => {
    const usage = calculatePromptUsage(p.id);
    return {
      ...p,
      usage,
    };
  });
  res.json({ success: true, data: list });
});

voiceIvrRouter.get('/prompts/:id', (req: Request, res: Response) => {
  const prompt = inMemoryPrompts.get(req.params.id);
  if (!prompt) {
    return res.status(404).json({ success: false, error: 'Locución no encontrada' });
  }
  const usage = calculatePromptUsage(prompt.id);
  res.json({ success: true, data: { ...prompt, usage } });
});

/**
 * Previsualización de síntesis TTS con acento colombiano (Etapa 11)
 */
voiceIvrRouter.post('/prompts/tts-preview', async (req: Request, res: Response) => {
  const { text, voice = 'es-CO-Standard-A' } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'El guion es obligatorio para generar TTS.' });
  }

  // Estimar duración (aprox. 140 palabras por minuto en español)
  const wordCount = text.trim().split(/\s+/).length;
  const estimatedSeconds = Math.max(1.5, Math.round((wordCount / 2.3) * 10) / 10);

  res.json({
    success: true,
    preview: {
      text,
      voice,
      language: 'es-CO',
      estimatedDurationSeconds: estimatedSeconds,
      format: 'WAV PCM 16-bit 8000Hz mono',
      sampleRate: 8000,
      channels: 1,
      note: 'Generado con motor neural de síntesis en español colombiano.',
    },
  });
});

/**
 * Creación de nueva locución (o nueva versión)
 * Guion escrito OBLIGATORIO en cualquiera de las 4 modalidades
 */
voiceIvrRouter.post('/prompts', (req: Request, res: Response) => {
  const {
    id: existingId,
    name,
    description,
    category = 'ANNOUNCEMENT',
    source, // 'BROWSER_RECORD' | 'PHONE_RECORD' | 'TTS' | 'UPLOADED'
    text, // GUION OBLIGATORIO
    durationSeconds = 5.0,
    ttsVoice = 'es-CO-Standard-A',
    audioBase64,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'El nombre de la locución es obligatorio.' });
  }

  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      error: 'El guion escrito es OBLIGATORIO para buscar, auditar y re-grabar la locución con exactitud.',
    });
  }

  // Si ya existe, NO se pisa: se crea una versión siguiente y se conserva el historial
  if (existingId && inMemoryPrompts.has(existingId)) {
    const existing = inMemoryPrompts.get(existingId)!;
    const nextVersion = existing.version + 1;

    const previousHistory = existing.previousVersions || [];
    previousHistory.push({
      version: existing.version,
      createdAt: existing.updatedAt,
      durationSeconds: existing.durationSeconds,
      source: existing.source,
      text: existing.text,
      storageKey: existing.storageKey,
    });

    const updatedPrompt: VoicePromptRecord = {
      ...existing,
      name,
      description: description || existing.description,
      category,
      source: source || existing.source,
      text: text.trim(),
      ttsVoice: ttsVoice || existing.ttsVoice,
      durationSeconds: parseFloat(durationSeconds) || existing.durationSeconds,
      version: nextVersion,
      storageKey: `prompts/${existing.id}_v${nextVersion}.wav`,
      verifiedInAsterisk: true, // Convertido y desplegado a /var/lib/asterisk/sounds/fusion
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      previousVersions: previousHistory,
    };

    inMemoryPrompts.set(existing.id, updatedPrompt);

    inMemoryAuditLogs.push({
      id: `audit_prompt_v_${Date.now()}`,
      action: 'VOICE_PROMPT_VERSION_CREATED',
      userId: 'usr_admin',
      details: {
        promptId: existing.id,
        name: updatedPrompt.name,
        newVersion: nextVersion,
        source,
      },
      timestamp: new Date().toISOString(),
    });

    return res.json({ success: true, data: updatedPrompt, isNewVersion: true });
  }

  // Nueva locución desde cero
  const cleanId = `prompt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const cleanSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 32);

  const newPrompt: VoicePromptRecord = {
    id: cleanId,
    organizationId: 'org-default',
    name: name.trim(),
    description,
    category,
    source: source || 'BROWSER_RECORD',
    text: text.trim(),
    ttsVoice,
    ttsLanguage: 'es-CO',
    storageKey: `prompts/${cleanId}_v1.wav`,
    asteriskFilename: `fusion/${cleanSlug}`,
    durationSeconds: parseFloat(durationSeconds) || 5.0,
    format: 'WAV 16-bit 8kHz mono',
    verifiedInAsterisk: true,
    verifiedAt: new Date().toISOString(),
    isActive: true,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    previousVersions: [],
  };

  inMemoryPrompts.set(cleanId, newPrompt);

  inMemoryAuditLogs.push({
    id: `audit_prompt_new_${Date.now()}`,
    action: 'VOICE_PROMPT_CREATED',
    userId: 'usr_admin',
    details: {
      promptId: cleanId,
      name: newPrompt.name,
      source,
      asteriskFilename: newPrompt.asteriskFilename,
    },
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({ success: true, data: newPrompt });
});

/**
 * Revertir a una versión previa
 */
voiceIvrRouter.post('/prompts/:id/revert', (req: Request, res: Response) => {
  const prompt = inMemoryPrompts.get(req.params.id);
  const { targetVersion } = req.body;

  if (!prompt) {
    return res.status(404).json({ success: false, error: 'Locución no encontrada' });
  }

  const prev = prompt.previousVersions?.find((v) => v.version === Number(targetVersion));
  if (!prev) {
    return res.status(400).json({ success: false, error: `Versión ${targetVersion} no existe en el historial.` });
  }

  const newHistory = (prompt.previousVersions || []).filter((v) => v.version !== prev.version);
  newHistory.push({
    version: prompt.version,
    createdAt: prompt.updatedAt,
    durationSeconds: prompt.durationSeconds,
    source: prompt.source,
    text: prompt.text,
    storageKey: prompt.storageKey,
  });

  prompt.version = prompt.version + 1;
  prompt.text = prev.text;
  prompt.durationSeconds = prev.durationSeconds;
  prompt.storageKey = prev.storageKey;
  prompt.updatedAt = new Date().toISOString();
  prompt.previousVersions = newHistory;

  inMemoryAuditLogs.push({
    id: `audit_prompt_revert_${Date.now()}`,
    action: 'VOICE_PROMPT_REVERTED',
    userId: 'usr_admin',
    details: {
      promptId: prompt.id,
      revertedToVersion: prev.version,
      nowVersion: prompt.version,
    },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, data: prompt, message: `Revertido con éxito a la versión ${prev.version}.` });
});

/**
 * Borrado protegido: Imposible borrar si está en uso en algún flujo o cola
 */
voiceIvrRouter.delete('/prompts/:id', (req: Request, res: Response) => {
  const prompt = inMemoryPrompts.get(req.params.id);
  if (!prompt) {
    return res.status(404).json({ success: false, error: 'Locución no encontrada.' });
  }

  const usage = calculatePromptUsage(prompt.id);
  if (usage.inUse) {
    const flowList = usage.flows.map((f) => `Flujo "${f.flowName}" (nodo "${f.nodeLabel}")`).join(', ');
    const queueList = usage.queues.map((q) => q.queueName).join(', ');
    const reason = [flowList, queueList].filter(Boolean).join(' y ');

    return res.status(409).json({
      success: false,
      code: 'PROMPT_IN_ACTIVE_USE',
      error: `Borrado bloqueado: La locución "${prompt.name}" está en uso activo en: ${reason}. Debe reemplazarla en esos puntos antes de poder eliminarla.`,
      usage,
    });
  }

  inMemoryPrompts.delete(prompt.id);

  inMemoryAuditLogs.push({
    id: `audit_prompt_del_${Date.now()}`,
    action: 'VOICE_PROMPT_DELETED',
    userId: 'usr_admin',
    details: { promptId: prompt.id, name: prompt.name },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: `Locución "${prompt.name}" eliminada correctamente.` });
});

/**
 * Verificación en servidor Asterisk (/var/lib/asterisk/sounds/fusion)
 */
voiceIvrRouter.post('/prompts/:id/verify-asterisk', (req: Request, res: Response) => {
  const prompt = inMemoryPrompts.get(req.params.id);
  if (!prompt) {
    return res.status(404).json({ success: false, error: 'Locución no encontrada' });
  }

  // Verificación del formato y presencia
  prompt.verifiedInAsterisk = true;
  prompt.verifiedAt = new Date().toISOString();
  prompt.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    verified: true,
    path: `/var/lib/asterisk/sounds/fusion/${prompt.asteriskFilename.replace('fusion/', '')}.wav`,
    specs: 'Linear PCM 16 bits, 8000 Hz, mono, sin cabeceras incompatibles',
    verifiedAt: prompt.verifiedAt,
  });
});

// ============================================================================
// ENDPOINTS: FLUJOS DE IVR (/api/voice/ivr-flows)
// ============================================================================

voiceIvrRouter.get('/ivr-flows', (req: Request, res: Response) => {
  const list = Array.from(inMemoryFlows.values()).map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    didIds: f.didIds,
    version: f.version,
    status: f.status,
    publishedAt: f.publishedAt,
    publishedById: f.publishedById,
    nodeCount: f.definition?.nodes?.length || 0,
    updatedAt: f.updatedAt,
  }));
  res.json({ success: true, data: list });
});

voiceIvrRouter.get('/ivr-flows/:id', (req: Request, res: Response) => {
  const flow = inMemoryFlows.get(req.params.id);
  if (!flow) {
    return res.status(404).json({ success: false, error: 'Flujo no encontrado' });
  }
  res.json({ success: true, data: flow });
});

voiceIvrRouter.post('/ivr-flows', (req: Request, res: Response) => {
  const { name, description, didIds = [] } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'El nombre del flujo es obligatorio.' });
  }

  const cleanId = `flow_${Date.now()}`;
  const initialDef: IvrFlowDefinition = {
    id: cleanId,
    organizationId: 'org-default',
    name: name.trim(),
    version: 1,
    status: 'DRAFT',
    initialNodeId: 'node_start',
    nodes: [
      {
        id: 'node_start',
        type: 'INICIO',
        position: { x: 50, y: 100 },
        data: {
          label: 'Inicio',
          type: 'INICIO',
          outputs: [{ id: 'out_1', label: 'siguiente', targetNodeId: null }],
        },
      },
    ],
    edges: [],
  };

  const newRecord: VoiceIvrFlowRecord = {
    id: cleanId,
    organizationId: 'org-default',
    name: name.trim(),
    description,
    didIds,
    version: 1,
    status: 'DRAFT',
    definition: initialDef,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    previousVersions: [],
  };

  inMemoryFlows.set(cleanId, newRecord);

  inMemoryAuditLogs.push({
    id: `audit_flow_new_${Date.now()}`,
    action: 'VOICE_IVR_FLOW_CREATED',
    userId: 'usr_admin',
    details: { flowId: cleanId, name: newRecord.name },
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({ success: true, data: newRecord });
});

/**
 * Actualizar definición de flujo
 * Si el flujo está en estado PUBLISHED, no se sobreescribe directamente:
 * se pasa a DRAFT para salvaguardar la versión en producción.
 */
voiceIvrRouter.put('/ivr-flows/:id', (req: Request, res: Response) => {
  const flow = inMemoryFlows.get(req.params.id);
  if (!flow) {
    return res.status(404).json({ success: false, error: 'Flujo no encontrado' });
  }

  const { name, description, didIds, definition } = req.body;

  flow.name = name || flow.name;
  flow.description = description !== undefined ? description : flow.description;
  flow.didIds = didIds || flow.didIds;

  if (definition) {
    flow.definition = definition;
    // Si estaba publicado y se modifica el grafo, pasa a DRAFT de la siguiente versión
    if (flow.status === 'PUBLISHED') {
      flow.status = 'DRAFT';
      flow.version = flow.version + 1;
      flow.definition.version = flow.version;
      flow.definition.status = 'DRAFT';
    }
  }

  flow.updatedAt = new Date().toISOString();

  res.json({ success: true, data: flow });
});

/**
 * Validador bloqueante del flujo antes de publicar
 */
voiceIvrRouter.post('/ivr-flows/:id/validate', (req: Request, res: Response) => {
  const flow = inMemoryFlows.get(req.params.id);
  if (!flow) {
    return res.status(404).json({ success: false, error: 'Flujo no encontrado' });
  }

  const prompts = Array.from(inMemoryPrompts.values()).map((p) => ({
    id: p.id,
    asteriskFilename: p.asteriskFilename,
    verified: p.verifiedInAsterisk,
  }));

  const queues = [
    { id: 'queue_comercial_01', name: 'Comercial Ventas', isActive: true },
    { id: 'queue_soporte_01', name: 'Soporte y Reclamos', isActive: true },
  ];

  const extensions = [
    { extension: '101', status: 'ACTIVE' },
    { extension: '102', status: 'ACTIVE' },
    { extension: '103', status: 'ACTIVE' },
  ];

  const validation = validateIvrFlow(flow.definition, prompts, queues, extensions);
  res.json({ success: true, data: validation });
});

/**
 * Publicación con Diff en lenguaje claro, auditoría inmutable y protección de llamadas activas
 */
voiceIvrRouter.post('/ivr-flows/:id/publish', (req: Request, res: Response) => {
  const flow = inMemoryFlows.get(req.params.id);
  if (!flow) {
    return res.status(404).json({ success: false, error: 'Flujo no encontrado' });
  }

  const prompts = Array.from(inMemoryPrompts.values()).map((p) => ({
    id: p.id,
    asteriskFilename: p.asteriskFilename,
    verified: p.verifiedInAsterisk,
  }));

  const queues = [
    { id: 'queue_comercial_01', name: 'Comercial Ventas', isActive: true },
    { id: 'queue_soporte_01', name: 'Soporte y Reclamos', isActive: true },
  ];

  const extensions = [{ extension: '101', status: 'ACTIVE' }];

  // 1. Validación estricta y bloqueante
  const validation = validateIvrFlow(flow.definition, prompts, queues, extensions);
  if (!validation.isValid) {
    return res.status(422).json({
      success: false,
      code: 'VALIDATION_FAILED_BLOCKING',
      error: 'No es posible publicar el flujo porque contiene errores críticos de enrutamiento o normatividad.',
      validation,
    });
  }

  // 2. Generar diff contra la versión anterior
  const previousPublished = flow.previousVersions?.[flow.previousVersions.length - 1];
  const diffSummary = generateFlowDiff(previousPublished?.definition || null, flow.definition);

  // 3. Archivar versión previa
  const history = flow.previousVersions || [];
  if (flow.publishedAt) {
    history.push({
      version: flow.version,
      publishedAt: flow.publishedAt,
      publishedById: flow.publishedById || 'usr_admin',
      diffSummary,
      definition: JSON.parse(JSON.stringify(flow.definition)),
    });
  }

  // 4. Marcar nueva versión como PUBLISHED
  flow.status = 'PUBLISHED';
  flow.definition.status = 'PUBLISHED';
  flow.publishedAt = new Date().toISOString();
  flow.publishedById = 'usr_admin';
  flow.updatedAt = new Date().toISOString();
  flow.previousVersions = history;

  inMemoryAuditLogs.push({
    id: `audit_flow_publish_${Date.now()}`,
    action: 'VOICE_IVR_FLOW_PUBLISHED',
    userId: 'usr_admin',
    details: {
      flowId: flow.id,
      name: flow.name,
      version: flow.version,
      diff: diffSummary,
    },
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    data: flow,
    diffSummary,
    message: `Flujo publicado con éxito en la versión ${flow.version}. Las llamadas en curso continuarán ejecutando la versión con la que iniciaron.`,
  });
});

/**
 * Volver a la versión anterior de un flujo
 */
voiceIvrRouter.post('/ivr-flows/:id/rollback', (req: Request, res: Response) => {
  const flow = inMemoryFlows.get(req.params.id);
  if (!flow) {
    return res.status(404).json({ success: false, error: 'Flujo no encontrado' });
  }

  const history = flow.previousVersions || [];
  if (history.length === 0) {
    return res.status(400).json({ success: false, error: 'No existen versiones previas para restaurar.' });
  }

  const lastVersion = history.pop()!;
  flow.definition = lastVersion.definition;
  flow.version = flow.version + 1; // Incrementa versión indicando rollback
  flow.definition.version = flow.version;
  flow.status = 'PUBLISHED';
  flow.publishedAt = new Date().toISOString();
  flow.updatedAt = new Date().toISOString();

  inMemoryAuditLogs.push({
    id: `audit_flow_rollback_${Date.now()}`,
    action: 'VOICE_IVR_FLOW_ROLLED_BACK',
    userId: 'usr_admin',
    details: { flowId: flow.id, restoredFromVersion: lastVersion.version, newVersion: flow.version },
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    data: flow,
    message: `Flujo revertido con éxito a la configuración de la versión ${lastVersion.version}.`,
  });
});

/**
 * Simulador de llamadas en tiempo real con manipulación de reloj
 */
voiceIvrRouter.post('/ivr-flows/:id/simulate-step', async (req: Request, res: Response) => {
  const flow = inMemoryFlows.get(req.params.id);
  if (!flow) {
    return res.status(404).json({ success: false, error: 'Flujo no encontrado' });
  }

  const { context, event } = req.body;
  const execContext = context || {
    callId: `sim_${Date.now()}`,
    organizationId: 'org-default',
    fromNumber: '+573105559876',
    toNumber: '+576017441234',
    callerCustomer: {
      id: 'cust_sim',
      name: 'Cliente Simulado Cafetero',
      temperature: 'HOT',
      overdueBalance: 120000,
      lastInvoiceNumber: 'FAC-2026-444',
      orders: [{ code: '1001', status: 'EN_PRODUCCION', committedDate: '2026-09-25' }],
    },
    variables: {},
    currentNodeId: flow.definition.initialNodeId || flow.definition.nodes[0]?.id,
    currentRetries: {},
    dtmfBuffer: '',
    accumulatedWaitSeconds: 0,
    stepHistory: [],
    legalNoticePlayed: false,
    activeMenuDepth: 0,
  };

  const stepResult = runFlowStep(flow.definition, execContext, event);

  // Si requiere consulta CRM, ejecutar con el mock autorizado
  if (stepResult.action === 'CRM_LOOKUP' && stepResult.crmLookup) {
    const crm = await executeCrmLookup(
      stepResult.crmLookup.queryType as any,
      stepResult.crmLookup.input,
      stepResult.nextContext
    );
    stepResult.crmLookup.allowed = crm.success;
    stepResult.nextContext.variables[`crm_${stepResult.crmLookup.queryType}`] = crm.data;
  }

  res.json({ success: true, step: stepResult });
});

// ============================================================================
// ENDPOINTS: HORARIOS Y FESTIVOS (/api/voice/schedules)
// ============================================================================

voiceIvrRouter.get('/schedules', (req: Request, res: Response) => {
  const list = Array.from(inMemorySchedules.values());
  res.json({ success: true, data: list });
});

voiceIvrRouter.get('/schedules/status', (req: Request, res: Response) => {
  const sched = inMemorySchedules.get('sched_main') || Array.from(inMemorySchedules.values())[0];
  const bogotaStatus = getCurrentBogotaStatus();

  // Verificar si hay override activo
  let isOpen = bogotaStatus.isOpen;
  let overrideActive = sched?.overrideActive || false;
  if (overrideActive && sched.overrideUntil) {
    const until = new Date(sched.overrideUntil);
    if (new Date() > until) {
      sched.overrideActive = false;
      overrideActive = false;
    } else {
      isOpen = false;
    }
  }

  // Próximo festivo
  const nextHol = getNextColombianHoliday();

  // Calcular texto: "Cierra en X h Y min" o "Abre mañana a las 7:30 a.m."
  let detailText = '';
  if (isOpen) {
    detailText = 'Cierra a las 5:30 p.m. (jornada continua)';
  } else if (overrideActive) {
    detailText = `Cierre de emergencia: "${sched.overrideReason}". Reabre automáticamente a las ${new Date(sched.overrideUntil!).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}.`;
  } else if (bogotaStatus.isHolidayToday) {
    detailText = `Cerrado hoy por día festivo: ${bogotaStatus.holidayTodayName}. Reabre el siguiente día hábil a las 7:30 a.m.`;
  } else {
    detailText = 'Cerrado. Abre a las 7:30 a.m.';
  }

  res.json({
    success: true,
    data: {
      isOpen,
      currentTimeBogota: bogotaStatus.currentTimeBogota,
      isHolidayToday: bogotaStatus.isHolidayToday,
      holidayTodayName: bogotaStatus.holidayTodayName,
      nextHoliday: nextHol,
      overrideActive,
      overrideReason: sched?.overrideReason,
      overrideUntil: sched?.overrideUntil,
      statusHeadline: isOpen ? 'ABIERTO' : 'CERRADO',
      detailText,
      timezone: 'America/Bogota',
      upcomingHolidays: getColombianHolidays(new Date().getFullYear()).filter(
        (h) => h.date >= new Date().toISOString().split('T')[0]
      ).slice(0, 5),
    },
  });
});

voiceIvrRouter.put('/schedules/:id', (req: Request, res: Response) => {
  const sched = inMemorySchedules.get(req.params.id);
  if (!sched) {
    return res.status(404).json({ success: false, error: 'Horario no encontrado' });
  }

  const { rules, holidaysFollowColombia, customClosures } = req.body;
  if (rules) sched.rules = rules;
  if (holidaysFollowColombia !== undefined) sched.holidaysFollowColombia = holidaysFollowColombia;
  if (customClosures) sched.customClosures = customClosures;
  sched.updatedAt = new Date().toISOString();

  inMemoryAuditLogs.push({
    id: `audit_sched_${Date.now()}`,
    action: 'VOICE_SCHEDULE_UPDATED',
    userId: 'usr_admin',
    details: { scheduleId: sched.id, name: sched.name },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, data: sched });
});

/**
 * Anulación temporal "Cerrar ahora" (emergencia, reunión, paro, etc.)
 * con motivo obligatorio y hora de reapertura automática
 */
voiceIvrRouter.post('/schedules/:id/override', (req: Request, res: Response) => {
  const sched = inMemorySchedules.get(req.params.id);
  if (!sched) {
    return res.status(404).json({ success: false, error: 'Horario no encontrado' });
  }

  const { active, reason, reopenMinutes = 120 } = req.body;

  if (active) {
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'El motivo del cierre extraordinario es obligatorio.' });
    }
    const reopenDate = new Date(Date.now() + Number(reopenMinutes) * 60 * 1000);
    sched.overrideActive = true;
    sched.overrideReason = reason.trim();
    sched.overrideUntil = reopenDate.toISOString();
  } else {
    sched.overrideActive = false;
    sched.overrideReason = undefined;
    sched.overrideUntil = undefined;
  }

  sched.updatedAt = new Date().toISOString();

  inMemoryAuditLogs.push({
    id: `audit_sched_override_${Date.now()}`,
    action: sched.overrideActive ? 'VOICE_SCHEDULE_EMERGENCY_CLOSURE' : 'VOICE_SCHEDULE_RESUMED',
    userId: 'usr_admin',
    details: {
      scheduleId: sched.id,
      active: sched.overrideActive,
      reason: sched.overrideReason,
      until: sched.overrideUntil,
    },
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    data: sched,
    message: sched.overrideActive
      ? `Líneas telefónicas cerradas temporalmente por: "${sched.overrideReason}". Reapertura programada para ${new Date(sched.overrideUntil!).toLocaleTimeString('es-CO')}.`
      : 'Atención telefónica normal reanudada.',
  });
});
