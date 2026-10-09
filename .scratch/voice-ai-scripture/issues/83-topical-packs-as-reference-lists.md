# 83: Retire Topical Packs

**What to build:**
The product owner decided (deck grilling, 2026-10-09) to **remove Topical Packs** and keep only Decks. Remove the pack browser, its entry point on the Home Screen, the pack data and their tests. Verses already imported from a pack stay in the learner's library like any other verse. The original plan for this ticket (packs as reference lists resolved in the Preferred Translation) is superseded. CONTEXT.md no longer defines Topical Pack, and Decks replace it. See `spec-open-translations.md` (amended) and CONTEXT.md (Deck).

**Blocked by:** 82: Preferred Translation

**Status:** ready-for-agent

- [ ] The pack browser modal, its Home Screen entry point, the Topical Pack data module and their tests are removed, with no dead imports left.
- [ ] Verses previously imported from packs remain and work normally. No migration is needed (the app has no users).
- [ ] Remaining references to "Topical Pack" in code comments and user-facing copy are removed or reworded to Decks where relevant.
- [ ] The full suite passes.
