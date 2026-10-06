# 57: Eliminate Global Audio Stores & Encapsulate Cloud Audio Adapter

**What to build:**
Eliminate out-of-band global memory caches (`nativeTranscriptStore`, `webTranscriptStore`) in the audio recorder service. Encapsulate transient AAC file recording, cloud Whisper multipart generation, and guaranteed atomic cleanup inside `CloudAudioVoiceAdapter`. Retire the deprecated `WhisperService` wrapper function.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `nativeTranscriptStore` and `webTranscriptStore` are deleted from `AudioRecorderService.ts`.
- [x] `src/services/WhisperService.ts` and `src/services/WhisperService.test.ts` are retired and deleted.
- [x] `CloudAudioVoiceAdapter` manages transient recording and guarantees atomic file deletion upon completion or error.
- [x] `AudioRecorderService.test.ts` and `VoiceInput.test.ts` pass cleanly with zero regression.
