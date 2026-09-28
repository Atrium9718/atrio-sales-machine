import { getCurrentUserName } from '@/lib/currentUser';
import jsPDF from "jspdf";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import autoTable from "jspdf-autotable";
import { buildQuotePdfModel, money, type QuotePdfModel } from "./quotePdfModel";

/** Texto que las fuentes estándar del PDF pueden dibujar (WinAnsi): quita emojis y símbolos raros. */
const pdfSafe = (t: unknown) =>
  String(t ?? '')
    .replace(/\t/g, ' ')
    .replace(/[^\x20-\x7E -ÿ–—‘’“”•…€\n]/g, '')
    .trim();

async function loadTemplate(): Promise<PDFDocument | null> {
  try {
    let response = await fetch('/plantilla-cotizacion.pdf?t=' + Date.now());
    if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
      response = await fetch('/api/admin/template?file=true&t=' + Date.now());
    }
    if (response.ok && !response.headers.get('content-type')?.includes('text/html')) {
      return await PDFDocument.load(await response.arrayBuffer());
    }
  } catch (e) {
    console.warn('No se pudo cargar la plantilla personalizada, se usa el PDF estándar:', e);
  }
  return null;
}

/** PDF estándar (sin plantilla): tabla paginada, IVA por tarifa, condiciones y asesor. */
function renderStandardPdf(m: QuotePdfModel) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 80, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('COTIZACIÓN COMERCIAL', 40, 45);
  doc.setFontSize(10);
  doc.text(`No. ${m.number}  |  ${m.dateLabel}`, 40, 65);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.text('CLIENTE', 40, 108);
  doc.setFontSize(10);
  const clientLines = [
    m.client.name,
    m.client.nit && `NIT / C.C.: ${m.client.nit}`,
    m.client.contact && `Contacto: ${m.client.contact}`,
    [m.client.phone, m.client.email].filter(Boolean).join('  ·  '),
    m.client.address,
  ].filter(Boolean) as string[];
  clientLines.forEach((l, i) => doc.text(pdfSafe(l), 40, 124 + i * 14));

  autoTable(doc, {
    startY: 124 + clientLines.length * 14 + 10,
    head: [['Descripción', 'Cant.', 'Vr. unit.', 'Subtotal', 'IVA', 'Total']],
    body: m.rows.map((r) => [pdfSafe([r.title, ...r.specs].join('\n')), r.quantity.toLocaleString('es-CO'), money(r.unitPrice), money(r.subtotal), r.vatLabel, money(r.total)]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 8.5, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: 230 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' }, 5: { halign: 'right' } },
    margin: { left: 40, right: 40, bottom: 50 },
  });

  let y = ((doc as any).lastAutoTable?.finalY || 300) + 20;
  const ensure = (h: number) => {
    if (y + h > H - 50) {
      doc.addPage();
      y = 50;
    }
  };
  if (m.showTotals) {
    const lines = [['Subtotal', m.subtotal], ...m.vatLines.map((v) => [v.label, v.amount])] as [string, number][];
    ensure(lines.length * 15 + 30);
    doc.setFontSize(10);
    lines.forEach(([label, amount]) => {
      doc.text(label, W - 230, y);
      doc.text(money(amount), W - 40, y, { align: 'right' });
      y += 15;
    });
    doc.setFontSize(12);
    doc.setTextColor(16, 120, 80);
    doc.text('TOTAL', W - 230, y + 6);
    doc.text(money(m.total), W - 40, y + 6, { align: 'right' });
    doc.setTextColor(30, 41, 59);
    y += 30;
  }
  const block = (title: string, text: string) => {
    const lines = doc.splitTextToSize(pdfSafe(text), W - 80);
    ensure(18 + Math.min(lines.length, 4) * 12);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 40, y);
    doc.setFont('helvetica', 'normal');
    y += 13;
    for (const line of lines) {
      ensure(12);
      doc.text(line, 40, y);
      y += 12;
    }
    y += 6;
  };
  m.conditions.forEach((c) => block(c.label, c.value));
  if (m.commercialTerms) block('Condiciones comerciales', m.commercialTerms);
  if (m.advisor.length) block('Asesor comercial', m.advisor.join('\n'));
  return doc;
}

