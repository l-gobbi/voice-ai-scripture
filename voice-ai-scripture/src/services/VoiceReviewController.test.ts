import { processVoiceRecitation } from './VoiceReviewController';
import { VerseStorageService } from './VerseStorageService';

jest.mock('./VerseStorageService', () => ({
  VerseStorageService: {
    updateVerseSRS: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('VoiceReviewController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('processes transcribed text against expected verse, grades accuracy, and updates SRS', async () => {
    const verse = {
      id: 'verse-1',
      reference: 'John 3:16',
      text: 'For God so loved the world, that he gave his only begotten Son.',
      srs: {
        intervalDays: 0,
        repetitions: 0,
        easeFactor: 2.5,
      },
    };

    const transcript = 'for god so loved the world that he gave his only begotten son';

    const result = await processVoiceRecitation(verse, transcript);

    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.tokens.every((t) => t.status === 'correct')).toBe(true);

    // Verify storage update
    expect(VerseStorageService.updateVerseSRS).toHaveBeenCalledWith(
      'verse-1',
      expect.objectContaining({
        repetitions: 1,
        intervalDays: 1,
      })
    );
  });

  it('correctly grades a recitation with missed words and resets SRS if failed', async () => {
    const verse = {
      id: 'verse-2',
      reference: 'John 3:16',
      text: 'For God so loved the world, that he gave his only begotten Son.',
      srs: {
        intervalDays: 6,
        repetitions: 2,
        easeFactor: 2.5,
      },
    };

    // User only recited the first half
    const transcript = 'For God so loved the world';

    const result = await processVoiceRecitation(verse, transcript);

    expect(result.score).toBeLessThan(80);
    expect(result.passed).toBe(false);
    expect(result.tokens.some((t) => t.status === 'missed')).toBe(true);

    // Fails should reset repetitions back to 0
    expect(VerseStorageService.updateVerseSRS).toHaveBeenCalledWith(
      'verse-2',
      expect.objectContaining({
        repetitions: 0,
        intervalDays: 1,
      })
    );
  });
});
