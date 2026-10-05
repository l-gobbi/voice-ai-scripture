# Specification: Architectural Deepening — Unified VoiceInput, ScriptureCatalog & Pure RecitationEvaluator

**Status:** ready-for-agent  
**Domain:** Voice Capture / Speech Recognition / Scripture Canon & Translation / Recitation Evaluation / Spaced Repetition  
**Governing Documents:** `CONTEXT.md`, `docs/adr/0001-deterministic-dp-diffing-over-llm-evaluation.md`, `docs/adr/0005-deep-verse-engine-domain-architecture.md`, `docs/adr/0006-speech-transcriber-seam.md`, `docs/adr/0007-multi-translation-and-bible-provider.md`, `docs/adr/0008-guided-reference-picker-and-canon-matrix.md`, `docs/adr/0011-three-tier-scaffolded-recitation-and-speech-infrastructure.md`, `docs/adr/0012-deepen-recitationsession-with-scaffolding-and-lifelines.md`, `docs/adr/0014-canonical-projection-and-diacritic-lenient-verification.md`

---

## Problem Statement

As the application expanded from initial text flashcards to multi-tier voice recitation and hybrid speech engines (Groq Cloud Whisper and on-device native speech recognition), three core subsystems accumulated significant architectural friction:

1. **Fragmented Voice Capture & Smuggled State**:
   Speech recognition was historically bifurcated into two separate modules: an audio recorder and a speech transcriber. When live on-device speech dictation was introduced, it was forced through a batch audio file interface. To bridge the gap, the audio recorder secretly executed speech recognition during recording and smuggled the resulting transcripts into module-global `Map` variables keyed by temporary file URIs. Callers like the recitation session were forced to coordinate recording starts, file URI hand-offs, transcription calls, and defensive disk cleanup across multiple `try/catch/finally` blocks, resulting in repeated platform regressions around file URIs, Blobs, and multipart form uploads.

2. **Scattered Scripture Canon & Duplicated Book Catalogs**:
   Biblical canon knowledge is fragmented across multiple shallow files. The 66 biblical books, their chapter/verse counts, their English and Portuguese aliases, bundled dataset loaders, and bilingual language inference heuristics are duplicated across separate reference normalizers, provider loaders, and canon matrices. Adding an alias or resolving a passage requires callers to coordinate four separate functions across three modules.

3. **Leaky Recitation Evaluation & Unmetered Simulation**:
   Verification logic is split across three independent functional engines. The recitation session must manually orchestrate Myers sequence diffing, F1 score calculations, assistance score capping (which is inappropriately exported from visual cloze masking utilities), and manual unmetered SRS result reconstruction. This pollutes session orchestration with low-level mathematical heuristics and forces unmetered practice attempts to hand-patch SuperMemo-2 data structures.

Learners and maintainers need a deep, cohesive architecture where voice capture is a single high-leverage seam with zero disk I/O for native dictation, scripture lookup is an authoritative catalog, and recitation evaluation is a pure, self-contained mathematical pipeline.

---

## Solution

Deepen the three subsystems into cohesive, high-leverage modules following the codebase design principles:

1. **Unified VoiceInput Seam (Candidate 1)**:
   - Collapse audio recording and speech transcription into a single deep `VoiceInput` seam presenting only `start()` and `stop(): transcript`.
   - Implement three swappable adapters:
     - `NativeStreamVoiceAdapter`: Streams directly to platform speech frameworks (Apple Speech, Android SpeechRecognizer, Web Speech API) with real-time volume metering. Produces zero temporary audio files on disk, ensuring absolute privacy and instant evaluation.
     - `CloudAudioVoiceAdapter`: Captures audio in memory or a transient buffer, streams to Groq Cloud Whisper (`whisper-large-v3-turbo`) or OpenAI Whisper with `temperature: 0` and prompt conditioning, and atomically deletes all transient audio upon completion.
     - `SimulatedVoiceAdapter`: Stand-in for unit tests and headless environments that delivers predictable transcripts and volume ticks without native hardware dependencies.
   - Strip all audio file tracking, URI passing, and manual deletion hooks out of `RecitationSession`.

2. **Authoritative ScriptureCatalog (Candidate 2)**:
   - Consolidate reference normalization, book aliases, canon boundaries, bundled Bible datasets, and bilingual language detection into a single deep `ScriptureCatalog` module.
   - Expose a clean, cohesive interface: `resolvePassage(query, translation)` to return normalized passage metadata and text in a single pass, `detectLanguage(verse)` for unambiguous linguistic classification, and `getBooks()` / `getVerseCount()` for guided picker navigation.
   - Eliminate duplicated book arrays and synchronize English and Portuguese book aliases into a unified registry.

3. **Pure RecitationEvaluator Pipeline (Candidate 3)**:
   - Consolidate string tokenization, honorific abbreviation expansion (e.g. `Sra.` $\leftrightarrow$ `Senhor`), diacritic tolerance, Myers diff alignment, F1 precision/recall calculation, assistance score capping (75% for lifeline usage), and SuperMemo-2 unmetered simulation into a single pure function `evaluateRecitation(input)`.
   - Relieve `RecitationSession` of low-level scoring formulas and manual SRS patching, replacing multi-engine coordination with a single deterministic function call.
   - Restrict `clozeEngine` strictly to visual cloze token generation and masking.

