# 12: RecitationSession & VoiceSpikeScreen Consumer Migration

**What to build:**
Migrate consumers across the application to consume the formalized `SpeechTranscriber` seam. Update `RecitationSession` to inject `SpeechTranscriber` (defaulting to `createDefaultTranscriber()`), pass the canonical verse text and reference as `prompt` conditioning during `stopAndVerify()`, and catch typed `TranscriptionError` to transition the session state cleanly to `error` with helpful user error messages (without penalizing streaks or advancing review schedules). Strip all direct `process.env` inspections and inline fallback lambdas from `RecitationSession.ts`. Migrate `VoiceSpikeScreen.tsx` to `createDefaultTranscriber()`, removing its hardcoded timeout simulation.

**Blocked by:** Ticket 11 (Pluggable Speech Transcriber Seam & Adapters).

**Status:** ready-for-agent

- [ ] Update `RecitationSession` constructor options to accept `transcriber?: SpeechTranscriber`, defaulting to `createDefaultTranscriber()`.
- [ ] In `RecitationSession.stopAndVerify()`, pass canonical verse reference and text as `prompt` conditioning to `transcriber.transcribe(audioUri, { prompt: `${this.verse.reference}: ${this.verse.text}` })`.
- [ ] Catch `TranscriptionError` in `RecitationSession.stopAndVerify()`, transitioning session status to `'error'` and populating `errorMessage` based on error code:
  - [ ] `network_error`: "Network connection failed. Please check your internet connection."
  - [ ] `rate_limited`: "Transcription service is temporarily busy. Please try again shortly."
  - [ ] `unauthorized`: "Transcription authentication failed. Please check your API key."
  - [ ] `unintelligible`: "Could not transcribe audio. Please speak clearly and try again."
  - [ ] `unknown`: "An unexpected transcription error occurred."
- [ ] Verify that transcription errors do NOT advance SRS or call `verseEngine.recordReview()`.
- [ ] Remove all inline `process.env.EXPO_PUBLIC_OPENAI_API_KEY` inspections and fallback lambdas from `RecitationSession.ts`.
- [ ] Refactor `VoiceSpikeScreen.tsx` to use `createDefaultTranscriber()`, removing inline `setTimeout` simulation and direct `process.env` checks.
- [ ] Update `RecitationSession.test.ts` and `useRecitationSession.test.ts` to test prompt passing and error transitions using `SimulatedTranscriber`.
- [ ] Verify all 11+ test suites pass green.
