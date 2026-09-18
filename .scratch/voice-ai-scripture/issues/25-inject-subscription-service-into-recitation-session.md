# 25: Inject SubscriptionService into RecitationSession & Eliminate Test Spies

**What to build:** Extend the recitation session coordinator to accept an injectable subscription manager dependency across its constructor seam. When a learner recites a verse, the session evaluates quota entitlement against this injected manager, defaulting to production storage while enabling test suites to verify quota exhaustion and paywall transitions using clean in-memory state setup rather than brittle runtime monkey-patches (`jest.spyOn`).

**Blocked by:** 24: Extract StorageAdapter Seam & Deepen SubscriptionService

**Status:** closed

- [x] Extend `RecitationSession` constructor options in `src/services/RecitationSession.ts` to accept `subscriptionService?: SubscriptionService`, defaulting to the exported singleton `subscriptionService`.
- [x] Ensure `RecitationSession.startReciting()` delegates quota checks to `this.subscriptionService.consumeRecitation()`.
- [x] Refactor `src/services/RecitationSession.test.ts` to supply an in-memory `SubscriptionService` (backed by `MapStorageAdapter`) where quota states vary, completely eliminating all 15+ `jest.spyOn(SubscriptionService, 'consumeRecitation')` calls.
- [x] Verify that quota depletion triggers `quota_exhausted` status and that premium subscriptions allow unrestricted recitations using real in-memory state.
- [x] Ensure all 19 test suites and TypeScript typechecking remain 100% green.
