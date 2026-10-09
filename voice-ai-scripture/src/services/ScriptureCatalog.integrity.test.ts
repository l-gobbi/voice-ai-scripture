import {
  scriptureCatalog,
  BUNDLED_TRANSLATIONS,
  SupportedTranslation,
} from './ScriptureCatalog';
import type { Language } from '../utils/languageNormalizer';
import blivreData from '../data/bibles/blivre.json';
import onbvData from '../data/bibles/onbv.json';
import bsbData from '../data/bibles/bsb.json';
import webData from '../data/bibles/web.json';

/**
 * Dataset integrity for every bundled Bible (Tickets 80 and 92, spec-open-translations.md).
 *
 * Each dataset is read key by key, exactly as bundled, and compared with the canon matrix
 * (src/data/bibleCanon.ts, ADR 0008); the Scripture Catalog must then serve it verse for verse.
 * A rebuilt dataset that loses a book, chapter or verse, gains one anywhere (an unknown book,
 * a chapter or verse beyond the canon, verse 0), or carries `{…}`/`[…]` markers in any verse
 * it holds fails here.
 *
 * VERSIFICATION_EXCEPTIONS lists every place where a dataset legitimately differs from the
 * canon matrix. The list must match exactly: a new gap fails, and so does a stale exception.
 * Format, per book and chapter in canon order, missing verses before extra ones:
 * "BOOK chapter:verse missing" (the canon has the verse, the dataset does not),
 * "BOOK chapter:verse extra" (the dataset has a verse the canon does not: beyond the chapter's
 * count, or verse 0), "BOOK chapter extra chapter" and "BOOK unknown book".
 */
const VERSIFICATION_EXCEPTIONS: Record<SupportedTranslation, readonly string[]> = {
  // Bíblia Livre follows the canon matrix verse for verse.
  BLIVRE: [],

  // The ONBV numbers the closing clause of these chapters as a verse of its own (as Hebrew-
  // tradition Portuguese Bibles do): "a terra ficou em paz durante quarenta anos" (Jdg 5:32),
  // "Assim eles se separaram…" (1 Sm 20:43), "A paz esteja com você…" (3 Jo 15).
  // No text is missing; the canon's last verse is split in two.
  ONBV: ['JDG 5:32 extra', '1SA 20:43 extra', '3JN 1:15 extra'],

  // The BSB follows the critical Greek text and leaves these verses out of the text (it gives
  // them in footnotes, which eBible's verse-per-line export drops).
  BSB: [
    'MAT 17:21 missing',
    'MAT 18:11 missing',
    'MAT 23:14 missing',
    'MRK 7:16 missing',
    'MRK 9:44 missing',
    'MRK 9:46 missing',
    'MRK 11:26 missing',
    'MRK 15:28 missing',
    'LUK 17:36 missing',
    'LUK 23:17 missing',
    'JHN 5:4 missing',
    'ACT 8:37 missing',
    'ACT 15:34 missing',
    'ACT 24:7 missing',
    'ACT 28:29 missing',
    'ROM 16:24 missing',
  ],

  // The WEB leaves out four verses absent from its Greek text, and places the closing
  // doxology of Romans at 14:24-26 (Majority Text order) instead of 16:25-27.
  WEB: [
    'LUK 17:36 missing',
    'ACT 8:37 missing',
    'ACT 15:34 missing',
    'ACT 24:7 missing',
    'ROM 14:24 extra',
    'ROM 14:25 extra',
    'ROM 14:26 extra',
    'ROM 16:25 missing',
    'ROM 16:26 missing',
    'ROM 16:27 missing',
  ],
};

const MARKER = /[{}[\]]/;

/**
 * Psalm titles (superscriptions) are not verse text: learners recite only the verse (Ticket 85).
 * eBible's verse-per-line export merges each title into verse 1, and the build cuts it off
 * using the USFM `\d` title. A Psalm verse 1 that starts like a title means one slipped through.
 *
 * The openings below cover every title the bundled sources use, plus common ones from other
 * Bibles, matched as whole words at the very start of verse 1, ignoring case.
 */
const PSALM_TITLE_OPENINGS: Record<Language, readonly string[]> = {
  pt: [
    'Salmo', 'Salmos', 'Cântico', 'Canção', 'Um cântico', 'Uma canção', 'Hino', 'Poema',
    'Oração de', 'Oração do', 'Instrução', 'Memorial de', 'Confissão de', 'Mictão', 'Masquil',
    'Para o regente', 'Para o mestre de', 'Ao mestre de canto', 'Ao regente', 'Para o cantor-mor',
    'Ao músico-mor', 'Para Salomão', 'De Salomão', 'De Davi', 'De Asafe', 'Dos filhos de Corá',
  ],
  en: [
    'A Psalm', 'A Psalms', 'Psalm of', 'For the choirmaster', 'To the choirmaster',
    'For the director', 'To the chief Musician', 'For the leader', 'A song', 'A Maskil',
    'A Miktam', 'A Michtam', 'A Shiggaion', 'A prayer of', 'Of David', 'Of Solomon', 'Of Asaph',
    'Of the sons of Korah', 'Of Moses', 'A Davidic',
  ],
};