/** Sobre la plantilla de la empresa: continúa en páginas nuevas si no cabe (antes se cortaba). */
async function renderOnTemplate(pdfDoc: PDFDocument, m: QuotePdfModel) {
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const numPages = pages.length;
  const clientName = pdfSafe(m.client.name);

  // Portada: nombre del cliente
  const page1 = pages[0];
  const { width: p1W, height: p1H } = page1.getSize();
  const nameW = bold.widthOfTextAtSize(clientName.toUpperCase(), 16);
  page1.drawText(clientName.toUpperCase(), { x: Math.max(30, (p1W - nameW) / 2), y: numPages === 1 ? p1H - 120 : 110, size: 16, font: bold, color: numPages === 1 ? rgb(0.1, 0.1, 0.1) : rgb(1, 1, 1) });
  if (m.client.nit) {
    const nitText = pdfSafe(`NIT / C.C. ${m.client.nit}`);
    const nitW = helvetica.widthOfTextAtSize(nitText, 10);
    page1.drawText(nitText, { x: Math.max(30, (p1W - nitW) / 2), y: numPages === 1 ? p1H - 138 : 95, size: 10, font: helvetica, color: numPages === 1 ? rgb(0.3, 0.3, 0.3) : rgb(0.8, 0.8, 0.8) });
  }

  let pageIdx = numPages >= 3 ? 2 : numPages >= 2 ? 1 : 0;
  let page = pages[pageIdx];
  const { width: PW, height: PH } = page.getSize();
  let bottom = 100; // la plantilla puede tener pie de página
  let y = numPages === 1 ? PH - 160 : 715;

  const wrap = (text: string, font: any, size: number, maxW: number): string[] => {
    const out: string[] = [];
    for (const para of pdfSafe(text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const test = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(test, size) <= maxW) line = test;
        else {
          if (line) out.push(line);
          line = word;
        }
      }
      out.push(line);
    }
    return out.length ? out : [''];
  };
  const drawTableHeader = () => {
    page.drawRectangle({ x: 40, y: y - 18, width: 532, height: 20, color: rgb(0.12, 0.17, 0.26) });
    const cols: [string, number][] = [['Descripción', 50], ['Cant.', 280], ['Vr. unit.', 322], ['Subtotal', 392], ['IVA', 458], ['Total', 500]];
    cols.forEach(([t, x]) => page.drawText(t, { x, y: y - 13, size: 8.5, font: bold, color: rgb(1, 1, 1) }));
    y -= 24;
  };
  const newPage = (withTableHeader: boolean) => {
    page = pdfDoc.insertPage(pageIdx + 1, [PW, PH]);
    pageIdx += 1;
    bottom = 60;
    y = PH - 50;
    page.drawText(pdfSafe(`Cotización N° ${m.number} (continuación)`), { x: 40, y, size: 9, font: bold, color: rgb(0.35, 0.4, 0.48) });
    y -= 20;
    if (withTableHeader) drawTableHeader();
  };
  const ensure = (h: number, withTableHeader = false) => {
    if (y - h < bottom) newPage(withTableHeader);
  };

  // Encabezado: número, fecha y cliente
  page.drawRectangle({ x: 40, y: y - 70, width: 532, height: 70, color: rgb(0.97, 0.98, 0.99), borderColor: rgb(0.82, 0.86, 0.9), borderWidth: 1 });
  page.drawText('COTIZACIÓN COMERCIAL', { x: 52, y: y - 20, size: 12, font: bold, color: rgb(0.08, 0.15, 0.28) });
  page.drawText(pdfSafe(`Cotización N°: ${m.number}`), { x: 52, y: y - 35, size: 9, font: bold, color: rgb(0.08, 0.38, 0.74) });
  page.drawText(pdfSafe(`Fecha: ${m.dateLabel}`), { x: 52, y: y - 49, size: 8.5, font: bold, color: rgb(0.35, 0.4, 0.48) });
  page.drawText('DATOS DEL CLIENTE', { x: 295, y: y - 16, size: 8, font: bold, color: rgb(0.35, 0.4, 0.5) });
  [clientName.slice(0, 45), m.client.nit && `NIT / C.C.: ${m.client.nit}`, [m.client.phone, m.client.email].filter(Boolean).join(' · '), m.client.address]
    .filter(Boolean)
    .slice(0, 4)
    .forEach((l, i) => page.drawText(pdfSafe(l).slice(0, 60), { x: 295, y: y - 29 - i * 11, size: i === 0 ? 9 : 8, font: i === 0 ? bold : helvetica, color: rgb(0.15, 0.15, 0.15) }));
  y -= 85;
  drawTableHeader();

  const right = (text: string, xRight: number, yy: number, font: any, size: number) =>
    page.drawText(text, { x: xRight - font.widthOfTextAtSize(text, size), y: yy, size, font, color: rgb(0.12, 0.15, 0.18) });

  for (const r of m.rows) {
    const titleLines = wrap(r.title, bold, 8.5, 220);
    const specLines = r.specs.flatMap((sp) => wrap(sp, helvetica, 7.5, 220));
    const h = Math.max(22, titleLines.length * 11 + specLines.length * 9.5 + 8);
    ensure(h, true);
    let ly = y - 8;
    titleLines.forEach((l) => {
      page.drawText(l, { x: 50, y: ly, size: 8.5, font: bold, color: rgb(0.12, 0.15, 0.18) });
      ly -= 11;
    });
    specLines.forEach((l) => {
      page.drawText(l, { x: 50, y: ly, size: 7.5, font: helvetica, color: rgb(0.35, 0.38, 0.42) });
      ly -= 9.5;
    });
    right(r.quantity.toLocaleString('es-CO'), 308, y - 8, helvetica, 8.5);
    right(money(r.unitPrice), 382, y - 8, helvetica, 8.5);
    right(money(r.subtotal), 448, y - 8, helvetica, 8.5);
    page.drawText(r.vatLabel, { x: 458, y: y - 8, size: 8, font: helvetica });
    right(money(r.total), 568, y - 8, bold, 8.5);
    page.drawLine({ start: { x: 40, y: y - h + 2 }, end: { x: 572, y: y - h + 2 }, thickness: 0.4, color: rgb(0.85, 0.87, 0.9) });
    y -= h;
  }

  if (m.showTotals) {
    const lines: [string, number][] = [['Subtotal', m.subtotal], ...m.vatLines.map((v) => [v.label, v.amount] as [string, number])];
    const h = lines.length * 15 + 34;
    ensure(h + 20);
    y -= 14;
    page.drawRectangle({ x: 350, y: y - h, width: 222, height: h, color: rgb(0.97, 0.985, 0.99), borderColor: rgb(0.82, 0.86, 0.9), borderWidth: 1 });
    let ty = y - 16;
    for (const [label, amount] of lines) {
      page.drawText(label, { x: 362, y: ty, size: 9, font: bold });
      right(money(amount), 562, ty, helvetica, 9);
      ty -= 15;
    }
    page.drawText('TOTAL', { x: 362, y: ty - 6, size: 10.5, font: bold, color: rgb(0.04, 0.55, 0.32) });
    const totalText = money(m.total);
    page.drawText(totalText, { x: 562 - bold.widthOfTextAtSize(totalText, 10.5), y: ty - 6, size: 10.5, font: bold, color: rgb(0.04, 0.55, 0.32) });
    y -= h + 10;
  }

  const block = (title: string, text: string) => {
    const lines = wrap(text, helvetica, 8.5, 520);
    ensure(24);
    y -= 12;
    page.drawText(pdfSafe(title), { x: 40, y, size: 9, font: bold, color: rgb(0.08, 0.15, 0.28) });
    y -= 12;
    for (const l of lines) {
      ensure(11);
      page.drawText(l, { x: 40, y, size: 8.5, font: helvetica, color: rgb(0.2, 0.22, 0.25) });
      y -= 11;
    }
  };
  m.conditions.forEach((c) => block(c.label, c.value));
  if (m.commercialTerms) block('Condiciones comerciales', m.commercialTerms);
  if (m.advisor.length) block('Asesor comercial', m.advisor.join('\n'));
  return pdfDoc.save();
}

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

