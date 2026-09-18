# 14: Pluggable BibleProvider Seam & Local Bundled Scripture Engine

**What to build:**
A formalized Ports & Adapters boundary for scripture passage retrieval (`BibleProvider`), backed by a lightweight offline bundled dataset for 4 commercial-compliant translations: 🇺🇸 **WEB**, **KJV** and 🇧🇷 **ALMEIDA**, **ONBV**. Lookups execute in `<1ms` without network calls, eliminating all server hosting costs, API keys, and rate limits. The provider resolves multi-verse ranges into continuous recitation text and returns `null` for missing verses. Includes an in-memory `SimulatedBibleProvider` for headless, deterministic unit testing.

**Blocked by:** Ticket 13 (Reference Normalizer & Dual-Language Book Aliases).

**Status:** ready-for-agent

- [ ] Create `src/services/BibleProvider.ts` exporting domain interfaces and adapters:
  - `BiblePassage`: `{ reference: string; text: string; translation: string; language: 'en' | 'pt' }`.
  - `BibleProvider`: `fetchPassage(reference: string, translation: string): Promise<BiblePassage | null>`.
- [ ] Implement `LocalBibleProvider`:
  - Bundles lightweight JSON scripture datasets in `src/data/bibles/` (`web.json`, `kjv.json`, `almeida.json`, `onbv.json`).
  - Uses `ReferenceNormalizer` to resolve references into book, chapter, and verse spans.
  - Concatenates multi-verse ranges (e.g. `John 3:16-17`) into continuous space-separated strings.
  - Returns `null` if book, chapter, or verse does not exist.
- [ ] Implement `SimulatedBibleProvider` with optional pre-configured passage overrides and custom handler for headless testing.
- [ ] Implement `createDefaultBibleProvider(): BibleProvider` factory returning `new LocalBibleProvider()`.
- [ ] Write unit tests in `src/services/BibleProvider.test.ts` verifying passage lookups across all 4 translations, multi-verse concatenation, and simulation mocks.
