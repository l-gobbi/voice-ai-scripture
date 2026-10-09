# 85: Exclude Psalm Titles from Verse Text

**What to build:**
Learners recite only the verse itself, never a reference or a heading. In all three eBible sources, the verse-per-line format merges each Psalm's title (superscription) into verse 1. For example, BSB Psalm 23:1 reads "A Psalm of David. The LORD is my shepherd…" and Bíblia Livre's starts "Salmo de Davi: O SENHOR é meu pastor…". Rebuild the bundled datasets from eBible's USFM (or USFX) files, where titles are a separate element (`\d`), so that verse text never contains a Psalm title. Verse wording itself is unchanged, so ONBV stays verbatim. Titles are not shown anywhere for now. See `spec-open-translations.md` and ADR 0018.

**Blocked by:** 81: Remove ALMEIDA and KJV and Switch the Defaults

**Status:** ready-for-agent

- [ ] The build script reads Psalm titles as separate elements and excludes them from verse text for BLIVRE, ONBV and BSB. All other wording is identical to the current datasets (verify by diffing the rebuilt output against the committed datasets: only Psalm verse-1 texts change).
- [ ] Psalm 23:1 in BLIVRE, ONBV and BSB starts with the verse words, not the title.
- [ ] The dataset integrity test gains a check that no Psalm verse 1 starts with a known title pattern (e.g. "Salmo de", "A Psalm of", "Para o regente", "For the choirmaster"), with any legitimate exceptions listed explicitly.
- [ ] The rebuilt datasets are committed.
