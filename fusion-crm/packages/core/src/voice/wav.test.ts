import { describe, it, expect } from 'vitest';
import { asteriskWavProblem, encodeWav, parseWav, promptFilename } from './wav';

describe('Audio para Asterisk (WAV 8 kHz mono 16 bits)', () => {
  it('lo que codifica el navegador pasa la verificación del servidor', () => {
    const samples = new Float32Array(8000 * 2).map((_, i) => Math.sin(i / 10) * 0.5);
    const info = parseWav(encodeWav(samples));
    expect(info).toMatchObject({ audioFormat: 1, channels: 1, sampleRate: 8000, bitsPerSample: 16 });
    expect(info!.durationSeconds).toBeCloseTo(2, 5);
    expect(asteriskWavProblem(info)).toBeNull();
  });

  it('rechaza lo que Asterisk no puede reproducir', () => {
    expect(asteriskWavProblem(parseWav(new TextEncoder().encode('no soy audio')))).toMatch(/no es un WAV/);
    const stereo = encodeWav(new Float32Array(8000));
    new DataView(stereo.buffer).setUint16(22, 2, true);
    expect(asteriskWavProblem(parseWav(stereo))).toMatch(/mono/);
    const hifi = encodeWav(new Float32Array(44100), 44100);
    expect(asteriskWavProblem(parseWav(hifi))).toMatch(/8000 Hz/);
    expect(asteriskWavProblem(parseWav(encodeWav(new Float32Array(100))))).toMatch(/corto/);
  });

  it('nombres de archivo seguros y únicos', () => {
    expect(promptFilename('Bienvenida — Ventas Ñandú', 'cmf1abc2def3ghi4')).toBe('bienvenida_ventas_nandu_def3ghi4');
    expect(promptFilename('../../etc', 'x1')).toBe('etc_x1');
  });
});
