import { getCanonBook } from '../data/bibleCanon';
import { isNumberWord, parseNumberWords } from './numberWords';

/** A verse's own canonical reference (book id from the canon data, chapter and verse span). */
export interface VerseReference {
  bookId: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
}

interface TranscriptWord {
  key: string;
  start: number;
  end: number;
}

const sanitize = (word: string): string =>
  word.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const toWords = (text: string): TranscriptWord[] =>
  Array.from(text.matchAll(/[\p{L}\p{N}]+/gu), (match) => ({
    key: sanitize(match[0]),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));

/** Every spoken form of the book: its en/pt names and aliases, as word sequences. */
function bookPatterns(bookId: string): string[][] {
  const book = getCanonBook(bookId);
  if (!book) return [];
  const names = [book.enName, book.ptName, ...book.enAliases, ...book.ptAliases];
  const patterns = names.map((name) =>
    sanitize(name)
      // "1co" is "1 co": the book's number is its own word
      .replace(/^([1-3])(?=\p{L})/u, '$1 ')
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
  );
  const unique = new Map(patterns.map((p) => [p.join(' '), p]));
  return Array.from(unique.values());
}

/** How the number of a numbered book is spoken ("1 Coríntios", "1ª", "Primeira", "First", "I"). */
const NUMBERED_BOOK_PREFIXES = new Map<string, ReadonlySet<string>>([
  ['1', new Set(['1', '1o', '1a', '1st', 'i', 'one', 'um', 'uma', 'first', 'primeiro', 'primeira'])],
  ['2', new Set(['2', '2o', '2a', '2nd', 'ii', 'two', 'dois', 'duas', 'second', 'segundo', 'segunda'])],
  ['3', new Set(['3', '3o', '3a', '3rd', 'iii', 'three', 'tres', 'third', 'terceiro', 'terceira'])],
]);
/** "Primeira aos Coríntios", "Segunda a Timóteo", "Primeira de Pedro". */
const NUMBERED_BOOK_LINKS = new Set(['aos', 'a', 'de']);

function matchBook(words: TranscriptWord[], at: number, patterns: string[][]): number[] {
  return patterns.flatMap((pattern) => {
    const prefixes = NUMBERED_BOOK_PREFIXES.get(pattern[0]);
    const name = prefixes ? pattern.slice(1) : pattern;
    const nameStarts = !prefixes
      ? [at]
      : prefixes.has(words[at]?.key ?? '')
        ? matchOptional(words, at + 1, NUMBERED_BOOK_LINKS)
        : [];
    return nameStarts
      .filter((start) => name.every((part, offset) => words[start + offset]?.key === part))
      .map((start) => start + name.length);
  });
}

/** The longest spelled-out number a chapter or verse can take ("cento e dezenove", "one hundred and nineteen"). */
const MAX_NUMBER_WORDS = 6;

/** Optional words before the chapter and verse numbers ("capítulo 3, versículo 16"). */
const CHAPTER_WORDS = new Set(['chapter', 'ch', 'capitulo', 'cap']);
const VERSE_WORDS = new Set([
  'verse', 'verses', 'v', 'vv', 'versiculo', 'versiculos', 'verso', 'versos', 'vs',
]);

/** Optional words between the first and last verse of a range ("1 a 3", "one through three"). */
const RANGE_WORDS = new Set(['to', 'through', 'thru', 'until', 'till', 'and', 'a', 'ao', 'ate', 'e']);

/** Where an optional word from `options` ends: after it when present, and always without it. */
function matchOptional(words: TranscriptWord[], at: number, options: ReadonlySet<string>): number[] {
  const word = words[at];
  return word && options.has(word.key) ? [at + 1, at] : [at];
}

/** Word indexes where `value`, in digits or words, can end when it starts at `at`. */
function matchNumber(words: TranscriptWord[], at: number, value: number): number[] {
  const word = words[at];
  if (!word) return [];
  if (/^\d+$/.test(word.key)) return parseInt(word.key, 10) === value ? [at + 1] : [];

  const ends: number[] = [];
  for (let end = at + 1; end <= Math.min(words.length, at + MAX_NUMBER_WORDS); end++) {
    const run = words.slice(at, end).map((w) => w.key);
    if (!isNumberWord(run[run.length - 1])) break;
    if (parseNumberWords(run) === value) ends.push(end);
  }
  return ends;
}

/** One part of a spoken reference: where it can end when it starts at a word index. */
type ReferencePart = (at: number) => number[];

/** All the word indexes where a spoken copy of the reference, starting at `at`, can end. */
function referenceEnds(
  words: TranscriptWord[],
  at: number,
  reference: VerseReference,
  patterns: string[][]
): number[] {
  const { chapter, startVerse, endVerse } = reference;
  const parts: ReferencePart[] = [
    (i) => matchBook(words, i, patterns),
    (i) => matchOptional(words, i, CHAPTER_WORDS),
    (i) => matchNumber(words, i, chapter),
    (i) => matchOptional(words, i, VERSE_WORDS),
    (i) => matchNumber(words, i, startVerse),
  ];
  // A range is only its own reference when both its first and last verse are spoken.
  if (endVerse !== undefined && endVerse !== startVerse) {
    parts.push(
      (i) => matchOptional(words, i, RANGE_WORDS),
      (i) => matchNumber(words, i, endVerse)
    );
  }
  return parts.reduce<number[]>((ends, part) => ends.flatMap(part), [at]);
}

/**
 * Removes a spoken copy of the verse's own reference from the very start and the very end
 * of a transcript. Nothing in the middle is removed, and no other reference is matched.
 */
export function stripSpokenReference(transcript: string, reference: VerseReference): string {
  const patterns = bookPatterns(reference.bookId);
  const words = toWords(transcript);
  if (patterns.length === 0 || words.length === 0) return transcript;

  const leadingEnd = Math.max(0, ...referenceEnds(words, 0, reference, patterns));

  // The longest trailing copy that ends exactly on the last word, after any leading copy.
  let trailingStart = words.length;
  for (let at = leadingEnd; at < words.length; at++) {
    if (referenceEnds(words, at, reference, patterns).includes(words.length)) {
      trailingStart = at;
      break;
    }
  }

  const keepFrom = leadingEnd > 0 ? words[leadingEnd - 1].end : 0;
  const keepTo = trailingStart < words.length ? words[trailingStart].start : transcript.length;
  return transcript.slice(keepFrom, keepTo);
}
