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

### Monetization & Access

**Paywall**:
The modal prompt that appears when an unsubscribed user attempts a Voice AI recitation after exhausting their free trial quota.
_Avoid_: Upgrade screen, subscription gate, purchase popup

**Quota**:
The limited allowance of complimentary Voice AI recitations (default: 3) granted to free users before requiring a premium subscription.
_Avoid_: Free credits, tokens, trial tries

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
