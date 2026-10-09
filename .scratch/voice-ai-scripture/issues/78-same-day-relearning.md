# 78: Same-Day Relearning

**What to build:**
After an Official Review graded `forgotten`, offer "let's fix it again" in the verse's language: Cloze Practice, then Blind Recitation again, at most twice. The learner can decline at any time. Relearning attempts are Practice Attempts, so the verse is still due tomorrow, and they appear in the Review Log as practice. See spec and CONTEXT.md (Same-Day Relearning).

**Blocked by:** 72: Review Log and Official Review Classification, 73: Error Budget Grading

**Status:** ready-for-agent

- [ ] After a `forgotten` Official Review, the Recitation Session exposes a relearning offer with 2 loops remaining.
- [ ] Accepting moves to Level 2, then Level 3. Each relearning Blind Recitation uses one loop, and the offer stops when no loops remain or the learner recalls the verse.
- [ ] Declining clears the offer.
- [ ] Relearning attempts never change the schedule.
- [ ] The Review Screen shows the offer with accept and decline (en/pt).
- [ ] Recitation Session and Review Screen tests cover offer, accept, loop exhaustion and decline.
