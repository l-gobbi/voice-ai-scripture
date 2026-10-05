# Specification: Architectural Deepening — HabitTracker Extraction, ScriptureCatalog Consolidation & Recitation Controller Refinement

**Status:** ready-for-agent  
**Domain:** Retention & Habit Tracking / Scripture Canon & Translation / Recitation Scaffolding & Presentation Controller / Spaced Repetition  
**Governing Documents:** `CONTEXT.md`, `docs/adr/0005-deep-verse-engine-domain-architecture.md`, `docs/adr/0007-multi-translation-and-bible-provider.md`, `docs/adr/0008-guided-reference-picker-and-canon-matrix.md`, `docs/adr/0011-three-tier-scaffolded-recitation-and-speech-infrastructure.md`, `docs/adr/0012-deepen-recitationsession-with-scaffolding-and-lifelines.md`, `docs/adr/0013-impeccable-design-system-and-editorial-aesthetic.md`, `docs/adr/0014-canonical-projection-and-diacritic-lenient-verification.md`

---

## Problem Statement

As the application expanded from initial text flashcards to multi-tier scaffolded recitation and hybrid speech recognition, three core modules accumulated architectural friction and broken locality:

1. **Bloated Verse Repository & Leaking Habit Retention**:
   The verse engine is responsible for verse persistence, collection summaries, and SuperMemo-2 spaced repetition scheduling. However, it also accumulated user retention telemetry: global streak counters, longest streaks, last active dates, daily completed verse IDs, and secondary persistence writes to a separate storage key. Changes to streak rules, calendar date boundaries, or retention policies force modifications to the verse repository. Callers such as the home screen must navigate verse retrieval methods just to obtain retention statistics.

2. **Shallow Scripture Facades & Fragmented Callers**:
   Recent architectural consolidation introduced an authoritative scripture catalog. However, transition debt left shallow facades in place: a reference normalizer that acts as a 12-line passthrough, and a legacy Bible provider that simply delegates passage fetching. Presentation modals continue to coordinate three separate modules—normalizing a reference, checking if a translation is bundled, and then fetching the passage—instead of utilizing a single high-leverage catalog call. Biblical canon book navigation is similarly fragmented between static dataset helpers and the catalog.

3. **Presentation Monolith & Leaky Scaffolding Orchestration**:
   The recitation review screen grew into an 1,177-line monolith because it directly manages practice state machines: coordinating text-to-speech auto-vocalization in Echo Mode, tracking interactive cloze word taps, managing 3-second word peek lifeline timers in Blind Recitation, and branching between sandbox and official review paths. Meanwhile, the recitation session hook functions as a shallow proxy that forwards individual method calls without encapsulating UI lifecycle coordination. This tightly couples presentation rendering to temporal timers and state transitions, making headless verification difficult and fragile.

---

## Solution

Deepen the three subsystems into cohesive, high-leverage modules following codebase design principles:

1. **Authoritative HabitTracker Module (Candidate 1)**:
   - Extract all streak calculation, daily completion tracking, calendar date arithmetic, and retention storage out of the verse engine into a deep, dedicated `HabitTracker` module.
   - Inject the habit tracker into the verse engine so that recording a review automatically triggers retention activity recording across a clean internal seam.
   - Expose a focused interface allowing callers to fetch habit statistics or record completions directly with zero verse repository coupling.

2. **Consolidated ScriptureCatalog & Facade Retirement (Candidate 2)**:
   - Retire the shallow reference normalizer and Bible provider facades, migrating all presentation modals and services directly to the deep `ScriptureCatalog` seam.
   - Provide a single-shot passage resolution interface that performs reference normalization, language detection, bundled verification, and passage retrieval in a single operation.
   - Unify canon book browsing and verse boundary queries under `ScriptureCatalog`, eliminating redundant canon matrix imports.

3. **Pure Declarative ReviewScreen via Deepened Recitation Controller (Candidate 3)**:
   - Deepen the recitation session controller to absorb practice scaffolding progression, text-to-speech playback coordination, and word peek lifeline timers.
   - Expose a consolidated UI state stream and high-level user action intents, relieving the review screen of imperative timer management and mode state machines.
   - Reduce the review screen to a purely declarative presentation surface focused on layout, sacred typography, and editorial visual feedback.

---

## User Stories

### Habit Tracking & Retention Locality
1. As a learner completing daily scripture reviews, I want my active streak updated reliably when I pass a due verse, so that my habit progress reflects my true dedication.
2. As a learner reviewing multiple verses on the same day, I want each review to contribute to my daily completion count without inflating my consecutive day streak, so that streak statistics remain mathematically accurate.
3. As a learner practicing after midnight, I want calendar date calculations handled with local date consistency, so that my streak does not prematurely reset due to UTC offset shifts.
4. As a learner who missed a day of review, I want my current streak reset to zero on my next review while preserving my longest streak record, so that historical achievement is preserved.
5. As an automated test suite, I want to verify complex streak permutations and date boundary transitions using an in-memory storage adapter without constructing or mocking verse collections, so that habit tests run deterministically in milliseconds.

