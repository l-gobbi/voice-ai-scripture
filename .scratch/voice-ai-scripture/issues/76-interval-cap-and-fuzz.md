# 76: Interval Cap and Fuzz

**What to build:**
Keep every verse in the learner's life and spread reviews out.
- SM-2 intervals are capped at 365 days, so every verse comes back at least once a year.
- Intervals of 3 days or more are multiplied by a factor in [0.95, 1.05] from an injectable random source, rounded, and never brought below 3, so verses imported together from a Topical Pack stop falling due on the same days.
- The cap applies after fuzz.

See spec and ADR 0017.

**Blocked by:** 71: Study Day for Due Dates, Quota and Habit Streak

**Status:** done

- [x] The Verse Engine accepts an injectable random source (default `Math.random`) and the SM-2 engine applies fuzz with it.
- [x] Intervals of 1–2 days are never fuzzed.
- [x] No interval exceeds 365 days.
- [x] Tests with a seeded random source cover the fuzz bounds and the cap.
