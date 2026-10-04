import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Package, 
  User, 
  X, 
  RefreshCw, 
  FileText, 
  Download, 
  Layers, 
  Calendar, 
  MapPin, 
  CheckCircle, 
  ExternalLink,
  Upload,
  Palette,
  Sparkles,
  Tag,
  ArrowRight,
  Eye,
  FileCheck
} from 'lucide-react';
import { ConnectedClientProject, ClientProjectItem } from './types';

interface ClientProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onSelectProject: (project: ConnectedClientProject) => void;
}

export default function ClientProjectModal({
  isOpen,
  onClose,
  token,
  onSelectProject,
}: ClientProjectModalProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'templates' | 'manual'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Orders
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<{ order: any; items: any[] } | null>(null);
  const [loadingDetailsId, setLoadingDetailsId] = useState<number | null>(null);

  // Templates / Design projects
  const [templatesList, setTemplatesList] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Manual project form
  const [manualClient, setManualClient] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualCity, setManualCity] = useState('Bogotá D.C.');
  const [manualJobName, setManualJobName] = useState('');
  const [manualProduct, setManualProduct] = useState('Tarjetas de Presentación');
  const [manualPaper, setManualPaper] = useState('Propalcote 300g Mate');
  const [manualFinishes, setManualFinishes] = useState('Plastificado Mate 2 Caras + Brillo UV Parcial');
  const [manualQty, setManualQty] = useState(1000);
  const [manualWidth, setManualWidth] = useState(90);
  const [manualHeight, setManualHeight] = useState(55);
  const [manualFileUrl, setManualFileUrl] = useState('');
  const [manualFileName, setManualFileName] = useState('');

  // Fetch orders when modal opens
  useEffect(() => {
    if (!isOpen || !token) return;

    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const res = await fetch('/api/admin/orders', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOrdersList(data);
        }
      } catch (e) {
        console.error('Error fetching orders:', e);
      } finally {
        setLoadingOrders(false);
      }
    };

    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const res = await fetch('/api/admin/templates', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTemplatesList(data);
        }
      } catch (e) {
        console.error('Error fetching templates:', e);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchOrders();
    fetchTemplates();
  }, [isOpen, token]);

  // Load detailed order info
  const handleInspectOrder = async (orderId: number) => {
    if (!token) return;
    setLoadingDetailsId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrderDetails(data);
      }
    } catch (e) {
      console.error('Error loading order details:', e);
    } finally {
      setLoadingDetailsId(null);
    }
  };

  // Convert an order & items into ConnectedClientProject
  const handleConfirmOrderImport = (orderData: any, selectedItemIdx: number = 0) => {
    const order = orderData.order || orderData;
    const rawItems = orderData.items || [];
    
    const formattedItems: ClientProjectItem[] = rawItems.map((it: any) => {
      const specs = it.specs || {};
      const paper = specs.Papel || specs.Material || specs.Sustrato || 'Propalcote 300g';
      const finishes = specs.Acabados ? (Array.isArray(specs.Acabados) ? specs.Acabados : [specs.Acabados]) : ['Plastificado Mate'];
      const inks = specs.Tintas || specs.Colores || '4x4 Tintas (Full Color)';
      const sides = specs.Caras || 'Dos Caras (Tiro y Retiro)';

      return {
        id: it.id,
        orderId: it.orderId || order.numericId || order.id,
        productId: it.productId,
        productName: it.productName || 'Producto Litográfico',
        productSlug: it.productSlug,
        productImage: it.productImage,
        quantity: it.quantity || 1000,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        highResPdfUrl: it.highResPdfUrl,
        previewImageUrl: it.previewImageUrl || it.productImage,
        secondaryFileUrl: it.secondaryFileUrl || it.previewImageUrl,
        fileType: it.fileType || 'PDF',
        notes: it.notes,
        specs: it.specs,
        paperType: paper,
        finishes: finishes,
        inks: inks,
        sides: sides,
      };
    });

    // If no items, generate placeholder item
    if (formattedItems.length === 0) {
      formattedItems.push({
        id: 1,
        productName: 'Impresión Comercial General',
        quantity: 1000,
        paperType: 'Propalcote 300g',
        finishes: ['Barniz UV'],
        inks: '4x4 CMYK',
        sides: 'Tiro y Retiro',
      });
    }

    const project: ConnectedClientProject = {
      id: order.code || `ORD-${order.id}`,
      orderNumericId: order.numericId || order.id,
      clientName: order.customerName || order.client || order.userEmail || 'Cliente Registrado',
      clientEmail: order.userEmail || order.email || '',
      clientPhone: order.customerPhone || order.phone || '',
      clientCity: order.customerCity || order.city || 'Colombia',
      clientAddress: order.customerAddress || '',
      clientNit: order.customerNit || 'C.C. / NIT Cliente',
      orderDate: order.date || (order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO')),
      orderStatus: order.status || 'PAGADO / EN PRODUCCIÓN',
      paymentStatus: order.paymentStatus || 'PAID',
      totalAmount: order.total || 0,
      internalNotes: order.internalNotes || '',
      items: formattedItems,
      selectedItemIndex: selectedItemIdx,
      activeSide: 'tiro',
    };

    onSelectProject(project);
    onClose();
  };

  // Convert template into ConnectedClientProject
  const handleConfirmTemplateImport = (tmpl: any) => {
    const canvasData = tmpl.canvasData || {};
    const item: ClientProjectItem = {
      id: tmpl.id,
      productName: tmpl.name || 'Diseño de Plantilla',
      quantity: 1000,
      paperType: 'Propalcote 300g',
      finishes: ['Plastificado Mate'],
      inks: '4x4 CMYK',
      sides: 'Tiro y Retiro',
      previewImageUrl: canvasData.previewUrl,
    };

    const project: ConnectedClientProject = {
      id: `PLANTILLA-${tmpl.id}`,
      clientName: `Diseño: ${tmpl.name}`,
      clientEmail: 'diseno@tallerprensa.com',
      clientCity: 'Central Taller',
      orderDate: new Date().toLocaleDateString('es-CO'),
      orderStatus: 'PLANTILLA ACTIVA',
      paymentStatus: 'APROBADO',
      items: [item],
      selectedItemIndex: 0,
      activeSide: 'tiro',
    };

    onSelectProject(project);
    onClose();
  };

  // Confirm manual project
  const handleConfirmManual = () => {
    const item: ClientProjectItem = {
      id: Date.now(),
      productName: manualProduct || 'Impresión a Medida',
      quantity: manualQty,
      paperType: manualPaper,
      finishes: [manualFinishes],
      inks: '4x4 CMYK',
      sides: 'Dos Caras',
      previewImageUrl: manualFileUrl || undefined,
      notes: manualJobName,
      specs: {
        AnchoMm: manualWidth,
        AltoMm: manualHeight,
        Papel: manualPaper,
        Acabados: manualFinishes,
      }
    };

    const project: ConnectedClientProject = {
      id: `PROYECTO-${Date.now().toString().slice(-4)}`,
      clientName: manualClient || 'Cliente Particular',
      clientEmail: 'cliente@manual.com',
      clientPhone: manualPhone,
      clientCity: manualCity,
      orderDate: new Date().toLocaleDateString('es-CO'),
      orderStatus: 'PRODUCCIÓN MANUAL',
      paymentStatus: 'CONFIRMADO',
      internalNotes: manualJobName,
      items: [item],
      selectedItemIndex: 0,
      activeSide: 'tiro',
    };

    onSelectProject(project);
    onClose();
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return ordersList;
    const term = searchTerm.toLowerCase();
    return ordersList.filter(o => 
      (o.id && o.id.toLowerCase().includes(term)) ||
      (o.client && o.client.toLowerCase().includes(term)) ||
      (o.email && o.email.toLowerCase().includes(term)) ||
      (o.city && o.city.toLowerCase().includes(term)) ||
      (o.status && o.status.toLowerCase().includes(term))
    );
  }, [ordersList, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-[32px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Package size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-teal-400 text-slate-950 px-2 py-0.5 rounded-full">
                  Gestión de Proyectos & Archivos
                </span>
              </div>
              <h3 className="font-black text-white text-lg mt-0.5">Llamar Proyecto / Pedido de Cliente</h3>
              <p className="text-xs text-slate-300">
                Importa todos los datos, archivos de arte en alta resolución, tiraje, acabados y especificaciones técnicas para imposición directa.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => { setActiveTab('orders'); setSelectedOrderDetails(null); }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-white text-teal-700 border-t-2 border-x border-teal-500 border-b-0 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package size={15} />
            <span>Órdenes & Pedidos del Sistema ({ordersList.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('templates'); setSelectedOrderDetails(null); }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'templates'
                ? 'bg-white text-teal-700 border-t-2 border-x border-teal-500 border-b-0 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Palette size={15} />
            <span>Plantillas & Diseños ({templatesList.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('manual'); setSelectedOrderDetails(null); }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'manual'
                ? 'bg-white text-teal-700 border-t-2 border-x border-teal-500 border-b-0 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Upload size={15} />
            <span>Entrada Manual / Proyecto Externo</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por código de orden, nombre del cliente, email, ciudad o estado..."
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500 shadow-xs"
                />
              </div>

              {/* If an order is currently selected for inspection */}
              {selectedOrderDetails ? (
                <div className="bg-white rounded-2xl border border-teal-200 p-6 shadow-md space-y-6">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-full">
                          {selectedOrderDetails.order.code || `ORD-${selectedOrderDetails.order.id}`}
                        </span>
                        <span className="text-xs font-extrabold text-slate-500">
                          {new Date(selectedOrderDetails.order.createdAt).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-slate-900 mt-1">
                        Cliente: {selectedOrderDetails.order.customerName || selectedOrderDetails.order.userEmail}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {selectedOrderDetails.order.customerPhone} • {selectedOrderDetails.order.customerCity} • {selectedOrderDetails.order.userEmail}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedOrderDetails(null)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold self-start sm:self-auto"
                    >
                      &larr; Volver al Listado
                    </button>
                  </div>

                  {/* Items in this order */}
                  <div>
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                      Productos & Archivos Adjuntos ({selectedOrderDetails.items.length})
                    </h5>

                    <div className="space-y-3">
                      {selectedOrderDetails.items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-teal-50/20 hover:border-teal-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                              {item.previewImageUrl || item.productImage ? (
                                <img 
                                  src={item.previewImageUrl || item.productImage} 
                                  alt={item.productName} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <FileText size={24} className="text-teal-600" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h6 className="font-extrabold text-slate-900 text-sm">{item.productName}</h6>
                                <span className="text-[10px] font-black bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                                  Tiraje: {item.quantity.toLocaleString()} unds
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {item.specs && Object.entries(item.specs).map(([k, v]: [string, any]) => (
                                  <span key={k} className="text-[10px] font-bold bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                                    {k}: {String(v)}
                                  </span>
                                ))}
                              </div>

                              {item.highResPdfUrl && (
                                <div className="flex items-center gap-1 text-[11px] text-teal-700 font-bold mt-1">
                                  <FileCheck size={13} />
                                  <span>Arte de Impresión Listo en Alta Resolución</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                            {item.highResPdfUrl && (
                              <a
                                href={item.highResPdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-slate-500 hover:text-teal-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100"
                                title="Ver archivo original"
                              >
                                <Eye size={15} />
                              </a>
                            )}

                            <button
                              onClick={() => handleConfirmOrderImport(selectedOrderDetails, idx)}
                              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-teal-600/20 active:scale-95 transition-all"
                            >
                              <Layers size={14} />
                              <span>Imponer Este Producto</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                /* Orders List */
                <div className="space-y-3">
                  {loadingOrders ? (
                    <div className="py-16 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin text-teal-600" />
                      Consultando órdenes y archivos de clientes...
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs font-semibold">
                      No se encontraron órdenes registradas con los términos ingresados.
                    </div>
                  ) : (
                    filteredOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="bg-white p-4 rounded-2xl border border-slate-200/90 hover:border-teal-400 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 font-bold flex items-center justify-center shrink-0 mt-0.5 border border-teal-100">
                            <User size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-sm">{ord.id}</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                ord.status === 'COMPLETADO' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : ord.status === 'EN_PRODUCCION'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-teal-50 text-teal-700 border-teal-200'
                              }`}>
                                {ord.status}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-800 mt-0.5">
                              {ord.client} <span className="text-slate-400 font-medium">({ord.email})</span>
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                              {ord.date} • {ord.city} • Tel: {ord.phone} • {ord.itemsCount || 1} producto(s)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleInspectOrder(ord.numericId || parseInt(ord.id.replace(/\D/g, '')))}
                            disabled={loadingDetailsId === (ord.numericId || ord.id)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            {loadingDetailsId === (ord.numericId || ord.id) ? (
                              <RefreshCw size={13} className="animate-spin text-slate-600" />
                            ) : (
                              <Eye size={13} />
                            )}
                            <span>Ver Archivos</span>
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                const idToFetch = ord.numericId || parseInt(ord.id.replace(/\D/g, ''));
                                const res = await fetch(`/api/admin/orders/${idToFetch}`, {
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  handleConfirmOrderImport(data, 0);
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                          >
                            <Layers size={14} />
                            <span>Cargar Directo</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {templatesList.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-teal-400 transition-all flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Palette size={16} />
                        </span>
                        <h4 className="font-black text-slate-900 text-sm">{tmpl.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 font-medium">
                        Diseño vectorizado guardado en el editor con objetos, colores y fuentes configuradas.
                      </p>
                    </div>

                    <button
                      onClick={() => handleConfirmTemplateImport(tmpl)}
                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                      <Layers size={14} />
                      <span>Cargar a Pliego de Imposición</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MANUAL ENTRY */}
          {activeTab === 'manual' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-3">
                Datos del Proyecto Particular / Cliente Manual
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre del Cliente / Empresa:</label>
                  <input
                    type="text"
                    value={manualClient}
                    onChange={(e) => setManualClient(e.target.value)}
                    placeholder="Ej: Inversiones Gráficas Andina S.A.S"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono / Celular de Contacto:</label>
                  <input
                    type="text"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="Ej: +57 310 456 7890"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Producto a Imprimir:</label>
                  <input
                    type="text"
                    value={manualProduct}
                    onChange={(e) => setManualProduct(e.target.value)}
                    placeholder="Ej: Volante Media Carta Publicitario"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Sustrato / Tipo de Papel:</label>
                  <input
                    type="text"
                    value={manualPaper}
                    onChange={(e) => setManualPaper(e.target.value)}
                    placeholder="Ej: Propalcote 150g Brillante"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Acabados & Post-prensa:</label>
                  <input
                    type="text"
                    value={manualFinishes}
                    onChange={(e) => setManualFinishes(e.target.value)}
                    placeholder="Ej: Plastificado Mate + Plegado Tríptico"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tiraje Requerido (Unidades):</label>
                  <input
                    type="number"
                    value={manualQty}
                    onChange={(e) => setManualQty(parseInt(e.target.value) || 1000)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleConfirmManual}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-teal-600/25 active:scale-95"
                >
                  <Layers size={15} />
                  <span>Crear & Cargar Proyecto a Imposición</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-medium">
            Al seleccionar un proyecto, se configurarán automáticamente las medidas, sangrados, tirajes y archivos asociados.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
