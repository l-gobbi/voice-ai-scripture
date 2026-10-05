import { DEFAULT_SRS_STATE, SRSResult, SRSState, calculateNextReview, isVerseDue } from '../engines/srsEngine';
import {
  scriptureCatalog,
  SupportedTranslation,
} from './ScriptureCatalog';

export { SRSResult };

export type VerseTranslation = SupportedTranslation | 'CUSTOM' | string;

export interface Verse {
  id: string;
  reference: string;
  text: string;
  translation?: VerseTranslation;
  deck?: string;
  lastScore?: number;
  srs?: SRSState & {
    nextReviewDate?: string;
    lastScore?: number;
  };
}

export interface VerseSummary {
  allVerses: Verse[];
  dueVerses: Verse[];
  dueCount: number;
}

import {
  HabitTracker,
  habitTracker as defaultHabitTracker,
  HabitStats,
} from './HabitTracker';

export type { HabitStats };

import {
  StorageAdapter,
  MapStorageAdapter,
  AsyncStorageAdapter,
} from './StorageAdapter';

export { StorageAdapter, MapStorageAdapter, AsyncStorageAdapter };

const STORAGE_KEY = 'verses';

const createInitialSRS = () => ({
  ...DEFAULT_SRS_STATE,
  nextReviewDate: new Date().toISOString(),
});

export const resolveDefaultTranslation = (reference: string): VerseTranslation => {
  const norm = scriptureCatalog.resolveReference(reference);
  return norm?.language === 'pt' ? 'ALMEIDA' : 'WEB';
};

const createVerseRecord = (verseData: Omit<Verse, 'id' | 'srs'>): Verse => {
  const translation = verseData.translation || resolveDefaultTranslation(verseData.reference);

  return {
    ...verseData,
    translation,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    srs: createInitialSRS(),
  };
};

export class VerseEngine {
  private storage: StorageAdapter;
  private habitTracker: HabitTracker;

  constructor(storage?: StorageAdapter, habitTrackerInstance?: HabitTracker) {
    this.storage = storage ?? new AsyncStorageAdapter();
    this.habitTracker =
      habitTrackerInstance ??
      (storage
        ? new HabitTracker(storage, async (now) => (await this.getVersesSummary(now)).dueCount)
        : defaultHabitTracker);
  }

  private async persistVerses(verses: Verse[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(verses));
  }

