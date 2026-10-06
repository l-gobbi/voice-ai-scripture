# Specification: Architectural Deepening of Voice Input & Scripture Retention

**Status:** implemented  
**Domain:** Codebase Architecture / Seam Discipline / Voice AI & Verse Retention Subsystems  
**Governing Documents:** `CONTEXT.md`, `docs/adr/0005-deep-verse-engine-domain-architecture.md`, `docs/adr/0006-speech-transcriber-seam.md`, `docs/adr/0010-injectable-storage-adapter-and-subscription-service-deepening.md`

---

## Problem Statement

As the Voice-AI Scripture application grows, developers and automated coding agents face friction navigating and extending the codebase due to two architectural anti-patterns:

1. **Leaky Audio Seams and Shallow Audio Wrappers (Candidate 1)**:
   - When introducing voice features or writing tests, developers must juggle three separate audio concepts: `AudioRecorderService`, `SpeechTranscriber`, and `VoiceInput`.
   - `AudioRecorderService` is a shallow 28-line pass-through module that merely forwards calls 1:1 to an underlying audio driver without adding behavior or leverage.
   - The retired `SpeechTranscriber` seam continues to leak across four application layers (from `HomeScreen` and `ReviewScreen` down through hooks to `RecitationSession`), requiring ad-hoc bridging adapters and creating confusion over which parameter to pass.
   - Transient audio files and their deletion logic leak outside the adapter boundary, increasing the risk of disk leaks on mobile devices.

2. **Circular Coupling and Manual UI Coordination in Verse Retention (Candidate 2)**:
   - When displaying the home dashboard or recording completed reviews, developers must coordinate two separate modules: `VerseEngine` and `HabitTracker`.
   - `HabitTracker` was extracted across an artificial seam with only a single implementation, creating a circular coupling where `VerseEngine` must inject a `dueCountFn` closure into `HabitTracker`, while `HabitTracker` exposes a `setDueCountFn` back-reference.
   - Because the modules are severed, presentation callers like `HomeScreen` are forced to orchestrate dual asynchronous queries manually—fetching verse summaries first, extracting the due count, and then passing `overrideDueCount` into the habit tracker to avoid redundant storage parsing.
   - This mutual dependency complicates test setup and creates subtle risks of streak desynchronization.

---

## Solution

Deepen the architecture by eliminating shallow pass-throughs, collapsing artificial seams, and establishing single, authoritative interfaces for audio capture and scripture retention:

1. **Deep Voice Input Module (Candidate 1)**:
   - Consolidate all audio recording, cloud HTTP multipart transport, and atomic temporary file cleanup behind a single deep `VoiceInput` interface.
   - Delete `AudioRecorderService` as an independent public module, making platform recording drivers internal to cloud audio capture.
   - Encapsulate speech transcription inside the cloud audio adapter, retiring `SpeechTranscriber` from all screen and hook props.
   - Present a uniform `VoiceInput` seam to `RecitationSession` and user interface layers, backed by three concrete adapters: on-device native streaming, cloud audio recording with transcription, and offline simulated testing.

2. **Deep Verse Retention Module (Candidate 2)**:
   - Reabsorb habit tracking and daily streak calculations directly into `VerseEngine` as private internal capabilities.
   - Eliminate circular closure injection (`dueCountFn` and `setDueCountFn`). When a verse review is recorded, `VerseEngine` atomically updates both the Spaced Repetition schedule and the user's habit streaks in a single cohesive operation.
   - Expose a unified dashboard query (`getDashboard`) that computes verse summaries and habit statistics in a single pass.
   - Simplify user interface callers to consume the single dashboard query without manual coordination or parameter passing.

---

## User Stories

### Voice Input & Acoustic Navigation
1. As an application developer, I want all voice recording and speech transcription to live behind a single `VoiceInput` interface, so that I only have to learn and mock one module when building voice features.
2. As a mobile learner, I want temporary audio files created during cloud transcription to be atomically deleted directly by the voice adapter, so that unneeded audio data never accumulates on my phone storage.
3. As a developer writing tests for recitation flows, I want to inject a single `SimulatedVoiceAdapter` into the recitation session, so that I do not have to configure both a recorder mock and a transcriber mock.
4. As a UI engineer modifying the review screen, I want the screen to accept a single optional `voiceInput` prop, so that I never have to decide whether to pass a transcriber or an audio recorder.
5. As an automated coding agent navigating the repository, I want clear separation between audio capture and session evaluation, so that I can modify audio recording mechanics without triggering shotgun surgery across screen components.
6. As a privacy-conscious user, I want on-device native speech recognition to produce zero disk files while sharing the exact same interface as cloud transcription, so that my recitation privacy is guaranteed by design.

### Verse Retention & Dashboard Performance
7. As a scripture memorizer opening the app, I want the home dashboard to load my verses and habit streaks in a single fast query, so that my study screen appears instantly without layout shifts.
8. As a learner completing a recitation review, I want my streak and review schedule to update together atomically, so that my practice habit always stays in perfect sync with my verse progress.
9. As a developer maintaining the habit system, I want habit streak calculation to live in the same module as review recording, so that I do not need circular callback functions to calculate due counts.
10. As a UI engineer modifying the home screen, I want a single `getDashboard` method on the verse engine, so that I do not have to write coordinating logic or manually pass due counts between services.
11. As a developer writing tests for habit streaks, I want to verify streak increments through the verse engine using an in-memory storage adapter, so that test setup is simple, isolated, and fast.
12. As a user reviewing multiple verses in quick succession, I want habit statistics to remain consistent without redundant JSON parsing on every action, so that the app remains responsive and battery-efficient.

