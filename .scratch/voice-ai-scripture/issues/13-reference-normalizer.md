# 13: Reference Normalizer & Dual-Language Book Aliases

**What to build:**
A robust, pure domain reference normalization engine that parses and standardizes biblical reference inputs in both English and Brazilian Portuguese. Translates common abbreviations and localized book names (e.g. `Jo 3:16`, `João 3:16`, `John 3:16`, `Rm 8:28`, `Sl 23:1-3`, `1 Co 13:4-7`, `Ap 21:4`, `Rev 21:4`) into a canonical structured object containing standardized book ID, chapter number, start verse, end verse, and localized display reference. Multi-verse ranges are detected and resolved into continuous verse spans.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Create `src/services/ReferenceNormalizer.ts` exporting canonical normalization contracts:
  - `NormalizedReference`: `{ bookId: string; bookName: string; chapter: number; startVerse: number; endVerse?: number; canonicalRef: string; language: 'en' | 'pt' }`.
  - `normalizeReference(rawInput: string): NormalizedReference | null`.
- [ ] Build a comprehensive alias map covering all 66 biblical books with common Portuguese abbreviations (`Gn`, `Êx`, `Mt`, `Jo`, `Rm`, `Sl`, `1 Co`, `2 Co`, `Ap`) and English abbreviations (`Gen`, `Ex`, `Matt`, `Rom`, `Ps`, `1 Cor`, `2 Cor`, `Rev`).
- [ ] Support multi-verse ranges (e.g., `João 3:16-17`, `Salmos 23:1-3`, `1 Corinthians 13:4-7`) capturing `startVerse` and `endVerse`.
- [ ] Handle varied user spacing, punctuation, and casing gracefully (e.g., `jo3:16`, `Rm 8.28`, `1co 13:4-7`).
- [ ] Return `null` for unparseable or nonsensical strings without throwing unhandled exceptions.
- [ ] Write comprehensive unit tests in `src/services/ReferenceNormalizer.test.ts` covering English books, Portuguese books, abbreviations, multi-verse ranges, and edge-case invalid inputs.
