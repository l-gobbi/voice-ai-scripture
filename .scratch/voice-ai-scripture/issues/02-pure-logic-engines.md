# 02: pure-logic-engines

**What to build:** The core algorithms for Diffing (expected vs transcribed text) and Spaced Repetition (SRS), written as pure TypeScript functions with unit tests.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] Implement `diffVerses` algorithm (returning correct, missed, added states).
- [x] Implement `calculateScore` based on the diff output.
- [x] Implement SRS algorithm (e.g., simplified SM-2) to calculate `nextReviewDate` given a score and previous state.
- [x] Write unit tests for all edge cases (perfect match, missed words, stutters, extra words).
