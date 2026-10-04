import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Sparkles, 
  Check, 
  X, 
  Layers, 
  DollarSign, 
  Clock, 
  Scale, 
  FolderPlus,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  PackageCheck,
  Tag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../lib/firebase';

export interface MasterAttributeValue {
  id: number;
  label: string;
  valueCode: string;
  value?: string;
  defaultPriceModifier?: number;
  defaultDaysModifier?: number;
  defaultWeightModifier?: number;
}

export interface MasterAttribute {
  id: number;
  name: string;
  code: string;
  group: string;
  controlType: string;
  values: MasterAttributeValue[];
}

export interface MasterQuantityTierPreset {
  id: string;
  title: string;
  categoryName: string;
  defaultCategoryId: number;
  description: string;
  baseQuantity: number;
  minQuantity: number;
  tiers: { quantity: number; price: number; label?: string }[];
}

const MASTER_QUANTITY_PRESETS: MasterQuantityTierPreset[] = [
  {
    id: 'tarjetas-estandar',
    title: 'Tarjetas Personales Litográficas',
    categoryName: 'Material Impreso',
    defaultCategoryId: 1,
    description: 'Escala clásica de 100 a 5.000 unidades con tarifa fija decreciente.',
    baseQuantity: 1000,
    minQuantity: 100,
    tiers: [
      { quantity: 100, price: 66000, label: 'Básico' },
      { quantity: 200, price: 92000, label: 'Recomendado' },
      { quantity: 500, price: 121000, label: 'Más pedido' },
      { quantity: 1000, price: 155000, label: 'Mejor precio' },
      { quantity: 2000, price: 260000, label: 'Mayorista' },
      { quantity: 5000, price: 520000, label: 'Corporativo' }
    ]
  },
  {
    id: 'volantes-media-carta',
    title: 'Volantes Publicitarios (1/2 Carta)',
    categoryName: 'Material Impreso',
    defaultCategoryId: 1,
    description: 'Escala de alta rotación para publicidad masiva y volanteo.',
    baseQuantity: 1000,
    minQuantity: 500,
    tiers: [
      { quantity: 500, price: 95000, label: 'Económico' },
      { quantity: 1000, price: 140000, label: 'Más pedido' },
      { quantity: 2500, price: 280000, label: 'Excelente valor' },
      { quantity: 5000, price: 480000, label: 'Ahorro' },
      { quantity: 10000, price: 850000, label: 'Mayorista' }
    ]
  },
  {
    id: 'carpetas-corporativas',
    title: 'Carpetas de Presentación con Bolsillo',
    categoryName: 'Material Impreso',
    defaultCategoryId: 1,
    description: 'Carpetas troqueladas con bolsillo y ranura de tarjeta.',
    baseQuantity: 500,
    minQuantity: 100,
    tiers: [
      { quantity: 100, price: 280000, label: 'Mínimo' },
      { quantity: 250, price: 450000, label: 'Recomendado' },
      { quantity: 500, price: 720000, label: 'Más pedido' },
      { quantity: 1000, price: 1200000, label: 'Mejor precio' }
    ]
  },
  {
    id: 'stickers-adhesivos',
    title: 'Stickers & Etiquetas Adhesivas',
    categoryName: 'Material Impreso',
    defaultCategoryId: 1,
    description: 'Adhesivos en vinilo o papel con semicorte en hojas o individual.',
    baseQuantity: 1000,
    minQuantity: 250,
    tiers: [
      { quantity: 250, price: 45000, label: 'Prueba' },
      { quantity: 500, price: 75000, label: 'Estándar' },
      { quantity: 1000, price: 110000, label: 'Más pedido' },
      { quantity: 2500, price: 220000, label: 'Mejor valor' },
      { quantity: 5000, price: 390000, label: 'Mayorista' }
    ]
  },
  {
    id: 'talonarios-formas',
    title: 'Talonarios / Recibos / Cuentas',
    categoryName: 'Papelería Comercial',
    defaultCategoryId: 2,
    description: 'Talonarios numerados con copia química u original.',
    baseQuantity: 10,
    minQuantity: 5,
    tiers: [
      { quantity: 5, price: 75000, label: 'Mínimo' },
      { quantity: 10, price: 120000, label: 'Recomendado' },
      { quantity: 20, price: 210000, label: 'Más pedido' },
      { quantity: 50, price: 450000, label: 'Mayorista' }
    ]
  }
];

