import { itemVatRate } from '../../../../packages/core/src/pricing/quoteReview';

/**
 * Contenido del PDF de una cotización, independiente de cómo se dibuje: filas con sus
 * especificaciones, IVA por tarifa, totales y condiciones (entrega, pago, validez, notas,
 * asesor). Así la plantilla de la empresa y el PDF estándar muestran lo mismo.
 */

export interface PdfRow {
  title: string;
  /** Especificaciones: tamaño, material, tintas, acabados y líneas extra de la descripción. */
  specs: string[];
  quantity: number;
  unitPrice: number;
  subtotal: number;
  vatLabel: string;
  total: number;
}

export interface QuotePdfModel {
  number: string;
  dateLabel: string;
  client: { name: string; nit: string; contact: string; phone: string; email: string; address: string };
  rows: PdfRow[];
  showTotals: boolean;
  subtotal: number;
  vatLines: { label: string; amount: number }[];
  vatTotal: number;
  total: number;
  conditions: { label: string; value: string }[];
  commercialTerms: string;
  advisor: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (rate: number) => `${Math.round(rate * 1000) / 10}%`.replace('.', ',');

export function formatQuoteDate(value: unknown): string {
  const d = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Bogota' });
}

export function buildQuotePdfModel(q: any): QuotePdfModel {
  const cd = q?.clientData ?? {};
  const items: any[] = Array.isArray(q?.items) ? q.items : [];

  const vatByRate = new Map<number, number>();
  const rows: PdfRow[] = items.map((it) => {
    const [title, ...rest] = String(it?.description || 'Ítem').split('\n').map((l: string) => l.trim());
    const quantity = Number(it?.quantity) || 0;
    const unitPrice = Number(it?.unitPrice) || 0;
    const rate = itemVatRate(it);
    const subtotal = round2(Number(it?.subtotal ?? it?.lineSubtotal) || quantity * unitPrice);
    const vat = round2(it?.vatAmount !== undefined ? Number(it.vatAmount) || 0 : subtotal * rate);
    if (vat > 0) vatByRate.set(rate, round2((vatByRate.get(rate) ?? 0) + vat));
    const specs = [
      it?.size && `Tamaño: ${it.size}`,
      (it?.material || it?.materials) && `Material: ${it.material || it.materials}`,
      it?.inks && `Tintas: ${it.inks}`,
      it?.finishes && `Acabados: ${it.finishes}`,
    ].filter(Boolean) as string[];
    const extra = rest.filter((l) => l && !specs.some((s) => s.includes(l)));
    return {
      title: title || 'Ítem',
      specs: [...(specs.length ? [specs.join(' · ')] : []), ...extra],
      quantity,
      unitPrice,
      subtotal,
      vatLabel: rate > 0 ? pct(rate) : 'Exento',
      total: round2(Number(it?.total ?? it?.lineTotal) || subtotal + vat),
    };
  });

  const subtotal = round2(Number(q?.subtotal) || rows.reduce((s, r) => s + r.subtotal, 0));
  const vatLines = [...vatByRate.entries()].sort((a, b) => b[0] - a[0]).map(([rate, amount]) => ({ label: `IVA ${pct(rate)}`, amount }));
  const vatTotal = round2(Number(q?.vatAmount) || vatLines.reduce((s, v) => s + v.amount, 0));

  const conditions = [
    { label: 'Tiempo de entrega', value: q?.deliveryTime },
    { label: 'Forma de pago', value: q?.paymentTerms },
    { label: 'Validez de la oferta', value: q?.validityDays },
    { label: 'Observaciones', value: q?.notes },
  ]
    .filter((c) => c.value && String(c.value).trim())
    .map((c) => ({ label: c.label, value: String(c.value).trim() }));

  return {
    number: String(q?.number || 'Borrador'),
    dateLabel: formatQuoteDate(q?.date),
    client: {
      name: String(cd.name || q?.clientName || 'Cliente'),
      nit: String(cd.nit || q?.clientNit || '').trim(),
      contact: String(cd.contact || cd.billingContact || '').trim(),
      phone: String(cd.phone || q?.clientPhone || '').trim(),
      email: String(cd.email || q?.clientEmail || '').trim(),
      address: String(cd.address || q?.clientAddress || '').trim(),
    },
    rows,
    showTotals: q?.sumTotals !== false,
    subtotal,
    vatLines,
    vatTotal,
    total: round2(Number(q?.total) || subtotal + vatTotal),
    conditions,
    commercialTerms: String(q?.commercialTerms || '').trim(),
    advisor: [q?.advisorName, q?.advisorRole, q?.advisorPhone, q?.advisorEmail].map((v) => String(v || '').trim()).filter(Boolean),
  };
}

export const money = (n: number) => '$ ' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(n || 0);
