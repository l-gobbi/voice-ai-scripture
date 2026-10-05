# 40: Diacritic-Lenient Verification & Canonical Scripture Projection

**What to build:**
When a learner recites a verse in Portuguese or English (such as Salmos 23:1), verification normalizes diacritics strictly for alignment so acoustic speech omissions (`e` vs `é`, `faltara` vs `faltará`) match without score penalties, and diff tokens in the review screen project back onto canonical scripture words with original casing, accents, and attached punctuation (`[O]`, `[Senhor,]`, `[é]`, `[o]`, `[meu]`, `[pastor;]`).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Reciting Portuguese Salmos 23:1 ("O Senhor é o meu pastor; nada me faltará") matches 100% when speech recognition transcribes unaccented words ("o senhor e o meu pastor nada me faltara").
- [x] Diff tokens returned by `diffVerses` contain original canonical words with proper capitalization, accents, and trailing punctuation attached.
- [x] Added/hallucinated spoken words are cleanly separated as `status: 'added'` without displacing subsequent canonical matches.
- [x] Contractions with straight or curly apostrophes and hyphenated words split and match cleanly.
- [x] `diffEngine.test.ts` provides comprehensive unit test coverage for Portuguese accented verses, English verses, and stutter resilience.
