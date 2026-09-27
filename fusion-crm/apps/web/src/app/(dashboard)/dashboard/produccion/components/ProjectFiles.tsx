import React, { useRef } from 'react';
import { FileImage, Trash2, ExternalLink, UploadCloud } from 'lucide-react';
import { fileUrl, formatSize, type FileRef } from '@/lib/files';

interface Props {
  files: FileRef[];
  /** Nombres de archivos antiguos (antes solo se guardaba el nombre, sin enlace). */
  legacyNames?: string[];
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onRemove: (key: string) => void;
  buttonLabel?: string;
  compact?: boolean;
}

/** Lista de archivos de un pedido con subir, abrir y quitar. */
export function ProjectFiles({ files, legacyNames = [], uploading, onUpload, onRemove, buttonLabel = 'Subir archivo', compact }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const legacy = legacyNames.filter((n) => !files.some((f) => f.name === n));
  return (
    <div className="space-y-2">
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const list = Array.from(e.target.files || []);
          e.target.value = '';
          if (list.length) onUpload(list);
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          input.current?.click();
        }}
        className={`${compact ? 'text-xs font-bold text-primary hover:underline' : 'px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md flex items-center gap-1'} disabled:opacity-50`}
      >
        {!compact && <UploadCloud className="w-3.5 h-3.5" />}
        {uploading ? 'Subiendo…' : buttonLabel}
      </button>
      {(files.length > 0 || legacy.length > 0) && (
        <div className="space-y-1">
          {files.map((f) => (
            <div key={f.id} className={`flex items-center justify-between gap-2 ${compact ? 'text-xs px-2 py-1' : 'text-sm p-2.5'} border border-border rounded-md bg-background`}>
              <a href={fileUrl(f)} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 hover:underline" title="Abrir">
                <FileImage className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="truncate font-medium">{f.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">({formatSize(f.size)})</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
              </a>
              <button type="button" onClick={() => confirm(`¿Quitar "${f.name}" del pedido? (el archivo sigue guardado en Drive)`) && onRemove(f.id)} className="text-muted-foreground hover:text-red-500" title="Quitar">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {legacy.map((n) => (
            <div key={n} className={`flex items-center justify-between gap-2 ${compact ? 'text-xs px-2 py-1' : 'text-sm p-2.5'} border border-dashed border-border rounded-md`}>
              <span className="truncate text-muted-foreground" title="Subido antes de la actualización: sin enlace en la app">
                {n.replace(/^\/mock-folder\//, '')} (sin enlace)
              </span>
              <button type="button" onClick={() => onRemove(n)} className="text-muted-foreground hover:text-red-500" title="Quitar">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
