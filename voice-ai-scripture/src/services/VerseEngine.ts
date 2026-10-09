import { DEFAULT_SRS_STATE, SRSResult, SRSState, calculateNextReview, isVerseDue } from '../engines/srsEngine';
import {
  StudyDay,
  addStudyDays,
  compareStudyDays,
  readStudyDay,
  studyDaysBetween,
  toStudyDay,
} from '../engines/studyDay';
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
    /**
     * The due Study Day (`YYYY-MM-DD`). Verses saved before Study Days may hold a legacy
     * ISO timestamp; read it only through the Study Day module (`readStudyDay`).
     */
    nextReviewDate?: StudyDay | string;
    lastScore?: number;
  };
}

export interface VerseSummary {
  allVerses: Verse[];
  dueVerses: Verse[];
  dueCount: number;
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  /** Study Day of the most recent activity. */
  lastActiveDate: StudyDay | null;
  completedTodayCount: number;
  totalDueToday: number;
  dueCount: number;
}

export interface StoredHabitData {
  currentStreak: number;
  longestStreak: number;
  /** Study Day of the most recent activity. */
  lastActiveDate: StudyDay | null;
  /** Verse ids completed while due, keyed by Study Day. */
  completedDates: Record<StudyDay, string[]>;
}

export interface DashboardData {
  summary: VerseSummary;
  habitStats: HabitStats;
}

export const HABIT_STORAGE_KEY = 'global_habit_stats';

/**
 * The displayed stage of a verse's memorization, derived from its current review interval
 * (CONTEXT.md). It replaces the per-verse streak and the "mastered" badge: a forgotten verse
 * returns to Seed instead of showing a count of zero.
 */
export type MemoryTier = 'seed' | 'growing' | 'rooted' | 'hidden_in_the_heart';

/**
 * Derives the Memory Tier from the verse's current interval in Study Days: under 7 Seed,
 * under 30 Growing, under 180 Rooted, 180 or more Hidden in the Heart. A verse never
 * officially reviewed (interval 0, or no SRS data) is a Seed.
 */
export function getMemoryTier(verse: Pick<Verse, 'srs'>): MemoryTier {
  const interval = verse.srs?.intervalDays || 0;
  if (interval < 7) return 'seed';
  if (interval < 30) return 'growing';
  if (interval < 180) return 'rooted';
  return 'hidden_in_the_heart';
}

const MEMORY_TIER_LABELS: Record<'en' | 'pt', Record<MemoryTier, string>> = {
  en: {
    seed: 'Seed',
    growing: 'Growing',
    rooted: 'Rooted',
    hidden_in_the_heart: 'Hidden in the Heart',
  },
  pt: {
    seed: 'Semente',
    growing: 'Crescendo',
    rooted: 'Enraizado',
    hidden_in_the_heart: 'Guardado no coração',
  },
};

/** The Memory Tier's name in the verse's language. */
export function memoryTierLabel(tier: MemoryTier, language: 'en' | 'pt'): string {
  return MEMORY_TIER_LABELS[language][tier];
}

import {
  StorageAdapter,
  MapStorageAdapter,
  AsyncStorageAdapter,
} from './StorageAdapter';

export { StorageAdapter, MapStorageAdapter, AsyncStorageAdapter };

const STORAGE_KEY = 'verses';

