/**
 * Plantillas Predefinidas de Anuncios — Tablero de Dirección (Etapa 15.4)
 */

import { AnnouncementPriority, AnnouncementType } from './types';

export interface AnnouncementTemplate {
  id: string;
  name: string;
  description: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  requiresAcknowledgement: boolean;
  defaultTitle: string;
  defaultBody: string;
}

export const ANNOUNCEMENT_TEMPLATES: AnnouncementTemplate[] = [
  {
    id: 'directiva_direccion',
    name: 'Directiva de Dirección General',
    description: 'Instrucción oficial de obligatorio cumplimiento para todas o ciertas áreas.',
    type: 'DIRECTIVE',
    priority: 'IMPORTANT',
    requiresAcknowledgement: true,
    defaultTitle: 'Directiva General: ',
    defaultBody: `## Propósito y Alcance
La Dirección General establece los siguientes lineamientos obligatorios aplicables a partir de la fecha de publicación.

### 1. Instrucciones Operativas
- **Disposición 1:** Describir la medida o requerimiento principal.
- **Disposición 2:** Procedimiento a seguir en caso de desviaciones o consultas.

### 2. Fechas de Implementación
- Fecha de inicio: **Inmediata**
- Fecha límite de adecuación: **Viernes de la presente semana**

> **Importante:** Esta directiva requiere confirmación individual de lectura. Favor revisar los anexos adjuntos y pulsar **"Entendido / Confirmar Lectura"**.`,
  },
  {
    id: 'alerta_seguridad_mantenimiento',
    name: 'Alerta Urgente de Planta / Seguridad',
    description: 'Aviso crítico de seguridad industrial, mantenimiento o contingencia.',
    type: 'ALERT',
    priority: 'URGENT',
    requiresAcknowledgement: true,
    defaultTitle: 'Alerta Operativa: Mantenimiento Preventivo y Medidas de Seguridad',
    defaultBody: `## ¡Aviso de Seguridad Operativa!

Se informa a todo el personal de planta y producción sobre la siguiente situación crítica:

### Área / Máquina Afectada:
- **Línea / Equipo:** Mesa de Corte Láser y Router CNC
- **Horario programado:** De 06:00 a 10:00 AM

### Protocolo de Seguridad Requerido:
1. Prohibido el ingreso a la zona demarcada sin equipo de protección visual y auditiva.
2. Todo operario asignado debe verificar el cierre de válvulas de extracción.
3. Reportar cualquier anomalía de inmediato al jefe de turno.

*Favor confirmar la recepción de este aviso.*`,
  },
  {
    id: 'reconocimiento_corporativo',
    name: 'Reconocimiento y Felicitaciones',
    description: 'Destacar logros sobresalientes, aniversarios o hitos comerciales y operativos.',
    type: 'RECOGNITION',
    priority: 'NORMAL',
    requiresAcknowledgement: false,
    defaultTitle: '¡Felicitaciones al Equipo por su Desempeño Extraordinario!',
    defaultBody: `## Reconocimiento Especial del Mes 🌟

Queremos felicitar y agradecer a todo el equipo por su dedicación, compromiso y excelencia:

### Logro Destacado:
- **Proyecto / Hito:** Cierre exitoso y entrega a tiempo de la campaña nacional de señalética.
- **Valores reflejados:** *Calidad, Trabajo en Equipo y Cumplimiento*.

> *"El éxito de nuestra empresa se construye con la dedicación de cada uno de ustedes en planta y en oficinas."*

¡Te invitamos a dejar tus felicitaciones y reacciones en los comentarios abajo!`,
  },
  {
    id: 'politica_procedimiento',
    name: 'Actualización de Políticas Internas',
    description: 'Nuevos manuales, políticas de calidad, habeas data o bienestar.',
    type: 'POLICY',
    priority: 'IMPORTANT',
    requiresAcknowledgement: true,
    defaultTitle: 'Actualización de Política: ',
    defaultBody: `## Nueva Versión de Política Corporativa

Se pone a disposición de todos los colaboradores la actualización del documento normativo.

### Principales Cambios:
- **Sección 1:** Ajuste en los tiempos de respuesta para cotizaciones y pedidos especiales.
- **Sección 2:** Registro obligatorio de horas hombre en órdenes de producción.

### Documentación de Referencia:
Por favor revisar el archivo PDF adjunto a este comunicado. Al finalizar, pulsar el botón de confirmación de lectura para registrar el acuse formal.`,
  },
  {
    id: 'comunicado_general',
    name: 'Comunicado General',
    description: 'Noticias, eventos corporativos o recordatorios para la organización.',
    type: 'ANNOUNCEMENT',
    priority: 'NORMAL',
    requiresAcknowledgement: false,
    defaultTitle: 'Comunicado: ',
    defaultBody: `Estimado equipo,

Nos complace compartir con ustedes las siguientes novedades para la semana:

- **Actividad:** 
- **Lugar / Modalidad:** 
- **Recomendaciones:** 

Cualquier inquietud, no duden en contactar a la gerencia de área.`,
  },
];
