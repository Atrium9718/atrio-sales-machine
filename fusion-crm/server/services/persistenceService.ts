import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { inMemoryAnnouncements, inMemoryShoutouts } from '../routes/announcements';
import { inMemoryChannels, inMemoryMessages, inMemoryPins, inMemorySavedReplies } from '../routes/chat';
import { memoryAuditLogs, memoryMyDayTasks, memoryRoleLayouts, memoryUserLayouts } from '../routes/home';
import { inMemoryCallSessions, inMemoryCallParticipants, inMemoryCallInvitations, inMemoryActivities, inMemoryAuditLogs } from './callsService';
import { documentRepository } from '../repositories/documentStore';
import { loadFirebaseConfig } from '../auth/firebaseConfig';
import type { DocumentRepository } from '../repositories/types';

/**
 * Persistencia del estado que los módulos mantienen en memoria (chat, anuncios, llamadas,
 * tareas del día, registro de actividad…).
 *
 * Antes todo se guardaba como UN solo documento de Firestore (máx. 1 MB) cada 5 minutos y solo
 * si alguien lo marcaba como modificado (el chat nunca lo hacía), con copia local dentro del
 * contenedor. Ahora cada elemento es un documento propio (Postgres o Firestore según
 * DATA_BACKEND), se guarda ~1 s después de cada cambio y se carga ANTES de atender peticiones.
 */

type Item = Record<string, any>;

interface Binding {
  name: string;
  /** Elementos actuales, cada uno con un id estable. */
  snapshot(): { id: string; data: Item }[];
  /** Reemplaza el contenido en memoria con lo guardado. */
  restore(items: { id: string; data: Item }[]): void;
}

const arrayBinding = (name: string, arr: Item[], key = 'id'): Binding => ({
  name,
  snapshot: () =>
    arr.map((it, i) => ({ id: String(it?.[key] ?? `idx-${i}`), data: { ...it, __order: i } })),
  restore: (items) => {
    const sorted = [...items].sort((a, b) => (a.data.__order ?? 0) - (b.data.__order ?? 0));
    arr.length = 0;
    for (const { id, data } of sorted) {
      const { __order: _o, ...rest } = data;
      // El id va aparte en la base; se devuelve al elemento salvo los que nunca lo tuvieron
      arr.push(id.startsWith('idx-') ? rest : { ...rest, [key]: rest[key] ?? id });
    }
  },
});

const mapBinding = (name: string, map: Map<string, any>): Binding => ({
  name,
  snapshot: () => [...map.entries()].map(([k, v]) => ({ id: k, data: { value: v } })),
  restore: (items) => {
    map.clear();
    for (const { id, data } of items) map.set(id, data.value);
  },
});

const recordBinding = (name: string, rec: Record<string, any>): Binding => ({
  name,
  snapshot: () => Object.entries(rec).map(([k, v]) => ({ id: k, data: { value: v } })),
  restore: (items) => {
    for (const k of Object.keys(rec)) delete rec[k];
    for (const { id, data } of items) rec[id] = data.value;
  },
});

const BINDINGS: Binding[] = [
  arrayBinding('announcements', inMemoryAnnouncements),
  arrayBinding('shoutouts', inMemoryShoutouts),
  arrayBinding('channels', inMemoryChannels),
  arrayBinding('messages', inMemoryMessages),
  arrayBinding('pins', inMemoryPins),
  arrayBinding('savedReplies', inMemorySavedReplies),
  mapBinding('callSessions', inMemoryCallSessions),
  mapBinding('callParticipants', inMemoryCallParticipants),
  mapBinding('callInvitations', inMemoryCallInvitations),
  arrayBinding('activities', inMemoryActivities),
  arrayBinding('auditLogs', inMemoryAuditLogs),
  arrayBinding('homeAuditLogs', memoryAuditLogs),
  recordBinding('homeUserLayouts', memoryUserLayouts),
  recordBinding('homeRoleLayouts', memoryRoleLayouts),
  recordBinding('homeMyDayTasks', memoryMyDayTasks),
];

const collectionFor = (b: Binding) => `state_${b.name}`;
const repos = new Map<string, DocumentRepository>();
const repoFor = (b: Binding) => {
  const key = collectionFor(b);
  if (!repos.has(key)) repos.set(key, documentRepository(key));
  return repos.get(key)!;
};

/** JSON con claves ordenadas: Postgres (jsonb) no conserva el orden de las claves. */
const stable = (v: any): any =>
  Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v;
/** Huella del documento tal como queda guardado ({...datos, id}). */
const hash = (id: string, data: Item) => createHash('sha1').update(JSON.stringify(stable({ ...JSON.parse(JSON.stringify(data)), id }))).digest('hex');
/** Último contenido guardado por colección e id (para escribir solo lo que cambió). */
const saved = new Map<string, Map<string, string>>();

// ── Migración desde el formato anterior (documento único appState/state1) ──

