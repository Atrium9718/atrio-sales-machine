import React, { useState, useEffect } from 'react';
import { ASSIST_STEPS, AssistStep, AssistFormState, AssistPanelMode } from './types';
import { useQuoteAssist } from './useQuoteAssist';
import { Step1JobAndQuantities } from './Step1JobAndQuantities';
import { Step2Technique } from './Step2Technique';
import { Step3PaperAndMontage } from './Step3PaperAndMontage';
import { Step4Finishing } from './Step4Finishing';
import { Step5Commercial } from './Step5Commercial';
import { ResultsPanel, getResultRuns } from './ResultsPanel';
import { AssistTemplateModal } from './AssistTemplateModal';
import { ConfirmAddToQuoteModal } from './ConfirmAddToQuoteModal';
import { ManualLithoAssist } from './ManualLithoAssist';
import { WideFormatAssist } from './WideFormatAssist';
import {
  X,
  Calculator,
  Bookmark,
  Copy,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Printer,
  Layers,
  SlidersHorizontal,
  Wrench,
  Ruler,
} from 'lucide-react';

interface QuoteAssistSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialValues?: Partial<AssistFormState>;
  quoteId?: string;
  hasCostPermission?: boolean;
  onSaveAsDraft?: (result: any) => void;
  onApplyToQuote?: (items: any[], tariffVersionId: string, notesAppendix?: string) => void;
  existingTariffVersionId?: string;
  existingItemsCount?: number;
  isStandalone?: boolean;
}