### Authoritative Scripture Catalog & High-Leverage Resolution
6. As a learner adding a new verse, I want to input an unnormalized reference (e.g. *"1 Co 13:4"* or *"Sl 23:1"*) and have the canonical reference, translation, and passage text populated in one step, so that verse creation involves zero typing friction.
7. As a learner browsing biblical books in the reference picker, I want the book list, testament grouping, and verse limits queried from a single authoritative catalog, so that picker navigation is fast and always consistent with text resolution.
8. As a learner pasting scripture text from the clipboard, I want translation detection and passage normalization to validate against the authoritative catalog, so that malformed references are rejected gracefully with helpful guidance.
9. As a developer maintaining the codebase, I want all biblical canon definitions, bilingual aliases, and translation datasets located in one module, so that adding a translation alias never requires synchronizing across multiple facade files.
10. As an automated test suite, I want to test passage resolution across all supported translations through a single catalog interface, so that test setup is minimal and resilient to internal refactoring.

### Scaffolded Recitation & Declarative Presentation
11. As a learner entering Level 1 (Echo Mode), I want scripture vocalization to begin automatically without manual button taps, so that my auditory memory is primed immediately upon opening the mode.
12. As a learner in Level 1 (Echo Mode), I want the scripture text concealed by default with an instant toggle to reveal or hide the text, so that I can choose when to visually confirm my recall.
13. As a learner in Level 2 (Cloze Practice), I want to tap any masked word to reveal it inline, so that I can self-scaffold difficult phrases without penalties.
14. As a learner in Level 3 (Blind Recitation), I want tapping a blanked word to reveal it temporarily for exactly 3 seconds before re-masking, so that I receive an inline hint without permanently revealing the passage.
15. As a learner who uses a word peek lifeline during Blind Recitation, I want my review score capped at 75% transparently, so that assisted attempts schedule reinforcement without resetting my streak.
16. As a learner navigating between scaffolding levels, I want active word peek timers and audio playback cancelled immediately upon switching tabs, so that sensory feedback never bleeds across practice modes.
17. As a learner completing an unmetered practice attempt, I want my practice score displayed clearly without consuming my daily recitation quota or updating my official spaced repetition schedule, so that practicing remains completely pressure-free.
18. As a learner completing an official Blind Recitation review, I want the result immediately recorded to spaced repetition and habit tracking with a single celebration state, so that completing a review feels rewarding and seamless.
19. As a developer modifying the review screen layout, I want the component to receive a single declarative state object and dispatch user action callbacks, so that visual design tweaks never break timer or state machine logic.
20. As an automated test suite, I want to verify scaffolding level transitions, auto-vocalize triggers, and word peek timeout restorations headlessly through the controller seam without mounting React Native components, so that tests are 100% immune to native renderer missing dependencies.

---

## Implementation Decisions

### Seam 1: Authoritative HabitTracker Seam
- **Module Concept**:
  A dedicated domain module encapsulating habit streak calculations, longest streak tracking, daily completed verse registries, and calendar date boundaries.
- **Interface Contract**:
  - `getHabitStats(now?: Date): Promise<HabitStats>`: Returns current streak (evaluating whether yesterday was active), longest streak, last active date, completed today count, and total due today.
  - `recordActivity(verseId: string, wasDue: boolean, now?: Date): Promise<HabitStats>`: Updates active date, increments streak if consecutive, records verse ID in daily completion set, and updates longest streak.
  - `resetHabit(): Promise<void>`: Purges habit statistics for test or account reset scenarios.
- **Storage Seam**:
  Accepts an injectable `StorageAdapter` storing serialized habit data under a dedicated key (`global_habit_stats`). Defaults to `AsyncStorageAdapter`.
- **Consumer Decoupling**:
  `VerseEngine` delegates habit updates to `HabitTracker` via an injected dependency. All habit methods, calendar helper functions, and habit data interfaces are removed from `VerseEngine`. `HomeScreen` queries `HabitTracker` directly for habit banner rendering.

### Seam 2: Consolidated ScriptureCatalog Seam
- **Module Concept**:
  The authoritative single source of truth for all Protestant biblical canon definitions, chapter/verse boundaries, bilingual aliases (English and Portuguese), and bundled text datasets.