export default function MasterParametersTab() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [activeMainTab, setActiveMainTab] = useState<'variables' | 'quantity_scales'>('variables');

  const [attributes, setAttributes] = useState<MasterAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modales y estados de creación de atributos
  const [showAddAttrModal, setShowAddAttrModal] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrGroup, setNewAttrGroup] = useState('Sustrato');
  const [newAttrCode, setNewAttrCode] = useState('');

  // Estado de edición de valor
  const [editingValueId, setEditingValueId] = useState<number | null>(null);
  const [editValueForm, setEditValueForm] = useState<{
    label: string;
    valueCode: string;
    defaultPriceModifier: number;
    defaultDaysModifier: number;
    defaultWeightModifier: number;
  }>({
    label: '',
    valueCode: '',
    defaultPriceModifier: 0,
    defaultDaysModifier: 0,
    defaultWeightModifier: 0
  });

  // Estado para añadir valor a un atributo
  const [addingValueToAttrId, setAddingValueToAttrId] = useState<number | null>(null);
  const [newValueForm, setNewValueForm] = useState<{
    label: string;
    defaultPriceModifier: number;
    defaultDaysModifier: number;
    defaultWeightModifier: number;
  }>({
    label: '',
    defaultPriceModifier: 0,
    defaultDaysModifier: 0,
    defaultWeightModifier: 0
  });

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const getFreshToken = async (): Promise<string | null> => {
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken(true);
      } catch (e) {
        console.warn('Error refreshing token:', e);
      }
    }
    return token;
  };

  const fetchMasterAttributes = async () => {
    try {
      const activeToken = await getFreshToken();
      if (!activeToken) return;
      setLoading(true);
      const res = await fetch('/api/admin/catalog/master-attributes', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAttributes(data);
      }
    } catch (e) {
      console.error('Error cargando parámetros maestros:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterAttributes();
  }, [token]);

  const handleCreateAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttrName.trim()) return;
    setSaving(true);
    try {
      const activeToken = await getFreshToken();
      const res = await fetch('/api/admin/catalog/master-attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          name: newAttrName,
          group: newAttrGroup,
          code: newAttrCode || newAttrName.toUpperCase().replace(/[^A-Z0-9_]+/g, '_')
        })
      });
      if (res.ok) {
        setShowAddAttrModal(false);
        setNewAttrName('');
        setNewAttrCode('');
        await fetchMasterAttributes();
        showNotification('success', `Variable "${newAttrName}" creada y guardada correctamente.`);
      } else {
        const err = await res.json();
        showNotification('error', `Error al crear variable: ${err.message || 'Error en servidor'}`);
      }
    } catch (e) {
      console.error('Error creando variable:', e);
      showNotification('error', 'Error de red al guardar variable.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAttribute = async (id: number, name: string) => {
    try {
      const activeToken = await getFreshToken();
      const res = await fetch(`/api/admin/catalog/master-attributes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.ok) {
        await fetchMasterAttributes();
        showNotification('success', `Variable "${name}" eliminada.`);
      } else {
        const err = await res.json();
        showNotification('error', `No se pudo eliminar: ${err.message || 'Error en servidor'}`);
      }
    } catch (e) {
      console.error('Error eliminando variable:', e);
      showNotification('error', 'Error de red al eliminar variable.');
    }
  };

  const handleAddValue = async (attrId: number) => {
    if (!newValueForm.label.trim()) return;
    try {
      const activeToken = await getFreshToken();
      const res = await fetch(`/api/admin/catalog/master-attributes/${attrId}/values`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(newValueForm)
      });
      if (res.ok) {
        setAddingValueToAttrId(null);
        setNewValueForm({ label: '', defaultPriceModifier: 0, defaultDaysModifier: 0, defaultWeightModifier: 0 });
        await fetchMasterAttributes();
        showNotification('success', `Opción guardada y persistida.`);
      } else {
        const err = await res.json();
        showNotification('error', `Error al agregar opción: ${err.message || 'Error en servidor'}`);
      }
    } catch (e) {
      console.error('Error agregando valor:', e);
      showNotification('error', 'No se pudo guardar la opción.');
    }
  };

  const handleSaveEditValue = async (valId: number) => {
    try {
      const activeToken = await getFreshToken();
      const res = await fetch(`/api/admin/catalog/master-attributes/values/${valId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(editValueForm)
      });
      if (res.ok) {
        setEditingValueId(null);
        await fetchMasterAttributes();
        showNotification('success', 'Cambios guardados con éxito.');
      } else {
        const err = await res.json();
        showNotification('error', `Error al actualizar: ${err.message || 'Error en servidor'}`);
      }
    } catch (e) {
      console.error('Error actualizando valor:', e);
      showNotification('error', 'Error al guardar los cambios.');
    }
  };

  const handleDeleteValue = async (valId: number) => {
    try {
      const activeToken = await getFreshToken();
      const res = await fetch(`/api/admin/catalog/master-attributes/values/${valId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.ok) {
        await fetchMasterAttributes();
        showNotification('success', 'Opción eliminada.');
      } else {
        const err = await res.json();
        showNotification('error', `Error al eliminar: ${err.message || 'Error en servidor'}`);
      }
    } catch (e) {
      console.error('Error eliminando opción:', e);
      showNotification('error', 'Error de red al eliminar opción.');
    }
  };

  // Crear un producto directamente desde una escala de cantidad o plantilla de variables
  const handleCreateProductFromScale = (preset: MasterQuantityTierPreset) => {
    const template = {
      name: `Nuevo ${preset.title}`,
      categoryId: preset.defaultCategoryId || 1,
      basePrice: preset.tiers[0]?.price || 66000,
      baseQuantity: preset.baseQuantity || 1000,
      minQuantity: preset.minQuantity || 100,
      quantityStep: preset.tiers[0]?.quantity || 100,
      quantityTiers: preset.tiers,
      attributes: attributes.slice(0, 3).map(a => ({
        attributeId: a.code || `ATTR_${Date.now()}`,
        name: a.name,
        group: a.group,
        values: a.values.map(v => ({
          valueId: v.valueCode || `VAL_${Date.now()}`,
          label: v.label,
          priceModifier: v.defaultPriceModifier || 0,
          weightModifier: v.defaultWeightModifier || 0,
          daysModifier: v.defaultDaysModifier || 0,
        }))
      }))
    };

    sessionStorage.setItem('pending_product_template', JSON.stringify(template));
    navigate('/admin/catalog/builder');
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(val);
  };

  // Grupos únicos disponibles
  const availableGroups = Array.from(new Set(attributes.map(a => a.group || 'General'))).filter(Boolean);

  const filteredAttributes = attributes.filter(attr => {
    const matchesGroup = activeGroup === 'all' || attr.group === activeGroup;
    const matchesSearch = attr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attr.values.some(v => v.label.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesGroup && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-sm font-bold animate-fade-in shadow-md ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <Check size={18} className="text-emerald-600" />
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="p-1 hover:opacity-75">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="text-teal-600" size={24} />
            <h2 className="text-xl font-extrabold text-slate-900">Centro de Parámetros & Escalas de Precios</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona variables maestras (papeles, acabados) y escalas fijas por cantidad (100: $66k, 200: $92k, 500: $121k) para tus productos.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchMasterAttributes}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition-colors"
            title="Recargar datos"
          >
            <RefreshCw size={18} className={loading ? "animate-spin text-teal-600" : ""} />
          </button>
          <button
            onClick={() => setShowAddAttrModal(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 transition-transform active:scale-95 w-full md:w-auto"
          >
            <FolderPlus size={18} />
            Nueva Variable Maestra
          </button>
        </div>
      </div>

      {/* Main Switcher: Variables vs Escalas de Cantidad */}
      <div className="bg-slate-200/70 p-1.5 rounded-2xl flex gap-1 max-w-md">
        <button
          onClick={() => setActiveMainTab('variables')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeMainTab === 'variables' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders size={15} className={activeMainTab === 'variables' ? 'text-teal-600' : ''} />
          Variables & Acabados ({attributes.length})
        </button>

        <button
          onClick={() => setActiveMainTab('quantity_scales')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeMainTab === 'quantity_scales' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers size={15} className={activeMainTab === 'quantity_scales' ? 'text-teal-600' : ''} />
          Escalas de Cantidad & Precios ({MASTER_QUANTITY_PRESETS.length})
        </button>
      </div>

      {/* TAB 1: VARIABLES & ACABADOS MAESTROS */}
      {activeMainTab === 'variables' && (
        <div className="space-y-6 animate-fade-in">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="Buscar variable u opción (ej. Propalcote, Mate, 4x4, 9x5)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700 text-sm shadow-sm"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1">
              <button
                onClick={() => setActiveGroup('all')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-colors ${
                  activeGroup === 'all' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Todos ({attributes.length})
              </button>
              {availableGroups.map(grp => (
                <button
                  key={grp}
                  onClick={() => setActiveGroup(grp)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-colors ${
                    activeGroup === grp 
                      ? 'bg-teal-600 text-white shadow-sm' 
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>
          </div>

          {/* Attributes Grid */}
          {loading ? (
            <div className="py-16 text-center text-slate-400">Cargando biblioteca de parámetros...</div>
          ) : filteredAttributes.length === 0 ? (
            <div className="bg-white rounded-[28px] p-12 text-center border border-slate-100 shadow-sm">
              <AlertCircle className="mx-auto text-slate-300 mb-3" size={36} />
              <h3 className="text-base font-bold text-slate-700">No se encontraron variables</h3>
              <p className="text-xs text-slate-400 mt-1">Crea tu primera variable maestra usando el botón superior.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredAttributes.map((attr) => (
                <div 
                  key={attr.id}
                  className="bg-white rounded-[28px] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between"
                >
                  {/* Header */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="bg-teal-100 text-teal-700 text-xs font-extrabold px-3 py-1 rounded-xl uppercase tracking-wider">
                        {attr.group || 'Variable'}
                      </span>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base">{attr.name}</h3>
                        <span className="text-[11px] font-mono text-slate-400">Código: {attr.code}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeleteAttribute(attr.id, attr.name)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Eliminar Variable"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Options Table */}
                  <div className="p-5 flex-1 overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="pb-2">Opción / Insumo</th>
                          <th className="pb-2">Modificador Base</th>
                          <th className="pb-2">Días</th>
                          <th className="pb-2 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {attr.values.map((val) => {
                          const isEditing = editingValueId === val.id;

                          if (isEditing) {
                            return (
                              <tr key={val.id} className="bg-amber-50/60">
                                <td className="py-2 pr-2">
                                  <input
                                    type="text"
                                    value={editValueForm.label}
                                    onChange={(e) => setEditValueForm({ ...editValueForm, label: e.target.value })}
                                    className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-semibold"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    value={editValueForm.defaultPriceModifier}
                                    onChange={(e) => setEditValueForm({ ...editValueForm, defaultPriceModifier: Number(e.target.value) })}
                                    className="w-24 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-teal-700"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    value={editValueForm.defaultDaysModifier}
                                    onChange={(e) => setEditValueForm({ ...editValueForm, defaultDaysModifier: Number(e.target.value) })}
                                    className="w-16 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs"
                                  />
                                </td>
                                <td className="py-2 pl-2 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button
                                      onClick={() => handleSaveEditValue(val.id)}
                                      className="p-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                                      title="Guardar"
                                    >
                                      <Check size={14} />
                                    </button>
                                    <button
                                      onClick={() => setEditingValueId(null)}
                                      className="p-1 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                                      title="Cancelar"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={val.id} className="hover:bg-slate-50/60 transition-colors group">
                              <td className="py-2.5 font-bold text-slate-800 pr-2">
                                {val.label}
                                <span className="block text-[10px] font-mono text-slate-400 font-normal">
                                  {val.valueCode}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 font-extrabold text-teal-700">
                                {val.defaultPriceModifier && val.defaultPriceModifier > 0 
                                  ? `+${formatCOP(val.defaultPriceModifier)}` 
                                  : val.defaultPriceModifier && val.defaultPriceModifier < 0 
                                  ? `-${formatCOP(Math.abs(val.defaultPriceModifier))}`
                                  : '$0 (Estándar)'}
                              </td>
                              <td className="py-2.5 px-2 text-slate-500 font-medium">
                                {val.defaultDaysModifier ? `+${val.defaultDaysModifier} d` : '0 d'}
                              </td>
                              <td className="py-2.5 pl-2 text-right">
                                <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100">
                                  <button
                                    onClick={() => {
                                      setEditingValueId(val.id);
                                      setEditValueForm({
                                        label: val.label,
                                        valueCode: val.valueCode,
                                        defaultPriceModifier: val.defaultPriceModifier || 0,
                                        defaultDaysModifier: val.defaultDaysModifier || 0,
                                        defaultWeightModifier: val.defaultWeightModifier || 0
                                      });
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                    title="Editar Opción"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteValue(val.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar Opción"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Option Form / Button Footer */}
                  <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                    {addingValueToAttrId === attr.id ? (
                      <div className="bg-white p-3 rounded-2xl border border-teal-200 shadow-sm space-y-3">
                        <h5 className="font-extrabold text-xs text-teal-800">Agregar Opción a {attr.name}</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Nombre (ej. Kraft 300g)"
                            value={newValueForm.label}
                            onChange={(e) => setNewValueForm({ ...newValueForm, label: e.target.value })}
                            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 sm:col-span-2"
                          />
                          <input
                            type="number"
                            placeholder="Precio Base $"
                            value={newValueForm.defaultPriceModifier || ''}
                            onChange={(e) => setNewValueForm({ ...newValueForm, defaultPriceModifier: Number(e.target.value) })}
                            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-teal-700 focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setAddingValueToAttrId(null)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleAddValue(attr.id)}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                          >
                            Guardar Opción
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAddingValueToAttrId(attr.id);
                          setNewValueForm({ label: '', defaultPriceModifier: 0, defaultDaysModifier: 0, defaultWeightModifier: 0 });
                        }}
                        className="w-full py-2.5 rounded-2xl border border-dashed border-teal-300 text-teal-700 hover:bg-teal-50 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        <Plus size={14} />
                        Agregar Nueva Opción a este Grupo
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ESCALAS MAESTRAS DE CANTIDAD & PRECIOS */}
      {activeMainTab === 'quantity_scales' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-teal-900 text-white p-6 rounded-[28px] shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <PackageCheck className="text-teal-300" size={22} />
                <h3 className="font-extrabold text-lg text-white">Escalas de Precios Fijos por Cantidad</h3>
              </div>
              <p className="text-xs text-teal-200 mt-1 max-w-2xl">
                Estas escalas te permiten vender paquetes con precios exactos de litografía (ej. 100 tarjetas $66.000, 200 tarjetas $92.000, 500 tarjetas $121.000). Haz clic en "Crear Producto desde esta Escala" para empezar de inmediato.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MASTER_QUANTITY_PRESETS.map((preset) => (
              <div 
                key={preset.id}
                className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-teal-500/80 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="bg-teal-50 text-teal-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border border-teal-200/50">
                        {preset.categoryName}
                      </span>
                      <h4 className="text-lg font-extrabold text-slate-900 mt-2">{preset.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{preset.description}</p>
                    </div>
                  </div>

                  {/* Tabla de precios de la escala */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                      Paquetes Configurados:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {preset.tiers.map((t, tIdx) => {
                        const unit = Math.round(t.price / t.quantity);
                        return (
                          <div key={tIdx} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 block">{t.label || `${t.quantity} unids.`}</span>
                            <span className="text-xs font-black text-slate-900 block">{t.quantity.toLocaleString('es-CO')} u</span>
                            <span className="text-xs font-extrabold text-teal-700 block mt-0.5">{formatCOP(t.price)}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{formatCOP(unit)}/u</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">
                    Mínimo: <strong className="text-slate-900">{preset.minQuantity} u</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCreateProductFromScale(preset)}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    Crear Producto con esta Escala
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Nueva Variable Maestra */}
      {showAddAttrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[32px] p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center font-bold">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Nueva Variable Maestra</h3>
                  <p className="text-xs text-slate-500">Crear un grupo de insumos o características</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddAttrModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAttribute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre de la Variable
                </label>
                <input
                  type="text"
                  placeholder="Ej. Tipo de Plastificado, Gramaje de Papel, Tintas..."
                  value={newAttrName}
                  onChange={(e) => setNewAttrName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Grupo / Categoría de Insumo
                </label>
                <select
                  value={newAttrGroup}
                  onChange={(e) => setNewAttrGroup(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800 text-sm bg-white"
                >
                  <option value="Sustrato">Sustrato / Material / Papel</option>
                  <option value="Terminación">Terminación / Plastificado / Acabado</option>
                  <option value="Impresión">Impresión / Tintas / Caras</option>
                  <option value="Especificaciones">Especificaciones / Formato / Tamaño</option>
                  <option value="Troquel & Corte">Troquel & Corte</option>
                  <option value="Encuadernación">Encuadernación & Cierre</option>
                  <option value="General">Otro / General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Código Interno (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. TIPO_PLASTIFICADO"
                  value={newAttrCode}
                  onChange={(e) => setNewAttrCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]+/g, '_'))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-slate-800 text-sm uppercase"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddAttrModal(false)}
                  className="px-5 py-3 rounded-2xl text-slate-500 hover:bg-slate-100 font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-500/20 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Crear Variable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
