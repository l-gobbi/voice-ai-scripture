import { DeckLibrary, DECKS_STORAGE_KEY } from './DeckLibrary';
import { MapStorageAdapter, Verse, VerseEngine } from './VerseEngine';

/** A stored verse as an older app version saved it, with its legacy `#tag` deck. */
const legacyVerse = (id: string, reference: string, deck?: string): Verse => ({
  id,
  reference,
  text: `Text of ${reference}`,
  translation: 'WEB',
  ...(deck !== undefined ? { deck } : {}),
});

function setup(initialData?: Record<string, string>) {
  const storage = new MapStorageAdapter(initialData);
  const engine = new VerseEngine(storage);
  const library = new DeckLibrary(storage, engine);
  return { storage, engine, library };
}

/** A verse whose current review interval puts it at a given Memory Tier. */
async function addVerseWithInterval(engine: VerseEngine, reference: string, intervalDays: number) {
  const verse = await engine.addVerse({ reference, text: `Text of ${reference}`, translation: 'WEB' });
  return engine.updateVerse(verse.id, { srs: { intervalDays } as Verse['srs'] });
}

const verseIdsOf = (deck: { entries: Array<{ kind: string; verse?: Verse }> } | null) =>
  (deck?.entries ?? []).flatMap((entry) => (entry.kind === 'verse' && entry.verse ? [entry.verse.id] : []));

