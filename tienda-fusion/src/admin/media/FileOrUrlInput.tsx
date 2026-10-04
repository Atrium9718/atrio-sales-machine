import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';

const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Se llama con el nombre del archivo elegido (para sugerir el nombre del recurso) */
  onFileName?: (name: string) => void;
  className?: string;
}

/**
 * Campo para registrar un recurso por URL pública o subiendo un archivo desde el equipo.
 * El archivo se envía como data URI y el servidor lo guarda en la base de datos.
 */
export default function FileOrUrlInput({ value, onChange, onFileName, className = '' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isFile = value.startsWith('data:');

  const handleFile = (file?: File) => {
    setError(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError('El archivo supera el límite de 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange(String(reader.result || ''));
      setFileName(file.name);
      onFileName?.(file.name.replace(/\.[^.]+$/, ''));
    };
    reader.onerror = () => setError('No se pudo leer el archivo.');
    reader.readAsDataURL(file);
  };

  const clear = () => {
    onChange('');
    setFileName(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        {isFile ? (
          <div className={`flex-1 flex items-center justify-between gap-2 px-3.5 py-2.5 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 font-bold ${className}`}>
            <span className="truncate">{fileName || 'Archivo seleccionado'}</span>
            <button type="button" onClick={clear} className="text-teal-700 hover:text-teal-900" title="Quitar archivo">
              <X size={14} />
            </button>
          </div>
        ) : (
          <input
            type="url"
            required
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... o sube un archivo"
            className={`flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs ${className}`}
          />
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
        >
          <Upload size={14} /> Subir
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml,application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {error && <p className="text-[11px] text-red-600 font-bold">{error}</p>}
      <p className="text-[10px] text-slate-400">PNG, JPG, WebP, AVIF, GIF, SVG o PDF · máx. 10 MB</p>
    </div>
  );
}
