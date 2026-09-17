# 07: Headless Recitation Session Engine & Invariants

**What to build:** Implement the pure TypeScript RecitationSession class that encapsulates the complete recitation state machine, microphone capture, live metering, quota consumption, speech transcription with local fallback, Myers diff verification, SM-2 updates, and atomic audio file deletion on all exit paths.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Implement RecitationSession class with state machine (idle, reciting, verifying, verified, quota_exhausted, error).
- [x] Absorb SubscriptionService quota consumption in startReciting().
- [x] Implement live volume metering via onMeter callback.
- [x] Enforce atomic audio file deletion on all exit paths (success, STT failure, reset).
- [x] Support injected SpeechTranscriber with local verbatim simulation fallback.
- [x] Automate diffing, scoring, and VerseStorageService.updateVerseSRS() on verification.
- [x] Headless unit test suite verifying complete recitation lifecycle and invariants.
