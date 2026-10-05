# 50: Refactor ReviewScreen into Pure Declarative Presentation Surface

**What to build:** Refactor `ReviewScreen.tsx` from an 1,177-line imperative monolith to a concise declarative presentation component (< 500 lines) bound directly to the deepened `RecitationController`. Strips all imperative `setTimeout` timers, mode-switching side effects, and audio playback calls out of JSX while preserving sacred editorial styling, typography tokens, acoustic debug tray, and diff visualizers.

**Blocked by:** 49: Deepen RecitationController with Scaffolding Lifecycle & Lifeline Timers

**Status:** ready-for-agent

- [ ] `ReviewScreen.tsx` refactored to consume `RecitationUIState` from `useRecitationSession` and dispatch user action callbacks
- [ ] Imperative `setTimeout` peek timers and manual audio calls removed from `ReviewScreen`
- [ ] Sacred editorial styling, theme tokens, Level 1/2/3 visual layouts, DiffView, and Waveform visualizers fully preserved
- [ ] Acoustic debug tray and sandbox opt-in modal maintained with clean component separation
- [ ] Screen line count reduced by > 50% (< 550 lines)
- [ ] TypeScript compilation succeeds with zero type errors and integration tests pass cleanly
