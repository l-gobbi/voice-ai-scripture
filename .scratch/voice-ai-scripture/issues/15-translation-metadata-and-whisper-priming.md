# 15: Translation Metadata in VerseEngine & Whisper Language Priming

**What to build:**
Upgrade the `Verse` domain model in `VerseEngine` to store `translation: string` (e.g. `'WEB' | 'KJV' | 'ALMEIDA' | 'ONBV' | 'CUSTOM'`), persisting translation metadata across storage adapters and maintaining backward compatibility with existing saved verses. Update `SpeechTranscriber` to accept an optional `language?: string` option and update `RecitationSession` to dynamically prime OpenAI Whisper with `language: 'pt'` when reciting Portuguese verses (`ALMEIDA`, `ONBV`) and `language: 'en'` for English verses (`WEB`, `KJV`).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Update `Verse` entity in `src/services/VerseEngine.ts` to include `translation?: string`.
- [ ] In `VerseEngine`:
  - `addVerse(reference, text, translation?)` accepts and persists `translation`, defaulting to `'WEB'` for English and `'ALMEIDA'` for Portuguese references when omitted.
  - `updateVerse(id, updates)` allows switching translation while preserving existing `streak`, `repetitions`, `intervalDays`, and review history.
  - `parse()` gracefully falls back to `'WEB'` for legacy stored verses lacking a translation field.
- [ ] In `src/services/SpeechTranscriber.ts`:
  - Update `TranscriptionOptions` to accept optional `language?: string`.
  - In `WhisperTranscriber.transcribe()`, append `formData.append('language', options.language ?? 'en')`.
- [ ] In `src/services/RecitationSession.ts`:
  - In `stopAndVerify()`, inspect `this.verse.translation`. If translation is `'ALMEIDA'` or `'ONBV'`, pass `language: 'pt'` in transcription options; otherwise pass `language: 'en'`.
- [ ] Write unit tests in `src/services/VerseEngine.test.ts` and `src/services/SpeechTranscriber.test.ts` verifying translation persistence and Whisper language parameter forwarding.
