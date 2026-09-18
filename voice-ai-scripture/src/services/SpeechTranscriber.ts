export type TranscriptionErrorCode =
  | 'network_error'
  | 'unauthorized'
  | 'rate_limited'
  | 'unintelligible'
  | 'unknown';

export class TranscriptionError extends Error {
  constructor(
    public readonly code: TranscriptionErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }

  getUserFacingMessage(): string {
    switch (this.code) {
      case 'network_error':
        return 'Network connection failed. Please check your internet connection.';
      case 'rate_limited':
        return 'Transcription service is temporarily busy. Please try again shortly.';
      case 'unauthorized':
        return 'Transcription authentication failed. Please check your API key.';
      case 'unintelligible':
        return 'Could not transcribe audio. Please speak clearly and try again.';
      case 'unknown':
      default:
        return 'An unexpected transcription error occurred.';
    }
  }
}

export interface TranscriptionOptions {
  prompt?: string;
  simulatedText?: string;
}

export interface TranscriptionResult {
  text: string;
}

export interface SpeechTranscriber {
  transcribe(audioUri: string, options?: TranscriptionOptions): Promise<TranscriptionResult>;
}

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
    formData.append('language', 'en');

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

    if (options?.simulatedText !== undefined) {
      return { text: options.simulatedText };
    }

    if (options?.prompt) {
      return { text: options.prompt };
    }

    return { text: this.defaultText };
  }
}

export function createDefaultTranscriber(apiKey?: string): SpeechTranscriber {
  const key = (apiKey ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '').trim();
  if (key.length > 0) {
    return new WhisperTranscriber(key);
  }

  console.info('[SpeechTranscriber] No OpenAI API key configured. Using SimulatedTranscriber for offline practice.');
  return new SimulatedTranscriber();
}
