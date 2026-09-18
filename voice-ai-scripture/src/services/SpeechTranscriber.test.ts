import {
  SpeechTranscriber,
  SimulatedTranscriber,
  WhisperTranscriber,
  TranscriptionError,
  createDefaultTranscriber,
} from './SpeechTranscriber';

describe('SpeechTranscriber Seam (Ticket 11)', () => {
  describe('Slice 1: SimulatedTranscriber & Fallback Default Factory', () => {
    it('echoes options.prompt by default when provided', async () => {
      const transcriber: SpeechTranscriber = new SimulatedTranscriber();
      const result = await transcriber.transcribe('file:///dummy/audio.m4a', {
        prompt: 'John 3:16: For God so loved the world...',
      });

      expect(result).toEqual({
        text: 'John 3:16: For God so loved the world...',
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

    it('createDefaultTranscriber returns a functional SimulatedTranscriber when no key is supplied or in environment', async () => {
      const previousKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;

      try {
        const transcriber = createDefaultTranscriber('');
        expect(transcriber).toBeInstanceOf(SimulatedTranscriber);

        const result = await transcriber.transcribe('file:///audio.m4a', {
          prompt: 'Proverbs 3:5',
        });
        expect(result.text).toBe('Proverbs 3:5');
      } finally {
        if (previousKey) {
          process.env.EXPO_PUBLIC_OPENAI_API_KEY = previousKey;
        }
      }
    });
  });

  describe('Slice 2: WhisperTranscriber & TranscriptionError Mapping', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('throws TranscriptionError with code unauthorized if instantiated without API key', async () => {
      const whisper = new WhisperTranscriber('');
      await expect(whisper.transcribe('file:///dummy.m4a')).rejects.toMatchObject({
        name: 'TranscriptionError',
        code: 'unauthorized',
      });
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

      const body = mockFetch.mock.calls[0][1].body;
      expect(body).toBeDefined();
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
  });
});
