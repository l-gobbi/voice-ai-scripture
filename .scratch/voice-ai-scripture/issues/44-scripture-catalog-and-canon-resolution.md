# 44: Scripture Catalog & Canon Resolution

**What to build:**
A single authoritative `ScriptureCatalog` module that consolidates reference normalization, the 66-book canon definitions, chapter/verse limits, bilingual aliases, bundled Bible datasets, and text language detection. Simplifies verse fetching in `AddVerseModal` and book selection in `ReferencePickerModal`.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] `resolvePassage(query, translation)` parses English and Portuguese queries (e.g. `"Jo 3:16"`, `"John 3:16"`, `"Sl 23:1"`) and returns canonical reference, book ID, chapter/verse bounds, language, and bundled passage text in a single call.
- [x] `detectLanguage(verse)` reliably identifies Portuguese vs. English using diacritics, vocabulary markers, and translation codes without duplicated heuristics across files.
- [x] `getBooks(testament)` and `getVerseCount(bookId, chapter)` provide canon bounds for `ReferencePickerModal`.
- [x] Consolidates duplicated canon lists from `ReferenceNormalizer.ts`, `bibleCanon.ts`, and `BibleProvider.ts`.
- [x] Comprehensive unit test suite verifying bilingual alias lookups, out-of-bounds chapter handling, and text retrieval.
