# Specification: Fair Grading, Review Log & Study-Day Scheduling

**Status:** ready-for-agent  
**Domain:** Verification / Spaced Repetition / Recitation Lifecycle  
**Governing Documents:** `CONTEXT.md`, `docs/adr/0001-deterministic-dp-diffing-over-llm-evaluation.md`, `docs/adr/0005-deep-verse-engine-domain-architecture.md`, `docs/adr/0009-hard-deletion-with-custom-confirmation-modal.md`, `docs/adr/0012-deepen-recitationsession-with-scaffolding-and-lifelines.md`, `docs/adr/0017-error-budget-grading-and-review-log.md`  
**Research:** `docs/research/spaced-repetition-sm2-vs-fsrs.md` (§2.2, §7, §8 "Now"), `docs/research/feature-and-improvement-opportunities.md` (E-R1, V1, V2)

---

## Problem Statement

The app's promise is "you recite, the app checks, and spaced review makes the verse stay". Today the checking and the scheduling both betray that promise:

1. **Forgetting a third of a verse still passes.** A Blind Recitation passes at a word-level F1 of 80, so a learner can drop 6 of 20 words and the verse moves on to a longer interval.
2. **The app's own failures are graded as the learner's memory failures.**
   - An empty transcript, or an on-device recognizer error, is scored 0 and resets the verse.
   - On Android, a pause can throw away everything said before it, because only the last recognized segment is kept.
   - Saying the reference out loud ("João 3:16…") or the recognizer writing "3" for "três" counts as mistakes.
   - A failed transcription still uses up the day's recitation quota.
3. **The Word Peek Lifeline is inconsistent.** A recitation at 76–79% *with* a peek becomes an "assisted pass", while the same score *without* a peek is a fail.
4. **Days don't match how people live.** A verse recited at 21:00 is due at 21:00 the next day, not at the next morning's quiet time. A recitation at 00:30 counts as a different day from one at 23:30.
5. **One sitting can advance a verse several steps.** "Practice Again" on a Due Verse records another review each time, so three passes in a row jump a verse from 1 to 16 days.
6. **History is invented or lost.**
   - Saving the sandbox verse records a perfect review that never happened.
   - Nothing records the attempts themselves, so the schedule can't be audited, calibrated, or moved to a better algorithm later.
7. **The display punishes at the worst moment.**
   - After a failure, the verse card shows "Streak: 0".
   - "Mastered" is an arbitrary 21-day interval.
   - After a lapse, the verse's ease is left untouched, so it races back out to long intervals before it's really relearned.

## Solution

Grade the learner's memory, not the recognizer, with a strict but humane rule. Record every attempt, and schedule in the learner's own days. The algorithm stays SM-2 for launch (ADR 0017).

1. **Error Budget grading.**
   - A Blind Recitation is *recalled* when its unaided errors fit within 5% of the verse's words, never less than one.
   - Unaided errors are missed words and Word-Peeked words, plus added words beyond an allowance of two.
   - Synonyms and reordered words are errors.
   - Zero errors is a clean recall, errors within the budget are a slip, and anything over the budget is forgotten.
2. **Transcription failures never become grades.**
   - An empty transcript or recognizer error becomes a Transcription Error.
   - The quota is refunded, and the learner is asked to try again.
   - On Android, every recognized segment is kept.
   - A spoken reference at the start or end is ignored, and digits match spelled-out numbers in en and pt.
3. **One Official Review per verse per Study Day.**
   - Only the first Blind Recitation of a Due Verse on a Study Day moves the schedule.
   - Everything else is a Practice Attempt: Echo Mode, Cloze Practice, Practice Again, Same-Day Relearning, early recitations and the sandbox.
4. **SM-2, corrected.**
   - A clean recall is quality 5 (ease +0.10), a slip is quality 4 (ease unchanged) and forgotten is quality 2 (ease −0.32, floor 1.3, back to 1 day).
   - Intervals are counted in Study Days, capped at 365 days, and spread by about ±5% when they are 3 days or longer.
5. **Study Days.**
   - The day starts at 04:00 local time.
   - Due dates, the daily quota and the daily habit streak all use it.
6. **Review Log.**
   - An append-only record of every attempt, official or practice, with enough raw data to re-derive grades later.
   - Deleting a verse deletes its log.
