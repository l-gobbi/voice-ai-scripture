import { normalizeSpeechLanguage } from '../utils/languageNormalizer';
import { getExpoSpeechRecognitionModule } from './NativeSpeechRecognitionHelper';
import {
  AudioDriver,
  AudioRecordingOptions,
  NativeAudioDriver,
  WebAudioDriver,
  createDefaultAudioDriver,
} from './AudioDriver';
import {
  SpeechTranscriber,
  WhisperTranscriber,
  GroqTranscriber,
  TranscriptionError,
  createDefaultTranscriber,
} from './SpeechTranscriber';

export {
  AudioDriver,
  AudioRecordingOptions,
  NativeAudioDriver,
  WebAudioDriver,
  createDefaultAudioDriver,
};

export interface VoiceInputOptions {
  language?: string;
  prompt?: string;
  onMeter?: (level: number) => void;
  simulatedText?: string;
}

export interface VoiceInputResult {
  transcript: string;
}

export interface VoiceInput {
  requestPermissions(): Promise<boolean>;
  warmUp?(): Promise<void>;
  start(options?: VoiceInputOptions): Promise<void>;
  stop(): Promise<VoiceInputResult>;
  cancel(): Promise<void>;
}

/**
 * NativeStreamVoiceAdapter
 * Direct on-device streaming recognition (Apple Speech framework / Android SpeechRecognizer).
 * Zero audio files written to disk (privacy by default, zero cleanup overhead).
 */
export class NativeStreamVoiceAdapter implements VoiceInput {
  private speechModule: any;
  private isListening: boolean = false;
  private liveTranscript: string = '';
  private lastSpokenTime: number = 0;
  private currentOptions?: VoiceInputOptions;
  private resultSub: any = null;
  private errorSub: any = null;
  private meterInterval: any = null;

  constructor(speechModule?: any) {
    this.speechModule = speechModule !== undefined ? speechModule : getExpoSpeechRecognitionModule();
  }

  async requestPermissions(): Promise<boolean> {
    if (this.speechModule && typeof this.speechModule.requestPermissionsAsync === 'function') {
      try {
        const res = await this.speechModule.requestPermissionsAsync();
        return res?.granted ?? true;
      } catch {
        return false;
      }
    }
    return true;
  }

  async warmUp(): Promise<void> {
    await this.requestPermissions().catch(() => false);
  }

  async start(options?: VoiceInputOptions): Promise<void> {
    this.currentOptions = options;
    this.liveTranscript = '';
    this.lastSpokenTime = 0;
    this.isListening = true;

    const hasExpo = this.speechModule && typeof this.speechModule.start === 'function';
    if (hasExpo) {
      try {
        if (typeof this.speechModule.requestPermissionsAsync === 'function') {
          await this.speechModule.requestPermissionsAsync().catch(() => {});
        }
      } catch {}

      this.resultSub = this.speechModule.addListener?.('result', (event: any) => {
        if (event?.results?.[0]?.transcript) {
          this.liveTranscript = event.results[0].transcript;
          this.lastSpokenTime = Date.now();
        }
      });

      this.errorSub = this.speechModule.addListener?.('error', (err: any) => {
        console.warn('[NativeStreamVoiceAdapter] Speech error:', err);
      });

      try {
        this.speechModule.start({
          lang: normalizeSpeechLanguage(options?.language),
          interimResults: true,
          continuous: true,
        });
      } catch (err) {
        console.warn('[NativeStreamVoiceAdapter] Failed to start native speech:', err);
      }
    } else if (typeof window !== 'undefined') {
      const SpeechRecClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecClass) {
        try {
          const rec = new SpeechRecClass();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = normalizeSpeechLanguage(options?.language);
          rec.onresult = (event: any) => {
            let res = '';
            for (let i = 0; i < event.results.length; i++) {
              res += event.results[i][0].transcript + ' ';
            }
            this.liveTranscript = res.trim();
            this.lastSpokenTime = Date.now();
          };
          rec.start();
          this.speechModule = rec;
        } catch {}
      }
    }

