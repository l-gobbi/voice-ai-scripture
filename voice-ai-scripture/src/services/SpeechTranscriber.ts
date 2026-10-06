export * from './SpeechTranscriberTypes';
import {
  TranscriptionErrorCode,
  TranscriptionError,
  TranscriptionLanguage,
  TranscriptionOptions,
  TranscriptionResult,
  SpeechTranscriber,
} from './SpeechTranscriberTypes';

import { Platform } from 'react-native';

/**
 * Builds multipart/form-data for transcription requests across Web and Native platforms.
 * - On Web (or blob: / data: URIs): reads the audio Blob directly via fetch(audioUri)
 * - On Native (Android / iOS): normalizes the file URI scheme and supplies { uri, name, type }
 */
export async function buildAudioFormData(
  audioUri: string,
  model: string,
  options?: TranscriptionOptions
): Promise<FormData> {
  const formData = new FormData();

  const rawFilename = audioUri.split('/').pop()?.split('?')[0] || 'recording.m4a';
  const hasExt = rawFilename.includes('.');
  const filename = hasExt ? rawFilename : `${rawFilename}.m4a`;

  const lowerName = filename.toLowerCase();
  const fileType = lowerName.endsWith('.mp3')
    ? 'audio/mpeg'
    : lowerName.endsWith('.wav')
    ? 'audio/wav'
    : lowerName.endsWith('.webm')
    ? 'audio/webm'
    : lowerName.endsWith('.ogg')
    ? 'audio/ogg'
    : 'audio/m4a';

  let normalizedUri = audioUri;
  if (audioUri.startsWith('file:/') && !audioUri.startsWith('file:///')) {
    normalizedUri = `file:///${audioUri.replace(/^file:\/+/, '')}`;
  } else if (audioUri.startsWith('/')) {
    normalizedUri = `file://${audioUri}`;
  }

  try {
    const audioResponse = await fetch(normalizedUri);
    let blob: Blob;

    if (typeof audioResponse?.blob === 'function') {
      blob = await audioResponse.blob();
    } else if (typeof audioResponse?.arrayBuffer === 'function') {
      const buffer = await audioResponse.arrayBuffer();
      blob = new Blob([buffer], { type: fileType });
    } else if (audioResponse?.status === 404) {
      const errText = typeof audioResponse.text === 'function' ? await audioResponse.text().catch(() => '') : '';
      throw new TranscriptionError(
        'network_error',
        `Failed to read local audio recording: file not found (404) ${errText}`
      );
    } else {
      blob = new Blob(['audio'], { type: fileType });
    }

    if (typeof blob?.size === 'number' && blob.size === 0) {
      throw new TranscriptionError(
        'unintelligible',
        'Audio recording is empty (0 bytes). Please ensure microphone permission is granted and try speaking again.'
      );
    }

    // Attach filename and MIME type so Expo's getFormDataPartHeaders adds
    // `Content-Disposition: form-data; name="file"; filename="<filename>"` and `Content-Type: <fileType>`
    try {
      Object.defineProperty(blob, 'name', {
        value: filename,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(blob, 'type', {
        value: fileType,
        writable: true,
        configurable: true,
      });
    } catch {}

    formData.append('file', blob, filename);
  } catch (blobErr: any) {
    if (blobErr instanceof TranscriptionError) {
      throw blobErr;
    }
    console.error('[SpeechTranscriber] Failed to resolve audio blob:', normalizedUri, blobErr);
    throw new TranscriptionError(
      'network_error',
      `Failed to resolve audio recording: ${blobErr?.message || 'blob resolution failed'}`,
      blobErr
    );
  }

  formData.append('model', model);
  formData.append('language', options?.language ?? 'en');

  if (options?.prompt) {
    formData.append('prompt', options.prompt);
  }

  return formData;
}

async function uploadAudioFileNative(
  endpointUrl: string,
  audioUri: string,
  apiKey: string,
  model: string,
  options?: TranscriptionOptions
): Promise<TranscriptionResult | null> {
  if (
    Platform.OS === 'web' ||
    !audioUri ||
    audioUri.startsWith('blob:') ||
    audioUri.startsWith('data:') ||
    audioUri.startsWith('http:') ||
    audioUri.startsWith('https:')
  ) {
    return null;
  }

  try {
    const { uploadAsync, FileSystemUploadType } = require('expo-file-system/legacy');
    if (typeof uploadAsync !== 'function' || !FileSystemUploadType) {
      return null;
    }

    let normalizedUri = audioUri;
    if (audioUri.startsWith('file:/') && !audioUri.startsWith('file:///')) {
      normalizedUri = `file:///${audioUri.replace(/^file:\/+/, '')}`;
    } else if (audioUri.startsWith('/')) {
      normalizedUri = `file://${audioUri}`;
    }

    const parameters: Record<string, string> = {
      model,
      language: options?.language ?? 'en',
      temperature: '0',
    };
    if (options?.prompt) {
      parameters.prompt = options.prompt;
    }

    console.log(`[SpeechTranscriber] Using native FileSystem.uploadAsync for: ${normalizedUri} (model: ${model})`);

    const result = await uploadAsync(endpointUrl, normalizedUri, {
      fieldName: 'file',
      mimeType: 'audio/m4a',
      uploadType: FileSystemUploadType.MULTIPART,
      httpMethod: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      parameters,
    });

    const status = result.status;
    if (status < 200 || status >= 300) {
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
      throw new TranscriptionError(code, `Audio transcription failed (${status}): ${result.body}`);
    }

    const data = JSON.parse(result.body);
    return {
      text: data.text || '',
    };
  } catch (err: any) {
    if (err instanceof TranscriptionError) {
      throw err;
    }
    return null;
  }
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

    const nativeResult = await uploadAudioFileNative(
      'https://api.openai.com/v1/audio/transcriptions',
      audioUri,
      this.apiKey,
      'whisper-1',
      options
    );
    if (nativeResult) {
      return nativeResult;
    }

    const formData = await buildAudioFormData(audioUri, 'whisper-1', options);

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
      console.error('[SpeechTranscriber] Whisper fetch network error:', networkErr);
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

    const nativeResult = await uploadAudioFileNative(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      audioUri,
      this.apiKey,
      this.model,
      options
    );
    if (nativeResult) {
      return nativeResult;
    }

    const formData = await buildAudioFormData(audioUri, this.model, options);

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
      console.error('[SpeechTranscriber] Groq fetch network error:', networkErr);
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

export interface DefaultTranscriberOptions {
  engine?: 'auto' | 'groq' | 'whisper' | 'simulated';
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

  if (options?.fallbackToPrompt) {
    return new SimulatedTranscriber();
  }

  console.info('[SpeechTranscriber] No OpenAI API key configured (or Groq API key). Speech recognition is not available for file transcription.');
  return new SimulatedTranscriber({
    handler: async () => {
      throw new TranscriptionError(
        'unavailable',
        'Speech recognition is not available on this device without a configured cloud API key. For on-device offline practice, use VoiceInput with NativeStreamVoiceAdapter.'
      );
    },
  });
}
