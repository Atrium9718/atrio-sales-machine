import { eventBus } from './DomainEventBus';
import { inMemoryAgentStatuses } from '../routes/voice';
import { inMemoryPresences } from '../routes/chat';

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
    // A. Módulo de Telefonía / Voz: Remover estado de agente disponible en memoria
    if (inMemoryAgentStatuses.has(employeeId)) {
      inMemoryAgentStatuses.delete(employeeId);
      console.log(`[Voice Module 📞] Agente ${employeeId} retirado de colas y estados PBX tras inactivación.`);
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
    // Si cambió su extensión o cargo, refrescar en telefonía
    if (inMemoryAgentStatuses.has(employee.id)) {
      const current = inMemoryAgentStatuses.get(employee.id);
      if (current) {
        current.updatedAt = new Date().toISOString();
      }
      console.log(`[Voice Module 📞] Perfil sincronizado para agente ${employee.name} (${employee.extension || 'Sin ext'}).`);
    }

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

  console.log('[DomainEventBus] Todos los suscriptores centrales han sido enlazados.');
}
