import { PrismaClient, ConsentChannelType, ConsentPurpose, ConsentStatus } from '@prisma/client';

export interface ConsentCheckResult {
  allowed: boolean;
  reason: string;
  consentId?: string;
}

export async function canSend(
  prisma: PrismaClient,
  organizationId: string,
  contactId: string,
  channelType: ConsentChannelType,
  purpose: ConsentPurpose
): Promise<ConsentCheckResult> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId }
  });

  if (!contact) {
    return { allowed: false, reason: 'Contacto no encontrado en la base de datos' };
  }

  const records = await prisma.consentRecord.findMany({
    where: {
      organizationId,
      contactId,
      channelType: {
        in: [channelType, 'ALL']
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const withdrawnRecords = records.filter(r => r.status === 'WITHDRAWN');
  
  const allChannelWithdrawn = withdrawnRecords.find(r => r.channelType === 'ALL');
  if (allChannelWithdrawn) {
    return { 
      allowed: false, 
      reason: 'El titular ha revocado el consentimiento para todos los canales', 
      consentId: allChannelWithdrawn.id 
    };
  }

  const specificWithdrawn = withdrawnRecords.find(r => 
    (r.channelType === channelType || r.channelType === 'ALL') && 
    r.purpose === purpose
  );

  if (specificWithdrawn) {
    return { 
      allowed: false, 
      reason: `El titular ha revocado el consentimiento para el propósito ${purpose} en este canal`, 
      consentId: specificWithdrawn.id 
    };
  }

  if (purpose === 'TRANSACTIONAL' || purpose === 'PRODUCTION_UPDATE') {
    if (!contact.clientId) {
      return { allowed: false, reason: 'No hay relación comercial (cliente) vinculada para comunicaciones transaccionales' };
    }
    return { allowed: true, reason: 'Comunicación transaccional permitida por relación comercial vigente' };
  }

  if (purpose === 'MARKETING' || purpose === 'SURVEY') {
    const grantedRecord = records.find(r => 
      r.status === 'GRANTED' &&
      r.purpose === purpose &&
      (r.channelType === channelType || r.channelType === 'ALL')
    );

    if (grantedRecord) {
      if (grantedRecord.expiresAt && grantedRecord.expiresAt < new Date()) {
        return { allowed: false, reason: 'El consentimiento ha expirado', consentId: grantedRecord.id };
      }
      return { allowed: true, reason: 'Consentimiento explícito otorgado', consentId: grantedRecord.id };
    }

    return { allowed: false, reason: 'No existe consentimiento explícito vigente para marketing o encuestas' };
  }

  return { allowed: false, reason: 'Propósito de comunicación no reconocido' };
}
