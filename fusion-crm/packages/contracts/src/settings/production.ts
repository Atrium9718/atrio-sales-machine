
import { z } from 'zod';
import { defineSetting } from './types';
import { SettingDomain, SettingValueType, SettingDangerLevel } from '@prisma/client';



export const productionSettings = {
  'production.surcharges.nightly': defineSetting({
    key: 'production.surcharges.nightly',
    domain: "PRODUCTION",
    label: 'Recargo Nocturno (%)',
    description: 'Porcentaje de recargo para trabajo nocturno.',
    valueType: "NUMBER",
    schema: z.number().min(0).max(100),
    defaultValue: 35,
    group: 'Nómina Extra'
  }),
  'production.surcharges.sunday': defineSetting({
    key: 'production.surcharges.sunday',
    domain: "PRODUCTION",
    label: 'Recargo Dominical (%)',
    description: 'Porcentaje de recargo para trabajo en domingos/festivos.',
    valueType: "NUMBER",
    schema: z.number().min(0).max(200),
    defaultValue: 75,
    group: 'Nómina Extra'
  }),
  'production.labor.hourlyRate': defineSetting({
    key: 'production.labor.hourlyRate',
    domain: "PRODUCTION",
    label: 'Costo de mano de obra por hora (COP)',
    description: 'Valor con el que se costea cada hora registrada con el cronómetro de producción.',
    valueType: "NUMBER",
    schema: z.number().min(0).max(1_000_000),
    defaultValue: 20000,
    group: 'Costos'
  }),
  'production.waste.standardPercent': defineSetting({
    key: 'production.waste.standardPercent',
    domain: "PRODUCTION",
    label: 'Desperdicio Base (%)',
    description: 'Porcentaje de desperdicio tolerado globalmente.',
    valueType: "NUMBER",
    schema: z.number().min(0).max(100),
    defaultValue: 5,
    group: 'Inventario'
  })
} as const;
