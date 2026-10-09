# Spaced Repetition: SM-2 vs FSRS, and What Fits Verbatim Scripture (October 2026 Research Pass)

**Author**: Research Agent
**Date**: 2026-10-08
**Status**: Completed
**Context**: Answers the product owner's question: "What is the difference between SM-2 and FSRS, or other memorization techniques, and what would be best for my app?" It goes deeper than Area 1 / §2 of [`feature-and-improvement-opportunities.md`](./feature-and-improvement-opportunities.md) (the "prior note"), re-checks that note's claims, and corrects them where needed (§9). It uses the glossary in `CONTEXT.md`: Verse, Recitation, Blind Recitation (Level 3), Cloze Practice (Level 2), Echo Mode (Level 1), Word Peek Lifeline, Streak, Due Verse, Review Recording.

**Evidence conventions** (same as the prior note)
- **Verified** means I read it in the primary source on 2026-10-08: source code, official docs, a paper's abstract or publisher page, or the npm/GitHub registry. The URL is given inline.
- Rows marked *sub-agent* were collected by a delegated research agent from the primary page. The load-bearing ones were re-fetched by me and are marked *re-fetched*.
- **Inference** marks my reasoning from verified facts.
- **Speculative** marks ideas with thin evidence.
- **UNVERIFIED** means a primary source could not be reached or found.
- **Simulation** marks numbers from my throwaway scripts in the session scratchpad. They copy `calculateNextReview` verbatim and use `ts-fsrs@5.4.2` with default parameters. They depend on stated assumptions and are not field data.
- Code citations are `file:line` in `voice-ai-scripture/src/`, read from the working tree on 2026-10-08.

---

## 1. TL;DR and recommendation

1. **SM-2 vs FSRS.** SM-2 (1987) multiplies the last interval by a per-verse "ease" and has no notion of how likely you are to remember. FSRS models each item's stability, difficulty and recall probability, and schedules for a retention you choose. On Anki data it is far better calibrated, even with default parameters (log loss 0.366 vs 0.616 for Anki's SM-2, §5.1).
2. **Here the grade matters more than the algorithm.** A "pass" is word-level F1 ≥ 80, which lets a learner drop about ⅓ of a verse's words and still advance, and ASR errors count as memory errors (§2.2).
3. **FSRS is not automatically less work.** With default parameters it schedules a perfectly recited verse further out than today's SM-2 (2, 11, 46, 163 d vs 1, 6, 16, 45 d). My simulation could not reproduce a workload saving against this app's (aggressive) SM-2 variant, and if verses are harder than Anki cards, default FSRS overshoots its lapse target (§4.6).
4. **Now (S), keeping SM-2:** a length-aware word-error budget mapped to pass/fail; no grade on ASR failures; an append-only review log; local calendar-day due dates (4 a.m. rollover); one schedule update per verse per day; no fabricated sandbox review.
5. **Next (M):** `ts-fsrs` 5.4.2 (FSRS-6, MIT, ~7 KB gzipped) behind a scheduler seam, in shadow mode for 6–8 weeks. Then cut over with Again/Good ratings, retention 0.90 (0.85 and 0.95 presets), fuzz on, and SM-2 state converted with fsrs-rs's formula. Show memory strength instead of a per-verse streak.
6. **Later (L):** app-wide "verse" parameters fitted on a server from opt-in logs; per-user fitting only after a few hundred reviews; FSRS-7 once `ts-fsrs` 6 is stable; chunked passages.
7. **Measure:** observed vs desired retention (±3 points), lapse rate, reviews per active day, and due-queue completion. If shadow mode shows FSRS is badly miscalibrated on verse data, stay on the fixed SM-2.

---

## 2. How the app schedules today

### 2.1 Trace: from recitation to due date (verified in code)

| Step | Code | Behaviour |
|---|---|---|
| Score | `engines/diffEngine.ts:122-142` | Myers alignment yields `correct`/`missed`/`added` tokens. The score is `round(F1 × 100)` of recall (words covered) and precision (no extra words). A substituted word counts as one `missed` plus one `added`. |
| Word Peek | `services/RecitationSession.ts:265-282`, `engines/recitationEvaluator.ts:42-43` | A tap at Level 3 sets `assistanceUsed` and the score is capped at 75. `practiceAgain()` (`RecitationSession.ts:243-256`) does not reset `assistanceUsed`. |
| Official or practice | `RecitationSession.ts:470`, `screens/HomeScreen.tsx:188`, `recitationEvaluator.ts:49-57` | Only a Level 3 attempt on a verse that is **due** is recorded. Levels 1–2, sandbox, and any recitation of a not-yet-due verse only *simulate* the schedule. |
| Grade | `engines/srsEngine.ts:13-14`, `:40-44` | Pass if score ≥ 80. "Assisted pass" if the score is exactly 75. Neither caller passes `assistanceUsed` (`recitationEvaluator.ts:46`, `services/VerseEngine.ts:392`), so the `options` branch is dead in production. |
| Interval | `srsEngine.ts:50-66` | Assisted pass: interval 1 d; streak and ease unchanged. Fail: streak 0, interval 1 d, **ease unchanged**. Pass: 1 d, then 6 d, then `round(previous × ease)`. |
| Ease | `srsEngine.ts:70-71` | Quality 5 if ≥ 95, 4 if ≥ 90, 3 if 80–89. Woźniak's EF formula with a 1.3 floor. Ease changes only on full passes. |
| Due date | `srsEngine.ts:74`, `:90-96` | `now + interval × 24 h`. A verse is due when that timestamp has passed. |
| Persist | `VerseEngine.ts:394-402` | Stores `streak`, `intervalDays`, `easeFactor`, `nextReviewDate` and `lastScore`. **No review time and no history.** |
| "Mastered" | `VerseEngine.ts:430-433` | Interval ≥ 21 days and not due. |
| New verse | `VerseEngine.ts:76-79`, `screens/ReviewScreen.tsx:79` | Due immediately; opens in Blind Recitation. |
| Sandbox save | `HomeScreen.tsx:155-171` | Writes `streak: 1, intervalDays: 1, easeFactor: 2.5, lastScore: 100`, due tomorrow, **whatever the sandbox score was**. |

### 2.2 Weaknesses

**W1. The pass threshold is length-blind and lenient (verified arithmetic on `diffEngine.ts:122-142`).** With misses only, F1 = 2(n−m)/(2n−m), so F1 ≥ 0.80 holds while m ≤ n/3.

| Verse length | Most missed words still scoring ≥ 95 (q=5, ease up) | ≥ 90 (q=4) | ≥ 80 (pass) |
|---|---|---|---|
| 10 words | 1 (10%) | 1 (10%) | 3 (30%) |
| 20 words | 2 (10%) | 3 (15%) | 6 (30%) |
| 40 words | 4 (10%) | 7 (18%) | 13 (32%) |
| 80 words | 8 (10%) | 15 (19%) | 27 (34%) |

For verbatim scripture, "forgot 6 of 20 words" is a failed recall by any everyday standard. Anki's rule for self-grading is "if it counts as a fail in a real-life context outside of Anki, then it counts as a fail in Anki as well" ([Anki manual, Studying](https://docs.ankiweb.net/studying.html)).

**W2. Recognizer errors are graded as memory errors.** The prior note documents this in detail (§3 there, items A1/V1/V6). The scheduler consumes the noise directly.

**W3. Ease erosion from noise.** 80–89 maps to q=3, which costs −0.14 ease per pass. *Simulation:* 9 such passes take ease from 2.5 to the 1.3 floor. Intervals still grow (1, 6, 13, 27, 52, 94, 156, 237, 327 d), but more slowly, and ASR noise decides which passes land in 80–89.

**W4. Deviations from Woźniak's SM-2** (§3.1, verified):
- Ease is never lowered on a fail. SuperMemo's reference code lowers it by 0.32–0.80.
- There is no step 7, the same-day re-drill "until all of these items score at least four".
- The "assisted pass" is a third outcome with no SM-2 analogue.
- *Simulation:* because ease stays high after a lapse, the relearned verse jumps back out quickly (1, 6, 18, 56 d with ease 2.9–3.2).

**W5. Timing is ignored.**
- An overdue success gets the same multiplier as an on-time one (`srsEngine.ts:64`).
- An *early* official recitation is not recorded at all (`HomeScreen.tsx:188` together with `RecitationSession.ts:470`), so a perfect recall of a not-yet-due verse teaches the scheduler nothing.
- Due times are "24 h after you last recited" rather than calendar days, so a verse recited at 21:00 is not due at the next morning's quiet time.

**W6. One sitting can advance a verse several steps.** On a due verse, "Practice Again" after an official result (`ReviewScreen.tsx:365` → `RecitationSession.ts:243-256`) keeps the session metered. The next Blind Recitation calls `recordReview` again (`RecitationSession.ts:486`), which re-reads the stored state. Three passes in one sitting give 1 → 6 → 16 days (*simulation* of `calculateNextReview`). I traced this in code but did not reproduce it on a device. Each attempt also consumes recitation quota.

**W7. Fabricated history.** Saving a sandbox verse records a perfect first review that never happened (`HomeScreen.tsx:163-170`).

**W8. No review log.** Only `lastScore` survives (`VerseEngine.ts:394-402`). With no history there is nothing to calibrate, optimise or migrate from. The last review time can be reconstructed as `nextReviewDate − intervalDays`, because due = review time + interval × 24 h.

**W9. No fuzz.** Verses imported together from a Topical Pack stay due on the same days.

**W10. A Word Peek can turn a fail into a pass.**
- A raw 76–79 *with* a peek is capped to 75 and becomes an "assisted pass" (streak kept, review tomorrow).
- The same 76–79 *without* a peek is a fail (streak reset).
- An unassisted score of exactly 75 is also treated as "assisted" (`srsEngine.ts:43`).

**W11. "Mastered" is an arbitrary 21-day interval** (`VerseEngine.ts:432`). Nothing in it relates to probability of recall.

**W12. The per-verse streak is shown and resets to 0 on any fail** (`HomeScreen.tsx:401`, `:497`). §7.4 explains why that is a poor motivation signal.

---

## 3. SM-2 explained

### 3.1 The original algorithm (Woźniak; verified, *sub-agent*, *re-fetched*)

