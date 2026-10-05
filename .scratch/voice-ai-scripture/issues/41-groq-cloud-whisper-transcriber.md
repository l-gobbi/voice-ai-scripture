# 41: Groq Cloud Whisper Transcriber Adapter

**What to build:**
Integrates Groq's ultra-low-latency Whisper API (`whisper-large-v3-turbo`) behind the `SpeechTranscriber` seam. Reads `EXPO_PUBLIC_GROQ_API_KEY`, sends audio to Groq's OpenAI-compatible endpoint with canonical scripture prompt conditioning (`prompt` & `language`), maps HTTP errors to domain `TranscriptionError`, and updates factory precedence to prioritize Groq over OpenAI.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `GroqTranscriber` posts multipart audio to `https://api.groq.com/openai/v1/audio/transcriptions` with `model: 'whisper-large-v3-turbo'`.
- [x] Scripture context `prompt` and `language` parameters are forwarded to Groq for acoustic priming.
- [x] HTTP 401/403, 429, 400, and 500 status codes map accurately to typed `TranscriptionError` instances.
- [x] `createDefaultTranscriber` resolves `EXPO_PUBLIC_GROQ_API_KEY` first, falling back to `EXPO_PUBLIC_OPENAI_API_KEY` (using `gpt-transcribe`), then `NativeSpeechTranscriber`.
- [x] `SpeechTranscriber.test.ts` covers `GroqTranscriber` requests, authorization headers, prompt conditioning, and error handling.