export async function generateQuotePDF(quoteData: any, options?: { skipDownload?: boolean; returnBase64?: boolean }) {
  try {
    const m = buildQuotePdfModel(quoteData);
    const fileName = `Cotizacion_${m.number}_${m.client.name.normalize('NFD').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40)}.pdf`;
    const template = await loadTemplate();
    let bytes: Uint8Array;
    if (template) {
      bytes = await renderOnTemplate(template, m);
    } else {
      bytes = new Uint8Array(renderStandardPdf(m).output('arraybuffer'));
    }
    if (!options?.skipDownload) {
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    }
    return options?.returnBase64 ? { success: true, fileName, base64: toBase64(bytes) } : { success: true, fileName };
  } catch (err: any) {
    console.error('Error al generar PDF:', err);
    return { success: false, error: err?.message };
  }
}

/** PDF guardado en el servidor con enlace público para el cliente (registra cuándo lo abre). */
async function sharePdfLink(quoteData: any): Promise<string> {
  const pdf = await generateQuotePDF(quoteData, { skipDownload: true, returnBase64: true });
  if (!pdf.success || !pdf.base64 || !quoteData?.id) return '';
  try {
    const res = await fetch(`/api/quotes/${encodeURIComponent(quoteData.id)}/share-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64: pdf.base64, fileName: pdf.fileName, number: quoteData.number }),
    });
    const data = await res.json().catch(() => ({}));
    return data.success ? data.url : '';
  } catch (e) {
    console.error('No se pudo crear el enlace del PDF:', e);
    return '';
  }
}

let companyName: string | null = null;
async function getCompanyName(): Promise<string> {
  if (companyName) return companyName;
  try {
    const res = await fetch('/api/settings/identity');
    const data = await res.json();
    companyName = String(data?.name || '').trim() || 'Fusión Comunicación Gráfica';
  } catch {
    companyName = 'Fusión Comunicación Gráfica';
  }
  return companyName;
}

/** Texto del mensaje al cliente (WhatsApp o correo). */
export function quoteMessage(p: { clientName: string; number: string; company: string; advisor: string; pdfUrl: string; total?: number; validity?: string }) {
  const lines = [
    `Hola ${p.clientName},`,
    '',
    `Te comparto la cotización ${p.number} de ${p.company}, con el detalle de productos, valores y tiempos de entrega.`,
    '',
    p.pdfUrl ? `Puedes verla y descargarla aquí: ${p.pdfUrl}` : 'Te la envío en PDF por este medio.',
  ];
  if (p.total) lines.push('', `Valor total: $ ${Math.round(p.total).toLocaleString('es-CO')}${p.validity ? ` (válida por ${p.validity})` : ''}.`);
  lines.push('', 'Quedo atento a cualquier ajuste o para avanzar con el pedido.', '', 'Saludos,', p.advisor, p.company);
  return lines.join('\n');
}

export async function sendQuoteWhatsApp(quoteData: any) {
  const name = quoteData.clientData?.name || quoteData.clientName || 'cliente';
  const cleanPhone = String(quoteData.clientData?.phone || quoteData.clientPhone || '').replace(/[^0-9]/g, '');
  const phone = cleanPhone.length === 10 && cleanPhone.startsWith('3') ? `57${cleanPhone}` : cleanPhone;
  // La ventana se abre antes de las esperas para que el navegador no la bloquee
  const win = window.open('', '_blank');
  const [pdfUrl, company] = await Promise.all([sharePdfLink(quoteData), getCompanyName()]);
  if (!pdfUrl) await generateQuotePDF(quoteData); // sin enlace: se descarga para adjuntarlo a mano
  const text = quoteMessage({ clientName: name, number: quoteData.number, company, advisor: quoteData.advisorName || getCurrentUserName('Equipo comercial'), pdfUrl, total: quoteData.sumTotals === false ? undefined : quoteData.total, validity: quoteData.validityDays });
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  if (win) win.location.href = url;
  else window.open(url, '_blank');
  return { pdfUrl };
}

export async function sendQuoteEmail(quoteData: any) {
  const name = quoteData.clientData?.name || quoteData.clientName || 'cliente';
  const toEmail = quoteData.clientData?.email || quoteData.clientEmail || '';
  const [pdfUrl, company] = await Promise.all([sharePdfLink(quoteData), getCompanyName()]);
  if (!pdfUrl) await generateQuotePDF(quoteData);
  const subject = `Cotización ${quoteData.number} - ${company}`;
  const body = quoteMessage({ clientName: name, number: quoteData.number, company, advisor: quoteData.advisorName || getCurrentUserName('Equipo comercial'), pdfUrl, total: quoteData.sumTotals === false ? undefined : quoteData.total, validity: quoteData.validityDays });
  window.location.href = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { pdfUrl };
}
