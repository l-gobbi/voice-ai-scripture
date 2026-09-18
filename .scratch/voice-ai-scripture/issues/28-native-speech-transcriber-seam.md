# 28: Native Speech Transcriber Seam

**What to build:** Implement an on-device `NativeSpeechTranscriber` that conforms to the repository's `SpeechTranscriber` seam (`transcribe(audioUri: string, options?: TranscriptionOptions): Promise<TranscriptionResult>`), enabling offline, zero-cost voice recitation verification on iOS and Android devices without requiring cloud API keys.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Create `src/services/NativeSpeechTranscriber.ts` implementing `SpeechTranscriber`.
- [ ] Connect the native transcription adapter to device speech recognition facilities with language priming support (`en-US` and `pt-BR`).
- [ ] Integrate with `createDefaultTranscriber()` factory so that users without an OpenAI API key fall back gracefully to native dictation on physical devices (and simulated transcriber in mock/dev environments).
- [ ] Implement `MockNativeSpeechTranscriber` (or configurable test double) in unit tests.
- [ ] Write unit tests in `src/services/NativeSpeechTranscriber.test.ts` verifying transcription pipeline, options handling, language setting, and error conditions.
- [ ] Ensure all existing test suites and TypeScript typechecking remain 100% green.
