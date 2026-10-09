# 71: Study Day for Due Dates, Quota and Habit Streak

**What to build:**
Make the learner's day start at 04:00 local time everywhere the app reasons about days. A verse recited at 23:00 becomes due on the next morning's quiet time, not 24 hours later. A recitation at 00:30 belongs to the same Study Day as one at 23:30. Due Verses, the "next review" message, the daily habit streak and the daily recitation quota all follow the Study Day. Previously stored due timestamps keep working, read as the Study Day they fall in (no migration; the app has no users). See spec "Fair Grading, Review Log & Study-Day Scheduling" and ADR 0017.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] A single pure Study Day module maps an instant to its Study Day (04:00 local rollover), compares Study Days, adds N Study Days and counts Study Days between instants. No other module computes local days itself.
- [x] A verse's due date is persisted as a Study Day. A verse is a Due Verse when its due Study Day is today or earlier.
- [x] Legacy ISO due timestamps are read as the Study Day they fall in.
- [x] Reviewing at 23:00 with a 1-day interval makes the verse due from 04:00 the next morning, and reviewing at 01:00 counts as the previous Study Day.
- [x] The "next review due …" message counts Study Days.
- [x] The daily habit streak (completed days, last active day) uses Study Days. Reciting at 00:30 keeps yesterday's streak alive.
- [x] The daily recitation quota resets at the start of the Study Day.
- [x] Tests at the Verse Engine and Subscription Service seams, using an explicit `now`, cover the 04:00 boundary. The existing 24-hour-window tests are rewritten.
