import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Métricas propias del servidor (sin dependencias externas): peticiones por minuto, tiempo de
 * respuesta, errores y los últimos fallos, en una ventana de 15 minutos en memoria.
 */

interface Sample {
  at: number;
  ms: number;
  status: number;
  path: string;
}

const WINDOW_MS = 15 * 60_000;
const samples: Sample[] = [];
const recentErrors: { at: string; status: number; method: string; path: string; ms: number }[] = [];
const startedAt = Date.now();

/** Rutas sin ids para agrupar (ej. /api/data/projects/abc → /api/data/projects/:id). */
export function routeKey(url: string): string {
  const p = url.split('?')[0];
  return p
    .split('/')
    .map((seg, i) => (i > 3 && /[0-9]/.test(seg) ? ':id' : seg))
    .join('/')
    .slice(0, 120);
}

export function recordRequest(s: Sample, method = 'GET') {
  samples.push(s);
  const cutoff = s.at - WINDOW_MS;
  while (samples.length && samples[0].at < cutoff) samples.shift();
  if (s.status >= 500) {
    recentErrors.unshift({ at: new Date(s.at).toISOString(), status: s.status, method, path: s.path, ms: s.ms });
    if (recentErrors.length > 50) recentErrors.length = 50;
  }
}

/** Middleware: mide cada petición a /api (no el SSE ni los archivos estáticos). */
export function requestMetrics(req: { method: string; originalUrl?: string; url: string }, res: { statusCode: number; on(ev: string, cb: () => void): void }, next: () => void) {
  const url = req.originalUrl || req.url;
  if (!url.startsWith('/api/') || url.startsWith('/api/stream') || url.startsWith('/api/realtime')) return next();
  const t0 = Date.now();
  res.on('finish', () => recordRequest({ at: Date.now(), ms: Date.now() - t0, status: res.statusCode, path: routeKey(url) }, req.method));
  next();
}

export function metricsSnapshot(now = Date.now()) {
  const recent = samples.filter((s) => s.at >= now - WINDOW_MS);
  const sorted = recent.map((s) => s.ms).sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : null;
  const errors = recent.filter((s) => s.status >= 500).length;
  const byRoute = new Map<string, { count: number; totalMs: number; errors: number }>();
  for (const s of recent) {
    const r = byRoute.get(s.path) ?? { count: 0, totalMs: 0, errors: 0 };
    r.count++;
    r.totalMs += s.ms;
    if (s.status >= 500) r.errors++;
    byRoute.set(s.path, r);
  }
  const slowest = [...byRoute.entries()]
    .map(([route, r]) => ({ route, count: r.count, avgMs: Math.round(r.totalMs / r.count), errors: r.errors }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 8);
  const minutes = Math.max(1, Math.min(15, (now - startedAt) / 60_000));
  return {
    windowMinutes: 15,
    requestsPerMinute: Math.round((recent.length / minutes) * 10) / 10,
    p95Ms: p95,
    errorRate: recent.length ? errors / recent.length : 0,
    errors,
    slowest,
    recentErrors: recentErrors.slice(0, 20),
  };
}

export function processInfo() {
  const mem = process.memoryUsage();
  return {
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: new Date(startedAt).toISOString(),
    node: process.version,
    memoryMb: Math.round(mem.rss / 1024 / 1024),
    systemMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
    systemFreeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
    loadAverage: os.loadavg().map((n) => Math.round(n * 100) / 100),
    cpus: os.cpus().length,
  };
}

export async function diskInfo(dir = process.cwd()) {
  try {
    const st = await fs.promises.statfs(dir);
    const total = st.blocks * st.bsize;
    const free = st.bavail * st.bsize;
    return { path: dir, totalGb: Math.round((total / 1e9) * 10) / 10, freeGb: Math.round((free / 1e9) * 10) / 10, usedPercent: total ? Math.round(((total - free) / total) * 100) : null };
  } catch {
    return null;
  }
}

/** Versión del sistema: la del package.json y el commit si se pasó al construir (GIT_SHA). */
export function versionInfo() {
  let version = 'desconocida';
  try {
    version = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).version;
  } catch {
    /* sin package.json en el contenedor */
  }
  return { version, commit: (process.env.GIT_SHA || '').slice(0, 10) || null, builtAt: process.env.BUILD_DATE || null };
}

export function __resetMetrics() {
  samples.length = 0;
  recentErrors.length = 0;
}
