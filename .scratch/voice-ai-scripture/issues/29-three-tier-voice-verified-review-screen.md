# 29: Three-Tier Voice-Verified ReviewScreen with Word Peek & SRS Gating

**What to build:** Refactor `ReviewScreen` to feature a three-tier segmented control (`[1. Echo | 2. Practice | 3. Recite]`), equipping all three levels with real voice AI verification. Incorporate `clozeEngine` and `SpeechSynthesizer`: Level 1 vocalizes text while concealed by default with a "Reveal Text" lifeline; Level 2 presents first-letter blanks with tap-to-reveal words and on-demand vocalization; Level 3 blanks all words, allows a 3-second temporary Word Peek Lifeline that caps the attempt at 75%, and serves as the sole gateway for Spaced Repetition (SRS) streak and quota updates.

**Blocked by:** 26, 27, 28

**Status:** ready-for-agent

- [ ] Update `ReviewScreen` UI with a 3-tier segmented control replacing the previous two-state Practice/Test toggle.
- [ ] **Level 1 (Echo Mode)**: Conceal verse text by default; provide a "Reveal Text" toggle; trigger `SpeechSynthesizer.speak()` on entry or replay tap; enable microphone recording for voice AI verification with feedback displayed; practice is unmetered and does not consume quota or record SRS updates.
- [ ] **Level 2 (Cloze Practice)**: Render first-letter blanks using `clozeEngine.generateClozeTokens(text, 'first-letter')`; allow tapping any blanked word to reveal it persistently inline for that session; provide an on-demand audio vocalization button; enable microphone recording for voice AI verification with feedback; practice is unmetered and does not consume quota or record SRS updates.
- [ ] **Level 3 (Blind Recitation)**: Render all-blank tokens using `clozeEngine.generateClozeTokens(text, 'blank')`; allow tapping any blanked word to trigger a 3-second temporary Word Peek Lifeline (reveals word, flags `assistanceUsed = true`, then re-hides); enable microphone recording for voice AI verification; evaluate score using `evaluateAssistedScore()`; gate trial quota deduction and official SRS progress update strictly to this level.
- [ ] Write integration tests in `src/screens/ReviewScreen.test.tsx` verifying segmented navigation across all 3 levels, voice recording on each level, Level 1 text reveal, Level 2 persistent tap-to-reveal, Level 3 3-second temporary peek and 75% score capping on recorded SRS review.
- [ ] Ensure all 20+ test suites and TypeScript typechecking remain 100% green.
