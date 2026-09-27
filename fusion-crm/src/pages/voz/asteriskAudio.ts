import { ASTERISK_SAMPLE_RATE, encodeWav } from '../../../packages/core/src/voice/wav';

/**
 * Convierte cualquier audio que entienda el navegador (grabación del micrófono, mp3, m4a, wav…)
 * al formato que reproduce Asterisk: WAV PCM 16 bits, 8000 Hz, mono. Normaliza el volumen y
 * recorta el silencio del principio y del final.
 */
export async function toAsteriskWav(blob: Blob): Promise<{ wav: Blob; seconds: number }> {
  const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw new Error('No se pudo leer el audio. Prueba con un archivo MP3 o WAV.');
  } finally {
    ctx.close().catch(() => {});
  }
  const length = Math.max(1, Math.ceil(decoded.duration * ASTERISK_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, length, ASTERISK_SAMPLE_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination); // varios canales se mezclan en uno
  src.start();
  const rendered = await offline.startRendering();
  let samples = rendered.getChannelData(0);

  // Recortar silencio (umbral bajo) dejando un pequeño margen
  const threshold = 0.01;
  let start = 0;
  let end = samples.length;
  while (start < end && Math.abs(samples[start]) < threshold) start++;
  while (end > start && Math.abs(samples[end - 1]) < threshold) end--;
  const margin = Math.round(ASTERISK_SAMPLE_RATE * 0.15);
  samples = samples.slice(Math.max(0, start - margin), Math.min(samples.length, end + margin));
  if (samples.length < ASTERISK_SAMPLE_RATE * 0.3) throw new Error('El audio está vacío o casi no se oye.');

  // Normalizar al 90 % del máximo
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) {
    const gain = Math.min(8, 0.9 / peak);
    samples = samples.map((v) => v * gain);
  }
  const bytes = encodeWav(samples, ASTERISK_SAMPLE_RATE);
  return { wav: new Blob([bytes], { type: 'audio/wav' }), seconds: samples.length / ASTERISK_SAMPLE_RATE };
}

export const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]+,/, ''));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
