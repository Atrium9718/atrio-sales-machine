import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Tag, 
  Layers, 
  Percent, 
  Settings, 
  Image as ImageIcon, 
  Sparkles, 
  Sliders, 
  DollarSign, 
  Calculator, 
  CheckCircle2, 
  Clock, 
  Scale, 
  HelpCircle,
  FolderPlus,
  Boxes,
  Check,
  X,
  Eye,
  AlertCircle,
  Bookmark,
  Rocket,
  Globe,
  FileCode,
  Flame,
  Star,
  ExternalLink
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../lib/firebase';
import AdminProductAiImageModal from './AdminProductAiImageModal';

type PricingRule = {
  minQty: number;
  maxQty: number;
  discountPercentage: number;
};

type QuantityTier = {
  quantity: number;
  price: number;
  label?: string;
};

type AttributeValue = {
  valueId: string;
  label: string;
  priceModifier: number;
  weightModifier: number;
  daysModifier: number;
};

type ProductAttribute = {
  attributeId: string;
  name: string;
  group?: string;
  values: AttributeValue[];
};

type ProductFormValues = {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  basePrice: number;
  baseQuantity: number;
  minQuantity: number;
  quantityStep: number;
  setupFee: number;
  pricingMode: string;
  imageUrl?: string;
  images?: string[];
  attributes: ProductAttribute[];
  pricingRules: PricingRule[];
  quantityTiers: QuantityTier[];
  isActive?: boolean;
  isFeatured?: boolean;
  isPromo?: boolean;
  discountPercentage?: number;
  promoBadge?: string;
  promoDescription?: string;
};

