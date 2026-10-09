import { isNumberWord, parseNumberWords, spellNumber } from './numberWords';

export type DiffStatus = 'correct' | 'missed' | 'added';

export interface DiffToken {
  word: string;
  status: DiffStatus;
}

const ABBREVIATION_MAP: Record<string, string> = {
  // Portuguese honorifics & biblical abbreviations commonly emitted by STT
  sr: 'senhor',
  sra: 'senhor',
  snr: 'senhor',
  snra: 'senhor',
  sto: 'santo',
  sta: 'santa',
  cap: 'capitulo',
  vs: 'versiculo',

  // English honorifics & biblical abbreviations
  st: 'saint',
  mr: 'mister',
  mrs: 'missus',
  ms: 'miss',
  dr: 'doctor',
  mt: 'mount',
  ch: 'chapter',
};

export const toComparisonKey = (word: string): string => {
  const stripped = word
    .toLowerCase()
    // Normalize curly apostrophes to straight single quote
    .replace(/[\u2018\u2019]/g, "'")
    // Normalize unicode and strip diacritics/accents (e.g. é -> e, á -> a, ç -> c, ã -> a)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    // Strip non-alphanumeric and non-apostrophe characters
    .replace(/[^\p{L}\p{N}']/gu, '');

  return ABBREVIATION_MAP[stripped] ?? stripped;
};

export interface AlignedToken {
  display: string;
  key: string;
}

const tokenize = (text: string): AlignedToken[] => {
  if (!text || text.trim().length === 0) return [];
  // Replace dashes and hyphens with spaces so joined words split cleanly
  const splitText = text.replace(/[-—–]/g, ' ');
  const rawTokens = splitText.split(/\s+/).filter((w) => w.length > 0);
  return rawTokens
    .map((display) => ({
      display,
      key: toComparisonKey(display),
    }))
    .filter((t) => t.key.length > 0);
};

/**
 * How many words of the text the diff compares, after normalization: a word with no letters or
 * digits counts for none, and a hyphenated word counts for each of its parts. A transcript with
 * none is empty, whatever characters it holds.
 */
export function countComparableWords(text: string): number {
  return tokenize(text).length;
}

/**
 * The canonical word positions (from 0, as the diff counts words) of each whitespace-separated
 * word of the text, which is how the Cloze tokens split it. A hyphenated or dash-joined word
 * holds several diff words ("daughter-in-law" holds three), and a word with no letters or
 * digits (a standalone "—") holds none, so positions after them shift.
 */
export function canonicalPositionsByWord(text: string): number[][] {
  if (!text || text.trim().length === 0) return [];
  let next = 0;
  return text
    .trim()
    .split(/\s+/)
    .map((word) => tokenize(word).map(() => next++));
}

/** A whole number written in digits, as recognizers emit it: "3", "23,", "144,000", "1.000". */
const readDigits = (display: string): number | null => {
  const match = display.match(/^[^\p{L}\p{N}]*(\d{1,3}(?:[.,]\d{3})+|\d+)[^\p{L}\p{N}]*$/u);
  if (!match) return null;
  const value = Number(match[1].replace(/[.,]/g, ''));
  return Number.isSafeInteger(value) ? value : null;
};

/** The longest spelled-out number considered ("novecentos e noventa e nove mil novecentos e noventa e nove"). */
const MAX_NUMBER_WORDS = 16;

interface NumberPhrase {
  start: number;
  end: number;
  value: number;
}

/** Every run of tokens that spells out one number, including runs inside longer numbers. */
const findNumberPhrases = (tokens: AlignedToken[]): NumberPhrase[] => {
  const phrases: NumberPhrase[] = [];
  for (let start = 0; start < tokens.length; start++) {
    const limit = Math.min(tokens.length, start + MAX_NUMBER_WORDS);
    for (let end = start + 1; end <= limit && isNumberWord(tokens[end - 1].key); end++) {
      const value = parseNumberWords(tokens.slice(start, end).map((t) => t.key));
      if (value !== null) phrases.push({ start, end, value });
    }
  }
  return phrases;
};

/**
 * Rewrites numbers in the transcript into the form the canonical text uses, so that digits and
 * spelled-out numbers align word for word while the diff still shows the canonical words:
 * - a number in digits becomes the canonical words for it ("3" → "três", "144" → "one hundred and
 *   forty-four"), or, when the canonical text has no such number, its usual words in the verse
 *   language, so a wrong number still credits its right words;
 * - spelled-out words become the canonical digits when the canonical text writes that number in digits.
 */
const matchNumberForms = (
  expected: AlignedToken[],
  transcribed: AlignedToken[],
  language?: 'en' | 'pt'
): AlignedToken[] => {
  const expectedDigits = new Set(
    expected.map((t) => readDigits(t.display)).filter((value): value is number => value !== null)
  );
  const expectedPhrases = findNumberPhrases(expected);

  const fromDigits = (token: AlignedToken, value: number, position: number): AlignedToken[] => {
    if (expectedDigits.has(value)) return [{ display: token.display, key: String(value) }];

    // When the canonical spells the number more than once, use the occurrence nearest in the verse.
    const distance = (phrase: NumberPhrase) => Math.abs(phrase.start / expected.length - position);
    const nearest = expectedPhrases
      .filter((phrase) => phrase.value === value)
      .sort((a, b) => distance(a) - distance(b))[0];
    if (nearest) return expected.slice(nearest.start, nearest.end);

    const spelled = language ? spellNumber(value, language) : [];
    if (spelled.length === 0) return [token];
    return spelled.map((word) => ({ display: word, key: toComparisonKey(word) }));
  };

  /** The longest run of number words at `at` whose value the canonical text writes in digits. */
  const wordsForDigitsAt = (at: number): { end: number; value: number } | null => {
    if (expectedDigits.size === 0 || !isNumberWord(transcribed[at].key)) return null;
    for (let end = Math.min(transcribed.length, at + MAX_NUMBER_WORDS); end > at; end--) {
      const value = parseNumberWords(transcribed.slice(at, end).map((t) => t.key));
      if (value !== null && expectedDigits.has(value)) return { end, value };
    }
    return null;
  };

  const result: AlignedToken[] = [];
  for (let i = 0; i < transcribed.length; ) {
    const token = transcribed[i];
    const digits = readDigits(token.display);
    const words = digits === null ? wordsForDigitsAt(i) : null;

    if (digits !== null) {
      result.push(...fromDigits(token, digits, i / transcribed.length));
      i++;
    } else if (words) {
      const display = transcribed.slice(i, words.end).map((t) => t.display).join(' ');
      result.push({ display, key: String(words.value) });
      i = words.end;
    } else {
      result.push(token);
      i++;
    }
  }
  return result;
};

export interface DiffOptions {
  /** The verse's language. Digits that the canonical text does not spell out are read as words in it. */
  language?: 'en' | 'pt';
}

export function diffVerses(
  expectedStr: string,
  transcribedStr: string,
  options: DiffOptions = {}
): DiffToken[] {
  const expectedTokens = tokenize(expectedStr);
  const transcribedTokens = matchNumberForms(
    expectedTokens,
    tokenize(transcribedStr),
    options.language
  );

  if (expectedTokens.length === 0 && transcribedTokens.length === 0) return [];
  if (expectedTokens.length === 0) {
    return transcribedTokens.map((t) => ({ word: t.display, status: 'added' }));
  }
  if (transcribedTokens.length === 0) {
    return expectedTokens.map((t) => ({ word: t.display, status: 'missed' }));
  }

  // Edit distance matrix for optimal sequence alignment
  const editDistanceMatrix: number[][] = Array(expectedTokens.length + 1)
    .fill(null)
    .map(() => Array(transcribedTokens.length + 1).fill(0));

  for (let i = 1; i <= expectedTokens.length; i++) editDistanceMatrix[i][0] = i;
  for (let j = 1; j <= transcribedTokens.length; j++) editDistanceMatrix[0][j] = j;

  for (let i = 1; i <= expectedTokens.length; i++) {
    for (let j = 1; j <= transcribedTokens.length; j++) {
      if (expectedTokens[i - 1].key === transcribedTokens[j - 1].key) {
        editDistanceMatrix[i][j] = editDistanceMatrix[i - 1][j - 1];
      } else {
        editDistanceMatrix[i][j] = 1 + Math.min(
          editDistanceMatrix[i - 1][j],
          editDistanceMatrix[i][j - 1],
          editDistanceMatrix[i - 1][j - 1]
        );
      }
    }
  }

  // Backtrack to find alignment
  let i = expectedTokens.length;
  let j = transcribedTokens.length;
  const result: DiffToken[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && expectedTokens[i - 1].key === transcribedTokens[j - 1].key) {
      result.unshift({ word: expectedTokens[i - 1].display, status: 'correct' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || editDistanceMatrix[i][j - 1] + 1 === editDistanceMatrix[i][j])) {
      result.unshift({ word: transcribedTokens[j - 1].display, status: 'added' });
      j--;
    } else if (i > 0 && (j === 0 || editDistanceMatrix[i - 1][j] + 1 === editDistanceMatrix[i][j])) {
      result.unshift({ word: expectedTokens[i - 1].display, status: 'missed' });
      i--;
    } else {
      result.unshift({ word: transcribedTokens[j - 1].display, status: 'added' });
      result.unshift({ word: expectedTokens[i - 1].display, status: 'missed' });
      i--;
      j--;
    }
  }

  return result;
}

export function calculateScore(diffTokens: DiffToken[]): number {
  if (diffTokens.length === 0) return 0;

  const correctCount = diffTokens.filter((t) => t.status === 'correct').length;
  if (correctCount === 0) return 0;

  const missedCount = diffTokens.filter((t) => t.status === 'missed').length;
  const addedCount = diffTokens.filter((t) => t.status === 'added').length;

  const totalExpected = correctCount + missedCount;
  if (totalExpected === 0) return 0;

  // Balanced F1 accuracy: harmonic mean of Recall (verse coverage) and Precision (absence of hallucinations/stutter)
  const recall = correctCount / totalExpected;
  const precision = correctCount / (correctCount + addedCount);

  if (recall + precision === 0) return 0;

  const f1Score = (2 * (recall * precision)) / (recall + precision);
  return Math.round(f1Score * 100);
}
