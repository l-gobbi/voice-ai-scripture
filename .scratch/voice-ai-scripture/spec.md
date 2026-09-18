---
labels: ["ready-for-agent"]
---

# Specification: Injectable StorageAdapter and Subscription Manager Deepening

## Problem Statement

Currently, subscription entitlement and free recitation quota management are implemented via a global static object that couples directly to React Native's asynchronous storage. Because the session coordinator hardcodes calls to this static object rather than receiving it across its public interface, in-memory local substitution is impossible. 

As a result, developer workflows and test suites cannot configure isolated quota states without applying brittle runtime monkey-patches (`jest.spyOn`) across dozens of test cases. When testing quota depletion or subscription transitions, tests verify internal spy calls rather than observable domain outcomes. Furthermore, persistence logic is duplicated between verse storage and subscription management instead of relying on a shared, cohesive storage seam.

## Solution

Deepen the subscription management architecture to achieve true local substitutability and seam isolation:

1. **Dedicated Storage Adapter Seam**:
   - Centralize storage interfaces and concrete implementations into an authoritative persistence module.
   - Support both production asynchronous storage and in-memory key-value mapping for fast, isolated execution.
   - Maintain backward compatibility for existing domain engine consumers.

2. **Deep Subscription Manager Module**:
   - Refactor subscription and quota management from a static object literal into an instantiable, deep domain module.
   - Accept the storage adapter via constructor injection, defaulting to production storage when unsupplied.
   - Provide a shared singleton instance for standard user interface callers alongside an alias preserving backward compatibility.

3. **Constructor Injection Across Session Seam**:
   - Allow the recitation session coordinator to receive an optional subscription manager dependency.
   - Default cleanly to the shared singleton in production while enabling test harnesses to supply isolated in-memory instances.

4. **Elimination of Fragile Test Monkey-Patches**:
   - Replace all runtime spy interventions in recitation test suites with real in-memory state setup.
   - Verify quota exhaustion and subscription state transitions through actual domain behavior at the public interface.

## User Stories

1. As an offline-first learner, I want my free recitation quota and subscription status reliably saved to local device storage, so that my entitlement is preserved across application launches.
2. As a new user practicing scripture, I want my quota to decrement accurately upon each recitation attempt, so that my remaining free trial allowance is correctly calculated.
3. As an active learner whose quota is exhausted, I want the session coordinator to detect my depleted quota and surface the paywall, so that I am guided to subscribe.
4. As a subscriber upgrading to premium, I want my subscription status recorded in local storage, so that I enjoy unlimited recitations without interruption.
5. As a developer running automated tests, I want subscription management to operate completely in-memory without touching native mobile storage, so that test suites execute quickly and deterministically.
6. As a test author, I want to inject pre-configured subscription and quota states into the recitation session coordinator, so that I can verify paywall triggers without monkey-patching global service methods.
7. As an engineer extending the codebase, I want a single, standard storage adapter seam across both verse persistence and subscription tracking, so that storage implementations are not fragmented or duplicated.
8. As a maintainer, I want existing UI screens and hooks to continue consuming subscription methods without changing their import signatures, so that the refactoring is zero-churn for presentation code.
9. As a mobile developer, I want all recitation session tests to pass purely on observable domain results, so that internal refactorings do not break tests that rely on spy call counts.
10. As an engineer navigating the repository, I want clear module depth where complex quota logic is hidden behind a small, cohesive interface, so that the code is easily understood by human and AI agents.

## Implementation Decisions

1. **Dedicated Persistence Seam (`StorageAdapter`)**:
   - Create an independent persistence module defining the `StorageAdapter` interface with `getItem(key: string): Promise<string | null>` and `setItem(key: string, value: string): Promise<void>`.
   - Provide `MapStorageAdapter` (in-memory map) and `AsyncStorageAdapter` (delegating to React Native storage).
   - Re-export `StorageAdapter`, `MapStorageAdapter`, and `AsyncStorageAdapter` from `VerseEngine` to preserve backward compatibility.

2. **Instantiable `SubscriptionService` Class**:
   - Convert `SubscriptionService` into a TypeScript class accepting an optional `storage: StorageAdapter = new AsyncStorageAdapter()`.
   - Encapsulate storage key constants (`user_is_subscribed`, `free_recitations_remaining`) and default quota limits (initial: 3).
   - Expose public methods: `isSubscribed()`, `getRemainingFreeRecitations()`, `consumeRecitation()`, `subscribePremium()`, and `cancelSubscription()`.
   - Export an instantiated singleton `subscriptionService` as the standard export, and export `const SubscriptionService = subscriptionService` for seamless compatibility with UI screens (`ReviewScreen`).

3. **Recitation Session Constructor Seam Extension**:
   - Update `RecitationSession` constructor options to accept `subscriptionService?: SubscriptionService`.
   - When not supplied in constructor options, default to the exported `subscriptionService` singleton.
   - Internal recitation initiation invokes `this.subscriptionService.consumeRecitation()`.

4. **Testing Surface Replacement ("Replace, Don't Layer")**:
   - Update `SubscriptionService.test.ts` to instantiate `SubscriptionService` with `MapStorageAdapter` for all test cases.
   - Update `RecitationSession.test.ts` to instantiate `SubscriptionService` with `MapStorageAdapter` for quota scenarios, removing all `jest.spyOn(SubscriptionService, 'consumeRecitation')` calls.

## Testing Decisions

- **Seam 1: Persistence Module**:
  - Test that `MapStorageAdapter` stores and retrieves string values, returning `null` for missing keys.
  - Test that `AsyncStorageAdapter` calls underlying storage methods.
- **Seam 2: Subscription Manager**:
  - Test that a fresh in-memory instance returns default free quota (3) and unsubscribed status (`false`).
  - Test that `consumeRecitation()` decrements quota until 0, then returns `allowed: false`.
  - Test that `subscribePremium()` grants unlimited recitations (`allowed: true, remaining: Infinity`).
- **Seam 3: Recitation Session Integration**:
  - Test that a session initialized with an exhausted quota subscription service immediately transitions to `quota_exhausted` status.
  - Test that a session initialized with an active subscription proceeds to record and verify without quota blockage.
  - Prior art: Existing `VerseEngine.test.ts` using `MapStorageAdapter`.

## Out of Scope

- Remote billing SDK integration (RevenueCat / StoreKit) — remains simulated in local storage.
- Multi-user account sync or server-side quota reconciliation.
- UI changes to `PaywallModal` or `ReviewScreen` (interfaces remain identical).

## Further Notes

- Aligns with ADR 0010 (`docs/adr/0010-injectable-storage-adapter-and-subscription-service-deepening.md`) and ubiquitous domain language in `CONTEXT.md`.
