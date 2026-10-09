import { scriptureCatalog } from '../services/ScriptureCatalog';
import { VerseTranslation } from '../services/VerseEngine';

export interface ParsedScriptureClipboard {
  /** The canonical reference ("Salmos 23:1-3", "Psalms 23:1"), or '' when none was found. */
  reference: string;
  /** The wording only: no surrounding quotes, reference, link, app promotion or verse numbers. */
  text: string;
  /**
   * The version label: a known Translation under any of its names (YouVersion's "NBV-P" is NBV),
   * or a version the share's bible.com link confirms ("A21"). Undefined when the paste has none.
   */
  translation?: VerseTranslation;
}

/**
 * Bidi controls (the Bible App wraps each part of its reference in U+202D … U+202C), zero-width
 * characters and the byte order mark.
 */
const INVISIBLE_CHARS = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

const LINK = /(?:https?:\/\/|www\.)\S+/gi;

/**
 * A bible.com link to a passage, as the Bible App shares it (https://bible.com/bible/1608/jhn.3.16.ARA)
 * or as bible.com shows it (https://www.bible.com/pt/bible/129/PSA.23.1-3.NVI). The book is its
 * USFM code, then the chapter, the verse or range, and the version abbreviation.
 */
const BIBLE_COM_PASSAGE =
  /bible\.com\/(?:[a-z]{2,3}(?:-[a-z]{2,4})?\/)?bible\/\d+\/([1-3]?[a-z]{2,3})\.(\d+)\.(\d+(?:-\d+)?)\.([a-z0-9-]+)/i;

/** A line advertising the Bible App, such as "Baixe o app da Bíblia" or "Shared via YouVersion". */
const APP_PROMOTION =
  /youversion|bible app|app da b[ií]blia|aplicativo da b[ií]blia|baixe o app|download the app|leia na b[ií]blia|read in the bible/i;

/**
 * A reference ending a line, after an optional dash and before an optional version label, either
 * possibly in parentheses: "— Salmos 23:1-3 NVI", "Cântico dos Cânticos 8:7", "João 3:16 (ARA)",
 * "(John 3:16 KJV)". The book is up to four words after an optional book number.
 */
const CITATION_AT_END =
  /(?:^|\s)[—–-]?\s*\(?((?:[1-3]\s*)?\p{L}+(?:\s+\p{L}+){0,3}\s+\d+\s*:\s*\d+(?:\s*[-–—]\s*\d+)?)(?:\s+\(?([A-Za-z][A-Za-z0-9-]*)\)?)?\)?\.?\s*$/u;

const SUPERSCRIPT_DIGITS = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+\s*/g;

interface Citation {
  /** The reference in the form the catalog reads, e.g. "Cântico dos Cânticos 8:7". */
  reference: string;
  /** The version token, e.g. "NVI" or "NBV-P", when the citation has one. */
  version?: string;
  /** Wording on the same line, before the citation. */
  before: string;
}

interface LinkedPassage {
  bookId: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
  version: string;
}

function clean(raw: string): string {
  return (
    raw
      .normalize('NFC')
      .replace(INVISIBLE_CHARS, '')
      .replace(/\r\n?/g, '\n')
      .replace(/[\u00A0\u2007\u202F]/g, ' ')
      // Bible texts on bible.com join words such as "restaura\u2011me" with a non-breaking
      // hyphen, which verification would not split on: use the plain hyphen.
      .replace(/[\u2010\u2011]/g, '-')
  );
}

/**
 * Strips one pair of quotation marks around the wording (“ ”, " ", « », „ “), keeping marks
 * that belong to the verse itself, such as the inner “ ‘ of a quotation.
 */
