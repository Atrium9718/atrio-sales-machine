/**
 * Audio para Asterisk: WAV PCM de 16 bits, 8000 Hz, mono (el formato "wav" nativo de la central).
 * El navegador convierte cualquier grabación o archivo a este formato antes de subirlo y el
 * servidor lo verifica antes de guardarlo.
 */

export const ASTERISK_SAMPLE_RATE = 8000;
export const MAX_PROMPT_SECONDS = 180;

export interface WavInfo {
  audioFormat: number;
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  dataBytes: number;
  durationSeconds: number;
}

/** Lee la cabecera de un WAV (RIFF). Devuelve null si no es un WAV válido. */
export function parseWav(buf: Uint8Array): WavInfo | null {
  if (buf.length < 44) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const tag = (o: number) => String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
  let offset = 12;
  let fmt: Omit<WavInfo, 'dataBytes' | 'durationSeconds'> | null = null;
  while (offset + 8 <= buf.length) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ' && body + 16 <= buf.length) {
      fmt = {
        audioFormat: view.getUint16(body, true),
        channels: view.getUint16(body + 2, true),
        sampleRate: view.getUint32(body + 4, true),
        bitsPerSample: view.getUint16(body + 14, true),
      };
    } else if (id === 'data' && fmt) {
      const dataBytes = Math.min(size, buf.length - body);
      const bytesPerSecond = fmt.sampleRate * fmt.channels * (fmt.bitsPerSample / 8);
      return { ...fmt, dataBytes, durationSeconds: bytesPerSecond ? dataBytes / bytesPerSecond : 0 };
    }
    offset = body + size + (size % 2);
  }
  return null;
}

/** Motivo por el que el audio no sirve para Asterisk, o null si está bien. */
export function asteriskWavProblem(info: WavInfo | null): string | null {
  if (!info) return 'El archivo no es un WAV válido.';
  if (info.audioFormat !== 1 || info.bitsPerSample !== 16) return 'El audio debe ser PCM de 16 bits.';
  if (info.channels !== 1) return 'El audio debe ser mono (un canal).';
  if (info.sampleRate !== ASTERISK_SAMPLE_RATE) return 'El audio debe estar a 8000 Hz.';
  if (info.durationSeconds < 0.3) return 'El audio está vacío o es demasiado corto.';
  if (info.durationSeconds > MAX_PROMPT_SECONDS) return `El audio no puede durar más de ${MAX_PROMPT_SECONDS / 60} minutos.`;
  return null;
}

/** Codifica muestras (-1…1, mono) como WAV PCM de 16 bits. */
export function encodeWav(samples: Float32Array, sampleRate = ASTERISK_SAMPLE_RATE): Uint8Array {
  const out = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(out.buffer);
  const write = (o: number, s: string) => [...s].forEach((c, i) => (out[o + i] = c.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return out;
}

/** Nombre de archivo seguro para Asterisk a partir del nombre de la locución. */
export function promptFilename(name: string, id: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return `${slug || 'locucion'}_${id.replace(/[^a-z0-9]/gi, '').slice(-8).toLowerCase()}`;
}
