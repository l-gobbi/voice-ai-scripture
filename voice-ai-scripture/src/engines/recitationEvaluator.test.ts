import { evaluateRecitation, errorBudgetFor } from './recitationEvaluator';

/** A verse of `count` distinct words: "w1 w2 … wN." */
const verseOf = (count: number) => Array.from({ length: count }, (_, i) => `w${i + 1}`).join(' ') + '.';

/** The same verse with the given 1-based words left out. */
const without = (count: number, ...skipped: number[]) =>
  Array.from({ length: count }, (_, i) => i + 1)
    .filter((n) => !skipped.includes(n))
    .map((n) => `w${n}`)
    .join(' ');

describe('RecitationEvaluator Pipeline (Ticket 43)', () => {
  it('grades an exact recitation as clean, with a raw F1 of 100 and no errors', () => {
    const result = evaluateRecitation({
      expectedText: 'O Senhor é o meu pastor; nada me faltará.',
      transcribedText: 'O Senhor é o meu pastor; nada me faltará.',
    });

    expect(result.rawScore).toBe(100);
    expect(result.errorCount).toBe(0);
    expect(result.errorBudget).toBe(1);
    expect(result.outcome).toBe('clean');
    expect(result.tokens.every((t) => t.status === 'correct')).toBe(true);
  });

  it('handles Portuguese diacritics and punctuation insensitivity', () => {
    const result = evaluateRecitation({
      expectedText: 'Porque Deus amou o mundo de tal maneira...',
      transcribedText: 'porque deus amou o mundo de tal maneira',
    });

    expect(result.rawScore).toBe(100);
    expect(result.outcome).toBe('clean');
  });

  it('evaluates Portuguese honorific abbreviation expansion (Sra. -> Senhora, Sr. -> Senhor)', () => {
    const result = evaluateRecitation({
      expectedText: 'O Senhor é o meu pastor',
      transcribedText: 'O Sr. é o meu pastor',
    });

    expect(result.rawScore).toBe(100);
    expect(result.outcome).toBe('clean');
  });
});

