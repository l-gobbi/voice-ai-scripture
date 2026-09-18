# 19: Reference Picker Modal Component & Range Selection

**What to build:**
A dedicated React Native modal component (`src/components/ReferencePickerModal.tsx`) providing a guided, three-stage drill-down interface (**Livro** → **Capítulo** → **Versículo**) with breadcrumb navigation, live bilingual book filtering, and 1-tap/2-tap single or range verse selection. The component emits a canonical formatted scripture reference (e.g. `João 3:16` or `Filipenses 4:6-7`) upon confirmation.

**Blocked by:** Ticket 18 (Static Protestant Canon Matrix & Domain Lookup Engine).

**Status:** ready-for-agent

- [ ] Implement `ReferencePickerModalProps` interface (`visible: boolean`, `translation: VerseTranslation`, `onClose: () => void`, `onSelectReference: (canonicalRef: string) => void`).
- [ ] Build persistent sticky breadcrumb header bar (`[Livro] › [Capítulo] › [Versículo]`) displaying current progress, with touchable breadcrumbs to jump back to earlier steps, plus close `✕` and back `‹` buttons.
- [ ] Build **Stage 1 (Livro)**:
  - Segmented testament filter tabs: `Todos (66)`, `Antigo Testamento (39)`, `Novo Testamento (27)`.
  - Live auto-focused search bar that filters books in real time by name or alias.
  - Book item list rendering book name and testament badge in the language of the active translation (`ALMEIDA`, `ONBV`, `NVI`, `ARA` → PT; `WEB`, `KJV`, `ESV` → EN).
  - Tapping a book advances state to Stage 2 (`chapter`).
- [ ] Build **Stage 2 (Capítulo)**:
  - Numeric grid displaying exact chapter count of selected book (1..N).
  - Tapping a chapter advances state to Stage 3 (`verse`).
- [ ] Build **Stage 3 (Versículo)**:
  - Numeric grid displaying exact verse count of chosen chapter (1..M).
  - Tapping a verse highlights it as `startVerse` and reveals floating action pill `"Inserir [Livro C:V]"`.
  - Tapping a second verse highlights the range (`startVerse` to `endVerse`) and updates action pill to `"Inserir [Livro C:V1-V2]"`.
  - Tapping the confirmation action pill calls `onSelectReference(formattedRef)` and closes the modal.
- [ ] Write unit and component tests in `src/components/ReferencePickerModal.test.tsx` verifying:
  - Testament tabs and live search filtering.
  - Sequential progression and breadcrumb back-navigation.
  - Single verse selection output format.
  - Contiguous multi-verse range selection output format.
  - Bilingual book name rendering based on `translation` prop.
