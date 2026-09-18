# 21: Domain Method for Verse Removal (VerseEngine.deleteVerse)

**What to build:**
Enable the domain layer (`VerseEngine`) to permanently remove a stored verse and its associated Spaced Repetition (SRS) state by its identifier. The method must persist the modified verse list to local storage immediately and allow `getVersesSummary()` to reflect the updated counts (`allVerses`, `dueVerses`, `dueCount`).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Add `deleteVerse(id: string): Promise<boolean>` to `VerseEngine`
- [x] Ensure `deleteVerse` removes the matching verse and persists the updated array to storage, returning `true`
- [x] Ensure `deleteVerse` leaves storage unchanged and returns `false` if the ID does not match any existing verse
- [x] Verify `getVersesSummary()` accurately reflects decremented counts and excluded due verses after deletion
- [x] Add comprehensive unit tests in `VerseEngine.test.ts` exercising `deleteVerse` with `MapStorageAdapter`
