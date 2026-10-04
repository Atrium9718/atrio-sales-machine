import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  FileArchive, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  FileCode
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { listGoogleDriveFiles, DriveFile } from '../lib/googleDrive';

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (file: DriveFile) => void;
  title?: string;
  subtitle?: string;
  filterGraphicFiles?: boolean;
}

export default function GoogleDrivePickerModal({
  isOpen,
  onClose,
  onSelectFile,
  title = "Seleccionar Archivo de Impresión de Google Drive",
  subtitle = "Importa directamente tus artes, PDFs, diseños o paquetes ZIP desde tu nube de Google",
  filterGraphicFiles = true,
}: GoogleDrivePickerModalProps) {
  const { user, driveAccessToken, login, loading: authLoading } = useAuth();
  
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [onlyPrintFiles, setOnlyPrintFiles] = useState<boolean>(filterGraphicFiles);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && driveAccessToken) {
      loadFiles();
    }
  }, [isOpen, driveAccessToken, onlyPrintFiles]);

  const loadFiles = async (query = searchQuery) => {
    if (!driveAccessToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listGoogleDriveFiles(driveAccessToken, {
        searchQuery: query,
        filterGraphicFilesOnly: onlyPrintFiles,
      });
      setFiles(result.files);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al conectar con Google Drive. Es posible que el token haya expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadFiles(searchQuery);
  };

  const handleConnectGoogle = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const token = await login({ withDrive: true });
      if (token) {
        // Files will load via useEffect when driveAccessToken changes
      }
    } catch (err: any) {
      setError('No se pudo completar la conexión con Google. Inténtalo nuevamente.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedFile) {
      onSelectFile(selectedFile);
      onClose();
    }
  };

  const getFileIcon = (file: DriveFile) => {
    if (file.mimeType.includes('pdf')) {
      return <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">PDF</div>;
    }
    if (file.mimeType.includes('image')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <ImageIcon size={20} />
        </div>
      );
    }
    if (file.mimeType.includes('zip') || file.name.endsWith('.zip') || file.name.endsWith('.rar')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
          <FileArchive size={20} />
        </div>
      );
    }
    if (file.name.endsWith('.ai') || file.name.endsWith('.psd') || file.name.endsWith('.eps')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-[11px]">
          {file.name.split('.').pop()?.toUpperCase()}
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
        <FileText size={20} />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0 shadow-xs">
              <svg viewBox="0 0 87.3 78" className="w-6 h-6">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#26842a"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* NOT CONNECTED STATE */}
        {!driveAccessToken ? (
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center my-auto">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 shadow-xs">
              <HardDrive size={32} />
            </div>
            <h4 className="text-xl font-extrabold text-slate-900 mb-2">Conectar con Google Drive</h4>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
              Inicia sesión con tu cuenta de Google para acceder a tus archivos de alta resolución (PDF, AI, PSD, TIFF o ZIP) y adjuntarlos a tus órdenes de producción litográfica.
            </p>

            <button
              onClick={handleConnectGoogle}
              disabled={isAuthenticating}
              className="inline-flex items-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-6 py-3.5 rounded-full shadow-sm hover:shadow transition-all active:scale-95 text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>{isAuthenticating ? 'Conectando con Google...' : 'Autorizar Google Drive'}</span>
            </button>

            <div className="flex items-center gap-2 mt-6 text-xs text-slate-400">
              <ShieldCheck size={14} className="text-teal-600" />
              <span>Conexión segura oficial mediante Google OAuth</span>
            </div>
          </div>
        ) : (
          /* CONNECTED STATE - FILE BROWSER */
          <div className="flex-1 flex flex-col min-h-0">
            
            {/* SEARCH & FILTER BAR */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center gap-3">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre de archivo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-24 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors"
                >
                  Buscar
                </button>
              </form>

              <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyPrintFiles(!onlyPrintFiles)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap ${
                    onlyPrintFiles
                      ? 'bg-teal-50 border-teal-200 text-teal-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {onlyPrintFiles ? '✓ Solo Artes de Impresión' : 'Todos los archivos'}
                </button>

                <button
                  type="button"
                  onClick={() => loadFiles()}
                  title="Refrescar lista"
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors shrink-0"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin text-teal-600' : ''} />
                </button>
              </div>
            </div>

            {/* ERROR NOTICE */}
            {error && (
              <div className="p-4 mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-red-700">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={handleConnectGoogle}
                  className="font-bold underline text-red-800 hover:text-red-900 shrink-0"
                >
                  Reconectar
                </button>
              </div>
            )}

            {/* FILES LIST */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[380px]">
              {loading && files.length === 0 ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw size={24} className="animate-spin text-teal-600" />
                  <p className="text-xs font-medium">Consultando archivos en tu Google Drive...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <FileText size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold text-slate-600">No se encontraron archivos</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {searchQuery ? `Sin resultados para "${searchQuery}"` : 'Sube tus archivos a Google Drive o cambia el filtro.'}
                  </p>
                </div>
              ) : (
                files.map((file) => {
                  const isSelected = selectedFile?.id === file.id;
                  return (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20'
                          : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getFileIcon(file)}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                            <span>{file.size}</span>
                            {file.modifiedTime && (
                              <>
                                <span>•</span>
                                <span>{file.modifiedTime}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Ver en Google Drive"
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}

                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-teal-600 text-white'
                            : 'border-2 border-slate-200 text-transparent'
                        }`}>
                          <Check size={13} className="stroke-[3]" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 truncate">
                {selectedFile ? (
                  <span className="flex items-center gap-1.5 text-teal-700 font-bold">
                    <CheckCircle2 size={15} />
                    Seleccionado: <span className="underline truncate max-w-[200px]">{selectedFile.name}</span>
                  </span>
                ) : (
                  <span>Selecciona un archivo de la lista</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSelection}
                  disabled={!selectedFile}
                  className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:hover:bg-teal-600 text-white rounded-xl shadow-xs transition-all active:scale-95 hover:text-neutral-950"
                >
                  Adjuntar Archivo
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