export default function ProductBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new' || id === 'builder' || isNaN(Number(id));
  const numericId = isNew ? null : Number(id);
  const { token } = useAuth();

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [masterAttributes, setMasterAttributes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveNotification, setSaveNotification] = useState<{ type: 'template' | 'publish'; title: string; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'tiers' | 'pricing' | 'matrix' | 'discounts'>('general');
  const [showAiModal, setShowAiModal] = useState(false);
  const [showMasterImportModal, setShowMasterImportModal] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Live Simulator state
  const [simQty, setSimQty] = useState<number>(100);
  const [simSelectedOptions, setSimSelectedOptions] = useState<Record<string, number>>({});

  const { register, control, handleSubmit, setValue, getValues, watch, reset } = useForm<ProductFormValues>({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      categoryId: '',
      basePrice: 0,
      baseQuantity: 1,
      minQuantity: 1,
      quantityStep: 1,
      setupFee: 0,
      pricingMode: 'tiered_fixed',
      imageUrl: '',
      images: [],
      attributes: [],
      pricingRules: [],
      isActive: true,
      isFeatured: false,
      isPromo: false,
      discountPercentage: 0,
      promoBadge: '',
      promoDescription: '',
      quantityTiers: [
        { quantity: 100, price: 66000, label: 'Básico' },
        { quantity: 200, price: 92000, label: 'Recomendado' },
        { quantity: 500, price: 121000, label: 'Más pedido' },
        { quantity: 1000, price: 155000, label: 'Mejor precio' }
      ],
    },
  });

  const {
    fields: attributeFields,
    append: appendAttribute,
    remove: removeAttribute,
  } = useFieldArray({
    control,
    name: 'attributes',
  });

  const {
    fields: ruleFields,
    append: appendRule,
    remove: removeRule,
  } = useFieldArray({
    control,
    name: 'pricingRules',
  });

  const {
    fields: tierFields,
    append: appendTier,
    remove: removeTier,
    replace: replaceTiers,
  } = useFieldArray({
    control,
    name: 'quantityTiers',
  });

  // Watch form values for calculations and simulator
  const watchedBasePrice = watch('basePrice') || 0;
  const watchedBaseQuantity = Math.max(1, watch('baseQuantity') || 1);
  const watchedMinQuantity = Math.max(1, watch('minQuantity') || 1);
  const watchedSetupFee = watch('setupFee') || 0;
  const watchedAttributes = watch('attributes') || [];
  const watchedRules = watch('pricingRules') || [];
  const watchedTiers = watch('quantityTiers') || [];
  const watchedName = watch('name') || '';

  // Auto-generate slug when name changes for new products
  useEffect(() => {
    if (isNew && watchedName) {
      const generatedSlug = watchedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setValue('slug', generatedSlug);
    }
  }, [watchedName, isNew, setValue]);

  // Fetch initial data (Categories, Master Attributes, or Product if edit mode)
  useEffect(() => {
    async function loadData() {
      try {
        let activeToken = token;
        if (auth.currentUser) {
          try {
            activeToken = await auth.currentUser.getIdToken(false);
          } catch (e) {
            console.warn('Error refreshing token for product builder:', e);
          }
        }
        if (!activeToken) return;

        const [catRes, masterRes] = await Promise.all([
          fetch('/api/admin/catalog/categories', { headers: { 'Authorization': `Bearer ${activeToken}` } }),
          fetch('/api/admin/catalog/master-attributes', { headers: { 'Authorization': `Bearer ${activeToken}` } })
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData);
        }
        if (masterRes.ok) {
          const masterData = await masterRes.json();
          setMasterAttributes(masterData);
        }

        // Check if there is a pending template from industry templates tab
        const pendingTemplate = sessionStorage.getItem('pending_product_template');
        if (isNew && pendingTemplate) {
          try {
            const parsed = JSON.parse(pendingTemplate);
            const templateTiers = parsed.quantityTiers || (parsed.minQuantity ? [
              { quantity: parsed.minQuantity, price: parsed.basePrice || 66000, label: 'Mínimo' },
              { quantity: (parsed.minQuantity || 100) * 2, price: Math.round((parsed.basePrice || 66000) * 1.5), label: 'Recomendado' },
              { quantity: (parsed.minQuantity || 100) * 5, price: Math.round((parsed.basePrice || 66000) * 2.2), label: 'Más pedido' },
              { quantity: parsed.baseQuantity || 1000, price: Math.round((parsed.basePrice || 66000) * 2.8), label: 'Mejor precio' }
            ] : []);

            reset({
              name: parsed.name,
              slug: (parsed.slug || parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '-' + Date.now().toString().slice(-4),
              description: parsed.description || '',
              categoryId: parsed.categoryId?.toString() || '1',
              basePrice: parsed.basePrice || 0,
              baseQuantity: parsed.baseQuantity || 1000,
              minQuantity: parsed.minQuantity || 100,
              quantityStep: parsed.quantityStep || 100,
              setupFee: parsed.setupFee || 0,
              pricingMode: parsed.pricingMode || (templateTiers.length > 0 ? 'tiered_fixed' : 'prorated'),
              imageUrl: parsed.imageUrl || '',
              images: parsed.imageUrl ? [parsed.imageUrl] : [],
              attributes: parsed.attributes || [],
              quantityTiers: templateTiers,
              pricingRules: [
                { minQty: (parsed.minQuantity || 100) * 2, maxQty: (parsed.minQuantity || 100) * 5, discountPercentage: 5 },
                { minQty: (parsed.minQuantity || 100) * 5 + 1, maxQty: 100000, discountPercentage: 10 },
              ],
            });
            setSimQty(parsed.minQuantity || 100);
            sessionStorage.removeItem('pending_product_template');
            setLoading(false);
            return;
          } catch (e) {
            console.error('Error applying template:', e);
          }
        }

        // If editing existing product
        if (!isNew && numericId) {
          const prodRes = await fetch(`/api/admin/catalog/product/${numericId}`, {
            headers: { 'Authorization': `Bearer ${activeToken}` }
          });
          if (prodRes.ok) {
            const product = await prodRes.json();
            const tiers = product.quantityTiers || product.extraConfig?.quantityTiers || [];
            reset({
              name: product.name,
              slug: product.slug,
              description: product.description || '',
              categoryId: product.categoryId?.toString() || '1',
              basePrice: Number(product.basePrice) || 0,
              baseQuantity: Number(product.baseQuantity) || 1,
              minQuantity: Number(product.minQuantity) || 1,
              quantityStep: Number(product.quantityStep) || 1,
              setupFee: Number(product.setupFee) || 0,
              pricingMode: product.pricingMode || (tiers.length > 0 ? 'tiered_fixed' : 'prorated'),
              imageUrl: product.imageUrl || '',
              images: product.images || [],
              isActive: product.isActive !== undefined ? Boolean(product.isActive) : true,
              isFeatured: Boolean(product.isFeatured ?? product.extraConfig?.isFeatured),
              isPromo: Boolean(product.isPromo ?? product.extraConfig?.isPromo),
              discountPercentage: Number(product.discountPercentage ?? product.extraConfig?.discountPercentage ?? 0),
              promoBadge: product.promoBadge || product.extraConfig?.promoBadge || '',
              promoDescription: product.promoDescription || product.extraConfig?.promoDescription || '',
              quantityTiers: tiers.length > 0 ? tiers : [
                { quantity: 100, price: 66000, label: 'Básico' },
                { quantity: 200, price: 92000, label: 'Recomendado' },
                { quantity: 500, price: 121000, label: 'Más pedido' },
                { quantity: 1000, price: 155000, label: 'Mejor precio' }
              ],
              attributes: product.attributes.map((attr: any) => ({
                attributeId: attr.id?.toString() || `attr-${Date.now()}`,
                name: attr.name,
                group: attr.group || 'General',
                values: attr.values.map((val: any) => ({
                  valueId: val.id?.toString() || `val-${Date.now()}`,
                  label: val.label,
                  priceModifier: Number(val.priceModifier) || 0,
                  weightModifier: Number(val.weightModifier) || 0,
                  daysModifier: Number(val.daysModifier) || 0,
                })),
              })),
              pricingRules: product.pricingRules?.map((r: any) => ({
                minQty: Number(r.minQty),
                maxQty: Number(r.maxQty),
                discountPercentage: Number(r.discountPercentage),
              })) || [],
            });
            setSimQty(Number(product.minQuantity) || (tiers[0]?.quantity ?? 100));
          }
        }
      } catch (e) {
        console.error('Error cargando producto:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, isNew, token, reset]);

  // Import attribute from master library
  const handleImportMasterAttribute = (masterAttr: any) => {
    const newAttr: ProductAttribute = {
      attributeId: masterAttr.code || `ATTR_${Date.now()}`,
      name: masterAttr.name,
      group: masterAttr.group || 'General',
      values: masterAttr.values.map((v: any) => ({
        valueId: v.valueCode || `VAL_${Date.now()}`,
        label: v.label,
        priceModifier: v.defaultPriceModifier || 0,
        weightModifier: v.defaultWeightModifier || 0,
        daysModifier: v.defaultDaysModifier || 0,
      }))
    };
    appendAttribute(newAttr);
    setShowMasterImportModal(false);
  };

  // Add a blank custom attribute
  const handleAddCustomAttribute = () => {
    appendAttribute({
      attributeId: `CUSTOM_${Date.now()}`,
      name: 'Nueva Variable Personalizada',
      group: 'Especificaciones',
      values: [
        { valueId: `VAL_1_${Date.now()}`, label: 'Opción Estándar', priceModifier: 0, weightModifier: 0, daysModifier: 0 },
        { valueId: `VAL_2_${Date.now()}`, label: 'Opción Premium', priceModifier: 5000, weightModifier: 0, daysModifier: 1 },
      ]
    });
  };

  // Save implementation with distinct publish or template mode
  const executeSave = async (data: ProductFormValues, publishNow: boolean) => {
    setValidationError(null);

    // Validate product name
    const trimmedName = (data.name || '').trim();
    if (!trimmedName) {
      setActiveTab('general');
      setValidationError('Por favor escribe el Nombre Comercial del producto en la pestaña "1. Datos Básicos".');
      return;
    }

    setSaving(true);
    try {
      // 1. Resolve fresh token
      let currentToken = token;
      if (auth.currentUser) {
        try {
          currentToken = await auth.currentUser.getIdToken(true);
        } catch (e) {
          console.warn('Error refreshing auth token:', e);
        }
      }

      if (!currentToken) {
        setValidationError('Debes iniciar sesión con tu cuenta de administrador para guardar o publicar productos.');
        setSaving(false);
        return;
      }

      // 2. Clean tiers
      const cleanTiers = (data.quantityTiers || [])
        .map(t => ({
          quantity: Number(t.quantity),
          price: Number(t.price),
          label: t.label || ''
        }))
        .filter(t => t.quantity > 0 && t.price >= 0)
        .sort((a, b) => a.quantity - b.quantity);

      // 3. Clean slug
      const generatedSlug = data.slug && data.slug.trim() !== '' 
        ? data.slug.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
        : trimmedName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || `producto-${Date.now()}`;

      // 4. Resolve category
      const chosenCatId = Number(data.categoryId) || (categories[0]?.id ? Number(categories[0].id) : 1);

      const payload = {
        name: trimmedName,
        slug: generatedSlug,
        description: data.description || '',
        categoryId: chosenCatId,
        basePrice: cleanTiers.length > 0 ? cleanTiers[0].price : (Number(data.basePrice) || 0),
        baseQuantity: cleanTiers.length > 0 ? cleanTiers[0].quantity : (Number(data.baseQuantity) || 1),
        minQuantity: cleanTiers.length > 0 ? cleanTiers[0].quantity : (Number(data.minQuantity) || 1),
        quantityStep: Number(data.quantityStep) || 1,
        setupFee: Number(data.setupFee) || 0,
        pricingMode: data.pricingMode || (cleanTiers.length > 0 ? 'tiered_fixed' : 'prorated'),
        imageUrl: data.imageUrl || (data.images && data.images[0]) || '',
        images: data.images && data.images.length > 0 ? data.images : (data.imageUrl ? [data.imageUrl] : []),
        isActive: publishNow,
        isFeatured: Boolean(data.isFeatured),
        isPromo: Boolean(data.isPromo),
        discountPercentage: Number(data.discountPercentage || 0),
        promoBadge: data.promoBadge || '',
        promoDescription: data.promoDescription || '',
        quantityTiers: cleanTiers,
        extraConfig: {
          quantityTiers: cleanTiers,
          isTemplate: !publishNow,
          savedAsTemplateAt: !publishNow ? new Date().toISOString() : undefined,
          isFeatured: Boolean(data.isFeatured),
          isPromo: Boolean(data.isPromo),
          discountPercentage: Number(data.discountPercentage || 0),
          promoDiscountPercentage: Number(data.discountPercentage || 0),
          promoBadge: data.promoBadge || '',
          promoDescription: data.promoDescription || '',
        },
        attributes: (data.attributes || []).map(a => ({
          attributeId: a.attributeId,
          name: a.name,
          group: a.group,
          values: (a.values || []).map(v => ({
            valueId: v.valueId,
            label: v.label,
            priceModifier: Number(v.priceModifier) || 0,
            weightModifier: Number(v.weightModifier) || 0,
            daysModifier: Number(v.daysModifier) || 0,
          }))
        })),
        pricingRules: (data.pricingRules || []).map(r => ({
          minQty: Number(r.minQty) || 1,
          maxQty: Number(r.maxQty) || 999999,
          discountPercentage: Number(r.discountPercentage) || 0,
        }))
      };

      const url = isNew ? '/api/admin/catalog/product' : `/api/admin/catalog/product/${numericId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // If saved as template, also register in custom local templates for fast reuse
        if (!publishNow) {
          try {
            const customTpls = JSON.parse(localStorage.getItem('custom_product_templates') || '[]');
            const templateObj = {
              id: `custom-tpl-${Date.now()}`,
              name: trimmedName,
              category: categories.find(c => c.id.toString() === chosenCatId.toString())?.name || 'General',
              categoryId: chosenCatId.toString(),
              description: data.description || '',
              basePrice: payload.basePrice,
              baseQuantity: payload.baseQuantity,
              minQuantity: payload.minQuantity,
              quantityStep: payload.quantityStep,
              setupFee: payload.setupFee,
              pricingMode: payload.pricingMode,
              imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?auto=format&fit=crop&w=800&q=80',
              quantityTiers: cleanTiers,
              attributes: payload.attributes,
              savedAt: new Date().toISOString()
            };
            const filtered = customTpls.filter((t: any) => t.name !== templateObj.name);
            filtered.unshift(templateObj);
            localStorage.setItem('custom_product_templates', JSON.stringify(filtered.slice(0, 30)));
          } catch (err) {
            console.error('Error saving local template:', err);
          }
        }

        setSaveNotification({
          type: publishNow ? 'publish' : 'template',
          title: publishNow ? '¡Producto Publicado!' : '¡Plantilla Guardada!',
          message: publishNow 
            ? 'El producto ya se encuentra activo y visible en la tienda para los clientes.' 
            : 'Se guardó como plantilla privada. No aparecerá en la tienda pública hasta que decidas publicarla.'
        });

        setTimeout(() => {
          navigate('/admin/catalog');
        }, 1100);
      } else {
        let errorMsg = 'Error en el servidor al guardar el producto.';
        try {
          const err = await res.json();
          errorMsg = err.message || errorMsg;
        } catch {
          const text = await res.text();
          if (text) errorMsg = text;
        }
        setValidationError(`Error al guardar: ${errorMsg}`);
      }
    } catch (e: any) {
      console.error('Error guardando producto:', e);
      const errMsg = e?.message || 'Error de conexión al guardar el producto';
      setValidationError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = () => {
    const values = getValues();
    executeSave(values, false);
  };

  const handleSaveAndPublish = () => {
    const values = getValues();
    executeSave(values, true);
  };

  const onSubmit = (data: ProductFormValues) => {
    const isCurrentlyActive = data.isActive !== undefined ? Boolean(data.isActive) : true;
    executeSave(data, isCurrentlyActive);
  };

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value);
  };

  // Live Simulator Calculation
  const simulationResult = useMemo(() => {
    const qty = Math.max(1, simQty || watchedMinQuantity);
    
    // Sum modifiers
    let sumModifiers = 0;
    let sumDays = 0;
    let sumWeight = 0;

    watchedAttributes.forEach((attr, idx) => {
      const selectedValIdx = simSelectedOptions[idx] ?? 0;
      const val = attr.values?.[selectedValIdx];
      if (val) {
        sumModifiers += Number(val.priceModifier) || 0;
        sumDays += Number(val.daysModifier) || 0;
        sumWeight += Number(val.weightModifier) || 0;
      }
    });

    const cleanTiers = (watchedTiers || []).filter(t => Number(t.quantity) > 0 && Number(t.price) >= 0);
    let baseSubtotal = 0;
    let isTierMatch = false;
    let matchedTierName = '';

    if (cleanTiers.length > 0) {
      const exact = cleanTiers.find(t => Number(t.quantity) === qty);
      if (exact) {
        baseSubtotal = Number(exact.price);
        isTierMatch = true;
        matchedTierName = exact.label || `${exact.quantity} unid.`;
      } else {
        const sorted = [...cleanTiers].sort((a, b) => a.quantity - b.quantity);
        const lower = sorted.filter(t => t.quantity <= qty).pop();
        const upper = sorted.find(t => t.quantity > qty);
        if (lower && !upper) {
          baseSubtotal = (lower.price / lower.quantity) * qty;
        } else if (lower && upper) {
          const ratio = (qty - lower.quantity) / (upper.quantity - lower.quantity);
          baseSubtotal = lower.price + (ratio * (upper.price - lower.price));
        } else {
          baseSubtotal = (sorted[0].price / sorted[0].quantity) * qty;
        }
      }
    } else {
      const unitBase = watchedBasePrice / watchedBaseQuantity;
      baseSubtotal = (Number(watchedSetupFee) || 0) + (unitBase * qty);
    }

    const unitModifier = sumModifiers / watchedBaseQuantity;
    const modifiersTotal = unitModifier * qty;
    const rawSubtotal = baseSubtotal + modifiersTotal;

    // Apply rule discount if any and not matched to an exact fixed tier
    let discountPct = 0;
    if (!isTierMatch) {
      for (const rule of watchedRules) {
        if (qty >= rule.minQty && qty <= rule.maxQty) {
          if (rule.discountPercentage > discountPct) {
            discountPct = Number(rule.discountPercentage);
          }
        }
      }
    }

    const discountAmount = rawSubtotal * (discountPct / 100);
    const subtotalAfterDiscount = rawSubtotal - discountAmount;
    const iva = subtotalAfterDiscount * 0.19;
    const total = subtotalAfterDiscount + iva;

    return {
      qty,
      unitPriceNet: subtotalAfterDiscount / qty,
      itemsSubtotal: rawSubtotal,
      setupFee: Number(watchedSetupFee) || 0,
      sumModifiers,
      rawSubtotal,
      discountPct,
      discountAmount,
      subtotalAfterDiscount,
      iva,
      total,
      sumDays,
      isTierMatch,
      matchedTierName,
      totalWeightGrams: (sumWeight / watchedBaseQuantity) * qty,
    };
  }, [simQty, watchedBasePrice, watchedBaseQuantity, watchedMinQuantity, watchedSetupFee, watchedAttributes, watchedRules, watchedTiers, simSelectedOptions]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin text-teal-600 mx-auto mb-3">
          <Sparkles size={32} />
        </div>
        <p className="text-slate-500 font-bold">Cargando constructor de producto...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Save Notification Toast / Banner */}
      {saveNotification && (
        <div className={`p-5 rounded-2xl flex items-center justify-between border shadow-lg animate-fade-in ${
          saveNotification.type === 'publish'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-indigo-50 border-indigo-200 text-indigo-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              saveNotification.type === 'publish' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
            }`}>
              {saveNotification.type === 'publish' ? <Rocket size={20} /> : <Bookmark size={20} />}
            </div>
            <div>
              <h4 className="font-black text-sm">{saveNotification.title}</h4>
              <p className="text-xs opacity-90">{saveNotification.message}</p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-white/80 rounded-lg">Redirigiendo al catálogo...</span>
        </div>
      )}

      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <Link 
            to="/admin/catalog" 
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isNew ? 'Constructor de Producto & Parámetros' : `Editar: ${watchedName || 'Producto'}`}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Configura variables, escalas de cantidad, precios prorrateados y opciones de publicación.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action 1: Save as Template / Draft */}
          <button
            type="button"
            onClick={handleSaveAsTemplate}
            disabled={saving}
            className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 border border-slate-200 px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Guardar como plantilla base reutilizable (no se publica en tienda)"
          >
            <Bookmark size={16} className="text-indigo-600" />
            {saving ? 'Guardando...' : 'Guardar como Plantilla'}
          </button>

          {/* Action 2: Save as Product & Publish Immediately */}
          <button
            type="button"
            onClick={handleSaveAndPublish}
            disabled={saving}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-xs shadow-md shadow-teal-500/25 transition-all active:scale-95 disabled:opacity-50"
            title="Guardar y dejar activo en la tienda online para compras inmediatas"
          >
            <Rocket size={16} />
            {saving ? 'Guardando...' : 'Guardar y Publicar'}
          </button>
        </div>
      </div>

      {/* Main Grid: Form Layout (Left) + Live Simulator Sandbox (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Form & Configuration Tabs (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Validation or API Error Banner */}
          {validationError && (
            <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl flex items-start gap-3 text-rose-900 animate-fade-in shadow-sm">
              <AlertCircle size={20} className="text-rose-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="font-extrabold text-sm block">Atención: No se pudo completar la acción</span>
                <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">{validationError}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setValidationError(null)}
                className="text-rose-400 hover:text-rose-700 p-1"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Tab Selection */}
          <div className="bg-slate-200/70 p-1.5 rounded-2xl flex gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs whitespace-nowrap flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'general' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag size={15} className={activeTab === 'general' ? 'text-teal-600' : ''} />
              1. Datos Básicos
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tiers')}
              className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs whitespace-nowrap flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'tiers' ? 'bg-white text-teal-900 shadow-sm border border-teal-200/50' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={15} className={activeTab === 'tiers' ? 'text-teal-600' : ''} />
              2. Escala de Cantidades ({watchedTiers.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs whitespace-nowrap flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'pricing' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign size={15} className={activeTab === 'pricing' ? 'text-teal-600' : ''} />
              3. Prorrateo & Mínimos
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs whitespace-nowrap flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'matrix' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders size={15} className={activeTab === 'matrix' ? 'text-teal-600' : ''} />
              4. Variables ({watchedAttributes.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('discounts')}
              className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs whitespace-nowrap flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'discounts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Percent size={15} className={activeTab === 'discounts' ? 'text-teal-600' : ''} />
              5. Descuentos ({watchedRules.length})
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* TAB 1: DATOS BÁSICOS & IMAGEN */}
            {activeTab === 'general' && (
              <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6 animate-fade-in">
                <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Información General del Producto</h3>
                    <p className="text-xs text-slate-500">Nombre, slug para la tienda y categorización comercial.</p>
                  </div>
                </div>

                {/* Status Selector: Guardar como Plantilla vs Publicar en Tienda */}
                <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                    Modo de Guardado & Estado de Publicación:
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Controller
                      control={control}
                      name="isActive"
                      render={({ field }) => (
                        <>
                          {/* Option 1: Live in Store */}
                          <div
                            onClick={() => field.onChange(true)}
                            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                              field.value !== false
                                ? 'bg-emerald-50/80 border-emerald-500 shadow-sm text-emerald-950'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                              field.value !== false ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                            }`}>
                              {field.value !== false ? <Check size={14} /> : ''}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 font-black text-xs">
                                <Rocket size={14} className="text-emerald-600" />
                                <span>Guardar y Publicar de una vez</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                Visible de inmediato en el catálogo de la tienda para que los clientes coticen y hagan pedidos.
                              </p>
                            </div>
                          </div>

                          {/* Option 2: Saved as Template */}
                          <div
                            onClick={() => field.onChange(false)}
                            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                              field.value === false
                                ? 'bg-indigo-50/80 border-indigo-500 shadow-sm text-indigo-950'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                              field.value === false ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                            }`}>
                              {field.value === false ? <Check size={14} /> : ''}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 font-black text-xs">
                                <Bookmark size={14} className="text-indigo-600" />
                                <span>Guardar como Plantilla</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                Queda guardado como modelo base privado. No se publica en la tienda pública hasta que lo decidas.
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Nombre Comercial del Producto *
                    </label>
                    <input
                      {...register('name', { required: true })}
                      placeholder="Ej. Tarjetas Personales Premium, Pendón Roll-Up 80x200..."
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-900 text-base"
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      URL Slug (Identificador) *
                    </label>
                    <input
                      {...register('slug', { required: true })}
                      placeholder="ej-tarjetas-personales"
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-slate-700 text-sm"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Categoría en Catálogo *
                      </label>
                      <Link 
                        to="/admin/catalog?tab=categories" 
                        target="_blank" 
                        className="text-teal-600 hover:text-teal-700 font-bold text-[11px] hover:underline flex items-center gap-1"
                        title="Abrir Gestor de Categorías en nueva pestaña"
                      >
                        <span>+ Gestionar Categorías</span>
                        <ExternalLink size={11} />
                      </Link>
                    </div>
                    <select
                      {...register('categoryId')}
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-800 text-sm bg-white"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Descripción Detallada / Usos
                    </label>
                    <textarea
                      {...register('description')}
                      rows={4}
                      placeholder="Describe el producto, aplicaciones ideales, tiempos de entrega y recomendaciones de diseño..."
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 text-sm"
                    />
                  </div>

                  {/* Image URL & AI Assistant */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Fotografía del Producto (URL)
                    </label>
                    <div className="flex gap-3">
                      <input
                        {...register('imageUrl')}
                        placeholder="https://images.unsplash.com/..."
                        className="flex-1 px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-slate-700 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAiModal(true)}
                        className="px-5 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md hover:opacity-90"
                      >
                        <Sparkles size={16} />
                        Estudio IA
                      </button>
                    </div>
                  </div>
                </div>

                {/* Marketing: Destacados & Promociones */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Star size={18} className="fill-amber-500 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">Vitrina de Inicio, Destacados & Promociones</h4>
                      <p className="text-xs text-slate-500">Configura si este producto aparece en la sección de Destacados de la Home o con descuento activo.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Toggle: Destacado en Inicio */}
                    <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200/80 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="isFeatured"
                        {...register('isFeatured')}
                        className="mt-1 w-5 h-5 rounded-md text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer"
                      />
                      <label htmlFor="isFeatured" className="cursor-pointer flex-1">
                        <div className="flex items-center gap-1.5 font-black text-xs text-amber-950">
                          <Star size={14} className="fill-amber-500 text-amber-500" />
                          <span>Producto Destacado en Inicio</span>
                        </div>
                        <p className="text-[11px] text-amber-800/80 mt-1 leading-snug">
                          Aparece en la cuadrícula de "⭐ Productos Destacados" en la página principal con distintivo dorado.
                        </p>
                      </label>
                    </div>

                    {/* Toggle: Promoción Activa */}
                    <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-200/80 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="isPromo"
                        {...register('isPromo')}
                        className="mt-1 w-5 h-5 rounded-md text-rose-600 focus:ring-rose-500 border-rose-300 cursor-pointer"
                      />
                      <label htmlFor="isPromo" className="cursor-pointer flex-1">
                        <div className="flex items-center gap-1.5 font-black text-xs text-rose-950">
                          <Flame size={14} className="fill-rose-500 text-rose-500" />
                          <span>Activar Promoción & Descuento</span>
                        </div>
                        <p className="text-[11px] text-rose-800/80 mt-1 leading-snug">
                          Aplica rebaja porcentual automática al precio base y muestra badge de oferta en el catálogo.
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Detalle de Descuento (Si está activado o para configurarlo) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        % Descuento Promocional
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="90"
                          step="1"
                          {...register('discountPercentage', { valueAsNumber: true })}
                          placeholder="Ej. 15"
                          className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-slate-900 font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <span className="text-xs font-black text-slate-400">%</span>
                      </div>
                      <div className="flex gap-1 mt-1.5">
                        {[10, 15, 20, 30].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              setValue('discountPercentage', pct);
                              setValue('isPromo', true);
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600"
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Etiqueta del Badge
                      </label>
                      <input
                        type="text"
                        {...register('promoBadge')}
                        placeholder="Ej. 15% OFF, OFERTA, 2x1..."
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-slate-900 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Texto corto que aparecerá sobre la foto.</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Motivo / Descripción de la Oferta
                      </label>
                      <input
                        type="text"
                        {...register('promoDescription')}
                        placeholder="Ej. Descuento por tiraje en pliego..."
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Explicación visible al cotizar.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ESCALA DE CANTIDADES & PRECIOS FIJOS (MATRIZ POR CANTIDAD) */}
            {activeTab === 'tiers' && (
              <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-black text-sm">
                        <Layers size={18} />
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900">Escala de Cantidades y Precios Fijos</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Define paquetes cerrados de cantidad con su precio neto exacto (ej. 100u: $66.000, 200u: $92.000, 500u: $121.000).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => appendTier({ quantity: 1000, price: 155000, label: 'Opción' })}
                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Plus size={15} /> Agregar Cantidad
                  </button>
                </div>

                {/* Plantillas / Presets rápidos */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                  <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block">
                    Cargar Escala Rápida Recomendada (1 Clic):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        replaceTiers([
                          { quantity: 100, price: 66000, label: 'Básico' },
                          { quantity: 200, price: 92000, label: 'Recomendado' },
                          { quantity: 500, price: 121000, label: 'Más pedido' },
                          { quantity: 1000, price: 155000, label: 'Mejor precio' },
                          { quantity: 2000, price: 260000, label: 'Mayorista' },
                          { quantity: 5000, price: 520000, label: 'Corporativo' }
                        ]);
                        setValue('minQuantity', 100);
                        setValue('baseQuantity', 1000);
                        setValue('basePrice', 155000);
                        setSimQty(100);
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:border-teal-500 hover:text-teal-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                    >
                      Tarjetas (100: $66k, 200: $92k, 500: $121k, 1k: $155k...)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        replaceTiers([
                          { quantity: 500, price: 95000, label: 'Económico' },
                          { quantity: 1000, price: 140000, label: 'Más pedido' },
                          { quantity: 2500, price: 280000, label: 'Excelente valor' },
                          { quantity: 5000, price: 480000, label: 'Ahorro' },
                          { quantity: 10000, price: 850000, label: 'Mayorista' }
                        ]);
                        setValue('minQuantity', 500);
                        setValue('baseQuantity', 1000);
                        setValue('basePrice', 140000);
                        setSimQty(500);
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:border-teal-500 hover:text-teal-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                    >
                      Volantes 1/2 Carta (500: $95k, 1k: $140k, 2.5k: $280k...)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        replaceTiers([
                          { quantity: 100, price: 280000, label: 'Mínimo' },
                          { quantity: 250, price: 450000, label: 'Recomendado' },
                          { quantity: 500, price: 720000, label: 'Más pedido' },
                          { quantity: 1000, price: 1200000, label: 'Mejor precio' }
                        ]);
                        setValue('minQuantity', 100);
                        setValue('baseQuantity', 500);
                        setValue('basePrice', 720000);
                        setSimQty(100);
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:border-teal-500 hover:text-teal-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                    >
                      Carpetas con Bolsillo (100: $280k, 250: $450k, 500: $720k...)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        replaceTiers([
                          { quantity: 250, price: 45000, label: 'Prueba' },
                          { quantity: 500, price: 75000, label: 'Estándar' },
                          { quantity: 1000, price: 110000, label: 'Más pedido' },
                          { quantity: 2500, price: 220000, label: 'Mejor valor' },
                          { quantity: 5000, price: 390000, label: 'Mayorista' }
                        ]);
                        setValue('minQuantity', 250);
                        setValue('baseQuantity', 1000);
                        setValue('basePrice', 110000);
                        setSimQty(250);
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:border-teal-500 hover:text-teal-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                    >
                      Stickers / Adhesivos (250: $45k, 500: $75k, 1k: $110k...)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        replaceTiers([
                          { quantity: 5, price: 75000, label: 'Mínimo' },
                          { quantity: 10, price: 120000, label: 'Recomendado' },
                          { quantity: 20, price: 210000, label: 'Más pedido' },
                          { quantity: 50, price: 450000, label: 'Mayorista' }
                        ]);
                        setValue('minQuantity', 5);
                        setValue('baseQuantity', 10);
                        setValue('basePrice', 120000);
                        setSimQty(5);
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:border-teal-500 hover:text-teal-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                    >
                      Talonarios / Formatos (5: $75k, 10: $120k, 20: $210k, 50: $450k)
                    </button>
                  </div>
                </div>

                {/* Tabla de Escalas */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                        <th className="pb-3 pr-2">Cantidad (Unid.) *</th>
                        <th className="pb-3 px-2">Precio Total ($ COP) *</th>
                        <th className="pb-3 px-2">Costo Unitario Calculado</th>
                        <th className="pb-3 px-2">Etiqueta / Distintivo</th>
                        <th className="pb-3 px-2 text-center">Probar</th>
                        <th className="pb-3 pl-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tierFields.map((tierItem, tierIdx) => {
                        const rowQty = watch(`quantityTiers.${tierIdx}.quantity`) || 0;
                        const rowPrice = watch(`quantityTiers.${tierIdx}.price`) || 0;
                        const unitCost = rowQty > 0 ? Math.round(rowPrice / rowQty) : 0;

                        return (
                          <tr key={tierItem.id} className="group hover:bg-teal-50/30 transition-colors">
                            <td className="py-3 pr-2">
                              <input
                                type="number"
                                {...register(`quantityTiers.${tierIdx}.quantity` as const, { valueAsNumber: true, required: true })}
                                placeholder="100"
                                className="w-28 px-3.5 py-2 border border-slate-200 rounded-xl font-extrabold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                              />
                            </td>
                            <td className="py-3 px-2">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                  type="number"
                                  {...register(`quantityTiers.${tierIdx}.price` as const, { valueAsNumber: true, required: true })}
                                  placeholder="66000"
                                  className="w-36 pl-7 pr-3 py-2 border border-slate-200 rounded-xl font-extrabold text-teal-700 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                />
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <span className="font-extrabold text-slate-700 text-xs bg-slate-100 px-2.5 py-1 rounded-lg">
                                {formatCOP(unitCost)} / u
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <input
                                {...register(`quantityTiers.${tierIdx}.label` as const)}
                                placeholder="ej. Más pedido, Mejor precio..."
                                className="w-40 px-3 py-2 border border-slate-200 rounded-xl font-medium text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                              />
                            </td>
                            <td className="py-3 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => setSimQty(rowQty)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                  simQty === rowQty ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                Probar en Simulador
                              </button>
                            </td>
                            <td className="py-3 pl-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeTier(tierIdx)}
                                className="text-slate-300 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-colors"
                                title="Eliminar Escala"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {tierFields.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    No has agregado ninguna escala de precios. Haz clic en "Agregar Cantidad" o usa uno de los botones rápidos de arriba.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PRECIOS, MÍNIMOS & PRORRATEO */}
            {activeTab === 'pricing' && (
              <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-8 animate-fade-in">
                <div className="border-b border-slate-100 pb-4 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Estructura de Precios & Mínimos de Pedido</h3>
                    <p className="text-xs text-slate-500">
                      Define el precio base, la cantidad de referencia (ej. 1 millar o 1 unidad) y la cantidad mínima exigida.
                    </p>
                  </div>
                </div>

                {/* Quick Presets Bar */}
                <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-100 space-y-2">
                  <span className="text-xs font-extrabold text-teal-800 uppercase tracking-wider block">
                    ⚡ Presets Rápidos de Cantidad y Prorrateo:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setValue('baseQuantity', 1);
                        setValue('minQuantity', 1);
                        setValue('quantityStep', 1);
                        setSimQty(1);
                      }}
                      className="px-3.5 py-1.5 bg-white border border-teal-200 text-teal-700 rounded-xl text-xs font-bold hover:bg-teal-600 hover:text-white transition-colors"
                    >
                      Gran Formato (Desde 1 unidad)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValue('baseQuantity', 100);
                        setValue('minQuantity', 50);
                        setValue('quantityStep', 50);
                        setSimQty(100);
                      }}
                      className="px-3.5 py-1.5 bg-white border border-teal-200 text-teal-700 rounded-xl text-xs font-bold hover:bg-teal-600 hover:text-white transition-colors"
                    >
                      Carpetas / Cajas (Base 100u / Mín 50u)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValue('baseQuantity', 1000);
                        setValue('minQuantity', 100);
                        setValue('quantityStep', 100);
                        setSimQty(1000);
                      }}
                      className="px-3.5 py-1.5 bg-white border border-teal-200 text-teal-700 rounded-xl text-xs font-bold hover:bg-teal-600 hover:text-white transition-colors"
                    >
                      Tarjetas / Volantes (Base 1.000u / Mín 100u)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Base Price */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Precio Base ($ COP) *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="number"
                        {...register('basePrice', { valueAsNumber: true, required: true })}
                        placeholder="Ej. 35000"
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-extrabold text-teal-700 text-lg"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Precio de lista correspondiente a la Cantidad Base de referencia.
                    </span>
                  </div>

                  {/* Base Quantity */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Cantidad Base de Referencia (Prorrateo) *
                    </label>
                    <input
                      type="number"
                      {...register('baseQuantity', { valueAsNumber: true, required: true })}
                      placeholder="Ej. 1000"
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-extrabold text-slate-900 text-base"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Tarifa unitaria estimada: <strong className="text-teal-700">{formatCOP(watchedBasePrice / watchedBaseQuantity)}/u</strong>
                    </span>
                  </div>

                  {/* Min Quantity */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Cantidad Mínima Requerida (Mínimo) *
                    </label>
                    <input
                      type="number"
                      {...register('minQuantity', { valueAsNumber: true, required: true })}
                      placeholder="Ej. 100"
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-extrabold text-slate-900 text-base"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      El cliente en tienda no podrá ingresar una cantidad inferior a esta.
                    </span>
                  </div>

                  {/* Quantity Step */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Paso de Incremento (Step) *
                    </label>
                    <input
                      type="number"
                      {...register('quantityStep', { valueAsNumber: true, required: true })}
                      placeholder="Ej. 50"
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-extrabold text-slate-900 text-base"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Incrementos permitidos al subir con flechas o selector (ej. +50, +100).
                    </span>
                  </div>

                  {/* Setup Fee */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Costo Fijo de Montaje / Placas / Setup ($ COP)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="number"
                        {...register('setupFee', { valueAsNumber: true })}
                        placeholder="0"
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-extrabold text-slate-800 text-base"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Costo fijo que se cobra una sola vez por tirada de producción sin importar la cantidad.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MATRIZ DE VARIABLES & INSUMOS */}
            {activeTab === 'matrix' && (
              <div className="space-y-6 animate-fade-in">
                {/* Header Action Bar */}
                <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Matriz de Variables & Acabados</h3>
                    <p className="text-xs text-slate-500">
                      Agrega papeles, plastificados, tintas y formatos específicos para este producto.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowMasterImportModal(true)}
                      className="flex-1 sm:flex-initial bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <Sliders size={16} />
                      Importar de Biblioteca
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomAttribute}
                      className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Plus size={16} />
                      Variable Nueva
                    </button>
                  </div>
                </div>

                {/* Attributes List */}
                {attributeFields.length === 0 ? (
                  <div className="bg-white rounded-[32px] p-12 text-center border border-slate-100 shadow-sm">
                    <Layers className="mx-auto text-slate-300 mb-3" size={36} />
                    <h4 className="text-base font-extrabold text-slate-800">No hay variables configuradas</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Importa variables desde la biblioteca maestra o crea una personalizada para dar opciones a tus clientes.
                    </p>
                  </div>
                ) : (
                  attributeFields.map((attrField, attrIdx) => (
                    <AttributeBlock
                      key={attrField.id}
                      control={control}
                      register={register}
                      attributeIndex={attrIdx}
                      onRemove={() => removeAttribute(attrIdx)}
                      formatCOP={formatCOP}
                      baseQuantity={watchedBaseQuantity}
                    />
                  ))
                )}
              </div>
            )}

            {/* TAB 4: REGLAS DE DESCUENTO POR VOLUMEN */}
            {activeTab === 'discounts' && (
              <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6 animate-fade-in">
                <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Escala de Descuentos por Cantidad</h3>
                    <p className="text-xs text-slate-500">
                      Aplica porcentajes automáticos de descuento cuando el cliente pide tirajes más grandes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => appendRule({ minQty: 1000, maxQty: 5000, discountPercentage: 10 })}
                    className="bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-2"
                  >
                    <Plus size={15} /> Agregar Tramo
                  </button>
                </div>

                {ruleFields.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">
                    No hay reglas de descuento por volumen asignadas.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="pb-3">Desde Cantidad</th>
                          <th className="pb-3">Hasta Cantidad</th>
                          <th className="pb-3">% Descuento</th>
                          <th className="pb-3 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ruleFields.map((rule, rIdx) => (
                          <tr key={rule.id}>
                            <td className="py-3 pr-2">
                              <input
                                type="number"
                                {...register(`pricingRules.${rIdx}.minQty` as const, { valueAsNumber: true })}
                                className="w-32 px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                              />
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                {...register(`pricingRules.${rIdx}.maxQty` as const, { valueAsNumber: true })}
                                className="w-32 px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                              />
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  {...register(`pricingRules.${rIdx}.discountPercentage` as const, { valueAsNumber: true })}
                                  className="w-20 px-3 py-2 border border-teal-300 rounded-xl font-extrabold text-teal-700 text-xs"
                                />
                                <span className="font-bold text-slate-500">%</span>
                              </div>
                            </td>
                            <td className="py-3 pl-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeRule(rIdx)}
                                className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Form Footer Action Bar */}
            <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
                <span>Configuración lista para guardar como plantilla o publicar en tienda</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveAsTemplate}
                  disabled={saving}
                  className="flex-1 sm:flex-initial px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  title="Guardar modelo como plantilla privada"
                >
                  <Bookmark size={15} className="text-indigo-600" />
                  {saving ? 'Guardando...' : 'Guardar como Plantilla'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndPublish}
                  disabled={saving}
                  className="flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 font-extrabold text-xs text-white shadow-md shadow-teal-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  title="Guardar y activar en la tienda inmediatamente"
                >
                  <Rocket size={15} />
                  {saving ? 'Guardando...' : 'Guardar y Publicar'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Live Quoter Sandbox Simulator (4 cols) */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white p-6 rounded-[32px] shadow-xl border border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  <Calculator size={18} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Simulador en Vivo</h4>
                  <span className="text-[10px] text-teal-400 block font-medium">Cotizador de Prueba en Tiempo Real</span>
                </div>
              </div>
            </div>

            {/* Quantity Slider / Input */}
            <div className="space-y-2 mb-5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-semibold">Cantidad a Probar:</span>
                <div className="flex items-center gap-1.5">
                  {simulationResult.isTierMatch && (
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border border-emerald-500/30">
                      Escala: {simulationResult.matchedTierName}
                    </span>
                  )}
                  <span className="font-extrabold text-teal-400 text-sm">
                    {simulationResult.qty.toLocaleString('es-CO')} unid.
                  </span>
                </div>
              </div>

              {/* Botones de acceso directo a las escalas configuradas */}
              {watchedTiers && watchedTiers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 pb-1">
                  {watchedTiers.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSimQty(Number(t.quantity))}
                      className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg transition-all ${
                        simQty === Number(t.quantity)
                          ? 'bg-teal-500 text-slate-950 shadow-sm scale-102'
                          : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                      }`}
                    >
                      {t.quantity}u {t.label ? `(${t.label})` : ''}
                    </button>
                  ))}
                </div>
              )}

              <input
                type="range"
                min={watchedMinQuantity}
                max={Math.max(watchedMinQuantity * 10, 5000)}
                step={watch('quantityStep') || 1}
                value={simQty}
                onChange={(e) => setSimQty(Number(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Mín: {watchedMinQuantity}</span>
                <span>Base: {watchedBaseQuantity}</span>
                <span>Máx: {Math.max(watchedMinQuantity * 10, 5000)}</span>
              </div>
            </div>

            {/* Active Variables Selector in Simulator */}
            {watchedAttributes.length > 0 && (
              <div className="space-y-3 mb-5 border-t border-slate-700/80 pt-4">
                <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider block">
                  Probar Opciones:
                </span>
                {watchedAttributes.map((attr, aIdx) => (
                  <div key={aIdx} className="space-y-1">
                    <label className="text-[11px] text-slate-300 font-medium block truncate">{attr.name}</label>
                    <select
                      value={simSelectedOptions[aIdx] ?? 0}
                      onChange={(e) => setSimSelectedOptions({ ...simSelectedOptions, [aIdx]: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-teal-400"
                    >
                      {attr.values?.map((val, vIdx) => (
                        <option key={vIdx} value={vIdx}>
                          {val.label} {val.priceModifier ? `(+${formatCOP(val.priceModifier)})` : '($0)'}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Calculation Breakdown */}
            <div className="space-y-2 border-t border-slate-700/80 pt-4 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Tarifa Unitaria Prorrateada:</span>
                <span className="font-mono">{formatCOP(simulationResult.unitPriceNet)}/u</span>
              </div>

              {simulationResult.setupFee > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Costo Fijo de Montaje:</span>
                  <span className="font-mono">+{formatCOP(simulationResult.setupFee)}</span>
                </div>
              )}

              {simulationResult.discountPct > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Descuento ({simulationResult.discountPct}%):</span>
                  <span className="font-mono">-{formatCOP(simulationResult.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-300">
                <span>Subtotal Neto:</span>
                <span className="font-mono">{formatCOP(simulationResult.subtotalAfterDiscount)}</span>
              </div>

              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>IVA (19%):</span>
                <span className="font-mono">{formatCOP(simulationResult.iva)}</span>
              </div>

              {/* TOTAL */}
              <div className="pt-3 border-t border-slate-700/80 flex justify-between items-center">
                <span className="font-black text-sm text-white">TOTAL ESTIMADO:</span>
                <span className="font-black text-xl text-teal-400">
                  {formatCOP(simulationResult.total)}
                </span>
              </div>
            </div>

            {/* Lead time badge */}
            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-teal-400" /> Días de producción:
              </span>
              <span className="font-bold text-white">3 + {simulationResult.sumDays} días</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Importar de Biblioteca Maestra */}
      {showMasterImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[32px] p-6 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Importar Variable desde Biblioteca</h3>
                <p className="text-xs text-slate-500">Selecciona qué insumo o característica deseas añadir a este producto.</p>
              </div>
              <button 
                onClick={() => setShowMasterImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 space-y-3">
              {masterAttributes.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No hay variables en la biblioteca maestra.
                </div>
              ) : (
                masterAttributes.map((mAttr) => (
                  <div 
                    key={mAttr.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 transition-all flex justify-between items-center group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-teal-100 text-teal-800 text-[10px] font-extrabold px-2 py-0.5 rounded-lg uppercase">
                          {mAttr.group || 'Variable'}
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-900">{mAttr.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Opciones ({mAttr.values.length}): {mAttr.values.map((v: any) => v.label).join(', ')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleImportMasterAttribute(mAttr)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-sm"
                    >
                      Importar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Image Generation Studio Modal */}
      {showAiModal && (
        <AdminProductAiImageModal
          isOpen={showAiModal}
          productName={watchedName}
          categoryName="Material Impreso"
          onClose={() => setShowAiModal(false)}
          onSelectImage={(url) => {
            setValue('imageUrl', url);
            const currentImgs = watch('images') || [];
            if (!currentImgs.includes(url)) {
              setValue('images', [url, ...currentImgs]);
            }
            setShowAiModal(false);
          }}
        />
      )}
    </div>
  );
}

// Subcomponent: Individual Attribute Block with options table
function AttributeBlock({ control, register, attributeIndex, onRemove, formatCOP, baseQuantity }: any) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `attributes.${attributeIndex}.values`,
  });

  return (
    <div className="bg-white rounded-[28px] p-6 border border-slate-200 shadow-sm space-y-4">
      {/* Attribute Header */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 font-bold flex items-center justify-center text-sm">
            {attributeIndex + 1}
          </div>
          <input
            {...register(`attributes.${attributeIndex}.name` as const, { required: true })}
            placeholder="Nombre de la Variable (ej. Sustrato / Papel)"
            className="font-extrabold text-base text-slate-900 border-b border-transparent focus:border-teal-500 focus:outline-none px-2 py-1 rounded bg-transparent flex-1"
          />
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
          title="Eliminar Variable"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Values Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="pb-2">Opción / Insumo</th>
              <th className="pb-2">Modificador Base ($ COP)</th>
              <th className="pb-2">Impacto Unitario</th>
              <th className="pb-2">Días Adic.</th>
              <th className="pb-2">Peso (g)</th>
              <th className="pb-2 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fields.map((item, valIdx) => (
              <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="py-2.5 pr-2">
                  <input
                    {...register(`attributes.${attributeIndex}.values.${valIdx}.label` as const, { required: true })}
                    placeholder="Ej. Propalcote 300g"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:outline-none focus:border-teal-500"
                  />
                </td>
                <td className="py-2.5 px-2">
                  <input
                    type="number"
                    {...register(`attributes.${attributeIndex}.values.${valIdx}.priceModifier` as const, { valueAsNumber: true })}
                    className="w-28 px-3 py-1.5 border border-slate-200 rounded-xl font-extrabold text-teal-700 text-xs focus:outline-none focus:border-teal-500"
                  />
                </td>
                <td className="py-2.5 px-2 text-slate-500 text-[11px] font-mono">
                  <Controller
                    control={control}
                    name={`attributes.${attributeIndex}.values.${valIdx}.priceModifier`}
                    render={({ field }) => {
                      const mod = Number(field.value) || 0;
                      const unitMod = mod / (baseQuantity || 1);
                      return <span>{unitMod !== 0 ? `${formatCOP(unitMod)}/u` : '$0'}</span>;
                    }}
                  />
                </td>
                <td className="py-2.5 px-2">
                  <input
                    type="number"
                    {...register(`attributes.${attributeIndex}.values.${valIdx}.daysModifier` as const, { valueAsNumber: true })}
                    className="w-16 px-2 py-1.5 border border-slate-200 rounded-xl font-medium text-slate-700 text-xs text-center focus:outline-none focus:border-teal-500"
                  />
                </td>
                <td className="py-2.5 px-2">
                  <input
                    type="number"
                    {...register(`attributes.${attributeIndex}.values.${valIdx}.weightModifier` as const, { valueAsNumber: true })}
                    className="w-16 px-2 py-1.5 border border-slate-200 rounded-xl font-medium text-slate-700 text-xs text-center focus:outline-none focus:border-teal-500"
                  />
                </td>
                <td className="py-2.5 pl-2 text-right">
                  <button
                    type="button"
                    onClick={() => remove(valIdx)}
                    className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add option button */}
      <div>
        <button
          type="button"
          onClick={() => append({ valueId: `val-${Date.now()}`, label: '', priceModifier: 0, weightModifier: 0, daysModifier: 0 })}
          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors border border-teal-200"
        >
          <Plus size={14} /> Agregar Opción
        </button>
      </div>
    </div>
  );
}
