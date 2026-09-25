import React, { useState } from 'react';
import { UploadCloud, X, FileText, CheckCircle, AlertTriangle, Table, Phone, Mail, MapPin, Building, UserCheck, Trash2, RefreshCw } from 'lucide-react';
import * as xlsx from 'xlsx';
import { importCustomers, clearAllCustomers, isQuotaExhaustedToday } from '@/lib/customerService';

interface Props {
  onClose: () => void;
  onImportComplete: () => void;
}

export interface ParsedCustomerRecord {
  nit: string;
  name: string;
  tradeName?: string;
  firstName?: string;
  secondName?: string;
  firstLastName?: string;
  secondLastName?: string;
  address?: string;
  phone1?: string;
  phone2?: string;
  phone3?: string;
  email?: string;
  billingContact?: string;
  billingEmail?: string;
}

function cleanStr(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  // Strip trailing .0 from excel floats (e.g. 8842451.0 -> 8842451)
  if (/^\d+\.0$/.test(str)) {
    str = str.replace(/\.0$/, '');
  }
  // Ignore literal single zero (Excel empty telephone placeholder)
  if (str === '0') return '';
  return str;
}

function normalizeKey(key: any): string {
  return String(key || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '') // remove non alphanumeric
    .trim();
}

/**
 * Intelligent workbook parser that handles:
 * 1. Explicit headers (NIT, NOMBRE, PRIMER NOMBRE, TELÉFONO 1, etc.) anywhere in the first 10 rows
 * 2. Positional 14-column Colombian ERP layouts where Row 1 is a title banner (e.g., FUSION COMUNICACION GRAFICA)
 * 3. Formatted or unformatted values (phone integers, decimals, emails, addresses)
 */