---

## Implementation Decisions

### Seam 1: Unified VoiceInput Seam
- **Interface Simplification**: The `VoiceInput` interface remains the sole external seam for audio interaction:
  - `requestPermissions(): Promise<boolean>`
  - `start(options?: VoiceInputOptions): Promise<void>`
  - `stop(): Promise<VoiceInputResult>`
  - `cancel(): Promise<void>`
- **Module Retirement**: The `AudioRecorderService` class is deleted. Its platform audio drivers (`NativeAudioDriver` and `WebAudioDriver`) become private implementation details inside `CloudAudioVoiceAdapter`.
- **Transcriber Encapsulation**: The `SpeechTranscriber` interface and its concrete classes (`WhisperTranscriber`, `GroqTranscriber`) become internal implementation details within the cloud voice adapter. Callers outside the voice input module will no longer import or inject `SpeechTranscriber`.
- **Caller Decoupling**: All occurrences of `transcriber?: SpeechTranscriber` are removed from the props and options of `HomeScreen`, `ReviewScreen`, `useRecitationSession`, and `RecitationSession`. Callers interact exclusively through `VoiceInput`.
- **Atomic Audio Lifecycle**: Audio file generation, multipart HTTP assembly, and file deletion via `finally` blocks are fully contained within `CloudAudioVoiceAdapter`, ensuring temporary audio URIs never escape the module.

### Seam 2: Deep VerseEngine Dashboard & Retention Seam
- **Module Absorption**: The standalone `HabitTracker` class is retired as an external module; its retention streak calculation algorithms, calendar day normalizations, and storage keys are absorbed into `VerseEngine`.
- **Elimination of Circular Closures**: The `dueCountFn` parameter in constructor options and the `setDueCountFn` mutation method are deleted. Because `VerseEngine` owns all verses, it directly determines due counts without closures.
- **Unified Query Interface**: `VerseEngine` introduces a unified `getDashboard(now?: Date)` method that returns both `VerseSummary` and `HabitStats` in a single pass.
- **Atomic Review Lifecycle**: `VerseEngine.recordReview()` directly updates the verse record and the habit streak data in storage, eliminating cross-module notification calls.
- **Presentation Streamlining**: `HomeScreen` replaces its dual sequential calls with a single invocation of `verseEngine.getDashboard()`, removing the `overrideDueCount` parameter entirely.

---

## Testing Decisions

### Testing Principles
- Tests must verify external behavior through public module interfaces, never asserting on private internal delegation or pass-through calls.
- Seams should be tested with realistic in-memory test doubles (`SimulatedVoiceAdapter` for voice, `MapStorageAdapter` for persistence).
- Trivial tests that merely verify that wrapper methods call underlying driver methods (such as those in the retired `AudioRecorderService.test.ts`) are eliminated in favor of behavior-driven tests.

### Target Module Coverage
1. **VoiceInput Tests**:
   - Verify `SimulatedVoiceAdapter` correctly returns configured simulated transcripts and handles cancellation.
   - Verify `CloudAudioVoiceAdapter` coordinates recording and transcription with atomic temporary file deletion upon success, failure, or cancellation.
   - Verify `NativeStreamVoiceAdapter` provides streaming speech transcripts without disk file interaction.
2. **RecitationSession Tests**:
   - Verify all recitation workflows (Levels 1, 2, and 3, diffing, scoring, and VAD auto-completion) operate cleanly through the single `VoiceInput` seam.
   - Verify that no tests require passing `transcriber` mocks or configuring secondary audio services.
3. **VerseEngine Tests**:
   - Verify `getDashboard()` returns accurate verse summaries and habit streak statistics simultaneously using `MapStorageAdapter`.
   - Verify `recordReview()` advances verse SRS intervals and increments daily streaks atomically.
   - Verify streak calculations across date boundaries (consecutive days, skipped days, same-day multiple reviews).
4. **HomeScreen Tests**:
   - Verify the dashboard displays verse summaries and habit badges using the unified `getDashboard` method without dual fetching.

### Prior Art
- Existing `VoiceInput.test.ts` provides the pattern for testing voice adapters.
- Existing `VerseEngine.test.ts` provides the pattern for evaluating persistence and Spaced Repetition using `MapStorageAdapter`.

---

## Out of Scope

- Modifying the underlying SuperMemo-2 Spaced Repetition mathematical formulas (intervals, ease factors).
- Altering the visual design tokens, colors, or typography of the home screen or review screen.
- Changing the VAD quadratic decibel thresholds or silence auto-completion timings established in recent bug fixes.
- Refactoring `ScriptureCatalog` or `BibleProvider` (already consolidated in Ticket 48).

---

## Further Notes

- These changes align the codebase with the deep-module architecture defined in `/codebase-design`.
- ADR 0006 (`SpeechTranscriber` seam) is formally superseded by the unified `VoiceInput` seam.
- ADR 0005 (`VerseEngine` domain architecture) is deepened to encompass habit retention.