7. **Same-Day Relearning.** After a failed Official Review, the app offers "let's fix it again": Cloze Practice, then Blind Recitation, at most twice. It is never forced.
8. **Memory Tier replaces the per-verse streak and "mastered".** Verses show Seed, Growing, Rooted or Hidden in the Heart, in the verse's language (pt: Semente, Crescendo, Enraizado, Guardado no coração).
9. **Honest sandbox.** A saved sandbox verse starts as a new, due verse, and its sandbox recitation is kept as a Practice Attempt with its real score.

## User Stories

1. As a learner, I want a recitation where I forgot several words to count as "not yet", so that I'm not told I know a verse I don't.
2. As a learner, I want a one-word slip in a long verse to still count as recalled, so that I'm not sent back to the start for a single stumble.
3. As a learner, I want the allowed slips to grow with the verse's length, so that long passages and short verses are judged fairly.
4. As a learner, I want a synonym ("Deus" for "Senhor") to count as an error, so that I memorize the exact wording.
5. As a learner, I want swapped word order to count as an error, so that I memorize the verse as written.
6. As a learner, I want a word or two of extra filler ("é…", a repeated word) not to fail me, so that natural speech doesn't cost me a verse.
7. As a learner, I want each word I peeked at to count as one error, so that a peek is honest help rather than a loophole.
8. As a learner, I want peeking at one word in a long verse to still let me pass if the rest is perfect, so that the lifeline stays useful.
9. As a learner, I want a recitation the recognizer couldn't hear at all to ask me to try again instead of failing me, so that the app's problems don't erase my progress.
10. As a learner, I want an on-device recognizer error to show a calm retry message, so that I understand nothing was graded.
11. As a learner on Android, I want everything I said before a pause to be kept, so that pausing to think doesn't wipe my recitation.
12. As a learner, I want saying the reference before or after the verse not to count as a mistake, so that I can recite the way I learned it in church.
13. As a learner, I want "3" and "três" (or "three") to be treated as the same word, so that the recognizer's number formatting doesn't fail me.
14. As a learner, I want a failed transcription not to use up my daily recitations, so that I'm not charged for the app's failure.
15. As a learner, I want a verse I recite at 23:00 to be due on the next morning's quiet time, so that my schedule follows my days.
16. As a learner who recites after midnight, I want 00:30 to count as the same day as 23:30, so that late-night devotion isn't split across two days.
17. As a learner, I want Practice Again after my first recitation of a Due Verse to be practice only, so that repeating it doesn't jump the verse weeks ahead.
18. As a learner, I want reciting a verse that isn't due yet to count as practice, so that I can rehearse freely without disturbing the schedule.
19. As a learner, I want Echo Mode and Cloze Practice never to change my schedule, so that scaffolding stays a safe sandbox.
20. As a learner who just failed a verse, I want the app to offer to fix it again right away (first letters, then from memory), so that I leave with the verse restored.
21. As a learner, I want to be able to decline the relearning offer, so that I stay in control of my quiet time.
22. As a learner, I want the relearning offer to stop after two rounds, so that a hard day doesn't turn into a loop.
23. As a learner, I want relearning attempts not to change the schedule further, so that a failed verse still comes back tomorrow.
24. As a learner, I want a verse I forgot to come back sooner and grow more slowly than before, so that it gets properly reinforced.
25. As a learner, I want a verse I recite perfectly to grow its interval a bit faster than one with slips, so that clean recall is rewarded.
26. As a learner, I want every verse to come back at least once a year, so that I keep meeting the verses hidden in my heart.
27. As a learner who imported a Topical Pack, I want its verses not to all fall due on the same days forever, so that my reviews spread out.
28. As a learner, I want each verse card to show its Memory Tier (Seed, Growing, Rooted, Hidden in the Heart), so that I see growth instead of a fragile count.
29. As a learner, I want a forgotten verse to go back to Seed without a "Streak: 0" message, so that failure feels like replanting, not punishment.
30. As a Portuguese-speaking learner, I want Memory Tiers and new messages in Portuguese for Portuguese verses, so that the app speaks my language.
31. As a learner, I want my daily habit streak to follow the same Study Day, so that reciting at 00:30 keeps yesterday's streak alive.
32. As a learner, I want the daily recitation quota to reset at the start of my Study Day, so that limits match my day.
33. As a learner trying the sandbox, I want my saved verse to start as a new verse, so that the app never invents a perfect review I didn't do.
34. As a learner trying the sandbox, I want my sandbox recitation to be remembered as practice with its real score, so that my history is truthful.
35. As a learner deleting a verse, I want its whole history deleted too, so that deletion is real and private.
36. As a learner, I want the result screen to say clearly whether the verse was recalled, recalled with a slip, or needs work, so that the percentage doesn't mislead me.
37. As the product owner, I want every attempt recorded with its raw outcome, so that we can audit grading and later evaluate a better scheduler without losing anyone's progress.
38. As the product owner, I want the log to record which recognizer produced each transcript and any failure code, so that we can measure recognizer quality per device and language.
39. As the product owner, I want the log to record the grading rule and scheduler version on each row, so that grades can be re-derived when the rules change.
40. As a developer, I want grading, classification and scheduling testable headlessly with a controllable clock and random source, so that day boundaries and fuzz are deterministic in tests.
41. As a developer, I want PRODUCT.md, CONTEXT.md and the ADRs to state that SM-2 is the launch scheduler, so that nobody builds on the FSRS promise by mistake.

