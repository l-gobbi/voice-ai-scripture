# 45: Unified VoiceInput Seam & Streaming Adapters

**What to build:**
A unified `VoiceInput` lifecycle seam (`start()`, `stop()`, `cancel()`) that collapses separate audio recording and speech transcription modules. Provides a zero-disk-I/O streaming adapter for on-device native speech recognition, an auto-purging cloud audio adapter for Groq/OpenAI Whisper, and an in-memory simulation adapter for automated testing.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] `VoiceInput` defines a cohesive contract: `start(options)`, `stop(): Promise<{ transcript: string }>`, `cancel()`.
- [x] `NativeStreamVoiceAdapter` captures live dictation via on-device speech recognition with volume metering callbacks, producing zero audio files on disk (privacy by default).
- [x] `CloudAudioVoiceAdapter` records transient audio, uploads to Groq Cloud Whisper (`whisper-large-v3-turbo`) or OpenAI Whisper with `temperature: 0` and prompt conditioning, and atomically purges transient audio upon completion.
- [x] `SimulatedVoiceAdapter` provides predictable transcripts and volume ticks for test suites without hardware audio dependencies.
- [x] Eliminates module-global transcript maps (`nativeTranscriptStore`, `webTranscriptStore`) from audio capture.
- [x] Unit tests verify each adapter against volume metering, error handling, and clean cancellation.
