import { eventBus } from './events/DomainEventBus';
import { describeIntegrations, testIntegration } from './services/integrations';

/**
 * Revisión diaria de las conexiones con Meta (WhatsApp, Messenger): si un token venció o se
 * revocó, avisa a los administradores en la app antes de que los clientes dejen de recibir
 * respuestas.
 */
export async function checkMetaTokens() {
  const targets = describeIntegrations(process.env).filter((i) => (i.id === 'whatsapp' || i.id === 'messenger') && i.configured);
  for (const i of targets) {
    const r = await testIntegration(i.id, {
      env: process.env,
      fetch: fetch as any,
      pingDatabase: async () => '',
      pingFirebase: async () => '',
    });
    if (!r.ok) {
      console.error(`[conexiones] ${i.name}: ${r.message}`);
      eventBus.publish('INTEGRATION_CHECK_FAILED', { integration: i.id, name: i.name, message: r.message });
    }
  }
}
