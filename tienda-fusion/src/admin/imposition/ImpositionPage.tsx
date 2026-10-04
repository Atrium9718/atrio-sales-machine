import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Layers, 
  Ruler, 
  Maximize2, 
  Printer, 
  CheckCircle2, 
  FileText, 
  Download, 
  Sparkles, 
  RotateCw, 
  Info, 
  Sliders, 
  ArrowRight,
  Grid,
  Upload,
  Image as ImageIcon,
  Trash2,
  FileDown,
  RefreshCw,
  Eye,
  Check,
  Package,
  User,
  Search,
  X,
  ExternalLink,
  Tag,
  Calendar,
  AlertCircle,
  Scissors,
  ShieldCheck,
  Zap,
  Palette
} from 'lucide-react';
import jsPDF from 'jspdf';
import { useAuth } from '../../contexts/AuthContext';
import { SheetPreset, PiecePreset, CalculationResult, ConnectedClientProject, ClientProjectItem, SheetComparisonItem, SmartFitSuggestion, HybridLayoutOption } from './types';
import ClientProjectModal from './ClientProjectModal';
import ClientProjectBanner from './ClientProjectBanner';
import PrintableWorkOrder from './PrintableWorkOrder';
import SheetEfficiencyAdvisor from './SheetEfficiencyAdvisor';

const SHEET_PRESETS: SheetPreset[] = [
  { id: 'medio_50_70', name: 'Medio Pliego (50 x 70 cm)', widthCm: 70, heightCm: 50, category: 'Heidelberg / Roland' },
  { id: 'pliego_70_100', name: 'Pliego Completo (70 x 100 cm)', widthCm: 100, heightCm: 70, category: 'Estándar Colombia' },
  { id: 'cuarto_35_50', name: 'Cuarto de Pliego (35 x 50 cm)', widthCm: 50, heightCm: 35, category: 'GTO 52 / Ryobi' },
  { id: 'octavo_25_35', name: 'Octavo de Pliego (25 x 35 cm)', widthCm: 35, heightCm: 25, category: 'Offset Pequeño' },
  { id: 'tabloide_extra', name: 'Tabloide Rebasado / SRA3 (32 x 47 cm)', widthCm: 47, heightCm: 32, category: 'Digital / CTP' },
  { id: 'tabloide_super', name: 'SRA3+ (33 x 48.7 cm)', widthCm: 48.7, heightCm: 33, category: 'Prensa Digital Xerox/Ricoh' },
];

const PIECE_PRESETS: PiecePreset[] = [
  { name: 'Tarjeta de Presentación', widthMm: 90, heightMm: 55, bleedMm: 3 },
  { name: 'Volante Media Carta', widthMm: 140, heightMm: 215, bleedMm: 3 },
  { name: 'Volante Cuarto de Carta', widthMm: 108, heightMm: 140, bleedMm: 3 },
  { name: 'Volante Carta Completa', widthMm: 215, heightMm: 280, bleedMm: 3 },
  { name: 'Afiche Medio Pliego', widthMm: 480, heightMm: 680, bleedMm: 5 },
  { name: 'Plegable 3 Cuerpos (Tríptico Abierto)', widthMm: 297, heightMm: 210, bleedMm: 3 },
  { name: 'Etiqueta Adhesiva Estándar', widthMm: 80, heightMm: 50, bleedMm: 2 },
  { name: 'Separador de Libros', widthMm: 50, heightMm: 200, bleedMm: 3 },
];

// Sample artwork presets for quick testing
const SAMPLE_ARTWORKS = [
  {
    id: 'tarjeta_tech',
    name: 'Tarjeta Black & Gold Premium',
    type: 'tarjeta',
    bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="900" height="550" viewBox="0 0 900 550"><rect width="100%" height="100%" fill="%230f172a"/><circle cx="800" cy="100" r="180" fill="%231e293b" opacity="0.5"/><rect x="60" y="70" width="80" height="80" rx="16" fill="%2314b8a6"/><text x="170" y="125" font-family="sans-serif" font-size="44" font-weight="900" fill="%23ffffff">NEXUS LITHO</text><text x="170" y="160" font-family="sans-serif" font-size="22" font-weight="600" fill="%2394a3b8">ESTUDIO EDITORIAL &amp; PRENSA</text><line x1="60" y1="210" x2="840" y2="210" stroke="%23334155" stroke-width="3"/><text x="60" y="290" font-family="sans-serif" font-size="34" font-weight="800" fill="%23f8fafc">Carlos Alberto Mendoza</text><text x="60" y="335" font-family="sans-serif" font-size="24" font-weight="600" fill="%2314b8a6">Director de Producción Litográfica</text><text x="60" y="420" font-family="sans-serif" font-size="22" fill="%23cbd5e1">+57 (310) 845-9201 | contacto@nexuslitho.com</text><text x="60" y="460" font-family="sans-serif" font-size="22" fill="%2394a3b8">Zona Industrial Puente Aranda, Bogotá D.C.</text><rect x="740" y="380" width="100" height="100" rx="8" fill="%23ffffff"/><text x="755" y="445" font-family="monospace" font-size="28" font-weight="bold" fill="%230f172a">QR</text></svg>'
  },
  {
    id: 'etiqueta_organica',
    name: 'Etiqueta Botánica Gourmet',
    type: 'etiqueta',
    bg: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="100%" height="100%" fill="%23064e3b"/><rect x="25" y="25" width="750" height="450" fill="none" stroke="%23fbbf24" stroke-width="4" stroke-dasharray="12 6"/><circle cx="400" cy="180" r="70" fill="%23047857" stroke="%23fbbf24" stroke-width="3"/><text x="400" y="195" font-family="serif" font-size="52" font-weight="bold" fill="%23fbbf24" text-anchor="middle">CAFÉ</text><text x="400" y="300" font-family="sans-serif" font-size="44" font-weight="900" fill="%23ffffff" text-anchor="middle" letter-spacing="4">ORIGEN SUPREMO</text><text x="400" y="345" font-family="sans-serif" font-size="24" font-weight="500" fill="%23a7f3d0" text-anchor="middle">100% Arábica Suave Colombiano - 500g</text><text x="400" y="420" font-family="sans-serif" font-size="20" font-weight="bold" fill="%23fbbf24" text-anchor="middle">TUESTE MEDIO ESPECIAL - EDICIÓN ARTESANAL</text></svg>'
  },
  {
    id: 'volante_evento',
    name: 'Volante Comercial / Promoción',
    type: 'volante',
    bg: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="700" height="1000" viewBox="0 0 700 1000"><rect width="100%" height="100%" fill="%234338ca"/><circle cx="600" cy="150" r="250" fill="%236366f1" opacity="0.6"/><rect x="50" y="70" width="600" height="120" rx="20" fill="%23fbbf24"/><text x="350" y="145" font-family="sans-serif" font-size="52" font-weight="900" fill="%231e1b4b" text-anchor="middle">GRAN FERIA EDITORIAL</text><text x="350" y="270" font-family="sans-serif" font-size="64" font-weight="900" fill="%23ffffff" text-anchor="middle">50% DESCUENTO</text><text x="350" y="330" font-family="sans-serif" font-size="30" font-weight="bold" fill="%23c7d2fe" text-anchor="middle">EN IMPRESIÓN LITOGRÁFICA</text><rect x="80" y="400" width="540" height="380" rx="24" fill="%231e1b4b" opacity="0.85"/><text x="350" y="470" font-family="sans-serif" font-size="32" font-weight="bold" fill="%2338bdf8" text-anchor="middle">SERVICIOS DE ALTO VOLUMEN</text><text x="130" y="540" font-family="sans-serif" font-size="24" fill="%23ffffff">• Libros Cosidos al Hilo y PUR</text><text x="130" y="600" font-family="sans-serif" font-size="24" fill="%23ffffff">• Catálogos &amp; Revistas Full Color</text><text x="130" y="660" font-family="sans-serif" font-size="24" fill="%23ffffff">• Cajas Plegadizas y Empaques</text><text x="130" y="720" font-family="sans-serif" font-size="24" fill="%23ffffff">• Acabados Foil, Repujado y UV</text><text x="350" y="860" font-family="sans-serif" font-size="32" font-weight="900" fill="%23fbbf24" text-anchor="middle">¡COTIZA TU PEDIDO HOY!</text><text x="350" y="910" font-family="sans-serif" font-size="22" fill="%23ffffff" text-anchor="middle">www.tallergrafico.com | PBX: (601) 745-0000</text></svg>'
  }
];

