# 18: Static Protestant Canon Matrix & Domain Lookup Engine

**What to build:**
An immutable, 100% offline static canon lookup module in `src/data/bibleCanon.ts` containing the standard 66 Protestant Bible books, their testament (OT/NT), canonical chapter counts, and verse counts per chapter. Provides pure domain helper functions to query books by testament, search books by bilingual name or common alias, get chapter counts, and get verse counts for any chapter. This allows the upcoming picker to generate mathematically exact chapter and verse grids without network calls or layout shift.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] Define `CanonBook` interface with `id` (OSIS code), `testament` (`'OT' | 'NT'`), `enName`, `ptName`, `enAliases`, `ptAliases`, `chapters` (count), and `verseCounts` (array of numbers indexed by chapter).
- [x] Implement static dataset containing all 66 Protestant canon books (39 Old Testament, 27 New Testament) with accurate chapter counts and verse counts per chapter.
- [x] Implement domain query helpers:
  - `getCanonBooks(testament?: 'OT' | 'NT', language?: 'en' | 'pt'): CanonBook[]`
  - `getCanonBook(bookId: string): CanonBook | undefined`
  - `searchCanonBooks(query: string, language?: 'en' | 'pt'): CanonBook[]`
  - `getChapterCount(bookId: string): number`
  - `getVerseCount(bookId: string, chapter: number): number`
- [x] Write unit tests in `src/data/bibleCanon.test.ts` verifying:
  - Total book count is 66 (39 OT, 27 NT).
  - Accurate chapter counts on boundary books (e.g. Obadiah: 1, Psalms: 150).
  - Accurate verse counts on landmark chapters (e.g. John 3: 36, Psalm 23: 6, Psalm 119: 176).
  - Bilingual search queries matching Portuguese and English names and abbreviations (e.g., `Jo`, `Jn`, `Sl`, `Ps`).
