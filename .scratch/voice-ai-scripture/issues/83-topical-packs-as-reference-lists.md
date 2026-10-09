# 83: Topical Packs as Reference Lists

**What to build:**
Topical Packs stop carrying text. Each pack becomes an id, a language, a title, a description and an ordered list of references; the current themes and references are kept. Importing moves from the pack browser into the Verse Engine: it resolves every reference in the learner's Preferred Translation for the pack's language, skips references already in the library, and reports how many were added. The pack browser previews each verse in the Preferred Translation and imports through the Verse Engine. See `spec-open-translations.md` and CONTEXT.md (Topical Pack).

**Blocked by:** 82: Preferred Translation

**Status:** ready-for-agent

- [ ] Pack data has no text or translation fields.
- [ ] The Verse Engine imports a pack in the Preferred Translation, skipping duplicates and returning the count added.
- [ ] Changing the Preferred Translation changes what a later import (and the preview) shows, and never rewrites verses already saved.
- [ ] A test resolves every pack reference in every bundled translation of the pack's language.
- [ ] Pack browser tests cover the preview and the import.
