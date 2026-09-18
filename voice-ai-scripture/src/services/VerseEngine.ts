import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SRS_STATE, SRSResult, SRSState, calculateNextReview, isVerseDue } from '../engines/srsEngine';

export { SRSResult };

export interface Verse {
  id: string;
  reference: string;
  text: string;
  srs?: SRSState & {
    nextReviewDate?: string;
  };
}

export interface VerseSummary {
  allVerses: Verse[];
  dueVerses: Verse[];
  dueCount: number;
}

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export class MapStorageAdapter implements StorageAdapter {
  private data = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }
}

class AsyncStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }
}

const STORAGE_KEY = 'verses';

const createInitialSRS = () => ({
  ...DEFAULT_SRS_STATE,
  nextReviewDate: new Date().toISOString(),
});

const createVerseRecord = (verseData: Omit<Verse, 'id' | 'srs'>): Verse => ({
  ...verseData,
  id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  srs: createInitialSRS(),
});

export class VerseEngine {
  private storage: StorageAdapter;

  constructor(storage?: StorageAdapter) {
    this.storage = storage ?? new AsyncStorageAdapter();
  }

  private async persistVerses(verses: Verse[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(verses));
  }

  async getAllVerses(): Promise<Verse[]> {
    try {
      const data = await this.storage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
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

  async deleteVerse(verseId: string): Promise<void> {
    const verses = await this.getAllVerses();
    const filtered = verses.filter((verse) => verse.id !== verseId);
    await this.persistVerses(filtered);
  }

  async recordReview(verseId: string, score: number, now = new Date()): Promise<SRSResult> {
    const verses = await this.getAllVerses();
    const index = verses.findIndex((verse) => verse.id === verseId);
    if (index === -1) {
      throw new Error(`Verse not found: ${verseId}`);
    }

    const currentVerse = verses[index];
    const currentSRS: SRSState = currentVerse.srs || DEFAULT_SRS_STATE;
    const srsResult = calculateNextReview(currentSRS, score, now);

    const streak = srsResult.streak ?? 0;
    verses[index].srs = {
      streak,
      intervalDays: srsResult.intervalDays,
      easeFactor: srsResult.easeFactor,
      nextReviewDate: srsResult.nextReviewDate.toISOString(),
    };

    await this.persistVerses(verses);
    return srsResult;
  }
}

export const verseEngine = new VerseEngine();
