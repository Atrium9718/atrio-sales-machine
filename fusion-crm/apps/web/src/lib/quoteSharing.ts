import { getCurrentUserName } from '@/lib/currentUser';
import jsPDF from "jspdf";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import autoTable from "jspdf-autotable";

export async function generateQuotePDF(quoteData: any, options?: { skipDownload?: boolean; returnBase64?: boolean }) {
  try {
    const clientName = quoteData.clientData?.name || quoteData.clientName || "Cliente";
    const cleanName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Cotizacion_${quoteData.number || 'FCG'}_${cleanName}.pdf`;

    // Intentar cargar la plantilla PDF
    let templateBytes: ArrayBuffer | null = null;
    let pdfDoc: PDFDocument | null = null;
    try {
      let response = await fetch('/plantilla-cotizacion.pdf?t=' + Date.now());
      if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
        response = await fetch('/api/admin/template?file=true&t=' + Date.now());
      }

      if (response.ok && !response.headers.get('content-type')?.includes('text/html')) {
        templateBytes = await response.arrayBuffer();
        pdfDoc = await PDFDocument.load(templateBytes);
      }
    } catch (e) {
      console.warn("No se pudo cargar la plantilla personalizada, usando generación estándar:", e);
    }

    if (!pdfDoc) {
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 80, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text("COTIZACIÓN COMERCIAL", 40, 45);
      doc.setFontSize(10);
      doc.text(`No. ${quoteData.number || 'FCG'} | Fecha: ${quoteData.date || new Date().toLocaleDateString('es-CO')}`, 40, 65);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.text("DATOS DEL CLIENTE:", 40, 110);
      doc.setFontSize(10);
      doc.text(`Nombre / Razón Social: ${clientName}`, 40, 128);
      doc.text(`NIT / C.C.: ${quoteData.clientNit || quoteData.clientData?.nit || 'S/N'}`, 40, 144);
      doc.text(`Email: ${quoteData.clientEmail || quoteData.clientData?.email || 'N/A'}`, 40, 160);
      doc.text(`Teléfono: ${quoteData.clientPhone || quoteData.clientData?.phone || 'N/A'}`, 40, 176);

      const tableData = (quoteData.items || []).map((it: any) => [
        it.description || 'Ítem',
        String(it.quantity || 1),
        '$ ' + new Intl.NumberFormat('es-CO').format(it.unitPrice || 0),
        '$ ' + new Intl.NumberFormat('es-CO').format(it.subtotal || ((it.quantity || 1) * (it.unitPrice || 0))),
        it.applyVat ? '19%' : '0%',
        '$ ' + new Intl.NumberFormat('es-CO').format(it.total || it.subtotal || 0)
      ]);

      autoTable(doc, {
        startY: 200,
        head: [['Descripción', 'Cant.', 'Vr. Unit.', 'Subtotal', 'IVA', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 9 }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 350;
      doc.setFontSize(10);
      doc.text(`Subtotal: $ ${new Intl.NumberFormat('es-CO').format(quoteData.subtotal)}`, pageWidth - 200, finalY + 30);
      doc.text(`IVA (19%): $ ${new Intl.NumberFormat('es-CO').format(quoteData.vatAmount || 0)}`, pageWidth - 200, finalY + 45);
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129);
      doc.text(`TOTAL: $ ${new Intl.NumberFormat('es-CO').format(quoteData.total)}`, pageWidth - 200, finalY + 65);

      if (!options?.skipDownload) {
        doc.save(fileName);
      }
      
      if (options?.returnBase64) {
        const out = doc.output('datauristring');
        return { success: true, fileName, base64: out.split(',')[1] };
      }
      return { success: true, fileName };
    }

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const formatCurrencyStr = (num: number) => '$ ' + new Intl.NumberFormat('es-CO').format(num);

    let pages = pdfDoc.getPages();
    const numPages = pages.length;
    const page1 = pages[0];
    const { width: p1Width, height: p1Height } = page1.getSize();
    const textWidth = helveticaBold.widthOfTextAtSize(clientName.toUpperCase(), 16);
    page1.drawText(clientName.toUpperCase(), {
      x: Math.max(30, (p1Width - textWidth) / 2),
      y: numPages === 1 ? p1Height - 120 : 110,
      size: 16,
      font: helveticaBold,
      color: numPages === 1 ? rgb(0.1, 0.1, 0.1) : rgb(1, 1, 1),
    });
    
    const nitText = `NIT / C.C. ${quoteData.clientNit || quoteData.clientData?.nit || 'S/N'}`;
    const nitWidth = helvetica.widthOfTextAtSize(nitText, 10);
    page1.drawText(nitText, {
      x: Math.max(30, (p1Width - nitWidth) / 2),
      y: numPages === 1 ? p1Height - 138 : 95,
      size: 10,
      font: helvetica,
      color: numPages === 1 ? rgb(0.3, 0.3, 0.3) : rgb(0.8, 0.8, 0.8),
    });

    let currentPageIdx = numPages >= 3 ? 2 : (numPages >= 2 ? 1 : 0);
    let activePage = pages[currentPageIdx];
    let { height: activeHeight } = activePage.getSize();

    const wrapText = (text: string, font: any, fontSize: number, maxWidth: number): string[] => {
      if (!text) return [''];
      const words = String(text).replace(/\r\n/g, '\n').split(/\s+/);
      const lines: string[] = [];
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    const quoteNumber = quoteData.number || 'COT-2026-001';
    const quoteDate = quoteData.date || new Date().toLocaleDateString('es-CO');
    const quoteNit = quoteData.clientNit || quoteData.clientData?.nit || 'S/N';
    const clientPhone = quoteData.clientPhone || quoteData.clientData?.phone || quoteData.clientEmail || 'N/A';
    const items = quoteData.items || [];

    const drawMainHeader = (page: any, startY: number) => {
      page.drawRectangle({ x: 40, y: startY - 70, width: 532, height: 70, color: rgb(0.97, 0.98, 0.99), borderColor: rgb(0.82, 0.86, 0.90), borderWidth: 1 });
      page.drawText("COTIZACIÓN COMERCIAL", { x: 52, y: startY - 20, size: 12, font: helveticaBold, color: rgb(0.08, 0.15, 0.28) });
      page.drawText(`Cotización N°: ${quoteNumber}`, { x: 52, y: startY - 35, size: 9, font: helveticaBold, color: rgb(0.08, 0.38, 0.74) });
      page.drawText(`Fecha: ${quoteDate}`, { x: 52, y: startY - 49, size: 8.5, font: helveticaBold, color: rgb(0.35, 0.4, 0.48) });
      page.drawText("DATOS DEL CLIENTE", { x: 295, y: startY - 20, size: 9, font: helveticaBold, color: rgb(0.35, 0.4, 0.5) });
      page.drawText(`Cliente: ${clientName.substring(0, 40)}`, { x: 295, y: startY - 35, size: 9, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(`NIT / C.C.: ${quoteNit}`, { x: 295, y: startY - 49, size: 8.5, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
    };

    const drawTableHeaders = (page: any, y: number) => {
      page.drawRectangle({ x: 40, y: y - 18, width: 532, height: 20, color: rgb(0.12, 0.17, 0.26) });
      page.drawText("Descripción", { x: 50, y: y - 13, size: 8.5, font: helveticaBold, color: rgb(1, 1, 1) });
      page.drawText("Cant.", { x: 275, y: y - 13, size: 8.5, font: helveticaBold, color: rgb(1, 1, 1) });
      page.drawText("Vr. Unit.", { x: 315, y: y - 13, size: 8.5, font: helveticaBold, color: rgb(1, 1, 1) });
      page.drawText("Subtotal", { x: 385, y: y - 13, size: 8.5, font: helveticaBold, color: rgb(1, 1, 1) });
      page.drawText("IVA", { x: 455, y: y - 13, size: 8.5, font: helveticaBold, color: rgb(1, 1, 1) });
      page.drawText("Total", { x: 500, y: y - 13, size: 8.5, font: helveticaBold, color: rgb(1, 1, 1) });
    };

    const headerStartY = numPages === 1 ? activeHeight - 160 : 715;
    drawMainHeader(activePage, headerStartY);

    let currentY = headerStartY - 85;
    drawTableHeaders(activePage, currentY);
    currentY -= 24;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const { description = '', quantity = 1, unitPrice = 0, subtotal, applyVat, total } = it;
      const lineSubtotal = subtotal || (quantity * unitPrice);
      const lineTotal = total || (applyVat ? Math.round(lineSubtotal * 1.19) : lineSubtotal);

      const descLines = wrapText(description, helvetica, 8.5, 215);
      const rowHeight = Math.max(22, descLines.length * 11 + 8);

      if (currentY - rowHeight < 100) break; // Simplified for shared lib

      let lineY = currentY - 8;
      for (let l = 0; l < descLines.length; l++) {
        activePage.drawText(descLines[l], { x: 50, y: lineY, size: 8.5, font: helvetica, color: rgb(0.12, 0.15, 0.18) });
        lineY -= 11;
      }

      activePage.drawText(quantity.toString(), { x: 275, y: currentY - 8, size: 8.5, font: helvetica });
      activePage.drawText(formatCurrencyStr(unitPrice), { x: 315, y: currentY - 8, size: 8.5, font: helvetica });
      activePage.drawText(formatCurrencyStr(lineSubtotal), { x: 385, y: currentY - 8, size: 8.5, font: helvetica });
      activePage.drawText(applyVat ? '19%' : '0%', { x: 455, y: currentY - 8, size: 8.5, font: helvetica });
      activePage.drawText(formatCurrencyStr(lineTotal), { x: 500, y: currentY - 8, size: 8.5, font: helveticaBold });

      currentY -= rowHeight;
    }

    if (quoteData.sumTotals !== false) {
      currentY -= 20;
      activePage.drawRectangle({ x: 350, y: currentY - 72, width: 222, height: 72, color: rgb(0.97, 0.985, 0.99), borderColor: rgb(0.82, 0.86, 0.90), borderWidth: 1 });
      activePage.drawText("Subtotal:", { x: 362, y: currentY - 20, size: 9, font: helveticaBold });
      activePage.drawText(formatCurrencyStr(quoteData.subtotal), { x: 455, y: currentY - 20, size: 9, font: helvetica });
      activePage.drawText("IVA (19%):", { x: 362, y: currentY - 36, size: 9, font: helveticaBold });
      activePage.drawText(formatCurrencyStr(quoteData.vatAmount || 0), { x: 455, y: currentY - 36, size: 9, font: helvetica });
      activePage.drawText("TOTAL:", { x: 362, y: currentY - 62, size: 10.5, font: helveticaBold, color: rgb(0.04, 0.55, 0.32) });
      activePage.drawText(formatCurrencyStr(quoteData.total), { x: 450, y: currentY - 62, size: 10.5, font: helveticaBold, color: rgb(0.04, 0.55, 0.32) });
    }

    const pdfOutputBytes = await pdfDoc.save();
    const blob = new Blob([pdfOutputBytes], { type: 'application/pdf' });
    
    if (!options?.skipDownload) {
      const blobUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = fileName;
      downloadLink.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    }

    if (options?.returnBase64) {
      let binary = '';
      const bytes = new Uint8Array(pdfOutputBytes);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return { success: true, fileName, base64: btoa(binary) };
    }

    return { success: true, fileName };
  } catch (err: any) {
    console.error("Error al generar PDF:", err);
    return { success: false, error: err?.message };
  }
}

async function uploadPDF(base64: string, fileName: string, quoteId: string) {
  try {
    const res = await fetch('/api/quotes/upload-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64: base64, fileName, quoteId })
    });
    const data = await res.json();
    return data.success ? data.url : null;
  } catch (e) {
    console.error("Error uploading PDF:", e);
    return null;
  }
}

export async function sendQuoteWhatsApp(quoteData: any) {
  const name = quoteData.clientData?.name || quoteData.clientName || 'Cliente';
  const rawPhone = quoteData.clientData?.phone || quoteData.clientPhone || '';
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  const phoneFormatted = cleanPhone.length === 10 && cleanPhone.startsWith('3') ? `57${cleanPhone}` : cleanPhone;
  const advisor = quoteData.advisorName || getCurrentUserName('Equipo comercial');

  let pdfUrl = '';
  const pdfRes = await generateQuotePDF(quoteData, { skipDownload: true, returnBase64: true });
  if (pdfRes.success && pdfRes.base64) {
    pdfUrl = await uploadPDF(pdfRes.base64, pdfRes.fileName || 'cotizacion.pdf', quoteData.id);
  }

  const message = `Estimado/a ${name},

Es un placer saludarle.

De acuerdo con nuestra conversación, adjunto a este mensaje la cotización correspondiente a los servicios de Fusión Comunicación Gráfica S.A.S.. En el documento encontrará detallados los costos, alcances y tiempos estimados para el desarrollo de su requerimiento.

${pdfUrl ? `Puedes ver y descargar la cotización aquí: ${pdfUrl}\n` : ''}
Quedo a su completa disposición para resolver cualquier duda, ajustar detalles o avanzar con la propuesta.

Atentamente,

${advisor}

Fusión Comunicación Gráfica S.A.S.`;

  const waUrl = phoneFormatted ? `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}

export async function sendQuoteEmail(quoteData: any) {
  const name = quoteData.clientData?.name || quoteData.clientName || 'Cliente';
  const toEmail = quoteData.clientData?.email || quoteData.clientEmail || '';
  const subject = `Cotización ${quoteData.number} - Fusión Comunicación Gráfica S.A.S. - ${name}`;
  const advisor = quoteData.advisorName || getCurrentUserName('Equipo comercial');

  let pdfUrl = '';
  const pdfRes = await generateQuotePDF(quoteData, { skipDownload: true, returnBase64: true });
  if (pdfRes.success && pdfRes.base64) {
    pdfUrl = await uploadPDF(pdfRes.base64, pdfRes.fileName || 'cotizacion.pdf', quoteData.id);
  }

  const body = `Estimado/a ${name},

Es un placer saludarle.

De acuerdo con nuestra conversación, adjunto a este mensaje la cotización correspondiente a los servicios de Fusión Comunicación Gráfica S.A.S.. En el documento encontrará detallados los costos, alcances y tiempos estimados para el desarrollo de su requerimiento.

${pdfUrl ? `Puedes descargar la cotización en el siguiente enlace:\n${pdfUrl}\n` : ''}
Quedo a su completa disposición para resolver cualquier duda, ajustar detalles o avanzar con la propuesta.

Atentamente,

${advisor}

Fusión Comunicación Gráfica S.A.S.`;

  const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
}
