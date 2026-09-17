import { diffVerses, calculateScore, DiffToken } from './diffEngine';

describe('diffEngine', () => {
  const expected = 'For God so loved the world, that he gave his only begotten Son.';

  it('handles a perfect match ignoring punctuation and casing', () => {
    const transcribed = 'for god so loved the world that he gave his only begotten son';
    const result = diffVerses(expected, transcribed);

    expect(result.every((token) => token.status === 'correct')).toBe(true);
    expect(calculateScore(result)).toBe(100);
  });

  it('marks missing words as missed', () => {
    // Missing "begotten"
    const transcribed = 'For God so loved the world that he gave his only Son.';
    const result = diffVerses(expected, transcribed);

    const missed = result.filter((t) => t.status === 'missed');
    expect(missed.length).toBe(1);
    expect(missed[0].word).toBe('begotten');

    const score = calculateScore(result);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(80);
  });

  it('marks extra words as added and penalizes accuracy score', () => {
    // Added "very" and "much"
    const transcribed = 'For God so very much loved the world that he gave his only begotten Son.';
    const result = diffVerses(expected, transcribed);

    const added = result.filter((t) => t.status === 'added');
    expect(added.map((t) => t.word)).toEqual(expect.arrayContaining(['very', 'much']));

    const score = calculateScore(result);
    // 13 expected words, 2 extra words added: F1 balanced score is 93%
    expect(score).toBeLessThan(100);
    expect(score).toBe(93);
  });

  it('handles empty input gracefully', () => {
    expect(diffVerses('', '')).toEqual([]);
    expect(calculateScore([])).toBe(0);

    const result = diffVerses(expected, '');
    expect(result.every((t) => t.status === 'missed')).toBe(true);
    expect(calculateScore(result)).toBe(0);
  });

  it('matches contractions across straight and curly apostrophes', () => {
    const verseWithCurly = "And God’s love doesn’t fail.";
    const transcribedWithStraight = "and god's love doesn't fail";
    const result = diffVerses(verseWithCurly, transcribedWithStraight);

    expect(result.every((t) => t.status === 'correct')).toBe(true);
    expect(calculateScore(result)).toBe(100);
  });

  it('splits words connected by em-dashes and hyphens', () => {
    const verseWithDash = "Peace—which passeth understanding—shall keep your hearts.";
    const transcribed = "peace which passeth understanding shall keep your hearts";
    const result = diffVerses(verseWithDash, transcribed);

    expect(result.every((t) => t.status === 'correct')).toBe(true);
    expect(calculateScore(result)).toBe(100);
  });

  it('handles speaker stuttering without wiping out correct words', () => {
    // Speaker stutters "for for" and "that that"
    const stuttered = 'For for God so loved the world that that he gave his only begotten Son.';
    const result = diffVerses(expected, stuttered);

    const correctWords = result.filter((t) => t.status === 'correct');
    const addedWords = result.filter((t) => t.status === 'added');

    // All 13 expected words are recognized
    expect(correctWords.length).toBe(13);
    // 2 repeated stutter words are marked as added
    expect(addedWords.length).toBe(2);

    // Balanced score should reward remembering the full verse while mildly penalizing the stutters
    const score = calculateScore(result);
    expect(score).toBeGreaterThanOrEqual(90);
  });
});
