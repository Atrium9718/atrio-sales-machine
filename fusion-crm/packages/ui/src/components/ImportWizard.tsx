"use client";

import * as React from "react";
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, ChevronRight, X } from "lucide-react";
import { z } from "zod";

export interface ImportWizardProps<T> {
  title: string;
  expectedColumns: { key: string; label: string; required?: boolean }[];
  onImport: (mappedData: any[]) => Promise<void>;
  onClose: () => void;
}

export function ImportWizard<T>({ title, expectedColumns, onImport, onClose }: ImportWizardProps<T>) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);

  // En una implementación real se usaría PapaParse para CSV o xlsx para parsear el archivo
  // y se guardarían los encabezados extraídos aquí.
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      // MOCK: Simular extracción de encabezados
      setHeaders(["Nombre Empresa", "NIT", "Correo", "Teléfono", "Ciudad"]);
      setStep(2);
    }
  };

  const handleMappingComplete = () => {
    // MOCK: Simular validación
    setStep(3);
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      // MOCK: Simular envío de datos mappeados a la API/Worker
      await onImport([]);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-card border border-border rounded-xl shadow-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Stepper */}
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute left-0 top-1/2 w-full h-0.5 bg-muted -z-10 -translate-y-1/2" />
            {[
              { num: 1, label: "Subir Archivo" },
              { num: 2, label: "Mapear Columnas" },
              { num: 3, label: "Previsualizar" }
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center bg-card px-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                  step >= s.num ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted border-muted text-muted-foreground'
                }`}>
                  {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </div>
                <span className={`text-xs mt-2 font-medium ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Paso 1: Subir */}
          {step === 1 && (
            <div className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4 hover:bg-muted/30 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept=".csv, .xlsx" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Haz clic o arrastra un archivo</h3>
                <p className="text-muted-foreground text-sm mt-1">Soporta .csv y .xlsx hasta 10MB</p>
              </div>
            </div>
          )}

          {/* Paso 2: Mapear */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-4 rounded-lg flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>Hemos detectado 5 columnas en tu archivo. Empareja las columnas de tu archivo con los campos del sistema.</p>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Campo del Sistema</th>
                      <th className="px-4 py-3 font-medium">Columna del Archivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {expectedColumns.map(col => (
                      <tr key={col.key}>
                        <td className="px-4 py-3 font-medium">
                          {col.label}
                          {col.required && <span className="text-red-500 ml-1">*</span>}
                        </td>
                        <td className="px-4 py-3">
                          <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1">
                            <option value="">-- Ignorar este campo --</option>
                            {headers.map(h => (
                               <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <button onClick={handleMappingComplete} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: Previsualizar */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-card border border-border rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-500">124</div>
                  <div className="text-sm text-muted-foreground mt-1">Filas Válidas</div>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg text-center">
                  <div className="text-2xl font-bold text-amber-500">3</div>
                  <div className="text-sm text-muted-foreground mt-1">Duplicados detectados</div>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-500">1</div>
                  <div className="text-sm text-muted-foreground mt-1">Con errores</div>
                </div>
              </div>

              {/* Data Table Preview Mock */}
              <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Previsualización de los primeros 5 registros lista.</p>
                <p className="text-sm mt-1">Los duplicados ofrecen opción de "Omitir" o "Actualizar".</p>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setStep(2)} className="px-4 py-2 rounded-md border border-input bg-transparent hover:bg-muted font-medium">
                  Atrás
                </button>
                <button disabled={loading} onClick={handleImport} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium min-w-[120px]">
                  {loading ? "Importando..." : "Iniciar Importación"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
