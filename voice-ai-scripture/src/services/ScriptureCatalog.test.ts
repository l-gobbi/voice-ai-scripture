import {
  scriptureCatalog,
  ScriptureCatalog,
  ResolvedPassage,
} from './ScriptureCatalog';

describe('ScriptureCatalog (Ticket 44)', () => {
  it('resolves Portuguese passage with canonicalRef, metadata, and bundled Almeida text', () => {
    const passage = scriptureCatalog.resolvePassage('Salmos 23:1', 'ALMEIDA');

    expect(passage).not.toBeNull();
    expect(passage?.canonicalRef).toBe('Salmos 23:1');
    expect(passage?.bookId).toBe('PSA');
    expect(passage?.chapter).toBe(23);
    expect(passage?.startVerse).toBe(1);
    expect(passage?.language).toBe('pt');
    expect(passage?.isBundled).toBe(true);
    expect(passage?.text).toContain('O Senhor é o meu pastor');
  });

  it('resolves Portuguese passage from colloquial abbreviations (e.g. Sl 23:1, Jo 3:16)', () => {
    const psalm = scriptureCatalog.resolvePassage('sl 23:1', 'ALMEIDA');
    expect(psalm?.canonicalRef).toBe('Salmos 23:1');
    expect(psalm?.bookId).toBe('PSA');

    const john = scriptureCatalog.resolvePassage('jo 3:16', 'ALMEIDA');
    expect(john?.canonicalRef).toBe('João 3:16');
    expect(john?.bookId).toBe('JHN');
  });

  it('resolves English passage with canonicalRef, metadata, and bundled WEB text', () => {
    const passage = scriptureCatalog.resolvePassage('John 3:16', 'WEB');

    expect(passage).not.toBeNull();
    expect(passage?.canonicalRef).toBe('John 3:16');
    expect(passage?.bookId).toBe('JHN');
    expect(passage?.chapter).toBe(3);
    expect(passage?.startVerse).toBe(16);
    expect(passage?.language).toBe('en');
    expect(passage?.isBundled).toBe(true);
    expect(passage?.text).toContain('For God so loved the world');
  });

  it('resolves English passage from common abbreviations (e.g. Ps 23:1, Jn 3:16)', () => {
    const passage = scriptureCatalog.resolvePassage('ps 23:1', 'KJV');
    expect(passage?.canonicalRef).toBe('Psalms 23:1');
    expect(passage?.bookId).toBe('PSA');

    const john = scriptureCatalog.resolvePassage('jn 3:16', 'WEB');
    expect(john?.canonicalRef).toBe('John 3:16');
    expect(john?.bookId).toBe('JHN');
  });

  it('detects language accurately prioritizing text markers and falling back to translation code and reference', () => {
    expect(
      scriptureCatalog.detectLanguage({
        text: 'O Senhor é o meu pastor, nada me faltará.',
      })
    ).toBe('pt');

    expect(
      scriptureCatalog.detectLanguage({
        text: 'The Lord is my shepherd; I shall not want.',
      })
    ).toBe('en');

    expect(
      scriptureCatalog.detectLanguage({
        reference: 'Salmos 23:1',
      })
    ).toBe('pt');

    expect(
      scriptureCatalog.detectLanguage({
        translation: 'ALMEIDA',
        reference: 'John 3:16',
      })
    ).toBe('pt');

    expect(
      scriptureCatalog.detectLanguage({
        translation: 'WEB',
        reference: 'Salmos 23:1',
      })
    ).toBe('en');
  });

  it('provides canon bounds for books and verses', () => {
    const otBooks = scriptureCatalog.getBooks('OT');
    expect(otBooks.length).toBe(39);

    const ntBooks = scriptureCatalog.getBooks('NT');
    expect(ntBooks.length).toBe(27);

    const psalmVerses = scriptureCatalog.getVerseCount('PSA', 23);
    expect(psalmVerses).toBe(6);

    const johnChapters = scriptureCatalog.getChapterCount('JHN');
    expect(johnChapters).toBe(21);
  });

  it('returns null for invalid references or unparseable queries', () => {
    expect(scriptureCatalog.resolvePassage('Not A Verse')).toBeNull();
    expect(scriptureCatalog.resolvePassage('')).toBeNull();
    expect(scriptureCatalog.resolveReference('Genesis 0:1')).toBeNull();
  });
});
