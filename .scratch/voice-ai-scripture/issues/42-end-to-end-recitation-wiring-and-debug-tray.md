# 42: End-to-End Recitation Wiring & Developer Acoustic Debug Tray

**What to build:**
Connects the ultra-fast Groq Whisper transcriber with the canonical projected verification engine inside `RecitationSession` and `ReviewScreen`. Retains the raw recognized transcript for diagnostics, and renders an Acoustic Debug Tray in development mode (`__DEV__`) toggled via long-press on the scripture reference header to inspect what speech recognition transcribed in real time.

**Blocked by:** 40: Diacritic-Lenient Verification & Canonical Scripture Projection, 41: Groq Cloud Whisper Transcriber Adapter

**Status:** ready-for-agent

- [x] `RecitationSession` retains `rawTranscript` in `VoiceRecitationResult` and session state.
- [x] `ReviewScreen` renders canonical tokens with attached punctuation in `DiffView`.
- [x] Long-pressing the scripture reference header in `__DEV__` toggles the Acoustic Debug Tray showing the active speech engine and raw transcript.
- [x] Acoustic Debug Tray is completely hidden and inert in production builds.
- [x] `useRecitationSession` and `ReviewScreen` tests pass without regressions.
