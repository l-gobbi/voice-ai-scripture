# 48: Retire Shallow Scripture Facades and Repoint Modals to ScriptureCatalog

**What to build:** Retire the shallow `ReferenceNormalizer` and `BibleProvider` facade modules, migrating `AddVerseModal` and `ReferencePickerModal` directly to the deep `ScriptureCatalog` seam. `AddVerseModal` resolves passage metadata, canonical reference, and text in a single call to `scriptureCatalog.resolvePassage`. `ReferencePickerModal` queries canon books, testament groupings, and chapter verse limits directly from `scriptureCatalog`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `AddVerseModal` refactored to use `scriptureCatalog.resolvePassage(query, translation)` in a single call instead of coordinating `normalizeReference`, `isBundledTranslation`, and `bibleProvider.fetchPassage`
- [ ] `ReferencePickerModal` refactored to query `scriptureCatalog.getBooks()` and `scriptureCatalog.getVerseCount()` directly instead of importing static `bibleCanon` functions
- [ ] `ReferenceNormalizer.ts` and `BibleProvider.ts` retired/cleaned up to re-export from `ScriptureCatalog` or removed from active call sites
- [ ] All tests in `AddVerseModal.test.tsx`, `ReferencePickerModal.test.tsx`, `ScriptureCatalog.test.ts`, and `BibleProvider.test.ts` pass cleanly
