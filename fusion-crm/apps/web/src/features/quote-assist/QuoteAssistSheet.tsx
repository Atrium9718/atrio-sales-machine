import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AssistStep, AssistFormState, AssistPanelMode } from './types';
import { ASSIST_KINDS, AssistKind, applyKind, commercialSummary, finishingSummary, kindOf, sectionId, sectionsFor } from './singleScreen';
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
  ChevronDown,
  Sparkles,
  Printer,
  Layers,
  Wrench,
  Ruler,
} from 'lucide-react';

const KIND_ICON: Record<AssistKind, React.ComponentType<{ className?: string }>> = {
  DIGITAL: Printer,
  LITHO: Layers,
  BOTH: Sparkles,
  WIDE_FORMAT: Ruler,
  MANUAL: Wrench,
};

/** Tarjeta de una sección del formulario; las opcionales se pliegan mostrando un resumen. */
const AssistSection: React.FC<{
  step: AssistStep;
  number: number;
  title: string;
  summary?: string;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}> = ({ step, number, title, summary, collapsible, open = true, onToggle, children }) => (
  <section id={sectionId(step)} data-step={step} className="scroll-mt-14 rounded-xl border border-border bg-card/40">
    <button
      type="button"
      onClick={collapsible ? onToggle : undefined}
      className={`w-full px-4 py-3 flex items-center gap-3 text-left ${collapsible ? 'hover:bg-muted/40 cursor-pointer' : 'cursor-default'} ${open ? 'border-b border-border' : ''}`}
      aria-expanded={collapsible ? open : undefined}
    >
      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-black flex items-center justify-center shrink-0">{number}</span>
      <span className="font-bold text-sm text-foreground">{title}</span>
      {summary && <span className="text-xs text-muted-foreground truncate min-w-0">{summary}</span>}
      {collapsible && <ChevronDown className={`w-4 h-4 ml-auto shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />}
    </button>
    {open && <div className="p-4 sm:p-5">{children}</div>}
  </section>
);

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
  const [visibleSection, setVisibleSection] = useState<AssistStep>('trabajo');
  const [commercialOpen, setCommercialOpen] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);
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

  const kind = kindOf(panelMode, form.technique);
  const sections = sectionsFor(form.technique);

  const chooseKind = (next: AssistKind) => {
    const { mode, technique } = applyKind(next);
    setPanelMode(mode);
    if (technique && technique !== form.technique) updateForm({ technique });
  };

  const goToSection = useCallback((step: AssistStep) => {
    if (step === 'comercial') setCommercialOpen(true);
    // Espera a que la sección se despliegue antes de desplazarse
    requestAnimationFrame(() => document.getElementById(sectionId(step))?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);

  // Marca en el índice la sección que se está viendo
  useEffect(() => {
    const root = scrollRef.current;
    if (!isOpen || panelMode !== 'GUIDED' || !root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setVisibleSection(top.target.getAttribute('data-step') as AssistStep);
      },
      { root, rootMargin: '-15% 0px -70% 0px' },
    );
    sections.forEach((s) => {
      const el = document.getElementById(sectionId(s.key));
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isOpen, panelMode, sections.length]);

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
                  ? form.jobName || 'Nuevo trabajo: llena las secciones y mira el precio a la derecha'
                  : panelMode === 'MANUAL'
                  ? 'Litografía a mano: precios de planchas, papel y acabados que tú defines'
                  : 'Gran formato UV-DTF: precio por centímetro lineal'}
              </p>
            </div>
          </div>

          {/* Acciones de Cabecera */}
          <div className="flex items-center gap-2">
            {panelMode === 'GUIDED' && (
              <>
                <button
                  type="button"
                  onClick={() => setIsTemplatesModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground shadow-xs transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-primary" />
                  <span>Plantillas</span>
                </button>
                <button
                  type="button"
                  onClick={duplicateAndVary}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground shadow-xs transition-colors"
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

        {/* ¿QUÉ SE COTIZA? Una sola elección reemplaza modo + técnica */}
        <div className="px-5 py-2.5 border-b border-border bg-card/40 shrink-0 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1">Cotizar</span>
          {ASSIST_KINDS.map((k) => {
            const Icon = KIND_ICON[k.kind];
            const active = kind === k.kind;
            return (
              <button
                key={k.kind}
                type="button"
                onClick={() => chooseKind(k.kind)}
                title={k.hint}
                className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  active ? 'bg-primary text-primary-foreground border-primary shadow-xs' : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{k.label}</span>
                <span className={`hidden lg:inline text-[10px] font-normal ${active ? 'opacity-80' : 'opacity-70'}`}>· {k.hint}</span>
              </button>
            );
          })}
        </div>

        {panelMode === 'MANUAL' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 bg-background">
            <ManualLithoAssist
              onApplyToQuote={onApplyToQuote}
              tariffVersionId={tariffVersion.id}
              tariffVersionCode={tariffVersion.code}
              tariff={tariff}
            />
          </div>
        ) : panelMode === 'WIDE_FORMAT' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 bg-background">
            <WideFormatAssist onApplyToQuote={onApplyToQuote} tariffVersionId={tariffVersion.id} />
          </div>
        ) : (
          <>
            {/* CUERPO: todo el formulario en una sola columna con desplazamiento + resultados fijos */}
            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 overflow-hidden">
              <main ref={scrollRef} className="xl:col-span-7 h-full overflow-y-auto">
                {/* Índice rápido: lleva a cada sección y marca la que se está viendo */}
                <nav className="sticky top-0 z-10 px-5 py-2 border-b border-border bg-background/95 backdrop-blur flex items-center gap-1 overflow-x-auto scrollbar-none">
                  {sections.map((step, i) => (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => goToSection(step.key)}
                      className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        visibleSection === step.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-muted text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                      {step.label}
                    </button>
                  ))}
                </nav>

                <div className="p-5 sm:p-6 space-y-5">
                  <AssistSection step="trabajo" number={1} title="Trabajo y cantidades" summary={`${form.artWidthCm} × ${form.artHeightCm} cm · ${[form.qty1, form.qty2, form.qty3].filter(Boolean).map((q) => Number(q).toLocaleString('es-CO')).join(' / ')} un.`}>
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
                  </AssistSection>

                  <AssistSection step="tecnica" number={2} title={form.technique === 'BOTH' ? 'Impresión digital y litográfica' : form.technique === 'DIGITAL' ? 'Impresión digital' : 'Impresión litográfica'}>
                    <Step2Technique
                      form={form}
                      onChange={updateForm}
                      tariff={tariff}
                      artWidthCm={form.artWidthCm}
                      artHeightCm={form.artHeightCm}
                      applyBleed={form.applyBleed}
                      showTechniqueSelector={false}
                    />
                  </AssistSection>

                  {form.technique !== 'DIGITAL' && (
                    <AssistSection step="papel" number={3} title="Papel y montaje" summary={`${form.paperName} · pliego ${form.sheetFormat === 'S70X100' ? '70×100' : '60×90'}`}>
                      <Step3PaperAndMontage form={form} onChange={updateForm} tariff={tariff} />
                    </AssistSection>
                  )}

                  <AssistSection step="acabados" number={sections.findIndex((x) => x.key === 'acabados') + 1} title="Acabados" summary={finishingSummary(form)}>
                    <Step4Finishing form={form} onChange={updateForm} tariff={tariff} />
                  </AssistSection>

                  <AssistSection
                    step="comercial"
                    number={sections.length}
                    title="Condiciones comerciales"
                    summary={commercialSummary(form)}
                    collapsible
                    open={commercialOpen}
                    onToggle={() => setCommercialOpen((v) => !v)}
                  >
                    <Step5Commercial form={form} onChange={updateForm} />
                  </AssistSection>
                </div>
              </main>

              {/* COLUMNA DERECHA: resultados en vivo, siempre visibles */}
              <aside className="hidden xl:block xl:col-span-5 h-full overflow-y-auto p-5 sm:p-6 border-l border-border bg-muted/10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resultado en vivo</span>
                    <span className="text-[11px] text-muted-foreground">Se recalcula al escribir</span>
                  </div>
                  <ResultsPanel
                    result={result}
                    technique={form.technique}
                    hasCostPermission={hasCostPermission}
                    onNavigateToStep={(stepKey) => goToSection(stepKey as AssistStep)}
                    isStandalonePage={isStandalone}
                    onSaveAsDraft={() => onSaveAsDraft && onSaveAsDraft(result)}
                    onAddToQuote={() => setIsConfirmModalOpen(true)}
                  />
                </div>
              </aside>
            </div>

            {/* BARRA FIJA INFERIOR: total y botón para agregar, siempre a la vista */}
            {(() => {
              const runs = getResultRuns(result, form.technique);
              return (
                <div className="border-t border-border bg-card px-5 py-3 shadow-lg flex items-center justify-between gap-3 shrink-0">
                  <div>
                    <div className="text-[11px] text-muted-foreground">
                      Total {runs[0] ? `${Number(runs[0].quantity).toLocaleString('es-CO')} un.` : 'cantidad 1'} (con impuestos)
                    </div>
                    <div className="text-base font-black text-foreground">
                      {runs[0] ? `$${Math.round(runs[0].totalPrice).toLocaleString('es-CO')}` : '$0'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMobileResultsOpen(true)}
                      className="xl:hidden px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg border border-border transition-colors"
                    >
                      Desglose ({runs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmModalOpen(true)}
                      disabled={!result}
                      className="px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-xs hover:bg-primary/90 transition-colors"
                    >
                      Agregar a cotización
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
                setIsMobileResultsOpen(false);
                goToSection(stepKey as AssistStep);
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
