import { parseScriptureClipboard } from './clipboardParser';

describe('Scripture Clipboard Parser (Ticket 16)', () => {
  it('parses standard Portuguese YouVersion share format with hyphen and NVI tag', () => {
    const raw = `"Porque Deus tanto amou o mundo que deu o seu Filho Unigênito, para que todo o que nele crer não pereça, mas tenha a vida eterna."
- João 3:16 NVI
https://bible.com/bible/129/jhn.3.16.NVI`;

    const result = parseScriptureClipboard(raw);

    expect(result).not.toBeNull();
    expect(result?.reference).toBe('João 3:16');
    expect(result?.translation).toBe('NVI');
    expect(result?.text).toBe(
      'Porque Deus tanto amou o mundo que deu o seu Filho Unigênito, para que todo o que nele crer não pereça, mas tenha a vida eterna.'
    );
  });

  it('parses Portuguese format with em-dash and ARA tag', () => {
    const raw = `O Senhor é o meu pastor; nada me faltará.
— Salmos 23:1 ARA`;

    const result = parseScriptureClipboard(raw);

    expect(result).not.toBeNull();
    expect(result?.reference).toBe('Salmos 23:1');
    expect(result?.translation).toBe('ARA');
    expect(result?.text).toBe('O Senhor é o meu pastor; nada me faltará.');
  });

  it('parses English YouVersion share format with NIV tag and URL', () => {
    const raw = `“For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.”
‭‭John‬ ‭3‬:‭16‬ ‭NIV‬‬
https://bible.com/bible/111/jhn.3.16.NIV`;

    const result = parseScriptureClipboard(raw);

    expect(result).not.toBeNull();
    expect(result?.reference).toBe('John 3:16');
    expect(result?.translation).toBe('NIV');
    expect(result?.text).toBe(
      'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.'
    );
  });

  it('parses multi-verse citation like Romanos 8:28-29 NVI', () => {
    const raw = `Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus...
Romanos 8:28-29 NVI`;

    const result = parseScriptureClipboard(raw);

    expect(result).not.toBeNull();
    expect(result?.reference).toBe('Romanos 8:28-29');
    expect(result?.translation).toBe('NVI');
    expect(result?.text).toBe('Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus...');
  });

  it('parses ESV citation with book, chapter, and verse', () => {
    const raw = `The Lord is my strength and my shield; in him my heart trusts, and I am helped.
Psalm 28:7 ESV`;

    const result = parseScriptureClipboard(raw);

    expect(result).not.toBeNull();
    // The canonical reference (Ticket 91): ESV and KJV name the book "Psalm".
    expect(result?.reference).toBe('Psalms 28:7');
    expect(result?.translation).toBe('ESV');
    expect(result?.text).toBe('The Lord is my strength and my shield; in him my heart trusts, and I am helped.');
  });

  it('handles plain reference with no recognized translation as undefined translation', () => {
    const raw = `No princípio era o Verbo, e o Verbo estava com Deus...
João 1:1`;

    const result = parseScriptureClipboard(raw);

    expect(result).not.toBeNull();
    expect(result?.reference).toBe('João 1:1');
    expect(result?.translation).toBeUndefined();
    expect(result?.text).toBe('No princípio era o Verbo, e o Verbo estava com Deus...');
  });

  it('handles plain text without any reference citation gracefully', () => {
    const raw = `Apenas um texto solto sem referência bíblica`;

    const result = parseScriptureClipboard(raw);

    expect(result).not.toBeNull();
    expect(result?.reference).toBe('');
    expect(result?.text).toBe('Apenas um texto solto sem referência bíblica');
    expect(result?.translation).toBeUndefined();
  });

  it('returns null for empty or whitespace-only clipboard text', () => {
    expect(parseScriptureClipboard('')).toBeNull();
    expect(parseScriptureClipboard('   \n  ')).toBeNull();
  });
});

