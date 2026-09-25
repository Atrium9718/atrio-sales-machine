"use client";

import * as React from "react";
import { Activity, Users, Plus, Search, FileText, UploadCloud, Phone, Mail, Building, Eye, MessageSquare, MapPin, Database, Trash2 } from "lucide-react";
import { ImportDatabaseModal } from "@/components/ImportDatabaseModal";
import { ClientFormModal } from "@/components/ClientFormModal";
import { ClientDetailModal } from "@/components/ClientDetailModal";
import { getAllCustomers, isQuotaExhaustedToday, clearAllCustomers } from "@/lib/customerService";
import { useNavigate } from "react-router-dom";
import { PhoneLink } from "@fusion/ui";

export default function ClientsPage() {
  const navigate = useNavigate();
  const [showImport, setShowImport] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [selectedClientForDetail, setSelectedClientForDetail] = React.useState<any>(null);

  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [clearing, setClearing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedType, setSelectedType] = React.useState("");
  const [selectedTemp, setSelectedTemp] = React.useState("");
  const [quotaNotice, setQuotaNotice] = React.useState(false);

  const handleClearDatabase = async () => {
    if (!confirm('¿Estás seguro de que deseas vaciar TODOS los clientes actuales de la base de datos? Esto removerá los registros defectuosos anteriores para que puedas cargar la lista limpia.')) return;
    setClearing(true);
    try {
      const res = await clearAllCustomers();
      alert(res.message || 'Base de datos limpiada exitosamente.');
      await fetchClients();
    } catch (err: any) {
      alert('Error al vaciar base de datos: ' + err.message);
    } finally {
      setClearing(false);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await getAllCustomers();
      setClients(res.customers);
      setQuotaNotice(res.isQuotaExhausted || isQuotaExhaustedToday());
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchClients();
  }, []);

  // Filter clients by search query and dropdowns
  const filteredClients = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return clients.filter((c) => {
      // Type filter
      if (selectedType && c.type !== selectedType) return false;
      // Temp filter
      if (selectedTemp && c.temp !== selectedTemp) return false;

      if (!q) return true;

      const name = String(c.name || "").toLowerCase();
      const tradeName = String(c.tradeName || "").toLowerCase();
      const nit = String(c.nit || c.doc || "").toLowerCase();
      const phone1 = String(c.phone1 || c.phone || "").toLowerCase();
      const phone2 = String(c.phone2 || "").toLowerCase();
      const email = String(c.email || "").toLowerCase();
      const billingContact = String(c.billingContact || "").toLowerCase();
      const address = String(c.address || "").toLowerCase();

      return (
        name.includes(q) ||
        tradeName.includes(q) ||
        nit.includes(q) ||
        phone1.includes(q) ||
        phone2.includes(q) ||
        email.includes(q) ||
        billingContact.includes(q) ||
        address.includes(q)
      );
    });
  }, [clients, searchQuery, selectedType, selectedTemp]);

  const handleStartQuote = (client: any) => {
    navigate(`/dashboard/cotizaciones?clientId=${client.id}&clientName=${encodeURIComponent(client.name)}`);
  };

  const cleanPhoneForWa = (phoneStr: string) => {
    const digits = (phoneStr || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length === 10 && digits.startsWith("3")) {
      return `57${digits}`;
    }
    return digits;
  };

  return (
    <div className="space-y-6 relative">
      {showImport && (
        <ImportDatabaseModal
          onClose={() => setShowImport(false)}
          onImportComplete={() => {
            setShowImport(false);
            fetchClients();
          }}
        />
      )}

      {showCreate && (
        <ClientFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            fetchClients();
          }}
        />
      )}

      {selectedClientForDetail && (
        <ClientDetailModal
          client={selectedClientForDetail}
          onClose={() => setSelectedClientForDetail(null)}
          onNewQuote={handleStartQuote}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Directorio de Clientes
          </h1>
          <p className="text-muted-foreground text-sm">
            Gestión completa de clientes, NITs, contactos de facturación y teléfonos comerciales.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {clients.length > 0 && (
            <button
              onClick={handleClearDatabase}
              disabled={clearing}
              className="inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 border border-danger/20 text-danger hover:bg-danger/10 h-9 px-3 py-2 shadow-sm"
              title="Eliminar los registros anteriores para cargar una base limpia"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {clearing ? "Vaciando..." : "Vaciar DB"}
            </button>
          )}
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 border border-input bg-card hover:bg-muted h-9 px-4 py-2 shadow-sm"
          >
            <UploadCloud className="w-4 h-4 mr-2 text-primary" />
            Importar DB (Excel)
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {quotaNotice && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs sm:text-sm text-amber-700 dark:text-amber-300">
          <Database className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <span className="font-semibold">Modo de Almacenamiento Local Activo:</span> La cuota gratuita de escritura diaria de Firebase Cloud (20,000 operaciones) se ha completado hoy. Tus clientes y modificaciones se están guardando de forma segura y persistente en este navegador, con el CRM funcionando al 100%.
          </div>
        </div>
      )}

      {/* FilterBar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-xl border border-border shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por Nombre, NIT, Teléfono, Correo o Dirección..."
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="h-9 w-36 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Tipo (Todos)</option>
          <option value="PROSPECT">Prospecto</option>
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
        </select>
        <select
          value={selectedTemp}
          onChange={(e) => setSelectedTemp(e.target.value)}
          className="h-9 w-36 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Temperatura</option>
          <option value="HOT">Caliente</option>
          <option value="WARM">Tibio</option>
          <option value="COLD">Frío</option>
        </select>

        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-muted-foreground hover:text-foreground self-center px-2 py-1"
          >
            Limpiar filtro
          </button>
        )}
      </div>

      {/* DataTable */}
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3.5 font-bold">Cliente / Razón Social</th>
                <th className="px-6 py-3.5 font-bold">NIT / Documento</th>
                <th className="px-6 py-3.5 font-bold">Teléfonos</th>
                <th className="px-6 py-3.5 font-bold">Correo Electrónico</th>
                <th className="px-6 py-3.5 font-bold">Dirección / Facturación</th>
                <th className="px-6 py-3.5 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Cargando directorio de clientes...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    {searchQuery
                      ? "No se encontraron clientes que coincidan con la búsqueda."
                      : 'No hay clientes registrados. Utiliza "Importar DB" para cargar tu archivo de Excel.'}
                  </td>
                </tr>
              ) : (
                filteredClients.map((c) => {
                  const mainPhone = c.phone1 || c.phone;
                  const waNumber = cleanPhoneForWa(mainPhone);
                  const hasMorePhones = Boolean(c.phone2 || c.phone3);

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedClientForDetail(c)}
                    >
                      {/* Name / Trade Name */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {c.name}
                          </span>
                          {c.tradeName && (
                            <span className="text-xs text-primary font-medium flex items-center gap-1 mt-0.5">
                              <Building className="w-3 h-3" />
                              {c.tradeName}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground mt-0.5">{c.code}</span>
                        </div>
                      </td>

                      {/* NIT */}
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-muted/60 text-foreground border border-border">
                          {c.nit || c.doc || "Sin NIT"}
                        </span>
                      </td>

                      {/* Phones */}
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1">
                          {mainPhone ? (
                            <div className="flex items-center gap-2">
                              <PhoneLink phone={mainPhone} name={c.name} customerId={c.id} />
                              {waNumber && (
                                <a
                                  href={`https://wa.me/${waNumber}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#25D366] hover:opacity-80 p-0.5 rounded"
                                  title="Abrir chat en WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                          {hasMorePhones && (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              + otros registrados ({[c.phone2, c.phone3].filter(Boolean).length})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs">
                          <span className="text-foreground font-medium truncate max-w-[180px]">
                            {c.email || "-"}
                          </span>
                          {c.billingEmail && c.billingEmail !== c.email && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                              Fact: {c.billingEmail}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Address & Billing */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs max-w-[200px]">
                          {c.address ? (
                            <span className="text-foreground truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                              {c.address}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                          {c.billingContact && (
                            <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                              Contacto: {c.billingContact}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedClientForDetail(c)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Ver ficha completa"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStartQuote(c)}
                            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors font-medium text-xs flex items-center gap-1"
                            title="Cotizar a este cliente"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Stacked Cards */}
        <div className="md:hidden divide-y divide-border p-4 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Cargando clientes...</div>
          ) : filteredClients.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No hay clientes encontrados.</div>
          ) : (
            filteredClients.map((c) => (
              <div
                key={`mobile-${c.id}`}
                onClick={() => setSelectedClientForDetail(c)}
                className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-bold text-foreground text-sm block">{c.name}</span>
                    {c.tradeName && (
                      <span className="text-xs text-primary font-medium block">
                        Comercial: {c.tradeName}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground font-mono">
                      NIT: {c.nit || c.doc || "Sin NIT"}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartQuote(c);
                    }}
                    className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-bold flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Cotizar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-muted-foreground">Teléfono</span>
                    <span className="font-medium text-foreground">{c.phone1 || c.phone || "-"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-muted-foreground">Correo</span>
                    <span className="font-medium text-foreground truncate block">{c.email || "-"}</span>
                  </div>
                </div>

                {c.address && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{c.address}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/20">
          <span className="text-xs text-muted-foreground">
            Mostrando <b>{filteredClients.length}</b> de <b>{clients.length}</b> clientes cargados
          </span>
        </div>
      </div>
    </div>
  );
}
