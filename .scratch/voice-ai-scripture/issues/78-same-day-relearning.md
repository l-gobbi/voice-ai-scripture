# 78: Same-Day Relearning

**What to build:**
After an Official Review graded `forgotten`, offer "let's fix it again" in the verse's language: Cloze Practice, then Blind Recitation again, at most twice. The learner can decline at any time. Relearning attempts are Practice Attempts, so the verse is still due tomorrow, and they appear in the Review Log as practice. See spec and CONTEXT.md (Same-Day Relearning).

**Blocked by:** 72: Review Log and Official Review Classification, 73: Error Budget Grading

**Status:** done

- [x] After a `forgotten` Official Review, the Recitation Session exposes a relearning offer with 2 loops remaining.
- [x] Accepting moves to Level 2, then Level 3. Each relearning Blind Recitation uses one loop, and the offer stops when no loops remain or the learner recalls the verse.
- [x] Declining clears the offer.
- [x] Relearning attempts never change the schedule.
- [x] The Review Screen shows the offer with accept and decline (en/pt).
- [x] Recitation Session and Review Screen tests cover offer, accept, loop exhaustion and decline.
