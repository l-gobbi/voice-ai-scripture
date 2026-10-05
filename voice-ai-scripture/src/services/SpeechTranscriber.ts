export * from './SpeechTranscriberTypes';
import {
  TranscriptionErrorCode,
  TranscriptionError,
  TranscriptionLanguage,
  TranscriptionOptions,
  TranscriptionResult,
  SpeechTranscriber,
} from './SpeechTranscriberTypes';

export class WhisperTranscriber implements SpeechTranscriber {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = (apiKey ?? '').trim();
  }

  async transcribe(audioUri: string, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      throw new TranscriptionError('unauthorized', 'OpenAI API key is required for transcription');
    }

    const formData = new FormData();
    const filename = audioUri.split('/').pop() || 'recording.m4a';
    const fileType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/m4a';

    formData.append('file', {
      uri: audioUri,
      name: filename,
      type: fileType,
    } as any);

    formData.append('model', 'whisper-1');
    formData.append('language', options?.language ?? 'en');

    if (options?.prompt) {
      formData.append('prompt', options.prompt);
    }

    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });
    } catch (networkErr: any) {
      throw new TranscriptionError('network_error', networkErr?.message || 'Network request failed', networkErr);
    }

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status;
      let code: TranscriptionErrorCode = 'unknown';

      if (status === 401 || status === 403) {
        code = 'unauthorized';
      } else if (status === 429) {
        code = 'rate_limited';
      } else if (status === 400 || status === 422) {
        code = 'unintelligible';
      } else if (status >= 500) {
        code = 'network_error';
      }

      throw new TranscriptionError(code, `Audio transcription failed (${status}): ${errorText}`);
    }

    const data = await response.json();
    return {
      text: data.text || '',
    };
  }
}

export interface SimulatedTranscriberConfig {
  defaultText?: string;
  handler?: (audioUri: string, options?: TranscriptionOptions) => Promise<string> | string;
}

export class SimulatedTranscriber implements SpeechTranscriber {
  private defaultText: string;
  private handler?: (audioUri: string, options?: TranscriptionOptions) => Promise<string> | string;

  constructor(config?: SimulatedTranscriberConfig) {
    this.defaultText = config?.defaultText ?? '';
    this.handler = config?.handler;
  }

  async transcribe(audioUri: string, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    if (this.handler) {
      const text = await this.handler(audioUri, options);
      return { text };
    }

    if (this.defaultText) {
      return { text: this.defaultText };
    }

    if (options?.simulatedText !== undefined) {
      return { text: options.simulatedText };
    }

    if (options?.prompt) {
      return { text: options.prompt };
    }

    return { text: this.defaultText };
  }
}

export class GroqTranscriber implements SpeechTranscriber {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'whisper-large-v3-turbo') {
    this.apiKey = (apiKey ?? '').trim();
    this.model = model;
  }

  async transcribe(audioUri: string, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      throw new TranscriptionError('unauthorized', 'Groq API key is required for transcription');
    }

    const formData = new FormData();
    const filename = audioUri.split('/').pop() || 'recording.m4a';
    const fileType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/m4a';

    formData.append('file', {
      uri: audioUri,
      name: filename,
      type: fileType,
    } as any);

    formData.append('model', this.model);
    formData.append('language', options?.language ?? 'en');

    if (options?.prompt) {
      formData.append('prompt', options.prompt);
    }

    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });
    } catch (networkErr: any) {
      throw new TranscriptionError('network_error', networkErr?.message || 'Network request failed', networkErr);
    }

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status;
      let code: TranscriptionErrorCode = 'unknown';

      if (status === 401 || status === 403) {
        code = 'unauthorized';
      } else if (status === 429) {
        code = 'rate_limited';
      } else if (status === 400 || status === 422) {
        code = 'unintelligible';
      } else if (status >= 500) {
        code = 'network_error';
      }

      throw new TranscriptionError(code, `Groq audio transcription failed (${status}): ${errorText}`);
    }

    const data = await response.json();
    return {
      text: data.text || '',
    };
  }
}

import { NativeSpeechTranscriber } from './NativeSpeechTranscriber';

export interface DefaultTranscriberOptions {
  engine?: 'auto' | 'groq' | 'whisper' | 'native' | 'simulated';
  fallbackToPrompt?: boolean;
  groqApiKey?: string;
  openaiApiKey?: string;
}

export function createDefaultTranscriber(
  apiKey?: string,
  options?: DefaultTranscriberOptions
): SpeechTranscriber {
  const engine = options?.engine ?? 'auto';

  if (engine === 'simulated') {
    return new SimulatedTranscriber();
  }

  if (engine === 'native') {
    return new NativeSpeechTranscriber({
      fallbackToPrompt: options?.fallbackToPrompt ?? false,
    });
  }

  if (engine === 'groq') {
    const groqKey = (options?.groqApiKey ?? apiKey ?? process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '').trim();
    return new GroqTranscriber(groqKey);
  }

  if (engine === 'whisper') {
    const openaiKey = (options?.openaiApiKey ?? apiKey ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '').trim();
    return new WhisperTranscriber(openaiKey);
  }

  // Precedence: 1. Groq Cloud Whisper (ultra-low latency & cost)
  const groqKey = (options?.groqApiKey ?? process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '').trim();
  if (groqKey.length > 0) {
    return new GroqTranscriber(groqKey);
  }

  // Precedence: 2. OpenAI Whisper
  const openaiKey = (apiKey ?? options?.openaiApiKey ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '').trim();
  if (openaiKey.length > 0) {
    return new WhisperTranscriber(openaiKey);
  }

  console.info('[SpeechTranscriber] No OpenAI API key configured (or Groq API key). Using on-device NativeSpeechTranscriber for free offline practice.');
  return new NativeSpeechTranscriber({
    fallbackToPrompt: options?.fallbackToPrompt ?? false,
  });
}
