import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fabric } from 'fabric';
import jsPDF from 'jspdf';
import {
  ArrowLeft,
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  LayoutTemplate,
  Trash2,
  Copy,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Download,
  ShoppingBag,
  Eye,
  EyeOff,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Move,
  Lock,
  Unlock,
  ChevronDown,
  Upload,
  CheckCircle2,
  QrCode,
  Phone,
  Mail,
  MapPin,
  Globe
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import AiImageGenerator from './AiImageGenerator';
import PreflightModal from './PreflightModal';

// Standard 300 DPI conversion (1 mm ≈ 11.811 pixels in standard 300dpi scale canvas)
const MM_TO_PX = 11.811;

// Preset sizes in mm
const SIZES: Record<string, { width: number; height: number; name: string }> = {
  'tarjeta-estandar': { width: 90, height: 50, name: 'Tarjeta de Presentación (90 x 50 mm)' },
  'tarjetas-estandar': { width: 90, height: 50, name: 'Tarjeta de Presentación (90 x 50 mm)' },
  'tarjetas-de-presentacion': { width: 90, height: 50, name: 'Tarjeta de Presentación (90 x 50 mm)' },
  'volante-media-carta': { width: 140, height: 216, name: 'Volante Media Carta (140 x 216 mm)' },
  'volantes': { width: 140, height: 216, name: 'Volante Media Carta (140 x 216 mm)' },
  'volante-carta': { width: 216, height: 279, name: 'Volante Carta (216 x 279 mm)' },
  'separador': { width: 50, height: 180, name: 'Separador de Libros (50 x 180 mm)' },
  'separadores-libros': { width: 50, height: 180, name: 'Separador de Libros (50 x 180 mm)' },
  'etiqueta-cuadrada': { width: 70, height: 70, name: 'Etiqueta Cuadrada (70 x 70 mm)' },
  'etiquetas-adhesivas': { width: 70, height: 70, name: 'Etiqueta Cuadrada (70 x 70 mm)' },
  'cajas-personalizadas': { width: 100, height: 100, name: 'Caja Plegadiza (100 x 100 mm)' },
  'empaques': { width: 100, height: 100, name: 'Empaque Personalizado (100 x 100 mm)' },
  'carpetas-corporativas': { width: 220, height: 300, name: 'Carpeta Corporativa (220 x 300 mm)' },
  'pendon-rollup': { width: 80, height: 200, name: 'Pendón Roll-Up (80 x 200 cm)' },
  'pendones': { width: 80, height: 200, name: 'Pendón Roll-Up (80 x 200 cm)' },
};

export default function CanvasEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [product, setProduct] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'ai_assistant' | 'ai_images' | 'text' | 'shapes' | 'images' | 'background' | 'layers'>('templates');
  const [activeObject, setActiveObject] = useState<fabric.Object | null>(null);
  const [showGuides, setShowGuides] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [outOfBoundsWarning, setOutOfBoundsWarning] = useState(false);
  const [canvasBgColor, setCanvasBgColor] = useState('#ffffff');
  const [selectedFont, setSelectedFont] = useState('Montserrat');
  const [textColor, setTextColor] = useState('#1e293b');
  const [shapeFill, setShapeFill] = useState('#0d9488');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [canvasLayers, setCanvasLayers] = useState<fabric.Object[]>([]);
  const [templatesList, setTemplatesList] = useState<any[]>([]);
  const [usedAiImages, setUsedAiImages] = useState<string[]>([]);
  const [showPreflightModal, setShowPreflightModal] = useState(false);

  // AI Assistant States
  const [aiIndustry, setAiIndustry] = useState<string>('salud');
  const [aiContentType, setAiContentType] = useState<string>('slogan');
  const [aiTone, setAiTone] = useState<string>('profesional');
  const [aiBrandName, setAiBrandName] = useState<string>('Fusión Gráfica');
  const [aiIsGenerating, setAiIsGenerating] = useState<boolean>(false);
  const [aiResults, setAiResults] = useState<Array<{ title: string; text: string; category: string }>>([]);

  // History Stack
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isHistoryActionRef = useRef<boolean>(false);

  // Dynamic Product dimensions (default to business card 90x50 mm)
  const sizeConfig = SIZES[slug || ''] || SIZES['tarjeta-estandar'];
  const trimWidth = sizeConfig.width * MM_TO_PX;
  const trimHeight = sizeConfig.height * MM_TO_PX;
  const bleed = 2 * MM_TO_PX; // 2mm bleed
  const safety = 3 * MM_TO_PX; // 3mm safety margin
  const canvasWidth = trimWidth + bleed * 2;
  const canvasHeight = trimHeight + bleed * 2;

  // Save history state
  const saveState = useCallback(() => {
    if (!fabricRef.current || isHistoryActionRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON(['name', 'selectable', 'evented']));
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(json);
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    updateLayers();
  }, []);

  const updateLayers = () => {
    if (!fabricRef.current) return;
    const objects = fabricRef.current.getObjects().filter(o => o.name !== 'prep-guide');
    setCanvasLayers([...objects].reverse());
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndexRef.current > 0 && fabricRef.current) {
      isHistoryActionRef.current = true;
      historyIndexRef.current -= 1;
      const state = historyRef.current[historyIndexRef.current];
      fabricRef.current.loadFromJSON(state, () => {
        rebuildGuides(fabricRef.current!);
        fabricRef.current?.renderAll();
        isHistoryActionRef.current = false;
        updateLayers();
      });
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1 && fabricRef.current) {
      isHistoryActionRef.current = true;
      historyIndexRef.current += 1;
      const state = historyRef.current[historyIndexRef.current];
      fabricRef.current.loadFromJSON(state, () => {
        rebuildGuides(fabricRef.current!);
        fabricRef.current?.renderAll();
        isHistoryActionRef.current = false;
        updateLayers();
      });
    }
  };

  // Rebuild pre-press guide overlays
  const rebuildGuides = (canvas: fabric.Canvas) => {
    // Remove existing guides
    const oldGuides = canvas.getObjects().filter(o => o.name === 'prep-guide');
    oldGuides.forEach(g => canvas.remove(g));

    // 1. Bleed box (Outer border)
    const bleedRect = new fabric.Rect({
      left: 0,
      top: 0,
      width: canvasWidth,
      height: canvasHeight,
      fill: 'transparent',
      stroke: 'rgba(20, 184, 166, 0.5)',
      strokeWidth: 3,
      selectable: false,
      evented: false,
      name: 'prep-guide',
    });

    // 2. Trim Line (Exact cut line in Red)
    const trimRect = new fabric.Rect({
      left: bleed,
      top: bleed,
      width: trimWidth,
      height: trimHeight,
      fill: 'transparent',
      stroke: 'rgba(239, 68, 68, 0.8)',
      strokeWidth: 3,
      strokeDashArray: [12, 6],
      selectable: false,
      evented: false,
      name: 'prep-guide',
    });

    // 3. Safety Zone (Dashed Teal margin)
    const safetyRect = new fabric.Rect({
      left: bleed + safety,
      top: bleed + safety,
      width: trimWidth - safety * 2,
      height: trimHeight - safety * 2,
      fill: 'transparent',
      stroke: 'rgba(13, 148, 136, 0.8)',
      strokeWidth: 3,
      strokeDashArray: [8, 8],
      selectable: false,
      evented: false,
      name: 'prep-guide',
    });

    canvas.add(bleedRect, trimRect, safetyRect);
    canvas.bringToFront(bleedRect);
    canvas.bringToFront(trimRect);
    canvas.bringToFront(safetyRect);
  };

  // Fetch product info & server templates
  useEffect(() => {
    async function loadData() {
      try {
        if (slug) {
          const res = await fetch(`/api/catalog/product/${slug}`);
          if (res.ok) {
            setProduct(await res.json());
          }
        }
        const templRes = await fetch('/api/catalog/templates');
        if (templRes.ok) {
          setTemplatesList(await templRes.json());
        }
      } catch (e) {
        console.error("Error loading product/templates:", e);
      }
    }
    loadData();
  }, [slug]);

  // Initialize Fabric.js Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selectionColor: 'rgba(13, 148, 136, 0.15)',
      selectionBorderColor: '#0d9488',
      selectionLineWidth: 1.5,
    });

    fabricRef.current = canvas;
    rebuildGuides(canvas);

    // Responsive scaling
    const handleResize = () => {
      if (!containerRef.current) return;
      const outerWidth = containerRef.current.clientWidth - 80;
      const outerHeight = containerRef.current.clientHeight - 80;
      const scale = Math.min(outerWidth / canvasWidth, outerHeight / canvasHeight, 0.95);
      setZoomLevel(scale);

      const wrapper = document.querySelector('.canvas-container') as HTMLElement;
      if (wrapper) {
        wrapper.style.transform = `scale(${scale})`;
        wrapper.style.transformOrigin = 'center center';
      }
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 150);

    // Canvas Events
    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0] || null;
      setActiveObject(obj);
      syncPropertiesFromObject(obj);
    });

    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0] || null;
      setActiveObject(obj);
      syncPropertiesFromObject(obj);
    });

    canvas.on('selection:cleared', () => {
      setActiveObject(null);
    });

    canvas.on('object:modified', () => {
      saveState();
      checkSafetyBounds();
    });

    canvas.on('object:added', (e) => {
      if (e.target?.name !== 'prep-guide') {
        saveState();
      }
    });

    canvas.on('object:removed', (e) => {
      if (e.target?.name !== 'prep-guide') {
        saveState();
      }
    });

    // Load default template on start
    loadPresetTemplate('minimal');

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, [canvasWidth, canvasHeight]);

  const syncPropertiesFromObject = (obj: fabric.Object | null) => {
    if (!obj) return;
    if (obj instanceof fabric.IText || obj instanceof fabric.Text) {
      setSelectedFont(obj.fontFamily || 'Montserrat');
      setTextColor((obj.fill as string) || '#1e293b');
    }
    setOpacity(obj.opacity || 1);
    setShapeFill((obj.fill as string) || '#0d9488');
    setStrokeColor((obj.stroke as string) || '#000000');
    setStrokeWidth(obj.strokeWidth || 0);
  };

  const checkSafetyBounds = () => {
    if (!fabricRef.current) return;
    const safetyLeft = bleed + safety;
    const safetyTop = bleed + safety;
    const safetyRight = bleed + trimWidth - safety;
    const safetyBottom = bleed + trimHeight - safety;

    let warning = false;
    const objects = fabricRef.current.getObjects().filter(o => o.name !== 'prep-guide' && o.type === 'i-text');
    for (const obj of objects) {
      const bound = obj.getBoundingRect();
      if (
        bound.left < safetyLeft ||
        bound.top < safetyTop ||
        bound.left + bound.width > safetyRight ||
        bound.top + bound.height > safetyBottom
      ) {
        warning = true;
        break;
      }
    }
    setOutOfBoundsWarning(warning);
  };

  // Toggle Guides
  const toggleGuides = () => {
    if (!fabricRef.current) return;
    const guides = fabricRef.current.getObjects().filter(o => o.name === 'prep-guide');
    const nextState = !showGuides;
    setShowGuides(nextState);
    guides.forEach(g => g.set('visible', nextState));
    fabricRef.current.renderAll();
  };

  // Zoom control
  const updateZoom = (delta: number) => {
    const newZoom = Math.min(Math.max(0.2, zoomLevel + delta), 2.5);
    setZoomLevel(newZoom);
    const wrapper = document.querySelector('.canvas-container') as HTMLElement;
    if (wrapper) {
      wrapper.style.transform = `scale(${newZoom})`;
      wrapper.style.transformOrigin = 'center center';
    }
  };

  // Reset Zoom to Fit
  const resetZoomToFit = () => {
    if (!containerRef.current) return;
    const outerWidth = containerRef.current.clientWidth - 80;
    const outerHeight = containerRef.current.clientHeight - 80;
    const scale = Math.min(outerWidth / canvasWidth, outerHeight / canvasHeight, 0.95);
    setZoomLevel(scale);
    const wrapper = document.querySelector('.canvas-container') as HTMLElement;
    if (wrapper) {
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.transformOrigin = 'center center';
    }
  };

  // ADD ELEMENTS
  const addText = (preset: 'heading' | 'subheading' | 'body' | 'contact') => {
    if (!fabricRef.current) return;
    let content = 'Tu Título Aquí';
    let size = 52;
    let weight = 'bold';

    if (preset === 'heading') {
      content = 'FUSIÓN GRÁFICA';
      size = 48;
      weight = 'bold';
    } else if (preset === 'subheading') {
      content = 'Soluciones de Impresión & Diseño';
      size = 26;
      weight = 'normal';
    } else if (preset === 'contact') {
      content = '+57 300 000 0000 • contacto@fusiongrafica.com';
      size = 20;
      weight = 'normal';
    } else {
      content = 'Texto descriptivo editable.';
      size = 24;
      weight = 'normal';
    }

    const text = new fabric.IText(content, {
      left: canvasWidth / 2,
      top: canvasHeight / 2 + (preset === 'contact' ? 80 : 0),
      fontFamily: selectedFont,
      fontSize: size,
      fontWeight: weight,
      fill: textColor,
      originX: 'center',
      originY: 'center',
    });

    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    rebuildGuides(fabricRef.current);
    saveState();
  };

  const addShape = (shapeType: 'rect' | 'circle' | 'line' | 'badge' | 'bar') => {
    if (!fabricRef.current) return;
    let shape: fabric.Object;

    if (shapeType === 'rect') {
      shape = new fabric.Rect({
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        width: 300,
        height: 200,
        fill: shapeFill,
        rx: 12,
        ry: 12,
        originX: 'center',
        originY: 'center',
      });
    } else if (shapeType === 'circle') {
      shape = new fabric.Circle({
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        radius: 100,
        fill: shapeFill,
        originX: 'center',
        originY: 'center',
      });
    } else if (shapeType === 'bar') {
      shape = new fabric.Rect({
        left: canvasWidth / 2,
        top: canvasHeight - bleed - 25,
        width: canvasWidth,
        height: 50,
        fill: '#0d9488',
        originX: 'center',
        originY: 'center',
      });
    } else {
      shape = new fabric.Line([0, 0, 300, 0], {
        left: canvasWidth / 2 - 150,
        top: canvasHeight / 2,
        stroke: '#cbd5e1',
        strokeWidth: 4,
      });
    }

    fabricRef.current.add(shape);
    fabricRef.current.setActiveObject(shape);
    rebuildGuides(fabricRef.current);
    saveState();
  };

  // Upload Local Image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      fabric.Image.fromURL(dataUrl, (img) => {
        if (!fabricRef.current) return;
        // Scale to fit canvas nicely
        const maxDim = 350;
        const scale = Math.min(maxDim / (img.width || maxDim), maxDim / (img.height || maxDim));
        img.set({
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          scaleX: scale,
          scaleY: scale,
          originX: 'center',
          originY: 'center',
        });
        fabricRef.current.add(img);
        fabricRef.current.setActiveObject(img);
        rebuildGuides(fabricRef.current);
        saveState();
      });
    };
    reader.readAsDataURL(file);
  };

  // Add QR Code placeholder
  const addQRCode = () => {
    if (!fabricRef.current) return;
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://fusiongrafica.com';
    fabric.Image.fromURL(qrUrl, (img) => {
      if (!fabricRef.current) return;
      img.set({
        left: canvasWidth - bleed - safety - 90,
        top: canvasHeight / 2,
        scaleX: 0.7,
        scaleY: 0.7,
        originX: 'center',
        originY: 'center',
      });
      fabricRef.current.add(img);
      fabricRef.current.setActiveObject(img);
      rebuildGuides(fabricRef.current);
      saveState();
    }, { crossOrigin: 'anonymous' });
  };

  // Insert AI Generated Image (as floating graphic or background)
  const handleInsertAIImage = (imageUrl: string, isBackground = false) => {
    if (!fabricRef.current) return;

    setUsedAiImages((prev) => {
      if (!prev.includes(imageUrl)) {
        return [...prev, imageUrl];
      }
      return prev;
    });

    fabric.Image.fromURL(
      imageUrl,
      (img) => {
        if (!fabricRef.current) return;

        if (isBackground) {
          // Calculate scale to cover whole canvas
          const scaleX = canvasWidth / (img.width || canvasWidth);
          const scaleY = canvasHeight / (img.height || canvasHeight);
          const maxScale = Math.max(scaleX, scaleY);

          img.set({
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            scaleX: maxScale,
            scaleY: maxScale,
            originX: 'center',
            originY: 'center',
            selectable: true,
            evented: true,
            name: 'ai-background',
          });

          // Remove any existing background image
          const existingBgs = fabricRef.current.getObjects().filter((o) => o.name === 'ai-background');
          existingBgs.forEach((bg) => fabricRef.current?.remove(bg));

          fabricRef.current.add(img);
          fabricRef.current.sendToBack(img);
        } else {
          // Scale to comfortable center size
          const maxDim = Math.min(canvasWidth, canvasHeight) * 0.65;
          const scale = Math.min(maxDim / (img.width || maxDim), maxDim / (img.height || maxDim));

          img.set({
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            scaleX: scale,
            scaleY: scale,
            originX: 'center',
            originY: 'center',
            cornerColor: '#14b8a6',
            borderColor: '#14b8a6',
            cornerSize: 10,
            transparentCorners: false,
          });

          fabricRef.current.add(img);
          fabricRef.current.setActiveObject(img);
        }

        rebuildGuides(fabricRef.current);
        fabricRef.current.renderAll();
        saveState();
      },
      { crossOrigin: 'anonymous' }
    );
  };

  // AI COPYWRITING & SUGGESTION GENERATOR
  const generateAICopy = () => {
    setAiIsGenerating(true);

    setTimeout(() => {
      const brand = aiBrandName.trim() || 'Fusión Gráfica';
      let results: Array<{ title: string; text: string; category: string }> = [];

      if (aiContentType === 'slogan') {
        if (aiIndustry === 'salud') {
          results = [
            { title: 'Empatía y Confianza', text: `${brand} • Tu sonrisa y bienestar en manos expertas.`, category: 'Eslogan' },
            { title: 'Innovación Médica', text: 'Tecnología médica avanzada para el cuidado de toda tu familia.', category: 'Eslogan' },
            { title: 'Compromiso Humano', text: 'Cuidamos cada detalle de tu salud con calidez humana.', category: 'Eslogan' },
          ];
        } else if (aiIndustry === 'legal') {
          results = [
            { title: 'Firmeza y Solidez', text: `${brand} • Asesoría jurídica estratégica y defensa con excelencia.`, category: 'Eslogan' },
            { title: 'Protección Integral', text: 'Protegemos tu patrimonio y respaldamos cada una de tus decisiones.', category: 'Eslogan' },
            { title: 'Confianza y Éxito', text: 'Soluciones legales transparentes, oportunas y de alto impacto.', category: 'Eslogan' },
          ];
        } else if (aiIndustry === 'gastronomia') {
          results = [
            { title: 'Sabor Artesanal', text: `${brand} • Pasión en cada plato, ingredientes frescos del campo a tu mesa.`, category: 'Eslogan' },
            { title: 'Experiencia Gourmet', text: 'Una experiencia gastronómica inolvidable para compartir en familia.', category: 'Eslogan' },
            { title: 'Auténtico y Delicioso', text: 'El auténtico sabor que despierta tus sentidos en cada bocado.', category: 'Eslogan' },
          ];
        } else if (aiIndustry === 'realestate') {
          results = [
            { title: 'El Hogar Soñado', text: `${brand} • Encontramos el espacio perfecto donde comienza tu historia.`, category: 'Eslogan' },
            { title: 'Inversión Segura', text: 'Asesoría inmobiliaria con alta rentabilidad y plusvalía garantizada.', category: 'Eslogan' },
            { title: 'Exclusividad y Confort', text: 'Propiedades selectas y proyectos de vivienda con acabados de lujo.', category: 'Eslogan' },
          ];
        } else if (aiIndustry === 'belleza') {
          results = [
            { title: 'Estilo y Resplandor', text: `${brand} • Realza tu belleza natural con tratamientos exclusivos y personalizados.`, category: 'Eslogan' },
            { title: 'Relax y Armonía', text: 'Un santuario de bienestar, relajación y cuidado para tu piel.', category: 'Eslogan' },
            { title: 'Tendencia & Cuidado', text: 'Expertos en cuidado capilar, estética avanzada y bienestar holístico.', category: 'Eslogan' },
          ];
        } else {
          results = [
            { title: 'Vanguardia Digital', text: `${brand} • Innovación, diseño y tecnología para acelerar tu negocio.`, category: 'Eslogan' },
            { title: 'Resultados Escalables', text: 'Transformamos ideas en productos digitales de alto rendimiento.', category: 'Eslogan' },
            { title: 'Liderazgo Tecnológico', text: 'Soluciones inteligentes para los desafíos del mañana.', category: 'Eslogan' },
          ];
        }
      } else if (aiContentType === 'servicios') {
        if (aiIndustry === 'salud') {
          results = [
            { title: 'Lista de Servicios Odontológicos', text: '• Odontología Estética & Diseño de Sonrisa\n• Ortodoncia Invisible\n• Implantes y Cirugía Oral\n• Limpieza & Blanqueamiento Láser', category: 'Servicios' },
            { title: 'Consulta Especializada', text: '• Medicina General & Preventiva\n• Chequeos Ejecutivos Completos\n• Laboratorio Clínico Especializado', category: 'Servicios' }
          ];
        } else if (aiIndustry === 'legal') {
          results = [
            { title: 'Áreas de Práctica', text: '• Derecho Corporativo & Comercial\n• Contratos y Fusiones Empresariales\n• Derecho Laboral & Seguridad Social\n• Litigios y Resolución de Conflictos', category: 'Servicios' }
          ];
        } else if (aiIndustry === 'gastronomia') {
          results = [
            { title: 'Nuestra Carta & Eventos', text: '• Platos a la Carta & Menú Ejecutivo\n• Café de Especialidad & Repostería\n• Catering para Eventos y Bodas\n• Servicio a Domicilio Premium', category: 'Servicios' }
          ];
        } else {
          results = [
            { title: 'Portafolio de Soluciones', text: '• Consultoría Estratégica\n• Desarrollo Web & Móvil a Medida\n• Marketing Digital & Performance\n• Soporte Técnico Especializado 24/7', category: 'Servicios' }
          ];
        }
      } else if (aiContentType === 'promo') {
        results = [
          { title: '20% Descuento Especial', text: `¡OFERTA EXCLUSIVA DE TEMPORADA!\nPresenta este cupón y obtén 20% OFF en tu primera visita a ${brand}.\nVálido hasta fin de mes.`, category: 'Promoción' },
          { title: '2x1 de Bienvenida', text: `2x1 EN SERVICIOS SELECCIONADOS\nAgenda tu cita esta semana y disfruta el doble de beneficios con ${brand}.`, category: 'Promoción' },
          { title: 'Diagnóstico Gratuito', text: `VALORACIÓN GRATUITA SIN COMPROMISO\nDescubre el mejor plan para ti con nuestros especialistas. ¡Cupos limitados!`, category: 'Promoción' },
        ];
      } else {
        // Contact block
        results = [
          { 
            title: 'Bloque Corporativo Completo', 
            text: `📍 Dirección: Cra 23 # 65-12, Piso 4\n📞 Teléfono: +57 (311) 555-0199\n✉️ Correo: contacto@${brand.toLowerCase().replace(/\s+/g, '')}.com\n🌐 Web: www.${brand.toLowerCase().replace(/\s+/g, '')}.com`, 
            category: 'Contacto' 
          }
        ];
      }

      setAiResults(results);
      setAiIsGenerating(false);
    }, 400);
  };

  // Insert AI Generated Text to Canvas
  const insertAITextToCanvas = (text: string, title?: string) => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    const isMultiLine = text.includes('\n');
    const isHeading = !isMultiLine && text.length < 50;

    const textObj = new fabric.IText(text, {
      left: bleed + safety + 20,
      top: bleed + safety + 40,
      fontFamily: 'Montserrat',
      fontSize: isHeading ? 36 : 22,
      fontWeight: isHeading ? 'bold' : 'normal',
      fill: canvasBgColor === '#0f172a' || canvasBgColor === '#000000' || canvasBgColor === '#0a192f' ? '#f8fafc' : '#1e293b',
      lineHeight: 1.3,
    });

    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    rebuildGuides(canvas);
    saveState();
  };

  // AI Palette Applicator
  const applyAIColorPalette = (theme: 'cyber_teal' | 'navy_gold' | 'minimal_warm' | 'emerald_bio' | 'dark_luxury') => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    let bg = '#ffffff';
    let primaryText = '#0f172a';
    let accentColor = '#0d9488';

    if (theme === 'cyber_teal') {
      bg = '#0f172a';
      primaryText = '#f8fafc';
      accentColor = '#14b8a6';
    } else if (theme === 'navy_gold') {
      bg = '#0a192f';
      primaryText = '#f8fafc';
      accentColor = '#f59e0b';
    } else if (theme === 'minimal_warm') {
      bg = '#fafaf9';
      primaryText = '#1c1917';
      accentColor = '#ea580c';
    } else if (theme === 'emerald_bio') {
      bg = '#f0fdf4';
      primaryText = '#064e3b';
      accentColor = '#059669';
    } else if (theme === 'dark_luxury') {
      bg = '#000000';
      primaryText = '#ffffff';
      accentColor = '#eab308';
    }

    canvas.setBackgroundColor(bg, canvas.renderAll.bind(canvas));
    setCanvasBgColor(bg);

    // Recolor texts and accents
    canvas.getObjects().forEach(obj => {
      if (obj.name === 'prep-guide') return;
      if (obj.type === 'i-text' || obj.type === 'text') {
        const textObj = obj as fabric.IText;
        if (textObj.fontWeight === 'bold') {
          textObj.set('fill', accentColor);
        } else {
          textObj.set('fill', primaryText);
        }
      } else if (obj.type === 'rect' || obj.type === 'circle') {
        obj.set('fill', accentColor);
      }
    });

    rebuildGuides(canvas);
    saveState();
  };

  // Rewrite selected canvas text
  const rewriteSelectedText = (mode: 'formal' | 'persuasive' | 'short') => {
    if (!activeObject || !(activeObject.type === 'i-text' || activeObject.type === 'text')) return;
    const textObj = activeObject as fabric.IText;
    const original = textObj.text || '';

    let transformed = original;
    if (mode === 'formal') {
      transformed = original.replace(/hola|hey/gi, 'Estimado cliente').trim() + ' — Con el respaldo y compromiso de profesionales.';
    } else if (mode === 'persuasive') {
      transformed = '🔥 ' + original.toUpperCase() + ' ¡Aprovecha hoy y asegura tu beneficio exclusivo!';
    } else if (mode === 'short') {
      const words = original.split(' ');
      transformed = words.slice(0, Math.min(6, words.length)).join(' ') + '...';
    }

    textObj.set('text', transformed);
    fabricRef.current?.renderAll();
    saveState();
  };

  // Load Preset Templates
  const loadPresetTemplate = (templateKey: 'minimal' | 'corporate' | 'creative' | 'dark' | 'vibrant') => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    // Clear all objects except guides
    const objects = canvas.getObjects().filter(o => o.name !== 'prep-guide');
    objects.forEach(o => canvas.remove(o));

    if (templateKey === 'minimal') {
      canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
      setCanvasBgColor('#ffffff');

      const name = new fabric.IText('VALENTINA MEJÍA', {
        left: bleed + safety + 30,
        top: bleed + safety + 50,
        fontFamily: 'Montserrat',
        fontSize: 44,
        fontWeight: 'bold',
        fill: '#0f172a',
      });

      const role = new fabric.IText('Directora de Marketing & Branding', {
        left: bleed + safety + 30,
        top: bleed + safety + 110,
        fontFamily: 'Montserrat',
        fontSize: 22,
        fill: '#0d9488',
        fontWeight: '500',
      });

      const line = new fabric.Line([0, 0, trimWidth - safety * 2 - 60, 0], {
        left: bleed + safety + 30,
        top: bleed + safety + 160,
        stroke: '#e2e8f0',
        strokeWidth: 3,
      });

      const phone = new fabric.IText('Tel: +57 (310) 845-9201', {
        left: bleed + safety + 30,
        top: bleed + safety + 190,
        fontFamily: 'Montserrat',
        fontSize: 20,
        fill: '#475569',
      });

      const email = new fabric.IText('Email: valentina@brandingstudio.co', {
        left: bleed + safety + 30,
        top: bleed + safety + 230,
        fontFamily: 'Montserrat',
        fontSize: 20,
        fill: '#475569',
      });

      const web = new fabric.IText('Web: www.brandingstudio.co', {
        left: bleed + safety + 30,
        top: bleed + safety + 270,
        fontFamily: 'Montserrat',
        fontSize: 20,
        fill: '#475569',
      });

      // Accent color block
      const accent = new fabric.Rect({
        left: canvasWidth - bleed - 24,
        top: 0,
        width: bleed + 24,
        height: canvasHeight,
        fill: '#0d9488',
        selectable: false,
      });

      canvas.add(accent, name, role, line, phone, email, web);
    } else if (templateKey === 'corporate') {
      canvas.setBackgroundColor('#f8fafc', canvas.renderAll.bind(canvas));
      setCanvasBgColor('#f8fafc');

      const headerBar = new fabric.Rect({
        left: 0,
        top: 0,
        width: canvasWidth,
        height: 120,
        fill: '#1e3a8a',
      });

      const company = new fabric.IText('NEXUS CONSULTING GROUP', {
        left: bleed + safety + 20,
        top: 45,
        fontFamily: 'Montserrat',
        fontSize: 32,
        fontWeight: 'bold',
        fill: '#ffffff',
      });

      const name = new fabric.IText('CARLOS EDUARDO OSPINA', {
        left: bleed + safety + 20,
        top: bleed + safety + 140,
        fontFamily: 'Montserrat',
        fontSize: 38,
        fontWeight: 'bold',
        fill: '#1e293b',
      });

      const role = new fabric.IText('Socio Fundador & Asesor Financiero', {
        left: bleed + safety + 20,
        top: bleed + safety + 190,
        fontFamily: 'Montserrat',
        fontSize: 20,
        fill: '#3b82f6',
      });

      const contact = new fabric.IText('Carrera 23 # 65-10, Manizales • +57 312 456 7890', {
        left: bleed + safety + 20,
        top: bleed + safety + 260,
        fontFamily: 'Montserrat',
        fontSize: 18,
        fill: '#64748b',
      });

      canvas.add(headerBar, company, name, role, contact);
    } else if (templateKey === 'dark') {
      canvas.setBackgroundColor('#090d16', canvas.renderAll.bind(canvas));
      setCanvasBgColor('#090d16');

      const goldBar = new fabric.Rect({
        left: bleed + safety + 20,
        top: bleed + safety + 40,
        width: 8,
        height: 180,
        fill: '#f59e0b',
      });

      const company = new fabric.IText('AURA ARQUITECTURA', {
        left: bleed + safety + 45,
        top: bleed + safety + 45,
        fontFamily: 'Montserrat',
        fontSize: 20,
        fontWeight: 'bold',
        fill: '#f59e0b',
        charSpacing: 200,
      });

      const name = new fabric.IText('ANDRÉS SALAZAR', {
        left: bleed + safety + 45,
        top: bleed + safety + 85,
        fontFamily: 'Montserrat',
        fontSize: 42,
        fontWeight: 'bold',
        fill: '#ffffff',
      });

      const role = new fabric.IText('Diseño de Espacios & Construcción', {
        left: bleed + safety + 45,
        top: bleed + safety + 145,
        fontFamily: 'Montserrat',
        fontSize: 20,
        fill: '#94a3b8',
      });

      const phone = new fabric.IText('hola@auraestudio.com • 315 890 1234', {
        left: bleed + safety + 45,
        top: bleed + safety + 195,
        fontFamily: 'Montserrat',
        fontSize: 18,
        fill: '#cbd5e1',
      });

      canvas.add(goldBar, company, name, role, phone);
    } else if (templateKey === 'creative') {
      canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
      setCanvasBgColor('#ffffff');

      const circle1 = new fabric.Circle({
        left: canvasWidth - 100,
        top: -50,
        radius: 160,
        fill: 'rgba(20, 184, 166, 0.15)',
        selectable: false,
      });

      const circle2 = new fabric.Circle({
        left: canvasWidth - 50,
        top: canvasHeight - 120,
        radius: 120,
        fill: 'rgba(249, 115, 22, 0.12)',
        selectable: false,
      });

      const badge = new fabric.Rect({
        left: bleed + safety + 20,
        top: bleed + safety + 40,
        width: 140,
        height: 36,
        rx: 18,
        ry: 18,
        fill: '#0d9488',
      });

      const badgeText = new fabric.IText('CREATIVO', {
        left: bleed + safety + 90,
        top: bleed + safety + 58,
        fontFamily: 'Montserrat',
        fontSize: 14,
        fontWeight: 'bold',
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
      });

      const name = new fabric.IText('ESTUDIO MURAL', {
        left: bleed + safety + 20,
        top: bleed + safety + 95,
        fontFamily: 'Montserrat',
        fontSize: 48,
        fontWeight: '900',
        fill: '#0f172a',
      });

      const subtitle = new fabric.IText('Ilustración, Branding & Web', {
        left: bleed + safety + 20,
        top: bleed + safety + 160,
        fontFamily: 'Montserrat',
        fontSize: 22,
        fontWeight: 'bold',
        fill: '#f97316',
      });

      const contact = new fabric.IText('info@estudiomural.co • @estudio.mural', {
        left: bleed + safety + 20,
        top: bleed + safety + 240,
        fontFamily: 'Montserrat',
        fontSize: 20,
        fill: '#64748b',
      });

      canvas.add(circle1, circle2, badge, badgeText, name, subtitle, contact);
    }

    rebuildGuides(canvas);
    canvas.renderAll();
    saveState();
  };

  // OBJECT MANIPULATION
  const updateActiveTextProperty = (property: string, value: any) => {
    if (!fabricRef.current || !activeObject) return;
    activeObject.set(property as any, value);
    fabricRef.current.renderAll();
    saveState();
  };

  const toggleBold = () => {
    if (!activeObject) return;
    const current = (activeObject as fabric.IText).fontWeight;
    const next = current === 'bold' ? 'normal' : 'bold';
    updateActiveTextProperty('fontWeight', next);
  };

  const toggleItalic = () => {
    if (!activeObject) return;
    const current = (activeObject as fabric.IText).fontStyle;
    const next = current === 'italic' ? 'normal' : 'italic';
    updateActiveTextProperty('fontStyle', next);
  };

  const toggleUnderline = () => {
    if (!activeObject) return;
    const current = (activeObject as fabric.IText).underline;
    updateActiveTextProperty('underline', !current);
  };

  const deleteObject = () => {
    if (!fabricRef.current || !activeObject) return;
    fabricRef.current.remove(activeObject);
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
    saveState();
  };

  const duplicateObject = () => {
    if (!fabricRef.current || !activeObject) return;
    activeObject.clone((cloned: fabric.Object) => {
      if (!fabricRef.current) return;
      cloned.set({
        left: (activeObject.left || 0) + 25,
        top: (activeObject.top || 0) + 25,
        evented: true,
      });
      fabricRef.current.add(cloned);
      fabricRef.current.setActiveObject(cloned);
      rebuildGuides(fabricRef.current);
      fabricRef.current.renderAll();
      saveState();
    });
  };

  const bringForward = () => {
    if (!fabricRef.current || !activeObject) return;
    fabricRef.current.bringForward(activeObject);
    rebuildGuides(fabricRef.current);
    fabricRef.current.renderAll();
    saveState();
  };

  const sendBackward = () => {
    if (!fabricRef.current || !activeObject) return;
    fabricRef.current.sendBackwards(activeObject);
    rebuildGuides(fabricRef.current);
    fabricRef.current.renderAll();
    saveState();
  };

  // Change Background Color
  const handleBgColorChange = (color: string) => {
    if (!fabricRef.current) return;
    setCanvasBgColor(color);
    fabricRef.current.setBackgroundColor(color, () => {
      fabricRef.current?.renderAll();
      saveState();
    });
  };

  // EXPORT AS HIGH-RES PRINT PDF (300 DPI)
  const exportPrintPDF = () => {
    if (!fabricRef.current) return;
    setIsSaving(true);
    try {
      const canvas = fabricRef.current;
      const guides = canvas.getObjects().filter(o => o.name === 'prep-guide');
      guides.forEach(g => g.set('visible', false));
      canvas.renderAll();

      const imgData = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2, // 2x high-res rendering
      });

      guides.forEach(g => g.set('visible', showGuides));
      canvas.renderAll();

      // Create PDF in exact dimensions (including bleed) in mm
      const totalWidthMm = sizeConfig.width + 4; // +4mm total bleed
      const totalHeightMm = sizeConfig.height + 4;
      const orientation = totalWidthMm > totalHeightMm ? 'landscape' : 'portrait';

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: [totalWidthMm, totalHeightMm],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, totalWidthMm, totalHeightMm);
      pdf.save(`diseno-impresion-${slug || 'producto'}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error al generar PDF de impresión.');
    } finally {
      setIsSaving(false);
    }
  };

  // EXPORT HIGH-RES PNG
  const exportPNG = () => {
    if (!fabricRef.current) return;
    setIsSaving(true);
    try {
      const canvas = fabricRef.current;
      const guides = canvas.getObjects().filter(o => o.name === 'prep-guide');
      guides.forEach(g => g.set('visible', false));
      canvas.renderAll();

      const dataUrl = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2,
      });

      guides.forEach(g => g.set('visible', showGuides));
      canvas.renderAll();

      const link = document.createElement('a');
      link.download = `diseno-${slug || 'producto'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
      alert('Error al descargar imagen.');
    } finally {
      setIsSaving(false);
    }
  };

  // SAVE & ADD TO CART
  const handleSaveAndAddToCart = () => {
    if (!fabricRef.current) return;
    setIsSaving(true);

    try {
      const canvas = fabricRef.current;
      const guides = canvas.getObjects().filter(o => o.name === 'prep-guide');
      guides.forEach(g => g.set('visible', false));
      canvas.renderAll();

      const previewDataUrl = canvas.toDataURL({
        format: 'jpeg',
        quality: 0.85,
        multiplier: 0.5,
      });

      const canvasJson = canvas.toJSON(['name', 'selectable', 'evented']);

      guides.forEach(g => g.set('visible', showGuides));
      canvas.renderAll();

      // Calculate AI Design fee (20,000 COP per AI design created/used)
      const aiDesignFee = usedAiImages.length > 0 ? 20000 : 0;
      const baseProductPrice = product ? Number(product.basePrice) || 85000 : 85000;
      const totalPrice = baseProductPrice + aiDesignFee;

      const designDescription = usedAiImages.length > 0
        ? `Diseño en Editor Canvas + Diseño Generado con IA ($20.000 COP)`
        : 'Diseño Personalizado en Editor Canvas';

      const optionsDescription = usedAiImages.length > 0
        ? 'Diseño Online Personalizado con IA • Propalcote 300g • Impresión Full Color • Incluye $20.000 de Diseño IA'
        : 'Diseño Online Personalizado • Propalcote 300g • Impresión Full Color';

      // Add to cart
      addToCart({
        productId: product?.id || 1,
        name: product?.name || sizeConfig.name,
        options: optionsDescription,
        quantity: 1000,
        price: totalPrice,
        image: previewDataUrl,
        design: designDescription,
        canvasData: canvasJson,
        pricing: { kind: 'canvas', productId: product?.id ?? null, quantity: 1000, aiDesign: usedAiImages.length > 0 },
      });

      navigate('/carrito');
    } catch (e) {
      console.error(e);
      alert('Error al guardar el diseño.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900 font-sans overflow-hidden select-none">
      {/* 1. TOP HEADER TOOLBAR */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-4 sm:px-6 shrink-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition-colors"
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                {product?.name || sizeConfig.name}
              </h1>
              <span className="bg-teal-500/20 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-500/30">
                300 DPI Print
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Área de diseño con 2mm de sangrado y margen seguro
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* History Undo/Redo */}
          <div className="hidden md:flex items-center gap-1 bg-slate-800 p-1 rounded-full border border-slate-700/60 mr-2">
            <button
              onClick={handleUndo}
              className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors"
              title="Deshacer (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={handleRedo}
              className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors"
              title="Rehacer (Ctrl+Y)"
            >
              <Redo2 size={16} />
            </button>
          </div>

          {/* Toggle Guides */}
          <button
            onClick={toggleGuides}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors border ${
              showGuides
                ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Mostrar/Ocultar Líneas de Corte y Sangría"
          >
            {showGuides ? <Eye size={14} /> : <EyeOff size={14} />}
            <span className="hidden lg:inline">Guías de Impresión</span>
          </button>

          {/* Export Dropdown / Buttons */}
          <button
            onClick={() => setShowPreflightModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 text-teal-300 hover:text-white rounded-full text-xs font-bold border border-teal-500/40 transition-colors shadow-xs"
            title="Auditoría Preflight y Exportación PDF/X 300 DPI con marcas de corte"
          >
            <ShieldCheck size={15} className="text-teal-400" />
            <span>Preflight & PDF/X Pro</span>
          </button>

          <button
            onClick={exportPNG}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-full text-xs font-bold border border-slate-700 transition-colors"
            title="Descargar PNG"
          >
            <Download size={14} />
            <span>PNG</span>
          </button>

          {/* Save & Add to Cart */}
          <button
            onClick={handleSaveAndAddToCart}
            disabled={isSaving}
            className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-neutral-950 font-bold py-2 px-4 sm:px-6 rounded-full flex items-center gap-2 text-xs sm:text-sm shadow-md shadow-teal-500/20 transition-transform active:scale-95 disabled:opacity-75"
          >
            <ShoppingBag size={16} />
            <span>Guardar y Comprar</span>
            {usedAiImages.length > 0 && (
              <span className="bg-teal-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                +$20.000 IA
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT PRIMARY NAVIGATION (Categories of tools) */}
        <aside className="w-16 sm:w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-2 shrink-0 z-20">
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl w-14 sm:w-16 transition-all ${
              activeTab === 'templates'
                ? 'bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutTemplate size={20} />
            <span className="text-[10px] font-bold">Plantillas</span>
          </button>

          <button
            onClick={() => setActiveTab('ai_images')}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl w-14 sm:w-16 transition-all relative ${
              activeTab === 'ai_images'
                ? 'bg-gradient-to-br from-teal-500 via-emerald-500 to-indigo-600 text-neutral-950 shadow-lg shadow-teal-500/30'
                : 'text-teal-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Generar imágenes e ilustraciones con IA"
          >
            <Sparkles size={20} className="animate-pulse text-teal-300" />
            <span className="text-[10px] font-black">Fotos IA</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-teal-400"></span>
          </button>

          <button
            onClick={() => {
              setActiveTab('ai_assistant');
              if (aiResults.length === 0) generateAICopy();
            }}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl w-14 sm:w-16 transition-all relative ${
              activeTab === 'ai_assistant'
                ? 'bg-gradient-to-br from-teal-500 to-indigo-600 text-neutral-950 shadow-lg shadow-teal-500/30'
                : 'text-teal-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Type size={20} />
            <span className="text-[10px] font-bold">Copys IA</span>
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl w-14 sm:w-16 transition-all ${
              activeTab === 'text'
                ? 'bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Type size={20} />
            <span className="text-[10px] font-bold">Texto</span>
          </button>

          <button
            onClick={() => setActiveTab('shapes')}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl w-14 sm:w-16 transition-all ${
              activeTab === 'shapes'
                ? 'bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Square size={20} />
            <span className="text-[10px] font-bold">Formas</span>
          </button>

          <button
            onClick={() => setActiveTab('images')}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl w-14 sm:w-16 transition-all ${
              activeTab === 'images'
                ? 'bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ImageIcon size={20} />
            <span className="text-[10px] font-bold">Imágenes</span>
          </button>

          <button
            onClick={() => setActiveTab('background')}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl w-14 sm:w-16 transition-all ${
              activeTab === 'background'
                ? 'bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Palette size={20} />
            <span className="text-[10px] font-bold">Fondo</span>
          </button>

          <button
            onClick={() => setActiveTab('layers')}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl w-14 sm:w-16 transition-all mt-auto ${
              activeTab === 'layers'
                ? 'bg-teal-500 text-neutral-950 shadow-lg shadow-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers size={20} />
            <span className="text-[10px] font-bold">Capas</span>
          </button>
        </aside>

        {/* LEFT SECONDARY DRAWER PANEL (Tools settings / gallery) */}
        <div className="w-72 sm:w-80 bg-slate-900/95 backdrop-blur-md border-r border-slate-800 text-slate-200 flex flex-col shrink-0 overflow-y-auto p-5 z-10">
          {/* TAB 1: TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">Plantillas Profesionales</h3>
                <p className="text-xs text-slate-400 mt-1">Elige un diseño base para comenzar a personalizar.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => loadPresetTemplate('minimal')}
                  className="group relative rounded-2xl border border-slate-700/80 bg-slate-800/50 p-4 text-left hover:border-teal-500 transition-all overflow-hidden"
                >
                  <div className="h-20 bg-white rounded-xl p-3 flex flex-col justify-between shadow-inner">
                    <div className="w-16 h-2 bg-slate-900 rounded"></div>
                    <div className="w-24 h-1.5 bg-teal-600 rounded"></div>
                    <div className="w-28 h-1 bg-slate-300 rounded"></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-teal-400">Minimalista Estudio</span>
                    <Sparkles size={14} className="text-teal-400" />
                  </div>
                </button>

                <button
                  onClick={() => loadPresetTemplate('corporate')}
                  className="group relative rounded-2xl border border-slate-700/80 bg-slate-800/50 p-4 text-left hover:border-teal-500 transition-all overflow-hidden"
                >
                  <div className="h-20 bg-slate-100 rounded-xl overflow-hidden shadow-inner flex flex-col">
                    <div className="h-6 bg-blue-900 w-full"></div>
                    <div className="p-2 space-y-1.5 flex-1">
                      <div className="w-20 h-2 bg-slate-800 rounded"></div>
                      <div className="w-16 h-1 bg-blue-500 rounded"></div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-teal-400">Corporativo Blue</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Ejecutivo</span>
                  </div>
                </button>

                <button
                  onClick={() => loadPresetTemplate('dark')}
                  className="group relative rounded-2xl border border-slate-700/80 bg-slate-800/50 p-4 text-left hover:border-teal-500 transition-all overflow-hidden"
                >
                  <div className="h-20 bg-slate-950 rounded-xl p-3 flex border border-slate-800 justify-between items-center">
                    <div className="space-y-1.5">
                      <div className="w-16 h-1 bg-teal-400 rounded"></div>
                      <div className="w-24 h-2.5 bg-white rounded"></div>
                      <div className="w-20 h-1 bg-slate-500 rounded"></div>
                    </div>
                    <div className="w-1.5 h-12 bg-teal-500 rounded"></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-teal-400">Dark Luxury Gold</span>
                    <span className="text-[10px] text-teal-400 font-semibold">Premium</span>
                  </div>
                </button>

                <button
                  onClick={() => loadPresetTemplate('creative')}
                  className="group relative rounded-2xl border border-slate-700/80 bg-slate-800/50 p-4 text-left hover:border-teal-500 transition-all overflow-hidden"
                >
                  <div className="h-20 bg-white rounded-xl p-3 flex flex-col justify-between overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 w-12 h-12 bg-teal-100 rounded-full"></div>
                    <div className="w-12 h-3 bg-teal-500 rounded-full"></div>
                    <div className="w-24 h-2 bg-slate-900 rounded"></div>
                    <div className="w-20 h-1 bg-orange-400 rounded"></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-teal-400">Creativo & Agencia</span>
                    <span className="text-[10px] text-orange-400 font-semibold">Moderno</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TAB: ASISTENTE DE REDACCIÓN Y DISEÑO CON IA */}
          {activeTab === 'ai_assistant' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-teal-400" />
                  <h3 className="text-sm font-black text-white tracking-wide uppercase">Asistente IA de Contenido</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">Genera eslóganes, servicios y copys de alta conversión para tu impreso.</p>
              </div>

              {/* Parámetros de Generación */}
              <div className="space-y-3.5 bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/60">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Nombre de tu Marca / Negocio:</label>
                  <input
                    type="text"
                    value={aiBrandName}
                    onChange={(e) => setAiBrandName(e.target.value)}
                    placeholder="Ej: Fusión Gráfica"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Rubro / Industria:</label>
                    <select
                      value={aiIndustry}
                      onChange={(e) => setAiIndustry(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-semibold outline-none focus:border-teal-500"
                    >
                      <option value="salud">🩺 Salud & Odonto</option>
                      <option value="legal">⚖️ Abogados & Leyes</option>
                      <option value="gastronomia">☕ Gastronomía & Café</option>
                      <option value="realestate">🏢 Bienes Raíces</option>
                      <option value="belleza">💄 Belleza & Spa</option>
                      <option value="tech">💻 Tech & Startups</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Tipo de Copy:</label>
                    <select
                      value={aiContentType}
                      onChange={(e) => setAiContentType(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-semibold outline-none focus:border-teal-500"
                    >
                      <option value="slogan">✨ Eslogan & Marca</option>
                      <option value="servicios">📋 Lista de Servicios</option>
                      <option value="promo">🏷️ Oferta / Promo</option>
                      <option value="contacto">📍 Datos de Contacto</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={generateAICopy}
                  disabled={aiIsGenerating}
                  className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-neutral-950 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-500/20"
                >
                  <Sparkles size={14} />
                  <span>{aiIsGenerating ? 'Generando copys con IA...' : 'Generar Sugerencias con IA'}</span>
                </button>
              </div>

              {/* Resultados Generados con Inserción en 1 Clic */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Sugerencias Listas para Insertar:
                </span>

                {aiResults.map((res, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-teal-500/60 transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-wider">{res.title}</span>
                      <span className="text-[9px] bg-slate-700 px-2 py-0.5 rounded-full text-slate-300 font-semibold">{res.category}</span>
                    </div>

                    <p className="text-xs text-slate-200 font-medium whitespace-pre-line leading-relaxed">
                      {res.text}
                    </p>

                    <button
                      onClick={() => insertAITextToCanvas(res.text, res.title)}
                      className="w-full py-1.5 bg-teal-500/20 hover:bg-teal-500 hover:text-white text-teal-300 rounded-xl text-[11px] font-bold transition-all border border-teal-500/30 flex items-center justify-center gap-1.5 mt-1"
                    >
                      <span>➕ Insertar este texto al Lienzo</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* SECCIÓN 2: PALETAS DE COLOR ARMÓNICAS */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Palette size={14} className="text-teal-400" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wide">Paletas Armónicas de Imprenta</h4>
                </div>
                <p className="text-[11px] text-slate-400">Aplica esquemas de color profesionales en un solo clic:</p>

                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'cyber_teal', name: 'Cyber Charcoal & Teal', colors: ['#0f172a', '#14b8a6', '#f8fafc'] },
                    { id: 'navy_gold', name: 'Royal Navy & Champagne Gold', colors: ['#0a192f', '#f59e0b', '#ffffff'] },
                    { id: 'minimal_warm', name: 'Studio Minimal & Terracotta', colors: ['#fafaf9', '#ea580c', '#1c1917'] },
                    { id: 'emerald_bio', name: 'Emerald Organic & Eco', colors: ['#f0fdf4', '#059669', '#064e3b'] },
                    { id: 'dark_luxury', name: 'Dark Luxury & Gold Foil', colors: ['#000000', '#eab308', '#ffffff'] },
                  ].map((pal: any) => (
                    <button
                      key={pal.id}
                      onClick={() => applyAIColorPalette(pal.id)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 flex items-center justify-between transition-all text-left"
                    >
                      <span className="text-xs font-bold text-slate-200">{pal.name}</span>
                      <div className="flex items-center gap-1">
                        {pal.colors.map((c: string, idx: number) => (
                          <div key={idx} className="w-4 h-4 rounded-full border border-slate-600 shadow-xs" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECCIÓN 3: RE-ESCRITURA DE TEXTO SELECCIONADO */}
              {activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text') && (
                <div className="border-t border-slate-800 pt-4 space-y-2.5">
                  <span className="text-xs font-black text-teal-400 block uppercase tracking-wider">
                    ⚡ Mejorar Texto Seleccionado con IA:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => rewriteSelectedText('formal')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold border border-slate-700 transition-all text-center"
                    >
                      Más Formal
                    </button>
                    <button
                      onClick={() => rewriteSelectedText('persuasive')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold border border-slate-700 transition-all text-center"
                    >
                      Más Vendedor
                    </button>
                    <button
                      onClick={() => rewriteSelectedText('short')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold border border-slate-700 transition-all text-center"
                    >
                      Más Breve
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEXT */}
          {activeTab === 'text' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">Añadir Texto</h3>
                <p className="text-xs text-slate-400 mt-1">Haz clic para insertar bloques de texto tipográficos.</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => addText('heading')}
                  className="w-full py-4 px-4 bg-slate-800 hover:bg-slate-700/80 rounded-2xl text-left border border-slate-700 flex items-center justify-between transition-all"
                >
                  <div>
                    <span className="text-base font-extrabold text-white block">Título Principal</span>
                    <span className="text-xs text-slate-400">Nombre o marca principal</span>
                  </div>
                  <Type size={18} className="text-teal-400" />
                </button>

                <button
                  onClick={() => addText('subheading')}
                  className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700/80 rounded-2xl text-left border border-slate-700 flex items-center justify-between transition-all"
                >
                  <div>
                    <span className="text-sm font-bold text-white block">Subtítulo / Cargo</span>
                    <span className="text-xs text-slate-400">Puesto, eslogan o categoría</span>
                  </div>
                  <Type size={16} className="text-teal-400" />
                </button>

                <button
                  onClick={() => addText('body')}
                  className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700/80 rounded-2xl text-left border border-slate-700 flex items-center justify-between transition-all"
                >
                  <div>
                    <span className="text-xs font-semibold text-white block">Texto Descriptivo</span>
                    <span className="text-[11px] text-slate-400">Párrafos o detalles adicionales</span>
                  </div>
                  <Type size={14} className="text-teal-400" />
                </button>

                <button
                  onClick={() => addText('contact')}
                  className="w-full py-3 px-4 bg-teal-950/40 hover:bg-teal-900/40 rounded-2xl text-left border border-teal-500/30 flex items-center justify-between transition-all"
                >
                  <div>
                    <span className="text-xs font-bold text-teal-300 block">Datos de Contacto</span>
                    <span className="text-[11px] text-slate-400">Teléfono, correo y web</span>
                  </div>
                  <Phone size={14} className="text-teal-400" />
                </button>
              </div>

              {/* Font Selector */}
              <div className="pt-4 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-300 mb-2">Tipografía Activa</label>
                <select
                  value={selectedFont}
                  onChange={(e) => {
                    setSelectedFont(e.target.value);
                    if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text')) {
                      updateActiveTextProperty('fontFamily', e.target.value);
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                >
                  <option value="Montserrat">Montserrat (Moderna & Limpia)</option>
                  <option value="Inter">Inter (Sans Elegante)</option>
                  <option value="Playfair Display">Playfair Display (Serif Editorial)</option>
                  <option value="Oswald">Oswald (Condensada Fuerte)</option>
                  <option value="Courier New">Courier (Monospace Clásica)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: SHAPES */}
          {activeTab === 'shapes' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">Formas & Elementos</h3>
                <p className="text-xs text-slate-400 mt-1">Inserta marcos, divisores y acentos gráficos.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => addShape('rect')}
                  className="p-4 bg-slate-800 hover:bg-slate-700/80 rounded-2xl border border-slate-700 flex flex-col items-center gap-2 text-center transition-all"
                >
                  <div className="w-10 h-8 bg-teal-500 rounded-lg"></div>
                  <span className="text-xs font-bold text-white">Rectángulo</span>
                </button>

                <button
                  onClick={() => addShape('circle')}
                  className="p-4 bg-slate-800 hover:bg-slate-700/80 rounded-2xl border border-slate-700 flex flex-col items-center gap-2 text-center transition-all"
                >
                  <div className="w-8 h-8 bg-teal-500 rounded-full"></div>
                  <span className="text-xs font-bold text-white">Círculo</span>
                </button>

                <button
                  onClick={() => addShape('line')}
                  className="p-4 bg-slate-800 hover:bg-slate-700/80 rounded-2xl border border-slate-700 flex flex-col items-center gap-2 text-center transition-all"
                >
                  <div className="w-10 h-1 bg-teal-500 rounded"></div>
                  <span className="text-xs font-bold text-white">Línea Divisoria</span>
                </button>

                <button
                  onClick={() => addShape('bar')}
                  className="p-4 bg-slate-800 hover:bg-slate-700/80 rounded-2xl border border-slate-700 flex flex-col items-center gap-2 text-center transition-all"
                >
                  <div className="w-10 h-3 bg-teal-500 rounded"></div>
                  <span className="text-xs font-bold text-white">Barra Inferior</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-300 mb-2">Color de Relleno</label>
                <div className="flex flex-wrap gap-2">
                  {['#0d9488', '#0ea5e9', '#6366f1', '#f59e0b', '#ef4444', '#0f172a', '#ffffff'].map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setShapeFill(c);
                        if (activeObject) updateActiveTextProperty('fill', c);
                      }}
                      className="w-7 h-7 rounded-full border-2 border-slate-700 transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: AI IMAGES GENERATOR */}
          {activeTab === 'ai_images' && (
            <div className="space-y-4">
              <AiImageGenerator
                onInsertToCanvas={(url, isBg) => handleInsertAIImage(url, isBg)}
                aiDesignsUsedCount={usedAiImages.length}
                onTrackAiDesignUsed={(url) => {
                  setUsedAiImages((prev) => (!prev.includes(url) ? [...prev, url] : prev));
                }}
              />
            </div>
          )}

          {/* TAB 4: IMAGES & UPLOADS */}
          {activeTab === 'images' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">Imágenes & Recursos</h3>
                <p className="text-xs text-slate-400 mt-1">Genera con IA, sube tus logotipos o crea códigos QR.</p>
              </div>

              {/* Direct Access Banner to AI Generator */}
              <button
                onClick={() => setActiveTab('ai_images')}
                className="w-full p-4 rounded-2xl bg-gradient-to-br from-teal-500/20 via-indigo-500/10 to-teal-500/10 border-2 border-teal-500/40 hover:border-teal-400 flex items-center justify-between text-left transition-all group cursor-pointer shadow-md shadow-teal-500/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500 text-neutral-950 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white block flex items-center gap-1">
                      <span>Generador de Imágenes IA</span>
                      <span className="px-1.5 py-0.5 rounded bg-teal-500/30 text-teal-300 text-[9px] font-bold">NUEVO</span>
                    </span>
                    <span className="text-[10px] text-slate-300">Crea fotos, logos e ilustraciones a medida</span>
                  </div>
                </div>
                <span className="text-xs text-teal-400 font-bold group-hover:translate-x-1 transition-transform">→</span>
              </button>

              <div className="border-t border-slate-800 pt-4 space-y-4">
                <span className="text-xs font-bold text-slate-300 block">Subir desde tu Dispositivo</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 px-4 border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-2xl flex flex-col items-center gap-2 text-center bg-slate-800/40 hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center">
                    <Upload size={20} />
                  </div>
                  <span className="text-xs font-bold text-white">Subir Imagen o Logotipo</span>
                  <span className="text-[10px] text-slate-400">PNG, JPG, SVG hasta 10MB</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              <div className="pt-2 space-y-3 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-300 block">Elementos Rápidos</span>
                <button
                  onClick={addQRCode}
                  className="w-full p-3.5 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 flex items-center justify-between text-left transition-all"
                >
                  <div className="flex items-center gap-3">
                    <QrCode size={20} className="text-teal-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Generar Código QR</span>
                      <span className="text-[10px] text-slate-400">Enlaza a tu web o WhatsApp</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-teal-400 font-bold">Añadir</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: BACKGROUND */}
          {activeTab === 'background' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">Color de Fondo</h3>
                <p className="text-xs text-slate-400 mt-1">Ajusta el tono de base de la tarjeta o pieza gráfica.</p>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {[
                  { name: 'Blanco Puro', color: '#ffffff' },
                  { name: 'Off White', color: '#f8fafc' },
                  { name: 'Gris Claro', color: '#e2e8f0' },
                  { name: 'Dark Navy', color: '#090d16' },
                  { name: 'Obsidian', color: '#0f172a' },
                  { name: 'Azul Real', color: '#1e3a8a' },
                  { name: 'Teal Deep', color: '#042f2e' },
                  { name: 'Esmeralda', color: '#064e3b' },
                  { name: 'Borgoña', color: '#4c0519' },
                  { name: 'Oro Mate', color: '#78350f' },
                  { name: 'Carbón', color: '#18181b' },
                  { name: 'Crema', color: '#fef3c7' },
                ].map((item) => (
                  <button
                    key={item.color}
                    onClick={() => handleBgColorChange(item.color)}
                    className={`h-12 rounded-xl border-2 transition-transform hover:scale-105 flex items-center justify-center ${
                      canvasBgColor === item.color ? 'border-teal-500 ring-2 ring-teal-500/30' : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: item.color }}
                    title={item.name}
                  >
                    {canvasBgColor === item.color && (
                      <CheckCircle2 size={16} className={item.color === '#ffffff' ? 'text-slate-900' : 'text-white'} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: LAYERS */}
          {activeTab === 'layers' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">Capas del Lienzo</h3>
                <p className="text-xs text-slate-400 mt-1">Organiza el orden de los elementos.</p>
              </div>

              {canvasLayers.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-8">No hay objetos en el lienzo.</p>
              ) : (
                <div className="space-y-2">
                  {canvasLayers.map((obj, i) => {
                    const isSelected = activeObject === obj;
                    const label =
                      obj.type === 'i-text' || obj.type === 'text'
                        ? (obj as fabric.IText).text?.slice(0, 18) || 'Texto'
                        : obj.type === 'image'
                        ? 'Imagen / Logotipo'
                        : `Forma (${obj.type})`;

                    return (
                      <div
                        key={i}
                        onClick={() => {
                          fabricRef.current?.setActiveObject(obj);
                          fabricRef.current?.renderAll();
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {obj.type === 'i-text' ? <Type size={14} /> : <Square size={14} />}
                          <span className="text-xs font-semibold truncate">{label}</span>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                bringForward();
                              }}
                              className="p-1 hover:text-white"
                              title="Traer adelante"
                            >
                              ▲
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                sendBackward();
                              }}
                              className="p-1 hover:text-white"
                              title="Enviar atrás"
                            >
                              ▼
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. CENTER WORKBENCH / CANVAS */}
        <main
          ref={containerRef}
          className="flex-1 bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden p-6"
        >
          {/* Floating Contextual Property Bar for selected object */}
          {activeObject && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-800 text-white rounded-full px-4 py-2 shadow-2xl flex items-center gap-3 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
              {(activeObject.type === 'i-text' || activeObject.type === 'text') && (
                <>
                  <button
                    onClick={toggleBold}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                    title="Negrita"
                  >
                    <Bold size={16} />
                  </button>
                  <button
                    onClick={toggleItalic}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                    title="Cursiva"
                  >
                    <Italic size={16} />
                  </button>
                  <button
                    onClick={toggleUnderline}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                    title="Subrayado"
                  >
                    <Underline size={16} />
                  </button>

                  <div className="h-4 w-px bg-slate-700 mx-1"></div>

                  <button
                    onClick={() => updateActiveTextProperty('textAlign', 'left')}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                    title="Alinear Izquierda"
                  >
                    <AlignLeft size={16} />
                  </button>
                  <button
                    onClick={() => updateActiveTextProperty('textAlign', 'center')}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                    title="Centrar"
                  >
                    <AlignCenter size={16} />
                  </button>
                  <button
                    onClick={() => updateActiveTextProperty('textAlign', 'right')}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                    title="Alinear Derecha"
                  >
                    <AlignRight size={16} />
                  </button>

                  <div className="h-4 w-px bg-slate-700 mx-1"></div>

                  {/* Color Picker input */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => {
                        setTextColor(e.target.value);
                        updateActiveTextProperty('fill', e.target.value);
                      }}
                      className="w-6 h-6 rounded-full border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                </>
              )}

              {activeObject.type !== 'i-text' && activeObject.type !== 'text' && (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <span>Color:</span>
                  <input
                    type="color"
                    value={shapeFill}
                    onChange={(e) => {
                      setShapeFill(e.target.value);
                      updateActiveTextProperty('fill', e.target.value);
                    }}
                    className="w-6 h-6 rounded-full border-0 bg-transparent cursor-pointer"
                  />
                </div>
              )}

              <div className="h-4 w-px bg-slate-700 mx-1"></div>

              <button
                onClick={duplicateObject}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-teal-400 transition-colors"
                title="Duplicar"
              >
                <Copy size={16} />
              </button>

              <button
                onClick={deleteObject}
                className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                title="Eliminar elemento"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {/* Safety Boundary Warning */}
          {outOfBoundsWarning && (
            <div className="absolute top-16 bg-teal-500/90 text-slate-950 font-bold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-20 animate-bounce">
              <AlertTriangle size={16} />
              <span>Aviso: Hay texto cerca o fuera del área de seguridad de corte</span>
            </div>
          )}

          {/* Canvas Wrapper with drop shadow */}
          <div className="relative shadow-[0_25px_70px_rgba(0,0,0,0.8)] rounded-sm overflow-hidden border border-slate-800">
            <canvas ref={canvasRef} />
          </div>

          {/* Bottom Zoom & Status Bar */}
          <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between pointer-events-none">
            {/* Guide legend */}
            <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800 text-[11px] font-bold text-slate-400 flex items-center gap-4 shadow-lg pointer-events-auto">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500/80"></span>
                <span>Línea de Corte</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-500 border border-teal-400 border-dashed"></span>
                <span>Margen Seguro (3mm)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-500/30"></span>
                <span>Sangría (2mm)</span>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="bg-slate-900/90 backdrop-blur-md px-2 py-1.5 rounded-full border border-slate-800 flex items-center gap-1 shadow-lg pointer-events-auto text-slate-300">
              <button
                onClick={() => updateZoom(-0.1)}
                className="p-1.5 hover:bg-slate-800 rounded-full hover:text-white transition-colors"
                title="Alejar"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-bold w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => updateZoom(0.1)}
                className="p-1.5 hover:bg-slate-800 rounded-full hover:text-white transition-colors"
                title="Acercar"
              >
                <ZoomIn size={16} />
              </button>
              <div className="w-px h-4 bg-slate-800 mx-1"></div>
              <button
                onClick={resetZoomToFit}
                className="p-1.5 hover:bg-slate-800 rounded-full hover:text-white transition-colors"
                title="Ajustar al espacio"
              >
                <Maximize2 size={15} />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL DE PREFLIGHT & EXPORTACIÓN PDF/X */}
      <PreflightModal
        isOpen={showPreflightModal}
        onClose={() => setShowPreflightModal(false)}
        elements={fabricRef.current ? fabricRef.current.getObjects().filter(o => o.name !== 'prep-guide') : []}
        dimensions={{
          widthMm: sizeConfig.width,
          heightMm: sizeConfig.height,
          bleedMm: 3,
          safetyMm: 3
        }}
        getCanvasElement={() => {
          if (!fabricRef.current) return null;
          const canvas = fabricRef.current;
          const guides = canvas.getObjects().filter(o => o.name === 'prep-guide');
          guides.forEach(g => g.set('visible', false));
          canvas.renderAll();
          
          const el = canvas.getElement();
          
          setTimeout(() => {
            guides.forEach(g => g.set('visible', showGuides));
            canvas.renderAll();
          }, 100);

          return el;
        }}
        productName={product?.name || sizeConfig.name}
      />
    </div>
  );
}
