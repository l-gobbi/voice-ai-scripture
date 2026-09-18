import {
  CanonBook,
  getCanonBooks,
  getCanonBook,
  searchCanonBooks,
  getChapterCount,
  getVerseCount,
} from './bibleCanon';

describe('BibleCanon (Ticket 18)', () => {
  describe('Slice 1: Canon Books & Testament Grouping', () => {
    it('returns all 66 books of the Protestant canon', () => {
      const allBooks = getCanonBooks();
      expect(allBooks).toHaveLength(66);
    });

    it('returns 39 books for the Old Testament (OT)', () => {
      const otBooks = getCanonBooks('OT');
      expect(otBooks).toHaveLength(39);
      expect(otBooks[0].id).toBe('GEN');
      expect(otBooks[otBooks.length - 1].id).toBe('MAL');
      otBooks.forEach((book) => expect(book.testament).toBe('OT'));
    });

    it('returns 27 books for the New Testament (NT)', () => {
      const ntBooks = getCanonBooks('NT');
      expect(ntBooks).toHaveLength(27);
      expect(ntBooks[0].id).toBe('MAT');
      expect(ntBooks[ntBooks.length - 1].id).toBe('REV');
      ntBooks.forEach((book) => expect(book.testament).toBe('NT'));
    });

    it('ensures every book has valid metadata, positive chapter count, and matching verseCounts length', () => {
      const allBooks = getCanonBooks();
      allBooks.forEach((book) => {
        expect(book.id).toBeTruthy();
        expect(book.enName).toBeTruthy();
        expect(book.ptName).toBeTruthy();
        expect(book.chapters).toBeGreaterThan(0);
        expect(book.verseCounts).toHaveLength(book.chapters);
        book.verseCounts.forEach((vCount) => {
          expect(vCount).toBeGreaterThan(0);
        });
      });
    });

    it('retrieves a single book by OSIS ID', () => {
      const jhn = getCanonBook('JHN');
      expect(jhn).toBeDefined();
      expect(jhn?.enName).toBe('John');
      expect(jhn?.ptName).toBe('João');
      expect(jhn?.chapters).toBe(21);

      expect(getCanonBook('NON_EXISTENT')).toBeUndefined();
    });
  });

  describe('Slice 2: Boundary Chapter & Verse Counts', () => {
    it('returns correct chapter counts for boundary books', () => {
      expect(getChapterCount('GEN')).toBe(50);
      expect(getChapterCount('PSA')).toBe(150);
      expect(getChapterCount('OBA')).toBe(1); // Obadiah has 1 chapter
      expect(getChapterCount('PHM')).toBe(1); // Philemon has 1 chapter
      expect(getChapterCount('2JN')).toBe(1); // 2 John has 1 chapter
      expect(getChapterCount('3JN')).toBe(1); // 3 John has 1 chapter
      expect(getChapterCount('JUD')).toBe(1); // Jude has 1 chapter
      expect(getChapterCount('INVALID')).toBe(0);
    });

    it('returns accurate verse counts for landmark chapters', () => {
      // Genesis 1 has 31 verses
      expect(getVerseCount('GEN', 1)).toBe(31);
      // Psalm 23 has 6 verses
      expect(getVerseCount('PSA', 23)).toBe(6);
      // Psalm 119 has 176 verses
      expect(getVerseCount('PSA', 119)).toBe(176);
      // John 3 has 36 verses
      expect(getVerseCount('JHN', 3)).toBe(36);
      // Romans 8 has 39 verses
      expect(getVerseCount('ROM', 8)).toBe(39);
      // Philippians 4 has 23 verses
      expect(getVerseCount('PHP', 4)).toBe(23);
    });

    it('returns 0 for non-existent chapters or invalid book IDs', () => {
      expect(getVerseCount('GEN', 0)).toBe(0);
      expect(getVerseCount('GEN', 51)).toBe(0);
      expect(getVerseCount('PSA', 151)).toBe(0);
      expect(getVerseCount('OBA', 2)).toBe(0);
      expect(getVerseCount('NON_EXISTENT', 1)).toBe(0);
    });
  });

  describe('Slice 3: Bilingual Book Search & Aliases', () => {
    it('searches books by Portuguese name and Portuguese aliases', () => {
      const results = searchCanonBooks('João');
      const ids = results.map((b) => b.id);
      expect(ids).toContain('JHN');
      expect(ids).toContain('1JN');
      expect(ids).toContain('2JN');
      expect(ids).toContain('3JN');

      // Sl abbreviation for Salmos
      const slResults = searchCanonBooks('Sl');
      expect(slResults.some((b) => b.id === 'PSA')).toBe(true);

      // Rm abbreviation for Romanos
      const rmResults = searchCanonBooks('Rm');
      expect(rmResults.some((b) => b.id === 'ROM')).toBe(true);

      // 1 Co for 1 Coríntios
      const coResults = searchCanonBooks('1 Co');
      expect(coResults.some((b) => b.id === '1CO')).toBe(true);
    });

    it('searches books by English name and English aliases', () => {
      const results = searchCanonBooks('John');
      const ids = results.map((b) => b.id);
      expect(ids).toContain('JHN');

      // Ps abbreviation for Psalms
      const psResults = searchCanonBooks('Ps');
      expect(psResults.some((b) => b.id === 'PSA')).toBe(true);

      // Rom abbreviation for Romans
      const romResults = searchCanonBooks('Rom');
      expect(romResults.some((b) => b.id === 'ROM')).toBe(true);
    });

    it('handles case-insensitivity and accents gracefully in search', () => {
      const genesisWithAccent = searchCanonBooks('gênesis');
      expect(genesisWithAccent.some((b) => b.id === 'GEN')).toBe(true);

      const genesisWithoutAccent = searchCanonBooks('genesis');
      expect(genesisWithoutAccent.some((b) => b.id === 'GEN')).toBe(true);

      const jo = searchCanonBooks('jó');
      expect(jo.some((b) => b.id === 'JOB')).toBe(true);
    });

    it('filters search results by testament when testament parameter is provided', () => {
      const ntResults = searchCanonBooks('Jo', 'NT');
      expect(ntResults.some((b) => b.id === 'JHN')).toBe(true);
      expect(ntResults.some((b) => b.id === 'JON')).toBe(false); // Jonah is OT
      expect(ntResults.some((b) => b.id === 'JOB')).toBe(false); // Job is OT
    });

    it('returns all books when query is empty or whitespace', () => {
      expect(searchCanonBooks('')).toHaveLength(66);
      expect(searchCanonBooks('   ')).toHaveLength(66);
      expect(searchCanonBooks('', 'OT')).toHaveLength(39);
      expect(searchCanonBooks('', 'NT')).toHaveLength(27);
    });
  });
});
