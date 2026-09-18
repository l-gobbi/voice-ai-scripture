# 26: Pure Cloze Engine with Interactive Word Peek & Assistance Scoring

**What to build:** Implement a pure, deterministic domain engine (`clozeEngine`) that transforms verse text into first-letter cloze tokens (`F___ G__ s_ l____`), manages word-level reveal state for interactive peeking (both persistent inline reveals and temporary 3-second peek lifelines), and calculates assisted score capping (capping at 75% when assistance was used).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Create `src/engines/clozeEngine.ts` exporting `ClozeToken` interface, `generateClozeTokens(text: string, mode: 'first-letter' | 'blank'): ClozeToken[]`, `revealWord(tokens: ClozeToken[], index: number): ClozeToken[]`, `hideWord(tokens: ClozeToken[], index: number): ClozeToken[]`, and `evaluateAssistedScore(score: number, assistanceUsed: boolean): number`.
- [ ] Ensure `generateClozeTokens` preserves punctuation, line breaks, casing, and word lengths, replacing non-initial word characters with underscores or blanks.
- [ ] Ensure `evaluateAssistedScore` preserves genuine scores below 75% (e.g. 60% remains 60%) while capping scores of 75% or greater at 75% if `assistanceUsed = true`.
- [ ] Write unit tests in `src/engines/clozeEngine.test.ts` verifying tokenization, punctuation preservation, reveal/hide state transitions, and assisted score capping.
- [ ] Ensure all existing test suites and TypeScript typechecking remain 100% green.
