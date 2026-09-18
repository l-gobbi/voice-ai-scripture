/**
 * SpeechSynthesizer.ts
 *
 * Seam and adapters for on-device text-to-speech synthesis (TTS).
 * Integrates with expo-speech for production and provides MockSpeechSynthesizer
 * for hermetic testing.
 */

export interface SpeechOptions {
  language?: 'en' | 'pt' | string;
  pitch?: number;
  rate?: number;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
}

export interface SpeechSynthesizer {
  speak(text: string, options?: SpeechOptions): Promise<void>;
  stop(): Promise<void>;
  isSpeaking(): Promise<boolean>;
}

export function formatSpeechLanguage(language?: string): string {
  if (!language) return 'en-US';
  const clean = language.trim().toLowerCase();
  if (clean === 'pt' || clean === 'pt-br') return 'pt-BR';
  if (clean === 'en' || clean === 'en-us') return 'en-US';
  return language;
}

export class ExpoSpeechSynthesizer implements SpeechSynthesizer {
  private speechModule: any;

  constructor(speechModule?: any) {
    if (speechModule) {
      this.speechModule = speechModule;
    } else {
      try {
        this.speechModule = require('expo-speech');
      } catch (err) {
        console.warn('[ExpoSpeechSynthesizer] expo-speech could not be loaded:', err);
      }
    }
  }

  async speak(text: string, options?: SpeechOptions): Promise<void> {
    if (!this.speechModule || !this.speechModule.speak) {
      options?.onDone?.();
      return;
    }

    const lang = formatSpeechLanguage(options?.language);

    return new Promise((resolve) => {
      this.speechModule.speak(text, {
        language: lang,
        pitch: options?.pitch ?? 1.0,
        rate: options?.rate ?? 0.95,
        onDone: () => {
          options?.onDone?.();
          resolve();
        },
        onStopped: () => {
          options?.onStopped?.();
          resolve();
        },
        onError: (err: any) => {
          const errorObj = err instanceof Error ? err : new Error(String(err));
          options?.onError?.(errorObj);
          resolve();
        },
      });
    });
  }

  async stop(): Promise<void> {
    if (this.speechModule?.stop) {
      await this.speechModule.stop();
    }
  }

  async isSpeaking(): Promise<boolean> {
    if (this.speechModule?.isSpeakingAsync) {
      return this.speechModule.isSpeakingAsync();
    }
    return false;
  }
}

export interface MockSpeechCall {
  text: string;
  options: {
    language: string;
    pitch: number;
    rate: number;
  };
}

export class MockSpeechSynthesizer implements SpeechSynthesizer {
  private speaking = false;
  private calls: MockSpeechCall[] = [];
  private onStopCallbacks: Array<() => void> = [];
  private autoComplete: boolean;

  constructor(options?: { autoComplete?: boolean }) {
    this.autoComplete = options?.autoComplete ?? true;
  }

  async speak(text: string, options?: SpeechOptions): Promise<void> {
    this.speaking = true;
    const formattedOptions = {
      language: formatSpeechLanguage(options?.language),
      pitch: options?.pitch ?? 1.0,
      rate: options?.rate ?? 0.95,
    };

    this.calls.push({
      text,
      options: formattedOptions,
    });

    if (options?.onStopped) {
      this.onStopCallbacks.push(options.onStopped);
    }

    if (this.autoComplete) {
      // Allow caller to observe 'speaking = true' in microtask before completion
      return new Promise((resolve) => {
        setTimeout(() => {
          this.speaking = false;
          options?.onDone?.();
          resolve();
        }, 0);
      });
    }
  }

  async stop(): Promise<void> {
    this.speaking = false;
    const callbacks = [...this.onStopCallbacks];
    this.onStopCallbacks = [];
    callbacks.forEach((cb) => cb());
  }

  async isSpeaking(): Promise<boolean> {
    return this.speaking;
  }

  getSpokenUtterances(): MockSpeechCall[] {
    return [...this.calls];
  }

  clear(): void {
    this.calls = [];
    this.speaking = false;
    this.onStopCallbacks = [];
  }
}

let defaultSynthesizer: SpeechSynthesizer | null = null;

export function getDefaultSpeechSynthesizer(): SpeechSynthesizer {
  if (!defaultSynthesizer) {
    defaultSynthesizer = new ExpoSpeechSynthesizer();
  }
  return defaultSynthesizer;
}

export function setDefaultSpeechSynthesizer(synthesizer: SpeechSynthesizer | null): void {
  defaultSynthesizer = synthesizer;
}
