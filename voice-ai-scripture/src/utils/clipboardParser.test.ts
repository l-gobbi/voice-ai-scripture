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
    expect(result?.reference).toBe('Psalm 28:7');
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
