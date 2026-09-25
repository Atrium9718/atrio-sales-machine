import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  AssistFormState,
  DEFAULT_ASSIST_FORM_STATE,
  AssistTemplateItem,
} from './types';
import {
  TariffSnapshot,
  PressQuoteResult,
  PressQuoteInput,
} from '../../../../../packages/core/src/pricing/press/types';
import { calculatePressQuote } from '../../../../../packages/core/src/pricing/press';
import { DEFAULT_OFFICIAL_TARIFF } from '../../../../../packages/core/src/pricing/press/defaultTariff';
import { calculateImposition } from '../../../../../packages/core/src/pricing/press/imposition';

const LOCAL_STORAGE_KEY = 'quote_assist_last_values';

export function useQuoteAssist(initialState?: Partial<AssistFormState>, quoteId?: string) {
  // 1. Tarifario
  const [tariff, setTariff] = useState<TariffSnapshot>(DEFAULT_OFFICIAL_TARIFF);
  const [tariffVersion, setTariffVersion] = useState({
    id: 'tar-2026-01',
    code: 'TAR-2026-01',
    name: 'Tarifario Oficial 2026 (Vigente)',
  });

  // 2. Estado del Formulario
  const [form, setForm] = useState<AssistFormState>(() => {
    // Intentar leer de localStorage si no viene initial state
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved && !initialState?.jobName) {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_ASSIST_FORM_STATE, ...parsed, ...initialState };
        }
      } catch (e) {
        console.warn('Error reading from localStorage', e);
      }
    }
    return { ...DEFAULT_ASSIST_FORM_STATE, ...initialState };
  });

  // 3. Plantillas
  const [templates, setTemplates] = useState<AssistTemplateItem[]>([]);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

  // Cargar tarifario y plantillas al montar
  useEffect(() => {
    let mounted = true;
    fetch('/api/tariff/snapshot')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data?.success) return;
        if (data.version) setTariffVersion(data.version);
        if (data.snapshot) setTariff(data.snapshot);
      })
      .catch((e) => console.warn('Using default official tariff fallback', e));

    fetch('/api/tariff/templates')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data?.success) return;
        if (data.templates) setTemplates(data.templates);
      })
      .catch((e) => console.warn('Using template defaults', e));

    return () => {
      mounted = false;
    };
  }, []);

  // Actualizador parcial de formulario
  const updateForm = useCallback((patch: Partial<AssistFormState>) => {
    setForm((prev) => {
      const updated = { ...prev, ...patch };
      // Guardar en localStorage
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  // 4. Imposición interactiva
  const effectiveArtW = form.applyBleed ? form.artWidthCm + 0.6 : form.artWidthCm;
  const effectiveArtH = form.applyBleed ? form.artHeightCm + 0.6 : form.artHeightCm;

  const currentSheetDimensions = useMemo(() => {
    if (form.technique === 'DIGITAL') {
      const df = tariff.digitalFormats.find((d) => d.formatName === form.digitalFormatName);
      return {
        widthCm: df ? Number(df.widthCm) : 23,
        heightCm: df ? Number(df.heightCm) : 33,
        label: df ? df.formatName : 'Digital',
      };
    } else {
      // Litografía: corte seleccionado
      const cut = tariff.sheetCuts.find((c) => c.code === form.sheetCutCode);
      const size = cut?.sizes.find((s) => s.sheetFormat === form.sheetFormat);
      return {
        widthCm: size ? Number(size.widthCm) : 50,
        heightCm: size ? Number(size.heightCm) : 35,
        label: `Corte ${form.sheetCutCode} (${form.sheetFormat === 'S70X100' ? '70x100' : '60x90'})`,
      };
    }
  }, [tariff, form.technique, form.digitalFormatName, form.sheetCutCode, form.sheetFormat]);

  const impositionAnalysis = useMemo(() => {
    return calculateImposition(
      currentSheetDimensions.widthCm,
      currentSheetDimensions.heightCm,
      effectiveArtW,
      effectiveArtH
    );
  }, [currentSheetDimensions, effectiveArtW, effectiveArtH]);

  // 5. Motor de cálculo sincrónico (< 16ms)
  const result: PressQuoteResult | null = useMemo(() => {
    const quantities = [form.qty1, form.qty2, form.qty3].filter(
      (q): q is number => !!q && q > 0
    );
    if (quantities.length === 0 || form.artWidthCm <= 0 || form.artHeightCm <= 0) {
      return null;
    }

    try {
      const quoteInput: PressQuoteInput = {
        technique: form.technique,
        jobName: form.jobName || 'Trabajo gráfico',
        artWidthCm: form.artWidthCm,
        artHeightCm: form.artHeightCm,
        applyBleed: form.applyBleed,
        pagesPerUnit: form.pagesPerUnit ?? undefined,
        quantities,
        tariff,
        digital:
          form.technique === 'DIGITAL' || form.technique === 'BOTH'
            ? {
                formatName: form.digitalFormatName,
                inkMode: form.digitalInkMode,
                onDemand: form.digitalOnDemand,
              }
            : undefined,
        litho:
          form.technique === 'LITHO' || form.technique === 'BOTH'
            ? {
                paperName: form.paperName,
                sheetFormat: form.sheetFormat,
                sheetCutCode: form.sheetCutCode,
                plateFormatName: form.lithoPlateFormatName,
                inkSetCode: form.lithoInkSetCode,
                plateBacking: form.lithoPlateBacking,
                manualPlateCount: form.lithoManualPlateCount ?? undefined,
                marginPercent: (form.lithoMarginPercent || 30) / 100,
                wastageSheets: form.lithoWastageSheets ?? 200,
              }
            : undefined,
        finishing: {
          cut: form.cutRuns > 0 ? { runs: form.cutRuns } : undefined,
          trim: form.trimRuns > 0 ? { runs: form.trimRuns } : undefined,
          perforation: form.perforationCount > 0 ? { count: form.perforationCount } : undefined,
          binding: form.bindingLoops > 0 ? { loops: form.bindingLoops } : undefined,
          lamination: form.laminationMode !== 'NONE' ? { mode: form.laminationMode } : undefined,
          halfCut: form.halfCutLinearCm > 0 ? { linearCm: form.halfCutLinearCm } : undefined,
          dieCut: form.dieCutPrice > 0 ? { price: form.dieCutPrice } : undefined,
        },
        commercial: {
          vatLabel: form.vatLabel,
          otherTaxPercent: form.otherTaxPercent || 0,
          clientDiscountLabel: form.clientDiscountLabel,
          otherDiscountPercent: form.otherDiscountPercent || 0,
          salesCommissionPercent: form.salesCommissionPercent || 0,
        },
      };

      return calculatePressQuote(quoteInput);
    } catch (err) {
      console.error('Error running calculatePressQuote:', err);
      return null;
    }
  }, [form, tariff]);

  // 6. Antirrebote (debounce 400ms) para registrar en QuoteAssistRun
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!result) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      fetch('/api/tariff/assist-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: form,
          result,
          quoteId: quoteId || null,
          technique: form.technique,
        }),
      }).catch((e) => console.warn('Could not auto-save assist run', e));
    }, 400);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [form, result, quoteId]);

  // 7. Guardar plantilla
  const saveCurrentAsTemplate = async (name: string) => {
    const res = await fetch('/api/tariff/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        technique: form.technique,
        input: form,
        isShared: true,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.template) {
        setTemplates((prev) => [data.template, ...prev]);
      }
    }
  };

  // 8. Cargar plantilla
  const applyTemplate = (tmpl: AssistTemplateItem) => {
    if (tmpl.input) {
      updateForm(tmpl.input);
    }
  };

  // 9. Duplicar y variar
  const duplicateAndVary = () => {
    updateForm({
      jobName: `${form.jobName || 'Trabajo'} (Copia)`,
      qty1: (form.qty1 || 1000) * 2,
      qty2: form.qty2 ? form.qty2 * 2 : null,
      qty3: form.qty3 ? form.qty3 * 2 : null,
    });
  };

  return {
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
  };
}
