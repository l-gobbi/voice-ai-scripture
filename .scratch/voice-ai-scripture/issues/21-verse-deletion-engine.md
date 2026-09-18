# 21: Domain Method for Verse Removal (VerseEngine.deleteVerse)

**What to build:**
Enable the domain layer (`VerseEngine`) to permanently remove a stored verse and its associated Spaced Repetition (SRS) state by its identifier. The method must persist the modified verse list to local storage immediately and allow `getVersesSummary()` to reflect the updated counts (`allVerses`, `dueVerses`, `dueCount`).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Add `deleteVerse(id: string): Promise<VerseSummary>` to `VerseEngine` class.
- [x] Implement atomic filtering and storage persistence via `StorageAdapter.setItem('verses', ...)`.
- [x] Ensure deleted verse is removed from due queue and summary counts update accurately.
- [x] Add unit tests covering successful deletion, non-existent ID handling, and summary integrity. `getVersesSummary()` accurately reflects decremented counts and excluded due verses after deletion
- [x] Add comprehensive unit tests in `VerseEngine.test.ts` exercising `deleteVerse` with `MapStorageAdapter`
