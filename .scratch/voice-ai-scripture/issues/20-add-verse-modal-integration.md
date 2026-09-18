# 20: AddVerseModal Integration & Auto-Fetch Trigger

**What to build:**
Integrate `ReferencePickerModal` into `src/components/AddVerseModal.tsx`, giving mobile users a prominent **"📖 Escolher da Bíblia"** button beside the "Referência Bíblica" field. Confirming a reference from the picker sets the reference field and automatically triggers text retrieval for bundled translations (`WEB`, `KJV`, `ALMEIDA`, `ONBV`), or provides helpful clipboard pasting guidance when a copyrighted translation (`NVI`, `ARA`, `CUSTOM`) is active.

**Blocked by:** Ticket 19 (Reference Picker Modal Component & Range Selection).

**Status:** closed

- [x] In `src/components/AddVerseModal.tsx`:
  - Add a **"📖 Escolher da Bíblia"** trigger button alongside or directly under the "Referência Bíblica" input label.
  - Maintain state for `pickerVisible: boolean`.
  - Render `<ReferencePickerModal />` wired to `selectedTranslation`, opening on button press and closing on cancel.
  - On `onSelectReference(canonicalRef)`:
    - Update `reference` state with the selected reference.
    - Trigger `fetchVerseText(canonicalRef, selectedTranslation, false)` immediately so bundled text loads without delay.
    - If translation is non-bundled (`!isBundledTranslation(selectedTranslation)`), display friendly guidance notice: `"Referência definida! Cole o texto da sua Bíblia ou digite-o abaixo."`.
- [x] Ensure manual free-text input and "📋 Colar da Área de Transferência" continue working seamlessly alongside the picker button.
- [x] Add integration tests in `src/screens/HomeScreen.test.tsx` verifying:
  - "📖 Escolher da Bíblia" button renders in the Add Verse modal.
  - Launching the picker and confirming a reference populates the text field and triggers auto-fetch.
  - Non-bundled translations prompt the user for text paste as expected.