    if (options?.onMeter) {
      this.meterInterval = setInterval(() => {
        if (!this.isListening) return;
        const timeSinceSpeech = Date.now() - this.lastSpokenTime;
        if (this.lastSpokenTime > 0 && timeSinceSpeech < 800) {
          const vol = 0.4 + 0.2 * Math.sin(Date.now() / 200);
          options.onMeter?.(vol);
        } else {
          options.onMeter?.(0.02);
        }
      }, 100);
    }
  }

  async stop(): Promise<VoiceInputResult> {
    this.cleanup();
    const hasExpo = this.speechModule && typeof this.speechModule.start === 'function';
    const hasWeb =
      typeof window !== 'undefined' &&
      Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!hasExpo && !hasWeb) {
      throw new TranscriptionError(
        'unavailable',
        'Speech recognition is not available on this platform or device without a configured cloud API key.'
      );
    }
    return { transcript: this.liveTranscript.trim() };
  }

  async cancel(): Promise<void> {
    this.cleanup();
    this.liveTranscript = '';
  }

  private cleanup(): void {
    this.isListening = false;
    if (this.meterInterval) {
      clearInterval(this.meterInterval);
      this.meterInterval = null;
    }
    if (this.resultSub) {
      this.resultSub.remove?.();
      this.resultSub = null;
    }
    if (this.errorSub) {
      this.errorSub.remove?.();
      this.errorSub = null;
    }
    if (this.speechModule) {
      try {
        if (typeof this.speechModule.stop === 'function') {
          this.speechModule.stop();
        }
      } catch {}
    }
  }
}

/**
 * CloudAudioVoiceAdapter
 * Records transient audio, uploads to Groq Cloud Whisper (default) or OpenAI Whisper,
 * and atomically deletes transient audio upon completion or cancellation.
 */
export interface CloudAudioVoiceAdapterOptions {
  driver?: AudioDriver;
  transcriber?: SpeechTranscriber;
  provider?: 'groq' | 'openai';
  apiKey?: string;
  model?: string;
  fallbackToPrompt?: boolean;
}

export class CloudAudioVoiceAdapter implements VoiceInput {
  private transcriber: SpeechTranscriber;
  private driver: AudioDriver;
  private currentOptions?: VoiceInputOptions;

  constructor(options?: CloudAudioVoiceAdapterOptions) {
    this.driver = options?.driver ?? createDefaultAudioDriver();
    if (options?.transcriber) {
      this.transcriber = options.transcriber;
    } else if (options?.provider === 'openai') {
      this.transcriber = new WhisperTranscriber(
        options.apiKey ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? ''
      );
    } else if (options?.provider === 'groq') {
      this.transcriber = new GroqTranscriber(
        options?.apiKey ?? process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '',
        options?.model ?? 'whisper-large-v3-turbo'
      );
    } else {
      this.transcriber = createDefaultTranscriber(options?.apiKey, {
        fallbackToPrompt: options?.fallbackToPrompt,
      });
    }
  }

  async requestPermissions(): Promise<boolean> {
    return this.driver.requestPermissions();
  }

  async warmUp(): Promise<void> {
    await this.driver.warmUp?.();
  }

  async start(options?: VoiceInputOptions): Promise<void> {
    this.currentOptions = options;
    await this.driver.startRecording(options?.onMeter, { language: options?.language });
  }

  async stop(): Promise<VoiceInputResult> {
    const uri = await this.driver.stopRecording();
    if (!uri) {
      throw new TranscriptionError('unintelligible', 'No audio recorded');
    }

    try {
      const res = await this.transcriber.transcribe(uri, {
        language: (this.currentOptions?.language as any) ?? 'en',
        prompt: this.currentOptions?.prompt,
        simulatedText: this.currentOptions?.simulatedText,
      });
      return { transcript: res.text };
    } finally {
      // Auto-purge transient audio file from disk
      await this.driver.deleteAudioFile(uri).catch(() => {});
      this.currentOptions = undefined;
    }
  }

