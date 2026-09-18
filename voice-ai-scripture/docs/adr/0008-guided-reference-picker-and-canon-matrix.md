# 0008: Guided Reference Picker & Static Canon Matrix

We decided to introduce a guided, three-stage drill-down modal interface (**Reference Picker**) backed by an immutable static Protestant 66-book canon matrix (`src/data/bibleCanon.ts`) to allow visual Book → Chapter → Verse selection alongside free-text input and clipboard import.

Previously, users had to manually type scripture references (e.g., `João 3:16`) into a raw text field. While functional and supported by `ReferenceNormalizer`, manual typing is prone to mobile keyboard typos, requires users to memorize spelling/abbreviations, and lacks visual exploration for beginners or mobile-first workflows.

Under this architecture:
1. **Hybrid Input Coexistence**: The free-text input and 1-tap clipboard import in `AddVerseModal` remain available for fast typists and YouVersion copying. A prominent "📖 Escolher da Bíblia" button launches the dedicated Reference Picker modal.
2. **Three-Stage Drill-Down Flow**: The picker navigates through three progressive screens with a persistent breadcrumb header (`[Livro] › [Capítulo] › [Versículo]`):
   - **Livro**: Segmented tabs (`Todos (66)`, `Antigo Testamento (39)`, `Novo Testamento (27)`) plus a live search bar that matches bilingual names and abbreviations in real-time.
   - **Capítulo**: Numeric grid sized according to the selected book's canonical chapter count.
   - **Versículo**: Numeric grid sized according to the chapter's canonical verse count, supporting single verse tap or start-to-end range highlighting (e.g. `16` to `18`), confirmed with an "Inserir [Referência]" action pill.
3. **Static Canon Matrix**: An immutable static data table (`src/data/bibleCanon.ts`, ~4KB) maps all 66 books to their testament (OT/NT), chapter counts, and verse counts per chapter. This guarantees 100% offline functionality, zero layout shift, and instant rendering without network dependencies.
4. **Bilingual Presentation**: Book names and testament labels render in Portuguese or English based on the active translation (`ALMEIDA`, `ONBV`, `NVI`, `ARA` → PT; `WEB`, `KJV`, `ESV` → EN), while the search filter recognizes aliases in both languages.
5. **Seamless Auto-Fetch & Fallback**: Confirming a reference closes the picker and populates `"Referência Bíblica"`, immediately triggering debounced auto-fetch for bundled translations (`WEB`, `KJV`, `ALMEIDA`, `ONBV`), or displaying user guidance to paste text for copyrighted versions (`NVI`, `ARA`, `CUSTOM`).
