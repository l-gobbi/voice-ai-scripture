import { Platform } from 'react-native';
import { normalizeSpeechLanguage } from '../utils/languageNormalizer';
import { getExpoSpeechRecognitionModule } from './NativeSpeechRecognitionHelper';

export interface AudioRecordingOptions {
  language?: string;
}

export interface AudioDriver {
  requestPermissions(): Promise<boolean>;
  startRecording(
    onMeter?: (level: number) => void,
    options?: AudioRecordingOptions
  ): Promise<void>;
  stopRecording(): Promise<string | null>;
  deleteAudioFile(uri: string): Promise<boolean>;
}

const webTranscriptStore = new Map<string, string>();
let lastWebTranscript = '';

export function getWebTranscript(uri?: string): string | undefined {
  if (uri && webTranscriptStore.has(uri)) {
    return webTranscriptStore.get(uri);
  }
  return lastWebTranscript;
}

export function setWebTranscript(uri: string, transcript: string): void {
  webTranscriptStore.set(uri, transcript);
  lastWebTranscript = transcript;
}

export function clearWebTranscript(uri?: string): void {
  if (uri) {
    webTranscriptStore.delete(uri);
  }
  if (!uri || webTranscriptStore.size === 0) {
    lastWebTranscript = '';
  }
}

const nativeTranscriptStore = new Map<string, string>();
let lastNativeTranscript = '';

export function getNativeTranscript(uri?: string): string | undefined {
  if (uri && nativeTranscriptStore.has(uri)) {
    return nativeTranscriptStore.get(uri);
  }
  return lastNativeTranscript;
}

export function setNativeTranscript(uri: string, transcript: string): void {
  nativeTranscriptStore.set(uri, transcript);
  lastNativeTranscript = transcript;
}

export function clearNativeTranscript(uri?: string): void {
  if (uri) {
    nativeTranscriptStore.delete(uri);
  }
  if (!uri || nativeTranscriptStore.size === 0) {
    lastNativeTranscript = '';
  }
}

export class WebAudioDriver implements AudioDriver {
  private mediaRecorder: any = null;
  private audioChunks: Blob[] = [];
  private webStream: any = null;
  private webSpeechRecognition: any = null;
  private liveTranscript: string = '';

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

