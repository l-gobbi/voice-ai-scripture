# 58: Streamline Native Stream Voice Recognition and Retire File-Lookup Seam

**What to build:**
Streamline on-device streaming speech recognition so it functions purely on real-time microphone buffers through `NativeStreamVoiceAdapter`. Retire the dummy audio URI lookup pattern in `NativeSpeechTranscriber.ts`, delete `NativeSpeechTranscriber.ts`, and direct native recognition callers to `NativeStreamVoiceAdapter`.

**Blocked by:** 57 (Eliminate Global Audio Stores & Encapsulate Cloud Audio Adapter)

**Status:** resolved

- [x] On-device speech recognition operates entirely through `NativeStreamVoiceAdapter` with live metering and zero audio file I/O.
- [x] `src/services/NativeSpeechTranscriber.ts` and `src/services/NativeSpeechTranscriber.test.ts` are safely deleted.
- [x] `createDefaultVoiceInput` and speech factories select between `CloudAudioVoiceAdapter` and `NativeStreamVoiceAdapter` without file-based native transcriber indirection.
- [x] Streaming voice input and speech synthesis test suites pass cleanly.
