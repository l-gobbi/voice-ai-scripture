import { scriptureCatalog } from './ScriptureCatalog';
import { AsyncStorageAdapter, StorageAdapter } from './StorageAdapter';
import { MemoryTier, Verse, VerseEngine, getMemoryTier, verseEngine } from './VerseEngine';

/**
 * The Deck Library owns Decks and their membership (CONTEXT.md: Deck, Own Deck, Received Deck,
 * Deck Section). A Deck is an ordered list of entries, Deck Section headings and verse ids, so
 * a verse can belong to several Decks. The Verse Engine stays the owner of the verses
 * themselves: the library creates and looks verses up through it and never copies them.
 *
 * Ticket 86 is the foundation: reading, the legacy `#tag` migration, and the minimal adding
 * that migration and the interim shared-deck import need. Editing comes with ticket 87,
 * deletion with 88, sharing v2 and Received Decks with 89 and 90.
 */

export const DECKS_STORAGE_KEY = 'decks';
const DECKS_SCHEMA_VERSION = 1;

/** An Own Deck is the learner's to edit; a Received Deck follows the deck it was shared from. */
export type DeckOrigin = 'own' | 'received';

/** A Deck Section heading: the section is the run of verse entries that follows it. */
export interface DeckSectionEntry {
  kind: 'section';
  id: string;
  title: string;
}

export type DeckEntry = DeckSectionEntry | { kind: 'verse'; verseId: string };

/** A Deck as stored. */
export interface Deck {
  id: string;
  name: string;
  description?: string;
  /** The version label new verses added to the Deck start with (ticket 87). */
  defaultVersion?: string;
  origin: DeckOrigin;
  /** ISO instant of the Deck's last change. */
  updatedAt: string;
  entries: DeckEntry[];
}

export type MemoryTierCounts = Record<MemoryTier, number>;

/** A Deck as listed: its verses still in the library, and how far along they are. */
export interface DeckSummary extends Omit<Deck, 'entries'> {
  /** Ids of the Deck's verses that are still in the library, in Deck order. */
  verseIds: string[];
  /** How many of those verses are at each Memory Tier. */
  tierCounts: MemoryTierCounts;
  /** The language most of its verses are in (ties go to the first verse; empty is English). */
  language: 'en' | 'pt';
}

export type ResolvedDeckEntry = DeckSectionEntry | { kind: 'verse'; verse: Verse };

/** A Deck with its entries resolved to verses. Verses no longer in the library are left out. */
export interface ResolvedDeck extends DeckSummary {
  entries: ResolvedDeckEntry[];
}

export interface SharedDeckVerseInput {
  reference: string;
  text: string;
  translation?: string;
}

export interface SharedDeckImport {
  name: string;
  description?: string;
  verses: SharedDeckVerseInput[];
}

interface StoredDecks {
  schemaVersion: number;
  decks: Deck[];
}

const createDeckId = (now: Date) =>
  `deck-${now.getTime()}-${Math.random().toString(36).substring(2, 10)}`;

/** A Deck's name, trimmed. A blank name is rejected. */
function requireName(name: string): string {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    throw new Error('A deck needs a name.');
  }
  return trimmed;
}

/** How the interim import matches a shared verse to one already in the library. */
const referenceKey = (reference: string) => reference.trim().toLowerCase();

function newOwnDeck(
  name: string,
  verseIds: string[],
  now: Date,
  details: { description?: string } = {}
): Deck {
  const description = details.description?.trim();
  return {
    id: createDeckId(now),
    name,
    ...(description ? { description } : {}),
    origin: 'own',
    updatedAt: now.toISOString(),
    entries: verseIds.map((verseId) => ({ kind: 'verse', verseId })),
  };
}

/**
 * Appends the verses to the Own Deck with this name, creating the Deck if there is none.
 * Verses already in it are skipped. `changed` is false when nothing had to change, so an
 * unchanged Deck keeps its `updatedAt` and nothing is written.
 */
