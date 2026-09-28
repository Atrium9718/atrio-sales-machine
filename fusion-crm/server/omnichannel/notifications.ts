import {
  clientPhones,
  matchClientByPhone,
  nextSendTime,
  normalizeNit,
  stageNoticeText,
  withinCustomerWindow,
  type ClientRecord,
  type OmnichannelConfig,
} from '../../packages/core/src/omnichannel';
import { CLIENT_PROGRESS_STEPS, resolveStageIndex } from '../../packages/core/src/portal/clientProgress';
import type { DocumentRepository } from '../repositories/types';
import type { ChannelSender } from './senders';
import { conversationId, type OmnichannelService } from './service';

/** Registro de cada aviso de cambio de etapa (visible en la bandeja → Avisos). */
export interface StageNotice {
  id: string;
  projectId: string;
  orderNumber: string;
  stageKey: string;
  stageLabel: string;
  clientName: string;
  /** Número de WhatsApp sin "+", como lo usa Meta (573…). */
  phone: string | null;
  status: 'scheduled' | 'sent' | 'failed' | 'skipped';
  reason: string | null;
  /** texto libre (ventana de 24 h abierta) o plantilla aprobada */
  mode: 'text' | 'template' | null;
  attempts: number;
  dueAt: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const MAX_ATTEMPTS = 3;

export interface NotifierDeps {
  notices: DocumentRepository<StageNotice>;
  loadConfig(): Promise<OmnichannelConfig>;
  listClients(): Promise<ClientRecord[]>;
  listProjects(): Promise<any[]>;
  listQuotes(): Promise<any[]>;
  service: OmnichannelService;
  sender: ChannelSender;
  createPortalLink(client: { name: string; nit: string }): Promise<string>;
  appUrl: string;
  now(): Date;
}

const isColombianMobile = (p: string) => /^\+573\d{9}$/.test(p);
const firstName = (name: string) => name.split(/\s+/)[0] || name;

export function createStageNotifier(deps: NotifierDeps) {
  const iso = () => deps.now().toISOString();

  async function resolveTarget(project: any) {
    const [clients, quotes] = await Promise.all([deps.listClients(), deps.listQuotes()]);
    const quote = project?.quoteId ? quotes.find((q) => String(q.id) === String(project.quoteId)) : undefined;
    const nit = normalizeNit(quote?.clientNit ?? project?.clientNit);
    const name = String(quote?.clientName ?? project?.clientName ?? project?.client ?? '').trim();
    const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
    const client =
      (nit && clients.find((c) => normalizeNit(c.nit) === nit)) || clients.find((c) => norm(c.name) === norm(name) && norm(name)) || null;

    // Teléfonos del cliente y los que traiga la cotización/proyecto; WhatsApp necesita un celular
    const phones = [
      ...(client ? clientPhones(client) : []),
      ...clientPhones({ id: 'q', phone: quote?.clientPhone, contactPhone: project?.clientPhone, clientData: quote?.clientData } as any),
    ].filter(isColombianMobile);
    const phone = phones[0] ? phones[0].replace(/^\+/, '') : null;
    const contact = String(quote?.clientData?.contactName || quote?.contactName || client?.contactName || client?.name || name || 'cliente');
    const verified = !!(phone && client && matchClientByPhone(clients, phone)?.id === client.id);
    return { client, quote, phone, contactName: contact, clientName: String(client?.name ?? name), clientNit: String(client?.nit ?? quote?.clientNit ?? ''), verified };
  }

  async function update(notice: StageNotice, fields: Partial<StageNotice>) {
    const next = { ...notice, ...fields, updatedAt: iso() };
    await deps.notices.upsert(next);
    return next;
  }

  async function deliver(notice: StageNotice): Promise<StageNotice> {
    const config = await deps.loadConfig();
    if (!config.notifications.enabled) return update(notice, { status: 'skipped', reason: 'Avisos automáticos desactivados' });
    if (!notice.phone) return update(notice, { status: 'skipped', reason: 'El cliente no tiene celular registrado' });

    const convId = conversationId('whatsapp', notice.phone);
    const existing = await deps.service.get(convId);
    if (existing?.optedOut) return update(notice, { status: 'skipped', reason: 'El cliente pidió no recibir avisos' });

    const projects = await deps.listProjects();
    const project = projects.find((p) => String(p.id) === notice.projectId);
    if (!project) return update(notice, { status: 'skipped', reason: 'El pedido ya no existe' });
    const target = await resolveTarget(project);

    let portalPath = existing?.portalPath ?? null;
    if (!portalPath) {
      try {
        portalPath = await deps.createPortalLink({ name: target.clientName, nit: target.clientNit });
      } catch {
        portalPath = null; // el aviso sale igual, sin enlace
      }
    }
    const link = portalPath && deps.appUrl ? `${deps.appUrl}${portalPath}` : null;
    const step = CLIENT_PROGRESS_STEPS.find((s) => s.key === notice.stageKey)!;
    const text = stageNoticeText({
      name: firstName(target.contactName),
      orderNumber: notice.orderNumber,
      stepLabel: step.label,
      stepDescription: step.description,
      link,
      businessName: config.businessName,
    });

    let mode: StageNotice['mode'] = null;
    const { result } = await deps.service.recordOutbound({
      channel: 'whatsapp',
      externalUserId: notice.phone,
      contactName: target.contactName,
      text,
      identity: target.verified
        ? { clientId: target.client?.id ?? null, clientName: target.clientName, clientNit: target.clientNit, verified: true, verifiedBy: 'phone', portalPath }
        : { portalPath },
      send: async (conv) => {
        if (withinCustomerWindow(conv, deps.now().getTime())) {
          mode = 'text';
          return deps.sender.sendText('whatsapp', notice.phone!, text);
        }
        mode = 'template';
        const template = config.notifications.templates[notice.stageKey];
        if (!template) return { ok: false, error: `Falta el nombre de la plantilla para "${step.label}" en la configuración` };
        return deps.sender.sendTemplate('whatsapp', notice.phone!, {
          name: template,
          language: config.notifications.templateLanguage || 'es',
          bodyParams: [firstName(target.contactName), notice.orderNumber, step.label, link || deps.appUrl || config.businessName],
        });
      },
    });

    if (result.ok) return update(notice, { status: 'sent', reason: null, mode, sentAt: iso(), attempts: notice.attempts + 1 });
    const attempts = notice.attempts + 1;
    const retry = attempts < MAX_ATTEMPTS;
    return update(notice, {
      status: retry ? 'scheduled' : 'failed',
      reason: result.error ?? 'Error de envío',
      mode,
      attempts,
      // Reintento: 15 min, luego 45 min (dentro de la franja permitida)
      dueAt: nextSendTime(config.notifications, new Date(deps.now().getTime() + 15 * 60 * 1000 * attempts * attempts)).toISOString(),
    });
  }

  return {
    /** Evento PROJECT_STAGE_CHANGED: agenda el aviso (una sola vez por pedido y etapa). */
    async onStageChanged(event: { projectId: string; fromStage: string; toStage: string }): Promise<StageNotice | null> {
      const config = await deps.loadConfig();
      if (!config.notifications.enabled) return null;
      const fromIdx = resolveStageIndex(event.fromStage);
      const toIdx = resolveStageIndex(event.toStage);
      if (toIdx <= fromIdx && event.fromStage) return null; // retrocesos o correcciones no avisan
      const step = CLIENT_PROGRESS_STEPS[toIdx];
      if (!config.notifications.stages.includes(step.key)) return null;

      const id = `${event.projectId}_${step.key}`.replace(/[\/\s]/g, '_');
      if (await deps.notices.get(id)) return null; // ya se avisó (o está en cola) esta etapa

      const project = (await deps.listProjects()).find((p) => String(p.id) === event.projectId);
      if (!project) return null;
      const target = await resolveTarget(project);
      const now = deps.now();
      const due = nextSendTime(config.notifications, now);
      let notice: StageNotice = {
        id,
        projectId: event.projectId,
        orderNumber: String(project.number || project.otNumber || event.projectId),
        stageKey: step.key,
        stageLabel: step.label,
        clientName: target.clientName,
        phone: target.phone,
        status: 'scheduled',
        reason: due > now ? 'Fuera de la franja de envío: sale en el próximo horario' : null,
        mode: null,
        attempts: 0,
        dueAt: due.toISOString(),
        sentAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await deps.notices.upsert(notice);
      if (due <= now) notice = await deliver(notice);
      return notice;
    },

    /** Envía los avisos en cola cuyo momento ya llegó (se llama periódicamente). */
    async processDue(): Promise<number> {
      const now = deps.now().toISOString();
      const due = (await deps.notices.list()).filter((n) => n.status === 'scheduled' && n.dueAt <= now);
      for (const n of due) await deliver(n);
      return due.length;
    },

    /** Reintento manual desde la bandeja. */
    async retry(id: string): Promise<StageNotice | null> {
      const n = await deps.notices.get(id);
      if (!n) return null;
      return deliver({ ...n, attempts: 0 });
    },

    async list(): Promise<StageNotice[]> {
      return (await deps.notices.list()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200);
    },
  };
}

export type StageNotifier = ReturnType<typeof createStageNotifier>;
