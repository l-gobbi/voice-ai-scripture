---
labels: ["ready-for-agent"]
---

# Specification: Pluggable Speech Transcriber Seam (Ports & Adapters)

## Problem Statement

Speech-to-text audio transcription currently relies on an informal function signature and leaked environment configuration across multiple layers of the application. `RecitationSession` and `VoiceSpikeScreen` both inspect `process.env.EXPO_PUBLIC_OPENAI_API_KEY` directly, implementing ad-hoc simulation fallbacks (e.g. timeout loops or echoing hardcoded strings) when the API key is missing. Furthermore, OpenAI Whisper API calls lack prompt conditioning, resulting in frequent speech recognition errors on Biblical proper nouns and archaic English grammar. Raw HTTP fetch errors are unclassified, making it impossible for recitation workflows to distinguish between infrastructure outages (network timeout, rate limits) and genuine user recitation mistakes.

## Solution

Formalize a clean, pluggable `SpeechTranscriber` interface (Ports & Adapters pattern) backed by two first-class adapters:
1. **`WhisperTranscriber`**: Production OpenAI Whisper STT client that accepts prompt conditioning and translates vendor HTTP errors into structured domain errors.
2. **`SimulatedTranscriber`**: Zero-configuration offline test and development adapter that deterministically echoes prompt text or executes configurable custom simulation handlers.
3. **`createDefaultTranscriber()` Factory**: Encapsulates environment key resolution (`EXPO_PUBLIC_OPENAI_API_KEY`), isolating UI and recitation orchestration completely from API key checks.
4. **Biblical Vocabulary Conditioning**: `SpeechTranscriber.transcribe(audioUri, options)` accepts optional `prompt?: string`, allowing `RecitationSession` to prime Whisper with canonical scripture text and references.
5. **Typed `TranscriptionError`**: A domain error model categorizing failures (`network_error`, `unauthorized`, `rate_limited`, `unintelligible`, `unknown`) so the UI displays helpful feedback instead of penalizing user streaks.
6. **Consumer Migration & Deprecation**: Migrate `RecitationSession` and `VoiceSpikeScreen` to consume `SpeechTranscriber`, deprecating legacy standalone `transcribeAudio` in `WhisperService.ts`.

## User Stories

1. As a believer reciting a scripture passage containing archaic English (e.g., *"thee"*, *"thou"*, *"begotten"*), I want the transcription engine to be primed with the passage vocabulary, so that accurate recitations are not penalized by modern speech-to-text misspellings.
2. As a believer reciting a passage with biblical proper nouns (e.g., *"Melchizedek"*, *"Nebuchadnezzar"*, *"Gethsemane"*), I want the speech model to accurately recognize the biblical names, so that my recitation is scored fairly.
3. As a developer running the mobile app locally without an OpenAI API key configured, I want speech recitation to work seamlessly via offline simulation, so that I can develop, test, and demo UI workflows without runtime crashes or manual code tweaks.
4. As a believer reciting scripture when my internet connection drops or times out, I want to see a clear "Network connection failed" error message rather than having my streak reset as a failed recitation.
5. As a believer whose account hits an OpenAI rate limit or API outage, I want the app to gracefully show a temporary service notice rather than grading my attempt as 0% accuracy.
6. As a developer writing automated unit or integration tests for recitation flows, I want to inject a lightweight `SimulatedTranscriber` with custom failure or typo responses, so that I can test recitation scoring deterministically without making real HTTP requests or mocking global fetch.
7. As an AI coding agent or engineer modifying `RecitationSession`, I want a clean, single-method `SpeechTranscriber` interface, so that I never have to navigate environment variables, FormData serialization, or audio MIME-type parsing inside domain orchestration.
8. As a developer testing the `VoiceSpikeScreen`, I want it to use the unified default transcriber, so that spike testing matches production transcription behavior.
9. As a privacy-conscious user, I want transcription errors to fail fast without hanging the UI or leaking raw API stack traces to the screen.
10. As a maintainer, I want existing usages of `WhisperService.ts` to remain backward-compatible during the migration phase, so that the codebase remains 100% buildable and green at every commit.

## Implementation Decisions

- **Seam Definition & Location:** Create `src/services/SpeechTranscriber.ts` exporting the canonical contract, error types, adapters, and factory:
  ```typescript
  export type TranscriptionErrorCode =
    | 'network_error'
    | 'unauthorized'
    | 'rate_limited'
    | 'unintelligible'
    | 'unknown';

  export class TranscriptionError extends Error {
    constructor(
      public readonly code: TranscriptionErrorCode,
      message: string,
      public readonly cause?: unknown
    ) {
      super(message);
      this.name = 'TranscriptionError';
    }
  }

  export interface TranscriptionOptions {
    prompt?: string;
  }

  export interface TranscriptionResult {
    text: string;
  }

  export interface SpeechTranscriber {
    transcribe(audioUri: string, options?: TranscriptionOptions): Promise<TranscriptionResult>;
  }
  ```

