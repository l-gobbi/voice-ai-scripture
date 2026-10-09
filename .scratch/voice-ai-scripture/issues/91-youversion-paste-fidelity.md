# 91: YouVersion Paste Fidelity

**What to build:**
When a learner copies a verse from YouVersion (share → copy) and pastes it into the add-verse flow, the reference (including ranges), the wording and the version label are filled in correctly in pt and en. Version labels are kept as labels, and bundled text is never auto-fetched for a non-bundled label (building on ticket 82). Add tests with **real YouVersion share texts**: single verses and ranges, in pt and en, with versions such as ARA, NVI, NVT, NAA, NBV, BLIVRE, KJV and NIV. Fix whatever the parser gets wrong. See `spec-decks.md` and `feature-and-improvement-opportunities.md`.

**Blocked by:** 82: Preferred Translation

**Status:** done

- [x] Clipboard parser tests use real YouVersion share formats: pt and en, single verse and range, several versions, and the trailing bible.com URLs.
- [x] Reference, wording and version label are parsed correctly for all of them, and the add-verse flow keeps the pasted wording.
- [x] A non-bundled label never triggers an auto-fetch that replaces the pasted wording.