  async getAllVerses(): Promise<Verse[]> {
    try {
      const data = await this.storage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }
      const parsed: Verse[] = JSON.parse(data);
      return parsed.map((verse) => {
        if (!verse.translation) {
          return {
            ...verse,
            translation: resolveDefaultTranslation(verse.reference),
          };
        }
        return verse;
      });
    } catch (error) {
      console.error('Failed to parse verses from storage', error);
      return [];
    }
  }

  async getVersesSummary(now = new Date()): Promise<VerseSummary> {
    const allVerses = await this.getAllVerses();
    const dueVerses: Verse[] = [];
    for (const verse of allVerses) {
      if (isVerseDue(verse.srs?.nextReviewDate, now)) {
        dueVerses.push(verse);
      }
    }
    return {
      allVerses,
      dueVerses,
      dueCount: dueVerses.length,
    };
  }

  async addVerse(verseData: Omit<Verse, 'id' | 'srs'>): Promise<Verse> {
    const verses = await this.getAllVerses();
    const newVerse = createVerseRecord(verseData);
    verses.push(newVerse);
    await this.persistVerses(verses);
    return newVerse;
  }

  async importVerses(versesToImport: Array<Omit<Verse, 'id' | 'srs'>>): Promise<number> {
    const existing = await this.getAllVerses();
    const existingRefs = new Set(existing.map((verse) => verse.reference.trim().toLowerCase()));

    const newVerses: Verse[] = [];

    for (const verse of versesToImport) {
      const normalized = verse.reference.trim().toLowerCase();
      if (!existingRefs.has(normalized)) {
        newVerses.push(createVerseRecord(verse));
        existingRefs.add(normalized);
      }
    }

    if (newVerses.length > 0) {
      const combined = [...existing, ...newVerses];
      await this.persistVerses(combined);
    }

    return newVerses.length;
  }

  async importDeck(
    deckName: string,
    versesToImport: Array<{ reference: string; text: string; translation?: string }>
  ): Promise<Verse[]> {
    const existing = await this.getAllVerses();
    const existingRefs = new Set(existing.map((verse) => verse.reference.trim().toLowerCase()));

    const newVerses: Verse[] = [];

    for (const verse of versesToImport) {
      const normalized = verse.reference.trim().toLowerCase();
      if (!existingRefs.has(normalized)) {
        const record = createVerseRecord({
          reference: verse.reference,
          text: verse.text,
          translation: verse.translation,
          deck: deckName,
        });
        newVerses.push(record);
        existingRefs.add(normalized);
      }
    }

    if (newVerses.length > 0) {
      const combined = [...existing, ...newVerses];
      await this.persistVerses(combined);
    }

    return newVerses;
  }

  async updateVerse(id: string, updates: Partial<Omit<Verse, 'id'>>): Promise<Verse> {
    const verses = await this.getAllVerses();
    const index = verses.findIndex((v) => v.id === id);
    if (index === -1) {
      throw new Error(`Verse not found: ${id}`);
    }

    const current = verses[index];
    const updatedRef = updates.reference ?? current.reference;
    let updatedTranslation = current.translation;

    if (updates.translation !== undefined) {
      updatedTranslation = updates.translation || resolveDefaultTranslation(updatedRef);
    } else if (updates.reference && !current.translation) {
      updatedTranslation = resolveDefaultTranslation(updatedRef);
    }

    const updated: Verse = {
      ...current,
      ...updates,
      srs: updates.srs !== undefined ? { ...current.srs, ...updates.srs } : current.srs,
      translation: updatedTranslation,
    };
    verses[index] = updated;
    await this.persistVerses(verses);
    return updated;
  }

  async deleteVerse(verseId: string): Promise<boolean> {
    const verses = await this.getAllVerses();
    const filtered = verses.filter((verse) => verse.id !== verseId);
    if (filtered.length === verses.length) {
      return false;
    }
    await this.persistVerses(filtered);
    return true;
  }

  async getHabitStats(now = new Date()): Promise<HabitStats> {
    return this.habitTracker.getHabitStats(now);
  }

  async recordReview(verseId: string, score: number, now = new Date()): Promise<SRSResult> {
    const verses = await this.getAllVerses();
    const index = verses.findIndex((verse) => verse.id === verseId);
    if (index === -1) {
      throw new Error(`Verse not found: ${verseId}`);
    }

    const currentVerse = verses[index];
    const previousReviewDate = currentVerse.srs?.nextReviewDate;
    const wasUnreviewed =
      (currentVerse.srs?.streak ?? 0) === 0 && (currentVerse.srs?.intervalDays ?? 0) === 0;
    const wasDue = wasUnreviewed || isVerseDue(previousReviewDate, now);

    const currentSRS: SRSState = currentVerse.srs || DEFAULT_SRS_STATE;
    const srsResult = calculateNextReview(currentSRS, score, now);

    const streak = srsResult.streak ?? 0;
    verses[index].srs = {
      streak,
      intervalDays: srsResult.intervalDays,
      easeFactor: srsResult.easeFactor,
      nextReviewDate: srsResult.nextReviewDate.toISOString(),
      lastScore: score,
    };
    verses[index].lastScore = score;

    await this.persistVerses(verses);
    await this.habitTracker.recordActivity(verseId, wasDue, now);

    return srsResult;
  }

  getNextReviewMessage(allVerses: Verse[], now = new Date()): string {
    const futureDates = allVerses
      .map((v) => v.srs?.nextReviewDate)
      .filter((d): d is string => !!d)
      .map((d) => new Date(d))
      .filter((d) => d.getTime() > now.getTime())
      .sort((a, b) => a.getTime() - b.getTime());

    if (futureDates.length === 0) {
      return 'Next review due tomorrow';
    }

    const earliest = futureDates[0];
    const diffDays = Math.ceil((earliest.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) {
      return 'Next review due tomorrow';
    }
    return `Next review due in ${diffDays} days`;
  }

  isVerseMastered(verse: Verse, isDue = false): boolean {
    const interval = verse.srs?.intervalDays ?? 0;
    return !isDue && interval >= 21;
  }
}

export const verseEngine = new VerseEngine();