export function parseWorksheet(worksheet: any): ParsedCustomerRecord[] {
  const matrix: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!matrix || matrix.length === 0) return [];

  // 1. Look for a row with header labels
  let headerRowIdx = -1;
  const headerMap: Record<string, number> = {};

  for (let r = 0; r < Math.min(matrix.length, 10); r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const normalizedCells = row.map(c => normalizeKey(c));
    const hasNit = normalizedCells.some(c => c === 'nit' || c === 'identificacion' || c === 'cedula' || c === 'documento' || c === 'rut');
    const hasNombre = normalizedCells.some(c => c === 'nombre' || c === 'razonsocial' || c === 'primernombre' || c === 'empresa');
    
    if (hasNit || hasNombre) {
      headerRowIdx = r;
      normalizedCells.forEach((cellNorm, colIdx) => {
        if (cellNorm && headerMap[cellNorm] === undefined) {
          headerMap[cellNorm] = colIdx;
        }
      });
      break;
    }
  }

  const results: ParsedCustomerRecord[] = [];

  if (headerRowIdx !== -1) {
    // Parser Mode A: Mapped by header columns
    const getVal = (row: any[], ...keys: string[]) => {
      for (const k of keys) {
        const col = headerMap[k];
        if (col !== undefined && row[col] !== undefined) {
          const val = cleanStr(row[col]);
          if (val) return val;
        }
      }
      return '';
    };

    for (let r = headerRowIdx + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.length === 0) continue;

      const nit = getVal(row, 'nit', 'identificacion', 'cedula', 'documento', 'rut', 'cc');
      const nombre = getVal(row, 'nombre', 'razonsocial', 'empresa', 'cliente', 'name');
      const primerNombre = getVal(row, 'primernombre', 'pnombre', 'primer_nombre');
      const segundoNombre = getVal(row, 'segundonombre', 'snombre', 'segundo_nombre');
      const primerApellido = getVal(row, 'primerapellido', 'papellido', 'primer_apellido');
      const segundoApellido = getVal(row, 'segundoapellido', 'sapellido', 'segundo_apellido');
      const direccion = getVal(row, 'direccion', 'direcciones', 'address', 'domicilio', 'ubicacion');
      const telefono1 = getVal(row, 'telefono1', 'tel1', 'celular1', 'telefono', 'celular', 'phone', 'movil', 'whatsapp');
      const telefono2 = getVal(row, 'telefono2', 'tel2', 'celular2');
      const telefono3 = getVal(row, 'telefono3', 'tel3', 'celular3');
      const correoElectronico = getVal(row, 'correoelectronico', 'correo', 'email', 'mail');
      const contactoFacturacion = getVal(row, 'contactodefacturacion', 'contactofacturacion', 'contactofactura', 'responsablefacturacion', 'contacto');
      const emailsFacturacion = getVal(row, 'emailscontactosdefacturacion', 'emailcontactodefacturacion', 'emailfacturacion', 'correofacturacion');
      const nombreComercial = getVal(row, 'nombrecomercial', 'razoncomercial', 'tradename', 'comercial');

      // Skip row if it has neither name nor NIT
      if (!nit && !nombre && !primerNombre && !primerApellido && !nombreComercial) {
        continue;
      }

      // Build customer name
      const nameParts = [primerNombre, segundoNombre, primerApellido, segundoApellido].filter(Boolean);
      const composedName = nameParts.join(' ');
      let finalName = nombre || composedName || nombreComercial || (nit ? `Cliente NIT ${nit}` : `Cliente ${r}`);

      results.push({
        nit,
        name: finalName,
        tradeName: nombreComercial,
        firstName: primerNombre,
        secondName: segundoNombre,
        firstLastName: primerApellido,
        secondLastName: segundoApellido,
        address: direccion,
        phone1: telefono1,
        phone2: telefono2,
        phone3: telefono3,
        email: correoElectronico,
        billingContact: contactoFacturacion,
        billingEmail: emailsFacturacion,
      });
    }
  } else {
    // Parser Mode B: Positional layout (14 standard Colombian ERP columns)
    // 0: NIT | 1: NOMBRE | 2: PRIMER NOMBRE | 3: SEGUNDO NOMBRE | 4: PRIMER APELLIDO | 5: SEGUNDO APELLIDO |
    // 6: DIRECCIÓN | 7: TELÉFONO 1 | 8: TELÉFONO 2 | 9: TELÉFONO 3 | 10: CORREO ELECTRÓNICO |
    // 11: CONTACTO DE FACTURACIÓN | 12: E-MAILS CONTACTOS DE FACTURACIÓN | 13: NOMBRE COMERCIAL
    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.length === 0) continue;

      // If row has only 1 filled cell (e.g. title banner in row 0), skip it
      const filledCells = row.filter(c => cleanStr(c) !== '');
      if (filledCells.length <= 1) continue;

      const nit = cleanStr(row[0]);
      const nombre = cleanStr(row[1]);
      const primerNombre = cleanStr(row[2]);
      const segundoNombre = cleanStr(row[3]);
      const primerApellido = cleanStr(row[4]);
      const segundoApellido = cleanStr(row[5]);
      const direccion = cleanStr(row[6]);
      const telefono1 = cleanStr(row[7]);
      const telefono2 = cleanStr(row[8]);
      const telefono3 = cleanStr(row[9]);
      const correoElectronico = cleanStr(row[10]);
      const contactoFacturacion = cleanStr(row[11]);
      const emailsFacturacion = cleanStr(row[12]);
      const nombreComercial = cleanStr(row[13]);

      // Skip row if it has neither name nor NIT
      if (!nit && !nombre && !primerNombre && !primerApellido && !nombreComercial) {
        continue;
      }

      // Check if this row is actually a repeated header row
      if (normalizeKey(nit) === 'nit' || normalizeKey(nombre) === 'nombre') {
        continue;
      }

      const nameParts = [primerNombre, segundoNombre, primerApellido, segundoApellido].filter(Boolean);
      const composedName = nameParts.join(' ');
      let finalName = nombre || composedName || nombreComercial || (nit ? `Cliente NIT ${nit}` : `Cliente ${r}`);

      results.push({
        nit,
        name: finalName,
        tradeName: nombreComercial,
        firstName: primerNombre,
        secondName: segundoNombre,
        firstLastName: primerApellido,
        secondLastName: segundoApellido,
        address: direccion,
        phone1: telefono1,
        phone2: telefono2,
        phone3: telefono3,
        email: correoElectronico,
        billingContact: contactoFacturacion,
        billingEmail: emailsFacturacion,
      });
    }
  }

  return results;
}

