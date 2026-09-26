"use client";

import * as React from "react";
import { UploadCloud, Table, CheckCircle2, AlertTriangle, ArrowRight, FileText, Trash2, RefreshCw, Building, Phone, Mail, MapPin, UserCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import * as xlsx from "xlsx";
import { parseWorksheet, ParsedCustomerRecord } from "@/components/ImportDatabaseModal";
import { importCustomers, clearAllCustomers } from "@/lib/customerService";

export default function ClientesImportarPage() {
  const navigate = useNavigate();
  const [file, setFile] = React.useState<File | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [parsedRows, setParsedRows] = React.useState<ParsedCustomerRecord[]>([]);
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [importStats, setImportStats] = React.useState<{ processed: number; total: number } | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string>("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
      setIsProcessing(true);

      try {
        const data = await selectedFile.arrayBuffer();
        const workbook = xlsx.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const customers = parseWorksheet(worksheet);

        if (!customers || customers.length === 0) {
          throw new Error("No se encontraron clientes válidos en el archivo. Verifica el formato de tu Excel.");
        }

        setParsedRows(customers);
        setStep(2);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error al procesar el archivo Excel.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm("¿Deseas vaciar todos los clientes existentes en la base de datos? Esto removerá los datos defectuosos anteriores.")) return;
    setIsClearing(true);
    try {
      const res = await clearAllCustomers();
      alert(res.message || "Base de datos vaciada exitosamente.");
    } catch (err: any) {
      alert("Error al vaciar: " + err.message);
    } finally {
      setIsClearing(false);
    }
  };

  const executeImport = async (wipeFirst: boolean = false) => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setImportStats({ processed: 0, total: parsedRows.length });

    try {
      if (wipeFirst) {
        setStatusMessage("Limpiando registros antiguos...");
        await clearAllCustomers();
      }

      setStatusMessage(`Guardando ${parsedRows.length.toLocaleString()} clientes...`);

      const rowsToImport = parsedRows.map((parsed, i) => {
        const primaryPhone = parsed.phone1 || parsed.phone2 || parsed.phone3 || "";
        const primaryEmail = parsed.email || parsed.billingEmail || "";

        return {
          code: `CLI-${Date.now()}-${i}`,
          nit: parsed.nit,
          doc: parsed.nit,
          doc_clean: parsed.nit.replace(/[^0-9a-zA-Z]/g, ""),
          name: parsed.name,
          name_lower: parsed.name.toLowerCase(),
          tradeName: parsed.tradeName || "",
          tradeName_lower: (parsed.tradeName || "").toLowerCase(),
          firstName: parsed.firstName || "",
          secondName: parsed.secondName || "",
          firstLastName: parsed.firstLastName || "",
          secondLastName: parsed.secondLastName || "",
          address: parsed.address || "",
          phone1: parsed.phone1 || "",
          phone2: parsed.phone2 || "",
          phone3: parsed.phone3 || "",
          phone: primaryPhone,
          email: primaryEmail,
          billingContact: parsed.billingContact || "",
          billingEmail: parsed.billingEmail || "",
          sector: "General",
          type: "ACTIVE",
          temp: "WARM",
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
      });

      const res = await importCustomers(rowsToImport, (processed, tot) => {
        setImportStats({ processed, total: tot });
      });

      setStatusMessage(res.message);
      setStep(3);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error al importar los clientes.");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalValid = parsedRows.length;
  const withNit = parsedRows.filter((r) => r.nit).length;
  const withPhone = parsedRows.filter((r) => r.phone1 || r.phone2 || r.phone3).length;
  const withEmail = parsedRows.filter((r) => r.email || r.billingEmail).length;

  return (
    <div className="flex flex-col max-w-[1200px] mx-auto w-full pb-12 font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Importar Clientes desde Excel</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Carga y mapeo integral de las 14 columnas del sistema (NIT, Nombres, Teléfonos 1-2-3, Dirección, Facturación)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClearDatabase}
            disabled={isClearing}
            className="text-xs font-semibold text-danger hover:bg-danger/10 px-3 py-2 rounded-lg border border-danger/20 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isClearing ? "Vaciando..." : "Vaciar Base de Datos"}
          </button>
          <Link to="/dashboard/clientes" className="text-sm font-bold text-muted-foreground hover:text-foreground">
            Volver a Clientes
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Error al procesar</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full"></div>
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full transition-all duration-300"
          style={{ width: `${((step - 1) / 2) * 100}%` }}
        ></div>

        <div className="w-full flex justify-between relative z-10">
          {[
            { num: 1, label: "Subir Archivo", icon: UploadCloud },
            { num: 2, label: "Validar y Mapear", icon: Table },
            { num: 3, label: "Completado", icon: CheckCircle2 },
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-2 bg-background px-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-2 ${
                  step >= s.num
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-muted"
                }`}
              >
                <s.icon className="w-4 h-4" />
              </div>
              <span className={`text-xs font-bold ${step >= s.num ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold">1. Selecciona tu Archivo Excel o CSV</h2>

            <div className="bg-muted/20 border border-border rounded-xl p-4 text-xs space-y-2">
              <span className="font-semibold text-foreground block">
                Estructura de 14 columnas reconocida automáticamente:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "NIT",
                  "NOMBRE",
                  "PRIMER NOMBRE",
                  "SEGUNDO NOMBRE",
                  "PRIMER APELLIDO",
                  "SEGUNDO APELLIDO",
                  "DIRECCIÓN",
                  "TELÉFONO 1",
                  "TELÉFONO 2",
                  "TELÉFONO 3",
                  "CORREO ELECTRÓNICO",
                  "CONTACTO DE FACTURACIÓN",
                  "E-MAILS CONTACTOS DE FACTURACIÓN",
                  "NOMBRE COMERCIAL",
                ].map((col) => (
                  <span
                    key={col}
                    className="px-2 py-0.5 rounded-md bg-background border border-border text-[11px] font-mono text-muted-foreground"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center hover:bg-muted/30 transition-colors relative cursor-pointer">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-12 h-12 text-primary mb-4" />
              <p className="text-base font-bold text-foreground">Haz clic o arrastra tu archivo Excel aquí</p>
              <p className="text-sm text-muted-foreground mt-1">Soporta .xlsx, .xls y .csv (sin límite de registros)</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">2. Vista Previa de Datos Interpretados</h2>
                <p className="text-sm text-muted-foreground">
                  Se reconocieron <strong>{totalValid.toLocaleString()}</strong> clientes listos para importar desde{" "}
                  <strong>{file?.name}</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">
                  ✓ {withNit.toLocaleString()} con NIT
                </span>
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  ✓ {withPhone.toLocaleString()} con Teléfono
                </span>
                <span className="px-2.5 py-1 rounded-full bg-info/10 text-info text-xs font-semibold">
                  ✓ {withEmail.toLocaleString()} con Correo
                </span>
              </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground font-bold uppercase sticky top-0 border-b border-border">
                  <tr>
                    <th className="p-3">Cliente / Razón Social</th>
                    <th className="p-3">NIT</th>
                    <th className="p-3">Nombre Comercial</th>
                    <th className="p-3">Teléfonos</th>
                    <th className="p-3">Correo</th>
                    <th className="p-3">Dirección</th>
                    <th className="p-3">Facturación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="p-3 font-bold text-foreground">{row.name}</td>
                      <td className="p-3 font-mono font-semibold">{row.nit || "-"}</td>
                      <td className="p-3 text-muted-foreground">{row.tradeName || "-"}</td>
                      <td className="p-3 font-mono">
                        {[row.phone1, row.phone2, row.phone3].filter(Boolean).join(" / ") || "-"}
                      </td>
                      <td className="p-3 text-muted-foreground">{row.email || "-"}</td>
                      <td className="p-3 text-muted-foreground max-w-[200px] truncate">{row.address || "-"}</td>
                      <td className="p-3 text-muted-foreground">
                        {row.billingContact ? `${row.billingContact}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 10 && (
                <div className="p-3 text-center text-xs text-muted-foreground bg-muted/20 border-t border-border">
                  Mostrando los primeros 10 de {parsedRows.length.toLocaleString()} registros.
                </div>
              )}
            </div>

            {importStats && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{statusMessage}</span>
                  <span>{Math.round((importStats.processed / importStats.total) * 100)}%</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(importStats.processed / importStats.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setStep(1)}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground border border-input rounded-lg hover:bg-muted transition-colors"
              >
                Elegir otro archivo
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => executeImport(true)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  title="Elimina registros defectuosos anteriores y carga la lista limpia"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reemplazar y Cargar Todo ({totalValid.toLocaleString()})
                </button>
                <button
                  onClick={() => executeImport(false)}
                  disabled={isProcessing}
                  className="px-5 py-2 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? "Importando..." : `Importar ${totalValid.toLocaleString()} Clientes`}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center text-success mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">¡Base de Datos Importada con Éxito!</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              {statusMessage || `Se han cargado ${parsedRows.length.toLocaleString()} clientes correctamente.`} Todos los
              clientes con NIT, teléfonos y datos de facturación están disponibles para búsquedas y cotizaciones.
            </p>
            <div className="pt-4 flex gap-3">
              <Link
                to="/dashboard/clientes"
                className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
              >
                Ver Directorio de Clientes
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
