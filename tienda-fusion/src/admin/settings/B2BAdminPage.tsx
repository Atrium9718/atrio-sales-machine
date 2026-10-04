import React, { useState } from 'react';
import B2BRequestsPanel from './B2BRequestsPanel';
import { 
  Building2, 
  Users, 
  Award, 
  CreditCard, 
  Percent, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Mail, 
  ExternalLink,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Package,
  Settings2,
  X,
  History,
  Save
} from 'lucide-react';
import { B2BTierLevel, B2B_TIER_CONFIG } from '../../lib/b2bEngine';

interface B2BAccountRecord {
  id: string;
  companyName: string;
  nit: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  tier: B2BTierLevel;
  discountPercentage: number;
  creditLimit: number;
  creditUsed: number;
  monthlyVolume: number;
  lastOrderDate: string;
  status: 'ACTIVO' | 'PENDIENTE_VERIFICACION' | 'SUSPENDIDO';
  whiteLabelPacking: boolean;
}

const INITIAL_B2B_ACCOUNTS: B2BAccountRecord[] = [
  {
    id: 'B2B-849102',
    companyName: 'Agencia Gráfica Creativa S.A.S.',
    nit: '900.823.411-9',
    contactPerson: 'Carlos Eduardo Restrepo',
    phone: '+57 311 948 2019',
    email: 'compras@agenciacreativa.co',
    city: 'Manizales',
    tier: 'GOLD_DISTRIBUTOR',
    discountPercentage: 18,
    creditLimit: 6000000,
    creditUsed: 1450000,
    monthlyVolume: 5200000,
    lastOrderDate: '2026-08-20',
    status: 'ACTIVO',
    whiteLabelPacking: true,
  },
  {
    id: 'B2B-736291',
    companyName: 'Impresos & Publicidad del Café',
    nit: '901.442.110-3',
    contactPerson: 'Andrea Ospina',
    phone: '+57 314 772 9011',
    email: 'gerencia@impresosdelcafe.com',
    city: 'Pereira',
    tier: 'PLATINUM_PRINTER',
    discountPercentage: 25,
    creditLimit: 15000000,
    creditUsed: 4800000,
    monthlyVolume: 12400000,
    lastOrderDate: '2026-08-22',
    status: 'ACTIVO',
    whiteLabelPacking: true,
  },
  {
    id: 'B2B-198273',
    companyName: 'Estudio de Diseño Mono Blanco',
    nit: '1053829102-1',
    contactPerson: 'Felipe Jaramillo',
    phone: '+57 320 611 8844',
    email: 'hola@monoblanco.design',
    city: 'Armenia',
    tier: 'SILVER_AGENCY',
    discountPercentage: 10,
    creditLimit: 2000000,
    creditUsed: 0,
    monthlyVolume: 1800000,
    lastOrderDate: '2026-08-15',
    status: 'ACTIVO',
    whiteLabelPacking: false,
  },
  {
    id: 'B2B-902148',
    companyName: 'Editorial & Empaques Occidente',
    nit: '890.312.441-4',
    contactPerson: 'Mauricio Beltrán',
    phone: '+57 310 445 1290',
    email: 'compras@empaquesoccidente.com',
    city: 'Cali',
    tier: 'PLATINUM_PRINTER',
    discountPercentage: 25,
    creditLimit: 20000000,
    creditUsed: 8900000,
    monthlyVolume: 18500000,
    lastOrderDate: '2026-08-21',
    status: 'ACTIVO',
    whiteLabelPacking: true,
  }
];