function fileUnderOwnDeck(
  decks: Deck[],
  name: string,
  verseIds: string[],
  now: Date
): { decks: Deck[]; deck: Deck; changed: boolean } {
  const index = decks.findIndex((deck) => deck.origin === 'own' && deck.name === name);
  if (index === -1) {
    const deck = newOwnDeck(name, [...new Set(verseIds)], now);
    return { decks: [...decks, deck], deck, changed: true };
  }

  const current = decks[index];
  const members = new Set(
    current.entries.flatMap((entry) => (entry.kind === 'verse' ? [entry.verseId] : []))
  );
  const added = verseIds.filter((verseId) => {
    if (members.has(verseId)) return false;
    members.add(verseId);
    return true;
  });
  if (added.length === 0) {
    return { decks, deck: current, changed: false };
  }

  const deck: Deck = {
    ...current,
    updatedAt: now.toISOString(),
    entries: [...current.entries, ...added.map((verseId) => ({ kind: 'verse' as const, verseId }))],
  };
  const next = [...decks];
  next[index] = deck;
  return { decks: next, deck, changed: true };
}

function majorityLanguage(verses: Verse[]): 'en' | 'pt' {
  if (verses.length === 0) return 'en';
  const languages = verses.map((verse) => scriptureCatalog.detectLanguage(verse));
  const pt = languages.filter((language) => language === 'pt').length;
  const en = languages.length - pt;
  if (pt === en) return languages[0];
  return pt > en ? 'pt' : 'en';
}

function summarize(deck: Deck, library: Map<string, Verse>): DeckSummary {
  const { entries, ...record } = deck;
  const verses = entries.flatMap((entry) => {
    const verse = entry.kind === 'verse' ? library.get(entry.verseId) : undefined;
    return verse ? [verse] : [];
  });
  const tierCounts: MemoryTierCounts = { seed: 0, growing: 0, rooted: 0, hidden_in_the_heart: 0 };
  for (const verse of verses) {
    tierCounts[getMemoryTier(verse)] += 1;
  }
  return {
    ...record,
    verseIds: verses.map((verse) => verse.id),
    tierCounts,
    language: majorityLanguage(verses),
  };
}

export class DeckLibrary {
  private migration: Promise<void> | null = null;

  constructor(
    private readonly storage: StorageAdapter,
    private readonly verses: VerseEngine
  ) {}

  /** Every Deck, in the order they were made, with its Memory Tier progress. */
  async listDecks(): Promise<DeckSummary[]> {
    await this.ready();
    const decks = await this.readDecks();
    const library = await this.libraryById();
    return decks.map((deck) => summarize(deck, library));
  }

  /** One Deck with its entries, in order, resolved to verses; null when there is no such Deck. */
  async getDeck(id: string): Promise<ResolvedDeck | null> {
    await this.ready();
    const deck = (await this.readDecks()).find((candidate) => candidate.id === id);
    if (!deck) return null;

    const library = await this.libraryById();
    const entries = deck.entries.flatMap((entry): ResolvedDeckEntry[] => {
      if (entry.kind === 'section') {
        return [{ kind: 'section', id: entry.id, title: entry.title }];
      }
      const verse = library.get(entry.verseId);
      return verse ? [{ kind: 'verse', verse }] : [];
    });
    return { ...summarize(deck, library), entries };
  }

  /**
   * Adds library verses, in order, to the end of the Own Deck with this name, making the Deck
   * if the learner has none by that name. Verses already in it and ids no longer in the library
   * are skipped. A Received Deck of the same name is never touched.
   */
  async addVersesToDeckNamed(name: string, verseIds: string[]): Promise<Deck> {
    const deckName = requireName(name);
    await this.ready();
    const library = await this.libraryById();
    const result = fileUnderOwnDeck(
      await this.readDecks(),
      deckName,
      verseIds.filter((verseId) => library.has(verseId)),
      new Date()
    );
    if (result.changed) {
      await this.writeDecks(result.decks);
    }
    return result.deck;
  }

