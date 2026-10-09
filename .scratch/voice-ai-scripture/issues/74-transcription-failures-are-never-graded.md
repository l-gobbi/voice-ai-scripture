# 74: Transcription Failures Are Never Graded

**What to build:**
When the app fails to hear the learner, never grade it as a memory failure.
- On Android, the on-device adapter keeps every final segment plus the current partial, so a pause no longer discards earlier speech.
- Recognizer error events are recorded. If speech was captured, the transcript is used. If the transcript is empty, stop raises a Transcription Error with a mapped code.
- An empty transcript after normalization, from any engine, is a Transcription Error.
- A Transcription Error is not evaluated: it is logged with its code and no outcome, and the quota unit it consumed is refunded.
- The learner sees a calm retry message in the verse's language saying nothing was graded and no recitation was used.

See spec.

**Blocked by:** 72: Review Log and Official Review Classification

**Status:** done

- [x] The native adapter concatenates final segments across pauses (fake speech module test).
- [x] An error after real speech still returns the transcript. An error with no speech throws a Transcription Error mapped as: no-speech/no-match → `unintelligible`; network → `network_error`; language-not-supported/audio-capture/service-not-allowed → `unavailable`; other → `unknown`.
- [x] An empty transcript becomes a Transcription Error in the Recitation Session and never reaches the evaluator or the schedule.
- [x] The Subscription Service gains a refund operation for the current Study Day, and the session uses it when a metered attempt ends in a Transcription Error.
- [x] Review Log rows for these attempts carry the error code and a null outcome.
- [x] The Review Screen shows the retry message (en/pt) and no score.