describe('DeckLibrary (Ticket 86)', () => {
  describe('legacy #tag migration', () => {
    const taggedLibrary = () =>
      setup({
        verses: JSON.stringify([
          legacyVerse('1700000000001-a', 'John 14:27', 'Peace'),
          legacyVerse('1700000000002-b', 'Romans 15:13', 'Hope'),
          legacyVerse('1700000000003-c', 'Psalm 23:1'),
          legacyVerse('1700000000004-d', 'Philippians 4:7', 'Peace'),
          legacyVerse('1700000000005-e', 'Isaiah 26:3', 'Peace'),
        ]),
      });

    it('turns every legacy deck tag into an Own Deck holding its verses in creation order', async () => {
      const { library } = taggedLibrary();

      const decks = await library.listDecks();

      expect(decks.map((deck) => deck.name)).toEqual(['Peace', 'Hope']);
      expect(decks.every((deck) => deck.origin === 'own')).toBe(true);
      expect(decks[0].verseIds).toEqual(['1700000000001-a', '1700000000004-d', '1700000000005-e']);
      expect(decks[1].verseIds).toEqual(['1700000000002-b']);
      expect(decks.every((deck) => !Number.isNaN(Date.parse(deck.updatedAt)))).toBe(true);

      const peace = await library.getDeck(decks[0].id);
      expect(peace?.entries.map((entry) => entry.kind === 'verse' && entry.verse.reference)).toEqual([
        'John 14:27',
        'Philippians 4:7',
        'Isaiah 26:3',
      ]);
    });

    it('clears the tag from every migrated verse and keeps the verses otherwise intact', async () => {
      const { engine, library } = taggedLibrary();

      await library.listDecks();

      const verses = await engine.getAllVerses();
      expect(verses).toHaveLength(5);
      expect(verses.some((verse) => 'deck' in verse)).toBe(false);
      expect(verses.map((verse) => verse.reference)).toEqual([
        'John 14:27',
        'Romans 15:13',
        'Psalm 23:1',
        'Philippians 4:7',
        'Isaiah 26:3',
      ]);
    });

    it('is idempotent: running it again changes nothing', async () => {
      const { storage, library } = taggedLibrary();
      const firstRun = await library.listDecks();
      const decksAfterFirstRun = await storage.getItem(DECKS_STORAGE_KEY);
      const versesAfterFirstRun = await storage.getItem('verses');

      // The next app launch builds a new Deck Library over the same storage.
      const relaunched = new DeckLibrary(storage, new VerseEngine(storage));
      const secondRun = await relaunched.listDecks();

      expect(secondRun).toEqual(firstRun);
      expect(await storage.getItem(DECKS_STORAGE_KEY)).toBe(decksAfterFirstRun);
      expect(await storage.getItem('verses')).toBe(versesAfterFirstRun);
    });

    it('finishes an interrupted migration without duplicating decks or verses', async () => {
      const { storage, engine, library } = taggedLibrary();
      // A first run saved the Peace deck (with one verse) but stopped before clearing the tags.
      await storage.setItem(
        DECKS_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: 1,
          decks: [
            {
              id: 'deck-peace',
              name: 'Peace',
              origin: 'own',
              updatedAt: '2026-10-09T12:00:00.000Z',
              entries: [{ kind: 'verse', verseId: '1700000000001-a' }],
            },
          ],
        })
      );

      const decks = await library.listDecks();

      expect(decks.map((deck) => [deck.id === 'deck-peace', deck.name])).toEqual([
        [true, 'Peace'],
        [false, 'Hope'],
      ]);
      expect(decks[0].verseIds).toEqual(['1700000000001-a', '1700000000004-d', '1700000000005-e']);
      expect((await engine.getAllVerses()).some((verse) => 'deck' in verse)).toBe(false);
    });

    it('retries on the next call after a failed run', async () => {
      const { storage, library } = taggedLibrary();
      const setItem = storage.setItem.bind(storage);
      jest
        .spyOn(storage, 'setItem')
        .mockImplementationOnce(async () => {
          throw new Error('disk full');
        })
        .mockImplementation(setItem);

      await expect(library.listDecks()).rejects.toThrow('disk full');
      const decks = await library.listDecks();

      expect(decks.map((deck) => deck.name)).toEqual(['Peace', 'Hope']);
    });

    it('writes nothing when no verse has a tag', async () => {
      const verses = JSON.stringify([legacyVerse('1-a', 'John 3:16')]);
      const { storage, library } = setup({ verses });

      expect(await library.listDecks()).toEqual([]);
      expect(await storage.getItem(DECKS_STORAGE_KEY)).toBeNull();
      expect(await storage.getItem('verses')).toBe(verses);
    });

    it('drops blank tags without making a deck of them', async () => {
      const { engine, library } = setup({
        verses: JSON.stringify([legacyVerse('1-a', 'John 3:16', '  ')]),
      });

      expect(await library.listDecks()).toEqual([]);
      expect((await engine.getAllVerses()).some((verse) => 'deck' in verse)).toBe(false);
    });
  });

  describe('listing decks with Memory Tier progress', () => {
    it('counts each deck verse at its Memory Tier', async () => {
      const { engine, library } = setup();
      const seed = await addVerseWithInterval(engine, 'John 3:16', 0);
      const growing = await addVerseWithInterval(engine, 'Romans 8:28', 10);
      const rooted = await addVerseWithInterval(engine, 'Psalm 23:1', 40);
      const hidden = await addVerseWithInterval(engine, 'Isaiah 26:3', 200);
      const alsoRooted = await addVerseWithInterval(engine, 'Proverbs 3:5', 90);

      await library.addVersesToDeckNamed('Catechism', [
        seed.id,
        growing.id,
        rooted.id,
        hidden.id,
        alsoRooted.id,
      ]);

      const [catechism] = await library.listDecks();
      expect(catechism.verseIds).toHaveLength(5);
      expect(catechism.tierCounts).toEqual({
        seed: 1,
        growing: 1,
        rooted: 2,
        hidden_in_the_heart: 1,
      });
    });

    it('lets one verse belong to several decks', async () => {
      const { engine, library } = setup();
      const shared = await addVerseWithInterval(engine, 'John 3:16', 40);
      const other = await addVerseWithInterval(engine, 'Romans 8:28', 0);

      await library.addVersesToDeckNamed('Catechism', [shared.id]);
      await library.addVersesToDeckNamed('Personal', [other.id, shared.id]);

      const [catechism, personal] = await library.listDecks();
      expect(catechism.verseIds).toEqual([shared.id]);
      expect(personal.verseIds).toEqual([other.id, shared.id]);
      expect(catechism.tierCounts.rooted).toBe(1);
      expect(personal.tierCounts).toEqual({ seed: 1, growing: 0, rooted: 1, hidden_in_the_heart: 0 });

      const personalDeck = await library.getDeck(personal.id);
      expect(verseIdsOf(personalDeck)).toEqual([other.id, shared.id]);
    });

    it('leaves verses no longer in the library out of the counts', async () => {
      const { engine, library } = setup();
      const kept = await addVerseWithInterval(engine, 'John 3:16', 40);
      const removed = await addVerseWithInterval(engine, 'Romans 8:28', 40);
      await library.addVersesToDeckNamed('Faith', [kept.id, removed.id]);

      await engine.deleteVerse(removed.id);

      const [faith] = await library.listDecks();
      expect(faith.verseIds).toEqual([kept.id]);
      expect(faith.tierCounts).toEqual({ seed: 0, growing: 0, rooted: 1, hidden_in_the_heart: 0 });
    });

    it('names the language most of its verses are in', async () => {
      const { engine, library } = setup();
      const salmo = await engine.addVerse({ reference: 'Salmos 23:1', text: 'O Senhor é o meu pastor, nada me faltará.' });
      const joao = await engine.addVerse({ reference: 'João 3:16', text: 'Porque Deus amou o mundo de tal maneira' });
      const john = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved the world' });
      await library.addVersesToDeckNamed('Catecismo', [salmo.id, john.id, joao.id]);
      await library.addVersesToDeckNamed('Gospel', [john.id]);
      await library.addVersesToDeckNamed('Vazio', []);

      const decks = await library.listDecks();
      expect(decks.map((deck) => [deck.name, deck.language])).toEqual([
        ['Catecismo', 'pt'],
        ['Gospel', 'en'],
        ['Vazio', 'en'],
      ]);
    });
  });

  describe('getting one deck', () => {
    it('resolves its entries in order, section headings included, skipping verses no longer in the library', async () => {
      const { storage, engine, library } = setup();
      const first = await engine.addVerse({ reference: 'John 1:1', text: 'In the beginning was the Word' });
      const gone = await engine.addVerse({ reference: 'John 1:2', text: 'The same was in the beginning' });
      const second = await engine.addVerse({ reference: 'John 1:14', text: 'And the Word became flesh' });
      await engine.deleteVerse(gone.id);
      // Sections come with deck editing (ticket 87); here they are stored directly.
      await storage.setItem(
        DECKS_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: 1,
          decks: [
            {
              id: 'deck-1',
              name: 'Catecismo',
              origin: 'own',
              updatedAt: '2026-10-09T12:00:00.000Z',
              entries: [
                { kind: 'section', id: 's1', title: '1º Tópico – Jesus, sua vida e sua obra' },
                { kind: 'verse', verseId: first.id },
                { kind: 'verse', verseId: gone.id },
                { kind: 'section', id: 's2', title: '2º Tópico – O Verbo' },
                { kind: 'verse', verseId: second.id },
              ],
            },
          ],
        })
      );

      const deck = await library.getDeck('deck-1');

      expect(deck).not.toBeNull();
      expect(deck!.name).toBe('Catecismo');
      expect(deck!.entries).toEqual([
        { kind: 'section', id: 's1', title: '1º Tópico – Jesus, sua vida e sua obra' },
        { kind: 'verse', verse: expect.objectContaining({ id: first.id, reference: 'John 1:1' }) },
        { kind: 'section', id: 's2', title: '2º Tópico – O Verbo' },
        { kind: 'verse', verse: expect.objectContaining({ id: second.id, reference: 'John 1:14' }) },
      ]);
      expect(deck!.verseIds).toEqual([first.id, second.id]);
    });

    it('returns null for an unknown deck', async () => {
      const { library } = setup();
      expect(await library.getDeck('nope')).toBeNull();
    });
  });

  describe('adding verses to a deck by name', () => {
    it('creates an Own Deck the first time and appends to it afterwards, keeping order and skipping repeats', async () => {
      const { engine, library } = setup();
      const a = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved the world' });
      const b = await engine.addVerse({ reference: 'Romans 8:28', text: 'And we know' });
      const c = await engine.addVerse({ reference: 'Psalm 23:1', text: 'The Lord is my shepherd' });

      const created = await library.addVersesToDeckNamed('  Faith  ', [b.id, a.id]);
      const updated = await library.addVersesToDeckNamed('Faith', [a.id, c.id, 'not-a-verse']);

      expect(updated.id).toBe(created.id);
      const decks = await library.listDecks();
      expect(decks).toHaveLength(1);
      expect(decks[0]).toEqual(
        expect.objectContaining({ name: 'Faith', origin: 'own', verseIds: [b.id, a.id, c.id] })
      );
    });

    it('never adds to a Received Deck that has the same name', async () => {
      const { storage, engine, library } = setup();
      const verse = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved the world' });
      await storage.setItem(
        DECKS_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: 1,
          decks: [
            { id: 'r1', name: 'Faith', origin: 'received', updatedAt: '2026-10-09T12:00:00.000Z', entries: [] },
          ],
        })
      );

      const own = await library.addVersesToDeckNamed('Faith', [verse.id]);

      expect(own.id).not.toBe('r1');
      const decks = await library.listDecks();
      expect(decks.map((deck) => [deck.origin, deck.verseIds])).toEqual([
        ['received', []],
        ['own', [verse.id]],
      ]);
    });

    it('rejects a blank name', async () => {
      const { library } = setup();
      await expect(library.addVersesToDeckNamed('   ', [])).rejects.toThrow(/name/i);
    });
  });

  describe('importing a shared deck (interim, until ticket 89)', () => {
    it('creates a new Own Deck holding the shared verses in their order, with no legacy tag on any verse', async () => {
      const { engine, library } = setup();

      const deck = await library.importSharedDeck({
        name: 'Faith',
        description: 'Encouraging verses',
        verses: [
          { reference: 'Hebrews 11:1', text: 'Now faith is the assurance of things hoped for.', translation: 'WEB' },
          { reference: 'Romans 10:17', text: 'So faith comes by hearing', translation: 'WEB' },
        ],
      });

      expect(deck).toEqual(
        expect.objectContaining({ name: 'Faith', description: 'Encouraging verses', origin: 'own' })
      );
      const resolved = await library.getDeck(deck.id);
      expect(resolved!.entries.map((entry) => entry.kind === 'verse' && entry.verse.reference)).toEqual([
        'Hebrews 11:1',
        'Romans 10:17',
      ]);
      const verses = await engine.getAllVerses();
      expect(verses).toHaveLength(2);
      expect(verses.some((verse) => 'deck' in verse)).toBe(false);
    });

    it('links a verse already in the library by reference instead of duplicating it', async () => {
      const { engine, library } = setup();
      const existing = await engine.addVerse({
        reference: 'John 3:16',
        text: 'For God so loved the world...',
        translation: 'WEB',
      });

      const deck = await library.importSharedDeck({
        name: 'Gospel Basics',
        verses: [
          { reference: 'Romans 10:9', text: 'If you declare with your mouth...', translation: 'WEB' },
          { reference: ' john 3:16 ', text: 'For God so loved the world, that he gave', translation: 'KJV' },
        ],
      });

      const verses = await engine.getAllVerses();
      expect(verses).toHaveLength(2);
      // The learner's verse keeps its wording (wording conflicts come with ticket 89).
      expect(verses.find((verse) => verse.id === existing.id)).toEqual(
        expect.objectContaining({ text: 'For God so loved the world...', translation: 'WEB' })
      );
      const [gospel] = await library.listDecks();
      expect(gospel.id).toBe(deck.id);
      expect(gospel.verseIds).toEqual([verses[1].id, existing.id]);
    });

    it('gives shared verses without a version the Preferred Translation', async () => {
      const { engine, library } = setup();
      await engine.setPreferredTranslation('pt', 'ONBV');

      const deck = await library.importSharedDeck({
        name: 'Paz',
        verses: [
          { reference: 'Filipenses 4:6', text: 'Não se preocupem com nada' },
          { reference: 'Filipenses 4:7', text: 'E a paz de Deus', translation: 'NVI' },
        ],
      });

      const resolved = await library.getDeck(deck.id);
      expect(
        resolved!.entries.map((entry) => entry.kind === 'verse' && entry.verse.translation)
      ).toEqual(['ONBV', 'NVI']);
    });
  });
});
