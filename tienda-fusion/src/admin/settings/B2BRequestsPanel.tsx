import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, RefreshCw, ShieldCheck, Ban } from 'lucide-react';
import { B2B_TIER_CONFIG, B2BTierLevel } from '../../lib/b2bEngine';

interface B2BAccount {
  id: number;
  email: string;
  tier: B2BTierLevel;
  discountPercentage: number;
  isVerifiedB2B: boolean;
  request: null | {
    tier: B2BTierLevel;
    companyName: string;
    nit: string;
    contactPerson: string;
    phone: string;
    city: string;
    whiteLabelPacking?: boolean;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedAt: string;
    reviewedAt?: string;
    reviewedBy?: string;
  };
}

/**
 * Solicitudes y cuentas B2B reales (guardadas en la base de datos).
 * Aprobar una solicitud activa el descuento del nivel en el servidor.
 */
export default function B2BRequestsPanel() {
  const [accounts, setAccounts] = useState<B2BAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [tierChoice, setTierChoice] = useState<Record<number, B2BTierLevel>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/b2b/accounts');
      if (!res.ok) throw new Error('No se pudieron cargar las solicitudes B2B.');
      setAccounts(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const review = async (account: B2BAccount, action: 'approve' | 'reject' | 'revoke') => {
    setBusyId(account.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/b2b/accounts/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, tier: tierChoice[account.id] || account.request?.tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'No se pudo actualizar la cuenta.');
      setAccounts(prev => prev.map(a => (a.id === account.id ? data : a)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const tierOptions = (Object.keys(B2B_TIER_CONFIG) as B2BTierLevel[]).filter(t => t !== 'RETAIL');
  const pendingCount = accounts.filter(a => a.request?.status === 'PENDING').length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck size={18} className="text-teal-600" />
            Solicitudes y cuentas B2B reales
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[11px] font-black px-2 py-0.5 rounded-full">{pendingCount} pendientes</span>
            )}
          </h2>
          <p className="text-xs text-slate-500">El descuento solo se aplica en el checkout a cuentas aprobadas aquí.</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" title="Recargar">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl p-3">{error}</div>}

      {!loading && accounts.length === 0 && (
        <p className="px-6 py-8 text-sm text-slate-500 text-center">Aún no hay solicitudes B2B.</p>
      )}

      <div className="divide-y divide-slate-100">
        {accounts.map(account => {
          const req = account.request;
          const status = account.isVerifiedB2B ? 'APPROVED' : req?.status || 'PENDING';
          return (
            <div key={account.id} className="px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0 text-sm">
                <div className="font-bold text-slate-900 truncate">{req?.companyName || account.email}</div>
                <div className="text-xs text-slate-500 truncate">
                  {account.email}{req ? ` · NIT ${req.nit} · ${req.contactPerson} · ${req.phone} · ${req.city}` : ''}
                </div>
                {req && (
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Solicita: {B2B_TIER_CONFIG[req.tier]?.badge} · {new Date(req.requestedAt).toLocaleDateString('es-CO')}
                    {req.whiteLabelPacking ? ' · Marca blanca' : ''}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {status === 'APPROVED' && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={13} /> {B2B_TIER_CONFIG[account.tier]?.badge} · {account.discountPercentage}%
                  </span>
                )}
                {status === 'PENDING' && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Clock size={13} /> Pendiente
                  </span>
                )}
                {status === 'REJECTED' && (
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <XCircle size={13} /> Rechazada
                  </span>
                )}

                <select
                  value={tierChoice[account.id] || (account.isVerifiedB2B ? account.tier : req?.tier) || 'SILVER_AGENCY'}
                  onChange={e => setTierChoice(prev => ({ ...prev, [account.id]: e.target.value as B2BTierLevel }))}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                >
                  {tierOptions.map(t => (
                    <option key={t} value={t}>{B2B_TIER_CONFIG[t].badge} ({B2B_TIER_CONFIG[t].discount}%)</option>
                  ))}
                </select>

                <button
                  disabled={busyId === account.id}
                  onClick={() => review(account, 'approve')}
                  className="text-xs font-bold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
                >
                  {account.isVerifiedB2B ? 'Cambiar nivel' : 'Aprobar'}
                </button>
                {account.isVerifiedB2B ? (
                  <button
                    disabled={busyId === account.id}
                    onClick={() => review(account, 'revoke')}
                    className="text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <Ban size={13} /> Revocar
                  </button>
                ) : status === 'PENDING' && (
                  <button
                    disabled={busyId === account.id}
                    onClick={() => review(account, 'reject')}
                    className="text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 px-3 py-1.5 rounded-lg"
                  >
                    Rechazar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
