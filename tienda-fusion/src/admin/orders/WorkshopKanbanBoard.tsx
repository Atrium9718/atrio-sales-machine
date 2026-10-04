import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Printer, ArrowRight, ArrowLeft, Eye, Download, ShieldCheck, 
  Layers, Clock, CheckCircle2, AlertCircle, Sparkles, Filter, 
  Search, RefreshCw, FileText, ChevronRight, CheckSquare, Package, 
  MapPin, Calendar, ExternalLink
} from 'lucide-react';
import { OrderDetail, OrderItemDetail } from './OrderDetailModal';
import JobTicketModal from './JobTicketModal';
import PreflightInspectorModal from './PreflightInspectorModal';

export interface KanbanOrder {
  id: string; // e.g. ORD-2026-0001
  numericId: number;
  client: string;
  email: string;
  phone?: string;
  city?: string;
  date: string;
  createdAt: string | Date;
  total: number;
  status: string;
  itemsCount: number;
  trackingNumber?: string;
  trackingCourier?: string;
  internalNotes?: string;
  primaryProduct?: string;
  primaryPaper?: string;
  primaryQuantity?: number;
  hasArtwork?: boolean;
}

interface WorkshopKanbanBoardProps {
  orders: KanbanOrder[];
  onUpdateStatus: (orderId: string | number, newStatus: string) => Promise<void>;
  onOpenDetail: (orderId: string | number) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const WORKSHOP_COLUMNS = [
  {
    id: 'NUEVO',
    title: '1. Nuevos & Visto Bueno',
    subtitle: 'Revisión comercial y orden aprobada',
    headerBg: 'bg-blue-50 text-blue-900 border-blue-200',
    badgeBg: 'bg-blue-600 text-white',
    iconColor: 'text-blue-500',
    targetPrensa: false,
  },
  {
    id: 'EN_DISEÑO',
    title: '2. Preprensa & CTP',
    subtitle: 'Imposición de pliegos y filmación',
    headerBg: 'bg-purple-50 text-purple-900 border-purple-200',
    badgeBg: 'bg-purple-600 text-white',
    iconColor: 'text-purple-500',
    targetPrensa: false,
  },
  {
    id: 'EN_PRODUCCION',
    title: '3. En Prensa (Offset/Digital)',
    subtitle: 'Tiraje Heidelberg / Xerox',
    headerBg: 'bg-amber-50 text-amber-900 border-amber-200',
    badgeBg: 'bg-amber-600 text-white',
    iconColor: 'text-amber-500',
    targetPrensa: true,
  },
  {
    id: 'EN_ACABADOS',
    title: '4. Acabados & Troquel',
    subtitle: 'Plastificado, barniz UV y corte',
    headerBg: 'bg-orange-50 text-orange-900 border-orange-200',
    badgeBg: 'bg-orange-600 text-white',
    iconColor: 'text-orange-500',
    targetPrensa: false,
  },
  {
    id: 'LISTO_DESPACHO',
    title: '5. Listo para Empaque',
    subtitle: 'Termoencogible y rotulado',
    headerBg: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    badgeBg: 'bg-indigo-600 text-white',
    iconColor: 'text-indigo-500',
    targetPrensa: false,
  },
  {
    id: 'ENVIADO',
    title: '6. Despachado / En Ruta',
    subtitle: 'Con guía Skydropx generada',
    headerBg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    badgeBg: 'bg-emerald-600 text-white',
    iconColor: 'text-emerald-500',
    targetPrensa: false,
  },
  {
    id: 'ENTREGADO',
    title: '7. Entregado / Finalizado',
    subtitle: 'Recepción confirmada',
    headerBg: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeBg: 'bg-slate-700 text-white',
    iconColor: 'text-slate-500',
    targetPrensa: false,
  },
];

export default function WorkshopKanbanBoard({
  orders,
  onUpdateStatus,
  onOpenDetail,
  onRefresh,
  loading
}: WorkshopKanbanBoardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [paperFilter, setPaperFilter] = useState('ALL');
  const [selectedJobTicketOrder, setSelectedJobTicketOrder] = useState<{ order: OrderDetail; items: OrderItemDetail[] } | null>(null);
  const [selectedPreflightItem, setSelectedPreflightItem] = useState<{ orderCode: string; item: OrderItemDetail } | null>(null);
  const [loadingModalData, setLoadingModalData] = useState(false);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = 
        !searchTerm ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.primaryProduct && o.primaryProduct.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.city && o.city.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchPaper = 
        paperFilter === 'ALL' ||
        (o.primaryPaper && o.primaryPaper.toLowerCase().includes(paperFilter.toLowerCase()));

      return matchSearch && matchPaper;
    });
  }, [orders, searchTerm, paperFilter]);

  // Group by status
  const ordersByStatus = useMemo(() => {
    const map: Record<string, KanbanOrder[]> = {
      NUEVO: [],
      EN_DISEÑO: [],
      EN_PRODUCCION: [],
      EN_ACABADOS: [],
      LISTO_DESPACHO: [],
      ENVIADO: [],
      ENTREGADO: [],
      CANCELADO: []
    };

    filteredOrders.forEach(ord => {
      const st = ord.status || 'NUEVO';
      if (map[st]) {
        map[st].push(ord);
      } else {
        map.NUEVO.push(ord);
      }
    });

    return map;
  }, [filteredOrders]);

  const handleOpenJobTicket = async (orderId: number | string) => {
    setLoadingModalData(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedJobTicketOrder(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingModalData(false);
    }
  };

  const handleOpenPreflight = async (orderId: number | string, orderCode: string) => {
    setLoadingModalData(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setSelectedPreflightItem({
            orderCode,
            item: data.items[0]
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingModalData(false);
    }
  };

  const handleMoveOrder = async (order: KanbanOrder, direction: 'next' | 'prev') => {
    const colIds = WORKSHOP_COLUMNS.map(c => c.id);
    const currentIndex = colIds.indexOf(order.status);
    if (currentIndex === -1) return;

    let targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex < 0 || targetIndex >= colIds.length) return;

    const nextStatus = colIds[targetIndex];
    await onUpdateStatus(order.numericId || order.id, nextStatus);
  };

  return (
    <div className="space-y-6">
      
      {/* KANBAN CONTROLS & FILTER BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por orden, cliente, producto o ciudad..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-teal-500 transition-colors"
            />
          </div>

          <select
            value={paperFilter}
            onChange={(e) => setPaperFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-teal-500"
          >
            <option value="ALL">Todos los Sustratos</option>
            <option value="Propalcote">Propalcote (300g / 240g)</option>
            <option value="Bond">Bond (75g / 90g)</option>
            <option value="Kraft">Kraft / Ecológico</option>
            <option value="Adhesivo">Adhesivo / Vinilo</option>
          </select>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500">
            Total en Taller: <strong className="text-slate-900">{filteredOrders.length} Órdenes</strong>
          </span>
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Recargar tablero"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

      </div>

      {/* HORIZONTAL SCROLLABLE KANBAN COLUMNS */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[620px]">
        {WORKSHOP_COLUMNS.map((col, colIdx) => {
          const colOrders = ordersByStatus[col.id] || [];

          return (
            <div
              key={col.id}
              className="w-80 shrink-0 bg-slate-50/70 border border-slate-200/80 rounded-3xl p-3 flex flex-col max-h-[750px] overflow-hidden shadow-xs"
            >
              {/* COLUMN HEADER */}
              <div className={`p-3.5 rounded-2xl border mb-3 flex items-center justify-between ${col.headerBg}`}>
                <div>
                  <h3 className="font-black text-xs tracking-tight">{col.title}</h3>
                  <p className="text-[10px] font-medium opacity-80 mt-0.5">{col.subtitle}</p>
                </div>
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${col.badgeBg}`}>
                  {colOrders.length}
                </span>
              </div>

              {/* CARDS LIST CONTAINER */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {colOrders.length === 0 ? (
                  <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                    <p className="text-xs font-bold text-slate-400">Sin órdenes en esta etapa</p>
                  </div>
                ) : (
                  colOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3 relative group"
                    >
                      {/* CARD TOP INFO */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black font-mono px-2 py-0.5 bg-slate-900 text-white rounded-md">
                          {ord.id}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {new Date(ord.createdAt).toLocaleDateString('es-CO')}
                        </span>
                      </div>

                      {/* CLIENT & PRODUCT */}
                      <div>
                        <h4 className="font-black text-xs text-slate-900 truncate" title={ord.client}>
                          {ord.client}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-teal-500" /> {ord.city || 'Manizales'}
                        </p>
                      </div>

                      {/* LITHO TECHNICAL SPECS PILL */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-black text-slate-800 truncate max-w-[140px]">
                            {ord.primaryProduct || 'Impresión Litográfica'}
                          </span>
                          <span className="font-black text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                            {(ord.primaryQuantity || 1000).toLocaleString('es-CO')} un
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold truncate">
                          Sustrato: <strong className="text-slate-700">{ord.primaryPaper || 'Propalcote 300g'}</strong>
                        </p>
                      </div>

                      {/* PREFLIGHT & CTP SHORTCUTS */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleOpenJobTicket(ord.numericId || ord.id)}
                          className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                          title="Generar Hoja de Ruta / Job Ticket en PDF"
                        >
                          <Printer size={12} className="text-slate-600" />
                          <span>Job Ticket</span>
                        </button>

                        <button
                          onClick={() => handleOpenPreflight(ord.numericId || ord.id, ord.id)}
                          className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                          title="Validar Preflight (DPI, Sangrado, CMYK)"
                        >
                          <ShieldCheck size={12} className="text-emerald-600" />
                          <span>Preflight</span>
                        </button>

                        <button
                          onClick={() => onOpenDetail(ord.numericId || ord.id)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg border border-slate-200"
                          title="Ver detalle completo de orden"
                        >
                          <Eye size={13} />
                        </button>
                      </div>

                      {/* QUICK STAGE MOVER CONTROLS */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          disabled={colIdx === 0}
                          onClick={() => handleMoveOrder(ord, 'prev')}
                          className={`p-1.5 rounded-lg flex items-center gap-1 font-bold text-[10px] transition-all ${
                            colIdx === 0 
                              ? 'opacity-20 cursor-not-allowed text-slate-400' 
                              : 'text-slate-600 hover:bg-slate-100 active:scale-95'
                          }`}
                          title="Retroceder etapa"
                        >
                          <ArrowLeft size={12} />
                          <span>Retroceder</span>
                        </button>

                        <Link
                          to={`/admin/imposition?orderId=${ord.numericId || ord.id}`}
                          className="text-[10px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-0.5"
                          title="Abrir en Diseñador de Imposición CTP"
                        >
                          <Layers size={11} /> CTP
                        </Link>

                        <button
                          disabled={colIdx === WORKSHOP_COLUMNS.length - 1}
                          onClick={() => handleMoveOrder(ord, 'next')}
                          className={`p-1.5 px-2.5 rounded-lg flex items-center gap-1 font-black text-[10px] transition-all ${
                            colIdx === WORKSHOP_COLUMNS.length - 1
                              ? 'opacity-20 cursor-not-allowed text-slate-400' 
                              : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-xs active:scale-95'
                          }`}
                          title="Avanzar a la siguiente etapa de taller"
                        >
                          <span>Avanzar</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* MODALS */}
      {selectedJobTicketOrder && (
        <JobTicketModal
          order={selectedJobTicketOrder.order}
          items={selectedJobTicketOrder.items}
          onClose={() => setSelectedJobTicketOrder(null)}
        />
      )}

      {selectedPreflightItem && (
        <PreflightInspectorModal
          orderCode={selectedPreflightItem.orderCode}
          item={selectedPreflightItem.item}
          onClose={() => setSelectedPreflightItem(null)}
          onApprove={(notes) => {
            console.log('Preflight approved with notes:', notes);
          }}
        />
      )}

    </div>
  );
}
