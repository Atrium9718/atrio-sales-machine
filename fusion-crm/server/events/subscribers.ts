import { eventBus } from './DomainEventBus';
import { setAgentState } from '../routes/voicePbx';
import { voiceDbAvailable } from '../services/voiceStore';
import { inMemoryPresences } from '../routes/chat';
import { startStageNotifications } from '../omnichannel/runtime';

let isSubscribed = false;

/**
 * Registra los suscriptores centrales del backend a los eventos del dominio.
 * Desacopla las dependencias directas entre módulos.
 */
export function registerDomainSubscribers() {
  if (isSubscribed) return;
  isSubscribed = true;

  console.log('[DomainEventBus] Registrando suscriptores de núcleo de la aplicación...');

  // 1. Reacción a DESACTIVACIÓN DE EMPLEADO (Soft-Delete)
  eventBus.subscribe('EMPLOYEE_DEACTIVATED', ({ employeeId, timestamp }) => {
    // A. Telefonía: queda desconectado y las colas dejan de timbrarle
    if (voiceDbAvailable()) {
      setAgentState(employeeId, 'OFFLINE', 'Colaborador inactivo').catch((err) => console.error('[Voz] No se pudo desconectar al asesor inactivo:', err));
    }

    // B. Módulo de Chat: Limpiar presencia activa y desconectar sesión
    if (inMemoryPresences[employeeId]) {
      delete inMemoryPresences[employeeId];
      console.log(`[Chat Module 💬] Presencia en memoria depurada para colaborador ${employeeId}.`);
    }

    console.log(`[Audit System 📋] Inactivación de ${employeeId} propagada a todos los módulos @ ${timestamp}`);
  });

  // 2. Reacción a ACTUALIZACIÓN DE EMPLEADO
  eventBus.subscribe('EMPLOYEE_UPDATED', ({ employee, previousState }) => {
    // Si cambió de rol o área, actualizar presencia en Chat
    if (inMemoryPresences[employee.id]) {
      inMemoryPresences[employee.id].updatedAt = new Date().toISOString();
      console.log(`[Chat Module 💬] Metadatos de presencia actualizados para ${employee.name}.`);
    }
  });

  // 3. Reacción a CREACIÓN DE EMPLEADO
  eventBus.subscribe('EMPLOYEE_CREATED', ({ employee }) => {
    console.log(`[Onboarding 🚀] Nuevo colaborador registrado en el sistema: ${employee.name} (${employee.roleName} - ${employee.contractType}). Listo para interacción en Chat y Voz.`);
  });

  // 4. Reacción a COTIZACIÓN APROBADA
  eventBus.subscribe('QUOTE_APPROVED', ({ quoteId, totalValue }) => {
    const formatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(totalValue);
    console.log(`[Commercial Pipeline 💼] Cotización ${quoteId} aprobada por valor de ${formatted}. Notificando a Producción para apertura de Orden de Trabajo.`);
  });

  // 5. Reacción a CAMBIO DE ETAPA EN PROYECTO
  eventBus.subscribe('PROJECT_STAGE_CHANGED', ({ projectId, fromStage, toStage }) => {
    console.log(`[Production Kanban 🏭] Proyecto ${projectId} avanzó de [${fromStage}] a [${toStage}]. Recalculando WIP y capacidad de taller.`);
  });

  // 6. Avisos al cliente por WhatsApp cuando su pedido cambia de etapa
  startStageNotifications();

  console.log('[DomainEventBus] Todos los suscriptores centrales han sido enlazados.');
}
