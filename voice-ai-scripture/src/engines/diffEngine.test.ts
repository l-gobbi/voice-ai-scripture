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

  describe('Ticket 40: Diacritic-Lenient Verification & Canonical Scripture Projection', () => {
    const psalmVerse = 'O Senhor é o meu pastor; nada me faltará.';

    it('matches Portuguese recitation 100% even when speech recognition drops accents', () => {
      // Speech recognition drops 'é' accent to 'e' and 'faltará' to 'faltara'
      const speechTranscript = 'o senhor e o meu pastor nada me faltara';
      const result = diffVerses(psalmVerse, speechTranscript);

      expect(result.every((t) => t.status === 'correct')).toBe(true);
      expect(calculateScore(result)).toBe(100);

      // Asserts Canonical Scripture Projection: original casing, accents, and attached punctuation
      expect(result.map((t) => t.word)).toEqual([
        'O',
        'Senhor',
        'é',
        'o',
        'meu',
        'pastor;',
        'nada',
        'me',
        'faltará.',
      ]);
    });

    it('handles omission in accented verse with canonical projection for missed tokens', () => {
      // User forgot "nada me faltara"
      const speechTranscript = 'o senhor e o meu pastor';
      const result = diffVerses(psalmVerse, speechTranscript);

      const correct = result.filter((t) => t.status === 'correct');
      const missed = result.filter((t) => t.status === 'missed');

      expect(correct.map((t) => t.word)).toEqual(['O', 'Senhor', 'é', 'o', 'meu', 'pastor;']);
      expect(missed.map((t) => t.word)).toEqual(['nada', 'me', 'faltará.']);
      expect(calculateScore(result)).toBeLessThan(100);
      expect(calculateScore(result)).toBeGreaterThan(60);
    });

    it('handles spoken addition without corrupting canonical projection', () => {
      const speechTranscript = 'o senhor e o meu pastor amem nada me faltara';
      const result = diffVerses(psalmVerse, speechTranscript);

      const added = result.filter((t) => t.status === 'added');
      expect(added.length).toBe(1);
      expect(added[0].word).toBe('amem');

      const correct = result.filter((t) => t.status === 'correct');
      expect(correct.length).toBe(9);
      expect(correct.map((t) => t.word)).toEqual([
        'O',
        'Senhor',
        'é',
        'o',
        'meu',
        'pastor;',
        'nada',
        'me',
        'faltará.',
      ]);
    });

    it('matches honorific abbreviations like Sr. and Sra. to Senhor and projects canonical word', () => {
      const speechTranscript = 'O Sra. O Sra. é o meu pastor nada me faltará';
      const result = diffVerses(psalmVerse, speechTranscript);

      const correct = result.filter((t) => t.status === 'correct');
      const missed = result.filter((t) => t.status === 'missed');

      // "Senhor" MUST be recognized as correct (not missed!)
      expect(correct.map((t) => t.word)).toContain('Senhor');
      expect(missed.length).toBe(0);

      // Score should pass (>= 90%) despite the initial stutter repetition
      const score = calculateScore(result);
      expect(score).toBeGreaterThanOrEqual(90);
    });
  });
});

