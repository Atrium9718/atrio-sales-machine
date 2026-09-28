import { PrismaClient, ChannelType } from '@prisma/client';
import { normalizePhone, normalizeEmail, normalizeSocialId } from './normalization';
import { emitIdentityEvent } from '../events/identityEvents';

const prisma = new PrismaClient();

export async function resolveIdentity(
  organizationId: string,
  channelType: ChannelType,
  rawIdentifier: string,
  displayName: string | null
) {
  let normalizedIdentifier: string | null = null;
  
  if (channelType === 'WHATSAPP' || channelType === 'SMS' || channelType === 'VOICE') {
    normalizedIdentifier = normalizePhone(rawIdentifier);
  } else if (channelType === 'EMAIL') {
    normalizedIdentifier = normalizeEmail(rawIdentifier);
  } else {
    normalizedIdentifier = normalizeSocialId(rawIdentifier, channelType);
  }

  // Fallback to raw if normalization fails
  normalizedIdentifier = normalizedIdentifier || rawIdentifier.trim().toLowerCase();

  return await prisma.$transaction(async (tx) => {
    // 1. Search for existing ContactIdentity
    const existingIdentity = await tx.contactIdentity.findUnique({
      where: {
        organizationId_channelType_normalizedIdentifier: {
          organizationId,
          channelType,
          normalizedIdentifier
        }
      },
      include: { contact: true, client: true }
    });

    if (existingIdentity && existingIdentity.status === 'LINKED') {
      return {
        identity: existingIdentity,
        contact: existingIdentity.contact,
        client: existingIdentity.client
      };
    }

    // 2. Search for exact match in Contact
    let matchedContact = null;
    let matchedClient = null;
    let confidence = 0;
    let verificationMethod = null;
    let status: 'LINKED' | 'UNLINKED' = 'UNLINKED';

    if (channelType === 'WHATSAPP' || channelType === 'SMS' || channelType === 'VOICE') {
      const contacts = await tx.contact.findMany({ where: { organizationId }});
      matchedContact = contacts.find(c => normalizePhone(c.mobile || '') === normalizedIdentifier || normalizePhone(c.phone || '') === normalizedIdentifier);
    } else if (channelType === 'EMAIL') {
      const contacts = await tx.contact.findMany({ where: { organizationId }});
      matchedContact = contacts.find(c => normalizeEmail(c.email || '') === normalizedIdentifier);
    }

    if (matchedContact) {
      matchedClient = await tx.client.findUnique({ where: { id: matchedContact.clientId }});
      confidence = 90;
      verificationMethod = 'INBOUND_REPLY';
      status = 'LINKED';
    }

    // 3. Search for exact match in Client
    if (!matchedContact) {
      if (channelType === 'WHATSAPP' || channelType === 'SMS' || channelType === 'VOICE') {
        const clients = await tx.client.findMany({ where: { organizationId }});
        matchedClient = clients.find(c => normalizePhone(c.mobile || '') === normalizedIdentifier || normalizePhone(c.phone || '') === normalizedIdentifier);
      } else if (channelType === 'EMAIL') {
        const clients = await tx.client.findMany({ where: { organizationId }});
        matchedClient = clients.find(c => normalizeEmail(c.email || '') === normalizedIdentifier);
      }

      if (matchedClient) {
        // Create a new contact linked to the client
        matchedContact = await tx.contact.create({
          data: {
            organizationId,
            clientId: matchedClient.id,
            firstName: displayName || 'Desconocido',
            lastName: '',
            jobTitle: 'Contacto',
            [channelType === 'EMAIL' ? 'email' : 'mobile']: rawIdentifier
          }
        });
        confidence = 70;
        verificationMethod = 'INBOUND_REPLY';
        status = 'LINKED';
      }
    }

    // 4. Create Identity
    const newIdentity = await tx.contactIdentity.create({
      data: {
        organizationId,
        channelType,
        rawIdentifier,
        normalizedIdentifier,
        displayName,
        status,
        confidence,
        verificationMethod: verificationMethod as any,
        contactId: matchedContact?.id,
        clientId: matchedClient?.id
      },
      include: { contact: true, client: true }
    });

    if (matchedContact) {
      // Bloque C: Captura de consentimiento transaccional automático por mensaje entrante
      await (tx as any).consentRecord.create({
        data: {
          organizationId,
          contactId: matchedContact.id,
          clientId: matchedClient?.id,
          channelType: channelType === 'WHATSAPP' || channelType === 'SMS' || channelType === 'EMAIL' || channelType === 'VOICE' ? channelType : 'ALL',
          purpose: 'TRANSACTIONAL',
          status: 'GRANTED',
          source: 'INBOUND_MESSAGE',
          grantedAt: new Date(),
          sourceDetail: 'Mensaje entrante espontáneo'
        }
      });
      
      emitIdentityEvent('consentimiento.otorgado', {
        contactId: matchedContact.id,
        purpose: 'TRANSACTIONAL',
        source: 'INBOUND_MESSAGE'
      });
    }

    if (status === 'LINKED') {
      emitIdentityEvent('identidad.vinculada', {
        identityId: newIdentity.id,
        contactId: matchedContact?.id,
        clientId: matchedClient?.id
      });
    } else {
      emitIdentityEvent('identidad.sin_vincular', {
        identityId: newIdentity.id
      });
    }

    return {
      identity: newIdentity,
      contact: matchedContact || null,
      client: matchedClient || null
    };
  });
}
