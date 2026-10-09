# 73: Error Budget Grading

**What to build:**
Replace the F1 ≥ 80 pass threshold with the Error Budget. Unaided errors are missed words or Word-Peeked words, each canonical position counted once, plus added words beyond an allowance of two. The budget is 5% of the verse's words, never less than one. Zero errors is `clean` (SM-2 quality 5), errors within the budget are a `slip` (quality 4), and anything over the budget is `forgotten` (quality 2: ease −0.32 with a 1.3 floor, back to 1 Study Day). Peeks are tracked as word positions. The 75% cap, the "assisted pass" and the score-75 special case disappear. The result screen states the outcome (recalled / recalled with a slip / needs work) and the error count against the budget, in the verse's language, with the percentage as secondary detail. See spec and ADR 0017.

**Blocked by:** 72: Review Log and Official Review Classification

**Status:** ready-for-agent

- [ ] The recitation evaluator returns tokens, raw F1, error count, Error Budget and an outcome of `clean`, `slip` or `forgotten`.
- [ ] The SM-2 engine takes the outcome (not a score) and applies quality 5/4/2 with Woźniak's ease formula (quality 2 lowers ease by 0.32, floor 1.3).
- [ ] The Recitation Session tracks peeked word positions and passes them to grading. A peek counts as one error.
- [ ] Missing 6 of 20 words is `forgotten`; missing 1 of 25 is a `slip`; a perfect recitation with 2 filler words is `clean`.
- [ ] Synonyms and reordered words count as errors.
- [ ] Review Log rows record the error count, the Error Budget, the outcome and the SM-2 quality.
- [ ] The result screen shows the outcome and errors versus budget in en/pt.
- [ ] PRODUCT.md states that SM-2 is the launch scheduler and FSRS is a possible future.
- [ ] Tests that encoded the 80% threshold, the 75% cap or the assisted pass are rewritten to the new rules.
