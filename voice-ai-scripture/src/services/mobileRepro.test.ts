import { RecitationSession } from './RecitationSession';
import { Verse, verseEngine } from './VerseEngine';
import { AudioDriver, CloudAudioVoiceAdapter } from './VoiceInput';
import { ReviewLogEntry } from './ReviewLog';

describe('Reproduction: Mobile Expo Go Recitation without API Key', () => {
  const mockVerse: Verse = {
    id: 'v1',
    reference: 'John 3:16',
    text: 'For God so loved the world that he gave his only begotten Son',
  };

  let mockDriver: AudioDriver;

  beforeEach(() => {
    delete (global as any).window;
    delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    mockDriver = {
      requestPermissions: jest.fn().mockResolvedValue(true),
      startRecording: jest.fn().mockResolvedValue(undefined),
      stopRecording: jest.fn().mockResolvedValue('file:///audio/recording.m4a'),
      deleteAudioFile: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(verseEngine, 'recordAttempt').mockImplementation(async (input) => ({
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fails gracefully with informative message when no API key or speech driver is available by default', async () => {
    const voiceInput = new CloudAudioVoiceAdapter({ driver: mockDriver });
    const session = new RecitationSession(mockVerse, { voiceInput });

    await session.startReciting();
    const result = await session.stopAndVerify();

    expect(result).toBeNull();
    expect(session.getState().status).toBe('error');
    expect(session.getState().errorMessage).toContain('Speech recognition is not available');
  });

  it('verifies successfully when dev fallbackToPrompt option is enabled', async () => {
    const voiceInput = new CloudAudioVoiceAdapter({ driver: mockDriver, fallbackToPrompt: true });
    const session = new RecitationSession(mockVerse, { voiceInput });

    await session.startReciting();
    const result = await session.stopAndVerify();

    expect(session.getState().errorMessage).toBeNull();
    expect(session.getState().status).toBe('verified');
    expect(result).not.toBeNull();
    // The dev fallback "hears" the acoustic prompt, which carries no verse text (ticket 67).
    // The verse has no translation, so the prompt names the English default (ticket 81).
    expect(result?.rawTranscript).toBe('Holy Bible. Translation: BSB. Reference: John 3:16.');
  });
});
