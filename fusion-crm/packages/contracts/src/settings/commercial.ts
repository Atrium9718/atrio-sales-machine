
import { z } from 'zod';
import { defineSetting } from './types';
import { SettingDomain, SettingValueType, SettingDangerLevel } from '@prisma/client';



export const commercialSettings = {
  'commercial.temperature.warmThreshold': defineSetting({
    key: 'commercial.temperature.warmThreshold',
    domain: "COMMERCIAL",
    label: 'Umbral Tibio',
    description: 'Puntaje desde el cual un cliente pasa de frío a tibio.',
    valueType: "NUMBER",
    schema: z.number().int().min(0).max(100),
    defaultValue: 40,
    group: 'Temperatura'
  }),
  'commercial.temperature.hotThreshold': defineSetting({
    key: 'commercial.temperature.hotThreshold',
    domain: "COMMERCIAL",
    label: 'Umbral Caliente',
    description: 'Puntaje desde el cual un cliente se considera caliente.',
    valueType: "NUMBER",
    schema: z.number().int().min(0).max(100),
    defaultValue: 70,
    group: 'Temperatura'
  }),
  'commercial.temperature.penaltyPerInactiveDay': defineSetting({
    key: 'commercial.temperature.penaltyPerInactiveDay',
    domain: "COMMERCIAL",
    label: 'Penalización por Inactividad',
    description: 'Puntos restados por cada día sin contacto.',
    valueType: "NUMBER",
    schema: z.number().min(0),
    defaultValue: 2,
    group: 'Temperatura'
  }),
  'commercial.temperature.weight.meeting': defineSetting({
    key: 'commercial.temperature.weight.meeting',
    domain: "COMMERCIAL",
    label: 'Peso: Reunión',
    description: 'Puntos sumados por reunión realizada.',
    valueType: "NUMBER",
    schema: z.number().min(0),
    defaultValue: 30,
    group: 'Temperatura'
  }),
  'commercial.pipeline.quoteFollowupDays': defineSetting({
    key: 'commercial.pipeline.quoteFollowupDays',
    domain: "COMMERCIAL",
    label: 'Seguimiento de Cotización (Días)',
    description: 'Días tras los cuales se alerta para hacer seguimiento a una cotización.',
    valueType: "NUMBER",
    schema: z.number().min(1),
    defaultValue: 3,
    group: 'Pipeline'
  })
} as const;
