import React, { useState } from 'react';
import {
  X,
  Search,
  Plus,
  Check,
  Lock,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { WidgetCategory, WidgetDefinition } from '../../../packages/core/src/home/widget-catalog';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableWidgets: Array<{
    key: string;
    title: string;
    description: string;
    category: WidgetCategory;
    defaultSize: string;
    availableFrom: string;
    isAvailable: boolean;
  }>;
  currentWidgetKeys: string[];
  onAddWidget: (key: string) => void;
}

export const AddWidgetModal: React.FC<AddWidgetModalProps> = ({
  isOpen,
  onClose,
  availableWidgets,
  currentWidgetKeys,
  onAddWidget,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (!isOpen) return null;

  const categories = [
    { id: 'ALL', label: 'Todos' },
    { id: 'PERSONAL', label: 'Personales' },
    { id: 'COMERCIAL', label: 'Comercial' },
    { id: 'PRODUCCION', label: 'Producción' },
    { id: 'FINANCIERO', label: 'Financiero' },
    { id: 'EQUIPO', label: 'Equipo' },
    { id: 'SISTEMA', label: 'Sistema' },
  ];

  const filteredWidgets = availableWidgets.filter((w) => {
    const matchesSearch =
      w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || w.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Agregar Widget al Tablero</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecciona tarjetas para visualizar métricas clave y tareas operativas.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador y Filtro por Categorías */}
        <div className="p-4 border-b border-border space-y-3 bg-muted/20">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Widgets Disponibles */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {filteredWidgets.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              No se encontraron widgets con los criterios de búsqueda.
            </div>
          ) : (
            filteredWidgets.map((widget) => {
              const isAlreadyAdded = currentWidgetKeys.includes(widget.key);
              const isAvailable = widget.isAvailable;

              return (
                <div
                  key={widget.key}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                    !isAvailable
                      ? 'bg-muted/30 border-dashed border-border opacity-70'
                      : isAlreadyAdded
                      ? 'bg-muted/40 border-muted text-muted-foreground'
                      : 'bg-card border-border hover:border-primary/40 shadow-xs'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-foreground truncate">
                        {widget.title}
                      </h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                        {widget.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">
                      {widget.description}
                    </p>

                    {!isAvailable && (
                      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Disponible próximamente (Etapa {widget.availableFrom})</span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 pt-0.5">
                    {!isAvailable ? (
                      <span className="px-2.5 py-1 text-[11px] font-medium bg-muted text-muted-foreground rounded-lg cursor-not-allowed">
                        Próximamente
                      </span>
                    ) : isAlreadyAdded ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 rounded-lg">
                        <Check className="w-3 h-3" />
                        En el Tablero
                      </span>
                    ) : (
                      <button
                        onClick={() => onAddWidget(widget.key)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pie del modal */}
        <div className="p-3.5 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>{filteredWidgets.length} widgets filtrados</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-muted text-foreground font-semibold hover:bg-muted/80 transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
