import { AriClient } from '../ari/client';
import { ActiveCall, callRegistry } from '../state/registry';
import { prisma } from './persist';
import { telemetry } from '../telemetry';

export interface RingResult {
  strategy: 'BROWSER_ONLY' | 'BROWSER_THEN_MOBILE' | 'BROWSER_AND_MOBILE' | 'MOBILE_ONLY';
  answeredChannelId?: string;
  isDndActive: boolean;
  forwardedToExtension?: string;
  cancelledChannels: string[];
}

export class VoiceRingService {
  constructor(private readonly ari: AriClient) {}

  /**
   * Timbra una extensión según su estrategia configurada, respetando no molestar (DND),
   * estado del agente (no perder 25s si está OFFLINE) y desvíos.
   */
  public async ringExtension(
    call: ActiveCall,
    extensionNumber: string,
    onAnswered: (answeredChannelId: string) => Promise<void>,
    onFailedOrTimeout: () => Promise<void>
  ): Promise<void> {
    const ext = await prisma.voiceExtension.findFirst({
      where: {
        organizationId: call.organizationId,
        extension: extensionNumber,
        status: 'ACTIVE',
      },
    });

    if (!ext) {
      telemetry.log('WARN', `Extensión ${extensionNumber} no existe o no está activa.`);
      await onFailedOrTimeout();
      return;
    }

    // 1. Comprobar No Molestar (DND)
    const now = new Date();
    if (ext.dndUntil && ext.dndUntil > now) {
      telemetry.log('INFO', `Extensión ${extensionNumber} en modo No Molestar (DND) hasta ${ext.dndUntil.toISOString()}`);
      if (ext.forwardToExtension) {
        telemetry.log('INFO', `Desviando llamada de ${extensionNumber} hacia ${ext.forwardToExtension}`);
        return this.ringExtension(call, ext.forwardToExtension, onAnswered, onFailedOrTimeout);
      }
      await onFailedOrTimeout();
      return;
    }

    // 2. Comprobar desvío incondicional
    if (ext.forwardToExtension) {
      telemetry.log('INFO', `Extensión ${extensionNumber} tiene desvío activo hacia ${ext.forwardToExtension}`);
      return this.ringExtension(call, ext.forwardToExtension, onAnswered, onFailedOrTimeout);
    }

    // 3. Comprobar estado de agente en el CRM
    let isAgentOnline = true;
    if (ext.userId) {
      const agentStatus = await prisma.voiceAgentStatus.findUnique({
        where: { userId: ext.userId },
      });
      if (agentStatus && (agentStatus.status as string) === 'OFFLINE') {
        isAgentOnline = false;
        telemetry.log('INFO', `Asesor ${ext.userId} está OFFLINE. No se perderá tiempo timbrando navegador.`);
      }
    }

    const ringStrategy = ext.ringStrategy as
      | 'BROWSER_ONLY'
      | 'BROWSER_THEN_MOBILE'
      | 'BROWSER_AND_MOBILE'
      | 'MOBILE_ONLY';

    call.handledByUserId = ext.userId ?? undefined;
    call.extensionId = ext.id;
    call.targetExtensionNumber = ext.extension;

    // Si la estrategia requiere navegador pero el agente está OFFLINE:
    if (!isAgentOnline && ringStrategy === 'BROWSER_ONLY') {
      await onFailedOrTimeout();
      return;
    }

    if (!isAgentOnline && ringStrategy === 'BROWSER_THEN_MOBILE') {
      if (ext.mobileNumber) {
        // Saltar directo al celular
        return this.dialMobileLeg(call, ext.mobileNumber, ext.ringTimeoutSeconds, onAnswered, onFailedOrTimeout);
      }
      await onFailedOrTimeout();
      return;
    }

    // Ejecutar según estrategia
    switch (ringStrategy) {
      case 'BROWSER_ONLY':
        await this.dialBrowserLeg(call, ext.extension, ext.ringTimeoutSeconds, onAnswered, onFailedOrTimeout);
        break;

      case 'MOBILE_ONLY':
        if (ext.mobileNumber) {
          await this.dialMobileLeg(call, ext.mobileNumber, ext.ringTimeoutSeconds, onAnswered, onFailedOrTimeout);
        } else {
          await onFailedOrTimeout();
        }
        break;

      case 'BROWSER_THEN_MOBILE':
        await this.dialBrowserLeg(
          call,
          ext.extension,
          ext.ringTimeoutSeconds,
          onAnswered,
          async () => {
            // Si el navegador no contestó, timbrar celular
            if (ext.mobileNumber) {
              telemetry.log('INFO', `Navegador no contestó. Marcando al celular ${ext.mobileNumber}...`);
              await this.dialMobileLeg(call, ext.mobileNumber, ext.ringTimeoutSeconds, onAnswered, onFailedOrTimeout);
            } else {
              await onFailedOrTimeout();
            }
          }
        );
        break;

      case 'BROWSER_AND_MOBILE':
        await this.dialSimultaneousLegs(call, ext.extension, ext.mobileNumber, ext.ringTimeoutSeconds, onAnswered, onFailedOrTimeout);
        break;
    }
  }

