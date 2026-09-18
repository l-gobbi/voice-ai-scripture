---
labels: ["ready-for-agent"]
---

# Specification: Guided Reference Picker & Static Canon Matrix

## Problem Statement

Users frequently encounter friction when adding scripture verses to their memory repository. While `ReferenceNormalizer` and `BibleProvider` support automatic scripture fetching, users are currently forced to manually type book names and citations into a raw text input field ("Referência Bíblica"). On mobile devices, typing references like `Filipenses 4:6-7` or `2 Coríntios 5:7` is tedious, error-prone due to mobile keyboard autocorrect, and requires users to already know exact book spellings or supported abbreviations. Furthermore, novice believers or users wanting to visually explore what to memorize have no way to browse books, chapters, and verses.

Most standard Bible applications (such as YouVersion, Logos, and Blue Letter Bible) provide a guided, thumb-friendly 3-stage selection hierarchy (Book → Chapter → Verse). Without this visual flow, mobile user drop-off during verse addition remains higher than necessary.

## Solution

Implement an instant, thumb-friendly, offline-first **Reference Picker** modal integrated into `AddVerseModal`:
1. **Hybrid Coexistence**:
   - Keep the existing free-text input and 1-tap YouVersion clipboard import in `AddVerseModal` for fast typists and direct copying.
   - Add a prominent **"📖 Escolher da Bíblia"** button that opens the dedicated `ReferencePickerModal`.
2. **Three-Stage Drill-Down Selection Hierarchy**:
   - **Stage 1 (Livro)**:
     - Segmented testament filter tabs: `[Todos (66)]`, `[Antigo Testamento (39)]`, `[Novo Testamento (27)]`.
     - Live search filter at the top with auto-focus, matching book names and bilingual abbreviations (e.g., typing `"Jo"` immediately narrows to *João, 1 João, 2 João, 3 João, Joel, Jonas, Josué, Jó*).
     - Selecting a book immediately transitions to its chapter grid.
   - **Stage 2 (Capítulo)**:
     - Sized numeric grid (1..N) displaying exactly the canonical number of chapters for the selected book (e.g. 50 for Genesis, 150 for Psalms, 1 for Obadiah).
     - Selecting a chapter immediately transitions to its verse grid.
   - **Stage 3 (Versículo & Range Selection)**:
     - Sized numeric grid (1..M) displaying exactly the canonical number of verses for the chosen chapter.
     - **1-Tap Single Verse Selection**: Tapping a verse highlights it and displays a floating action pill: `"Inserir [Livro C:V]"`.
     - **2-Tap Multi-Verse Range**: Tapping a second verse highlights the contiguous span (e.g., verses 6 through 7), updating the pill to `"Inserir [Livro C:V1-V2]"`.
     - Tapping the confirmation pill closes the picker and passes the formatted canonical reference back to `AddVerseModal`.
3. **Persistent Breadcrumb Navigation**:
   - A sticky header displays the selection path: `[Livro] › [Capítulo] › [Versículo]`.
   - Tapping any previous breadcrumb item returns immediately to that step without losing state.
   - A `< Voltar` chevron provides sequential back-stepping.
4. **Static Protestant 66-Book Canon Matrix**:
   - An immutable, ultra-lightweight (~4KB) data module `src/data/bibleCanon.ts` defining all 66 books, their testament (OT/NT), canonical chapter counts, and verse counts per chapter.
   - 100% offline, zero network latency, instant grid rendering.
5. **Bilingual Display & Auto-Fetch Integration**:
   - Book and testament names render in Portuguese or English matching the user's active translation in `AddVerseModal` (`ALMEIDA`, `ONBV`, `NVI`, `ARA` → PT; `WEB`, `KJV`, `ESV` → EN).
   - Once confirmed, `AddVerseModal` populates `"Referência Bíblica"` and triggers debounced auto-fetch for bundled translations (`WEB`, `KJV`, `ALMEIDA`, `ONBV`), or provides clipboard guidance for copyrighted translations (`NVI`, `ARA`, `CUSTOM`).

