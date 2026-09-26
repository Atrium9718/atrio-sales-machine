/**
 * Panel del Autor: Seguimiento de Lecturas y Acuses (Etapa 15.4 — Bloque C)
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  BellRing,
  AlertTriangle,
  Search,
  Download,
  Filter,
  ShieldCheck,
  Building,
  Mail,
  RefreshCw,
} from 'lucide-react';

import { useFusionAuth } from '../../context/FusionAuthContext';

export const AnuncioLecturasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useFusionAuth();

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMADO' | 'PENDIENTE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Recordatorio
  const [reminding, setReminding] = useState<boolean>(false);
  const [remindResult, setRemindResult] = useState<{ success: boolean; message: string; wasForced?: boolean } | null>(null);
  const [outsideHoursWarning, setOutsideHoursWarning] = useState<boolean>(false);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/announcements/${id}/receipts`, {
        headers: {
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'admin',
        },
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'No se pudieron cargar los acuses de lectura');
      }
      setData(resData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [id]);

  // Despachar recordatorio manual
  const handleSendReminder = async (force: boolean = false) => {
    try {
      setReminding(true);
      setRemindResult(null);
      setOutsideHoursWarning(false);

      const res = await fetch(`/api/announcements/${id}/remind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'admin',
        },
        body: JSON.stringify({ forceOutsideHours: force }),
      });

      const resData = await res.json();
      if (!res.ok) {
        if (resData.outsideBusinessHours) {
          setOutsideHoursWarning(true);
          return;
        }
        throw new Error(resData.error || 'Error al enviar recordatorio');
      }

      setRemindResult({
        success: true,
        message: resData.message,
        wasForced: resData.wasForced,
      });
      fetchReceipts();
    } catch (err: any) {
      setRemindResult({
        success: false,
        message: err.message,
      });
    } finally {
      setReminding(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 text-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-muted-foreground">Cargando reporte de acuses y lecturas...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Acceso no disponible</h2>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Link
          to={`/anuncios/${id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Anuncio
        </Link>
      </div>
    );
  }

  const { announcement, metrics, receipts } = data;

  // Filtrado de la tabla
  const filteredReceipts = receipts.filter((r: any) => {
    if (statusFilter === 'CONFIRMADO' && r.statusBadge !== 'CONFIRMADO') return false;
    if (statusFilter === 'PENDIENTE' && r.statusBadge === 'CONFIRMADO') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        r.areaKey.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to={`/anuncios/${announcement.id}`}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Auditoría de Lecturas y Acuses
            </h1>
          </div>
          <p className="text-xs text-muted-foreground ml-8">
            Monitoreo en tiempo real de recepción, lectura y confirmación obligatoria para:
            <strong className="text-foreground ml-1">{announcement.title}</strong>
          </p>
        </div>

        {/* Acciones de recordatorio */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchReceipts()}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            title="Refrescar métricas"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={reminding || metrics.pendingCount === 0}
            onClick={() => handleSendReminder(false)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/20 transition-all disabled:opacity-50"
          >
            <BellRing className="w-3.5 h-3.5" />
            Recordar a Pendientes ({metrics.pendingCount})
          </button>
        </div>
      </div>

      {/* Alerta de Horario Laboral / Festivo en Colombia */}
      {outsideHoursWarning && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 font-bold">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Fuera de Horario Laboral Colombiano (L-V 08:00 - 18:00 o Día Festivo)</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            De acuerdo a la política laboral de la empresa (Etapa 4), no se envían recordatorios automáticos por WhatsApp o Correo fuera de jornada ordinaria para respetar el descanso de los trabajadores.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => handleSendReminder(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors"
            >
              Forzar envío de emergencia
            </button>
            <button
              onClick={() => setOutsideHoursWarning(false)}
              className="text-xs text-muted-foreground hover:underline"
            >
              Cancelar y esperar a jornada hábil
            </button>
          </div>
        </div>
      )}

      {remindResult && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            remindResult.success
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-800 dark:text-red-300'
          }`}
        >
          {remindResult.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{remindResult.message}</span>
          {remindResult.wasForced && (
            <span className="ml-auto text-[10px] font-mono bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-700">
              ENVÍO FORZADO
            </span>
          )}
        </div>
      )}

      {/* Tarjetas de Métricas de Lectura */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-card border border-border rounded-xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Total Destinatarios
          </span>
          <p className="text-2xl font-bold text-foreground">{metrics.totalTarget}</p>
          <span className="text-[11px] text-muted-foreground">Audiencia asignada</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Tasa de Lectura
          </span>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {metrics.readPercent}%
            </p>
            <span className="text-xs text-muted-foreground">({metrics.readCount} leídos)</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${metrics.readPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Acuse Confirmado
          </span>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.acknowledgedPercent}%
            </p>
            <span className="text-xs text-muted-foreground">({metrics.acknowledgedCount})</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all"
              style={{ width: `${metrics.acknowledgedPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Pendientes
          </span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {metrics.pendingCount}
          </p>
          <span className="text-[11px] text-muted-foreground">Sin acuse formal</span>
        </div>
      </div>

      {/* Tabla de Acuses Individuales */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden space-y-3 p-4">
        {/* Barra de Filtro y Búsqueda */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos ({receipts.length})
            </button>
            <button
              onClick={() => setStatusFilter('CONFIRMADO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'CONFIRMADO'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Confirmados ({metrics.acknowledgedCount})
            </button>
            <button
              onClick={() => setStatusFilter('PENDIENTE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'PENDIENTE'
                  ? 'bg-amber-600 text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Pendientes ({metrics.pendingCount})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar colaborador, área o rol..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                <th className="pb-2 font-bold">Colaborador</th>
                <th className="pb-2 font-bold">Área / Rol</th>
                <th className="pb-2 font-bold">Estado Acuse</th>
                <th className="pb-2 font-bold">Fecha Confirmación</th>
                <th className="pb-2 font-bold">IP Auditoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredReceipts.map((r: any) => (
                <tr key={r.userId} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3">
                    <p className="font-bold text-foreground">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground">{r.email}</p>
                  </td>
                  <td className="py-3">
                    <p className="font-medium text-foreground capitalize">{r.role}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{r.areaKey}</p>
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.statusBadge === 'CONFIRMADO'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : r.statusBadge === 'LEIDO'
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          : r.statusBadge === 'VISTO'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {r.statusBadge === 'CONFIRMADO' && <CheckCircle2 className="w-3 h-3" />}
                      {r.statusBadge}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {r.acknowledgedAt ? (
                      <span className="font-mono text-[11px] text-foreground">
                        {new Date(r.acknowledgedAt).toLocaleString('es-CO')}
                      </span>
                    ) : (
                      <span className="italic text-amber-600 dark:text-amber-400">
                        {r.readAt ? 'Leído (Falta confirmar)' : 'No leído'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 font-mono text-[10px] text-muted-foreground">
                    {r.acknowledgedIp || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredReceipts.length === 0 && (
            <p className="text-center py-6 text-xs text-muted-foreground italic">
              No se encontraron colaboradores con los criterios seleccionados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
