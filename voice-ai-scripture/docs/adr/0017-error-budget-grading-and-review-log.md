# 0017: Error-Budget Grading and a Review Log, Keeping SM-2 for Launch

## Context
Blind Recitation passed whenever the word-level F1 score reached 80. That lets a learner miss about a third of a verse's words and still advance. Recognizer failures (empty transcripts, recognizer errors) and transcription artefacts (spoken references, digits) were graded as memory failures. ADR 0011/0012 also capped a Word-Peeked recitation at 75% and treated it as an "assisted pass", so a peek could turn a fail into a pass. Nothing kept a history of attempts, so the schedule could not be audited, calibrated or migrated. The October 2026 research note `docs/research/spaced-repetition-sm2-vs-fsrs.md` showed that the grade, not the algorithm, was the main source of bad schedules.

## Decision
1. **Error Budget replaces the 80% threshold.** A Blind Recitation is recalled when its unaided errors stay within 5% of the verse's words (never less than one). Unaided errors are missed words, Word-Peeked words, and added words beyond a small allowance. Synonyms and reordered words are errors. Zero errors maps to SM-2 quality 5. Errors within budget map to quality 4. Anything over budget is a fail at quality 2, which lowers ease by 0.32 (floor 1.3) as in Woźniak's SM-2.
2. **The Word Peek cap and "assisted pass" are retired.** This supersedes the 75% cap in ADR 0011 and ADR 0012. Each peeked word counts against the Error Budget. The promise of no punitive reset moves to presentation: verses show a Memory Tier instead of a per-verse streak count.
3. **Recognizer failures are never graded.** An empty transcript or recognizer error becomes a Transcription Error, refunds the recitation quota and asks the learner to retry.
4. **One Official Review per verse per Study Day.** Only the first Blind Recitation of a Due Verse on a Study Day (local day starting at 04:00) advances the schedule. Every other attempt is a Practice Attempt.
5. **Schedules are counted in Study Days, capped at 365 days, with about ±5% fuzz on intervals of 3 days or more.**
6. **An append-only Review Log records every attempt** with its raw outcome (word counts, peeks, recognizer, timing), separate from the verse records and sharded by month. Deleting a verse deletes its log rows (ADR 0009).
7. **SM-2 stays the scheduler for launch.** FSRS-6 was considered and is better calibrated on Anki data. It was not adopted because it is unproven on recited scripture, its default parameters come from flashcards, and it showed no workload saving against this app's SM-2. The Review Log makes a later switch a replay of history rather than a migration.

## Consequences
- More recitations fail than before, by design. Same-Day Relearning (Cloze, then Blind Recitation again) is offered after a fail and is logged as practice.
- PRODUCT.md's mention of FSRS describes a possible future, not the current scheduler.
- A future FSRS adoption should replay the Review Log with `ts-fsrs` and record its own ADR.