## User Stories

1. As a believer opening the "Add Verse" modal on a phone, I want to tap "📖 Escolher da Bíblia", so that I can pick a passage with my thumbs without typing on a mobile keyboard.
2. As a user browsing books, I want segmented tabs for "Antigo Testamento" (39) and "Novo Testamento" (27), so that I can quickly cut the list in half and find my book without excessive scrolling.
3. As a user who knows the book name, I want a live search bar that filters the book list as I type, so that typing "Rom" instantly narrows the list to "Romanos".
4. As a Brazilian user typing common abbreviations like "Jo" or "Sl", I want the search filter to recognize Portuguese aliases and immediately show "João" or "Salmos".
5. As an English user typing "Jn" or "Ps", I want the search filter to recognize English aliases and immediately show "John" or "Psalms".
6. As a user who selected a book, I want to see a clean numeric grid of chapters matching that book's exact canon count, so that I cannot pick non-existent chapters like Jude 2 or Obadiah 2.
7. As a user who selected a chapter, I want to see a numeric grid of verses matching that chapter's exact canon count, so that I cannot pick non-existent verses like John 3:37.
8. As a user wanting to memorize a single verse (e.g. João 3:16), I want to tap verse 16 and tap "Inserir João 3:16", so that I can complete selection in seconds.
9. As a user wanting to memorize a multi-verse passage (e.g. Filipenses 4:6-7), I want to tap verse 6 and then verse 7 to highlight the range and tap "Inserir Filipenses 4:6-7", so that I can memorize continuous passages effortlessly.
10. As a user on the verse selection step who realized they picked the wrong chapter, I want to tap the chapter breadcrumb in the header, so that I can jump back to chapter selection in one tap.
11. As a user on the chapter selection step who wants a different book, I want to tap the book breadcrumb or back arrow, so that I can change the book easily.
12. As a user memorizing in Portuguese (Almeida), I want book names to display in Portuguese (e.g., "Gênesis", "Mateus"), so that the terminology matches my Bible.
13. As a user memorizing in English (WEB or KJV), I want book names to display in English (e.g., "Genesis", "Matthew"), so that the terminology matches my Bible.
14. As a fast typist who prefers typing "Rm 8:28" directly, I want the free-text input to remain fully functional, so that the picker does not slow down experienced typists.
15. As a user selecting a verse in a bundled translation (e.g. Almeida), I want the verse text to auto-populate immediately upon returning from the picker, so that I am ready to save with one tap.
16. As a user selecting a verse in a copyrighted translation (e.g. NVI), I want the picker to fill the reference and focus the text box with helpful guidance, so that I can paste my copied text cleanly.
17. As an automated test runner, I want pure-logic helper functions in the canon matrix to test chapter/verse boundaries without rendering UI, so that edge cases are verified quickly.

## Implementation Decisions

- **Static Canon Matrix (`src/data/bibleCanon.ts`)**:
  - Contains array of all 66 Protestant canon books with fields:
    - `id`: Canonical OSIS book ID (e.g. `'GEN'`, `'MAT'`, `'JHN'`)
    - `testament`: `'OT' | 'NT'`
    - `enName`: English name (e.g. `'Genesis'`)
    - `ptName`: Portuguese name (e.g. `'Gênesis'`)
    - `chapters`: Number of chapters in the book
    - `verseCounts`: Array where `verseCounts[chapter - 1]` contains the number of verses in that chapter
  - Exports domain query functions:
    - `getCanonBooks(testament?: 'OT' | 'NT', language?: 'en' | 'pt'): CanonBook[]`
    - `getCanonBook(bookId: string): CanonBook | undefined`
    - `searchCanonBooks(query: string, language?: 'en' | 'pt'): CanonBook[]`
    - `getChapterCount(bookId: string): number`
    - `getVerseCount(bookId: string, chapter: number): number`

