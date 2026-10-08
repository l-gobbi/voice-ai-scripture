# 68: Warm Standby Audio Driver & Pre-Warming Seam

**What to build:**
Deepen the `AudioDriver` and `VoiceInput` seams with an asynchronous `warmUp()` method to pre-configure native audio mode routing and pre-allocate the audio recorder in warm standby. When `startRecording()` is called on a warmed driver, audio capture begins synchronously in <15ms, eliminating cold-start latency and opening-syllable audio clipping while providing safe cold-start fallback.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `AudioDriver` interface includes optional `warmUp(options?: AudioRecordingOptions): Promise<void>`.
- [x] `NativeAudioDriver` implements `warmUp()` by setting audio mode and preparing the native recorder in advance.
- [x] Calling `startRecording()` on a pre-warmed `NativeAudioDriver` begins recording immediately without awaiting mode switching or preparation.
- [x] Calling `startRecording()` without `warmUp()` safely falls back to calling `warmUp()` before recording.
- [x] `VoiceInput` interface includes optional `warmUp(): Promise<void>`.
- [x] `CloudAudioVoiceAdapter` delegates `warmUp()` to `this.driver.warmUp?.()`.
- [x] `SimulatedVoiceAdapter` provides a no-op `warmUp()` for hermetic unit testing.
- [x] Unit tests in `VoiceInput.test.ts` verify warm-up delegation and instantaneous recording execution.
