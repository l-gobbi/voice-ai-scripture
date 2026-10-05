import { evaluateRecitation, ASSISTED_SCORE_CAP } from './recitationEvaluator';
import { SRSState } from './srsEngine';

describe('RecitationEvaluator Pipeline (Ticket 43)', () => {
  const currentSRS: SRSState & { nextReviewDate?: string } = {
    streak: 2,
    intervalDays: 4,
    easeFactor: 2.5,
    nextReviewDate: new Date('2026-10-01T00:00:00Z').toISOString(),
  };

  it('evaluates exact match verbatim recitation to 100% score and passing SRS progression', () => {
    const result = evaluateRecitation({
      expectedText: 'O Senhor é o meu pastor; nada me faltará.',
      transcribedText: 'O Senhor é o meu pastor; nada me faltará.',
      currentSRS,
    });

    expect(result.rawScore).toBe(100);
    expect(result.finalScore).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.isAssisted).toBe(false);
    expect(result.srsResult.passed).toBe(true);
    expect(result.srsResult.streak).toBe(3);
    expect(result.srsResult.intervalDays).toBeGreaterThan(4);
  });

  it('handles Portuguese diacritics and punctuation insensitivity', () => {
    const result = evaluateRecitation({
      expectedText: 'Porque Deus amou o mundo de tal maneira...',
      transcribedText: 'porque deus amou o mundo de tal maneira',
    });

    expect(result.rawScore).toBe(100);
    expect(result.finalScore).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('caps assisted recitation score at ASSISTED_SCORE_CAP (75%) and records assisted SRS progression', () => {
    const result = evaluateRecitation({
      expectedText: 'The Lord is my shepherd, I shall not want.',
      transcribedText: 'The Lord is my shepherd, I shall not want.',
      assistanceUsed: true,
      currentSRS,
    });

    expect(result.rawScore).toBe(100);
    expect(result.finalScore).toBe(ASSISTED_SCORE_CAP);
    expect(result.isAssisted).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.srsResult.passed).toBe(true);
    expect(result.srsResult.streak).toBe(2); // Preserves streak
    expect(result.srsResult.intervalDays).toBe(1); // Reinforces tomorrow
  });

  it('unmetered mode projects simulated SRS progression without mutating persistent state', () => {
    const result = evaluateRecitation({
      expectedText: 'John 3:16 text',
      transcribedText: 'John 3:16 text',
      currentSRS,
      isUnmetered: true,
    });

    expect(result.rawScore).toBe(100);
    expect(result.finalScore).toBe(100);
    expect(result.srsResult.streak).toBe(2); // Retains original streak in unmetered mode
    expect(result.srsResult.intervalDays).toBe(4); // Retains original intervalDays
  });

  it('evaluates Portuguese honorific abbreviation expansion (Sra. -> Senhora, Sr. -> Senhor)', () => {
    const result = evaluateRecitation({
      expectedText: 'O Senhor é o meu pastor',
      transcribedText: 'O Sr. é o meu pastor',
    });

    expect(result.finalScore).toBe(100);
    expect(result.passed).toBe(true);
  });
});
