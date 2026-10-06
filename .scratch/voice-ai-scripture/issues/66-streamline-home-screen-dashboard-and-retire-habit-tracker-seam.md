# 66: Streamline HomeScreen Dashboard Consumption and Retire HabitTracker Seam

**What to build:**
Update `HomeScreen` to fetch verse summaries and habit streaks in a single atomic pass via `verseEngine.getDashboard()`, removing manual query choreography and `overrideDueCount`. Retire `HabitTracker` as a standalone public module and align all home screen tests with the deepened `VerseEngine`.

**Blocked by:** 65: Absorb Habit Retention Streaks and Unified Dashboard Query into Deep VerseEngine

**Status:** ready-for-agent

- [x] `HomeScreen` replaces dual sequential queries with a single call to `verseEngine.getDashboard()`
- [x] Parameter `overrideDueCount` on habit query interfaces is deleted
- [x] Standalone `HabitTracker` module is retired or preserved solely as an internal helper of `VerseEngine`
- [x] `HomeScreen.test.tsx` and related test suites assert dashboard loading and review tracking cleanly through the deep `VerseEngine`
- [x] All 35 test suites pass and TypeScript typecheck is clean with 0 errors
