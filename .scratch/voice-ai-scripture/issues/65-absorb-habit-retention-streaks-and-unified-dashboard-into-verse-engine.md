# 65: Absorb Habit Retention Streaks and Unified Dashboard Query into Deep VerseEngine

**What to build:**
Deepen `VerseEngine` to own both scripture persistence and habit retention streaks. Reabsorb habit calculations from `HabitTracker` into `VerseEngine`, eliminate circular closure injection (`dueCountFn` and `setDueCountFn`), atomically update daily streaks during `recordReview()`, and expose a unified `getDashboard(now)` query.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `VerseEngine` absorbs streak and retention calculation logic as internal implementation details
- [x] Circular closures (`dueCountFn`, `setDueCountFn`, `setDueCount`) are completely eliminated
- [x] `VerseEngine.recordReview()` atomically updates verse Spaced Repetition scheduling and habit streak data in storage
- [x] `VerseEngine.getDashboard(now)` returns both `summary: VerseSummary` and `habitStats: HabitStats` in a single storage pass
- [x] `VerseEngine.test.ts` covers unified dashboard generation and atomic streak progression using `MapStorageAdapter`
