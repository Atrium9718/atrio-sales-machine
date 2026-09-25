import { describe, it, expect } from 'vitest';
import { inMemoryChannels, inMemoryMessages, inMemorySavedReplies } from '../../../../server/routes/chat';
import { searchChatMessages } from './search';
import { verifyDirectChannelExport } from './privacy';
import { renderLimitedMarkdown, extractMentions, extractEntityLinks } from './markdown';

describe('Chat API and Business Logic Integration (Etapa 15.5)', () => {
  it('seeds only the base public channels (entity and direct channels are created on demand)', () => {
    expect(inMemoryChannels.map((c) => c.key)).toEqual(
      expect.arrayContaining(['general', 'comercial', 'produccion', 'anuncios'])
    );
    expect(inMemoryChannels.every((c) => c.type === 'PUBLIC')).toBe(true);

    const general = inMemoryChannels.find((c) => c.key === 'general');
    expect(general).toBeDefined();
    expect(general?.isReadOnly).toBe(false);

    const anuncios = inMemoryChannels.find((c) => c.key === 'anuncios');
    expect(anuncios?.isReadOnly).toBe(true);
  });

  it('formats markdown and extracts mentions and entity references correctly', () => {
    const raw = 'Hola @admin, favor revisar la cotización #COT-1045 y el avance en #PRJ-801 con **urgencia**';
    const users = [
      { id: 'usr-admin', name: 'admin' },
      { id: 'usr-laura', name: 'laura' },
    ];

    const mentions = extractMentions(raw, users);
    expect(mentions.mentionedUserIds).toContain('usr-admin');
    expect(mentions.mentionsEveryone).toBe(false);

    const entities = extractEntityLinks(raw);
    expect(entities).toHaveLength(2);
    expect(entities[0].type).toBe('QUOTE');
    expect(entities[0].code).toBe('COT-1045');
    expect(entities[1].type).toBe('PRODUCTION_PROJECT');
    expect(entities[1].code).toBe('PRJ-801');

    const rendered = renderLimitedMarkdown(raw);
    expect(rendered).toContain('>urgencia</strong>');
    expect(rendered).toContain('@admin');
    expect(rendered).toContain('#COT-1045');
  });

  it('performs Spanish accent-insensitive search across messages', () => {
    const messages = [
      {
        id: '1',
        channelId: 'chn-1',
        bodyPlain: 'Se autorizó la impresión en cama plana con tintas UV',
        body: 'Se autorizó la **impresión** en cama plana',
        createdAt: '2026-09-12T10:00:00.000Z',
      },
      {
        id: '2',
        channelId: 'chn-1',
        bodyPlain: 'Reunión de coordinación comercial',
        body: 'Reunión de coordinación',
        createdAt: '2026-09-12T11:00:00.000Z',
      },
    ] as any;

    // Search without accents finds word with accent
    const found1 = searchChatMessages(messages, 'impresion');
    expect(found1).toHaveLength(1);
    expect(found1[0].id).toBe('1');

    // Search with accents finds word without accents or with accents
    const found2 = searchChatMessages(messages, 'coordinacion');
    expect(found2).toHaveLength(1);
    expect(found2[0].id).toBe('2');
  });

  it('strictly enforces the Hard Privacy Limit on foreign direct message export', () => {
    const dmChannel = {
      id: 'chn-dm-secret',
      type: 'DIRECT',
      members: [{ userId: 'usr-laura' }, { userId: 'usr-carlos' }],
    } as any;

    // 1. Foreign user without permission
    const res1 = verifyDirectChannelExport({
      channel: dmChannel,
      requestingUserId: 'usr-thirdparty',
      hasChatExportPermission: false,
      hasLegalConfirmation: false,
      legalReason: '',
    });
    expect(res1.allowed).toBe(false);
    expect(res1.error).toContain('Permiso denegado: se requiere el privilegio especial chat:export');

    // 2. Foreign admin with permission but without double confirmation or legal reason
    const res2 = verifyDirectChannelExport({
      channel: dmChannel,
      requestingUserId: 'usr-admin',
      hasChatExportPermission: true,
      hasLegalConfirmation: false,
      legalReason: 'corto',
    });
    expect(res2.allowed).toBe(false);
    expect(res2.error).toContain('LÍMITE DURO DE PRIVACIDAD');
    expect(res2.requiresLegalDoubleConfirmation).toBe(true);

    // 3. Foreign admin with full double confirmation and 15+ char legal reason
    const res3 = verifyDirectChannelExport({
      channel: dmChannel,
      requestingUserId: 'usr-admin',
      hasChatExportPermission: true,
      hasLegalConfirmation: true,
      legalReason: 'Radicado fiscalía 2026-9812 por fraude documentario',
    });
    expect(res3.allowed).toBe(true);
    expect(res3.notifyUserIds).toEqual(['usr-laura', 'usr-carlos']);
    expect(res3.auditPayload).toBeDefined();
    expect(res3.auditPayload?.action).toBe('CHAT_DIRECT_EXPORT_LEGAL_OVERRIDE');
  });

  it('includes saved replies shortcuts like /cotiza, /gracias, /datos-bancarios', () => {
    const shortcuts = inMemorySavedReplies.map((r) => r.shortcut);
    expect(shortcuts).toContain('/cotiza');
    expect(shortcuts).toContain('/gracias');
    expect(shortcuts).toContain('/datos-bancarios');
  });
});