function applyLegacyState(data: Record<string, any>) {
  const parse = (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : v);
  const setArray = (arr: Item[], v: unknown) => {
    if (v == null) return;
    arr.length = 0;
    arr.push(...(parse(v) as Item[]));
  };
  const setMap = (map: Map<string, any>, v: unknown) => {
    if (v == null) return;
    map.clear();
    for (const [k, val] of Object.entries(parse(v) as Record<string, any>)) map.set(k, val);
  };
  setArray(inMemoryAnnouncements as Item[], data.announcements);
  setArray(inMemoryShoutouts as Item[], data.shoutouts);
  setArray(inMemoryChannels as Item[], data.channels);
  setArray(inMemoryMessages as Item[], data.messages);
  setArray(inMemoryPins as Item[], data.pins);
  setArray(inMemorySavedReplies as Item[], data.savedReplies);
  setMap(inMemoryCallSessions, data.callSessions);
  setMap(inMemoryCallParticipants, data.callParticipants);
  setMap(inMemoryCallInvitations, data.callInvitations);
  setArray(inMemoryActivities, data.activities);
  setArray(inMemoryAuditLogs, data.auditLogs);
}

async function loadLegacyState(): Promise<boolean> {
  let found = false;
  try {
    const localPath = path.join(process.cwd(), 'local-app-state.json');
    if (fs.existsSync(localPath)) {
      applyLegacyState(JSON.parse(fs.readFileSync(localPath, 'utf8')));
      found = true;
    }
  } catch (err) {
    console.warn('[estado] No se pudo leer local-app-state.json:', err);
  }
  try {
    if (getApps().length) {
      const snap = await getDoc(doc(getFirestore(getApps()[0], loadFirebaseConfig().firestoreDatabaseId as string | undefined), 'appState', 'state1'));
      if (snap.exists()) {
        applyLegacyState(snap.data());
        found = true;
      }
    }
  } catch (err) {
    console.warn('[estado] No se pudo leer el estado anterior de Firestore:', (err as Error)?.message || err);
  }
  return found;
}

// ── API (mismos nombres que antes, para no cambiar a quienes la usan) ──

let hydrated = false;

/** Carga el estado guardado. Se llama al arrancar, antes de aceptar peticiones. */
export async function loadStateFromFirestore(): Promise<void> {
  let anyStored = false;
  for (const b of BINDINGS) {
    try {
      const docs = await repoFor(b).list();
      const map = new Map<string, string>();
      if (docs.length) {
        anyStored = true;
        const items = docs.map(({ id, ...data }) => ({ id: String(id), data }));
        b.restore(items);
        for (const it of items) map.set(it.id, hash(it.id, it.data));
      }
      saved.set(b.name, map);
    } catch (err) {
      console.error(`[estado] No se pudo cargar ${b.name}:`, err);
      saved.set(b.name, new Map());
    }
  }
  if (!anyStored && (await loadLegacyState())) {
    console.log('[estado] Migrando el estado del formato anterior (documento único) al nuevo.');
  }
  hydrated = true;
  await saveStateToFirestore(true);
}

let flushing: Promise<void> | null = null;

/** Guarda lo que cambió desde la última vez (solo esos elementos). */
export async function saveStateToFirestore(_force = false): Promise<void> {
  if (!hydrated) return; // nunca pisar lo guardado con los valores iniciales
  if (flushing) {
    await flushing;
  }
  flushing = (async () => {
    for (const b of BINDINGS) {
      const prev = saved.get(b.name) ?? new Map<string, string>();
      const next = new Map<string, string>();
      const changed: Item[] = [];
      for (const { id, data } of b.snapshot()) {
        const h = hash(id, data);
        next.set(id, h);
        if (prev.get(id) !== h) changed.push({ ...data, id });
      }
      const removed = [...prev.keys()].filter((id) => !next.has(id));
      try {
        if (changed.length) await repoFor(b).upsertMany(changed as any);
        for (const id of removed) await repoFor(b).delete(id);
        saved.set(b.name, next);
      } catch (err) {
        console.error(`[estado] No se pudo guardar ${b.name} (se reintenta):`, (err as Error)?.message || err);
      }
    }
  })();
  try {
    await flushing;
  } finally {
    flushing = null;
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Programa un guardado en ~1 s (agrupa varios cambios seguidos). */
export function markStateDirty() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    saveStateToFirestore().catch((err) => console.error('[estado] Error guardando:', err));
  }, 1000);
  timer.unref?.();
}

let syncInterval: ReturnType<typeof setInterval> | null = null;

/** Red de seguridad: revisa cambios cada 15 s (los módulos mutan la memoria directamente). */
export function startStateSync() {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => markStateDirty(), 15_000);
  syncInterval.unref?.();
}

/** Middleware: toda petición que modifica algo programa un guardado al terminar. */
export function persistAfterWrites(req: { method: string }, res: { on(ev: string, cb: () => void): void }, next: () => void) {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') res.on('finish', markStateDirty);
  next();
}

/** Solo para pruebas. */
export const __test = { BINDINGS, saved, reset: () => ((hydrated = false), saved.clear(), repos.clear()) };