export const QuoteAssistSheet: React.FC<QuoteAssistSheetProps> = ({
  isOpen,
  onClose,
  initialValues,
  quoteId,
  hasCostPermission = true,
  onSaveAsDraft,
  onApplyToQuote,
  existingTariffVersionId,
  existingItemsCount = 0,
  isStandalone = false,
}) => {
  const [panelMode, setPanelMode] = useState<AssistPanelMode>('GUIDED');
  const [activeStep, setActiveStep] = useState<AssistStep>('trabajo');
  const [isMobileResultsOpen, setIsMobileResultsOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const {
    tariff,
    tariffVersion,
    form,
    updateForm,
    impositionAnalysis,
    currentSheetDimensions,
    result,
    templates,
    isTemplatesModalOpen,
    setIsTemplatesModalOpen,
    saveCurrentAsTemplate,
    applyTemplate,
    duplicateAndVary,
  } = useQuoteAssist(initialValues, quoteId);

  // Escuchar tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isTemplatesModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTemplatesModalOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="quote-assist-modal-overlay"
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
    >
      {/* Panel deslizante (Sheet lateral) */}
      <div
        id="quote-assist-sheet-container"
        className="relative w-full max-w-[1360px] bg-background border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300"
      >
        {/* CABECERA DEL PANEL */}
        <header className="px-5 py-3.5 border-b border-border bg-card/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  Ayuda para Cotizar
                </h2>
                {/* Versión del tarifario en uso */}
                <a
                  href="/dashboard/cotizaciones/tarifario"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  title="Ver tarifario de producción vigente"
                >
                  <span>{tariffVersion.code} (Vigente)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-md">
                {panelMode === 'GUIDED'
                  ? `${form.jobName || 'Nuevo trabajo gráfico'} · Motor press-1.0.0`
                  : panelMode === 'MANUAL'
                  ? 'Modo Manual Litográfico · Hoja Lito Simple'
                  : 'Modo Gran Formato UV-DTF · Por centímetro'}
              </p>
            </div>
          </div>

          {/* Selector de Modo: Guiado vs Manual vs Gran Formato */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/70 text-xs shadow-2xs overflow-x-auto scrollbar-none max-w-full shrink-0">
            <button
              type="button"
              onClick={() => setPanelMode('GUIDED')}
              className={`shrink-0 px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                panelMode === 'GUIDED'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span>Guiado</span>
            </button>
            <button
              type="button"
              onClick={() => setPanelMode('MANUAL')}
              className={`shrink-0 px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                panelMode === 'MANUAL'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-500" />
              <span>Manual (Lito)</span>
            </button>
            <button
              type="button"
              onClick={() => setPanelMode('WIDE_FORMAT')}
              className={`shrink-0 px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                panelMode === 'WIDE_FORMAT'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Ruler className="w-3.5 h-3.5 text-emerald-500" />
              <span>Gran Formato (UV-DTF)</span>
            </button>
          </div>

          {/* Acciones de Cabecera */}
          <div className="flex items-center gap-2">
            {panelMode === 'GUIDED' && (
              <>
                {/* Selector rápido de Técnica */}
                <div className="hidden sm:flex items-center bg-muted/50 p-1 rounded-lg border border-border/60 text-xs">
                  <button
                    type="button"
                    onClick={() => updateForm({ technique: 'DIGITAL' })}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                      form.technique === 'DIGITAL'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Digital</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateForm({ technique: 'LITHO' })}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                      form.technique === 'LITHO'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Litográfica</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateForm({ technique: 'BOTH' })}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                      form.technique === 'BOTH'
                        ? 'bg-amber-500 text-white shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Comparar</span>
                  </button>
                </div>

                {/* Plantillas */}
                <button
                  type="button"
                  onClick={() => setIsTemplatesModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground shadow-xs transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-primary" />
                  <span>Plantillas</span>
                </button>

                {/* Duplicar y variar */}
                <button
                  type="button"
                  onClick={duplicateAndVary}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground shadow-xs transition-colors"
                  title="Duplica la configuración actual variando cantidades"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Duplicar y variar</span>
                </button>
              </>
            )}

            {/* Cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-1"
              aria-label="Cerrar panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* CONTENIDO SEGÚN MODO SELECCIONADO */}
        {panelMode === 'MANUAL' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 bg-background">
            <ManualLithoAssist
              onApplyToQuote={onApplyToQuote}
              tariffVersionId={tariffVersion.id}
              tariffVersionCode={tariffVersion.code}
            />
          </div>
        ) : panelMode === 'WIDE_FORMAT' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 bg-background">
            <WideFormatAssist
              onApplyToQuote={onApplyToQuote}
              tariffVersionId={tariffVersion.id}
            />
          </div>
        ) : (
          <>
            {/* NAVEGACIÓN POR PESTAÑAS DE LOS 5 PASOS (NO ASISTENTE LINEAL OBLIGATORIO) */}
            <nav className="px-5 border-b border-border bg-card/40 flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0">
              {ASSIST_STEPS.map((step) => {
                const isActive = activeStep === step.key;
                // Ocultar paso papel si la técnica es exclusivamente DIGITAL
                if (step.key === 'papel' && form.technique === 'DIGITAL') {
                  return null;
                }

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => setActiveStep(step.key)}
                    className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                      isActive
                        ? 'border-primary text-primary font-bold bg-primary/5'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step.number}
                    </span>
                    <span>{step.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* CUERPO PRINCIPAL: 2 COLUMNAS (55% Formulario / 45% Resultados) */}
            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 overflow-hidden">
              {/* COLUMNA IZQUIERDA: 55% (Formulario) */}
              <main className="xl:col-span-7 h-full overflow-y-auto p-5 sm:p-6 space-y-6">
                {activeStep === 'trabajo' && (
                  <Step1JobAndQuantities
                    form={form}
                    onChange={updateForm}
                    impositionCount={impositionAnalysis.imposition}
                    orientationA={impositionAnalysis.orientationA}
                    orientationB={impositionAnalysis.orientationB}
                    sheetWidthCm={currentSheetDimensions.widthCm}
                    sheetHeightCm={currentSheetDimensions.heightCm}
                    sheetLabel={currentSheetDimensions.label}
                  />
                )}

                {activeStep === 'tecnica' && (
                  <Step2Technique
                    form={form}
                    onChange={updateForm}
                    tariff={tariff}
                    artWidthCm={form.artWidthCm}
                    artHeightCm={form.artHeightCm}
                    applyBleed={form.applyBleed}
                  />
                )}

                {activeStep === 'papel' && (
                  <Step3PaperAndMontage
                    form={form}
                    onChange={updateForm}
                    tariff={tariff}
                  />
                )}

                {activeStep === 'acabados' && (
                  <Step4Finishing
                    form={form}
                    onChange={updateForm}
                    tariff={tariff}
                  />
                )}

                {activeStep === 'comercial' && (
                  <Step5Commercial
                    form={form}
                    onChange={updateForm}
                  />
                )}

                {/* Navegación rápida entre pasos */}
                <div className="pt-6 border-t border-border/80 flex items-center justify-between">
                  {activeStep !== 'trabajo' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const idx = ASSIST_STEPS.findIndex((s) => s.key === activeStep);
                        if (idx > 0) {
                          const prevKey = ASSIST_STEPS[idx - 1].key;
                          // Skip papel if digital
                          if (prevKey === 'papel' && form.technique === 'DIGITAL') {
                            setActiveStep('tecnica');
                          } else {
                            setActiveStep(prevKey);
                          }
                        }
                      }}
                      className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      ← Paso Anterior
                    </button>
                  ) : (
                    <div />
                  )}

                  {activeStep !== 'comercial' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const idx = ASSIST_STEPS.findIndex((s) => s.key === activeStep);
                        if (idx < ASSIST_STEPS.length - 1) {
                          const nextKey = ASSIST_STEPS[idx + 1].key;
                          // Skip papel if digital
                          if (nextKey === 'papel' && form.technique === 'DIGITAL') {
                            setActiveStep('acabados');
                          } else {
                            setActiveStep(nextKey);
                          }
                        }
                      }}
                      className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <span>Siguiente Paso</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      Todos los pasos configurados
                    </div>
                  )}
                </div>
              </main>

              {/* COLUMNA DERECHA: 45% (Resultados en vivo) */}
              <aside className="hidden xl:block xl:col-span-5 h-full overflow-y-auto p-5 sm:p-6 border-l border-border bg-muted/10">
                <div className="sticky top-0 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Resultados en Vivo
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      PressEngine v1.0.0
                    </span>
                  </div>

                  <ResultsPanel
                    result={result}
                    technique={form.technique}
                    hasCostPermission={hasCostPermission}
                    onNavigateToStep={(stepKey) => setActiveStep(stepKey as AssistStep)}
                    isStandalonePage={isStandalone}
                    onSaveAsDraft={() => onSaveAsDraft && onSaveAsDraft(result)}
                    onAddToQuote={() => setIsConfirmModalOpen(true)}
                  />
                </div>
              </aside>
            </div>

            {/* RESPONSIVE (< 1280px): BARRA FIJA INFERIOR CON TOTALES Y BOTÓN EXPANDIR */}
            {(() => {
              const runs = getResultRuns(result, form.technique);
              return (
                <div className="xl:hidden border-t border-border bg-card p-3 shadow-lg flex items-center justify-between gap-3 shrink-0">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Total Estimado Q1:</div>
                    <div className="text-base font-black text-foreground">
                      {runs[0]
                        ? `$${Math.round(runs[0].totalPrice).toLocaleString('es-CO')}`
                        : '$0'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMobileResultsOpen(true)}
                      className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg border border-border transition-colors"
                    >
                      Desglose ({runs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmModalOpen(true)}
                      disabled={!result}
                      className="px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-xs hover:bg-primary/90 transition-colors"
                    >
                      Agregar a Cotización
                    </button>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* MODAL MÓVIL DE RESULTADOS */}
        {isMobileResultsOpen && (
          <div className="xl:hidden fixed inset-0 z-[60] bg-background p-5 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="text-base font-bold text-foreground">Resultados de Cotización</h3>
              <button
                type="button"
                onClick={() => setIsMobileResultsOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ResultsPanel
              result={result}
              technique={form.technique}
              hasCostPermission={hasCostPermission}
              onNavigateToStep={(stepKey) => {
                setActiveStep(stepKey as AssistStep);
                setIsMobileResultsOpen(false);
              }}
              isStandalonePage={isStandalone}
              onSaveAsDraft={() => onSaveAsDraft && onSaveAsDraft(result)}
              onAddToQuote={() => {
                setIsMobileResultsOpen(false);
                setIsConfirmModalOpen(true);
              }}
            />
          </div>
        )}
      </div>

      {/* Modal de Confirmación y Volcado a Ítems (Etapa 18.5 Bloque A) */}
      <ConfirmAddToQuoteModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        form={form}
        result={result}
        tariffVersion={tariffVersion}
        existingTariffVersionId={existingTariffVersionId}
        quoteId={quoteId}
        existingItemsCount={existingItemsCount}
        onConfirm={(payload) => {
          setIsConfirmModalOpen(false);
          if (onApplyToQuote) {
            onApplyToQuote(payload.items, payload.tariffVersionId, payload.notesAppendix);
          }
          onClose();
        }}
      />

      {/* Modal de Plantillas */}
      <AssistTemplateModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        templates={templates}
        onSelectTemplate={applyTemplate}
        onSaveCurrentAsTemplate={saveCurrentAsTemplate}
        currentForm={form}
      />
    </div>
  );
};
