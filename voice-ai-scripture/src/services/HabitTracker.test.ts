import { HabitTracker, HabitStats } from './HabitTracker';
import { MapStorageAdapter } from './StorageAdapter';

describe('HabitTracker Seam (Ticket 47)', () => {
  let storage: MapStorageAdapter;
  let getDueCountMock: jest.Mock<Promise<number>, []>;
  let tracker: HabitTracker;

  beforeEach(() => {
    storage = new MapStorageAdapter();
    getDueCountMock = jest.fn().mockResolvedValue(3);
    tracker = new HabitTracker(storage, () => getDueCountMock());
  });

  it('returns initial zeroed habit statistics when no activity recorded', async () => {
    const stats = await tracker.getHabitStats(new Date('2026-10-05T12:00:00Z'));
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(0);
    expect(stats.lastActiveDate).toBeNull();
    expect(stats.completedTodayCount).toBe(0);
    expect(stats.dueCount).toBe(3);
    expect(stats.totalDueToday).toBe(3);
  });

  it('records first activity and initializes streak to 1', async () => {
    const today = new Date('2026-10-05T10:00:00Z');
    const stats = await tracker.recordActivity('verse-1', true, today);

    expect(stats.currentStreak).toBe(1);
    expect(stats.longestStreak).toBe(1);
    expect(stats.lastActiveDate).toBe('2026-10-05');
    expect(stats.completedTodayCount).toBe(1);
  });

  it('maintains streak on multiple reviews on the same calendar day', async () => {
    const today = new Date('2026-10-05T10:00:00Z');
    await tracker.recordActivity('verse-1', true, today);
    const stats = await tracker.recordActivity('verse-2', true, today);

    expect(stats.currentStreak).toBe(1);
    expect(stats.longestStreak).toBe(1);
    expect(stats.completedTodayCount).toBe(2);
  });

  it('increments streak on consecutive calendar day review', async () => {
    const day1 = new Date('2026-10-05T10:00:00Z');
    const day2 = new Date('2026-10-06T10:00:00Z');

    await tracker.recordActivity('verse-1', true, day1);
    const statsDay2 = await tracker.recordActivity('verse-2', true, day2);

    expect(statsDay2.currentStreak).toBe(2);
    expect(statsDay2.longestStreak).toBe(2);
    expect(statsDay2.lastActiveDate).toBe('2026-10-06');
    expect(statsDay2.completedTodayCount).toBe(1);
  });

  it('resets streak to 0 if a full day is missed when querying stats', async () => {
    const day1 = new Date('2026-10-01T10:00:00Z');
    await tracker.recordActivity('verse-1', true, day1);

    // Query 3 days later
    const day4 = new Date('2026-10-04T10:00:00Z');
    const stats = await tracker.getHabitStats(day4);

    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(1); // Historical record preserved
    expect(stats.lastActiveDate).toBe('2026-10-01');
  });

  it('re-starts streak at 1 after a missed day when recording new activity', async () => {
    const day1 = new Date('2026-10-01T10:00:00Z');
    const day2 = new Date('2026-10-02T10:00:00Z');
    await tracker.recordActivity('verse-1', true, day1);
    await tracker.recordActivity('verse-2', true, day2);

    // Missed 2026-10-03, activity on 2026-10-04
    const day4 = new Date('2026-10-04T10:00:00Z');
    const stats = await tracker.recordActivity('verse-3', true, day4);

    expect(stats.currentStreak).toBe(1);
    expect(stats.longestStreak).toBe(2); // Preserves peak 2
    expect(stats.lastActiveDate).toBe('2026-10-04');
  });

  it('only counts verse toward completedTodayCount if wasDue is true', async () => {
    const today = new Date('2026-10-05T10:00:00Z');
    await tracker.recordActivity('verse-1', false, today);

    const stats = await tracker.getHabitStats(today);
    expect(stats.currentStreak).toBe(1); // Still counts as active day
    expect(stats.completedTodayCount).toBe(0); // Not counted toward due completed
  });

  it('resets all habit tracking data when resetHabit is invoked', async () => {
    const day1 = new Date('2026-10-05T10:00:00Z');
    await tracker.recordActivity('verse-1', true, day1);

    await tracker.resetHabit();

    const stats = await tracker.getHabitStats(day1);
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(0);
    expect(stats.lastActiveDate).toBeNull();
    expect(stats.completedTodayCount).toBe(0);
  });
});
