import React, { useState, useEffect } from 'react';
import FileOrUrlInput from './FileOrUrlInput';
import { MediaAsset, MediaFolder } from '../../types/media';
import { 
  Image as ImageIcon, 
  UploadCloud, 
  Search, 
  Sparkles, 
  Check, 
  X, 
  Folder, 
  Layers, 
  FileCheck,
  Package,
  FileText,
  BookOpen,
  Shield,
  Loader2
} from 'lucide-react';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (assetUrl: string, asset?: MediaAsset) => void;
  initialFolder?: MediaFolder;
  title?: string;
}

export default function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  initialFolder,
  title = 'Biblioteca Multimedia'
}: MediaPickerModalProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string>(initialFolder || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'ai'>('library');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Quick upload state
  const [uploadName, setUploadName] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadFolder, setUploadFolder] = useState<MediaFolder>(initialFolder || 'general');
  const [uploading, setUploading] = useState(false);

  // Quick AI Generate state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiPreset, setAiPreset] = useState('CAJA_PLEGADIZA');
  const [generatingAi, setGeneratingAi] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen, selectedFolder]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const folderParam = selectedFolder !== 'all' ? `?folder=${selectedFolder}` : '';
      const res = await fetch(`/api/media${folderParam}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (err) {
      console.warn('Error loading media assets:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredAssets = assets.filter(a => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q));
  });

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  const handleQuickUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim()) return;

    setUploading(true);
    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadName.trim() || 'Imagen ' + uploadFolder,
          folder: uploadFolder,
          url: uploadUrl.trim(),
          format: 'webp',
          originalSizeBytes: 1800000,
          dpi: 300,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.asset) {
          setAssets(prev => [result.asset, ...prev]);
          setSelectedAssetId(result.asset.id);
          setActiveTab('library');
          setUploadUrl('');
          setUploadName('');
        }
      }
    } catch (err) {
      console.error('Error uploading media:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleQuickAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const enriched = `Litografía prémium render 300 DPI, ${aiPreset}: ${aiPrompt}. Fotografía de estudio comercial, ultra nítido.`;
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enriched,
          aspectRatio: '1:1',
          productContext: aiPreset,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const generatedUrl = data.imageUrl || data.fallbackUrl;

        // Save directly to media library
        const saveRes = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Render IA: ${aiPrompt.slice(0, 30)}`,
            folder: (initialFolder as MediaFolder) || 'empaques',
            url: generatedUrl,
            format: 'webp',
            isAiGenerated: true,
            aiPrompt: aiPrompt,
            originalSizeBytes: 2200000,
            dpi: 300,
          }),
        });

        if (saveRes.ok) {
          const saveResult = await saveRes.json();
          if (saveResult.asset) {
            setAssets(prev => [saveResult.asset, ...prev]);
            setSelectedAssetId(saveResult.asset.id);
            setActiveTab('library');
          }
        }
      }
    } catch (err) {
      console.error('Error generating AI image:', err);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedAsset) {
      onSelect(selectedAsset.webpUrl || selectedAsset.url, selectedAsset);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] max-h-[750px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600/10 text-teal-600 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">{title}</h2>
              <p className="text-xs text-slate-500 font-medium">
                Imágenes optimizadas en WebP/AVIF con compresión de alta velocidad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Tabs */}
            <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-bold text-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'library' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Explorar Biblioteca
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5 text-teal-600" />
                Subir Nueva
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'ai' ? 'bg-teal-600 text-white shadow-xs' : 'text-teal-700 hover:text-teal-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Crear con IA
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'library' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Folder Sidebar */}
              <div className="w-full md:w-56 border-r border-slate-100 bg-slate-50/40 p-4 space-y-1 overflow-y-auto shrink-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-2 mb-2">
                  Carpetas
                </p>
                {[
                  { id: 'all', name: 'Todos los Archivos', icon: Folder },
                  { id: 'banners', name: 'Banners & Portadas', icon: ImageIcon },
                  { id: 'empaques', name: 'Empaques & Cajas', icon: Package },
                  { id: 'papeleria', name: 'Papelería Comercial', icon: FileText },
                  { id: 'editorial', name: 'Editorial & Libros', icon: BookOpen },
                  { id: 'logotipos', name: 'Logotipos & Marcas', icon: Shield },
                  { id: 'iconos', name: 'Iconos & Sellos', icon: Sparkles },
                  { id: 'general', name: 'General', icon: Layers },
                ].map(folder => {
                  const Icon = folder.icon;
                  const isSelected = selectedFolder === folder.id;
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => setSelectedFolder(folder.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{folder.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Assets Grid */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {/* Search Bar */}
                <div className="p-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre, etiqueta o formato..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                    {filteredAssets.length} archivos
                  </span>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                  {loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                      <span className="text-xs font-medium">Cargando biblioteca multimedia...</span>
                    </div>
                  ) : filteredAssets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 text-center p-8">
                      <ImageIcon className="w-12 h-12 text-slate-300 stroke-[1.5]" />
                      <p className="text-xs font-bold text-slate-600">No se encontraron archivos multimedia</p>
                      <p className="text-[11px] text-slate-400 max-w-xs">
                        Sube una imagen nueva o genera un mockup fotorrealista con Gemini IA.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {filteredAssets.map(asset => {
                        const isSelected = selectedAssetId === asset.id;
                        return (
                          <div
                            key={asset.id}
                            onClick={() => setSelectedAssetId(asset.id)}
                            className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all ${
                              isSelected
                                ? 'border-teal-600 ring-2 ring-teal-600 ring-offset-2 shadow-md'
                                : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                            }`}
                          >
                            <div className="aspect-square bg-slate-100 relative overflow-hidden">
                              <img
                                src={asset.thumbnailUrl || asset.url}
                                alt={asset.altText}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />

                              {/* Badges */}
                              <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-900/80 text-white text-[9px] font-black uppercase tracking-wider backdrop-blur-xs">
                                  {asset.format}
                                </span>
                                {asset.savingsPercentage > 0 && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-600/90 text-white text-[9px] font-bold shadow-xs">
                                    -{Math.round(asset.savingsPercentage)}%
                                  </span>
                                )}
                              </div>

                              {asset.isAiGenerated && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs">
                                  <Sparkles className="w-3 h-3" />
                                </div>
                              )}

                              {isSelected && (
                                <div className="absolute inset-0 bg-teal-600/20 backdrop-blur-[1px] flex items-center justify-center">
                                  <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-lg">
                                    <Check className="w-4 h-4 stroke-[3]" />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="p-2 bg-white">
                              <p className="text-[11px] font-bold text-slate-800 truncate" title={asset.name}>
                                {asset.name}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                                <span>{asset.dimensions.width}×{asset.dimensions.height}</span>
                                <span>{Math.round(asset.optimizedSizeBytes / 1024)} KB</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="flex-1 p-6 max-w-xl mx-auto w-full flex flex-col justify-center">
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Subir y Optimizar a WebP / AVIF</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    El sistema transformará automáticamente el archivo a formatos ligeros de alta resolución (300 DPI) con reducción de hasta 85% de peso.
                  </p>
                </div>

                <form onSubmit={handleQuickUpload} className="space-y-3 text-left pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre o Título del Archivo</label>
                    <input
                      type="text"
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      placeholder="Ej: Portada Catálogo 2026 Offset"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Imagen o archivo *</label>
                    <FileOrUrlInput
                      value={uploadUrl}
                      onChange={setUploadUrl}
                      onFileName={(n) => { if (!uploadName.trim()) setUploadName(n); }}
                      className="bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Carpeta de Destino</label>
                    <select
                      value={uploadFolder}
                      onChange={(e) => setUploadFolder(e.target.value as MediaFolder)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="banners">Banners & Portadas</option>
                      <option value="empaques">Empaques & Cajas</option>
                      <option value="papeleria">Papelería Comercial</option>
                      <option value="editorial">Editorial & Libros</option>
                      <option value="logotipos">Logotipos & Marcas</option>
                      <option value="iconos">Iconos & Sellos</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading || !uploadUrl.trim()}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 mt-4"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                    {uploading ? 'Convirtiendo y Guardando...' : 'Optimizar y Guardar en Biblioteca'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="flex-1 p-6 max-w-xl mx-auto w-full flex flex-col justify-center space-y-4">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-[11px] font-black tracking-wider uppercase mb-1">
                  <Sparkles className="w-3 h-3" />
                  Gemini Imagen & Flux Engine
                </div>
                <h3 className="text-sm font-black text-slate-800">Generar Render de Producto con IA</h3>
                <p className="text-xs text-slate-500">
                  Crea renders fotorrealistas de cajas, libros, tarjetas y empaques en 300 DPI y agrégalos a tu biblioteca.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Producto Litográfico</label>
                  <select
                    value={aiPreset}
                    onChange={(e) => setAiPreset(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="CAJA_PLEGADIZA">Caja Plegadiza Cosmética con Acabado UV</option>
                    <option value="TARJETA_FOIL">Tarjetas de Presentación con Foil Dorado</option>
                    <option value="LIBRO_EDITORIAL">Libro Tapa Dura con Lomo Cuadrado</option>
                    <option value="BOLSA_KRAFT">Bolsa Boutique de Papel Kraft Ecológico</option>
                    <option value="FOLLETO_FLYER">Folleto Tríptico Publicitario Full Color</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Prompt Detallado</label>
                  <textarea
                    rows={3}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ej: Caja de lujo para perfumes con diseño botánico verde y estampado metalizado oro sobre fondo blanco de estudio..."
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleQuickAiGenerate}
                  disabled={generatingAi || !aiPrompt.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                >
                  {generatingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generatingAi ? 'Generando Render Litográfico HD...' : 'Generar y Guardar en la Biblioteca'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedAsset ? (
              <span className="font-medium text-slate-800">
                Seleccionado: <strong className="text-teal-700">{selectedAsset.name}</strong> ({selectedAsset.dimensions.width}×{selectedAsset.dimensions.height}px, {selectedAsset.format.toUpperCase()})
              </span>
            ) : (
              <span>Haz clic sobre una imagen para seleccionarla.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmSelection}
              disabled={!selectedAsset}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Usar Esta Imagen
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
