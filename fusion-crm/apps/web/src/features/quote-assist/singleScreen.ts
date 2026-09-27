import { ASSIST_STEPS, AssistFormState, AssistPanelMode, AssistStep } from './types';

/**
 * Pantalla única de "Ayuda para cotizar": una sola elección de qué se cotiza reemplaza el
 * selector de modo (Guiado / Manual / Gran formato) y el de técnica (Digital / Lito / Comparar).
 */
export type AssistKind = 'DIGITAL' | 'LITHO' | 'BOTH' | 'WIDE_FORMAT' | 'MANUAL';

export const ASSIST_KINDS: { kind: AssistKind; label: string; hint: string }[] = [
  { kind: 'DIGITAL', label: 'Digital', hint: 'Tirajes cortos, prensa láser' },
  { kind: 'LITHO', label: 'Litografía', hint: 'Offset con planchas' },
  { kind: 'BOTH', label: 'Comparar', hint: 'Digital vs. lito y punto de equilibrio' },
  { kind: 'WIDE_FORMAT', label: 'Gran formato', hint: 'UV-DTF por centímetro' },
  { kind: 'MANUAL', label: 'Lito a mano', hint: 'Hoja manual con precios propios' },
];

export function kindOf(mode: AssistPanelMode, technique: AssistFormState['technique']): AssistKind {
  if (mode === 'MANUAL') return 'MANUAL';
  if (mode === 'WIDE_FORMAT') return 'WIDE_FORMAT';
  return technique;
}

/** Modo del panel y, si aplica, técnica del motor para una elección. */
export function applyKind(kind: AssistKind): { mode: AssistPanelMode; technique?: AssistFormState['technique'] } {
  if (kind === 'MANUAL') return { mode: 'MANUAL' };
  if (kind === 'WIDE_FORMAT') return { mode: 'WIDE_FORMAT' };
  return { mode: 'GUIDED', technique: kind };
}

/** Secciones visibles del formulario guiado (papel y montaje solo aplica a litografía). */
export function sectionsFor(technique: AssistFormState['technique']) {
  return ASSIST_STEPS.filter((s) => !(s.key === 'papel' && technique === 'DIGITAL'));
}

export const sectionId = (step: AssistStep) => `assist-section-${step}`;

/** Resumen de una línea de las condiciones comerciales (la sección va plegada). */
export function commercialSummary(form: AssistFormState): string {
  const parts = [form.vatLabel];
  if (form.clientDiscountLabel && form.clientDiscountLabel !== 'Ninguno') parts.push(`desc. ${form.clientDiscountLabel}`);
  if (form.otherDiscountPercent > 0) parts.push(`desc. ${form.otherDiscountPercent}%`);
  if (form.otherTaxPercent > 0) parts.push(`otros imp. ${form.otherTaxPercent}%`);
  if (form.salesCommissionPercent > 0) parts.push(`comisión ${form.salesCommissionPercent}%`);
  if (form.deliveryTime) parts.push(`entrega ${form.deliveryTime}`);
  return parts.join(' · ');
}

/** Resumen de acabados para la cabecera de la sección. */
export function finishingSummary(form: AssistFormState): string {
  const parts: string[] = [];
  if (form.laminationMode && form.laminationMode !== 'NONE') parts.push('plastificado');
  if (form.cutRuns > 0) parts.push(`${form.cutRuns} corte${form.cutRuns === 1 ? '' : 's'}`);
  if (form.trimRuns > 0) parts.push('refile');
  if (form.perforationCount > 0) parts.push('perforado');
  if (form.bindingLoops > 0) parts.push('argollado');
  if (form.halfCutLinearCm > 0) parts.push('medio corte');
  if (form.dieCutPrice > 0) parts.push('troquel');
  for (const label of [form.other1Label, form.other2Label, form.other3Label]) if (label) parts.push(label);
  return parts.length ? parts.join(' · ') : 'Sin acabados';
}
