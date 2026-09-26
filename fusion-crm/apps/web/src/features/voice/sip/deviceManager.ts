export interface MediaDeviceInfoItem {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export class DeviceManager {
  private static STORAGE_PREFIX = 'fusion_voice_device_';
  private audioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private meterInterval: any = null;

  public async getDevices(): Promise<{
    audioInputs: MediaDeviceInfoItem[];
    audioOutputs: MediaDeviceInfoItem[];
  }> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return { audioInputs: [], audioOutputs: [] };
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs: MediaDeviceInfoItem[] = [];
      const audioOutputs: MediaDeviceInfoItem[] = [];

      devices.forEach((d) => {
        const item: MediaDeviceInfoItem = {
          deviceId: d.deviceId,
          label: d.label || `${d.kind === 'audioinput' ? 'Micrófono' : 'Altavoz'} (${d.deviceId.slice(0, 5)})`,
          kind: d.kind,
        };
        if (d.kind === 'audioinput') {
          audioInputs.push(item);
        } else if (d.kind === 'audiooutput') {
          audioOutputs.push(item);
        }
      });

      return { audioInputs, audioOutputs };
    } catch (err) {
      console.warn('Error enumerando dispositivos de audio', err);
      return { audioInputs: [], audioOutputs: [] };
    }
  }

  public getSelectedMicId(): string {
    if (typeof localStorage === 'undefined') return 'default';
    return localStorage.getItem(`${DeviceManager.STORAGE_PREFIX}mic`) || 'default';
  }

  public setSelectedMicId(deviceId: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${DeviceManager.STORAGE_PREFIX}mic`, deviceId);
    }
  }

  public getSelectedSpeakerId(): string {
    if (typeof localStorage === 'undefined') return 'default';
    return localStorage.getItem(`${DeviceManager.STORAGE_PREFIX}speaker`) || 'default';
  }

  public setSelectedSpeakerId(deviceId: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${DeviceManager.STORAGE_PREFIX}speaker`, deviceId);
    }
  }

  public getSelectedRingtoneId(): string {
    if (typeof localStorage === 'undefined') return 'default';
    return localStorage.getItem(`${DeviceManager.STORAGE_PREFIX}ringtone`) || 'default';
  }

  public setSelectedRingtoneId(deviceId: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${DeviceManager.STORAGE_PREFIX}ringtone`, deviceId);
    }
  }

  /**
   * Enruta el audio a un altavoz específico si el navegador soporta setSinkId
   */
  public async routeAudioElement(audioEl: HTMLAudioElement, deviceId: string): Promise<boolean> {
    if ('setSinkId' in audioEl && typeof (audioEl as any).setSinkId === 'function') {
      try {
        await (audioEl as any).setSinkId(deviceId);
        return true;
      } catch (err) {
        console.warn('Fallo al aplicar setSinkId en elemento de audio', err);
      }
    }
    return false;
  }

  /**
   * Inicia monitoreo de nivel del micrófono (0 a 100) en tiempo real
   */
  public async startLevelMeter(
    deviceId: string,
    onLevel: (level: number) => void
  ): Promise<void> {
    this.stopLevelMeter();

    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId === 'default' ? true : { deviceId: { exact: deviceId } },
        video: false,
      };

      this.micStream = await navigator.mediaDevices.getUserMedia(constraints);
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.meterInterval = setInterval(() => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        onLevel(normalized);
      }, 50);
    } catch (err) {
      console.warn('No fue posible iniciar medidor de micrófono', err);
      throw err;
    }
  }

  public stopLevelMeter(): void {
    if (this.meterInterval) {
      clearInterval(this.meterInterval);
      this.meterInterval = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
  }

  /**
   * Graba 3 segundos del micrófono y reproduce inmediatamente el resultado
   */
  public async testMicrophoneRecording(
    deviceId: string,
    onProgress: (remainingSeconds: number) => void
  ): Promise<{ playAudio: () => void }> {
    const constraints: MediaStreamConstraints = {
      audio: deviceId === 'default' ? true : { deviceId: { exact: deviceId } },
      video: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const mediaRecorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        resolve({
          playAudio: () => {
            const testAudio = new Audio(audioUrl);
            const speakerId = this.getSelectedSpeakerId();
            this.routeAudioElement(testAudio, speakerId);
            testAudio.play().catch(() => {});
          },
        });
      };

      mediaRecorder.onerror = (e) => {
        stream.getTracks().forEach((t) => t.stop());
        reject(e);
      };

      mediaRecorder.start();
      let remaining = 3;
      onProgress(remaining);

      const countTimer = setInterval(() => {
        remaining -= 1;
        onProgress(remaining);
        if (remaining <= 0) {
          clearInterval(countTimer);
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }
      }, 1000);
    });
  }

  /**
   * Reproduce un tono de prueba a través del altavoz seleccionado
   */
  public async playTestSpeaker(deviceId?: string): Promise<void> {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime); // Tono La (440Hz)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  }
}

export const deviceManager = new DeviceManager();
