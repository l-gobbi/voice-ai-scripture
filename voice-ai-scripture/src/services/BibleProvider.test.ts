import {
  BibleProvider,
  BiblePassage,
  LocalBibleProvider,
  SimulatedBibleProvider,
  createDefaultBibleProvider,
} from './BibleProvider';

describe('BibleProvider Seam (Ticket 14)', () => {
  describe('Slice 1: LocalBibleProvider Single Verse Lookups', () => {
    let provider: LocalBibleProvider;

    beforeEach(() => {
      provider = new LocalBibleProvider();
    });

    it('fetches a single verse in English from WEB', async () => {
      const passage = await provider.fetchPassage('John 3:16', 'WEB');
      expect(passage).not.toBeNull();
      expect(passage).toEqual({
        reference: 'John 3:16',
        text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
        translation: 'WEB',
        language: 'en',
      });
    });

    it('fetches a single verse in English from KJV', async () => {
      const passage = await provider.fetchPassage('John 3:16', 'KJV');
      expect(passage).not.toBeNull();
      expect(passage).toEqual({
        reference: 'John 3:16',
        text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
        translation: 'KJV',
        language: 'en',
      });
    });

    it('fetches a single verse in Portuguese from ALMEIDA', async () => {
      const passage = await provider.fetchPassage('João 3:16', 'ALMEIDA');
      expect(passage).not.toBeNull();
      expect(passage).toEqual({
        reference: 'João 3:16',
        text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
        translation: 'ALMEIDA',
        language: 'pt',
      });
    });

    it('fetches a single verse in Portuguese from ONBV', async () => {
      const passage = await provider.fetchPassage('João 3:16', 'ONBV');
      expect(passage).not.toBeNull();
      expect(passage).toEqual({
        reference: 'João 3:16',
        text: 'Porque Deus amou tanto o mundo que deu o seu Filho Único, para que todo aquele que nele crer não pereça, mas tenha a vida eterna.',
        translation: 'ONBV',
        language: 'pt',
      });
    });
  });

  describe('Slice 2: Multi-Verse Spans & Concatenation', () => {
    let provider: LocalBibleProvider;

    beforeEach(() => {
      provider = new LocalBibleProvider();
    });

    it('concatenates multi-verse ranges into continuous space-separated strings (John 3:16-17 WEB)', async () => {
      const passage = await provider.fetchPassage('John 3:16-17', 'WEB');
      expect(passage).not.toBeNull();
      expect(passage?.reference).toBe('John 3:16-17');
      expect(passage?.text).toBe(
        'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life. For God didn\'t send his Son into the world to judge the world, but that the world should be saved through him.'
      );
    });

    it('concatenates 3-verse spans in Portuguese (Salmos 23:1-3 ALMEIDA)', async () => {
      const passage = await provider.fetchPassage('Salmos 23:1-3', 'ALMEIDA');
      expect(passage).not.toBeNull();
      expect(passage?.reference).toBe('Salmos 23:1-3');
      expect(passage?.text).toBe(
        'O Senhor é o meu pastor, nada me faltará. Deitar-me faz em verdes pastos, guia-me mansamente a águas tranquilas. Refrigera a minha alma; guia-me pelas veredas da justiça, por amor do seu nome.'
      );
    });

    it('handles forgiving spacing around hyphen in multi-verse spans', async () => {
      const passage = await provider.fetchPassage('João 3:16 - 17', 'almeida');
      expect(passage).not.toBeNull();
      expect(passage?.reference).toBe('João 3:16-17');
      expect(passage?.translation).toBe('ALMEIDA');
    });
  });

  describe('Slice 3: Forgiving Reference Normalization & Translation Aliases', () => {
    let provider: LocalBibleProvider;

    beforeEach(() => {
      provider = new LocalBibleProvider();
    });

    it('resolves Portuguese abbreviations like Jo and Rm to canonical reference', async () => {
      const passageJo = await provider.fetchPassage('jo 3:16', 'almeida');
      expect(passageJo?.reference).toBe('João 3:16');
      expect(passageJo?.language).toBe('pt');

      const passageRm = await provider.fetchPassage('rm 8:28', 'onbv');
      expect(passageRm?.reference).toBe('Romanos 8:28');
      expect(passageRm?.language).toBe('pt');
    });

    it('normalizes translation identifiers flexibly (e.g. jfa -> ALMEIDA, king james -> KJV)', async () => {
      const jfa = await provider.fetchPassage('João 3:16', 'jfa');
      expect(jfa?.translation).toBe('ALMEIDA');

      const kjvLower = await provider.fetchPassage('John 3:16', 'king james');
      expect(kjvLower?.translation).toBe('KJV');

      const webLower = await provider.fetchPassage('John 3:16', 'web');
      expect(webLower?.translation).toBe('WEB');
    });
  });

  describe('Slice 4: Missing, Out-of-Bounds, & Invalid Passages', () => {
    let provider: LocalBibleProvider;

    beforeEach(() => {
      provider = new LocalBibleProvider();
    });

    it('returns null if book or verse does not exist in dataset', async () => {
      const missing = await provider.fetchPassage('John 99:99', 'WEB');
      expect(missing).toBeNull();
    });

    it('returns null for an unparseable reference string without throwing', async () => {
      const invalid = await provider.fetchPassage('Not A Bible Verse 123', 'WEB');
      expect(invalid).toBeNull();
    });

    it('returns null for an unsupported translation', async () => {
      const unknown = await provider.fetchPassage('John 3:16', 'LATIN_VULGATE');
      expect(unknown).toBeNull();
    });
  });

  describe('Slice 5: SimulatedBibleProvider & Factory', () => {
    it('returns configured passage in SimulatedBibleProvider', async () => {
      const mockPassage: BiblePassage = {
        reference: 'Romans 8:28',
        text: 'Mocked verse text for testing.',
        translation: 'WEB',
        language: 'en',
      };

      const sim = new SimulatedBibleProvider({
        'Romans 8:28:WEB': mockPassage,
      });

      const result = await sim.fetchPassage('Romans 8:28', 'WEB');
      expect(result).toEqual(mockPassage);

      const missing = await sim.fetchPassage('John 3:16', 'WEB');
      expect(missing).toBeNull();
    });

    it('allows custom override handler in SimulatedBibleProvider', async () => {
      const sim = new SimulatedBibleProvider({}, (ref, trans) => ({
        reference: ref,
        text: `Dynamic simulation for ${ref} (${trans})`,
        translation: trans,
        language: 'en',
      }));

      const result = await sim.fetchPassage('Genesis 1:1', 'KJV');
      expect(result?.text).toBe('Dynamic simulation for Genesis 1:1 (KJV)');
    });

    it('createDefaultBibleProvider returns a BibleProvider instance', () => {
      const defaultProvider = createDefaultBibleProvider();
      expect(defaultProvider).toBeDefined();
      expect(typeof defaultProvider.fetchPassage).toBe('function');
    });
  });
});
