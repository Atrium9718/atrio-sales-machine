
import { z } from 'zod';
import { defineSetting } from './types';
import { SettingDomain, SettingValueType, SettingDangerLevel } from '@prisma/client';



export const organizationSettings = {
  'organization.branding.logoUrl': defineSetting({
    key: 'organization.branding.logoUrl',
    domain: "ORGANIZATION",
    label: 'Logo Principal',
    description: 'URL o base64 del logo principal de la empresa.',
    valueType: "STRING",
    schema: z.string().optional(),
    defaultValue: '',
    group: 'Apariencia'
  }),
  'organization.branding.logoSecondaryUrl': defineSetting({
    key: 'organization.branding.logoSecondaryUrl',
    domain: "ORGANIZATION",
    label: 'Logo Secundario',
    description: 'URL o base64 del logo secundario (oscuro/invertido).',
    valueType: "STRING",
    schema: z.string().optional(),
    defaultValue: '',
    group: 'Apariencia'
  }),
  'organization.branding.primaryColor': defineSetting({
    key: 'organization.branding.primaryColor',
    domain: "ORGANIZATION",
    label: 'Color Principal',
    description: 'Color principal de la marca en formato Hex.',
    valueType: "COLOR",
    schema: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    defaultValue: '#000000',
    group: 'Apariencia'
  }),
  'organization.business.name': defineSetting({
    key: 'organization.business.name',
    domain: "ORGANIZATION",
    label: 'Razón Social / Nombre Comercial',
    description: 'Nombre legal y comercial de la empresa.',
    valueType: "STRING",
    schema: z.string(),
    defaultValue: 'Fusión Comunicación Gráfica S.A.S.',
    group: 'Empresa'
  }),
  'organization.business.nit': defineSetting({
    key: 'organization.business.nit',
    domain: "ORGANIZATION",
    label: 'NIT / Identificación',
    description: 'Número de Identificación Tributaria con Dígito de Verificación.',
    valueType: "STRING",
    schema: z.string(),
    defaultValue: '900.284.195-1',
    group: 'Empresa'
  }),
  'organization.business.address': defineSetting({
    key: 'organization.business.address',
    domain: "ORGANIZATION",
    label: 'Dirección Principal',
    description: 'Dirección fiscal y comercial.',
    valueType: "STRING",
    schema: z.string().optional(),
    defaultValue: 'Medellín, Colombia',
    group: 'Empresa'
  }),
  'organization.business.phone': defineSetting({
    key: 'organization.business.phone',
    domain: "ORGANIZATION",
    label: 'Teléfono de Contacto',
    description: 'Línea de atención y ventas.',
    valueType: "STRING",
    schema: z.string().optional(),
    defaultValue: '+57 (4) 444-0000',
    group: 'Empresa'
  }),
  'organization.business.email': defineSetting({
    key: 'organization.business.email',
    domain: "ORGANIZATION",
    label: 'Email Corporativo',
    description: 'Correo electrónico de contacto.',
    valueType: "STRING",
    schema: z.string().optional(),
    defaultValue: 'contacto@fusion.com.co',
    group: 'Empresa'
  }),
  'organization.legal.terms': defineSetting({
    key: 'organization.legal.terms',
    domain: "ORGANIZATION",
    label: 'Términos y Condiciones',
    description: 'Términos comerciales estándar añadidos a las cotizaciones.',
    valueType: "STRING",
    schema: z.string(),
    defaultValue: 'Validez de la oferta: 15 días calendario. Forma de pago: 50% anticipo, 50% contra entrega.',
    group: 'Legales'
  }),
  'organization.bankDetails': defineSetting({
    key: 'organization.bankDetails',
    domain: "ORGANIZATION",
    label: 'Datos Bancarios',
    description: 'Información de cuentas para pago mostrada en cotizaciones y facturas.',
    valueType: "STRING",
    schema: z.string(),
    defaultValue: 'Bancolombia Cuenta de Ahorros N° 123-456789-01 a nombre de Fusión Comunicación Gráfica S.A.S.',
    group: 'Financiero'
  })
} as const;
