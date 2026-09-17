# 08: React Session Hook, Review Screen Integration & Middleman Deletion

**What to build:** Implement the useRecitationSession hook, refactor ReviewScreen to consume it as a pure presentation view, and delete the shallow VoiceReviewController middleman.

**Blocked by:** 07-headless-recitation-session

**Status:** ready-for-agent

- [ ] Implement useRecitationSession(verse) React hook binding RecitationSession to component state.
- [ ] Refactor ReviewScreen.tsx to use useRecitationSession, stripping out recording/metering/quota state.
- [ ] Trigger PaywallModal when status is 'quota_exhausted'.
- [ ] Delete VoiceReviewController.ts (deletion test).
- [ ] Run full regression test suite ensuring all existing and new tests pass green.
