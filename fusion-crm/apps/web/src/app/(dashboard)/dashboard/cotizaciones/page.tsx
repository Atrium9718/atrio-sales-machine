"use client";

import Decimal from "decimal.js";
import { parseNumericInput, formatCurrencyDisplay } from "../../../../../../../packages/core/src/utils/format";
import { fuzzyMatchAny, fuzzyMatch } from "../../../../../../../packages/core/src/utils/search";
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { searchCustomers } from "@/lib/customerService";
import { z } from "zod";
import jsPDF from "jspdf";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import autoTable from "jspdf-autotable";
import { addProject } from "../../../../lib/projectsStore";
import { getClients, addClient } from "../../../../lib/clientsStore";
import { getQuotes, addQuote, updateQuoteStatus, deleteQuote, seedQuotes, syncQuotesFromApi } from "../../../../lib/quotesStore";
import { generateQuotePDF, sendQuoteWhatsApp, sendQuoteEmail } from "../../../../lib/quoteSharing";
import PrecotizacionesView from "../comercial/precotizaciones/PrecotizacionesView";
import { QuoteAssistSheet, AssistRunReadOnlyModal, MassRecalculateModal } from "../../../../features/quote-assist";
import { 
  Calculator, History, Settings, Building2, UserPlus, Search, Package, 
  Plus, GripVertical, Copy, ChevronDown, ChevronUp, UploadCloud, Save, 
  FileText, Mail, MessageCircle, PenLine, X, AlertCircle, CheckCircle2,
  Edit, Trash2, ExternalLink, Eye, ArrowRight, Check, Sparkles, RefreshCw, Lock, Trophy
} from "lucide-react";

// --- PRICING LOGIC ---
function calcularCostoInterno(input: {
  laborHours: number;
  laborRatePerHour: number;
  dailyDivisor: number;
  rawMaterialCost: number;
  marginPercent: number;
}) {
  const { laborHours, laborRatePerHour, dailyDivisor, rawMaterialCost, marginPercent } = input;
  
  const laborCost = dailyDivisor > 0 ? (laborHours * laborRatePerHour) / dailyDivisor : 0;
  const base = laborCost + rawMaterialCost;
  const marginAmount = base * (marginPercent / 100);
  const suggestedUnitPrice = Math.round(base + marginAmount);
  
  return {
    base,
    suggestedUnitPrice,
    breakdown: { laborCost, rawMaterialCost, marginAmount }
  };
}

function resolverDesdeCampoEditado(
  valores: { quantity: number, unitPrice: number, subtotal?: number, total?: number, lineSubtotal?: number, lineTotal?: number },
  campoEditado: 'quantity' | 'unitPrice' | 'lineSubtotal' | 'lineTotal',
  vatRate: number,
  applyVat: boolean
) {
  let quantity = valores.quantity;
  let unitPrice = valores.unitPrice;
  let subtotal = valores.subtotal !== undefined ? valores.subtotal : (valores.lineSubtotal ?? 0);
  let total = valores.total !== undefined ? valores.total : (valores.lineTotal ?? 0);
  
  if (campoEditado === 'quantity') {
    subtotal = quantity * unitPrice;
  } else if (campoEditado === 'unitPrice') {
    if (quantity <= 0 || isNaN(quantity)) quantity = 1;
    subtotal = quantity * unitPrice;
  } else if (campoEditado === 'lineSubtotal') {
    if (quantity <= 0 || isNaN(quantity)) quantity = 1;
    unitPrice = subtotal / quantity;
  } else if (campoEditado === 'lineTotal') {
    subtotal = applyVat ? total / (1 + vatRate) : total;
    if (quantity <= 0 || isNaN(quantity)) quantity = 1;
    unitPrice = subtotal / quantity;
  }

  const vatAmount = applyVat ? subtotal * vatRate : 0;
  total = subtotal + vatAmount;

  const roundedUnitPrice = Math.round(unitPrice * 100) / 100;
  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const roundedVat = Math.round(vatAmount * 100) / 100;
  const roundedTotal = Math.round(total * 100) / 100;
  
  return { 
    quantity, 
    unitPrice: roundedUnitPrice, 
    subtotal: roundedSubtotal, 
    lineSubtotal: roundedSubtotal, 
    vatAmount: roundedVat, 
    total: roundedTotal,
    lineTotal: roundedTotal
  };
}
// --- END PRICING LOGIC ---

type ProductionMode = 'IN_HOUSE' | 'OUTSOURCED' | 'AGENCY';

interface QuoteItem {
  id: string;
  order: number;
  description: string;
  productionMode: ProductionMode;
  size: string;
  inks: string;
  material: string;
  finishes: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  applyVat: boolean;
  vatAmount: number;
  total: number;
  
  showCalcPanel: boolean;
  laborHours: number;
  rawMaterialCost: number;
  marginPercent: number;
  isManuallyAdjusted: boolean;
  lastEditedField: 'quantity' | 'unitPrice' | 'lineSubtotal' | 'lineTotal';

  // Campos técnicos asistidos (Etapa 18.5)
  reference?: string;
  unit?: string;
  lineSubtotal?: number;
  lineTotal?: number;
  printTechnique?: 'DIGITAL' | 'LITHO';
  materials?: string;
  outsourcedCost?: number;
  otherCost?: number;
  internalCost?: number;
  suggestedUnitPrice?: number;
  manualAdjustedPrice?: number;
  paperTypeId?: string | null;
  paperSheets?: number | null;
  wastePercent?: number;
  plateCount?: number | null;
  sheetsNeeded?: number;
  impositionPerSheet?: number;
  productionSpec?: string;
  assistRunId?: string;
  assistInput?: any;
  assistResult?: any;
}

const CONFIG = {
  tarifaHoraMO: 90404,
  divisorJornada: 6,
  vatRate: 0.19,
  margins: {
    IN_HOUSE: 35,
    OUTSOURCED: 20,
    AGENCY: 15
  }
};

