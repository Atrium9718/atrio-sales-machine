import * as React from 'react';
import { VoicePagePlaceholder } from './VoicePagePlaceholder';

export function VozCampanasPage() {
  return (
    <VoicePagePlaceholder
      id="voz-campanas-page"
      title="Campañas de Marcación Saliente"
      subtitle="Campañas progresivas y preview con listas de exclusión (No Molestar / DNC)"
      stageName="Sub-Etapa 17.6"
      requiredPermission="voice:manage_all"
      models={['VoiceCampaign', 'VoiceCampaignContact', 'VoiceDoNotCall']}
      events={['voz.campana_finalizada', 'voz.numero_en_lista_no_llamar']}
      description="Esta pantalla permite coordinar campañas de contacto telefónico saliente (progresivas o preview), importar listas de contactos con validación previa de la lista No-Llamar (Ley Dejen de Fregar / DNC) y controlar el ritmo de llamadas. Construida en la Sub-Etapa 17.6."
    />
  );
}
export default VozCampanasPage;
