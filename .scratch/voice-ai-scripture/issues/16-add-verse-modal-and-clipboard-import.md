# 16: Add Verse Modal Auto-Fill & Clipboard Import UI

**What to build:**
Upgrade the "Add Verse" modal in `HomeScreen.tsx` to support instant multi-translation selection and automated text retrieval. Features a language-grouped Translation selector (🇺🇸 WEB, KJV | 🇧🇷 Almeida, ONBV | 📋 Custom / NVI / ARA / ESV), debounced 500ms auto-fetch from `BibleProvider`, a manual "Fetch Text" trigger button, and a 1-tap "📋 Paste from Clipboard" button that extracts copied scripture text, reference, and version tags (e.g. from YouVersion / Bible.com). Verse cards on the home screen display their translation badge (e.g. `[WEB]`, `[ALMEIDA]`).

**Blocked by:** Ticket 14 (Pluggable BibleProvider Seam), Ticket 15 (Translation Metadata in VerseEngine).

**Status:** ready-for-agent

- [ ] In `src/screens/HomeScreen.tsx` ("Add Verse" modal):
  - [ ] Add translation selector with language groups:
    - 🇺🇸 English: `WEB (World English Bible)`, `KJV (King James Version)`.
    - 🇧🇷 Português: `Almeida (JFA)`, `ONBV (Nova Bíblia Viva)`.
    - 📋 Copiada: `NVI`, `ARA`, `ESV`, `Outra (Personalizada)`.
  - [ ] Debounce reference input by 500ms: when a valid reference is typed, call `BibleProvider.fetchPassage(ref, translation)` and populate the verse text area.
  - [ ] Add manual "🔍 Buscar Texto" / "Fetch Text" button beside reference input.
  - [ ] Add "📋 Colar da Área de Transferência" / "Paste from Clipboard" button:
    - Automatically parses copied YouVersion text (e.g. `"Texto... - João 3:16 NVI"`), extracting reference, verse text, and selecting the version.
  - [ ] If user selects a copyrighted version (like NVI or ARA), display helpful guidance to paste text.
  - [ ] Ensure verse text area remains 100% editable so users can tweak punctuation or capitalization.
- [ ] On Home screen verse cards, display a styled translation badge (e.g. `[WEB]`, `[ALMEIDA]`, `[NVI]`).
- [ ] Update `HomeScreen.test.tsx` verifying translation selection, auto-fetch population, and badge display.
