
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Eye, Search, Package, Download, Filter, RefreshCw, Layers, 
  Clock, CheckCircle2, Truck, LayoutGrid, ListFilter, Printer, ShieldCheck, Sparkles 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import OrderDetailModal, { OrderDetail, OrderItemDetail } from './OrderDetailModal';
import WorkshopKanbanBoard, { KanbanOrder } from './WorkshopKanbanBoard';
import JobTicketModal from './JobTicketModal';
import PreflightInspectorModal from './PreflightInspectorModal';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<{ order: OrderDetail; items: OrderItemDetail[] } | null>(null);
  const [selectedJobTicketOrder, setSelectedJobTicketOrder] = useState<{ order: OrderDetail; items: OrderItemDetail[] } | null>(null);
  const [selectedPreflightItem, setSelectedPreflightItem] = useState<{ orderCode: string; item: OrderItemDetail } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (token) fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (orderId: number | string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data);
      }
    } catch (error) {
      console.error('Error fetching order detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUpdateOrder = async (updatedData: { status?: string; trackingNumber?: string; trackingCourier?: string; internalNotes?: string }) => {
    if (!selectedOrder) return;
    try {
      const numericId = selectedOrder.order.id;
      const res = await fetch(`/api/admin/orders/${numericId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        // Update modal state
        setSelectedOrder(prev => prev ? {
          ...prev,
          order: {
            ...prev.order,
            ...updatedData,
            status: updatedData.status || prev.order.status
          }
        } : null);
        // Refresh list
        fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const updateStatusQuick = async (id: string | number, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NUEVO': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'EN_DISEÑO': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'EN_PRODUCCION': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'LISTO_DESPACHO': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'ENVIADO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'ENTREGADO': return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'CANCELADO': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        !searchTerm || 
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.phone && o.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.trackingNumber && o.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = !statusFilter || o.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // Counts by status
  const counts = useMemo(() => {
    return {
      all: orders.length,
      nuevos: orders.filter(o => o.status === 'NUEVO').length,
      enProduccion: orders.filter(o => o.status === 'EN_PRODUCCION' || o.status === 'EN_DISEÑO' || o.status === 'EN_ACABADOS').length,
      enviados: orders.filter(o => o.status === 'ENVIADO' || o.status === 'LISTO_DESPACHO').length,
    };
  }, [orders]);

  // Kanban mapped orders
  const kanbanOrders: KanbanOrder[] = useMemo(() => {
    return orders.map(o => ({
      id: o.id,
      numericId: o.numericId || parseInt(o.id.replace(/\D/g, '')),
      client: o.client,
      email: o.email,
      phone: o.phone,
      city: o.city,
      date: o.date,
      createdAt: o.createdAt,
      total: o.total,
      status: o.status || 'NUEVO',
      itemsCount: o.itemsCount || 1,
      trackingNumber: o.trackingNumber,
      trackingCourier: o.trackingCourier,
      internalNotes: o.internalNotes,
      primaryProduct: o.primaryProduct || 'Impresión Litográfica',
      primaryPaper: o.primaryPaper || 'Propalcote 300g',
      primaryQuantity: o.primaryQuantity || 1000,
    }));
  }, [orders]);

  const handleOpenJobTicketForOrder = async (orderId: number | string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedJobTicketOrder(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenPreflightForOrder = async (orderId: number | string, orderCode: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setSelectedPreflightItem({
            orderCode,
            item: data.items[0]
          });
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const exportCSV = () => {
    if (orders.length === 0) return;
    const headers = ['ID Orden', 'Cliente', 'Email', 'Telefono', 'Ciudad', 'Fecha', 'Subtotal', 'IVA', 'Envio', 'Total', 'Metodo Pago', 'Estado', 'Transportadora', 'Guia'];
    const rows = filteredOrders.map(o => [
      o.id,
      `"${o.client}"`,
      o.email,
      `"${o.phone || ''}"`,
      `"${o.city || ''}"`,
      o.date,
      o.subtotal || 0,
      o.iva || 0,
      o.shippingCost || 0,
      o.total,
      o.paymentMethod || 'Wompi',
      o.status,
      `"${o.trackingCourier || ''}"`,
      `"${o.trackingNumber || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_pedidos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* HEADER & QUICK ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Centro de Producción & Pedidos</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-teal-100 text-teal-800 border border-teal-200">
              Taller & Web-to-Print
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">Supervisa órdenes de compra, flujo de prensa CTP, job tickets y despachos</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* VIEW SWITCHER */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid size={15} />
              <span>Tablero Kanban Taller</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ListFilter size={15} />
              <span>Lista de Pedidos</span>
            </button>
          </div>

          <button 
            onClick={fetchOrders}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 p-2.5 rounded-full font-bold shadow-xs transition-transform active:scale-95"
            title="Recargar pedidos"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={exportCSV}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
          >
            <Download size={15} /> Exportar (.CSV)
          </button>
        </div>
      </div>

      {/* QUICK STATUS PILLS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button 
          onClick={() => setStatusFilter('')}
          className={`p-4 rounded-2xl border text-left transition-all ${statusFilter === '' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'}`}
        >
          <span className="text-xs font-medium block opacity-75">Todos los Pedidos</span>
          <span className="text-xl font-black mt-1 block">{counts.all}</span>
        </button>

        <button 
          onClick={() => setStatusFilter('NUEVO')}
          className={`p-4 rounded-2xl border text-left transition-all ${statusFilter === 'NUEVO' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'}`}
        >
          <span className="text-xs font-medium block opacity-75 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span> Nuevos / V.B.
          </span>
          <span className="text-xl font-black mt-1 block text-blue-950 dark:text-white">{counts.nuevos}</span>
        </button>

        <button 
          onClick={() => setStatusFilter('EN_PRODUCCION')}
          className={`p-4 rounded-2xl border text-left transition-all ${statusFilter === 'EN_PRODUCCION' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'}`}
        >
          <span className="text-xs font-medium block opacity-75 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> En Taller / Prensa
          </span>
          <span className="text-xl font-black mt-1 block text-amber-950 dark:text-white">{counts.enProduccion}</span>
        </button>

        <button 
          onClick={() => setStatusFilter('ENVIADO')}
          className={`p-4 rounded-2xl border text-left transition-all ${statusFilter === 'ENVIADO' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'}`}
        >
          <span className="text-xs font-medium block opacity-75 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Despachados
          </span>
          <span className="text-xl font-black mt-1 block text-emerald-950 dark:text-white">{counts.enviados}</span>
        </button>
      </div>

      {/* RENDER VIEW: KANBAN BOARD OR LIST TABLE */}
      {viewMode === 'kanban' ? (
        <WorkshopKanbanBoard
          orders={kanbanOrders}
          onUpdateStatus={updateStatusQuick}
          onOpenDetail={handleOpenDetail}
          onRefresh={fetchOrders}
          loading={loading}
        />
      ) : (
        /* ORDERS TABLE CARD */
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
          
          {/* SEARCH & FILTERS BAR */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
             <div className="relative w-full sm:w-96">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="Buscar por código, cliente o guía..."
                 className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
               />
             </div>
             
             <div className="flex items-center gap-3 w-full sm:w-auto">
               <Filter size={16} className="text-slate-400 shrink-0" />
               <select 
                 value={statusFilter}
                 onChange={(e) => setStatusFilter(e.target.value)}
                 className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
               >
                 <option value="">Todos los Estados</option>
                 <option value="NUEVO">Nuevos Pedidos</option>
                 <option value="EN_DISEÑO">En Pre-Prensa / Diseño</option>
                 <option value="EN_PRODUCCION">En Producción / Taller</option>
                 <option value="EN_ACABADOS">En Acabados & Troquel</option>
                 <option value="LISTO_DESPACHO">Listos para Despacho</option>
                 <option value="ENVIADO">Enviados</option>
                 <option value="ENTREGADO">Entregados</option>
                 <option value="CANCELADO">Cancelados</option>
               </select>
             </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">ID Orden</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente & Contacto</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones de Taller</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                      Cargando listado de pedidos...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                     <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                       No se encontraron pedidos con los filtros aplicados.
                     </td>
                  </tr>
                ) : filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    onClick={() => handleOpenDetail(order.numericId || order.id)}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                          <Package size={20} />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 block leading-tight">{order.id}</span>
                          <span className="text-[11px] text-slate-400 font-semibold">{order.itemsCount || 1} producto(s)</span>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800 text-sm">{order.client}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{order.email} • {order.city}</div>
                    </td>
                    
                    <td className="py-4 px-6 text-xs text-slate-500 font-semibold">
                      {order.date}
                    </td>
                    
                    <td className="py-4 px-6 font-black text-slate-900 text-sm">
                      {formatCOP(order.total)}
                    </td>
                    
                    <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                      <select 
                        value={order.status} 
                        onChange={(e) => updateStatusQuick(order.numericId || order.id, e.target.value)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer focus:ring-0 shadow-xs ${getStatusColor(order.status)}`}
                      >
                        <option value="NUEVO">NUEVO</option>
                        <option value="EN_DISEÑO">EN DISEÑO / CTP</option>
                        <option value="EN_PRODUCCION">EN PRENSA OFFSET</option>
                        <option value="EN_ACABADOS">EN ACABADOS & TROQUEL</option>
                        <option value="LISTO_DESPACHO">LISTO DESPACHO</option>
                        <option value="ENVIADO">ENVIADO</option>
                        <option value="ENTREGADO">ENTREGADO</option>
                        <option value="CANCELADO">CANCELADO</option>
                      </select>
                    </td>
                    
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end items-center gap-1.5">
                        <button
                          onClick={() => handleOpenJobTicketForOrder(order.numericId || order.id)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-bold"
                          title="Generar Job Ticket / Hoja de Ruta de Producción"
                        >
                          <Printer size={14} className="text-slate-600" />
                          <span className="hidden xl:inline">Job Ticket</span>
                        </button>

                        <button
                          onClick={() => handleOpenPreflightForOrder(order.numericId || order.id, order.id)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-bold border border-emerald-200/60"
                          title="Inspector Preflight (DPI, Sangrado, CMYK)"
                        >
                          <ShieldCheck size={14} className="text-emerald-600" />
                          <span className="hidden xl:inline">Preflight</span>
                        </button>

                        <Link
                          to={`/admin/imposition?orderId=${order.numericId || order.id}`}
                          className="bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-bold border border-indigo-100"
                          title="Ir a Diseñador de Imposición CTP"
                        >
                          <Layers size={14} />
                          <span className="hidden xl:inline">CTP</span>
                        </Link>

                        <button 
                          onClick={() => handleOpenDetail(order.numericId || order.id)}
                          className="bg-teal-50 hover:bg-teal-500 text-teal-700 hover:text-white p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-bold border border-teal-100" 
                          title="Ver Ficha Técnica y Archivos"
                        >
                          <Eye size={14} /> 
                          <span className="hidden xl:inline">Ficha</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder.order}
          items={selectedOrder.items}
          onClose={() => setSelectedOrder(null)}
          onUpdate={handleUpdateOrder}
        />
      )}

      {/* JOB TICKET MODAL */}
      {selectedJobTicketOrder && (
        <JobTicketModal
          order={selectedJobTicketOrder.order}
          items={selectedJobTicketOrder.items}
          onClose={() => setSelectedJobTicketOrder(null)}
        />
      )}

      {/* PREFLIGHT INSPECTOR MODAL */}
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

