# 05: voice-ai-verification-flow

**What to build:** The killer feature. Wire the Whisper transcript into the Diff Engine to render a color-coded visual diff and automatically grade the user's recitation.

**Blocked by:** 03-text-flashcard-review, 04-voice-recording-and-whisper

**Status:** closed

- [x] Add a "Voice Verify" mode to the Review screen.
- [x] Pass the Whisper transcript (from 04) and the expected verse text into the Diff Engine (from 02).
- [x] Render the output array as colored text (e.g., green for correct, red/strikethrough for missed).
- [x] Use the automated score from the Diff Engine to trigger the SRS update.
