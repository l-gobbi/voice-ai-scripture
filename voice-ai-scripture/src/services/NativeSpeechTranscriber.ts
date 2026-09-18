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

export class DefaultNativeDriver implements NativeSpeechRecognizerDriver {
  async isAvailable(): Promise<boolean> {
    // In node/test or web environments, native speech recognition is not directly bundled
    return false;
  }

  async transcribeAudio(
    _audioUri: string,
    _options?: { language?: string; prompt?: string }
  ): Promise<string> {
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
