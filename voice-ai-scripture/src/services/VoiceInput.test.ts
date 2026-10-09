import {
  VoiceInput,
  SimulatedVoiceAdapter,
  CloudAudioVoiceAdapter,
  NativeStreamVoiceAdapter,
  createDefaultVoiceInput,
  AudioDriver,
  NativeAudioDriver,
} from './VoiceInput';
import { SpeechTranscriber, TranscriptionError } from './SpeechTranscriber';

const mockSetAudioMode = jest.fn().mockResolvedValue(undefined);
const mockPrepare = jest.fn().mockResolvedValue(undefined);
const mockRecord = jest.fn();
const mockAudioRecorder = jest.fn().mockImplementation(() => ({
  prepareToRecordAsync: mockPrepare,
  record: mockRecord,
  getStatus: jest.fn().mockReturnValue({ isRecording: true, metering: -20 }),
  stop: jest.fn().mockResolvedValue({ url: 'file:///mock.m4a' }),
}));

jest.mock('expo-audio', () => ({
  AudioModule: {
    setAudioModeAsync: (...args: any[]) => mockSetAudioMode(...args),
    AudioRecorder: function (...args: any[]) {
      return mockAudioRecorder(...args);
    },
    requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  },
  RecordingPresets: {
    HIGH_QUALITY: { extension: '.m4a', sampleRate: 44100 },
  },
}));

