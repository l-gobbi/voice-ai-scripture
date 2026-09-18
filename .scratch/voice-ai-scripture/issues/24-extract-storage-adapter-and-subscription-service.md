# 24: Extract StorageAdapter Seam & Deepen SubscriptionService

**What to build:** Decouple the persistence seam into a dedicated, reusable storage module and convert the subscription manager into an instantiable, deep domain class that accepts an injectable storage adapter. A user's quota and subscription status are managed through this deep module, defaulting to production device storage while allowing test environments to execute completely in-memory without mobile storage dependencies.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Create `src/services/StorageAdapter.ts` exporting `StorageAdapter` interface, `MapStorageAdapter` (in-memory), and `AsyncStorageAdapter` (delegating to `@react-native-async-storage/async-storage`).
- [x] Re-export `StorageAdapter`, `MapStorageAdapter`, and `AsyncStorageAdapter` from `src/services/VerseEngine.ts` to preserve 100% backward compatibility for all existing callers.
- [x] Refactor `SubscriptionService` in `src/services/SubscriptionService.ts` from a static object into `class SubscriptionService` accepting `(storage: StorageAdapter = new AsyncStorageAdapter())`.
- [x] Export instantiated singleton `subscriptionService` and backward-compatible alias `SubscriptionService`.
- [x] Ensure `isSubscribed()`, `getRemainingFreeRecitations()`, `consumeRecitation()`, `subscribePremium()`, and `cancelSubscription()` methods operate over the injected storage adapter.
- [x] Update `src/services/SubscriptionService.test.ts` to instantiate `SubscriptionService` with `MapStorageAdapter`, removing `@react-native-async-storage/async-storage` mocks and testing state transitions directly.
- [x] Ensure all existing test suites and TypeScript typechecking remain 100% green.
