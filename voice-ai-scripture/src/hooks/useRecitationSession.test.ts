import { renderHook, act } from '@testing-library/react-native';
import { useRecitationSession } from './useRecitationSession';
import { Verse, verseEngine } from '../services/VerseEngine';
import { SubscriptionService } from '../services/SubscriptionService';
import { VoiceInput, SimulatedVoiceAdapter } from '../services/VoiceInput';
import { TranscriptionError } from '../services/SpeechTranscriber';
import { ReviewLogEntry } from '../services/ReviewLog';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('useRecitationSession hook (Ticket 08 & 12)', () => {
  const mockVerse: Verse = {
    id: '1',
    reference: 'John 3:16',
    text: 'For God so loved the world...',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes initial idle state and actions', async () => {
    const { result } = await renderHook(() => useRecitationSession(mockVerse));

    expect(result.current.status).toBe('idle');
    expect(result.current.volumeLevel).toBe(0);
    expect(result.current.result).toBeNull();
    expect(result.current.errorMessage).toBeNull();
    expect(typeof result.current.startReciting).toBe('function');
    expect(typeof result.current.stopAndVerify).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('reflects quota_exhausted status when startReciting fails quota check', async () => {
    jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      isSubscribed: false,
    });

    const { result } = await renderHook(() => useRecitationSession(mockVerse));

    await act(async () => {
      await result.current.startReciting();
    });

    expect(result.current.status).toBe('quota_exhausted');
  });

  it('verifies recitation and updates state using custom SimulatedVoiceAdapter', async () => {
    jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
      allowed: true,
      remaining: 3,
      isSubscribed: true,
    });
    const recordSpy = jest.spyOn(verseEngine, 'recordAttempt').mockImplementationOnce(async (input) => ({
      kind: 'official',
      srsResult: {
        streak: 1,
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: '2026-10-10',
        passed: input.evaluation.outcome !== 'forgotten',
      },
      memoryTier: 'seed',
      entry: {} as ReviewLogEntry,
    }));

    const voiceInput = new SimulatedVoiceAdapter({
      defaultTranscript: mockVerse.text,
    });

    const { result } = await renderHook(() => useRecitationSession(mockVerse, { voiceInput }));

    await act(async () => {
      await result.current.startReciting();
    });
    expect(result.current.status).toBe('reciting');

    await act(async () => {
      await result.current.stopAndVerify();
    });

    expect(result.current.status).toBe('verified');
    expect(result.current.result?.passed).toBe(true);
    expect(result.current.result?.outcome).toBe('clean');
    expect(result.current.result?.score).toBe(100);
    expect(result.current.officialResult?.kind).toBe('official');
    recordSpy.mockRestore();
  });

  it('reflects a Transcription Error with its code and the calm retry message (Ticket 74)', async () => {
    jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
      allowed: true,
      remaining: 3,
      isSubscribed: true,
    });
    // The verse is not stored: the Review Log write is stubbed.
    const logSpy = jest
      .spyOn(verseEngine, 'recordTranscriptionError')
      .mockImplementation(async () => ({} as ReviewLogEntry));

    const failingVoiceInput = new SimulatedVoiceAdapter({
      handler: () => {
        throw new TranscriptionError('network_error', 'Offline');
      },
    });

    const { result } = await renderHook(() =>
      useRecitationSession(mockVerse, { voiceInput: failingVoiceInput })
    );

    await act(async () => {
      await result.current.startReciting();
    });

    await act(async () => {
      await result.current.stopAndVerify();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.transcriptionErrorCode).toBe('network_error');
    expect(result.current.errorMessage).toBe(
      'Network connection failed. Please check your internet connection. Nothing was graded and no recitation was used.'
    );
    logSpy.mockRestore();
  });

  it('cleans up recitation session on unmount', async () => {
    const { unmount } = await renderHook(() => useRecitationSession(mockVerse));
    expect(() => unmount()).not.toThrow();
  });

  it('exposes scaffolding level navigation and interaction actions', async () => {
    const { result } = await renderHook(() =>
      useRecitationSession(mockVerse, { autoVocalizeOnLevel1: false })
    );

    expect(result.current.level).toBe(3);
    expect(result.current.clozeTokens.length).toBeGreaterThan(0);

    await act(async () => {
      result.current.setLevel(1);
    });
    expect(result.current.level).toBe(1);

    await act(async () => {
      result.current.toggleTextReveal();
    });
    expect(result.current.isTextRevealed).toBe(true);

    await act(async () => {
      result.current.nextLevel();
    });
    expect(result.current.level).toBe(2);

    await act(async () => {
      result.current.tapWord(0);
    });
    expect(result.current.clozeTokens[0].isRevealed).toBe(true);
  });
});