export function ImportDatabaseModal({ onClose, onImportComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ processed: number; total: number } | null>(null);
  const [clearing, setClearing] = useState(false);

  // Parsed records ready to import
  const [parsedRows, setParsedRows] = useState<ParsedCustomerRecord[]>([]);

  const handleClearDb = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar TODOS los clientes actuales de la base de datos? Esto removerá los registros anteriores para que puedas cargar la lista limpia.')) return;
    setClearing(true);
    try {
      const res = await clearAllCustomers();
      alert(res.message || 'Base de datos limpiada exitosamente.');
      setFile(null);
      setParsedRows([]);
      onImportComplete();
      onClose();
    } catch (e: any) {
      console.error(e);
      alert('Error al limpiar la base de datos: ' + (e.message || 'Error desconocido'));
    } finally {
      setClearing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);

      try {
        const data = await selectedFile.arrayBuffer();
        const workbook = xlsx.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const customers = parseWorksheet(worksheet);

        if (!customers || customers.length === 0) {
          throw new Error('No se encontraron filas con datos de clientes válidos en el archivo Excel. Verifica que las columnas coincidan.');
        }

        setParsedRows(customers);
      } catch (err: any) {
        console.error('Error reading file preview:', err);
        setError(err.message || 'No se pudo leer el archivo. Asegúrate de que sea .xlsx o .csv válido.');
        setFile(null);
        setParsedRows([]);
      }
    }
  };

  const processUpload = async (wipePreviousFirst: boolean = false) => {
    if (!parsedRows || parsedRows.length === 0) return;
    setLoading(true);
    setError(null);
    setStats({ processed: 0, total: parsedRows.length });

    try {
      if (wipePreviousFirst) {
        setStatus('Limpiando base de datos anterior...');
        await clearAllCustomers();
      }

      setStatus(`Preparando ${parsedRows.length.toLocaleString()} clientes para importar...`);

      const total = parsedRows.length;
      const rowsToImport = parsedRows.map((parsed, i) => {
        const primaryPhone = parsed.phone1 || parsed.phone2 || parsed.phone3 || '';
        const primaryEmail = parsed.email || parsed.billingEmail || '';

        return {
          code: `CLI-${Date.now()}-${i}`,
          nit: parsed.nit,
          doc: parsed.nit,
          doc_clean: parsed.nit.replace(/[^0-9a-zA-Z]/g, ''),
          name: parsed.name,
          name_lower: parsed.name.toLowerCase(),
          tradeName: parsed.tradeName || '',
          tradeName_lower: (parsed.tradeName || '').toLowerCase(),
          firstName: parsed.firstName || '',
          secondName: parsed.secondName || '',
          firstLastName: parsed.firstLastName || '',
          secondLastName: parsed.secondLastName || '',
          address: parsed.address || '',
          phone1: parsed.phone1 || '',
          phone2: parsed.phone2 || '',
          phone3: parsed.phone3 || '',
          phone: primaryPhone,
          email: primaryEmail,
          billingContact: parsed.billingContact || '',
          billingEmail: parsed.billingEmail || '',
          sector: 'General',
          type: 'ACTIVE',
          temp: 'WARM',
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
      });

      setStatus(`Importando ${total.toLocaleString()} clientes...`);

      const result = await importCustomers(rowsToImport, (processed, tot) => {
        setStats({ processed, total: tot });
      });

      setStatus(result.message);
      setStats({ processed: total, total });

      setTimeout(() => {
        onImportComplete();
      }, 1800);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al procesar la importación.');
    } finally {
      setLoading(false);
    }
  };

  // Preview metrics
  const totalValid = parsedRows.length;
  const withNit = parsedRows.filter(r => r.nit).length;
  const withPhone = parsedRows.filter(r => r.phone1 || r.phone2 || r.phone3).length;
  const withEmail = parsedRows.filter(r => r.email || r.billingEmail).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Importar Base de Datos de Clientes</h2>
              <p className="text-xs text-muted-foreground">Reconocimiento automático de 14 columnas (NIT, Nombres, Teléfonos 1-2-3, Facturación)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 p-1 rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {!stats ? (
            <>
              {/* File Dropzone */}
              <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center bg-muted/10 hover:bg-muted/30 transition-all relative cursor-pointer group">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={loading}
                />
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="font-semibold text-foreground text-sm">
                  {file ? file.name : 'Haz clic o arrastra tu archivo Excel aquí'}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  Formatos compatibles: .xlsx, .xls, .csv (soporta encabezados colombianos y títulos de empresa)
                </span>
              </div>

              {/* Supported Columns Notice */}
              <div className="bg-muted/20 border border-border rounded-xl p-3.5 text-xs space-y-2">
                <span className="font-semibold text-foreground block">
                  Columnas interpretadas automáticamente (las 14 del ERP):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'NIT',
                    'NOMBRE',
                    'PRIMER NOMBRE',
                    'SEGUNDO NOMBRE',
                    'PRIMER APELLIDO',
                    'SEGUNDO APELLIDO',
                    'DIRECCIÓN',
                    'TELÉFONO 1',
                    'TELÉFONO 2',
                    'TELÉFONO 3',
                    'CORREO ELECTRÓNICO',
                    'CONTACTO DE FACTURACIÓN',
                    'E-MAILS CONTACTOS DE FACTURACIÓN',
                    'NOMBRE COMERCIAL',
                  ].map((col) => (
                    <span
                      key={col}
                      className="px-2 py-0.5 rounded-md bg-background border border-border text-[10px] font-mono text-muted-foreground"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preview of Detected Data */}
              {parsedRows.length > 0 && (
                <div className="space-y-3 bg-muted/20 border border-border rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Table className="w-4 h-4 text-primary" />
                      Vista previa de interpretación ({totalValid.toLocaleString()} clientes válidos detectados):
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                        {withNit.toLocaleString()} con NIT
                      </span>
                      <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {withPhone.toLocaleString()} con Teléfono
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <div
                        key={idx}
                        className="bg-card border border-border rounded-lg p-3 text-xs space-y-1.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-foreground text-sm truncate">{row.name}</span>
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-muted text-foreground font-semibold shrink-0">
                            NIT: {row.nit || 'Sin NIT'}
                          </span>
                        </div>

                        {row.tradeName && (
                          <div className="text-[11px] text-primary flex items-center gap-1 font-medium truncate">
                            <Building className="w-3 h-3 shrink-0" />
                            Comercial: {row.tradeName}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground text-[11px]">
                          <div className="flex items-center gap-1 truncate">
                            <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span>Tel: {[row.phone1, row.phone2, row.phone3].filter(Boolean).join(' / ') || 'No registra'}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span>{row.email || 'Sin correo'}</span>
                          </div>
                          {row.address && (
                            <div className="flex items-center gap-1 truncate sm:col-span-2">
                              <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span>{row.address}</span>
                            </div>
                          )}
                          {row.billingContact && (
                            <div className="flex items-center gap-1 truncate sm:col-span-2 text-foreground font-medium">
                              <UserCheck className="w-3 h-3 text-primary shrink-0" />
                              <span>Facturación: {row.billingContact} {row.billingEmail ? `(${row.billingEmail})` : ''}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {parsedRows.length > 5 && (
                      <p className="text-center text-xs text-muted-foreground py-1">
                        ... y {(parsedRows.length - 5).toLocaleString()} clientes más listos para ser importados.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                {stats.processed === stats.total ? (
                  <CheckCircle className="w-8 h-8 text-success" />
                ) : (
                  <UploadCloud className="w-8 h-8 text-primary animate-pulse" />
                )}
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-bold text-base text-foreground">{status}</h3>
                <p className="text-xs text-muted-foreground">
                  {stats.processed.toLocaleString()} de {stats.total.toLocaleString()} clientes procesados
                </p>
              </div>
              <div className="w-full max-w-md h-2.5 bg-muted rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(stats.processed / stats.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!stats && (
          <div className="p-4 border-t border-border flex flex-wrap justify-between items-center gap-3 bg-muted/20 shrink-0">
            <button
              onClick={handleClearDb}
              disabled={loading || clearing}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearing ? 'Vaciando...' : 'Vaciar DB Actual'}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  if (!confirm('¿Deseas cargar la base de datos de clientes inicial (reales de ejemplo)? Esto reemplazará tu lista local.')) return;
                  setLoading(true);
                  try {
                    const { seedCustomerDatabase } = await import('@/lib/customerService');
                    const res = await seedCustomerDatabase();
                    alert(res.message);
                    if (res.success) {
                      onImportComplete();
                      onClose();
                    }
                  } catch (e: any) {
                    alert('Error: ' + e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Cargar Base Real
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              {parsedRows.length > 0 && (
                <button
                  onClick={() => processUpload(true)}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  title="Elimina los registros defectuosos anteriores y carga este archivo completamente"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reemplazar y Cargar Todo ({parsedRows.length.toLocaleString()})
                </button>
              )}
              <button
                onClick={() => processUpload(false)}
                disabled={!file || loading || parsedRows.length === 0}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {loading && <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />}
                Importar {parsedRows.length > 0 ? `${parsedRows.length.toLocaleString()} Clientes` : 'Archivo'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