describe('Scripture Clipboard Parser translation labels (Ticket 81)', () => {
  it.each([
    ['João 3:16 BLIVRE', 'BLIVRE'],
    ['João 3:16 blivre', 'BLIVRE'],
    ['John 3:16 BSB', 'BSB'],
    ['John 3:16 Berean', 'BSB'],
    ['João 3:16 ONBV', 'ONBV'],
    ['John 3:16 WEB', 'WEB'],
  ])('recognizes the bundled translation in "%s" as %s', (citation, code) => {
    const result = parseScriptureClipboard(`Texto do versículo\n${citation}`);
    expect(result?.reference).toBe(citation.replace(/ \S+$/, ''));
    expect(result?.translation).toBe(code);
    expect(result?.text).toBe('Texto do versículo');
  });

  it.each([
    ['Salmos 23:1 ALMEIDA', 'ALMEIDA'],
    ['Salmos 23:1 ACF', 'ACF'],
    ['Salmos 23:1 ARC', 'ARC'],
    ['Salmos 23:1 naa', 'NAA'],
    ['Psalm 23:1 KJV', 'KJV'],
    ['Psalm 23:1 NKJV', 'NKJV'],
  ])('keeps recognizing the label without bundled text in "%s" as %s', (citation, label) => {
    const result = parseScriptureClipboard(`The verse\n${citation}`);
    expect(result?.translation).toBe(label);
  });

  it('leaves an unknown version tag unlabelled', () => {
    expect(parseScriptureClipboard('The verse\nPsalm 23:1 XYZ')?.translation).toBeUndefined();
  });
});

describe('Scripture Clipboard Parser: NBV is not the ONBV (Ticket 82)', () => {
  it('labels a YouVersion NBV paste NBV, not ONBV, and keeps its text', () => {
    const raw = `“Porque Deus amou tanto o mundo que deu o seu único Filho...”
João 3:16 NBV
https://bible.com/bible/1966/jhn.3.16.NBV`;

    const result = parseScriptureClipboard(raw);

    expect(result?.reference).toBe('João 3:16');
    expect(result?.translation).toBe('NBV');
    expect(result?.text).toBe('Porque Deus amou tanto o mundo que deu o seu único Filho...');
  });

  it.each(['ARA', 'ARC', 'ACF', 'NAA', 'NVI', 'NTLH', 'NVT', 'NBV', 'ALMEIDA'])(
    'keeps the Portuguese label %s',
    (label) => {
      expect(parseScriptureClipboard(`Texto\nSalmos 23:1 ${label}`)?.translation).toBe(label);
    }
  );

  it.each(['KJV', 'NIV', 'ESV', 'NKJV', 'NASB'])('keeps the English label %s', (label) => {
    expect(parseScriptureClipboard(`Text\nPsalm 23:1 ${label}`)?.translation).toBe(label);
  });
});

/**
 * Real YouVersion share texts (Ticket 91).
 *
 * The Bible App shares a selection as its wording in curly quotes, then the reference with its
 * parts wrapped in U+202D LEFT-TO-RIGHT OVERRIDE … U+202C POP DIRECTIONAL FORMATTING, then a
 * bible.com link with the lowercase USFM book code (Layout A):
 *
 *   “And Abel also brought an offering…”
 *   \u202D\u202DGenesis\u202C \u202D4\u202C:\u202D4\u202C \u202DNIV\u202C\u202C
 *   https://bible.com/bible/111/gen.4.4.NIV
 *
 * Until about October 2022 chapter and verses were one wrapped part (\u202D5:15-20\u202C).
 * Another layout (B) puts the reference first, without the version, numbers each verse "[17] "
 * and gives the version only in the link. The verbatim samples below are pasted shares published
 * on GitHub (levidao-eth/Torah, 2021-2026; Petrus84/orbit, pt-BR). Version ids, abbreviations
 * and each version's book names come from YouVersion's API (nodejs.bible.com/api/bible/version/
 * 3.1). The ARA, NVI, NVT, NAA, NBV-P, KJV and NIV wordings are those of bible.com's verse pages,
 * with the Bible App's "Senhor"/"Lord" for the small capitals of SENHOR/LORD, as in the NIV
 * sample. The rest of the shapes (Layout A in Portuguese, numbered verses, promotion lines)
 * follow the observed ones but were not seen as they are.
 */
