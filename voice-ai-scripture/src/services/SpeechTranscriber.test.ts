import {
  SpeechTranscriber,
  SimulatedTranscriber,
  WhisperTranscriber,
  TranscriptionError,
  createDefaultTranscriber,
} from './SpeechTranscriber';
import { NativeSpeechTranscriber } from './NativeSpeechTranscriber';

describe('SpeechTranscriber Seam (Ticket 11)', () => {
  describe('Slice 1: SimulatedTranscriber & Fallback Default Factory', () => {
    it('returns options.simulatedText when provided to decouple caller simulation from prompt conditioning', async () => {
      const transcriber: SpeechTranscriber = new SimulatedTranscriber();
      const result = await transcriber.transcribe('file:///dummy/audio.m4a', {
        prompt: 'John 3:16: For God so loved the world...',
        simulatedText: 'For God so loved the world...',
      });

      expect(result).toEqual({
        text: 'For God so loved the world...',
      });
    });

    it('falls back to options.prompt when simulatedText is not specified', async () => {
      const transcriber: SpeechTranscriber = new SimulatedTranscriber();
      const result = await transcriber.transcribe('file:///dummy/audio.m4a', {
        prompt: 'For God so loved the world',
      });

      expect(result).toEqual({
        text: 'For God so loved the world',
      });
    });

    it('returns defaultText when no prompt is provided', async () => {
      const transcriber = new SimulatedTranscriber({
        defaultText: 'Default simulated scripture',
      });
      const result = await transcriber.transcribe('file:///dummy/audio.m4a');

      expect(result).toEqual({
        text: 'Default simulated scripture',
      });
    });

    it('executes custom simulation handler when supplied in config', async () => {
      const customHandler = jest.fn().mockResolvedValue('Custom handled recitation');
      const transcriber = new SimulatedTranscriber({ handler: customHandler });

      const result = await transcriber.transcribe('file:///audio/path.m4a', {
        prompt: 'Psalm 23: The Lord is my shepherd',
      });

      expect(customHandler).toHaveBeenCalledWith('file:///audio/path.m4a', {
        prompt: 'Psalm 23: The Lord is my shepherd',
      });
      expect(result).toEqual({ text: 'Custom handled recitation' });
    });

    it('createDefaultTranscriber returns a NativeSpeechTranscriber when no API key is supplied', async () => {
      const previousKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;

      try {
        const transcriber = createDefaultTranscriber('');
        expect(transcriber).toBeInstanceOf(NativeSpeechTranscriber);

        await expect(
          transcriber.transcribe('file:///audio.m4a', {
            prompt: 'Proverbs 3:5',
          })
        ).rejects.toThrow(TranscriptionError);
      } finally {
        if (previousKey) {
          process.env.EXPO_PUBLIC_OPENAI_API_KEY = previousKey;
        }
      }
    });

    it('createDefaultTranscriber allows explicit engine selection', () => {
      const simulated = createDefaultTranscriber('', { engine: 'simulated' });
      expect(simulated).toBeInstanceOf(SimulatedTranscriber);

      const native = createDefaultTranscriber('', { engine: 'native' });
      expect(native).toBeInstanceOf(NativeSpeechTranscriber);
    });
  });

  describe('Slice 2: WhisperTranscriber & TranscriptionError Mapping', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('throws TranscriptionError with code unauthorized if instantiated with empty API key', async () => {
      const previousKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-env-should-not-be-read-by-whisper-transcriber';

      try {
        const whisper = new WhisperTranscriber('');
        await expect(whisper.transcribe('file:///dummy.m4a')).rejects.toMatchObject({
          name: 'TranscriptionError',
          code: 'unauthorized',
        });
      } finally {
        if (previousKey) {
          process.env.EXPO_PUBLIC_OPENAI_API_KEY = previousKey;
        } else {
          delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
        }
      }
    });

    it('sends audio file, model, language, and optional prompt to OpenAI Whisper API', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'For God so loved the world' }),
      });
      global.fetch = mockFetch as any;

      const whisper = new WhisperTranscriber('sk-test-key');
      const result = await whisper.transcribe('file:///recording.m4a', {
        prompt: 'John 3:16: For God so loved...',
      });

      expect(result).toEqual({ text: 'For God so loved the world' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/transcriptions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer sk-test-key',
          },
        })
      );

      const postCall = mockFetch.mock.calls.find((call) => call[0].includes('openai.com'));
      const body = postCall?.[1]?.body;
      expect(body).toBeDefined();
    });

    it('forwards custom language parameter into FormData or defaults to en', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'Texto transcrito' }),
      });
      global.fetch = mockFetch as any;

      const appendSpy = jest.spyOn(FormData.prototype, 'append');

      const whisper = new WhisperTranscriber('sk-test-key');
      await whisper.transcribe('file:///recording.m4a', {
        language: 'pt',
      });

      expect(appendSpy).toHaveBeenCalledWith('language', 'pt');

      // Now without language specified
      await whisper.transcribe('file:///recording.m4a');
      expect(appendSpy).toHaveBeenCalledWith('language', 'en');

      appendSpy.mockRestore();
    });

    it('maps 401 response to TranscriptionError with unauthorized code', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      }) as any;

      const whisper = new WhisperTranscriber('sk-bad-key');
      await expect(whisper.transcribe('file:///audio.m4a')).rejects.toMatchObject({
        name: 'TranscriptionError',
        code: 'unauthorized',
      });
    });

    it('maps 429 response to TranscriptionError with rate_limited code', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      }) as any;

      const whisper = new WhisperTranscriber('sk-test-key');
      await expect(whisper.transcribe('file:///audio.m4a')).rejects.toMatchObject({
        name: 'TranscriptionError',
        code: 'rate_limited',
      });
    });

    it('maps 400 or 422 response to TranscriptionError with unintelligible code', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Audio file unparseable',
      }) as any;

      const whisper = new WhisperTranscriber('sk-test-key');
      await expect(whisper.transcribe('file:///corrupt.m4a')).rejects.toMatchObject({
        name: 'TranscriptionError',
        code: 'unintelligible',
      });
    });

    it('maps network rejection or 500 response to TranscriptionError with network_error code', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed')) as any;

      const whisper = new WhisperTranscriber('sk-test-key');
      await expect(whisper.transcribe('file:///audio.m4a')).rejects.toMatchObject({
        name: 'TranscriptionError',
        code: 'network_error',
      });
    });
  });

  describe('Slice 3: Factory Key Resolution & Delegation', () => {
    it('returns WhisperTranscriber when API key is provided directly', () => {
      const transcriber = createDefaultTranscriber('sk-explicit-key');
      expect(transcriber).toBeInstanceOf(WhisperTranscriber);
    });

    it('returns WhisperTranscriber when API key is set in process.env', () => {
      const previousKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-env-key';

      try {
        const transcriber = createDefaultTranscriber();
        expect(transcriber).toBeInstanceOf(WhisperTranscriber);
      } finally {
        if (previousKey) {
          process.env.EXPO_PUBLIC_OPENAI_API_KEY = previousKey;
        } else {
          delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
        }
      }
    });

    it('logs a development notice when falling back to SimulatedTranscriber', () => {
      const previousKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

      try {
        createDefaultTranscriber('');
        expect(infoSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SpeechTranscriber] No OpenAI API key configured')
        );
      } finally {
        infoSpy.mockRestore();
        if (previousKey) {
          process.env.EXPO_PUBLIC_OPENAI_API_KEY = previousKey;
        }
      }
    });
  });

  describe('Hardening: TranscriptionError Domain Method', () => {
    it('returns friendly user-facing messages directly from TranscriptionError', () => {
      expect(new TranscriptionError('network_error', 'raw err').getUserFacingMessage()).toBe(
        'Network connection failed. Please check your internet connection.'
      );
      expect(new TranscriptionError('rate_limited', 'raw err').getUserFacingMessage()).toBe(
        'Transcription service is temporarily busy. Please try again shortly.'
      );
      expect(new TranscriptionError('unauthorized', 'raw err').getUserFacingMessage()).toBe(
        'Transcription authentication failed. Please check your API key.'
      );
      expect(new TranscriptionError('unintelligible', 'raw err').getUserFacingMessage()).toBe(
        'Could not transcribe audio. Please speak clearly and try again.'
      );
      expect(new TranscriptionError('unknown', 'raw err').getUserFacingMessage()).toBe(
        'An unexpected transcription error occurred.'
      );
    });
  });

  describe('Ticket 41: Groq Cloud Whisper Transcriber', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('throws TranscriptionError unauthorized if instantiated with empty Groq key', async () => {
      const { GroqTranscriber } = require('./SpeechTranscriber');
      const groq = new GroqTranscriber('');
      await expect(groq.transcribe('file:///dummy.m4a')).rejects.toMatchObject({
        name: 'TranscriptionError',
        code: 'unauthorized',
      });
    });

    it('sends audio to Groq with whisper-large-v3-turbo, language, and scripture prompt', async () => {
      const { GroqTranscriber } = require('./SpeechTranscriber');
      let capturedUrl = '';
      let capturedHeaders: any = {};
      let capturedBody: any = null;

      global.fetch = jest.fn().mockImplementation(async (url, init) => {
        capturedUrl = url;
        capturedHeaders = init?.headers;
        capturedBody = init?.body;
        return {
          ok: true,
          json: async () => ({ text: 'O Senhor é o meu pastor; nada me faltará.' }),
        };
      });

      const groq = new GroqTranscriber('gsk-test-key-123');
      const result = await groq.transcribe('file:///recording.m4a', {
        language: 'pt',
        prompt: 'Salmos 23:1: O Senhor é o meu pastor; nada me faltará.',
      });

      expect(capturedUrl).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
      expect(capturedHeaders['Authorization']).toBe('Bearer gsk-test-key-123');
      expect(capturedBody).toBeInstanceOf(FormData);
      expect(result.text).toBe('O Senhor é o meu pastor; nada me faltará.');
    });

    it('maps Groq 429 rate limit to TranscriptionError rate_limited', async () => {
      const { GroqTranscriber } = require('./SpeechTranscriber');
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded on Groq LPU',
      });

      const groq = new GroqTranscriber('gsk-test-key');
      await expect(groq.transcribe('file:///audio.m4a')).rejects.toMatchObject({
        name: 'TranscriptionError',
        code: 'rate_limited',
      });
    });

    it('prioritizes EXPO_PUBLIC_GROQ_API_KEY in createDefaultTranscriber', () => {
      const prevGroq = process.env.EXPO_PUBLIC_GROQ_API_KEY;
      const prevOpenAI = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

      process.env.EXPO_PUBLIC_GROQ_API_KEY = 'gsk-active-key';
      process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-active-openai';

      try {
        const { GroqTranscriber } = require('./SpeechTranscriber');
        const transcriber = createDefaultTranscriber();
        expect(transcriber).toBeInstanceOf(GroqTranscriber);
      } finally {
        if (prevGroq) process.env.EXPO_PUBLIC_GROQ_API_KEY = prevGroq;
        else delete process.env.EXPO_PUBLIC_GROQ_API_KEY;

        if (prevOpenAI) process.env.EXPO_PUBLIC_OPENAI_API_KEY = prevOpenAI;
        else delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      }
    });

    it('buildAudioFormData resolves blob: URLs into actual Blobs on web', async () => {
      const { buildAudioFormData } = require('./SpeechTranscriber');
      const mockBlob = new Blob(['fake audio'], { type: 'audio/m4a' });
      global.fetch = jest.fn().mockResolvedValue({
        blob: async () => mockBlob,
      });

      const appendSpy = jest.spyOn(FormData.prototype, 'append');
      const formData = await buildAudioFormData('blob:http://localhost:8081/recording-123', 'whisper-large-v3-turbo', {
        language: 'pt',
        prompt: 'Salmos 23:1',
      });

      expect(global.fetch).toHaveBeenCalledWith('blob:http://localhost:8081/recording-123');
      expect(appendSpy).toHaveBeenCalledWith('file', mockBlob, 'recording-123.m4a');
      expect(appendSpy).toHaveBeenCalledWith('model', 'whisper-large-v3-turbo');
      expect(appendSpy).toHaveBeenCalledWith('language', 'pt');
      expect(appendSpy).toHaveBeenCalledWith('prompt', 'Salmos 23:1');
    });

    it('buildAudioFormData normalizes file URIs on native and ensures .m4a extension as a Blob', async () => {
      const { buildAudioFormData } = require('./SpeechTranscriber');
      const appendSpy = jest.spyOn(FormData.prototype, 'append');
      const mockBlob = new Blob(['mock audio'], { type: 'audio/m4a' });
      global.fetch = jest.fn().mockResolvedValue({
        blob: async () => mockBlob,
      });

      await buildAudioFormData('file:/data/user/0/cache/recording-uuid', 'whisper-large-v3-turbo');

      expect(global.fetch).toHaveBeenCalledWith('file:///data/user/0/cache/recording-uuid');
      expect(appendSpy).toHaveBeenCalledWith('file', mockBlob, 'recording-uuid.m4a');
    });

    it('buildAudioFormData wraps blob fetch failure into TranscriptionError network_error', async () => {
      const { buildAudioFormData } = require('./SpeechTranscriber');
      global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch blob'));

      await expect(
        buildAudioFormData('blob:http://broken', 'whisper-large-v3-turbo')
      ).rejects.toMatchObject({
        name: 'TranscriptionError',
        code: 'network_error',
      });
    });
  });
});
