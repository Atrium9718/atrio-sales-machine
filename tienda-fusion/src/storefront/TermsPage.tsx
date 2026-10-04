import React, { useEffect } from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <Link to="/" className="inline-flex items-center gap-2 text-teal-600 font-bold text-sm hover:text-teal-700 transition-colors mb-8">
          <ArrowLeft size={16} /> Volver al inicio
        </Link>
        
        <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-8">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <FileText size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2">Términos y Condiciones</h1>
              <p className="text-slate-500 font-medium">Última actualización: Agosto de 2026</p>
            </div>
          </div>

          <div className="space-y-8 text-slate-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Aceptación de los Términos</h2>
              <p>
                Al acceder y utilizar el sitio web y la plataforma Web-to-Print de <strong>Fusión Comunicación Gráfica</strong> (en adelante "la Empresa"), usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguna parte de los términos, no podrá utilizar nuestros servicios.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. Uso del Servicio y Pedidos</h2>
              <p className="mb-4">
                El usuario es enteramente responsable de los archivos, textos, imágenes y diseños subidos a nuestra plataforma. Al confirmar un pedido y aprobar el "Pre-Vuelo" o validación de archivo:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>El cliente asume la responsabilidad total por errores ortográficos, gramaticales o de diseño presentes en el archivo original.</li>
                <li>Garantiza que posee los derechos de autor y licencias comerciales de las imágenes y tipografías utilizadas.</li>
                <li>La Empresa no realizará modificaciones de fondo a los archivos sin previa autorización expresa del cliente.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. Variaciones de Color (CMYK vs RGB)</h2>
              <p>
                Dado que los monitores de computadora y dispositivos móviles muestran colores en formato RGB y nuestras prensas litográficas/digitales imprimen en formato CMYK, es normal que exista una variación de color. Fusión Comunicación Gráfica garantiza el mayor acercamiento posible al diseño original, sin embargo, se acepta una tolerancia de variación de color de hasta un 10%. Esto no será motivo de rechazo o devolución del trabajo.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Políticas de Pago y Facturación</h2>
              <p className="mb-4">
                Los pedidos estándar requieren el pago del 100% anticipado a través de nuestras pasarelas de pago integradas. Para clientes B2B con cuentas corporativas aprobadas:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Los plazos de pago (Neto 15, 30 o 45 días) aplican estrictamente según el Nivel Comercial asignado.</li>
                <li>El retraso en el pago suspenderá automáticamente la línea de crédito y la producción de nuevos pedidos.</li>
                <li>Todos los precios mostrados en la plataforma incluyen IVA a menos que se indique lo contrario en el resumen de facturación.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Tiempos de Entrega y Envíos</h2>
              <p>
                Los tiempos de producción indicados son estimados y se cuentan en <strong>días hábiles</strong> a partir de la confirmación del pago y la aprobación final del diseño. Fusión Comunicación Gráfica no se hace responsable por retrasos causados por las empresas transportadoras (Coordinadora, Servientrega, Envía) ni por factores de fuerza mayor, clima o alteraciones del orden público en las vías nacionales.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">6. Políticas de Devolución</h2>
              <p>
                Debido a que nuestros productos son 100% personalizados y fabricados a medida, <strong>no existen devoluciones de dinero ni retracto de compra</strong> una vez el producto ha entrado en la fase de producción. Solo se aceptarán reclamos por defectos evidentes de fabricación (mal refilado, encuadernación defectuosa, manchas de tinta atribuibles a la máquina) reportados dentro de las 48 horas posteriores a la recepción del pedido. En estos casos probados, la Empresa procederá con la reimpresión del material sin costo adicional.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