- **Interface Contract**:
  - `resolvePassage(query: string, translation?: string): ResolvedPassage | null`: Returns canonical reference, book code, chapter, start/end verse, language, translation, and bundled text in a single step.
  - `resolveReference(query: string): NormalizedReference | null`: Normalizes freeform reference queries.
  - `detectLanguage(verse: { text?: string; reference?: string; translation?: string }): 'en' | 'pt'`: Infers canonical language.
  - `getBooks(testament?: 'OT' | 'NT', query?: string): CanonBook[]`: Returns canon books for guided selection.
  - `getVerseCount(bookId: string, chapter: number): number`: Returns verse count boundaries.
  - `isPortugueseTranslation(translation?: string | null): boolean`: Translation classification.
  - `isBundledTranslation(raw: string): boolean`: Checks if offline text is bundled.
- **Facade Retirement**:
  `ReferenceNormalizer` and `BibleProvider` are retired. `AddVerseModal` calls `resolvePassage` directly. `ReferencePickerModal` queries books and verse counts directly from `ScriptureCatalog`.

### Seam 3: Deepened Recitation Controller Seam
- **Module Concept**:
  A stateful lifecycle controller encapsulating the complete multi-tier scaffolding state machine, speech synthesis coordination, word peek lifeline timers, and quota/SRS gating.
- **Interface Contract**:
  - **State Snapshot**:
    - `level`: Current tier (`1` Echo, `2` Cloze, `3` Blind)
    - `status`: Recitation lifecycle status (`idle`, `reciting`, `verifying`, `verified`, `quota_exhausted`, `error`)
    - `volumeLevel`: Real-time normalized microphone audio volume
    - `clozeTokens`: Masked/revealed word tokens for visual rendering
    - `isTextRevealed`: Text visibility toggle state (Level 1)
    - `assistanceUsed`: Boolean flag indicating word peek lifeline usage (Level 3)
    - `currentResult`: Verified recitation result with diff tokens and score
    - `officialResult`: Official spaced repetition review result
    - `errorMessage`: User-facing localized error description
    - `errorDetails`: Technical diagnostic string for acoustic debug tray
  - **Action Dispatches**:
    - `startReciting(options?: { unmetered?: boolean }): Promise<void>`
    - `stopAndVerify(options?: { unmetered?: boolean }): Promise<VoiceRecitationResult | null>`
    - `setLevel(level: 1 | 2 | 3): void`
    - `nextLevel(): void`
    - `practiceAgain(): void`
    - `toggleTextReveal(): void`
    - `tapWord(index: number): void`
    - `vocalize(): Promise<void>`
    - `reset(): Promise<void>`
- **Presentation Simplification**:
  `ReviewScreen` is refactored into a purely declarative presentation surface consuming the controller's state snapshot and dispatching user intent callbacks. All `setTimeout` timers, lifeline reveal tracking, audio player stopping, and mode-switch cleanup are encapsulated inside the controller.

---

## Testing Decisions

### Test Quality & Seam Discipline
- Tests must verify external behavior through public module interfaces, avoiding assertions on private variables, internal timers, or transient intermediate states.
- The three modules represent clean testing seams:
  1. `HabitTracker`: Tested via fast, in-memory unit tests exercising streak incrementation, same-day multiple reviews, missed-day streak resets, longest streak preservation, and calendar date boundaries without verse dependencies.
  2. `ScriptureCatalog`: Tested via in-process queries validating single-shot passage resolution, Portuguese/English alias handling, out-of-bounds chapter checks, and bundled dataset text retrieval.
  3. `RecitationController`: Tested headlessly exercising scaffolding progression (Levels 1 → 2 → 3), auto-vocalization triggers, word peek lifeline 3-second auto-masking, assistance score capping (75%), and unmetered vs official SRS recording without mounting native UI components.

### Prior Art in Codebase
- `StorageAdapter.test.ts`: Canonical adapter-seam testing pattern providing in-memory fake and platform implementations.
- `recitationEvaluator.test.ts`: Pure functional DP alignment test suite verifying verbatim and diacritic-lenient scripture diffing.
- `VoiceInput.test.ts`: Adapter testing pattern validating simulated, cloud, and native streaming voice seams.

---

## Out of Scope

- Modifying the visual editorial aesthetic, sacred color palette, or typography tokens defined in `docs/adr/0013-impeccable-design-system-and-editorial-aesthetic.md`.
- Remote cloud synchronization or cross-device habit backup (retains offline-first `AsyncStorageAdapter`).
- Commercial licensing of copyrighted modern translations (retains public domain KJV, WEB, Almeida, ONBV datasets).
- Consolidating deck transfer utilities into `DeckTransfer` (deferred to Candidate 4).

---

## Further Notes

- Retiring `ReferenceNormalizer` and `BibleProvider` removes 2 shallow pass-through modules, eliminating confusion for future agents navigating the codebase.
- Extracting `HabitTracker` fulfills Candidate 4 from previous architectural notes and directly resolves the churn hotspot in `VerseEngine.ts`.
- Encapsulating lifeline timers inside the recitation controller ensures timer cleanup is guaranteed on unmount or mode switch, preventing memory leaks and stale state updates.
