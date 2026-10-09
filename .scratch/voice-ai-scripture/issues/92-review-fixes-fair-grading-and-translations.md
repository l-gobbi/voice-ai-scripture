# 92: Review Fixes for Fair Grading and Translations

**What to build:**
Fix the findings of the two-axis code review of `cab5678...b8984ab` (tickets 71–85) that are worth fixing before the work is pushed. They come from the Standards review and the two Spec reviews (fair grading and translations).

**Blocked by:** 86: Decks as First-Class and the Decks Screen (both edit the Verse Engine and Home Screen)

**Status:** ready-for-agent

**Defects**
- [ ] **Practice is never metered.** Today `isUnmetered={!isDue}` passes `false` for a Due Verse, and `options?.unmetered ?? (level !== 3)` never reaches the level check, so Echo Mode and Cloze Practice on a Due Verse (including the Cloze step of Same-Day Relearning) consume quota. Only Level 3 on a Due Verse may be metered, per the spec. The screen must not be able to force metering.
- [ ] **No quota leak without a recitation.** The 10-second no-speech timeout, a learner cancelling a metered recitation, and `voiceInput.start()` failing after the unit was consumed must all refund the unit. The no-speech timeout is a Transcription Error (`unintelligible`): logged with its code and a null outcome, showing the calm "nothing was counted" notice.
- [ ] **ONBV derivative-work compliance.** Removing Psalm titles changes ONBV, and eBible's licence text says a changed work must list its changes (already in `changes`) **and** state "The original Work by its copyright holders is available for free at open.bible." Add that statement to ONBV's metadata and show it on the Translations & Copyright screen.

**Standards (hard)**
- [ ] **Delete the public `recordReview` from the Verse Engine.** It moves the schedule without a Review Log row, against ADR 0017 §6. Rewrite its tests to go through `recordAttempt` (or a test-local helper over it).
- [ ] **Replace `recognizerOf`'s `instanceof` checks** on concrete adapters with a `recognizer` property on the `VoiceInput` interface (ADR 0006 ports and adapters).
- [ ] **Glossary alignment.** CONTEXT.md avoids "Grading" and "graded attempt"; it now defines **Recitation Outcome**. Rename `GRADING_RULE_ID`/`gradingRuleId` to `VERIFICATION_RULE_ID`/`verificationRuleId`, and `gradedAttemptRow` to `verifiedAttemptRow` (no users, so no data migration). Change the copy "Nothing was graded" to "Nothing was counted" (pt "Nada foi contado"). Remove "Unmetered" from user-facing attempt labels.
- [ ] **No emoji in the new attempt-label copy** (✅ 🎉 🔄), per DESIGN.md.

**Spec gaps**
- [ ] **Pin the ONBV notice in a test:** assert the exact four-line notice as a literal, not only against the catalog's own string.
- [ ] **Map the `no-match` error string** to `unintelligible` as well (harmless and matches the spec).
- [ ] **The add-verse picker derives its bundled chips from `getBundledTranslations()`** instead of hard-coding them. Every non-bundled label the catalog recognizes (including NLT, MSG and ASV) is offered in the own-text group, so a pasted label is never coerced to CUSTOM.
- [ ] **Make the dataset integrity test strict:**
  - fail on any book id not in the canon;
  - fail on verse 0;
  - fail on any extra verse anywhere in a chapter, not only directly after the last canon verse;
  - check markers in all verses present.

**Cheap smell fixes**
- [ ] **One language type:** export a single `Language = 'en' | 'pt'` type and replace the local aliases (`PreferenceLanguage`, `VerseLanguage`, …).
- [ ] **Reuse `isRecalled`:** the SM-2 engine uses it instead of re-implementing it.
- [ ] **Clear names:**
  - rename `SandboxAttempt` (used for every kept attempt) to a name that says what it is;
  - rename `translationsModalVisible` on the Home Screen to match the Copyright modal it opens;
  - give the two `MAX_NUMBER_WORDS` constants distinct, honest names.
- [ ] **Lookup tables:** `outcomeLabel` and `outcomeTone` become a single outcome lookup table, like `RELEARNING_COPY`.

**General**
- [ ] The full suite passes, and `npx tsc --noEmit` is clean.

**Explicitly not changed (decided):**
- A transcript that contains only the spoken reference stays `forgotten`, because the learner recited none of the verse.
- The acoustic prompt fallback for verses without a translation stays at the catalog default: every new verse now gets a translation.
- `importVerses` / `importDeck` duplication is left to the deck tickets (89).
- Larger refactors (shared modal header, moving copy out of the Verse Engine) are deferred.