  /**
   * Imports a deck shared in the version 1 format as a new Own Deck holding its verses in their
   * shared order. Interim until ticket 89 brings Received Decks, wording conflicts and update
   * plans: a shared verse whose reference (trimmed, any case) matches a verse already in the
   * library links that verse as it is, whatever its wording; the others are added through the
   * Verse Engine, so a verse without a version gets the Preferred Translation.
   */
  async importSharedDeck(shared: SharedDeckImport): Promise<Deck> {
    const name = requireName(shared.name);
    await this.ready();

    const byReference = new Map<string, string>();
    for (const verse of await this.verses.getAllVerses()) {
      const key = referenceKey(verse.reference);
      if (!byReference.has(key)) byReference.set(key, verse.id);
    }

    const verseIds: string[] = [];
    for (const incoming of shared.verses) {
      const key = referenceKey(incoming.reference);
      let verseId = byReference.get(key);
      if (!verseId) {
        const created = await this.verses.addVerse({
          reference: incoming.reference,
          text: incoming.text,
          translation: incoming.translation,
        });
        verseId = created.id;
        byReference.set(key, verseId);
      }
      if (!verseIds.includes(verseId)) verseIds.push(verseId);
    }

    const deck = newOwnDeck(name, verseIds, new Date(), { description: shared.description });
    await this.writeDecks([...(await this.readDecks()), deck]);
    return deck;
  }

  /**
   * Runs the legacy `#tag` migration once per Deck Library (each app launch) before any other
   * operation. A failed run is retried by the next call.
   */
  private ready(): Promise<void> {
    if (!this.migration) {
      this.migration = this.migrateLegacyTags().catch((error) => {
        this.migration = null;
        throw error;
      });
    }
    return this.migration;
  }

  /**
   * Turns every distinct legacy `#tag` (the `deck` field verses were saved with before ticket
   * 86) into an Own Deck with that name, then clears the tags.
   *
   * Order: a Deck holds its verses in storage order, which is creation order because the Verse
   * Engine only ever appends verses. Verse ids start with a timestamp too, but stored verses are
   * not guaranteed to have one, so the ids are not used for ordering. Decks are made in the
   * order their tag first appears.
   *
   * Idempotent: the Decks are saved before the tags are cleared, and a tag whose Own Deck already
   * exists (a run interrupted in between) only adds the verses still missing from it. With no
   * tags left, a run writes nothing.
   */
  private async migrateLegacyTags(): Promise<void> {
    const tagged = (await this.verses.getAllVerses()).filter((verse) => verse.deck !== undefined);
    if (tagged.length === 0) return;

    const verseIdsByTag = new Map<string, string[]>();
    for (const verse of tagged) {
      const name = typeof verse.deck === 'string' ? verse.deck.trim() : '';
      if (!name) continue;
      verseIdsByTag.set(name, [...(verseIdsByTag.get(name) ?? []), verse.id]);
    }

    let decks = await this.readDecks();
    let changed = false;
    const now = new Date();
    for (const [name, verseIds] of verseIdsByTag) {
      const result = fileUnderOwnDeck(decks, name, verseIds, now);
      decks = result.decks;
      changed = changed || result.changed;
    }
    if (changed) {
      await this.writeDecks(decks);
    }

    await this.verses.clearLegacyDeckTags(tagged.map((verse) => verse.id));
  }

  private async libraryById(): Promise<Map<string, Verse>> {
    const verses = await this.verses.getAllVerses();
    return new Map(verses.map((verse) => [verse.id, verse]));
  }

  private async readDecks(): Promise<Deck[]> {
    try {
      const data = await this.storage.getItem(DECKS_STORAGE_KEY);
      if (!data) return [];
      const parsed: Partial<StoredDecks> | null = JSON.parse(data);
      return Array.isArray(parsed?.decks) ? parsed.decks : [];
    } catch (error) {
      console.error('Failed to parse decks from storage', error);
      return [];
    }
  }

  private async writeDecks(decks: Deck[]): Promise<void> {
    const stored: StoredDecks = { schemaVersion: DECKS_SCHEMA_VERSION, decks };
    await this.storage.setItem(DECKS_STORAGE_KEY, JSON.stringify(stored));
  }
}

export const deckLibrary = new DeckLibrary(new AsyncStorageAdapter(), verseEngine);
