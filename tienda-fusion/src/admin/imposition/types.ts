export interface SheetPreset {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  category: string;
}

export interface PiecePreset {
  name: string;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
}

export interface ClientProjectItem {
  id: number;
  orderId?: number;
  productId?: number;
  productName: string;
  productSlug?: string;
  productImage?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  highResPdfUrl?: string;
  previewImageUrl?: string;
  secondaryFileUrl?: string; // e.g. Retiro (reverso)
  fileType?: string;
  notes?: string;
  specs?: Record<string, any>;
  paperType?: string;
  finishes?: string[];
  inks?: string;
  sides?: string;
}

export interface ConnectedClientProject {
  id: string;
  orderNumericId?: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientCity?: string;
  clientAddress?: string;
  clientNit?: string;
  orderDate: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount?: number;
  internalNotes?: string;
  deliveryDate?: string;
  items: ClientProjectItem[];
  selectedItemIndex: number;
  activeSide: 'tiro' | 'retiro';
}

export interface SheetComparisonItem {
  sheetId: string;
  sheetName: string;
  widthCm: number;
  heightCm: number;
  totalPoses: number;
  efficiencyPct: number;
  efficiencyNetPct: number;
  totalSheets: number;
  reamsCount: number;
  isCurrent: boolean;
  isBest: boolean;
  posesDiff: number;
  reamsSaved: number;
}

export interface SmartFitSuggestion {
  targetWidthMm: number;
  targetHeightMm: number;
  diffWidthMm: number;
  diffHeightMm: number;
  extraPoses: number;
  newTotal: number;
  newEfficiencyPct: number;
  note: string;
}

export interface HybridLayoutOption {
  canUseHybrid: boolean;
  extraPoses: number;
  totalHybridPoses: number;
  newEfficiencyPct: number;
  stripType: 'bottom' | 'right';
  extraCols: number;
  extraRows: number;
  extraPoseW: number;
  extraPoseH: number;
  extraStartX: number;
  extraStartY: number;
}

export interface CalculationResult {
  sheetWidthMm: number;
  sheetHeightMm: number;
  usableWidthMm: number;
  usableHeightMm: number;
  bestCols: number;
  bestRows: number;
  bestTotal: number;
  isRotatedBest: boolean;
  efficiencyPct: number;
  efficiencyNetPct: number;
  effectiveSheetsNeeded: number;
  wasteSheets: number;
  totalSheetsToCut: number;
  parentSheets70x100: number;
  reamsCount: number;
  pieceNetW: number;
  pieceNetH: number;
  effectiveSpacing: number;
  effectiveBleed: number;
  isCommonCut: boolean;
  startX: number;
  startY: number;
  totalBlockNetW: number;
  totalBlockNetH: number;
  guillotineCutsCount: number;
  cutsSaved: number;
  // Area breakdown
  areaSheetMm2: number;
  areaUsefulPiecesMm2: number;
  pctGripper: number;
  pctMargins: number;
  pctSpacing: number;
  pctUnusedWaste: number;
  // Intelligence & Advisor data
  sheetComparisons: SheetComparisonItem[];
  smartFitSuggestions: SmartFitSuggestion[];
  hybridOption: HybridLayoutOption | null;
}
