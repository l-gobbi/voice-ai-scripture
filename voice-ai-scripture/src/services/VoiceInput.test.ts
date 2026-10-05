import {
  VoiceInput,
  SimulatedVoiceAdapter,
  CloudAudioVoiceAdapter,
  NativeStreamVoiceAdapter,
  createDefaultVoiceInput,
} from './VoiceInput';
import { AudioDriver, AudioRecorderService } from './AudioRecorderService';
import { SpeechTranscriber, TranscriptionError } from './SpeechTranscriber';

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
    let mockRecorder: AudioRecorderService;
    let mockTranscriber: SpeechTranscriber;

    beforeEach(() => {
      mockDriver = {
        requestPermissions: jest.fn().mockResolvedValue(true),
        startRecording: jest.fn().mockResolvedValue(undefined),
        stopRecording: jest.fn().mockResolvedValue('file:///cache/transient-123.m4a'),
        deleteAudioFile: jest.fn().mockResolvedValue(true),
      };
      mockRecorder = new AudioRecorderService(mockDriver);
      mockTranscriber = {
        transcribe: jest.fn().mockResolvedValue({ text: 'O Senhor é o meu pastor' }),
      };
    });

    it('starts recorder with onMeter callback and language option', async () => {
      const adapter = new CloudAudioVoiceAdapter({
        recorder: mockRecorder,
        transcriber: mockTranscriber,
      });

      const onMeter = jest.fn();
      await adapter.start({ language: 'pt-BR', onMeter });

      expect(mockDriver.startRecording).toHaveBeenCalledWith(onMeter, { language: 'pt-BR' });
    });

    it('transcribes transient audio and atomically purges file upon completion', async () => {
      const adapter = new CloudAudioVoiceAdapter({
        recorder: mockRecorder,
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
        recorder: mockRecorder,
        transcriber: failingTranscriber,
      });

      await adapter.start();
      await expect(adapter.stop()).rejects.toThrow(TranscriptionError);

      expect(mockDriver.deleteAudioFile).toHaveBeenCalledWith('file:///cache/transient-123.m4a');
    });

    it('throws unintelligible error if stopRecording returns null', async () => {
      (mockDriver.stopRecording as jest.Mock).mockResolvedValueOnce(null);

      const adapter = new CloudAudioVoiceAdapter({
        recorder: mockRecorder,
        transcriber: mockTranscriber,
      });

      await adapter.start();
      await expect(adapter.stop()).rejects.toThrow('No audio recorded');
    });

    it('stops recorder and purges transient file on cancel', async () => {
      const adapter = new CloudAudioVoiceAdapter({
        recorder: mockRecorder,
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
});
