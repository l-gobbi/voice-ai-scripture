# Voice-AI Scripture Memory

A mobile-first application designed to help Christians memorize scripture through auditory recitation, word-by-word visual verification, and Spaced Repetition scheduling.

## Language

### Core Domain

**Verse**:
A specific passage of biblical scripture identified by a canonical reference (e.g., Book Chapter:Verse) and its corresponding text in a chosen translation.
_Avoid_: Scripture item, card, passage, quote

**Recitation**:
An attempt by the user to speak a verse out loud from memory into the device microphone for evaluation.
_Avoid_: Recording, voice note, speech test

**Recitation Session**:
The complete lifecycle of a single recitation attempt, coordinating audio capture, quota verification, transcription, diff verification, and instantaneous audio file deletion.
_Avoid_: Recording flow, review run, voice job

**Verification**:
The computational process of comparing a user's spoken recitation against the canonical text of a verse to detect accuracy and mistakes.
_Avoid_: Grading, checking, validation, correction

**Diff Token**:
A discrete normalized word result produced by alignment during verification, classified as `correct`, `missed`, or `added`.
_Avoid_: Diff chunk, word status, diff node

**Verse Removal**:
The permanent removal of a stored verse and its associated Spaced Repetition scheduling data from the user's repository.
_Avoid_: Trashing, erasing, dropping verse, discard card

### Memory & Learning

**Spaced Repetition (SRS)**:
The adaptive scheduling algorithm (SuperMemo-2 based) that determines the next review date for a verse based on past repetition performance and accuracy score.
_Avoid_: Leitner box, schedule engine, flashcard timer

**Streak**:
The count of consecutive successful review sessions completed for an individual verse without failing or resetting.
_Avoid_: Score, level, repetitions count

**Due Verse**:
A verse whose scheduled next review date is earlier than or equal to the current calendar date and time.
_Avoid_: Expired verse, pending card, review queue item

**Verse Summary**:
An aggregate snapshot of a user's memory repository containing all stored verses, the subset of currently due verses, and the total count of due verses requiring review today.
_Avoid_: Verse list payload, due stats, cards summary

**Review Recording**:
The domain operation of recording a completed study session (manual pass/fail or voice recitation score) against a verse, advancing its Spaced Repetition interval and streak.
_Avoid_: SRS sync, score save, update progress

### Monetization & Rate Limiting

**Abuse-Prevention Rate Limit**:
A hybrid two-tier protective guardrail consisting of: (1) a 10 recitations/minute burst throttle triggering a brief devotional breathing pause, and (2) a 500 recitations/day ceiling that seamlessly falls back to free on-device native speech recognition, protecting cloud resources while ensuring learners are never blocked or confronted with commercial quota anxiety.
_Avoid_: Trial limit, credit system, paywall quota

**Subscription Manager**:
The domain module responsible for tracking user subscription tier and enforcing abuse-prevention rate limit allowances using an injectable storage adapter.
_Avoid_: Billing service, purchase controller, paywall state

### Sensory & Practice Experience

**Waveform Visualizer**:
A real-time animated graphic representing live microphone audio volume and frequency while the user is actively speaking their recitation.
_Avoid_: Audio meter, volume bar, recording indicator

**Topical Pack**:
A curated bundle of thematically related verses (e.g. Peace, Faith, Strength) pre-loaded with public domain translations to eliminate manual input friction.
_Avoid_: Verse deck, category list, collection

**Quiet-Time Reminder**:
A daily scheduled local push notification sent at a user-specified hour reminding them of pending due verses.
_Avoid_: Push alarm, streak alert, notification ping

**Floating Microphone Button**:
A circular interactive touch target centered at the bottom of the recitation screen that initiates voice capture, displays live acoustic state, and allows manual recitation completion.
_Avoid_: Record button, mic toggle, start button

**Silence Auto-Completion**:
The automatic detection of sustained silence following active recitation that automatically triggers the transition to verification without requiring a manual tap.
_Avoid_: Auto-stop, silence cutoff, speech ender

**Thinking Grace Period**:
The designated silence window permitted during active recitation to accommodate natural pauses while the user recalls scripture from memory before auto-completion is engaged.
_Avoid_: Pause timer, delay cutoff, thinking countdown