// A new verse is due on the Study Day it is added.
const createInitialSRS = () => ({
  ...DEFAULT_SRS_STATE,
  nextReviewDate: toStudyDay(new Date()),
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

  constructor(storage?: StorageAdapter) {
    this.storage = storage ?? new AsyncStorageAdapter();
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

  private async getStoredHabitData(): Promise<StoredHabitData> {
    try {
      const data = await this.storage.getItem(HABIT_STORAGE_KEY);
      if (!data) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: null,
          completedDates: {},
        };
      }
      return JSON.parse(data);
    } catch {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        completedDates: {},
      };
    }
  }

  private async persistHabitData(data: StoredHabitData): Promise<void> {
    await this.storage.setItem(HABIT_STORAGE_KEY, JSON.stringify(data));
  }

  private buildHabitStats(
    habitData: StoredHabitData,
    completedToday: number,
    dueCount: number,
    displayStreak: number
  ): HabitStats {
    return {
      currentStreak: displayStreak,
      longestStreak: habitData.longestStreak,
      lastActiveDate: habitData.lastActiveDate,
      completedTodayCount: completedToday,
      totalDueToday: completedToday + dueCount,
      dueCount,
    };
  }

  async getDashboard(now = new Date()): Promise<DashboardData> {
    const summary = await this.getVersesSummary(now);
    const habitData = await this.getStoredHabitData();

    const todayStr = toStudyDay(now);
    const yesterdayStr = addStudyDays(todayStr, -1);

    let displayStreak = habitData.currentStreak;
    if (
      habitData.lastActiveDate &&
      habitData.lastActiveDate !== todayStr &&
      habitData.lastActiveDate !== yesterdayStr
    ) {
      displayStreak = 0;
    }

    const completedToday = (habitData.completedDates[todayStr] || []).length;
    const habitStats = this.buildHabitStats(
      habitData,
      completedToday,
      summary.dueCount,
      displayStreak
    );

    return {
      summary,
      habitStats,
    };
  }

  async getHabitStats(now = new Date()): Promise<HabitStats> {
    const { habitStats } = await this.getDashboard(now);
    return habitStats;
  }

  private async updateHabitStreak(
    verseId: string,
    wasDue: boolean,
    now = new Date()
  ): Promise<StoredHabitData> {
    const todayStr = toStudyDay(now);
    const yesterdayStr = addStudyDays(todayStr, -1);
    const habitData = await this.getStoredHabitData();

    if (habitData.lastActiveDate === todayStr) {
      // Already active today, maintain current streak
    } else if (habitData.lastActiveDate === yesterdayStr) {
      habitData.currentStreak += 1;
    } else {
      habitData.currentStreak = 1;
    }

    if (habitData.currentStreak > habitData.longestStreak) {
      habitData.longestStreak = habitData.currentStreak;
    }
    habitData.lastActiveDate = todayStr;

    if (wasDue) {
      const todaysCompletions = new Set(habitData.completedDates[todayStr] || []);
      todaysCompletions.add(verseId);
      habitData.completedDates = {
        ...habitData.completedDates,
        [todayStr]: Array.from(todaysCompletions),
      };
    }

    await this.persistHabitData(habitData);
    return habitData;
  }

  async recordHabitActivity(
    verseId: string,
    wasDue: boolean,
    now = new Date()
  ): Promise<HabitStats> {
    const habitData = await this.updateHabitStreak(verseId, wasDue, now);
    const todayStr = toStudyDay(now);
    const completedToday = (habitData.completedDates[todayStr] || []).length;
    const dueCount = (await this.getVersesSummary(now)).dueCount;

    return this.buildHabitStats(habitData, completedToday, dueCount, habitData.currentStreak);
  }

  async resetHabit(): Promise<void> {
    await this.persistHabitData({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      completedDates: {},
    });
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
      nextReviewDate: srsResult.nextReviewDate,
      lastScore: score,
    };
    verses[index].lastScore = score;

    await this.persistVerses(verses);
    await this.updateHabitStreak(verseId, wasDue, now);

    return srsResult;
  }

  /** Describes the earliest future due Study Day, counted in Study Days from today. */
  getNextReviewMessage(allVerses: Verse[], now = new Date()): string {
    const today = toStudyDay(now);
    const futureStudyDays = allVerses
      .map((v) => readStudyDay(v.srs?.nextReviewDate))
      .filter((day): day is StudyDay => day !== null && compareStudyDays(day, today) > 0)
      .sort(compareStudyDays);

    if (futureStudyDays.length === 0) {
      return 'Next review due tomorrow';
    }

    const diffDays = studyDaysBetween(today, futureStudyDays[0]);
    if (diffDays <= 1) {
      return 'Next review due tomorrow';
    }
    return `Next review due in ${diffDays} days`;
  }
}

export const verseEngine = new VerseEngine();