const formatCurrency = (val: number) => `$ ${val.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const parseCurrency = (val: string) => Number(val.replace(/[^0-9.-]+/g,""));

function SmartNumberInput({ value, onChange, className, prefix = "", min }: { value: number, onChange: (val: string) => void, className?: string, prefix?: string, min?: string }) {
  const [localVal, setLocalVal] = React.useState((value || value === 0) ? value.toLocaleString("es-CO") : "");
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) setLocalVal((value || value === 0) ? value.toLocaleString("es-CO") : "");
  }, [value, isFocused]);

  return (
    <div className="relative group w-full h-full">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">{prefix}</span>}
      <input
        type="text"
        value={localVal}
        min={min}
        onChange={(e) => {
          setLocalVal(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          setLocalVal((value || value === 0) ? value.toLocaleString("es-CO") : "");
        }}
        className={`${className} ${prefix ? "pl-8" : "px-3"}`}
      />
    </div>
  );
}

// --- COTIZADOR MAIN COMPONENT ---
export default function CotizadorPage({ defaultTab }: { defaultTab?: 'quote' | 'history' | 'precotizaciones' | 'config' }) {
  const location = useLocation();

  const getInitialTab = (): 'quote' | 'history' | 'precotizaciones' | 'config' => {
    if (defaultTab) return defaultTab;
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      if (search.includes('quoteId') || search.includes('preQuoteId')) {
        return 'quote';
      }
      if (path.includes('comercial/precotizaciones') || search.includes('tab=precotizaciones')) {
        return 'precotizaciones';
      }
      if (path.includes('comercial/cotizaciones') || search.includes('tab=history')) {
        return 'history';
      }
    }
    return 'quote';
  };

  const [activeTab, setActiveTab] = React.useState<'quote' | 'history' | 'precotizaciones' | 'config'>(getInitialTab());
  const [editingQuote, setEditingQuote] = React.useState<any>(null);
  const hasCostRead = true; // Simulating permission

  // Cargar cotización desde parámetros de búsqueda inmediatamente
  React.useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    } else if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('comercial/cotizaciones')) {
        setActiveTab('history');
      }
    }

    const loadTargetQuote = (quotesList?: any[]) => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('quoteId') || urlParams.get('id') || urlParams.get('preQuoteId');
        if (targetId) {
          const list = Array.isArray(quotesList) ? quotesList : getQuotes();
          if (Array.isArray(list) && list.length > 0) {
            const found = list.find((q: any) => q.id === targetId || q.number === targetId);
            if (found) {
              setEditingQuote(found);
              setActiveTab('quote');
              return true;
            }
          }
        }
      }
      return false;
    };

    // 1. Carga inmediata desde almacén local
    loadTargetQuote();

    // 2. Carga reactiva cuando se sincroniza con el API / Firestore
    syncQuotesFromApi().then((allQuotes: any[]) => {
      loadTargetQuote(allQuotes);
    });
  }, [defaultTab, location.search]);

  const handleStartNewQuote = () => {
    setEditingQuote(null);
    setActiveTab('quote');
  };

  const handleContinueQuote = (quote: any) => {
    setEditingQuote(quote);
    setActiveTab('quote');
  };

  return (
    <div className="flex flex-col max-w-[1600px] mx-auto w-full pb-12 font-sans">
      {/* ENCABEZADO Y NAVEGACIÓN DEL MÓDULO */}
      <div className="space-y-1 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {activeTab === 'history' ? 'Cotizaciones Históricas' : activeTab === 'precotizaciones' ? 'Pre-cotizaciones Comerciales' : activeTab === 'config' ? 'Configuración de Cotizador' : 'Cotizador'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {activeTab === 'precotizaciones'
            ? 'Revisa pre-cotizaciones generadas por agentes IA en WhatsApp, lee el chat del cliente, costea y aprueba para envío'
            : activeTab === 'history'
            ? 'Repositorio central de cotizaciones creadas, estados, opciones de edición, PDF y envíos'
            : 'Crea, calcula en tiempo real y guarda cotizaciones profesionales'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap bg-muted p-1 rounded-lg w-fit gap-1">
          <button 
            onClick={() => setActiveTab('quote')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'quote' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:bg-background/50'}`}
          >
            <Calculator className="w-4 h-4" /> Cotizar
          </button>
          <button 
            onClick={() => setActiveTab('precotizaciones')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'precotizaciones' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:bg-background/50'}`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" /> Pre-cotizaciones IA
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:bg-background/50'}`}
          >
            <History className="w-4 h-4" /> Cotizaciones Históricas
          </button>
          <button 
            onClick={() => setActiveTab('config')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'config' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:bg-background/50'}`}
          >
            <Settings className="w-4 h-4" /> Config
          </button>
        </div>
        
        {activeTab === 'quote' && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleStartNewQuote}
              className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Cotización
            </button>
            <div className="px-4 py-1.5 bg-background border border-border rounded-full flex items-center gap-2 shadow-sm w-fit">
              <span className="font-bold text-sm text-foreground">{editingQuote?.number || "FCG-00142"}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground"></span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                editingQuote?.status === 'Finalizada' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' :
                editingQuote?.status === 'Enviada' ? 'bg-info/20 text-info' :
                editingQuote?.status === 'Aprobada' ? 'bg-success/20 text-success' :
                'bg-muted text-muted-foreground'
              }`}>
                {editingQuote ? (editingQuote.status || 'Borrador') : 'Nueva'}
              </span>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'quote' && (
        <QuoteEditor 
          hasCostRead={hasCostRead} 
          editingQuote={editingQuote}
          onStartNewQuote={handleStartNewQuote}
          onViewHistory={() => setActiveTab('history')}
          onViewPrecotizaciones={() => setActiveTab('precotizaciones')}
        />
      )}
      {activeTab === 'history' && (
        <QuoteHistory 
          onContinueQuote={handleContinueQuote}
          onStartNewQuote={handleStartNewQuote}
        />
      )}
      {activeTab === 'precotizaciones' && (
        <PrecotizacionesView onOpenInCotizador={handleContinueQuote} />
      )}
      {activeTab === 'config' && <QuoteConfig />}
    </div>
  );
}

function QuoteEditor({ 
  hasCostRead, 
  editingQuote, 
  onStartNewQuote, 
  onViewHistory,
  onViewPrecotizaciones
}: { 
  hasCostRead: boolean; 
  editingQuote?: any; 
  onStartNewQuote?: () => void; 
  onViewHistory?: () => void; 
  onViewPrecotizaciones?: () => void;
}) {
  const [condExpanded, setCondExpanded] = React.useState(true);
  const [applyGlobalVat, setApplyGlobalVat] = React.useState(true);
  const [sumTotals, setSumTotals] = React.useState(true);

  // Permisos y Estado Ayuda para Cotizar (Etapa 18.4)
  const canQuoteAssist = true; // Permiso quote:assist
  const canQuoteAssistCost = hasCostRead; // Permiso quote:assist_cost

  const [assistSheetOpen, setAssistSheetOpen] = React.useState(false);
  const [assistTargetItem, setAssistTargetItem] = React.useState<any>(null);

  const openAssistModal = (item?: any) => {
    if (item) {
      setAssistTargetItem(item);
    } else {
      setAssistTargetItem(null);
    }
    setAssistSheetOpen(true);
  };

  // Atajo de teclado global: tecla 'C' o 'c' abre el panel Ayuda para cotizar
  React.useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          setAssistSheetOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);
  
  const [catalogOpen, setCatalogOpen] = React.useState(false);
  const [catalogTargetId, setCatalogTargetId] = React.useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = React.useState("");
  const [items, setItems] = React.useState<QuoteItem[]>([
    {
      id: '1',
      order: 1,
      description: '',
      productionMode: 'IN_HOUSE',
      size: '',
      inks: '',
      material: '',
      finishes: '',
      quantity: 1,
      unitPrice: 0,
      subtotal: 0,
      applyVat: true,
      vatAmount: 0,
      total: 0,
      showCalcPanel: false,
      laborHours: 0,
      rawMaterialCost: 0,
      marginPercent: CONFIG.margins.IN_HOUSE,
      isManuallyAdjusted: false,
      lastEditedField: 'quantity'
    }
  ]);
  const [aiModalOpen, setAiModalOpen] = React.useState(false);
  const [aiTab, setAiTab] = React.useState<"doc" | "image" | "chat">("doc");
  const [isExtracting, setIsExtracting] = React.useState(false);
  const handleAIExtract = async () => {
    setIsExtracting(true);
    setTimeout(() => {
      const extractedItem: QuoteItem = {
        id: Math.random().toString(36).substr(2, 9),
        order: 1,
        description: "Pendón full color AI",
        productionMode: "IN_HOUSE",
        size: "100x150cm",
        inks: "4x0",
        material: "Banner 13oz",
        finishes: "Tubos y cuerda",
        quantity: 2,
        unitPrice: 0,
        subtotal: 0,
        applyVat: applyGlobalVat,
        vatAmount: 0,
        total: 0,
        showCalcPanel: false,
        laborHours: 0,
        rawMaterialCost: 0,
        marginPercent: CONFIG.margins.IN_HOUSE,
        isManuallyAdjusted: false,
        lastEditedField: "quantity",
        // @ts-ignore
        aiSuggested: true,
        aiReferencePrice: 45000
      };
      setItems([extractedItem, ...items].map((it, idx) => ({ ...it, order: idx + 1 })));
      setIsExtracting(false);
      setAiModalOpen(false);
    }, 2000);
  };

  // Quote identifiers and status
  const [quoteId, setQuoteId] = React.useState<string>(editingQuote?.id || `cot-${Date.now()}`);
  const [quoteNumber, setQuoteNumber] = React.useState<string>(editingQuote?.number || `FCG-${Math.floor(10000 + Math.random() * 90000)}`);
  const [quoteStatus, setQuoteStatus] = React.useState<string>(editingQuote?.status || 'Borrador');
  const [isTerminada, setIsTerminada] = React.useState<boolean>(
    editingQuote?.status === 'Finalizada' || 
    editingQuote?.status === 'Enviada' || 
    editingQuote?.status === 'Aprobada'
  );

  // Conditions & Notes
  const [deliveryTime, setDeliveryTime] = React.useState(editingQuote?.deliveryTime || "5 a 8 días hábiles");
  const [paymentTerms, setPaymentTerms] = React.useState(editingQuote?.paymentTerms || "50% anticipo, 50% contra entrega");
  const [validityDays, setValidityDays] = React.useState(editingQuote?.validityDays || "30 días calendario");
  const [commercialTerms, setCommercialTerms] = React.useState(
    editingQuote?.commercialTerms || 
    "1. La presente cotización tiene una validez de 30 días calendario a partir de la fecha de emisión.\n2. Los precios están expresados en pesos colombianos (COP).\n3. El IVA del 19% se aplica sobre los ítems gravados.\n4. Forma de pago: 50% anticipo, 50% contra entrega."
  );
  const [notes, setNotes] = React.useState(editingQuote?.notes || "");
  const [internalNotes, setInternalNotes] = React.useState(editingQuote?.internalNotes || "");

  // Asesor Comercial que elabora la propuesta
  const [advisorName, setAdvisorName] = React.useState(editingQuote?.advisorName || "Jorge Enrique Escobar G.");
  const [advisorRole, setAdvisorRole] = React.useState(editingQuote?.advisorRole || "Gerente de Mercadeo y Ventas");
  const [advisorPhone, setAdvisorPhone] = React.useState(editingQuote?.advisorPhone || "+57 315 474 4830 | +57 316 010 3047");
  const [advisorEmail, setAdvisorEmail] = React.useState(editingQuote?.advisorEmail || "fusioncg.gerencia@gmail.com");

  // Client search and selection
  const [clientId, setClientId] = React.useState<string | null>(editingQuote?.clientId || null);
  const [clientSearchQuery, setClientSearchQuery] = React.useState(editingQuote?.clientName || "");
  const [clientSearchResults, setClientSearchResults] = React.useState<any[]>([]);
  const [isSearchingRues, setIsSearchingRues] = React.useState(false);
  const [showClientDropdown, setShowClientDropdown] = React.useState(false);
  const [selectedClientData, setSelectedClientData] = React.useState<any>(
    editingQuote?.clientData || {
      name: editingQuote?.clientName || "",
      tradeName: editingQuote?.tradeName || "",
      nit: editingQuote?.clientNit || "",
      email: editingQuote?.clientEmail || "",
      phone: editingQuote?.clientPhone || "",
      address: editingQuote?.clientAddress || "",
      contact: editingQuote?.contact || "",
      billingEmail: editingQuote?.billingEmail || ""
    }
  );

  // Validation and save feedback
  const [isSaving, setIsSaving] = React.useState(false);
  const [attemptedSave, setAttemptedSave] = React.useState(false);
  const [attemptedFinish, setAttemptedFinish] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = React.useState<string | null>(null);

  // Estados Asistente de Cotización y Tarifario (Etapa 18.5)
  const [quoteTariffVersionId, setQuoteTariffVersionId] = React.useState<string | undefined>(
    editingQuote?.tariffVersionId
  );
  const [highlightedItemIds, setHighlightedItemIds] = React.useState<string[]>([]);
  const [readOnlyAssistItem, setReadOnlyAssistItem] = React.useState<any | null>(null);
  const [isReadOnlyAssistModalOpen, setIsReadOnlyAssistModalOpen] = React.useState(false);
  const [catalogSaveNotice, setCatalogSaveNotice] = React.useState<string | null>(null);
  const [tariffDiscrepancyNotice, setTariffDiscrepancyNotice] = React.useState<string | null>(null);

  // Volcado desde el Asistente a Ítems de la Cotización (Bloque A, B, C)
  const handleApplyItemsFromAssist = (
    newItems: any[],
    tariffVersionId: string,
    notesAppendix?: string
  ) => {
    // 1. Recalcular y validar con el motor oficial de la Etapa 7 (Bloque B)
    const normalizedNewItems = newItems.map((it: any) => {
      const etapa7Res = resolverDesdeCampoEditado(
        { quantity: it.quantity, unitPrice: it.unitPrice },
        'unitPrice',
        CONFIG.vatRate,
        it.applyVat
      );

      const diff = Math.abs(etapa7Res.total - (it.total || it.lineTotal || 0));
      if (diff > 1) {
        console.info(`[QuoteAssist] Ajuste por redondeo de Etapa 7: Asistente=$${it.total}, Etapa7=$${etapa7Res.total} (Diff: $${diff})`);
        setTariffDiscrepancyNotice(`Ajuste de redondeo de $${diff.toFixed(2)} aplicado por el motor oficial de cotización.`);
        setTimeout(() => setTariffDiscrepancyNotice(null), 6000);
      }

      return {
        ...it,
        unitPrice: etapa7Res.unitPrice,
        subtotal: etapa7Res.subtotal,
        lineSubtotal: etapa7Res.lineSubtotal,
        vatAmount: etapa7Res.vatAmount,
        total: etapa7Res.total,
        lineTotal: etapa7Res.lineTotal,
      };
    });

    // 2. Establecer tariffVersionId en cabecera
    setQuoteTariffVersionId(tariffVersionId);

    // 3. Notas
    if (notesAppendix) {
      setNotes((prevNotes: string) => (prevNotes ? `${prevNotes}\n\n${notesAppendix}` : notesAppendix));
    }

    // 4. Agregar a la lista de ítems
    const isSingleEmptyItem = items.length === 1 && !items[0].description && items[0].unitPrice === 0;
    const baseList = isSingleEmptyItem ? [] : items;
    const combined = [...baseList, ...normalizedNewItems].map((it, idx) => ({
      ...it,
      order: idx + 1,
      reference: String(idx + 1),
    }));
    setItems(combined);

    // 5. Animación de resaltado durante 3 segundos (Bloque C)
    const newIds = normalizedNewItems.map((it) => it.id);
    setHighlightedItemIds(newIds);
    setTimeout(() => {
      setHighlightedItemIds([]);
    }, 3000);

    setSaveSuccessMsg(`✨ Se agregaron ${normalizedNewItems.length} ítem(s) calculados desde el asistente técnico de prensa.`);
    setTimeout(() => setSaveSuccessMsg(null), 4500);
  };

  // Guardar ítem como producto de catálogo (Bloque C)
  const handleSaveItemToCatalog = (item: QuoteItem) => {
    try {
      const productName = item.description?.split('\n')[0] || `Producto Ítem #${item.order}`;
      const catalogKey = 'fusion_custom_catalog';
      const existingRaw = localStorage.getItem(catalogKey);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];

      const newProduct = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: productName,
        description: item.description,
        defaultPrice: item.unitPrice,
        cost: item.internalCost || item.rawMaterialCost || 0,
        unit: item.unit || 'Unidades',
        size: item.size,
        inks: item.inks,
        materials: item.material || item.materials,
        finishes: item.finishes,
        specSheet: item.assistInput || {
          productionSpec: item.productionSpec,
          assistRunId: item.assistRunId,
          impositionPerSheet: item.impositionPerSheet,
          plateCount: item.plateCount,
          sheetsNeeded: item.sheetsNeeded,
        },
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(catalogKey, JSON.stringify([newProduct, ...existing]));
      setCatalogSaveNotice(`✅ "${productName}" guardado en el catálogo con su ficha técnica completa.`);
      setTimeout(() => setCatalogSaveNotice(null), 4000);
    } catch (e: any) {
      console.error('Error saving to catalog:', e);
      alert('Error guardando en catálogo: ' + e.message);
    }
  };

  // Synchronize when an existing quote is selected to edit
  React.useEffect(() => {
    if (editingQuote) {
      setQuoteTariffVersionId(editingQuote.tariffVersionId);
      setQuoteId(editingQuote.id || `cot-${Date.now()}`);
      setQuoteNumber(editingQuote.number || `FCG-${Math.floor(10000 + Math.random() * 90000)}`);
      setQuoteStatus(editingQuote.status || 'Borrador');
      setIsTerminada(
        editingQuote.status === 'Finalizada' || 
        editingQuote.status === 'Enviada' || 
        editingQuote.status === 'Aprobada'
      );
      if (editingQuote.items && editingQuote.items.length > 0) {
        const normalizedItems: QuoteItem[] = editingQuote.items.map((it: any, idx: number) => ({
          id: it.id || `it-${idx + 1}-${Date.now()}`,
          order: it.order || idx + 1,
          description: it.description || '',
          productionMode: (it.productionMode || 'IN_HOUSE') as ProductionMode,
          size: it.size || '',
          inks: it.inks || '',
          material: it.material || '',
          finishes: it.finishes || '',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          subtotal: Number(it.subtotal) || 0,
          applyVat: it.applyVat !== undefined ? Boolean(it.applyVat) : true,
          vatAmount: Number(it.vatAmount) || 0,
          total: Number(it.total) || 0,
          showCalcPanel: Boolean(it.showCalcPanel),
          laborHours: Number(it.laborHours) || 0,
          rawMaterialCost: Number(it.rawMaterialCost) || 0,
          marginPercent: Number(it.marginPercent) || (CONFIG.margins[(it.productionMode as ProductionMode) || 'IN_HOUSE'] ?? 35),
          isManuallyAdjusted: Boolean(it.isManuallyAdjusted),
          lastEditedField: it.lastEditedField || 'quantity',
          reference: it.reference || String(idx + 1),
          unit: it.unit || 'Unidades',
          lineSubtotal: Number(it.lineSubtotal || it.subtotal || 0),
          lineTotal: Number(it.lineTotal || it.total || 0),
          printTechnique: it.printTechnique,
          materials: it.materials || it.material,
          outsourcedCost: Number(it.outsourcedCost || 0),
          otherCost: Number(it.otherCost || 0),
          internalCost: Number(it.internalCost || 0),
          suggestedUnitPrice: it.suggestedUnitPrice ? Number(it.suggestedUnitPrice) : undefined,
          manualAdjustedPrice: it.manualAdjustedPrice ? Number(it.manualAdjustedPrice) : undefined,
          paperTypeId: it.paperTypeId,
          paperSheets: it.paperSheets,
          wastePercent: it.wastePercent,
          plateCount: it.plateCount,
          sheetsNeeded: it.sheetsNeeded,
          impositionPerSheet: it.impositionPerSheet,
          productionSpec: it.productionSpec,
          assistRunId: it.assistRunId,
          assistInput: it.assistInput,
          assistResult: it.assistResult
        }));
        setItems(normalizedItems);
      }
      setClientId(editingQuote.clientId || 'client-' + Date.now());
      const cData = editingQuote.clientData || {
        name: editingQuote.clientName || '',
        tradeName: editingQuote.tradeName || '',
        nit: editingQuote.clientNit || '',
        email: editingQuote.clientEmail || '',
        phone: editingQuote.clientPhone || '',
        address: editingQuote.clientAddress || '',
        contact: editingQuote.contact || '',
        billingEmail: editingQuote.billingEmail || ''
      };
      setSelectedClientData(cData);
      setClientSearchQuery(cData.name || '');
      if (editingQuote.deliveryTime) setDeliveryTime(editingQuote.deliveryTime);
      if (editingQuote.paymentTerms) setPaymentTerms(editingQuote.paymentTerms);
      if (editingQuote.validityDays) setValidityDays(editingQuote.validityDays);
      if (editingQuote.commercialTerms) setCommercialTerms(editingQuote.commercialTerms);
      if (editingQuote.notes) setNotes(editingQuote.notes);
      if (editingQuote.internalNotes) setInternalNotes(editingQuote.internalNotes);
      if (editingQuote.advisorName) setAdvisorName(editingQuote.advisorName);
      if (editingQuote.advisorRole) setAdvisorRole(editingQuote.advisorRole);
      if (editingQuote.advisorPhone) setAdvisorPhone(editingQuote.advisorPhone);
      if (editingQuote.advisorEmail) setAdvisorEmail(editingQuote.advisorEmail);
      setAttemptedSave(false);
      setAttemptedFinish(false);
      setSaveError(null);
      setSaveSuccessMsg(null);
    }
  }, [editingQuote]);

  const handleClientSearch = async (q: string) => {
    setClientSearchQuery(q);
    setSelectedClientData((prev: any) => ({
      ...prev,
      name: q
    }));
    if (!q || q.trim().length < 2) {
      setClientSearchResults([]);
      setShowClientDropdown(false);
      return;
    }
    setShowClientDropdown(true);
    
    setIsSearchingRues(true);
    try {
      const results = await searchCustomers(q);
      setClientSearchResults(results);
    } catch (err) {
      console.error('Error searching clients:', err);
    } finally {
      setIsSearchingRues(false);
    }
  };

  const handleSelectClient = (client: any) => {
    setClientId(client.id);
    setSelectedClientData({
      ...client,
      name: client.name || '',
      tradeName: client.tradeName || '',
      nit: client.nit || client.doc || '',
      phone: client.phone1 || client.phone || client.phone2 || client.phone3 || '',
      email: client.email || client.billingEmail || '',
      address: client.address || '',
      contact: client.billingContact || client.contact || client.tradeName || '',
      billingContact: client.billingContact || '',
      billingEmail: client.billingEmail || ''
    });
    setClientSearchQuery(client.name);
    setShowClientDropdown(false);
    setSaveError(null);
  };

  // Mandatory Client fields validation
  const clientValidationErrors = React.useMemo(() => {
    const missing: string[] = [];
    const clientName = selectedClientData?.name?.trim() || clientSearchQuery.trim();
    if (!clientName) missing.push("Nombre / Razón Social");
    return missing;
  }, [selectedClientData, clientSearchQuery]);

  // Items validation for finalizing
  const itemsValidationErrors = React.useMemo(() => {
    const missing: string[] = [];
    if (!items || items.length === 0) {
      missing.push("Debe incluir al menos un ítem");
      return missing;
    }
    items.forEach((it, idx) => {
      if (!it.description?.trim()) missing.push(`Descripción en ítem ${idx + 1}`);
      if (!it.quantity || it.quantity <= 0) missing.push(`Cantidad mayor a 0 en ítem ${idx + 1}`);
      if (!it.unitPrice || it.unitPrice <= 0) missing.push(`Precio unitario mayor a 0 en ítem ${idx + 1}`);
    });
    return missing;
  }, [items]);

  // Overall totals
  const grandSubtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const grandVat = items.reduce((sum, item) => sum + (item.vatAmount || 0), 0);
  const grandTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);

  // Handler: Save and continue later (Saves draft to Cotizaciones Históricas)
  const handleSaveDraftQuote = () => {
    setAttemptedSave(true);
    setSaveError(null);
    setSaveSuccessMsg(null);

    const effectiveClientName = selectedClientData?.name?.trim() || clientSearchQuery.trim() || "Cliente General";

    setIsSaving(true);
    try {
      const effectiveClientData = {
        ...selectedClientData,
        name: effectiveClientName,
        nit: selectedClientData?.nit?.trim() || "Por definir",
        email: selectedClientData?.email?.trim() || "",
        phone: selectedClientData?.phone?.trim() || "",
        address: selectedClientData?.address?.trim() || "Bogotá D.C."
      };

      const currentQuote = {
        id: quoteId,
        number: quoteNumber,
        clientName: effectiveClientName,
        clientNit: effectiveClientData.nit,
        clientPhone: effectiveClientData.phone,
        clientEmail: effectiveClientData.email,
        clientAddress: effectiveClientData.address,
        clientData: effectiveClientData,
        clientId: clientId || `client-${Date.now()}`,
        date: new Date().toISOString(),
        subtotal: grandSubtotal,
        vatAmount: grandVat,
        total: grandTotal,
        status: quoteStatus === 'Finalizada' || quoteStatus === 'Enviada' || quoteStatus === 'Aprobada' ? quoteStatus : 'Borrador',
        items,
        deliveryTime,
        paymentTerms,
        validityDays,
        commercialTerms,
        notes,
        internalNotes,
        advisorName,
        advisorRole,
        advisorPhone,
        advisorEmail,
        sumTotals,
        tariffVersionId: quoteTariffVersionId
      };

      addQuote(currentQuote);
      setSaveSuccessMsg(`✓ Cotización ${quoteNumber} guardada exitosamente en Cotizaciones Históricas.`);
    } catch (err: any) {
      setSaveError("Error al guardar la cotización: " + (err.message || "Error desconocido"));
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Finalize quote (Activates PDF, WhatsApp, and Email)
  const handleFinishQuote = () => {
    setAttemptedSave(true);
    setAttemptedFinish(true);
    setSaveError(null);
    setSaveSuccessMsg(null);

    const effectiveClientName = selectedClientData?.name?.trim() || clientSearchQuery.trim() || "Cliente General";

    if (itemsValidationErrors.length > 0) {
      setSaveError(`Para terminar la cotización y activar PDF/WhatsApp/Email, debes completar los ítems: ${itemsValidationErrors.join(', ')}.`);
      return;
    }

    setIsSaving(true);
    try {
      const newStatus = 'Finalizada';
      setQuoteStatus(newStatus);
      setIsTerminada(true);

      const effectiveClientData = {
        ...selectedClientData,
        name: effectiveClientName,
        nit: selectedClientData?.nit?.trim() || "Por definir",
        email: selectedClientData?.email?.trim() || "",
        phone: selectedClientData?.phone?.trim() || "",
        address: selectedClientData?.address?.trim() || "Bogotá D.C."
      };

      const currentQuote = {
        id: quoteId,
        number: quoteNumber,
        clientName: effectiveClientName,
        clientNit: effectiveClientData.nit,
        clientPhone: effectiveClientData.phone,
        clientEmail: effectiveClientData.email,
        clientAddress: effectiveClientData.address,
        clientData: effectiveClientData,
        clientId: clientId || `client-${Date.now()}`,
        date: new Date().toISOString(),
        subtotal: grandSubtotal,
        vatAmount: grandVat,
        total: grandTotal,
        status: newStatus,
        items,
        deliveryTime,
        paymentTerms,
        validityDays,
        commercialTerms,
        notes,
        internalNotes,
        advisorName,
        advisorRole,
        advisorPhone,
        advisorEmail,
        sumTotals,
        tariffVersionId: quoteTariffVersionId
      };

      addQuote(currentQuote);
      setSaveSuccessMsg(`🎉 ¡Cotización ${quoteNumber} Finalizada con éxito! Guardada en Cotizaciones Históricas.`);
    } catch (err: any) {
      setSaveError("Error al finalizar la cotización: " + (err.message || "Error desconocido"));
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Generate PDF
  const handleGeneratePDF = async () => {
    const effectiveClientName = selectedClientData?.name?.trim() || clientSearchQuery.trim() || "Cliente General";
    const effectiveClientData = {
      ...selectedClientData,
      name: effectiveClientName,
      nit: selectedClientData?.nit?.trim() || "Por definir",
      email: selectedClientData?.email?.trim() || "",
      phone: selectedClientData?.phone?.trim() || "",
      address: selectedClientData?.address?.trim() || "Bogotá D.C."
    };

    const currentQuote = {
      id: quoteId,
      number: quoteNumber,
      clientName: effectiveClientName,
      clientNit: effectiveClientData.nit,
      clientPhone: effectiveClientData.phone,
      clientEmail: effectiveClientData.email,
      clientAddress: effectiveClientData.address,
      clientData: effectiveClientData,
      clientId: clientId || `client-${Date.now()}`,
      date: new Date().toISOString(),
      subtotal: grandSubtotal,
      vatAmount: grandVat,
      total: grandTotal,
      status: quoteStatus || 'Finalizada',
      items,
      deliveryTime,
      paymentTerms,
      validityDays,
      commercialTerms,
      notes,
      internalNotes,
      advisorName,
      advisorRole,
      advisorPhone,
      advisorEmail,
      sumTotals
    };

    // Auto-save to ensure it's in history
    addQuote(currentQuote);

    const result = await generateQuotePDF({
      number: quoteNumber,
      clientName: effectiveClientName,
      clientNit: effectiveClientData.nit,
      clientPhone: effectiveClientData.phone,
      clientEmail: effectiveClientData.email,
      clientAddress: effectiveClientData.address,
      clientData: effectiveClientData,
      advisorName,
      advisorRole,
      advisorPhone,
      advisorEmail,
      items,
      subtotal: grandSubtotal,
      vatAmount: grandVat,
      total: grandTotal,
      deliveryTime,
      paymentTerms,
      validityDays,
      commercialTerms,
      notes,
      sumTotals
    });

    if (result && !result.success) {
      setSaveError(`No se pudo generar el archivo PDF: ${result.error}`);
    } else {
      setIsTerminada(true);
      if (quoteStatus === 'Borrador') {
        setQuoteStatus('Finalizada');
      }
      setSaveSuccessMsg(`📄 ¡PDF Oficial de la cotización ${quoteNumber} generado y descargado exitosamente!`);
      setSaveError(null);
    }
  };

  // Handler: Send via WhatsApp
  const handleSendWhatsApp = () => {
    const effectiveClientName = selectedClientData?.name?.trim() || clientSearchQuery.trim() || "Cliente General";
    const effectiveClientData = {
      ...selectedClientData,
      name: effectiveClientName,
      nit: selectedClientData?.nit?.trim() || "Por definir",
      email: selectedClientData?.email?.trim() || "",
      phone: selectedClientData?.phone?.trim() || "",
      address: selectedClientData?.address?.trim() || "Bogotá D.C."
    };

    const currentQuote = {
      id: quoteId,
      number: quoteNumber,
      clientName: effectiveClientName,
      clientNit: effectiveClientData.nit,
      clientPhone: effectiveClientData.phone,
      clientEmail: effectiveClientData.email,
      clientAddress: effectiveClientData.address,
      clientData: effectiveClientData,
      clientId: clientId || `client-${Date.now()}`,
      date: new Date().toISOString(),
      subtotal: grandSubtotal,
      vatAmount: grandVat,
      total: grandTotal,
      status: 'Enviada',
      items,
      deliveryTime,
      paymentTerms,
      validityDays,
      commercialTerms,
      notes,
      internalNotes,
      advisorName,
      advisorRole,
      advisorPhone,
      advisorEmail,
      sumTotals
    };

    addQuote(currentQuote);

    sendQuoteWhatsApp({
      number: quoteNumber,
      clientName: effectiveClientName,
      clientPhone: effectiveClientData.phone,
      clientData: effectiveClientData,
      advisorName,
      items,
      subtotal: grandSubtotal,
      vatAmount: grandVat,
      total: grandTotal
    });
    setQuoteStatus('Enviada');
    setIsTerminada(true);
    updateQuoteStatus(quoteId, 'Enviada');
  };

  // Handler: Send via Email
  const handleSendEmail = () => {
    const effectiveClientName = selectedClientData?.name?.trim() || clientSearchQuery.trim() || "Cliente General";
    const effectiveClientData = {
      ...selectedClientData,
      name: effectiveClientName,
      nit: selectedClientData?.nit?.trim() || "Por definir",
      email: selectedClientData?.email?.trim() || "",
      phone: selectedClientData?.phone?.trim() || "",
      address: selectedClientData?.address?.trim() || "Bogotá D.C."
    };

    const currentQuote = {
      id: quoteId,
      number: quoteNumber,
      clientName: effectiveClientName,
      clientNit: effectiveClientData.nit,
      clientPhone: effectiveClientData.phone,
      clientEmail: effectiveClientData.email,
      clientAddress: effectiveClientData.address,
      clientData: effectiveClientData,
      clientId: clientId || `client-${Date.now()}`,
      date: new Date().toISOString(),
      subtotal: grandSubtotal,
      vatAmount: grandVat,
      total: grandTotal,
      status: 'Enviada',
      items,
      deliveryTime,
      paymentTerms,
      validityDays,
      commercialTerms,
      notes,
      internalNotes,
      advisorName,
      advisorRole,
      advisorPhone,
      advisorEmail,
      sumTotals
    };

    addQuote(currentQuote);

    sendQuoteEmail({
      number: quoteNumber,
      clientName: effectiveClientName,
      clientEmail: effectiveClientData.email,
      clientData: effectiveClientData,
      advisorName,
      items,
      subtotal: grandSubtotal,
      vatAmount: grandVat,
      total: grandTotal,
      validityDays,
      deliveryTime
    });
    setQuoteStatus('Enviada');
    setIsTerminada(true);
    updateQuoteStatus(quoteId, 'Enviada');
  };

  const handleStatusChange = (newStatus: string) => {
    setQuoteStatus(newStatus);
    if (newStatus === 'Finalizada' || newStatus === 'Enviada' || newStatus === 'Aprobada') {
      setIsTerminada(true);
    }
    if (newStatus === 'Aprobada') {
      const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const clientName = selectedClientData?.name || clientSearchQuery || 'Cliente General';
      
      const confirmApprove = window.confirm(
        `🛡️ BLINDAJE DE ESCALA Y APROBACIÓN DE COTIZACIÓN\n\n` +
        `Cliente: ${clientName}\n` +
        `Escala/Tiraje Aprobado: ${totalQuantity.toLocaleString()} unidades\n` +
        `Valor Total Pactado: $${Math.round(totalAmount).toLocaleString()} COP\n\n` +
        `¿Confirmas la escala pactada con el cliente para generar la Orden de Trabajo (OT) en Producción?`
      );
      if (confirmApprove) {
          const newProject = {
            id: `proj-${quoteId || Date.now()}`,
            quoteId: quoteId,
            quoteNumber: quoteNumber || 'N/A',
            number: 'OT-' + Math.floor(1000 + Math.random() * 9000),
            name: `${items[0]?.description || 'Nuevo Proyecto Aprobado'} [Escala: ${totalQuantity.toLocaleString()} uds]`,
            client: clientName,
            stageId: '1',
            priority: 'MEDIUM',
            dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
            progress: 0,
            hasPO: false,
            assignments: [],
            daysLeft: 7,
            stageEnteredAt: new Date().toISOString(),
            totalRealHours: 0,
            timeEntries: [],
            consumedMaterials: [],
            artworkKeys: [],
            completedAt: null,
            qualityApprovals: [],
            partialDeliveries: [],
            quoteTotal: totalAmount,
            approvedScaleUnits: totalQuantity,
            scaleApprovalCertified: true,
            scaleApprovalCertifiedAt: new Date().toISOString(),
            laborCost: 0,
            materialCost: 0,
            outsourcedCost: 0,
            otherCost: 0,
            isBilled: false
          };
         addProject(newProject);
         updateQuoteStatus(quoteId, 'Aprobada');
         alert(`¡Éxito! La Orden de Trabajo (${newProject.number}) fue enviada a Planta/Producción con escala blindada (${totalQuantity.toLocaleString()} uds).`);
      }
    } else {
      updateQuoteStatus(quoteId, newStatus);
    }
  };

  const handleGlobalVatToggle = () => {
    const hasCustomExempts = items.some(i => !i.applyVat);
    let applyToAll = true;
    
    if (applyGlobalVat && hasCustomExempts) {
      applyToAll = window.confirm("¿Aplicar también a los ítems que ya marcaste como exentos o gravados individualmente?\n\nAceptar: Sí, aplicar a todos\nCancelar: No, respetar lo de cada ítem");
    }

    const newGlobalVat = !applyGlobalVat;
    setApplyGlobalVat(newGlobalVat);

    if (applyToAll) {
      setItems(items.map(item => {
        try {
          const res = resolverDesdeCampoEditado(
            { quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal, total: item.total },
            'quantity', // trigger recalc from subtotal base
            CONFIG.vatRate,
            newGlobalVat
          );
          return { 
            ...item, 
            applyVat: newGlobalVat, 
            subtotal: res.subtotal, 
            vatAmount: res.vatAmount, 
            total: res.total 
          };
        } catch { return { ...item, applyVat: newGlobalVat }; }
      }));
    }
  };

  const updateItem = (id: string, updates: Partial<QuoteItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleItemValueChange = (id: string, field: 'quantity' | 'unitPrice' | 'lineSubtotal' | 'lineTotal', valStr: string) => {
    const cleanStr = valStr.replace(/[^0-9,.-]/g, '');
    const val = parseNumericInput(cleanStr).toNumber();
    setItems(items.map(item => {
      if (item.id !== id) return item;
      try {
        const qty = field === "quantity" ? val : item.quantity;
        const uPrice = field === "unitPrice" ? val : item.unitPrice;
        const sTotal = field === "lineSubtotal" ? val : item.subtotal;
        const tTotal = field === "lineTotal" ? val : item.total;

        const res = resolverDesdeCampoEditado(
          { quantity: qty, unitPrice: uPrice, subtotal: sTotal, total: tTotal },
          field, CONFIG.vatRate, item.applyVat
        );
        const isManual = field === 'unitPrice' || field === 'lineSubtotal' || field === 'lineTotal';
        return { 
          ...item, 
          quantity: res.quantity,
          unitPrice: res.unitPrice,
          subtotal: res.subtotal,
          vatAmount: res.vatAmount,
          total: res.total,
          isManuallyAdjusted: isManual ? true : item.isManuallyAdjusted,
          lastEditedField: field
        };
      } catch (e: any) {
        if (e.message === "Ingresa la cantidad primero") alert(e.message);
        return item;
      }
    }));
  };

  const handleCalcValueChange = (
    id: string, 
    field: 'laborHours' | 'rawMaterialCost' | 'marginPercent', 
    rawVal: number
  ) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id !== id) return item;
      
      const newLaborHours = field === 'laborHours' ? rawVal : (item.laborHours || 0);
      const newRawMaterialCost = field === 'rawMaterialCost' ? rawVal : (item.rawMaterialCost || 0);
      const newMarginPercent = field === 'marginPercent' ? rawVal : (item.marginPercent ?? CONFIG.margins[item.productionMode] ?? CONFIG.margins.IN_HOUSE);

      const calc = calcularCostoInterno({
        laborHours: newLaborHours,
        laborRatePerHour: CONFIG.tarifaHoraMO,
        dailyDivisor: CONFIG.divisorJornada,
        rawMaterialCost: newRawMaterialCost,
        marginPercent: newMarginPercent
      });

      const effectiveQty = (!item.quantity || item.quantity <= 0) ? 1 : item.quantity;
      const unitPrice = calc.suggestedUnitPrice;
      const lineSubtotal = effectiveQty * unitPrice;
      const vatAmount = item.applyVat ? lineSubtotal * CONFIG.vatRate : 0;
      const lineTotal = lineSubtotal + vatAmount;

      return {
        ...item,
        laborHours: newLaborHours,
        rawMaterialCost: newRawMaterialCost,
        marginPercent: newMarginPercent,
        quantity: effectiveQty,
        unitPrice,
        subtotal: lineSubtotal,
        vatAmount,
        total: lineTotal,
        isManuallyAdjusted: false,
        lastEditedField: 'unitPrice'
      };
    }));
  };

  const calculateInternal = (id: string) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const res = calcularCostoInterno({
        laborHours: item.laborHours || 0,
        laborRatePerHour: CONFIG.tarifaHoraMO,
        dailyDivisor: CONFIG.divisorJornada,
        rawMaterialCost: item.rawMaterialCost || 0,
        marginPercent: item.marginPercent ?? CONFIG.margins[item.productionMode] ?? CONFIG.margins.IN_HOUSE
      });
      
      const effectiveQty = (!item.quantity || item.quantity <= 0) ? 1 : item.quantity;
      const unitPrice = res.suggestedUnitPrice;
      const subtotal = effectiveQty * unitPrice;
      const vatAmount = item.applyVat ? subtotal * CONFIG.vatRate : 0;
      const total = subtotal + vatAmount;

      return {
        ...item,
        quantity: effectiveQty,
        unitPrice,
        subtotal,
        vatAmount,
        total,
        isManuallyAdjusted: false,
        lastEditedField: 'unitPrice'
      };
    }));
  };

  const duplicateItem = (index: number) => {
    const original = items[index];
    const clone: QuoteItem = {
      ...original,
      id: Math.random().toString(36).substr(2, 9),
      order: 1
    };
    // El ítem nuevo siempre va arriba y abajo los anteriores
    const newItems = [clone, ...items];
    setItems(newItems.map((it, idx) => ({ ...it, order: idx + 1 })));
  };

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      order: 1,
      description: '',
      productionMode: 'IN_HOUSE',
      size: '', inks: '', material: '', finishes: '',
      quantity: 1, unitPrice: 0, subtotal: 0, applyVat: applyGlobalVat, vatAmount: 0, total: 0,
      showCalcPanel: false, laborHours: 0, rawMaterialCost: 0, marginPercent: CONFIG.margins.IN_HOUSE,
      isManuallyAdjusted: false, lastEditedField: 'quantity'
    };
    // El ítem nuevo siempre va ARRIBA y abajo los que se van haciendo
    const newItems = [newItem, ...items];
    setItems(newItems.map((it, idx) => ({ ...it, order: idx + 1 })));
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      setItems([{
        id: Math.random().toString(36).substr(2, 9),
        order: 1,
        description: '',
        productionMode: 'IN_HOUSE',
        size: '', inks: '', material: '', finishes: '',
        quantity: 1, unitPrice: 0, subtotal: 0, applyVat: applyGlobalVat, vatAmount: 0, total: 0,
        showCalcPanel: false, laborHours: 0, rawMaterialCost: 0, marginPercent: CONFIG.margins.IN_HOUSE,
        isManuallyAdjusted: false, lastEditedField: 'quantity'
      }]);
      return;
    }
    const newItems = items.filter(it => it.id !== id);
    setItems(newItems.map((it, idx) => ({ ...it, order: idx + 1 })));
  };

  const handleModeChange = (id: string, mode: ProductionMode) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const newMargin = CONFIG.margins[mode];

      // If the item has labor or material or calculator panel open, recalculate in real-time
      if (item.laborHours > 0 || item.rawMaterialCost > 0 || item.showCalcPanel) {
        const calc = calcularCostoInterno({
          laborHours: item.laborHours || 0,
          laborRatePerHour: CONFIG.tarifaHoraMO,
          dailyDivisor: CONFIG.divisorJornada,
          rawMaterialCost: item.rawMaterialCost || 0,
          marginPercent: newMargin
        });
        const effectiveQty = (!item.quantity || item.quantity <= 0) ? 1 : item.quantity;
        const unitPrice = calc.suggestedUnitPrice;
        const subtotal = effectiveQty * unitPrice;
        const vatAmount = item.applyVat ? subtotal * CONFIG.vatRate : 0;
        const total = subtotal + vatAmount;
        return {
          ...item,
          productionMode: mode,
          marginPercent: newMargin,
          quantity: effectiveQty,
          unitPrice,
          subtotal,
          vatAmount,
          total
        };
      }

      return { ...item, productionMode: mode, marginPercent: newMargin };
    }));
  };

  const handleVatToggle = (id: string) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const newVat = !item.applyVat;
      try {
        const res = resolverDesdeCampoEditado(
          { quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal, total: item.total },
          'quantity', CONFIG.vatRate, newVat
        );
        return { 
          ...item, 
          applyVat: newVat, 
          subtotal: res.subtotal, 
          vatAmount: res.vatAmount, 
          total: res.total 
        };
      } catch { return { ...item, applyVat: newVat }; }
    }));
  };

  const totalInternalCost = items.reduce((acc, it) => {
    const c = calcularCostoInterno({
      laborHours: it.laborHours, laborRatePerHour: CONFIG.tarifaHoraMO, dailyDivisor: CONFIG.divisorJornada,
      rawMaterialCost: it.rawMaterialCost, marginPercent: it.marginPercent
    });
    return acc + (c.base * it.quantity);
  }, 0);
  const totalMargin = grandSubtotal - totalInternalCost;
  const totalMarginPercent = grandSubtotal > 0 ? (totalMargin / grandSubtotal) * 100 : 0;

  const SummaryCard = () => (
    <div className="bg-card border border-border rounded-xl shadow-sm p-5 flex flex-col">
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">IVA 19% (todos)</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">{applyGlobalVat ? 'Sí' : 'No'}</span>
            <button 
              onClick={handleGlobalVatToggle}
              className={`w-9 h-5 rounded-full relative transition-colors ${applyGlobalVat ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${applyGlobalVat ? 'right-0.5' : 'left-0.5'}`}></span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">Sumar totales</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">{sumTotals ? 'Sí' : 'No'}</span>
            <button 
              onClick={() => setSumTotals(!sumTotals)}
              className={`w-9 h-5 rounded-full relative transition-colors ${sumTotals ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${sumTotals ? 'right-0.5' : 'left-0.5'}`}></span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-muted-foreground">Subtotal</span>
          <span className="text-sm font-bold text-foreground">{formatCurrency(grandSubtotal)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-muted-foreground">IVA</span>
          <span className="text-sm font-bold text-foreground">{formatCurrency(grandVat)}</span>
        </div>
      </div>
      
      <div className="flex justify-between items-end pt-4 border-t border-border mb-2">
        <span className="text-base font-bold text-foreground">Total</span>
        <span className="text-2xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
      </div>
      
      {!sumTotals && (
        <p className="text-[10px] text-muted-foreground leading-tight text-center mt-2">Los totales no se están sumando entre líneas.</p>
      )}

      {/* Selector Rápido de Forma de Pago (Pág. 6 PDF) */}
      <div className="pt-3 border-t border-border mt-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-foreground">Forma de Pago (Pág. 6 PDF)</label>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">En PDF</span>
        </div>
        <input 
          type="text"
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          className="w-full px-2.5 py-1.5 border border-input rounded-md text-xs font-semibold bg-background focus:ring-1 focus:ring-primary outline-none"
          placeholder="50% anticipo, 50% contra entrega"
        />
        <div className="flex flex-wrap gap-1">
          {["50% / 50%", "100% anticipado", "Contado", "Crédito 30d"].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => {
                if (p === "50% / 50%") setPaymentTerms("50% anticipo, 50% contra entrega");
                else if (p === "100% anticipado") setPaymentTerms("100% anticipado");
                else if (p === "Contado") setPaymentTerms("Contado contra entrega");
                else if (p === "Crédito 30d") setPaymentTerms("Crédito a 30 días");
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted/70 hover:bg-muted text-muted-foreground border border-border/60 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {hasCostRead && (
        <div className="mt-6 pt-4 border-t border-border">
          <details className="group">
            <summary className="text-xs font-bold text-muted-foreground uppercase cursor-pointer hover:text-foreground transition-colors mb-3 flex items-center justify-between">
              Análisis de Costos y Margen
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="space-y-2 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground">Costo Interno Total</span>
                <span className="text-sm font-bold text-foreground">{formatCurrency(totalInternalCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground">Margen ($)</span>
                <span className={`text-sm font-bold ${totalMargin >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(totalMargin)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground">Margen (%)</span>
                <span className={`px-2 py-0.5 ${totalMarginPercent >= 20 ? 'bg-success/10 text-success' : totalMarginPercent >= 10 ? 'bg-alert/10 text-alert' : 'bg-danger/10 text-danger'} rounded text-xs font-bold`}>
                  {totalMarginPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );

  const QuoteActionsPanel = () => {
    const isTerminadaOrSent = isTerminada || quoteStatus === 'Finalizada' || quoteStatus === 'Enviada' || quoteStatus === 'Aprobada';

    return (
      <div className="flex flex-col space-y-3">
        {saveError && (
          <div className="p-3 bg-danger/10 border border-danger/25 rounded-lg text-xs font-semibold text-danger flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1">
              <span>{saveSuccessMsg}</span>
              {onViewHistory && (
                <button 
                  onClick={onViewHistory}
                  className="block mt-1 underline font-bold hover:text-emerald-800 dark:hover:text-emerald-200 text-left"
                >
                  Ver en Cotizaciones Históricas →
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1 mb-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-muted-foreground">Estado de la Cotización</label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              quoteStatus === 'Aprobada' ? 'bg-success/20 text-success' :
              quoteStatus === 'Enviada' ? 'bg-info/20 text-info' :
              quoteStatus === 'Finalizada' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300' :
              'bg-muted text-muted-foreground'
            }`}>
              {quoteStatus}
            </span>
          </div>
          <select 
            value={quoteStatus} 
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full h-10 px-3 border border-input rounded-lg bg-background text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="Borrador">Borrador</option>
            <option value="Finalizada">Finalizada (Lista para entregar)</option>
            <option value="Enviada">Enviada al Cliente</option>
            <option value="Aprobada">✅ Aprobada (Enviar a Producción)</option>
            <option value="Rechazada">❌ Rechazada</option>
          </select>
        </div>

        {/* Botón: Guardar y Continuar Después */}
        <button 
          onClick={handleSaveDraftQuote} 
          disabled={isSaving}
          className="w-full h-11 bg-primary text-primary-foreground font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {isSaving ? "Guardando..." : "Guardar y Continuar Después"}
        </button>
        <p className="text-[11px] text-muted-foreground text-center -mt-1">
          Guarda en Historial para retomar luego. Requiere todos los datos del cliente.
        </p>

        {/* Botón: Terminar Cotización */}
        <button 
          onClick={handleFinishQuote} 
          disabled={isSaving}
          className={`w-full h-11 font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all ${
            isTerminadaOrSent
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <Check className="w-4 h-4" /> 
          {isTerminadaOrSent ? "Cotización Finalizada (Guardar Cambios)" : "Terminar Cotización"}
        </button>
        {!isTerminadaOrSent && (
          <p className="text-[11px] text-muted-foreground text-center -mt-1">
            Finaliza la cotización para activar PDF, WhatsApp y Correo.
          </p>
        )}

        {/* Bloque Exportación y Envíos */}
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-muted-foreground">Exportación y Envíos</span>
            {!isTerminadaOrSent && (
              <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded font-bold">
                Requiere Terminar
              </span>
            )}
          </div>

          <button 
            type="button"
            onClick={handleGeneratePDF} 
            disabled={!isTerminadaOrSent}
            className="w-full h-11 border border-input bg-background text-foreground font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            title={!isTerminadaOrSent ? "Haz clic en 'Terminar Cotización' primero para generar el PDF" : "Descargar cotización en PDF"}
          >
            <FileText className="w-4 h-4 text-rose-500" /> Generar PDF Oficial
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button 
              type="button"
              onClick={handleSendEmail} 
              disabled={!isTerminadaOrSent}
              className="h-11 border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:border-input disabled:text-muted-foreground hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
              title={!isTerminadaOrSent ? "Termina la cotización primero para enviar por Email" : "Enviar por correo"}
            >
              <Mail className="w-4 h-4" /> Email
            </button>
            <button 
              type="button"
              onClick={handleSendWhatsApp} 
              disabled={!isTerminadaOrSent}
              className="h-11 border border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:border-input disabled:text-muted-foreground hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
              title={!isTerminadaOrSent ? "Termina la cotización primero para enviar por WhatsApp" : "Enviar por WhatsApp"}
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      
      {/* PANEL CENTRAL: FORMULARIO PRINCIPAL */}
      <div className="flex-1 w-full flex flex-col space-y-6">
        
        {/* BANNER ESPECIAL SI ES PRE-COTIZACIÓN GENERADA POR IA */}
        {(editingQuote?.isPreQuote || editingQuote?.aiExtracted || editingQuote?.number?.startsWith('PRE-')) && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-bold text-sm text-foreground">
                    Pre-cotización Estructurada por Inteligencia Artificial ({editingQuote.number})
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700">
                    Pendiente Costeo Comercial
                  </span>
                  {editingQuote.source && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                      Canal: {editingQuote.source}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Los ítems, cantidades y especificaciones técnicas (medidas, material, tintas y acabados) fueron detectados y ordenados automáticamente a partir de la conversación con el cliente. Completa los precios unitarios o costos internos a continuación y finaliza la cotización para enviar la propuesta formal.
                </p>
                {editingQuote.aiSummary && (
                  <div className="mt-2.5 p-2 bg-background/80 border border-border/80 rounded-lg text-xs font-medium text-foreground/80 flex items-center gap-2">
                    <span className="font-bold text-amber-600 dark:text-amber-400">Resumen IA:</span>
                    <span>{editingQuote.aiSummary}</span>
                  </div>
                )}
                {onViewPrecotizaciones && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={onViewPrecotizaciones}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/90 hover:bg-background text-foreground border border-border text-xs font-bold transition-colors shadow-sm"
                    >
                      ← Volver a Pre-cotizaciones Comerciales
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BLOQUE 2: CLIENTE */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <h2 className="font-bold text-foreground text-base">Datos del Cliente</h2>
                <p className="text-xs text-muted-foreground">Obligatorios para guardar y continuar la cotización</p>
              </div>
            </div>
            <button 
              onClick={() => { 
                setClientId("temp-" + Date.now()); 
                setSelectedClientData({ name: "", tradeName: "", nit: "", email: "", phone: "", address: "", contact: "", billingEmail: "" }); 
                setClientSearchQuery("");
                setShowClientDropdown(false); 
              }}
              className="inline-flex items-center text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-md transition-colors border border-primary/20"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Nuevo / Limpiar
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Success notification banner */}
            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{saveSuccessMsg}</span>
                </div>
                {onViewHistory && (
                  <button 
                    onClick={onViewHistory}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-sm ml-2 whitespace-nowrap self-start sm:self-auto transition-colors"
                  >
                    Ver en Cotizaciones Históricas →
                  </button>
                )}
              </div>
            )}

            {/* Error or validation warning banner */}
            {saveError && (
              <div className="p-3.5 bg-danger/10 border border-danger/30 rounded-lg flex items-start gap-2.5 text-danger text-xs font-semibold animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-sm mb-0.5">
                    No se pudo guardar la cotización:
                  </span>
                  <p className="font-normal text-danger/90">
                    {saveError}
                  </p>
                </div>
              </div>
            )}

            {/* Client search autocompleter */}
            <div className="relative">
              <label className="text-xs font-bold text-muted-foreground block mb-1">
                Buscar en Clientes Internos o RUES
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  value={clientSearchQuery}
                  onChange={(e) => handleClientSearch(e.target.value)}
                  onFocus={() => { if(clientSearchQuery.length >= 2) setShowClientDropdown(true); }}
                  className="w-full pl-9 pr-3 py-2 border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium bg-background" 
                  placeholder="Escribe NIT, razón social o teléfono para autocompletar..." 
                />
              </div>

              {showClientDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-[100] max-h-64 overflow-y-auto">
                  {isSearchingRues && (
                    <div className="p-3 text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span> Consultando Base y RUES...
                    </div>
                  )}
                  {!isSearchingRues && clientSearchResults.length === 0 && clientSearchQuery.length >= 2 && (
                    <div className="p-4 text-sm text-muted-foreground text-center flex flex-col items-center gap-3">
                      <span>No se encontró el cliente con ese término. Puedes ingresar los datos manualmente a continuación.</span>
                    </div>
                  )}
                  {!isSearchingRues && clientSearchResults.map(res => (
                    <div 
                      key={res.id} 
                      onClick={() => handleSelectClient(res)}
                      className="p-3 border-b border-border hover:bg-muted cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="font-bold text-sm text-foreground block">{res.name}</span>
                          {res.tradeName && (
                            <span className="text-xs text-primary font-medium block">
                              Comercial: {res.tradeName}
                            </span>
                          )}
                        </div>
                        {res.source === "rues" ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">RUES (Nuevo)</span>
                        ) : (
                          <span className="bg-success/10 text-success text-[10px] font-bold px-1.5 py-0.5 rounded">Base Interna</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>NIT: {res.nit || res.doc || 'S/N'}</span>
                        {(res.phone1 || res.phone) && <span>• Tel: {res.phone1 || res.phone}</span>}
                        {res.address && <span className="truncate max-w-[200px]">• Dir: {res.address}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulario con todos los campos del cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-lg border border-border">
              {/* Razón Social / Nombre */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-foreground block mb-1">
                  Razón Social / Nombre Completo <span className="text-danger font-black">*</span>
                </label>
                <input 
                  type="text" 
                  value={selectedClientData?.name || ""} 
                  onChange={(e) => {
                    setSelectedClientData({...selectedClientData, name: e.target.value});
                    setClientSearchQuery(e.target.value);
                  }} 
                  className={`w-full px-3 py-2 border rounded-md text-sm font-medium bg-background transition-colors ${
                    attemptedSave && !selectedClientData?.name?.trim() 
                      ? 'border-danger ring-1 ring-danger/30 bg-danger/5' 
                      : 'border-input focus:ring-2 focus:ring-primary/20'
                  }`} 
                  placeholder="Ej: Impresos y Publicidad S.A.S." 
                />
                {attemptedSave && !selectedClientData?.name?.trim() && (
                  <span className="text-[11px] text-danger font-medium mt-0.5 block">Nombre obligatorio</span>
                )}
              </div>

              {/* Nombre Comercial */}
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Nombre Comercial <span className="text-[10px] text-muted-foreground font-normal">(Opcional)</span>
                </label>
                <input 
                  type="text" 
                  value={selectedClientData?.tradeName || ""} 
                  onChange={(e) => setSelectedClientData({...selectedClientData, tradeName: e.target.value})} 
                  className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background focus:ring-2 focus:ring-primary/20" 
                  placeholder="Ej: Marca Comercial" 
                />
              </div>

              {/* NIT / Documento */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  NIT / Documento <span className="text-danger font-black">*</span>
                </label>
                <input 
                  type="text" 
                  value={selectedClientData?.nit || ""} 
                  onChange={(e) => setSelectedClientData({...selectedClientData, nit: e.target.value})} 
                  className={`w-full px-3 py-2 border rounded-md text-sm font-medium bg-background transition-colors ${
                    attemptedSave && !selectedClientData?.nit?.trim() 
                      ? 'border-danger ring-1 ring-danger/30 bg-danger/5' 
                      : 'border-input focus:ring-2 focus:ring-primary/20'
                  }`} 
                  placeholder="Ej: 900.123.456-7" 
                />
                {attemptedSave && !selectedClientData?.nit?.trim() && (
                  <span className="text-[11px] text-danger font-medium mt-0.5 block">NIT obligatorio</span>
                )}
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Correo Electrónico <span className="text-danger font-black">*</span>
                </label>
                <input 
                  type="email" 
                  value={selectedClientData?.email || ""} 
                  onChange={(e) => setSelectedClientData({...selectedClientData, email: e.target.value})} 
                  className={`w-full px-3 py-2 border rounded-md text-sm font-medium bg-background transition-colors ${
                    attemptedSave && !selectedClientData?.email?.trim() 
                      ? 'border-danger ring-1 ring-danger/30 bg-danger/5' 
                      : 'border-input focus:ring-2 focus:ring-primary/20'
                  }`} 
                  placeholder="cliente@empresa.com" 
                />
                {attemptedSave && !selectedClientData?.email?.trim() && (
                  <span className="text-[11px] text-danger font-medium mt-0.5 block">Correo obligatorio</span>
                )}
              </div>

              {/* Teléfono (WhatsApp) */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Teléfono / WhatsApp <span className="text-danger font-black">*</span>
                </label>
                <input 
                  type="text" 
                  value={selectedClientData?.phone || ""} 
                  onChange={(e) => setSelectedClientData({...selectedClientData, phone: e.target.value})} 
                  className={`w-full px-3 py-2 border rounded-md text-sm font-medium bg-background transition-colors ${
                    attemptedSave && !selectedClientData?.phone?.trim() 
                      ? 'border-danger ring-1 ring-danger/30 bg-danger/5' 
                      : 'border-input focus:ring-2 focus:ring-primary/20'
                  }`} 
                  placeholder="Ej: 3001234567" 
                />
                {attemptedSave && !selectedClientData?.phone?.trim() && (
                  <span className="text-[11px] text-danger font-medium mt-0.5 block">Teléfono obligatorio</span>
                )}
              </div>

              {/* Dirección */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-foreground block mb-1">
                  Dirección Física <span className="text-danger font-black">*</span>
                </label>
                <input 
                  type="text" 
                  value={selectedClientData?.address || ""} 
                  onChange={(e) => setSelectedClientData({...selectedClientData, address: e.target.value})} 
                  className={`w-full px-3 py-2 border rounded-md text-sm font-medium bg-background transition-colors ${
                    attemptedSave && !selectedClientData?.address?.trim() 
                      ? 'border-danger ring-1 ring-danger/30 bg-danger/5' 
                      : 'border-input focus:ring-2 focus:ring-primary/20'
                  }`} 
                  placeholder="Ej: Calle 10 # 45-20, Bogotá" 
                />
                {attemptedSave && !selectedClientData?.address?.trim() && (
                  <span className="text-[11px] text-danger font-medium mt-0.5 block">Dirección obligatoria</span>
                )}
              </div>

              {/* Contacto de Facturación */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Contacto de Facturación <span className="text-[10px] text-muted-foreground font-normal">(Opcional)</span>
                </label>
                <input 
                  type="text" 
                  value={selectedClientData?.contact || selectedClientData?.billingContact || ""} 
                  onChange={(e) => setSelectedClientData({...selectedClientData, contact: e.target.value, billingContact: e.target.value})} 
                  className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background focus:ring-2 focus:ring-primary/20" 
                  placeholder="Nombre de la persona o departamento contable" 
                />
              </div>

              {/* E-mails Facturación */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Email Facturación Electrónica <span className="text-[10px] text-muted-foreground font-normal">(Opcional)</span>
                </label>
                <input 
                  type="text" 
                  value={selectedClientData?.billingEmail || ""} 
                  onChange={(e) => setSelectedClientData({...selectedClientData, billingEmail: e.target.value})} 
                  className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background focus:ring-2 focus:ring-primary/20" 
                  placeholder="facturacion@empresa.com" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE 3: ITEMS */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-muted-foreground" /> Items ({items.length})
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button 
                type="button"
                onClick={() => setAiModalOpen(true)}
                className="inline-flex items-center text-sm font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 px-3 py-1.5 rounded-md border border-amber-500/20 transition-colors"
              >
                <UploadCloud className="w-4 h-4 mr-2" /> Pre-cotizar con IA
              </button>
              {canQuoteAssist && (
                <button 
                  type="button"
                  onClick={() => openAssistModal(null)}
                  className="inline-flex items-center text-sm font-bold bg-card border border-border hover:bg-muted text-foreground px-3 py-1.5 rounded-md shadow-2xs transition-colors"
                  title="Ayuda para cotizar litográfica y digital (Atajo: C)"
                >
                  <Calculator className="w-4 h-4 mr-1.5 text-primary" />
                  <span>Ayuda para cotizar</span>
                  <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-muted border border-border rounded text-muted-foreground">
                    C
                  </kbd>
                </button>
              )}
              <button 
                type="button"
                onClick={() => setCatalogOpen(true)}
                className="inline-flex items-center text-sm font-bold text-muted-foreground hover:bg-muted px-3 py-1.5 rounded-md border border-input transition-colors"
              >
                <Search className="w-4 h-4 mr-2" /> Catálogo
              </button>
              <button 
                type="button"
                onClick={addItem}
                className="inline-flex items-center text-sm font-bold text-white bg-primary hover:bg-primary/90 px-3.5 py-1.5 rounded-md shadow-2xs transition-all"
                title="Agregar nuevo ítem en la parte superior"
              >
                <Plus className="w-4 h-4 mr-1.5" /> + Nuevo Ítem (Arriba)
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-muted/20 space-y-4">
            {attemptedFinish && itemsValidationErrors.length > 0 && (
              <div className="bg-danger/10 border border-danger/20 rounded-md p-3 mb-4">
                <p className="text-sm font-bold text-danger mb-1 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Faltan datos obligatorios en los ítems para terminar la cotización:</p>
                <p className="text-xs text-danger/80">{itemsValidationErrors.join(" · ")}</p>
              </div>
            )}
            {catalogSaveNotice && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-lg p-3 text-xs font-bold flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{catalogSaveNotice}</span>
              </div>
            )}
            {tariffDiscrepancyNotice && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-lg p-3 text-xs font-bold flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{tariffDiscrepancyNotice}</span>
              </div>
            )}
            {items.map((item, index) => {
              const itemLaborCost = CONFIG.divisorJornada > 0 
                ? ((item.laborHours || 0) * CONFIG.tarifaHoraMO) / CONFIG.divisorJornada 
                : 0;
              const itemBaseCost = itemLaborCost + (item.rawMaterialCost || 0);
              const itemMarginPercent = item.marginPercent ?? CONFIG.margins[item.productionMode] ?? CONFIG.margins.IN_HOUSE;
              const itemMarginAmount = itemBaseCost * (itemMarginPercent / 100);
              const itemSuggestedPrice = Math.round(itemBaseCost + itemMarginAmount);

              return (
              <div
                key={item.id}
                className={`bg-card border border-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4 transition-all duration-700 ${
                  highlightedItemIds.includes(item.id)
                    ? 'ring-2 ring-primary bg-primary/5 shadow-md animate-pulse'
                    : ''
                }`}
              >
                
                {/* Cabecera del Ítem: Número, Estado y Herramientas */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-border/80">
                  <div className="flex items-center gap-2.5">
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab shrink-0" />
                    <div className="w-8 h-8 bg-primary/10 text-primary border border-primary/20 rounded-lg flex items-center justify-center text-sm font-black shrink-0">
                      {item.order}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-foreground">
                        Ítem #{item.order}
                      </span>
                      {!item.applyVat && (
                        <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-bold text-muted-foreground border border-border">
                          Exento de IVA
                        </span>
                      )}
                      {/* Badge Asistente Técnico con calculadora (Bloque C) */}
                      {item.assistRunId && (
                        <button
                          type="button"
                          onClick={() => {
                            setReadOnlyAssistItem(item);
                            setIsReadOnlyAssistModalOpen(true);
                          }}
                          className="bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Ver cálculo original en modo lectura"
                        >
                          <Calculator className="w-3 h-3 text-primary" />
                          <span>Prensa #{item.assistRunId.slice(0, 10)}</span>
                        </button>
                      )}
                      {/* Badge Precio ajustado a mano (Bloque C) */}
                      {item.suggestedUnitPrice && Math.round(item.unitPrice) !== Math.round(item.suggestedUnitPrice) && (
                        <span
                          className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
                          title={`Precio sugerido original: $${Math.round(item.suggestedUnitPrice).toLocaleString('es-CO')}`}
                        >
                          Precio ajustado a mano (Sugerido: ${Math.round(item.suggestedUnitPrice).toLocaleString('es-CO')})
                        </span>
                      )}
                      {/* @ts-ignore */}
                      {item.aiSuggested && (
                        <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-300/60 flex items-center gap-1">
                          <UploadCloud className="w-3 h-3 text-amber-600" /> Sugerido por IA
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de Acciones del Ítem */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasCostRead && (
                      <button 
                        type="button"
                        onClick={() => updateItem(item.id, { showCalcPanel: !item.showCalcPanel })}
                        className={`h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
                          item.showCalcPanel 
                            ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-500/30' 
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 border border-amber-200/80 dark:border-amber-800/80'
                        }`}
                        title="Abrir calculadora de costos en tiempo real"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>Calculadora</span>
                      </button>
                    )}
                    {canQuoteAssist && (
                      <button 
                        type="button"
                        onClick={() => openAssistModal(item)}
                        className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/15 text-primary text-xs font-bold transition-colors shadow-2xs"
                        title="Recalcular con la ayuda para cotizar"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Recalcular con la ayuda</span>
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => { setCatalogTargetId(item.id); setCatalogOpen(true); }}
                      className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors" 
                      title="Buscar en catálogo"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Catálogo</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => duplicateItem(index)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" 
                      title="Duplicar item"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleSaveItemToCatalog(item)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted text-primary transition-colors" 
                      title="Guardar en Catálogo con ficha técnica"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                    {items.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 transition-colors" 
                        title="Eliminar este ítem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Caja de Descripción A ANCHO COMPLETO (100% w-full) */}
                <div className="w-full space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
                      <span>Descripción del Ítem / Servicio</span>
                      <span className="text-danger">*</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      (Caja amplia de redacción · Arrastra la esquina inferior si requieres más altura)
                    </span>
                  </div>

                  <textarea 
                    rows={5}
                    className="w-full min-h-[140px] p-3.5 sm:p-4 border border-input rounded-xl text-sm sm:text-base font-medium resize-y focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-background leading-relaxed transition-all shadow-2xs block" 
                    placeholder="Escribe detalladamente el producto o servicio, especificaciones técnicas requeridas, tipo de papel o material, tintas, medidas, acabados, troqueles o notas de producción..." 
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  />
                </div>

                {/* Panel CÁLCULO INTERNO EN TIEMPO REAL */}
                {hasCostRead && item.showCalcPanel && (
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
                      <div className="flex items-center gap-2 text-amber-900">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-800">
                          <Calculator className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-amber-950">Calculadora de Costos (Cálculo en Tiempo Real)</h3>
                          <p className="text-[11px] text-amber-800/80">Calcula y sincroniza automáticamente el valor unitario y subtotales al instante.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/90 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 text-xs font-bold shadow-2xs self-start sm:self-auto">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Sincronizado en vivo</span>
                      </div>
                    </div>

                    {/* Inputs con cálculo reactivo inmediato */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-amber-900 block">Horas M.O.</label>
                          <span className="text-[10px] text-amber-700 font-medium">Jornada {CONFIG.divisorJornada}h (${(CONFIG.tarifaHoraMO / CONFIG.divisorJornada).toLocaleString('es-CO', {maximumFractionDigits: 0})}/h)</span>
                        </div>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.25"
                            min="0"
                            placeholder="0"
                            className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm font-bold bg-white text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition-all" 
                            value={item.laborHours || ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0);
                              handleCalcValueChange(item.id, 'laborHours', val);
                            }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600">hrs</span>
                        </div>
                        {/* Presets rápidos */}
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {[0.25, 0.5, 1, 2, 4].map(h => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => handleCalcValueChange(item.id, 'laborHours', h)}
                              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border transition-colors ${item.laborHours === h ? 'bg-amber-600 text-white border-amber-600' : 'bg-white/80 text-amber-800 border-amber-200 hover:bg-amber-100'}`}
                            >
                              {h}h
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-amber-900 block">Materia Prima ($)</label>
                          <span className="text-[10px] text-amber-700 font-medium">Insumos directos</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600">$</span>
                          <input 
                            type="number" 
                            step="500"
                            min="0"
                            placeholder="0"
                            className="w-full pl-7 pr-3 py-2 border border-amber-300 rounded-lg text-sm font-bold bg-white text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition-all" 
                            value={item.rawMaterialCost || ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0);
                              handleCalcValueChange(item.id, 'rawMaterialCost', val);
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-amber-800/70 mt-1 block">Vinilos, tintas, placas, soportes, etc.</span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-amber-900 block">Margen Comercial (%)</label>
                          <span className="text-[10px] text-amber-700 font-medium">Modo actual: {item.marginPercent}%</span>
                        </div>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="1"
                            min="0"
                            placeholder="35"
                            className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm font-bold bg-white text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition-all" 
                            value={item.marginPercent !== undefined ? item.marginPercent : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0);
                              handleCalcValueChange(item.id, 'marginPercent', val);
                            }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600">%</span>
                        </div>
                        {/* Presets de margen */}
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {[15, 20, 25, 35, 45, 50].map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => handleCalcValueChange(item.id, 'marginPercent', m)}
                              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border transition-colors ${item.marginPercent === m ? 'bg-amber-600 text-white border-amber-600' : 'bg-white/80 text-amber-800 border-amber-200 hover:bg-amber-100'}`}
                            >
                              {m}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Desglose en vivo de resultados */}
                    <div className="bg-white/90 border border-amber-200/80 rounded-lg p-3 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60">
                          <span className="text-[10px] uppercase font-bold text-amber-900/70 block">Mano de Obra</span>
                          <span className="text-sm font-bold text-amber-950 block">{formatCurrency(itemLaborCost)}</span>
                          <span className="text-[10px] text-amber-800/70 font-medium">({item.laborHours || 0}h dedicadas)</span>
                        </div>
                        <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60">
                          <span className="text-[10px] uppercase font-bold text-amber-900/70 block">Materia Prima</span>
                          <span className="text-sm font-bold text-amber-950 block">{formatCurrency(item.rawMaterialCost || 0)}</span>
                          <span className="text-[10px] text-amber-800/70 font-medium">Costo de insumos</span>
                        </div>
                        <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60">
                          <span className="text-[10px] uppercase font-bold text-amber-900/70 block">Costo Base</span>
                          <span className="text-sm font-bold text-amber-950 block">{formatCurrency(itemBaseCost)}</span>
                          <span className="text-[10px] text-amber-800/70 font-medium">M.O. + Insumos</span>
                        </div>
                        <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60">
                          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Margen ({itemMarginPercent}%)</span>
                          <span className="text-sm font-bold text-emerald-700 block">+{formatCurrency(itemMarginAmount)}</span>
                          <span className="text-[10px] text-emerald-700/70 font-medium">Ganancia estimada</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-amber-100">
                        <div className="flex flex-wrap items-center gap-4">
                          <div>
                            <span className="text-[11px] font-bold text-amber-900/80 block">Vr. Unitario Sugerido</span>
                            <span className="text-lg font-extrabold text-amber-950">{formatCurrency(itemSuggestedPrice)}</span>
                          </div>
                          <div className="h-7 w-px bg-amber-200 hidden sm:block"></div>
                          <div>
                            <span className="text-[11px] font-bold text-amber-900/80 block">Subtotal Ítem ({item.quantity || 1} und)</span>
                            <span className="text-lg font-extrabold text-primary">{formatCurrency(item.subtotal)}</span>
                          </div>
                          <div className="h-7 w-px bg-amber-200 hidden sm:block"></div>
                          <div>
                            <span className="text-[11px] font-bold text-amber-900/80 block">Total con IVA ({item.applyVat ? '19%' : 'Exento'})</span>
                            <span className="text-lg font-extrabold text-foreground">{formatCurrency(item.total)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button 
                            type="button"
                            onClick={() => calculateInternal(item.id)}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                            title="Asegurar recálculo"
                          >
                            <Calculator className="w-3.5 h-3.5" /> Forzar Recálculo
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Row 2: Modo de Producción Segmentado */}
                <div className="flex bg-muted p-1 rounded-lg text-sm font-bold w-full sm:w-fit">
                  {(['IN_HOUSE', 'OUTSOURCED', 'AGENCY'] as ProductionMode[]).map(mode => (
                    <button 
                      key={mode}
                      onClick={() => handleModeChange(item.id, mode)}
                      className={`flex-1 sm:px-8 py-1.5 rounded-md transition-colors ${item.productionMode === mode ? 'bg-success text-success-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted-foreground/10'}`}
                    >
                      {mode === 'IN_HOUSE' ? 'Propio' : mode === 'OUTSOURCED' ? 'Tercerizado' : 'Agencia'}
                    </button>
                  ))}
                </div>

                {/* Row 3: Specs Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5">Tamaño</label>
                    <input type="text" value={item.size} onChange={(e) => updateItem(item.id, { size: e.target.value })} className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none bg-background" placeholder="Ej: 100x70 cm, Carta..." />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5">Tintas</label>
                    <input type="text" value={item.inks} onChange={(e) => updateItem(item.id, { inks: e.target.value })} className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none bg-background" placeholder="Ej: 4x4, 4x0..." />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5">Material</label>
                    <input type="text" value={item.material} onChange={(e) => updateItem(item.id, { material: e.target.value })} className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none bg-background" placeholder="Ej: Vinilo, PVC..." />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5">Acabados</label>
                    <input type="text" value={item.finishes} onChange={(e) => updateItem(item.id, { finishes: e.target.value })} className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none bg-background" placeholder="Ej: Laminado, Troquelado..." />
                  </div>
                </div>

                {/* Row 4: Subtotal y Cantidad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1.5">Subtotal (sin IVA)</label>
                    <SmartNumberInput 
                        value={item.subtotal || 0}
                        onChange={(val) => handleItemValueChange(item.id, 'lineSubtotal', val)}
                        prefix="$"
                        className="w-full pr-3 py-2 border border-input rounded-md text-sm focus:ring-2 focus:ring-info/20 focus:border-info focus:bg-info/5 transition-colors font-bold text-foreground outline-none bg-background" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1.5">Cantidad</label>
                    <SmartNumberInput 
                      value={item.quantity || 0}
                      onChange={(val) => handleItemValueChange(item.id, 'quantity', val)}
                      min="1"
                      className="w-full py-2 border border-input rounded-md text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none bg-background" 
                    />
                  </div>
                </div>

                {/* Row 5: Vr Unitario y IVA */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground flex items-center justify-between mb-1.5">
                      <span>Vr. Unitario</span>
                      {item.isManuallyAdjusted && <span className="text-[9px] bg-alert/20 text-alert px-1.5 py-0.5 rounded">Manual</span>}
                    </label>
                    <SmartNumberInput 
                        value={item.unitPrice || 0}
                        onChange={(val) => handleItemValueChange(item.id, 'unitPrice', val)}
                        prefix="$"
                        className="w-full pr-3 py-2 border border-transparent bg-muted rounded-md text-sm font-bold text-foreground focus:bg-background focus:border-input focus:ring-2 focus:ring-primary/20 outline-none transition-colors" 
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-muted-foreground">IVA (19%)</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground">Exento</span>
                        <button 
                          onClick={() => handleVatToggle(item.id)}
                          className={`w-7 h-4 rounded-full relative transition-colors ${!item.applyVat ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                        >
                          <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${!item.applyVat ? 'right-0.5' : 'left-0.5'}`}></span>
                        </button>
                      </div>
                    </div>
                    <div className="bg-muted px-3 py-2 border border-transparent rounded-md text-sm text-muted-foreground font-bold">
                      {formatCurrency(item.vatAmount)}
                    </div>
                  </div>
                </div>

                {/* Row 6: Total c/IVA */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1.5">Total c/IVA</label>
                  <SmartNumberInput 
                      value={item.total || 0}
                      onChange={(val) => handleItemValueChange(item.id, 'lineTotal', val)}
                      prefix="$"
                      className="w-full pr-4 py-3 bg-success/10 border border-success/20 rounded-lg text-lg font-bold text-success focus:bg-success/20 focus:border-success/40 focus:ring-2 focus:ring-success/20 outline-none transition-colors" 
                  />
                </div>

              </div>
            );
          })}
          
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/80">
            <span className="text-xs text-muted-foreground">
              Total de ítems: <strong className="text-foreground">{items.length}</strong> (los nuevos ítems siempre se insertan arriba como Ítem #1)
            </span>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center text-xs font-bold text-primary hover:text-primary-foreground hover:bg-primary bg-primary/10 px-3.5 py-2 rounded-lg border border-primary/20 transition-all shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar Nuevo Ítem Arriba
            </button>
          </div>
          </div>
        </div>

        {/* BLOQUE 4: CONDICIONES Y NOTAS */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div 
            className="p-4 border-b border-border flex justify-between items-center cursor-pointer hover:bg-muted/30 transition-colors bg-muted/10"
            onClick={() => setCondExpanded(!condExpanded)}
          >
            <h2 className="font-bold text-foreground">Condiciones Comerciales y Notas</h2>
            {condExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </div>
          
          {condExpanded && (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1.5">Tiempo de entrega</label>
                  <input 
                    type="text" 
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background" 
                    placeholder="Ej: 5 a 8 días hábiles" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1.5">Forma de pago</label>
                  <input 
                    type="text" 
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background" 
                    placeholder="Ej: 50% anticipo, 50% contra entrega" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1.5">Validez de la oferta</label>
                  <input 
                    type="text" 
                    value={validityDays}
                    onChange={(e) => setValidityDays(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background" 
                    placeholder="Ej: 30 días calendario" 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Condiciones comerciales adicionales</label>
                <textarea 
                  value={commercialTerms}
                  onChange={(e) => setCommercialTerms(e.target.value)}
                  className="w-full px-3 py-3 border border-input rounded-md text-sm font-medium min-h-[110px] resize-y focus:ring-2 focus:ring-primary/20 outline-none bg-background" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Notas para el cliente</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-3 border border-input rounded-md text-sm font-medium min-h-[70px] resize-y focus:ring-2 focus:ring-primary/20 outline-none bg-background" 
                  placeholder="Notas adicionales para el cliente..." 
                />
              </div>

              <div className="p-4 bg-alert/5 border border-alert/20 rounded-lg">
                <label className="text-xs font-bold text-alert flex items-center gap-2 mb-2">
                  Notas Internas 
                  <span className="text-[10px] font-bold bg-alert/20 text-alert px-2 py-0.5 rounded-full uppercase tracking-wider">Solo uso interno, el cliente nunca lo ve</span>
                </label>
                <textarea 
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full px-3 py-3 border border-alert/30 rounded-md text-sm font-medium min-h-[70px] bg-background focus:ring-2 focus:ring-alert/20 outline-none" 
                  placeholder="Notas internas del equipo comercial o de producción..." 
                />
              </div>
            </div>
          )}
        </div>

        {/* Resumen Móvil */}
        <div className="lg:hidden">
          <SummaryCard />
        </div>

        {/* BLOQUE 6: ASESOR COMERCIAL Y FIRMA */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/10 flex items-center justify-between">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <PenLine className="w-5 h-5 text-muted-foreground" /> Asesor Comercial y Firma
            </h2>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Aparece en PDF, Email y WhatsApp
            </span>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Comercial que elabora la propuesta
                </label>
                <input 
                  type="text" 
                  value={advisorName}
                  onChange={(e) => setAdvisorName(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Nombre y apellido del asesor..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Cargo / Área
                </label>
                <input 
                  type="text" 
                  value={advisorRole}
                  onChange={(e) => setAdvisorRole(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Ej: Gerente Comercial / Asesor de Ventas"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Teléfonos de contacto
                </label>
                <input 
                  type="text" 
                  value={advisorPhone}
                  onChange={(e) => setAdvisorPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="+57 315 474 4830"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Correo electrónico
                </label>
                <input 
                  type="email" 
                  value={advisorEmail}
                  onChange={(e) => setAdvisorEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="correo@fusioncomunicacion.com"
                />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="p-4 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl bg-muted/5 hover:bg-muted/20 transition-colors cursor-pointer">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-foreground">Firma institucional predeterminada activa</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Click para subir una firma personalizada opcional (PNG, JPG máx. 2MB)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones Móvil */}
        <div className="lg:hidden space-y-6">
          <SummaryCard />
          <QuoteActionsPanel />
        </div>

      </div>

      {/* PANEL DERECHO: RESUMEN Y ACCIONES (Solo Desktop) */}
      <div className="hidden lg:flex w-80 flex-col space-y-6 shrink-0 sticky top-4">
        <SummaryCard />
        <QuoteActionsPanel />
      </div>

      {/* MODAL / PANEL CATÁLOGO */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !isExtracting && setAiModalOpen(false)}>
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-amber-600" /> Pre-cotizar con IA
              </h2>
              <button onClick={() => !isExtracting && setAiModalOpen(false)} className="text-muted-foreground hover:bg-muted p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex border-b border-border">
              <button onClick={() => setAiTab("doc")} className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${aiTab === "doc" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>Documento</button>
              <button onClick={() => setAiTab("image")} className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${aiTab === "image" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>Imagen</button>
              <button onClick={() => setAiTab("chat")} className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${aiTab === "chat" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>Chat WhatsApp</button>
            </div>

            <div className="p-6">
              {aiTab === "chat" ? (
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-muted-foreground">Pega la conversación o sube el .txt</label>
                  <textarea disabled={isExtracting} className="w-full h-32 p-3 border border-input rounded-md text-sm resize-none focus:ring-2 focus:ring-primary/20 outline-none" placeholder="[10:15, 12/09/2026] Cliente: Hola, necesito 2 pendones de 100x150cm en banner..."></textarea>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors">
                  <UploadCloud className="w-8 h-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-bold text-foreground">Arrastra o selecciona tu {aiTab === "doc" ? "documento (PDF/Word)" : "imagen (JPG/PNG)"}</p>
                </div>
              )}

              {isExtracting && (
                <div className="mt-6 space-y-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-pulse w-2/3"></div>
                  </div>
                  <p className="text-xs font-bold text-center text-muted-foreground animate-pulse">Analizando contenido y extrayendo productos...</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-muted/10 flex justify-end gap-3">
              <button onClick={() => setAiModalOpen(false)} disabled={isExtracting} className="px-4 py-2 font-bold text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleAIExtract} disabled={isExtracting} className="px-4 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-md shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50">
                {isExtracting ? "Procesando..." : "Extraer Ítems"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / PANEL CATÁLOGO */}
      {catalogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCatalogOpen(false)}>
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Search className="w-5 h-5 text-muted-foreground" /> Catálogo
              </h2>
              <button onClick={() => setCatalogOpen(false)} className="text-muted-foreground hover:bg-muted p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-border">
              <input 
                type="text" 
                autoFocus
                placeholder="Buscar por nombre, tamaño, materiales..." 
                className="w-full px-3 py-2 border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium bg-background"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="p-3 text-center text-muted-foreground text-sm space-y-3">
                <p>No se encontraron resultados para "{catalogSearch || '...'}"</p>
                {catalogTargetId && (
                  <button 
                    onClick={() => {
                      updateItem(catalogTargetId, { description: catalogSearch || 'Nuevo Producto' });
                      setCatalogOpen(false);
                      alert(`Mock: Se ha creado el producto en el catálogo y asignado a la línea.`);
                    }}
                    className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Crear "{catalogSearch || 'Nuevo'}" en el Catálogo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL LATERAL AYUDA PARA COTIZAR (ETAPA 18.4 y 18.5) */}
      <QuoteAssistSheet
        isOpen={assistSheetOpen}
        onClose={() => {
          setAssistSheetOpen(false);
          setAssistTargetItem(null);
        }}
        hasCostPermission={canQuoteAssistCost}
        initialValues={
          assistTargetItem
            ? {
                jobName: assistTargetItem.description || `Ítem #${assistTargetItem.order}`,
                qty1: assistTargetItem.quantity || 1000,
                artWidthCm: assistTargetItem.size ? parseFloat(assistTargetItem.size.split('x')[0]) || 14 : 14,
                artHeightCm: assistTargetItem.size ? parseFloat(assistTargetItem.size.split('x')[1]) || 21.5 : 21.5,
              }
            : undefined
        }
        quoteId={editingQuote?.id}
        onApplyToQuote={handleApplyItemsFromAssist}
        existingTariffVersionId={quoteTariffVersionId}
        existingItemsCount={items.length}
      />

      {/* MODAL MODO LECTURA CÁLCULO ASISTIDO (BLOQUE C) */}
      <AssistRunReadOnlyModal
        isOpen={isReadOnlyAssistModalOpen}
        onClose={() => {
          setIsReadOnlyAssistModalOpen(false);
          setReadOnlyAssistItem(null);
        }}
        item={readOnlyAssistItem}
        onRecalculate={(it) => {
          setIsReadOnlyAssistModalOpen(false);
          openAssistModal(it);
        }}
        hasCostPermission={canQuoteAssistCost}
      />

    </div>
  );
}

function QuoteHistory({
  onContinueQuote,
  onStartNewQuote
}: {
  onContinueQuote?: (quote: any) => void;
  onStartNewQuote?: () => void;
}) {
  const [quotes, setQuotes] = React.useState<any[]>([]);
  const [filter, setFilter] = React.useState('Todos los estados');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [massRecalcOpen, setMassRecalcOpen] = React.useState(false);
  const currentTariffVersion = { id: 'tar-2026-02', code: 'TAR-2026-02', name: 'Tarifario Oficial Vigente (v2.0)' };

  const loadQuotes = async () => {
    const all = getQuotes();
    setQuotes(Array.isArray(all) ? all : []);
    
    // Sincronizar con el servidor para que "quede guardado"
    const synced = await syncQuotesFromApi();
    if (synced) setQuotes(synced);
  };

  React.useEffect(() => {
    loadQuotes();
    window.addEventListener('fusion_quotes_updated', loadQuotes);
    window.addEventListener('storage', loadQuotes);
    return () => {
      window.removeEventListener('fusion_quotes_updated', loadQuotes);
      window.removeEventListener('storage', loadQuotes);
    };
  }, []);

  const handleApplyRevisions = (newRevisionQuotes: any[]) => {
    if (!newRevisionQuotes || newRevisionQuotes.length === 0) return;
    const currentAll = getQuotes();
    const updated = [...newRevisionQuotes, ...currentAll];
    try {
      localStorage.setItem('fusion_quotes', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving recalculated quotes', e);
    }
    window.dispatchEvent(new Event('fusion_quotes_updated'));
    loadQuotes();
  };

  const handleDelete = (id: string, number: string) => {
    if (window.confirm(`¿Estás seguro de eliminar la cotización ${number}? Esta acción no se puede deshacer.`)) {
      deleteQuote(id);
    }
  };

  const handleMarkAsWon = async (quote: any) => {
    if (window.confirm(`¿Marcar la cotización ${quote.number} como GANADA? Esto creará automáticamente el Proyecto en Producción.`)) {
      try {
        const { approveQuote } = await import("../../../../lib/quotesStore");
        await approveQuote(quote.id, { 
          status: 'Aprobada',
          approvedBy: 'Gerencia Comercial (Ganada)',
          total: quote.total,
          subtotal: quote.subtotal,
          items: quote.items
        });
        alert(`¡Cotización ${quote.number} marcada como GANADA! El proyecto ha sido creado en Producción.`);
        loadQuotes();
      } catch (err: any) {
        console.error('Error in handleMarkAsWon:', err);
        alert(`Error al marcar como ganada: ${err.message || 'Error desconocido'}`);
      }
    }
  };

  const filteredQuotes = quotes.filter(q => {
    const isPreQuote = Boolean(q.isPreQuote || q.aiExtracted || q.number?.startsWith('PRE-'));
    let matchesFilter = true;
    if (filter === 'Pre-cotizaciones IA') {
      matchesFilter = isPreQuote;
    } else if (filter === 'Calculadas con tarifario anterior') {
      matchesFilter = Boolean(
        (q.tariffVersionId && q.tariffVersionId !== currentTariffVersion.id) ||
        (!q.tariffVersionId && q.items?.some((it: any) => it.assistRunId))
      );
    } else if (filter !== 'Todos los estados') {
      matchesFilter = q.status === filter;
    }
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesFilter;
    const matchesSearch = 
      (q.number && q.number.toLowerCase().includes(query)) ||
      (q.clientName && q.clientName.toLowerCase().includes(query)) ||
      (q.clientNit && q.clientNit.toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-6 min-h-[450px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Cotizaciones Históricas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consulta, continúa editando, descarga en PDF o envía cotizaciones guardadas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botón Recálculo Masivo (Bloque D) */}
          <button 
            type="button"
            onClick={() => setMassRecalcOpen(true)}
            className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Recalcular cotizaciones en borrador con tarifario vigente"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Recalcular con tarifario vigente</span>
          </button>
          {onStartNewQuote && (
            <button 
              onClick={onStartNewQuote}
              className="px-4 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 self-start sm:self-auto shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nueva Cotización
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-background font-medium" 
            placeholder="Buscar por N° cotización, cliente o NIT..." 
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Estado:</label>
          <select 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="px-3 py-2 border border-input rounded-lg text-sm font-medium w-full sm:w-60 bg-background focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option>Todos los estados</option>
            <option value="Calculadas con tarifario anterior">⚠️ Con tarifario anterior</option>
            <option value="Pre-cotizaciones IA">✨ Pre-cotizaciones IA</option>
            <option>Borrador</option>
            <option>Finalizada</option>
            <option>Enviada</option>
            <option>Aprobada</option>
            <option>Rechazada</option>
          </select>
        </div>
      </div>
      
      {filteredQuotes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/10">
          <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-bold text-foreground">
            {searchQuery || filter !== 'Todos los estados' ? 'No se encontraron cotizaciones' : '0 cotizaciones en curso'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery || filter !== 'Todos los estados' 
              ? 'Prueba modificando los filtros de búsqueda o estado.' 
              : 'El sistema está limpio y listo para registrar cotizaciones comerciales oficiales.'}
          </p>
          {onStartNewQuote && (
            <button 
              onClick={onStartNewQuote}
              className="mt-4 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Crear primera cotización
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground">
                <th className="p-3.5">N° Cotización</th>
                <th className="p-3.5">Cliente</th>
                <th className="p-3.5">Fecha</th>
                <th className="p-3.5 text-right">Total (COP)</th>
                <th className="p-3.5 text-center">Estado</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredQuotes.map((q) => {
                const isPre = Boolean(q.isPreQuote || q.aiExtracted || q.number?.startsWith('PRE-'));
                return (
                <tr key={q.id} className={`hover:bg-muted/20 transition-colors group ${isPre ? 'bg-amber-500/[0.03]' : ''}`}>
                  <td className="p-3.5 text-sm font-bold text-foreground">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <FileText className={`w-4 h-4 shrink-0 ${isPre ? 'text-amber-500' : 'text-primary'}`} />
                        <span>{q.number}</span>
                        {isPre && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700">
                            ✨ IA
                          </span>
                        )}
                      </div>
                      {/* Badge Tarifario Anterior / Congelado (Bloque D) */}
                      {q.tariffVersionId && q.tariffVersionId !== currentTariffVersion.id && (
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                            q.status === 'Borrador'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            {q.status === 'Borrador' ? (
                              <>
                                <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                                <span>Tarifario anterior ({q.tariffVersionId})</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                                <span>Tarifario congelado ({q.tariffVersionId})</span>
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 text-sm">
                    <span className="font-semibold text-foreground block">{q.clientName || 'Cliente sin nombre'}</span>
                    {q.clientNit && <span className="text-xs text-muted-foreground">NIT: {q.clientNit}</span>}
                  </td>
                  <td className="p-3.5 text-sm text-muted-foreground whitespace-nowrap">
                    {q.date ? new Date(q.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="p-3.5 text-sm font-bold text-right text-foreground whitespace-nowrap">
                    {q.total > 0 ? (
                      formatCurrency(q.total)
                    ) : (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        Pendiente costeo
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-center whitespace-nowrap">
                    {isPre ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Pre-cotización IA
                      </span>
                    ) : (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        q.status === 'Aprobada' ? 'bg-success/15 text-success border border-success/20' : 
                        q.status === 'Enviada' ? 'bg-info/15 text-info border border-info/20' : 
                        q.status === 'Finalizada' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-800' :
                        q.status === 'Rechazada' ? 'bg-danger/15 text-danger border border-danger/20' : 
                        'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {q.status || 'Borrador'}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Continuar / Editar */}
                      {onContinueQuote && (
                        <button 
                          onClick={() => onContinueQuote(q)}
                          className={`px-2.5 py-1.5 font-bold text-xs rounded-md transition-colors flex items-center gap-1 ${
                            isPre 
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                              : 'bg-primary/10 hover:bg-primary/20 text-primary'
                          }`}
                          title={isPre ? "Completar precios y finalizar pre-cotización" : "Continuar editando cotización"}
                        >
                          <Edit className="w-3.5 h-3.5" /> {isPre ? 'Completar' : 'Continuar'}
                        </button>
                      )}
                      
                      {/* Descargar PDF */}
                      <button 
                        onClick={() => generateQuotePDF(q)}
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
                        title="Descargar PDF"
                      >
                        <FileText className="w-4 h-4 text-rose-500" />
                      </button>

                      {/* Enviar WhatsApp */}
                      <button 
                        onClick={() => sendQuoteWhatsApp(q)}
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-emerald-600 rounded-md transition-colors"
                        title="Enviar por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                      </button>

                      {/* Marcar como GANADA */}
                      {q.status !== 'Aprobada' && (
                        <button 
                          onClick={() => handleMarkAsWon(q)}
                          className="p-1.5 hover:bg-success/10 text-muted-foreground hover:text-success rounded-md transition-colors"
                          title="Marcar como GANADA (Pasar a Producción)"
                        >
                          <Trophy className="w-4 h-4 text-amber-500" />
                        </button>
                      )}

                      {/* Enviar Email */}
                      <button 
                        onClick={() => sendQuoteEmail(q)}
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-sky-600 rounded-md transition-colors"
                        title="Enviar por Email"
                      >
                        <Mail className="w-4 h-4 text-sky-600" />
                      </button>

                      {/* Eliminar */}
                      <button 
                        onClick={() => handleDelete(q.id, q.number)}
                        className="p-1.5 hover:bg-danger/10 text-muted-foreground hover:text-danger rounded-md transition-colors"
                        title="Eliminar de historial"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Recálculo Masivo por Cambio de Tarifario (Bloque D) */}
      <MassRecalculateModal
        isOpen={massRecalcOpen}
        onClose={() => setMassRecalcOpen(false)}
        currentTariffVersion={currentTariffVersion}
        quotes={quotes}
        onApplyRevisions={handleApplyRevisions}
      />
    </div>
  );
}

function QuoteConfig() {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-6 min-h-[400px] max-w-2xl">
      <h2 className="text-xl font-bold mb-6 text-foreground">Configuración del Cotizador</h2>
      <div className="space-y-6">
        <div>
          <h3 className="font-bold text-sm mb-3">Márgenes por defecto</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Propio (%)</label>
              <input type="number" defaultValue={CONFIG.margins.IN_HOUSE} className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Tercerizado (%)</label>
              <input type="number" defaultValue={CONFIG.margins.OUTSOURCED} className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Agencia (%)</label>
              <input type="number" defaultValue={CONFIG.margins.AGENCY} className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background" />
            </div>
          </div>
        </div>
        
        <hr className="border-border" />
        
        <div>
          <h3 className="font-bold text-sm mb-3">Impuestos</h3>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="rounded border-input text-primary focus:ring-primary" id="ivaCheck" />
            <label htmlFor="ivaCheck" className="text-sm font-medium">Aplicar IVA por defecto (19%)</label>
          </div>
        </div>

        <hr className="border-border" />
        
        <div>
          <h3 className="font-bold text-sm mb-3">Plantillas Base</h3>
          <div className="space-y-4">
             <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Forma de pago predeterminada</label>
                <input type="text" defaultValue="50% anticipo, 50% contra entrega" className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background" />
             </div>
             <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Validez predeterminada</label>
                <input type="text" defaultValue="15 días" className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background" />
             </div>
          </div>
        </div>

        <div className="pt-4">
          <button className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors shadow-sm">
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}