describe('Scripture Clipboard Parser: YouVersion share texts (Ticket 91)', () => {
  const LRO = '\u202D';
  const PDF = '\u202C';
  const wrap = (part: string) => `${LRO}${part}${PDF}`;

  /**
   * The reference line the Bible App writes since late 2022:
   * \u202D\u202DSalmos\u202C \u202D23\u202C:\u202D1\u202C-\u202D3\u202C \u202DNVI\u202C\u202C
   */
  const appCitation = (book: string, chapter: number, verses: string, version: string) =>
    `${LRO}${wrap(book)} ${wrap(String(chapter))}:${verses.split('-').map(wrap).join('-')} ${wrap(version)}${PDF}`;

  /** A whole Bible App share (Layout A): wording in curly quotes, reference, bible.com link. */
  const appShare = (
    text: string,
    book: string,
    chapter: number,
    verses: string,
    version: string,
    versionId: number,
    usfm: string
  ) =>
    `“${text}”\n${appCitation(book, chapter, verses, version)}\n` +
    `https://bible.com/bible/${versionId}/${usfm.toLowerCase()}.${chapter}.${verses}.${version}\n`;

  const JOAO_3_16_ARA =
    'Porque Deus amou ao mundo de tal maneira que deu o seu Filho unigênito, para que todo o que nele crê não pereça, mas tenha a vida eterna.';
  // bible.com's NVI joins "restaura\u2011me" with U+2011 NON-BREAKING HYPHEN, which verification
  // would not split on; the parsed wording has a plain hyphen.
  const SALMOS_23_1_3_NVI_SHARED =
    'O Senhor é o meu pastor; de nada terei falta. Ele me faz repousar em pastagens verdejantes e me conduz a águas tranquilas; restaura\u2011me o vigor. Guia\u2011me pelas veredas da justiça por amor do seu nome.';
  const SALMOS_23_1_3_NVI =
    'O Senhor é o meu pastor; de nada terei falta. Ele me faz repousar em pastagens verdejantes e me conduz a águas tranquilas; restaura-me o vigor. Guia-me pelas veredas da justiça por amor do seu nome.';
  const FILIPENSES_4_13_NVT = 'Posso todas as coisas por meio de Cristo, que me dá forças.';
  const ROMANOS_8_28_NAA =
    'Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.';
  const JOAO_3_16_NBV =
    'Porque Deus amou tanto o mundo que deu o seu Filho único para que todo aquele que crer nele não pereça, mas tenha a vida eterna.';
  const SALMOS_23_1_BLIVRE = 'O SENHOR é meu pastor, nada me faltará.';
  const JOHN_3_16_KJV =
    'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.';
  const PSALMS_23_1_3_NIV =
    'The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul. He guides me along the right paths for his name’s sake.';

  describe.each([
    // Verbatim shares (levidao-eth/Torah YuanyuanLi/2023/03/05/08:27 and 2021/08/17/18:04, :35).
    [
      'NIV, a verbatim single-verse share (2023)',
      '“And Abel also brought an offering—fat portions from some of the firstborn of his flock. The Lord looked with favor on Abel and his offering,”\n\u202d\u202dGenesis\u202c \u202d4\u202c:\u202d4\u202c \u202dNIV\u202c\u202c\nhttps://bible.com/bible/111/gen.4.4.NIV\n',
      'Genesis 4:4',
      'And Abel also brought an offering—fat portions from some of the firstborn of his flock. The Lord looked with favor on Abel and his offering,',
      'NIV',
    ],
    [
      'NIV, a verbatim range of poetry lines (2021)',
      '“Drink water from your own cistern, \nrunning water from your own well. \nShould your springs overflow in the streets, \nyour streams of water in the public squares? \nLet them be yours alone, \nnever to be shared with strangers. \nMay your fountain be blessed, \nand may you rejoice in the wife of your youth. \nA loving doe, a graceful deer— may her breasts satisfy you always, \nmay you ever be intoxicated with her love. \nWhy, my son, be intoxicated with another man’s wife? \nWhy embrace the bosom of a wayward woman?”\n\u202d\u202dProverbs\u202c \u202d5:15-20\u202c \u202dNIV\u202c\u202c\nhttps://bible.com/bible/111/pro.5.15-20.NIV\n',
      'Proverbs 5:15-20',
      'Drink water from your own cistern, running water from your own well. Should your springs overflow in the streets, your streams of water in the public squares? Let them be yours alone, never to be shared with strangers. May your fountain be blessed, and may you rejoice in the wife of your youth. A loving doe, a graceful deer— may her breasts satisfy you always, may you ever be intoxicated with her love. Why, my son, be intoxicated with another man’s wife? Why embrace the bosom of a wayward woman?',
      'NIV',
    ],
    [
      'NIV, a verbatim range whose wording opens with its own quotation marks (2021)',
      '““\u2006‘The woman he marries must be a virgin. \nHe must not marry a widow, a divorced woman, \nor a woman defiled by prostitution, \nbut only a virgin from his own people,”\n\u202d\u202dLeviticus\u202c \u202d21:13-14\u202c \u202dNIV\u202c\u202c\nhttps://bible.com/bible/111/lev.21.13-14.NIV\n',
      'Leviticus 21:13-14',
      '“ ‘The woman he marries must be a virgin. He must not marry a widow, a divorced woman, or a woman defiled by prostitution, but only a virgin from his own people,',
      'NIV',
    ],
    // Verbatim pt-BR shares (Petrus84/orbit): reference first, "[n]" verse numbers, the version
    // only in the link.
    [
      'ARA, a verbatim reference-first share',
      'Provérbios 17:17 \r\n[17] Em todo tempo ama o amigo, e na angústia se faz o irmão.\r\n\r\nhttps://bible.com/bible/1608/pro.17.17.ARA',
      'Provérbios 17:17',
      'Em todo tempo ama o amigo, e na angústia se faz o irmão.',
      'ARA',
    ],
    [
      'ARA, another verbatim reference-first share',
      'João 3:17\r\n[17] Porquanto Deus enviou o seu Filho ao mundo, não para que julgasse o mundo, mas para que o mundo fosse salvo por ele. \r\n\r\nhttps://bible.com/bible/1608/jhn.3.17.ARA',
      'João 3:17',
      'Porquanto Deus enviou o seu Filho ao mundo, não para que julgasse o mundo, mas para que o mundo fosse salvo por ele.',
      'ARA',
    ],
    // Layout A with each version's YouVersion id, abbreviation and book name.
    ['ARA', appShare(JOAO_3_16_ARA, 'João', 3, '16', 'ARA', 1608, 'JHN'), 'João 3:16', JOAO_3_16_ARA, 'ARA'],
    ['NVI, a range', appShare(SALMOS_23_1_3_NVI_SHARED, 'Salmos', 23, '1-3', 'NVI', 129, 'PSA'), 'Salmos 23:1-3', SALMOS_23_1_3_NVI, 'NVI'],
    ['NVT', appShare(FILIPENSES_4_13_NVT, 'Filipenses', 4, '13', 'NVT', 1930, 'PHP'), 'Filipenses 4:13', FILIPENSES_4_13_NVT, 'NVT'],
    ['NAA', appShare(ROMANOS_8_28_NAA, 'Romanos', 8, '28', 'NAA', 1840, 'ROM'), 'Romanos 8:28', ROMANOS_8_28_NAA, 'NAA'],
    // YouVersion abbreviates the Nova Bíblia Viva "NBV-P".
    ['NBV-P', appShare(JOAO_3_16_NBV, 'João', 3, '16', 'NBV-P', 1966, 'JHN'), 'João 3:16', JOAO_3_16_NBV, 'NBV'],
    ['KJV', appShare(JOHN_3_16_KJV, 'John', 3, '16', 'KJV', 1, 'JHN'), 'John 3:16', JOHN_3_16_KJV, 'KJV'],
    ['NIV, a range', appShare(PSALMS_23_1_3_NIV, 'Psalms', 23, '1-3', 'NIV', 111, 'PSA'), 'Psalms 23:1-3', PSALMS_23_1_3_NIV, 'NIV'],
    // YouVersion carries no BLIVRE; a verse labelled BLIVRE elsewhere keeps the label.
    ['the layout, labelled BLIVRE', `“${SALMOS_23_1_BLIVRE}”\n${appCitation('Salmos', 23, '1', 'BLIVRE')}`, 'Salmos 23:1', SALMOS_23_1_BLIVRE, 'BLIVRE'],
  ])('a share in %s', (_name, clipboard, reference, text, translation) => {
    const parsed = parseScriptureClipboard(clipboard);

    it('reads the canonical reference', () => {
      expect(parsed?.reference).toBe(reference);
    });

    it('keeps only the wording: no quotes, link, reference, verse numbers or invisible characters', () => {
      expect(parsed?.text).toBe(text);
    });

    it('keeps the version label', () => {
      expect(parsed?.translation).toBe(translation);
    });
  });

  it('keeps YouVersion\'s "Biblia Livre Para Todos" (BLT) apart from the bundled Bíblia Livre', () => {
    const text = 'O Senhor é o meu pastor, nada me faltará.';
    expect(
      parseScriptureClipboard(
        `“${text}”\n${appCitation('Salmos', 23, '1', 'BLT')}\nhttps://bible.com/bible/3254/psa.23.1.BLT\n`
      )
    ).toEqual({ reference: 'Salmos 23:1', text, translation: 'BLT' });
  });

  it('keeps any version the bible.com link confirms, even one the app does not list', () => {
    const text = 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito.';
    expect(
      parseScriptureClipboard(
        `“${text}”\n${appCitation('João', 3, '16', 'A21')}\nhttps://bible.com/bible/2645/jhn.3.16.A21\n`
      )
    ).toEqual({ reference: 'João 3:16', text, translation: 'A21' });
  });

  it.each([
    ['NASB2020', 2692],
    ['NASB1995', 100],
  ])('labels a %s share NASB', (version, versionId) => {
    expect(
      parseScriptureClipboard(
        appShare('The Lord is my shepherd, I will not be in need.', 'Psalm', 23, '1', version, versionId, 'PSA')
      )
    ).toEqual({ reference: 'Psalms 23:1', text: 'The Lord is my shepherd, I will not be in need.', translation: 'NASB' });
  });

  it.each([
    // Each version's own book names, from YouVersion's API.
    ['1Coríntios 13:4 ARA', '1 Coríntios 13:4'],
    ['1João 4:8 NAA', '1 João 4:8'],
    ['1Samuel 3:10 NVI', '1 Samuel 3:10'],
    ['Cântico 2:4 ARA', 'Cânticos 2:4'],
    ['Cântico dos Cânticos 8:7 NVI', 'Cânticos 8:7'],
    ['Cântico dos cânticos 8:7 NVT', 'Cânticos 8:7'],
    ['Cantares 8:7 ARC', 'Cânticos 8:7'],
    ['Cantares de Salomão 8:7 BLT', 'Cânticos 8:7'],
    ['Song of Songs 8:7 NIV', 'Song of Solomon 8:7'],
    ['Acts of the Apostles 2:38 NLT', 'Acts 2:38'],
    ['I Corinthians 13:4 NKJV', '1 Corinthians 13:4'],
    ['II Timothy 3:16 NKJV', '2 Timothy 3:16'],
    ['Psalm 23:1 KJV', 'Psalms 23:1'],
    ['Psalm 28:7 ESV', 'Psalms 28:7'],
    // Full titles printed in Almeida Bibles must not be read as another book.
    ['Lamentações de Jeremias 3:22-23 ARC', 'Lamentações 3:22-23'],
    ['Atos dos Apóstolos 2:38 ARC', 'Atos 2:38'],
  ])('names the book of "%s" canonically', (citation, reference) => {
    expect(parseScriptureClipboard(`Texto\n${citation}`)?.reference).toBe(reference);
  });

  it.each([
    ['Genesis 1:1 NIV', 'In the beginning God created the heavens and the earth.', 'Genesis 1:1'],
    ['Amos 5:24 NIV', 'But let justice roll on like a river, righteousness like a never-failing stream!', 'Amos 5:24'],
    ['Daniel 6:22 NVI', 'O meu Deus enviou o seu anjo, que fechou a boca dos leões.', 'Daniel 6:22'],
    ['Genesis 1:1', 'In the beginning God created the heavens and the earth.', 'Genesis 1:1'],
  ])(
    'names a book spelled alike in both languages in the language of the paste: "%s"',
    (citation, text, reference) => {
      expect(parseScriptureClipboard(`${text}\n${citation}`)?.reference).toBe(reference);
    }
  );

  it('takes the reference and the version from the bible.com link when no reference line is pasted', () => {
    expect(
      parseScriptureClipboard(`“${SALMOS_23_1_3_NVI}”\nhttps://bible.com/bible/129/psa.23.1-3.NVI`)
    ).toEqual({ reference: 'Salmos 23:1-3', text: SALMOS_23_1_3_NVI, translation: 'NVI' });
    // bible.com's own page links: www, a language segment, upper-case book code.
    expect(
      parseScriptureClipboard(`“${PSALMS_23_1_3_NIV}”\nhttps://www.bible.com/en/bible/111/PSA.23.1-3.NIV`)
    ).toEqual({ reference: 'Psalms 23:1-3', text: PSALMS_23_1_3_NIV, translation: 'NIV' });
  });

  it('reads a share in German-style quotation marks', () => {
    // A sample quoted in the Remember Me app's parser (ejajmahmud/flutter-app scripture.dart).
    expect(
      parseScriptureClipboard(
        '„Little by little I will drive them out before you, until you have increased enough to take possession of the land.“\n\u202D\u202DExodus\u202C \u202D23\u202C:\u202D30\u202C \u202DNIV\u202C\u202C\nhttps://bible.com/bible/111/exo.23.30.NIV'
      )
    ).toEqual({
      reference: 'Exodus 23:30',
      text: 'Little by little I will drive them out before you, until you have increased enough to take possession of the land.',
      translation: 'NIV',
    });
  });

  it('reads a reference with invisible characters only around the range hyphen', () => {
    // The shape of another sample quoted in the same parser: "Psalm 23:1\u202D-\u202C6 HFA".
    expect(
      parseScriptureClipboard(`${PSALMS_23_1_3_NIV}\nPsalms 23:1\u202D-\u202C3 NIV\n\nhttps://bible.com/bible/111/psa.23.1-3.NIV`)
    ).toEqual({ reference: 'Psalms 23:1-3', text: PSALMS_23_1_3_NIV, translation: 'NIV' });
  });

  it('reads a reference in parentheses after a blank line', () => {
    // Reported for older YouVersion copies (AndBible issue 571); not seen in recent samples.
    expect(
      parseScriptureClipboard(`${JOHN_3_16_KJV}\n\n(John 3:16 KJV)`)
    ).toEqual({ reference: 'John 3:16', text: JOHN_3_16_KJV, translation: 'KJV' });
  });

  it('reads a share whose reference comes before plainly numbered verses', () => {
    const parsed = parseScriptureClipboard(
      'Salmos 23:1-3 NVI\n' +
        '1 O Senhor é o meu pastor; de nada terei falta. ' +
        '2 Ele me faz repousar em pastagens verdejantes e me conduz a águas tranquilas; restaura-me o vigor. ' +
        '3 Guia-me pelas veredas da justiça por amor do seu nome.\n' +
        'https://bible.com/bible/129/psa.23.1-3.NVI'
    );

    expect(parsed).toEqual({ reference: 'Salmos 23:1-3', text: SALMOS_23_1_3_NVI, translation: 'NVI' });
  });

  it('joins verses broken over several lines and drops their numbers', () => {
    const parsed = parseScriptureClipboard(
      '“1 O Senhor é o meu pastor;\nde nada terei falta.\n' +
        '2 Ele me faz repousar em pastagens verdejantes\ne me conduz a águas tranquilas;\n' +
        '3 restaura-me o vigor.\nGuia-me pelas veredas da justiça\npor amor do seu nome.”\n' +
        appCitation('Salmos', 23, '1-3', 'NVI')
    );

    expect(parsed?.reference).toBe('Salmos 23:1-3');
    expect(parsed?.text).toBe(SALMOS_23_1_3_NVI);
  });

  it('drops bracketed and superscript verse numbers of a range', () => {
    expect(
      parseScriptureClipboard(
        'Salmos 23:1-3\r\n[1] O Senhor é o meu pastor; de nada terei falta. [2] Ele me faz repousar em pastagens verdejantes e me conduz a águas tranquilas; restaura-me o vigor. [3] Guia-me pelas veredas da justiça por amor do seu nome.\r\n\r\nhttps://bible.com/bible/129/psa.23.1-3.NVI'
      )
    ).toEqual({ reference: 'Salmos 23:1-3', text: SALMOS_23_1_3_NVI, translation: 'NVI' });
    expect(
      parseScriptureClipboard(
        '¹O Senhor é o meu pastor; de nada terei falta. ²Ele me faz repousar em pastagens verdejantes e me conduz a águas tranquilas; restaura-me o vigor. ³Guia-me pelas veredas da justiça por amor do seu nome.\nSalmos 23:1-3 NVI'
      )?.text
    ).toBe(SALMOS_23_1_3_NVI);
  });

  it('keeps numbers that are part of the wording', () => {
    const parsed = parseScriptureClipboard(
      '4 Então ouvi o número dos que foram selados: 144.000, de todas as tribos de Israel. 5 Da tribo de Judá foram selados 12.000; da tribo de Rúben, 12.000; da tribo de Gade, 12.000;\nApocalipse 7:4-5 NVI'
    );

    expect(parsed?.text).toBe(
      'Então ouvi o número dos que foram selados: 144.000, de todas as tribos de Israel. Da tribo de Judá foram selados 12.000; da tribo de Rúben, 12.000; da tribo de Gade, 12.000;'
    );
  });

  it('drops the number of a single numbered verse', () => {
    expect(parseScriptureClipboard(`16 ${JOAO_3_16_ARA}\nJoão 3:16 ARA`)?.text).toBe(JOAO_3_16_ARA);
  });

  it.each([
    ['Baixe o app da Bíblia: https://bible.com/app'],
    ['Leia na Bíblia: https://bible.com/bible/1608/jhn.3.16.ARA'],
    ['Download the Bible App now'],
    ['Shared via YouVersion'],
  ])('drops a trailing app promotion line: "%s"', (promotion) => {
    const parsed = parseScriptureClipboard(
      `${appShare(JOAO_3_16_ARA, 'João', 3, '16', 'ARA', 1608, 'JHN')}\n${promotion}`
    );

    expect(parsed).toEqual({ reference: 'João 3:16', text: JOAO_3_16_ARA, translation: 'ARA' });
  });

  it('reads a reference followed by the link on the same line', () => {
    expect(
      parseScriptureClipboard(`${JOAO_3_16_ARA}\nJoão 3:16 ARA https://bible.com/bible/1608/jhn.3.16.ARA`)
    ).toEqual({ reference: 'João 3:16', text: JOAO_3_16_ARA, translation: 'ARA' });
  });

  it('reads a version in parentheses', () => {
    expect(parseScriptureClipboard(`${JOAO_3_16_ARA}\nJoão 3:16 (ARA)`)).toEqual({
      reference: 'João 3:16',
      text: JOAO_3_16_ARA,
      translation: 'ARA',
    });
  });

  it('reads the wording and the reference on the same line', () => {
    expect(parseScriptureClipboard(`“${JOAO_3_16_ARA}” João 3:16 ARA`)).toEqual({
      reference: 'João 3:16',
      text: JOAO_3_16_ARA,
      translation: 'ARA',
    });
  });

  it('reads a range written with an en dash', () => {
    expect(parseScriptureClipboard(`${SALMOS_23_1_3_NVI}\nSalmos 23:1–3 NVI`)?.reference).toBe(
      'Salmos 23:1-3'
    );
  });
});
