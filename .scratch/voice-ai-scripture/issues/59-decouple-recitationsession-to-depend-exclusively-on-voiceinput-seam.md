# 59: Decouple RecitationSession to Depend Exclusively on VoiceInput Seam

**What to build:**
Decouple `RecitationSession` so it interacts with voice capture exclusively through the `VoiceInput` seam (`requestPermissions`, `start`, `stop`, `cancel`). Remove legacy `recorder` and `transcriber` options from session configuration. Migrate tests to inject `SimulatedVoiceAdapter` at the single voice seam rather than mocking recording drivers and transcribers.

**Blocked by:** 58 (Streamline Native Stream Voice Recognition and Retire File-Lookup Seam)

**Status:** resolved

- [x] `RecitationSessionOptions` accepts only `voiceInput?: VoiceInput`, completely removing `recorder` and `transcriber` fields.
- [x] `RecitationSession` forwards live acoustic volume metering directly to `VoiceActivityDetector` from `VoiceInput.onMeter`.
- [x] `RecitationSession.test.ts` is updated to inject `SimulatedVoiceAdapter` without mocking `audioRecorder` or `transcriber`.
- [x] Hands-free silence auto-completion and full test suite across the application pass cleanly with zero errors.
