export type TranscriptionErrorCode =
  | 'network_error'
  | 'unauthorized'
  | 'rate_limited'
  | 'unintelligible'
  | 'unavailable'
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
      case 'unavailable':
        return 'Speech recognition is not available on this device or browser. Please configure an OpenAI API key in .env or use a supported environment.';
      case 'unintelligible':
        return 'Could not transcribe audio. Please speak clearly and try again.';
      case 'unknown':
      default:
        return 'An unexpected transcription error occurred.';
    }
  }
}

export type TranscriptionLanguage = 'en' | 'pt' | string;

export interface TranscriptionOptions {
  prompt?: string;
  simulatedText?: string;
  language?: TranscriptionLanguage;
}

export interface TranscriptionResult {
  text: string;
}

export interface SpeechTranscriber {
  transcribe(audioUri: string, options?: TranscriptionOptions): Promise<TranscriptionResult>;
}
