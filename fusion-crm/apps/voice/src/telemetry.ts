import { randomUUID } from 'node:crypto';

export interface VoiceMetrics {
  callsPerMinute: number;
  activeCalls: number;
  totalCallsHandled: number;
  abandonedCalls: number;
  completedCalls: number;
  averageRingDurationMs: number;
  averageIdentityResolutionMs: number;
  ariErrorsByType: Record<string, number>;
}

class TelemetryCollector {
  private totalCalls = 0;
  private completedCallsCount = 0;
  private abandonedCallsCount = 0;
  private ringDurationsMs: number[] = [];
  private identityResolutionTimesMs: number[] = [];
  private ariErrors: Record<string, number> = {};
  private callsInLastMinute = 0;
  private lastMinuteReset = Date.now();

  /**
   * Genera un identificador de correlación único para el ciclo de vida de la llamada.
   */
  public createCorrelationId(prefix = 'call'): string {
    return `${prefix}-${randomUUID().slice(0, 8)}-${Date.now()}`;
  }

  public recordCallStarted(): void {
    this.totalCalls++;
    this.checkMinuteRoll();
    this.callsInLastMinute++;
  }

  public recordCallCompleted(isAbandoned: boolean, ringDurationMs?: number): void {
    if (isAbandoned) {
      this.abandonedCallsCount++;
    } else {
      this.completedCallsCount++;
    }

    if (ringDurationMs !== undefined && ringDurationMs >= 0) {
      this.ringDurationsMs.push(ringDurationMs);
      if (this.ringDurationsMs.length > 500) {
        this.ringDurationsMs.shift();
      }
    }
  }

  public recordIdentityResolution(durationMs: number): void {
    this.identityResolutionTimesMs.push(durationMs);
    if (this.identityResolutionTimesMs.length > 500) {
      this.identityResolutionTimesMs.shift();
    }
  }

  public recordAriError(errorType: string): void {
    this.ariErrors[errorType] = (this.ariErrors[errorType] || 0) + 1;
  }

  private checkMinuteRoll(): void {
    const now = Date.now();
    if (now - this.lastMinuteReset > 60000) {
      this.callsInLastMinute = 0;
      this.lastMinuteReset = now;
    }
  }

  public getMetrics(activeCallsCount: number): VoiceMetrics {
    this.checkMinuteRoll();

    const avgRing =
      this.ringDurationsMs.length > 0
        ? Math.round(this.ringDurationsMs.reduce((a, b) => a + b, 0) / this.ringDurationsMs.length)
        : 0;

    const avgIdentity =
      this.identityResolutionTimesMs.length > 0
        ? Math.round(this.identityResolutionTimesMs.reduce((a, b) => a + b, 0) / this.identityResolutionTimesMs.length)
        : 0;

    return {
      callsPerMinute: this.callsInLastMinute,
      activeCalls: activeCallsCount,
      totalCallsHandled: this.totalCalls,
      abandonedCalls: this.abandonedCallsCount,
      completedCalls: this.completedCallsCount,
      averageRingDurationMs: avgRing,
      averageIdentityResolutionMs: avgIdentity,
      ariErrorsByType: { ...this.ariErrors },
    };
  }

  public log(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta: Record<string, unknown> = {}): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'apps/voice',
      message,
      ...meta,
    };
    if (level === 'ERROR') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'WARN') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }
}

export const telemetry = new TelemetryCollector();
