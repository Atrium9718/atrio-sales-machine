import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Layers,
  Scissors,
  Palette,
  Sparkles,
  Maximize,
  FileText,
  Calendar,
  ShieldCheck,
  UploadCloud,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export type TariffTabKey =
  | 'papeles'
  | 'digital'
  | 'litho'
  | 'cortes'
  | 'tintas'
  | 'acabados'
  | 'gran_formato'
  | 'terminos';

interface TabDefinition {
  key: TariffTabKey;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  scope: string;
}

const TARIFF_TABS: TabDefinition[] = [
  {
    key: 'papeles',
    label: '1. Papeles y Pliegos',
    shortLabel: 'Papeles',
    icon: FileSpreadsheet,
    description: 'Catálogo de papeles, gramajes y costo por pliego en formatos 70x100 y 60x90.',
    scope: 'Costos base de sustratos',
  },
  {
    key: 'digital',
    label: '2. Impresión Digital',
    shortLabel: 'Digital',
    icon: Printer,
    description: 'Formatos digitales (1/4 pliego, 1/2 pliego) y escala de precios por volumen de bajadas (1x0, 4x0, 4x4).',
    scope: 'Prensas digitales HP / Xerox',
  },
  {
    key: 'litho',
    label: '3. Litografía / Offset',
    shortLabel: 'Litho',
    icon: Layers,
    description: 'Formatos de máquina offset, costo unitario de planchas CTP y tiro de prensa por millar.',
    scope: 'Prensas Speedmaster / Ryobi',
  },
  {
    key: 'cortes',
    label: '4. Cortes y Divisores',
    shortLabel: 'Cortes',
    icon: Scissors,
    description: 'Cortes estándar del pliego (.1, .1/2, .1/4, .1/8, .1/16, etc.) y medidas útiles de guillotina.',
    scope: 'Esquema de imposición',
  },
  {
    key: 'tintas',
    label: '5. Tintas y Planchas',
    shortLabel: 'Tintas',
    icon: Palette,
    description: 'Juegos de color (1x0, 1x1, 2x0, 4x0, 4x4, etc.) y cálculo de planchas requeridas por tiro y retiro.',
    scope: 'Configuración cromática',
  },
  {
    key: 'acabados',
    label: '6. Acabados y Terminados',
    shortLabel: 'Acabados',
    icon: Sparkles,
    description: 'Plastificado mate/brillante, troquelado, corte, perforado, encuadernación y servicios externos con mínimos y millares.',
    scope: 'Post-prensa y talleres aliados',
  },
  {
    key: 'gran_formato',
    label: '7. Gran Formato',
    shortLabel: 'Gran Formato',
    icon: Maximize,
    description: 'Sustratos para plotters (Banner 13oz, Vinilo adhesivo, Microperforado, Panaflex) por metro cuadrado.',
    scope: 'Plotters Eco-solvente / UV',
  },
  {
    key: 'terminos',
    label: '8. Términos Comerciales',
    shortLabel: 'Términos',
    icon: FileText,
    description: 'Vigencia de la cotización, condiciones de pago, tiempo de entrega estándar y tolerancias técnicas.',
    scope: 'Parámetros contractuales',
  },
];

interface EmptyStateProps {
  tab: TabDefinition;
}

function EmptyState({ tab }: EmptyStateProps) {
  const Icon = tab.icon;
  return (
    <div
      id={`tab-content-${tab.key}`}
      className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border/80 rounded-xl shadow-xs"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 mb-3">
        <Clock className="w-3.5 h-3.5" />
        <span>En construcción (Etapa 18.1)</span>
      </div>
      <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
        {tab.label}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">
        {tab.description}
      </p>
      <div className="text-xs text-muted-foreground/80 bg-muted/50 px-4 py-2 rounded-lg border border-border/50">
        <span className="font-semibold text-foreground">Alcance técnico:</span> {tab.scope}
      </div>
    </div>
  );
}

export default function TarifarioProduccionPage() {
  const [activeTab, setActiveTab] = useState<TariffTabKey>('papeles');

  const currentTab = TARIFF_TABS.find((t) => t.key === activeTab) || TARIFF_TABS[0];

  return (
    <div id="tarifario-page-container" className="space-y-6 max-w-7xl mx-auto">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Tarifario de Producción
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              TAR-2026-01 (Vigente)
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Costos de materias primas, imposición, tiro de prensa y calibración técnica para el motor de cotizaciones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground opacity-60 cursor-not-allowed shadow-xs"
            title="Importación masiva disponible en Etapa 18.2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Importar Excel</span>
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium opacity-60 cursor-not-allowed shadow-xs"
            title="Creación de nueva versión de tarifario"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Versión</span>
          </button>
        </div>
      </div>

      {/* METADATA BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-card/60 flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-muted-foreground">Vigencia Oficial</div>
            <div className="text-sm font-semibold truncate">Desde 01/Ene/2026</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card/60 flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-muted-foreground">Sangrado / Pinza</div>
            <div className="text-sm font-semibold truncate">0.6 cm sangría / 1.0 cm pinza</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card/60 flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
            <Scissors className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-muted-foreground">Merma Litográfica Base</div>
            <div className="text-sm font-semibold truncate">200 pliegos / tiro</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card/60 flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-muted-foreground">Margen Offset Sugerido</div>
            <div className="text-sm font-semibold truncate">30.0% industrial</div>
          </div>
        </div>
      </div>

      {/* OCHO PESTAÑAS (TABS) */}
      <div className="space-y-4">
        {/* TAB NAVIGATION STRIP */}
        <div className="border-b border-border overflow-x-auto pb-px scrollbar-thin">
          <div
            role="tablist"
            aria-label="Tablas del Tarifario de Producción"
            className="flex items-center gap-1 min-w-max"
          >
            {TARIFF_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  id={`tab-trigger-${tab.key}`}
                  aria-selected={isSelected}
                  aria-controls={`tab-content-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
                    isSelected
                      ? 'border-primary text-primary bg-primary/5 font-bold shadow-2xs'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB CONTENT (EMPTY STATE CASCAJÓN) */}
        <div className="pt-2">
          <EmptyState tab={currentTab} />
        </div>
      </div>
    </div>
  );
}