const titleOpening = (language: Language) =>
  new RegExp(
    `^(?:${PSALM_TITLE_OPENINGS[language].map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'i'
  );

/**
 * Psalm verse 1s that legitimately start like a title, as "PSA chapter:1". None today. The list
 * must match exactly, like VERSIFICATION_EXCEPTIONS.
 */
const PSALM_TITLE_EXCEPTIONS: Record<SupportedTranslation, readonly string[]> = {
  BLIVRE: [],
  ONBV: [],
  BSB: [],
  WEB: [],
};

/** A dataset's books as bundled: book id → chapter → verse → text, every key a string. */
type DatasetBooks = Record<string, Record<string, Record<string, string>>>;

const DATASET_BOOKS: Record<SupportedTranslation, DatasetBooks> = {
  BLIVRE: blivreData.books,
  ONBV: onbvData.books,
  BSB: bsbData.books,
  WEB: webData.books,
};

interface DatasetScan {
  booksWithText: number;
  gaps: string[];
  markedVerses: string[];
}

/** "1", "2", … but not "0", "01", "-1" or "1a". */
const isCountingNumber = (key: string) => /^[1-9]\d*$/.test(key);
/** Numeric keys in numeric order, anything else after them. */
const byNumber = (a: string, b: string) =>
  (Number(a) || Infinity) - (Number(b) || Infinity) || a.localeCompare(b);
const sortedKeys = (record: object) => Object.keys(record).sort(byNumber);

/** Every difference between a dataset and the canon matrix, and every verse carrying a marker. */
function scanBooks(books: DatasetBooks): DatasetScan {
  const canon = scriptureCatalog.getBooks();
  const canonIds = new Set(canon.map((book) => book.id));
  const gaps: string[] = [];
  const markedVerses: string[] = [];
  let booksWithText = 0;

  for (const book of canon) {
    const chapters = books[book.id] ?? {};
    if (chapters['1']?.['1']?.trim()) booksWithText++;

    const chapterKeys = new Set(Object.keys(chapters));
    for (let chapter = 1; chapter <= book.chapters; chapter++) chapterKeys.add(String(chapter));

    for (const chapterKey of [...chapterKeys].sort(byNumber)) {
      if (!isCountingNumber(chapterKey) || Number(chapterKey) > book.chapters) {
        gaps.push(`${book.id} ${chapterKey} extra chapter`);
        continue;
      }
      const verses = chapters[chapterKey] ?? {};
      const expected = scriptureCatalog.getVerseCount(book.id, Number(chapterKey));
      for (let verse = 1; verse <= expected; verse++) {
        if (!verses[String(verse)]?.trim()) gaps.push(`${book.id} ${chapterKey}:${verse} missing`);
      }
      for (const verseKey of sortedKeys(verses)) {
        if (!isCountingNumber(verseKey) || Number(verseKey) > expected) {
          gaps.push(`${book.id} ${chapterKey}:${verseKey} extra`);
        }
      }
    }
  }

  for (const bookId of Object.keys(books)) {
    if (!canonIds.has(bookId)) gaps.push(`${bookId} unknown book`);
  }

  // Every verse the dataset holds, wherever it is, in the dataset's own order.
  for (const [bookId, chapters] of Object.entries(books)) {
    for (const chapterKey of sortedKeys(chapters)) {
      for (const verseKey of sortedKeys(chapters[chapterKey])) {
        if (MARKER.test(chapters[chapterKey][verseKey])) markedVerses.push(`${bookId} ${chapterKey}:${verseKey}`);
      }
    }
  }

  return { booksWithText, gaps, markedVerses };
}

describe('The dataset integrity scan (Ticket 92)', () => {
  // John 3 has 36 verses and John 21 chapters.
  const scan = scanBooks({
    JHN: {
      '3': {
        '0': 'A verse zero.',
        '16': 'For God so loved {the} world.',
        '36': 'The last verse of the chapter.',
        '50': 'Far past the end [of the chapter].',
      },
      '22': { '1': 'A {chapter} the canon does not have.' },
    },
    XYZ: { '1': { '1': 'Not a [canon] book.' } },
  });

  it('reports an unknown book, an extra chapter, verse 0 and an extra verse past a gap', () => {
    expect(scan.gaps).toEqual(
      expect.arrayContaining(['XYZ unknown book', 'JHN 22 extra chapter', 'JHN 3:0 extra', 'JHN 3:50 extra'])
    );
    expect(scan.gaps).toContain('JHN 3:1 missing');
    expect(scan.gaps).not.toContain('JHN 3:16 missing');
    expect(scan.gaps).not.toContain('JHN 3:37 extra');
    expect(scan.gaps.filter((gap) => gap.endsWith('extra') || gap.endsWith('book') || gap.endsWith('chapter'))).toHaveLength(4);
  });

  it('finds markers in every verse present, inside the canon or not', () => {
    expect(scan.markedVerses).toEqual(['JHN 3:16', 'JHN 3:50', 'JHN 22:1', 'XYZ 1:1']);
  });

  it('counts the books that have text', () => {
    expect(scan.booksWithText).toBe(0);
    expect(scanBooks({ JHN: { '1': { '1': 'In the beginning was the Word.' } } }).booksWithText).toBe(1);
  });
});

describe('Bundled Bible dataset integrity (Tickets 80 and 81)', () => {
  it('has an exception list for every bundled translation', () => {
    expect(Object.keys(VERSIFICATION_EXCEPTIONS).sort()).toEqual([...BUNDLED_TRANSLATIONS].sort());
  });

  describe.each([...BUNDLED_TRANSLATIONS])('%s', (code) => {
    let scan: DatasetScan;

    beforeAll(() => {
      scan = scanBooks(DATASET_BOOKS[code]);
    });

    it('contains all 66 books of the canon', () => {
      expect(scriptureCatalog.getBooks()).toHaveLength(66);
      expect(scan.booksWithText).toBe(66);
    });

    it('matches the canon matrix chapter and verse counts, except the documented differences', () => {
      expect(scan.gaps).toEqual(VERSIFICATION_EXCEPTIONS[code]);
    });

    it('has no { } [ ] markers in any verse', () => {
      expect(scan.markedVerses.slice(0, 20)).toEqual([]);
      expect(scan.markedVerses).toHaveLength(0);
    });

    it('is served by the Scripture Catalog verse for verse', () => {
      const differing: string[] = [];
      for (const [bookId, chapters] of Object.entries(DATASET_BOOKS[code])) {
        for (const [chapter, verses] of Object.entries(chapters)) {
          for (const [verse, text] of Object.entries(verses)) {
            const served = scriptureCatalog.fetchPassageText(bookId, Number(chapter), Number(verse), undefined, code);
            // A blank verse (a documented "missing" one in the WEB) is served as no text.
            if (served !== (text.trim() || null)) differing.push(`${bookId} ${chapter}:${verse}`);
          }
        }
      }
      expect(differing.slice(0, 20)).toEqual([]);
    });

    it('carries non-empty name, language, licence, notice and source metadata', () => {
      const meta = scriptureCatalog.getTranslationMetadata(code);
      expect(meta).not.toBeNull();
      expect(meta!.code).toBe(code);
      expect(['en', 'pt']).toContain(meta!.language);
      for (const field of ['name', 'fullName', 'license', 'notice', 'sourceUrl'] as const) {
        expect(meta![field].trim()).not.toBe('');
      }
    });
  });
});

describe('Psalm titles are not verse text (Ticket 85)', () => {
  it('has a Psalm title exception list for every bundled translation', () => {
    expect(Object.keys(PSALM_TITLE_EXCEPTIONS).sort()).toEqual([...BUNDLED_TRANSLATIONS].sort());
  });

  it('recognises the titles the eBible verse-per-line sources merged into verse 1', () => {
    expect(titleOpening('pt').test('Salmo de Davi: O SENHOR é meu pastor, nada me faltará.')).toBe(true);
    expect(titleOpening('pt').test('Para o mestre de música. Salmo de Davi. Ó Deus, tenha misericórdia')).toBe(true);
    expect(titleOpening('pt').test('Cântico dos degraus: Em minha angústia clamei ao SENHOR')).toBe(true);
    expect(titleOpening('en').test('A Psalm of David. The LORD is my shepherd; I shall not want.')).toBe(true);
    expect(titleOpening('en').test('For the choirmaster. A Psalm of David. Have mercy on me, O God')).toBe(true);
    expect(titleOpening('en').test('Of David. The LORD is my light and my salvation')).toBe(true);

    expect(titleOpening('pt').test('O SENHOR é meu pastor, nada me faltará.')).toBe(false);
    expect(titleOpening('en').test('The LORD is my shepherd; I shall not want.')).toBe(false);
  });

  it.each([...BUNDLED_TRANSLATIONS])(
    '%s: no Psalm verse 1 starts with a title, except the documented ones',
    (code) => {
      const language = scriptureCatalog.getTranslationMetadata(code)!.language;
      const opening = titleOpening(language);
      const titled: string[] = [];
      for (let chapter = 1; chapter <= 150; chapter++) {
        const verse1 = scriptureCatalog.fetchPassageText('PSA', chapter, 1, undefined, code);
        expect(verse1).toBeTruthy();
        if (opening.test(verse1!)) titled.push(`PSA ${chapter}:1`);
      }
      expect(titled).toEqual(PSALM_TITLE_EXCEPTIONS[code]);
    }
  );

  it('Psalm 23:1 starts with the verse words in Bíblia Livre, ONBV and BSB', () => {
    expect(scriptureCatalog.resolvePassage('Salmos 23:1', 'BLIVRE')?.text).toBe(
      'O SENHOR é meu pastor, nada me faltará.'
    );
    expect(scriptureCatalog.resolvePassage('Salmos 23:1', 'ONBV')?.text).toBe(
      'O Senhor é o meu pastor. Ele me dá tudo de que preciso!'
    );
    expect(scriptureCatalog.resolvePassage('Psalm 23:1', 'BSB')?.text).toBe(
      'The LORD is my shepherd; I shall not want.'
    );
  });
});
