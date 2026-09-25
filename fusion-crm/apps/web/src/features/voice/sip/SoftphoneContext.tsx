import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActiveCallInfo,
  CallQualityMetrics,
  SoftphoneClient,
  SoftphoneState,
} from './types';
import { getSoftphoneClient } from './client';
import { voiceRpc } from './rpc';
import { can } from '../../../../../../packages/core/src/auth/permissions';

interface SoftphoneContextValue {
  client: SoftphoneClient;
  state: SoftphoneState;
  activeCall: ActiveCallInfo | null;
  isMasterTab: boolean;
  registeredExtension: string | null;
  qualityMetrics: CallQualityMetrics | null;
  hasVoicePermission: boolean;
  makeCall: (destination: string, displayName?: string, linkedContext?: any) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  hangupCall: () => Promise<void>;
  holdCall: () => Promise<void>;
  unholdCall: () => Promise<void>;
  sendDTMF: (tone: string) => void;
  setMuted: (muted: boolean) => void;
  blindTransfer: (target: string) => Promise<void>;
  attendedTransfer: (target: string) => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  updateNotes: (notes: string) => Promise<void>;
}

const SoftphoneContext = createContext<SoftphoneContextValue | null>(null);

export const SoftphoneProvider: React.FC<{ children: React.ReactNode; userPermissions?: string[] }> = ({
  children,
  userPermissions,
}) => {
  const client = useMemo(() => getSoftphoneClient(), []);
  const [state, setState] = useState<SoftphoneState>(client.state);
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(client.activeCall);
  const [isMasterTab, setIsMasterTab] = useState<boolean>(client.isMasterTab);
  const [registeredExtension, setRegisteredExtension] = useState<string | null>(client.registeredExtension);
  const [qualityMetrics, setQualityMetrics] = useState<CallQualityMetrics | null>(null);

  // Permiso obligatorio voice:use
  const permissions = userPermissions || (typeof window !== 'undefined' ? (window as any).__FUSION_USER_PERMISSIONS__ || ['*'] : ['*']);
  const hasVoicePermission = can(permissions, 'voice:use');

  useEffect(() => {
    if (!hasVoicePermission) {
      return;
    }

    const handleStateChange = (newState: SoftphoneState) => {
      setState(newState);
      setRegisteredExtension(client.registeredExtension);
    };

    const handleCallStateChange = (call: ActiveCallInfo | null) => {
      setActiveCall(call ? { ...call } : null);
    };

    const handleIncomingCall = (call: ActiveCallInfo) => {
      setActiveCall({ ...call });
    };

    const handleMasterStatus = (isMaster: boolean) => {
      setIsMasterTab(isMaster);
    };

    const handleQuality = (metrics: CallQualityMetrics) => {
      setQualityMetrics(metrics);
    };

    client.on('stateChange', handleStateChange);
    client.on('callStateChange', handleCallStateChange);
    client.on('incomingCall', handleIncomingCall);
    client.on('masterStatusChange', handleMasterStatus);
    client.on('qualityMetrics', handleQuality);

    // Inicializar registro SIP
    client.initialize().catch((err) => {
      console.warn('Error inicializando SoftphoneClient:', err);
    });

    // Escuchar eventos de llamada entrante y contexto enriquecido vía SSE
    const sse = new EventSource('/api/realtime/stream?userId=user_cristian_comercial&organizationId=org-1');
    sse.addEventListener('voice:incoming', (event: any) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.callId) {
          setActiveCall((prev) => {
            if (!prev) {
              return {
                id: payload.callId,
                direction: 'INBOUND',
                state: 'RINGING_INBOUND',
                remoteNumber: payload.fromNumber || '+573105559876',
                remoteDisplayName: payload.context?.customerName || payload.fromNumber || 'Llamada Entrante',
                startedAt: new Date().toISOString(),
                durationSeconds: 0,
                isMuted: false,
                isOnHold: false,
                isRecording: true,
                isRecordingPaused: false,
                notes: '',
                context: payload.context || null,
              };
            }
            return {
              ...prev,
              context: payload.context || prev.context,
            };
          });
        }
      } catch {}
    });

    return () => {
      client.off('stateChange', handleStateChange);
      client.off('callStateChange', handleCallStateChange);
      client.off('incomingCall', handleIncomingCall);
      client.off('masterStatusChange', handleMasterStatus);
      client.off('qualityMetrics', handleQuality);
      sse.close();
    };
  }, [client, hasVoicePermission]);

  const makeCall = useCallback(
    (destination: string, displayName?: string, linkedContext?: any) =>
      client.makeCall(destination, displayName, linkedContext),
    [client]
  );

  const answerCall = useCallback(() => client.answerCall(), [client]);
  const rejectCall = useCallback(() => client.rejectCall(), [client]);
  const hangupCall = useCallback(() => client.hangupCall(), [client]);
  const holdCall = useCallback(() => client.holdCall(), [client]);
  const unholdCall = useCallback(() => client.unholdCall(), [client]);
  const sendDTMF = useCallback((tone: string) => client.sendDTMF(tone), [client]);
  const setMuted = useCallback((muted: boolean) => client.setMuted(muted), [client]);
  const blindTransfer = useCallback((target: string) => client.blindTransfer(target), [client]);
  const attendedTransfer = useCallback((target: string) => client.attendedTransfer(target), [client]);
  const pauseRecording = useCallback(() => client.pauseRecording(), [client]);
  const resumeRecording = useCallback(() => client.resumeRecording(), [client]);
  const updateNotes = useCallback((notes: string) => client.updateNotes(notes), [client]);

  const value: SoftphoneContextValue = {
    client,
    state,
    activeCall,
    isMasterTab,
    registeredExtension,
    qualityMetrics,
    hasVoicePermission,
    makeCall,
    answerCall,
    rejectCall,
    hangupCall,
    holdCall,
    unholdCall,
    sendDTMF,
    setMuted,
    blindTransfer,
    attendedTransfer,
    pauseRecording,
    resumeRecording,
    updateNotes,
  };

  return <SoftphoneContext.Provider value={value}>{children}</SoftphoneContext.Provider>;
};

export function useSoftphone(): SoftphoneContextValue {
  const context = useContext(SoftphoneContext);
  if (!context) {
    throw new Error('useSoftphone debe usarse dentro de un SoftphoneProvider');
  }
  return context;
}
