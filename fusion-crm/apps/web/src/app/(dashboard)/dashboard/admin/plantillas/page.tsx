import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Save, Eye, Bot, Mail, MessageSquare, Upload, 
  CheckCircle2, AlertCircle, Trash2, Download, RefreshCw, 
  FileCheck, X, Sparkles, Loader2 
} from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface TemplateInfo {
  exists: boolean;
  filename?: string;
  size?: number;
  updatedAt?: string;
  url?: string;
}

export default function PlantillasPage() {
  const [activeTab, setActiveTab] = useState('pdf');
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Preview Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current template status
  const fetchTemplateStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const res = await fetch('/api/admin/template?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        setTemplateInfo(data);
      } else {
        setTemplateInfo({ exists: false });
      }
    } catch (err) {
      console.error('Error al consultar estado de la plantilla:', err);
      setTemplateInfo({ exists: false });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchTemplateStatus();
  }, []);

  const notify = (type: 'success' | 'error' | 'info', message: string) => {
    setStatusNotification({ type, message });
    setTimeout(() => {
      setStatusNotification(null);
    }, 6000);
  };

  const processAndUploadFile = async (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      notify('error', 'El archivo seleccionado no es un PDF. Por favor sube un documento con extensión .pdf.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      notify('error', 'El archivo excede el tamaño máximo permitido de 25 MB.');
      return;
    }

    setIsUploading(true);
    setStatusNotification(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const response = await fetch('/api/admin/template', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              base64Data,
              filename: file.name
            }),
          });

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data.error || 'Error en la respuesta del servidor');
          }

          notify('success', `¡Plantilla "${file.name}" cargada y configurada exitosamente! Todas las nuevas cotizaciones utilizarán este formato.`);
          await fetchTemplateStatus();
        } catch (uploadErr: any) {
          console.error(uploadErr);
          notify('error', `Error al guardar la plantilla: ${uploadErr.message || 'Error desconocido'}`);
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };

      reader.onerror = () => {
        notify('error', 'Error al leer el archivo en el navegador.');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      notify('error', 'Error inesperado al preparar el archivo.');
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar la plantilla personalizada? El sistema volverá al formato estándar.')) {
      return;
    }
    try {
      const res = await fetch('/api/admin/template', { method: 'DELETE' });
      if (res.ok) {
        notify('info', 'Plantilla personalizada eliminada. Se usará el formato base predeterminado.');
        await fetchTemplateStatus();
      } else {
        notify('error', 'No se pudo eliminar la plantilla.');
      }
    } catch (err: any) {
      notify('error', 'Error de conexión al eliminar la plantilla.');
    }
  };

  // Generate test preview with real data
  const handlePreviewRealData = async () => {
    setIsGeneratingPreview(true);
    setStatusNotification(null);

    try {
      // 1. Fetch template
      let response = await fetch('/plantilla-cotizacion.pdf?t=' + Date.now());
      if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
        response = await fetch('/api/admin/template?file=true&t=' + Date.now());
      }

      if (!response.ok) {
        throw new Error('No se pudo descargar la plantilla para la previsualización.');
      }

      const templateBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(templateBytes);

      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const formatCurrencyStr = (num: number) => '$ ' + new Intl.NumberFormat('es-CO').format(num);

      let pages = pdfDoc.getPages();
      const numPages = pages.length;

      // Sample real client data
      const sampleClient = "GRUPO EMPRESARIAL ANDINO S.A.S.";
      const sampleNit = "NIT 900.876.543-2";

      // 1. Cover
      const page1 = pages[0];
      const { width: p1Width, height: p1Height } = page1.getSize();
      const textWidth = helveticaBold.widthOfTextAtSize(sampleClient, 16);
      page1.drawText(sampleClient, {
        x: Math.max(30, (p1Width - textWidth) / 2),
        y: numPages === 1 ? p1Height - 120 : 110,
        size: 16,
        font: helveticaBold,
        color: numPages === 1 ? rgb(0.1, 0.1, 0.1) : rgb(1, 1, 1),
      });

      const nitWidth = helvetica.widthOfTextAtSize(sampleNit, 10);
      page1.drawText(sampleNit, {
        x: Math.max(30, (p1Width - nitWidth) / 2),
        y: numPages === 1 ? p1Height - 138 : 95,
        size: 10,
        font: helvetica,
        color: numPages === 1 ? rgb(0.3, 0.3, 0.3) : rgb(0.8, 0.8, 0.8),
      });

      // 2. Table Page
      const currentPageIdx = numPages >= 3 ? 2 : (numPages >= 2 ? 1 : 0);
      let activePage = pages[currentPageIdx];
      const { height: activeHeight } = activePage.getSize();

      // Helper para auto-ajustar textos largos sin cortar
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
        return lines.length > 0 ? lines : [''];
      };

      const quoteNumber = "COT-2026-048";
      const quoteDate = new Date().toLocaleDateString('es-CO');

      // Encabezado principal elegante y estructurado
      const headerStartY = numPages === 1 ? activeHeight - 160 : 715;
      
      activePage.drawRectangle({
        x: 40,
        y: headerStartY - 70,
        width: 532,
        height: 70,
        color: rgb(0.97, 0.98, 0.99),
        borderColor: rgb(0.82, 0.86, 0.90),
        borderWidth: 1,
      });

      // Izquierda
      activePage.drawText("COTIZACIÓN COMERCIAL", { x: 52, y: headerStartY - 20, size: 12, font: helveticaBold, color: rgb(0.08, 0.15, 0.28) });
      activePage.drawText("Cotización N°:", { x: 52, y: headerStartY - 35, size: 9, font: helveticaBold, color: rgb(0.2, 0.25, 0.35) });
      activePage.drawText(quoteNumber, { x: 125, y: headerStartY - 35, size: 9, font: helveticaBold, color: rgb(0.08, 0.38, 0.74) });
      activePage.drawText("Fecha:", { x: 52, y: headerStartY - 49, size: 8.5, font: helveticaBold, color: rgb(0.35, 0.4, 0.48) });
      activePage.drawText(quoteDate, { x: 92, y: headerStartY - 49, size: 8.5, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
      activePage.drawText("Validez:", { x: 52, y: headerStartY - 62, size: 8.5, font: helveticaBold, color: rgb(0.35, 0.4, 0.48) });
      activePage.drawText("15 días calendario", { x: 98, y: headerStartY - 62, size: 8.5, font: helvetica, color: rgb(0.2, 0.2, 0.2) });

      activePage.drawLine({
        start: { x: 280, y: headerStartY - 8 },
        end: { x: 280, y: headerStartY - 65 },
        thickness: 0.5,
        color: rgb(0.82, 0.86, 0.90),
      });

      // Derecha
      activePage.drawText("DATOS DEL CLIENTE", { x: 295, y: headerStartY - 20, size: 9, font: helveticaBold, color: rgb(0.35, 0.4, 0.5) });
      activePage.drawText("Cliente:", { x: 295, y: headerStartY - 35, size: 9, font: helveticaBold, color: rgb(0.2, 0.25, 0.35) });
      activePage.drawText(sampleClient.substring(0, 38), { x: 340, y: headerStartY - 35, size: 9, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
      activePage.drawText("NIT / C.C.:", { x: 295, y: headerStartY - 49, size: 8.5, font: helveticaBold, color: rgb(0.35, 0.4, 0.48) });
      activePage.drawText(sampleNit, { x: 350, y: headerStartY - 49, size: 8.5, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
      activePage.drawText("Tel / Contacto:", { x: 295, y: headerStartY - 62, size: 8.5, font: helveticaBold, color: rgb(0.35, 0.4, 0.48) });
      activePage.drawText("+57 300 123 4567", { x: 365, y: headerStartY - 62, size: 8.5, font: helvetica, color: rgb(0.2, 0.2, 0.2) });

      // Cabecera de la tabla
      let currentY = headerStartY - 85;
      const drawTableHeaders = (page: any, y: number) => {
        page.drawRectangle({ x: 40, y: y - 18, width: 532, height: 20, color: rgb(0.12, 0.17, 0.26) });
        page.drawText("Descripción", { x: 50, y: y - 13, size: 8.5, font: helveticaBold, color: rgb(1, 1, 1) });
        page.drawText("Cant.", { x: 275, y: y - 13, size: 8.5, font: helveticaBold, color: rgb(1, 1, 1) });
        page.drawText("Vr. Unit.", { x: 315, y: y - 13, size: 8.5, font: helveticaBold, color: rgb(1, 1, 1) });
        page.drawText("Subtotal", { x: 385, y: y - 13, size: 8.5, font: helveticaBold, color: rgb(1, 1, 1) });
        page.drawText("IVA", { x: 455, y: y - 13, size: 8.5, font: helveticaBold, color: rgb(1, 1, 1) });
        page.drawText("Total", { x: 500, y: y - 13, size: 8.5, font: helveticaBold, color: rgb(1, 1, 1) });
      };

      drawTableHeaders(activePage, currentY);
      currentY -= 24;

      const sampleItems = [
        { desc: "1.000 Catálogos Corporativos 16pp Propalcote 150g mate, encuadernación cosida al lomo con plastificado mate sectorizado en carátula", qty: 1000, unit: 4500, sub: 4500000, vat: true, tot: 5355000 },
        { desc: "500 Cuadernos Argollados pasta dura con logo repujado al calor, 100 hojas internas personalizadas a una tinta", qty: 500, unit: 14500, sub: 7250000, vat: true, tot: 8627500 },
        { desc: "2.000 Volantes 1/4 carta full color tiro y retiro en propalcote 115g brillante", qty: 2000, unit: 180, sub: 360000, vat: true, tot: 428400 }
      ];

      sampleItems.forEach((item, i) => {
        const descLines = wrapText(item.desc, helvetica, 8.5, 215);
        const rowHeight = Math.max(22, descLines.length * 11 + 8);

        if (i % 2 === 1) {
          activePage.drawRectangle({
            x: 40,
            y: currentY - rowHeight + 4,
            width: 532,
            height: rowHeight,
            color: rgb(0.98, 0.985, 0.99),
          });
        }

        let lineY = currentY - 8;
        for (const dl of descLines) {
          activePage.drawText(dl, { x: 50, y: lineY, size: 8.5, font: helvetica, color: rgb(0.12, 0.15, 0.18) });
          lineY -= 11;
        }

        const numY = currentY - 8;
        activePage.drawText(item.qty.toString(), { x: 275, y: numY, size: 8.5, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
        activePage.drawText(formatCurrencyStr(item.unit), { x: 315, y: numY, size: 8.5, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
        activePage.drawText(formatCurrencyStr(item.sub), { x: 385, y: numY, size: 8.5, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
        activePage.drawText("19%", { x: 455, y: numY, size: 8.5, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
        activePage.drawText(formatCurrencyStr(item.tot), { x: 500, y: numY, size: 8.5, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });

        activePage.drawLine({
          start: { x: 40, y: currentY - rowHeight + 4 },
          end: { x: 572, y: currentY - rowHeight + 4 },
          thickness: 0.5,
          color: rgb(0.88, 0.90, 0.93),
        });

        currentY -= rowHeight;
      });

      // Totales & Condiciones
      currentY -= 15;

      // Condiciones Comerciales
      activePage.drawRectangle({
        x: 40,
        y: currentY - 72,
        width: 295,
        height: 72,
        color: rgb(0.98, 0.985, 0.99),
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 1,
      });
      activePage.drawText("CONDICIONES COMERCIALES", { x: 50, y: currentY - 18, size: 8, font: helveticaBold, color: rgb(0.35, 0.4, 0.48) });
      activePage.drawText("• Forma de Pago: 50% Anticipo, 50% contra entrega", { x: 50, y: currentY - 33, size: 8, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
      activePage.drawText("• Tiempo de Entrega: 5 a 7 días hábiles tras aprobación de arte", { x: 50, y: currentY - 47, size: 8, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
      activePage.drawText("• Precios sujetos a verificación de artes finales.", { x: 50, y: currentY - 61, size: 7.5, font: helvetica, color: rgb(0.4, 0.45, 0.5) });

      // Resumen Totales
      activePage.drawRectangle({
        x: 350,
        y: currentY - 72,
        width: 222,
        height: 72,
        color: rgb(0.97, 0.985, 0.99),
        borderColor: rgb(0.82, 0.86, 0.90),
        borderWidth: 1,
      });

      activePage.drawText("Subtotal:", { x: 362, y: currentY - 20, size: 9, font: helveticaBold, color: rgb(0.25, 0.3, 0.4) });
      activePage.drawText(formatCurrencyStr(12110000), { x: 455, y: currentY - 20, size: 9, font: helvetica, color: rgb(0.15, 0.15, 0.15) });

      activePage.drawText("IVA (19%):", { x: 362, y: currentY - 36, size: 9, font: helveticaBold, color: rgb(0.25, 0.3, 0.4) });
      activePage.drawText(formatCurrencyStr(2300900), { x: 455, y: currentY - 36, size: 9, font: helvetica, color: rgb(0.15, 0.15, 0.15) });

      activePage.drawLine({
        start: { x: 360, y: currentY - 44 },
        end: { x: 560, y: currentY - 44 },
        thickness: 0.8,
        color: rgb(0.80, 0.84, 0.88),
      });

      activePage.drawText("TOTAL:", { x: 362, y: currentY - 62, size: 10.5, font: helveticaBold, color: rgb(0.04, 0.55, 0.32) });
      activePage.drawText(formatCurrencyStr(14410900), { x: 450, y: currentY - 62, size: 10.5, font: helveticaBold, color: rgb(0.04, 0.55, 0.32) });

      const pdfOutputBytes = await pdfDoc.save();
      const blob = new Blob([pdfOutputBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setIsPreviewOpen(true);
    } catch (err: any) {
      console.error(err);
      notify('error', 'Error al generar la previsualización: ' + (err.message || 'Verifica que la plantilla sea un PDF válido.'));
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-border bg-card">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-primary" /> Plantillas y Textos
          </h1>
          <p className="text-muted-foreground mt-1">
            Personaliza el formato corporativo de cotizaciones, mensajes automáticos y tono del asistente IA.
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r border-border bg-muted/20 overflow-y-auto shrink-0">
          <nav className="p-4 flex flex-col gap-1">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 mt-2">Documentos</div>
            <button 
              onClick={() => setActiveTab('pdf')} 
              className={`text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between gap-2 ${
                activeTab === 'pdf' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> Cotización (PDF)
              </span>
              {templateInfo?.exists && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Plantilla activa" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('op')} 
              className={`text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'op' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
              }`}
            >
              <FileText className="w-4 h-4" /> Orden de Producción
            </button>
            
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 mt-6">Mensajería</div>
            <button 
              onClick={() => setActiveTab('email')} 
              className={`text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'email' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
              }`}
            >
              <Mail className="w-4 h-4" /> Email: Envío Cotización
            </button>
            <button 
              onClick={() => setActiveTab('wa')} 
              className={`text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'wa' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> WA: Recordatorio
            </button>

            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 mt-6">Asistente IA</div>
            <button 
              onClick={() => setActiveTab('prompt')} 
              className={`text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'prompt' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
              }`}
            >
              <Bot className="w-4 h-4" /> Prompt del Sistema (Tono)
            </button>
          </nav>
        </aside>

        {/* Main Editor / Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-background flex flex-col">
          {/* Notification Banner */}
          {statusNotification && (
            <div className={`mb-6 p-4 rounded-lg flex items-start justify-between border ${
              statusNotification.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300' 
                : statusNotification.type === 'error'
                ? 'bg-destructive/10 border-destructive/30 text-destructive'
                : 'bg-primary/10 border-primary/30 text-primary'
            }`}>
              <div className="flex items-center gap-3">
                {statusNotification.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : statusNotification.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                ) : (
                  <Sparkles className="w-5 h-5 shrink-0" />
                )}
                <span className="text-sm font-medium">{statusNotification.message}</span>
              </div>
              <button 
                onClick={() => setStatusNotification(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'pdf' ? (
            <div className="flex-1 flex flex-col max-w-4xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    Plantilla de Cotización (PDF)
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Carga el diseño membretado o institucional en PDF. El generador superpondrá automáticamente los datos del cliente, tabla de ítems, totales e impuestos.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchTemplateStatus}
                    disabled={isLoadingStatus}
                    className="p-2 border border-border rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Actualizar estado"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                  </button>

                  <button 
                    onClick={handlePreviewRealData}
                    disabled={isGeneratingPreview || (!templateInfo?.exists && !isLoadingStatus)}
                    className="flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isGeneratingPreview ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Previsualizar con datos reales</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Current Template Status Card */}
              <div className="p-5 border border-border rounded-xl bg-card shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${templateInfo?.exists ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                      <FileCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          templateInfo?.exists 
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${templateInfo?.exists ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                          {templateInfo?.exists ? 'Plantilla personalizada activa' : 'Formato base predeterminado'}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold mt-1.5 text-foreground">
                        {templateInfo?.exists 
                          ? (templateInfo.filename || 'plantilla-cotizacion.pdf') 
                          : 'Generador estándar de cotizaciones'}
                      </h3>

                      <p className="text-xs text-muted-foreground mt-0.5">
                        {templateInfo?.exists ? (
                          <>
                            Tamaño: <span className="font-mono font-medium">{formatFileSize(templateInfo.size)}</span>
                            {templateInfo.updatedAt && (
                              <> • Última actualización: <span className="font-medium">{formatDate(templateInfo.updatedAt)}</span></>
                            )}
                          </>
                        ) : (
                          'No se ha subido una plantilla PDF personalizada. Las cotizaciones se generan con el formato tipográfico estándar del sistema.'
                        )}
                      </p>
                    </div>
                  </div>

                  {templateInfo?.exists && (
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href="/api/admin/template?download=true"
                        download="plantilla-cotizacion.pdf"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-xs font-medium hover:bg-muted text-foreground transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Descargar PDF
                      </a>

                      <button
                        onClick={handleDeleteTemplate}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-destructive/20 text-destructive hover:bg-destructive/10 rounded text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Restablecer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Dropzone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-8 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center ${
                  isDragging 
                    ? 'border-primary bg-primary/5 scale-[1.005]' 
                    : 'border-border bg-muted/10 hover:bg-muted/20'
                }`}
              >
                <div className={`p-4 rounded-full mb-3 ${isDragging ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <Upload className="w-7 h-7" />
                </div>

                <h3 className="text-base font-semibold text-foreground mb-1">
                  {isDragging ? 'Suelta el archivo PDF aquí' : 'Cargar nueva plantilla en PDF'}
                </h3>
                
                <p className="text-xs text-muted-foreground mb-5 max-w-md">
                  Arrastra y suelta tu archivo PDF aquí, o haz clic en el botón para seleccionarlo desde tu equipo.
                  Admite plantillas de 1, 2, 3 o más páginas con membrete corporativo (máx. 25 MB).
                </p>

                <input 
                  type="file" 
                  accept=".pdf,application/pdf" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileInputChange} 
                />

                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Subiendo y guardando plantilla...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Seleccionar Archivo PDF</span>
                    </>
                  )}
                </button>
              </div>

              {/* Information / Guidelines Card */}
              <div className="p-4 border border-border rounded-lg bg-card/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> ¿Cómo funciona la superposición de datos?
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li><strong>Portada (Hoja 1):</strong> Se inyecta el nombre completo del cliente y el NIT centrado en la parte inferior o superior del documento.</li>
                  <li><strong>Tabla de Ítems:</strong> Los productos, cantidades, precios unitarios, IVA y subtotales se acomodan automáticamente sobre las hojas de cotización. Si la plantilla tiene 3 o más páginas, se ubican a partir de la página 3.</li>
                  <li><strong>Condiciones comerciales:</strong> Términos de pago y tiempos de entrega se imprimen en la sección de cierre o en la última página del archivo.</li>
                </ul>
              </div>
            </div>
          ) : activeTab === 'prompt' ? (
            <div className="flex-1 flex flex-col max-w-4xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">Tono de Marca (Prompt Sistema)</h2>
                <span className="text-xs bg-muted px-2 py-1 rounded font-mono">v14</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Este texto se inyecta en el contexto base del asistente de IA. Define cómo debe comportarse, qué español usar y qué palabras evitar.
              </p>
              
              <textarea 
                className="flex-1 p-4 border border-border rounded-lg bg-card font-mono text-sm resize-none focus:ring-1 focus:ring-primary outline-none min-h-[300px]"
                defaultValue={`Eres el asistente virtual comercial de Mi Empresa S.A.S.
                
REGLAS DE TONO:
- Usa un tono "formal cercano".
- Trata siempre de "usted" (nunca de "tú" ni "vos").
- Usa español de Colombia (ej. "cotización" en lugar de "presupuesto", "celular" en lugar de "móvil").
- Sé extremadamente conciso. No saludes repetidamente.
- Nunca prometas tiempos de entrega menores a 3 días hábiles.

PALABRAS PROHIBIDAS:
- "Barato" (usa "económico" o "rentable")
- "Inmediatamente" (usa "lo más pronto posible")

EJEMPLO DE RESPUESTA BUENA:
"Con gusto revisaré su solicitud para la impresión de los 1.000 volantes. Nuestro equipo comercial le enviará la cotización al correo registrado en menos de 2 horas hábiles."`}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col max-w-4xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Plantilla de {activeTab === 'op' ? 'Orden de Producción' : 'Email'}</h2>
              </div>
              
              <div className="mb-4">
                <label className="text-sm font-medium">Asunto / Título</label>
                <input 
                  type="text" 
                  defaultValue="Cotización {{numero_cotizacion}} - {{nombre_empresa}}" 
                  className="mt-1 px-3 py-2 border border-border rounded w-full bg-card font-mono text-sm" 
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-sm font-medium mb-1">Cuerpo / Contenido</label>
                <textarea 
                  className="flex-1 p-4 border border-border rounded-lg bg-card font-mono text-sm resize-none focus:ring-1 focus:ring-primary outline-none min-h-[250px]"
                  defaultValue={`Hola {{contacto.nombre}},

Adjunto enviamos la cotización solicitada para su revisión.

Resumen:
- Documento: {{numero_cotizacion}}
- Valor Total: {{cotizacion.total_formateado}}
- Vigencia: {{vigencia_dias}} días

Si tiene alguna duda, puede responder a este mensaje.

Atentamente,
{{usuario.nombre}}
{{organizacion.nombre}}`}
                />
              </div>
              
              <div className="mt-4 p-4 border border-border rounded bg-muted/20">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-muted-foreground">Variables Disponibles</h4>
                <div className="flex flex-wrap gap-2">
                  {['{{numero_cotizacion}}', '{{contacto.nombre}}', '{{nombre_empresa}}', '{{cotizacion.total_formateado}}', '{{vigencia_dias}}', '{{usuario.nombre}}', '{{organizacion.nombre}}'].map(v => (
                    <span key={v} className="text-xs font-mono bg-background border border-border px-2 py-1 rounded cursor-copy hover:bg-muted">{v}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    Previsualización con Datos Reales
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Verificación de superposición de cliente, tabla de productos e impuestos sobre la plantilla.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewPdfUrl}
                  download="Cotizacion_Prueba_Plantilla.pdf"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar PDF
                </a>
                <button
                  onClick={() => {
                    setIsPreviewOpen(false);
                    if (previewPdfUrl) {
                      URL.revokeObjectURL(previewPdfUrl);
                      setPreviewPdfUrl(null);
                    }
                  }}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body (Iframe) */}
            <div className="flex-1 p-2 bg-muted/10">
              <iframe
                src={previewPdfUrl}
                title="Previsualización Cotización"
                className="w-full h-full rounded border border-border bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
