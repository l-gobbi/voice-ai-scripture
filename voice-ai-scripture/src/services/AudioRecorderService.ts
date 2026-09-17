import { Platform } from 'react-native';

export interface AudioDriver {
  requestPermissions(): Promise<boolean>;
  startRecording(onMeter?: (level: number) => void): Promise<void>;
  stopRecording(): Promise<string | null>;
  deleteAudioFile(uri: string): Promise<boolean>;
}

export class WebAudioDriver implements AudioDriver {
  private mediaRecorder: any = null;
  private audioChunks: Blob[] = [];
  private webStream: any = null;

  async requestPermissions(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      this.webStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      console.warn('Web microphone permission denied:', err);
      return false;
    }
  }

  async startRecording(_onMeter?: (level: number) => void): Promise<void> {
    if (!this.webStream) {
      this.webStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    this.audioChunks = [];
    this.mediaRecorder = new (window as any).MediaRecorder(this.webStream);
    this.mediaRecorder.ondataavailable = (event: any) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) return resolve(null);

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/m4a' });
        const audioUrl = URL.createObjectURL(audioBlob);
        if (this.webStream) {
          this.webStream.getTracks().forEach((track: any) => track.stop());
          this.webStream = null;
        }
        resolve(audioUrl);
      };
      this.mediaRecorder.stop();
    });
  }

  async deleteAudioFile(uri: string): Promise<boolean> {
    if (!uri) return false;
    try {
      if (typeof window !== 'undefined' && uri.startsWith('blob:')) {
        URL.revokeObjectURL(uri);
      }
      return true;
    } catch {
      return false;
    }
  }
}

export class NativeAudioDriver implements AudioDriver {
  private recording: any = null;
  private meterInterval: any = null;
  private onMeterCallback: ((level: number) => void) | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const { AudioModule } = require('expo-audio');
      const response = await AudioModule.requestRecordingPermissionsAsync();
      return response.granted;
    } catch (e) {
      console.warn('Native permission request error:', e);
      return false;
    }
  }

  async startRecording(onMeter?: (level: number) => void): Promise<void> {
    this.onMeterCallback = onMeter || null;
    const { AudioModule } = require('expo-audio');

    await AudioModule.setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    const RecorderClass = AudioModule.AudioRecorder;
    if (!RecorderClass) {
      throw new Error('AudioRecorder is not available on AudioModule');
    }

    this.recording = new RecorderClass({
      sampleRate: 44100,
      channels: 1,
      bitRate: 128000,
      isMeteringEnabled: true,
    });

    if (typeof this.recording.prepareToRecordAsync === 'function') {
      await this.recording.prepareToRecordAsync();
    }

    this.recording.record();

    if (this.onMeterCallback) {
      this.meterInterval = setInterval(() => {
        if (!this.recording) return;
        try {
          const status = this.recording.getStatus?.();
          if (status && typeof status.metering === 'number') {
            const db = status.metering;
            const normalized = Math.max(0, Math.min(1, (db + 50) / 50));
            this.onMeterCallback?.(normalized);
          }
        } catch {}
      }, 60);
    }
  }

  async stopRecording(): Promise<string | null> {
    if (this.meterInterval) {
      clearInterval(this.meterInterval);
      this.meterInterval = null;
    }
    this.onMeterCallback = null;

    if (!this.recording) return null;

    try {
      await this.recording.stop();
      const uri = this.recording.uri;
      this.recording = null;
      return uri;
    } catch (e) {
      console.error('Failed to stop native recording:', e);
      return null;
    }
  }

  async deleteAudioFile(uri: string): Promise<boolean> {
    if (!uri) return false;
    try {
      const FileSystem = require('expo-file-system');
      if (FileSystem?.deleteAsync) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
      return true;
    } catch {
      return true;
    }
  }
}

export class AudioRecorderService {
  private driver: AudioDriver;

  constructor(driver?: AudioDriver) {
    this.driver = driver ?? (Platform.OS === 'web' ? new WebAudioDriver() : new NativeAudioDriver());
  }

  async requestPermissions(): Promise<boolean> {
    return this.driver.requestPermissions();
  }

  async startRecording(onMeter?: (level: number) => void): Promise<void> {
    return this.driver.startRecording(onMeter);
  }

  async stopRecording(): Promise<string | null> {
    return this.driver.stopRecording();
  }

  async deleteAudioFile(uri: string): Promise<boolean> {
    return this.driver.deleteAudioFile(uri);
  }
}

export const audioRecorder = new AudioRecorderService();