function stripQuotes(str: string): string {
  return str.replace(/^[“"«„‘']\s*/, '').replace(/\s*[”“"»’']$/, '').trim();
}

function readLinkedPassage(raw: string): LinkedPassage | null {
  const match = raw.match(BIBLE_COM_PASSAGE);
  if (!match) return null;
  const bookId = match[1].toUpperCase();
  if (!scriptureCatalog.getBook(bookId)) return null;
  const [startVerse, endVerse] = match[3].split('-').map((verse) => parseInt(verse, 10));
  return { bookId, chapter: parseInt(match[2], 10), startVerse, endVerse, version: match[4] };
}

/**
 * The form the catalog reads: "23:1–3" and "23 : 1 - 3" become "23:1-3", and the Roman book
 * numbers of the NKJV ("I Corinthians") become digits.
 */
function toCatalogForm(reference: string): string {
  return reference
    .replace(/^(I{1,3})\s+(?=\p{L})/u, (_, roman: string) => `${roman.length} `)
    .replace(/\s*:\s*/, ':')
    .replace(/\s*[-–—]\s*/, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The citation ending `line`, when its reference names a book of the Bible. */
function readCitation(line: string): Citation | null {
  const match = CITATION_AT_END.exec(line);
  if (!match) return null;
  // The pattern may take the last words of the wording as part of the book name ("nada me
  // faltará Salmos 23:1"): the longest name that is a book wins, so "1 João" beats "João".
  const tokens = match[1].trim().split(/\s+/);
  for (let start = 0; start < tokens.length - 1; start++) {
    const reference = toCatalogForm(tokens.slice(start).join(' '));
    if (!scriptureCatalog.resolveReference(reference)) continue;
    const before = [line.slice(0, match.index), ...tokens.slice(0, start)]
      .join(' ')
      .replace(/[\s—–-]+$/, '')
      .trim();
    return { reference, version: match[2], before };
  }
  return null;
}

/** The last line that ends with a citation: the reference usually ends a share, some open it. */
function findCitation(lines: string[]): { citation: Citation; index: number } | null {
  for (let index = lines.length - 1; index >= 0; index--) {
    const citation = readCitation(lines[index]);
    if (citation) return { citation, index };
  }
  return null;
}

/**
 * The reference with its book named in `language` when the name is spelled alike in both
 * languages ("Genesis 1:1 NIV" stays English, "Daniel 6:22 NVI" Portuguese), and canonically
 * otherwise ("Psalm 23:1" → "Psalms 23:1", "Cântico dos Cânticos 8:7" → "Cânticos 8:7").
 */
function canonicalReference(reference: string, language: 'en' | 'pt'): string {
  const norm = scriptureCatalog.resolveReference(reference)!;
  const languages = scriptureCatalog.referenceLanguages(reference);
  const bookLanguage = languages.length === 1 ? languages[0] : language;
  return formatReference(norm.bookId, norm.chapter, norm.startVerse, norm.endVerse, bookLanguage);
}

function formatReference(
  bookId: string,
  chapter: number,
  startVerse: number,
  endVerse: number | undefined,
  language: 'en' | 'pt'
): string {
  const book = scriptureCatalog.getBook(bookId)!;
  const name = language === 'pt' ? book.ptName : book.enName;
  const span =
    endVerse !== undefined && endVerse !== startVerse ? `${startVerse}-${endVerse}` : `${startVerse}`;
  return `${name} ${chapter}:${span}`;
}

/**
 * Drops the verse numbers a copy may carry ("[17] ", "²", "1 O Senhor… 2 Ele me…"). Plain
 * numbers are dropped only when the wording starts with the first verse's number, and then only
 * the following verse numbers in order, so numbers that belong to the wording stay.
 */
function stripVerseNumbers(text: string, startVerse: number, endVerse: number): string {
  let result = text.replace(SUPERSCRIPT_DIGITS, '');
  for (let verse = startVerse; verse <= endVerse; verse++) {
    result = result.replace(new RegExp(`(^|\\s)\\[${verse}\\]\\s*`), '$1');
  }

  const leading = new RegExp(`^${startVerse}\\s+(?=\\S)`);
  if (!leading.test(result)) return result.trim();
  result = result.replace(leading, '');

  let cursor = 0;
  for (let verse = startVerse + 1; verse <= endVerse; verse++) {
    const marker = new RegExp(`(^|\\s)${verse}\\s+(?=[^\\s\\d])`, 'g');
    marker.lastIndex = cursor;
    const found = marker.exec(result);
    if (!found) continue;
    const at = found.index + found[1].length;
    result = result.slice(0, at) + result.slice(found.index + found[0].length);
    cursor = at;
  }
  return result.trim();
}

/**
 * Parses scripture copied from YouVersion (the Bible App or bible.com) or elsewhere into its
 * canonical reference, its wording and its version label. Reads the reference after or before
 * the wording, or from the bible.com link when no reference line came with it, and drops quotes,
 * verse numbers, line breaks, links and app promotion lines from the wording.
 */
export function parseScriptureClipboard(rawText: string): ParsedScriptureClipboard | null {
  if (!rawText || !rawText.trim()) {
    return null;
  }

  const cleaned = clean(rawText).trim();
  if (!cleaned) {
    return null;
  }

  const linked = readLinkedPassage(cleaned);
  const lines = cleaned
    .split('\n')
    .map((line) => line.replace(LINK, '').trim())
    .filter((line) => line.length > 0 && !APP_PROMOTION.test(line));

  if (lines.length === 0 && !linked) {
    return null;
  }

  const found = findCitation(lines);
  const wordingLines = lines.filter((_, index) => index !== found?.index);
  if (found?.citation.before) {
    wordingLines.splice(found.index, 0, found.citation.before);
  }
  let text = stripQuotes(wordingLines.join(' ').replace(/\s+/g, ' ').trim());

  // A version is kept when the app knows it, or when the share's bible.com link confirms it.
  const version = found?.citation.version ?? linked?.version;
  const known = scriptureCatalog.recognizeTranslation(version);
  const confirmedByLink = !!version && linked?.version.toUpperCase() === version.toUpperCase();
  const translation = known ?? (confirmedByLink ? version!.toUpperCase() : undefined);

  // The paste's language names a book spelled alike in both: its version's, else its wording's.
  const language = scriptureCatalog.detectLanguage(known ? { translation: known } : { text });

  let reference = '';
  if (found) {
    reference = canonicalReference(found.citation.reference, language);
  } else if (linked) {
    const { bookId, chapter, startVerse, endVerse } = linked;
    reference = formatReference(bookId, chapter, startVerse, endVerse, language);
  }

  const norm = reference ? scriptureCatalog.resolveReference(reference) : null;
  if (norm) {
    text = stripVerseNumbers(text, norm.startVerse, norm.endVerse ?? norm.startVerse);
  }

  return { reference, text, translation };
}
