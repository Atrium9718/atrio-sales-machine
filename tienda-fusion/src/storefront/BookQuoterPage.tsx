import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Layers, 
  Ruler, 
  Printer, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Scale, 
  Download, 
  ShoppingBag, 
  ChevronRight, 
  HelpCircle, 
  FileText,
  Bookmark,
  Sliders,
  Share2,
  Info,
  UploadCloud,
  FileCheck,
  Languages,
  PenTool,
  Palette,
  Mic,
  FileSpreadsheet,
  X,
  AlertCircle
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import GoogleDrivePickerModal from '../components/GoogleDrivePickerModal';
import { DriveFile } from '../lib/googleDrive';


interface BookQuoteResponse {
  subtotal_neto: number;
  subtotal_impresion?: number;
  subtotal_editorial?: number;
  editorial_breakdown?: { service: string; cost: number }[];
  iva_cop: number;
  total_cop: number;
  unit_price_neto: number;
  unit_price_total: number;
  discount_applied: {
    percentage: number;
    amount_saved: number;
  };
  specs_technical: {
    pages: number;
    quantity: number;
    format_name: string;
    closed_dimensions: string;
    spine_thickness_mm: number;
    open_cover_dimensions: string;
    flaps_width_cm: number;
    signatures_count: number;
    single_book_weight_grams: number;
    total_weight_kg: number;
    production_lead_time_days: number;
  };
}

