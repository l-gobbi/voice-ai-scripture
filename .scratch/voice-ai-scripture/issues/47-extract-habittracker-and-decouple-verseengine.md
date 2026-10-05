# 47: Extract HabitTracker Seam and Decouple VerseEngine

**What to build:** An authoritative, standalone `HabitTracker` domain module managing user daily review streaks, longest streaks, daily completion records, calendar day arithmetic, and dedicated storage persistence. `VerseEngine` delegates retention activity recording upon review completion across a clean internal seam, stripping all habit math and dual-key writes from `VerseEngine`. `HomeScreen` queries `HabitTracker` directly for habit banner stats.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [x] `HabitTracker` module created with `getHabitStats(now?: Date)`, `recordActivity(verseId: string, wasDue: boolean, now?: Date)`, and `resetHabit()`
- [x] Injectable `StorageAdapter` support (defaults to `AsyncStorageAdapter`, tests use `MapStorageAdapter`) with storage key `global_habit_stats`
- [x] Streak calculation correctly handles consecutive days, same-day multiple reviews, missed-day resets, and longest streak preservation
- [x] `VerseEngine.recordReview` calls `habitTracker.recordActivity(verseId, wasDue, now)`
- [x] All habit methods, interfaces, and calendar helpers removed from `VerseEngine`
- [x] `HomeScreen` imports and queries `habitTracker.getHabitStats()` directly
- [x] Comprehensive unit tests in `HabitTracker.test.ts` pass 100%
