import { describe, it, expect } from 'vitest';
import { quoteMessage } from './quoteSharing';

describe('mensaje para enviar la cotización', () => {
  it('lleva el enlace, el total y la firma del asesor', () => {
    const text = quoteMessage({ clientName: 'Alpina', number: 'COT-00012', company: 'Fusión', advisor: 'Carolina Ruiz', pdfUrl: 'https://crm.co/api/portal/cotizacion/abc', total: 1105000.4, validity: '30 días' });
    expect(text).toContain('Hola Alpina,');
    expect(text).toContain('cotización COT-00012 de Fusión');
    expect(text).toContain('aquí: https://crm.co/api/portal/cotizacion/abc');
    expect(text).toMatch(/Valor total: \$ 1\.105\.000 \(válida por 30 días\)\./);
    expect(text.trim().split('\n').slice(-2)).toEqual(['Carolina Ruiz', 'Fusión']);
  });

  it('sin enlace no promete un adjunto que no existe en el texto', () => {
    const text = quoteMessage({ clientName: 'Alpina', number: 'COT-1', company: 'Fusión', advisor: 'Ana', pdfUrl: '' });
    expect(text).toContain('Te la envío en PDF por este medio.');
    expect(text).not.toContain('Valor total');
  });
});