export default function BookQuoterPage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form parameters
  const [quantity, setQuantity] = useState<number>(100);
  const [pages, setPages] = useState<number>(128);
  const [format, setFormat] = useState<string>('media_carta');
  const [customWidth, setCustomWidth] = useState<number>(140);
  const [customHeight, setCustomHeight] = useState<number>(215);

  const [innerPaper, setInnerPaper] = useState<string>('bond_75');
  const [innerInks, setInnerInks] = useState<string>('1x1');

  const [bindingType, setBindingType] = useState<string>('rustica_cosida');
  const [coverPaper, setCoverPaper] = useState<string>('propalcote_300');
  const [coverInks, setCoverInks] = useState<string>('4x0');
  const [coverFinish, setCoverFinish] = useState<string>('mate');
  const [flaps, setFlaps] = useState<string>('solapa_7cm');
  const [specialFinishes, setSpecialFinishes] = useState<string[]>(['reserva_uv']);

  // Editorial Professional Services state
  const [hasMaquetacion, setHasMaquetacion] = useState<boolean>(false);
  const [hasDisenoPortada, setHasDisenoPortada] = useState<boolean>(false);
  const [hasCorreccionEstilo, setHasCorreccionEstilo] = useState<boolean>(false);
  const [hasTranscripcion, setHasTranscripcion] = useState<boolean>(false);
  const [transcripcionPages, setTranscripcionPages] = useState<number>(50);
  const [hasTraduccion, setHasTraduccion] = useState<boolean>(false);
  const [traduccionLanguage, setTraduccionLanguage] = useState<string>('Inglés');

  // Book manuscript / artwork file upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [driveFile, setDriveFile] = useState<DriveFile | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);


  const [quote, setQuote] = useState<BookQuoteResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [addedToast, setAddedToast] = useState(false);

  // Parámetros de la cotización (también viajan al carrito para que el servidor recalcule el precio)
  const buildBookParams = () => ({
    quantity,
    pages,
    format,
    customWidthMm: customWidth,
    customHeightMm: customHeight,
    innerPaper,
    innerInks,
    coverPaper: bindingType === 'tapa_dura' ? 'tapa_dura' : coverPaper,
    coverInks,
    coverFinish,
    specialFinishes,
    bindingType,
    flaps: bindingType === 'tapa_dura' ? 'sin_solapa' : flaps,
    editorialServices: {
      maquetacion: hasMaquetacion,
      disenoPortada: hasDisenoPortada,
      correccionEstilo: hasCorreccionEstilo,
      transcripcion: hasTranscripcion,
      transcripcionPages: transcripcionPages,
      traduccion: hasTraduccion,
      traduccionLanguage: traduccionLanguage
    }
  });

  // Calculate live quote
  const fetchQuote = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pricing/quote-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBookParams()),
      });

      if (res.ok) {
        const data = await res.json();
        setQuote(data);
      }
    } catch (err) {
      console.error('Error fetching book quote:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote();
    }, 250);
    return () => clearTimeout(timer);
  }, [
    quantity, 
    pages, 
    format, 
    customWidth, 
    customHeight, 
    innerPaper, 
    innerInks, 
    bindingType, 
    coverPaper, 
    coverInks, 
    coverFinish, 
    flaps, 
    specialFinishes,
    hasMaquetacion,
    hasDisenoPortada,
    hasCorreccionEstilo,
    hasTranscripcion,
    transcripcionPages,
    hasTraduccion,
    traduccionLanguage
  ]);

  const toggleSpecialFinish = (fin: string) => {
    setSpecialFinishes(prev => 
      prev.includes(fin) ? prev.filter(f => f !== fin) : [...prev, fin]
    );
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = () => {
    setUploadedFile(null);
    setDriveFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectDriveFile = (file: DriveFile) => {
    setDriveFile(file);
    setUploadedFile(null);
  };

  const handleAddToCart = () => {
    if (!quote) return;

    const activeEditorialList: string[] = [];
    if (hasMaquetacion) activeEditorialList.push('Maquetación');
    if (hasDisenoPortada) activeEditorialList.push('Diseño Portada');
    if (hasCorreccionEstilo) activeEditorialList.push('Corrección Estilo');
    if (hasTranscripcion) activeEditorialList.push(`Transcripción (${transcripcionPages} págs)`);
    if (hasTraduccion) activeEditorialList.push(`Traducción (${traduccionLanguage})`);

    const editorialText = activeEditorialList.length > 0 
      ? ` | Servicios Editoriales: ${activeEditorialList.join(', ')}`
      : '';

    const specsText = `Libro ${quote.specs_technical.closed_dimensions} | ${pages} págs | ${innerPaper} (${innerInks}) | ${bindingType} | Lomo ${quote.specs_technical.spine_thickness_mm}mm | ${coverFinish}${editorialText}`;

    const designLabel = driveFile 
      ? `Google Drive: ${driveFile.name}`
      : uploadedFile 
        ? `Archivo subido: ${uploadedFile.name}`
        : (activeEditorialList.length > 0 ? 'Con Servicios Editoriales Integrales' : 'Cotización Editorial Calculada en Línea');

    addToCart({
      productId: 9999, // Editorial Custom
      name: `Libro / Publicación Editorial (${pages} págs - Tiraje ${quantity}u)`,
      options: specsText,
      quantity: quantity,
      price: quote.subtotal_neto,
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      design: designLabel,
      file: uploadedFile || undefined,
      driveFile: driveFile || undefined,
      canvasData: null,
      pricing: { kind: 'book', params: buildBookParams() },
    });

    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
      navigate('/carrito');
    }, 1500);
  };


  const generateWhatsAppInquiry = () => {
    if (!quote) return;

    const activeEditorialList: string[] = [];
    if (hasMaquetacion) activeEditorialList.push('• Maquetación y Diagramación');
    if (hasDisenoPortada) activeEditorialList.push('• Diseño de Portada Integral');
    if (hasCorreccionEstilo) activeEditorialList.push('• Corrección de Estilo');
    if (hasTranscripcion) activeEditorialList.push(`• Transcripción (${transcripcionPages} páginas)`);
    if (hasTraduccion) activeEditorialList.push(`• Traducción profesional a ${traduccionLanguage}`);

    const editorialSection = activeEditorialList.length > 0 
      ? `\n✍️ *Servicios Editoriales Requeridos:*\n${activeEditorialList.join('\n')}\n`
      : '';

    const fileStatus = uploadedFile ? `\n📎 *Archivo listo para revisión:* ${uploadedFile.name}` : '';

    const text = encodeURIComponent(
      `Hola Litografía Fusión, quiero confirmar esta cotización de libros:\n` +
      `📖 *Libro Editorial:* ${quote.specs_technical.closed_dimensions}\n` +
      `📄 *Páginas:* ${pages} interiores (${innerPaper}, ${innerInks})\n` +
      `📏 *Lomo calculado:* ${quote.specs_technical.spine_thickness_mm} mm\n` +
      `📚 *Encuadernación:* ${bindingType}\n` +
      `✨ *Acabados:* ${coverFinish}, ${specialFinishes.join(', ') || 'sin especiales'}\n` +
      `📦 *Tiraje:* ${quantity} unidades\n` +
      editorialSection +
      fileStatus +
      `\n💰 *Total Inversión:* ${formatCOP(quote.total_cop)} (IVA incl.)\n` +
      `¿Podemos revisar los detalles técnicos y tiempos de entrega?`
    );
    window.open(`https://wa.me/573001234567?text=${text}`, '_blank');
  };

  const selectedEditorialCount = [hasMaquetacion, hasDisenoPortada, hasCorreccionEstilo, hasTranscripcion, hasTraduccion].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10 px-3 sm:px-6 lg:px-8 pb-32 lg:pb-12">
      
      {/* Toast */}
      {addedToast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={20} className="text-teal-400" />
          <span className="text-xs font-bold">¡Libro y servicios agregados al carrito con éxito!</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Breadcrumb & Header */}
        <div>
          <nav className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
            <Link to="/" className="hover:text-teal-600">Inicio</Link>
            <span>&rsaquo;</span>
            <Link to="/categoria/todas" className="hover:text-teal-600">Catálogo</Link>
            <span>&rsaquo;</span>
            <span className="text-slate-900 font-bold">Cotizador Litográfico & Editorial de Libros</span>
          </nav>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <BookOpen className="text-teal-600" size={36} />
                Cotizador Editorial de Libros & Publicaciones
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-3xl font-medium">
                Calcula la producción litográfica completa (papel, lomo milimétrico, tapas y encuadernación) e integra servicios profesionales de maquetación, diseño de portada, corrección de estilo, transcripción y traducción.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <Sparkles size={14} /> Cálculo Matemático en Vivo
              </span>
            </div>
          </div>
        </div>

        {/* 2 COLUMNS: CONFIGURATOR (LEFT) vs BLUEPRINT & QUOTE (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: FORM CONTROLS (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. FORMATO Y PÁGINAS */}
            <div className="bg-white p-6 sm:p-7 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl font-bold text-xs">01</div>
                <h3 className="font-black text-slate-900 text-base">Formato y Extensión (Páginas)</h3>
              </div>

              {/* Formato Grid */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2.5">
                  Tamaño / Formato Cerrado del Libro:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'media_carta', label: 'Media Carta', size: '14 x 21.5 cm', tag: 'Más popular' },
                    { id: 'bolsillo', label: 'Novela / Bolsillo', size: '12.5 x 19 cm', tag: 'Literatura' },
                    { id: 'carta', label: 'Carta Completa', size: '21.5 x 28 cm', tag: 'Manual / Texto' },
                    { id: 'a5', label: 'Norma A5', size: '14.8 x 21 cm', tag: 'Estándar ISO' },
                    { id: 'a4', label: 'Norma A4', size: '21 x 29.7 cm', tag: 'Catálogos' },
                    { id: 'cuadrado', label: 'Cuadrado', size: '20 x 20 cm', tag: 'Fotolibro' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setFormat(fmt.id)}
                      className={`p-3 rounded-2xl border text-left transition-all relative ${
                        format === fmt.id
                          ? 'border-teal-500 bg-teal-50/70 text-slate-900 ring-2 ring-teal-400'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'
                      }`}
                    >
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md block w-fit mb-1">
                        {fmt.tag}
                      </span>
                      <p className="font-black text-xs text-slate-900">{fmt.label}</p>
                      <p className="text-[11px] text-slate-500 font-semibold">{fmt.size}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Páginas interiores Slider & Input */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText size={14} className="text-teal-600" />
                    Número Total de Páginas Interiores (Tripa):
                  </label>
                  <span className="text-xs font-black text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
                    {pages} páginas ({Math.ceil(pages / 2)} hojas)
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input 
                    type="range"
                    min="16"
                    max="600"
                    step="8"
                    value={pages}
                    onChange={(e) => setPages(parseInt(e.target.value))}
                    className="flex-1 accent-teal-500 cursor-pointer"
                  />
                  <input 
                    type="number"
                    min="16"
                    max="1200"
                    step="4"
                    value={pages}
                    onChange={(e) => setPages(Math.max(8, parseInt(e.target.value) || 8))}
                    className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 text-center outline-none focus:border-teal-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  * En litografía las páginas se agrupan en pliegos/cuadernillos de 8 o 16 páginas.
                </p>
              </div>
            </div>

            {/* 2. PAPEL E IMPRESIÓN INTERIOR */}
            <div className="bg-white p-6 sm:p-7 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl font-bold text-xs">02</div>
                <h3 className="font-black text-slate-900 text-base">Papel y Tintas Interiores</h3>
              </div>

              {/* Tipo de Papel */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2.5">
                  Papel para las Páginas Interiores:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'bond_75', label: 'Bond 75g Blanco', desc: 'Económico y ligero para texto / lectura continua' },
                    { id: 'bond_90', label: 'Bond 90g Blanco', desc: 'Mayor opacidad, no transparenta tinta ni resaltador' },
                    { id: 'earth_pact_75', label: 'Ecológico Earth Pact 75g', desc: '100% caña de azúcar, tono marfil amigable a la vista' },
                    { id: 'propalcote_115', label: 'Propalcote Esmaltado 115g', desc: 'Satinado para revistas, catálogos e ilustraciones' },
                    { id: 'propalcote_150', label: 'Propalcote Pesado 150g', desc: 'Alta gama para libros de arte y fotografía' },
                  ].map((pap) => (
                    <label
                      key={pap.id}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                        innerPaper === pap.id
                          ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-400'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="innerPaper" 
                        checked={innerPaper === pap.id} 
                        onChange={() => setInnerPaper(pap.id)}
                        className="mt-0.5 accent-teal-500"
                      />
                      <div>
                        <p className="text-xs font-black text-slate-900">{pap.label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{pap.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tintas Interiores */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2.5">
                  Tintas de Impresión Interior:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: '1x1', label: '1x1 Solo Negro', desc: 'Texto estándar' },
                    { id: '2x2', label: '2x2 Duotono', desc: 'Negro + Pantón' },
                    { id: '4x4', label: '4x4 Full Color', desc: 'Todo color CMYK' },
                  ].map((ink) => (
                    <button
                      key={ink.id}
                      type="button"
                      onClick={() => setInnerInks(ink.id)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        innerInks === ink.id
                          ? 'border-teal-500 bg-teal-50/70 text-slate-900 ring-2 ring-teal-400'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-black text-xs text-slate-900">{ink.label}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">{ink.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. ENCUADERNACIÓN Y CARÁTULA */}
            <div className="bg-white p-6 sm:p-7 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl font-bold text-xs">03</div>
                <h3 className="font-black text-slate-900 text-base">Encuadernación y Acabados de Carátula</h3>
              </div>

              {/* Tipo de Encuadernación */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2.5">
                  Sistema de Encuadernación Litográfica:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'rustica_cosida', label: 'Rústica Cosida y Pegada (Hotmelt/PUR)', desc: 'Máxima durabilidad, los pliegos no se desprenden al abrir', badge: 'Recomendado' },
                    { id: 'tapa_dura', label: 'Tapa Dura Holandesa (Cartón 2mm)', desc: 'Cubierta rígida con guardas interiores y cabezada', badge: 'Premium' },
                    { id: 'rustica_pur', label: 'Rústica Fresada PUR', desc: 'Encolado directo de alta flexibilidad y menor costo', badge: 'Rápido' },
                    { id: 'grapado', label: 'Grapado al Caballete', desc: 'Ideal para revistas o folletos de 8 a 64 páginas', badge: 'Económico' },
                    { id: 'anillado', label: 'Wire-o / Anillado Doble O', desc: 'Apertura de 360° para manuales, agendas y recetarios', badge: 'Cuadernos' },
                  ].map((bind) => (
                    <label
                      key={bind.id}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 relative ${
                        bindingType === bind.id
                          ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-400'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="bindingType" 
                        checked={bindingType === bind.id} 
                        onChange={() => setBindingType(bind.id)}
                        className="mt-0.5 accent-teal-500"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-slate-900">{bind.label}</p>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{bind.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Plastificado y Solapas */}
              {bindingType !== 'tapa_dura' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">Plastificado de Carátula:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'mate', label: 'Mate' },
                        { id: 'brillo', label: 'Brillante' },
                        { id: 'soft_touch', label: 'Soft Touch' },
                      ].map((lam) => (
                        <button
                          key={lam.id}
                          type="button"
                          onClick={() => setCoverFinish(lam.id)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                            coverFinish === lam.id
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {lam.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">Solapas Laterales:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'sin_solapa', label: 'Sin Solapa' },
                        { id: 'solapa_7cm', label: 'Solapas 7 cm' },
                        { id: 'solapa_9cm', label: 'Solapas 9 cm' },
                      ].map((flp) => (
                        <button
                          key={flp.id}
                          type="button"
                          onClick={() => setFlaps(flp.id)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                            flaps === flp.id
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {flp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Acabados Especiales */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 block mb-2.5">
                  Acabados Especiales en Portada:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'reserva_uv', label: 'Reserva UV Brillante' },
                    { id: 'foil_dorado', label: 'Foil Dorado (Oro)' },
                    { id: 'foil_plateado', label: 'Foil Plateado (Plata)' },
                    { id: 'repujado', label: 'Repujado / Relieve' },
                  ].map((sp) => {
                    const isChecked = specialFinishes.includes(sp.id);
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => toggleSpecialFinish(sp.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                          isChecked
                            ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-400'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-[11px]">{sp.label}</span>
                        {isChecked && <CheckCircle2 size={13} className="text-teal-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. SERVICIOS EDITORIALES PROFESIONALES (NUEVO REQUERIMIENTO) */}
            <div className="bg-white p-6 sm:p-7 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs">04</div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Servicios Editoriales Profesionales</h3>
                    <p className="text-xs text-slate-500">Deja tu publicación en manos de editores, correctores y diseñadores certificados</p>
                  </div>
                </div>
                {selectedEditorialCount > 0 && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-black rounded-full">
                    {selectedEditorialCount} {selectedEditorialCount === 1 ? 'servicio' : 'servicios'}
                  </span>
                )}
              </div>

              <div className="space-y-3.5">
                
                {/* 1. Maquetación Editorial */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  hasMaquetacion 
                    ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400' 
                    : 'border-slate-200 bg-white hover:border-indigo-200'
                }`}>
                  <label className="flex items-start gap-3.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={hasMaquetacion}
                      onChange={(e) => setHasMaquetacion(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers size={16} className="text-indigo-600" />
                          <span className="text-xs font-black text-slate-900">Maquetación & Diagramación Interior</span>
                        </div>
                        <span className="text-xs font-black text-indigo-700">
                          {formatCOP(Math.max(150000, pages * (pages > 200 ? 5500 : 7000)))}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Diagramación tipográfica profesional en Adobe InDesign, jerarquía de títulos, capitulares, viudas/huérfanas, numeración, tabla de contenido y preparación para imprenta ({pages} págs).
                      </p>
                    </div>
                  </label>
                </div>

                {/* 2. Diseño de Portada */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  hasDisenoPortada 
                    ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400' 
                    : 'border-slate-200 bg-white hover:border-indigo-200'
                }`}>
                  <label className="flex items-start gap-3.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={hasDisenoPortada}
                      onChange={(e) => setHasDisenoPortada(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Palette size={16} className="text-indigo-600" />
                          <span className="text-xs font-black text-slate-900">Diseño Gráfico de Portada Integral</span>
                        </div>
                        <span className="text-xs font-black text-indigo-700">{formatCOP(220000)}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Diseño conceptual y de impacto comercial para portada delantera, lomo milimétrico según páginas, contraportada con código de barras / ISBN y solapas promocionales.
                      </p>
                    </div>
                  </label>
                </div>

                {/* 3. Corrección de Estilo */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  hasCorreccionEstilo 
                    ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400' 
                    : 'border-slate-200 bg-white hover:border-indigo-200'
                }`}>
                  <label className="flex items-start gap-3.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={hasCorreccionEstilo}
                      onChange={(e) => setHasCorreccionEstilo(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PenTool size={16} className="text-indigo-600" />
                          <span className="text-xs font-black text-slate-900">Corrección de Estilo & Ortotipográfica</span>
                        </div>
                        <span className="text-xs font-black text-indigo-700">
                          {formatCOP(Math.max(120000, pages * 6000))}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Revisión filológica exhaustiva: ortografía, gramática, sintaxis, puntuación, concordancia verbal y unificación de criterios editoriales respetando la voz del autor ({pages} págs).
                      </p>
                    </div>
                  </label>
                </div>

                {/* 4. Transcripción */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  hasTranscripcion 
                    ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400' 
                    : 'border-slate-200 bg-white hover:border-indigo-200'
                }`}>
                  <label className="flex items-start gap-3.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={hasTranscripcion}
                      onChange={(e) => setHasTranscripcion(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mic size={16} className="text-indigo-600" />
                          <span className="text-xs font-black text-slate-900">Transcripción de Manuscritos o Audios</span>
                        </div>
                        <span className="text-xs font-black text-indigo-700">
                          {formatCOP(transcripcionPages * 9500)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Digitalización y digitación literal o depurada desde grabaciones de voz, conferencias, notas manuscritas o documentos físicos escaneados.
                      </p>
                      {hasTranscripcion && (
                        <div className="mt-3 pt-3 border-t border-indigo-200/60 flex items-center justify-between gap-4">
                          <span className="text-xs font-bold text-indigo-950">Páginas o audios estimados a transcribir:</span>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              min="5" 
                              max="1000" 
                              step="5"
                              value={transcripcionPages}
                              onChange={(e) => setTranscripcionPages(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-20 px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-black text-center text-indigo-950 outline-none"
                            />
                            <span className="text-xs text-indigo-800 font-semibold">págs.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {/* 5. Traducción */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  hasTraduccion 
                    ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400' 
                    : 'border-slate-200 bg-white hover:border-indigo-200'
                }`}>
                  <label className="flex items-start gap-3.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={hasTraduccion}
                      onChange={(e) => setHasTraduccion(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Languages size={16} className="text-indigo-600" />
                          <span className="text-xs font-black text-slate-900">Traducción Profesional Especializada</span>
                        </div>
                        <span className="text-xs font-black text-indigo-700">
                          {formatCOP(Math.max(180000, pages * 18000))}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Traducción editorial nativa con adaptación cultural y técnica ({pages} págs).
                      </p>
                      {hasTraduccion && (
                        <div className="mt-3 pt-3 border-t border-indigo-200/60 flex items-center justify-between gap-4">
                          <span className="text-xs font-bold text-indigo-950">Idioma de destino:</span>
                          <select 
                            value={traduccionLanguage}
                            onChange={(e) => setTraduccionLanguage(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-indigo-950 outline-none"
                          >
                            <option value="Inglés">Inglés (US/UK)</option>
                            <option value="Francés">Francés</option>
                            <option value="Portugués">Portugués</option>
                            <option value="Alemán">Alemán</option>
                            <option value="Italiano">Italiano</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

              </div>
            </div>

            {/* 5. SUBIR ARCHIVO DEL LIBRO (NUEVO REQUERIMIENTO) */}
            <div className="bg-white p-6 sm:p-7 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs">05</div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Adjuntar Manuscrito / Archivo del Libro</h3>
                    <p className="text-xs text-slate-500">Puedes subir tu archivo PDF listo para imprenta o documento Word/ZIP para servicio editorial</p>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone & Google Drive */}
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".pdf,.doc,.docx,.zip,.rar,.indd,.ai"
                onChange={handleFileChange}
                className="hidden"
              />

              {!uploadedFile && !driveFile ? (
                <div className="space-y-3">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                      isDragging 
                        ? 'border-teal-500 bg-teal-50/50 scale-[1.01]' 
                        : 'border-slate-200 hover:border-teal-400 bg-slate-50/60 hover:bg-teal-50/20'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-2.5">
                      <UploadCloud size={24} />
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      Haz clic o arrastra tu archivo del libro aquí
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Formatos: PDF (Pre-prensa), Word, InDesign (.indd) o paquete .ZIP
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xs text-slate-400 font-medium">o selecciona desde tu nube:</span>
                    <button
                      type="button"
                      onClick={() => setIsDriveModalOpen(true)}
                      className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-bold px-4 py-2.5 rounded-2xl border border-slate-300 shadow-xs hover:shadow transition-all text-xs"
                    >
                      <svg viewBox="0 0 87.3 78" className="w-4 h-4 shrink-0">
                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#26842a"/>
                        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                      </svg>
                      <span>Abrir Google Drive</span>
                    </button>
                  </div>
                </div>
              ) : driveFile ? (
                <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 87.3 78" className="w-6 h-6">
                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#ffffff"/>
                        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#ffffff"/>
                        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ffffff"/>
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-blue-950 line-clamp-1">{driveFile.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-200/80 text-blue-900 rounded-full">
                          {driveFile.size || 'Google Drive'}
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        Vinculado desde Google Drive (Alta Resolución)
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-colors"
                    title="Remover archivo"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <FileCheck size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-emerald-950 line-clamp-1">{uploadedFile.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200/80 text-emerald-900 rounded-full">
                          {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Archivo cargado listo para vincular a tu orden de producción litográfica
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-colors"
                    title="Remover archivo"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* 6. TIRAJE Y CANTIDAD */}
            <div className="bg-white p-6 sm:p-7 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-xl font-bold text-xs">06</div>
                  <h3 className="font-black text-slate-900 text-base">Tiraje / Cantidad de Ejemplares</h3>
                </div>
                <span className="text-xs font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-full">
                  {quantity.toLocaleString()} libros
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[50, 100, 250, 500, 1000, 2500].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setQuantity(qty)}
                    className={`py-2.5 rounded-xl text-xs font-black border transition-all ${
                      quantity === qty
                        ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    {qty.toLocaleString()} u.
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Otra cantidad:</span>
                <input 
                  type="number" 
                  min="25" 
                  max="50000" 
                  step="25"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(25, parseInt(e.target.value) || 25))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-teal-500 outline-none"
                  placeholder="Ej: 750"
                />
              </div>
            </div>

          </div>

          {/* RIGHT: LIVE BLUEPRINT & QUOTE BREAKDOWN (5 COLS) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            
            {/* REAL-TIME LOMO & COVER BLUEPRINT */}
            <div className="bg-slate-900 text-white p-6 sm:p-7 rounded-[32px] border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Ruler size={16} className="text-teal-400" />
                  <h4 className="text-xs font-black tracking-wider uppercase text-white">
                    Plano Técnico de Portada & Lomo
                  </h4>
                </div>
                {quote && (
                  <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold rounded-full">
                    Lomo: {quote.specs_technical.spine_thickness_mm} mm
                  </span>
                )}
              </div>

              {/* Interactive Cover Layout Diagram */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex items-center justify-center min-h-[160px] relative">
                <div className="w-full flex items-stretch justify-center h-28 text-center text-[10px] font-bold">
                  
                  {/* Solapa Izquierda */}
                  {flaps !== 'sin_solapa' && bindingType !== 'tapa_dura' && (
                    <div className="w-12 bg-slate-800/80 border-r border-dashed border-slate-600 flex flex-col items-center justify-center p-1 text-slate-400">
                      <span>Solapa</span>
                      <span className="text-[9px] text-teal-400">{flaps === 'solapa_7cm' ? '7cm' : '9cm'}</span>
                    </div>
                  )}

                  {/* Contraportada */}
                  <div className="flex-1 bg-slate-800/50 border-r border-slate-700 flex flex-col items-center justify-center p-2 text-slate-300">
                    <span>Contraportada</span>
                    <span className="text-[9px] text-slate-400">{quote?.specs_technical.closed_dimensions}</span>
                  </div>

                  {/* LOMO (Spine) - Highlighted */}
                  <div 
                    style={{ minWidth: '36px' }}
                    className="bg-teal-500/20 border-x-2 border-teal-400 flex flex-col items-center justify-center p-1 text-teal-300 shadow-inner"
                  >
                    <span className="text-[8px] font-black uppercase">LOMO</span>
                    <span className="text-[10px] font-black text-white">{quote?.specs_technical.spine_thickness_mm} mm</span>
                  </div>

                  {/* Portada */}
                  <div className="flex-1 bg-slate-800/50 border-l border-slate-700 flex flex-col items-center justify-center p-2 text-slate-300">
                    <span className="font-bold text-white">Portada</span>
                    <span className="text-[9px] text-slate-400">{quote?.specs_technical.closed_dimensions}</span>
                  </div>

                  {/* Solapa Derecha */}
                  {flaps !== 'sin_solapa' && bindingType !== 'tapa_dura' && (
                    <div className="w-12 bg-slate-800/80 border-l border-dashed border-slate-600 flex flex-col items-center justify-center p-1 text-slate-400">
                      <span>Solapa</span>
                      <span className="text-[9px] text-teal-400">{flaps === 'solapa_7cm' ? '7cm' : '9cm'}</span>
                    </div>
                  )}

                </div>
              </div>

              {/* Technical specs badges */}
              {quote && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Cubierta Abierta Total:</span>
                    <strong className="text-white">{quote.specs_technical.open_cover_dimensions}</strong>
                  </div>
                  <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Pliegos / Cuadernillos:</span>
                    <strong className="text-white">{quote.specs_technical.signatures_count} pliegos litográficos</strong>
                  </div>
                  <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Peso x Libro:</span>
                    <strong className="text-white">{quote.specs_technical.single_book_weight_grams} g / libro</strong>
                  </div>
                  <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Peso Total Tiraje:</span>
                    <strong className="text-white">{quote.specs_technical.total_weight_kg} Kg</strong>
                  </div>
                </div>
              )}
            </div>

            {/* QUOTE PRICING CARD */}
            <div className="bg-white p-6 sm:p-7 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
              
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Resumen de Inversión Litográfica & Editorial
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">
                    {quote ? formatCOP(quote.total_cop) : 'Calculando...'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">IVA 19% incluido</span>
                </div>
                {quote && (
                  <p className="text-xs font-bold text-teal-600 mt-1">
                    {formatCOP(quote.unit_price_total)} por cada ejemplar terminado
                  </p>
                )}
              </div>

              {/* Breakdown de Impresión vs Editorial */}
              {quote && (
                <div className="space-y-2 py-2 border-b border-slate-100 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Producción Litográfica ({quantity} libros):</span>
                    <span className="font-bold text-slate-900">{formatCOP(quote.subtotal_impresion || quote.subtotal_neto)}</span>
                  </div>

                  {quote.subtotal_editorial && quote.subtotal_editorial > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-indigo-700 font-bold">
                        <span>Servicios Editoriales Profesionales:</span>
                        <span>{formatCOP(quote.subtotal_editorial)}</span>
                      </div>
                      {quote.editorial_breakdown?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-slate-500 pl-2">
                          <span>• {item.service}</span>
                          <span className="font-semibold text-slate-700">{formatCOP(item.cost)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {uploadedFile && (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-emerald-700">
                      <FileCheck size={13} />
                      <span className="truncate">Archivo adjunto: {uploadedFile.name}</span>
                    </div>
                  )}

                  {driveFile && (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-blue-700">
                      <svg viewBox="0 0 87.3 78" className="w-3.5 h-3.5 shrink-0">
                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                        <path d="m43.65 25 13.75-23.8c-1.35.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#26842a"/>
                        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                      </svg>
                      <span className="truncate">Google Drive: {driveFile.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Volume Discount Alert */}
              {quote && quote.discount_applied.percentage > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-600" />
                    <span>Descuento por Escala ({quote.discount_applied.percentage}%):</span>
                  </div>
                  <strong className="font-black text-emerald-900">-{formatCOP(quote.discount_applied.amount_saved)}</strong>
                </div>
              )}

              {/* Delivery info */}
              {quote && (
                <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-teal-600" />
                    <span>Tiempo Estimado de Entrega:</span>
                  </div>
                  <strong className="text-slate-900 font-bold">
                    {quote.specs_technical.production_lead_time_days} días hábiles
                  </strong>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={loading || !quote}
                  className="w-full py-4 bg-teal-500 hover:bg-teal-400 active:scale-[0.99] text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={18} />
                  <span>Añadir Pedido al Carrito</span>
                </button>

                <button
                  type="button"
                  onClick={generateWhatsAppInquiry}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 size={15} />
                  <span>Enviar Cotización a WhatsApp</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-2">
                <Info size={13} />
                <span>Facturación electrónica DIAN inmediata y despacho nacional</span>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* MOBILE FIXED BOTTOM BAR FOR INSTANT QUOTE & ORDERING */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-15px_30px_rgba(0,0,0,0.08)] rounded-t-[28px] z-50">
        <div className="max-w-lg mx-auto flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {quantity.toLocaleString('es-CO')} ej. • {pages} págs.
              </span>
              <span className="text-xl font-black text-teal-600 tracking-tight leading-none">
                {quote ? formatCOP(quote.total_cop) : '$0'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={generateWhatsAppInquiry}
                className="p-2.5 bg-slate-900 text-white rounded-xl active:scale-95 transition-transform"
                title="WhatsApp"
              >
                <Share2 size={16} />
              </button>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={loading || !quote}
                className="px-5 py-3 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-teal-500/20 transition-all flex items-center gap-2"
              >
                <ShoppingBag size={16} />
                <span>Añadir al Carrito</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GOOGLE DRIVE MODAL */}
      <GoogleDrivePickerModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onSelectFile={handleSelectDriveFile}
        title="Seleccionar Archivo de Manuscrito desde Google Drive"
      />
    </div>
  );
}

