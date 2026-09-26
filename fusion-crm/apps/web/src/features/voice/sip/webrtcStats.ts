import { CallQualityMetrics, QualityRating } from './types';

export class WebRTCStatsMonitor {
  private interval: any = null;
  private prevPacketsLost = 0;
  private prevPacketsReceived = 0;

  public start(
    peerConnection: RTCPeerConnection,
    onMetrics: (metrics: CallQualityMetrics) => void
  ): void {
    this.stop();
    this.prevPacketsLost = 0;
    this.prevPacketsReceived = 0;

    this.interval = setInterval(async () => {
      try {
        if (!peerConnection || peerConnection.connectionState === 'closed') {
          this.stop();
          return;
        }

        const stats = await peerConnection.getStats();
        let jitterMs = 0;
        let rttMs = 0;
        let packetLossPercent = 0;
        let audioInputLevel = 75;

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            const packetsLost = report.packetsLost || 0;
            const packetsReceived = report.packetsReceived || 0;

            const deltaLost = Math.max(0, packetsLost - this.prevPacketsLost);
            const deltaReceived = Math.max(0, packetsReceived - this.prevPacketsReceived);
            const total = deltaLost + deltaReceived;

            if (total > 0) {
              packetLossPercent = Math.min(100, Math.round((deltaLost / total) * 100));
            }

            this.prevPacketsLost = packetsLost;
            this.prevPacketsReceived = packetsReceived;

            if (report.jitter) {
              jitterMs = Math.round(report.jitter * 1000);
            }
            if (report.audioLevel !== undefined) {
              audioInputLevel = Math.round(report.audioLevel * 100);
            }
          }

          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime) {
              rttMs = Math.round(report.currentRoundTripTime * 1000);
            }
          }
        });

        // Evaluación de calidad
        let rating: QualityRating = 'EXCELLENT';
        let warning: string | null = null;

        if (packetLossPercent > 5 || jitterMs > 60 || rttMs > 300) {
          rating = 'POOR';
          if (packetLossPercent > 5) {
            warning = 'Pérdida de paquetes alta (> 5%): posible congestión de Wi-Fi o red saturada.';
          } else if (jitterMs > 60) {
            warning = 'Variación de retardo alta (Jitter > 60ms): calidad de audio entrecortada.';
          } else {
            warning = 'Latencia elevada (> 300ms): posible retardo perceptible en la conversación.';
          }
        } else if (packetLossPercent > 2 || jitterMs > 35 || rttMs > 180) {
          rating = 'GOOD';
        }

        onMetrics({
          packetLossPercent,
          jitterMs,
          roundTripTimeMs: rttMs,
          audioInputLevel,
          rating,
          warning,
        });
      } catch (err) {
        console.warn('Error recopilando estadísticas WebRTC', err);
      }
    }, 2000);
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