export default function B2BAdminPage() {
  const [accounts, setAccounts] = useState<B2BAccountRecord[]>(INITIAL_B2B_ACCOUNTS);
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<B2BAccountRecord | null>(null);

  // Global Tier Config State
  const [tierConfig, setTierConfig] = useState(B2B_TIER_CONFIG);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.companyName.toLowerCase().includes(search.toLowerCase()) ||
                          acc.nit.includes(search) ||
                          acc.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
                          acc.city.toLowerCase().includes(search.toLowerCase());
    const matchesTier = selectedTier === 'ALL' || acc.tier === selectedTier;
    return matchesSearch && matchesTier;
  });

  const totalMonthlyB2B = accounts.reduce((sum, a) => sum + a.monthlyVolume, 0);
  const totalCreditPlaced = accounts.reduce((sum, a) => sum + a.creditUsed, 0);

  const handleManageAccount = (account: B2BAccountRecord) => {
    setEditingAccount({ ...account });
    setIsModalOpen(true);
  };

  const handleSaveChanges = () => {
    if (!editingAccount) return;
    setAccounts(accounts.map(acc => acc.id === editingAccount.id ? editingAccount : acc));
    setIsModalOpen(false);
  };

  const handleSaveTierConfig = () => {
    // In a real application, this would dispatch an API call to save global tier config
    setIsTierModalOpen(false);
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* SOLICITUDES REALES (base de datos) */}
      <B2BRequestsPanel />

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 size={16} />
            <span>Gestión de Cuentas B2B & Distribuidores</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Directorio de Agencias & Precios de Fábrica
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Administra cupos de crédito comercial, niveles de descuento (Tier) y despacho de marca blanca para distribuidores.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsTierModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Settings2 size={16} />
            <span>Configurar Niveles B2B</span>
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm">
            <Plus size={16} />
            <span>Nuevo Cliente B2B</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Facturación B2B Mes</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{formatCOP(totalMonthlyB2B)}</span>
            <span className="text-[11px] font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
              <TrendingUp size={12} /> +18.4% vs mes anterior
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <Building2 size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Cartera / Crédito Colocado</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{formatCOP(totalCreditPlaced)}</span>
            <span className="text-[11px] font-semibold text-slate-500 mt-0.5 block">
              En plazos de 15, 30 y 45 días
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <CreditCard size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Aliados Activos</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{accounts.length} Cuentas</span>
            <span className="text-[11px] font-semibold text-teal-600 mt-0.5 block">
              100% Verificados en Cámara de Comercio
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por empresa, NIT, contacto o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter size={15} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-600">Nivel Comercial:</span>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="ALL">Todos los Niveles</option>
            <option value="PLATINUM_PRINTER">Platinum VIP (25%)</option>
            <option value="GOLD_DISTRIBUTOR">Gold Distribuidor (18%)</option>
            <option value="SILVER_AGENCY">Silver Agencia (10%)</option>
          </select>
        </div>

      </div>

      {/* TABLA DE CUENTAS B2B */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Empresa / Razón Social</th>
                <th className="py-3.5 px-4">Nivel & Dto</th>
                <th className="py-3.5 px-4">Cupo de Crédito</th>
                <th className="py-3.5 px-4">Facturación Mes</th>
                <th className="py-3.5 px-4">Marca Blanca</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAccounts.map((account) => {
                const tierInfo = tierConfig[account.tier];
                const availableCredit = account.creditLimit - account.creditUsed;
                return (
                  <tr key={account.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{account.companyName}</span>
                          <span className="text-[10px] font-semibold text-slate-400">({account.city})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>NIT: {account.nit}</span>
                          <span>·</span>
                          <span>{account.contactPerson}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${tierInfo.bgColor} ${tierInfo.color} border ${tierInfo.borderColor}`}>
                        <Award size={13} />
                        {tierInfo.badge} (-{account.discountPercentage}%)
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900">{formatCOP(availableCredit)} Disp.</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          Límite: {formatCOP(account.creditLimit)} (Uso: {formatCOP(account.creditUsed)})
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900">{formatCOP(account.monthlyVolume)}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      {account.whiteLabelPacking ? (
                        <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-md font-bold text-[10px]">
                          Empaque Neutro
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Membretado Estándar</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                        <CheckCircle2 size={13} /> Verificado
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                      <a
                        href={`https://wa.me/${account.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 w-8 h-8 rounded-lg transition-colors"
                        title="Contactar por WhatsApp"
                      >
                        <Phone size={14} />
                      </a>
                      <button
                        onClick={() => handleManageAccount(account)}
                        className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm"
                      >
                        <Settings2 size={14} />
                        <span>Gestionar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE GESTIÓN B2B */}
      {isModalOpen && editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Gestionar Cliente B2B</h3>
                  <p className="text-xs text-slate-500 font-medium">{editingAccount.companyName} ({editingAccount.nit})</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-xl border border-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              
              {/* Sección: Configuración Comercial */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Award size={14} className="text-teal-600" />
                  Beneficios y Nivel Comercial
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nivel Asignado (Tier)</label>
                    <select 
                      value={editingAccount.tier}
                      onChange={(e) => {
                        const newTier = e.target.value as B2BTierLevel;
                        const defaultDiscount = newTier === 'PLATINUM_PRINTER' ? 25 : newTier === 'GOLD_DISTRIBUTOR' ? 18 : 10;
                        setEditingAccount({ ...editingAccount, tier: newTier, discountPercentage: defaultDiscount });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    >
                      <option value="PLATINUM_PRINTER">Platinum VIP / Impresor (+25% Dcto)</option>
                      <option value="GOLD_DISTRIBUTOR">Gold Distribuidor (+18% Dcto)</option>
                      <option value="SILVER_AGENCY">Silver Agencia (+10% Dcto)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Descuento Global (%)</label>
                    <div className="relative">
                      <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="number"
                        value={editingAccount.discountPercentage}
                        onChange={(e) => setEditingAccount({...editingAccount, discountPercentage: Number(e.target.value)})}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Financiera */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  <CreditCard size={14} className="text-amber-600" />
                  Línea de Crédito y Cartera
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Cupo de Crédito (COP)</label>
                    <input 
                      type="number"
                      value={editingAccount.creditLimit}
                      onChange={(e) => setEditingAccount({...editingAccount, creditLimit: Number(e.target.value)})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Crédito Utilizado (No Editable)</label>
                    <input 
                      type="text"
                      disabled
                      value={formatCOP(editingAccount.creditUsed)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Logística */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Package size={14} className="text-indigo-600" />
                  Logística de Despacho
                </h4>
                <label className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">Empaque Neutro (Marca Blanca)</span>
                    <span className="text-xs text-slate-500 block">Enviar pedidos sin logos de la imprenta, útil para intermediarios.</span>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={editingAccount.whiteLabelPacking}
                      onChange={(e) => setEditingAccount({...editingAccount, whiteLabelPacking: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                  </div>
                </label>
              </div>

              {/* Historial Rápido de Pedidos */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                  <History size={14} className="text-slate-600" />
                  Últimos Pedidos
                </h4>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-900">Orden #2026-4491</div>
                    <div className="text-xs text-slate-500">Impresión de Revistas Grapadas x500</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900">{formatCOP(1250000)}</div>
                    <div className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full inline-block mt-1">A Crédito (Pendiente)</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveChanges}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Save size={16} />
                <span>Guardar Cambios</span>
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURACIÓN GLOBAL DE NIVELES */}
      {isTierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Settings2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Configuración Global B2B</h3>
                  <p className="text-xs text-slate-500 font-medium">Ajusta los porcentajes, mínimos y plazos de cada nivel comercial.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTierModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-xl border border-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {(Object.entries(tierConfig) as [B2BTierLevel, any][]).filter(([key]) => key !== 'RETAIL').map(([tierKey, config]) => (
                  <div key={tierKey} className={`bg-white rounded-2xl border ${config.borderColor} shadow-sm overflow-hidden`}>
                    <div className={`${config.bgColor} p-4 border-b ${config.borderColor}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Award size={16} className={config.color} />
                        <h4 className={`font-black text-sm ${config.color}`}>{config.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{config.badge}</p>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Descuento (%)</label>
                        <div className="relative">
                          <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="number"
                            value={config.discount}
                            onChange={(e) => setTierConfig({
                              ...tierConfig,
                              [tierKey]: { ...config, discount: Number(e.target.value) }
                            })}
                            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Volumen Mensual Min. (COP)</label>
                        <input 
                          type="number"
                          value={config.minMonthlyVolume}
                          onChange={(e) => setTierConfig({
                            ...tierConfig,
                            [tierKey]: { ...config, minMonthlyVolume: Number(e.target.value) }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Días de Crédito Plazo</label>
                        <input 
                          type="number"
                          value={config.paymentTerms}
                          onChange={(e) => setTierConfig({
                            ...tierConfig,
                            [tierKey]: { ...config, paymentTerms: Number(e.target.value) }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button 
                onClick={() => setIsTierModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveTierConfig}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Save size={16} />
                <span>Guardar Configuración Global</span>
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
