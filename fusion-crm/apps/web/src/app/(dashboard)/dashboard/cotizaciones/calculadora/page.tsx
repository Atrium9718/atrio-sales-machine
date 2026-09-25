'use client';

import React, { useState } from 'react';
import { ASSIST_STEPS, AssistStep } from '../../../../../features/quote-assist/types';
import { useQuoteAssist } from '../../../../../features/quote-assist/useQuoteAssist';
import { Step1JobAndQuantities } from '../../../../../features/quote-assist/Step1JobAndQuantities';
import { Step2Technique } from '../../../../../features/quote-assist/Step2Technique';
import { Step3PaperAndMontage } from '../../../../../features/quote-assist/Step3PaperAndMontage';
import { Step4Finishing } from '../../../../../features/quote-assist/Step4Finishing';
import { Step5Commercial } from '../../../../../features/quote-assist/Step5Commercial';
import { ResultsPanel, getResultRuns } from '../../../../../features/quote-assist/ResultsPanel';
import { AssistTemplateModal } from '../../../../../features/quote-assist/AssistTemplateModal';
import {
  Calculator,
  Bookmark,
  Copy,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Printer,
  Layers,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

export default function CalculadoraCotizacionPage() {
  const [activeStep, setActiveStep] = useState<AssistStep>('trabajo');
  const [draftSavedId, setDraftSavedId] = useState<string | null>(null);

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
  } = useQuoteAssist();

  // Guardar como borrador de cotización
  const handleSaveAsDraft = async () => {
    const runs = getResultRuns(result, form.technique);
    if (runs.length === 0) return;
    const run1 = runs[0];
    const draftQuote = {
      title: form.jobName || 'Cotización Rápida Calculadora',
      customer: 'Cliente por Asignar',
      status: 'BORRADOR',
      items: [
        {
          id: `item_${Date.now()}`,
          name: form.jobName || 'Ítem calculado en prensa',
          quantity: run1.quantity,
          unitPrice: Number(run1.unitPrice),
          total: Number(run1.totalPrice),
          details: `${run1.technique} - Cabida ${run1.imposition} un. Formatos: ${run1.printedSheets}`,
        },
      ],
      total: Number(run1.totalPrice),
      technique: form.technique,
      deliveryTime: form.deliveryTime,
      paymentTerms: form.paymentTerms,
      validity: form.validity,
    };

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftQuote),
      });
      if (res.ok) {
        const data = await res.json();
        const newId = data.id || data.quote?.id || 'new';
        setDraftSavedId(newId);
        setTimeout(() => {
          window.location.href = `/dashboard/cotizaciones?selectedId=${newId}`;
        }, 1200);
      }
    } catch (e) {
      console.error('Error saving quote draft from calculator:', e);
    }
  };

  return (
    <div id="calculadora-page-container" className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <a
              href="/dashboard/cotizaciones"
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors mr-1"
              title="Volver a cotizaciones"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Calculator className="w-6 h-6 text-primary" />
              <span>Calculadora de Producción Gráfica</span>
            </h1>
            <a
              href="/dashboard/cotizaciones/tarifario"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <span>{tariffVersion.code} (Vigente)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            Cotizador autónomo con motor puro de litografía y digital. Calcula costos sin alterar cotizaciones existentes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTemplatesModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground shadow-xs transition-colors"
          >
            <Bookmark className="w-4 h-4 text-primary" />
            <span>Plantillas</span>
          </button>
          <button
            type="button"
            onClick={duplicateAndVary}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground shadow-xs transition-colors"
          >
            <Copy className="w-4 h-4 text-muted-foreground" />
            <span>Duplicar y variar</span>
          </button>
        </div>
      </div>

      {draftSavedId && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold">
            ¡Cotización guardada como borrador con éxito! Redirigiendo al cotizador...
          </span>
        </div>
      )}

      {/* NAVEGACIÓN DE PASOS */}
      <nav className="border-b border-border flex items-center gap-1 overflow-x-auto scrollbar-none">
        {ASSIST_STEPS.map((step) => {
          const isActive = activeStep === step.key;
          if (step.key === 'papel' && form.technique === 'DIGITAL') return null;

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => setActiveStep(step.key)}
              className={`py-2.5 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-primary text-primary font-bold bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
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

      {/* GRID 2 COLUMNAS (55% Formulario / 45% Resultados) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulario */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
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
                Todos los pasos listos
              </div>
            )}
          </div>
        </div>

        {/* Resultados */}
        <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-6 shadow-xs sticky top-4">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Resultados en Tiempo Real
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground">PressEngine</span>
          </div>

          <ResultsPanel
            result={result}
            technique={form.technique}
            hasCostPermission={true}
            onNavigateToStep={(stepKey) => setActiveStep(stepKey as AssistStep)}
            isStandalonePage={true}
            onSaveAsDraft={handleSaveAsDraft}
          />
        </div>
      </div>

      {/* Modal Plantillas */}
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
}
