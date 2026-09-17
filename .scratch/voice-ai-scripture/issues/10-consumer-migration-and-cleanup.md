# 10: Consumer Integration & Legacy Storage Service Deletion

**What to build:** Migrate all presentation screens and recitation controllers to consume `VerseEngine`, eliminate component-level SRS filtering loops, and delete the legacy `VerseStorageService` pass-through module.

**Blocked by:** 09-headless-verse-engine

**Status:** ready-for-agent

- [ ] Refactor `HomeScreen.tsx` to load verses via `verseEngine.getVersesSummary()`, removing component-level `isVerseDue` filter loops.
- [ ] Refactor `ReviewScreen.tsx` manual review to call `verseEngine.recordReview(verse.id, passed ? 100 : 0)`, eliminating raw SM-2 calculation in the component.
- [ ] Refactor `RecitationSession.ts` to coordinate recitation review recording through `verseEngine.recordReview(this.verse.id, score)`.
- [ ] Refactor `PackBrowserModal.tsx` to import topical packs via `verseEngine.importVerses()`.
- [ ] Delete legacy `src/services/VerseStorageService.ts` and `src/services/VerseStorageService.test.ts`.
- [ ] Execute full regression test suite ensuring all tests pass 100% green.
