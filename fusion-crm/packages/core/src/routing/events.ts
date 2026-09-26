import { EventEmitter } from 'events';

export const RoutingEvents = new EventEmitter();

// EVENTOS EMITIDOS:
// conversacion.enrutada
// conversacion.sin_agente_disponible
// sla.en_riesgo
// sla.incumplido
// escalamiento.ejecutado
// turno.iniciado
// turno.finalizado

