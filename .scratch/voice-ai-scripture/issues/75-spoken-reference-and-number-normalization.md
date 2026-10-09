# 75: Spoken Reference and Number Normalization

**What to build:**
Stop counting two transcription artefacts as memory errors.
- A spoken reference at the very start or end of a recitation is ignored, but only when it matches *this verse's own* reference: a book name or alias from the canon data plus chapter and verse, in digits or words (e.g. "João 3:16", "John three sixteen").
- Digits and spelled-out numbers compare equal in en and pt, including multi-word forms such as "vinte e três" and "twenty-three".

Alignment stays deterministic DP (ADR 0001). See spec.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A leading or trailing match of the verse's own reference is stripped before diffing. A reference to a different verse, or reference words in the middle, are not stripped.
- [ ] "3" matches "três"/"three". "23" matches "vinte e três"/"twenty-three". Cardinals from 0 to at least 1000 are covered in both languages.
- [ ] Recitations that differ from the canonical text only by these artefacts score as perfect.
- [ ] Tests run through the Recitation Session seam with the simulated voice input, plus number-table edge cases in the diff engine's own suite.
