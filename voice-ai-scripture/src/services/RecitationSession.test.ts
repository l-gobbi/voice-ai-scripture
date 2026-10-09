import {
  RecitationSession,
  RecitationState,
  inferVerseLanguage,
  calculateMaxRecitationDurationSeconds,
  formatAcousticPrompt,
} from './RecitationSession';
import { Verse, VerseEngine, verseEngine } from './VerseEngine';
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
        nextReviewDate: '2026-10-10',
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
        nextReviewDate: '2026-10-10',
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
        nextReviewDate: '2026-10-10',
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
        nextReviewDate: '2026-10-10',
        passed: true,
      });

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: mockVerse.text });
      const startSpy = jest.spyOn(voiceInput, 'start');

      const session = createTestSession(mockVerse, { voiceInput });
      await session.startReciting();
      await session.stopAndVerify();

      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Holy Bible. Translation: WEB. Reference: John 3:16.',
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
        nextReviewDate: '2026-10-10',
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
        nextReviewDate: '2026-10-10',
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
        nextReviewDate: '2026-10-10',
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
        nextReviewDate: '2026-10-10',
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
        nextReviewDate: '2026-10-10',
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
        nextReviewDate: '2026-10-10',
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
        nextReviewDate: '2026-10-10',
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
        nextReviewDate: '2026-10-10',
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
        nextReviewDate: '2026-10-10',
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

      // Audible speech for 1200ms (quadratic domain speech >= 0.65)
      meterCallback?.(0.70);
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

  describe('Ticket 61: Dynamic Utterance Ceiling (ADR 0016)', () => {
    describe('calculateMaxRecitationDurationSeconds', () => {
      it('enforces a 30-second floor for short single verses', () => {
        expect(calculateMaxRecitationDurationSeconds('Jesus wept.')).toBe(30);
        expect(calculateMaxRecitationDurationSeconds('For God so loved the world')).toBe(30);
      });

      it('scales linearly based on word count (~1.5s/word + 15s buffer)', () => {
        const mediumVerse = Array(40).fill('word').join(' ');
        expect(calculateMaxRecitationDurationSeconds(mediumVerse)).toBe(75);

        const longVerse = Array(100).fill('word').join(' ');
        expect(calculateMaxRecitationDurationSeconds(longVerse)).toBe(165);
      });

      it('enforces a 300-second (5 minute) ceiling for entire chapters', () => {
        const fullChapter = Array(250).fill('word').join(' ');
        expect(calculateMaxRecitationDurationSeconds(fullChapter)).toBe(300);

        const hugeChapter = Array(500).fill('word').join(' ');
        expect(calculateMaxRecitationDurationSeconds(hugeChapter)).toBe(300);
      });

      it('safely handles empty or missing text', () => {
        expect(calculateMaxRecitationDurationSeconds('')).toBe(30);
        expect(calculateMaxRecitationDurationSeconds(null as any)).toBe(30);
      });
    });

    describe('Utterance Ceiling Auto-Completion Lifecycle', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
      });

      it('automatically completes and verifies recitation when utterance ceiling is reached', async () => {
        const verseWithCeiling: Verse = {
          id: 'ceiling-test',
          reference: 'Genesis 1:1',
          text: 'In the beginning God created the heaven and the earth.',
          srs: {
            intervalDays: 1,
            streak: 0,
            easeFactor: 2.5,
            nextReviewDate: new Date().toISOString(),
          },
        };

        const expectedCeiling = calculateMaxRecitationDurationSeconds(verseWithCeiling.text); // 30s
        let meterCallback: ((level: number) => void) | undefined;
        const voiceInput = new SimulatedVoiceAdapter({
          defaultTranscript: verseWithCeiling.text,
        });
        jest.spyOn(voiceInput, 'start').mockImplementation(async (options) => {
          meterCallback = options?.onMeter;
        });
        const stopSpy = jest.spyOn(voiceInput, 'stop');

        const session = new RecitationSession(verseWithCeiling, {
          voiceInput,
          subscriptionService: subscribedService,
        });

        await session.startReciting();
        expect(session.getState().status).toBe('reciting');

        // Calibrate (300ms) and enter speaking state (audible voice)
        meterCallback?.(0.04);
        jest.advanceTimersByTime(300);
        meterCallback?.(0.70);
        jest.advanceTimersByTime(1000);

        // Advance timers right up to 1 second before ceiling
        const remainingSeconds = expectedCeiling - 1.3;
        jest.advanceTimersByTime((remainingSeconds - 1) * 1000);
        expect(session.getState().status).toBe('reciting');
        expect(stopSpy).not.toHaveBeenCalled();

        // Cross the utterance ceiling boundary
        jest.advanceTimersByTime(1500);
        for (let i = 0; i < 10; i++) {
          await Promise.resolve();
        }

        // Auto-completed and verified
        expect(session.getState().status).toBe('verified');
        expect(stopSpy).toHaveBeenCalled();
        session.dispose();
      });

      it('clears utterance ceiling timer if user manually stops and verifies earlier', async () => {
        const session = createTestSession();
        await session.startReciting();
        expect(session.getState().status).toBe('reciting');

        // User taps stop after 3 seconds
        jest.advanceTimersByTime(3000);
        await session.stopAndVerify();
        expect(session.getState().status).toBe('verified');

        // Advancing past original ceiling does not trigger secondary verification
        const stopSpy = jest.spyOn(session, 'stopAndVerify');
        jest.advanceTimersByTime(300000);
        expect(stopSpy).not.toHaveBeenCalled();
        session.dispose();
      });
    });

    describe('Ticket 67: Acoustic Translation Metadata Prompting', () => {
      it('formats Portuguese acoustic prompt with translation and reference, omitting verse text', () => {
        const ptVerse: Verse = {
          id: 'pt-1',
          reference: 'Salmos 23:1',
          text: 'O Senhor é o meu pastor, nada me faltará.',
          translation: 'ALMEIDA',
          srs: mockVerse.srs,
        };

        const prompt = formatAcousticPrompt(ptVerse);
        expect(prompt).toBe('Bíblia Sagrada. Tradução: ALMEIDA. Referência: Salmos 23:1.');
        expect(prompt).not.toContain(ptVerse.text);
        expect(prompt).not.toContain('O Senhor');
      });

      it('formats English acoustic prompt with translation and reference, omitting verse text', () => {
        const enVerse: Verse = {
          id: 'en-1',
          reference: 'Psalm 23:1',
          text: 'The Lord is my shepherd; I shall not want.',
          translation: 'WEB',
          srs: mockVerse.srs,
        };

        const prompt = formatAcousticPrompt(enVerse);
        expect(prompt).toBe('Holy Bible. Translation: WEB. Reference: Psalm 23:1.');
        expect(prompt).not.toContain(enVerse.text);
        expect(prompt).not.toContain('The Lord');
      });

      it('passes metadata prompt to voiceInput.start and verifies verbatim text accurately', async () => {
        const ptVerse: Verse = {
          id: 'pt-2',
          reference: 'Salmos 23:1',
          text: 'O Senhor é o meu pastor, nada me faltará.',
          translation: 'ALMEIDA',
          srs: mockVerse.srs,
        };

        const mockVoiceInput: VoiceInput = {
          requestPermissions: jest.fn().mockResolvedValue(true),
          start: jest.fn().mockResolvedValue(undefined),
          stop: jest.fn().mockResolvedValue({ transcript: 'O Senhor é o meu pastor, nada me faltará.' }),
          cancel: jest.fn().mockResolvedValue(undefined),
        };

        jest.spyOn(verseEngine, 'recordReview').mockResolvedValueOnce({
          streak: 1,
          repetitions: 1,
          intervalDays: 1,
          easeFactor: 2.5,
          nextReviewDate: '2026-10-10',
          passed: true,
        });

        const session = createTestSession(ptVerse, { voiceInput: mockVoiceInput });
        await session.startReciting();

        expect(mockVoiceInput.start).toHaveBeenCalledWith(
          expect.objectContaining({
            language: 'pt',
            prompt: 'Bíblia Sagrada. Tradução: ALMEIDA. Referência: Salmos 23:1.',
          })
        );
        const startCall = (mockVoiceInput.start as jest.Mock).mock.calls[0][0];
        expect(startCall.prompt).not.toContain(ptVerse.text);

        const result = await session.stopAndVerify();
        expect(result).not.toBeNull();
        expect(result?.score).toBe(100);
        expect(result?.passed).toBe(true);
        session.dispose();
      });
    });

    describe('Ticket 69: Instant Recitation Turn-Taking & Pre-Warming', () => {
      it('warmUp checks permissions and delegates to voiceInput.warmUp()', async () => {
        const mockVoiceInput: VoiceInput = {
          requestPermissions: jest.fn().mockResolvedValue(true),
          warmUp: jest.fn().mockResolvedValue(undefined),
          start: jest.fn().mockResolvedValue(undefined),
          stop: jest.fn().mockResolvedValue({ transcript: 'test' }),
          cancel: jest.fn().mockResolvedValue(undefined),
        };

        const session = createTestSession(mockVerse, { voiceInput: mockVoiceInput });
        await session.warmUp();

        expect(mockVoiceInput.requestPermissions).toHaveBeenCalledTimes(1);
        expect(mockVoiceInput.warmUp).toHaveBeenCalledTimes(1);
        session.dispose();
      });

      it('warmUp does not invoke voiceInput.warmUp() if permission is denied', async () => {
        const mockVoiceInput: VoiceInput = {
          requestPermissions: jest.fn().mockResolvedValue(false),
          warmUp: jest.fn().mockResolvedValue(undefined),
          start: jest.fn().mockResolvedValue(undefined),
          stop: jest.fn().mockResolvedValue({ transcript: 'test' }),
          cancel: jest.fn().mockResolvedValue(undefined),
        };

        const session = createTestSession(mockVerse, { voiceInput: mockVoiceInput });
        await session.warmUp();

        expect(mockVoiceInput.requestPermissions).toHaveBeenCalledTimes(1);
        expect(mockVoiceInput.warmUp).not.toHaveBeenCalled();
        session.dispose();
      });

      it('warmUp catches and suppresses exceptions gracefully', async () => {
        const mockVoiceInput: VoiceInput = {
          requestPermissions: jest.fn().mockRejectedValue(new Error('Hardware failure')),
          warmUp: jest.fn().mockResolvedValue(undefined),
          start: jest.fn().mockResolvedValue(undefined),
          stop: jest.fn().mockResolvedValue({ transcript: 'test' }),
          cancel: jest.fn().mockResolvedValue(undefined),
        };

        const session = createTestSession(mockVerse, { voiceInput: mockVoiceInput });
        await expect(session.warmUp()).resolves.toBeUndefined();
        session.dispose();
      });
    });
  });

  describe('Ticket 75: Spoken Reference and Number Normalization', () => {
    const JOAO_3_16 = {
      reference: 'João 3:16',
      translation: 'ALMEIDA',
      text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
    };
    const JOHN_3_16 = {
      reference: 'John 3:16',
      translation: 'WEB',
      text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
    };

    /** A Blind Recitation of a stored Due Verse, through a real Verse Engine on in-memory storage. */
    async function reciteBlind(
      verseData: { reference: string; text: string; translation?: string },
      transcript: string
    ) {
      const engine = new VerseEngine(new MapStorageAdapter());
      const verse = await engine.addVerse(verseData);
      const session = new RecitationSession(verse, {
        verseEngine: engine,
        subscriptionService: new SubscriptionService(
          new MapStorageAdapter({ user_is_subscribed: 'true' })
        ),
        voiceInput: new SimulatedVoiceAdapter({ defaultTranscript: transcript }),
      });
      await session.startReciting();
      const result = await session.stopAndVerify();
      await session.dispose();
      if (!result) throw new Error(`Recitation was not verified: ${session.getState().errorMessage}`);
      return result;
    }

    /** The canonical words, as the diff shows them to the learner. */
    function canonicalWords(text: string): string[] {
      return text.replace(/[-—–]/g, ' ').split(/\s+/).filter(Boolean);
    }

    function expectPerfect(
      result: { score: number; passed: boolean; tokens: { word: string; status: string }[] },
      text: string
    ) {
      expect(result.tokens.filter((t) => t.status !== 'correct')).toEqual([]);
      expect(result.tokens.map((t) => t.word)).toEqual(canonicalWords(text));
      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
    }

    describe('spoken reference', () => {
      it('ignores the verse’s own reference spoken in digits before the verse', async () => {
        const result = await reciteBlind(JOAO_3_16, `João 3:16 ${JOAO_3_16.text}`);
        expectPerfect(result, JOAO_3_16.text);
      });

      it('ignores the verse’s own reference spoken after the verse', async () => {
        const result = await reciteBlind(JOAO_3_16, `${JOAO_3_16.text} João 3:16.`);
        expectPerfect(result, JOAO_3_16.text);
      });

      it('ignores the reference at both ends of the same recitation', async () => {
        const result = await reciteBlind(JOHN_3_16, `John 3:16, ${JOHN_3_16.text} John 3:16`);
        expectPerfect(result, JOHN_3_16.text);
      });

      it('ignores the reference spoken with chapter and verse words, in digits or words', async () => {
        expectPerfect(
          await reciteBlind(JOAO_3_16, `${JOAO_3_16.text} João, capítulo três, versículo dezesseis.`),
          JOAO_3_16.text
        );
        expectPerfect(
          await reciteBlind(JOAO_3_16, `João capítulo 3 verso 16: ${JOAO_3_16.text}`),
          JOAO_3_16.text
        );
        expectPerfect(
          await reciteBlind(JOHN_3_16, `John chapter three, verse sixteen. ${JOHN_3_16.text}`),
          JOHN_3_16.text
        );
      });

      it('ignores a range reference spoken with its first and last verse', async () => {
        const SALMOS_23_1_3 = {
          reference: 'Salmos 23:1-3',
          translation: 'ALMEIDA',
          text: 'O Senhor é o meu pastor; nada me faltará. Deitar-me faz em pastos verdejantes; guia-me mansamente a águas tranqüilas. Refrigera a minha alma; guia-me nas veredas da justiça por amor do seu nome.',
        };

        expectPerfect(
          await reciteBlind(SALMOS_23_1_3, `Salmos 23:1-3 ${SALMOS_23_1_3.text}`),
          SALMOS_23_1_3.text
        );
        expectPerfect(
          await reciteBlind(
            SALMOS_23_1_3,
            `${SALMOS_23_1_3.text} Salmo vinte e três, versículos um a três.`
          ),
          SALMOS_23_1_3.text
        );

        // Only the first verse of the passage is not the passage's reference.
        const firstVerseOnly = await reciteBlind(SALMOS_23_1_3, `Salmos 23:1 ${SALMOS_23_1_3.text}`);
        expect(firstVerseOnly.tokens.filter((t) => t.status === 'added').map((t) => t.word)).toEqual([
          'Salmos',
          '23:1',
        ]);
      });

      it('ignores the reference of a numbered book spoken with a digit or an ordinal', async () => {
        const CORINTIOS_13_4 = {
          reference: '1 Coríntios 13:4',
          translation: 'ALMEIDA',
          text: 'O amor é sofredor, é benigno; o amor não é invejoso; o amor não se vangloria, não se ensoberbece,',
        };
        const CORINTHIANS_13_4 = {
          reference: '1 Corinthians 13:4',
          translation: 'WEB',
          text: 'Love is patient and is kind. Love doesn’t envy. Love doesn’t brag, is not proud,',
        };

        for (const transcript of [
          `1 Coríntios 13:4 ${CORINTIOS_13_4.text}`,
          `1ª Coríntios 13:4 ${CORINTIOS_13_4.text}`,
          `Primeira Coríntios treze, quatro. ${CORINTIOS_13_4.text}`,
          `${CORINTIOS_13_4.text} Primeira aos Coríntios, capítulo 13, versículo 4`,
        ]) {
          expectPerfect(await reciteBlind(CORINTIOS_13_4, transcript), CORINTIOS_13_4.text);
        }
        expectPerfect(
          await reciteBlind(CORINTHIANS_13_4, `First Corinthians thirteen four. ${CORINTHIANS_13_4.text}`),
          CORINTHIANS_13_4.text
        );

        // Another numbered book of the same name is a different verse, so it stays (its "2" read as a word).
        const secondLetter = await reciteBlind(CORINTIOS_13_4, `2 Coríntios 13:4 ${CORINTIOS_13_4.text}`);
        expect(secondLetter.tokens.filter((t) => t.status === 'added').map((t) => t.word)).toEqual([
          'dois',
          'Coríntios',
          '13:4',
        ]);
        expect(secondLetter.score).toBeLessThan(100);
      });

      it('reads spoken numbers as this verse’s chapter and verse, even when they could join', async () => {
        const PSALM_20_3 = {
          reference: 'Psalm 20:3',
          translation: 'WEB',
          text: 'remember all your offerings, and accept your burned sacrifice.',
        };
        expectPerfect(
          await reciteBlind(PSALM_20_3, `Psalm twenty three. ${PSALM_20_3.text}`),
          PSALM_20_3.text
        );

        const PSALM_23_1 = {
          reference: 'Psalm 23:1',
          translation: 'WEB',
          text: 'Yahweh is my shepherd: I shall lack nothing.',
        };
        expectPerfect(
          await reciteBlind(PSALM_23_1, `${PSALM_23_1.text} Psalm twenty-three one`),
          PSALM_23_1.text
        );
      });

      it('does not strip the reference of a different verse', async () => {
        const otherVerse = await reciteBlind(JOAO_3_16, `João 3:17 ${JOAO_3_16.text}`);
        expect(otherVerse.tokens.filter((t) => t.status === 'added').map((t) => t.word)).toEqual([
          'João',
          '3:17',
        ]);
        expect(otherVerse.score).toBeLessThan(100);

        const otherBook = await reciteBlind(JOAO_3_16, `${JOAO_3_16.text} Mateus 3:16`);
        expect(otherBook.tokens.filter((t) => t.status === 'added').map((t) => t.word)).toEqual([
          'Mateus',
          '3:16',
        ]);
      });

      it('does not strip the verse’s own reference from the middle of the recitation', async () => {
        const result = await reciteBlind(
          JOHN_3_16,
          'For God so loved the world, John 3:16 that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.'
        );
        expect(result.tokens.filter((t) => t.status === 'added').map((t) => t.word)).toEqual([
          'John',
          '3:16',
        ]);
        expect(result.score).toBeLessThan(100);
      });

      it('keeps the book name when the verse itself says it and no reference numbers follow', async () => {
        const RUTH_1_16 = {
          reference: 'Ruth 1:16',
          translation: 'WEB',
          text: 'Ruth said, “Don’t urge me to leave you, and to return from following you, for where you go, I will go; and where you stay, I will stay. Your people will be my people, and your God my God.',
        };

        expectPerfect(await reciteBlind(RUTH_1_16, RUTH_1_16.text), RUTH_1_16.text);
        expectPerfect(await reciteBlind(RUTH_1_16, `Ruth 1:16 ${RUTH_1_16.text}`), RUTH_1_16.text);
        expectPerfect(
          await reciteBlind(RUTH_1_16, `Ruth one sixteen. ${RUTH_1_16.text}`),
          RUTH_1_16.text
        );
      });
    });

    describe('numbers', () => {
      it('matches a digit to a spelled-out number and shows the canonical words', async () => {
        const JONAS_1_17 = {
          reference: 'Jonas 1:17',
          translation: 'ALMEIDA',
          text: 'Então o Senhor deparou um grande peixe, para que tragasse a Jonas; e esteve Jonas três dias e três noites nas entranhas do peixe.',
        };
        const JONAH_1_17 = {
          reference: 'Jonah 1:17',
          translation: 'WEB',
          text: 'Yahweh prepared a great fish to swallow up Jonah, and Jonah was in the belly of the fish three days and three nights.',
        };

        const pt = await reciteBlind(
          JONAS_1_17,
          'Então o Senhor deparou um grande peixe, para que tragasse a Jonas; e esteve Jonas 3 dias e 3 noites nas entranhas do peixe.'
        );
        expectPerfect(pt, JONAS_1_17.text);
        expect(pt.tokens.filter((t) => t.word === 'três')).toHaveLength(2);

        const en = await reciteBlind(
          JONAH_1_17,
          'Yahweh prepared a great fish to swallow up Jonah, and Jonah was in the belly of the fish 3 days and 3 nights.'
        );
        expectPerfect(en, JONAH_1_17.text);
      });

      it('matches a multi-digit number to its multi-word form in en and pt', async () => {
        const CORINTIOS_10_8 = {
          reference: '1 Coríntios 10:8',
          translation: 'ALMEIDA',
          text: 'Nem nos prostituamos, como alguns deles fizeram; e caíram num só dia vinte e três mil.',
        };
        const CORINTHIANS_10_8 = {
          reference: '1 Corinthians 10:8',
          translation: 'WEB',
          text: 'Let’s not commit sexual immorality, as some of them committed, and in one day twenty-three thousand fell.',
        };

        for (const number of ['23 mil', '23.000', '23000']) {
          expectPerfect(
            await reciteBlind(
              CORINTIOS_10_8,
              `Nem nos prostituamos, como alguns deles fizeram; e caíram num só dia ${number}.`
            ),
            CORINTIOS_10_8.text
          );
        }
        for (const number of ['23 thousand', '23,000']) {
          expectPerfect(
            await reciteBlind(
              CORINTHIANS_10_8,
              `Let's not commit sexual immorality, as some of them committed, and in 1 day ${number} fell.`
            ),
            CORINTHIANS_10_8.text
          );
        }
      });

      it('reads a wrong number in digits as words in the verse’s language', async () => {
        const CORINTIOS_10_8 = {
          reference: '1 Coríntios 10:8',
          translation: 'ALMEIDA',
          text: 'Nem nos prostituamos, como alguns deles fizeram; e caíram num só dia vinte e três mil.',
        };

        const result = await reciteBlind(
          CORINTIOS_10_8,
          'Nem nos prostituamos, como alguns deles fizeram; e caíram num só dia 24 mil.'
        );
        expect(result.tokens.slice(-5)).toEqual([
          { word: 'vinte', status: 'correct' },
          { word: 'e', status: 'correct' },
          { word: 'três', status: 'missed' },
          { word: 'quatro', status: 'added' },
          { word: 'mil.', status: 'correct' },
        ]);
        expect(result.score).toBeLessThan(100);
      });

      it('matches a number whose canonical words are joined by "and" or "e"', async () => {
        const APOCALIPSE_7_4 = {
          reference: 'Apocalipse 7:4',
          translation: 'ALMEIDA',
          text: 'E ouvi o número dos que foram assinalados com o selo, cento e quarenta e quatro mil de todas as tribos dos filhos de Israel:',
        };
        const GENESIS_5_5 = {
          reference: 'Genesis 5:5',
          translation: 'KJV',
          text: 'And all the days that Adam lived were nine hundred and thirty years: and he died.',
        };

        expectPerfect(
          await reciteBlind(
            APOCALIPSE_7_4,
            'Apocalipse 7:4. E ouvi o número dos que foram assinalados com o selo, 144.000 de todas as tribos dos filhos de Israel.'
          ),
          APOCALIPSE_7_4.text
        );
        expectPerfect(
          await reciteBlind(
            GENESIS_5_5,
            'And all the days that Adam lived were 930 years, and he died. Genesis five five.'
          ),
          GENESIS_5_5.text
        );
      });
    });
  });
});