---

## User Stories

### Unified Voice Capture & Privacy
1. As a learner reciting scripture on mobile, I want speech recognition to begin immediately when I tap the microphone without creating unneeded audio files on disk, so that my device storage is untouched and my speech remains private.
2. As a learner practicing offline with native speech recognition, I want volume metering for the waveform visualizer to function smoothly during live dictation, so that I have clear visual feedback that the app is listening.
3. As a learner using cloud neural transcription, I want my recitation audio securely processed by Groq Cloud Whisper and immediately purged from temporary storage after transcription, so that no voice recordings linger on my device.
4. As a learner whose recitation attempt is cancelled, I want the microphone session to halt immediately and release hardware locks, so that background battery consumption is avoided.
5. As an automated test suite, I want to simulate full recitation sessions through an in-memory voice adapter without mocking file systems or network sockets, so that tests execute in milliseconds with zero flakiness.

### Authoritative Scripture Catalog & Guided Navigation
6. As a learner searching for a verse in Portuguese (e.g. *"Jo 3:16"* or *"Salmos 23:1"*), I want the scripture catalog to recognize common Portuguese abbreviations and resolve canonical text instantly, so that I can add verses without typing friction.
7. As a learner searching for a verse in English (e.g. *"Jn 3:16"* or *"Ps 23:1"*), I want the scripture catalog to resolve English translations (WEB, KJV) with canonical formatting, so that the verse text is accurate and complete.
8. As a learner adding a verse from a bundled translation, I want the passage text populated automatically upon typing the reference, so that I do not need to copy and paste text manually.
9. As a learner navigating the guided reference picker, I want books organized cleanly into Old and New Testaments with accurate chapter and verse counts, so that I cannot select non-existent chapters or verses.
10. As a learner reciting a verse with English reference labeling but Portuguese text, I want the catalog language detector to recognize Portuguese from the text content, so that the speech engine receives the proper language parameter.
11. As a developer maintaining biblical canon data, I want all book definitions, aliases, and chapter limits stored in a single authoritative catalog, so that updating an alias never causes inconsistencies between the search bar and picker.

### Pure Recitation Evaluation & Transparent Scoring
12. As a learner reciting scripture out loud, I want common speech-to-text honorific abbreviations (e.g. *"Sra."* or *"Sr."* for *"Senhor"*, *"St."* for *"Saint"*) recognized as correct matches, so that speech model quirks never penalize my memory score.
13. As a learner reciting accented scripture, I want unaccented spoken transcriptions to match canonical words with full credit, so that acoustic microphone limitations do not reset my streak.
14. As a learner who stutters or repeats opening words before reciting cleanly, I want the alignment engine to evaluate the completed verse fairly without cascading alignment errors across the rest of the passage.
15. As a learner practicing in Echo Mode or Cloze Practice (Levels 1 and 2), I want to see simulated SuperMemo-2 projections without altering my persistent review schedule or streak, so that unmetered practice remains pressure-free.
16. As a learner using a word peek lifeline in Blind Recitation (Level 3), I want my final score capped transparently at 75% in accordance with spaced repetition policy, so that unassisted recall remains the standard for interval advancement.
17. As an automated test suite, I want to verify complex recitation scoring permutations through a pure function without constructing session classes or timers, so that regression tests remain comprehensive and deterministic.

---

## Implementation Decisions

### Seam 1: Unified VoiceInput Seam
- **Module Interface**:
  The interface consists of a lifecycle session contract:
  - `start(options?: VoiceInputOptions): Promise<void>`
  - `stop(): Promise<{ transcript: string }>`
  - `cancel(): Promise<void>`
- **Options Schema**:
  - `language?: string` (e.g. `'pt'`, `'en'`)
  - `prompt?: string` (canonical scripture text priming)
  - `onMeter?: (volumeLevel: number) => void` (normalized volume callback for the waveform visualizer)
- **Concrete Adapters**:
  - `NativeStreamVoiceAdapter`: Implements live dictation via on-device speech recognition drivers (Apple Speech, Android SpeechRecognizer, Web Speech API). Streams volume metering via audio levels and captures speech directly into memory. Emits no audio files to disk.
  - `CloudAudioVoiceAdapter`: Records audio into a transient buffer using standard platform recording options, streams to Groq Cloud Whisper (`whisper-large-v3-turbo`) or OpenAI Whisper with `temperature: 0`, and purges transient audio in an internal `finally` block before returning the transcript.
  - `SimulatedVoiceAdapter`: Pure in-memory adapter accepting pre-configured transcripts or dynamic handlers for unit tests.
- **Consumer Simplification**:
  `RecitationSession` receives an injected `VoiceInput` adapter (defaulting to the system factory). All file URI tracking, `.m4a` extensions, and defensive `deleteAudioFile` calls are removed from `RecitationSession`.

