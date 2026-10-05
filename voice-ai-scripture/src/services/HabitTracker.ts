import {
  StorageAdapter,
  AsyncStorageAdapter,
} from './StorageAdapter';

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  completedTodayCount: number;
  totalDueToday: number;
  dueCount: number;
}

export interface StoredHabitData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  completedDates: Record<string, string[]>;
}

export const HABIT_STORAGE_KEY = 'global_habit_stats';

export function toCalendarDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayCalendarString(today: Date): string {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return toCalendarDateString(yesterday);
}

export class HabitTracker {
  private storage: StorageAdapter;
  private getDueCountFn?: (now?: Date) => Promise<number>;

  constructor(
    storage?: StorageAdapter,
    getDueCountFn?: (now?: Date) => Promise<number>
  ) {
    this.storage = storage ?? new AsyncStorageAdapter();
    this.getDueCountFn = getDueCountFn;
  }

  setDueCountFn(fn: (now?: Date) => Promise<number>): void {
    this.getDueCountFn = fn;
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

  private buildStats(
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

  async getHabitStats(now = new Date(), overrideDueCount?: number): Promise<HabitStats> {
    const habitData = await this.getStoredHabitData();
    const todayStr = toCalendarDateString(now);
    const yesterdayStr = getYesterdayCalendarString(now);

    let displayStreak = habitData.currentStreak;
    if (
      habitData.lastActiveDate &&
      habitData.lastActiveDate !== todayStr &&
      habitData.lastActiveDate !== yesterdayStr
    ) {
      displayStreak = 0;
    }

    const completedToday = (habitData.completedDates[todayStr] || []).length;
    const dueCount =
      overrideDueCount !== undefined
        ? overrideDueCount
        : this.getDueCountFn
        ? await this.getDueCountFn(now)
        : 0;

    return this.buildStats(habitData, completedToday, dueCount, displayStreak);
  }

  async recordActivity(
    verseId: string,
    wasDue: boolean,
    now = new Date()
  ): Promise<HabitStats> {
    const todayStr = toCalendarDateString(now);
    const yesterdayStr = getYesterdayCalendarString(now);
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

    const completedToday = (habitData.completedDates[todayStr] || []).length;
    const dueCount = this.getDueCountFn ? await this.getDueCountFn(now) : 0;

    return this.buildStats(habitData, completedToday, dueCount, habitData.currentStreak);
  }

  async resetHabit(): Promise<void> {
    await this.persistHabitData({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      completedDates: {},
    });
  }
}

export const habitTracker = new HabitTracker();

