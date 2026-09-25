import * as React from 'react';
import { VoicePagePlaceholder } from './VoicePagePlaceholder';

export function VozDashboardPage() {
  return (
    <VoicePagePlaceholder
      id="voz-dashboard-page"
      title="Panel de Voz y Telefonía"
      subtitle="Resumen de actividad telefónica del día, estado de extensiones y llamadas en tiempo real"
      stageName="Sub-Etapa 17.2"
      requiredPermission="voice:use"
      models={['VoiceCall', 'VoiceExtension', 'VoiceAgentStatus', 'VoiceQueue']}
      events={['voz.llamada_entrante', 'voz.llamada_contestada', 'voz.llamada_finalizada']}
      description="Esta pantalla principal consolida los KPIs telefónicos diarios (volumen de llamadas, TMO, tiempo de espera, porcentaje de atención) y el softphone WebRTC. Se implementa en la Sub-Etapa 17.2 junto con el cliente ARI/WebRTC."
    />
  );
}
export default VozDashboardPage;