### Seam 2: Authoritative ScriptureCatalog
- **Module Interface**:
  The module provides a unified biblical registry:
  - `resolvePassage(query: string, translation?: string): ResolvedPassage | null`
  - `detectLanguage(verse: { text?: string; reference?: string; translation?: string }): 'en' | 'pt'`
  - `getBooks(testament?: 'OT' | 'NT', query?: string): CanonBook[]`
  - `getVerseCount(bookId: string, chapter: number): number`
  - `getDefaultTranslation(referenceOrLanguage: string): SupportedTranslation`
- **Passage Resolution Schema**:
  - `canonicalRef`: Formatted reference string (e.g. `"João 3:16"` or `"John 3:16"`)
  - `bookId`: Standard 3-letter USFM book code (e.g. `"JHN"`, `"PSA"`)
  - `chapter`: Chapter number
  - `startVerse`: Beginning verse number
  - `endVerse?: number`: Optional ending verse number
  - `language`: `'en' | 'pt'`
  - `translation`: Resolved translation code
  - `text?: string`: Bundled passage text if available; null if manual entry required
  - `isBundled`: Boolean indicating if text was resolved from local datasets
- **Consolidation**:
  The 66 book definitions, Portuguese and English names, regex alias maps from `ReferenceNormalizer`, chapter and verse limits from `canonMatrix.json`, and dataset loaders from `BibleProvider` are consolidated into `ScriptureCatalog`. `AddVerseModal` and `ReferencePickerModal` call `ScriptureCatalog` exclusively.

### Seam 3: Pure RecitationEvaluator Pipeline
- **Module Interface**:
  A single pure function:
  `evaluateRecitation(input: EvaluationInput): RecitationEvaluation`
- **Input Contract**:
  - `expectedText: string`: Canonical scripture verse text
  - `transcribedText: string`: Recognized speech transcript
  - `assistanceUsed?: boolean`: Whether word peek lifelines were revealed
  - `currentSRS?: SRSState`: Current SuperMemo-2 card interval state
  - `isUnmetered?: boolean`: True for Levels 1 and 2 practice attempts
- **Output Contract**:
  - `tokens: DiffToken[]`: Myers sequence alignment tokens with Canonical Scripture Projection (`correct`, `missed`, `added`)
  - `rawScore: number`: Verbatim F1 accuracy percentage (0–100)
  - `finalScore: number`: Score capped at 75% if `assistanceUsed` is true
  - `passed: boolean`: Whether `finalScore >= 80` (or assisted pass criteria)
  - `isAssisted: boolean`: Flag indicating assistance capping occurred
  - `srsResult: SRSResult`: SuperMemo-2 result structure. If `isUnmetered` is true, interval and streak are preserved while projecting prospective intervals.
- **Engine Relocations**:
  - `evaluateAssistedScore` is moved out of `clozeEngine` and encapsulated inside `RecitationEvaluator`.
  - Abbreviation expansion (`ABBREVIATION_MAP`) and diacritic tolerance remain encapsulated in comparison key generation.
  - `clozeEngine` is refactored to focus exclusively on visual cloze token generation and masking algorithms.

---

## Testing Decisions

### Test Quality & Seam Discipline
- Tests must verify external behavior through public module interfaces, avoiding assertions on private variables, internal timers, or transient intermediate states.
- The three modules represent clean testing seams:
  1. `VoiceInput`: Verified through unit tests against each adapter (`NativeStreamVoiceAdapter`, `CloudAudioVoiceAdapter`, `SimulatedVoiceAdapter`), and end-to-end through `RecitationSession` using `SimulatedVoiceAdapter`.
  2. `ScriptureCatalog`: Verified through in-process queries testing Portuguese and English alias resolution, canonical formatting, out-of-bounds chapter handling, and bundled verse retrieval.
  3. `RecitationEvaluator`: 100% pure function tests exercising alignment matrices, accent dropping, honorific abbreviations, stutter penalties, assistance score caps, and unmetered SRS preservation without mocks.

### Prior Art in Codebase
- `StorageAdapter.test.ts`: Exemplary adapter-seam testing pattern providing in-memory fake and platform implementations.
- `diffEngine.test.ts`: Pure functional DP alignment test suite verifying verbatim and diacritic-lenient scripture diffing.
- `RecitationSession.test.ts`: Multi-tier lifecycle testing pattern validating scaffolding progression and lifelines.

---

## Out of Scope

- Remote cloud synchronization of user verse repositories (retains offline-first `AsyncStorageAdapter`).
- Commercial licensing of copyrighted modern English or Portuguese Bible translations (ESV, NIV, NVI API fetching).
- Voice Activity Detection (VAD) audio trimming libraries (handled via platform recording callbacks).
- Modifying the visual editorial design tokens or layout structure in `ReviewScreen` and `HomeScreen`.

---

## Further Notes

- Candidate 4 (extracting `HabitTracker` from `VerseEngine`) remains documented in the architectural review and can be scheduled as a subsequent deepening step once the three primary candidates are implemented.
- The elimination of temporary audio files for native dictation substantially improves device privacy and resolves all outstanding Expo WinterCG Blob and FormData incompatibilities.

