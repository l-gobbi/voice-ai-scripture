import {
  StorageAdapter,
  AsyncStorageAdapter,
} from './StorageAdapter';
import {
  VerseEngine,
  verseEngine,
  HabitStats,
  StoredHabitData,
  HABIT_STORAGE_KEY,
  toCalendarDateString,
  getYesterdayCalendarString,
} from './VerseEngine';

export {
  HabitStats,
  StoredHabitData,
  HABIT_STORAGE_KEY,
  toCalendarDateString,
  getYesterdayCalendarString,
};

/**
 * HabitTracker (Compatibility Facade)
 * All streak calculations, calendar day normalizations, and persistence
 * are canonically owned by the deep VerseEngine module.
 */
export class HabitTracker {
  private engine: VerseEngine;
  private deprecatedDueCountFn?: (now?: Date) => Promise<number>;

  constructor(storage?: StorageAdapter, deprecatedDueCountFn?: (now?: Date) => Promise<number>) {
    this.engine = storage ? new VerseEngine(storage) : verseEngine;
    this.deprecatedDueCountFn = deprecatedDueCountFn;
  }

  async getHabitStats(now = new Date(), overrideDueCount?: number): Promise<HabitStats> {
    const stats = await this.engine.getHabitStats(now);
    const dueCount =
      overrideDueCount !== undefined
        ? overrideDueCount
        : this.deprecatedDueCountFn
        ? await this.deprecatedDueCountFn(now)
        : stats.dueCount;

    return {
      ...stats,
      dueCount,
      totalDueToday: stats.completedTodayCount + dueCount,
    };
  }

  async recordActivity(
    verseId: string,
    wasDue: boolean,
    now = new Date()
  ): Promise<HabitStats> {
    return this.engine.recordHabitActivity(verseId, wasDue, now);
  }

  async resetHabit(): Promise<void> {
    return this.engine.resetHabit();
  }
}

export const habitTracker = new HabitTracker();