### Audio & AI Infrastructure

**Speech Transcriber**:
The pluggable adapter seam responsible for converting recorded recitation audio into text (backed by OpenAI Whisper or offline simulation).
_Avoid_: STT service, audio parser, voice translator

**Simulated Transcriber**:
An offline-capable test and development implementation of the Speech Transcriber that yields predictable text without making external network calls or requiring an API key.
_Avoid_: Mock STT, fake whisper, test transcriber

**Transcription Error**:
A domain-level error representation classifying transcription failures (such as network loss, authentication failure, or rate limits) distinctly from verse recitation scoring.
_Avoid_: Whisper error, API crash, audio failure

**Warm Standby Audio Driver**:
The background pre-initialization mechanism that routes audio channels (`setAudioModeAsync`) and prepares native hardware recording buffers (`prepareToRecordAsync`) upon screen mount, enabling synchronous <15ms audio capture without opening-syllable clipping when the user touches down on the floating microphone button.
_Avoid_: Audio cache, pre-recorder, mic daemon

**Acoustic Translation Metadata Prompting**:
The practice of supplying only canonical metadata (e.g., `Bíblia Sagrada. Tradução: ALMEIDA. Referência: Salmos 23:1.`) into Whisper's prompt parameter while strictly omitting verbatim verse text, guiding vocabulary and theological register while preventing autoregressive repetition loops over initial audio noise.
_Avoid_: Whisper system prompt, text conditioning, verse priming

### Scripture & Translation Infrastructure

**Translation**:
A recognized textual and linguistic edition of the Bible (such as `WEB`, `KJV`, `ASV`, `ALMEIDA`, `ONBV`, or `CUSTOM`).
_Avoid_: Bible version string, text dialect, bible flavor

**Bible Provider**:
The pluggable adapter seam responsible for querying and resolving canonical scripture passages by reference and translation.
_Avoid_: Bible client, scripture fetcher, passage scraper

**Reference Normalization**:
The algorithmic translation of abbreviated or regional book inputs (e.g., `Jo 3:16`, `Rm 8:28`, `1 Co 13:4`) into canonical reference strings before provider resolution.
_Avoid_: Name cleaning, string fix, reference parse

**Reference Picker**:
A guided three-stage drill-down modal (Book → Chapter → Verse) allowing users to visually select canonical scripture references and ranges with offline chapter/verse validation.
_Avoid_: Bible selector, passage dropdown, book explorer

### Scaffolded Learning & Recitation

**Practice Mode**:
An unpenalized study sandbox encompassing Echo Mode and Cloze Practice. Allows learners to build familiarity without consuming trial quota or affecting Spaced Repetition intervals.
_Avoid_: Study zone, training screen, drill area

**Echo Mode (Level 1)**:
An auditory-first recitation mode where the verse is vocalized via Speech Synthesis with text concealed by default, testing auditory recall before visual exposure.
_Avoid_: Listen mode, audio read, repeat step

**Cloze Practice (Level 2)**:
A visual retrieval scaffolding mode where words are displayed as first letters followed by blanks (e.g. `F___ G__ s_ l____`). Tapping a blanked word reveals it inline.
_Avoid_: Fill-in-the-blanks, letter game, masked words

**Blind Recitation (Level 3)**:
The official active recall mode where the user recites from memory with text blanked. Evaluated by Myers diff verification and recorded into Spaced Repetition scheduling.
_Avoid_: Master mode, final exam, test recitation

**Word Peek Lifeline**:
An interactive assistance action in Blind Recitation that temporarily reveals a selected blanked word for 3 seconds, capping the session's Spaced Repetition score at 75% to schedule reinforcement without a punishing streak reset.
_Avoid_: Word cheat, peek button, hint peek

**Speech Synthesis**:
The native text-to-speech engine responsible for vocalizing scripture verses according to their inferred canonical language (`en` or `pt`).
_Avoid_: Robot voice, audio reader, speaker tool

**Native Speech Transcriber**:
An on-device speech recognition implementation of the Speech Transcriber seam utilizing OS dictation services (Apple Speech / Google SpeechRecognizer) for offline, zero-cost voice verification.
_Avoid_: Free STT, phone microphone parser, offline voice reader