  async startRecording(
    _onMeter?: (level: number) => void,
    options?: AudioRecordingOptions
  ): Promise<void> {
    if (!this.webStream) {
      this.webStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    this.audioChunks = [];
    this.liveTranscript = '';
    this.mediaRecorder = new (window as any).MediaRecorder(this.webStream);
    this.mediaRecorder.ondataavailable = (event: any) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    this.mediaRecorder.start();

    // Start live browser speech recognition if supported
    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = normalizeSpeechLanguage(options?.language);
        this.webSpeechRecognition = recognition;

        let accumulatedFinal = '';
        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              accumulatedFinal += res[0].transcript + ' ';
            } else {
              interim += res[0].transcript;
            }
          }
          this.liveTranscript = (accumulatedFinal + interim).trim();
          lastWebTranscript = this.liveTranscript;
        };

        recognition.onerror = (err: any) => {
          console.warn('[WebSpeechRecognition] Error:', err?.error || err);
        };

        recognition.start();
      } catch (err) {
        console.warn('[WebSpeechRecognition] Could not start speech recognition:', err);
      }
    }
  }

  async stopRecording(): Promise<string | null> {
    if (this.webSpeechRecognition) {
      try {
        this.webSpeechRecognition.stop();
      } catch {}
      this.webSpeechRecognition = null;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder) return resolve(null);

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/m4a' });
        const audioUrl = URL.createObjectURL(audioBlob);
        if (this.webStream) {
          this.webStream.getTracks().forEach((track: any) => track.stop());
          this.webStream = null;
        }
        if (this.liveTranscript) {
          setWebTranscript(audioUrl, this.liveTranscript);
        }
        resolve(audioUrl);
      };
      this.mediaRecorder.stop();
    });
  }

  async deleteAudioFile(uri: string): Promise<boolean> {
    if (!uri) return false;
    clearWebTranscript(uri);
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
  private speechResultSubscription: any = null;
  private speechErrorSubscription: any = null;
  private liveTranscript: string = '';

  async requestPermissions(): Promise<boolean> {
    try {
      const { AudioModule } = require('expo-audio');
      const response = await AudioModule.requestRecordingPermissionsAsync();
      try {
        const SpeechRec = getExpoSpeechRecognitionModule();
        if (typeof SpeechRec?.requestPermissionsAsync === 'function') {
          await SpeechRec.requestPermissionsAsync();
        }
      } catch {}
      return response.granted;
    } catch (e) {
      console.warn('Native permission request error:', e);
      return false;
    }
  }

  async startRecording(
    onMeter?: (level: number) => void,
    options?: AudioRecordingOptions
  ): Promise<void> {
    this.onMeterCallback = onMeter || null;
    this.liveTranscript = '';
    const { AudioModule } = require('expo-audio');

    // Attempt to start on-device speech recognition in background if available
    try {
      const SpeechRec = getExpoSpeechRecognitionModule();
      if (SpeechRec && typeof SpeechRec.isRecognitionAvailable === 'function' && SpeechRec.isRecognitionAvailable()) {
        this.speechResultSubscription = SpeechRec.addListener?.('result', (event: any) => {
          if (event?.results?.[0]?.transcript) {
            this.liveTranscript = event.results[0].transcript;
            lastNativeTranscript = this.liveTranscript;
          }
        });
        this.speechErrorSubscription = SpeechRec.addListener?.('error', (err: any) => {
          console.warn('[ExpoSpeechRecognition] Error during live recording:', err);
        });
        SpeechRec.start?.({
          lang: normalizeSpeechLanguage(options?.language),
          interimResults: true,
          continuous: true,
        });
      }
    } catch {}

    await AudioModule.setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    const RecorderClass = AudioModule.AudioRecorder;
    if (!RecorderClass) {
      throw new Error('AudioRecorder is not available on AudioModule');
    }

    const { RecordingPresets } = require('expo-audio');
    const basePreset = RecordingPresets?.HIGH_QUALITY || {
      extension: '.m4a',
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
    };

    const recordingOptions = {
      ...basePreset,
      isMeteringEnabled: true,
      android: {
        ...(basePreset.android || {}),
        outputFormat: 'mpeg4',
        audioEncoder: 'aac',
      },
      ios: {
        ...(basePreset.ios || {}),
        outputFormat: 'aac ',
      },
    };

    this.recording = new RecorderClass(recordingOptions);

    if (typeof this.recording.prepareToRecordAsync === 'function') {
      await this.recording.prepareToRecordAsync(recordingOptions);
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

    try {
      const SpeechRec = getExpoSpeechRecognitionModule();
      if (this.speechResultSubscription) {
        this.speechResultSubscription.remove?.();
        this.speechResultSubscription = null;
      }
      if (this.speechErrorSubscription) {
        this.speechErrorSubscription.remove?.();
        this.speechErrorSubscription = null;
      }
      SpeechRec?.stop?.();
    } catch {}

    if (!this.recording) return null;

    try {
      const uriBeforeStop = this.recording.uri;
      const stopResult = await this.recording.stop();
      const uri = this.recording?.uri || uriBeforeStop || (stopResult as any)?.url;
      this.recording = null;
      if (uri && this.liveTranscript) {
        setNativeTranscript(uri, this.liveTranscript);
      }
      return uri;
    } catch (e) {
      console.error('[AudioRecorderService] Failed to stop native recording:', e);
      return null;
    }
  }

  async deleteAudioFile(uri: string): Promise<boolean> {
    if (!uri) return false;
    clearNativeTranscript(uri);
    try {
      const FileSystem = require('expo-file-system');
      if (typeof FileSystem?.File === 'function') {
        const file = new FileSystem.File(uri);
        if (file.exists) {
          file.delete();
        }
        return true;
      }

      try {
        const LegacyFileSystem = require('expo-file-system/legacy');
        if (LegacyFileSystem?.deleteAsync) {
          await LegacyFileSystem.deleteAsync(uri, { idempotent: true });
          return true;
        }
      } catch {}

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

  async startRecording(
    onMeter?: (level: number) => void,
    options?: AudioRecordingOptions
  ): Promise<void> {
    if (options !== undefined) {
      return this.driver.startRecording(onMeter, options);
    }
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
