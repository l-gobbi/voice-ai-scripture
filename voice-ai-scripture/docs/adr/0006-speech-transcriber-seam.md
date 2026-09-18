# 0006: Pluggable Speech Transcriber Seam (Ports & Adapters)

We decided to formalize a pluggable `SpeechTranscriber` interface backed by two first-class adapters—`WhisperTranscriber` (remote OpenAI Whisper STT with prompt conditioning) and `SimulatedTranscriber` (zero-configuration offline echo/mocking)—rather than having `RecitationSession` and screen components inspect environment variables and implement inline simulation fallbacks.

Previously, `RecitationSession` and `VoiceSpikeScreen` directly checked `process.env.EXPO_PUBLIC_OPENAI_API_KEY` and contained hardcoded fallbacks to verse text or timers. This leaked infrastructure concerns, prevented uniform testing of recitation failures, and tied domain workflows directly to OpenAI's raw HTTP response formats.

Under this architecture:
1. **Ports & Adapters Boundary**: Callers interact exclusively with the `SpeechTranscriber` interface (`transcribe(audioUri, options)`).
2. **Environment & Key Encapsulation**: A factory `createDefaultTranscriber()` evaluates API keys once; callers never inspect `process.env`.
3. **Biblical Vocabulary Conditioning**: The `options.prompt` parameter allows `RecitationSession` to prime Whisper with canonical scripture text and references, dramatically reducing transcription errors on archaic English and biblical proper nouns.
4. **Offline Development & Headless Testing**: `SimulatedTranscriber` defaults to echoing the supplied prompt text for a seamless developer loop without API keys, while supporting configurable handlers for deterministic failure and typo testing.
5. **Typed Domain Errors**: Raw network, authorization, and rate-limit HTTP failures are mapped to structured `TranscriptionError` instances, preventing infrastructure outages from being recorded as memorization failures.
