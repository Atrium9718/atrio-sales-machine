import { useState, useEffect } from 'react';
import { 
  Calculator, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  FileSpreadsheet, 
  Flame, 
  Sparkles, 
  BookOpen, 
  Percent, 
  DollarSign,
  Info,
  TrendingUp,
  RefreshCw,
  Search,
  Sliders
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface LithoParameter {
  id?: number;
  category: string;
  code: string;
  name: string;
  description: string;
  unitType: string;
  costValue: string | number;
  active?: boolean;
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string; desc: string }> = {
  ctp: {
    label: 'CTP & Pre-prensa',
    icon: Layers,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Costos de filmación de planchas térmicas CTP, ripeo de archivos y armado de imposición.'
  },
  paper: {
    label: 'Papeles & Sustratos',
    icon: FileSpreadsheet,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Tarifas por kilogramo de pliego interior (Bond, Propalcote, EarthPact) y tapas rígidas/maule.'
  },
  press_setup: {
    label: 'Montaje & Puesta a Punto',
    icon: Sliders,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    desc: 'Costos de lavado, registro y calibración de baterías en máquina offset litográfica.'
  },
  press_run: {
    label: 'Tiraje en Prensa',
    icon: Flame,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: 'Costo por cada tiro de pliego impreso en máquina 4x4 o 1x1 monocromo.'
  },
  finishes: {
    label: 'Acabados & Plastificados',
    icon: Sparkles,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Laminado mate/brillante/soft-touch, reserva UV sectorizada, estampación foil y repujados.'
  },
  binding: {
    label: 'Encuadernación Editorial',
    icon: BookOpen,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    desc: 'Rústica cosida al hilo, pegado PUR, cartoné tapa dura, grapado y anillado Wire-O.'
  },
  editorial: {
    label: 'Servicios Editoriales',
    icon: Info,
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    desc: 'Diagramación InDesign, diseño de portada, corrección de estilo, transcripción y traducción.'
  },
  margins: {
    label: 'Márgenes & Reglas de Impuesto',
    icon: Percent,
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    desc: 'Factor de rentabilidad industrial aplicada sobre los costos directos de litografía e IVA legal.'
  },
};

export default function PricingRulesAdminPage() {
  const { token } = useAuth();
  const [params, setParams] = useState<LithoParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Simulation Calculator State
  const [simPages, setSimPages] = useState(120);
  const [simQty, setSimQty] = useState(250);
  const [simBinding, setSimBinding] = useState('rustica_cosida');
  const [simInnerInks, setSimInnerInks] = useState('1x1');
  const [simCoverFinish, setSimCoverFinish] = useState('mate');
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    fetchParameters();
  }, [token]);

  const fetchParameters = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pricing/parameters', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setParams(data);
      }
    } catch (e) {
      console.error('Error fetching litho parameters:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (code: string, value: number) => {
    setParams(prev => prev.map(p => p.code === code ? { ...p, costValue: value } : p));
  };

  const saveAllChanges = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const payload = params.map(p => ({
        code: p.code,
        costValue: Number(p.costValue),
        active: p.active !== false
      }));

      const res = await fetch('/api/pricing/parameters', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ parameters: payload })
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
        runSimulation();
      }
    } catch (e) {
      console.error('Error saving parameters:', e);
    } finally {
      setSaving(false);
    }
  };

  const resetToFactory = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/pricing/parameters/reset', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        await fetchParameters();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (e) {
      console.error('Error resetting:', e);
    } finally {
      setSaving(false);
    }
  };

  const runSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await fetch('/api/pricing/quote-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: simPages,
          quantity: simQty,
          bindingType: simBinding,
          innerInks: simInnerInks,
          coverFinish: simCoverFinish,
          innerPaper: 'bond_75',
          coverPaper: 'propalcote_300',
          format: 'media_carta',
          flaps: 'sin_solapa'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult(data);
      }
    } catch (e) {
      console.error('Error running test simulation:', e);
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && params.length > 0) {
      runSimulation();
    }
  }, [simPages, simQty, simBinding, simInnerInks, simCoverFinish, loading]);

  const filteredParams = params.filter(p => {
    const matchesCat = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const categoriesList = ['all', 'ctp', 'paper', 'press_setup', 'press_run', 'finishes', 'binding', 'editorial', 'margins'];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-black uppercase tracking-wider mb-2">
            <Calculator size={14} /> Motor de Cotización & Tarifario Técnico
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Módulo de Cálculo de Precios y Reglas
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1 max-w-3xl">
            Ajusta los costos unitarios, tarifas de sustratos, tiempos de plancha CTP, tirajes, plastificados y márgenes operativos. Cualquier modificación se sincroniza inmediatamente con el cotizador público de libros y catálogo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={resetToFactory}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm transition-colors"
            title="Restaurar a valores predeterminados"
          >
            <RotateCcw size={16} /> Restaurar Fábrica
          </button>

          <button
            onClick={saveAllChanges}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-black text-sm shadow-lg transition-all active:scale-95 ${
              saveSuccess 
                ? 'bg-emerald-600 shadow-emerald-500/25' 
                : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/25'
            }`}
          >
            {saving ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 size={18} />
            ) : (
              <Save size={18} />
            )}
            {saving ? 'Guardando...' : saveSuccess ? '¡Guardado con Éxito!' : 'Guardar Todo'}
          </button>
        </div>
      </div>

      {/* Grid: 2 Columns (Main Parameters Table / Live Test Simulator) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Parameters Management (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Category Tabs & Search Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar variable, costo, código o descripción técnica..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categoriesList.map(cat => {
                const isActive = activeCategory === cat;
                const meta = cat === 'all' ? { label: 'Todos' } : CATEGORY_META[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-100'
                    }`}
                  >
                    {meta?.label || cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parameters List Table */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={28} className="animate-spin text-teal-500" />
                <span className="text-sm font-bold">Cargando matriz de costos y reglas...</span>
              </div>
            ) : filteredParams.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                No se encontraron parámetros con los criterios especificados.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredParams.map((p) => {
                  const meta = CATEGORY_META[p.category] || { label: p.category, color: 'bg-slate-50 text-slate-700' };
                  const isMarginOrPct = p.unitType === 'porcentaje';
                  
                  return (
                    <div key={p.code} className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span className="text-xs font-mono text-slate-400">#{p.code}</span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{p.name}</h4>
                        {p.description && (
                          <p className="text-xs text-slate-500 leading-relaxed max-w-xl">{p.description}</p>
                        )}
                      </div>

                      {/* Value Input */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                            {isMarginOrPct ? '%' : '$'}
                          </span>
                          <input
                            type="number"
                            step={isMarginOrPct ? '0.5' : '10'}
                            value={p.costValue}
                            onChange={(e) => handleValueChange(p.code, Number(e.target.value))}
                            className="w-36 bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-right font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 w-24 truncate" title={p.unitType}>
                          / {p.unitType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Live Quote Simulator (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-[32px] shadow-xl border border-slate-800 sticky top-24">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Simulador en Vivo</h3>
                  <p className="text-[11px] text-slate-400">Verifica el impacto del cálculo</p>
                </div>
              </div>
              <button 
                onClick={runSimulation}
                className="text-teal-400 hover:text-teal-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                title="Recalcular"
              >
                <RefreshCw size={16} className={simLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Simulation Controls */}
            <div className="space-y-4 text-xs font-medium">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Páginas de Prueba</span>
                  <span className="font-bold text-teal-400">{simPages} págs</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="400"
                  step="8"
                  value={simPages}
                  onChange={(e) => setSimPages(Number(e.target.value))}
                  className="w-full accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Tiraje (Cantidad)</span>
                  <span className="font-bold text-teal-400">{simQty} libros</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="50"
                  value={simQty}
                  onChange={(e) => setSimQty(Number(e.target.value))}
                  className="w-full accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Tintas Interior</label>
                  <select
                    value={simInnerInks}
                    onChange={(e) => setSimInnerInks(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-bold text-xs"
                  >
                    <option value="1x1">1x1 Monocromo</option>
                    <option value="4x4">4x4 Full Color</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Encuadernación</label>
                  <select
                    value={simBinding}
                    onChange={(e) => setSimBinding(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-bold text-xs"
                  >
                    <option value="rustica_cosida">Rústica Cosida</option>
                    <option value="rustica_pur">Rústica PUR</option>
                    <option value="tapa_dura">Tapa Dura Cartoné</option>
                    <option value="grapado">Grapado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Output */}
            {simResult && (
              <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Pliegos Litográficos:</span>
                  <span className="font-bold text-white">{simResult.specs_technical.signatures_count} pliegos</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Lomo Calculado:</span>
                  <span className="font-bold text-teal-400">{simResult.specs_technical.spine_thickness_mm} mm</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Peso Total Envío:</span>
                  <span className="font-bold text-white">{simResult.specs_technical.total_weight_kg} Kg</span>
                </div>

                <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Precio Unitario:</span>
                    <span className="font-bold text-white">{formatCOP(simResult.unit_price_total)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-emerald-400 pt-1 border-t border-slate-700/40">
                    <span>Total Estimado (Inc. IVA):</span>
                    <span>{formatCOP(simResult.total_cop)}</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                  Las fórmulas integran de inmediato CTP, gramajes, tintas, merma, costos fijos y factor de margen configurado.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
