# 56: Direct Scripture Catalog Resolution and Deprecated Facade Retirement

**What to build:**
Direct all scripture verse queries, reference normalization, and translation lookups through the synchronous `ScriptureCatalog` seam. Eliminate defensive double-fetching in `AddVerseModal`, remove artificial asynchronous promise wrappers for in-memory catalog data, and retire the deprecated `BibleProvider` and `ReferenceNormalizer` facades.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `AddVerseModal` and all scripture callers query `ScriptureCatalog` directly without calling `BibleProvider` or `ReferenceNormalizer`.
- [x] `HomeScreen.test.tsx` and all screen tests use real in-memory `ScriptureCatalog` without needing to mock `BibleProvider`.
- [x] `src/services/BibleProvider.ts`, `src/services/ReferenceNormalizer.ts`, and `src/services/BibleProvider.test.ts` are safely deleted.
- [x] All scripture catalog and modal tests pass with 100% green status.
