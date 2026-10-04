import React, { useEffect } from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
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
              <ShieldCheck size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2">Política de Privacidad</h1>
              <p className="text-slate-500 font-medium">Cumplimiento de la Ley 1581 de 2012 (Colombia)</p>
            </div>
          </div>

          <div className="space-y-8 text-slate-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Identificación del Responsable</h2>
              <p>
                <strong>Fusión Comunicación Gráfica</strong>, ubicada en la Cra. 22 #24 - 47, Centro, Manizales, Caldas, Colombia, correo electrónico <strong>comercial@fusioncg.com</strong> y teléfono +57 324 3917169, actúa como Responsable del Tratamiento de los datos personales recopilados a través de este sitio web.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. Finalidad del Tratamiento de Datos</h2>
              <p className="mb-4">
                La información personal (nombres, NIT/Cédula, dirección, teléfono, correo electrónico) recabada será utilizada para las siguientes finalidades:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Procesar, facturar y despachar los pedidos de impresión realizados en nuestra plataforma Web-to-Print.</li>
                <li>Enviar notificaciones transaccionales sobre el estado de sus envíos y guías de rastreo.</li>
                <li>Gestionar solicitudes de crédito y validación financiera para cuentas corporativas B2B.</li>
                <li>Enviar información publicitaria, promociones y novedades comerciales propias o de nuestro aliado estratégico (Atrio Agencia S.A.S).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. Derechos de los Titulares (Derechos ARCO)</h2>
              <p className="mb-4">
                De conformidad con la Constitución Política de Colombia y la Ley 1581 de 2012 (Ley de Protección de Datos Personales), usted como titular tiene derecho a:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Conocer, actualizar y rectificar</strong> sus datos personales frente a Fusión Comunicación Gráfica.</li>
                <li><strong>Solicitar prueba de la autorización</strong> otorgada para el tratamiento de sus datos.</li>
                <li><strong>Ser informado</strong> sobre el uso que se le ha dado a sus datos personales.</li>
                <li><strong>Revocar la autorización y/o solicitar la supresión</strong> del dato cuando no exista un deber legal o contractual de permanecer en la base de datos.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Seguridad de la Información</h2>
              <p>
                Implementamos medidas técnicas, administrativas y humanas de alta seguridad para proteger su información contra pérdida, adulteración, acceso no autorizado o fraude. Toda la información financiera y de tarjetas de crédito es manejada directamente por pasarelas de pago certificadas (PCI-DSS) y nuestra plataforma no almacena estos números.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Uso de Cookies</h2>
              <p>
                Utilizamos cookies de sesión y analíticas para recordar sus preferencias, mantener activa su sesión (ej. carrito de compras) y mejorar la usabilidad del sitio. Puede desactivar las cookies en la configuración de su navegador en cualquier momento.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">6. Procedimiento para Consultas y Reclamos</h2>
              <p>
                Para ejercer sus derechos de Habeas Data, puede enviar una solicitud por escrito al correo electrónico <strong>comercial@fusioncg.com</strong>. Daremos respuesta a su solicitud en un término máximo de quince (15) días hábiles, tal como lo establece la ley colombiana.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
