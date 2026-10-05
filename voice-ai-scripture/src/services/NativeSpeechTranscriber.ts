/**
 * NativeSpeechTranscriber.ts
 *
 * Implements the SpeechTranscriber seam via on-device speech recognition
 * (Apple Speech framework / Android SpeechRecognizer), providing free, offline
 * voice recitation verification.
 */

import {
  SpeechTranscriber,
  TranscriptionOptions,
  TranscriptionResult,
  TranscriptionError,
} from './SpeechTranscriberTypes';

export interface NativeSpeechRecognizerDriver {
  isAvailable(): Promise<boolean>;
  transcribeAudio(
    audioUri: string,
    options?: { language?: string; prompt?: string }
  ): Promise<string>;
}

import { normalizeSpeechLanguage } from '../utils/languageNormalizer';

export const formatNativeRecognizerLanguage = normalizeSpeechLanguage;

import { getNativeTranscript, getWebTranscript } from './AudioRecorderService';

export class WebSpeechRecognizerDriver implements NativeSpeechRecognizerDriver {
  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  async transcribeAudio(
    audioUri: string,
    _options?: { language?: string; prompt?: string }
  ): Promise<string> {
    const transcript = getWebTranscript(audioUri);
    return transcript || '';
  }
}

export class ExpoSpeechRecognitionDriver implements NativeSpeechRecognizerDriver {
  private module: any;

  constructor(module?: any) {
    if (module !== undefined) {
      this.module = module;
    } else {
      try {
        const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
        this.module = ExpoSpeechRecognitionModule;
      } catch {
        this.module = null;
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.module) return false;
    try {
      if (typeof this.module.isRecognitionAvailable === 'function') {
        return !!this.module.isRecognitionAvailable();
      }
      return false;
    } catch {
      return false;
    }
  }

  async transcribeAudio(
    audioUri: string,
    options?: { language?: string; prompt?: string }
  ): Promise<string> {
    const transcript = getNativeTranscript(audioUri);
    if (transcript && transcript.trim().length > 0) {
      return transcript.trim();
    }

    if (this.module && typeof this.module.start === 'function' && audioUri) {
      return new Promise<string>((resolve) => {
        let finalResult = '';
        let timer: any = null;

        const subResult = this.module.addListener?.('result', (event: any) => {
          if (event?.results?.[0]?.transcript) {
            finalResult = event.results[0].transcript;
          }
          if (event?.isFinal) {
            cleanup();
            resolve(finalResult);
          }
        });

        const subError = this.module.addListener?.('error', () => {
          cleanup();
          resolve(finalResult);
        });

        const cleanup = () => {
          if (timer) clearTimeout(timer);
          subResult?.remove?.();
          subError?.remove?.();
          try {
            this.module.stop?.();
          } catch {}
        };

        timer = setTimeout(() => {
          cleanup();
          resolve(finalResult);
        }, 5000);

        try {
          this.module.start({
            lang: formatNativeRecognizerLanguage(options?.language),
            audioSource: { uri: audioUri },
          });
        } catch {
          cleanup();
          resolve('');
        }
      });
    }

    return '';
  }
}

export class DefaultNativeDriver implements NativeSpeechRecognizerDriver {
  private expoDriver: ExpoSpeechRecognitionDriver;
  private webDriver: WebSpeechRecognizerDriver;

  constructor(expoDriver?: ExpoSpeechRecognitionDriver, webDriver?: WebSpeechRecognizerDriver) {
    this.expoDriver = expoDriver ?? new ExpoSpeechRecognitionDriver();
    this.webDriver = webDriver ?? new WebSpeechRecognizerDriver();
  }

  async isAvailable(): Promise<boolean> {
    if (await this.expoDriver.isAvailable()) {
      return true;
    }
    if (await this.webDriver.isAvailable()) {
      return true;
    }
    return false;
  }

  async transcribeAudio(
    audioUri: string,
    options?: { language?: string; prompt?: string }
  ): Promise<string> {
    if (await this.expoDriver.isAvailable()) {
      return this.expoDriver.transcribeAudio(audioUri, options);
    }
    if (await this.webDriver.isAvailable()) {
      return this.webDriver.transcribeAudio(audioUri, options);
    }
    return '';
  }
}

export interface NativeSpeechTranscriberConfig {
  driver?: NativeSpeechRecognizerDriver;
  fallbackToPrompt?: boolean;
}

export class NativeSpeechTranscriber implements SpeechTranscriber {
  private driver: NativeSpeechRecognizerDriver;
  private fallbackToPrompt: boolean;

  constructor(config?: NativeSpeechTranscriberConfig) {
    this.driver = config?.driver ?? new DefaultNativeDriver();
    this.fallbackToPrompt = config?.fallbackToPrompt ?? false;
  }

  async transcribe(audioUri: string, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    const formattedLang = formatNativeRecognizerLanguage(options?.language);

    try {
      const available = await this.driver.isAvailable();
      if (!available) {
        if (this.fallbackToPrompt && (options?.prompt || options?.simulatedText)) {
          return { text: options.simulatedText ?? options.prompt ?? '' };
        }
        throw new TranscriptionError(
          'unavailable',
          'Native speech recognition is not available on this device or platform.'
        );
      }

      const text = await this.driver.transcribeAudio(audioUri, {
        language: formattedLang,
        prompt: options?.prompt,
      });

      if (text && text.trim().length > 0) {
        return { text: text.trim() };
      }

      if (this.fallbackToPrompt && (options?.prompt || options?.simulatedText)) {
        return { text: options.simulatedText ?? options.prompt ?? '' };
      }

      throw new TranscriptionError(
        'unintelligible',
        'Native speech recognition could not transcribe audio. No speech was detected.'
      );
    } catch (err: any) {
      if (err instanceof TranscriptionError) {
        throw err;
      }
      if (this.fallbackToPrompt && (options?.prompt || options?.simulatedText)) {
        return { text: options.simulatedText ?? options.prompt ?? '' };
      }
      throw new TranscriptionError(
        'unintelligible',
        `Native transcription failed: ${err?.message || err}`,
        err
      );
    }
  }
}
