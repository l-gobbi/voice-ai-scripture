---
labels: ["ready-for-agent"]
---

# Specification: Deep Recitation Session Architecture

## Problem Statement
The recitation lifecycle currently suffers from orchestration sprawl. The review screen directly coordinates microphone permissions, real-time volume metering timers, quota checks, external speech-to-text calls, and manual file deletion. Meanwhile, the recitation controller is a shallow passthrough between the screen and core logic engines. This lack of locality means audio cleanup and quota gating are prone to leaking, error handling is duplicated, and testing recitation behavior requires brittle UI component mocking.

## Solution
Consolidate the complete recitation lifecycle into a deep, stateful Recitation Session module. The module encapsulates microphone capture, volume metering, quota gating, speech transcription, diff verification, spaced repetition updates, and guaranteed audio file cleanup behind a simple, intent-based state machine. The review screen becomes a thin presentation renderer that merely reflects the current session status.

## User Stories
1. As a believer memorizing scripture, I want to start a voice recitation with a single tap, so that the app immediately prepares microphone capture and listens to my voice.
2. As a believer reciting scripture, I want to see real-time waveform visual feedback while speaking, so that I know the device is actively and accurately capturing my voice.
3. As a believer finishing a recitation, I want to tap "Stop & Verify" to receive an immediate word-by-word diff and accuracy score, so that I can see precisely where my memory was faithful or stumbled.
4. As a believer practicing, I want my streak and spaced repetition schedule to automatically update upon successful recitation, so that I don't have to manually manage review intervals.
5. As a privacy-conscious user, I want my voice recordings to be discarded immediately upon evaluation or failure, so that my personal audio is never stored permanently on device or external servers.
6. As a free user, I want the app to notify me when my complimentary voice recitation quota is exhausted, so that I understand why the paywall appears and can choose whether to subscribe.
7. As an unsubscribed user with exhausted quota, I want to seamlessly continue practicing using self-review, so that my spiritual study is never blocked by monetization.
8. As an offline user or local developer, I want the app to gracefully fall back to verbatim recitation when speech-to-text is unavailable, so that the application remains functional without cloud credentials.
9. As a developer, I want to test the entire recitation lifecycle through a single headless interface without rendering UI screens, so that regression tests are deterministic and lightning fast.

## Implementation Decisions
- **Deep Module Architecture:** The recitation lifecycle will be encapsulated in a pure TypeScript `RecitationSession` class that manages all internal state transitions and side effects, wrapped by a lightweight React hook for presentation screens.
- **State Machine Contract:** The session interface exposes a clear, discriminated state contract:
  ```typescript
  type RecitationStatus =
    | 'idle'
    | 'reciting'
    | 'evaluating'
    | 'verified'
    | 'quota_exhausted'
    | 'error';

  interface RecitationState {
    status: RecitationStatus;
    volumeLevel: number;
    result: VoiceRecitationResult | null;
    errorMessage: string | null;
  }
  ```
- **Action Surface:** Callers interact exclusively through three high-level commands: `startReciting()`, `stopAndVerify()`, and `reset()`.
- **Absorbed Quota Gating:** Quota consumption is evaluated inside `startReciting()`. If the user is unsubscribed and has exhausted their quota, the session transitions directly to `quota_exhausted` without opening audio streams.
- **Atomic Privacy Invariant:** The session guarantees immediate audio file deletion in all exit paths (verification completion, speech transcription failure, network timeout, or caller reset) before returning or setting state.
- **Elimination of Shallow Middlemen:** The previous shallow voice review controller is deleted; diffing, scoring, and spaced repetition persistence are executed directly within the session's completion step.
- **Injected Speech Transcriber Seam:** The session accepts an optional speech transcriber dependency (defaulting to the remote Whisper service, falling back to local simulation when no API key is present) to decouple network concerns and enable headless testing.

## Testing Decisions
- **Test Only at the Seam:** Tests will verify the complete recitation lifecycle through the public interface of `RecitationSession` (`startReciting`, `stopAndVerify`, `reset`), verifying state transitions and outputs rather than private internal steps.
- **Privacy Verification:** Tests must verify that audio cleanup is invoked on successful completion, transcription errors, and session resets.
- **Quota Verification:** Tests must verify that attempting to start a recitation with zero remaining quota transitions to `quota_exhausted` and prevents audio recording.
- **Prior Art:** Leverages patterns established in existing engine tests (`srsEngine.test.ts`, `diffEngine.test.ts`), keeping test execution headless, deterministic, and free of React Native renderer overhead.

## Out of Scope
- Direct changes to the underlying Myers diff algorithm or SuperMemo-2 scheduling math.
- In-app purchase receipt validation or billing provider migration (RevenueCat integration remains targeted for production release).
- Cloud user authentication or server-side database syncing (ADR-0002 local-first storage is preserved).

## Further Notes
- This refactoring directly eliminates the architectural friction identified during `/improve-codebase-architecture`, transforming the review screen into a pure visual component and establishing a robust foundation for future audio features (e.g. phrase-by-phrase recitation).
