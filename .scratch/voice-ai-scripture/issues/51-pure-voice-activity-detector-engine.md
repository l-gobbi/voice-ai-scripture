# 51: Pure Voice Activity Detector Engine with Thinking Grace & Delayed Arc

**What to build:** An autonomous silence and speech detection state machine (`VoiceActivityDetector`) that monitors real-time audio volume levels to detect when a learner is reciting, accommodates natural 2–3s pauses to remember scripture without cutting them off, computes a delayed visual progress arc that remains invisible for the first 1.5s of silence, and triggers auto-completion after 3.5s of sustained silence.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Measures ambient room noise in the first 300ms to establish an adaptive dynamic noise floor
- [x] Enforces an initial 10-second silence grace period before emitting an initial timeout if no speech is detected
- [x] Requires at least 1.0 second of cumulative audible speech before arming silence auto-completion
- [x] Computes delayed silence progress arc: reports 0 progress during the first 1.5 seconds of silence, and scales smoothly from 0 to 1 over the remaining 2.0 seconds (1.5s → 3.5s)
- [x] Instantly resets silence progress to 0 if the user resumes speaking
- [x] Emits auto-completion event upon reaching 3.5 seconds of continuous silence following speech
- [x] Fully cancellable: clears all internal intervals and timeouts on disposal without leaking memory
- [x] 100% test coverage using simulated time and volume readings without hardware dependencies