- **Reference Picker Modal (`src/components/ReferencePickerModal.tsx`)**:
  - Props contract:
    ```typescript
    export interface ReferencePickerModalProps {
      visible: boolean;
      translation: VerseTranslation;
      onClose: () => void;
      onSelectReference: (canonicalReference: string) => void;
    }
    ```
  - Internal state:
    - `step`: `'book' | 'chapter' | 'verse'`
    - `selectedBook`: `CanonBook | null`
    - `selectedChapter`: `number | null`
    - `startVerse`: `number | null`
    - `endVerse`: `number | null`
    - `searchQuery`: `string`
    - `testamentFilter`: `'all' | 'OT' | 'NT'`
  - UI Sub-views:
    - **Header**: Breadcrumbs row (`[Livro] › [Capítulo] › [Versículo]`) with touchable items to jump back, plus a close button `✕` and back button `‹`.
    - **Book Step**:
      - Search bar with clear button (`✕`).
      - Testament filter tabs: `Todos`, `Antigo Testamento`, `Novo Testamento`.
      - Scrollable FlatList of book items showing book name and testament badge.
    - **Chapter Step**:
      - Number grid rendered with `flexWrap: 'wrap'` or FlatList `numColumns={5}`.
      - Large, accessible touch targets with active press feedback.
    - **Verse Step**:
      - Number grid (1..M).
      - Single verse or range selection state (highlighted in indigo/blue).
      - Floating bottom confirmation bar: `"Inserir <Reference>"`.

- **Integration into `AddVerseModal` (`src/components/AddVerseModal.tsx`)**:
  - Add a `"📖 Escolher da Bíblia"` button styled beside or below the `"Referência Bíblica"` label.
  - When pressed, open `ReferencePickerModal`.
  - On `onSelectReference(ref)`:
    - Set reference state to `ref`.
    - Automatically trigger `fetchVerseText(ref, selectedTranslation, false)`.
    - Close the picker modal.

## Testing Decisions

- **Good Test Philosophy**: Tests verify public behavior through defined seams, not internal component state or private helper implementation details.
- **Seams Under Test**:
  1. **Canon Matrix Seam (`src/data/bibleCanon.test.ts`)**:
     - Verifies all 66 books exist with correct OT (39) and NT (27) classifications.
     - Verifies boundary chapter counts (e.g. Obadiah: 1 chapter, Psalms: 150 chapters).
     - Verifies verse counts for landmark chapters (e.g. John 3: 36 verses, Psalm 23: 6 verses, Psalm 119: 176 verses).
     - Verifies bilingual search queries matching full names and common abbreviations in both languages.
  2. **Reference Picker Modal Component Seam (`src/components/ReferencePickerModal.test.tsx`)**:
     - Verifies testament filtering (Todos / Antigo / Novo) renders correct book subsets.
     - Verifies live search query filters book list instantly.
     - Verifies navigation from Book → Chapter → Verse updates breadcrumbs.
     - Verifies tapping breadcrumb returns to previous step.
     - Verifies single verse selection emits `Book Chapter:Verse` on confirm.
     - Verifies two-verse selection emits `Book Chapter:V1-V2` on confirm.
  3. **AddVerseModal Integration Seam (`src/screens/HomeScreen.test.tsx`)**:
     - Verifies opening picker from `AddVerseModal`, selecting a verse, and observing reference field populated and auto-fetch triggered.

## Out of Scope

- Audio Bible playback inside the picker.
- Red-letter text highlighting or cross-reference commentary inside the picker.
- Custom non-Protestant apocryphal canons (standard Protestant 66-book canon only).

## Further Notes

- Reuses existing book alias normalization rules from `ReferenceNormalizer` for search queries.
- Adheres strictly to `CONTEXT.md` ubiquitous language (**Reference Picker**, **Verse**).
