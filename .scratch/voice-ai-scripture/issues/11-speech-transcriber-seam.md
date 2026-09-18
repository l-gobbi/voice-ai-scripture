# 11: Pluggable Speech Transcriber Seam & Adapters

**What to build:**
A formalized Ports & Adapters boundary for speech-to-text audio transcription. Defines the canonical `SpeechTranscriber` interface and `TranscriptionResult`, with prompt conditioning support for biblical vocabulary. Implements production `WhisperTranscriber` (remote OpenAI Whisper client with prompt conditioning and typed domain error mapping), offline `SimulatedTranscriber` (zero-configuration prompt echo and custom handler overrides for tests), and `createDefaultTranscriber()` factory encapsulating environment API key resolution. Legacy `WhisperService.ts` is refactored to delegate to `WhisperTranscriber` to preserve backwards compatibility.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Declare `SpeechTranscriber` interface with `transcribe(audioUri: string, options?: TranscriptionOptions): Promise<TranscriptionResult>`.
- [ ] Declare `TranscriptionOptions` with optional `prompt?: string` for Biblical text conditioning.
- [ ] Declare typed `TranscriptionError` with error codes: `'network_error' | 'unauthorized' | 'rate_limited' | 'unintelligible' | 'unknown'`.
- [ ] Implement `WhisperTranscriber`:
  - [ ] Appends `prompt` to multipart FormData if present in options.
  - [ ] Maps OpenAI HTTP error responses (401/403 -> `unauthorized`, 429 -> `rate_limited`, 400/422 -> `unintelligible`, 5xx/network failure -> `network_error`) into `TranscriptionError`.
- [ ] Implement `SimulatedTranscriber`:
  - [ ] Returns `{ text: options?.prompt }` by default if `prompt` is provided (simulating 100% accurate recitation).
  - [ ] Supports custom handler function in constructor options for deterministic error and typo test scenarios.
- [ ] Implement `createDefaultTranscriber(apiKey?: string)` factory:
  - [ ] Returns `WhisperTranscriber` if API key is present.
  - [ ] Returns `SimulatedTranscriber` if API key is absent.
- [ ] Refactor `src/services/WhisperService.ts` to delegate `transcribeAudio` to `WhisperTranscriber` with `@deprecated` annotation.
- [ ] Write comprehensive unit tests in `src/services/SpeechTranscriber.test.ts` verifying all adapters, prompt forwarding, and error mappings.
