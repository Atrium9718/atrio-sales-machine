# Catálogo de Configuración del Sistema

Este archivo es generado automáticamente desde el catálogo tipado de código. No modificar a mano.

## Dominio: COMMERCIAL

### Umbral de cliente caliente (`commercial.temperature.hotThreshold`)
- **Descripción**: Puntaje desde el cual un cliente se considera caliente.
- **Tipo**: NUMBER
- **Valor por Defecto**: `70`
- **Nivel de Peligro**: CAUTION
- **Permiso Requerido**: `settings:update`

### Asignación automática (Triage) (`commercial.triage.autoAssign`)
- **Descripción**: Asignar automáticamente nuevos prospectos usando round robin.
- **Tipo**: BOOLEAN
- **Valor por Defecto**: `true`
- **Nivel de Peligro**: SAFE
- **Permiso Requerido**: `settings:update`

## Dominio: AI

### Modelo de IA Principal (`ai.gemini.model`)
- **Descripción**: El modelo de Gemini a usar para operaciones generales.
- **Tipo**: ENUM
- **Valor por Defecto**: `"gemini-1.5-flash"`
- **Nivel de Peligro**: CAUTION
- **Permiso Requerido**: `settings:update`

### Triage Automático con IA (`ai.triage.enabled`)
- **Descripción**: Activar el análisis de intención y perfilamiento de leads.
- **Tipo**: BOOLEAN
- **Valor por Defecto**: `true`
- **Nivel de Peligro**: SAFE
- **Permiso Requerido**: `settings:update`

## Dominio: ORGANIZATION

### Color Principal (`organization.branding.primaryColor`)
- **Descripción**: Color principal de la marca en formato Hex.
- **Tipo**: COLOR
- **Valor por Defecto**: `"#000000"`
- **Nivel de Peligro**: SAFE
- **Permiso Requerido**: `settings:update`

### Zona Horaria Base (`organization.businessHours.timezone`)
- **Descripción**: Zona horaria por defecto de la organización.
- **Tipo**: STRING
- **Valor por Defecto**: `"America/Bogota"`
- **Nivel de Peligro**: SAFE
- **Permiso Requerido**: `settings:update`

