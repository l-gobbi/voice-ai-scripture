# 63: Consolidate Audio Recording, Cloud Transport & Atomic Cleanup inside CloudAudioVoiceAdapter

**What to build:**
Encapsulate platform audio recording (`AudioDriver`) and cloud speech transcription (`WhisperTranscriber`/`GroqTranscriber`) directly inside `CloudAudioVoiceAdapter`. Audio file creation, multipart assembly, and atomic temporary file deletion (`finally`) are self-contained within the adapter. Delete the shallow 28-line pass-through class `AudioRecorderService`, making audio drivers private implementation details of cloud voice capture.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Platform audio drivers (`NativeAudioDriver` and `WebAudioDriver`) and multipart assembly are encapsulated directly inside `VoiceInput.ts`
- [x] `CloudAudioVoiceAdapter` manages audio recording and transcription end-to-end, guaranteeing atomic file cleanup (`deleteAudioFile` in a `finally` block) upon success, transcription failure, or cancellation
- [x] Shallow `AudioRecorderService` class wrapper is deleted
- [x] Existing `VoiceInput.test.ts` asserts `CloudAudioVoiceAdapter` behavior cleanly using simulated/mock audio drivers without depending on `AudioRecorderService`
