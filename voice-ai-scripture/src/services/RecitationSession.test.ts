import {
  RecitationSession,
  RecitationSessionOptions,
  RecitationState,
  inferVerseLanguage,
  calculateMaxRecitationDurationSeconds,
  formatAcousticPrompt,
} from './RecitationSession';
import { AttemptKind, SRSResult, Verse, VerseEngine, verseEngine } from './VerseEngine';
import { ReviewLogEntry } from './ReviewLog';
import { DAILY_LIMIT, SubscriptionService } from './SubscriptionService';
import { VoiceInput, SimulatedVoiceAdapter } from './VoiceInput';
import { TranscriptionError } from './SpeechTranscriber';
import { MockSpeechSynthesizer } from './SpeechSynthesizer';
import { MapStorageAdapter } from './StorageAdapter';
import { addStudyDays, toStudyDay } from '../engines/studyDay';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Spies never leak from one test into the next.
afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * Stubs the singleton Verse Engine's attempt operation for tests about other concerns, whose
 * verses are not stored. Classification itself is covered with a real engine (Ticket 72 below).
 */
function stubRecordAttempt(kind: AttemptKind = 'official', srs: Partial<SRSResult> = {}) {
  return jest.spyOn(verseEngine, 'recordAttempt').mockImplementation(async (input) => ({
    kind,
    srsResult: {
      streak: 1,
      repetitions: 1,
      intervalDays: 1,
      easeFactor: 2.5,
      nextReviewDate: '2026-10-10',
      passed: input.evaluation.outcome !== 'forgotten',
      ...srs,
    },
    memoryTier: 'seed',
    entry: {} as ReviewLogEntry,
  }));
}

/** Stubs the singleton Verse Engine's Transcription Error log, for verses that are not stored. */
function stubRecordTranscriptionError() {
  return jest
    .spyOn(verseEngine, 'recordTranscriptionError')
    .mockImplementation(async () => ({} as ReviewLogEntry));
}