## Implementation Decisions

**Study Day (new pure module)**
- One pure module owns the Study Day rule: map an instant to its Study Day using local time with a 04:00 rollover, compare Study Days, add N Study Days, and count Study Days between two instants.
- The rollover hour is a constant (04:00), not a user setting.
- Every other module asks this module; none computes local days itself.

**Diff and grading (pure engines)**
- **Normalization before alignment:**
  - Digits and spelled-out numbers are treated as equal in both en and pt (cardinals at least 0–1000, including multi-word forms such as "vinte e três").
  - This extends the existing comparison-key normalization, which already handles diacritics and honorific abbreviations (ADR 0014). Alignment stays deterministic DP (ADR 0001).
- **Spoken-reference stripping:**
  - Before diffing, a leading or trailing utterance matching *this verse's own* reference is removed: a book name or alias from the canon data, plus chapter and verse numbers, in digits or words.
  - Nothing in the middle of the transcript is removed, and no other reference is matched.
- **The recitation evaluator returns a grade, not just a score.** Its output includes:
  - the diff tokens and the raw F1 score (kept for display and for the log);
  - the unaided error count and the Error Budget;
  - the outcome: `clean`, `slip` or `forgotten`.
- **Error count:** canonical words that were missed **or** peeked (counted once each, by position), plus `max(0, added − 2)`.
- **Budget:** `max(1, round(0.05 × canonical word count))`.
- **Peeks are passed as word positions,** not a boolean. The 75% cap, the assisted-pass branch and the score-75 special case are removed.

**SM-2 engine (pure)**
- **Input:** the current SRS state plus the outcome (`clean`/`slip`/`forgotten`), the Study Day of the review and a random source.
- **Mapping:** `clean` → quality 5, `slip` → quality 4, `forgotten` → quality 2. Ease follows Woźniak's formula for every quality, so quality 2 gives −0.32, with a floor of 1.3. `forgotten` resets repetitions to 0 and the interval to 1 Study Day.
- **Intervals on recall:** 1, then 6, then the previous interval × ease, rounded.
- **Fuzz:** intervals of 3 days or more are multiplied by a factor in [0.95, 1.05] from the injected random source, rounded, and never brought below 3.
- **Cap:** the interval is capped at 365 days after fuzz.
- **Due date:** the result's due date is a Study Day (review Study Day + interval).

**Verse Engine (deepened)**
- **Single entry point:** one operation records an attempt (verse, evaluated outcome, level, peek positions, recognizer, timing, `now`) and decides internally whether it is an Official Review. The rule is: Level 3, the verse is due on the current Study Day, and it has no Official Review on that Study Day yet.
  - Official Reviews update the SRS state.
  - Every attempt, official or not, is appended to the Review Log.
  - It returns the classification, the new SRS state and the Memory Tier.
  - Callers no longer pass "unmetered" or "assistance used" flags to decide scheduling.
- **Due dates:**
  - `nextReviewDate` is persisted as a Study Day (calendar-date string).
  - Legacy ISO timestamps are read as the Study Day they fall in, so no migration is needed (the app has no users yet).
  - "Due" means the due Study Day is today or earlier.