  /**
   * Timbra el endpoint WebRTC del navegador
   */
  private async dialBrowserLeg(
    call: ActiveCall,
    extNumber: string,
    timeoutSecs: number,
    onAnswered: (channelId: string) => Promise<void>,
    onTimeout: () => Promise<void>
  ): Promise<void> {
    try {
      telemetry.log('INFO', `Originando canal PJSIP/${extNumber} para llamada ${call.callId}`);
      const channel = await this.ari.createChannel({
        endpoint: `PJSIP/${extNumber}`,
        app: 'fusion-voz',
        appArgs: `outbound_agent,${call.callId}`,
        callerId: call.fromNumber,
        timeout: timeoutSecs,
      });

      callRegistry.linkChannelToCall(call.callId, channel.id);

      // Iniciar marcación
      await this.ari.dialChannel(channel.id, call.fromNumber, timeoutSecs);

      // Timer de timeout de timbrado
      call.ringTimer = setTimeout(async () => {
        telemetry.log('INFO', `Tiempo de timbrado expirado en navegador (${timeoutSecs}s) para llamada ${call.callId}`);
        try {
          await this.ari.hangupChannel(channel.id, 'no_answer');
        } catch (e) {
          // ignore
        }
        await onTimeout();
      }, timeoutSecs * 1000);
    } catch (err: any) {
      telemetry.log('ERROR', `Error originando pierna de navegador para ext ${extNumber}: ${err.message}`);
      await onTimeout();
    }
  }

  /**
   * Timbra el celular del asesor por la troncal SIP del operador
   */
  private async dialMobileLeg(
    call: ActiveCall,
    mobileNumber: string,
    timeoutSecs: number,
    onAnswered: (channelId: string) => Promise<void>,
    onTimeout: () => Promise<void>
  ): Promise<void> {
    try {
      telemetry.log('INFO', `Originando llamada hacia celular ${mobileNumber} por troncal para ${call.callId}`);
      const trunkEndpoint = `PJSIP/${mobileNumber}@troncal-operador`;

      const channel = await this.ari.createChannel({
        endpoint: trunkEndpoint,
        app: 'fusion-voz',
        appArgs: `outbound_mobile,${call.callId}`,
        callerId: call.fromNumber,
        timeout: timeoutSecs,
      });

      callRegistry.linkChannelToCall(call.callId, channel.id);
      await this.ari.dialChannel(channel.id, call.fromNumber, timeoutSecs);

      call.ringTimer = setTimeout(async () => {
        try {
          await this.ari.hangupChannel(channel.id, 'no_answer');
        } catch (e) {
          // ignore
        }
        await onTimeout();
      }, timeoutSecs * 1000);
    } catch (err: any) {
      telemetry.log('ERROR', `Error originando pierna móvil ${mobileNumber}: ${err.message}`);
      await onTimeout();
    }
  }

  /**
   * Timbra navegador y celular a la vez; el primero que contesta se queda la llamada y el otro se cuelga.
   */
  private async dialSimultaneousLegs(
    call: ActiveCall,
    extNumber: string,
    mobileNumber?: string,
    timeoutSecs = 25,
    onAnswered?: (channelId: string) => Promise<void>,
    onTimeout?: () => Promise<void>
  ): Promise<void> {
    let browserChannelId: string | null = null;
    let mobileChannelId: string | null = null;

    try {
      const browserChannel = await this.ari.createChannel({
        endpoint: `PJSIP/${extNumber}`,
        app: 'fusion-voz',
        appArgs: `outbound_simultaneous,${call.callId}`,
        callerId: call.fromNumber,
        timeout: timeoutSecs,
      });
      browserChannelId = browserChannel.id;
      callRegistry.linkChannelToCall(call.callId, browserChannelId);
      await this.ari.dialChannel(browserChannelId, call.fromNumber, timeoutSecs);

      if (mobileNumber) {
        const mobileChannel = await this.ari.createChannel({
          endpoint: `PJSIP/${mobileNumber}@troncal-operador`,
          app: 'fusion-voz',
          appArgs: `outbound_simultaneous,${call.callId}`,
          callerId: call.fromNumber,
          timeout: timeoutSecs,
        });
        mobileChannelId = mobileChannel.id;
        callRegistry.linkChannelToCall(call.callId, mobileChannelId);
        await this.ari.dialChannel(mobileChannelId, call.fromNumber, timeoutSecs);
      }

      call.ringTimer = setTimeout(async () => {
        if (browserChannelId) {
          try {
            await this.ari.hangupChannel(browserChannelId, 'no_answer');
          } catch (e) {}
        }
        if (mobileChannelId) {
          try {
            await this.ari.hangupChannel(mobileChannelId, 'no_answer');
          } catch (e) {}
        }
        if (onTimeout) await onTimeout();
      }, timeoutSecs * 1000);
    } catch (err: any) {
      telemetry.log('ERROR', `Error en timbrado simultáneo: ${err.message}`);
      if (onTimeout) await onTimeout();
    }
  }
}
