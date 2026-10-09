import { diffVerses, calculateScore, canonicalPositionsByWord, DiffToken } from './diffEngine';

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

  describe('Ticket 75: Digits and spelled-out numbers', () => {
    const statuses = (tokens: DiffToken[]) => tokens.map((t) => `${t.word}:${t.status}`);
    const isPerfect = (tokens: DiffToken[]) =>
      tokens.length > 0 && tokens.every((t) => t.status === 'correct') && calculateScore(tokens) === 100;

    it.each([
      // [canonical words, digits as the recognizer writes them]
      ['zero', '0'],
      ['one', '1'],
      ['um', '1'],
      ['uma', '1'],
      ['duas', '2'],
      ['três', '3'],
      ['dez', '10'],
      ['catorze', '14'],
      ['quatorze', '14'],
      ['dezesseis', '16'],
      ['dezasseis', '16'],
      ['dezenove', '19'],
      ['twenty-three', '23'],
      ['twenty three', '23'],
      ['vinte e três', '23'],
      ['four and twenty', '24'],
      ['cinqüenta', '50'],
      ['ninety-nine', '99'],
      ['noventa e nove', '99'],
      ['cem', '100'],
      ['a hundred', '100'],
      ['one hundred', '100'],
      ['cento e um', '101'],
      ['one hundred and forty-four', '144'],
      ['one hundred forty-four', '144'],
      ['cento e quarenta e quatro', '144'],
      ['duzentas', '200'],
      ['novecentos e trinta', '930'],
      ['nine hundred and thirty', '930'],
      ['nine hundred ninety-nine', '999'],
      ['novecentos e noventa e nove', '999'],
      ['mil', '1000'],
      ['mil', '1.000'],
      ['one thousand', '1000'],
      ['a thousand', '1,000'],
      ['mil e um', '1001'],
      ['mil e quinhentos', '1500'],
      ['dois mil', '2000'],
      ['cento e quarenta e quatro mil', '144.000'],
      ['one hundred forty-four thousand', '144,000'],
      ['an hundred and forty and four thousand', '144000'],
    ])('"%s" in the canonical text matches "%s" in the transcript', (words, digits) => {
      const tokens = diffVerses(`eram ${words} anos`, `eram ${digits} anos`);
      expect(isPerfect(tokens)).toBe(true);
      // The learner sees the canonical words, never the recognizer's digits.
      expect(tokens.map((t) => t.word)).toEqual(['eram', ...words.replace(/-/g, ' ').split(' '), 'anos']);
    });

    it('matches part of a longer canonical number spoken half in digits ("144 mil")', () => {
      const tokens = diffVerses('cento e quarenta e quatro mil assinalados', '144 mil assinalados');
      expect(isPerfect(tokens)).toBe(true);
    });

    it('matches spelled-out words in the transcript to digits in the canonical text', () => {
      const tokens = diffVerses('E caíram num só dia 23 mil.', 'e caíram num só dia vinte e três mil');
      expect(isPerfect(tokens)).toBe(true);
      expect(tokens.map((t) => t.word)).toEqual(['E', 'caíram', 'num', 'só', 'dia', '23', 'mil.']);

      expect(isPerfect(diffVerses('about 3,000 men', 'about three thousand men'))).toBe(true);
    });

    it('uses the canonical spelling nearest in the verse when a number appears twice', () => {
      const tokens = diffVerses(
        'duas vezes ele disse, e dois homens ouviram',
        '2 vezes ele disse e 2 homens ouviram'
      );
      expect(isPerfect(tokens)).toBe(true);
    });

    it('reads a wrong number in digits as words in the verse language, so the right words still count', () => {
      expect(statuses(diffVerses('caíram vinte e três mil', 'caíram 24 mil', { language: 'pt' }))).toEqual([
        'caíram:correct',
        'vinte:correct',
        'e:correct',
        'três:missed',
        'quatro:added',
        'mil:correct',
      ]);
      expect(statuses(diffVerses('twenty-three thousand fell', '25 thousand fell', { language: 'en' }))).toEqual([
        'twenty:correct',
        'three:missed',
        'five:added',
        'thousand:correct',
        'fell:correct',
      ]);
    });

    it('compares spelled-out words to spelled-out words literally', () => {
      const tokens = diffVerses('duas noites', 'dois noites');
      expect(statuses(tokens)).toEqual(['duas:missed', 'dois:added', 'noites:correct']);
    });

    it('leaves digits that are not a whole number, such as a verse reference, as they are', () => {
      const tokens = diffVerses('três dias', '3:16 três dias', { language: 'pt' });
      expect(statuses(tokens)).toEqual(['3:16:added', 'três:correct', 'dias:correct']);
    });

    describe.each([['en' as const], ['pt' as const]])('every cardinal from 0 to 1000 in %s', (language) => {
      const spell = (n: number) =>
        diffVerses('', String(n), { language }).map((t) => t.word);

      it('is spelled out in words when the canonical text has no such number', () => {
        for (let n = 0; n <= 1000; n++) {
          const words = spell(n);
          expect(words.length).toBeGreaterThan(0);
          expect(words.join(' ')).not.toMatch(/\d/);
        }
      });

      it('matches its digits in either direction', () => {
        for (let n = 0; n <= 1000; n++) {
          const words = spell(n).join(' ');
          if (!isPerfect(diffVerses(words, String(n)))) throw new Error(`"${words}" ≠ ${n}`);
          if (!isPerfect(diffVerses(String(n), words))) throw new Error(`${n} ≠ "${words}"`);
        }
      });
    });

    it('spells out the default form of a number in each language', () => {
      const spell = (n: number, language: 'en' | 'pt') =>
        diffVerses('', String(n), { language }).map((t) => t.word).join(' ');

      expect(spell(0, 'en')).toBe('zero');
      expect(spell(23, 'en')).toBe('twenty three');
      expect(spell(144, 'en')).toBe('one hundred forty four');
      expect(spell(1000, 'en')).toBe('one thousand');
      expect(spell(144000, 'en')).toBe('one hundred forty four thousand');

      expect(spell(3, 'pt')).toBe('três');
      expect(spell(23, 'pt')).toBe('vinte e três');
      expect(spell(100, 'pt')).toBe('cem');
      expect(spell(144, 'pt')).toBe('cento e quarenta e quatro');
      expect(spell(1000, 'pt')).toBe('mil');
      expect(spell(1100, 'pt')).toBe('mil e cem');
      expect(spell(1144, 'pt')).toBe('mil cento e quarenta e quatro');
      expect(spell(2000000, 'pt')).toBe('dois milhões');
    });
  });

  describe('Ticket 73: canonical word positions of each written word', () => {
    it('numbers the words as the diff counts them, one list per whitespace-separated word', () => {
      const text = 'For God so loved the world';
      expect(canonicalPositionsByWord(text)).toEqual([[0], [1], [2], [3], [4], [5]]);
      expect(diffVerses(text, '')).toHaveLength(6);
    });

    it('gives a hyphenated or dash-joined word one position per diff word, shifting the words after it', () => {
      const text = 'his daughter-in-law, whose these are—the signet';
      expect(canonicalPositionsByWord(text)).toEqual([[0], [1, 2, 3], [4], [5], [6, 7], [8]]);
      expect(diffVerses(text, '').map((t) => t.word)).toEqual([
        'his', 'daughter', 'in', 'law,', 'whose', 'these', 'are', 'the', 'signet',
      ]);
    });

    it('gives a word with no letters or digits no position', () => {
      expect(canonicalPositionsByWord('Amen — so be it ¶')).toEqual([[0], [], [1], [2], [3], []]);
      expect(canonicalPositionsByWord('  ')).toEqual([]);
    });
  });
});
