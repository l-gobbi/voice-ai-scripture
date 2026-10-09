# 72: Review Log and Official Review Classification

**What to build:**
Record every recitation attempt, official or practice, in an append-only Review Log, and let the Verse Engine decide which attempt is an Official Review. Only the first Blind Recitation of a Due Verse on a Study Day moves the schedule. Echo Mode and Cloze Practice recitations, Practice Again, and recitations of verses that are not yet due become Practice Attempts: logged, but never scheduled. This fixes "Practice Again" advancing a verse several steps in one sitting. Deleting a verse deletes its log. See spec and ADR 0017.

**Blocked by:** 71: Study Day for Due Dates, Quota and Habit Streak

**Status:** done

- [x] A Review Log module lives behind the existing storage adapter. It is append-only, separate from the verse records and sharded by month with an index of shard keys. It can append, list a verse's rows, and delete a verse's rows.
- [x] Each row carries the fields listed in the spec (identity, timing with Study Day and UTC offset, kind, level, translation, text hash, word count, raw outcome, recognizer, scheduling before/after, grading-rule id and scheduler id). Fields this ticket cannot fill yet (Error Budget, outcome) are optional and filled by later tickets.
- [x] The Verse Engine exposes one "record attempt" operation that classifies the attempt (official vs practice), updates SRS state only for Official Reviews, appends the log row, and returns the classification and new SRS state.
- [x] The Recitation Session sends every completed attempt at every level through that operation. `officialResult` reflects the engine's classification. Callers no longer decide scheduling through "unmetered" or assistance flags; quota metering is unchanged.
- [x] A second Blind Recitation of the same Due Verse on the same Study Day (Practice Again) is a Practice Attempt and leaves the schedule untouched.
- [x] A Blind Recitation of a verse that is not due is a Practice Attempt.
- [x] Deleting a verse removes its Review Log rows.
- [x] In sandbox mode nothing is recorded, because the sandbox verse is not stored yet (ticket 79 handles the save).
- [x] Tests at the Recitation Session seam (with an injectable clock) and the Verse Engine seam cover the classification rules and the log contents.