describe('Error Budget grading (Ticket 73)', () => {
  describe('the Error Budget is 5% of the verse’s words, never less than one', () => {
    it.each([
      [1, 1],
      [9, 1],
      [19, 1],
      [20, 1],
      [29, 1],
      [30, 2],
      [40, 2],
      [49, 2],
      [50, 3],
      [100, 5],
    ])('%i words allow %i error(s)', (words, budget) => {
      expect(errorBudgetFor(words)).toBe(budget);
      expect(evaluateRecitation({ expectedText: verseOf(words), transcribedText: verseOf(words) }).errorBudget).toBe(
        budget
      );
    });

    it('counts words as the diff counts them, so a hyphenated word is two', () => {
      const result = evaluateRecitation({
        expectedText: 'This is my beloved Son, in whom I am well-pleased.',
        transcribedText: 'This is my beloved Son in whom I am well pleased',
      });

      expect(result.tokens).toHaveLength(11);
      expect(result.outcome).toBe('clean');
    });
  });

  describe('missed words', () => {
    it('missing 6 of 20 words is forgotten', () => {
      const result = evaluateRecitation({
        expectedText: verseOf(20),
        transcribedText: without(20, 2, 5, 8, 11, 14, 17),
      });

      expect(result.errorCount).toBe(6);
      expect(result.errorBudget).toBe(1);
      expect(result.outcome).toBe('forgotten');
      // The F1 score that used to pass (≥ 80) stays for display and the log only.
      expect(result.rawScore).toBe(82);
    });

    it('missing 1 of 25 words is a slip', () => {
      const result = evaluateRecitation({ expectedText: verseOf(25), transcribedText: without(25, 13) });

      expect(result.errorCount).toBe(1);
      expect(result.errorBudget).toBe(1);
      expect(result.outcome).toBe('slip');
    });

    it('missing 2 of 25 words is over the budget', () => {
      const result = evaluateRecitation({ expectedText: verseOf(25), transcribedText: without(25, 3, 13) });

      expect(result.errorCount).toBe(2);
      expect(result.outcome).toBe('forgotten');
    });

    it('missing 2 of 40 words is still a slip, because the budget grows with the verse', () => {
      const result = evaluateRecitation({ expectedText: verseOf(40), transcribedText: without(40, 3, 33) });

      expect(result.errorCount).toBe(2);
      expect(result.errorBudget).toBe(2);
      expect(result.outcome).toBe('slip');
    });

    it('an empty recitation misses every word', () => {
      const result = evaluateRecitation({ expectedText: verseOf(10), transcribedText: '' });

      expect(result.errorCount).toBe(10);
      expect(result.outcome).toBe('forgotten');
      expect(result.rawScore).toBe(0);
    });
  });

  describe('added words', () => {
    it('a perfect recitation with 2 filler words is clean', () => {
      const result = evaluateRecitation({
        expectedText: 'The Lord is my shepherd; I shall not want.',
        transcribedText: 'The Lord is uh my shepherd I I shall not want',
      });

      expect(result.tokens.filter((t) => t.status === 'added')).toHaveLength(2);
      expect(result.errorCount).toBe(0);
      expect(result.outcome).toBe('clean');
      expect(result.rawScore).toBeLessThan(100);
    });

    it('a third filler word is an error: a slip', () => {
      const result = evaluateRecitation({
        expectedText: 'The Lord is my shepherd; I shall not want.',
        transcribedText: 'um The Lord is uh my shepherd I I shall not want',
      });

      expect(result.errorCount).toBe(1);
      expect(result.outcome).toBe('slip');
    });

    it('counts added words beyond the allowance on top of missed words', () => {
      const result = evaluateRecitation({
        expectedText: verseOf(40),
        transcribedText: `${without(40, 20)} and so and so`,
      });

      expect(result.errorCount).toBe(3); // 1 missed + (4 added − 2)
      expect(result.outcome).toBe('forgotten');
    });
  });

  describe('exact wording', () => {
    it('a synonym is an error', () => {
      const result = evaluateRecitation({
        expectedText: 'The Lord is my shepherd; I shall not want.',
        transcribedText: 'The Lord is my pastor I shall not want',
      });

      expect(result.errorCount).toBe(1);
      expect(result.outcome).toBe('slip');
    });

    it('a Portuguese synonym is an error ("Deus" for "Senhor")', () => {
      const result = evaluateRecitation({
        expectedText: 'O Senhor é o meu pastor; nada me faltará.',
        transcribedText: 'O Deus é o meu pastor nada me faltará',
      });

      expect(result.outcome).not.toBe('clean');
      expect(result.errorCount).toBe(1);
    });

    it('two swapped words are an error', () => {
      const result = evaluateRecitation({
        expectedText: 'The Lord is my shepherd; I shall not want.',
        transcribedText: 'The Lord is my shepherd I not shall want',
      });

      expect(result.errorCount).toBeGreaterThanOrEqual(1);
      expect(result.outcome).not.toBe('clean');
    });

    it('two swapped pairs in a short verse are over the budget', () => {
      const result = evaluateRecitation({
        expectedText: 'The Lord is my shepherd; I shall not want.',
        transcribedText: 'Lord the is my shepherd I not shall want',
      });

      expect(result.errorCount).toBeGreaterThanOrEqual(2);
      expect(result.outcome).toBe('forgotten');
    });
  });

  describe('Word Peek Lifeline', () => {
    it('a peeked word is one error even when it was then recited correctly', () => {
      const result = evaluateRecitation({
        expectedText: verseOf(40),
        transcribedText: verseOf(40),
        peekedWordPositions: [7],
      });

      expect(result.rawScore).toBe(100);
      expect(result.errorCount).toBe(1);
      expect(result.outcome).toBe('slip');
    });

    it('three peeks in a 40-word verse are over the budget', () => {
      const result = evaluateRecitation({
        expectedText: verseOf(40),
        transcribedText: verseOf(40),
        peekedWordPositions: [3, 7, 21],
      });

      expect(result.errorCount).toBe(3);
      expect(result.outcome).toBe('forgotten');
    });

    it('a word both peeked and missed counts once', () => {
      const result = evaluateRecitation({
        expectedText: verseOf(40),
        transcribedText: without(40, 8),
        peekedWordPositions: [7], // w8, 0-based
      });

      expect(result.errorCount).toBe(1);
      expect(result.outcome).toBe('slip');
    });

    it('peek positions are canonical word positions, counted once each', () => {
      const result = evaluateRecitation({
        expectedText: verseOf(40),
        transcribedText: verseOf(40),
        peekedWordPositions: [7, 7, 7],
      });

      expect(result.errorCount).toBe(1);
    });

    it('ignores peek positions outside the verse', () => {
      const result = evaluateRecitation({
        expectedText: verseOf(10),
        transcribedText: verseOf(10),
        peekedWordPositions: [-1, 10, 99],
      });

      expect(result.errorCount).toBe(0);
      expect(result.outcome).toBe('clean');
    });

    it('a peek in a short verse uses its one-error budget', () => {
      const once = evaluateRecitation({
        expectedText: 'Jesus wept.',
        transcribedText: 'Jesus wept',
        peekedWordPositions: [1],
      });
      const twice = evaluateRecitation({
        expectedText: 'Jesus wept.',
        transcribedText: 'Jesus wept',
        peekedWordPositions: [0, 1],
      });

      expect(once.outcome).toBe('slip');
      expect(twice.outcome).toBe('forgotten');
    });
  });
});
