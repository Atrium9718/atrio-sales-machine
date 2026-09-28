
import { z } from 'zod';
import { defineSetting } from './types';
import { SettingDomain, SettingValueType, SettingDangerLevel } from '@prisma/client';



export const quotingSettings = {
  'quoting.validityDays': defineSetting({
    key: 'quoting.validityDays',
    domain: "COMMERCIAL",
    label: 'Vigencia de cotización (Días)',
    description: 'Días por defecto de validez de una cotización nueva.',
    valueType: "NUMBER",
    schema: z.number().int().min(1).max(180),
    defaultValue: 15,
    group: 'Condiciones'
  }),
  'quoting.margin.own': defineSetting({
    key: 'quoting.margin.own',
    domain: "COMMERCIAL",
    label: 'Margen base (Propio)',
    description: 'Margen de rentabilidad esperado para productos de producción propia (%).',
    valueType: "NUMBER",
    schema: z.number().min(0).max(100),
    defaultValue: 30,
    group: 'Márgenes'
  }),
  'quoting.margin.outsourced': defineSetting({
    key: 'quoting.margin.outsourced',
    domain: "COMMERCIAL",
    label: 'Margen base (Tercerizado)',
    description: 'Margen de rentabilidad esperado para productos tercerizados (%).',
    valueType: "NUMBER",
    schema: z.number().min(0).max(100),
    defaultValue: 20,
    group: 'Márgenes'
  }),
  'quoting.margin.agency': defineSetting({
    key: 'quoting.margin.agency',
    domain: "COMMERCIAL",
    label: 'Margen base (Agencia)',
    description: 'Margen de rentabilidad esperado para servicios de agencia (%).',
    valueType: "NUMBER",
    schema: z.number().min(0).max(100),
    defaultValue: 40,
    group: 'Márgenes'
  }),
  'quoting.discount.maxJunior': defineSetting({
    key: 'quoting.discount.maxJunior',
    domain: "COMMERCIAL",
    label: 'Descuento Máx (Junior)',
    description: 'Descuento máximo que puede aplicar un comercial sin autorización (%).',
    valueType: "NUMBER",
    schema: z.number().min(0).max(100),
    defaultValue: 5,
    group: 'Descuentos'
  }),
  'quoting.discount.maxManager': defineSetting({
    key: 'quoting.discount.maxManager',
    domain: "COMMERCIAL",
    label: 'Descuento Máx (Gerente)',
    description: 'Descuento máximo que puede aplicar un gerente comercial (%).',
    valueType: "NUMBER",
    schema: z.number().min(0).max(100),
    defaultValue: 15,
    group: 'Descuentos'
  }),
  'quoting.taxes.iva': defineSetting({
    key: 'quoting.taxes.iva',
    domain: "COMMERCIAL",
    label: 'Tarifas IVA',
    description: 'JSON con las tarifas de IVA aplicables y sus fechas de vigencia.',
    valueType: "JSON",
    schema: z.any(),
    defaultValue: [{ rate: 19, activeFrom: '2020-01-01', activeTo: null }],
    group: 'Impuestos'
  }),
  'quoting.rounding.to': defineSetting({
    key: 'quoting.rounding.to',
    domain: "COMMERCIAL",
    label: 'Redondeo de precio a',
    description: 'Valor base para redondeo (ej. 50, 100, 1000).',
    valueType: "NUMBER",
    schema: z.number().min(1),
    defaultValue: 50,
    group: 'Redondeo'
  })
} as const;
