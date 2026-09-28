import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import { createMemoryRepository } from '../repositories/documentStore';

// Cada colección vive en memoria; el mapa se comparte entre "reinicios" del servidor
const stores = vi.hoisted(() => new Map<string, any>());
vi.mock('../repositories/documentStore', async (orig) => {
  const actual: any = await orig();
  return {
    ...actual,
    documentRepository: (collection: string) => {
      if (!stores.has(collection)) stores.set(collection, actual.createMemoryRepository());
      return stores.get(collection);
    },
  };
});
vi.mock('firebase/app', () => ({ getApps: () => [] }));

import { inMemoryChannels, inMemoryMessages } from '../routes/chat';
import { inMemoryAnnouncements } from '../routes/announcements';
import { memoryMyDayTasks } from '../routes/home';
import { inMemoryCallSessions } from './callsService';
import { loadStateFromFirestore, saveStateToFirestore, persistAfterWrites, __test } from './persistenceService';
import { loadSettingsStore, getSettings, updateSettings, __resetSettingsStore } from './settingsStore';

const docs = async (name: string) => (stores.get(`state_${name}`) ? await stores.get(`state_${name}`).list() : []);

/** Simula un reinicio: se borra la memoria del proceso y se vuelve a cargar lo guardado. */
async function restart() {
  inMemoryMessages.length = 0;
  inMemoryChannels.length = 0;
  inMemoryAnnouncements.length = 0;
  inMemoryCallSessions.clear();
  for (const k of Object.keys(memoryMyDayTasks)) delete memoryMyDayTasks[k];
  __test.reset();
  await loadStateFromFirestore();
}

describe('persistencia del estado en memoria', () => {
  beforeEach(() => {
    stores.clear();
    __test.reset();
  });

  it('la primera vez guarda los valores iniciales y después sobreviven a un reinicio', async () => {
    await loadStateFromFirestore();
    const initialChannels = inMemoryChannels.length;
    expect(initialChannels).toBeGreaterThan(0);
    expect(await docs('channels')).toHaveLength(initialChannels);

    inMemoryMessages.push({ id: 'm-nuevo', channelId: inMemoryChannels[0].id, text: 'Hola equipo' } as any);
    inMemoryAnnouncements.unshift({ id: 'a1', title: 'Cierre de mes' } as any);
    inMemoryCallSessions.set('s1', { id: 's1', status: 'ended' } as any);
    memoryMyDayTasks['u1'] = [{ id: 't1', title: 'Llamar a Pintuco' } as any];
    await saveStateToFirestore();

    await restart();
    expect(inMemoryChannels).toHaveLength(initialChannels);
    expect(inMemoryMessages.at(-1)).toMatchObject({ id: 'm-nuevo', text: 'Hola equipo' });
    expect(inMemoryMessages.at(-1)).not.toHaveProperty('__order');
    expect(inMemoryAnnouncements[0]).toMatchObject({ id: 'a1' });
    expect(inMemoryCallSessions.get('s1')).toMatchObject({ status: 'ended' });
    expect(memoryMyDayTasks['u1']).toEqual([{ id: 't1', title: 'Llamar a Pintuco' }]);
  });

  it('solo escribe lo que cambió y borra lo eliminado', async () => {
    await loadStateFromFirestore();
    const repo = stores.get('state_messages');
    const spy = vi.spyOn(repo, 'upsertMany');
    await saveStateToFirestore();
    expect(spy).not.toHaveBeenCalled();

    inMemoryMessages.push({ id: 'm2', text: 'uno' } as any);
    await saveStateToFirestore();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toHaveLength(1);

    inMemoryMessages.splice(inMemoryMessages.findIndex((m) => m.id === 'm2'), 1);
    await saveStateToFirestore();
    expect((await docs('messages')).some((d: any) => d.id === 'm2')).toBe(false);
  });

  it('no guarda nada antes de cargar (no pisa lo guardado con los valores de fábrica)', async () => {
    const repo = createMemoryRepository();
    await repo.upsert({ id: 'c-real', name: 'general', __order: 0 } as any);
    stores.set('state_channels', repo);
    await saveStateToFirestore();
    expect(await repo.list()).toHaveLength(1);
    await loadStateFromFirestore();
    expect(inMemoryChannels.map((c) => c.id)).toEqual(['c-real']);
  });

  it('migra el estado del formato anterior (documento único)', async () => {
    const legacy = { messages: JSON.stringify([{ id: 'viejo', text: 'mensaje de antes' }]), announcements: [{ id: 'an-viejo' }] };
    const exists = vi.spyOn(fs, 'existsSync').mockImplementation((p) => String(p).endsWith('local-app-state.json'));
    const read = vi.spyOn(fs, 'readFileSync').mockImplementation(() => JSON.stringify(legacy));
    try {
      await loadStateFromFirestore();
    } finally {
      exists.mockRestore();
      read.mockRestore();
    }
    expect(inMemoryMessages).toEqual([{ id: 'viejo', text: 'mensaje de antes' }]);
    expect((await docs('announcements')).map((d: any) => d.id)).toEqual(['an-viejo']);
  });

  it('el middleware programa un guardado solo en peticiones que modifican', () => {
    const on = vi.fn();
    const next = vi.fn();
    persistAfterWrites({ method: 'GET' }, { on }, next);
    persistAfterWrites({ method: 'POST' }, { on }, next);
    expect(on).toHaveBeenCalledTimes(1);
    expect(on.mock.calls[0][0]).toBe('finish');
    expect(next).toHaveBeenCalledTimes(2);
  });
});

describe('configuración general', () => {
  beforeEach(() => {
    stores.clear();
    __resetSettingsStore();
  });

  it('se guarda en la base y sobrevive a un reinicio', async () => {
    await loadSettingsStore();
    await updateSettings({ 'empresa.nombre': 'Fusion Empaques', 'cotizacion.iva': 19 });
    __resetSettingsStore();
    await loadSettingsStore();
    expect(getSettings()).toMatchObject({ 'empresa.nombre': 'Fusion Empaques', 'cotizacion.iva': 19 });
    expect(await stores.get('app_settings').get('values')).toMatchObject({ 'cotizacion.iva': 19 });
  });
});
