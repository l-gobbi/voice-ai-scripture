import type { Language } from '../utils/languageNormalizer';

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

  /**
   * What went wrong, said calmly in the verse's language (`language === 'pt'` for Portuguese
   * verses, English otherwise).
   */
  getUserFacingMessage(language: Language = 'en'): string {
    return USER_FACING_MESSAGES[language === 'pt' ? 'pt' : 'en'][this.code] ?? USER_FACING_MESSAGES.en.unknown;
  }
}

const USER_FACING_MESSAGES: Record<Language, Record<TranscriptionErrorCode, string>> = {
  en: {
    network_error: 'Network connection failed. Please check your internet connection.',
    rate_limited: 'Transcription service is temporarily busy. Please try again shortly.',
    unauthorized: 'Transcription authentication failed. Please check your API key.',
    unavailable:
      'Speech recognition is not available on this device or browser. Please use a supported browser (Chrome, Edge, Safari) or configure an OpenAI API key in .env.',
    unintelligible: 'Could not transcribe audio. Please speak clearly and try again.',
    unknown: 'An unexpected transcription error occurred.',
  },
  pt: {
    network_error: 'Falha na conexão de rede. Verifique sua conexão com a internet.',
    rate_limited: 'O serviço de transcrição está ocupado no momento. Tente novamente em instantes.',
    unauthorized: 'Falha na autenticação da transcrição. Verifique sua chave de API.',
    unavailable:
      'O reconhecimento de voz não está disponível neste dispositivo ou navegador. Use um navegador compatível (Chrome, Edge, Safari) ou configure uma chave de API da OpenAI no .env.',
    unintelligible: 'Não foi possível entender o áudio. Fale com clareza e tente novamente.',
    unknown: 'Ocorreu um erro inesperado na transcrição.',
  },
};

export type TranscriptionLanguage = Language | string;

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