const NOT_COUNTED = 'Nothing was counted and no recitation was used.';

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
    it('stops recording, runs diff verification, records the attempt, and transitions to verified', async () => {
      const recordSpy = stubRecordAttempt('official', { streak: 1 });

      const session = createTestSession(mockVerse);
      await session.startReciting();

      const result = await session.stopAndVerify();

      expect(result).not.toBeNull();
      expect(result?.passed).toBe(true);
      expect(result?.outcome).toBe('clean');
      expect(result?.score).toBe(100);
      expect(result?.srsResult.streak).toBe(1);
      expect(result?.kind).toBe('official');
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          verseId: '1',
          level: 3,
          evaluation: expect.objectContaining({ rawScore: 100, errorCount: 0, outcome: 'clean' }),
        })
      );
      expect(session.getState().status).toBe('verified');
      expect(session.getState().result).toEqual(result);
    });

    it('handles recitation failure: errors over the Error Budget are forgotten and reset streak to 0', async () => {
      const recordSpy = stubRecordAttempt('official', { streak: 0, repetitions: 0 });

      const voiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: 'Totally different words',
      });

      const session = createTestSession(mockVerse, { voiceInput });
      await session.startReciting();

      const result = await session.stopAndVerify();

      expect(result?.passed).toBe(false);
      expect(result?.outcome).toBe('forgotten');
      expect(result?.errorCount).toBeGreaterThan(result!.errorBudget);
      expect(result?.srsResult.streak).toBe(0);
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({ verseId: '1', evaluation: expect.objectContaining({ outcome: 'forgotten' }) })
      );
      expect(session.getState().status).toBe('verified');
    });

    it('transitions to verifying status during stopAndVerify before resolution', async () => {
      stubRecordAttempt();

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
      session.tapWord(2);
      await session.reset();

      expect(session.getState()).toMatchObject({
        status: 'idle',
        volumeLevel: 0,
        result: null,
        errorMessage: null,
        peekedWordPositions: [],
      });
      expect(session.getState().clozeTokens[2].isRevealed).toBe(false);
    });
  });

  describe('Slice 5: VoiceInput Seam Integration & Error Transitions', () => {
    it('passes canonical reference and verse text as prompt conditioning to VoiceInput', async () => {
      stubRecordAttempt();

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: mockVerse.text });
      const startSpy = jest.spyOn(voiceInput, 'start');

      const session = createTestSession(mockVerse, { voiceInput });
      await session.startReciting();
      await session.stopAndVerify();

      // The verse has no translation, so the prompt names the English default (Ticket 81).
      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Holy Bible. Translation: BSB. Reference: John 3:16.',
          language: 'en',
        })
      );
    });

    it('achieves 100% verified recitation score when transcribed speech matches verse text', async () => {
      stubRecordAttempt();

      const voiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: mockVerse.text,
      });
      const session = createTestSession(mockVerse, { voiceInput });
      await session.startReciting();
      const result = await session.stopAndVerify();

      expect(result).not.toBeNull();
      expect(result?.score).toBe(100);
      expect(result?.outcome).toBe('clean');
      expect(result?.passed).toBe(true);
      expect(session.getState().status).toBe('verified');
    });

    it('calculates imperfect score when transcribed speech only partially matches verse text', async () => {
      stubRecordAttempt();

      const voiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: 'For God loved the world',
      });
      const session = createTestSession(mockVerse, { voiceInput });
      await session.startReciting();
      const result = await session.stopAndVerify();

      expect(result).not.toBeNull();
      expect(result?.score).toBeLessThan(100);
      expect(result?.score).toBeGreaterThan(0);
      expect(result?.outcome).toBe('forgotten');
      expect(result?.passed).toBe(false);
      expect(session.getState().status).toBe('verified');
    });

    it('maps network_error TranscriptionError to a calm retry message: never graded, only logged with its code (Ticket 74)', async () => {
      const recordSpy = stubRecordAttempt();
      const transcriptionErrorSpy = stubRecordTranscriptionError();

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
        `Network connection failed. Please check your internet connection. ${NOT_COUNTED}`
      );
      expect(recordSpy).not.toHaveBeenCalled();
      expect(transcriptionErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ verseId: mockVerse.id, level: 3, code: 'network_error' })
      );
    });

    it('maps rate_limited and unauthorized TranscriptionErrors to specific domain messages', async () => {
      stubRecordTranscriptionError();

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
        `Transcription service is temporarily busy. Please try again shortly. ${NOT_COUNTED}`
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
        `Transcription authentication failed. Please check your API key. ${NOT_COUNTED}`
      );
    });
  });

  describe('Slice 6: Speech Transcriber Language Priming (Ticket 15)', () => {
    it('passes language: pt when verse translation is ALMEIDA or ONBV', async () => {
      stubRecordAttempt();

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
      stubRecordAttempt();

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
      stubRecordAttempt();

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
      stubRecordAttempt();

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
      stubRecordAttempt();

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

  describe('Slice 7: Scaffolded Review, Unmetered Practice, and Word Peeks as Errors (Tickets 29, 73)', () => {
    it('in unmetered practice mode, does not consume subscription quota and leaves classification to the Verse Engine', async () => {
      const consumeSpy = jest.spyOn(SubscriptionService.prototype, 'consumeRecitation');
      const recordSpy = stubRecordAttempt('practice');

      const session = createTestSession(mockVerse);
      await session.startReciting({ unmetered: true });

      expect(consumeSpy).not.toHaveBeenCalled();
      expect(session.getState().status).toBe('reciting');

      const result = await session.stopAndVerify();

      // Metering is the caller's choice; whether the attempt schedules is the engine's.
      expect(recordSpy).toHaveBeenCalledWith(expect.objectContaining({ verseId: mockVerse.id, level: 3 }));
      expect(result?.kind).toBe('practice');
      expect(result?.score).toBe(100);
      expect(result?.passed).toBe(true);
      expect(session.getState().status).toBe('verified');
      expect(session.getState().officialResult).toBeNull();
    });

    it('after a Word Peek, records the peek as one error with the peeked position, without capping the score', async () => {
      jest.spyOn(SubscriptionService.prototype, 'consumeRecitation').mockResolvedValue({
        allowed: true,
        remaining: 5,
        isSubscribed: false,
      });
      const recordSpy = stubRecordAttempt();

      const session = createTestSession(mockVerse);
      session.tapWord(0);
      await session.startReciting();
      const result = await session.stopAndVerify();

      // 14 words allow 1 error: one peek on an otherwise perfect recitation is a slip.
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          verseId: mockVerse.id,
          evaluation: expect.objectContaining({ rawScore: 100, errorCount: 1, errorBudget: 1, outcome: 'slip' }),
          peekedWordPositions: [0],
        })
      );
      expect(result).toMatchObject({ score: 100, outcome: 'slip', passed: true });
      expect(session.getState().result?.outcome).toBe('slip');
      await session.dispose();
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
      expect(state.peekedWordPositions).toEqual([]);
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
    it('in Level 2, tapWord permanently reveals the cloze token without counting a Word Peek', () => {
      const session = new RecitationSession(mockVerse);
      session.setLevel(2);
      session.tapWord(0);

      expect(session.getState().clozeTokens[0].isRevealed).toBe(true);
      expect(session.getState().peekedWordPositions).toEqual([]);
    });

    it('in Level 3, tapWord peeks the token, records its word position, and auto-conceals after 3 seconds', () => {
      jest.useFakeTimers();
      const session = new RecitationSession(mockVerse);
      expect(session.getState().level).toBe(3);

      session.tapWord(0);
      expect(session.getState().clozeTokens[0].isRevealed).toBe(true);
      expect(session.getState().peekedWordPositions).toEqual([0]);

      jest.advanceTimersByTime(3000);
      expect(session.getState().clozeTokens[0].isRevealed).toBe(false);
      // The peek still counts once the word is hidden again.
      expect(session.getState().peekedWordPositions).toEqual([0]);

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
    it('in Level 1 and 2, recitations are unmetered and recorded as Practice Attempts that leave the schedule alone', async () => {
      const quotaSpy = jest.spyOn(SubscriptionService.prototype, 'consumeRecitation');
      const engine = new VerseEngine(new MapStorageAdapter());
      const verse = await engine.addVerse({ reference: mockVerse.reference, text: mockVerse.text }); // new, so due

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: mockVerse.text });
      const session = new RecitationSession(verse, {
        verseEngine: engine,
        voiceInput,
        initialLevel: 1,
        autoVocalizeOnLevel1: false,
      });

      await session.startReciting();
      const echo = await session.stopAndVerify();
      session.nextLevel();
      await session.startReciting();
      const cloze = await session.stopAndVerify();

      expect(quotaSpy).not.toHaveBeenCalled();
      expect(echo?.kind).toBe('practice');
      expect(cloze?.kind).toBe('practice');
      expect(cloze?.passed).toBe(true);
      expect(session.getState().currentResult).toBeTruthy();
      expect(session.getState().officialResult).toBeNull();
      expect((await engine.getAllVerses())[0].srs).toEqual(verse.srs);
      expect((await engine.getReviewLog(verse.id)).map((row) => row.level)).toEqual([1, 2]);
    });

    it('in Level 3 with a word peek, stopAndVerify records the peek as an error and sets officialResult', async () => {
      jest.spyOn(SubscriptionService.prototype, 'consumeRecitation').mockResolvedValue({
        allowed: true,
        remaining: 5,
        isSubscribed: false,
      });

      const recordSpy = stubRecordAttempt();

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: mockVerse.text });
      const session = new RecitationSession(mockVerse, {
        voiceInput,
        initialLevel: 3,
      });

      session.tapWord(0);
      session.tapWord(5);
      expect(session.getState().peekedWordPositions).toEqual([0, 5]);

      await session.startReciting();
      const result = await session.stopAndVerify();

      // Two peeks in a 14-word verse (budget 1) are over the Error Budget.
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          verseId: mockVerse.id,
          evaluation: expect.objectContaining({ rawScore: 100, errorCount: 2, outcome: 'forgotten' }),
          peekedWordPositions: [0, 5],
        })
      );
      expect(result).toMatchObject({ score: 100, outcome: 'forgotten', passed: false });
      expect(session.getState().officialResult?.outcome).toBe('forgotten');
      await session.dispose();
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
    it('defaults initialLevel to 1 and does not consume quota or record anything in Level 3', async () => {
      const exhaustedSubService = new SubscriptionService(
        new MapStorageAdapter({ free_recitations_remaining: '0', user_is_subscribed: 'false' })
      );
      const consumeSpy = jest.spyOn(exhaustedSubService, 'consumeRecitation');
      const recordSpy = jest.spyOn(verseEngine, 'recordAttempt');

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

      // Stop and verify at Level 3 - the sandbox verse is not stored, so nothing is recorded
      const result = await session.stopAndVerify();
      expect(result?.score).toBe(100);
      expect(result?.outcome).toBe('clean');
      expect(result?.kind).toBe('practice');
      expect(recordSpy).not.toHaveBeenCalled();
    });
  });

  describe('Slice 14: Unmetered Practice Ahead Mode', () => {
    it('practicing ahead on a verse not yet due uses no quota and does not alter persistent SRS intervals', async () => {
      const exhaustedSubService = new SubscriptionService(
        new MapStorageAdapter({ free_recitations_remaining: '0', user_is_subscribed: 'false' })
      );
      const consumeSpy = jest.spyOn(exhaustedSubService, 'consumeRecitation');
      const engine = new VerseEngine(new MapStorageAdapter());
      const added = await engine.addVerse({ reference: mockVerse.reference, text: mockVerse.text });
      const notYetDue = await engine.updateVerse(added.id, {
        srs: {
          intervalDays: 6,
          streak: 2,
          easeFactor: 2.5,
          nextReviewDate: addStudyDays(toStudyDay(new Date()), 3),
        },
      });

      const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: mockVerse.text });

      // The Home Screen opens a verse that is not due as unmetered.
      const session = new RecitationSession(notYetDue, {
        verseEngine: engine,
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

      // Stop and verify at Level 3 - a Practice Attempt: logged, but the SRS state is untouched
      const result = await session.stopAndVerify();
      expect(result?.score).toBe(100);
      expect(result?.kind).toBe('practice');
      expect((await engine.getAllVerses())[0].srs).toEqual(notYetDue.srs);
      expect(await engine.getReviewLog(notYetDue.id)).toHaveLength(1);
    });
  });

  describe('Ticket 42: Raw Transcript Retention for Diagnostics', () => {
    it('retains raw transcribed text in result and session state upon verification', async () => {
      stubRecordAttempt('practice');
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
      stubRecordAttempt();
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
      const recordSpy = jest.spyOn(verseEngine, 'recordAttempt');

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

    it('ends in a calm Transcription Error if the initial 10s grace expires without speech (Ticket 92)', async () => {
      let meterCallback: ((level: number) => void) | undefined;
      const voiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: mockVerse.text,
      });
      jest.spyOn(voiceInput, 'start').mockImplementation(async (options) => {
        meterCallback = options?.onMeter;
      });

      const logSpy = stubRecordTranscriptionError();

      const session = new RecitationSession(mockVerse, {
        voiceInput,
        subscriptionService: subscribedService,
      });

      await session.startReciting();
      expect(session.getState().status).toBe('reciting');
      const ended = new Promise<void>((resolve) => {
        session.subscribe((state) => {
          if (state.status === 'error') resolve();
        });
      });

      // Calibration 300ms + silence for 10s
      meterCallback?.(0.04);
      jest.advanceTimersByTime(300);

      jest.advanceTimersByTime(10000);
      jest.advanceTimersByTime(1000);
      await ended;

      expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({ verseId: mockVerse.id, code: 'unintelligible' }));
      expect(session.getState()).toMatchObject({
        status: 'error',
        transcriptionErrorCode: 'unintelligible',
        errorMessage: `No speech detected. Tap the mic to try again. ${NOT_COUNTED}`,
      });
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
        stubRecordAttempt();
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
        stubRecordAttempt();
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

      it('names the default translation of the verse’s language when the verse has none (Ticket 81)', () => {
        expect(formatAcousticPrompt({ reference: 'Salmos 23:1', text: 'O SENHOR é meu pastor, nada me faltará.' })).toBe(
          'Bíblia Sagrada. Tradução: BLIVRE. Referência: Salmos 23:1.'
        );
        expect(formatAcousticPrompt({ reference: 'Psalm 23:1', text: 'The LORD is my shepherd; I shall not want.' })).toBe(
          'Holy Bible. Translation: BSB. Reference: Psalm 23:1.'
        );
        expect(formatAcousticPrompt({ reference: 'Psalm 23:1', translation: '' })).toBe(
          'Holy Bible. Translation: BSB. Reference: Psalm 23:1.'
        );
      });

      it('speaks, primes and prompts a verse saved in ALMEIDA or KJV in its own language and label (Ticket 81)', async () => {
        const cases = [
          {
            verse: { id: 'almeida-1', reference: 'João 11:35', text: 'Jesus chorou.', translation: 'ALMEIDA' },
            speech: 'pt-BR',
            recognizer: 'pt',
            prompt: 'Bíblia Sagrada. Tradução: ALMEIDA. Referência: João 11:35.',
          },
          {
            verse: { id: 'kjv-1', reference: 'John 11:35', text: 'Jesus wept.', translation: 'KJV' },
            speech: 'en-US',
            recognizer: 'en',
            prompt: 'Holy Bible. Translation: KJV. Reference: John 11:35.',
          },
        ];

        for (const { verse, speech, recognizer, prompt } of cases) {
          stubRecordAttempt();
          const synthesizer = new MockSpeechSynthesizer();
          const voiceInput = new SimulatedVoiceAdapter({ defaultTranscript: verse.text });
          const startSpy = jest.spyOn(voiceInput, 'start');
          const session = createTestSession(verse, { voiceInput, synthesizer, autoVocalizeOnLevel1: false });

          await session.vocalize();
          expect(synthesizer.getSpokenUtterances()[0]).toMatchObject({
            text: verse.text,
            options: { language: speech },
          });

          await session.startReciting();
          expect(startSpy).toHaveBeenCalledWith(expect.objectContaining({ language: recognizer, prompt }));
          const result = await session.stopAndVerify();
          expect(result?.score).toBe(100);
          session.dispose();
        }
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
          recognizer: 'simulated',
          requestPermissions: jest.fn().mockResolvedValue(true),
          start: jest.fn().mockResolvedValue(undefined),
          stop: jest.fn().mockResolvedValue({ transcript: 'O Senhor é o meu pastor, nada me faltará.' }),
          cancel: jest.fn().mockResolvedValue(undefined),
        };

        stubRecordAttempt();

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
          recognizer: 'simulated',
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
          recognizer: 'simulated',
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
          recognizer: 'simulated',
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
      result: { score: number; passed: boolean; outcome: string; tokens: { word: string; status: string }[] },
      text: string
    ) {
      expect(result.tokens.filter((t) => t.status !== 'correct')).toEqual([]);
      expect(result.tokens.map((t) => t.word)).toEqual(canonicalWords(text));
      expect(result.score).toBe(100);
      expect(result.outcome).toBe('clean');
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

describe('RecitationSession: Review Log and Official Review Classification (Ticket 72)', () => {
  const PSALM_23_1 = {
    reference: 'Psalm 23:1',
    text: 'The Lord is my shepherd; I shall not want.',
    translation: 'WEB',
  };
  const DUE_TODAY = { intervalDays: 1, streak: 1, easeFactor: 2.5, nextReviewDate: '2026-10-09' };
  const NOT_YET_DUE = { ...DUE_TODAY, nextReviewDate: '2026-10-10' };

  /**
   * A stored verse with a real Verse Engine and a real free-tier Subscription Service on
   * in-memory storage, the simulated voice input, and a clock the test moves by hand.
   */
  async function setup(srs: typeof DUE_TODAY = DUE_TODAY) {
    const engine = new VerseEngine(new MapStorageAdapter());
    const added = await engine.addVerse(PSALM_23_1);
    const verse = await engine.updateVerse(added.id, { srs });
    const subscription = new SubscriptionService(new MapStorageAdapter());
    const clock = { now: new Date(2026, 9, 9, 7, 30) };
    const speech = { transcript: verse.text };

    const open = (options: RecitationSessionOptions = {}) =>
      new RecitationSession(verse, {
        verseEngine: engine,
        subscriptionService: subscription,
        voiceInput: new SimulatedVoiceAdapter({ handler: () => speech.transcript }),
        synthesizer: new MockSpeechSynthesizer(),
        autoVocalizeOnLevel1: false,
        now: () => clock.now,
        ...options,
      });

    return {
      engine,
      verse,
      clock,
      speech,
      open,
      storedSrs: async () => (await engine.getAllVerses())[0].srs,
      log: () => engine.getReviewLog(verse.id),
      quotaUsed: async () => DAILY_LIMIT - (await subscription.getRemainingFreeRecitations(clock.now)),
    };
  }

  async function recite(session: RecitationSession) {
    await session.startReciting();
    const result = await session.stopAndVerify();
    if (!result) throw new Error(`Recitation was not verified: ${session.getState().errorMessage}`);
    return result;
  }

  it('the first Blind Recitation of a Due Verse is the Official Review: it moves the schedule and is logged', async () => {
    const t = await setup();
    const session = t.open();

    const result = await recite(session);

    expect(result.kind).toBe('official');
    expect(result.srsResult).toMatchObject({ intervalDays: 6, nextReviewDate: '2026-10-15' });
    expect(session.getState().officialResult).toEqual(result);
    expect(await t.storedSrs()).toMatchObject({ intervalDays: 6, nextReviewDate: '2026-10-15' });
    expect(await t.log()).toEqual([
      expect.objectContaining({
        kind: 'official',
        level: 3,
        studyDay: '2026-10-09',
        reviewedAt: t.clock.now.toISOString(),
        recognizer: 'simulated',
        rawScore: 100,
        wasDue: true,
      }),
    ]);
    expect(await t.quotaUsed()).toBe(1);
    await session.dispose();
  });

  it('Practice Again on a Due Verse is a Practice Attempt: the schedule stays and officialResult keeps the first attempt', async () => {
    const t = await setup();
    const session = t.open();
    const official = await recite(session);
    const scheduled = await t.storedSrs();

    session.practiceAgain();
    t.clock.now = new Date(2026, 9, 9, 7, 35);
    t.speech.transcript = 'The Lord is my shepherd';
    const again = await recite(session);

    expect(again.kind).toBe('practice');
    // Graded as forgotten (4 of 9 words missed), yet practice never moves the schedule.
    expect(again.outcome).toBe('forgotten');
    expect(again.passed).toBe(false);
    expect(again.srsResult).toMatchObject({ intervalDays: 6, nextReviewDate: '2026-10-15' });
    expect(session.getState().currentResult).toEqual(again);
    expect(session.getState().officialResult).toEqual(official);
    expect(await t.storedSrs()).toEqual(scheduled);
    expect((await t.log()).map((row) => row.kind)).toEqual(['official', 'practice']);
    // Quota metering is unchanged: every metered Blind Recitation uses a unit.
    expect(await t.quotaUsed()).toBe(2);
    await session.dispose();
  });

  it('a Blind Recitation of a verse that is not yet due is a Practice Attempt', async () => {
    const t = await setup(NOT_YET_DUE);
    const session = t.open({ isUnmetered: true }); // as the Home Screen opens a verse that is not due

    const result = await recite(session);

    expect(result.kind).toBe('practice');
    expect(result.passed).toBe(true);
    expect(session.getState().officialResult).toBeNull();
    expect(await t.storedSrs()).toMatchObject(NOT_YET_DUE);
    expect(await t.log()).toEqual([expect.objectContaining({ kind: 'practice', level: 3, wasDue: false })]);
    expect(await t.quotaUsed()).toBe(0);
    await session.dispose();
  });

  it('the unmetered flag only skips quota: it neither makes nor prevents an Official Review', async () => {
    const due = await setup();
    const unmetered = due.open({ isUnmetered: true });
    expect((await recite(unmetered)).kind).toBe('official');
    expect(await due.quotaUsed()).toBe(0);

    const notDue = await setup(NOT_YET_DUE);
    const metered = notDue.open();
    expect((await recite(metered)).kind).toBe('practice');
    expect(await notDue.storedSrs()).toMatchObject(NOT_YET_DUE);

    await unmetered.dispose();
    await metered.dispose();
  });

  it('Echo Mode and Cloze Practice recitations are logged as Practice Attempts and leave the Official Review for Level 3', async () => {
    const t = await setup();
    const session = t.open({ initialLevel: 1 });

    const echo = await recite(session);
    session.nextLevel();
    session.tapWord(0);
    session.tapWord(1);
    const cloze = await recite(session);
    expect(echo.kind).toBe('practice');
    expect(cloze.kind).toBe('practice');
    expect(session.getState().officialResult).toBeNull();
    expect(await t.storedSrs()).toMatchObject(DUE_TODAY);

    session.nextLevel();
    const blind = await recite(session);
    expect(blind.kind).toBe('official');
    expect(session.getState().officialResult).toEqual(blind);

    expect(
      (await t.log()).map((row) => ({ level: row.level, kind: row.kind, clozeRevealCount: row.clozeRevealCount }))
    ).toEqual([
      { level: 1, kind: 'practice', clozeRevealCount: undefined },
      { level: 2, kind: 'practice', clozeRevealCount: 2 },
      { level: 3, kind: 'official', clozeRevealCount: undefined },
    ]);
    expect(await t.quotaUsed()).toBe(1);
    await session.dispose();
  });

  it('listening in Echo Mode without reciting, or cancelling a recitation, is not logged', async () => {
    const t = await setup();
    const session = t.open({ initialLevel: 1 });

    await session.vocalize();
    await session.startReciting();
    await session.cancelRecitation();

    expect(await t.log()).toEqual([]);
    await session.dispose();
  });

  it('logs the peeked word positions and the duration measured on the injected clock', async () => {
    const t = await setup();
    const session = t.open();

    session.tapWord(4);
    session.tapWord(2);
    session.tapWord(4);
    await session.startReciting();
    t.clock.now = new Date(2026, 9, 9, 7, 30, 6);
    const result = await session.stopAndVerify();

    // Two peeked words in a 9-word verse (budget 1): forgotten, though every word was recited.
    expect(result).toMatchObject({ score: 100, errorCount: 2, errorBudget: 1, outcome: 'forgotten', passed: false });
    const [row] = await t.log();
    expect(row.peekedWordPositions).toEqual([2, 4]);
    expect(row).toMatchObject({ outcome: 'forgotten', errorCount: 2, sm2Quality: 2, after: { intervalDays: 1, easeFactor: 2.18 } });
    expect(row.durationMs).toBe(6000);
    expect(row.reviewedAt).toBe(t.clock.now.toISOString());
    await session.dispose();
  });

  it('the injected clock decides the Study Day: a forgotten verse is practice until 04:00, then official again', async () => {
    const t = await setup();
    t.speech.transcript = 'I do not remember';
    const first = t.open();
    expect(await recite(first)).toMatchObject({ kind: 'official', passed: false });
    expect((await t.storedSrs())?.nextReviewDate).toBe('2026-10-10');

    t.speech.transcript = PSALM_23_1.text;
    t.clock.now = new Date(2026, 9, 10, 3, 59);
    first.practiceAgain();
    expect((await recite(first)).kind).toBe('practice');

    t.clock.now = new Date(2026, 9, 10, 4, 0);
    const nextDay = t.open();
    expect((await recite(nextDay)).kind).toBe('official');

    expect((await t.log()).map((row) => [row.studyDay, row.kind])).toEqual([
      ['2026-10-09', 'official'],
      ['2026-10-09', 'practice'],
      ['2026-10-10', 'official'],
    ]);
    await first.dispose();
    await nextDay.dispose();
  });

  it('in sandbox mode nothing is recorded, because the sandbox verse is not stored yet', async () => {
    const t = await setup();
    const sandboxVerse: Verse = { id: 'sandbox-psalm-23-1', ...PSALM_23_1 };
    const recordSpy = jest.spyOn(t.engine, 'recordAttempt');
    const session = new RecitationSession(sandboxVerse, {
      verseEngine: t.engine,
      subscriptionService: new SubscriptionService(new MapStorageAdapter()),
      voiceInput: new SimulatedVoiceAdapter({ defaultTranscript: PSALM_23_1.text }),
      synthesizer: new MockSpeechSynthesizer(),
      autoVocalizeOnLevel1: false,
      isSandbox: true,
      now: () => t.clock.now,
    });

    const echo = await recite(session);
    session.setLevel(3);
    const blind = await recite(session);

    expect(echo.kind).toBe('practice');
    expect(blind).toMatchObject({ kind: 'practice', score: 100, outcome: 'clean', passed: true });
    expect(session.getState().status).toBe('verified');
    expect(session.getState().officialResult).toBeNull();
    expect(recordSpy).not.toHaveBeenCalled();
    expect(await t.engine.getReviewLog(sandboxVerse.id)).toEqual([]);
    await session.dispose();
  });
});

describe('RecitationSession: Error Budget Grading (Ticket 73)', () => {
  /** 20 words, so the Error Budget is 1. */
  const PSALM_8_1 = {
    reference: 'Psalm 8:1',
    translation: 'WEB',
    text: 'Yahweh, our Lord, how majestic is your name in all the earth! You have set your glory above the heavens!',
  };
  /** 25 words, so the Error Budget is still 1. */
  const PSALM_30_12 = {
    reference: 'Psalm 30:12',
    translation: 'WEB',
    text: 'to the end that my heart may sing praise to you, and not be silent. Yahweh my God, I will give thanks to you forever!',
  };
  /**
   * 39 written words but 40 diff words ("well-watered" is two), so the Error Budget is 2 and
   * every Cloze token after "well-watered" sits one canonical position further on.
   */
  const GENESIS_13_10 = {
    reference: 'Genesis 13:10',
    translation: 'WEB',
    text: 'Lot lifted up his eyes, and saw all the plain of the Jordan, that it was well-watered everywhere, before Yahweh destroyed Sodom and Gomorrah, like the garden of Yahweh, like the land of Egypt, as you go to Zoar.',
  };
  const DUE_TODAY = { intervalDays: 6, streak: 2, easeFactor: 2.5, nextReviewDate: '2026-10-09' };

  /**
   * A stored Due Verse, a real Verse Engine and Subscription Service on in-memory storage, and a
   * fixed clock. The engine's random source gives a fuzz factor of exactly 1 (Ticket 76).
   */
  async function setup(verseData: { reference: string; translation: string; text: string }) {
    const engine = new VerseEngine(new MapStorageAdapter(), { random: () => 0.5 });
    const added = await engine.addVerse(verseData);
    const verse = await engine.updateVerse(added.id, { srs: DUE_TODAY });
    const clock = { now: new Date(2026, 9, 9, 7, 30) };
    const speech = { transcript: verse.text };
    const session = new RecitationSession(verse, {
      verseEngine: engine,
      subscriptionService: new SubscriptionService(new MapStorageAdapter({ user_is_subscribed: 'true' })),
      voiceInput: new SimulatedVoiceAdapter({ handler: () => speech.transcript }),
      synthesizer: new MockSpeechSynthesizer(),
      autoVocalizeOnLevel1: false,
      now: () => clock.now,
    });
    return {
      engine,
      verse,
      clock,
      speech,
      session,
      storedSrs: async () => (await engine.getAllVerses())[0].srs,
      log: () => engine.getReviewLog(verse.id),
    };
  }

  async function recite(session: RecitationSession, transcript?: { transcript: string }, text?: string) {
    if (transcript && text !== undefined) transcript.transcript = text;
    await session.startReciting();
    const result = await session.stopAndVerify();
    if (!result) throw new Error(`Recitation was not verified: ${session.getState().errorMessage}`);
    return result;
  }

  /** The verse with the given words (as the transcript would say them) left out. */
  const without = (text: string, ...words: string[]) =>
    text
      .split(/\s+/)
      .filter((word) => !words.includes(word))
      .join(' ');

  /** Index of a written (Cloze) word in the verse text. */
  const clozeIndexOf = (text: string, word: string) => text.split(/\s+/).indexOf(word);

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('missed and added words', () => {
    it('missing 6 of 20 words is forgotten: back to 1 Study Day, with ease lowered by 0.32', async () => {
      const t = await setup(PSALM_8_1);

      const result = await recite(
        t.session,
        t.speech,
        without(PSALM_8_1.text, 'our', 'majestic', 'name', 'earth!', 'set', 'above')
      );

      expect(result).toMatchObject({ kind: 'official', outcome: 'forgotten', passed: false, errorCount: 6, errorBudget: 1 });
      // The F1 score that used to pass at 80 is still shown, but no longer grades.
      expect(result.score).toBe(82);
      expect(await t.storedSrs()).toMatchObject({ streak: 0, intervalDays: 1, easeFactor: 2.18, nextReviewDate: '2026-10-10' });
      expect(await t.log()).toEqual([
        expect.objectContaining({ kind: 'official', outcome: 'forgotten', errorCount: 6, errorBudget: 1, sm2Quality: 2, rawScore: 82 }),
      ]);
      await t.session.dispose();
    });

    it('missing 1 of 25 words is a slip: recalled, with the interval grown and ease unchanged', async () => {
      const t = await setup(PSALM_30_12);

      const result = await recite(t.session, t.speech, without(PSALM_30_12.text, 'silent.'));

      expect(result).toMatchObject({ kind: 'official', outcome: 'slip', passed: true, errorCount: 1, errorBudget: 1 });
      expect(await t.storedSrs()).toMatchObject({ streak: 3, intervalDays: 15, easeFactor: 2.5, nextReviewDate: '2026-10-24' });
      expect((await t.log())[0]).toMatchObject({ outcome: 'slip', sm2Quality: 4 });
      await t.session.dispose();
    });

    it('a perfect recitation is clean: quality 5 raises ease by 0.10', async () => {
      const t = await setup(PSALM_8_1);

      const result = await recite(t.session);

      expect(result).toMatchObject({ outcome: 'clean', passed: true, errorCount: 0, errorBudget: 1, score: 100 });
      expect(await t.storedSrs()).toMatchObject({ streak: 3, intervalDays: 15, easeFactor: 2.6 });
      expect((await t.log())[0]).toMatchObject({ outcome: 'clean', sm2Quality: 5 });
      await t.session.dispose();
    });

    it('a perfect recitation with 2 filler words is clean, and with 3 it is a slip', async () => {
      const two = await setup(PSALM_8_1);
      const three = await setup(PSALM_8_1);

      const withTwo = await recite(two.session, two.speech, `uh ${PSALM_8_1.text} um`);
      const withThree = await recite(three.session, three.speech, `uh ${PSALM_8_1.text} um amen`);

      expect(withTwo).toMatchObject({ outcome: 'clean', errorCount: 0 });
      expect(withTwo.score).toBeLessThan(100);
      expect(withThree).toMatchObject({ outcome: 'slip', errorCount: 1 });
      await two.session.dispose();
      await three.session.dispose();
    });

    it('a synonym or two swapped words count as errors, and both together are over the budget', async () => {
      const synonym = await setup(PSALM_8_1);
      const swapped = await setup(PSALM_8_1);
      const both = await setup(PSALM_8_1);
      const withSynonym = PSALM_8_1.text.replace('majestic', 'wonderful');

      const synonymResult = await recite(synonym.session, synonym.speech, withSynonym);
      const swappedResult = await recite(swapped.session, swapped.speech, PSALM_8_1.text.replace('our Lord', 'Lord our'));
      const bothResult = await recite(both.session, both.speech, withSynonym.replace('our Lord', 'Lord our'));

      expect(synonymResult).toMatchObject({ outcome: 'slip', errorCount: 1 });
      expect(swappedResult.outcome).toBe('slip');
      expect(swappedResult.errorCount).toBeGreaterThanOrEqual(1);
      expect(bothResult.outcome).toBe('forgotten');
      await synonym.session.dispose();
      await swapped.session.dispose();
      await both.session.dispose();
    });
  });

  describe('Word Peek Lifeline', () => {
    it('one peek in a 40-word verse with the rest perfect is a slip', async () => {
      const t = await setup(GENESIS_13_10);

      t.session.tapWord(clozeIndexOf(GENESIS_13_10.text, 'Jordan,'));
      const result = await recite(t.session);

      expect(result).toMatchObject({ kind: 'official', outcome: 'slip', passed: true, errorCount: 1, errorBudget: 2, score: 100 });
      expect((await t.log())[0]).toMatchObject({ peekedWordPositions: [12], outcome: 'slip', sm2Quality: 4 });
      await t.session.dispose();
    });

    it('three peeks in the same verse are forgotten', async () => {
      const t = await setup(GENESIS_13_10);

      t.session.tapWord(clozeIndexOf(GENESIS_13_10.text, 'Lot'));
      t.session.tapWord(clozeIndexOf(GENESIS_13_10.text, 'Jordan,'));
      t.session.tapWord(clozeIndexOf(GENESIS_13_10.text, 'Zoar.'));
      const result = await recite(t.session);

      expect(result).toMatchObject({ kind: 'official', outcome: 'forgotten', passed: false, errorCount: 3, score: 100 });
      expect(await t.storedSrs()).toMatchObject({ streak: 0, intervalDays: 1, easeFactor: 2.18 });
      await t.session.dispose();
    });

    it('a peek after a hyphenated word lines up with the canonical word it revealed', async () => {
      const t = await setup(GENESIS_13_10);
      const destroyed = clozeIndexOf(GENESIS_13_10.text, 'destroyed');
      expect(destroyed).toBe(20);

      // Peeked "destroyed", then still left it out: one word, so one error.
      t.session.tapWord(destroyed);
      expect(t.session.getState().peekedWordPositions).toEqual([21]);
      const result = await recite(t.session, t.speech, without(GENESIS_13_10.text, 'destroyed'));

      expect(result.tokens[21]).toEqual({ word: 'destroyed', status: 'missed' });
      expect(result).toMatchObject({ outcome: 'slip', errorCount: 1, errorBudget: 2 });
      expect((await t.log())[0].peekedWordPositions).toEqual([21]);
      await t.session.dispose();
    });

    it('peeking a hyphenated word counts each of the words it revealed', async () => {
      const t = await setup(GENESIS_13_10);

      t.session.tapWord(clozeIndexOf(GENESIS_13_10.text, 'well-watered'));
      const peekOnly = await recite(t.session);

      expect(t.session.getState().peekedWordPositions).toEqual([16, 17]);
      expect(peekOnly).toMatchObject({ outcome: 'slip', errorCount: 2, errorBudget: 2 });
      await t.session.dispose();
    });

    it('a peek still counts after the word hides again and after a cancelled recitation', async () => {
      jest.useFakeTimers();
      const t = await setup(GENESIS_13_10);

      t.session.tapWord(clozeIndexOf(GENESIS_13_10.text, 'Egypt,'));
      jest.advanceTimersByTime(3000);
      expect(t.session.getState().clozeTokens.every((token) => !token.isRevealed)).toBe(true);
      await t.session.startReciting();
      await t.session.cancelRecitation();
      jest.useRealTimers();

      const result = await recite(t.session);

      expect(result).toMatchObject({ outcome: 'slip', errorCount: 1 });
      expect((await t.log())[0].peekedWordPositions).toEqual([34]);
      await t.session.dispose();
    });

    it('peeks belong to one attempt: Practice Again and a level change clear them', async () => {
      const t = await setup(PSALM_8_1);

      t.session.tapWord(0);
      t.session.tapWord(1);
      const peeked = await recite(t.session);
      expect(peeked).toMatchObject({ kind: 'official', outcome: 'forgotten', errorCount: 2 });

      t.session.practiceAgain();
      expect(t.session.getState().peekedWordPositions).toEqual([]);
      const again = await recite(t.session);
      expect(again).toMatchObject({ kind: 'practice', outcome: 'clean', errorCount: 0 });

      t.session.practiceAgain();
      t.session.tapWord(3);
      t.session.setLevel(2);
      t.session.setLevel(3);
      expect(t.session.getState().peekedWordPositions).toEqual([]);
      const afterLevelChange = await recite(t.session);
      expect(afterLevelChange).toMatchObject({ outcome: 'clean', errorCount: 0 });

      expect((await t.log()).map((row) => [row.kind, row.outcome, row.peekedWordPositions])).toEqual([
        ['official', 'forgotten', [0, 1]],
        ['practice', 'clean', []],
        ['practice', 'clean', []],
      ]);
      await t.session.dispose();
    });

    it('a Practice Attempt is graded with its peeks but never moves the schedule', async () => {
      const t = await setup(PSALM_8_1);
      await recite(t.session);
      const scheduled = await t.storedSrs();

      t.session.practiceAgain();
      t.session.tapWord(0);
      t.session.tapWord(1);
      const practice = await recite(t.session);

      expect(practice).toMatchObject({ kind: 'practice', outcome: 'forgotten', passed: false });
      expect(practice.srsResult).toMatchObject({ intervalDays: 15, easeFactor: 2.6 });
      expect(await t.storedSrs()).toEqual(scheduled);
      expect((await t.log())[1]).toMatchObject({ kind: 'practice', outcome: 'forgotten', sm2Quality: null });
      await t.session.dispose();
    });
  });
});

describe('RecitationSession: Transcription Failures Are Never Graded (Ticket 74)', () => {
  const PSALM_23_1 = {
    reference: 'Psalm 23:1',
    text: 'The Lord is my shepherd; I shall not want.',
    translation: 'WEB',
  };
  const SALMOS_23_1 = {
    reference: 'Salmos 23:1',
    text: 'O Senhor é o meu pastor; nada me faltará.',
    translation: 'ALMEIDA',
  };
  const DUE_TODAY = { intervalDays: 6, streak: 2, easeFactor: 2.5, nextReviewDate: '2026-10-09' };

  /**
   * A stored Due Verse with a real Verse Engine and a real free-tier Subscription Service on
   * in-memory storage, a clock the test moves by hand, and speech the test controls: what the
   * simulated voice input hears, or the Transcription Error it throws.
   */
  async function setup(verseData: typeof PSALM_23_1 = PSALM_23_1) {
    const engine = new VerseEngine(new MapStorageAdapter(), { random: () => 0.5 });
    const added = await engine.addVerse(verseData);
    const verse = await engine.updateVerse(added.id, { srs: DUE_TODAY });
    const subscription = new SubscriptionService(new MapStorageAdapter());
    const clock = { now: new Date(2026, 9, 9, 7, 30) };
    const speech: { transcript: string; error?: TranscriptionError } = { transcript: verse.text };
    const session = new RecitationSession(verse, {
      verseEngine: engine,
      subscriptionService: subscription,
      voiceInput: new SimulatedVoiceAdapter({
        handler: () => {
          if (speech.error) throw speech.error;
          return speech.transcript;
        },
      }),
      synthesizer: new MockSpeechSynthesizer(),
      autoVocalizeOnLevel1: false,
      now: () => clock.now,
    });

    return {
      engine,
      verse,
      clock,
      speech,
      session,
      storedSrs: async () => (await engine.getAllVerses())[0].srs,
      log: () => engine.getReviewLog(verse.id),
      quotaUsed: async () => DAILY_LIMIT - (await subscription.getRemainingFreeRecitations(clock.now)),
    };
  }

  /** Recites until the attempt ends, verified or not. */
  async function attempt(session: RecitationSession) {
    await session.startReciting();
    return session.stopAndVerify();
  }

  it('an empty transcript on the Official Review is not graded or scheduled: the quota unit is refunded and the attempt is logged with its code', async () => {
    const t = await setup();
    const scheduled = await t.storedSrs();
    t.speech.transcript = '';

    await t.session.startReciting();
    expect(await t.quotaUsed()).toBe(1);
    t.clock.now = new Date(2026, 9, 9, 7, 30, 5);
    const result = await t.session.stopAndVerify();

    expect(result).toBeNull();
    expect(t.session.getState()).toMatchObject({
      status: 'error',
      transcriptionErrorCode: 'unintelligible',
      errorMessage:
        'Could not transcribe audio. Please speak clearly and try again. Nothing was counted and no recitation was used.',
      currentResult: null,
      officialResult: null,
    });
    expect(await t.quotaUsed()).toBe(0);
    expect(await t.storedSrs()).toEqual(scheduled);
    expect(await t.log()).toEqual([
      expect.objectContaining({
        kind: 'practice',
        level: 3,
        studyDay: '2026-10-09',
        durationMs: 5000,
        wordCount: 9,
        recognizer: 'simulated',
        transcriptionErrorCode: 'unintelligible',
        outcome: null,
        errorCount: null,
        errorBudget: null,
        sm2Quality: null,
        wasDue: true,
        before: { intervalDays: 6, easeFactor: 2.5 },
        after: { intervalDays: 6, easeFactor: 2.5 },
        dueStudyDayAfter: '2026-10-09',
      }),
    ]);
    expect((await t.engine.getHabitStats(t.clock.now)).completedTodayCount).toBe(0);
    await t.session.dispose();
  });

  it('the retry after a Transcription Error is still the day’s Official Review', async () => {
    const t = await setup();
    t.speech.transcript = '';
    await attempt(t.session);

    t.speech.transcript = PSALM_23_1.text;
    const retry = await attempt(t.session);

    expect(retry).toMatchObject({ kind: 'official', outcome: 'clean', passed: true });
    expect(t.session.getState()).toMatchObject({ status: 'verified', transcriptionErrorCode: null, errorMessage: null });
    expect(await t.storedSrs()).toMatchObject({ intervalDays: 15, nextReviewDate: '2026-10-24' });
    expect((await t.log()).map((row) => [row.kind, row.outcome, row.transcriptionErrorCode])).toEqual([
      ['practice', null, 'unintelligible'],
      ['official', 'clean', undefined],
    ]);
    expect(await t.quotaUsed()).toBe(1);
    await t.session.dispose();
  });

  it.each([
    ['blank', '   '],
    ['punctuation only', '... — ?!'],
  ])('a transcript with no words to compare (%s) is a Transcription Error', async (_case, transcript) => {
    const t = await setup();
    t.speech.transcript = transcript;

    expect(await attempt(t.session)).toBeNull();

    expect(t.session.getState().transcriptionErrorCode).toBe('unintelligible');
    expect((await t.log()).map((row) => [row.outcome, row.transcriptionErrorCode])).toEqual([
      [null, 'unintelligible'],
    ]);
    expect(await t.quotaUsed()).toBe(0);
    await t.session.dispose();
  });

  it('a transcript holding only the spoken reference is graded: the learner spoke, so it is not a Transcription Error', async () => {
    const t = await setup();
    t.speech.transcript = 'Psalm 23:1';

    const result = await attempt(t.session);

    expect(result).toMatchObject({ kind: 'official', outcome: 'forgotten', errorCount: 9 });
    expect(await t.quotaUsed()).toBe(1);
    await t.session.dispose();
  });

  it('a recognizer error is refunded and logged with its code, and the retry message speaks the verse’s language', async () => {
    const t = await setup(SALMOS_23_1);
    t.speech.error = new TranscriptionError('network_error', 'Network request failed');

    expect(await attempt(t.session)).toBeNull();

    expect(t.session.getState()).toMatchObject({
      status: 'error',
      transcriptionErrorCode: 'network_error',
      errorMessage:
        'Falha na conexão de rede. Verifique sua conexão com a internet. Nada foi contado e nenhuma recitação foi usada.',
    });
    expect(await t.quotaUsed()).toBe(0);
    expect(await t.log()).toEqual([
      expect.objectContaining({ kind: 'practice', transcriptionErrorCode: 'network_error', outcome: null, sm2Quality: null }),
    ]);
    await t.session.dispose();
  });

  it('an unmetered attempt that ends in a Transcription Error refunds nothing, since it used nothing', async () => {
    const t = await setup();
    await attempt(t.session);
    expect(await t.quotaUsed()).toBe(1);

    t.session.setLevel(2);
    t.speech.transcript = '';
    expect(await attempt(t.session)).toBeNull();

    expect(await t.quotaUsed()).toBe(1);
    expect((await t.log()).map((row) => [row.kind, row.level, row.transcriptionErrorCode])).toEqual([
      ['official', 3, undefined],
      ['practice', 2, 'unintelligible'],
    ]);
    await t.session.dispose();
  });

  it('in sandbox mode a Transcription Error shows the retry message and records nothing', async () => {
    const t = await setup();
    const recordSpy = jest.spyOn(t.engine, 'recordTranscriptionError');
    const session = new RecitationSession(
      { id: 'sandbox-psalm-23-1', ...PSALM_23_1 },
      {
        verseEngine: t.engine,
        subscriptionService: new SubscriptionService(new MapStorageAdapter()),
        voiceInput: new SimulatedVoiceAdapter({ defaultTranscript: '' }),
        synthesizer: new MockSpeechSynthesizer(),
        autoVocalizeOnLevel1: false,
        isSandbox: true,
        initialLevel: 3,
        now: () => t.clock.now,
      }
    );

    expect(await attempt(session)).toBeNull();

    expect(session.getState()).toMatchObject({ status: 'error', transcriptionErrorCode: 'unintelligible' });
    expect(recordSpy).not.toHaveBeenCalled();
    await session.dispose();
  });
});

describe('RecitationSession: Honest Sandbox Save (Ticket 79)', () => {
  const PSALM_23_1 = {
    reference: 'Psalm 23:1',
    text: 'The Lord is my shepherd; I shall not want.',
    translation: 'WEB',
  };
  const SLIP = 'The Lord is my pastor; I shall not want.';
  const FORGOTTEN = 'The Lord is my shepherd';

  /**
   * A sandbox session on the sample verse, which is not stored, with a real Verse Engine on
   * in-memory storage, a clock the test moves by hand and speech the test controls.
   */
  function setup(options: RecitationSessionOptions = {}) {
    const engine = new VerseEngine(new MapStorageAdapter());
    const sandboxVerse: Verse = { id: 'sandbox-psalm-23-1', ...PSALM_23_1 };
    const clock = { now: new Date(2026, 11, 3, 7, 30) };
    const speech = { transcript: PSALM_23_1.text };
    const session = new RecitationSession(sandboxVerse, {
      verseEngine: engine,
      subscriptionService: new SubscriptionService(new MapStorageAdapter()),
      voiceInput: new SimulatedVoiceAdapter({ handler: () => speech.transcript }),
      synthesizer: new MockSpeechSynthesizer(),
      autoVocalizeOnLevel1: false,
      isSandbox: true,
      now: () => clock.now,
      ...options,
    });
    return { engine, sandboxVerse, clock, speech, session };
  }

  /** Recites until the attempt ends, verified or not. */
  async function attempt(session: RecitationSession) {
    await session.startReciting();
    return session.stopAndVerify();
  }

  it('records nothing and keeps the last Blind Recitation for a possible save', async () => {
    const t = setup();
    const recordSpy = jest.spyOn(t.engine, 'recordAttempt');

    await attempt(t.session); // Echo Mode
    expect(t.session.getState().sandboxAttempt).toBeNull();

    t.session.setLevel(3);
    t.session.tapWord(4);
    t.speech.transcript = PSALM_23_1.text;
    await t.session.startReciting();
    t.clock.now = new Date(2026, 11, 3, 7, 30, 6);
    const blind = await t.session.stopAndVerify();

    // One peeked word in a 9-word verse (budget 1): a slip.
    expect(blind).toMatchObject({ kind: 'practice', outcome: 'slip', errorCount: 1, errorBudget: 1 });
    expect(t.session.getState().sandboxAttempt).toEqual({
      level: 3,
      evaluation: {
        tokens: blind!.tokens,
        rawScore: 100,
        errorCount: 1,
        errorBudget: 1,
        outcome: 'slip',
      },
      peekedWordPositions: [4],
      recognizer: 'simulated',
      durationMs: 6000,
      now: t.clock.now,
    });
    expect(t.session.getState().officialResult).toBeNull();
    expect(recordSpy).not.toHaveBeenCalled();
    expect(await t.engine.getAllVerses()).toEqual([]);
    expect(await t.engine.getReviewLog(t.sandboxVerse.id)).toEqual([]);
    await t.session.dispose();
  });

  it('keeps only the last Blind Recitation: Echo, Cloze or a Transcription Error leave it in place', async () => {
    const t = setup({ initialLevel: 3 });

    await attempt(t.session);
    expect(t.session.getState().sandboxAttempt?.evaluation.outcome).toBe('clean');

    t.session.practiceAgain();
    t.speech.transcript = FORGOTTEN;
    await attempt(t.session);
    expect(t.session.getState().sandboxAttempt?.evaluation.outcome).toBe('forgotten');

    t.speech.transcript = PSALM_23_1.text;
    t.session.setLevel(1);
    await attempt(t.session);
    t.session.setLevel(2);
    await attempt(t.session);
    t.session.setLevel(3);
    t.speech.transcript = '';
    expect(await attempt(t.session)).toBeNull();
    expect(t.session.getState().transcriptionErrorCode).toBe('unintelligible');
    await t.session.reset();

    expect(t.session.getState().sandboxAttempt?.evaluation.outcome).toBe('forgotten');
    await t.session.dispose();
  });

  it('a session outside the sandbox keeps nothing: the Verse Engine records its attempts', async () => {
    const engine = new VerseEngine(new MapStorageAdapter());
    const verse = await engine.addVerse(PSALM_23_1);
    const session = new RecitationSession(verse, {
      verseEngine: engine,
      subscriptionService: new SubscriptionService(new MapStorageAdapter({ user_is_subscribed: 'true' })),
      voiceInput: new SimulatedVoiceAdapter({ defaultTranscript: PSALM_23_1.text }),
      synthesizer: new MockSpeechSynthesizer(),
    });

    await attempt(session);

    expect(session.getState().sandboxAttempt).toBeNull();
    expect(await engine.getReviewLog(verse.id)).toHaveLength(1);
    await session.dispose();
  });

  it('saving hands the kept attempt to the Verse Engine: a new, due verse whose Review Log holds it as practice', async () => {
    const t = setup({ initialLevel: 3 });
    t.speech.transcript = SLIP;
    const recitedAt = t.clock.now;
    await attempt(t.session);

    t.clock.now = new Date(2026, 11, 3, 7, 31);
    const saved = await t.engine.addVerse(PSALM_23_1, {
      sandboxAttempt: t.session.getState().sandboxAttempt,
      now: t.clock.now,
    });

    expect(saved.srs).toMatchObject({ streak: 0, intervalDays: 0, easeFactor: 2.5, nextReviewDate: '2026-12-03' });
    expect(await t.engine.getReviewLog(saved.id)).toEqual([
      expect.objectContaining({
        kind: 'practice',
        level: 3,
        reviewedAt: recitedAt.toISOString(),
        outcome: 'slip',
        errorCount: 1,
        errorBudget: 1,
        rawScore: 89,
        recognizer: 'simulated',
        sm2Quality: null,
      }),
    ]);
    await t.session.dispose();
  });
});

describe('RecitationSession: Same-Day Relearning (Ticket 78)', () => {
  const PSALM_23_1 = {
    reference: 'Psalm 23:1',
    text: 'The Lord is my shepherd; I shall not want.',
    translation: 'WEB',
  };
  const SLIP = 'The Lord is my pastor; I shall not want.';
  const FORGOTTEN = 'The Lord is my shepherd';
  const DUE_TODAY = { intervalDays: 6, streak: 2, easeFactor: 2.5, nextReviewDate: '2026-10-09' };
  const NOT_YET_DUE = { ...DUE_TODAY, nextReviewDate: '2026-10-10' };
  /** The schedule after a forgotten Official Review of DUE_TODAY: back to 1 Study Day, due tomorrow. */
  const AFTER_FORGOTTEN = { streak: 0, intervalDays: 1, easeFactor: 2.18, nextReviewDate: '2026-10-10' };

  /**
   * A stored verse with a real Verse Engine and a real free-tier Subscription Service on
   * in-memory storage, a clock the test moves by hand, and speech the test controls: what the
   * simulated voice input hears on each attempt.
   */
  async function setup(srs: typeof DUE_TODAY = DUE_TODAY, options: RecitationSessionOptions = {}) {
    const engine = new VerseEngine(new MapStorageAdapter(), { random: () => 0.5 });
    const added = await engine.addVerse(PSALM_23_1);
    const verse = await engine.updateVerse(added.id, { srs });
    const subscription = new SubscriptionService(new MapStorageAdapter());
    const clock = { now: new Date(2026, 9, 9, 7, 30) };
    const speech = { transcript: verse.text };
    const session = new RecitationSession(verse, {
      verseEngine: engine,
      subscriptionService: subscription,
      voiceInput: new SimulatedVoiceAdapter({ handler: () => speech.transcript }),
      synthesizer: new MockSpeechSynthesizer(),
      autoVocalizeOnLevel1: false,
      now: () => clock.now,
      ...options,
    });

    return {
      engine,
      verse,
      clock,
      speech,
      session,
      storedSrs: async () => (await engine.getAllVerses())[0].srs,
      log: () => engine.getReviewLog(verse.id),
      quotaUsed: async () => DAILY_LIMIT - (await subscription.getRemainingFreeRecitations(clock.now)),
    };
  }

  /** Recites what the learner says this time, and returns the verified result. */
  async function recite(t: { session: RecitationSession; speech: { transcript: string } }, transcript: string) {
    t.speech.transcript = transcript;
    await t.session.startReciting();
    const result = await t.session.stopAndVerify();
    if (!result) throw new Error(`Recitation was not verified: ${t.session.getState().errorMessage}`);
    return result;
  }

  /** The day's Official Review, forgotten. */
  async function forgetOfficialReview(t: Awaited<ReturnType<typeof setup>>) {
    const official = await recite(t, FORGOTTEN);
    expect(official).toMatchObject({ kind: 'official', outcome: 'forgotten', passed: false });
    expect(await t.storedSrs()).toMatchObject(AFTER_FORGOTTEN);
    return official;
  }

  it('a forgotten Official Review offers Same-Day Relearning with 2 loops', async () => {
    const t = await setup();
    expect(t.session.getState().relearning).toBeNull();

    const official = await forgetOfficialReview(t);

    expect(official.isRelearning).toBe(false);
    expect(t.session.getState()).toMatchObject({
      level: 3,
      status: 'verified',
      relearning: { offered: true, loopsRemaining: 2, active: false },
    });
    await t.session.dispose();
  });

  it.each([
    ['clean', PSALM_23_1.text],
    ['slip', SLIP],
  ])('a recalled (%s) Official Review offers nothing', async (outcome, transcript) => {
    const t = await setup();

    expect(await recite(t, transcript)).toMatchObject({ kind: 'official', outcome });

    expect(t.session.getState().relearning).toBeNull();
    await t.session.dispose();
  });

  it('a forgotten Practice Attempt offers nothing: neither a verse not yet due, nor a later attempt the same day', async () => {
    const notDue = await setup(NOT_YET_DUE);
    expect(await recite(notDue, FORGOTTEN)).toMatchObject({ kind: 'practice', outcome: 'forgotten' });
    expect(notDue.session.getState().relearning).toBeNull();

    const due = await setup();
    await recite(due, PSALM_23_1.text);
    due.session.practiceAgain();
    expect(await recite(due, FORGOTTEN)).toMatchObject({ kind: 'practice', outcome: 'forgotten' });
    expect(due.session.getState().relearning).toBeNull();

    await notDue.session.dispose();
    await due.session.dispose();
  });

  it('in sandbox mode nothing is offered, since nothing there is an Official Review', async () => {
    const t = await setup(DUE_TODAY, { isSandbox: true, initialLevel: 3 });

    expect(await recite(t, FORGOTTEN)).toMatchObject({ kind: 'practice', outcome: 'forgotten' });

    expect(t.session.getState().relearning).toBeNull();
    await t.session.dispose();
  });

  it('accepting moves to Cloze Practice, then Blind Recitation; a recall ends relearning and the verse is still due tomorrow', async () => {
    const t = await setup();
    await forgetOfficialReview(t);
    const scheduled = await t.storedSrs();

    t.session.acceptRelearning();
    expect(t.session.getState()).toMatchObject({
      level: 2,
      status: 'idle',
      currentResult: null,
      relearning: { offered: false, loopsRemaining: 2, active: true },
    });

    t.clock.now = new Date(2026, 9, 9, 7, 32);
    const cloze = await recite(t, PSALM_23_1.text);
    expect(cloze).toMatchObject({ kind: 'practice', passed: true, isRelearning: true });
    // Cloze Practice uses no loop.
    expect(t.session.getState().relearning).toEqual({ offered: false, loopsRemaining: 2, active: true });

    t.session.nextLevel();
    expect(t.session.getState().level).toBe(3);
    t.clock.now = new Date(2026, 9, 9, 7, 34);
    const blind = await recite(t, SLIP);

    expect(blind).toMatchObject({ kind: 'practice', outcome: 'slip', passed: true, isRelearning: true });
    expect(blind.srsResult).toMatchObject({ intervalDays: 1, nextReviewDate: '2026-10-10' });
    expect(t.session.getState().relearning).toBeNull();
    expect(t.session.getState().officialResult?.outcome).toBe('forgotten');
    expect(await t.storedSrs()).toEqual(scheduled);
    expect((await t.log()).map((row) => [row.kind, row.level, row.outcome, row.sm2Quality])).toEqual([
      ['official', 3, 'forgotten', 2],
      ['practice', 2, 'clean', null],
      ['practice', 3, 'slip', null],
    ]);
    expect((await t.log()).slice(1)).toEqual([
      expect.objectContaining({
        wasDue: false,
        before: { intervalDays: 1, easeFactor: 2.18 },
        after: { intervalDays: 1, easeFactor: 2.18 },
        dueStudyDayAfter: '2026-10-10',
      }),
      expect.objectContaining({
        wasDue: false,
        before: { intervalDays: 1, easeFactor: 2.18 },
        after: { intervalDays: 1, easeFactor: 2.18 },
        dueStudyDayAfter: '2026-10-10',
      }),
    ]);
    // Quota metering is unchanged: Cloze Practice is unmetered, every Blind Recitation is metered.
    expect(await t.quotaUsed()).toBe(2);
    await t.session.dispose();
  });

  it('each relearning Blind Recitation uses one loop: a forgotten one offers again until no loops remain', async () => {
    const t = await setup();
    await forgetOfficialReview(t);
    const scheduled = await t.storedSrs();

    t.session.acceptRelearning();
    t.session.nextLevel();
    const first = await recite(t, FORGOTTEN);
    expect(first).toMatchObject({ kind: 'practice', outcome: 'forgotten', isRelearning: true });
    expect(t.session.getState()).toMatchObject({
      level: 3,
      relearning: { offered: true, loopsRemaining: 1, active: false },
    });

    t.session.acceptRelearning();
    expect(t.session.getState()).toMatchObject({
      level: 2,
      relearning: { offered: false, loopsRemaining: 1, active: true },
    });
    await recite(t, FORGOTTEN); // Cloze Practice
    t.session.nextLevel();
    const second = await recite(t, FORGOTTEN);

    expect(second).toMatchObject({ kind: 'practice', outcome: 'forgotten', isRelearning: true });
    expect(t.session.getState().relearning).toBeNull();

    // With no loops left there is nothing to accept.
    t.session.acceptRelearning();
    expect(t.session.getState()).toMatchObject({ level: 3, status: 'verified', relearning: null });

    expect(await t.storedSrs()).toEqual(scheduled);
    expect(await t.storedSrs()).toMatchObject({ intervalDays: 1, nextReviewDate: '2026-10-10' });
    expect((await t.log()).map((row) => [row.kind, row.level])).toEqual([
      ['official', 3],
      ['practice', 3],
      ['practice', 2],
      ['practice', 3],
    ]);
    await t.session.dispose();
  });

  it('declining clears the offer, and later attempts are ordinary practice', async () => {
    const t = await setup();
    await forgetOfficialReview(t);

    t.session.declineRelearning();
    expect(t.session.getState()).toMatchObject({ level: 3, status: 'verified', relearning: null });

    t.session.practiceAgain();
    const again = await recite(t, FORGOTTEN);
    expect(again).toMatchObject({ kind: 'practice', outcome: 'forgotten', isRelearning: false });
    expect(t.session.getState().relearning).toBeNull();
    expect(await t.storedSrs()).toMatchObject(AFTER_FORGOTTEN);
    await t.session.dispose();
  });

  it('declining a second offer ends relearning too', async () => {
    const t = await setup();
    await forgetOfficialReview(t);
    t.session.acceptRelearning();
    t.session.nextLevel();
    await recite(t, FORGOTTEN);
    expect(t.session.getState().relearning).toEqual({ offered: true, loopsRemaining: 1, active: false });

    t.session.declineRelearning();

    expect(t.session.getState().relearning).toBeNull();
    await t.session.dispose();
  });

  it('moving on without answering withdraws the offer: Practice Again, a level change or a reset', async () => {
    const practiced = await setup();
    await forgetOfficialReview(practiced);
    practiced.session.practiceAgain();
    expect(practiced.session.getState().relearning).toBeNull();

    const switched = await setup();
    await forgetOfficialReview(switched);
    switched.session.setLevel(1);
    expect(switched.session.getState().relearning).toBeNull();

    const reset = await setup();
    await forgetOfficialReview(reset);
    await reset.session.reset();
    expect(reset.session.getState().relearning).toBeNull();

    await practiced.session.dispose();
    await switched.session.dispose();
    await reset.session.dispose();
  });

  it('once accepted, relearning survives level changes and Practice Again until a Blind Recitation uses a loop', async () => {
    const t = await setup();
    await forgetOfficialReview(t);
    t.session.acceptRelearning();

    t.session.setLevel(1);
    await recite(t, PSALM_23_1.text);
    t.session.practiceAgain();
    t.session.setLevel(3);
    expect(t.session.getState().relearning).toEqual({ offered: false, loopsRemaining: 2, active: true });

    const blind = await recite(t, PSALM_23_1.text);

    expect(blind).toMatchObject({ kind: 'practice', outcome: 'clean', isRelearning: true });
    expect(t.session.getState().relearning).toBeNull();
    await t.session.dispose();
  });

  it('a Transcription Error during relearning uses no loop', async () => {
    const t = await setup();
    await forgetOfficialReview(t);
    t.session.acceptRelearning();
    t.session.nextLevel();

    t.speech.transcript = '';
    await t.session.startReciting();
    expect(await t.session.stopAndVerify()).toBeNull();
    expect(t.session.getState()).toMatchObject({
      transcriptionErrorCode: 'unintelligible',
      relearning: { offered: false, loopsRemaining: 2, active: true },
    });

    expect(await recite(t, FORGOTTEN)).toMatchObject({ isRelearning: true, outcome: 'forgotten' });
    expect(t.session.getState().relearning).toEqual({ offered: true, loopsRemaining: 1, active: false });
    await t.session.dispose();
  });
});

describe('RecitationSession: Fair Metering and No Quota Leaks (Ticket 92)', () => {
  const PSALM_23_1 = {
    reference: 'Psalm 23:1',
    text: 'The Lord is my shepherd; I shall not want.',
    translation: 'WEB',
  };
  const DUE_TODAY = { intervalDays: 6, streak: 2, easeFactor: 2.5, nextReviewDate: '2026-10-09' };
  /** As the Home Screen opens a Due Verse: it never forces metering, it only declines to skip it. */
  const AS_FOR_A_DUE_VERSE = { unmetered: false };

  /**
   * A stored Due Verse with a real Verse Engine and a real free-tier Subscription Service on
   * in-memory storage, a clock the test moves by hand, and speech the test controls.
   */
  async function setup(options: RecitationSessionOptions = {}) {
    const engine = new VerseEngine(new MapStorageAdapter(), { random: () => 0.5 });
    const added = await engine.addVerse(PSALM_23_1);
    const verse = await engine.updateVerse(added.id, { srs: DUE_TODAY });
    const subscription = new SubscriptionService(new MapStorageAdapter());
    const clock = { now: new Date(2026, 9, 9, 7, 30) };
    const speech = { transcript: verse.text };
    const voiceInput = new SimulatedVoiceAdapter({ handler: () => speech.transcript });
    const session = new RecitationSession(verse, {
      verseEngine: engine,
      subscriptionService: subscription,
      voiceInput,
      synthesizer: new MockSpeechSynthesizer(),
      autoVocalizeOnLevel1: false,
      now: () => clock.now,
      ...options,
    });

    return {
      engine,
      verse,
      clock,
      speech,
      voiceInput,
      session,
      log: () => engine.getReviewLog(verse.id),
      quotaUsed: async () => DAILY_LIMIT - (await subscription.getRemainingFreeRecitations(clock.now)),
    };
  }

  describe('only a Blind Recitation of a Due Verse is metered', () => {
    it('Echo Mode and Cloze Practice on a Due Verse use no quota, even when the caller does not skip it', async () => {
      const t = await setup({ initialLevel: 1 });

      await t.session.startReciting(AS_FOR_A_DUE_VERSE);
      await t.session.stopAndVerify();
      t.session.nextLevel();
      await t.session.startReciting(AS_FOR_A_DUE_VERSE);
      await t.session.stopAndVerify();

      expect(await t.quotaUsed()).toBe(0);

      t.session.nextLevel();
      await t.session.startReciting(AS_FOR_A_DUE_VERSE);
      expect((await t.session.stopAndVerify())?.kind).toBe('official');
      expect(await t.quotaUsed()).toBe(1);
      await t.session.dispose();
    });

    it('a session opened with isUnmetered: false cannot meter practice either', async () => {
      const t = await setup({ isUnmetered: false, initialLevel: 2 });

      await t.session.startReciting();
      await t.session.stopAndVerify();

      expect(await t.quotaUsed()).toBe(0);
      await t.session.dispose();
    });

    it('the Cloze step of Same-Day Relearning uses no quota', async () => {
      const t = await setup();
      t.speech.transcript = 'The Lord is my shepherd';
      await t.session.startReciting(AS_FOR_A_DUE_VERSE);
      expect((await t.session.stopAndVerify())?.outcome).toBe('forgotten');
      expect(await t.quotaUsed()).toBe(1);

      t.session.acceptRelearning();
      expect(t.session.getState().level).toBe(2);
      t.speech.transcript = PSALM_23_1.text;
      await t.session.startReciting(AS_FOR_A_DUE_VERSE);
      await t.session.stopAndVerify();

      expect(await t.quotaUsed()).toBe(1);
      await t.session.dispose();
    });

    it('a caller may still skip the quota for a Blind Recitation', async () => {
      const t = await setup();

      await t.session.startReciting({ unmetered: true });
      await t.session.stopAndVerify();

      expect(await t.quotaUsed()).toBe(0);
      await t.session.dispose();
    });
  });

  describe('a unit is spent only by a verified recitation', () => {
    it('cancelling a metered recitation refunds its unit and logs nothing', async () => {
      const t = await setup();

      await t.session.startReciting();
      expect(await t.quotaUsed()).toBe(1);
      await t.session.cancelRecitation();

      expect(t.session.getState().status).toBe('idle');
      expect(await t.quotaUsed()).toBe(0);
      expect(await t.log()).toEqual([]);
      await t.session.dispose();
    });

    it.each([
      ['reset', (session: RecitationSession) => session.reset()],
      ['dispose', (session: RecitationSession) => session.dispose()],
    ])('leaving a metered recitation unfinished (%s) refunds its unit and logs nothing', async (_case, leave) => {
      const t = await setup();

      await t.session.startReciting();
      expect(await t.quotaUsed()).toBe(1);
      await leave(t.session);

      expect(await t.quotaUsed()).toBe(0);
      expect(await t.log()).toEqual([]);
      await t.session.dispose();
    });

    it('a voice input that fails to start refunds the unit it was given', async () => {
      const t = await setup();
      jest.spyOn(t.voiceInput, 'start').mockRejectedValueOnce(new Error('Recorder busy'));

      await t.session.startReciting();

      expect(t.session.getState()).toMatchObject({ status: 'error', errorMessage: 'Recorder busy' });
      expect(await t.quotaUsed()).toBe(0);
      expect(await t.log()).toEqual([]);
      await t.session.dispose();
    });

    it('a verification that fails for another reason refunds the unit too', async () => {
      const t = await setup();
      jest.spyOn(t.voiceInput, 'stop').mockRejectedValueOnce(new Error('Recorder crashed'));

      await t.session.startReciting();
      expect(await t.session.stopAndVerify()).toBeNull();

      expect(t.session.getState().status).toBe('error');
      expect(await t.quotaUsed()).toBe(0);
      await t.session.dispose();
    });

    it('a verified recitation keeps its unit when the learner then cancels, resets or leaves', async () => {
      const t = await setup();

      await t.session.startReciting();
      expect((await t.session.stopAndVerify())?.kind).toBe('official');
      await t.session.cancelRecitation();
      await t.session.reset();
      await t.session.dispose();

      expect(await t.quotaUsed()).toBe(1);
    });
  });

  it('logs the recognizer each voice input declares, whatever adapter it is (ADR 0006)', async () => {
    const t = await setup();
    const onDevice: VoiceInput = {
      recognizer: 'native',
      requestPermissions: async () => true,
      start: async () => {},
      stop: async () => ({ transcript: PSALM_23_1.text }),
      cancel: async () => {},
    };
    const session = new RecitationSession(t.verse, {
      verseEngine: t.engine,
      subscriptionService: new SubscriptionService(new MapStorageAdapter({ user_is_subscribed: 'true' })),
      voiceInput: onDevice,
      synthesizer: new MockSpeechSynthesizer(),
      now: () => t.clock.now,
    });

    await session.startReciting();
    await session.stopAndVerify();

    expect((await t.log()).map((row) => row.recognizer)).toEqual(['native']);
    await session.dispose();
    await t.session.dispose();
  });

  describe('the no-speech timeout is a Transcription Error', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    /** Resolves once the attempt in progress has ended in an error. */
    const attemptEnded = (session: RecitationSession) =>
      new Promise<RecitationState>((resolve) => {
        session.subscribe((state) => {
          if (state.status === 'error') resolve(state);
        });
      });

    it('after 10 s with no speech: refunded, logged with its code and no outcome, and the calm notice is shown', async () => {
      const t = await setup();
      const cancelSpy = jest.spyOn(t.voiceInput, 'cancel');
      const stopSpy = jest.spyOn(t.voiceInput, 'stop');

      await t.session.startReciting();
      expect(await t.quotaUsed()).toBe(1);
      const ended = attemptEnded(t.session);

      // Calibration (300 ms), then 10 s without speech.
      t.clock.now = new Date(2026, 9, 9, 7, 30, 10);
      jest.advanceTimersByTime(300 + 10000);
      const state = await ended;

      expect(state).toMatchObject({
        status: 'error',
        transcriptionErrorCode: 'unintelligible',
        errorMessage: 'No speech detected. Tap the mic to try again. Nothing was counted and no recitation was used.',
        currentResult: null,
        officialResult: null,
      });
      expect(cancelSpy).toHaveBeenCalled();
      expect(stopSpy).not.toHaveBeenCalled();
      expect(await t.quotaUsed()).toBe(0);
      expect(await t.log()).toEqual([
        expect.objectContaining({
          kind: 'practice',
          level: 3,
          recognizer: 'simulated',
          transcriptionErrorCode: 'unintelligible',
          outcome: null,
          errorCount: null,
          sm2Quality: null,
          wasDue: true,
        }),
      ]);
      await t.session.dispose();
    });

    it('the retry after a no-speech timeout is still the day’s Official Review', async () => {
      const t = await setup();
      await t.session.startReciting();
      const ended = attemptEnded(t.session);
      jest.advanceTimersByTime(300 + 10000);
      await ended;

      await t.session.startReciting();
      const retry = await t.session.stopAndVerify();

      expect(retry).toMatchObject({ kind: 'official', outcome: 'clean' });
      expect(await t.quotaUsed()).toBe(1);
      await t.session.dispose();
    });
  });
});
