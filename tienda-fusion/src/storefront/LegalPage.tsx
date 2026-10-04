import React, { useEffect } from 'react';
import { Scale, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LegalPage() {
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
              <Scale size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2">Aviso Legal</h1>
              <p className="text-slate-500 font-medium">Información corporativa y propiedad intelectual</p>
            </div>
          </div>

          <div className="space-y-8 text-slate-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Información de la Empresa</h2>
              <ul className="list-none space-y-2">
                <li><strong>Razón Social:</strong> Fusión Comunicación Gráfica</li>
                <li><strong>Sede Principal:</strong> Cra. 22 #24 - 47, Centro, Manizales, Caldas, Colombia</li>
                <li><strong>Teléfono de Contacto:</strong> +57 324 3917169</li>
                <li><strong>Email Comercial:</strong> comercial@fusioncg.com</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. Propiedad Intelectual e Industrial</h2>
              <p>
                Todos los contenidos de este sitio web, incluyendo textos, gráficos, logotipos, iconos, imágenes, clips de audio, descargas digitales, recopilaciones de datos y código fuente (incluyendo el motor Web-to-Print), son propiedad exclusiva de Fusión Comunicación Gráfica o de sus proveedores de contenido, y están protegidos por las leyes de derechos de autor nacionales e internacionales.
              </p>
              <p className="mt-4">
                El logo y nombre comercial "Fusión Comunicación Gráfica" son marcas registradas. Su uso no autorizado está estrictamente prohibido y será perseguido legalmente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. Limitación de Responsabilidad</h2>
              <p>
                Fusión Comunicación Gráfica realiza los mayores esfuerzos para asegurar que la información en este sitio web sea precisa y actualizada. Sin embargo, no garantizamos que el sitio esté libre de errores, interrupciones o virus informáticos. El uso de esta plataforma se realiza bajo el propio riesgo del usuario.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Enlaces a Terceros</h2>
              <p>
                Este sitio puede contener enlaces a sitios web de terceros (como nuestra empresa aliada, Atrio Agencia S.A.S). Fusión Comunicación Gráfica no ejerce ningún control sobre estos sitios y no es responsable por su contenido, políticas de privacidad o prácticas operativas.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Legislación Aplicable y Jurisdicción</h2>
              <p>
                Este Aviso Legal, así como cualquier relación entre usted como usuario y Fusión Comunicación Gráfica, se regirán e interpretarán de acuerdo con las leyes de la República de Colombia. Cualquier controversia que derive del uso de este sitio web será sometida a la jurisdicción de los jueces y tribunales competentes de la ciudad de Manizales, Caldas.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
