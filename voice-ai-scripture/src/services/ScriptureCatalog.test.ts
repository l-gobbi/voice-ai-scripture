import {
  scriptureCatalog,
  ScriptureCatalog,
  ResolvedPassage,
  BUNDLED_TRANSLATIONS,
} from './ScriptureCatalog';

describe('ScriptureCatalog (Ticket 44)', () => {
  it('resolves Portuguese passage with canonicalRef, metadata, and bundled Bíblia Livre text', () => {
    const passage = scriptureCatalog.resolvePassage('Salmos 23:1', 'BLIVRE');

    expect(passage).not.toBeNull();
    expect(passage?.canonicalRef).toBe('Salmos 23:1');
    expect(passage?.bookId).toBe('PSA');
    expect(passage?.chapter).toBe(23);
    expect(passage?.startVerse).toBe(1);
    expect(passage?.language).toBe('pt');
    expect(passage?.isBundled).toBe(true);
    expect(passage?.text).toContain('O SENHOR é meu pastor');
  });

  it('resolves Portuguese passage from colloquial abbreviations (e.g. Sl 23:1, Jo 3:16)', () => {
    const psalm = scriptureCatalog.resolvePassage('sl 23:1', 'BLIVRE');
    expect(psalm?.canonicalRef).toBe('Salmos 23:1');
    expect(psalm?.bookId).toBe('PSA');

    const john = scriptureCatalog.resolvePassage('jo 3:16', 'BLIVRE');
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
    const passage = scriptureCatalog.resolvePassage('ps 23:1', 'BSB');
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

describe('ScriptureCatalog open-licensed Bibles (Ticket 80)', () => {
  it('bundles BLIVRE, the full ONBV, BSB and WEB', () => {
    for (const code of ['BLIVRE', 'ONBV', 'BSB', 'WEB']) {
      expect(scriptureCatalog.isBundledTranslation(code)).toBe(true);
    }
    expect(scriptureCatalog.isBundledTranslation('NVI')).toBe(false);
  });

  it.each([
    ['Bíblia Livre', 'BLIVRE'],
    ['biblia livre', 'BLIVRE'],
    ['blivre', 'BLIVRE'],
    ['BLIVRE', 'BLIVRE'],
    ['Berean', 'BSB'],
    ['Berean Standard Bible', 'BSB'],
    ['bsb', 'BSB'],
    // Only the "Open" title is the ONBV; plain Nova Bíblia Viva is another text (Ticket 82).
    ['Open Nova Bíblia Viva', 'ONBV'],
    ['onbv', 'ONBV'],
    ['World English Bible', 'WEB'],
  ])('canonicalizes the alias "%s" to %s', (alias, code) => {
    expect(scriptureCatalog.canonicalizeTranslation(alias)).toBe(code);
  });

  it('resolves Portuguese passages in Bíblia Livre', () => {
    const john = scriptureCatalog.resolvePassage('João 3:16', 'BLIVRE');
    expect(john?.isBundled).toBe(true);
    expect(john?.translation).toBe('BLIVRE');
    expect(john?.text).toBe(
      'Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito; para que todo aquele que nele crê não pereça, mas tenha a vida eterna.'
    );

    expect(scriptureCatalog.resolvePassage('Salmos 23:1', 'BLIVRE')?.text).toContain(
      'O SENHOR é meu pastor, nada me faltará.'
    );
  });

  it('removes the [ ] markers of Bíblia Livre but keeps the words inside them', () => {
    expect(scriptureCatalog.resolvePassage('Gênesis 27:21', 'BLIVRE')?.text).toBe(
      'E Isaque disse a Jacó: Aproxima-te agora, e te apalparei, filho meu, para que eu saiba se és meu filho Esaú ou não.'
    );
    expect(scriptureCatalog.resolvePassage('Levítico 24:5', 'BLIVRE')?.text).toBe(
      'E tomarás boa farinha, e cozerás dela doze tortas; cada torta será de dois décimos de efa.'
    );
  });

  it('resolves the full ONBV, well beyond the old 67-verse stub', () => {
    expect(scriptureCatalog.resolvePassage('João 3:16', 'ONBV')?.text).toBe(
      'Porque Deus amou tanto o mundo que deu o seu Filho único para que todo aquele que crer nele não pereça, mas tenha a vida eterna.'
    );
    expect(scriptureCatalog.resolvePassage('Mateus 6:33', 'ONBV')?.text).toBe(
      'Coloquem, pois, em primeiro lugar o Reino de Deus e a sua justiça, e ele dará a vocês todas essas coisas.'
    );
    expect(scriptureCatalog.resolvePassage('Apocalipse 22:21', 'ONBV')?.text).toBeTruthy();
  });

  it('resolves English passages and ranges in the Berean Standard Bible', () => {
    const john = scriptureCatalog.resolvePassage('John 3:16', 'BSB');
    expect(john?.isBundled).toBe(true);
    expect(john?.text).toBe(
      'For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.'
    );

    expect(scriptureCatalog.resolvePassage('Romans 8:28-29', 'BSB')?.text).toBe(
      'And we know that God works all things together for the good of those who love Him, who are called according to His purpose. ' +
        'For those God foreknew, He also predestined to be conformed to the image of His Son, so that He would be the firstborn among many brothers.'
    );

    expect(scriptureCatalog.resolvePassage('John 11:35', 'Berean')?.text).toBe('Jesus wept.');
  });

  it('treats BLIVRE and ONBV as Portuguese and BSB as English', () => {
    expect(scriptureCatalog.detectLanguage({ translation: 'BLIVRE', reference: 'John 3:16' })).toBe('pt');
    expect(scriptureCatalog.detectLanguage({ translation: 'ONBV', reference: 'John 3:16' })).toBe('pt');
    expect(scriptureCatalog.detectLanguage({ translation: 'BSB', reference: 'Salmos 23:1' })).toBe('en');
    expect(
      scriptureCatalog.detectLanguage({ translation: 'Bíblia Livre', reference: 'John 3:16' })
    ).toBe('pt');

    expect(scriptureCatalog.isPortugueseTranslation('BLIVRE')).toBe(true);
    expect(scriptureCatalog.isPortugueseTranslation('Bíblia Livre')).toBe(true);
    expect(scriptureCatalog.isPortugueseTranslation('ONBV')).toBe(true);
    expect(scriptureCatalog.isPortugueseTranslation('BSB')).toBe(false);
    expect(scriptureCatalog.isPortugueseTranslation('WEB')).toBe(false);
  });

  it('exposes the licence and required notice of each open translation', () => {
    const blivre = scriptureCatalog.getTranslationMetadata('BLIVRE');
    expect(blivre).toMatchObject({ code: 'BLIVRE', name: 'Bíblia Livre', language: 'pt' });
    expect(blivre?.license).toContain('Creative Commons Atribuição 4.0 Brasil');
    expect(blivre?.notice).toContain(
      'Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio, e Marco Teles'
    );
    expect(blivre?.sourceUrl).toContain('ebible.org');
    // CC BY asks whoever redistributes the text to say what they changed (the [ ] markers).
    expect(blivre?.changes).toBeTruthy();

    const onbv = scriptureCatalog.getTranslationMetadata('ONBV');
    expect(onbv).toMatchObject({
      code: 'ONBV',
      language: 'pt',
      fullName: 'Biblica® Open Nova Bíblia Viva™',
    });
    expect(onbv?.license).toContain('CC BY-SA 4.0');
    expect(onbv?.notice).toContain(
      'Biblica® Open Nova Bíblia Viva™\nCopyright © 2007, 2010 by Biblica, Inc.'
    );
    expect(onbv?.notice).toContain(
      '“Biblica” is a trademark registered in the United States Patent and Trademark Office by Biblica, Inc. Used with permission.'
    );

    const bsb = scriptureCatalog.getTranslationMetadata('BSB');
    expect(bsb).toMatchObject({ code: 'BSB', name: 'Berean Standard Bible', language: 'en' });
    expect(bsb?.license).toContain('Public domain');
    expect(bsb?.notice).toContain(
      "This text of God's Word has been dedicated to the public domain."
    );

    const web = scriptureCatalog.getTranslationMetadata('WEB');
    expect(web).toMatchObject({ code: 'WEB', name: 'World English Bible', language: 'en' });
    expect(web?.notice).toContain('"World English Bible" is a Trademark of eBible.org.');
  });

  it('pins the ONBV notice, line for line as eBible gives it (Ticket 92)', () => {
    expect(scriptureCatalog.getTranslationMetadata('ONBV')?.notice).toBe(
      'Biblica® Open Nova Bíblia Viva™\n' +
        'Copyright © 2007, 2010 by Biblica, Inc.\n' +
        '“Biblica” é uma marca registrada na Oficina de Patentes e Marcas dos Estados Unidos por Biblica, Inc. Usado com permissão.\n' +
        '“Biblica” is a trademark registered in the United States Patent and Trademark Office by Biblica, Inc. Used with permission.'
    );
  });

  it('states where the original ONBV is available, as its licence asks of a changed work (Ticket 92)', () => {
    // Omitting the Psalm titles changes the ONBV, so besides listing the changes the app must
    // "show where the original Work is from" (https://ebible.org/find/details.php?id=poronbv).
    const onbv = scriptureCatalog.getTranslationMetadata('ONBV');
    expect(onbv?.changes).toContain('títulos dos Salmos');
    expect(onbv?.originalWork).toBe(
      'The original Work by its copyright holders is available for free at www.biblica.com and open.bible.'
    );

    for (const code of ['BLIVRE', 'BSB', 'WEB']) {
      expect(scriptureCatalog.getTranslationMetadata(code)?.originalWork).toBeUndefined();
    }
  });

  it('looks metadata up by alias, lists every bundled translation and has none for labels without text', () => {
    expect(scriptureCatalog.getTranslationMetadata('Bíblia Livre')?.code).toBe('BLIVRE');
    expect(scriptureCatalog.getTranslationMetadata('NVI')).toBeNull();
    expect(scriptureCatalog.getTranslationMetadata(undefined)).toBeNull();
    expect(scriptureCatalog.getBundledTranslations().map((m) => m.code)).toEqual([
      ...BUNDLED_TRANSLATIONS,
    ]);
  });
});

describe('ScriptureCatalog ships only open-licensed Bibles (Ticket 81)', () => {
  it('bundles exactly BLIVRE, ONBV, BSB and WEB, with no ALMEIDA or KJV text', () => {
    expect([...BUNDLED_TRANSLATIONS]).toEqual(['BLIVRE', 'ONBV', 'BSB', 'WEB']);
    expect(scriptureCatalog.getBundledTranslations().map((m) => m.code)).toEqual([
      'BLIVRE',
      'ONBV',
      'BSB',
      'WEB',
    ]);
  });

  it('defaults to Bíblia Livre in Portuguese and to the Berean Standard Bible in English', () => {
    expect(scriptureCatalog.getDefaultTranslation('pt')).toBe('BLIVRE');
    expect(scriptureCatalog.getDefaultTranslation('en')).toBe('BSB');
    expect(scriptureCatalog.getDefaultTranslation('João 3:16')).toBe('BLIVRE');
    expect(scriptureCatalog.getDefaultTranslation('John 3:16')).toBe('BSB');
  });

  it('resolves a passage without a translation in the default for its language', () => {
    const joao = scriptureCatalog.resolvePassage('João 3:16');
    expect(joao?.translation).toBe('BLIVRE');
    expect(joao?.isBundled).toBe(true);
    expect(joao?.text).toBe(
      'Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito; para que todo aquele que nele crê não pereça, mas tenha a vida eterna.'
    );

    const john = scriptureCatalog.resolvePassage('John 11:35');
    expect(john?.translation).toBe('BSB');
    expect(john?.text).toBe('Jesus wept.');
  });

  it.each(['ALMEIDA', 'KJV', 'ARA', 'ARC', 'ACF', 'NAA', 'NVI', 'NTLH', 'NVT', 'NIV', 'ESV', 'NKJV'])(
    'keeps %s as a label without bundled text or metadata',
    (label) => {
      expect(scriptureCatalog.isBundledTranslation(label)).toBe(false);
      expect(scriptureCatalog.canonicalizeTranslation(label)).toBeNull();
      expect(scriptureCatalog.getTranslationMetadata(label)).toBeNull();
    }
  );

  it.each([
    ['ALMEIDA', 'pt'],
    ['almeida', 'pt'],
    ['ARA', 'pt'],
    ['ARC', 'pt'],
    ['ACF', 'pt'],
    ['NAA', 'pt'],
    ['NVI', 'pt'],
    ['NTLH', 'pt'],
    ['NVT', 'pt'],
    ['KJV', 'en'],
    ['kjv', 'en'],
    ['NIV', 'en'],
    ['ESV', 'en'],
    ['NKJV', 'en'],
  ] as const)('still knows the language of the label %s (%s)', (label, language) => {
    // The reference is in the other language, so only the label can decide.
    const reference = language === 'pt' ? 'John 3:16' : 'João 3:16';
    expect(scriptureCatalog.detectLanguage({ translation: label, reference })).toBe(language);
    expect(scriptureCatalog.isPortugueseTranslation(label)).toBe(language === 'pt');
  });

  it('returns the reference but no text when asked for ALMEIDA or KJV text', () => {
    const almeida = scriptureCatalog.resolvePassage('Salmos 23:1', 'ALMEIDA');
    expect(almeida).toMatchObject({
      canonicalRef: 'Salmos 23:1',
      language: 'pt',
      translation: 'ALMEIDA',
      isBundled: false,
    });
    expect(almeida?.text).toBeUndefined();

    const kjv = scriptureCatalog.resolvePassage('John 3:16', 'KJV');
    expect(kjv).toMatchObject({ canonicalRef: 'John 3:16', translation: 'KJV', isBundled: false });
    expect(kjv?.text).toBeUndefined();

    expect(scriptureCatalog.fetchPassageText('PSA', 23, 1, undefined, 'ALMEIDA')).toBeNull();
    expect(scriptureCatalog.fetchPassageText('JHN', 3, 16, undefined, 'KJV')).toBeNull();
  });

  it('recognizes bundled names and labels without text, and nothing else', () => {
    expect(scriptureCatalog.recognizeTranslation('Berean')).toBe('BSB');
    expect(scriptureCatalog.recognizeTranslation('Bíblia Livre')).toBe('BLIVRE');
    expect(scriptureCatalog.recognizeTranslation('almeida')).toBe('ALMEIDA');
    expect(scriptureCatalog.recognizeTranslation('kjv')).toBe('KJV');
    expect(scriptureCatalog.recognizeTranslation('ACF')).toBe('ACF');
    expect(scriptureCatalog.recognizeTranslation('XYZ')).toBeNull();
    expect(scriptureCatalog.recognizeTranslation(undefined)).toBeNull();
  });

  it('no longer reads the old ALMEIDA and KJV aliases as bundled translations', () => {
    for (const alias of ['Almeida', 'JFA', 'João Ferreira de Almeida', 'King James', 'King James Version']) {
      expect(scriptureCatalog.canonicalizeTranslation(alias)).toBeNull();
    }
  });

  it('looks text up in the English default when no translation is given', () => {
    expect(scriptureCatalog.fetchPassageText('JHN', 3, 16)).toBe(
      'For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.'
    );
  });
});

describe('ScriptureCatalog: NBV is not the ONBV (Ticket 82)', () => {
  it.each(['ONBV', 'onbv', 'Open Nova Bíblia Viva', 'open nova biblia viva', 'Biblica® Open Nova Bíblia Viva™', 'Open NBV'])(
    'reads "%s" as the bundled ONBV',
    (alias) => {
      expect(scriptureCatalog.canonicalizeTranslation(alias)).toBe('ONBV');
      expect(scriptureCatalog.recognizeTranslation(alias)).toBe('ONBV');
    }
  );

  it.each(['NBV', 'nbv', 'Nova Bíblia Viva', 'nova biblia viva'])(
    'keeps "%s", the copyrighted Nova Bíblia Viva, as a Portuguese label without bundled text',
    (label) => {
      expect(scriptureCatalog.canonicalizeTranslation(label)).toBeNull();
      expect(scriptureCatalog.isBundledTranslation(label)).toBe(false);
      expect(scriptureCatalog.getTranslationMetadata(label)).toBeNull();
      expect(scriptureCatalog.recognizeTranslation(label)).toBe('NBV');
      expect(scriptureCatalog.isPortugueseTranslation(label)).toBe(true);
      expect(scriptureCatalog.detectLanguage({ translation: label, reference: 'John 3:16' })).toBe('pt');
    }
  );

  it('has no text for an NBV verse, so nothing replaces its wording', () => {
    const nbv = scriptureCatalog.resolvePassage('João 3:16', 'NBV');
    expect(nbv).toMatchObject({ canonicalRef: 'João 3:16', translation: 'NBV', isBundled: false });
    expect(nbv?.text).toBeUndefined();
    expect(scriptureCatalog.fetchPassageText('JHN', 3, 16, undefined, 'NBV')).toBeNull();
  });
});

describe('ScriptureCatalog: labels without bundled text (Ticket 92)', () => {
  it('lists every label it recognizes but has no text for, per language, in picker order', () => {
    expect(scriptureCatalog.getUnbundledLabels('pt')).toEqual([
      'ARA', 'ARC', 'ACF', 'NAA', 'NVI', 'NTLH', 'NVT', 'NBV', 'ALMEIDA',
    ]);
    expect(scriptureCatalog.getUnbundledLabels('en')).toEqual([
      'KJV', 'NIV', 'ESV', 'NKJV', 'NASB', 'NLT', 'MSG', 'ASV',
    ]);
  });

  it.each(['pt', 'en'] as const)('each %s label is recognized in its language and has no text', (language) => {
    for (const label of scriptureCatalog.getUnbundledLabels(language)) {
      expect(scriptureCatalog.recognizeTranslation(label.toLowerCase())).toBe(label);
      expect(scriptureCatalog.isBundledTranslation(label)).toBe(false);
      expect(scriptureCatalog.detectLanguage({ translation: label })).toBe(language);
    }
  });
});

describe('ScriptureCatalog: translations per language (Ticket 82)', () => {
  it('lists the bundled translations of one language, in catalog order', () => {
    expect(scriptureCatalog.getBundledTranslations('pt').map((m) => m.code)).toEqual([
      'BLIVRE',
      'ONBV',
    ]);
    expect(scriptureCatalog.getBundledTranslations('en').map((m) => m.code)).toEqual([
      'BSB',
      'WEB',
    ]);
  });

  it("names a reference's language, English when the reference is not recognized", () => {
    expect(scriptureCatalog.referenceLanguage('Salmos 23:1')).toBe('pt');
    expect(scriptureCatalog.referenceLanguage('Psalm 23:1')).toBe('en');
    expect(scriptureCatalog.referenceLanguage('João')).toBe('en');
    expect(scriptureCatalog.referenceLanguage('')).toBe('en');
  });

  it.each([
    ['Salmos 23:1', ['pt']],
    ['João 3:16', ['pt']],
    ['Psalm 23:1', ['en']],
    ['John 3:16', ['en']],
    ['Gênesis 1:1', ['pt']],
    ['Amós 5:24', ['pt']],
    // The same spelling in both languages.
    ['Genesis 1:1', ['pt', 'en']],
    ['Daniel 6:22', ['pt', 'en']],
    ['1 Samuel 3:10', ['pt', 'en']],
    ['Gn 1:1', ['pt', 'en']],
    ['Heb 11:1', ['pt', 'en']],
    // Not a reference (yet).
    ['João', []],
    ['Salmos 23:', []],
    ['', []],
  ] as const)('tells which languages the book name of "%s" is written in', (reference, languages) => {
    expect(scriptureCatalog.referenceLanguages(reference)).toEqual(languages);
  });
});