describe('VoiceInput Seam (Ticket 45)', () => {
  describe('Slice 1: SimulatedVoiceAdapter', () => {
    it('returns defaultTranscript when configured', async () => {
      const adapter: VoiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: 'In the beginning God created the heavens and the earth',
      });

      await adapter.start();
      const res = await adapter.stop();
      expect(res.transcript).toBe('In the beginning God created the heavens and the earth');
    });

    it('prioritizes simulatedText from start options over prompt and default', async () => {
      const adapter: VoiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: 'Default text',
      });

      await adapter.start({
        prompt: 'John 3:16',
        simulatedText: 'For God so loved the world',
      });
      const res = await adapter.stop();
      expect(res.transcript).toBe('For God so loved the world');
    });

    it('falls back to prompt when simulatedText is undefined', async () => {
      const adapter: VoiceInput = new SimulatedVoiceAdapter();
      await adapter.start({ prompt: 'The Lord is my shepherd' });
      const res = await adapter.stop();
      expect(res.transcript).toBe('The Lord is my shepherd');
    });

    it('calls custom handler with provided options', async () => {
      const handler = jest.fn().mockResolvedValue('Custom handler transcript');
      const adapter: VoiceInput = new SimulatedVoiceAdapter({ handler });

      await adapter.start({ prompt: 'Romans 8:28', language: 'pt-BR' });
      const res = await adapter.stop();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'Romans 8:28', language: 'pt-BR' })
      );
      expect(res.transcript).toBe('Custom handler transcript');
    });

    it('emits simulated meter events when configured with intervals', async () => {
      jest.useFakeTimers();
      const meterLevels: number[] = [];
      const adapter: VoiceInput = new SimulatedVoiceAdapter({
        meterIntervalMs: 50,
        meterLevels: [0.1, 0.4, 0.8],
      });

      await adapter.start({
        onMeter: (level) => meterLevels.push(level),
      });

      jest.advanceTimersByTime(150);
      expect(meterLevels).toEqual([0.1, 0.4, 0.8]);

      await adapter.stop();
      jest.useRealTimers();
    });

    it('cleans up meter timer on cancel', async () => {
      jest.useFakeTimers();
      const meterLevels: number[] = [];
      const adapter: VoiceInput = new SimulatedVoiceAdapter({
        meterIntervalMs: 50,
        meterLevels: [0.1, 0.4],
      });

      await adapter.start({
        onMeter: (level) => meterLevels.push(level),
      });

      jest.advanceTimersByTime(50);
      expect(meterLevels.length).toBe(1);

      await adapter.cancel();
      jest.advanceTimersByTime(100);
      expect(meterLevels.length).toBe(1); // No further emissions
      jest.useRealTimers();
    });
  });

  describe('Slice 2: CloudAudioVoiceAdapter (Auto-Purging Transient Audio)', () => {
    let mockDriver: AudioDriver;
    let mockTranscriber: SpeechTranscriber;

    beforeEach(() => {
      mockDriver = {
        requestPermissions: jest.fn().mockResolvedValue(true),
        startRecording: jest.fn().mockResolvedValue(undefined),
        stopRecording: jest.fn().mockResolvedValue('file:///cache/transient-123.m4a'),
        deleteAudioFile: jest.fn().mockResolvedValue(true),
      };
      mockTranscriber = {
        transcribe: jest.fn().mockResolvedValue({ text: 'O Senhor é o meu pastor' }),
      };
    });

    it('starts recorder with onMeter callback and language option', async () => {
      const adapter = new CloudAudioVoiceAdapter({
        driver: mockDriver,
        transcriber: mockTranscriber,
      });

      const onMeter = jest.fn();
      await adapter.start({ language: 'pt-BR', onMeter });

      expect(mockDriver.startRecording).toHaveBeenCalledWith(onMeter, { language: 'pt-BR' });
    });

    it('transcribes transient audio and atomically purges file upon completion', async () => {
      const adapter = new CloudAudioVoiceAdapter({
        driver: mockDriver,
        transcriber: mockTranscriber,
      });

      await adapter.start({ language: 'pt-BR', prompt: 'Salmos 23:1' });
      const result = await adapter.stop();

      expect(mockDriver.stopRecording).toHaveBeenCalled();
      expect(mockTranscriber.transcribe).toHaveBeenCalledWith(
        'file:///cache/transient-123.m4a',
        expect.objectContaining({
          language: 'pt-BR',
          prompt: 'Salmos 23:1',
        })
      );
      expect(mockDriver.deleteAudioFile).toHaveBeenCalledWith('file:///cache/transient-123.m4a');
      expect(result.transcript).toBe('O Senhor é o meu pastor');
    });

    it('purges transient audio file even when transcriber throws an error', async () => {
      const failingTranscriber: SpeechTranscriber = {
        transcribe: jest.fn().mockRejectedValue(new TranscriptionError('network_error', 'Connection failed')),
      };

      const adapter = new CloudAudioVoiceAdapter({
        driver: mockDriver,
        transcriber: failingTranscriber,
      });

      await adapter.start();
      await expect(adapter.stop()).rejects.toThrow(TranscriptionError);

      expect(mockDriver.deleteAudioFile).toHaveBeenCalledWith('file:///cache/transient-123.m4a');
    });

    it('throws unintelligible error if stopRecording returns null', async () => {
      (mockDriver.stopRecording as jest.Mock).mockResolvedValueOnce(null);

      const adapter = new CloudAudioVoiceAdapter({
        driver: mockDriver,
        transcriber: mockTranscriber,
      });

      await adapter.start();
      await expect(adapter.stop()).rejects.toThrow('No audio recorded');
    });

    it('stops recorder and purges transient file on cancel', async () => {
      const adapter = new CloudAudioVoiceAdapter({
        driver: mockDriver,
        transcriber: mockTranscriber,
      });

      await adapter.start();
      await adapter.cancel();

      expect(mockDriver.stopRecording).toHaveBeenCalled();
      expect(mockDriver.deleteAudioFile).toHaveBeenCalledWith('file:///cache/transient-123.m4a');
      expect(mockTranscriber.transcribe).not.toHaveBeenCalled();
    });
  });

  describe('Slice 3: NativeStreamVoiceAdapter (Zero-Disk Dictation)', () => {
    let mockSpeechModule: any;
    let resultCallback: ((event: any) => void) | null = null;
    let errorCallback: ((event: any) => void) | null = null;

    beforeEach(() => {
      resultCallback = null;
      errorCallback = null;

      mockSpeechModule = {
        isRecognitionAvailable: jest.fn().mockReturnValue(true),
        requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
        start: jest.fn(),
        stop: jest.fn(),
        addListener: jest.fn((event: string, cb: any) => {
          if (event === 'result') resultCallback = cb;
          if (event === 'error') errorCallback = cb;
          return { remove: jest.fn() };
        }),
      };
    });

    it('starts native speech recognition with normalized language', async () => {
      const adapter = new NativeStreamVoiceAdapter(mockSpeechModule);
      await adapter.start({ language: 'pt' });

      expect(mockSpeechModule.start).toHaveBeenCalledWith(
        expect.objectContaining({
          lang: 'pt-BR',
          interimResults: true,
          continuous: true,
        })
      );
    });

    it('accumulates streamed transcription in memory and returns upon stop without file I/O', async () => {
      const adapter = new NativeStreamVoiceAdapter(mockSpeechModule);
      await adapter.start();

      expect(resultCallback).toBeDefined();
      resultCallback!({
        results: [{ transcript: 'O Senhor é meu pastor' }],
      });

      const res = await adapter.stop();
      expect(res.transcript).toBe('O Senhor é meu pastor');
      expect(mockSpeechModule.stop).toHaveBeenCalled();
    });

    it('clears live transcript and stops recognition on cancel', async () => {
      const adapter = new NativeStreamVoiceAdapter(mockSpeechModule);
      await adapter.start();

      resultCallback!({
        results: [{ transcript: 'Partial phrase' }],
      });

      await adapter.cancel();
      expect(mockSpeechModule.stop).toHaveBeenCalled();

      // If stopped after cancel, transcript should be empty
      const res = await adapter.stop();
      expect(res.transcript).toBe('');
    });
  });

  /**
   * Ticket 74, against a fake speech module that emits events shaped as the installed
   * `expo-speech-recognition` types: `result` is `{ isFinal, results }` where `results` holds
   * alternatives (best first), and `error` is `{ error, message, code? }`.
   */
  describe('Ticket 74: NativeStreamVoiceAdapter keeps every segment and records recognizer errors', () => {
    let listeners: Record<string, (event: any) => void>;
    let speechModule: any;

    const result = (transcript: string, isFinal: boolean) =>
      listeners.result({ isFinal, results: [{ transcript, confidence: 0.9, segments: [] }] });
    const error = (code: string) => listeners.error({ error: code, message: `native ${code}` });

    beforeEach(() => {
      listeners = {};
      speechModule = {
        requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
        start: jest.fn(),
        stop: jest.fn(),
        addListener: jest.fn((event: string, cb: (event: any) => void) => {
          listeners[event] = cb;
          return { remove: jest.fn() };
        }),
      };
    });

    async function started() {
      const adapter = new NativeStreamVoiceAdapter(speechModule);
      await adapter.start({ language: 'pt' });
      return adapter;
    }

    async function stopError(adapter: NativeStreamVoiceAdapter): Promise<TranscriptionError> {
      try {
        const res = await adapter.stop();
        throw new Error(`stop() returned "${res.transcript}" instead of throwing`);
      } catch (err) {
        expect(err).toBeInstanceOf(TranscriptionError);
        return err as TranscriptionError;
      }
    }

    it('keeps the final segments before each pause and appends the current partial (Android segmented session)', async () => {
      const adapter = await started();

      result('O Senhor', false);
      result('O Senhor é o meu pastor', true);
      result('nada', false);
      result('nada me', false);
      result('nada me faltará', true);
      result('Deitar-me', false);
      result('Deitar-me faz em verdes pastos', false);

      expect((await adapter.stop()).transcript).toBe(
        'O Senhor é o meu pastor nada me faltará Deitar-me faz em verdes pastos'
      );
    });

    it('replaces partials instead of piling them up, so one growing utterance is not repeated (iOS)', async () => {
      const adapter = await started();

      result('The Lord', false);
      result('The Lord is my', false);
      result('The Lord is my shepherd', false);
      result('The Lord is my shepherd I shall not want', true);

      expect((await adapter.stop()).transcript).toBe('The Lord is my shepherd I shall not want');
    });

    it('joins segments the recognizer starts with a space (iOS 18 continuation) with single spaces', async () => {
      const adapter = await started();

      result('The Lord is my shepherd', true);
      result(' I shall', false);
      result(' I shall not want', true);

      expect((await adapter.stop()).transcript).toBe('The Lord is my shepherd I shall not want');
    });

    it('returns the transcript when an error follows real speech', async () => {
      const adapter = await started();

      result('O Senhor é o meu pastor', true);
      result('nada me', false);
      error('no-speech');
      error('network');

      expect((await adapter.stop()).transcript).toBe('O Senhor é o meu pastor nada me');
    });

    it.each([
      ['no-speech', 'unintelligible'],
      // The Web Speech API's "no-match": speech was heard but nothing was recognized.
      ['no-match', 'unintelligible'],
      ['speech-timeout', 'unintelligible'],
      ['network', 'network_error'],
      ['language-not-supported', 'unavailable'],
      ['audio-capture', 'unavailable'],
      ['service-not-allowed', 'unavailable'],
      ['not-allowed', 'unavailable'],
      ['busy', 'unknown'],
      ['client', 'unknown'],
      ['interrupted', 'unknown'],
      ['aborted', 'unknown'],
      ['unknown', 'unknown'],
      // Emitted by the Android module although the TypeScript union does not list it.
      ['too-many-requests', 'unknown'],
    ])('an error "%s" with no speech makes stop() throw a Transcription Error "%s"', async (nativeCode, code) => {
      const adapter = await started();

      error(nativeCode);

      const thrown = await stopError(adapter);
      expect(thrown.code).toBe(code);
      expect(thrown.message).toContain(nativeCode);
    });

    it('reports the first error of the attempt, which ended the recognition', async () => {
      const adapter = await started();

      error('network');
      error('client');

      expect((await stopError(adapter)).code).toBe('network_error');
    });

    it('returns an empty transcript when nothing was heard and no error was reported', async () => {
      const adapter = await started();

      expect((await adapter.stop()).transcript).toBe('');
    });

    it('starts each attempt with no segments and no error from the previous one', async () => {
      const adapter = await started();
      result('O Senhor é o meu pastor', true);
      error('network');
      await adapter.stop();

      await adapter.start({ language: 'pt' });
      error('no-speech');
      expect((await stopError(adapter)).code).toBe('unintelligible');

      await adapter.start({ language: 'pt' });
      result('nada me faltará', true);
      expect((await adapter.stop()).transcript).toBe('nada me faltará');
    });

    it('cancel discards the segments and the error', async () => {
      const adapter = await started();
      result('O Senhor', true);
      error('network');

      await adapter.cancel();

      expect((await adapter.stop()).transcript).toBe('');
    });

    it('in the browser, keeps concatenating every Web Speech result and records its errors too', async () => {
      const recognitions: any[] = [];
      class FakeWebSpeechRecognition {
        continuous = false;
        interimResults = false;
        lang = '';
        onresult: ((event: any) => void) | null = null;
        onerror: ((event: any) => void) | null = null;
        start = jest.fn();
        stop = jest.fn();
        constructor() {
          recognitions.push(this);
        }
      }
      const browser = window as any;
      browser.SpeechRecognition = FakeWebSpeechRecognition;
      try {
        const spoken = new NativeStreamVoiceAdapter(null);
        await spoken.start({ language: 'en' });
        recognitions[0].onresult({
          results: [[{ transcript: 'The Lord is my shepherd' }], [{ transcript: 'I shall not want' }]],
        });
        expect((await spoken.stop()).transcript).toBe('The Lord is my shepherd I shall not want');

        const silent = new NativeStreamVoiceAdapter(null);
        await silent.start({ language: 'en' });
        recognitions[1].onerror({ error: 'not-allowed', message: 'Permission denied' });
        expect((await stopError(silent)).code).toBe('unavailable');
      } finally {
        delete browser.SpeechRecognition;
      }
    });
  });

  describe('Slice 4: Factory createDefaultVoiceInput', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('creates SimulatedVoiceAdapter when engine is simulated', () => {
      const voice = createDefaultVoiceInput({
        engine: 'simulated',
        simulatedTranscript: 'Test verse',
      });
      expect(voice).toBeInstanceOf(SimulatedVoiceAdapter);
    });

    it('creates NativeStreamVoiceAdapter when engine is native', () => {
      const voice = createDefaultVoiceInput({ engine: 'native' });
      expect(voice).toBeInstanceOf(NativeStreamVoiceAdapter);
    });

    it('creates CloudAudioVoiceAdapter when groqApiKey is supplied', () => {
      const voice = createDefaultVoiceInput({ groqApiKey: 'gsk_test123' });
      expect(voice).toBeInstanceOf(CloudAudioVoiceAdapter);
    });

    it('creates CloudAudioVoiceAdapter when openaiApiKey is supplied', () => {
      delete process.env.EXPO_PUBLIC_GROQ_API_KEY;
      const voice = createDefaultVoiceInput({ openaiApiKey: 'sk_test123' });
      expect(voice).toBeInstanceOf(CloudAudioVoiceAdapter);
    });

    it('falls back to NativeStreamVoiceAdapter when no API keys are provided', () => {
      delete process.env.EXPO_PUBLIC_GROQ_API_KEY;
      delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;

      const voice = createDefaultVoiceInput();
      expect(voice).toBeInstanceOf(NativeStreamVoiceAdapter);
    });
  });

  describe('Ticket 68: Warm Standby Audio Driver & Pre-Warming Seam', () => {
    it('CloudAudioVoiceAdapter delegates warmUp to driver', async () => {
      const mockDriver: AudioDriver = {
        requestPermissions: jest.fn().mockResolvedValue(true),
        warmUp: jest.fn().mockResolvedValue(undefined),
        startRecording: jest.fn().mockResolvedValue(undefined),
        stopRecording: jest.fn().mockResolvedValue('file:///test.m4a'),
        deleteAudioFile: jest.fn().mockResolvedValue(true),
      };

      const adapter = new CloudAudioVoiceAdapter({ driver: mockDriver });
      await adapter.warmUp?.();
      expect(mockDriver.warmUp).toHaveBeenCalledTimes(1);
    });

    it('SimulatedVoiceAdapter provides a no-op warmUp resolving cleanly', async () => {
      const adapter = new SimulatedVoiceAdapter();
      await expect(adapter.warmUp?.()).resolves.toBeUndefined();
    });

    it('NativeAudioDriver warmUp prepares the recorder and startRecording records immediately', async () => {
      mockSetAudioMode.mockClear();
      mockPrepare.mockClear();
      mockRecord.mockClear();

      const driver = new NativeAudioDriver();

      // Warm up
      await driver.warmUp();
      expect(mockSetAudioMode).toHaveBeenCalledWith(
        expect.objectContaining({ allowsRecording: true })
      );
      expect(mockPrepare).toHaveBeenCalledTimes(1);
      expect(mockRecord).not.toHaveBeenCalled();

      // Now start recording immediately
      await driver.startRecording();
      expect(mockRecord).toHaveBeenCalledTimes(1);
      // setAudioModeAsync should NOT have been called a second time
      expect(mockSetAudioMode).toHaveBeenCalledTimes(1);
      expect(mockPrepare).toHaveBeenCalledTimes(1);

      // Clean up / stop
      await driver.stopRecording();
    });

    it('NativeAudioDriver falls back to warming up if startRecording is called without prior warmUp', async () => {
      mockSetAudioMode.mockClear();
      mockPrepare.mockClear();
      mockRecord.mockClear();

      const driver = new NativeAudioDriver();

      // Call startRecording directly without warmUp
      await driver.startRecording();
      expect(mockSetAudioMode).toHaveBeenCalledTimes(1);
      expect(mockPrepare).toHaveBeenCalledTimes(1);
      expect(mockRecord).toHaveBeenCalledTimes(1);

      await driver.stopRecording();
    });
  });
});
