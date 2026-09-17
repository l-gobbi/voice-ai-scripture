import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SRS_STATE, SRSResult, SRSState } from '../engines/srsEngine';

export interface Verse {
  id: string;
  reference: string;
  text: string;
  srs?: SRSState & {
    nextReviewDate?: string;
  };
}

const STORAGE_KEY = 'verses';

const createInitialSRS = () => ({
  ...DEFAULT_SRS_STATE,
  nextReviewDate: new Date().toISOString(),
});

export const VerseStorageService = {
  async addVerse(verseData: Omit<Verse, 'id' | 'srs'>): Promise<void> {
    const verses = await this.getAllVerses();
    const newVerse: Verse = {
      ...verseData,
      id: Date.now().toString(),
      srs: createInitialSRS(),
    };
    verses.push(newVerse);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(verses));
  },

  async updateVerseSRS(id: string, srsResult: SRSResult): Promise<void> {
    const verses = await this.getAllVerses();
    const index = verses.findIndex((v) => v.id === id);
    if (index !== -1) {
      const streak = srsResult.streak ?? srsResult.repetitions ?? 0;
      verses[index].srs = {
        streak,
        repetitions: streak,
        intervalDays: srsResult.intervalDays,
        easeFactor: srsResult.easeFactor,
        nextReviewDate: srsResult.nextReviewDate.toISOString(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(verses));
    }
  },

  async importVerses(versesToImport: Array<Omit<Verse, 'id' | 'srs'>>): Promise<number> {
    const existing = await this.getAllVerses();
    const existingRefs = new Set(existing.map((v) => v.reference.trim().toLowerCase()));

    const newVerses: Verse[] = [];

    for (const v of versesToImport) {
      if (!existingRefs.has(v.reference.trim().toLowerCase())) {
        newVerses.push({
          ...v,
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          srs: createInitialSRS(),
        });
        existingRefs.add(v.reference.trim().toLowerCase());
      }
    }

    if (newVerses.length > 0) {
      const combined = [...existing, ...newVerses];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
    }

    return newVerses.length;
  },

  async getAllVerses(): Promise<Verse[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to parse verses from storage', error);
      return [];
    }
  },
};
