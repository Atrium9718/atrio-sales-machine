import { z } from 'zod';
import { defineSetting } from './types';
import { SettingDomain, SettingValueType, SettingDangerLevel } from '@prisma/client';



export const aiSettings = {
  'ai.gemini.model': defineSetting({
    key: 'ai.gemini.model',
    domain: "AI",
    label: 'Modelo de IA Principal',
    description: 'El modelo de Gemini a usar para operaciones generales.',
    valueType: "ENUM",
    schema: z.enum(['gemini-3.6-flash', 'gemini-3.6-pro']),
    defaultValue: 'gemini-3.6-flash',
    enumOptions: [
      { label: 'Gemini 1.5 Flash (Rápido)', value: 'gemini-3.6-flash' },
      { label: 'Gemini 1.5 Pro (Avanzado)', value: 'gemini-3.6-pro' }
    ],
    dangerLevel: "CAUTION",
    group: 'Modelos'
  }),
  'ai.triage.enabled': defineSetting({
    key: 'ai.triage.enabled',
    domain: "AI",
    label: 'Triage Automático con IA',
    description: 'Activar el análisis de intención y perfilamiento de leads.',
    valueType: "BOOLEAN",
    schema: z.boolean(),
    defaultValue: true,
    group: 'Triage'
  })
} as const;
