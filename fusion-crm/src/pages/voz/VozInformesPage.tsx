import * as React from 'react';
import { VoicePagePlaceholder } from './VoicePagePlaceholder';

export function VozInformesPage() {
  return (
    <VoicePagePlaceholder
      id="voz-informes-page"
      title="Informes y Analítica Telefónica"
      subtitle="Métricas de nivel de servicio (SLA), tiempo medio de operación (TMO), abandono y costos por troncal"
      stageName="Sub-Etapa 17.8"
      requiredPermission="voice:read_all"
      models={['VoiceCall', 'VoiceQueue', 'VoiceRecording']}
      events={['voz.llamada_finalizada']}
      description="Esta pantalla entrega reportes consolidados y gráficos temporales de tráfico telefónico, tasa de abandono por franja horaria, rendimiento por agente y consumo en minutos de troncales SIP. Construida en la Sub-Etapa 17.8."
    />
  );
}
export default VozInformesPage;
