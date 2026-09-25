import { z } from 'zod';
import { defineSetting } from './types';
import { SettingDomain, SettingValueType, SettingDangerLevel } from '@prisma/client';



export const securitySettings = {
  'security.password.minLength': defineSetting({
    key: 'security.password.minLength',
    domain: "SECURITY",
    label: 'Longitud mínima de contraseña',
    description: 'Número mínimo de caracteres requeridos para una contraseña válida.',
    valueType: "NUMBER",
    schema: z.number().int().min(8).max(128),
    defaultValue: 12,
    group: 'Contraseñas'
  }),
  'security.password.requireSymbols': defineSetting({
    key: 'security.password.requireSymbols',
    domain: "SECURITY",
    label: 'Requerir símbolos',
    description: 'Exigir al menos un símbolo especial en la contraseña.',
    valueType: "BOOLEAN",
    schema: z.boolean(),
    defaultValue: true,
    group: 'Contraseñas'
  }),
  'security.password.expiryDays': defineSetting({
    key: 'security.password.expiryDays',
    domain: "SECURITY",
    label: 'Expiración de contraseña (Días)',
    description: 'Días hasta que se obligue a cambiar la contraseña (0 = nunca expira).',
    valueType: "NUMBER",
    schema: z.number().int().min(0).max(365),
    defaultValue: 90,
    group: 'Contraseñas'
  }),
  'security.session.idleTimeoutMinutes': defineSetting({
    key: 'security.session.idleTimeoutMinutes',
    domain: "SECURITY",
    label: 'Cierre por inactividad (Minutos)',
    description: 'Minutos de inactividad antes de cerrar la sesión automáticamente.',
    valueType: "NUMBER",
    schema: z.number().int().min(5).max(1440),
    defaultValue: 30,
    group: 'Sesiones'
  }),
  'security.mfa.requiredForRoles': defineSetting({
    key: 'security.mfa.requiredForRoles',
    domain: "SECURITY",
    label: 'MFA Obligatorio para Roles',
    description: 'Roles del sistema que deben usar autenticación de dos factores (separados por coma).',
    valueType: "STRING",
    schema: z.string(),
    defaultValue: 'admin',
    group: 'Autenticación'
  }),
  'security.ipAllowlist.enabled': defineSetting({
    key: 'security.ipAllowlist.enabled',
    domain: "SECURITY",
    label: 'Habilitar lista blanca de IPs',
    description: 'Restringir el acceso solo a direcciones IP específicas.',
    valueType: "BOOLEAN",
    schema: z.boolean(),
    defaultValue: false,
    dangerLevel: "DANGEROUS",
    helpText: 'Si configuras mal esto, nadie podrá entrar al sistema.',
    group: 'Red'
  }),
  'security.ipAllowlist.ranges': defineSetting({
    key: 'security.ipAllowlist.ranges',
    domain: "SECURITY",
    label: 'Rangos de IP permitidos',
    description: 'Lista de direcciones o rangos CIDR separados por coma.',
    valueType: "STRING",
    schema: z.string(),
    defaultValue: '',
    dangerLevel: "CAUTION",
    group: 'Red'
  })
} as const;