- **Memory Tier** is derived from the interval: under 7 days Seed, under 30 Growing, under 180 Rooted, and 180 or more Hidden in the Heart. A verse that has never been officially reviewed is Seed. The 21-day "mastered" check is removed.
- **Daily habit streak:** its completed days and last active day use Study Days.
- **Delete:** deleting a verse also deletes its Review Log rows (ADR 0009).
- **Saved sandbox verse:** created as a new verse, due today. The sandbox's Blind Recitation is appended as a Practice Attempt with its real outcome.
- **Random source:** the engine accepts an injectable random source for fuzz (default `Math.random`).

**Review Log (new module behind the existing storage adapter)**
- **Storage:** append-only and separate from the verse records. Rows are sharded by month under their own storage keys, with an index of shard keys so deletion and queries don't scan unknown keys.
- **Operations:** append, list a verse's rows, and delete a verse's rows. Rows are never edited.
- **Row fields:**
  - identity and version: id, schema version, verse id;
  - timing: UTC instant, local UTC offset in minutes, Study Day, duration;
  - classification: kind (`official`/`practice`), level 1–3, translation, a hash of the canonical text, canonical word count;
  - raw outcome: correct, missed and added counts, raw F1 score, peeked word positions, Cloze reveal count, error count, Error Budget, outcome (null when the attempt ended in a Transcription Error);
  - recognizer: `native`/`cloud`/`simulated`, plus the Transcription Error code if any;
  - scheduling: whether the verse was due, grading-rule id, scheduler id, SM-2 quality given, interval and ease before and after, and the due Study Day after.
- **Echo Mode attempts** with no recitation (listening only) are not logged; recitations at any level are.

**Recitation Session (deepened)**
- **Peeks:** tracks peeked word positions for the current attempt instead of an "assistance used" boolean.
- **Recording:** sends every completed attempt (all levels) to the Verse Engine's single attempt operation, and receives the classification back. `officialResult` is the attempt the engine classified as official.
- **Sandbox:** in sandbox mode the verse is not stored yet, so nothing is recorded. The session keeps its last Blind Recitation attempt so that saving the verse can hand it to the Verse Engine.
- **Empty transcripts:** a transcript that is empty after normalization becomes a Transcription Error. Transcription Errors are never sent to the evaluator; they are logged with their code and no outcome.
- **Quota refund:** when a metered attempt ends in a Transcription Error, the session refunds that quota unit.
- **Same-Day Relearning state:** after an Official Review graded `forgotten`, the session exposes a relearning offer with the loops remaining (starting at 2).
  - Accepting moves to Level 2, then Level 3, and each relearning Level 3 attempt uses one loop.
  - Declining clears the offer.
  - Relearning attempts are Practice Attempts by the engine's rule.
- **Clock:** the session accepts an injectable clock (`now`), defaulting to the system time, and passes it to the Verse Engine.
- **Quota metering is unchanged:** Level 3 on a Due Verse is metered, and other attempts are unmetered.

**Subscription Service**
- The daily quota key uses the Study Day.
- A new refund operation returns one unit for the current Study Day and drops the most recent burst timestamp.

**On-device voice adapter**
- **Segments:** the native adapter keeps the final segments plus the current partial, and the transcript is their concatenation. This fixes Android discarding speech before a pause.
- **Errors:** recognizer error events are recorded.
  - On stop, if the accumulated transcript is non-empty it is returned, so a trailing error after real speech is ignored.
  - If it is empty and an error occurred, stop throws a Transcription Error with a mapped code: no-speech and no-match → `unintelligible`; network → `network_error`; language-not-supported, audio-capture and service-not-allowed → `unavailable`; anything else → `unknown`.

**UI**
- **Verse cards and the delete confirmation:** show the Memory Tier instead of "Learning (Streak: N)", the mastered badge and the streak line. The daily habit streak banner stays.
- **Review result:**
  - It states the outcome in the verse's language: recalled, recalled with a slip, or needs work.
  - It shows the error count against the budget, with the percentage as secondary detail.
  - After a forgotten Official Review it offers Same-Day Relearning, with accept and decline.
- **Transcription Error state:** a calm retry message in the verse's language that says nothing was graded and no recitation was used.
- **Sandbox save:** creates the new verse through the Verse Engine path above. The save-dialog wording is left to the onboarding effort.
- **Copy language:** all new copy follows the existing per-verse language convention (en/pt).

