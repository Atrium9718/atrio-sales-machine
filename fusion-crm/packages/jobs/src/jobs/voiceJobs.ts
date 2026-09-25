/**
 * Trabajos Programados de Voz y Telefonía — Fusion ERP / CRM (Etapa 17.1)
 *
 * Declarados formalmente para el planificador de trabajos (sin cuerpo de ejecución Asterisk/ARI aún).
 */

import { ScheduledJobDefinition } from './collaborationJobs';

export interface VoiceJobDefinition extends ScheduledJobDefinition {
  type: 'cron' | 'event_queue' | 'interval';
}

export const VOICE_SCHEDULED_JOBS: Record<string, VoiceJobDefinition> = {
  'voice:health': {
    id: 'voice:health',
    name: 'Monitor de Salud de Troncales y Extensiones',
    schedule: '* * * * *', // cada minuto
    type: 'cron',
    description: 'Verifica el estado de registro SIP de la troncal y la presencia de extensiones activas',
    stage: '17.1',
    handler: async () => {
      // Stub: Implementado en Etapa 17.2 con cliente ARI / AMI
    },
  },
  'voice:orphan-calls': {
    id: 'voice:orphan-calls',
    name: 'Limpiador de Llamadas Huérfanas',
    schedule: '*/2 * * * *', // cada 2 minutos
    type: 'cron',
    description: 'Cierra llamadas VoiceCall en estado activo cuyo canal ya no existe en el motor de telefonía',
    stage: '17.1',
    handler: async () => {
      // Stub: Cierre preventivo de canales zombi
    },
  },
  'voice:transcribe': {
    id: 'voice:transcribe',
    name: 'Cola de Transcripción de Audio',
    schedule: 'queue:voz.grabacion_lista',
    type: 'event_queue',
    description: 'Consume grabaciones WAV pendientes y despacha la transcripción a STT / Gemini',
    stage: '17.1',
    handler: async () => {
      // Stub: Transcripción asíncrona de audio a texto
    },
  },
  'voice:summarize': {
    id: 'voice:summarize',
    name: 'Cola de Resumen y Compromisos IA',
    schedule: 'queue:voz.transcripcion_lista',
    type: 'event_queue',
    description: 'Genera el resumen ejecutivo de la llamada, análisis de sentimiento y compromisos automáticos con Gemini',
    stage: '17.1',
    handler: async () => {
      // Stub: Resumen y extracción semántica
    },
  },
  'voice:voicemail-reminder': {
    id: 'voice:voicemail-reminder',
    name: 'Recordatorio de Buzones de Voz Pendientes',
    schedule: '*/30 * * * *', // cada 30 minutos
    type: 'cron',
    description: 'Alerta a los asesores o supervisores sobre buzones de voz no devueltos tras umbrales de SLA',
    stage: '17.1',
    handler: async () => {
      // Stub: Emite evento voz.buzon_sin_devolver
    },
  },
  'voice:campaign-dialer': {
    id: 'voice:campaign-dialer',
    name: 'Marcador de Campañas Progresivas/Preview',
    schedule: 'interval:10s', // cada 10 segundos mientras haya campaña activa
    type: 'interval',
    description: 'Asigna contactos a agentes disponibles en campañas salientes activas respetando horario laboral',
    stage: '17.1',
    handler: async () => {
      // Stub: Marcador saliente supervisado
    },
  },
  'voice:retention': {
    id: 'voice:retention',
    name: 'Política de Retención y Depuración de Grabaciones',
    schedule: '45 3 * * *', // diario 3:45 AM
    type: 'cron',
    description: 'Aplica la retención legal de grabaciones y purga archivos de audio expirados en MinIO',
    stage: '17.1',
    handler: async () => {
      // Stub: Limpieza de grabaciones vencidas según política de datos
    },
  },
  'voice:metrics-rollup': {
    id: 'voice:metrics-rollup',
    name: 'Consolidación Diaria de Métricas de Telefonía',
    schedule: '50 3 * * *', // diario 3:50 AM
    type: 'cron',
    description: 'Consolida TMO, ASA, porcentaje de abandono, nivel de servicio (SLA) y costos en MetricDaily (Etapa 12)',
    stage: '17.1',
    handler: async () => {
      // Stub: Consolidación analítica de llamadas
    },
  },
  'voice:queue-watchdog': {
    id: 'voice:queue-watchdog',
    name: 'Vigilante de Colas Saturadas y SLA',
    schedule: '* * * * *', // cada minuto
    type: 'cron',
    description: 'Detecta colas con llamadas en espera sin agentes conectados o tiempos de espera fuera de norma',
    stage: '17.1',
    handler: async () => {
      // Stub: Emite voz.cola_saturada o voz.cola_sin_agentes
    },
  },
};
