# 09: Headless VerseEngine Domain Core & Invariants

**What to build:** Implement the authoritative, headless `VerseEngine` domain module that encapsulates verse persistence, Spaced Repetition (SRS) state transitions via `recordReview(verseId, score)`, single-pass due verse querying via `getVersesSummary(now)`, permissive verse addition, and deduplicating pack import with an injectable storage adapter.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Implement `VerseEngine` class and default singleton instance with `StorageAdapter` interface (AsyncStorage default, MapStorageAdapter for tests).
- [ ] Implement `recordReview(verseId, score, now)` calculating next SM-2 interval and updating verse atomically.
- [ ] Implement `getVersesSummary(now)` returning `{ dueVerses, allVerses, dueCount }` in a single pass using domain due predicate.
- [ ] Implement `addVerse(verseData)` creating a new verse with initial SM-2 state.
- [ ] Implement `importVerses(verses)` deduplicating by canonical reference and skipping already existing verses.
- [ ] Implement `deleteVerse(verseId)` removing a verse from storage.
- [ ] Exhaustive unit test suite verifying SM-2 streak progression, due filtering, pack deduplication, and storage failure safety.
