# 32: Daily Done Victory Card & Polished Verse Status Cards

**What to build:**  
Rewarding habit-closure feedback and refined visual status hierarchy across the verse list. When a learner clears all due verses for today (`dueCount === 0` while having verses in the library), the Home Screen renders a celebratory `DailyDoneCard` confirming that their daily streak is protected, showing when the next review is scheduled, and offering unmetered practice ahead. In the verse list, each card is upgraded with high-contrast urgency status pills (`Due Today`, `Mastered`, `Learning`), last review accuracy score, and a dedicated tactile `🎤 Recite` button.

**Blocked by:** 30: Global Daily Streak & Habit Progress Banner

**Status:** resolved

- [x] When `summary.dueCount === 0` and `summary.allVerses.length > 0` in the "Due Today" tab, `HomeScreen` renders `DailyDoneCard`.
- [x] `DailyDoneCard` displays celebratory victory styling: `🎉 Daily Goal Achieved! Streak Protected for Today.`
- [x] `DailyDoneCard` shows next review visibility: *"Next review due tomorrow"* (or the exact next due date).
- [x] `DailyDoneCard` provides a `Practice Ahead (Unmetered)` action that allows practicing all verses without altering SRS intervals.
- [x] Each verse card in the list displays a status pill: `Due Today` (prominent urgency badge) vs. `Mastered (Interval: Xd)` (green badge) vs. `Learning (Streak: X)` (indigo badge).
- [x] Each verse card shows the last recorded review accuracy score (e.g. `95% Accuracy`).
- [x] Each verse card features a dedicated tactile `🎤 Recite` button with an independent touch target separate from the verse menu or deletion button.
- [x] All states and transitions are verified with integration tests in `HomeScreen.test.tsx`.

