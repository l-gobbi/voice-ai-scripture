---
labels: ["ready-for-agent"]
---

# Specification: Deep VerseEngine Domain Architecture

## Problem Statement

Verse management, due-date calculations, and Spaced Repetition (SRS) state transitions are currently fragmented across the codebase. `VerseStorageService` acts as a shallow JSON serialization pass-through to `AsyncStorage`, while `HomeScreen`, `ReviewScreen`, and `RecitationSession` each independently perform mathematical SM-2 computations, filter due verses, and manage data updates. This scattering leaks algorithm and persistence details into presentation components, leads to duplicated filtering loops, and forces test suites to rely on fragile global `AsyncStorage` mocks.

## Solution

Consolidate all verse domain operations, persistence, due-date evaluation, and review recording into an authoritative, deep `VerseEngine` module. `VerseEngine` provides a high-level intent-based API that encapsulates:
1. Unified study recording (`recordReview`) using the SM-2 algorithm for both manual self-review and voice recitations.
2. Single-pass verse summary queries (`getVersesSummary`) delivering all verses, due verses, and due count.
3. Permissive single-verse addition alongside deduplicating bulk pack imports.
4. Pluggable persistence via an injectable `StorageAdapter` interface (defaulting to `AsyncStorage` in production and in-memory storage in unit tests).
5. Full retirement of the legacy `VerseStorageService`.

## User Stories

1. As a believer opening the app, I want to immediately see how many verses are due for review today, so that I can focus my quiet-time practice without delay.
2. As a believer viewing my memory verses, I want to switch between "Due for Review" and "All Verses" smoothly, so that I can browse my full collection or focus only on active study.
3. As a believer completing a manual self-review (pass or fail), I want the verse's streak and review interval to update correctly in one atomic operation, so that my scheduling stays accurate.
4. As a believer completing a Voice AI recitation, I want the accuracy score to update my SRS review schedule automatically, so that high accuracy lengthens the interval and mistakes reset the review cycle for tomorrow.
5. As a believer memorizing a new passage, I want to add a verse with its reference and text, so that it is immediately scheduled for its initial review.
6. As a believer importing a Topical Pack, I want verses I have already added to be skipped automatically, so that my due queue is not polluted with duplicate references.
7. As an offline user, I want all my verse data, streaks, and schedules to persist reliably on my device without network connectivity, so that I can practice anywhere.
8. As a developer, I want to test all verse operations, queries, and scheduling state transitions in pure headless unit tests using an in-memory adapter, so that tests are deterministic, fast, and free of native storage timer flakes.
9. As an AI agent or developer modifying UI screens, I want a single high-level engine interface to interact with verses, so that I never have to manually coordinate `AsyncStorage` and mathematical SRS formulas.

## Implementation Decisions

- **Deep Module Architecture:** Implement a deep, stateful `VerseEngine` class and a default shared singleton instance (`verseEngine`) located at `src/services/VerseEngine.ts`.
- **Public Engine Contract:**
  ```typescript
  export interface VerseSummary {
    allVerses: Verse[];
    dueVerses: Verse[];
    dueCount: number;
  }

  export interface StorageAdapter {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
  }

  export class VerseEngine {
    constructor(storage?: StorageAdapter);
    getAllVerses(): Promise<Verse[]>;
    getVersesSummary(now?: Date): Promise<VerseSummary>;
    addVerse(verse: Omit<Verse, 'id' | 'srs'>): Promise<Verse>;
    importVerses(verses: Array<Omit<Verse, 'id' | 'srs'>>): Promise<number>;
    recordReview(verseId: string, score: number, now?: Date): Promise<SRSResult>;
    deleteVerse(verseId: string): Promise<void>;
  }
  ```
- **Unified Review Recording:** `recordReview(verseId: string, score: number, now?: Date)` calculates next SM-2 progression via `calculateNextReview(currentSRS, score, now)` and atomically persists the updated verse to storage.
  - Manual review passes pass `score = 100`.
  - Manual review fails pass `score = 0`.
  - Voice recitations pass the Myers diff accuracy score `(0..100)`.
- **Single-Pass Summary Query:** `getVersesSummary(now = new Date())` retrieves the collection, invokes the pure domain predicate `isVerseDue(v.srs?.nextReviewDate, now)`, and returns `{ allVerses, dueVerses, dueCount }` in a single pass.
- **Inversion of Control for Persistence:** Storage operations are abstracted behind `StorageAdapter`. Production defaults to React Native `AsyncStorage`. Tests can inject an in-memory map adapter (`MapStorageAdapter`).
- **Consumer Migrations:**
  - `HomeScreen.tsx`: Refactored to fetch `verseEngine.getVersesSummary()`, removing component-level `.filter()` loops.
  - `ReviewScreen.tsx`: Refactored `handleManualVerification` to call `verseEngine.recordReview(verse.id, passed ? 100 : 0)`.
  - `RecitationSession.ts`: Refactored `stopAndVerify()` to invoke `verseEngine.recordReview(this.verse.id, score)`, removing direct references to `srsEngine` and `VerseStorageService`. Accepts an optional `verseEngine` parameter in constructor options.
- **Retirement of `VerseStorageService`:** Delete `src/services/VerseStorageService.ts` and its test file, redirecting all imports to `VerseEngine.ts` and exporting `Verse` from `VerseEngine.ts`.
- **Pure Engines Preserved:** `src/engines/srsEngine.ts` (pure SM-2 math) and `src/engines/diffEngine.ts` (Myers diffing) remain isolated, pure functional cores consumed by `VerseEngine` and `RecitationSession`.

## Testing Decisions

- **Test Only at the Seam:** Test exclusively through the public interface of `VerseEngine` using an in-memory `StorageAdapter`. Do not test private methods or internal JSON serializations.
- **Review Progression Verification:** Verify that `recordReview` updates the streak, interval, and next review date correctly for passing scores (>=80), failing scores (<80), and binary manual reviews (100 vs 0).
- **Summary Query Verification:** Verify that `getVersesSummary` correctly categorizes due vs non-due verses based on simulated timestamps (`now`).
- **Deduplication Verification:** Verify that `importVerses` skips case-insensitive reference duplicates while `addVerse` permits intentional multiple translations.
- **Prior Art:** Follows headless dependency injection patterns established in `AudioRecorderService.test.ts` (`AudioDriver`) and `RecitationSession.test.ts`.

## Out of Scope

- Remote cloud database synchronization or multi-device account syncing (ADR-0002 local-first storage preserved).
- Database migrations or SQLite / WatermelonDB adoption (AsyncStorage key-value storage remains sufficient for MVP scale).
- UI visual restyling of `HomeScreen` or `ReviewScreen`.

## Further Notes

- Completes Candidate 02 from `/improve-codebase-architecture`, eliminating all scattered SM-2 logic and retiring the legacy `VerseStorageService` pass-through.
