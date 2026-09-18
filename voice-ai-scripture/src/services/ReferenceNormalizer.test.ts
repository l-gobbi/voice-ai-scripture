import { normalizeReference, NormalizedReference } from './ReferenceNormalizer';

describe('ReferenceNormalizer (Ticket 13)', () => {
  describe('Slice 1: Single Verses in English and Portuguese', () => {
    it('normalizes standard English reference', () => {
      const result = normalizeReference('John 3:16');
      expect(result).toEqual({
        bookId: 'JHN',
        bookName: 'John',
        chapter: 3,
        startVerse: 16,
        endVerse: undefined,
        canonicalRef: 'John 3:16',
        language: 'en',
      });
    });

    it('normalizes standard Portuguese reference', () => {
      const result = normalizeReference('João 3:16');
      expect(result).toEqual({
        bookId: 'JHN',
        bookName: 'João',
        chapter: 3,
        startVerse: 16,
        endVerse: undefined,
        canonicalRef: 'João 3:16',
        language: 'pt',
      });
    });

    it('normalizes common Portuguese abbreviations like Jo and Rm', () => {
      const joao = normalizeReference('Jo 3:16');
      expect(joao).toEqual({
        bookId: 'JHN',
        bookName: 'João',
        chapter: 3,
        startVerse: 16,
        endVerse: undefined,
        canonicalRef: 'João 3:16',
        language: 'pt',
      });

      const romanos = normalizeReference('Rm 8:28');
      expect(romanos).toEqual({
        bookId: 'ROM',
        bookName: 'Romanos',
        chapter: 8,
        startVerse: 28,
        endVerse: undefined,
        canonicalRef: 'Romanos 8:28',
        language: 'pt',
      });
    });

    it('normalizes common English abbreviations like Rom and Ps', () => {
      const rom = normalizeReference('Rom 8:28');
      expect(rom).toEqual({
        bookId: 'ROM',
        bookName: 'Romans',
        chapter: 8,
        startVerse: 28,
        endVerse: undefined,
        canonicalRef: 'Romans 8:28',
        language: 'en',
      });

      const ps = normalizeReference('Ps 23:1');
      expect(ps).toEqual({
        bookId: 'PSA',
        bookName: 'Psalms',
        chapter: 23,
        startVerse: 1,
        endVerse: undefined,
        canonicalRef: 'Psalms 23:1',
        language: 'en',
      });
    });
  });

  describe('Slice 2: Numbered Books & Diacritics', () => {
    it('normalizes numbered books with varied spacing in Portuguese', () => {
      const cor1 = normalizeReference('1 Coríntios 13:4');
      expect(cor1).toEqual({
        bookId: '1CO',
        bookName: '1 Coríntios',
        chapter: 13,
        startVerse: 4,
        endVerse: undefined,
        canonicalRef: '1 Coríntios 13:4',
        language: 'pt',
      });

      const cor1Short = normalizeReference('1 Co 13:4');
      expect(cor1Short).toEqual({
        bookId: '1CO',
        bookName: '1 Coríntios',
        chapter: 13,
        startVerse: 4,
        endVerse: undefined,
        canonicalRef: '1 Coríntios 13:4',
        language: 'pt',
      });

      const cor1NoSpace = normalizeReference('1co 13:4');
      expect(cor1NoSpace).toEqual({
        bookId: '1CO',
        bookName: '1 Coríntios',
        chapter: 13,
        startVerse: 4,
        endVerse: undefined,
        canonicalRef: '1 Coríntios 13:4',
        language: 'pt',
      });
    });

    it('normalizes numbered books in English', () => {
      const cor1En = normalizeReference('1 Corinthians 13:4');
      expect(cor1En).toEqual({
        bookId: '1CO',
        bookName: '1 Corinthians',
        chapter: 13,
        startVerse: 4,
        endVerse: undefined,
        canonicalRef: '1 Corinthians 13:4',
        language: 'en',
      });

      const john1 = normalizeReference('1 John 1:9');
      expect(john1).toEqual({
        bookId: '1JN',
        bookName: '1 John',
        chapter: 1,
        startVerse: 9,
        endVerse: undefined,
        canonicalRef: '1 John 1:9',
        language: 'en',
      });
    });

    it('handles accents and diacritics in Portuguese book names (Gênesis, Êxodo, Apocalipse)', () => {
      const gen = normalizeReference('Gênesis 1:1');
      expect(gen?.bookId).toBe('GEN');
      expect(gen?.bookName).toBe('Gênesis');
      expect(gen?.language).toBe('pt');

      const genNoAccent = normalizeReference('Genesis 1:1');
      expect(genNoAccent?.bookId).toBe('GEN');

      const apoc = normalizeReference('Ap 21:4');
      expect(apoc?.bookId).toBe('REV');
      expect(apoc?.bookName).toBe('Apocalipse');
      expect(apoc?.language).toBe('pt');
    });
  });

  describe('Slice 3: Multi-Verse Spans & Varied Punctuation', () => {
    it('normalizes multi-verse ranges with hyphens', () => {
      const rangePt = normalizeReference('João 3:16-17');
      expect(rangePt).toEqual({
        bookId: 'JHN',
        bookName: 'João',
        chapter: 3,
        startVerse: 16,
        endVerse: 17,
        canonicalRef: 'João 3:16-17',
        language: 'pt',
      });

      const rangeEn = normalizeReference('Philippians 4:6-7');
      expect(rangeEn).toEqual({
        bookId: 'PHP',
        bookName: 'Philippians',
        chapter: 4,
        startVerse: 6,
        endVerse: 7,
        canonicalRef: 'Philippians 4:6-7',
        language: 'en',
      });
    });

    it('handles dot notation instead of colon (e.g. Rm 8.28)', () => {
      const dotRef = normalizeReference('Rm 8.28');
      expect(dotRef).toEqual({
        bookId: 'ROM',
        bookName: 'Romanos',
        chapter: 8,
        startVerse: 28,
        endVerse: undefined,
        canonicalRef: 'Romanos 8:28',
        language: 'pt',
      });
    });

    it('handles tight spacing without spaces between book and chapter', () => {
      const tightRef = normalizeReference('jo3:16');
      expect(tightRef).toEqual({
        bookId: 'JHN',
        bookName: 'João',
        chapter: 3,
        startVerse: 16,
        endVerse: undefined,
        canonicalRef: 'João 3:16',
        language: 'pt',
      });
    });

    it('handles spaces around verse range hyphens gracefully', () => {
      const spacedRange = normalizeReference('João 3:16 - 17');
      expect(spacedRange).toEqual({
        bookId: 'JHN',
        bookName: 'João',
        chapter: 3,
        startVerse: 16,
        endVerse: 17,
        canonicalRef: 'João 3:16-17',
        language: 'pt',
      });
    });

    it('normalizes Ephesians in Portuguese correctly as Efésios', () => {
      const ephPt = normalizeReference('Efésios 2:8-9');
      expect(ephPt).toEqual({
        bookId: 'EPH',
        bookName: 'Efésios',
        chapter: 2,
        startVerse: 8,
        endVerse: 9,
        canonicalRef: 'Efésios 2:8-9',
        language: 'pt',
      });

      const ephAbbr = normalizeReference('ef 2:8');
      expect(ephAbbr?.bookName).toBe('Efésios');
      expect(ephAbbr?.language).toBe('pt');
    });

    it('disambiguates English Jn abbreviation to John rather than Jonas', () => {
      const jnEn = normalizeReference('Jn 3:16');
      expect(jnEn).toEqual({
        bookId: 'JHN',
        bookName: 'John',
        chapter: 3,
        startVerse: 16,
        endVerse: undefined,
        canonicalRef: 'John 3:16',
        language: 'en',
      });
    });
  });

  describe('Slice 4: Unparseable & Invalid Inputs', () => {
    it('returns null for empty string or whitespace', () => {
      expect(normalizeReference('')).toBeNull();
      expect(normalizeReference('   ')).toBeNull();
    });

    it('returns null for non-biblical book names', () => {
      expect(normalizeReference('Harry Potter 3:16')).toBeNull();
      expect(normalizeReference('Foo 1:1')).toBeNull();
    });

    it('returns null when chapter or verse is missing', () => {
      expect(normalizeReference('John')).toBeNull();
      expect(normalizeReference('John 3')).toBeNull();
      expect(normalizeReference('3:16')).toBeNull();
    });

    it('returns null when verse numbers are invalid or negative', () => {
      expect(normalizeReference('John 3:0')).toBeNull();
      expect(normalizeReference('John 0:16')).toBeNull();
    });
  });
});
