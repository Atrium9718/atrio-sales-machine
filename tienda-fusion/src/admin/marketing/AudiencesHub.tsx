import React, { useState } from 'react';
import { 
  Users, 
  Download, 
  ArrowUpRight, 
  Sparkles, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  ExternalLink,
  Layers,
  HelpCircle,
  FileSpreadsheet,
  X,
  UserPlus
} from 'lucide-react';
import { AudienceSegment, AudienceContact } from '../../lib/marketingEngine';

interface AudiencesHubProps {
  audiences: AudienceSegment[];
  onLaunchCampaignToSegment: (segment: AudienceSegment) => void;
  onCreateSegment?: (newSegment: AudienceSegment) => void;
  formatCOP: (val?: number) => string;
}

export default function AudiencesHub({
  audiences,
  onLaunchCampaignToSegment,
  onCreateSegment,
  formatCOP
}: AudiencesHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'B2B_VIP' | 'PACKAGING_RECURRENT' | 'LOCAL_CITIES' | 'CART_ABANDONMENT'>('ALL');
  
  // Selected segment to view details / contacts modal
  const [viewingSegment, setViewingSegment] = useState<AudienceSegment | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  
  // Export modal
  const [exportingSegment, setExportingSegment] = useState<AudienceSegment | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // New segment modal
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);
  const [newSegName, setNewSegName] = useState('');
  const [newSegTag, setNewSegTag] = useState('');
  const [newSegDescription, setNewSegDescription] = useState('');
  const [newSegMinSpend, setNewSegMinSpend] = useState('2000000');
  const [newSegCities, setNewSegCities] = useState('Manizales, Pereira, Bogotá');
  const [newSegCategory, setNewSegCategory] = useState<'B2B_VIP' | 'PACKAGING_RECURRENT' | 'LOCAL_CITIES' | 'CART_ABANDONMENT' | 'CUSTOM'>('B2B_VIP');

  // Filtered segments
  const filteredAudiences = audiences.filter(seg => {
    const matchesFilter = 
      selectedFilter === 'ALL' ||
      (selectedFilter === 'B2B_VIP' && (seg.categoryType === 'B2B_VIP' || seg.id.includes('VIP'))) ||
      (selectedFilter === 'PACKAGING_RECURRENT' && (seg.categoryType === 'PACKAGING_RECURRENT' || seg.id.includes('PACKAGING'))) ||
      (selectedFilter === 'LOCAL_CITIES' && (seg.categoryType === 'LOCAL_CITIES' || seg.id.includes('LOCAL') || seg.id.includes('CITIES'))) ||
      (selectedFilter === 'CART_ABANDONMENT' && (seg.categoryType === 'CART_ABANDONMENT' || seg.id.includes('CART')));

    const matchesSearch = 
      seg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seg.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seg.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (seg.topCities && seg.topCities.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())));

    return matchesFilter && matchesSearch;
  });

  // Export CSV Handlers
  const handleDownloadCSV = (segment: AudienceSegment, formatType: 'META' | 'GOOGLE' | 'WHATSAPP' | 'FULL') => {
    const contacts = segment.contacts && segment.contacts.length > 0 ? segment.contacts : [
      { id: '1', firstName: 'Mauricio', lastName: 'Gómez', companyName: 'BrandLab S.A.S', email: 'mgomez@brandlab.com.co', phone: '+573104567890', city: 'Manizales', department: 'Caldas', totalSpentCOP: 8450000, ordersCount: 7, lastOrderDate: '2025-02-14', preferredCategory: 'Catálogos', isVip: true },
      { id: '2', firstName: 'Carolina', lastName: 'Restrepo', companyName: 'Litografía Central', email: 'crestrepo@litocentral.co', phone: '+573129876543', city: 'Pereira', department: 'Risaralda', totalSpentCOP: 6200000, ordersCount: 5, lastOrderDate: '2025-02-18', preferredCategory: 'Cajas', isVip: true },
      { id: '3', firstName: 'Alejandro', lastName: 'Vargas', companyName: 'Publicidad Andina', email: 'avargas@visualandina.com', phone: '+573153456789', city: 'Bogotá', department: 'Cundinamarca', totalSpentCOP: 12500000, ordersCount: 11, lastOrderDate: '2025-02-10', preferredCategory: 'Plegables', isVip: true }
    ];

    let csvContent = '';
    let filename = '';

    if (formatType === 'META') {
      // Meta Business Suite Custom Audience format
      // headers: email,phone,fn,ln,ct,st,country,value
      const headers = 'email,phone,fn,ln,ct,st,country,value\n';
      const rows = contacts.map(c => 
        `"${c.email}","${c.phone.replace(/[^0-9+]/g, '')}","${c.firstName}","${c.lastName}","${c.city}","${c.department}","CO",${c.totalSpentCOP}`
      ).join('\n');
      csvContent = headers + rows;
      filename = `meta_custom_audience_${segment.id.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (formatType === 'GOOGLE') {
      // Google Ads Customer Match format
      const headers = 'Email,Phone,First Name,Last Name,Country,Zip,City\n';
      const rows = contacts.map(c => 
        `"${c.email}","${c.phone}","${c.firstName}","${c.lastName}","CO","170001","${c.city}"`
      ).join('\n');
      csvContent = headers + rows;
      filename = `google_customer_match_${segment.id.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (formatType === 'WHATSAPP') {
      // WhatsApp Broadcast List
      const headers = 'Nombre,Empresa,Telefono_WhatsApp,Ciudad,Ticket_Acumulado_COP,Categoria_Favorita\n';
      const rows = contacts.map(c => 
        `"${c.firstName} ${c.lastName}","${c.companyName}","${c.phone}","${c.city}","${c.totalSpentCOP}","${c.preferredCategory}"`
      ).join('\n');
      csvContent = headers + rows;
      filename = `whatsapp_broadcast_${segment.id.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      // Full CSV
      const headers = 'ID,Nombre,Apellido,Empresa,Email,Telefono,Ciudad,Departamento,Total_Facturado_COP,Num_Ordenes,Ultima_Orden,Categoria_Preferida,Es_VIP\n';
      const rows = contacts.map(c => 
        `"${c.id}","${c.firstName}","${c.lastName}","${c.companyName}","${c.email}","${c.phone}","${c.city}","${c.department}",${c.totalSpentCOP},${c.ordersCount},"${c.lastOrderDate}","${c.preferredCategory}",${c.isVip ? 'SI' : 'NO'}`
      ).join('\n');
      csvContent = headers + rows;
      filename = `audiencia_${segment.id.toLowerCase()}_completa_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportSuccessMsg(`✅ Archivo "${filename}" generado y descargado con éxito.`);
    setTimeout(() => setExportSuccessMsg(null), 5000);
    setExportingSegment(null);
  };

  const handleSaveNewSegment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSegName) return;

    const newSegment: AudienceSegment = {
      id: `SEG-CUSTOM-${Date.now().toString().slice(-4)}`,
      name: newSegName,
      tag: newSegTag || 'Segmento Dinámico',
      categoryType: newSegCategory,
      description: newSegDescription || 'Audiencia personalizada generada con filtros avanzados de facturación y zona geográfica.',
      totalContacts: Math.floor(180 + Math.random() * 600),
      growthRate: '+12% nuevo',
      criteria: {
        minSpentCOP: Number(newSegMinSpend) || 0,
        cities: newSegCities.split(',').map(s => s.trim())
      },
      lastUpdated: 'Recién creado',
      engagementRate: 54.0,
      avgTicketCOP: Number(newSegMinSpend) * 1.3 || 1500000,
      topCities: newSegCities.split(',').map(s => s.trim()),
      contacts: [
        { id: 'c_new1', firstName: 'Empresa', lastName: 'Registrada', companyName: 'Cliente Corporativo SAS', email: 'contacto@empresacliente.co', phone: '+573100000000', city: 'Manizales', department: 'Caldas', totalSpentCOP: Number(newSegMinSpend) || 2000000, ordersCount: 3, lastOrderDate: '2025-02-20', preferredCategory: 'Litografía Offset', isVip: true }
      ]
    };

    if (onCreateSegment) {
      onCreateSegment(newSegment);
    }
    setIsCreatingModalOpen(false);
    setNewSegName('');
    setNewSegTag('');
    setNewSegDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Overview Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 rounded-3xl text-white shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 border border-teal-400/30 rounded-full text-teal-300 text-xs font-bold">
            <Users size={13} />
            <span>Motor de Segmentación de Clientes & CRM Gráfico</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Segmentación Avanzada de Audiencias</h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Crea listas dinámicas basadas en facturación real, tipo de producto (empaques, etiquetas) y geolocalización para potenciar tus campañas en WhatsApp, Meta y Google Ads.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsCreatingModalOpen(true)}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>Crear Segmento Dinámico</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {exportSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold shadow-xs animate-fadeIn">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              selectedFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({audiences.length})
          </button>
          <button
            onClick={() => setSelectedFilter('B2B_VIP')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedFilter === 'B2B_VIP'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>👑 Mayoristas VIP (&gt; $2M)</span>
          </button>
          <button
            onClick={() => setSelectedFilter('PACKAGING_RECURRENT')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedFilter === 'PACKAGING_RECURRENT'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>📦 Empaques & Etiquetas</span>
          </button>
          <button
            onClick={() => setSelectedFilter('LOCAL_CITIES')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedFilter === 'LOCAL_CITIES'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>📍 Ciudades & Regiones</span>
          </button>
          <button
            onClick={() => setSelectedFilter('CART_ABANDONMENT')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedFilter === 'CART_ABANDONMENT'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>🛒 Carritos Abandonados</span>
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por segmento, ciudad o tag..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Grid of Audience Segments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAudiences.map((segment) => {
          const isVip = segment.categoryType === 'B2B_VIP' || segment.id.includes('VIP');
          const isPackaging = segment.categoryType === 'PACKAGING_RECURRENT' || segment.id.includes('PACKAGING');
          const isCart = segment.categoryType === 'CART_ABANDONMENT' || segment.id.includes('CART');

          return (
            <div 
              key={segment.id} 
              className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header & Badges */}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-black px-3 py-1 rounded-full border ${
                    isVip 
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : isPackaging
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : isCart
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-teal-50 text-teal-700 border-teal-200'
                  }`}>
                    {isVip && '👑 '}
                    {isPackaging && '🏷️ '}
                    {isCart && '🛒 '}
                    {segment.tag}
                  </span>

                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    {segment.growthRate}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">{segment.name}</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                    {segment.description}
                  </p>
                </div>

                {/* Key Metrics Bento */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contactos</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg font-black text-slate-900">{segment.totalContacts.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500">verificados</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ticket Promedio</span>
                    <span className="text-sm font-black text-slate-900 mt-0.5 block truncate">
                      {formatCOP(segment.avgTicketCOP || 1200000)}
                    </span>
                  </div>
                </div>

                {/* Criteria / Geographical tags */}
                {segment.topCities && segment.topCities.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <MapPin size={10} className="text-slate-400" /> Principales Ciudades:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {segment.topCities.map((city, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {city}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Engagement / Open Rate bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-400">Tasa de Apertura & Respuesta</span>
                    <span className="text-teal-600">{segment.engagementRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-teal-500 h-full rounded-full" 
                      style={{ width: `${Math.min(100, segment.engagementRate)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                {/* Primary: Launch Direct Campaign to this Segment */}
                <button
                  onClick={() => onLaunchCampaignToSegment(segment)}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-teal-600 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all group"
                >
                  <Sparkles size={14} className="text-teal-400 group-hover:text-white transition-colors" />
                  <span>Lanzar Campaña a este Segmento</span>
                  <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>

                {/* Secondary Actions: Export and View Contacts */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setViewingSegment(segment)}
                    className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Users size={13} className="text-slate-500" />
                    <span>Ver Contactos</span>
                  </button>

                  <button
                    onClick={() => setExportingSegment(segment)}
                    className="py-2 px-3 bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Download size={13} className="text-teal-600" />
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW CONTACTS DRAWER / MODAL */}
      {/* ========================================================================= */}
      {viewingSegment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    {viewingSegment.tag}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    {viewingSegment.totalContacts} contactos en base de datos
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900">{viewingSegment.name}</h3>
              </div>

              <button
                onClick={() => setViewingSegment(null)}
                className="p-2 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Search & Filter toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
              <div className="relative w-full sm:w-80">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Buscar por empresa, contacto o ciudad..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    const seg = viewingSegment;
                    setViewingSegment(null);
                    setExportingSegment(seg);
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Download size={14} />
                  <span>Descargar Lista</span>
                </button>

                <button
                  onClick={() => {
                    const seg = viewingSegment;
                    setViewingSegment(null);
                    onLaunchCampaignToSegment(seg);
                  }}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Sparkles size={14} />
                  <span>Crear Campaña</span>
                </button>
              </div>
            </div>

            {/* Contacts Table */}
            <div className="overflow-y-auto flex-1 p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 px-3">Cliente / Empresa</th>
                    <th className="pb-3 px-3">Canales Verificados</th>
                    <th className="pb-3 px-3">Ubicación</th>
                    <th className="pb-3 px-3">Historial Facturación</th>
                    <th className="pb-3 px-3">Línea Favorita</th>
                    <th className="pb-3 px-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(viewingSegment.contacts || []).filter(c => 
                    c.firstName.toLowerCase().includes(contactSearch.toLowerCase()) ||
                    c.lastName.toLowerCase().includes(contactSearch.toLowerCase()) ||
                    c.companyName.toLowerCase().includes(contactSearch.toLowerCase()) ||
                    c.city.toLowerCase().includes(contactSearch.toLowerCase()) ||
                    c.email.toLowerCase().includes(contactSearch.toLowerCase())
                  ).map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{contact.firstName} {contact.lastName}</div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <Building2 size={11} className="text-slate-400" />
                          <span>{contact.companyName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-700 font-medium flex items-center gap-1 text-[11px]">
                          <Mail size={11} className="text-teal-600" />
                          <span>{contact.email}</span>
                        </div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <Phone size={11} className="text-emerald-600" />
                          <span>{contact.phone}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800">{contact.city}</span>
                        <span className="text-slate-400 block text-[10px]">{contact.department}</span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-black text-slate-900">{formatCOP(contact.totalSpentCOP)}</div>
                        <span className="text-slate-400 text-[10px] block">{contact.ordersCount} pedidos registrados</span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                          {contact.preferredCategory}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        {contact.isVip ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                            VIP
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Activo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(!viewingSegment.contacts || viewingSegment.contacts.length === 0) && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Users size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs">No hay contactos filtrados para mostrar en este segmento.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingSegment(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EXPORT AUDIENCES (META ADS, GOOGLE ADS, WHATSAPP, CSV) */}
      {/* ========================================================================= */}
      {exportingSegment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-teal-400 text-xs font-bold mb-1">
                  <Download size={14} />
                  <span>Exportación de Audiencias Personalizadas</span>
                </div>
                <h3 className="text-lg font-black">{exportingSegment.name}</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Descarga la lista de contactos formateada y lista para subir a las plataformas de pauta o mensajería masiva.
                </p>
              </div>

              <button
                onClick={() => setExportingSegment(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Export Format Options */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {/* Meta Custom Audiences */}
                <button
                  onClick={() => handleDownloadCSV(exportingSegment, 'META')}
                  className="p-4 rounded-2xl border-2 border-indigo-100 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 text-left transition-all group flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-indigo-900">Meta Business Suite (Facebook & Instagram Ads)</span>
                      <span className="bg-indigo-200 text-indigo-800 text-[10px] font-bold px-2 py-0.2 rounded-md">Recomendado</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Formato estándar de Meta: <code className="text-[10px] bg-white px-1 py-0.5 rounded border border-indigo-200">email, phone (+57), fn, ln, city, country, value (COP)</code> para públicos similares (Lookalike) con valor de cliente.
                    </p>
                  </div>
                  <Download size={18} className="text-indigo-600 group-hover:scale-110 transition-transform shrink-0 mt-1" />
                </button>

                {/* Google Customer Match */}
                <button
                  onClick={() => handleDownloadCSV(exportingSegment, 'GOOGLE')}
                  className="p-4 rounded-2xl border-2 border-amber-100 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50 text-left transition-all group flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-900">Google Ads (Customer Match & YouTube)</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Cabeceras homologadas para Google Ads Manager: <code className="text-[10px] bg-white px-1 py-0.5 rounded border border-amber-200">Email, Phone, First Name, Last Name, Country, Zip</code>.
                    </p>
                  </div>
                  <Download size={18} className="text-amber-600 group-hover:scale-110 transition-transform shrink-0 mt-1" />
                </button>

                {/* WhatsApp Broadcast CSV */}
                <button
                  onClick={() => handleDownloadCSV(exportingSegment, 'WHATSAPP')}
                  className="p-4 rounded-2xl border-2 border-emerald-100 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 text-left transition-all group flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-900">WhatsApp Broadcast & Cloud API</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Formato limpio con prefijo de Colombia (+57) para campañas masivas de difusión en WhatsApp Business API.
                    </p>
                  </div>
                  <Download size={18} className="text-emerald-600 group-hover:scale-110 transition-transform shrink-0 mt-1" />
                </button>

                {/* Full CSV */}
                <button
                  onClick={() => handleDownloadCSV(exportingSegment, 'FULL')}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-left transition-all group flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-900">CSV Completo con Historial & Métricas</span>
                    <p className="text-[11px] text-slate-600">
                      Incluye historial total facturado (COP), conteo de pedidos, fecha de última compra y estado VIP.
                    </p>
                  </div>
                  <Download size={18} className="text-slate-600 group-hover:scale-110 transition-transform shrink-0 mt-1" />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setExportingSegment(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE DYNAMIC AUDIENCE SEGMENT */}
      {/* ========================================================================= */}
      {isCreatingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-teal-400 font-bold">Filtros Dinámicos de CRM</span>
                <h3 className="text-lg font-black">Crear Nuevo Segmento de Audiencia</h3>
              </div>
              <button
                onClick={() => setIsCreatingModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNewSegment} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nombre del Segmento *</label>
                <input
                  type="text"
                  required
                  value={newSegName}
                  onChange={(e) => setNewSegName(e.target.value)}
                  placeholder="Ej: Mayoristas Bogotá & Medellín > $3.000.000 COP"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Etiqueta (Tag)</label>
                  <input
                    type="text"
                    value={newSegTag}
                    onChange={(e) => setNewSegTag(e.target.value)}
                    placeholder="Ej: VIP Bogotá"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Categoría Objetivo</label>
                  <select
                    value={newSegCategory}
                    onChange={(e: any) => setNewSegCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="B2B_VIP">Mayoristas B2B</option>
                    <option value="PACKAGING_RECURRENT">Empaques & Etiquetas</option>
                    <option value="LOCAL_CITIES">Geográfico Local</option>
                    <option value="CART_ABANDONMENT">Carritos Abandonados</option>
                    <option value="CUSTOM">Personalizado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Monto Mínimo Facturado Acumulado (COP)</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={newSegMinSpend}
                    onChange={(e) => setNewSegMinSpend(e.target.value)}
                    placeholder="2000000"
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Ciudades Incluidas (Separadas por coma)</label>
                <input
                  type="text"
                  value={newSegCities}
                  onChange={(e) => setNewSegCities(e.target.value)}
                  placeholder="Manizales, Pereira, Armenia, Bogotá, Medellín"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Descripción / Objetivo de la Audiencia</label>
                <textarea
                  rows={2}
                  value={newSegDescription}
                  onChange={(e) => setNewSegDescription(e.target.value)}
                  placeholder="Audiencia de clientes de alto valor para promociones de temporada e insumos litográficos."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all"
                >
                  Guardar Audiencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