- **Production Adapter (`WhisperTranscriber`):**
  - Accepts `apiKey?: string` in constructor, falling back to `process.env.EXPO_PUBLIC_OPENAI_API_KEY`.
  - Sends multipart `FormData` (`file`, `model: 'whisper-1'`, `language: 'en'`, and optional `prompt` from options) to `https://api.openai.com/v1/audio/transcriptions`.
  - Maps HTTP status codes into `TranscriptionError`:
    - 401 / 403 → `unauthorized`
    - 429 → `rate_limited`
    - 400 / 422 → `unintelligible`
    - 5xx / Network / Fetch rejection → `network_error`
    - Others → `unknown`

- **Offline Simulation Adapter (`SimulatedTranscriber`):**
  - Accepts `config?: { defaultText?: string; handler?: (audioUri: string, options?: TranscriptionOptions) => Promise<string> | string }`.
  - In `transcribe(audioUri, options)`:
    - If `handler` is configured, invokes `handler(audioUri, options)`.
    - Else if `options?.prompt` is present, returns `{ text: options.prompt }` (simulating 100% accurate recitation).
    - Else returns `{ text: config?.defaultText ?? '' }`.

- **Factory Function (`createDefaultTranscriber`):**
  - `createDefaultTranscriber(apiKey?: string): SpeechTranscriber`
  - Evaluates `const key = apiKey ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY`.
  - If `key` is defined and non-empty, returns `new WhisperTranscriber(key)`.
  - Otherwise logs a development notice and returns `new SimulatedTranscriber()`.

- **RecitationSession Integration:**
  - Update `RecitationSession` constructor options: `transcriber?: SpeechTranscriber`.
  - Defaults to `createDefaultTranscriber()`.
  - In `stopAndVerify()`:
    - Calls `await this.transcriber.transcribe(audioUri, { prompt: `${this.verse.reference}: ${this.verse.text}` })`.
    - Catches `TranscriptionError` and updates state to `status: 'error'`, setting `errorMessage` based on error code (e.g. `"Transcription failed: please check your network connection."`).
    - Strips all references to `process.env.EXPO_PUBLIC_OPENAI_API_KEY` and inline simulation from `RecitationSession.ts`.

- **VoiceSpikeScreen Integration:**
  - Refactor `VoiceSpikeScreen.tsx` to use `createDefaultTranscriber()`.
  - Eliminates inline `setTimeout` simulation and direct `process.env` checks.

- **Legacy WhisperService Deprecation:**
  - In `src/services/WhisperService.ts`, mark `transcribeAudio` as `@deprecated`.
  - Delegate `transcribeAudio(audioUri, apiKey)` to `new WhisperTranscriber(apiKey).transcribe(audioUri)`.

## Testing Decisions

- **Test Behavior at the Public Seam:**
  - Test `WhisperTranscriber` by mocking the global network transport (`fetch`), asserting on `FormData` parameters (`prompt`, `file`, `model`) and verifying accurate mapping to `TranscriptionError`.
  - Test `SimulatedTranscriber` in pure memory without mocks, verifying default prompt echo and custom handler overrides.
  - Test `createDefaultTranscriber` returning `WhisperTranscriber` when API key is provided and `SimulatedTranscriber` when absent.
  - Test `RecitationSession` integration with `SpeechTranscriber`:
    - Verifies prompt hint is passed to transcriber during `stopAndVerify()`.
    - Verifies `TranscriptionError` transitions session state to `error` with user-friendly error message, without invoking `recordReview` or resetting streak.
- **Prior Art:**
  - Follows existing ports-and-adapters pattern in `VerseEngine.ts` (`StorageAdapter` / `MapStorageAdapter` / `AsyncStorageAdapter`) and `AudioRecorderService.ts` (`AudioDriver`).

## Out of Scope

- On-device local neural Whisper models (e.g. whisper.tflite / whisper.cpp native bindings). OpenAI Whisper API remains the primary STT engine.
- Multi-language transcription beyond English (`language: 'en'`).
- Real-time streaming transcription (transcription occurs after recording completes).
- Audio compression or transcoding (recording uses native m4a format).

## Further Notes

- Completes Candidate 03 from the Architecture Review (`architecture-review-20260917-161400.html`).
- Aligns with ADR 0006 and ubiquitous language documented in `CONTEXT.md`.
