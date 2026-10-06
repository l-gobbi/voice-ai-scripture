import { Platform } from 'react-native';

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

export class WebAudioDriver implements AudioDriver {
  private mediaRecorder: any = null;
  private audioChunks: Blob[] = [];
  private webStream: any = null;
  private meterInterval: any = null;
  private audioContext: any = null;

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
    onMeter?: (level: number) => void,
    _options?: AudioRecordingOptions
  ): Promise<void> {
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

    if (onMeter) {
      try {
        const AudioCtx =
          typeof window !== 'undefined'
            ? (window as any).AudioContext || (window as any).webkitAudioContext
            : null;
        if (AudioCtx && this.webStream) {
          const ctx = new AudioCtx();
          const source = ctx.createMediaStreamSource(this.webStream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          this.audioContext = ctx;

          this.meterInterval = setInterval(() => {
            try {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              const normalized = Math.min(1, Math.max(0, avg / 128));
              onMeter(normalized);
            } catch {}
          }, 60);
        }
      } catch (err) {
        console.warn('[WebAudioDriver] Failed to initialize AudioContext metering:', err);
      }
    }
  }

  async stopRecording(): Promise<string | null> {
    if (this.meterInterval) {
      clearInterval(this.meterInterval);
      this.meterInterval = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
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

function resolvePlatformRecordingOptions(options: any): any {
  try {
    const { createRecordingOptions } = require('expo-audio/build/utils/options');
    if (typeof createRecordingOptions === 'function') {
      return createRecordingOptions(options);
    }
  } catch {}

  const common = {
    extension: options.extension ?? '.m4a',
    sampleRate: options.sampleRate ?? 44100,
    numberOfChannels: options.numberOfChannels ?? 1,
    bitRate: options.bitRate ?? 128000,
    isMeteringEnabled: options.isMeteringEnabled ?? true,
  };

  if (Platform.OS === 'ios') {
    return {
      ...common,
      directory: options.directory,
      outputFormat: 'aac ',
      audioQuality: 0x7f,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
      ...(options.ios || {}),
    };
  } else if (Platform.OS === 'android') {
    return {
      ...common,
      directory: options.directory,
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      ...(options.android || {}),
    };
  }
  return {
    ...common,
    ...(options.web || {}),
  };
}

/**
 * Normalizes raw decibel metering [-80 dBFS, 0 dBFS] to [0.0, 1.0] using an
 * expanded quadratic curve.
 *
 * At quiet pauses with Android AGC pumping (-25 dBFS to -20 dBFS):
 * linear = (55 to 60) / 80 ≈ 0.6875 to 0.75
 * quadratic = linear^2 ≈ 0.47 to 0.56 (well below speech threshold).
 *
 * At recitation speech (-10 dBFS to -4 dBFS):
 * linear = (70 to 76) / 80 ≈ 0.875 to 0.95
 * quadratic = linear^2 ≈ 0.77 to 0.90 (clearly registered as speech).
 */
export function calculateNormalizedDbLevel(db: number): number {
  const linear = Math.max(0, Math.min(1, (db + 80) / 80));
  return Math.pow(linear, 2);
}

export class NativeAudioDriver implements AudioDriver {
  private recording: any = null;
  private meterInterval: any = null;
  private onMeterCallback: ((level: number) => void) | null = null;
  private startTime: number = 0;

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

  async startRecording(
    onMeter?: (level: number) => void,
    _options?: AudioRecordingOptions
  ): Promise<void> {
    this.onMeterCallback = onMeter || null;
    this.startTime = Date.now();
    const { AudioModule } = require('expo-audio');

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
      numberOfChannels: 2,
      bitRate: 128000,
    };

    const recordingOptions = {
      ...basePreset,
      extension: '.m4a',
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      isMeteringEnabled: true,
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      android: {
        extension: '.m4a',
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
        outputFormat: 'mpeg4',
        audioEncoder: 'aac',
        audioSource: 'voice_recognition',
        isMeteringEnabled: true,
        ...(basePreset.android || {}),
      },
      ios: {
        extension: '.m4a',
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
        outputFormat: 'aac ',
        audioQuality: 0x7f,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
        isMeteringEnabled: true,
        ...(basePreset.ios || {}),
      },
    };

    const processedOptions = resolvePlatformRecordingOptions(recordingOptions);
    this.recording = new RecorderClass(processedOptions);

    if (typeof this.recording.prepareToRecordAsync === 'function') {
      await this.recording.prepareToRecordAsync(processedOptions);
    }

    this.recording.record();

    if (this.onMeterCallback) {
      let tick = 0;
      let isInitialized = false;
      let smoothedLevel = 0;
      this.meterInterval = setInterval(() => {
        if (!this.recording) return;
        try {
          const rawStatus = this.recording.getStatus?.();
          const handleStatus = (status: any) => {
            tick++;
            if (tick % 10 === 0 && typeof __DEV__ !== 'undefined' && __DEV__) {
              console.log('[NativeAudioDriver] Status:', {
                isRecording: status?.isRecording,
                metering: status?.metering,
              });
            }

            if (status && typeof status.metering === 'number') {
              const db = status.metering;
              const rawNormalized = calculateNormalizedDbLevel(db);
              // Symmetric EMA smoothing (alpha = 0.35) prevents single-frame noise spikes or AGC surges from triggering speech onset
              if (!isInitialized) {
                smoothedLevel = rawNormalized;
                isInitialized = true;
              } else {
                smoothedLevel = smoothedLevel * 0.65 + rawNormalized * 0.35;
              }
              this.onMeterCallback?.(smoothedLevel);
            }
          };
          if (rawStatus && typeof rawStatus.then === 'function') {
            rawStatus.then(handleStatus).catch((e: any) => {
              if (typeof __DEV__ !== 'undefined' && __DEV__) {
                console.warn('[NativeAudioDriver] rawStatus promise error:', e);
              }
            });
          } else if (rawStatus) {
            handleStatus(rawStatus);
          }
        } catch (err) {
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.warn('[NativeAudioDriver] getStatus error:', err);
          }
        }
      }, 100);
    }
  }

  async stopRecording(): Promise<string | null> {
    if (this.meterInterval) {
      clearInterval(this.meterInterval);
      this.meterInterval = null;
    }
    this.onMeterCallback = null;

    if (!this.recording) return null;

    // Ensure at least 600ms of recording has elapsed so MediaRecorder.stop() flushes properly on Android
    if (this.startTime > 0) {
      const elapsed = Date.now() - this.startTime;
      if (elapsed < 600) {
        await new Promise((r) => setTimeout(r, 600 - elapsed));
      }
    }

    try {
      const uriBeforeStop = this.recording.uri || null;
      const stopResult = await this.recording.stop();
      if ((stopResult as any)?.hasError) {
        console.warn('[AudioRecorderService] Native stop reported error:', (stopResult as any)?.error);
      }
      const rawUri = (stopResult as any)?.url || this.recording?.uri || uriBeforeStop;
      const uri = (typeof rawUri === 'string' && rawUri.trim().length > 0) ? rawUri.trim() : null;
      this.recording = null;
      return uri;
    } catch (e) {
      console.error('[AudioRecorderService] Failed to stop native recording:', e);
      return null;
    }
  }

  async deleteAudioFile(uri: string): Promise<boolean> {
    if (!uri) return false;
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
