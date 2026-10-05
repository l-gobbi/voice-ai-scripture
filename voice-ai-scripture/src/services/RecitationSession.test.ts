import {
  RecitationSession,
  RecitationState,
  SpeechTranscriber,
  inferVerseLanguage,
} from './RecitationSession';
import { Verse, verseEngine } from './VerseEngine';
import { SubscriptionService } from './SubscriptionService';
import { audioRecorder } from './AudioRecorderService';
import { SimulatedTranscriber, TranscriptionError } from './SpeechTranscriber';
import { MockSpeechSynthesizer } from './SpeechSynthesizer';
import { MapStorageAdapter } from './StorageAdapter';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('RecitationSession (Ticket 07)', () => {
  const mockVerse: Verse = {
    id: '1',
    reference: 'John 3:16',
    text: 'For God so loved the world that he gave his one and only Son',
    srs: {
      intervalDays: 1,
      streak: 0,
      easeFactor: 2.5,
      nextReviewDate: new Date().toISOString(),
    },
  };

  const subscribedService = new SubscriptionService(
    new MapStorageAdapter({ user_is_subscribed: 'true' })
  );

  function createTestSession(
    verse: Verse = mockVerse,
    options?: {
      recorder?: any;
      transcriber?: any;
      verseEngine?: any;
      subscriptionService?: SubscriptionService;
      synthesizer?: any;
      initialLevel?: any;
      autoVocalizeOnLevel1?: boolean;
    }
  ): RecitationSession {
    return new RecitationSession(verse, {
      subscriptionService: subscribedService,
      ...options,
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Slice 1: Quota Gating and Start Reciting', () => {
    it('initializes in idle state', () => {
      const session = new RecitationSession(mockVerse);
      expect(session.getState()).toMatchObject({
        status: 'idle',
        volumeLevel: 0,
        result: null,
        errorMessage: null,
      });
    });

    it('transitions to quota_exhausted and does NOT start recording when quota is exhausted', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      const startSpy = jest.spyOn(audioRecorder, 'startRecording');

      const exhaustedStorage = new MapStorageAdapter({ free_recitations_remaining: '0' });
      const customSubService = new SubscriptionService(exhaustedStorage);

      const session = new RecitationSession(mockVerse, {
        subscriptionService: customSubService,
      });
      await session.startReciting();

      expect(session.getState().status).toBe('quota_exhausted');
      expect(startSpy).not.toHaveBeenCalled();
    });

    it('transitions to reciting and starts audio recording when quota is allowed', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      const startSpy = jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);

      const activeStorage = new MapStorageAdapter({ free_recitations_remaining: '2' });
      const customSubService = new SubscriptionService(activeStorage);

      const session = new RecitationSession(mockVerse, {
        subscriptionService: customSubService,
      });
      await session.startReciting();

      expect(session.getState().status).toBe('reciting');
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('Slice 2: Microphone Permissions & Volume Metering', () => {
    it('sets error status and does NOT consume quota when microphone permission is denied', async () => {
      const sub = new SubscriptionService(new MapStorageAdapter({ free_recitations_remaining: '3' }));
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(false);

      const session = new RecitationSession(mockVerse, { subscriptionService: sub });
      await session.startReciting();

      expect(session.getState().status).toBe('error');
      expect(session.getState().errorMessage).toContain('Microphone permission');
      expect(await sub.getRemainingFreeRecitations()).toBe(3);
    });

    it('updates volumeLevel and notifies subscribers during live recitation', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);

      let meterCb: ((level: number) => void) | undefined;
      jest.spyOn(audioRecorder, 'startRecording').mockImplementationOnce(async (cb) => {
        meterCb = cb;
      });

      const session = createTestSession(mockVerse);
      const states: RecitationState[] = [];
      session.subscribe((s) => states.push(s));

      await session.startReciting();
      expect(session.getState().status).toBe('reciting');

      // Simulate audio meter tick
      meterCb?.(0.75);
      expect(session.getState().volumeLevel).toBe(0.75);
      expect(states.some((s) => s.volumeLevel === 0.75)).toBe(true);
    });
  });

  describe('Slice 3: Verification, Myers Diffing, and SRS Updates', () => {
    it('stops recording, runs diff verification, updates SRS, and transitions to verified', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/recitation.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);
      const recordSpy = jest.spyOn(verseEngine, 'recordReview').mockResolvedValueOnce({
        streak: 1,
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        passed: true,
      });

      // Injected mock speech transcriber that returns verbatim text
      const mockTranscriber: SpeechTranscriber = {
        transcribe: jest.fn().mockResolvedValueOnce({ text: mockVerse.text }),
      };

      const session = createTestSession(mockVerse, { transcriber: mockTranscriber });
      await session.startReciting();

      const result = await session.stopAndVerify();

      expect(result).not.toBeNull();
      expect(result?.passed).toBe(true);
      expect(result?.score).toBe(100);
      expect(result?.srsResult.streak).toBe(1);
      expect(recordSpy).toHaveBeenCalledWith('1', 100);
      expect(session.getState().status).toBe('verified');
      expect(session.getState().result).toEqual(result);
    });

    it('handles recitation failure: score below threshold resets streak to 0', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/recitation.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);
      const recordSpy = jest.spyOn(verseEngine, 'recordReview').mockResolvedValueOnce({
        streak: 0,
        repetitions: 0,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        passed: false,
      });

      // Injected transcriber with incorrect text
      const mockTranscriber: SpeechTranscriber = {
        transcribe: jest.fn().mockResolvedValueOnce({ text: 'Totally different words' }),
      };

      const session = createTestSession(mockVerse, { transcriber: mockTranscriber });
      await session.startReciting();

      const result = await session.stopAndVerify();

      expect(result?.passed).toBe(false);
      expect(result?.score).toBeLessThan(80);
      expect(result?.srsResult.streak).toBe(0);
      expect(recordSpy).toHaveBeenCalledWith('1', expect.any(Number));
      expect(session.getState().status).toBe('verified');
    });

    it('transitions to verifying status during stopAndVerify before resolution', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/status-test.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);
      jest.spyOn(verseEngine, 'recordReview').mockResolvedValueOnce({
        streak: 1,
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        passed: true,
      });

      let statusDuringVerification: string | null = null;
      let sessionInstance: RecitationSession | null = null;
      const mockTranscriber: SpeechTranscriber = {
        transcribe: jest.fn().mockImplementation(async () => {
          statusDuringVerification = sessionInstance?.getState().status ?? null;
          return { text: mockVerse.text };
        }),
      };

      sessionInstance = createTestSession(mockVerse, { transcriber: mockTranscriber });
      await sessionInstance.startReciting();
      await sessionInstance.stopAndVerify();

      expect(statusDuringVerification).toBe('verifying');
      expect(sessionInstance.getState().status).toBe('verified');
    });
  });

  describe('Slice 4: Guaranteed Audio File Disposal (Privacy Invariant)', () => {
    it('deletes audio file upon successful verification', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/privacy-test.m4a');
      const deleteSpy = jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);

      const mockTranscriber: SpeechTranscriber = {
        transcribe: jest.fn().mockResolvedValueOnce({ text: mockVerse.text }),
      };
      const session = createTestSession(mockVerse, { transcriber: mockTranscriber });

      await session.startReciting();
      await session.stopAndVerify();

      expect(deleteSpy).toHaveBeenCalledWith('file:///audio/privacy-test.m4a');
    });

    it('deletes audio file even when speech transcription rejects with error', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/failing-network.m4a');
      const deleteSpy = jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);

      const failingTranscriber: SpeechTranscriber = {
        transcribe: jest.fn().mockRejectedValueOnce(new Error('Network timeout')),
      };
      const session = createTestSession(mockVerse, { transcriber: failingTranscriber });

      await session.startReciting();
      const result = await session.stopAndVerify();

      expect(result).toBeNull();
      expect(session.getState().status).toBe('error');
      expect(session.getState().errorMessage).toContain('Network timeout');
      // CRITICAL PRIVACY INVARIANT: must be deleted even on error
      expect(deleteSpy).toHaveBeenCalledWith('file:///audio/failing-network.m4a');
    });

    it('stops recorder and deletes audio file when reset() is called mid-recitation', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/abort.m4a');
      const deleteSpy = jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);

      const session = createTestSession(mockVerse);
      await session.startReciting();
      expect(session.getState().status).toBe('reciting');

      await session.reset();

      expect(session.getState().status).toBe('idle');
      expect(deleteSpy).toHaveBeenCalledWith('file:///audio/abort.m4a');
    });

    it('deletes audio file before transitioning to verified state', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/order-test.m4a');

      let deletedBeforeVerified = false;
      const deleteSpy = jest.spyOn(audioRecorder, 'deleteAudioFile').mockImplementationOnce(async () => {
        deletedBeforeVerified = session.getState().status !== 'verified';
        return true;
      });
      jest.spyOn(verseEngine, 'recordReview').mockResolvedValueOnce({
        streak: 1,
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        passed: true,
      });

      const mockTranscriber: SpeechTranscriber = {
        transcribe: jest.fn().mockResolvedValueOnce({ text: mockVerse.text }),
      };
      const session = createTestSession(mockVerse, { transcriber: mockTranscriber });

      await session.startReciting();
      await session.stopAndVerify();

      expect(deleteSpy).toHaveBeenCalledWith('file:///audio/order-test.m4a');
      expect(deletedBeforeVerified).toBe(true);
    });

    it('cleans up and resets session on reset()', async () => {
      const session = createTestSession(mockVerse);
      await session.reset();

      expect(session.getState()).toMatchObject({
        status: 'idle',
        volumeLevel: 0,
        result: null,
        errorMessage: null,
      });
    });
  });

  describe('Slice 5: SpeechTranscriber Seam Integration & Error Transitions', () => {
    it('passes canonical reference and verse text as prompt conditioning to SpeechTranscriber', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/prompt-test.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);
      jest.spyOn(verseEngine, 'recordReview').mockResolvedValueOnce({
        streak: 1,
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        passed: true,
      });

      const mockTranscribe = jest.fn().mockResolvedValueOnce({ text: mockVerse.text });
      const customTranscriber: SpeechTranscriber = {
        transcribe: mockTranscribe,
      };

      const session = createTestSession(mockVerse, { transcriber: customTranscriber });
      await session.startReciting();
      await session.stopAndVerify();

      expect(mockTranscribe).toHaveBeenCalledWith('file:///audio/prompt-test.m4a', {
        prompt: `${mockVerse.reference}: ${mockVerse.text}`,
        language: 'en',
      });
    });

    it('achieves 100% verified recitation score when transcribed speech matches verse text', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/sim-test.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);
      jest.spyOn(verseEngine, 'recordReview').mockResolvedValueOnce({
        streak: 1,
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        passed: true,
      });

      const simulatedTranscriber = new SimulatedTranscriber({
        defaultText: mockVerse.text,
      });
      const session = createTestSession(mockVerse, { transcriber: simulatedTranscriber });
      await session.startReciting();
      const result = await session.stopAndVerify();

      expect(result).not.toBeNull();
      expect(result?.score).toBe(100);
      expect(result?.passed).toBe(true);
      expect(session.getState().status).toBe('verified');
    });

    it('calculates imperfect score when transcribed speech only partially matches verse text', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/partial-test.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);
      jest.spyOn(verseEngine, 'recordReview').mockResolvedValueOnce({
        streak: 0,
        repetitions: 0,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        passed: false,
      });

      const simulatedTranscriber = new SimulatedTranscriber({
        defaultText: 'For God loved the world',
      });
      const session = createTestSession(mockVerse, { transcriber: simulatedTranscriber });
      await session.startReciting();
      const result = await session.stopAndVerify();

      expect(result).not.toBeNull();
      expect(result?.score).toBeLessThan(100);
      expect(result?.score).toBeGreaterThan(0);
      expect(result?.passed).toBe(false);
      expect(session.getState().status).toBe('verified');
    });

    it('maps network_error TranscriptionError to friendly message without recording review', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/network-err.m4a');
      const deleteSpy = jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);
      const recordSpy = jest.spyOn(verseEngine, 'recordReview');

      const failingTranscriber = new SimulatedTranscriber({
        handler: () => {
          throw new TranscriptionError('network_error', 'Connection timed out');
        },
      });

      const session = createTestSession(mockVerse, { transcriber: failingTranscriber });
      await session.startReciting();
      const result = await session.stopAndVerify();

      expect(result).toBeNull();
      expect(session.getState().status).toBe('error');
      expect(session.getState().errorMessage).toBe(
        'Network connection failed. Please check your internet connection.'
      );
      expect(recordSpy).not.toHaveBeenCalled();
      expect(deleteSpy).toHaveBeenCalledWith('file:///audio/network-err.m4a');
    });

    it('maps rate_limited and unauthorized TranscriptionErrors to specific domain messages', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///audio/err.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);

      // Rate limited
      const rateLimitedTranscriber = new SimulatedTranscriber({
        handler: () => {
          throw new TranscriptionError('rate_limited', 'Too many requests');
        },
      });
      const session1 = createTestSession(mockVerse, { transcriber: rateLimitedTranscriber });
      await session1.startReciting();
      await session1.stopAndVerify();
      expect(session1.getState().status).toBe('error');
      expect(session1.getState().errorMessage).toBe(
        'Transcription service is temporarily busy. Please try again shortly.'
      );

      // Unauthorized
      const unauthorizedTranscriber = new SimulatedTranscriber({
        handler: () => {
          throw new TranscriptionError('unauthorized', 'Invalid token');
        },
      });
      const session2 = createTestSession(mockVerse, { transcriber: unauthorizedTranscriber });
      await session2.startReciting();
      await session2.stopAndVerify();
      expect(session2.getState().status).toBe('error');
      expect(session2.getState().errorMessage).toBe(
        'Transcription authentication failed. Please check your API key.'
      );
    });
  });

  describe('Slice 6: Speech Transcriber Language Priming (Ticket 15)', () => {
    it('passes language: pt when verse translation is ALMEIDA or ONBV', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///audio/rec.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);
      jest.spyOn(verseEngine, 'recordReview').mockResolvedValue({
        passed: true,
        streak: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
      });

      const ptVerse: Verse = {
        id: 'pt-1',
        reference: 'João 3:16',
        text: 'Porque Deus amou o mundo de tal maneira...',
        translation: 'ALMEIDA',
      };

      const mockTranscriber: SpeechTranscriber = {
        transcribe: jest.fn().mockResolvedValue({ text: ptVerse.text }),
      };

      const session = createTestSession(ptVerse, { transcriber: mockTranscriber });
      await session.startReciting();
      await session.stopAndVerify();

      expect(mockTranscriber.transcribe).toHaveBeenCalledWith(
        'file:///audio/rec.m4a',
        expect.objectContaining({
          language: 'pt',
        })
      );
    });

    it('passes language: en when verse translation is WEB or KJV', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///audio/rec.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);
      jest.spyOn(verseEngine, 'recordReview').mockResolvedValue({
        passed: true,
        streak: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
      });

      const enVerse: Verse = {
        id: 'en-1',
        reference: 'John 3:16',
        text: 'For God so loved the world...',
        translation: 'WEB',
      };

      const mockTranscriber: SpeechTranscriber = {
        transcribe: jest.fn().mockResolvedValue({ text: enVerse.text }),
      };

      const session = createTestSession(enVerse, { transcriber: mockTranscriber });
      await session.startReciting();
      await session.stopAndVerify();

      expect(mockTranscriber.transcribe).toHaveBeenCalledWith(
        'file:///audio/rec.m4a',
        expect.objectContaining({
          language: 'en',
        })
      );
    });

    it('passes language: pt when verse translation is NVI or ARA', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///audio/rec.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);
      jest.spyOn(verseEngine, 'recordReview').mockResolvedValue({
        passed: true,
        streak: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
      });

      const nviVerse: Verse = {
        id: 'pt-nvi',
        reference: 'João 3:16',
        text: 'Porque Deus tanto amou o mundo...',
        translation: 'NVI',
      };

      const mockTranscriber: SpeechTranscriber = {
        transcribe: jest.fn().mockResolvedValue({ text: nviVerse.text }),
      };

      const session = createTestSession(nviVerse, { transcriber: mockTranscriber });
      await session.startReciting();
      await session.stopAndVerify();

      expect(mockTranscriber.transcribe).toHaveBeenCalledWith(
        'file:///audio/rec.m4a',
        expect.objectContaining({
          language: 'pt',
        })
      );
    });

    it('passes language: pt when translation is CUSTOM but reference is Portuguese', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///audio/rec.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);
      jest.spyOn(verseEngine, 'recordReview').mockResolvedValue({
        passed: true,
        streak: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
      });

      const customPtVerse: Verse = {
        id: 'custom-pt',
        reference: 'Salmos 23:1',
        text: 'O Senhor é o meu pastor...',
        translation: 'CUSTOM',
      };

      const mockTranscriber: SpeechTranscriber = {
        transcribe: jest.fn().mockResolvedValue({ text: customPtVerse.text }),
      };

      const session = createTestSession(customPtVerse, { transcriber: mockTranscriber });
      await session.startReciting();
      await session.stopAndVerify();

      expect(mockTranscriber.transcribe).toHaveBeenCalledWith(
        'file:///audio/rec.m4a',
        expect.objectContaining({
          language: 'pt',
        })
      );
    });

    it('passes language: en when translation is CUSTOM and reference is English', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///audio/rec.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);
      jest.spyOn(verseEngine, 'recordReview').mockResolvedValue({
        passed: true,
        streak: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
      });

      const customEnVerse: Verse = {
        id: 'custom-en',
        reference: 'Psalm 23:1',
        text: 'The Lord is my shepherd...',
        translation: 'CUSTOM',
      };

      const mockTranscriber: SpeechTranscriber = {
        transcribe: jest.fn().mockResolvedValue({ text: customEnVerse.text }),
      };

      const session = createTestSession(customEnVerse, { transcriber: mockTranscriber });
      await session.startReciting();
      await session.stopAndVerify();

      expect(mockTranscriber.transcribe).toHaveBeenCalledWith(
        'file:///audio/rec.m4a',
        expect.objectContaining({
          language: 'en',
        })
      );
    });
  });

  describe('Slice 7: Scaffolded Review, Unmetered Practice, and Assisted Score Capping (Ticket 29)', () => {
    it('in unmetered practice mode, does not consume subscription quota and does not record review on verseEngine', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///audio/unmetered.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);

      const consumeSpy = jest.spyOn(SubscriptionService, 'consumeRecitation');
      const recordSpy = jest.spyOn(verseEngine, 'recordReview');

      const mockTranscriber: SpeechTranscriber = {
        transcribe: jest.fn().mockResolvedValue({ text: mockVerse.text }),
      };

      const session = createTestSession(mockVerse, { transcriber: mockTranscriber });
      await session.startReciting({ unmetered: true });

      expect(consumeSpy).not.toHaveBeenCalled();
      expect(session.getState().status).toBe('reciting');

      const result = await session.stopAndVerify({ unmetered: true });

      expect(recordSpy).not.toHaveBeenCalled();
      expect(result?.score).toBe(100);
      expect(result?.passed).toBe(true);
      expect(session.getState().status).toBe('verified');
    });

    it('when assistanceUsed is true, caps score at 75% and records capped score to verseEngine', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///audio/assisted.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);

      jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValue({
        allowed: true,
        remaining: 5,
        isSubscribed: false,
      });

      const recordSpy = jest.spyOn(verseEngine, 'recordReview').mockResolvedValue({
        streak: 1,
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        passed: false, // 75% is < 80% passing threshold
      });

      const mockTranscriber: SpeechTranscriber = {
        transcribe: jest.fn().mockResolvedValue({ text: mockVerse.text }), // 100% raw accuracy
      };

      const session = createTestSession(mockVerse, { transcriber: mockTranscriber });
      await session.startReciting({ unmetered: false });
      const result = await session.stopAndVerify({ unmetered: false, assistanceUsed: true });

      expect(recordSpy).toHaveBeenCalledWith(mockVerse.id, 75);
      expect(result?.score).toBe(75);
      expect(session.getState().result?.score).toBe(75);
    });
  });

  describe('inferVerseLanguage domain helper', () => {
    it('infers pt for Portuguese translations (ALMEIDA, ONBV, NVI, ARA, NAA, NTLH, ARC, NVT)', () => {
      expect(inferVerseLanguage({ translation: 'ALMEIDA', reference: 'Any 1:1' })).toBe('pt');
      expect(inferVerseLanguage({ translation: 'ONBV', reference: 'Any 1:1' })).toBe('pt');
      expect(inferVerseLanguage({ translation: 'NVI', reference: 'Any 1:1' })).toBe('pt');
      expect(inferVerseLanguage({ translation: 'ara', reference: 'Any 1:1' })).toBe('pt');
      expect(inferVerseLanguage({ translation: 'NAA', reference: 'Any 1:1' })).toBe('pt');
    });

    it('infers en for English translations (WEB, KJV, ESV, NIV, NKJV, NASB, NLT, MSG)', () => {
      expect(inferVerseLanguage({ translation: 'WEB', reference: 'Any 1:1' })).toBe('en');
      expect(inferVerseLanguage({ translation: 'kjv', reference: 'Any 1:1' })).toBe('en');
      expect(inferVerseLanguage({ translation: 'ESV', reference: 'Any 1:1' })).toBe('en');
      expect(inferVerseLanguage({ translation: 'NIV', reference: 'Any 1:1' })).toBe('en');
    });

    it('falls back to reference normalizer language when translation is CUSTOM or absent', () => {
      expect(inferVerseLanguage({ translation: 'CUSTOM', reference: 'Salmos 23:1' })).toBe('pt');
      expect(inferVerseLanguage({ reference: 'João 3:16' })).toBe('pt');
      expect(inferVerseLanguage({ translation: 'CUSTOM', reference: 'Psalm 23:1' })).toBe('en');
      expect(inferVerseLanguage({ reference: 'John 3:16' })).toBe('en');
      expect(inferVerseLanguage({ reference: 'Unknown 99:99' })).toBe('en');
    });
  });

  describe('Slice 8: 3-Tier Scaffolding Lifecycle & Cloze Token Generation (ADR 0012)', () => {
    it('initializes by default in Level 3 (Blind Recitation) with blank cloze tokens', () => {
      const session = new RecitationSession(mockVerse);
      const state = session.getState();
      expect(state.level).toBe(3);
      expect(state.clozeTokens.length).toBeGreaterThan(0);
      expect(state.clozeTokens[0].isRevealed).toBe(false);
      expect(state.clozeTokens[0].masked).toMatch(/_+/);
      expect(state.isTextRevealed).toBe(false);
      expect(state.assistanceUsed).toBe(false);
    });

    it('switches to Level 1 (Echo Mode), clears cloze tokens, and allows toggleTextReveal', () => {
      const session = new RecitationSession(mockVerse, { autoVocalizeOnLevel1: false });
      session.setLevel(1);
      expect(session.getState().level).toBe(1);
      expect(session.getState().clozeTokens).toEqual([]);
      expect(session.getState().isTextRevealed).toBe(false);

      session.toggleTextReveal();
      expect(session.getState().isTextRevealed).toBe(true);
      session.toggleTextReveal();
      expect(session.getState().isTextRevealed).toBe(false);
    });

    it('switches to Level 2 (Cloze Practice) with first-letter anchored tokens', () => {
      const session = new RecitationSession(mockVerse);
      session.setLevel(2);
      expect(session.getState().level).toBe(2);
      const firstToken = session.getState().clozeTokens[0];
      expect(firstToken.masked.startsWith(firstToken.firstLetter)).toBe(true);
      expect(firstToken.isRevealed).toBe(false);
    });

    it('advances through tiers with nextLevel()', () => {
      const session = new RecitationSession(mockVerse, {
        initialLevel: 1,
        autoVocalizeOnLevel1: false,
      });
      expect(session.getState().level).toBe(1);

      session.nextLevel();
      expect(session.getState().level).toBe(2);

      session.nextLevel();
      expect(session.getState().level).toBe(3);

      session.nextLevel();
      expect(session.getState().level).toBe(3);
    });

    it('resets attempt state on practiceAgain() while keeping active tier and regenerating cloze', () => {
      const session = new RecitationSession(mockVerse);
      session.setLevel(2);
      session.tapWord(0);
      expect(session.getState().clozeTokens[0].isRevealed).toBe(true);

      session.practiceAgain();
      expect(session.getState().level).toBe(2);
      expect(session.getState().status).toBe('idle');
      expect(session.getState().clozeTokens[0].isRevealed).toBe(false);
    });
  });

  describe('Slice 9: Interactive Word Reveals & Word Peek Lifelines (ADR 0012)', () => {
    it('in Level 2, tapWord permanently reveals the cloze token without setting assistanceUsed', () => {
      const session = new RecitationSession(mockVerse);
      session.setLevel(2);
      session.tapWord(0);

      expect(session.getState().clozeTokens[0].isRevealed).toBe(true);
      expect(session.getState().assistanceUsed).toBe(false);
    });

    it('in Level 3, tapWord peeks token, sets assistanceUsed: true, and auto-conceals after 3 seconds', () => {
      jest.useFakeTimers();
      const session = new RecitationSession(mockVerse);
      expect(session.getState().level).toBe(3);

      session.tapWord(0);
      expect(session.getState().clozeTokens[0].isRevealed).toBe(true);
      expect(session.getState().assistanceUsed).toBe(true);

      jest.advanceTimersByTime(3000);
      expect(session.getState().clozeTokens[0].isRevealed).toBe(false);
      expect(session.getState().assistanceUsed).toBe(true);

      jest.useRealTimers();
    });

    it('in Level 3, multiple taps reset the 3s auto-hide timer without leaking', () => {
      jest.useFakeTimers();
      const session = new RecitationSession(mockVerse);

      session.tapWord(0);
      jest.advanceTimersByTime(2000);
      expect(session.getState().clozeTokens[0].isRevealed).toBe(true);

      session.tapWord(0);
      jest.advanceTimersByTime(2000);
      expect(session.getState().clozeTokens[0].isRevealed).toBe(true);

      jest.advanceTimersByTime(1000);
      expect(session.getState().clozeTokens[0].isRevealed).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('Slice 10: Speech Synthesis Integration & Conflict Resolution (ADR 0012)', () => {
    it('vocalize() calls speech synthesizer with verse text and inferred language', async () => {
      const mockSynth = new MockSpeechSynthesizer();
      const session = new RecitationSession(mockVerse, {
        synthesizer: mockSynth,
        autoVocalizeOnLevel1: false,
      });

      await session.vocalize();
      expect(mockSynth.getSpokenUtterances().length).toBe(1);
      expect(mockSynth.getSpokenUtterances()[0].text).toBe(mockVerse.text);
      expect(mockSynth.getSpokenUtterances()[0].options?.language).toBe('en-US');
    });

    it('auto-vocalizes when entering Level 1 if autoVocalizeOnLevel1 is true', async () => {
      const mockSynth = new MockSpeechSynthesizer();
      const session = new RecitationSession(mockVerse, {
        synthesizer: mockSynth,
        initialLevel: 3,
        autoVocalizeOnLevel1: true,
      });

      session.setLevel(1);
      expect(mockSynth.getSpokenUtterances().length).toBe(1);
    });

    it('halts active vocalization before microphone recording starts', async () => {
      const mockSynth = new MockSpeechSynthesizer();
      const stopSpy = jest.spyOn(mockSynth, 'stop');
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);

      const session = new RecitationSession(mockVerse, {
        synthesizer: mockSynth,
        initialLevel: 1,
        autoVocalizeOnLevel1: false,
      });

      await session.startReciting();
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('Slice 11: Encapsulated Scoring and Quota Gating by Tier (ADR 0012)', () => {
    it('in Level 1 and 2, startReciting is unmetered and stopAndVerify does not mutate verseEngine', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///practice.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);

      const quotaSpy = jest.spyOn(SubscriptionService, 'consumeRecitation');
      const recordSpy = jest.spyOn(verseEngine, 'recordReview');

      const mockTranscriber = new SimulatedTranscriber({ defaultText: mockVerse.text });
      const session = new RecitationSession(mockVerse, {
        transcriber: mockTranscriber,
        initialLevel: 2,
        autoVocalizeOnLevel1: false,
      });

      await session.startReciting();
      expect(quotaSpy).not.toHaveBeenCalled();

      const result = await session.stopAndVerify();
      expect(recordSpy).not.toHaveBeenCalled();
      expect(result?.passed).toBe(true);
      expect(session.getState().currentResult).toBeTruthy();
      expect(session.getState().officialResult).toBeNull();
    });

    it('in Level 3 with word peek, stopAndVerify records review capped at 75% and sets officialResult', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///official.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);

      jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValue({
        allowed: true,
        remaining: 5,
        isSubscribed: false,
      });

      const recordSpy = jest.spyOn(verseEngine, 'recordReview').mockResolvedValue({
        streak: 1,
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        passed: false,
      });

      const mockTranscriber = new SimulatedTranscriber({ defaultText: mockVerse.text });
      const session = new RecitationSession(mockVerse, {
        transcriber: mockTranscriber,
        initialLevel: 3,
      });

      session.tapWord(0);
      expect(session.getState().assistanceUsed).toBe(true);

      await session.startReciting();
      const result = await session.stopAndVerify();

      expect(recordSpy).toHaveBeenCalledWith(mockVerse.id, 75);
      expect(result?.score).toBe(75);
      expect(session.getState().officialResult?.score).toBe(75);
    });
  });

  describe('Slice 12: Lifecycle Teardown via dispose() (ADR 0012)', () => {
    it('clears timers, stops synthesizer, deletes audio, and removes listeners on dispose()', async () => {
      jest.useFakeTimers();
      const mockSynth = new MockSpeechSynthesizer();
      const synthStopSpy = jest.spyOn(mockSynth, 'stop');

      const session = new RecitationSession(mockVerse, { synthesizer: mockSynth });
      session.tapWord(0);

      const listener = jest.fn();
      session.subscribe(listener);
      listener.mockClear();

      await session.dispose();

      expect(synthStopSpy).toHaveBeenCalled();
      jest.advanceTimersByTime(5000);
      expect(listener).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Slice 13: Sandbox Mode (Ticket 31)', () => {
    it('defaults initialLevel to 1 and does not consume quota or record SRS in Level 3', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///sandbox.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);

      const exhaustedSubService = new SubscriptionService(
        new MapStorageAdapter({ free_recitations_remaining: '0', user_is_subscribed: 'false' })
      );
      const consumeSpy = jest.spyOn(exhaustedSubService, 'consumeRecitation');
      const recordSpy = jest.spyOn(verseEngine, 'recordReview');

      const mockTranscriber = new SimulatedTranscriber({ defaultText: mockVerse.text });

      const session = new RecitationSession(mockVerse, {
        isSandbox: true,
        subscriptionService: exhaustedSubService,
        transcriber: mockTranscriber,
        autoVocalizeOnLevel1: false,
      });

      // Defaults to Level 1 in sandbox mode
      expect(session.getState().level).toBe(1);

      // Advance to Level 3
      session.setLevel(3);
      expect(session.getState().level).toBe(3);

      // Start reciting at Level 3 - should not consume quota
      await session.startReciting();
      expect(session.getState().status).toBe('reciting');
      expect(consumeSpy).not.toHaveBeenCalled();

      // Stop and verify at Level 3 - should not call recordReview
      const result = await session.stopAndVerify();
      expect(result?.score).toBe(100);
      expect(recordSpy).not.toHaveBeenCalled();
    });
  });

  describe('Slice 14: Unmetered Practice Ahead Mode', () => {
    it('does not consume quota and does not alter persistent SRS intervals when isUnmetered is true', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///ahead.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);

      const exhaustedSubService = new SubscriptionService(
        new MapStorageAdapter({ free_recitations_remaining: '0', user_is_subscribed: 'false' })
      );
      const consumeSpy = jest.spyOn(exhaustedSubService, 'consumeRecitation');
      const recordSpy = jest.spyOn(verseEngine, 'recordReview');

      const mockTranscriber = new SimulatedTranscriber({ defaultText: mockVerse.text });

      const session = new RecitationSession(mockVerse, {
        isUnmetered: true,
        subscriptionService: exhaustedSubService,
        transcriber: mockTranscriber,
      });

      // Starts at Level 3 by default
      expect(session.getState().level).toBe(3);

      // Start reciting at Level 3 - should not consume quota because isUnmetered is true
      await session.startReciting();
      expect(session.getState().status).toBe('reciting');
      expect(consumeSpy).not.toHaveBeenCalled();

      // Stop and verify at Level 3 - should not alter persistent SRS
      const result = await session.stopAndVerify();
      expect(result?.score).toBe(100);
      expect(recordSpy).not.toHaveBeenCalled();
    });
  });

  describe('Ticket 42: Raw Transcript Retention for Diagnostics', () => {
    it('retains raw transcribed text in result and session state upon verification', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///test.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);

      const mockTranscriber = new SimulatedTranscriber({
        defaultText: 'o senhor e o meu pastor nada me faltara',
      });

      const session = new RecitationSession(mockVerse, {
        transcriber: mockTranscriber,
        isUnmetered: true,
      });

      await session.startReciting();
      const result = await session.stopAndVerify();

      expect(result?.rawTranscript).toBe('o senhor e o meu pastor nada me faltara');
      expect(session.getState().rawTranscript).toBe('o senhor e o meu pastor nada me faltara');

      session.practiceAgain();
      expect(session.getState().rawTranscript).toBeNull();
    });
  });
});


