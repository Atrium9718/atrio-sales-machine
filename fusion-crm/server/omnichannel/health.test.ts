import { describe, it, expect } from 'vitest';
import { computeChannelHealth, computeMonthlyCosts } from './health';
import { createUsageTracker, tokensCostUsd } from './usage';
import { createMemoryRepository } from '../repositories/documentStore';

const NOW = new Date('2026-09-28T15:00:00Z');
const msg = (over: any) => ({ id: Math.random().toString(36), direction: 'out', author: 'ai', text: 'x', status: 'sent', createdAt: '2026-09-27T10:00:00Z', ...over });
const conv = (channel: string, messages: any[]) => ({ id: channel, channel, messages }) as any;

describe('salud de canales', () => {
  const conversations = [
    conv('whatsapp', [msg({ direction: 'in', author: 'customer', status: 'received' }), msg({ status: 'read' }), msg({ status: 'read' }), msg({ status: 'read' }), msg({ status: 'delivered' }), msg({ status: 'failed', error: 'Token vencido', createdAt: '2026-09-28T09:00:00Z' })]),
    conv('messenger', [msg({ status: 'failed', error: 'x' }), msg({ status: 'failed', error: 'y' }), msg({ status: 'sent' })]),
  ];
  const health = computeChannelHealth(conversations, { whatsapp: true, messenger: true, instagram: false, webchat: true }, NOW);
  const by = (c: string) => health.find((h) => h.channel === c)!;

  it('calcula entregas, fallos y último error por canal', () => {
    expect(by('whatsapp')).toMatchObject({ level: 'warning', inbound7d: 1, outbound7d: 5, failed7d: 1, lastError: 'Token vencido' });
    expect(by('whatsapp').deliveredRate).toBeCloseTo(4 / 5);
  });

  it('marca error cuando falla más del 20% y apagado si no está conectado', () => {
    expect(by('messenger').level).toBe('error');
    expect(by('instagram')).toMatchObject({ level: 'off', configured: false });
    expect(by('webchat')).toMatchObject({ level: 'warning', summary: 'Conectado, aún sin mensajes recibidos', deliveredRate: null });
  });
});

describe('costos del mes', () => {
  it('registra el consumo diario de la IA y calcula el costo con plantillas de WhatsApp', async () => {
    let now = new Date('2026-09-10T15:00:00Z');
    const tracker = createUsageTracker(createMemoryRepository(), () => now);
    await Promise.all([
      tracker.record({ promptTokens: 1_000_000, outputTokens: 100_000, model: 'm', source: 'agentes' }),
      tracker.record({ promptTokens: 500_000, outputTokens: 0, model: 'm', source: 'simulador' }),
    ]);
    now = new Date('2026-10-01T15:00:00Z');
    await tracker.record({ promptTokens: 9, outputTokens: 9, model: 'm', source: 'agentes' });
    const usage = await tracker.month('2026-09');
    expect(usage).toHaveLength(1);
    expect(usage[0]).toMatchObject({ calls: 2, promptTokens: 1_500_000, outputTokens: 100_000 });

    const prices = { inputPerM: 0.3, outputPerM: 2.5, templateUsd: 0.01, usdCop: 4000 };
    const notices = [
      { status: 'sent', mode: 'template', sentAt: '2026-09-11T10:00:00Z' },
      { status: 'sent', mode: 'text', sentAt: '2026-09-11T10:00:00Z' },
      { status: 'failed', mode: 'template', sentAt: null, updatedAt: '2026-09-11T10:00:00Z' },
    ] as any[];
    const conversations = [conv('whatsapp', [msg({ createdAt: '2026-09-12T10:00:00Z' }), msg({ createdAt: '2026-09-13T10:00:00Z', status: 'suggested' })])];
    const c = computeMonthlyCosts({ month: '2026-09', usage, notices, conversations, prices });
    expect(c.ai.usd).toBeCloseTo(tokensCostUsd(1_500_000, 100_000, prices)); // 0,45 + 0,25
    expect(c.ai.usd).toBeCloseTo(0.7);
    expect(c.whatsappTemplates).toEqual({ count: 1, usd: 0.01 });
    expect(c.totalCop).toBeCloseTo(0.71 * 4000);
    expect(c.aiMessages).toBe(1);
    expect(c.ai.bySource.map((s) => s.source)).toEqual(['agentes', 'simulador']);
  });
});
