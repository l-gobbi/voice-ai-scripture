# 49: Deepen RecitationController with Scaffolding Lifecycle & Lifeline Timers

**What to build:** Deepen `RecitationSession` and `useRecitationSession` into a unified `RecitationController` that fully encapsulates multi-tier scaffolding state machines, Level 1 text-to-speech audio vocalization and reveal toggle, Level 2 cloze word tap reveals, and Level 3 word peek lifeline 3-second auto-masking timers with 75% score capping. The controller exposes a cohesive UI state snapshot and declarative user intent methods, guaranteeing robust timer cleanup and headless testability.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [x] `RecitationSession` encapsulates Level 1 automatic speech vocalization with audio cancellation on mode switch or disposal
- [x] Level 3 word peek lifeline timer (3 seconds) auto-remasks the peeked word, sets `assistanceUsed: true`, and cleans up existing timers on mode changes or reset
- [x] Controller exposes declarative intent methods: `startReciting()`, `stopAndVerify()`, `setLevel()`, `nextLevel()`, `practiceAgain()`, `toggleTextReveal()`, `tapWord()`, `vocalize()`, `reset()`, and `dispose()`
- [x] `useRecitationSession` forwards state stream and bound intent callbacks to callers cleanly
- [x] Headless unit tests in `RecitationSession.test.ts` verify all timers, level transitions, assistance capping, and audio interruption with fake timers and zero React Native renderer dependencies
