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
