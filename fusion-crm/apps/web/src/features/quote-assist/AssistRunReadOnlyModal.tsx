import React from 'react';
import {
  Calculator,
  X,
  RefreshCw,
  Layers,
  FileText,
  Printer,
  Sliders,
  DollarSign,
  Calendar,
} from 'lucide-react';

interface AssistRunReadOnlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any | null;
  onRecalculate: (item: any) => void;
  hasCostPermission?: boolean;
}

export const AssistRunReadOnlyModal: React.FC<AssistRunReadOnlyModalProps> = ({
  isOpen,
  onClose,
  item,
  onRecalculate,
  hasCostPermission = true,
}) => {
  if (!isOpen || !item) return null;

  const input = item.assistInput || {};
  const runId = item.assistRunId || 'run-desconocido';
  const technique = item.printTechnique || input.technique || 'LITHO';

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Cálculo Técnico de Prensa #{runId.slice(0, 14)}
                </h3>
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-black text-muted-foreground uppercase border border-border">
                  Modo Lectura
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Especificaciones y desglose original que originaron el ítem #{item.order} ({item.description?.split('\n')[0]})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Ficha técnica del trabajo */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="text-xs font-bold text-foreground flex items-center gap-2">
              <Printer className="w-4 h-4 text-primary" />
              <span>Parámetros de Producción</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Técnica:</span>
                <span className="font-bold text-foreground uppercase">{technique}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Tamaño Abierto:</span>
                <span className="font-mono text-foreground font-semibold">{item.size || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Tintas:</span>
                <span className="font-mono text-foreground font-semibold">{item.inks || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-[11px]">Material / Sustrato:</span>
                <span className="text-foreground font-semibold">{item.material || item.materials || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Cabida por Formato:</span>
                <span className="font-mono text-foreground font-bold">
                  {item.impositionPerSheet || input.imposition || '1'} un.
                </span>
              </div>
            </div>

            {item.finishes && (
              <div className="pt-2 border-t border-border/60">
                <span className="text-muted-foreground block text-[11px]">Acabados:</span>
                <span className="text-foreground">{item.finishes}</span>
              </div>
            )}
          </div>

          {/* Desglose de Producción y Costos */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="text-xs font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Rendimiento de Tirada</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 px-3 rounded-lg bg-muted/30 font-mono text-[11px] border border-border/40">
              <div>
                Cantidad:{' '}
                <strong className="text-foreground">{item.quantity?.toLocaleString('es-CO')}</strong>
              </div>
              <div>
                Formatos:{' '}
                <strong className="text-foreground">
                  {item.sheetsNeeded?.toLocaleString('es-CO') || 'N/A'}
                </strong>
              </div>
              <div>
                Planchas:{' '}
                <strong className="text-foreground">{item.plateCount ?? 'N/A'}</strong>
              </div>
              <div>
                Pliegos Papel:{' '}
                <strong className="text-foreground">{item.paperSheets ?? 'N/A'}</strong>
              </div>
            </div>

            {hasCostPermission && (
              <div className="pt-2 border-t border-border/60 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Costo Materia Prima:</span>
                  <span className="font-mono text-foreground font-semibold">
                    ${Math.round(item.rawMaterialCost || 0).toLocaleString('es-CO')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Costo Acabados:</span>
                  <span className="font-mono text-foreground font-semibold">
                    ${Math.round(item.otherCost || 0).toLocaleString('es-CO')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Costo Interno Total:</span>
                  <span className="font-mono text-foreground font-bold">
                    ${Math.round(item.internalCost || 0).toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Comparativa Precio Sugerido vs Precio Actual de la Línea */}
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground">Precio Sugerido Original:</div>
              <div className="text-base font-black text-foreground font-mono">
                ${Math.round(item.suggestedUnitPrice || item.unitPrice).toLocaleString('es-CO')} / un.
              </div>
              {item.isManuallyAdjusted && (
                <div className="text-[11px] text-amber-600 font-bold mt-0.5">
                  • Precio modificado manualmente a: ${Math.round(item.unitPrice).toLocaleString('es-CO')} / un.
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-[11px] text-muted-foreground">Total de la Línea:</div>
              <div className="text-lg font-black text-primary font-mono">
                ${Math.round(item.total || item.lineTotal || 0).toLocaleString('es-CO')}
              </div>
            </div>
          </div>
        </div>

        {/* Footer con botón Recalcular */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onRecalculate(item);
            }}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 shadow-xs hover:bg-primary/90 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recalcular en Asistente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
