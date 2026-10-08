# 69: Instant Recitation Turn-Taking & Haptic Feedback in Review Screen

**What to build:**
Integrate pre-warming into `RecitationSession`, `useRecitationSession`, and `ReviewScreen` so that the audio driver is automatically warmed up when the user enters the review screen. Connect instant audio capture to the floating microphone button with light haptic feedback on touch down, allowing learners to speak in the exact millisecond of touch with zero onset clipping.

**Blocked by:** 67: Acoustic Translation Metadata Prompting & Hallucination Elimination, 68: Warm Standby Audio Driver & Pre-Warming Seam

**Status:** done

- [x] `RecitationSession.warmUp()` pre-checks permissions and delegates to `voiceInput.warmUp()`.
- [x] `useRecitationSession` automatically triggers `session.warmUp()` upon mount.
- [x] `ReviewScreen` coordinates pre-warming when the verse screen displays.
- [x] Tapping the floating microphone button provides subtle haptic confirmation (`Haptics.impactAsync(Light)` if available).
- [x] The microphone button transitions to recording state instantly (<15ms) without an intermediary frozen delay.
- [x] Integration tests in `ReviewScreen.test.tsx` verify warm-up lifecycle and instant recitation triggering.
