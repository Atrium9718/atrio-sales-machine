import { describe, it, expect, vi } from 'vitest';
import { inferKind, notify, subscribeNotify } from './notify';

describe('avisos (notify)', () => {
  it('deduce el tipo por el texto', () => {
    expect(inferKind('Error al guardar el rol')).toBe('error');
    expect(inferKind('No se pudo crear el enlace: timeout')).toBe('error');
    expect(inferKind('Configuración actualizada con éxito.')).toBe('success');
    expect(inferKind('Cita guardada en base de datos.')).toBe('success');
    expect(inferKind('Selecciona un insumo')).toBe('info');
  });

  it('entrega el aviso a los suscriptores y respeta el tipo explícito', () => {
    const seen = vi.fn();
    const off = subscribeNotify(seen);
    notify('Precio por debajo del costo', 'error');
    notify(new Error('Fallo de red'));
    off();
    notify('ya nadie escucha');
    expect(seen).toHaveBeenCalledTimes(2);
    expect(seen.mock.calls[0][0]).toMatchObject({ message: 'Precio por debajo del costo', kind: 'error' });
    expect(seen.mock.calls[1][0]).toMatchObject({ message: 'Fallo de red', kind: 'error' });
  });
});
