import {
  RecitationSession,
  RecitationState,
  inferVerseLanguage,
} from './RecitationSession';
import { Verse, verseEngine } from './VerseEngine';
import { SubscriptionService } from './SubscriptionService';
import { VoiceInput, SimulatedVoiceAdapter } from './VoiceInput';
import { TranscriptionError } from './SpeechTranscriber';
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
      voiceInput?: VoiceInput;
      verseEngine?: any;
      subscriptionService?: SubscriptionService;
      synthesizer?: any;
      initialLevel?: any;
      autoVocalizeOnLevel1?: boolean;
      isSandbox?: boolean;
      isUnmetered?: boolean;
      vadConfig?: any;
    }
  ): RecitationSession {
    return new RecitationSession(verse, {
      subscriptionService: subscribedService,
      voiceInput:
        options?.voiceInput ??
        new SimulatedVoiceAdapter({
          defaultTranscript: verse.text,
        }),
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
      const mockVoiceInput = new SimulatedVoiceAdapter();
      const startSpy = jest.spyOn(mockVoiceInput, 'start');

      const exhaustedStorage = new MapStorageAdapter({ free_recitations_remaining: '0' });
      const customSubService = new SubscriptionService(exhaustedStorage);

      const session = new RecitationSession(mockVerse, {
        subscriptionService: customSubService,
        voiceInput: mockVoiceInput,
      });
      await session.startReciting();

      expect(session.getState().status).toBe('quota_exhausted');
      expect(startSpy).not.toHaveBeenCalled();
    });

    it('transitions to reciting and starts audio recording when quota is allowed', async () => {
      const mockVoiceInput = new SimulatedVoiceAdapter();
      const startSpy = jest.spyOn(mockVoiceInput, 'start');

      const activeStorage = new MapStorageAdapter({ free_recitations_remaining: '2' });
      const customSubService = new SubscriptionService(activeStorage);

      const session = new RecitationSession(mockVerse, {
        subscriptionService: customSubService,
        voiceInput: mockVoiceInput,
      });
      await session.startReciting();

      expect(session.getState().status).toBe('reciting');
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('Slice 2: Microphone Permissions & Volume Metering', () => {
    it('sets error status and does NOT consume quota when microphone permission is denied', async () => {
      const sub = new SubscriptionService(new MapStorageAdapter({ free_recitations_remaining: '3' }));
      const mockVoiceInput = new SimulatedVoiceAdapter();
      jest.spyOn(mockVoiceInput, 'requestPermissions').mockResolvedValueOnce(false);

      const session = new RecitationSession(mockVerse, {
        subscriptionService: sub,
        voiceInput: mockVoiceInput,
      });
      await session.startReciting();

      expect(session.getState().status).toBe('error');
      expect(session.getState().errorMessage).toContain('Microphone permission');
      expect(await sub.getRemainingFreeRecitations()).toBe(3);
    });

    it('updates volumeLevel and notifies subscribers during live recitation', async () => {
      let meterCb: ((level: number) => void) | undefined;
      const mockVoiceInput = new SimulatedVoiceAdapter();
      jest.spyOn(mockVoiceInput, 'start').mockImplementationOnce(async (options) => {
        meterCb = options?.onMeter;
      });

      const session = createTestSession(mockVerse, { voiceInput: mockVoiceInput });
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
      const recordSpy = jest.spyOn(verseEngine, 'recordReview').mockResolvedValueOnce({
        streak: 1,
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        passed: true,
      });

      const session = createTestSession(mockVerse);
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
      const recordSpy = jest.spyOn(verseEngine, 'recordReview').mockResolvedValueOnce({
        streak: 0,
        repetitions: 0,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        passed: false,
      });

      const voiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: 'Totally different words',
      });

      const session = createTestSession(mockVerse, { voiceInput });
      await session.startReciting();

      const result = await session.stopAndVerify();

      expect(result?.passed).toBe(false);
      expect(result?.score).toBeLessThan(80);
      expect(result?.srsResult.streak).toBe(0);
      expect(recordSpy).toHaveBeenCalledWith('1', expect.any(Number));
      expect(session.getState().status).toBe('verified');
    });

    it('transitions to verifying status during stopAndVerify before resolution', async () => {
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
      const voiceInput = new SimulatedVoiceAdapter({
        handler: async () => {
          statusDuringVerification = sessionInstance?.getState().status ?? null;
          return mockVerse.text;
        },
      });

      sessionInstance = createTestSession(mockVerse, { voiceInput });
      await sessionInstance.startReciting();
      await sessionInstance.stopAndVerify();

      expect(statusDuringVerification).toBe('verifying');
      expect(sessionInstance.getState().status).toBe('verified');
    });
  });

  describe('Slice 4: Guaranteed Audio File Disposal (Privacy Invariant)', () => {
    it('stops voice input upon successful verification', async () => {
      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: mockVerse.text });
      const stopSpy = jest.spyOn(voiceInput, 'stop');

      const session = createTestSession(mockVerse, { voiceInput });
      await session.startReciting();
      await session.stopAndVerify();

      expect(stopSpy).toHaveBeenCalledTimes(1);
    });

    it('handles voice input stop rejection with error status', async () => {
      const voiceInput = new SimulatedVoiceAdapter({
        handler: () => {
          throw new Error('Network timeout');
        },
      });

      const session = createTestSession(mockVerse, { voiceInput });
      await session.startReciting();
      const result = await session.stopAndVerify();

      expect(result).toBeNull();
      expect(session.getState().status).toBe('error');
      expect(session.getState().errorMessage).toContain('Network timeout');
    });

    it('cancels voice input when reset() is called mid-recitation', async () => {
      const voiceInput = new SimulatedVoiceAdapter();
      const cancelSpy = jest.spyOn(voiceInput, 'cancel');

      const session = createTestSession(mockVerse, { voiceInput });
      await session.startReciting();
      expect(session.getState().status).toBe('reciting');

      await session.reset();

      expect(session.getState().status).toBe('idle');
      expect(cancelSpy).toHaveBeenCalledTimes(1);
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

  describe('Slice 5: VoiceInput Seam Integration & Error Transitions', () => {
    it('passes canonical reference and verse text as prompt conditioning to VoiceInput', async () => {
      jest.spyOn(verseEngine, 'recordReview').mockResolvedValueOnce({
        streak: 1,
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        passed: true,
      });

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: mockVerse.text });
      const startSpy = jest.spyOn(voiceInput, 'start');

      const session = createTestSession(mockVerse, { voiceInput });
      await session.startReciting();
      await session.stopAndVerify();

      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: `${mockVerse.reference}: ${mockVerse.text}`,
          language: 'en',
        })
      );
    });

    it('achieves 100% verified recitation score when transcribed speech matches verse text', async () => {
      jest.spyOn(verseEngine, 'recordReview').mockResolvedValueOnce({
        streak: 1,
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        passed: true,
      });

      const voiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: mockVerse.text,
      });
      const session = createTestSession(mockVerse, { voiceInput });
      await session.startReciting();
      const result = await session.stopAndVerify();

      expect(result).not.toBeNull();
      expect(result?.score).toBe(100);
      expect(result?.passed).toBe(true);
      expect(session.getState().status).toBe('verified');
    });

    it('calculates imperfect score when transcribed speech only partially matches verse text', async () => {
      jest.spyOn(verseEngine, 'recordReview').mockResolvedValueOnce({
        streak: 0,
        repetitions: 0,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        passed: false,
      });

      const voiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: 'For God loved the world',
      });
      const session = createTestSession(mockVerse, { voiceInput });
      await session.startReciting();
      const result = await session.stopAndVerify();

      expect(result).not.toBeNull();
      expect(result?.score).toBeLessThan(100);
      expect(result?.score).toBeGreaterThan(0);
      expect(result?.passed).toBe(false);
      expect(session.getState().status).toBe('verified');
    });

    it('maps network_error TranscriptionError to friendly message without recording review', async () => {
      const recordSpy = jest.spyOn(verseEngine, 'recordReview');

      const failingVoiceInput = new SimulatedVoiceAdapter({
        handler: () => {
          throw new TranscriptionError('network_error', 'Connection timed out');
        },
      });

      const session = createTestSession(mockVerse, { voiceInput: failingVoiceInput });
      await session.startReciting();
      const result = await session.stopAndVerify();

      expect(result).toBeNull();
      expect(session.getState().status).toBe('error');
      expect(session.getState().errorMessage).toBe(
        'Network connection failed. Please check your internet connection.'
      );
      expect(recordSpy).not.toHaveBeenCalled();
    });

    it('maps rate_limited and unauthorized TranscriptionErrors to specific domain messages', async () => {
      // Rate limited
      const rateLimitedVoiceInput = new SimulatedVoiceAdapter({
        handler: () => {
          throw new TranscriptionError('rate_limited', 'Too many requests');
        },
      });
      const session1 = createTestSession(mockVerse, { voiceInput: rateLimitedVoiceInput });
      await session1.startReciting();
      await session1.stopAndVerify();
      expect(session1.getState().status).toBe('error');
      expect(session1.getState().errorMessage).toBe(
        'Transcription service is temporarily busy. Please try again shortly.'
      );

      // Unauthorized
      const unauthorizedVoiceInput = new SimulatedVoiceAdapter({
        handler: () => {
          throw new TranscriptionError('unauthorized', 'Invalid token');
        },
      });
      const session2 = createTestSession(mockVerse, { voiceInput: unauthorizedVoiceInput });
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

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: ptVerse.text });
      const startSpy = jest.spyOn(voiceInput, 'start');

      const session = createTestSession(ptVerse, { voiceInput });
      await session.startReciting();
      await session.stopAndVerify();

      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'pt',
        })
      );
    });

    it('passes language: en when verse translation is WEB or KJV', async () => {
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

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: enVerse.text });
      const startSpy = jest.spyOn(voiceInput, 'start');

      const session = createTestSession(enVerse, { voiceInput });
      await session.startReciting();
      await session.stopAndVerify();

      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'en',
        })
      );
    });

    it('passes language: pt when verse translation is NVI or ARA', async () => {
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

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: nviVerse.text });
      const startSpy = jest.spyOn(voiceInput, 'start');

      const session = createTestSession(nviVerse, { voiceInput });
      await session.startReciting();
      await session.stopAndVerify();

      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'pt',
        })
      );
    });

    it('passes language: pt when translation is CUSTOM but reference is Portuguese', async () => {
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

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: customPtVerse.text });
      const startSpy = jest.spyOn(voiceInput, 'start');

      const session = createTestSession(customPtVerse, { voiceInput });
      await session.startReciting();
      await session.stopAndVerify();

      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'pt',
        })
      );
    });

    it('passes language: en when translation is CUSTOM and reference is English', async () => {
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

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: customEnVerse.text });
      const startSpy = jest.spyOn(voiceInput, 'start');

      const session = createTestSession(customEnVerse, { voiceInput });
      await session.startReciting();
      await session.stopAndVerify();

      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'en',
        })
      );
    });
  });

  describe('Slice 7: Scaffolded Review, Unmetered Practice, and Assisted Score Capping (Ticket 29)', () => {
    it('in unmetered practice mode, does not consume subscription quota and does not record review on verseEngine', async () => {
      const consumeSpy = jest.spyOn(SubscriptionService.prototype, 'consumeRecitation');
      const recordSpy = jest.spyOn(verseEngine, 'recordReview');

      const session = createTestSession(mockVerse);
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
      jest.spyOn(SubscriptionService.prototype, 'consumeRecitation').mockResolvedValue({
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

      const session = createTestSession(mockVerse);
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

    it('infers pt from verse text containing Portuguese diacritics and marker words even with English reference', () => {
      expect(
        inferVerseLanguage({
          reference: 'Psalms 23:1',
          text: 'O Senhor é o meu pastor; nada me faltará.',
        })
      ).toBe('pt');

      expect(
        inferVerseLanguage({
          reference: 'Psalm 23:1',
          text: 'O Senhor é meu pastor e nada me faltará.',
          translation: 'WEB', // Even if translation was erroneously left as default WEB!
        })
      ).toBe('pt');
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
      const voiceInput = new SimulatedVoiceAdapter();

      const session = new RecitationSession(mockVerse, {
        synthesizer: mockSynth,
        voiceInput,
        initialLevel: 1,
        autoVocalizeOnLevel1: false,
      });

      await session.startReciting();
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('Slice 11: Encapsulated Scoring and Quota Gating by Tier (ADR 0012)', () => {
    it('in Level 1 and 2, startReciting is unmetered and stopAndVerify does not mutate verseEngine', async () => {
      const quotaSpy = jest.spyOn(SubscriptionService.prototype, 'consumeRecitation');
      const recordSpy = jest.spyOn(verseEngine, 'recordReview');

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: mockVerse.text });
      const session = new RecitationSession(mockVerse, {
        voiceInput,
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
      jest.spyOn(SubscriptionService.prototype, 'consumeRecitation').mockResolvedValue({
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

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: mockVerse.text });
      const session = new RecitationSession(mockVerse, {
        voiceInput,
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
      const exhaustedSubService = new SubscriptionService(
        new MapStorageAdapter({ free_recitations_remaining: '0', user_is_subscribed: 'false' })
      );
      const consumeSpy = jest.spyOn(exhaustedSubService, 'consumeRecitation');
      const recordSpy = jest.spyOn(verseEngine, 'recordReview');

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: mockVerse.text });

      const session = new RecitationSession(mockVerse, {
        isSandbox: true,
        subscriptionService: exhaustedSubService,
        voiceInput,
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
      const exhaustedSubService = new SubscriptionService(
        new MapStorageAdapter({ free_recitations_remaining: '0', user_is_subscribed: 'false' })
      );
      const consumeSpy = jest.spyOn(exhaustedSubService, 'consumeRecitation');
      const recordSpy = jest.spyOn(verseEngine, 'recordReview');

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: mockVerse.text });

      const session = new RecitationSession(mockVerse, {
        isUnmetered: true,
        subscriptionService: exhaustedSubService,
        voiceInput,
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
      const voiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: 'o senhor e o meu pastor nada me faltara',
      });

      const session = new RecitationSession(mockVerse, {
        voiceInput,
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

  describe('Ticket 52: Voice Activity Detector & Cancel Integration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('initializes session with vadProgress: 0 and updates vadProgress during thinking grace period', async () => {
      let meterCallback: ((level: number) => void) | undefined;
      const voiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: mockVerse.text,
      });
      jest.spyOn(voiceInput, 'start').mockImplementation(async (options) => {
        meterCallback = options?.onMeter;
      });

      const session = new RecitationSession(mockVerse, {
        voiceInput,
        subscriptionService: subscribedService,
      });

      expect(session.getState().vadProgress).toBe(0);

      await session.startReciting();
      expect(session.getState().status).toBe('reciting');

      // Calibration (300ms)
      meterCallback?.(0.04);
      jest.advanceTimersByTime(300);

      // Audible speech for 1200ms
      meterCallback?.(0.50);
      jest.advanceTimersByTime(1200);

      // Silence begins
      meterCallback?.(0.02);

      // First 1.5s of silence: progress remains 0
      jest.advanceTimersByTime(1500);
      expect(session.getState().vadProgress).toBe(0);

      // Past 1.5s (at 2.5s, 1s into active arc): progress should be around 0.5
      jest.advanceTimersByTime(1000);
      expect(session.getState().vadProgress).toBeGreaterThan(0.4);

      // Auto-completion at 3.5s triggers stopAndVerify
      jest.advanceTimersByTime(1000);
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }

      expect(session.getState().status).toBe('verified');
      expect(session.getState().vadProgress).toBe(0);
      session.dispose();
    });

    it('cancels recitation, purges audio, and resets to idle without evaluation', async () => {
      const voiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: mockVerse.text,
      });
      const cancelSpy = jest.spyOn(voiceInput, 'cancel');
      const recordSpy = jest.spyOn(verseEngine, 'recordReview');

      const session = new RecitationSession(mockVerse, {
        voiceInput,
        subscriptionService: subscribedService,
      });

      await session.startReciting();
      expect(session.getState().status).toBe('reciting');

      await session.cancelRecitation();

      expect(session.getState().status).toBe('idle');
      expect(session.getState().vadProgress).toBe(0);
      expect(session.getState().volumeLevel).toBe(0);
      expect(session.getState().result).toBeNull();
      expect(recordSpy).not.toHaveBeenCalled();
      expect(cancelSpy).toHaveBeenCalled();
      session.dispose();
    });

    it('resets to idle with prompt if initial 10s grace expires without speech', async () => {
      let meterCallback: ((level: number) => void) | undefined;
      const voiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: mockVerse.text,
      });
      jest.spyOn(voiceInput, 'start').mockImplementation(async (options) => {
        meterCallback = options?.onMeter;
      });

      const session = new RecitationSession(mockVerse, {
        voiceInput,
        subscriptionService: subscribedService,
      });

      await session.startReciting();
      expect(session.getState().status).toBe('reciting');

      // Calibration 300ms + silence for 10s
      meterCallback?.(0.04);
      jest.advanceTimersByTime(300);

      jest.advanceTimersByTime(10000);
      jest.advanceTimersByTime(1000);
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }

      expect(session.getState().status).toBe('idle');
      expect(session.getState().errorMessage).toContain('No speech detected');
      session.dispose();
    });
  });
});


