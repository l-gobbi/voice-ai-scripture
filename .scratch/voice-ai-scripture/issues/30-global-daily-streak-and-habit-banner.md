# 30: Global Daily Streak & Habit Progress Banner

**What to build:**  
A unified daily habit tracking system that calculates calendar-day active streaks and daily review progress, displayed prominently at the top of the Home Screen in a tactile `HabitBanner`. Completing at least one official recitation (Level 3) on a calendar day increments and protects the user's daily streak. When opening the app, learners immediately see their current flame streak (e.g. `🔥 4 Day Streak`) and a live progress bar showing how many due verses they have completed today (e.g. `2 of 3 Due Verses Reviewed Today`).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Global streak metrics (`currentStreak`, `longestStreak`, `lastActiveDate`) are persisted locally via `VerseEngine` and `StorageAdapter`.
- [x] Completing an official recitation on consecutive calendar days increments `currentStreak` by 1 and updates `longestStreak`.
- [x] Completing multiple recitations on the same calendar day preserves the current streak without double-counting.
- [x] Missing a calendar day resets `currentStreak` to 1 upon the next completed review.
- [x] `VerseEngine.getHabitStats()` returns `{ currentStreak, longestStreak, dueCount, completedTodayCount, totalDueToday }`.
- [x] `HabitBanner` renders at the top of the Home Screen showing the flame streak badge, progress text, and a styled progress bar.
- [x] Progress bar and completion counts update immediately when returning to the Home Screen after a review.
- [x] All behaviors are verified with hermetic unit tests in `VerseEngine.test.ts` and integration tests in `HomeScreen.test.tsx`.