  async cancel(): Promise<void> {
    try {
      const uri = await this.driver.stopRecording();
      if (uri) {
        await this.driver.deleteAudioFile(uri).catch(() => {});
      }
    } catch {}
    this.currentOptions = undefined;
  }
}

/**
 * SimulatedVoiceAdapter
 * Predictable in-memory adapter for unit testing and offline development.
 */
export interface SimulatedVoiceAdapterConfig {
  defaultTranscript?: string;
  meterIntervalMs?: number;
  meterLevels?: number[];
  handler?: (options?: VoiceInputOptions) => Promise<string> | string;
}

export class SimulatedVoiceAdapter implements VoiceInput {
  private config: SimulatedVoiceAdapterConfig;
  private currentOptions?: VoiceInputOptions;
  private meterTimer: any = null;

  constructor(config?: SimulatedVoiceAdapterConfig) {
    this.config = config ?? {};
  }

  async requestPermissions(): Promise<boolean> {
    return true;
  }

  async warmUp(): Promise<void> {
    // no-op for fast hermetic unit testing
  }

  async start(options?: VoiceInputOptions): Promise<void> {
    this.currentOptions = options;
    if (options?.onMeter && this.config.meterIntervalMs && this.config.meterLevels) {
      let idx = 0;
      this.meterTimer = setInterval(() => {
        const levels = this.config.meterLevels!;
        options.onMeter!(levels[idx % levels.length]);
        idx++;
      }, this.config.meterIntervalMs);
    }
  }

  async stop(): Promise<VoiceInputResult> {
    this.cleanupTimer();
    if (this.config.handler) {
      const text = await this.config.handler(this.currentOptions);
      return { transcript: text };
    }
    if (this.currentOptions?.simulatedText !== undefined) {
      return { transcript: this.currentOptions.simulatedText };
    }
    if (this.config.defaultTranscript !== undefined) {
      return { transcript: this.config.defaultTranscript };
    }
    if (this.currentOptions?.prompt) {
      return { transcript: this.currentOptions.prompt };
    }
    return { transcript: '' };
  }

  async cancel(): Promise<void> {
    this.cleanupTimer();
    this.currentOptions = undefined;
  }

  private cleanupTimer(): void {
    if (this.meterTimer) {
      clearInterval(this.meterTimer);
      this.meterTimer = null;
    }
  }
}

/**
 * Factory for creating VoiceInput instances.
 */
export interface VoiceInputConfig {
  engine?: 'auto' | 'native' | 'cloud' | 'simulated';
  groqApiKey?: string;
  openaiApiKey?: string;
  simulatedTranscript?: string;
}

export function createDefaultVoiceInput(config?: VoiceInputConfig): VoiceInput {
  const engine = config?.engine ?? 'auto';

  if (engine === 'simulated') {
    return new SimulatedVoiceAdapter({
      defaultTranscript: config?.simulatedTranscript,
    });
  }

  if (engine === 'native') {
    return new NativeStreamVoiceAdapter();
  }

  if (engine === 'cloud') {
    const groqKey = (config?.groqApiKey ?? process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '').trim();
    if (groqKey) {
      return new CloudAudioVoiceAdapter({ provider: 'groq', apiKey: groqKey });
    }
    const openaiKey = (config?.openaiApiKey ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '').trim();
    return new CloudAudioVoiceAdapter({ provider: 'openai', apiKey: openaiKey });
  }

  // Auto-detection:
  const groqKey = (config?.groqApiKey ?? process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '').trim();
  if (groqKey) {
    return new CloudAudioVoiceAdapter({ provider: 'groq', apiKey: groqKey });
  }

  const openaiKey = (config?.openaiApiKey ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '').trim();
  if (openaiKey) {
    return new CloudAudioVoiceAdapter({ provider: 'openai', apiKey: openaiKey });
  }

  return new NativeStreamVoiceAdapter();
}
