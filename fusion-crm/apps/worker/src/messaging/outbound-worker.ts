import { PrismaClient, ConsentChannelType, ConsentPurpose } from '@prisma/client';
import { canSend } from '../../../../packages/core/src/consent';
// This simulates the worker from Etapa 4

const prisma = new PrismaClient();

export async function processOutboundMessage(job: {
  data: {
    organizationId: string;
    contactId: string;
    channelType: ConsentChannelType;
    purpose: ConsentPurpose;
    content: string;
  }
}) {
  const { organizationId, contactId, channelType, purpose, content } = job.data;

  // VERIFICACIÓN DE CONSENTIMIENTO
  const consentCheck = await canSend(prisma, organizationId, contactId, channelType, purpose);

  if (!consentCheck.allowed) {
    console.warn(`Envío bloqueado por consentimiento: ${consentCheck.reason}`);
    
    // El mensaje queda con status REJECTED y motivo CONSENT_DENIED
    // Evento emitido
    // emitEvent('envio.bloqueado_por_consentimiento', { contactId, channelType, reason: consentCheck.reason });
    
    return {
      status: 'REJECTED',
      reason: 'CONSENT_DENIED',
      detail: consentCheck.reason
    };
  }

  // Continuar con el envío...
  console.log('Mensaje enviado exitosamente');
  return {
    status: 'SENT'
  };
}