**Docs**
- PRODUCT.md is corrected to SM-2 at launch, with FSRS as a possible future (ADR 0017).
- CONTEXT.md terms are already updated: Study Day, Error Budget, Review Log, Practice Attempt, Official Review, Memory Tier and Same-Day Relearning, plus the updated Due Verse, Word Peek Lifeline and Transcription Error.

## Testing Decisions

**What a good test looks like.** Tests drive public behavior through the highest existing seam and assert observable outcomes:
- the result returned;
- the session state;
- the stored verse's due Study Day, interval, ease and Memory Tier;
- the Review Log rows;
- the remaining quota;
- what the user sees on screen.

Tests do not assert private helpers or call order. A controllable clock and random source make day boundaries and fuzz deterministic.

**Seams (agreed):**
1. **Recitation Session**, the primary seam. Headless, with the simulated voice input, in-memory storage, a real Verse Engine, a real Subscription Service and an injected clock. It covers:
   - the Error Budget outcomes, peeks as errors, spoken-reference stripping and numerals;
   - official vs practice classification, including Practice Again, not-yet-due and the one-per-Study-Day rule;
   - Same-Day Relearning offers, loops and decline;
   - empty transcripts and Transcription Errors (no grade, quota refunded, logged with a code);
   - sandbox attempts.

   Prior art: the existing Recitation Session test suite (simulated voice adapter, map storage adapter, subscribed service).
2. **Verse Engine**, for scheduling and persistence. It covers:
   - Study-Day due dates across the 04:00 boundary;
   - the SM-2 mapping and the ease drop on forgotten;
   - the 365-day cap and fuzz bounds, with a seeded random source;
   - Memory Tier thresholds;
   - legacy timestamp reading;
   - the habit streak on Study Days;
   - deleting a verse removes its log;
   - the saved sandbox verse being new and due.

   Prior art: the existing Verse Engine suite, which already passes `now`.
3. **Native voice adapter with a fake speech module.** It covers segment concatenation across pauses, a trailing error after speech returning the transcript, and an error with no speech throwing a mapped Transcription Error. Prior art: VoiceInput suite, "Slice 3: NativeStreamVoiceAdapter".
4. **Screens**, for the visible parts only. It covers:
   - the Memory Tier on verse cards and in the delete modal;
   - the outcome wording and error count on the result;
   - the relearning offer and decline;
   - the Transcription Error retry message;
   - the sandbox save creating a due, new verse.

   Prior art: the existing Home Screen and Review Screen suites.

**Pure engines:** the diff, evaluator and SM-2 engine keep their own fast unit tests where they already exist. New edge cases are added there only when they are awkward to reach through seam 1 (for example the number-word tables).

**Tests that encode retired rules** (the 80% threshold, the 75% cap, the assisted pass, the 24-hour due window) are rewritten to the new rules, not deleted silently.

The full suite must stay green (currently 35 suites, 360 tests).

## Out of Scope

- **FSRS:** adopting FSRS in shadow or live mode, and retention presets. The Review Log keeps it possible later (ADR 0017).
- **Text and recognition:**
  - stripping `{…}` and `[…]` markers from KJV/ALMEIDA text (translations and licensing effort);
  - grading whether the spoken reference is *correct*;
  - homophone tables, clitic or contraction tolerance, and an edit-distance "close" tier;
  - on-device-first recognizer configuration (locale and on-device checks, contextual strings, a real volume meter).
- **Passages and scheduling:**
  - chunked or progressive passage scheduling;
  - a "Review all due" queue, adaptive entry level for new verses, and backlog ordering;
  - a configurable rollover hour;
  - telemetry or any upload of the Review Log;
  - a move to SQLite.
- **Onboarding:** sandbox copy, the save-dialog wording and onboarding flow changes (onboarding effort).

## Further Notes

- **Memory Tier after a failure.** Under SM-2 a forgotten verse returns to a 1-day interval, so its Memory Tier returns to **Seed**. The tier never shows a "0", which is the point of the change.
- **More recitations will fail than before.** That is intended. Same-Day Relearning and the Memory Tier wording exist to keep that humane.
- **A future FSRS adoption** should replay the Review Log rather than convert SM-2 state, and get its own ADR.
