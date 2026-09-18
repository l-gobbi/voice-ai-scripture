# 0010: Injectable StorageAdapter and SubscriptionService Deepening

We decided to decouple storage persistence into a dedicated `StorageAdapter` module and convert `SubscriptionService` from a static singleton into an instantiable, deep module accepting `StorageAdapter` across its public constructor seam, which is in turn injected into `RecitationSession`.

Previously, `SubscriptionService` directly invoked `AsyncStorage` methods statically. As a result, `RecitationSession` had a hardcoded dependency on global storage, making local substitutability impossible and forcing test suites (`RecitationSession.test.ts`) to rely on over 20 repetitive `jest.spyOn(SubscriptionService, 'consumeRecitation')` monkey-patches.

Under this architecture:
1. **Centralized Persistence Seam**: `StorageAdapter`, `MapStorageAdapter`, and `AsyncStorageAdapter` live in `src/services/StorageAdapter.ts` and are shared between `VerseEngine` and `SubscriptionService` (re-exported by `VerseEngine` for backward compatibility).
2. **Deep Subscription Module**: `SubscriptionService` is an instantiable class taking an optional `StorageAdapter` (defaulting to `AsyncStorageAdapter`). A default singleton instance `subscriptionService` is exported for production consumers alongside a backwards-compatible `SubscriptionService` alias.
3. **Constructor Injection in RecitationSession**: `RecitationSession` accepts `subscriptionService?: SubscriptionService` in its options dictionary, defaulting to the shared singleton in production while accepting in-memory instances in tests.
4. **Test Surface Hygiene**: Tests configure quota state in an in-memory `MapStorageAdapter` and test actual domain transitions, completely eliminating `jest.spyOn` monkey-patches across test suites.