Source: [SM-2 article](https://www-v1.supermemo.com/archives1990-2015/english/ol/sm2), "taken from P.A.Wozniak, Optimization of learning, Master's Thesis, University of Technology in Poznan, 1990 and adapted for publishing as an independent article on the web. (P.A.Wozniak, May 10, 1998)". It was used in "SuperMemo programs, versions 1.0-3.0 between December 13, 1987 and March 9, 1989".

- **State:** one number per item, the E-Factor, starting at 2.5 ("With all items associate an E-Factor equal to 2.5").
- **Intervals:** "I(1):=1 I(2):=6 for n>2: I(n):=I(n-1)*EF".
- **Grades:** "5 - perfect response 4 - correct response after a hesitation 3 - correct response recalled with serious difficulty 2 - incorrect response; where the correct one seemed easy to recall 1 - incorrect response; the correct one remembered 0 - complete blackout."
- **Ease update:** "After each repetition modify the E-Factor … EF':=EF+(0.1-(5-q)*(0.08+(5-q)*0.02))", with "If EF is less than 1.3 then let EF be 1.3". The change per grade (my arithmetic):

  | q | 5 | 4 | 3 | 2 | 1 | 0 |
  |---|---|---|---|---|---|---|
  | ΔEF | +0.10 | 0 | −0.14 | −0.32 | −0.54 | −0.80 |

- **Lapse:** "If the quality response was lower than 3 then start repetitions for the item from the beginning without changing the E-Factor (i.e. use intervals I(1), I(2) etc. as if the item was memorized anew)."
- **Same-day re-drill:** "After each repetition session of a given day repeat again all items that scored below four in the quality assessment. Continue the repetitions until all of these items score at least four."

**Ambiguity.** Step 5 says to update EF "after each repetition". Step 6 says to restart "without changing the E-Factor". SuperMemo's own Delphi reference plug-in ([sm2source](https://www-v1.supermemo.com/archives1990-2015/english/ol/sm2source), *re-fetched*) resolves it: the EF update runs **after** the pass/fail branch, so it applies on every grade.

```
end else begin Repetition:=0; Interval:=1; end;
EF:=EF+(0.1-(5-Grade)*(0.08+(5-Grade)*0.02)); if EF<1.3 then EF:=1.3;
```

The two main JS ports disagree with each other (*sub-agent*):
- [`supermemo`](https://github.com/VienDinhCom/supermemo/blob/master/src/main.ts) (MIT) updates EF on a fail, like the Delphi code.
- [`@open-spaced-repetition/sm-2`](https://github.com/open-spaced-repetition/sm-2-ts/blob/main/src/Scheduler.ts) (MIT) does not ("// EF doesn't change on incorrect responses").

**Inference.** The app's choice not to change ease on a fail is defensible under a literal reading of the prose. It is not what SuperMemo's code does.

**Woźniak's own verdict** ([The true history of spaced repetition](https://www.supermemo.com/en/blog/the-true-history-of-spaced-repetition), 2018, *sub-agent*): "Multiple evaluations done in 1989, and since, have pointed to an unquestionable superiority of Algorithm SM-5 and later algorithms over Algorithm SM-2 in any metric studied." He also explains SM-2's popularity: "Algorithm SM-2 became an easy first-choice option for other developers."

### 3.2 Known failure modes

| Failure mode | Mechanism | Primary evidence | In this app |
|---|---|---|---|
| **"Ease hell"** (Anki-community term, not Woźniak's) | Lapses and Hard answers push ease down. Only "Easy" (or q=5) pushes it back up, so ease ratchets toward the floor and intervals grow slowly forever. | Anki manual: "repeatedly failing a card after it has graduated from the learning phase could reduce its ease a lot, leading to what some people called 'ease hell'. This is not a problem that FSRS suffers from." ([deck options](https://docs.ankiweb.net/deck-options.html)) | Lapses do not lower ease (W4), but noisy 80–89 passes do (W3). The same ratchet, with ASR noise as the trigger. |
| **Low-ease spiral** | At ease 1.3 each success adds only 30% to the interval, so a once-hard item needs many reviews to reach long intervals, whatever you know now. | Follows from the formula. Anki's Good leaves ease unchanged (`answer_good` in [review.rs](https://github.com/ankitects/anki/blob/8127fd24884607d7c62bdd28675d9ab9cc53e005/rslib/src/scheduler/states/review.rs#L148-L155)). | *Simulation:* 10 passes at 85% give 425 d under SM-2 at ease 1.3, against 62 d under FSRS with an 85 → Hard mapping. The two algorithms disagree hugely about noisy passes (§7.1). |
| **No memory state** | SM-2 stores ease and interval, not probability of recall. It cannot credit an overdue success, discount an early review, rank a backlog by risk, or aim at a retention level. | SuperMemo's later algorithms exist to fix this. SM-17 uses "stability … retrievability" ([SM-17](https://web.archive.org/web/20260113084529/https://supermemo.guru/wiki/Algorithm_SM-17), Wayback, *sub-agent*). | W5. |
| **Sensitivity to the grading scale** | ΔEF is quadratic in (5−q). Whoever maps behaviour onto q controls the schedule. SM-2 assumed a careful human self-grader on six levels. | The formula. Anki narrowed it to four buttons with fixed deltas (§3.3). | The q mapping is three F1 bands (`srsEngine.ts:70`), and F1 is length-blind (W1). |
| **Poorly calibrated as a predictor** | SM-2 was never meant to output a probability. | Archived benchmark: SM-2 log loss 0.722, Anki-SM-2 0.616, FSRS-6 with defaults 0.366. The README itself warns that "SM-2 wasn't designed to predict probabilities" ([srs-benchmark @ f0cc681](https://github.com/open-spaced-repetition/srs-benchmark/blob/f0cc6814c0/README.md)). | §5. |

### 3.3 Anki's modified SM-2 (verified in source, [`rslib/src/scheduler/states/review.rs` @ 8127fd2](https://github.com/ankitects/anki/blob/8127fd24884607d7c62bdd28675d9ab9cc53e005/rslib/src/scheduler/states/review.rs))

- **Constants** (`#L16-L20`): starting ease 2.5, minimum 1.3, Again −0.20, Hard −0.15, Easy +0.15. Good leaves ease unchanged (`answer_good`, `#L148-L155`).
- **Good interval** = (current interval + days late ÷ 2) × ease (`#L241`). Easy = (current + days late) × ease × easy bonus (`#L248`), default 1.30. Hard = current × hard interval, default 1.20 (`#L225-L232`).
  - So Anki *does* give partial credit for overdue reviews; the app does not.
- **Lapse:** new interval = previous × "New interval" (default 0.00), then the minimum interval of 1 day (`#L84-L89`).
  - Manual: "SuperMemo has observed that preserving part of the delay can actually be counter-productive" ([deck options](https://docs.ankiweb.net/deck-options.html)).
- **Early reviews** use a separate formula carrying a `FIXME`: "it overly penalizes reviews done shortly before the due date" (`#L258-L260`).
- **Learning steps:** 1 m and 10 m, graduating interval 1 d, easy interval 4 d (test defaults in [learning.rs](https://github.com/ankitects/anki/blob/main/rslib/src/scheduler/states/learning.rs)).
- **Fuzz:** ±15% for 2.5–7 d, ±10% for 7–20 d, ±5% above 20 d ([fuzz.rs `#L16-L31`](https://github.com/ankitects/anki/blob/main/rslib/src/scheduler/states/fuzz.rs)). `ts-fsrs` uses identical ranges (`FUZZ_RANGES` in `help.ts`).
- **Licence:** Anki is AGPL-3.0-or-later ([LICENSE](https://github.com/ankitects/anki/blob/main/LICENSE)). Re-implement the formulas; do not copy the code.

---

## 4. FSRS explained

### 4.1 Lineage and versions (verified)

- **Papers.** FSRS "is based on MaiMemo's papers at ACM KDD and IEEE TKDE" ([ABC of FSRS](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS)).
  - Ye, Su & Cao, KDD 2022 ([doi:10.1145/3534678.3539081](https://doi.org/10.1145/3534678.3539081)): "220 million students' memory behavior logs … memory model with Markov property … stochastic shortest path … 12.6% performance improvement over the state-of-the-art methods". Deployed in MaiMemo, a language app.
  - Su, Ye, Nie, Cao & Chen, IEEE TKDE 2023 ([doi:10.1109/TKDE.2023.3251721](https://doi.org/10.1109/TKDE.2023.3251721)): "reduces 64% error and 17% cost in predicting recall rates and optimizing schedules compared to several baselines".
  - Both abstracts were read via Semantic Scholar's API.
- **Inference.** The papers describe the DSR idea and an optimal-scheduling method on vocabulary data. The formulas that ship today (FSRS-4.5 through FSRS-7) are specified in the open-spaced-repetition wiki and source code and evaluated on the open benchmark (§5.1). Neither the wiki nor the benchmark README cites a peer-reviewed paper for FSRS-6 or FSRS-7, and one targeted search on 2026-10-08 found none.
- **Versions** ([srs-benchmark README](https://github.com/open-spaced-repetition/srs-benchmark)):
  - FSRS-5: "uses the same-day review data to refine its prediction".
  - FSRS-6: "the formula for handling same-day reviews has been improved … an optimizable parameter that controls the flatness of the forgetting curve". 21 parameters.
  - FSRS-7: "designed to work with fractional interval lengths. It is the only version that can give realistic predictions of probability of recall for same-day reviews … the forgetting curve now has 8 optimizable parameters". 34 parameters, dual-trace.
- **In Anki:**
  - FSRS shipped in 23.10 ("Anki 23.10, AnkiMobile 23.10, and AnkiWeb all support it", [deck options](https://docs.ankiweb.net/deck-options.html)).
  - FSRS-6 shipped in 25.07 ("FSRS-6 brings further algorithm improvements", [25.07 release](https://github.com/ankitects/anki/releases/tag/25.07)).
  - Anki 26.09 (2026-09-14) moved to fsrs-rs 6.6.2 ([release](https://github.com/ankitects/anki/releases/tag/26.09)).
  - No Anki release note up to 26.09.3 mentions FSRS-7. The benchmark still writes in the future tense: "In Anki, FSRS-7 should be shipped with both recency weighting and scheduling penalties enabled". **That Anki ships FSRS-7 is UNVERIFIED.**
- **`ts-fsrs`** ([npm registry](https://registry.npmjs.org/ts-fsrs), checked 2026-10-08):
  - `latest` is 5.4.2 (2026-09-01), which reports `"v5.4.2 using FSRS-6.0"`.
  - `beta` is 6.0.0-beta.13 (2026-10-03). It ships `models/fsrs-3`, `fsrs-5`, `fsrs-6` and `fsrs-7`.
  - Its new `DefaultScheduler` defaults to FSRS-7 ([PR #531](https://github.com/open-spaced-repetition/ts-fsrs/pull/531), merged into the `preview` branch 2026-09-20). The legacy `fsrs()` factory still runs FSRS-6.

### 4.2 The DSR model (FSRS-6)

Definitions are from the ABC wiki; formulas are from `ts-fsrs` v5.4.2 source ([`packages/fsrs/src/algorithm.ts`](https://github.com/open-spaced-repetition/ts-fsrs/blob/v5.4.2/packages/fsrs/src/algorithm.ts)). All verified.

- **Retrievability R**: "The probability that the person can successfully recall a particular piece of information at a given moment."
- **Stability S**: "The time, in days, required for R to decrease from 100% to 90%."
- **Difficulty D** (1–10): "The inherent complexity of a particular information", which governs how fast S grows.

| Piece | Formula (w = the 21 parameters) | Code |
|---|---|---|
| Forgetting curve | R(t,S) = (1 + f·t/S)^(−w₂₀), with f = 0.9^(−1/w₂₀) − 1 so that R(S,S) = 0.9 ([wiki](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm)) | `computeDecayFactor`, `forgetting_curve` (`:22-56`) |
| Interval for desired retention r | I = S/f · (r^(−1/w₂₀) − 1). At r = 0.9, I = S. Rounded, capped, optionally fuzzed. | `calculate_interval_modifier` (`:92`), `next_interval` (`:222`) |
| First rating G | S₀ = w[G−1], i.e. Again 0.21 d, Hard 1.29 d, Good 2.31 d, Easy 8.30 d. D₀ = w₄ − e^((G−1)·w₅) + 1, clamped to [1,10]. | `:180-200` |
| Difficulty update | ΔD = −w₆(G−3), damped by (10−D)/9, then mean-reverted toward D₀(Easy) with weight w₇ (default 0.001, i.e. almost none) | `:233-260` |
| Success (Hard/Good/Easy) | S′ = S·(1 + e^(w₈)·(11−D)·S^(−w₉)·(e^(w₁₀(1−R)) − 1)·[w₁₅ if Hard]·[w₁₆ if Easy]) | `next_recall_stability` (`:277`) |
| Lapse (Again) | S′ = min(w₁₁·D^(−w₁₂)·((S+1)^(w₁₃) − 1)·e^(w₁₄(1−R)), S/e^(w₁₇·w₁₈)) | `next_forget_stability` (`:308`), `next_state` (`:390-400`) |
| Same day (t = 0) | S′ = S·e^(w₁₇(G−3+w₁₈))·S^(−w₁₉). The multiplier is forced ≥ 1 when G ≥ Hard. | `next_short_term_stability` (`:329`), used when `t === 0 && enable_short_term` (`:390`) |

**What the success formula encodes** (inference from the formula):
- Easier items grow faster: the (11 − D) term.
- Already-stable memories grow proportionally less: the S^(−w₉) saturation term.
- **A successful recall at low R grows S more**: the e^(w₁₀(1−R)) term. This is the spacing effect, and it is how FSRS credits overdue successes and discounts early ones.

*Simulation* with default w and D ≈ 2.1:

| S before | Good on time → S | Hard on time → S, D | Again on time → S, D |
|---|---|---|---|
| 11 d | 46 | 32, 4.7 | 1.5, 7.4 |
| 46 d | 163 | 116, 4.7 | 2.9, 7.4 |
| 163 d | 498 | 364, 4.7 | 4.7, 7.4 |
| 497 d | 1344 | 1006, 4.7 | 6.9, 7.4 |

- An early review of S = 46 after 5 days (R = 0.985) gives only S = 63.5, against 162.6 on time.
- A review 30 days overdue (R = 0.862) gives S = 210 instead of 163.
- **A lapse is still severe in FSRS:** a 1.3-year memory drops to about a week.

**Elapsed-days pitfall (verified).** `ts-fsrs` counts elapsed days as the difference of **UTC calendar dates** (`dateDiffInDays`, [`help.ts:224`](https://github.com/open-spaced-repetition/ts-fsrs/blob/v5.4.2/packages/fsrs/src/help.ts), called from `abstract_scheduler.ts:56`). In Brazil (UTC−3) the UTC date changes at 21:00 local time, which produces two errors:
- A recitation at 22:00 and another at 07:00 the next morning fall on the same UTC date. They count as a *same-day* review (t = 0), and the short-term formula applies.
- Recitations at 20:30 and 21:30 on the same evening count as one day apart.
- **Inference:** pass review times shifted into local "study days" (local time minus the day-start hour) before calling `ts-fsrs`. Or compute `elapsed_days` yourself and call `next_state`/`next_interval` directly; the README documents that path.

### 4.3 Parameters and cold start (verified)

- **Defaults** (`ts-fsrs` [`constant.ts:24`](https://github.com/open-spaced-repetition/ts-fsrs/blob/v5.4.2/packages/fsrs/src/constant.ts); identical to `FSRS6_DEFAULT_PARAMETERS` in [fsrs-rs `inference_v6.rs:4`](https://github.com/open-spaced-repetition/fsrs-rs/blob/4bc0a0979f95dd01cc653031b6f2a01429e4c32b/src/inference_v6.rs)):

  ```
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796,
  1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542
  ```

  - They "have been found by running the FSRS optimizer on several hundred million reviews from ~10k users" ([ABC](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS)). Those are Anki users and Anki flashcards.
  - **Caveat:** the archived benchmark's "FSRS-6 default param." row (June 2025) used a different vector (0.2172, 1.1771, 3.2602, 16.1507, …; [f0cc681](https://github.com/open-spaced-repetition/srs-benchmark/blob/f0cc6814c0/README.md)). The benchmark's default-parameter numbers therefore do not describe *exactly* the vector `ts-fsrs` 5.4.2 ships.
- **Other `ts-fsrs` defaults** (`constant.ts:4-15`):
  - `request_retention` 0.9.
  - `maximum_interval` 36500 d.
  - **`enable_fuzz` false**.
  - `enable_short_term` true.
  - Learning steps `['1m','10m']`, relearning steps `['10m']`.
- **Desired retention.** Anki: "The default is 90% … Above 90% the workload increases very quickly, and above 97% the workload can be overwhelming" ([deck options](https://docs.ankiweb.net/deck-options.html)). ABC: "Values between 70% and 97% are considered reasonable".

### 4.4 Optimisation: how, and how much data (verified)

- **What is fitted.** The 21 parameters are fitted by minimising log loss on the user's history. Each review after a card's first day becomes one training item: the prefix of that card's history, predicting the next outcome ([`ts-fsrs-optimizer` README](https://www.npmjs.com/package/ts-fsrs-optimizer) explains the shaping; fsrs-rs `FSRSItem` docs in the [binding typings](https://cdn.jsdelivr.net/npm/@open-spaced-repetition/binding@0.5.0/dist/index.d.ts)).
- **Small-data behaviour in fsrs-rs** ([`training.rs`](https://github.com/open-spaced-repetition/fsrs-rs/blob/4bc0a0979f95dd01cc653031b6f2a01429e4c32b/src/training.rs)):
  - Fewer than 8 items returns the defaults (`#L679`).
  - Fewer than 64 items, or only first reviews, fits only the four initial stabilities w₀–w₃ and keeps the rest at defaults (`#L715`).
  - Above that, gradient training runs with an L2 penalty that pulls toward the defaults (`PENALTY_W_L2 = 0.5`, [`training_v6.rs:3`](https://github.com/open-spaced-repetition/fsrs-rs/blob/4bc0a0979f95dd01cc653031b6f2a01429e4c32b/src/training_v6.rs)).
- **Anki guidance** ([FSRS FAQ](https://docs.ankiweb.net/faqs/frequently-asked-questions-about-fsrs); [deck options](https://docs.ankiweb.net/deck-options.html)):
  - "In Anki 24.06.3 (and newer versions), the optimizer can be used with any number of reviews."
  - A common reason FSRS performs poorly is a "Low number of reviews (less than a few hundred)".
  - Re-optimise "every time the number of reviews doubles", or "once every month is sufficient".
- **What optimisation buys** (archived benchmark, unweighted log loss):
  - Defaults: 0.3661.
  - Only w₀–w₃ fitted ("pretrain"): 0.3548.
  - Fully fitted: 0.3456.
  - **Fitting just the four initial stabilities closes about 55% of the gap** (my arithmetic).
- **How much data this app's users will have** (*simulation*: FSRS@0.90, on-time reviews, the synthetic learner equals the defaults):

  | User pattern | Official reviews after 90 d | 180 d | 365 d |
  |---|---|---|---|
  | One 20-verse Topical Pack, nothing added | ~110 | ~120 | ~170 |
  | +1 verse per week | ~50 | ~125 | ~320 |
  | +2 verses per week | ~100 | ~250 | ~630 |

  **Inference.** A typical devotional user crosses "a few hundred reviews" only after 6–12 months, and only if they review on time. For the first year, **default (or app-wide) parameters plus a desired-retention setting are the realistic operating point.** Per-user optimisation is a late refinement, not the goal.

### 4.5 Same-day reviews and learning steps (verified)

- **Anki's guidance** ([deck options](https://docs.ankiweb.net/deck-options.html)):
  - "(Re)learning steps of 1 day or greater are not recommended when using FSRS."
  - "Evidence shows that repeating a card multiple times in a single day does not significantly contribute to long-term memory".
  - "Ensure that all your learning and re-learning steps are shorter than 1d and can be completed on the same day."
- **What the default parameters do.** A same-day Good leaves S practically unchanged. *Simulation:* S = 2.307 after the first Good, still 2.307 after two more same-day Goods. A same-day Again cuts S.
- **Same-day prediction is FSRS-6's blind spot.** In the current benchmark table *with* same-day reviews evaluated, FSRS-6 scores log loss 0.3842. That is worse than the constant-average baseline AVG at 0.3816, while FSRS-7 scores 0.3206 ([srs-benchmark](https://github.com/open-spaced-repetition/srs-benchmark)). **Inference:** with FSRS-6, do not use R to make *within-session* decisions such as "is this verse solid enough to stop drilling now".

### 4.6 What FSRS would actually do with verses (*simulation*)

**Interval sequences for a verse recited perfectly every time:**

| Scheduler | Intervals (days) |
|---|---|
| App SM-2 (score 100) | 1, 6, 16, 45, 131, 393, 1218 |
| FSRS-6 defaults @ 0.95 | 1, 3, 8, 19, 43, 89, 175 |
| FSRS-6 defaults @ 0.90 | 2, 11, 46, 163, 497, 1346, 3292 |
| FSRS-6 defaults @ 0.85 | 4, 31, 173, 773, 2859, … |

**Monte Carlo set-up.**
- The "true" learner follows FSRS-6 itself. Variants scale down the initial stabilities and the stability gain to stand in for "a whole verse is harder than an average flashcard".
- Outcomes are pass/fail drawn from the true R.
- Reviews happen on time; 2,000 verses; 3-year horizon.
- Assumptions favour FSRS, because the scheduler's model *is* the truth in row 1.

| True learner | Scheduler | Reviews per verse (3 y) | Lapse rate at review | Mean true R |
|---|---|---|---|---|
| = FSRS defaults | App SM-2 | 10.3 | 9.8% | 0.933 |
| | FSRS @ 0.95 | 17.7 | 5.7% | 0.975 |
| | FSRS @ 0.90 | 12.6 | 10.4% | 0.952 |
| | FSRS @ 0.85 | 10.2 | 15.0% | 0.916 |
| Harder (S₀ ×0.5, gain ×0.6) | App SM-2 | 13.3 | 14.6% | 0.877 |
| | FSRS @ 0.90 | 21.5 | 14.6% | 0.921 |
| Much harder (S₀ ×0.3, gain ×0.4) | App SM-2 | 16.5 | 18.4% | 0.817 |
| | FSRS @ 0.90 | 36.2 | 18.2% | 0.887 |

**Inference.**
1. I could not reproduce a workload saving. On the retention-vs-reviews trade-off, the app's SM-2 and default FSRS sit on roughly the same curve. FSRS just lets you *choose* the point.
   - **Caveat on the comparator:** this app's SM-2 never lowers ease on a fail and raises it by 0.1 on every perfect pass (ease reaches 2.9–3.3 in these runs), so it is unusually aggressive. Stock SM-2 or Anki-SM-2 would sit further from FSRS. Parity here says "no saving against *this* variant", not "FSRS saves nothing". The maintainers' "20–30% fewer reviews" is labelled by them as "based on simulation results" ([ABC](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS)). It is not a field result, and it does not appear here.
2. When the material is harder than the defaults assume, default FSRS **misses its own target**: about 15–18% lapses at a 10% target. That is the case for verbatim multi-word passages, a plausible inference that is not verified. Fitting parameters to *verse-recitation* data is what makes FSRS's calibration real for this app.
3. FSRS's concrete advantages here are qualitative and real:
   - a calibrated R to display and to triage backlogs with;
   - principled handling of early and overdue recitations;
   - an explicit retention knob;
   - no ratchet.

---

## 5. Other schedulers compared

### 5.1 The benchmark: what it measures and its limits (verified, [srs-benchmark README](https://github.com/open-spaced-repetition/srs-benchmark), 2026-10-08)

**Data.**
- "10 thousand users who use Anki … ~727 million reviews" ([anki-revlogs-10k](https://huggingface.co/datasets/open-spaced-repetition/anki-revlogs-10k)).
- Evaluated on 349,923,850 reviews after filtering, with `TimeSeriesSplit` (train on older reviews, test on newer).
- Same-day reviews are excluded from evaluation in the main table.

**Metrics.**
- **Log loss**: cross-entropy of predicted recall against the 0/1 outcome.
- **RMSE (bins)**: predictions and outcomes are grouped by interval length, review count and lapse count, then a weighted RMSE of the bin means is taken.
- **AUC**: discrimination between recall and lapse.
- "Log Loss and RMSE (bins) measure calibration … AUC measures discrimination".

**Current table (no same-day reviews, unweighted means, lower log loss is better):**

| Model | Params | Log loss | RMSE (bins) | AUC |
|---|---|---|---|---|
| RWKV-Instant (cross-user NN, many features) | 2.76 M | 0.2773 | 0.0250 | 0.833 |
| GRU / LSTM | 503 / 8869 | 0.3328 / 0.3332 | 0.055 / 0.054 | 0.732 / 0.733 |
| MOVING-AVG (no memory model) | 0 | 0.3369 | 0.0592 | 0.700 |
| FSRS-7 (recency-weighted) | 34 | 0.3370 | 0.0593 | 0.722 |
| FSRS-7 | 34 | 0.3401 | 0.0634 | 0.717 |
| SBD | 7 | 0.3410 | 0.0602 | 0.715 |
| FSRS-6 | 21 | 0.3460 | 0.0653 | 0.703 |
| FSRS-7, default parameters | 0 | 0.3620 | 0.0910 | 0.703 |
| DASH | 9 | 0.3682 | 0.0838 | 0.631 |
| AVG (constant = user's mean retention) | 0 | 0.3945 | 0.1034 | 0.500 |
| ACT-R | 5 | 0.4033 | 0.1074 | 0.523 |
| HLR (Duolingo) | 3 | 0.4694 | 0.1275 | 0.637 |
| Ebisu v2 | 0 | 0.4989 | 0.1627 | 0.605 |

**SM-2 rows** were dropped from the README on 2025-08-22 (commit [3f0b7b7](https://github.com/open-spaced-repetition/srs-benchmark/commit/3f0b7b7516); I diffed it against the previous commit). The last table that has them, [f0cc681](https://github.com/open-spaced-repetition/srs-benchmark/blob/f0cc6814c0/README.md) (2025-06-06, unweighted), shows:

| Model | Log loss | RMSE (bins) | AUC |
|---|---|---|---|
| FSRS-6 | 0.3456 | 0.0653 | 0.705 |
| FSRS-6, default parameters | 0.3661 | 0.0927 | 0.696 |
| FSRS-6 binary (Again/Good only) | 0.3509 | 0.0676 | 0.685 |
| Anki-SM-2 | 0.616 | 0.1724 | 0.613 |
| SM-2 | 0.722 | 0.2031 | 0.603 |

**Limitations** (verified facts, then inference):
- **Flashcards, not recitation.** Every row is Anki self-graded flashcards from volunteers who shared their collections. Verbatim passages graded by ASR are a different item type with a different grader. *(Inference: the ranking probably transfers; the absolute calibration of default parameters may not.)*
- **It measures prediction, not outcomes.** No row measures how much was retained per minute studied. Better calibration helps scheduling only through the retention target. "RMSE-BINS-EXPLOIT" scores the *best* RMSE (bins), 0.0135, with a log loss of 4.6, which shows that a metric can be gamed.
- **A zero-parameter moving average beats optimised FSRS-6 on log loss** (0.3369 vs 0.3460). *Inference:* much of the loss is about tracking each user's current success rate (fatigue, life events). For an app this suggests watching *observed* retention and nudging desired retention, which needs only the review log.
- **SM-2 needs bolted-on assumptions to output a probability.** The README says so, so its rows are a lower bound on its scheduling quality, not a direct measure of it.
- **Who runs it.** The FSRS authors maintain it. Data and code are public, but the repo has **no licence file** (GitHub `license` endpoint: Not Found). Treat its code as "all rights reserved" if you reuse any of it.
- **Same-day reviews.** These are excluded from the headline table. With them included, FSRS-6 falls below the AVG baseline (§4.5).

**SuperMemo's own comparison** ([Universal metric](https://web.archive.org/web/20260721174530/https://supermemo.guru/wiki/Universal_metric_for_cross-comparison_of_spaced_repetition_algorithms), Wayback, *sub-agent*). On "an exemplary set of 700,000 repetitions", scored by SuperMemo's own metric where lower is better:

| SM-20 | SM-17 | SM-15 | FSRS (optimised) | FSRS (default) | SM-2 | Leitner | Pimsleur |
|---|---|---|---|---|---|---|---|
| 0.04 | 1.1 | 15.3 | 16.43 | 19.9 | 35.3 | 47.7 | 60.6 |

The page itself warns: "The above numbers are dataset dependent" and "In new collections, the differences between algorithms are less pronounced". It uses one dataset, a vendor metric and no peer review.

### 5.2 Comparison table

| Scheduler | Memory model | Inputs | Needs the user's own data? | Benchmark log loss (unweighted) | JS library and licence (verified) | Fit for this app (inference) |
|---|---|---|---|---|---|---|
| **SM-2** (Woźniak 1987) | Ease multiplier; no recall probability | Grade 0–5 | No | 0.722 (archived) | Trivial (it is already in the app). [`supermemo`](https://www.npmjs.com/package/supermemo) 2.0.23, MIT, 2025-03. [`@open-spaced-repetition/sm-2`](https://www.npmjs.com/package/@open-spaced-repetition/sm-2) 0.2.1, MIT, 2025-08. The two disagree on EF after a fail. | Fine as a stopgap once the grade is fixed |
| **Anki SM-2** | Ease plus partial overdue credit | 4 buttons, days late | No | 0.616 (archived) | No npm package. Anki is AGPL-3.0, so re-implement rather than copy. | Marginal gain over the app's SM-2 |
| **Leitner** (1972 book) | Boxes; promote on pass, demote on fail | Pass/fail | No | Not in benchmark. In Settles & Meeder's offline test its MAE (0.235) was worse than a constant baseline (0.175) ([P16-1174](https://aclanthology.org/P16-1174.pdf), *re-fetched*). | Trivial | Easy to explain, but coarse |
| **HLR** (Duolingo 2016) | p = 2^(−Δ/h), h = 2^(Θ·x) | Counts of seen/correct/incorrect plus ~20k lexeme features | Yes, a global model across many users | 0.4694 | No JS package. [duolingo/halflife-regression](https://github.com/duolingo/halflife-regression) is MIT, Python, last commit 2017. | No; built for vocabulary at Duolingo's scale |
| **Ebisu v2** | Bayesian (Beta prior on recall) | Pass/fail (or partial), time | No | 0.4989 | [`ebisu-js`](https://www.npmjs.com/package/ebisu-js) 2.1.3, Unlicense, 2024-03 | No; worse calibration |
| **ACT-R / DASH** | Activation, power-law decay | Times and outcomes | Yes | 0.4033 / 0.3682 | None | No |
| **SM-17 / SM-18 / SM-20** | Two- or three-component (S, R, D); full history | Grades and full history | Yes | Not in this benchmark. SuperMemo's own metric ranks them best. | **Proprietary**: "for legal reasons, the newest algorithm behind SuperMemo (Algorithm SM-8 through Algorithm SM-18) cannot be open" ([supermemopedia](https://web.archive.org/web/20240624063257/https://supermemopedia.com/wiki/Open_source_SuperMemo), *sub-agent*) | Not available |
| **FSRS-6** | DSR, power-law forgetting curve | 4 grades (or 2), integer days | No (defaults); optional fitting | 0.3460 fitted; 0.3661 default (archived) | [`ts-fsrs`](https://www.npmjs.com/package/ts-fsrs) 5.4.2, **MIT**, 2026-09-01. About 751k downloads/month. Repo pushed 2026-10-08. Bundle ~21 KB minified / **6.7 KB gzipped** (my esbuild measurement). No runtime dependencies. The `engines: node >=20` field is tooling only: the dist uses no Node APIs (I grepped for `require`, `process`, `crypto`, `Intl`; only `Proxy` and class fields, which Metro transpiles). Running under Hermes is **inference, not verified on a device**. | **Yes, the recommended target** |
| **FSRS-7** | Dual-trace DSR, fractional days | Grades, fractional intervals, same-day | Same as FSRS-6 | 0.3401; 0.3620 default | `ts-fsrs` 6.0.0-**beta**.13 only | Later; it handles same-day relearning properly |
| **GRU / LSTM / RWKV** | Neural sequence models | Many features (RWKV uses the whole collection) | RWKV is trained across 5k users | 0.333 / 0.277 | Research code only (benchmark repo, no licence) | No, for now |
| **LLM / content-aware** (LECTOR 2025, KARL 2024) | Text semantics plus knowledge tracing | Item text plus history | Yes | Not benchmarked | None | Speculative. LECTOR: "100 simulated learners over 100 days", a single-author preprint ([arXiv 2508.03275](https://arxiv.org/abs/2508.03275)). KARL: "32 study paths from 27 users" ([arXiv 2402.12291](https://arxiv.org/abs/2402.12291)). Both *sub-agent*. |

**HLR detail** (Settles & Meeder, ACL 2016, [doi:10.18653/v1/P16-1174](https://doi.org/10.18653/v1/P16-1174), *sub-agent*):
- The headline "+12% daily engagement" is **not** HLR vs Leitner. In the six-week HLR-vs-Leitner A/B test (just under 1 M students), daily retention changed by "+0.3 +0.3 -7.3*", with only the practice-session drop significant.
- The +12.0% came from a second experiment that compared HLR variants.

---

## 6. Memorization science for verbatim scripture

**Read this first.** Almost all of the learning-science evidence uses word pairs, word lists, or prose scored by "idea units", which is gist. Controlled research on *methods for verbatim memorization of text* is thin. Items that bear directly on verbatim text are marked **[verbatim]**. The prior note's §2.1 table still stands; this section adds what matters for scheduling and verbatim recall.

**How evidence strength is rated here.** **Strong** means several experiments and meta-analyses agree. **Moderate** means consistent experiments but a narrower base, mostly one lab or one kind of material. **Weak** means analogy, small samples or old work. **None** means nothing found.

| Technique | Key evidence (verified unless marked) | Strength for verbatim scripture | App implication (inference) |
|---|---|---|---|
| **Retrieval practice (testing effect)** | Roediger & Karpicke 2006 ([doi](https://doi.org/10.1111/j.1467-9280.2006.01693.x)) used two prose passages of 256 and 275 words, but **scored gist**: each passage "was divided into 30 idea units", and students recalled "without concern for exact wording or correct order". At 1 week: "The tested group recalled 56% … the restudy group recalled only 42%" (full text, *re-fetched*). Rowland 2014 meta-analysis: "g = 0.50 (CI [0.42, 0.58])" ([doi](https://doi.org/10.1037/a0037559), full text, *re-fetched*). | **Strong** for retrieval in general; **moderate** for verbatim, because the canonical studies scored meaning, not wording. | Blind Recitation is the right "official" test. Keep Echo and Cloze as on-ramps, not as reviews (§7.2). |
| **Feedback after errors** | Pashler et al. 2005: correct-answer feedback after errors "increased final retention by 494%"; "feedback after correct responses made little difference" ([doi](https://doi.org/10.1037/0278-7393.31.1.3)). Rowland 2014: testing with **no feedback and ≤ 50% initial success gave g = 0.03, CI [−0.21, 0.27]**, i.e. no benefit (full text, *re-fetched*). | **Strong** | Failed recitations help only because `DiffView` shows the correct text. Make the correction unmissable: replay only the missed span (the prior note's M6). Never let a failed attempt end without the right words on screen. |
| **Spacing; expanding vs uniform** | Karpicke & Bauernschmidt 2011: long absolute spacing gave "a 200% improvement in long-term retention", but there was "no evidence that a particular relative spacing schedule (expanding, equal, or contracting) was inherently superior" ([doi](https://doi.org/10.1037/a0023436), *re-fetched*). Karpicke & Roediger 2007: "equally spaced retrieval produced superior retention 2 days later … The important factor … is delaying initial retrieval" ([doi](https://doi.org/10.1037/0278-7393.33.4.704), *re-fetched*). Kang et al. 2014: over 4 weeks of vocabulary, expanding was "equivalent … on a final test given eight weeks after training. However, the expanding schedule yielded much higher average recallability over the whole training period" ([doi](https://doi.org/10.3758/s13423-014-0636-z), PubMed, *re-fetched*). Latimier, Peyre & Ramus 2021 meta-analysis: spaced vs massed retrieval "g = 0.74"; expanding vs uniform "no significant difference … (g = 0.034)" ([doi](https://doi.org/10.1007/s10648-020-09572-8), full text, *re-fetched*). | **Strong** that spacing matters; **moderate** that expanding vs equal barely matters for the final test | The real arguments for expanding schedules are **efficiency** (fewer reviews to hold a target) and **higher in-practice success**, which matters for motivation and, per Rowland, for learning. The shape of SM-2's vs FSRS's curves is not where the learning lives. *Absolute* spacing, retrieval and feedback are. |
| **Successive relearning** | Rawson & Dunlosky 2011: "practice recalling concepts to an initial criterion of 3 correct recalls and then to relearn them 3 times at widely spaced intervals"; the benefit of a higher initial criterion "diminished as relearning increased" ([doi](https://doi.org/10.1037/a0023956), *sub-agent*). Classroom gains: Rawson, Dunlosky & Sciartelli 2013 ([doi](https://doi.org/10.1007/s10648-013-9240-4), *sub-agent*). | **Moderate–strong** (mostly one lab group; includes classroom data) | Same-day relearn to one correct recall after a fail (N6). Do not demand many same-day repeats, because spaced relearning sessions do the work. This is what an SRS already schedules. |
| **Verbatim vs gist memory** | Sachs 1967: after 80–160 syllables, recognition of syntactic changes "dropped to near chance levels while remaining high for semantic changes" ([doi](https://doi.org/10.3758/BF03208784), *sub-agent*). **[verbatim]** Rubin 1977, passages learned growing up: "the recalls, while partial, were exact with no evidence of constructive memory"; "Function word, first letter, and music prompts increased recalls"; "Recalls tended to begin and end at breath pause locations. The results fit a simple model of associative chaining retrieval of passively stored surface structure units" ([doi](https://doi.org/10.1016/S0022-5371(77)80023-6); Duke Scholars abstract, *re-fetched*). **[verbatim]** Noice & Noice 1999: three months after the final performance, actors recalled "approximately 90% of the text … verbatim or within very narrowly defined limits" ([doi](https://doi.org/10.1080/096582199387977), *sub-agent*). | **Moderate.** The decay of wording is robust; evidence on how to *train* verbatim recall is sparse. | Verbatim recall is a *different task* from flashcard recall. Wording decays faster than meaning, and passages are retrieved as **chained surface units bounded by breath pauses**. This supports (a) a strict word-level grade (§7.1), (b) chunking at clause or breath boundaries (§7.3), and (c) expecting cascades: losing one link loses what follows. |
| **First-letter cueing; vanishing / diminishing cues** | **No peer-reviewed experiment found** that tests first-letter cueing as a training method for verbatim text in healthy adults (sub-agent's extended search of the web, Crossref, OpenAlex and Semantic Scholar; my own earlier search agrees: **none**). Nearest evidence: Rubin 1977 (first-letter prompts *at test* increase recall, above). Finley et al. 2011, English–Iñupiaq word pairs: "Diminishing cues yielded the highest performance on a final test of cued recall" ([doi](https://doi.org/10.1016/j.jml.2011.01.006), *re-fetched*). Fiechter & Benjamin 2018: diminishing cues helped "where standard retrieval practice was not helpful" ([doi](https://doi.org/10.3758/s13423-017-1366-9), *sub-agent*). Vanishing cues in amnesia: Kessels & de Haan 2003, "no significant ES was demonstrated for the vanishing cues method" ([doi](https://doi.org/10.1076/jcen.25.6.805.16474)). | **Weak** (by analogy from word pairs); **none** for verbatim text | Cloze Practice is a reasonable scaffold, not a proven method. Turn it into **diminishing cues**: show fewer first letters on each pass (well grounded by analogy, cheap). A "first-letter peek" lifeline (show only the first letter) would be a gentler, Rubin-style prompt than a full Word Peek. Count it as half an error, or log it and decide later. |
| **Chunking; part vs whole; progressive (cumulative) building** | Miller 1956 ([doi](https://doi.org/10.1037/h0043158)) and Cowan 2001: "a central capacity limit averaging about four chunks" ([doi](https://doi.org/10.1017/S0140525X01003922)). Part/whole/progressive-part studies of poetry and prose found only from **1913–1931** (Lakenan 1913, [doi](https://doi.org/10.1037/h0071232); McGeoch 1931 review, [doi](https://doi.org/10.1037/h0073938)). Abstracts **UNVERIFIED**; no modern controlled studies found. | **Moderate** for capacity limits; **weak** for any particular passage-building protocol | Progressive building (add a chunk, recite cumulatively) is a sensible heuristic that fits Rubin's chaining model. It is not a proven protocol, so ship it as a mode and measure it (§7.3, L4). |
| **Overlearning** (more same-session repetitions after the first correct one) | Rohrer et al. 2005: "The overlearners recalled far more than the low learners at the 1-week test, but this difference decreased dramatically thereafter … an inefficient strategy" ([doi](https://doi.org/10.1002/acp.1083), *re-fetched*). Driskell, Willis & Copper 1992 meta-analysis: effect "moderated by … length of retention period" ([doi](https://doi.org/10.1037/0021-9010.77.5.615), *sub-agent*). | **Moderate**; the benefit fades | Do not reward "Practice Again ×5" with longer intervals (W6). Anki's guidance and FSRS-6's same-day formula agree (§4.5). |
| **Sleep consolidation** | Berres & Erdfelder 2021 meta-analysis (823 effect sizes): "moderate overall sleep benefit in episodic memory (g = 0.44)"; "the sleep benefit is larger when stimuli are studied multiple times instead of just once" ([doi](https://doi.org/10.1037/bul0000350), *re-fetched*). Mazza et al. 2016 (n = 40, vocabulary): learning in the evening and relearning the next morning "not only reduced the amount of practice needed by half but also ensured much better long-term retention" ([doi](https://doi.org/10.1177/0956797616659930), *re-fetched*). Reviews: Rasch & Born 2013 ([doi](https://doi.org/10.1152/physrev.00032.2012)); Diekelmann & Born 2010 ([doi](https://doi.org/10.1038/nrn2762)). | **Strong** that sleep helps; **moderate** for the "learn at night, relearn next morning" protocol (one small study) | A first review "tomorrow" (SM-2: 1 d) or "in 2 days" (FSRS Good: 2.3 d) both straddle sleep. That is good. Calendar-day due dates (N3) make "learn in the evening, recite at morning quiet time" the natural rhythm. Consider an evening "learn new verse" prompt alongside the morning review reminder. |
| **Desirable difficulties** | Soderstrom & Bjork 2015: people "mistakenly interpret their performance during acquisition as a reliable guide to long-term learning" ([doi](https://doi.org/10.1177/1745691615569000)). Bjork & Bjork 2020 ([doi](https://doi.org/10.1016/j.jarmac.2020.09.003)): quote **UNVERIFIED** (no abstract reachable). | **Moderate** (a framework, not one effect) | Good performance in Echo or Cloze must not shorten the path to Blind Recitation or count as a review. The app already respects this (ADR 0011). |
| **Generation effect** | Slamecka & Graf 1978 ([doi](https://doi.org/10.1037/0278-7393.4.6.592)). Bertsch et al. 2007: "The size of the generation effect across the 86 studies was .40" ([doi](https://doi.org/10.3758/BF03193441)). For text, the effect depends on the text type (McDaniel et al. 1986, [doi](https://doi.org/10.1016/0749-596X(86)90041-0), *sub-agent*). **No study of generation for verbatim sentences found.** | **Strong** for words; **weak** for verbatim text | Supports Cloze (generate from a cue) over Echo (hear and repeat) as the bridge to Blind Recitation. |
| **Production effect (saying it aloud)** | Fawcett 2013 meta-analysis: "moderate effect … when varied between-subjects (g=0.37)" ([doi](https://doi.org/10.1016/j.actpsy.2012.10.001)). For prose: Roberts et al. 2023/2024, "Reading text aloud benefits memory but not comprehension" ([doi](https://doi.org/10.3758/s13421-023-01442-2), title *re-fetched*, abstract *sub-agent*). **[verbatim]** Wootten et al. 2023, Shakespeare sonnets, oral condition better: **preprint, not peer-reviewed** ([doi](https://doi.org/10.31234/osf.io/f8qb3), *sub-agent*). | **Strong** for words; **moderate** for text; **weak** (preprint) for verbatim | Real support for the voice-first premise. The prior note's caveat stands: don't market it as "proven for verses". |

**What this changes in the scheduling design** (inference):
1. **What makes the learning is retrieval, absolute spacing and feedback, not the exact interval curve.** That is why §1 puts the grade and the bookkeeping before the algorithm.
2. **Verbatim recall fails by cascade**, because passages are chained surface units. A word-level grade must avoid charging one lost link to every later word. Chunk at clause or breath boundaries (§7.3).
3. **Keep success rates reasonably high and always correct errors.** Retrieval that mostly fails without correction gives nothing (Rowland's g = 0.03). This argues against desired retention below ~0.85, and for the same-day relearn loop.
4. **Same-day repetition is cheap insurance, not progress.** The evidence on overlearning and Anki's FSRS guidance agree.

---

## 7. Design for this app

### 7.1 Turning a recitation into a rating

**Principles.**
- Grade *memory*, not the recognizer.
- Be strict about what "recalled" means for verbatim text, as Anki's manual asks.
- Keep enough raw data in the log to re-derive ratings when the rule changes.

**Step 1: compute unaided errors after ASR tolerance** (tolerance as in the prior note: numerals, clitics, homophones, edit distance ≤ 1).

```
errors = missed canonical words + Word-Peeked words
       (+ added words above a small allowance, e.g. > 2, which catches inserted phrases)
n      = canonical word count
budget = max(1, round(0.05 × n))   // 1 word up to 29 words, 2 for 30–49, 3 for 50–69, 4 for 70–89
```

**Step 2: map to a rating.**

| Situation | FSRS rating (Next) | SM-2 q (Now) | Rationale |
|---|---|---|---|
| Empty or very short transcript after detected speech, or a recognizer error | **None.** Ask to retry and log as `infraFailure`. | None | Infrastructure failure. The prior note's V1. |
| errors = 0 | **Good** | 5 | Recited verbatim. |
| 1 ≤ errors ≤ budget | **Good** (log `slip=true`) | 4 | A one-word slip in a 25-word verse is "known" in everyday terms. Keep it out of Hard (below). |
| errors > budget | **Again**, then relearn the same day (Cloze → Blind) | 2 (ease −0.32, per SuperMemo's code) | It "counts as a fail in a real-life context". |
| Hard / Easy | **Not emitted at first** | n/a | See the reasons below. |

**Why Hard and Easy are not emitted at first:**
- "FSRS-6 binary" costs 0.3509 vs 0.3456 log loss, a small loss.
- Anki: "In some cases, FSRS may even be more accurate if you only use Again and Good" ([FAQ](https://docs.ankiweb.net/faqs/frequently-asked-questions-about-fsrs)).
- Pressing Hard on a failed recall makes "all intervals … unreasonably high" ([deck options](https://docs.ankiweb.net/deck-options.html)).
- Add Hard later only for "passed but with long pauses", once the VAD pause signal has been validated against the log.

**Why not "80–89 → Hard"** (the prior note's mapping). *Simulation (§3.2):* ten noisy passes at 85% drive FSRS difficulty to about 9.8. Intervals then grow 1, 3, 7, 12, 18, 25, 33, 42, 52, 62 days, against SM-2's 425 days by the tenth pass. Difficulty has almost no mean reversion (w₇ = 0.001), so a verse that ASR happens to mishear stays "hard" for good. Under FSRS, Hard is *more* punitive than SM-2's q=3, so the noise problem has to be solved in the grade, not by switching algorithm.

**Word Peek.**
- Each peeked word counts as an unaided error, which lets a single peek in a long passage still pass.
- Drop the 75% cap and the "assisted pass" branch (W10).
- Keep the *UX promise* of ADR 0011/0012 ("no punitive streak reset") in the presentation layer (§7.4), not in the scheduler.

**Calibrate the budget with data.**
- For each rating bucket, compare the observed pass rate at the *next* review with FSRS's predicted R.
- If "slip" passes lapse noticeably more often than clean passes, tighten the budget.

### 7.2 Scaffolds, practice and same-day attempts

| Event | Count as a scheduler review? | Why |
|---|---|---|
| Echo Mode (Level 1) | **No.** Log it as `kind: 'practice'`. | Listening and repeating is restudy, not retrieval. FSRS has no input for restudy; `Rating.Manual` changes no memory state. |
| Cloze Practice (Level 2) | **No.** Log it with the reveal count. | First-letter cued recall is a different, easier test than free recall, so a cued pass says little about unaided recall (§6). Mixing the two would bias the parameters. |
| First Blind Recitation of a *new* verse (after Echo/Cloze the same day) | **Yes**: first FSRS rating. Use `learning_steps: []` and run the scaffolding in-app. | It sets S₀ (Good 2.3 d). The in-app Echo → Cloze → Blind sequence plays the role of Anki's learning steps. |
| Extra Blind Recitations the same day (Practice Again, relearning after Again) | **SM-2 (Now): no**; only the first official attempt per verse per local day updates the schedule (fixes W6). **FSRS (Next): yes**, all logged and fed in. | FSRS-6's t = 0 formula gives a same-day pass a multiplier of ≥ 1 (about 1 with defaults) and a same-day fail < 1, so repeats cannot inflate the schedule. |
| Official recitation of a verse that is **not yet due** | **SM-2: no** (as today). **FSRS: yes.** | FSRS credits early reviews correctly: R ≈ 1 gives little growth (§4.2). This removes the `isUnmetered={!isDue}` coupling for scheduling. Quota metering is a separate decision. |
| Sandbox verse saved | **No fabricated review.** Create the verse as New, or log the sandbox Level 3 attempt with its real score. | W7. |

### 7.3 Long passages and progressive building

`Verse` can already hold a reference range. Scheduling options:

| Unit of scheduling | Pros | Cons |
|---|---|---|
| One card per stored Verse (today) | Simple. Matches what is recited. | The grade dilutes. With a length-aware budget a 120-word passage tolerates 6 slips, but one forgotten verse inside it is invisible. |
| One card per chunk (clause or verse, ~10–30 words) | Fine-grained R. Weak chunks come back sooner. | Chunks in one recitation are *chained*: losing the thread at chunk k cascades into k+1 (inference). Grades within one attempt are not independent. |
| Passage card plus chunk cards ("build, then maintain") | Each phase uses the right unit | More state and UI |

**Proposal (speculative; validate with logs):**
1. **Building.** Each new chunk is its own card, scheduled independently. A progressive session recites the cumulative passage: chunks 1..k plus the new chunk k+1. The alignment is split at chunk boundaries and each chunk gets its own rating from that attempt.
   - Under FSRS this is safe: earlier chunks recited before they are due are "early reviews" with small stability gains.
   - Under SM-2 it would be wrong, because it ignores elapsed time.
2. **Cascade guard.** If the learner stalls at a boundary and uses a peek on the first word of a chunk, count that peek against the stalled chunk only. Do not fail every later chunk.
3. **Maintaining.** Once every chunk has S ≥ ~30 d, schedule the passage as one card due at the earliest chunk due date, and keep per-chunk ratings so a weak chunk gets a targeted Cloze drill.
4. Cap chunk size so the error budget stays meaningful: about 30 words.

### 7.4 Streaks vs retrievability as the motivation signal

- **Evidence.** Silverman & Barasch (2023), *Journal of Consumer Research*, seven studies ([doi:10.1093/jcr/ucac029](https://doi.org/10.1093/jcr/ucac029), Crossref abstract, verified):
  - "intact streaks highlighted via behavioral logs increase consumers' subsequent engagement … relative to when broken streaks are highlighted".
  - The effect is "attenuated when consumers can 'repair' a broken streak".
- **Inference for this app:**
  - **Keep the daily habit streak** (`HabitTracker`, "Quiet-Time" habit), with a grace or repair rule. It rewards showing up, which is under the user's control.
  - **Retire the per-verse streak as a displayed number.** It "breaks" on every lapse (W12), so it highlights broken streaks at the moment of failure, the worst time. Replace it with a **memory strength** indicator from FSRS: R now ("~93% likely to recall today") or a 3–4 step tier by stability (for example Learning < 7 d, Growing < 30 d, Rooted < 180 d, Hidden in the heart ≥ 180 d).
    - Stability falls after a lapse but rarely to zero (§4.2). That is a more honest "it slipped, let's restore it" message than "Streak: 0".
  - **Replace "mastered = interval ≥ 21 d"** with a stability threshold, or with R(t = 365 d) ≥ 0.7. Both are product choices (§10).

### 7.5 Desired retention and workload

- **Default 0.90** (Anki's default; inside the 70–97% range).
- **Presets:** "Gentle 0.85 / Standard 0.90 / Thorough 0.95".
  - *Simulation* (§4.6, learner = defaults): relative to 0.90, Gentle needs about 20% fewer reviews over 3 years with lapses at about 15%; Thorough needs about 40% more with lapses at about 6%.
- **Inference:**
  - Do **not** default below 0.90 while the parameters are Anki defaults. If verses are harder than flashcards, 0.85 would mean roughly 20% lapses (§4.6), and lapses are what make devotional users quit.
  - Start at 0.90 and look at observed retention after 4–8 weeks of shadow mode.
- **Maximum interval.** FSRS@0.90 will happily schedule a perfectly known verse 3+ years out. For devotional use a cap (for example 365 d, the `maximum_interval` option) is defensible on non-memory grounds: the user wants to *meet* each verse again. This is a product decision (§10).
- **Backlog after missed days.** Order the due queue by lowest R, cap the daily load, and frame it as gentle catch-up (the prior note's M7). This needs R, so it comes after FSRS.

### 7.6 Migrating existing SM-2 state

There is no SM-2 conversion in `ts-fsrs` (I grepped the 5.4.2 and 6.0.0-beta.13 dists for `sm2`/`ease`; nothing found). fsrs-rs has one (`memory_state_from_sm2`, [`inference.rs:288`](https://github.com/open-spaced-repetition/fsrs-rs/blob/4bc0a0979f95dd01cc653031b6f2a01429e4c32b/src/inference.rs); formula in [`model_v6.rs:116-136`](https://github.com/open-spaced-repetition/fsrs-rs/blob/4bc0a0979f95dd01cc653031b6f2a01429e4c32b/src/model_v6.rs)).

**Anki's use of it.** Anki calls it only when a card has "no valid revlog entries", with the user's *historical retention* (default 90%) ([`memory_state.rs:408-428`](https://github.com/ankitects/anki/blob/5865db4adffcd48f356823c45ce185f6cccd0102/rslib/src/scheduler/fsrs/memory_state.rs)). Otherwise it replays the review log.

**The formula** (closed form, ~10 lines to port; keep the fsrs-rs BSD-3 notice if code is copied):

```
f  = 0.9^(−1/w20) − 1
S  = interval × f / (r_sm2^(−1/w20) − 1)                                    // = interval when r_sm2 = 0.9
D  = clamp(11 − (EF − 1) / (e^w8 · S^(−w9) · (e^((1−r_sm2)·w10) − 1)), 1, 10)
```

*Simulation*, ported to TS with r_sm2 = 0.9:

| SM-2 state | Converted S | Converted D |
|---|---|---|
| EF 2.5, 1 d | 1 | 8.2 |
| EF 2.7, 6 d | 6 | 6.8 |
| EF 2.8, 16 d | 16 | 5.7 |
| EF 2.9, 45 d | 45 | 4.4 |
| EF 1.94, 27 d | 27 | 8.0 |

**Plan per verse at cut-over:**
- Never officially reviewed (`streak 0`, `intervalDays 0`): **New** card.
- Covered by the review log since it was added: **replay** the log with `ts-fsrs` `reschedule(card, reviews)` (README "History helpers").
- Otherwise: S and D from the formula with r_sm2 = 0.90, `last_review = nextReviewDate − intervalDays`, `state = Review`, `reps = streak`, `lapses = 0` (unknown), and **keep the existing `nextReviewDate`** as `due`.
  - Anki recommends against rescheduling everything when switching: "it will often result in a large number of cards becoming due, so this option is not recommended when first switching from SM-2" ([deck options](https://docs.ankiweb.net/deck-options.html)).
- **Caveat (inference):** the app's SM-2 intervals were never calibrated to 90% retention, and W1 made passes lenient. Converted S values are probably optimistic. Shadow mode (§8) measures this before cut-over.

### 7.7 What to log now (review-log schema)

**Requirements:**
- One row per *attempt*, official or practice.
- Enough raw data to **re-derive** the rating under a future rule.
- Enough timing data to compute local study days.
- Separate from the `verses` blob. AsyncStorage on Android caps total storage at 6 MB by default and each entry at about 2 MB ([async-storage 2.2.0 Limits](https://github.com/react-native-async-storage/async-storage/blob/%40react-native-async-storage/async-storage%402.2.0/packages/website/docs/Limits.md)). Shard by month, or use `expo-sqlite` (prior note, P7). At ~400 bytes per row, 1,000 attempts are about 0.4 MB.

```ts
/** Append-only. Never mutate; corrections are new rows. */
export interface ReviewLogEntry {
  id: string;                    // uuid
  schemaVersion: 1;
  verseId: string;
  segmentId?: string;            // chunk id for passages (§7.3)
  // --- when (enough to rebuild local study days) ---
  reviewedAt: string;            // ISO-8601 UTC instant
  tzOffsetMin: number;           // local offset at that instant, e.g. -180 for BRT
  dayStartHour: number;          // user's rollover hour in effect (e.g. 4)
  durationMs?: number;           // mic open → verification
  // --- what was tested ---
  kind: 'official' | 'practice';
  level: 1 | 2 | 3;              // Echo | Cloze | Blind Recitation
  translation: string;
  textHash: string;              // hash of canonical text; detects edits / translation switch
  wordCount: number;
  // --- raw outcome (re-derive ratings from these) ---
  correct: number;
  missed: number;
  added: number;
  rawScore: number;              // calculateScore() F1, 0–100
  peekedWordIdx: number[];       // Word Peek Lifeline (Level 3)
  clozeRevealedCount?: number;   // Level 2 reveals
  toleratedTokens?: number;      // ASR-tolerance matches (numerals, homophones…)
  longestPauseMs?: number;       // from VAD
  // --- recognizer ---
  transcriber: 'native' | 'cloud-whisper' | 'simulated';
  onDevice?: boolean;
  infraFailure?: 'empty_transcript' | 'recognizer_error' | 'timeout' | null;
  // --- what the scheduler did ---
  wasDue: boolean;
  rating: 1 | 2 | 3 | 4 | null;  // FSRS Again..Easy; null for practice / infra failure
  ratingRule: string;            // e.g. 'err-budget-5pct-binary@1'
  scheduler: 'sm2-app@1' | 'fsrs6-ts-fsrs@5.4.2';
  elapsedDays: number;           // in local study days since previous official review
  scheduledDays: number;         // interval assigned by this review
  before?: { intervalDays?: number; easeFactor?: number; stability?: number; difficulty?: number };
  after?:  { intervalDays?: number; easeFactor?: number; stability?: number; difficulty?: number };
  // --- shadow mode (Next) ---
  shadow?: { fsrsDue: string; stability: number; difficulty: number; retrievabilityAtReview: number | null };
}
```

**What the optimiser needs.**
- The minimum is `verseId`, `reviewedAt` (plus the local-day fields) and `rating` for `kind: 'official'` rows: fsrs-rs `FSRSReview` is just `(rating, deltaT)`.
- Everything else is there so ratings can be recomputed when the rule improves, and so ASR quality can be analysed.
- Deleting a Verse (ADR 0009 hard deletion) should delete its log rows too.

### 7.8 Where could parameter optimisation run? (verified)

| Option | Status | Usable from Expo / React Native 0.86? |
|---|---|---|
| `ts-fsrs` | Scheduler only. The README points to the binding for optimisation. | n/a |
| [`@open-spaced-repetition/binding`](https://www.npmjs.com/package/@open-spaced-repetition/binding) 0.5.0 (MIT; 0.6.0-beta.6) | fsrs-rs via napi-rs with a WASI fallback. Has `computeParameters`, `memoryStateFromSM2` and `evaluateWithTimeSeriesSplits`. The README says "Requirements: Node.js >=20" and "**Public beta notice**". | **No.** It needs Node or WASI. Its `android-arm64` build is a Node binary, not an RN module. |
| [`fsrs-browser`](https://github.com/open-spaced-repetition/fsrs-browser) 6.6.0 (BSD-3) | WASM build for browsers | **No**, under Hermes (next row) |
| Hermes WebAssembly | Hermes issue [#429 "WASM support within Hermes?"](https://github.com/facebook/hermes/issues/429) is still **open**. The official [RN 0.84 post](https://reactnative.dev/blog/2026/02/11/react-native-0.84) does not mention WebAssembly (I searched the page). A third-party README reports `typeof WebAssembly` is `"undefined"` on RN 0.86.3 (next row). | Treat as **not available** (UNVERIFIED on a device) |
| [`ts-fsrs-optimizer`](https://www.npmjs.com/package/ts-fsrs-optimizer) 0.1.2 (BSD-3) | "FSRS parameter optimizer in pure TypeScript … including React Native". A line-by-line port of fsrs-rs's optimizer; README reports ~150 ms for 1,000 cards. **Third party, created 2026-09-06, 1 GitHub star, one maintainer, 531 downloads/month.** | Technically yes. **Too young to depend on.** Revisit "Later". |
| Server-side (Node binding, or Python `fsrs-optimizer`) | Mature. Same code Anki uses. | Yes, via upload. It needs opt-in consent: the log reveals religious practice, which LGPD treats as sensitive (prior note §3.4). |

**Inference.** Given §4.4's data volumes, the high-value "Later" step is not per-user optimisation. It is **one app-wide parameter set fitted on pooled, opt-in, pseudonymised verse-recitation logs**, run offline and shipped in app config. That replaces Anki-flashcard defaults with verse-recitation defaults for every user, including new ones.

---

## 8. Staged plan

### Now: fix the grade and the bookkeeping, keep SM-2

| # | Change | Effort | Risks | Metric that shows it worked |
|---|---|---|---|---|
| N1 | **Append-only review log** (§7.7), separate key or table; include practice attempts | S | Storage growth (small); schema churn, mitigated by `schemaVersion` | Rows appear for 100% of attempts. Rebuilt per-verse history matches the stored state. |
| N2 | **Length-aware error budget → pass/fail** (§7.1). Peeks count as errors. No grade on infrastructure failures (with the prior note's V1/V6 tolerance work). Map to SM-2 q 5/4/2. | S–M | Stricter passes mean more reviews at first. Users who relied on 80% passes see more "relearn" days. | Share of official attempts graded "pass" with ≥ 3 missed words → ~0. Pass rate at the next review rises. |
| N3 | **Local calendar-day due dates**, rollover hour 4 (Anki: "The default setting of 4AM ensures that if you're studying around midnight, you won't have two days' worth of cards shown to you in one session", [preferences](https://docs.ankiweb.net/preferences.html)) | S | One-time due-count shift | Morning users see verses reviewed the previous evening as due. |
| N4 | **One schedule update per verse per local day.** Later same-day Level 3 attempts are logged only (fixes W6). | S | none | No verse advances more than one step per day. |
| N5 | **Stop fabricating the sandbox first review** (W7). Remove the peek "assisted pass" branch (W10). | S | Tests in `HomeScreen.test.tsx` / `srsEngine.test.ts` change | — |
| N6 | **Same-day relearn after a fail** (Cloze → Blind until pass, max 2 loops). SM-2 step 7; the prior note's M4. | S–M | Session length | Lapse rate at the next review after a relearned fail |
| N7 | Optional: **lower ease on a fail as SuperMemo's code does** (q=2 → −0.32), so lapsed verses come back sooner | S | Ease hell if grades stay noisy. Only do it together with N2. | Lapse rate on the second review after a lapse |

### Next: FSRS-6 in shadow mode, then cut over

| # | Change | Effort | Risks | Metric |
|---|---|---|---|---|
| X1 | **`Scheduler` seam** in `engines/`: `rate(verseState, attempt) → {nextState, due}`. `VerseEngine.recordReview` calls the seam instead of SM-2 directly. Update ADR 0005 and CONTEXT.md ("Spaced Repetition … SuperMemo-2 based"). | S | — | — |
| X2 | **`ts-fsrs@5.4.2` pinned** (not the 6.0 beta): `request_retention 0.9`, `enable_fuzz true`, `learning_steps []`, `relearning_steps []`, `enable_short_term true`. Local-study-day timestamps (§4.2 pitfall). | S | The library changes its API at 6.0 (deprecated `elapsed_days` fields); pinning plus the seam contains this. Hermes compatibility is inferred, not tested, so smoke-test in a dev build first. | — |
| X3 | **Shadow mode for 6–8 weeks:** SM-2 still schedules. FSRS state is computed from N1's log and written to `shadow` on each row. | M | None user-facing | **Calibration:** for reviews where FSRS predicted R, does mean predicted R match the observed pass rate within ±3–5 points? If observed ≪ predicted, the Anki defaults are too optimistic for verses: raise retention or wait for L1. |
| X4 | **Cut over:** convert or replay state (§7.6), keep current due dates, binary ratings | M | A migration bug loses schedules, so export first (prior note E-R6). A load spike if due dates are recomputed, so don't recompute them. | Due-queue size stable in the week after; no spike |
| X5 | **Memory-strength UI and stability-based "mastered"**; drop the per-verse streak number; keep the daily habit streak with repair (§7.4) | M | Users attached to the streak number | Due-queue completion rate; 30-day retention of users |
| X6 | **Retention presets** 0.85 / 0.90 / 0.95; maximum-interval cap (product decision); backlog ordered by R | S | Users choosing 0.85 with Anki defaults may lapse more | Observed retention per preset |

**Cut-over decision rule (inference).** Switch when shadow-mode calibration error is no worse than ~5 points *and* FSRS's projected daily load is within ±20% of SM-2's for the same users. If FSRS is badly miscalibrated on verse data, stay on fixed SM-2 until L1 provides verse-fitted parameters. **Keeping SM-2 is then the right call.**

### Later

| # | Change | Effort | Risks | Metric |
|---|---|---|---|---|
| L1 | **App-wide parameters** fitted server-side (fsrs-rs or binding) on opt-in, pseudonymised logs; ship in remote config; re-fit when total reviews double | M–L | Consent and privacy (sensitive data); a server to run | Log loss and calibration on held-out users vs Anki defaults |
| L2 | **Per-user optimisation** for users with ≥ ~300–500 official reviews (server, or `ts-fsrs-optimizer` on device once it matures) | M | Over-fitting is limited by fsrs-rs's L2 penalty toward defaults | Per-user calibration |
| L3 | **FSRS-7** when `ts-fsrs` 6 is stable. It needs its own 34 weights; "replay review history to migrate memory states" (ts-fsrs beta source). N1's log makes this possible. | M | API churn | Same-day calibration (relearning loops) |
| L4 | **Chunked passage scheduling** (§7.3) with progressive building | L | Design risk; cascade effects | Passage-level lapse rate; completion of long passages |
| L5 | **Hard rating from hesitation** (VAD pauses) once validated against the log | S | Hard misuse inflates intervals | Calibration of Hard-rated reviews |

**What I would *not* do:**
- Build a custom ML scheduler or adopt LLM scheduling: no evidence for this item type, and no data yet.
- Adopt HLR, Ebisu or Leitner: worse calibration than FSRS and no offsetting benefit.
- Use the `ts-fsrs` 6.0 beta in production.

---

## 9. Corrections to the prior research note

| Prior claim (feature-and-improvement-opportunities.md §2) | Status | Correction or comment |
|---|---|---|
| Archived benchmark numbers (FSRS-6 0.3456/0.0653/0.7051; default 0.3661/0.0927/0.6956; binary 0.3509; Anki-SM-2 0.616/0.1724; SM-2 0.722/0.2031) | **Correct** (re-fetched [f0cc681](https://github.com/open-spaced-repetition/srs-benchmark/blob/f0cc6814c0/README.md)) | They are the *unweighted* means. The default row used an older default vector than `ts-fsrs` 5.4.2 ships (§4.3). |
| "SM-2 rows were removed from the current README in Aug 2025" | **Correct** | Commit 3f0b7b7, 2025-08-22. |
| "FSRS-6 … 21 parameters … Anki adopted FSRS-6 in 25.07 … first shipped in 23.10" | **Correct** | Anki 26.09 now uses fsrs-rs 6.6.2. FSRS-7 in Anki is still unverified. |
| "`ts-fsrs` 5.4.2 (MIT, FSRS-6) is the latest stable"; "default `enable_fuzz` is `false`" | **Correct** | Also: the 6.0 beta's new scheduler API defaults to **FSRS-7** (PR #531). Pin 5.4.2. |
| "SM-2 → FSRS conversion is available as `memoryStateFromSM2` in the beta `@open-spaced-repetition/binding` 0.5.0" | **Misleading** | 0.5.0 is the `latest` tag, though the package calls itself a public beta. It needs Node ≥ 20 (napi or WASI) and **cannot run in React Native**. The usable path is porting the ~10-line fsrs-rs formula (§7.6), as the note half-suggested. |
| "FSRS fixes all three current behaviours … no multiplicative ease erosion"; M3 "Fixes ease erosion from ASR noise" | **Misleading** (FSRS has no ease factor, so there is literally no ease erosion) | With the note's own "80–89 → Hard" mapping, FSRS punishes noisy passes *more* than SM-2 (62 d vs 425 d after ten 85% passes) and difficulty barely reverts. Erosion from noise is fixed by the **grade**, not the algorithm (§7.1). |
| §2.3 mapping "80 ≤ F1 < 90 → Hard", "F1 < 80 → Again", "100 → Easy" | **Revise** | F1 is length-blind: ≥ 80 allows missing ~⅓ of the words (W1). Use a word-error budget and binary Again/Good first. |
| "Word Peek used → Again" | **Revise** | Count each peeked word as an error against the budget. One peek in a long passage need not be a lapse. |
| "Expect a workload reduction, but treat 20–30% as an upper-bound simulation figure" | **Weaken** | My simulation could not reproduce a reduction at equal retention over 1–3 years against this app's SM-2 variant, which is unusually aggressive because ease never drops on a fail. FSRS's first intervals at 0.90 are also longer than SM-2's (§4.6). Treat workload as unknown until shadow-mode data exists. |
| "Anki: optimizer can be used with any number of reviews … re-optimize every time the number of reviews doubles"; "FSRS may even be more accurate if you only use Again and Good"; Good "80–95%" of presses | **Correct** | Add the fsrs-rs specifics: < 8 items → defaults; < 64 → only w₀–w₃ (§4.4). |
| "Original SM-2 also says to 'repeat … until … at least four'" | **Correct** | Also: SuperMemo's reference code lowers EF on fails, which the app does not (W4). |
| Ease erosion "Nine such reviews take ease from 2.5 to the 1.3 floor" | **Correct** (simulation reproduces 9) | Intervals still grow ×1.3 at the floor. |
| M1 "store outside the single `verses` blob (Android 6 MB cap)" | **Correct** | Also note the ~2 MB per-entry limit. A single-key log would hit it at ~5,000 rows. |
| Not mentioned | **New** | W6 (Practice Again advances the schedule several times in one sitting), W7 (sandbox fabricates a perfect review), W10 (a peek can turn a 76–79 fail into an assisted pass), and the `ts-fsrs` UTC-day pitfall (§4.2). |

---

## 10. Open questions for the product owner

1. **What counts as "knowing" a verse?** Is a one-word slip in a 25-word verse a pass (my proposed 5% budget)? Are word-order swaps and synonyms (e.g. "Senhor" vs "Deus") failures? This one decision moves the schedule more than SM-2 vs FSRS does.
2. **Does a Word Peek count as a failure?** I propose each peeked word counts as an error against the budget, and that the UI never says "streak reset".
3. **Can verses disappear for over a year?** FSRS will schedule a well-known verse 1–4 years out. Do you want a maximum interval (e.g. 6 or 12 months) so every verse is met again, at some cost in reviews?
4. **Which retention presets, under what names?** Proposal: Gentle 0.85 / Standard 0.90 / Thorough 0.95, with Standard as the default.
5. **Per-verse streak: keep, hide or replace with memory strength?** Keep the daily habit streak; add a repair or grace day?
6. **Opt-in log upload for app-wide parameter fitting (L1)?** It needs LGPD-grade consent, a server, and a privacy-policy change.
7. **Should an early official recitation count?** Under FSRS it would. This also decides whether reciting a not-yet-due verse consumes quota.
8. **Passages:** what length do users actually memorise, and is chunked scheduling (§7.3) worth an L-sized build now, or after chapter mode is validated?
9. **PRODUCT.md already promises "intelligent spaced repetition (FSRS)"**, while CONTEXT.md and ADR 0005 say SM-2. Which is the source of truth until X4 ships?

---

## 11. Sources

All accessed **2026-10-08**. *sub-agent* marks items fetched by a delegated agent. Load-bearing ones were re-fetched (*re-fetched*). Wayback snapshots are used where the live SuperMemo pages block automated access.

**Code in this repo** (working tree, 2026-10-08)
- `src/engines/srsEngine.ts`, `src/engines/recitationEvaluator.ts`, `src/engines/diffEngine.ts`, `src/engines/clozeEngine.ts`
- `src/services/VerseEngine.ts`, `src/services/RecitationSession.ts`
- `src/screens/HomeScreen.tsx`, `src/screens/ReviewScreen.tsx`
- `docs/adr/0005-…`, `0011-…`, `0012-…`; `CONTEXT.md`; `PRODUCT.md`

**SM-2 and SuperMemo**
- Woźniak, SM-2 article (1990 thesis, published 1998) — <https://www-v1.supermemo.com/archives1990-2015/english/ol/sm2> (*re-fetched*)
- SuperMemo 2 Delphi plug-in source — <https://www-v1.supermemo.com/archives1990-2015/english/ol/sm2source> (*re-fetched*)
- Woźniak (2018), The true history of spaced repetition — <https://www.supermemo.com/en/blog/the-true-history-of-spaced-repetition> (*sub-agent*)
- Algorithm SM-17 (Wayback 2026-01-13) — <https://web.archive.org/web/20260113084529/https://supermemo.guru/wiki/Algorithm_SM-17> (*sub-agent*)
- Algorithm SM-18 (Wayback 2026-05-08) — <https://web.archive.org/web/20260508204725/https://supermemo.guru/wiki/Algorithm_SM-18> (*sub-agent*)
- Universal metric for cross-comparison (Wayback 2026-07-21) — <https://web.archive.org/web/20260721174530/https://supermemo.guru/wiki/Universal_metric_for_cross-comparison_of_spaced_repetition_algorithms> (*sub-agent*)
- Open source SuperMemo (Wayback 2024-06-24) — <https://web.archive.org/web/20240624063257/https://supermemopedia.com/wiki/Open_source_SuperMemo> (*sub-agent*)
- Woźniak, Gorzelańczyk & Murakowski (1995), two components of long-term memory, Acta Neurobiol Exp — <https://pubmed.ncbi.nlm.nih.gov/8713361/> (*sub-agent*)

**Anki**
- Deck options (FSRS, desired retention, learning steps, historical retention, SM-2 options) — <https://docs.ankiweb.net/deck-options.html>
- FSRS FAQ — <https://docs.ankiweb.net/faqs/frequently-asked-questions-about-fsrs>
- Studying (answer buttons) — <https://docs.ankiweb.net/studying.html>
- Preferences (next day starts at) — <https://docs.ankiweb.net/preferences.html>
- `review.rs` @ 8127fd2 — <https://github.com/ankitects/anki/blob/8127fd24884607d7c62bdd28675d9ab9cc53e005/rslib/src/scheduler/states/review.rs>
- `fuzz.rs`, `learning.rs` — <https://github.com/ankitects/anki/tree/main/rslib/src/scheduler/states>
- `memory_state.rs` @ 5865db4 — <https://github.com/ankitects/anki/blob/5865db4adffcd48f356823c45ce185f6cccd0102/rslib/src/scheduler/fsrs/memory_state.rs>
- Releases 25.07 and 26.09 — <https://github.com/ankitects/anki/releases/tag/25.07>, <https://github.com/ankitects/anki/releases/tag/26.09>
- Licence (AGPL-3.0-or-later) — <https://github.com/ankitects/anki/blob/main/LICENSE>

**FSRS**
- Ye, Su & Cao (2022), KDD — <https://doi.org/10.1145/3534678.3539081>
- Su, Ye, Nie, Cao & Chen (2023), IEEE TKDE — <https://doi.org/10.1109/TKDE.2023.3251721>
- The Algorithm (wiki) — <https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm>
- ABC of FSRS (wiki) — <https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS>
- `ts-fsrs` v5.4.2 source and README — <https://github.com/open-spaced-repetition/ts-fsrs/tree/v5.4.2/packages/fsrs>
- npm registry `ts-fsrs` — <https://registry.npmjs.org/ts-fsrs>
- `ts-fsrs` PR #531 (FSRS-7 default in the 6.0 scheduler) — <https://github.com/open-spaced-repetition/ts-fsrs/pull/531>
- fsrs-rs @ 4bc0a09 (`inference.rs`, `inference_v6.rs`, `model_v6.rs`, `training.rs`, `training_v6.rs`) — <https://github.com/open-spaced-repetition/fsrs-rs/tree/4bc0a0979f95dd01cc653031b6f2a01429e4c32b/src>
- fsrs-rs releases — <https://github.com/open-spaced-repetition/fsrs-rs/releases>
- `@open-spaced-repetition/binding` 0.5.0 typings and README — <https://cdn.jsdelivr.net/npm/@open-spaced-repetition/binding@0.5.0/>
- `fsrs-browser` — <https://github.com/open-spaced-repetition/fsrs-browser>
- `ts-fsrs-optimizer` (third party) — <https://www.npmjs.com/package/ts-fsrs-optimizer>, <https://github.com/ihv-forge/ts-fsrs-optimizer>

**Benchmark**
- srs-benchmark README (current) — <https://github.com/open-spaced-repetition/srs-benchmark>
- srs-benchmark README @ f0cc681 (2025-06-06, last table with SM-2 rows) — <https://github.com/open-spaced-repetition/srs-benchmark/blob/f0cc6814c0/README.md>
- Commit removing SM-2 rows, 2025-08-22 — <https://github.com/open-spaced-repetition/srs-benchmark/commit/3f0b7b7516>
- Dataset — <https://huggingface.co/datasets/open-spaced-repetition/anki-revlogs-10k>

**Other schedulers**
- Settles & Meeder (2016), A Trainable Spaced Repetition Model for Language Learning, ACL — <https://doi.org/10.18653/v1/P16-1174> (*sub-agent*)
- duolingo/halflife-regression — <https://github.com/duolingo/halflife-regression>
- Leitner (1972), *So lernt man lernen*, DNB record 720145686 (*sub-agent*; catalogue record only)
- Reddy, Labutov, Banerjee & Joachims (2016), Unbounded human learning, KDD — <https://doi.org/10.1145/2939672.2939850> (*sub-agent*)
- Pavlik & Anderson (2008), J Exp Psych: Applied — <https://doi.org/10.1037/1076-898X.14.2.101> (*sub-agent*)
- Tabibian et al. (2019), MEMORIZE, PNAS — <https://doi.org/10.1073/pnas.1815156116> (*sub-agent*)
- Ebisu — <https://github.com/fasiha/ebisu>; `ebisu-js` — <https://www.npmjs.com/package/ebisu-js>
- `supermemo` (npm) — <https://github.com/VienDinhCom/supermemo>; `@open-spaced-repetition/sm-2` — <https://github.com/open-spaced-repetition/sm-2-ts>
- LECTOR (preprint) — <https://arxiv.org/abs/2508.03275>; KARL (preprint) — <https://arxiv.org/abs/2402.12291> (*sub-agent*)

**Platform**
- AsyncStorage limits (2.2.0) — <https://github.com/react-native-async-storage/async-storage/blob/%40react-native-async-storage/async-storage%402.2.0/packages/website/docs/Limits.md>
- Hermes issue #429 — <https://github.com/facebook/hermes/issues/429>
- React Native 0.84 release post — <https://reactnative.dev/blog/2026/02/11/react-native-0.84>

**Motivation**
- Silverman & Barasch (2023), On or Off Track: How (Broken) Streaks Affect Consumer Decisions, JCR — <https://doi.org/10.1093/jcr/ucac029>

**Memorization science** (§6; "full text" means an author-hosted PDF read by the sub-agent and re-checked by me where marked)
- Roediger & Karpicke (2006), Test-enhanced learning, Psychological Science — <https://doi.org/10.1111/j.1467-9280.2006.01693.x> (full text *re-fetched*)
- Rowland (2014), testing-effect meta-analysis, Psychological Bulletin — <https://doi.org/10.1037/a0037559> (PubMed abstract and full text *re-fetched*)
- Pashler, Cepeda, Wixted & Rohrer (2005), When does feedback facilitate learning of words?, JEP: LMC — <https://doi.org/10.1037/0278-7393.31.1.3>
- Karpicke & Roediger (2007), expanding vs equally spaced retrieval, JEP: LMC — <https://doi.org/10.1037/0278-7393.33.4.704> (*re-fetched*)
- Karpicke & Bauernschmidt (2011), Spaced retrieval: absolute spacing enhances learning regardless of relative spacing, JEP: LMC — <https://doi.org/10.1037/a0023436> (*re-fetched*)
- Kang, Lindsey, Mozer & Pashler (2014), Retrieval practice over the long term: should spacing be expanding or equal-interval?, PB&R — <https://doi.org/10.3758/s13423-014-0636-z> (*re-fetched*)
- Latimier, Peyre & Ramus (2021), meta-analysis of spacing retrieval practice, Educational Psychology Review — <https://doi.org/10.1007/s10648-020-09572-8> (full text *re-fetched*)
- Cepeda et al. (2006), Psychological Bulletin — <https://doi.org/10.1037/0033-2909.132.3.354>; Cepeda et al. (2008), Psychological Science — <https://doi.org/10.1111/j.1467-9280.2008.02209.x>
- Rawson & Dunlosky (2011), JEP: General — <https://doi.org/10.1037/a0023956>; Rawson, Dunlosky & Sciartelli (2013), Educ Psych Rev — <https://doi.org/10.1007/s10648-013-9240-4> (*sub-agent*)
- Sachs (1967), Perception & Psychophysics — <https://doi.org/10.3758/BF03208784> (*sub-agent*)
- Rubin (1977), Very long-term memory for prose and verse, JVLVB — <https://doi.org/10.1016/S0022-5371(77)80023-6> (abstract via Duke Scholars, *re-fetched*)
- Noice & Noice (1999), Long-term retention of theatrical roles, Memory — <https://doi.org/10.1080/096582199387977> (*sub-agent*)
- Finley, Benjamin, Hays, Bjork & Kornell (2011), accumulating vs diminishing cues, JML — <https://doi.org/10.1016/j.jml.2011.01.006> (*re-fetched*)
- Fiechter & Benjamin (2018), diminishing-cue retrieval practice, PB&R — <https://doi.org/10.3758/s13423-017-1366-9> (*sub-agent*)
- Kessels & de Haan (2003), J Clin Exp Neuropsychol — <https://doi.org/10.1076/jcen.25.6.805.16474>
- Miller (1956), Psych Review — <https://doi.org/10.1037/h0043158>; Cowan (2001), BBS — <https://doi.org/10.1017/S0140525X01003922>
- Lakenan (1913), whole and part method of memorizing poetry and prose — <https://doi.org/10.1037/h0071232>; McGeoch (1931) — <https://doi.org/10.1037/h0073938> (metadata only; abstracts UNVERIFIED)
- Rohrer, Taylor, Pashler, Wixted & Cepeda (2005), overlearning, Applied Cognitive Psychology — <https://doi.org/10.1002/acp.1083> (*re-fetched*)
- Driskell, Willis & Copper (1992), overlearning meta-analysis, J Applied Psych — <https://doi.org/10.1037/0021-9010.77.5.615> (*sub-agent*)
- Berres & Erdfelder (2021), sleep benefit meta-analysis, Psychological Bulletin — <https://doi.org/10.1037/bul0000350> (*re-fetched*)
- Mazza et al. (2016), Relearn faster and retain longer, Psychological Science — <https://doi.org/10.1177/0956797616659930> (*re-fetched*)
- Rasch & Born (2013), Physiological Reviews — <https://doi.org/10.1152/physrev.00032.2012>; Diekelmann & Born (2010), Nat Rev Neurosci — <https://doi.org/10.1038/nrn2762>
- Soderstrom & Bjork (2015), Perspectives on Psychological Science — <https://doi.org/10.1177/1745691615569000>; Bjork & Bjork (2020), JARMAC — <https://doi.org/10.1016/j.jarmac.2020.09.003>
- Slamecka & Graf (1978) — <https://doi.org/10.1037/0278-7393.4.6.592>; Bertsch et al. (2007) — <https://doi.org/10.3758/BF03193441>; McDaniel et al. (1986), JML — <https://doi.org/10.1016/0749-596X(86)90041-0> (*sub-agent*)
- Fawcett (2013), Acta Psychologica — <https://doi.org/10.1016/j.actpsy.2012.10.001>; Roberts et al. (2023), Memory & Cognition — <https://doi.org/10.3758/s13421-023-01442-2> (title *re-fetched*); Wootten et al. (2023), PsyArXiv preprint — <https://doi.org/10.31234/osf.io/f8qb3> (*sub-agent*)
