# 64: Excise Retired SpeechTranscriber and AudioRecorderService Seams from RecitationSession & UI Layers

**What to build:**
Remove the obsolete `transcriber?: SpeechTranscriber` prop and synthetic bridging adapters from `RecitationSession`, `useRecitationSession`, `ReviewScreen`, and `HomeScreen`. All application callers and tests communicate exclusively through the single `VoiceInput` seam (using `SimulatedVoiceAdapter` for tests and previews).

**Blocked by:** 63: Consolidate Audio Recording, Cloud Transport & Atomic Cleanup inside CloudAudioVoiceAdapter

**Status:** ready-for-agent

- [x] `RecitationSessionOptions`, `useRecitationSession`, `ReviewScreenProps`, and `HomeScreenProps` remove `transcriber?: SpeechTranscriber` and `recorder?: AudioRecorderService`
- [x] Synthetic bridging logic constructing `SimulatedVoiceAdapter` from `transcriber` in `RecitationSession` constructor is deleted
- [x] Callers and unit tests inject `VoiceInput` directly (e.g. `new SimulatedVoiceAdapter(...)` or `createDefaultVoiceInput(...)`)
- [x] TypeScript typecheck passes with 0 errors across the entire codebase