export default function ImpositionPage() {
  const [searchParams] = useSearchParams();
  const { token } = useAuth();

  // Cutting Policy: corte_comun (0mm gap, shared cut lines) vs doble_corte (gutter spacing)
  const [impositionPolicy, setImpositionPolicy] = useState<'corte_comun' | 'doble_corte'>('corte_comun');

  // Sheet Settings
  const [selectedSheetId, setSelectedSheetId] = useState<string>('medio_50_70');
  const [sheetWidthCm, setSheetWidthCm] = useState<number>(70);
  const [sheetHeightCm, setSheetHeightCm] = useState<number>(50);
  const [gripperMarginMm, setGripperMarginMm] = useState<number>(15); // Pinza
  const [lateralMarginMm, setLateralMarginMm] = useState<number>(10); // Guías laterales

  // Piece Settings
  const [pieceWidthMm, setPieceWidthMm] = useState<number>(90);
  const [pieceHeightMm, setPieceHeightMm] = useState<number>(55);
  const [pieceBleedMm, setPieceBleedMm] = useState<number>(3); // Sangrado
  const [spacingBetweenPiecesMm, setSpacingBetweenPiecesMm] = useState<number>(0);
  const [runQuantity, setRunQuantity] = useState<number>(1000);
  const [wastePercentage, setWastePercentage] = useState<number>(6); // Merma %

  // Artwork & Client Settings
  const [jobName, setJobName] = useState<string>('Montaje_Comercial_01');
  const [customerArtworkUrl, setCustomerArtworkUrl] = useState<string>(SAMPLE_ARTWORKS[0].dataUrl);
  const [customerArtworkName, setCustomerArtworkName] = useState<string>('Tarjeta Black & Gold (Ejemplo)');
  const [showCropMarks, setShowCropMarks] = useState<boolean>(true);
  const [showColorBar, setShowColorBar] = useState<boolean>(true);
  const [showJobInfo, setShowJobInfo] = useState<boolean>(true);
  const [showGuillotineGuideLines, setShowGuillotineGuideLines] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfSuccess, setPdfSuccess] = useState<boolean>(false);

  // Connected Client Project State
  const [connectedProject, setConnectedProject] = useState<ConnectedClientProject | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to change sheet preset
  const handleSheetPresetChange = (presetId: string) => {
    setSelectedSheetId(presetId);
    const preset = SHEET_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSheetWidthCm(preset.widthCm);
      setSheetHeightCm(preset.heightCm);
    }
  };

  // Helper to change piece preset
  const handlePiecePresetChange = (preset: PiecePreset) => {
    setPieceWidthMm(preset.widthMm);
    setPieceHeightMm(preset.heightMm);
    setPieceBleedMm(preset.bleedMm);
  };

  // Auto-detect dimensions from product name / specs
  const detectDimensionsFromItem = (item: ClientProjectItem) => {
    const specs = item.specs || {};
    const name = (item.productName || '').toLowerCase();
    const allSpecsText = `${name} ${Object.values(specs).join(' ')}`.toLowerCase();

    if (allSpecsText.includes('9x5.5') || allSpecsText.includes('90x55') || name.includes('tarjeta')) {
      return { w: 90, h: 55, bleed: 3, sheet: 'cuarto_35_50' };
    }
    if (allSpecsText.includes('14x21.5') || allSpecsText.includes('media carta') || name.includes('media carta')) {
      return { w: 140, h: 215, bleed: 3, sheet: 'medio_50_70' };
    }
    if (allSpecsText.includes('10.8x14') || allSpecsText.includes('cuarto de carta') || name.includes('cuarto de carta')) {
      return { w: 108, h: 140, bleed: 3, sheet: 'cuarto_35_50' };
    }
    if (allSpecsText.includes('21.5x28') || allSpecsText.includes('carta') || name.includes('carta')) {
      return { w: 215, h: 280, bleed: 3, sheet: 'medio_50_70' };
    }
    if (allSpecsText.includes('afiche') || name.includes('afiche')) {
      return { w: 480, h: 680, bleed: 5, sheet: 'pliego_70_100' };
    }
    if (allSpecsText.includes('etiqueta') || name.includes('etiqueta')) {
      return { w: 80, h: 50, bleed: 2, sheet: 'cuarto_35_50' };
    }
    if (allSpecsText.includes('separador') || name.includes('separador')) {
      return { w: 50, h: 200, bleed: 3, sheet: 'cuarto_35_50' };
    }

    return null;
  };

  // Apply connected project to imposition state
  const handleSelectClientProject = (proj: ConnectedClientProject) => {
    setConnectedProject(proj);
    const activeItem = proj.items[proj.selectedItemIndex || 0];
    
    if (activeItem) {
      // 1. Job name
      const cleanClient = proj.clientName.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanProduct = activeItem.productName.replace(/[^a-zA-Z0-9]/g, '_');
      setJobName(`OP_${proj.id}_${cleanClient}_${cleanProduct}`);

      // 2. Quantity
      if (activeItem.quantity) {
        setRunQuantity(activeItem.quantity);
      }

      // 3. Artwork
      const artwork = activeItem.highResPdfUrl || activeItem.previewImageUrl || activeItem.productImage;
      if (artwork) {
        setCustomerArtworkUrl(artwork);
        setCustomerArtworkName(`${activeItem.productName} (${proj.id})`);
      }

      // 4. Dimensions
      const detected = detectDimensionsFromItem(activeItem);
      if (detected) {
        setPieceWidthMm(detected.w);
        setPieceHeightMm(detected.h);
        setPieceBleedMm(detected.bleed);
        handleSheetPresetChange(detected.sheet);
      }
    }
  };

  // Switch between product items in the same connected project
  const handleSwitchItem = (index: number) => {
    if (!connectedProject || !connectedProject.items[index]) return;
    const updated = { ...connectedProject, selectedItemIndex: index };
    handleSelectClientProject(updated);
  };

  // Switch between Tiro and Retiro
  const handleSwitchSide = (side: 'tiro' | 'retiro') => {
    if (!connectedProject) return;
    const activeItem = connectedProject.items[connectedProject.selectedItemIndex || 0];
    const updated = { ...connectedProject, activeSide: side };
    setConnectedProject(updated);

    if (side === 'retiro' && activeItem.secondaryFileUrl) {
      setCustomerArtworkUrl(activeItem.secondaryFileUrl);
      setCustomerArtworkName(`${activeItem.productName} - Retiro (${connectedProject.id})`);
    } else {
      const art = activeItem.highResPdfUrl || activeItem.previewImageUrl || activeItem.productImage;
      if (art) {
        setCustomerArtworkUrl(art);
        setCustomerArtworkName(`${activeItem.productName} - Tiro (${connectedProject.id})`);
      }
    }
  };

  // Disconnect project
  const handleDisconnectProject = () => {
    setConnectedProject(null);
    setJobName('Montaje_Comercial_01');
    setCustomerArtworkUrl(SAMPLE_ARTWORKS[0].dataUrl);
    setCustomerArtworkName(SAMPLE_ARTWORKS[0].name);
  };

  // Handle manual file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomerArtworkName(file.name);
    setJobName(`Montaje_${file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')}`);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCustomerArtworkUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Check URL params on initial load
  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    const itemIdParam = searchParams.get('itemId');

    if (orderIdParam && token) {
      const loadFromUrl = async () => {
        try {
          const res = await fetch(`/api/admin/orders/${orderIdParam}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const order = data.order;
            const items = data.items || [];
            let targetIdx = 0;
            if (itemIdParam) {
              const matchedIdx = items.findIndex((i: any) => String(i.id) === String(itemIdParam));
              if (matchedIdx !== -1) targetIdx = matchedIdx;
            }

            const formattedItems: ClientProjectItem[] = items.map((it: any) => ({
              id: it.id,
              orderId: order.numericId || order.id,
              productId: it.productId,
              productName: it.productName || 'Producto Litográfico',
              quantity: it.quantity || 1000,
              highResPdfUrl: it.highResPdfUrl,
              previewImageUrl: it.previewImageUrl || it.productImage,
              fileType: it.fileType || 'PDF',
              specs: it.specs,
              paperType: it.specs?.Papel || it.specs?.Material || 'Propalcote 300g',
              finishes: it.specs?.Acabados ? (Array.isArray(it.specs.Acabados) ? it.specs.Acabados : [it.specs.Acabados]) : ['Plastificado'],
              inks: it.specs?.Tintas || '4x4 Tintas',
            }));

            const project: ConnectedClientProject = {
              id: order.code || `ORD-${order.id}`,
              orderNumericId: order.numericId || order.id,
              clientName: order.customerName || order.userEmail || 'Cliente',
              clientEmail: order.userEmail || '',
              clientPhone: order.customerPhone || '',
              clientCity: order.customerCity || 'Colombia',
              clientNit: order.customerNit || '',
              orderDate: order.date || new Date().toLocaleDateString('es-CO'),
              orderStatus: order.status || 'EN_PRODUCCION',
              paymentStatus: order.paymentStatus || 'PAID',
              items: formattedItems,
              selectedItemIndex: targetIdx,
              activeSide: 'tiro',
            };

            handleSelectClientProject(project);
          }
        } catch (err) {
          console.error('Error loading order from URL:', err);
        }
      };
      loadFromUrl();
    }
  }, [searchParams, token]);

  // Optimization action handlers
  const handleApplyOptimalSheet = (sheetId: string) => {
    handleSheetPresetChange(sheetId);
  };

  const handleApplyCommonCut = () => {
    setImpositionPolicy('corte_comun');
    setSpacingBetweenPiecesMm(0);
  };

  const handleApplySmartFit = (sug: SmartFitSuggestion) => {
    setPieceWidthMm(sug.targetWidthMm);
    setPieceHeightMm(sug.targetHeightMm);
  };

  // Imposition Calculation Engine & Intelligence Advisor
  const calculation: CalculationResult = useMemo(() => {
    const isCommonCut = impositionPolicy === 'corte_comun';
    const effectiveSpacing = isCommonCut ? 0 : spacingBetweenPiecesMm;
    const effectiveBleed = pieceBleedMm;

    const sheetWidthMm = sheetWidthCm * 10;
    const sheetHeightMm = sheetHeightCm * 10;

    const usableWidthMm = Math.max(0, sheetWidthMm - (lateralMarginMm * 2));
    const usableHeightMm = Math.max(0, sheetHeightMm - gripperMarginMm - lateralMarginMm);

    // Option A: Direct Orientation
    let colsA = 0;
    let rowsA = 0;
    let totalA = 0;
    if (isCommonCut) {
      colsA = Math.floor(usableWidthMm / pieceWidthMm);
      rowsA = Math.floor(usableHeightMm / pieceHeightMm);
    } else {
      colsA = Math.floor((usableWidthMm + effectiveSpacing) / (pieceWidthMm + effectiveSpacing));
      rowsA = Math.floor((usableHeightMm + effectiveSpacing) / (pieceHeightMm + effectiveSpacing));
    }
    totalA = Math.max(0, colsA) * Math.max(0, rowsA);

    // Option B: Rotated 90 deg Orientation
    let colsB = 0;
    let rowsB = 0;
    let totalB = 0;
    if (isCommonCut) {
      colsB = Math.floor(usableWidthMm / pieceHeightMm);
      rowsB = Math.floor(usableHeightMm / pieceWidthMm);
    } else {
      colsB = Math.floor((usableWidthMm + effectiveSpacing) / (pieceHeightMm + effectiveSpacing));
      rowsB = Math.floor((usableHeightMm + effectiveSpacing) / (pieceWidthMm + effectiveSpacing));
    }
    totalB = Math.max(0, colsB) * Math.max(0, rowsB);

    const isRotatedBest = totalB > totalA;
    const bestTotal = isRotatedBest ? totalB : totalA;
    const bestCols = isRotatedBest ? colsB : colsA;
    const bestRows = isRotatedBest ? rowsB : rowsA;
    const pieceNetW = isRotatedBest ? pieceHeightMm : pieceWidthMm;
    const pieceNetH = isRotatedBest ? pieceWidthMm : pieceHeightMm;

    // Efficiency %
    const totalAreaSheet = sheetWidthMm * sheetHeightMm;
    const usefulAreaPieces = bestTotal * (pieceWidthMm * pieceHeightMm);
    const efficiencyPct = totalAreaSheet > 0 ? Math.round((usefulAreaPieces / totalAreaSheet) * 100) : 0;

    const usableAreaTotal = usableWidthMm * usableHeightMm;
    const efficiencyNetPct = usableAreaTotal > 0 ? Math.round((usefulAreaPieces / usableAreaTotal) * 100) : 0;

    // Area Breakdown for Visual Diagnostics
    const areaGripper = sheetWidthMm * gripperMarginMm;
    const areaMargins = (sheetHeightMm * lateralMarginMm * 2) + (sheetWidthMm * lateralMarginMm);
    const pctGripper = totalAreaSheet > 0 ? Math.round((areaGripper / totalAreaSheet) * 100) : 0;
    const pctMargins = totalAreaSheet > 0 ? Math.round((areaMargins / totalAreaSheet) * 100) : 0;
    
    let areaSpacing = 0;
    if (!isCommonCut && bestCols > 0 && bestRows > 0) {
      const blockGrossArea = ((bestCols * pieceNetW) + ((bestCols - 1) * effectiveSpacing)) * 
                             ((bestRows * pieceNetH) + ((bestRows - 1) * effectiveSpacing));
      areaSpacing = Math.max(0, blockGrossArea - usefulAreaPieces);
    }
    const pctSpacing = totalAreaSheet > 0 ? Math.round((areaSpacing / totalAreaSheet) * 100) : 0;
    const pctUnusedWaste = Math.max(0, 100 - (efficiencyPct + pctGripper + pctMargins + pctSpacing));

    // Waste and Reams calculation
    const effectiveSheetsNeeded = bestTotal > 0 ? Math.ceil(runQuantity / bestTotal) : 0;
    const wasteSheets = Math.ceil(effectiveSheetsNeeded * (wastePercentage / 100));
    const totalSheetsToCut = effectiveSheetsNeeded + wasteSheets;

    let cutsPerParentSheet = 1;
    if (sheetWidthCm === 50 && sheetHeightCm === 70) cutsPerParentSheet = 2;
    else if (sheetWidthCm === 35 && sheetHeightCm === 50) cutsPerParentSheet = 4;
    else if (sheetWidthCm === 25 && sheetHeightCm === 35) cutsPerParentSheet = 8;
    else if (sheetWidthCm === 100 && sheetHeightCm === 70) cutsPerParentSheet = 1;
    else if (sheetWidthCm === 70 && sheetHeightCm === 50) cutsPerParentSheet = 2;

    const parentSheets70x100 = Math.ceil(totalSheetsToCut / cutsPerParentSheet);
    const reamsCount = Number((parentSheets70x100 / 500).toFixed(2));

    // Block dimensions & Guillotine Cuts
    let totalBlockNetW = 0;
    let totalBlockNetH = 0;
    let guillotineCutsCount = 0;
    let cutsSaved = 0;

    if (isCommonCut) {
      totalBlockNetW = bestCols * pieceNetW;
      totalBlockNetH = bestRows * pieceNetH;
      guillotineCutsCount = (bestCols > 0 && bestRows > 0) ? (bestCols + 1) + (bestRows + 1) : 0;
      const conventionalDoubleCuts = (bestCols * 2) + (bestRows * 2);
      cutsSaved = Math.max(0, conventionalDoubleCuts - guillotineCutsCount);
    } else {
      totalBlockNetW = bestCols > 0 ? (bestCols * pieceNetW) + ((bestCols - 1) * effectiveSpacing) : 0;
      totalBlockNetH = bestRows > 0 ? (bestRows * pieceNetH) + ((bestRows - 1) * effectiveSpacing) : 0;
      guillotineCutsCount = (bestCols * 2) + (bestRows * 2);
      cutsSaved = 0;
    }

    const startX = Math.max(lateralMarginMm, (sheetWidthMm - totalBlockNetW) / 2);
    const startY = Math.max(gripperMarginMm, gripperMarginMm + ((usableHeightMm - totalBlockNetH) / 2));

    // 1. COMPARATIVE ANALYSIS FOR ALL SHEET PRESETS
    const sheetComparisons: SheetComparisonItem[] = SHEET_PRESETS.map((preset) => {
      const pW = preset.widthCm * 10;
      const pH = preset.heightCm * 10;
      const pUsableW = Math.max(0, pW - (lateralMarginMm * 2));
      const pUsableH = Math.max(0, pH - gripperMarginMm - lateralMarginMm);

      let cA = 0, rA = 0, tA = 0;
      let cB = 0, rB = 0, tB = 0;

      if (isCommonCut) {
        cA = Math.floor(pUsableW / pieceWidthMm);
        rA = Math.floor(pUsableH / pieceHeightMm);
        cB = Math.floor(pUsableW / pieceHeightMm);
        rB = Math.floor(pUsableH / pieceWidthMm);
      } else {
        cA = Math.floor((pUsableW + effectiveSpacing) / (pieceWidthMm + effectiveSpacing));
        rA = Math.floor((pUsableH + effectiveSpacing) / (pieceHeightMm + effectiveSpacing));
        cB = Math.floor((pUsableW + effectiveSpacing) / (pieceHeightMm + effectiveSpacing));
        rB = Math.floor((pUsableH + effectiveSpacing) / (pieceWidthMm + effectiveSpacing));
      }

      tA = Math.max(0, cA) * Math.max(0, rA);
      tB = Math.max(0, cB) * Math.max(0, rB);
      const pBestTotal = Math.max(tA, tB);

      const pTotalArea = pW * pH;
      const pUsefulArea = pBestTotal * (pieceWidthMm * pieceHeightMm);
      const pEff = pTotalArea > 0 ? Math.round((pUsefulArea / pTotalArea) * 100) : 0;
      const pUsableArea = pUsableW * pUsableH;
      const pEffNet = pUsableArea > 0 ? Math.round((pUsefulArea / pUsableArea) * 100) : 0;

      const pSheetsNeeded = pBestTotal > 0 ? Math.ceil(runQuantity / pBestTotal) : 0;
      const pWasteSheets = Math.ceil(pSheetsNeeded * (wastePercentage / 100));
      const pTotalCut = pSheetsNeeded + pWasteSheets;

      let pCutsParent = 1;
      if ((preset.widthCm === 70 && preset.heightCm === 50) || (preset.widthCm === 50 && preset.heightCm === 70)) pCutsParent = 2;
      else if (preset.widthCm === 50 && preset.heightCm === 35) pCutsParent = 4;
      else if (preset.widthCm === 35 && preset.heightCm === 25) pCutsParent = 8;
      else if (preset.widthCm === 100 && preset.heightCm === 70) pCutsParent = 1;

      const pParentSheets = Math.ceil(pTotalCut / pCutsParent);
      const pReams = Number((pParentSheets / 500).toFixed(2));

      const isCurrent = (preset.widthCm === sheetWidthCm && preset.heightCm === sheetHeightCm) || selectedSheetId === preset.id;

      return {
        sheetId: preset.id,
        sheetName: preset.name,
        widthCm: preset.widthCm,
        heightCm: preset.heightCm,
        totalPoses: pBestTotal,
        efficiencyPct: pEff,
        efficiencyNetPct: pEffNet,
        totalSheets: pTotalCut,
        reamsCount: pReams,
        isCurrent,
        isBest: false,
        posesDiff: pBestTotal - bestTotal,
        reamsSaved: Number((reamsCount - pReams).toFixed(2)),
      };
    });

    // Mark the best sheet
    if (sheetComparisons.length > 0) {
      let highestEff = -1;
      let bestIdx = 0;
      sheetComparisons.forEach((item, idx) => {
        if (item.efficiencyPct > highestEff) {
          highestEff = item.efficiencyPct;
          bestIdx = idx;
        }
      });
      if (sheetComparisons[bestIdx]) {
        sheetComparisons[bestIdx].isBest = true;
      }
    }

    // 2. SMART FIT SUITABILITY ANALYSIS (Micro-trim to gain poses)
    const smartFitSuggestions: SmartFitSuggestion[] = [];
    const testDeltas = [
      { dw: -2, dh: 0 },
      { dw: -3, dh: 0 },
      { dw: -4, dh: 0 },
      { dw: -5, dh: 0 },
      { dw: 0, dh: -2 },
      { dw: 0, dh: -3 },
      { dw: 0, dh: -4 },
      { dw: 0, dh: -5 },
      { dw: -3, dh: -3 },
      { dw: -5, dh: -5 },
    ];

    testDeltas.forEach(({ dw, dh }) => {
      const targetW = pieceWidthMm + dw;
      const targetH = pieceHeightMm + dh;
      if (targetW <= 10 || targetH <= 10) return;

      let cA = 0, rA = 0, cB = 0, rB = 0;
      if (isCommonCut) {
        cA = Math.floor(usableWidthMm / targetW);
        rA = Math.floor(usableHeightMm / targetH);
        cB = Math.floor(usableWidthMm / targetH);
        rB = Math.floor(usableHeightMm / targetW);
      } else {
        cA = Math.floor((usableWidthMm + effectiveSpacing) / (targetW + effectiveSpacing));
        rA = Math.floor((usableHeightMm + effectiveSpacing) / (targetH + effectiveSpacing));
        cB = Math.floor((usableWidthMm + effectiveSpacing) / (targetH + effectiveSpacing));
        rB = Math.floor((usableHeightMm + effectiveSpacing) / (targetW + effectiveSpacing));
      }
      const newTot = Math.max(cA * rA, cB * rB);

      if (newTot > bestTotal) {
        const newEff = totalAreaSheet > 0 ? Math.round(((newTot * targetW * targetH) / totalAreaSheet) * 100) : 0;
        const exists = smartFitSuggestions.some(s => s.targetWidthMm === targetW && s.targetHeightMm === targetH);
        if (!exists) {
          smartFitSuggestions.push({
            targetWidthMm: targetW,
            targetHeightMm: targetH,
            diffWidthMm: dw,
            diffHeightMm: dh,
            extraPoses: newTot - bestTotal,
            newTotal: newTot,
            newEfficiencyPct: newEff,
            note: `Reduciendo ${Math.abs(dw || dh)}mm ganas +${newTot - bestTotal} poses`,
          });
        }
      }
    });

    // Sort smart suggestions by extra poses then smallest trim
    smartFitSuggestions.sort((a, b) => b.extraPoses - a.extraPoses || (Math.abs(a.diffWidthMm) + Math.abs(a.diffHeightMm)) - (Math.abs(b.diffWidthMm) + Math.abs(b.diffHeightMm)));

    // 3. HYBRID / MIXED IMPOSITION CALCULATION (Pose in remaining strip)
    let hybridOption: HybridLayoutOption | null = null;
    if (bestCols > 0 && bestRows > 0 && isCommonCut) {
      const remainingBottomH = usableHeightMm - (bestRows * pieceNetH);
      const remainingRightW = usableWidthMm - (bestCols * pieceNetW);

      // Check if rotated poses fit in bottom strip
      if (remainingBottomH >= pieceNetW) {
        const extraColsBottom = Math.floor(usableWidthMm / pieceNetH);
        const extraRowsBottom = Math.floor(remainingBottomH / pieceNetW);
        const extraBottom = extraColsBottom * extraRowsBottom;
        if (extraBottom > 0) {
          const totHybrid = bestTotal + extraBottom;
          const newEff = totalAreaSheet > 0 ? Math.round(((totHybrid * pieceWidthMm * pieceHeightMm) / totalAreaSheet) * 100) : 0;
          hybridOption = {
            canUseHybrid: true,
            extraPoses: extraBottom,
            totalHybridPoses: totHybrid,
            newEfficiencyPct: newEff,
            stripType: 'bottom',
            extraCols: extraColsBottom,
            extraRows: extraRowsBottom,
            extraPoseW: pieceNetH,
            extraPoseH: pieceNetW,
            extraStartX: startX,
            extraStartY: startY + (bestRows * pieceNetH),
          };
        }
      } else if (remainingRightW >= pieceNetH) {
        // Check if rotated poses fit in right strip
        const extraColsRight = Math.floor(remainingRightW / pieceNetH);
        const extraRowsRight = Math.floor(usableHeightMm / pieceNetW);
        const extraRight = extraColsRight * extraRowsRight;
        if (extraRight > 0) {
          const totHybrid = bestTotal + extraRight;
          const newEff = totalAreaSheet > 0 ? Math.round(((totHybrid * pieceWidthMm * pieceHeightMm) / totalAreaSheet) * 100) : 0;
          hybridOption = {
            canUseHybrid: true,
            extraPoses: extraRight,
            totalHybridPoses: totHybrid,
            newEfficiencyPct: newEff,
            stripType: 'right',
            extraCols: extraColsRight,
            extraRows: extraRowsRight,
            extraPoseW: pieceNetH,
            extraPoseH: pieceNetW,
            extraStartX: startX + (bestCols * pieceNetW),
            extraStartY: startY,
          };
        }
      }
    }

    return {
      sheetWidthMm,
      sheetHeightMm,
      usableWidthMm,
      usableHeightMm,
      bestCols,
      bestRows,
      bestTotal,
      isRotatedBest,
      efficiencyPct,
      efficiencyNetPct,
      effectiveSheetsNeeded,
      wasteSheets,
      totalSheetsToCut,
      parentSheets70x100,
      reamsCount,
      pieceNetW,
      pieceNetH,
      effectiveSpacing,
      effectiveBleed,
      isCommonCut,
      startX,
      startY,
      totalBlockNetW,
      totalBlockNetH,
      guillotineCutsCount,
      cutsSaved,
      areaSheetMm2: totalAreaSheet,
      areaUsefulPiecesMm2: usefulAreaPieces,
      pctGripper,
      pctMargins,
      pctSpacing,
      pctUnusedWaste,
      sheetComparisons,
      smartFitSuggestions: smartFitSuggestions.slice(0, 3),
      hybridOption,
    };
  }, [
    impositionPolicy,
    sheetWidthCm,
    sheetHeightCm,
    gripperMarginMm,
    lateralMarginMm,
    pieceWidthMm,
    pieceHeightMm,
    pieceBleedMm,
    spacingBetweenPiecesMm,
    runQuantity,
    wastePercentage,
    selectedSheetId
  ]);

  // Export CTP Imposition PDF with Client Project metadata, lateral marks and artwork
  const downloadImpositionPDF = () => {
    if (calculation.bestTotal <= 0) return;

    setIsGeneratingPdf(true);
    setPdfSuccess(false);

    try {
      const orientation = sheetWidthCm >= sheetHeightCm ? 'landscape' : 'portrait';
      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: [sheetWidthCm * 10, sheetHeightCm * 10],
      });

      const W = calculation.sheetWidthMm;
      const H = calculation.sheetHeightMm;

      // Draw Sheet Boundary
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.rect(0, 0, W, H);

      // Gripper area indicator line
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.4);
      doc.line(0, gripperMarginMm, W, gripperMarginMm);

      // Job and Client Information Banner
      if (showJobInfo) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);

        const clientStr = connectedProject ? ` | CLIENTE: ${connectedProject.clientName} (${connectedProject.id})` : '';
        const paperStr = connectedProject?.items[connectedProject.selectedItemIndex]?.paperType ? ` | PAPEL: ${connectedProject.items[connectedProject.selectedItemIndex].paperType}` : '';
        const policyStr = calculation.isCommonCut ? 'CORTE COMÚN (0mm)' : `DOBLE CORTE (${spacingBetweenPiecesMm}mm)`;

        doc.text(
          `ORDEN / TRABAJO: ${jobName}${clientStr}${paperStr} | ${sheetWidthCm}x${sheetHeightCm} cm | ${calculation.bestTotal} POSES | ${policyStr} | TIRAJE: ${runQuantity} UNDS`,
          lateralMarginMm,
          gripperMarginMm - 5
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Pliegos máquina: ${calculation.totalSheetsToCut} (${calculation.reamsCount} Resmas 70x100) | Cortes Guillotina: ${calculation.guillotineCutsCount} | Generado: ${new Date().toLocaleString('es-CO')}`,
          lateralMarginMm,
          gripperMarginMm - 2
        );
      }

      // Color Calibration Bar
      if (showColorBar) {
        const barY = gripperMarginMm - 8;
        const colorWidth = 6;
        const colorHeight = 3;
        const colors = [
          [0, 255, 255],     // Cyan
          [255, 0, 255],     // Magenta
          [255, 255, 0],     // Yellow
          [0, 0, 0],         // Black
          [0, 119, 190],     // CM
          [155, 17, 30],     // MY
          [0, 144, 0],       // CY
          [74, 14, 78],      // CMY
        ];

        colors.forEach((c, idx) => {
          doc.setFillColor(c[0], c[1], c[2]);
          doc.rect(W - lateralMarginMm - (colors.length * colorWidth) + (idx * colorWidth), barY, colorWidth, colorHeight, 'F');
        });
      }

      // Render Poses and Lateral Crop Marks
      const { startX, startY, bestCols, bestRows, pieceNetW, pieceNetH, isCommonCut, effectiveSpacing } = calculation;

      for (let r = 0; r < bestRows; r++) {
        for (let c = 0; c < bestCols; c++) {
          const posX = isCommonCut ? startX + (c * pieceNetW) : startX + (c * (pieceNetW + effectiveSpacing));
          const posY = isCommonCut ? startY + (r * pieceNetH) : startY + (r * (pieceNetH + effectiveSpacing));

          // Draw Artwork / Placeholder
          try {
            if (customerArtworkUrl.startsWith('data:image')) {
              doc.addImage(customerArtworkUrl, 'JPEG', posX, posY, pieceNetW, pieceNetH);
            } else {
              doc.setFillColor(241, 245, 249);
              doc.rect(posX, posY, pieceNetW, pieceNetH, 'F');
            }
          } catch {
            doc.setFillColor(241, 245, 249);
            doc.rect(posX, posY, pieceNetW, pieceNetH, 'F');
          }

          // Net Piece Border
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.15);
          doc.rect(posX, posY, pieceNetW, pieceNetH, 'S');

          // Number Badge inside pose
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6);
          doc.setTextColor(30, 41, 59);
          doc.text(`#${(r * bestCols) + c + 1}`, posX + 1.5, posY + 3);
        }
      }

      // Lateral Crop Marks
      if (showCropMarks && bestCols > 0 && bestRows > 0) {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);

        // Columns vertical marks on top and bottom margins
        for (let c = 0; c <= bestCols; c++) {
          const markX = isCommonCut ? startX + (c * pieceNetW) : startX + (c * (pieceNetW + effectiveSpacing));
          doc.line(markX, gripperMarginMm, markX, gripperMarginMm + 6);
          doc.line(markX, H - lateralMarginMm - 6, markX, H - lateralMarginMm);
        }

        // Rows horizontal marks on left and right margins
        for (let r = 0; r <= bestRows; r++) {
          const markY = isCommonCut ? startY + (r * pieceNetH) : startY + (r * (pieceNetH + effectiveSpacing));
          doc.line(lateralMarginMm, markY, lateralMarginMm + 6, markY);
          doc.line(W - lateralMarginMm - 6, markY, W - lateralMarginMm, markY);
        }
      }

      // Save PDF file
      const fileName = `${jobName}_${sheetWidthCm}x${sheetHeightCm}_${calculation.bestTotal}poses.pdf`;
      doc.save(fileName);

      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 4000);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const activeConnectedItem = connectedProject?.items[connectedProject.selectedItemIndex || 0] || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Hidden Printable Work Order Component */}
      <PrintableWorkOrder
        project={connectedProject}
        activeItem={activeConnectedItem}
        calculation={calculation}
        sheetWidthCm={sheetWidthCm}
        sheetHeightCm={sheetHeightCm}
        gripperMarginMm={gripperMarginMm}
        lateralMarginMm={lateralMarginMm}
        pieceWidthMm={pieceWidthMm}
        pieceHeightMm={pieceHeightMm}
        pieceBleedMm={pieceBleedMm}
        spacingBetweenPiecesMm={spacingBetweenPiecesMm}
        runQuantity={runQuantity}
        wastePercentage={wastePercentage}
        jobName={jobName}
        impositionPolicy={impositionPolicy}
      />

      {/* TOP BAR / TITLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-black">
            <Layers size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full">
                Pre-prensa & CTP Offset
              </span>
              <span className="text-xs text-slate-400 font-bold">Motor de Imposición Litográfica</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-0.5">
              Montaje, Imposición & Aprovechamiento de Pliegos
            </h1>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main "Llamar Proyecto del Cliente" Button */}
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-teal-600/20 active:scale-95 transition-all"
          >
            <Package size={16} />
            <span>Llamar Proyecto / Pedido de Cliente</span>
          </button>

          {/* Print Work Order */}
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Imprimir Ficha Técnica para taller"
          >
            <Printer size={15} />
            <span>Ficha de Taller</span>
          </button>

          {/* Quick PDF Export */}
          <button
            onClick={downloadImpositionPDF}
            disabled={isGeneratingPdf || calculation.bestTotal <= 0}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:bg-slate-300"
          >
            {isGeneratingPdf ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Exportar PDF CTP</span>
          </button>
        </div>
      </div>

      {/* CONNECTED CLIENT PROJECT DOSSIER BANNER */}
      {connectedProject && activeConnectedItem && (
        <ClientProjectBanner
          project={connectedProject}
          activeItem={activeConnectedItem}
          onSwitchItem={handleSwitchItem}
          onSwitchSide={handleSwitchSide}
          onChangeProject={() => setIsProjectModalOpen(true)}
          onDisconnectProject={handleDisconnectProject}
        />
      )}

      {/* COMPREHENSIVE SHEET EFFICIENCY ADVISOR & DIAGNOSTIC */}
      <SheetEfficiencyAdvisor
        calculation={calculation}
        pieceWidthMm={pieceWidthMm}
        pieceHeightMm={pieceHeightMm}
        sheetWidthCm={sheetWidthCm}
        sheetHeightCm={sheetHeightCm}
        impositionPolicy={impositionPolicy}
        spacingBetweenPiecesMm={spacingBetweenPiecesMm}
        onApplyOptimalSheet={handleApplyOptimalSheet}
        onApplyCommonCut={handleApplyCommonCut}
        onApplySmartFit={handleApplySmartFit}
      />

      {/* MAIN TWO-COLUMN LAYOUT: CONTROLS (5 cols) & LIVE BLUEPRINT (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CONTROLS & SPECIFICATIONS */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CUTTING POLICY SELECTOR */}
          <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                  <Scissors size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Política de Corte en Guillotina</h3>
                  <p className="text-[11px] text-slate-400">Determina el espaciado y líneas de corte</p>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                impositionPolicy === 'corte_comun' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
              }`}>
                {impositionPolicy === 'corte_comun' ? '0 mm (Ahorro 50% Cortes)' : 'Doble Cuchilla'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setImpositionPolicy('corte_comun');
                  setSpacingBetweenPiecesMm(0);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  impositionPolicy === 'corte_comun'
                    ? 'border-teal-500 bg-teal-50/40 text-teal-950 ring-2 ring-teal-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Corte Común (0 mm)</span>
                  {impositionPolicy === 'corte_comun' && <Check size={14} className="text-teal-600" />}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  1 solo pase de guillotina por línea. Sangrado perimetral exterior.
                </p>
              </button>

              <button
                onClick={() => {
                  setImpositionPolicy('doble_corte');
                  if (spacingBetweenPiecesMm === 0) setSpacingBetweenPiecesMm(3);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  impositionPolicy === 'doble_corte'
                    ? 'border-teal-500 bg-teal-50/40 text-teal-950 ring-2 ring-teal-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Doble Corte / Calle</span>
                  {impositionPolicy === 'doble_corte' && <Check size={14} className="text-teal-600" />}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Espaciado entre piezas con doble refile de guillotina.
                </p>
              </button>
            </div>
          </div>

          {/* 1. PLIEGO DE PRENSA */}
          <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg font-bold text-xs">01</div>
                <h3 className="text-sm font-black text-slate-900">Pliego de Prensa & CTP</h3>
              </div>
              <span className="text-xs font-bold text-teal-700">{sheetWidthCm} x {sheetHeightCm} cm</span>
            </div>

            {/* Sheet Presets */}
            <div className="grid grid-cols-2 gap-2">
              {SHEET_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSheetPresetChange(preset.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs ${
                    selectedSheetId === preset.id
                      ? 'border-teal-500 bg-teal-50/40 text-teal-950 font-black ring-1 ring-teal-500/30'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 font-semibold'
                  }`}
                >
                  <div className="truncate">{preset.name}</div>
                  <span className="text-[10px] text-slate-400 font-normal">{preset.category}</span>
                </button>
              ))}
            </div>

            {/* Custom Sheet Dimensions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Ancho Pliego (cm):</label>
                <input
                  type="number"
                  value={sheetWidthCm}
                  onChange={(e) => {
                    setSheetWidthCm(parseFloat(e.target.value) || 0);
                    setSelectedSheetId('custom');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Alto Pliego (cm):</label>
                <input
                  type="number"
                  value={sheetHeightCm}
                  onChange={(e) => {
                    setSheetHeightCm(parseFloat(e.target.value) || 0);
                    setSelectedSheetId('custom');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            {/* Gripper & Lateral Margins */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Pinza Prensa (mm):</label>
                <input
                  type="number"
                  value={gripperMarginMm}
                  onChange={(e) => setGripperMarginMm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-teal-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Reserva de arrastre</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Guías Laterales (mm):</label>
                <input
                  type="number"
                  value={lateralMarginMm}
                  onChange={(e) => setLateralMarginMm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-teal-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Márgenes de registro</span>
              </div>
            </div>
          </div>

          {/* 2. PIEZA DEL CLIENTE & ARTE */}
          <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg font-bold text-xs">02</div>
                <h3 className="text-sm font-black text-slate-900">Pieza de Impresión & Archivo</h3>
              </div>
              <span className="text-xs font-bold text-teal-700">{pieceWidthMm} x {pieceHeightMm} mm</span>
            </div>

            {/* Presets */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Formatos Estándar:</label>
              <div className="flex flex-wrap gap-1.5">
                {PIECE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePiecePresetChange(p)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-lg text-[11px] font-bold text-slate-700 transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Dimensions */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Ancho Pieza (mm):</label>
                <input
                  type="number"
                  value={pieceWidthMm}
                  onChange={(e) => setPieceWidthMm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Alto Pieza (mm):</label>
                <input
                  type="number"
                  value={pieceHeightMm}
                  onChange={(e) => setPieceHeightMm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            {/* Bleed & Spacing */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Sangrado Exterior (mm):</label>
                <input
                  type="number"
                  value={pieceBleedMm}
                  onChange={(e) => setPieceBleedMm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-teal-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Protección de refile</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Distancia entre piezas (mm):</label>
                <input
                  type="number"
                  disabled={impositionPolicy === 'corte_comun'}
                  value={impositionPolicy === 'corte_comun' ? 0 : spacingBetweenPiecesMm}
                  onChange={(e) => setSpacingBetweenPiecesMm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-teal-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {impositionPolicy === 'corte_comun' ? 'Fijado en 0 mm (Corte Común)' : 'Calle de separación'}
                </span>
              </div>
            </div>

            {/* Artwork Selector & Upload */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-600">Arte / Archivo del Cliente:</label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                >
                  <Upload size={12} />
                  <span>Subir Archivo Propio</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.svg"
                  className="hidden"
                />
              </div>

              {/* Sample Artworks buttons */}
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_ARTWORKS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => {
                      setCustomerArtworkUrl(sample.dataUrl);
                      setCustomerArtworkName(sample.name);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      customerArtworkUrl === sample.dataUrl
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. TIRAJE Y MERMAS */}
          <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg font-bold text-xs">03</div>
              <h3 className="text-sm font-black text-slate-900">Tiraje Requerido & Mermas</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Tiraje Final (Unidades):</label>
                <input
                  type="number"
                  step="100"
                  value={runQuantity}
                  onChange={(e) => setRunQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Merma de Impresión (%):</label>
                <input
                  type="number"
                  value={wastePercentage}
                  onChange={(e) => setWastePercentage(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-teal-500 outline-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: REAL-TIME 2D BLUEPRINT & PREVIEW WITH CLIENT ARTWORK (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* STATS TILES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cabidas x Pliego</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-teal-600">{calculation.bestTotal}</span>
                <span className="text-xs font-semibold text-slate-500">poses</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {calculation.bestCols} col &times; {calculation.bestRows} filas
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aprovechamiento</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-2xl sm:text-3xl font-black ${
                  calculation.efficiencyPct >= 80 ? 'text-emerald-600' : calculation.efficiencyPct >= 65 ? 'text-amber-600' : 'text-slate-800'
                }`}>
                  {calculation.efficiencyPct}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Área neta útil</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cortes Guillotina</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{calculation.guillotineCutsCount}</span>
                <span className="text-xs font-semibold text-slate-500">pases</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">
                {calculation.isCommonCut ? `-${calculation.cutsSaved} cortes ahorrados` : 'Doble refile'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pliegos Prensa</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{calculation.totalSheetsToCut}</span>
                <span className="text-xs font-semibold text-slate-500">hojas</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {calculation.reamsCount} resmas 70x100
              </span>
            </div>

          </div>

          {/* 2D VISUAL SHEET BLUEPRINT & ARTWORK LIVE IMPOSITION */}
          <div className="bg-slate-900 text-white p-6 rounded-[32px] border border-slate-800 shadow-xl space-y-4">
            
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <Grid size={17} className="text-teal-400" />
                <h4 className="text-xs font-black tracking-wider uppercase text-white">
                  Vista Previa del Montaje CTP & Pliego
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold rounded-full">
                  {sheetWidthCm} x {sheetHeightCm} cm | {calculation.isRotatedBest ? 'Giro 90°' : 'Directo'}
                </span>
                <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border ${
                  calculation.isCommonCut 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                }`}>
                  {calculation.isCommonCut ? 'Distancia 0 mm' : `Calle ${spacingBetweenPiecesMm} mm`}
                </span>
              </div>
            </div>

            {/* Canvas Graphic Simulation of Press Sheet with Artwork Repeated */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center min-h-[460px] relative overflow-hidden">
              
              {/* Pinza Label Indicator */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-amber-400/90 bg-amber-400/10 px-3 py-0.5 rounded-full border border-amber-400/20 flex items-center gap-1 z-10">
                <span>PINZA DE PRENSA OFFSET ({gripperMarginMm} mm)</span>
              </div>

              {/* Color Control Bar (Tira de Color CMYK) */}
              {showColorBar && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-0.5 opacity-90 shadow-md z-10">
                  {['#00FFFF', '#FF00FF', '#FFFF00', '#000000', '#0077BE', '#9B111E', '#009000', '#4A0E4E'].map((c, i) => (
                    <div key={i} className="w-3.5 h-2 rounded-[1px]" style={{ backgroundColor: c }} />
                  ))}
                </div>
              )}

              {/* The Press Sheet Container */}
              <div 
                style={{
                  aspectRatio: `${sheetWidthCm} / ${sheetHeightCm}`,
                  maxHeight: '350px',
                  width: '94%'
                }}
                className="bg-white border-2 border-slate-400 rounded-lg p-3 relative flex flex-col justify-center items-center shadow-2xl overflow-hidden"
              >
                {/* Pinza Shadow Bar inside sheet */}
                <div 
                  style={{ height: '7%' }}
                  className="w-full bg-amber-500/25 border-b border-dashed border-amber-500/60 absolute top-0 left-0 flex items-center justify-center text-[7px] text-amber-800 font-black z-10"
                >
                  ÁREA DE PINZA (NO IMPRIMIBLE)
                </div>

                {/* Lateral Crop Marks visual representation */}
                {showCropMarks && calculation.bestTotal > 0 && (
                  <div className="absolute inset-0 pointer-events-none z-20">
                    {/* Top edge cut marks */}
                    {Array.from({ length: calculation.bestCols + 1 }).map((_, cIdx) => {
                      const leftPercent = ((calculation.startX + (cIdx * calculation.pieceNetW)) / calculation.sheetWidthMm) * 100;
                      return (
                        <div
                          key={`top-${cIdx}`}
                          style={{ left: `${leftPercent}%`, top: '7%', height: '10px' }}
                          className="absolute w-[1px] bg-slate-900"
                        />
                      );
                    })}

                    {/* Bottom edge cut marks */}
                    {Array.from({ length: calculation.bestCols + 1 }).map((_, cIdx) => {
                      const leftPercent = ((calculation.startX + (cIdx * calculation.pieceNetW)) / calculation.sheetWidthMm) * 100;
                      return (
                        <div
                          key={`bottom-${cIdx}`}
                          style={{ left: `${leftPercent}%`, bottom: '1%', height: '10px' }}
                          className="absolute w-[1px] bg-slate-900"
                        />
                      );
                    })}

                    {/* Left edge cut marks */}
                    {Array.from({ length: calculation.bestRows + 1 }).map((_, rIdx) => {
                      const topPercent = ((calculation.startY + (rIdx * calculation.pieceNetH)) / calculation.sheetHeightMm) * 100;
                      return (
                        <div
                          key={`left-${rIdx}`}
                          style={{ top: `${topPercent}%`, left: '1%', width: '10px' }}
                          className="absolute h-[1px] bg-slate-900"
                        />
                      );
                    })}

                    {/* Right edge cut marks */}
                    {Array.from({ length: calculation.bestRows + 1 }).map((_, rIdx) => {
                      const topPercent = ((calculation.startY + (rIdx * calculation.pieceNetH)) / calculation.sheetHeightMm) * 100;
                      return (
                        <div
                          key={`right-${rIdx}`}
                          style={{ top: `${topPercent}%`, right: '1%', width: '10px' }}
                          className="absolute h-[1px] bg-slate-900"
                        />
                      );
                    })}
                  </div>
                )}

                {/* Grid of Imposed Pieces with Real Image */}
                {calculation.bestTotal > 0 ? (
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${calculation.bestCols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${calculation.bestRows}, minmax(0, 1fr))`,
                      gap: calculation.isCommonCut ? '0px' : `${Math.max(2, spacingBetweenPiecesMm)}px`,
                      width: '92%',
                      height: '80%',
                      marginTop: '6%'
                    }}
                    className={`relative ${calculation.isCommonCut ? 'border border-teal-600/60 ring-2 ring-teal-500/20' : ''}`}
                  >
                    {calculation.isCommonCut && (
                      <div className="absolute -inset-1 border border-dashed border-teal-500/40 pointer-events-none rounded-xs" />
                    )}

                    {Array.from({ length: calculation.bestTotal }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`relative overflow-hidden flex flex-col items-center justify-center group bg-slate-100 ${
                          calculation.isCommonCut ? 'border-[0.5px] border-slate-300/80' : 'border border-slate-300 rounded-xs shadow-xs'
                        }`}
                      >
                        {/* Artwork Preview inside slot */}
                        <img 
                          src={customerArtworkUrl} 
                          alt="Customer Artwork"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />

                        {/* Pose Number Badge */}
                        <div className="absolute top-0.5 left-0.5 bg-slate-900/80 text-white text-[7px] font-black px-1 rounded-xs">
                          #{idx + 1}
                        </div>

                        {showGuillotineGuideLines && (
                          <div className="absolute inset-0 pointer-events-none border border-slate-900/10" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-xs text-rose-500 font-bold p-4">
                    La pieza es mayor al área imprimible del pliego seleccionado.
                  </div>
                )}

                {/* Register Crosses on Corners */}
                <div className="absolute top-1 left-1 text-[11px] text-slate-800 font-mono font-bold">+</div>
                <div className="absolute top-1 right-1 text-[11px] text-slate-800 font-mono font-bold">+</div>
                <div className="absolute bottom-1 left-1 text-[11px] text-slate-800 font-mono font-bold">+</div>
                <div className="absolute bottom-1 right-1 text-[11px] text-slate-800 font-mono font-bold">+</div>
              </div>

              {/* Dimension indicators */}
              <div className="w-full flex items-center justify-between text-[10px] text-slate-400 pt-4 px-4">
                <span>Ancho Útil: {calculation.usableWidthMm / 10} cm</span>
                <span className="text-teal-400 font-semibold">
                  {calculation.isCommonCut ? 'Corte Común: 1 solo corte por línea' : 'Doble Cuchilla: 2 cortes por calle'}
                </span>
                <span>Pliego: {sheetWidthCm} x {sheetHeightCm} cm</span>
              </div>

            </div>

            {/* Production Specifications Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 pt-2">
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold">POLÍTICA DE CORTE APLICADA:</span>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5">
                    {calculation.isCommonCut 
                      ? `Distancia 0 mm entre unidades con sangrado perimetral de ${pieceBleedMm} mm y marcas de corte en los laterales.` 
                      : `Doble cuchilla de ${spacingBetweenPiecesMm} mm con sangrado individual de ${pieceBleedMm} mm.`}
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold">OPTIMIZACIÓN DE GUILLOTINA:</span>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5">
                    {calculation.isCommonCut
                      ? `Se realizan únicamente ${calculation.guillotineCutsCount} cortes en lugar de ${(calculation.bestCols * 2) + (calculation.bestRows * 2)} cortes convencionales.`
                      : `Se realizan ${calculation.guillotineCutsCount} cortes totales en guillotina.`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Big Action Download Button */}
            <button
              onClick={downloadImpositionPDF}
              disabled={isGeneratingPdf || calculation.bestTotal <= 0}
              className={`w-full py-4 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-3 shadow-xl transition-all active:scale-98 ${
                pdfSuccess 
                  ? 'bg-emerald-600 shadow-emerald-500/25'
                  : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/30 disabled:bg-slate-700'
              }`}
            >
              {isGeneratingPdf ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : pdfSuccess ? (
                <Check size={18} />
              ) : (
                <FileDown size={18} />
              )}
              <span>
                {isGeneratingPdf 
                  ? 'Compilando e Imponiendo PDF CTP...' 
                  : pdfSuccess 
                  ? '¡PDF Generado y Descargado con Éxito!' 
                  : `Descargar Montaje CTP (${calculation.bestTotal} Poses — ${calculation.isCommonCut ? 'Corte Común' : 'Doble Corte'})`
                }
              </span>
            </button>

          </div>

        </div>

      </div>

      {/* CLIENT PROJECT MODAL */}
      <ClientProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        token={token}
        onSelectProject={handleSelectClientProject}
      />

    </div>
  );
}
