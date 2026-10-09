# Feature & Improvement Opportunities (October 2026 Research Pass)

**Author**: Research Agent
**Date**: 2026-10-08
**Status**: Completed
**Context**: A research pass covering six areas: memorization science, voice/ASR, Expo SDK 57 platform capabilities, the competitive landscape, pt-BR translation licensing, and engineering quality of the current codebase. It builds on, and corrects where needed, `competitive-benchmarks-and-feature-opportunities.md`, `../../../docs/research/02-market-research-and-feature-opportunities.md`, the TTS/VAD notes, ADRs 0001–0016 and tickets 01–70. It does not repeat them.

**Evidence conventions**
- **Verified** means read in the primary source (official docs, spec, source code, store listing, statute, or peer-reviewed abstract) on 2026-10-08, with the URL inline. Rows marked *sub-agent* were collected by a delegated research agent from the primary page. The most load-bearing of them were re-fetched by me and are marked *re-fetched*.
- **Inference** marks my reasoning from verified facts.
- **Speculative** marks ideas with thin evidence.
- **UNVERIFIED** means a primary source could not be reached or found.
- Code citations are `file:line` in `voice-ai-scripture/src/` at commit `58223ac`.

---

## 1. Executive Summary

### 1.1 Ranked recommendations

**Ranking formula:** score = (user impact 1–5 × confidence 0–1) ÷ effort (S = 1, M = 2, L = 4; S–M = 1.5). Impact and confidence are my judgement from the evidence cited in each section.

**Two items are release blockers whatever their score:** **#5** (the bundled Portuguese text is copyrighted) and **#7** (cloud API keys ship inside the app bundle).

| # | Recommendation (IDs) | Impact | Conf. | Effort | Score | One line |
|---|---|---|---|---|---|---|
| 1 | **Scoring-integrity pack** (E-R1, V1, V2) | 5 | 0.9 | S | **4.5** | Stop recording recognizer errors, empty transcripts, Android segment truncation, spoken references, digits and KJV `{…}` braces as *memory failures*. |
| 2 | **Review log + calendar-day due dates** (M1, M2) | 4 | 0.9 | S | **3.6** | Start an append-only review log now, the prerequisite for FSRS and ASR analysis, and fix "due 24 h later, not tomorrow morning". |
| 3 | **On-device-first native recognizer** (V3) | 4 | 0.8 | S | **3.2** | Locale and on-device checks, offline model download, and proper-noun-only `contextualStrings`. The package supports all of it and the app uses none of it. |
| 4 | **Remove clipboard polling; real deep links** (P1) | 3 | 0.95 | S | **2.9** | Today iOS 16+ users can get a paste-permission prompt on every app resume. |
| 5 | **Replace the bundled "ALMEIDA" text** (L1–L5) ⚠ blocker | 5 | 0.85 | S–M | **2.8** | It matches the text of the copyrighted 1967/1974 *Almeida Revisada Imprensa Bíblica*, as published in a CC BY-NC dataset. Ship Bíblia Livre (CC BY) and the full ONBV (CC BY-SA) with an attribution screen. |
| 6 | **Platform hygiene** (P2, P5, P6) | 3 | 0.9 | S | **2.7** | Enable the designed dark theme, make the diff accessible beyond colour, and localize a due-aware reminder with actions. |
| 7 | **Server proxy + key rotation** (S1) ⚠ blocker | 5 | 0.95 | M | **2.4** | `EXPO_PUBLIC_*` keys are plaintext in the bundle (Expo docs). Move the cloud STT calls and the rate limits server-side. |
| 8 | **LGPD-grade consent, on-device by default, Groq ZDR** (S2, S3) | 4 | 0.8 | S–M | **2.1** | "Convicção religiosa" is sensitive data under LGPD, and Apple 5.1.2(i) now names "third-party AI". |
| 9 | **ASR-error tolerance ("close" tier, pt-BR normalization)** (V6, C2) | 4 | 0.75 | S–M | **2.0** | Grade the learner, not the recognizer: numerals, clitics, homophones, edit distance ≤ 1. |
| 10 | **"Review all due" queue, same-session relearning, adaptive entry level** (E-R2, M4, M5) | 4 | 0.8 | M | **1.6** | One tap a day. Successive relearning after a failure. New verses no longer start in blind recitation. |
| 11 | **FSRS-6 via `ts-fsrs` 5.4.2, shadow mode first** (M3) | 4 | 0.7 | M | **1.4** | Better calibrated than every SM-2 variant in the benchmark; the 20–30% workload saving is a simulation figure. Fixes ease erosion from ASR noise. |
| 12 | **Live word-by-word recall progress + end-of-verse completion** (V4) | 4 | 0.7 | M | **1.4** | Use interim results to "follow along" and finish when the last word is said, instead of after 3.5 s of silence. |

**Below the top 12 (still worth doing):**
- iOS widget, P3 (score 1.05)
- Hands-free commute loop, C4 (≈1.0; needs #10 first)
- Chapter / long-passage mode, C5 (0.5; high value, unproven design)
- Church memory-plan decks, C7
- SpeechAnalyzer, V9
- CarPlay voice-conversational app, P9 (speculative)

### 1.2 Surprising findings

1. **The bundled Portuguese Bible is not public domain** (§6).
   - `almeida.json` matches the *Almeida Revisada Imprensa Bíblica* ("AA") from `thiagobodruk/biblia`. That repo's README names Imprensa Bíblica Brasileira as owner and licenses the dataset CC BY-NC.
   - All 9 Portuguese pack verses come from yet another Almeida edition.
   - ADR 0007's "public domain" claim is wrong.
2. **The app ships its cloud STT keys to every user** (C1). Expo, OpenAI and OWASP all warn against this. The AsyncStorage rate limiter cannot protect a key that has been extracted.
3. **Infrastructure failures are graded as memory failures** (A1, V1).
   - Recognizer errors are `console.warn`ed and the empty or partial transcript is scored.
   - On Android, `expo-speech-recognition` continuous mode is *segmented*, but the adapter keeps only the latest segment.
4. **Voice grading is no longer a moat in English, but pt-BR is open** (§5).
   - The Bible Memory App (paid speech recognition; NVI-PT added Sep 2026), Memverse (Voice Review, Feb 2026) and at least nine 2025–26 indie apps grade spoken recitation.
   - No app was found that scores spoken pt-BR against a Brazilian Bible.
5. **Competitors' changelogs show the same grading bugs found here**: numerals vs digits (Bread), punctuation as words (Speak), long-passage timeouts (Lantern, Verses).
6. **`temperature: 0` is not pure greedy decoding.** The API "will use log probability to automatically increase the temperature until certain thresholds are hit". ADR 0016's rationale needs a correction.
7. **OpenAI's `/v1/audio/transcriptions` retains nothing for abuse monitoring** ("None"), while Groq can log transcription requests for up to 30 days unless ZDR is enabled (§3.4).
8. **CarPlay gained a "voice-based conversational apps" category** (entitlement from iOS 26.4). Widgets and Live Activities also appear in CarPlay without any CarPlay entitlement.
9. **The archived benchmark shows default-parameter FSRS-6 beating every SM-2 variant** (§2.2).

   | Model | Log loss | RMSE (bins) |
   |---|---|---|
   | FSRS-6, default parameters | 0.366 | 0.093 |
   | Anki-SM-2 | 0.616 | 0.172 |

   But no primary source maps a *continuous* score onto FSRS ratings. The mapping in §2.3 is this note's own proposal.

## 2. Memorization Science & Scheduling

### 2.1 What the learning science supports (verified: peer-reviewed abstracts, DOIs resolved 2026-10-08)

| Principle | Primary evidence | What it means for this app (inference) |
|---|---|---|
| **Retrieval practice** beats restudy, and **recall beats recognition** | Roediger & Karpicke 2006: "prior testing produced substantially greater retention than studying" ([doi:10.1111/j.1467-9280.2006.01693.x](https://doi.org/10.1111/j.1467-9280.2006.01693.x)). Rowland 2014 meta-analysis: "initial recall tests yielding larger testing benefits than recognition tests" ([doi:10.1037/a0037559](https://doi.org/10.1037/a0037559)). Adesope et al. 2017 meta-analysis ([doi:10.3102/0034654316689306](https://doi.org/10.3102/0034654316689306)). | Level 3 voice recall is the strongest mode the app has. Levels 1–2 should feed into it, not replace it. Competitors' tap-to-fill and word-bank games (§5) are recognition tasks, which are weaker. |
| **Spacing**: the optimal gap grows with the retention interval | Cepeda et al. 2006: "the ISI producing maximal retention increased as retention interval increased" ([doi:10.1037/0033-2909.132.3.354](https://doi.org/10.1037/0033-2909.132.3.354)). Cepeda et al. 2008: the optimal gap "declined from about 20 to 40% of a 1-week test delay to about 5 to 10% of a 1-year test delay" ([doi:10.1111/j.1467-9280.2008.02209.x](https://doi.org/10.1111/j.1467-9280.2008.02209.x)). | Expanding intervals are right. A scheduler that models forgetting directly (FSRS, §2.2) should outperform fixed SM-2 multipliers. |
| **Successive relearning**: reach criterion in a session, then relearn across spaced sessions | Rawson & Dunlosky 2011: "practice recalling … to an initial criterion of 3 correct recalls and then to relearn them 3 times at widely spaced intervals" ([doi:10.1037/a0023956](https://doi.org/10.1037/a0023956)). Rawson & Dunlosky 2022 ([doi:10.1177/09637214221100484](https://doi.org/10.1177/09637214221100484)). | **Gap.** Today a failed Level 3 attempt only reschedules for tomorrow (`srsEngine.ts:53-56`). Nothing requires a correct recall in the same session. Original SM-2 also says to "repeat again all items that scored below four … until all of these items score at least four" ([SuperMemo SM-2](https://www-v1.supermemo.com/archives1990-2015/english/ol/sm2)). |
| **Feedback after errors** is where the value lies | Pashler et al. 2005: supplying the correct answer after an incorrect response "increased final retention by 494% … feedback after correct responses made little difference" ([doi:10.1037/0278-7393.31.1.3](https://doi.org/10.1037/0278-7393.31.1.3)). Butler & Roediger 2008 ([doi:10.3758/MC.36.3.604](https://doi.org/10.3758/MC.36.3.604)). | `DiffView` already gives this. Make the correction richer: replay the canonical audio of only the missed span. |
| **Unsuccessful attempts still help** if the answer follows | Kornell, Hays & Bjork 2009: "Unsuccessful retrieval attempts enhanced learning" ([doi:10.1037/a0015729](https://doi.org/10.1037/a0015729)). | Encourage a full attempt before Word Peek. Peeking after trying is pedagogically fine. |
| **Production effect**: saying words aloud improves memory | MacLeod et al. 2010: producing a word aloud "improves explicit memory" ([doi:10.1037/a0018785](https://doi.org/10.1037/a0018785)). Forrin & MacLeod 2018: benefit from "a motor (speech) act and a unique, self-referential auditory input" ([doi:10.1080/09658211.2017.1383434](https://doi.org/10.1080/09658211.2017.1383434)). Fawcett 2013 meta-analysis, between-subjects g = 0.37 ([doi:10.1016/j.actpsy.2012.10.001](https://doi.org/10.1016/j.actpsy.2012.10.001)). | This is real scientific support for the voice-first thesis. **Caveat:** most evidence uses single-word *recognition*, so marketing should not claim "proven for verses". Hearing your own voice is part of the benefit, which suggests an optional "listen to my recitation" replay. That would need audio retention, a privacy trade-off (§3.4). |
| **Generation effect** | Slamecka & Graf 1978 ([doi:10.1037/0278-7393.4.6.592](https://doi.org/10.1037/0278-7393.4.6.592)). Bertsch et al. 2007 meta-analysis: effect ".40 — a benefit of almost half a standard deviation" ([doi:10.3758/BF03193441](https://doi.org/10.3758/BF03193441)). | Supports Cloze (generate from a cue) over Echo (listen and repeat) as the bridge to Level 3. |
| **Interleaving** is *not* a win for verbal material | Brunmair & Richter 2019: "An advantage of blocking compared with interleaving was found for studies based on words (g = −0.39) … should be used with caution … especially for expository texts and words" ([doi:10.1037/bul0000209](https://doi.org/10.1037/bul0000209)). | Do not build "mixed shuffle" review modes for pedagogical reasons. Order the queue by urgency instead. |
| **First-letter and vanishing cues**: weak evidence in healthy adults | Glisky, Schacter & Tulving 1986 (memory-impaired patients) ([doi:10.1080/01688638608401320](https://doi.org/10.1080/01688638608401320)). Kessels & de Haan 2003 meta-analysis: "no significant ES was demonstrated for the vanishing cues method" ([doi:10.1076/jcen.25.6.805.16474](https://doi.org/10.1076/jcen.25.6.805.16474)). **No peer-reviewed study of first-letter cueing for verbatim passages in healthy adults was found** (search unsuccessful; UNVERIFIED either way). | Keep Level 2 as a *scaffold*. Don't market it as proven, and don't count Level 2 success as learning (see desirable difficulties). Fading-cue variants are an experiment, not a priority. |
| **Chunking** and limits on working memory | Cowan 2001: "a central capacity limit averaging about four chunks" ([doi:10.1017/S0140525X01003922](https://doi.org/10.1017/S0140525X01003922)). Part-vs-whole studies (Lakenan 1913; McGeoch 1933) were located, but their abstracts are **UNVERIFIED**. | Long passages should be learned in clause- or verse-sized chunks and then chained (§5, chapter mode). Classic part-vs-whole evidence is old and unverified, so this is a design heuristic, not a proven protocol. |
| **Desirable difficulties**: performance during practice misleads | Soderstrom & Bjork 2015: "people often mistakenly interpret their performance during acquisition as a reliable guide to long-term learning" ([doi:10.1177/1745691615569000](https://doi.org/10.1177/1745691615569000)). Bjork & Bjork 2020 ([doi:10.1016/j.jarmac.2020.09.003](https://doi.org/10.1016/j.jarmac.2020.09.003)). | Already respected: only Level 3 counts. Keep it that way. |

### 2.2 Is SM-2 still the right scheduler? (verified facts, then inference)

**How the current implementation behaves** (verified in code, `src/engines/srsEngine.ts`)
- **Ease erosion.** A pass at 80–89% maps to quality 3, which cuts the ease factor by 0.14 every time (`:70-71`). That matches Wozniak's formula, `EF':=EF+(0.1-(5-q)*(0.08+(5-q)*0.02))` ([SuperMemo SM-2](https://www-v1.supermemo.com/archives1990-2015/english/ol/sm2)). Mis-heard words make 80–89% outcomes likely even when the learner knows the verse (§3). Nine such reviews take ease from 2.5 to the 1.3 floor. This is the "ease hell" problem, aggravated by ASR noise.
- **Overdue reviews get no credit.** The next interval ignores how late the review happened (`:64`). A verse recalled perfectly after 30 days overdue gets the same multiplier as one reviewed on time.
- **No fuzz.** Verses imported together from a topical pack stay due on the same days forever (`:74`).

**FSRS: current state** (verified)
- **Version.** FSRS-6 is the current stable algorithm: 21 parameters and a trainable forgetting-curve decay ([algorithm wiki](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm)). Anki adopted FSRS-6 in **25.07** ("FSRS-6 brings further algorithm improvements", [release](https://github.com/ankitects/anki/releases/tag/25.07)). FSRS first shipped in Anki **23.10** ([deck options](https://docs.ankiweb.net/deck-options.html)). FSRS-7 exists in the benchmark and in the ts-fsrs 6.0 *beta*; that Anki ships it is **UNVERIFIED**.
- **Papers.**
  - Ye, Su & Cao, KDD 2022 ([doi:10.1145/3534678.3539081](https://doi.org/10.1145/3534678.3539081)): "12.6% performance improvement over the state-of-the-art methods".
  - Su et al., IEEE TKDE 2023 ([doi:10.1109/TKDE.2023.3251721](https://doi.org/10.1109/TKDE.2023.3251721)): "reduces 64% error and 17% cost … compared to several baselines".
- **Benchmark** (Anki data from about 10k users and ~727M reviews; [srs-benchmark](https://github.com/open-spaced-repetition/srs-benchmark)). SM-2 rows were removed from the current README in Aug 2025. The comparable numbers come from the archived June 2025 table ([f0cc6814c0](https://github.com/open-spaced-repetition/srs-benchmark/blob/f0cc6814c0/README.md)):

  | Model | Log loss | RMSE (bins) | AUC |
  |---|---|---|---|
  | FSRS-6 | 0.3456 | 0.0653 | 0.7051 |
  | FSRS-6 *default parameters* | 0.3661 | 0.0927 | 0.6956 |
  | FSRS-6 binary (Again/Good only) | 0.3509 | 0.0676 | 0.6848 |
  | Anki-SM-2 | 0.616 | 0.1724 | 0.6133 |
  | SM-2 | 0.722 | 0.2031 | 0.6026 |

  The benchmark itself cautions that "SM-2 wasn't designed to predict probabilities".
- **Workload.** "With FSRS, users have to do 20–30% fewer reviews than with SM-2 algorithm to achieve the same retention level (2026-02-12 udpate: the figure is based on simulation results)" ([ABC of FSRS](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS)). This is a simulation, not a field measurement.
- **Anki's guidance** ([deck options](https://docs.ankiweb.net/deck-options.html); [FSRS FAQ](https://docs.ankiweb.net/faqs/frequently-asked-questions-about-fsrs)):
  - Desired retention defaults to 90%: "Above 90% the workload increases very quickly".
  - "In Anki 24.06.3 (and newer versions), the optimizer can be used with any number of reviews". Re-optimize "every time the number of reviews doubles".
  - Using only Again and Good is fine: "FSRS may even be more accurate if you only use Again and Good".
  - Hard "is a passing grade, not a failing grade". Pressing it on a failed recall makes "all intervals … unreasonably high".
- **Library.** `ts-fsrs` **5.4.2** (MIT, FSRS-6) is the latest stable on npm ([registry](https://registry.npmjs.org/ts-fsrs/latest), checked 2026-10-08).
  - API: `fsrs({request_retention, maximum_interval, enable_fuzz, enable_short_term, learning_steps, relearning_steps})`, `repeat`/`next`, a `Rating` enum (Again 1 … Easy 4), a `ReviewLog` type, and `reschedule(card, reviews)` for replaying history ([README](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md)).
  - The **default `enable_fuzz` is `false`** ([constant.ts](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/constant.ts)).
  - SM-2 → FSRS conversion is available as `memoryStateFromSM2(easeFactor, interval, sm2Retention)` in the **beta** `@open-spaced-repetition/binding` 0.5.0 ([typings](https://cdn.jsdelivr.net/npm/@open-spaced-repetition/binding@0.5.0/dist/index.d.ts)). The FSRS-6 formula in `fsrs-rs` ([model_v6.rs](https://github.com/open-spaced-repetition/fsrs-rs)) is simple arithmetic and portable to TS.

**Verdict (inference).**
- **FSRS would materially improve calibration**, which is what decides whether a verse comes back before it is forgotten. Even with *default* parameters it beats every SM-2 variant in the archived table.
- **Expect a workload reduction, but treat 20–30% as an upper-bound simulation figure.** The benchmark is Anki flashcards, not 20–60-word verbatim recitations scored by noisy ASR, so the gain for this app is plausible but unmeasured.
- **FSRS fixes all three current behaviours:** it uses elapsed time (overdue credit), supports fuzz, and has no multiplicative ease erosion.
- **The binding constraint is not the algorithm. It is the missing review log (finding B3).** Start logging now: it costs almost nothing and keeps every future option open.

### 2.3 Turning a partial recitation into a scheduler grade

No primary source maps a continuous accuracy score onto FSRS ratings (searched FSRS docs, wiki and issues: **none found**). The only primary guidance is Anki's "be strict": "if it counts as a fail in a real-life context … then it counts as a fail in Anki as well" ([Anki manual](https://docs.ankiweb.net/studying.html)). SM-2's own grade definitions are "4 - correct response after a hesitation; 3 - correct response recalled with serious difficulty" ([SM-2](https://www-v1.supermemo.com/archives1990-2015/english/ol/sm2)).

**Proposed mapping (inference; validate against the review log):**

| Signal (computed after ASR-error tolerance, §3) | FSRS rating | Rationale |
|---|---|---|
| Empty or very short transcript after detected speech, or a recognizer error | **No rating.** Infrastructure failure, retry. | Fixes A1/A2 and honours ADR 0006. |
| Word Peek used | **Again**, but the *display* streak is preserved (UX rule, as today) | Anki: Hard is a pass, and grading an assisted recall Hard inflates intervals. Keeping the streak keeps ADR 0011/0012's non-punitive feel. **Product decision needed (§9).** |
| Adjusted F1 < 80 | **Again**, then relearn in the same session | Successive relearning (§2.1) |
| 80 ≤ F1 < 90 | **Hard** | Matches SM-2 q=3. Unlike today, stability still grows. |
| 90 ≤ F1 < 100, or 100 with long hesitations | **Good** | Expected to be the dominant grade (Anki says Good is 80–95% of presses) |
| 100, no peeks, no thinking-grace pauses (the VAD already measures 1.5 s pauses) | **Easy**, or start with Good only | Avoid inflating Easy. A binary Again/Good variant costs little accuracy (0.3509 vs 0.3456 log loss). |

### 2.4 Recommendations

| ID | Recommendation | User value | Evidence | Effort | Dependencies | Risks | Touches |
|---|---|---|---|---|---|---|---|
| M1 | **Append-only review log, starting now.** One row per official attempt: verseId, timestamp, raw F1, adjusted F1, peeks, level, engine (native/cloud), transcript token count, duration, longest pause, derived rating, scheduled days. | Makes FSRS migration, parameter optimisation and ASR-quality analysis possible later. | B3; FSRS needs history (§2.2) | S | Store outside the single `verses` blob (Android 6 MB cap, §4) | Storage growth. Prune or compact after export. | `VerseEngine.ts:378-408`, `StorageAdapter.ts` |
| M2 | **Calendar-day due dates** with a configurable day-start hour (e.g. 04:00, like Anki), plus ±fuzz | Evening reviewers see verses due the next morning. Pack imports spread out. | B1; `srsEngine.ts:74,90-96` | S | none | Changes due counts. One-time migration of `nextReviewDate`. | `srsEngine.ts`, `VerseEngine.getVersesSummary` |
| M3 | **Adopt FSRS-6 via `ts-fsrs` 5.4.2.** Run it in shadow mode for 2–4 weeks (log FSRS due dates next to SM-2's), then cut over. Seed existing verses with the SM-2→FSRS formula. Expose desired retention as a three-step "gentle / standard / thorough" setting (e.g. 0.85 / 0.90 / 0.95). | Fewer unnecessary reviews at the same retention; better handling of overdue verses. | §2.2 | M | M1. `enable_fuzz: true` must be set explicitly. | The FSRS item model differs from a verse recitation, and ASR noise distorts ratings. Mitigate with §3 tolerance and shadow mode. **Updates PRODUCT.md, which already promises FSRS.** | `srsEngine.ts`, `recitationEvaluator.ts`, `VerseEngine.ts`, ADR 0005 (new ADR needed) |
| M4 | **Relearn to criterion in the same session.** After an Again, re-queue the verse at the end of today's queue at Level 2, then Level 3, until it scores ≥ 90%. | Converts failures into same-day learning instead of a next-day retry. | Successive relearning; SM-2 "repeat … until … at least four" | S–M | Review queue (C3 / E-R2) | Session length. Cap at 2 relearn loops. | `RecitationSession.ts`, `HomeScreen.tsx` |
| M5 | **Adaptive entry level.** New verses start in a learning sequence (Echo → Cloze → Blind) in one sitting. Lapsed verses start at Cloze. Mature verses start at Blind. | Removes the "new verse opens in blind recitation" cliff (B4). | Generation effect; desirable difficulties | S | none | none | `ReviewScreen.tsx:79`, `RecitationSession.ts:145` |
| M6 | **Corrective replay.** After a recitation, offer "hear what I missed": TTS reads only the missed span(s) in canonical form. | Targeted feedback after errors | Pashler 2005; Butler & Roediger 2008 | S | `SpeechSynthesizer` | none | `DiffView.tsx`, `RecitationSession.ts` |
| M7 | **Overdue triage by retrievability** once FSRS is in: order the queue by lowest predicted recall, cap the daily load, and frame it as a "gentle catch-up". | Directly addresses the backlog guilt both prior notes flagged | FSRS models recall probability. The prior notes' "Sabbath/catch-up" idea becomes principled. | S (after M3) | M3 | none | `VerseEngine.getVersesSummary` |

## 3. Voice & ASR

*Context:* `docs/research/speech-transcription-apis.md` and `ideal-voice-architecture-for-scripture-memorization.md` are **empty files**, so this section is the first written STT survey in the repo. Prices were fetched 2026-10-08 unless noted otherwise.

### 3.1 On-device recognition

**`expo-speech-recognition` (the package the app uses)**
- **Version mapping.** Versions 57.x exist on npm (57.0.0 published 2026-08-30, 57.1.0 on 2026-09-16, 57.1.1 on 2026-10-08) ([npm registry](https://registry.npmjs.org/expo-speech-recognition)). The changelog says 57.0.0 is "Official support for Expo SDK 57 (React Native 0.86)" ([CHANGELOG](https://github.com/jamsch/expo-speech-recognition/blob/main/CHANGELOG.md)).
- **Android continuous mode is segmented** (README, re-fetched 2026-10-08): "On Android, continous mode runs as a segmented session, meaning when a final result is reached, additional partial and final results will cover a new segment separate from the previous final result." On iOS, "you should expect one final result" ([README](https://github.com/jamsch/expo-speech-recognition)).
  - **This confirms a likely bug.** `NativeStreamVoiceAdapter` overwrites `liveTranscript` with the latest `results[0].transcript` (`VoiceInput.ts:94-99`). On Android, any pause long enough to finalize a segment discards everything recited before it, which produces "missed" words and a failed review the learner did not earn.
- **Biasing.** `contextualStrings` maps to "EXTRA_BIASING_STRINGS … (API level 33+)" on Android and to `SFSpeechRecognitionRequest.contextualStrings` on iOS ([types.ts](https://github.com/jamsch/expo-speech-recognition/blob/main/src/ExpoSpeechRecognitionModule.types.ts), sub-agent).
- **A real meter exists.** `volumechange` "Returns a value between -2 and 10 indicating the volume of the input audio. Consider anything below 0 to be inaudible" (re-fetched). The app instead synthesizes a sine-wave meter from result timing (`VoiceInput.ts:137-148`).
- **Other options** (README): `requiresOnDeviceRecognition` ("Prevent device from sending audio over the network. Only enabled if the device supports it."), `addsPunctuation`, `iosTaskHint`, `androidIntentOptions`, and `recordingOptions.persist` ("Android 13+ and iOS only"), which saves the captured audio while recognizing.
- **Errors and helpers.** Error codes include `no-speech`, `network`, `language-not-supported` and `speech-timeout`. Helpers include `getSupportedLocales()`, `supportsOnDeviceRecognition()` and `androidTriggerOfflineModelDownload()` (README, sub-agent).
- **Word timing.** Word confidence and timing are available on Android "only with on-device recognition" (README feature matrix). `continuous` is "Not supported on Android 12 and below".
- **No SpeechAnalyzer support was found.** The README describes only "the iOS SFSpeechRecognizer, Android SpeechRecognizer and Web SpeechRecognition"; my re-fetch found no mention of SpeechAnalyzer, and the sub-agent's repo search returned nothing. Community wrappers claim SpeechAnalyzer support, e.g. `react-native-nitro-speech` 0.4.9 ([npm](https://www.npmjs.com/package/react-native-nitro-speech), sub-agent; **not evaluated**).

**Apple** (developer.apple.com, sub-agent fetches)
- **SpeechAnalyzer shipped in iOS 26.0** (not beta; [SpeechAnalyzer](https://developer.apple.com/documentation/speech/speechanalyzer)).
  - `SpeechTranscriber` needs a runtime check: "Use the isAvailable or supportedLocales properties … If it does not, consider … using DictationTranscriber instead" ([SpeechTranscriber](https://developer.apple.com/documentation/speech/speechtranscriber)).
  - **pt-BR support for SpeechTranscriber is UNVERIFIED in Apple's text.** WWDC25 showed the language list only on a slide ([WWDC25 session 277](https://developer.apple.com/videos/play/wwdc2025/277/)).
  - Contextual strings are documented for `DictationTranscriber` ("Limit the total number of phrases … to no more than 100") ([AnalysisContext.contextualStrings](https://developer.apple.com/documentation/speech/analysiscontext/contextualstrings)).
  - Word timing (`audioTimeRange`) and 0–1 `transcriptionConfidence` are opt-in attributes ([ResultAttributeOption](https://developer.apple.com/documentation/speech/speechtranscriber/resultattributeoption)).
  - Privacy: "[SpeechAnalyzer] transcriber modules don't send audio data of the user's voice to Apple's servers" (§3.4).
  - The June 2026 (iOS 27) updates add file, asset and capture input providers ([Speech updates](https://developer.apple.com/documentation/updates/speech)).
- **Legacy `SFSpeechRecognizer`** (the app's current iOS path):
  - "the framework stops speech recognition tasks that last longer than one minute", and "Individual devices may be limited in the number of recognitions that can be performed per day" ([SFSpeechRecognizer](https://developer.apple.com/documentation/speech/sfspeechrecognizer)). Verses' Siri-based mode hit exactly this "one minute time rule" (§5).
  - `requiresOnDeviceRecognition` is honoured only if `supportsOnDeviceRecognition` is true, and "on-device requests won't be as accurate" ([docs](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition)).

**Android** ([SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer), [RecognizerIntent](https://developer.android.com/reference/android/speech/RecognizerIntent), sub-agent)
- `createOnDeviceSpeechRecognizer` and `isOnDeviceRecognitionAvailable` need API 31.
- `EXTRA_BIASING_STRINGS` and `triggerModelDownload` need API 33.
- `EXTRA_REQUEST_WORD_TIMING/CONFIDENCE` need API 34.
- `onRmsChanged`: "There is no guarantee that this method will be called."

**Open on-device models** (sub-agent, model cards)
- **whisper.rn 0.7.4** needs prebuild and has no config plugin ([GitHub](https://github.com/mybigday/whisper.rn)).
- **Parakeet-TDT-0.6B-v3:** "our training data uses European Portuguese while most benchmarks use Brazilian Portuguese"; FLEURS pt WER 4.76% ([model card](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3)).
- **NVIDIA Nemotron 3.5 ASR streaming 0.6B:** pt-BR, FLEURS pt_br WER 5.48% ([model card](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b)). RN loading via `react-native-sherpa-onnx` is **UNVERIFIED**.
- **Moonshine:** no Portuguese.

*Inference:* these are not yet a better pt-BR option than the OS recognizers plus a cloud fallback.

### 3.2 Cloud recognition: models, prices and word timestamps

| Provider / model | pt-BR | Streaming | Word timestamps | Price | Source / notes |
|---|---|---|---|---|---|
| **Groq `whisper-large-v3-turbo`** (current) | yes | no | yes (`verbose_json` + `timestamp_granularities[]=word`; "generating word timestamps incurs additional latency") | **$0.04/h**, "billed for 10 seconds" minimum | Groq STT docs and pricing ([console.groq.com/docs/speech-to-text](https://console.groq.com/docs/speech-to-text). The live pages returned 403 to the sub-agent, so they were read from a Wayback Machine snapshot dated 2026-09-14; **secondary copy**). Latency note verified in the [groq-typescript SDK](https://github.com/groq/groq-typescript/blob/main/src/resources/audio/transcriptions.ts). Groq's own WER column: turbo 12%, v3 10.3% (benchmark unnamed). Prompt limit 224 tokens. |
| Groq `whisper-large-v3` | yes | no | yes | $0.111/h | same |
| **OpenAI `gpt-transcribe`** (new default) | yes (`languages[]`) | `stream=true` (file) | **no** ("`timestamp_granularities[]` … only supported for `whisper-1`") | **$0.0045/min** | "Start with `gpt-transcribe`. This is the recommended model" ([STT guide](https://developers.openai.com/api/docs/guides/speech-to-text), [pricing](https://developers.openai.com/api/docs/pricing); both re-fetched). Supports `keywords[]` biasing ("hints, not required output"). |
| OpenAI `gpt-4o-transcribe` / `-mini` | yes | `stream=true` | no | $0.006 / $0.003 per min | FLEURS pt WER 2.63% / 3.36% vs whisper-large-v3 3.92% (chart data in [OpenAI's launch post](https://openai.com/index/introducing-our-next-generation-audio-models/), read from a Wayback Machine snapshot dated 2025-03-30 by the sub-agent; vendor-reported) |
| OpenAI `whisper-1` (current fallback) | yes | no | yes | $0.006/min | Pricing (re-fetched) |
| Deepgram Nova-3 | yes (`pt-BR`) | yes | yes + per-word confidence | batch $0.0043/min; streaming $0.0048 (promo) / $0.0077 (regular); keyterm +$0.0013/min | [Pricing](https://deepgram.com/pricing), [keyterm](https://developers.deepgram.com/docs/keyterm) ("100 important terminology"). Retains audio by default unless `mip_opt_out=true` (§3.4). |
| Google Chirp 3 | yes (GA) | yes | batch only | $0.016/min (Standard V2 tier; chirp_3 not named on the pricing page) | [Chirp 3 docs](https://cloud.google.com/speech-to-text/v2/docs/chirp_3-model) |
| Azure Speech + **Pronunciation Assessment** | yes. PA covers 33 locales, including pt-BR. | yes | yes (Offset/Duration) | real-time $1/h; batch $0.18/h | Scripted mode: "Set the reference text … for the reading language learning scenario". Per-word "Omission, Insertion, Mispronunciation". Prosody "only available in the en-US locale". Miscue is not supported in continuous mode (>30 s) ([how-to](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment), [languages](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=pronunciation-assessment)) |
| AssemblyAI / ElevenLabs Scribe v2 / Speechmatics | yes | yes | yes | $0.15–0.45/h / $0.22–0.39/h / ~$0.80/h RT undiscounted | Sub-agent rows; vendor pricing pages |

**Unit cost at today's volumes (inference from the prices above).** With Groq's 10-second minimum, a typical verse recitation (≤ 10 s) costs about **$0.00011**, and a 30-s passage about $0.00033. The same 30-s passage costs $0.0023 on `gpt-transcribe` and $0.0022 on Deepgram batch. ADR 0015's "< $0.0007 per recitation" still holds for Groq. Groq remains roughly 7× cheaper than the alternatives; the open question is accuracy on *recited pt-BR scripture*, for which no vendor publishes numbers.

**The `temperature: 0` semantics differ from ADR 0016's description.** Groq's SDK documents the parameter, which matches OpenAI's API reference as quoted by the sub-agent: "If set to 0, the model will use log probability to automatically increase the temperature until certain thresholds are hit" ([groq-typescript](https://github.com/groq/groq-typescript/blob/main/src/resources/audio/transcriptions.ts), verified 2026-10-08). So `0` does not guarantee pure greedy decoding. The API raises the temperature precisely on low-confidence stretches, which are the hallucination-prone cases ADR 0016 worried about. Sending `0` is still reasonable, but the ADR's rationale ("strictly necessary to preserve phonetic fidelity") should be corrected.

### 3.3 Real-time word-by-word progress, and fluency signals

**Verified capabilities**
- Native recognizers emit interim (partial) results on both platforms. Apple's SpeechTranscriber offers a `timeIndexedProgressiveTranscription` preset (volatile results plus time ranges, [Preset](https://developer.apple.com/documentation/speech/speechtranscriber/preset), sub-agent).
- Memverse's 2026 Voice Review shows "Real-time transcription shows what you're saying" ([blog](https://www.memverse.com/blog/)). Engraved "follows along word by word" (§5).
- The prior VAD note already recommended incremental token alignment, where verification triggers when the final words are spoken (`voice-activity-detection-and-silence-detection.md` §3).

**Fluency signals available today at no extra cost** (sub-agent; Groq per the SDK source)
- Groq word timestamps (`verbose_json`).
- Groq segment `avg_logprob` and `no_speech_prob`.
- iOS final-result segments.
- Android 14+ on-device word timing.
- `volumechange`.

*Inference:* the gap before a word is a usable "weak link" signal, since the word after a long pause is where recall stalled.

### 3.4 Audio privacy, LGPD and store compliance (verified, fetched 2026-10-08)

**LGPD: religious conviction is sensitive data**
- Art. 5 II defines "dado pessoal sensível: dado pessoal sobre origem racial ou étnica, **convicção religiosa**, …" ([Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm), re-fetched).
- Art. 11 §1 extends the rules to processing "que revele dados pessoais sensíveis" (sub-agent quote). Which verses a person memorizes, and the transcripts of their recitations, plausibly reveal religious conviction.
- Processing sensitive data on a consent basis requires that the holder "consentir, de forma específica e destacada, para finalidades específicas" (Art. 11 I, re-fetched).
- An international transfer by consent requires "consentimento específico e em destaque para a transferência, com informação prévia sobre o caráter internacional da operação" (Art. 33 VIII, re-fetched).
- ANPD Resolução 19/2024 sets standard contractual clauses that must be adopted "integral e sem alteração" ([DOU](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-19-de-23-de-agosto-de-2024-580095396), sub-agent). That is impractical with self-serve US APIs, so **Art. 33 VIII consent is the realistic route** *(inference)*.
- Voice is not "biometric" under ANPD's reading unless it is used for unique identification (NT 17/2025, sub-agent). **Do not add speaker identification.**

**Apple**
- Guideline 5.1.2(i): "You must clearly disclose where personal data will be shared with third parties, **including with third-party AI**, and obtain explicit permission before doing so." Guideline 2.5.14 requires "a clear visual and/or audible indication when recording" ([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), re-fetched).
- App Privacy labels: "'Collect' refers to transmitting data off the device in a way that allows you and/or your third-party partners to access it for a period longer than what is necessary to service the transmitted request in real time", and "Data that is processed only on device is not 'collected'" ([App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/), sub-agent).
- Apple's legacy recognizer "involves capturing audio of the user's voice and sending that data to Apple's servers". The newer "[SpeechAnalyzer] transcriber modules don't send audio data of the user's voice to Apple's servers" ([Asking permission to use speech recognition](https://developer.apple.com/documentation/speech/asking-permission-to-use-speech-recognition), sub-agent).
- Apple also advises: "Do not perform speech recognition on private or sensitive information" ([SFSpeechRecognizer](https://developer.apple.com/documentation/speech/sfspeechrecognizer), sub-agent).

**Google Play and Android**
- "'Collect' means transmitting data from your app off a user's device". Ephemerally processed data must still be included in the form, but may be hidden from the public label ([Data safety](https://support.google.com/googleplay/android-developer/answer/10787469), sub-agent).
- Play's User Data policy applies to "third-party AI integrations" ([policy](https://support.google.com/googleplay/android-developer/answer/10144311), sub-agent).
- Android's recognizer "is likely to stream audio to remote servers" unless `createOnDeviceSpeechRecognizer` is used ([SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer), sub-agent).

**Vendor retention**
- **OpenAI.** The `/v1/audio/transcriptions` row reads: training "No", abuse-monitoring retention "**None**", application-state retention "None", ZDR eligible "Yes". By contrast, `/v1/audio/speech` keeps "30 days" ([Your data](https://developers.openai.com/api/docs/guides/your-data), re-fetched).
- **Groq.** "By default, Groq does not retain customer data for inference requests", but it "may temporarily log inputs and outputs … for up to 30 days". "All customers may enable Zero Data Retention (ZDR) in Data Controls". Data is held in US GCP buckets. *Source:* the live page returned 403, so this comes from the [Wayback capture of 2026-09-23](https://web.archive.org/web/20260923121047/https://console.groq.com/docs/your-data); it is a secondary copy of a primary page.
- **Deepgram.** "Requests participate in the Model Improvement Program (MIP) by default, and Deepgram retains them", unless each request sends `mip_opt_out=true` ([Deepgram your data](https://developers.deepgram.com/trust-security/your-data), sub-agent).

**API keys in the client**
- OpenAI: "Don't share it with others or expose it in any client-side code such as browsers or apps" ([API reference](https://developers.openai.com/api/reference/overview), sub-agent).
- OWASP MASWE-0004 warns attackers can "abuse compromised API keys to make unauthorized billed API calls (e.g., AI/ML services)" and recommends "Proxy Static Secrets Through a Middleware" ([OWASP](https://mas.owasp.org/MASWE/MASVS-STORAGE/MASWE-0004/), sub-agent).

**Recommendations (S1–S4)**

The evidence for each item is in the rows directly above. User value is legal shipability plus user trust. Main risks: S1 adds the first server component (§9 Q3), and S2 trades accuracy for privacy (§9 Q4).

| ID | Recommendation | Effort | Touches |
|---|---|---|---|
| S1 | **Server proxy for cloud STT, and rotate the exposed keys.** Use a thin stateless proxy (Expo Router API route, EAS Hosting or any edge function) that holds the Groq key, enforces per-install quotas server-side (moving ADR 0015's limits off the device), logs no audio or transcripts, and optionally checks `@expo/app-integrity` (alpha). *This is the one exception to ADR 0002's no-backend stance; it adds no user database.* | M | `VoiceInput.ts`, `SpeechTranscriber.ts`, `SubscriptionService.ts`, ADR 0002/0015 |
| S2 | **On-device recognition by default.** Make cloud transcription an explicit "higher accuracy" opt-in, with LGPD-grade consent: specific and highlighted, naming the vendor and the US destination, separately consenting to international transfer, revocable in Settings, with consent version and timestamp stored locally. One screen also satisfies Apple 5.1.2(i) and Play's third-party-AI rule. | S–M | New consent modal; `createDefaultVoiceInput` precedence (`VoiceInput.ts:360-394`) |
| S3 | **Turn on Groq ZDR**, and pass `mip_opt_out=true` if Deepgram is ever used. Document per-vendor retention in a pt-BR/EN privacy policy. Answer App Privacy with "Audio Data – App Functionality, not linked" if any vendor retention remains. | S | Ops; store listings |
| S4 | **Make deletion verifiable.** Have `deleteAudioFile` report failures, sweep the recordings directory at startup, and never log URIs or transcripts (C3, C8). | S | `AudioDriver.ts:386-410`, `SpeechTranscriber.ts:151` |

*Not legal advice.* Confirm with Brazilian counsel, especially whether verse and transcript data count as sensitive data under Art. 11 §1, and Apple 5.1.1(ix)'s expectation that apps requiring sensitive information be submitted by a legal entity.

### 3.5 Recommendations

| ID | Recommendation | User value | Evidence | Effort | Native / deps | Risks | Touches |
|---|---|---|---|---|---|---|---|
| V1 | **Concatenate Android segments**: keep a `finals[]` array plus the current partial, and diff `finals.join(' ')`. | Stops truncated transcripts and unearned failures on Android | README quote above | **S** | none | none | `VoiceInput.ts:94-99,151-165` |
| V2 | **Real meter and real errors**: enable `volumeChangeEventOptions` and feed the VAD from it. Map `no-speech`, `network`, `language-not-supported`, `speech-timeout` and `audio-capture` to user-facing states and `TranscriptionError`, never to a score. | VAD works on the native path. Infrastructure failures stop resetting streaks (A1). | README; ADR 0006 | **S** | none | Re-tune VAD thresholds for the −2…10 scale | `VoiceInput.ts:101-103,137-148`, `VoiceActivityDetector.ts` |
| V3 | **On-device-first configuration**: check `getSupportedLocales()` and `supportsOnDeviceRecognition()` for pt-BR/en, offer `androidTriggerOfflineModelDownload` once, set `requiresOnDeviceRecognition` when supported, and pass **only rare proper nouns** from the verse (≤ 100 one- or two-word phrases) as `contextualStrings`. Never pass the whole verse. | Privacy (§3.4), offline use, better recognition of names like *Nabucodonosor* without masking real memory slips | Apple/Android/README quotes; the spec's own user story 9 | S | none | On-device accuracy is lower ("won't be as accurate"), so keep the cloud opt-in. | `VoiceInput.ts:106-110`, `NativeSpeechRecognitionHelper.ts` |
| V4 | **Live recall progress plus end-of-verse completion**: incrementally align interim results against the canonical text. In Level 3, reveal each *recalled* word as it is spoken (never upcoming words), and finish immediately once the last canonical word aligns instead of waiting 3.5 s of silence. | Faster, more encouraging turn-taking. This matches the newest competitors and the prior VAD note's recommendation. | §3.3 | M | V1/V2 | Seeing words appear can distract. Make it a setting and default to subtle "beads". Interim results get revised, so render only stabilized words. | `RecitationSession.ts`, `VoiceActivityDetector.ts`, `ScaffoldingLevelCard.tsx` |
| V5 | **One capture, two engines**: run on-device recognition with `recordingOptions.persist` for live progress, then, *only with cloud consent*, upload the persisted file for the final cloud transcript. | Live feedback **and** cloud accuracy without a second recorder or the warm-standby complexity | README `recordingOptions.persist` | M | Android 13+ for persist | Format and quality of the persisted audio need checking; possible double cost | `VoiceInput.ts`, `AudioDriver.ts` (may simplify ADR 0016's driver) |
| V6 | **ASR-error tolerance in the diff**, part of C2: numerals to words (en/pt), pt contractions and clitics (*do/de o*, *pelo/por o*, *amou-nos*), a homophone table (*há/a/à*, *mas/mais*, *sem/cem*…), and a "close" tier for edit distance ≤ 1 after normalization. Keep the DP diff as the source of truth (ADR 0001). | Grading the learner, not the recognizer | §5 competitor fixes; A4 | S–M | none | Leniency could hide real slips, so log "close" tokens (M1) and tune | `diffEngine.ts`, `DiffView.tsx` |
| V7 | **Hesitation signals**: request Groq `verbose_json` word timestamps (measure the added latency) or use native segments. Feed the longest gap into the FSRS Easy/Good decision (§2.3) and a "weak link" hint: the word after the longest pause is offered as a Cloze target next time. | Targeted practice where recall actually stalls | §3.3 | M | V2 | Word timestamps add latency on Groq | `SpeechTranscriber.ts`, `recitationEvaluator.ts` |
| V8 | **Build a small consented pt-BR/en recitation test set** (50–100 clips) and benchmark Groq turbo vs v3, `gpt-transcribe` with `keywords[]`, `gpt-4o-mini-transcribe`, Deepgram Nova-3 and the on-device recognizers. Measure WER and score agreement, not marketing WER. | Evidence-based engine choice. Vendors publish FLEURS, not recited archaic scripture. | §3.2 | M | Consent for retained audio (§3.4) | Data handling | New script under `scripts/` |
| V9 | **SpeechAnalyzer on iOS 26+** via a custom Expo module or a community wrapper, with a runtime locale check and `DictationTranscriber` fallback. | No server round-trip, word timing and confidence, and possibly a way around the legacy 1-minute task limit (**UNVERIFIED**) | Apple docs | M–L | Custom native module; iOS 26+ | pt-BR availability unverified; wrapper maturity | New module; `VoiceInput.ts` |
| V10 | *Optional premium "coach", speculative:* **Azure Pronunciation Assessment** (scripted, pt-BR) as a supplementary signal for mispronounced words. It must not replace the deterministic diff (ADR 0001). | Pronunciation feedback for archaic or proper names | Azure docs | M | Proxy (S1); consent | $1/h, about 25× Groq's $0.04/h; sends reference text and audio to Microsoft | New adapter |

## 4. Expo SDK 57 / Platform Capabilities

### 4.1 Findings (verified, fetched 2026-10-08)

**SDK baseline**
- **SDK 57 is a small release.** It shipped on Jun 30 2026: "This is a small, focused release: it brings React Native 0.86 to Expo" ([expo.dev/changelog/sdk-57](https://expo.dev/changelog/sdk-57)). The module changes that matter here landed in SDK 56:
  - "Widgets for iOS promoted to stable"
  - "expo-audio: new `useAudioStream` hook for real-time microphone buffer access"
  - "Minimum iOS … bumped to 16.4"

  Source: [expo.dev/changelog/sdk-56](https://expo.dev/changelog/sdk-56).
- **SDK 58 (beta since Sep 2026)** adds two things relevant here ([expo.dev/changelog/sdk-58-beta](https://expo.dev/changelog/sdk-58-beta)):
  - "`expo-widgets` adds an Android implementation: widgets run their own JS bundle on a dedicated Hermes runtime"
  - "`expo-app-intents` exposes Apple App Intents (Siri, Shortcuts, Spotlight, and Apple Intelligence) … This library is in alpha"
- **Xcode 27 caveat.** Apps built with the iOS 27 SDK must use the scene-based lifecycle. On SDK 57 that needs `expo@57.0.23+` and `ios.enableSceneSupport` in `expo-build-properties` ([sdk-57 changelog](https://expo.dev/changelog/sdk-57)).

**Widgets and Live Activities**
- **Widgets are first-party and iOS-only on SDK 57:** "`expo-widgets` enables the creation of iOS home screen widgets and Live Activities using Expo UI components, without writing native code" ([docs v57 widgets](https://docs.expo.dev/versions/v57.0.0/sdk/widgets/)).
  - It needs a development build.
  - Widget code runs in an isolated runtime ("can only use `@expo/ui/swift-ui` components, with no React hooks, app state, or asynchronous work").
  - It needs an App Group.
  - "Interactive widgets require iOS 17 or later."
  - Lock-screen `accessoryCircular`-style families are supported.
- **Android widgets on SDK 57 are community-only.** The option is `react-native-android-widget` (config plugin plus dev client, [docs](https://saleksovski.github.io/react-native-android-widget/docs/tutorial/register-widget-expo)).
- **Live Activity limits** ([Apple ActivityKit](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)):
  - It "remains on the Lock Screen for a maximum of 12 hours".
  - Data is limited to 4 KB.
  - "your app needs to be in the foreground to start a Live Activity."

**CarPlay and Android Auto**
- **CarPlay now has a "Voice-based conversational apps" category** ([developer.apple.com/carplay](https://developer.apple.com/carplay/)). The CarPlay Developer Guide (rev. 2026-06-08) lists the entitlement as available from **iOS 26.4** ([PDF](https://developer.apple.com/download/files/CarPlay-Developer-Guide.pdf)). Its rules say the app "must have a primary modality of voice upon launch", should "only hold an audio session open when voice features are actively being used", and the guide says "don't show text or imagery in response to queries". *Agent-quoted from the PDF. I re-verified the category on the CarPlay landing page; the 26.4 version number is quoted only from the PDF.*
- **Widgets in CarPlay need no CarPlay entitlement.** "Widgets appear to the left of CarPlay Dashboard … and Live Activities are automatically shown in CarPlay Dashboard" ([developer.apple.com/carplay](https://developer.apple.com/carplay/)). The guide adds: "Your app does not need to be a CarPlay app to support widgets and Live Activities in CarPlay."
- **Android Auto has no voice or conversational category.** Categories are media, messaging, calling (labs), navigation, POI, IoT and weather ([developer.android.com/training/cars](https://developer.android.com/training/cars)). Media apps "still require a `MediaSession` and either a `MediaBrowserService` or `MediaLibraryService`" ([cars/media](https://developer.android.com/training/cars/media)).
- **No maintained React Native CarPlay library supports Expo.** `react-native-carplay` README: "No Expo support due to Scenes". Its last npm publish was in 2024 ([GitHub](https://github.com/birkir/react-native-carplay)).

**Background audio and recording**
- `expo-audio` has a config-plugin flag, `enableBackgroundRecording` (default false). On Android it "adds `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MICROPHONE`, and `POST_NOTIFICATIONS`"; on iOS it adds the `audio` background mode. `allowsBackgroundRecording` defaults to `false` ([docs v57 audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/)).
- On Android, background playback stops "after approximately 3 minutes" unless `setActiveForLockScreen` is used (same page).
- Android forbids starting a microphone foreground service from the background: "you cannot create a `microphone` foreground service while your app is in the background" ([Android FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types)). The current `app.json` declares only `FOREGROUND_SERVICE_MEDIA_PLAYBACK`.

**App Intents, Siri, Watch, Wear OS**
- **App Intents / Siri:** on SDK 57 there is no first-party module. The options are hand-written Swift or `@bacons/apple-targets` "app-intent" targets; its README says "I haven't tested all of these and they may not work" ([GitHub](https://github.com/EvanBacon/expo-apple-targets)). SDK 58's `expo-app-intents` is alpha and needs intents "declare[d] … in Swift" ([docs v58](https://docs.expo.dev/versions/v58.0.0/sdk/app-intents/)).
- **Apple Watch:** needs a native watchOS target. `react-native-watch-connectivity` "does not allow you to write your Apple Watch apps in React Native" ([GitHub](https://github.com/watch-connectivity/react-native-watch-connectivity)).
- **Wear OS:** "React Native does not officially support WearOS" ([react-native-wear-connectivity](https://github.com/fabOnReact/react-native-wear-connectivity)).

**Notifications**
- `setNotificationCategoryAsync` supports action buttons, including text-input actions and `opensAppToForeground`.
- Daily and weekly triggers work on both platforms; calendar triggers are iOS-only.
- Exact Android alarms need `SCHEDULE_EXACT_ALARM` ([docs v57 notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/)). Android itself says "most apps can schedule tasks and events using inexact alarms" ([Android alarms](https://developer.android.com/develop/background-work/services/alarms/schedule)).

**Haptics**
- `expo-haptics` (v57) offers `impactAsync`, `notificationAsync`, `selectionAsync` and `performAndroidHapticsAsync`. The iOS Taptic Engine is silent when "iOS dictation is active (to not disturb the microphone input)" ([docs v57 haptics](https://docs.expo.dev/versions/v57.0.0/sdk/haptics/)).
- `AVAudioSession.allowHapticsAndSystemSoundsDuringRecording` defaults to `false` ([Apple](https://developer.apple.com/documentation/avfaudio/avaudiosession/allowhapticsandsystemsoundsduringrecording)). A touch-down haptic therefore has to fire *before* recording starts.
- The unresolvable `require('expo-haptics')` still bundles only because Metro defaults to `allowOptionalDependencies: true` ([metro-config defaults](https://github.com/facebook/metro/blob/main/packages/metro-config/src/defaults/index.js); also set in [Expo's Metro config](https://github.com/expo/expo/blob/sdk-57/packages/@expo/metro-config/src/ExpoMetroConfig.ts)). It fails at runtime and the error is swallowed, which confirms finding E2.

**Theme (`userInterfaceStyle`)**
- "If not provided, defaults to `light`. Requires `expo-system-ui` be installed in your project to work on Android" ([app config v57](https://docs.expo.dev/versions/v57.0.0/config/app/)).
- `light` means "Restrict the app to support light theme only" ([color themes guide](https://docs.expo.dev/develop/user-interface/color-themes/)). iOS is therefore locked to light (finding E1). On Android the setting is currently ignored, because `expo-system-ui` is not installed.

**Secrets and attestation**
- "Do not store sensitive info, such as private keys, in `EXPO_PUBLIC_` variables. These variables will be visible in plain-text in your compiled application" ([environment variables guide](https://docs.expo.dev/guides/environment-variables/)).
- Expo Router API routes "can be used to handle sensitive data, such as API keys securely" ([API routes](https://docs.expo.dev/router/web/api-routes/)).
- `@expo/app-integrity` (Play Integrity plus App Attest) exists but is "currently in alpha" ([docs v57](https://docs.expo.dev/versions/v57.0.0/sdk/app-integrity/)).

**Clipboard**
- Apple: "In iOS 16 and later, programmatic pasting raises a user alert that prompts the user for approval" ([UIPasteControl](https://developer.apple.com/documentation/uikit/uipastecontrol)).
- `expo-clipboard`'s `getStringAsync` reads `UIPasteboard.general.string` directly ([source, sdk-57](https://github.com/expo/expo/blob/sdk-57/packages/expo-clipboard/ios/ClipboardModule.swift)). Expo: "On iOS 16+, if the user denies paste permission, this method will return an empty string" ([docs v57 clipboard](https://docs.expo.dev/versions/v57.0.0/sdk/clipboard/)).
- `hasStringAsync` uses the no-alert `hasStrings` API, and `ClipboardPasteButton` pastes without a prompt on iOS 16+. On Android 12+, the first clipboard read shows a toast ([Android 12 changes](https://developer.android.com/about/versions/12/behavior-changes-all)).
- Together this confirms finding C6: **the current foreground polling prompts iOS users on every resume.**

**Storage**
- AsyncStorage on Android: "Total storage size is capped at 6 MB by default", and each entry is about 2 MB ([async-storage 2.2.0 Limits](https://github.com/react-native-async-storage/async-storage/blob/%40react-native-async-storage/async-storage%402.2.0/packages/website/docs/Limits.md)).
- `expo-sqlite` ships "`Storage` as a drop-in replacement for the @react-native-async-storage/async-storage library" ([docs v57 sqlite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/)).
- `expo-file-system/legacy` still ships in 57.0.7 ([package.json](https://github.com/expo/expo/blob/sdk-57/packages/expo-file-system/package.json)).

**Accessibility (RN 0.86)**
- RN recommends setting an `accessibilityLabel` on accessible views.
- `AccessibilityInfo.announceForAccessibility` exists, and so does `isReduceMotionEnabled()`.
- `allowFontScaling` defaults to true ([accessibility](https://reactnative.dev/docs/0.86/accessibility), [AccessibilityInfo](https://reactnative.dev/docs/0.86/accessibilityinfo)).

### 4.2 Recommendations

| ID | Feature / improvement | User value | Evidence | Effort | Native / dependency requirements | Risks | Touches |
|---|---|---|---|---|---|---|---|
| P1 | **Replace clipboard polling with deep links plus an explicit paste action**: add `scheme`, a `Linking` handler and Universal/App Links; gate any clipboard check on `hasStringAsync()` and use `ClipboardPasteButton`. | Removes a repeated iOS permission prompt. Shared decks open the app directly. | Clipboard rows above; finding C6 | S (scheme + handler), M (Universal Links need a hosted AASA / assetlinks on a domain you control) | `scheme` in app.json, `ios.associatedDomains`, Android intent filter with `autoVerify` | `voice-scripture.app` is hard-coded in `deckSharing.ts:109`; confirm the domain is owned. | `HomeScreen.tsx:90-107`, `deckSharing.ts`, `App.tsx`, `app.json` |
| P2 | **Make the quiet-time reminder useful**: localized pt-BR/EN text; real due count or verse reference; skip it when nothing is due; actions "Recite now" (opens the queue) and "Later (1 h)". | Habit cue tied to the actual task. | `expo-notifications` categories and actions (above); finding E4 | S | Already installed | Notification fatigue: keep one per day, honouring the contemplative constraint in PRODUCT.md. | `ReminderService.ts`, `ReminderSettingsModal.tsx` |
| P3 | **iOS home-screen and lock-screen widget**: "N verses due · streak", plus a first-letter cue for one due verse; tap opens the review queue. | Daily top-of-mind cue without opening the app. Widgets also show up in CarPlay on iOS 26 with no CarPlay entitlement. | `expo-widgets` is stable and first-party (iOS); CarPlay page | M | `expo-widgets` and `@expo/ui`, App Group, dev build. Android: wait for SDK 58 or use `react-native-android-widget`. | The widget runtime cannot read AsyncStorage directly, so data must be pushed through the App Group. Bible Memory App and OneNineteen already ship widgets (§5), so this is parity. | `VerseEngine` (snapshot export), `app.json` |
| P4 | **Decide on haptics.** Either supersede ADR 0004 with a short ADR and install `expo-haptics` (firing *before* `record()`), or delete the dead call. | Consistent behaviour that matches the docs. | Haptics rows above; finding E2 | S | `npx expo install expo-haptics`; rebuild | ADR 0004's reasoning (contemplative calm) still holds; keep it to a single light tick. | `FloatingMicButton.tsx:24-35`, ADR 0004/0016 |
| P5 | **Enable the Sanctuary dark theme**: `userInterfaceStyle: "automatic"` plus `expo-system-ui`. | Night and early-morning devotions, which is exactly what DESIGN.md designed for. | Theme rows above; finding E1 | S | `expo-system-ui`; rebuild | Audit contrast of the diff tones in dark mode. | `app.json`, `tokens.ts` |
| P6 | **Accessibility pass**: per-token `accessibilityLabel` in `DiffView` (e.g. "missed: shepherd"), announce the score with `announceForAccessibility`, label cloze tokens, honour reduce motion for the aura and waveform, and test at large font scales. | Blind and low-vision believers are a natural audience for a voice-first app. Today results are colour-only (WCAG "use of color"). | RN 0.86 docs; finding E5 | S | none | none | `DiffView.tsx`, `ScaffoldingLevelCard.tsx`, `WaveformVisualizer.tsx`, `FloatingMicButton.tsx` |
| P7 | **Move storage to `expo-sqlite`**, using its KV `Storage` first as a drop-in replacement, and keep the review log in its own table. | Avoids Android's 6 MB AsyncStorage cap as review logs grow; enables queries and atomic writes, which fixes C5. | Storage rows above | M | `expo-sqlite`; data migration | A migration bug could lose progress, so ship JSON export (E-R6) first. | `StorageAdapter.ts`, `VerseEngine.ts`, ADR 0002/0010 |
| P8 | **Hands-free, screen-off sessions**: `enableBackgroundRecording`, lock-screen session, Android microphone foreground service started while the app is visible. | The long-requested commute mode (prior notes). | Background-audio rows above | L | Config-plugin flags, Android FGS microphone, `POST_NOTIFICATIONS` | Android 14 start restrictions; battery; Play policy review for a background microphone. | `AudioDriver.ts`, `VoiceInput.ts`, new queue orchestrator (E-R2 / C3) |
| P9 | **CarPlay "voice-based conversational" app** (iOS 26.4+). | True in-car review. | CarPlay category exists | L, speculative | Apple-approved entitlement, CarPlay scene, native templates; no maintained Expo library | Apple's rules (no text or imagery in responses, voice-first) fit the use case, but approval is discretionary. Android Auto has no equivalent category (media only). | New native target |
| P10 | **Siri / Shortcuts "Review my verses"** | Hands-free start | `expo-app-intents` (SDK 58, alpha) | M after SDK 58 GA | Swift-declared intents | Alpha API churn | `App.tsx` routing |
| P11 | **Apple Watch flash-card or recite companion** | Wrist review. Bible Memory App shipped watch flash cards in v9.6 (§5). | Native watchOS target required | L | Swift watch target plus WatchConnectivity | Duplicates logic in Swift | — |

*Inference:* P1, P2, P5 and P6 are cheap enough to bundle into one "platform hygiene" sprint. P3 is the best visible platform feature on SDK 57. P8 should come after the in-app review queue (E-R2 / C3) exists. P9–P11 should wait until there is retention evidence.

## 5. Product & Competitive Landscape

All facts below come from App Store, Google Play or official-site pages fetched on **2026-10-08**. The App Store omits the year for current-year dates, so "Sep 24" means 2026. I personally re-fetched the Bible Memory App listing and the Memverse blog. The other rows were collected by a research sub-agent from raw page text.

### 5.1 The headline: voice grading is no longer unique in English, but pt-BR is open

**Incumbents have added voice.**
- **The Bible Memory App** ([App Store](https://apps.apple.com/us/app/the-bible-memory-app/id496790833)):
  - Rated 4.8 from 33K ratings; v9.6 dated Sep 24.
  - Sells speech recognition as a paid feature. The website lists it in the "complete PRO memorization system (speech recognition, heat maps, audio recording, and flashcards" bundled with Unlimited ([biblememory.com](https://biblememory.com/)). Whether the cheaper $9.99 PRO IAP includes it is unconfirmed. A competitor's page (secondary) says it sits in the $49.99/yr tier.
  - Version notes include "Improved speech recognition accuracy" (8.8, 2025-10-28).
  - Has "over 9,000 Bible memory groups", a "2026 Church Memory Challenge" ([groups](https://biblememory.com/bible-memory-groups)), and Apple Watch flash cards (v9.6).
  - **Added Portuguese NVI-PT text in v9.5 (Sep 21, 2026).**
- **Memverse** (web, free) launched **Voice Review** on 2026-02-14 ([blog](https://www.memverse.com/blog/)):
  - "Real-time transcription shows what you're saying". "Wrong words are highlighted … Missing words show what you skipped".
  - "An accuracy percentage helps you gauge your progress", then "Rate your recall … to update your spaced repetition schedule".
  - "works best (or only works?) in Chrome or Edge".
- **Versify** added a "Speaking game" in v4.8.0 (2025-11-17) ([App Store](https://apps.apple.com/us/app/versify-app/id1597230197)).
- **Remember Me** (free, 1M+ Play installs) does **not** grade speech. It offers record-and-self-check, plus hands-free TTS that "speaks the reference, waits during a recall pause so you can recite … then reads the passage so you can check yourself" ([docs](https://www.remem.me/docs/audio/)). It also published an MCP connector: "In voice mode Claude can take you through a whole review session hands-free" ([docs, updated 2026-10-06](https://www.remem.me/docs/mcp/)).

**A wave of 2025–26 indie voice-grading apps exists, mostly with tiny rating counts** (sub-agent rows; listings fetched 2026-10-08):
- [Engraved](https://apps.apple.com/us/app/engraved-voice-bible-memory/id6791640543): "follows along word by word" on-device.
- [Recite (Gibson)](https://www.reciteapp.co.uk/): marks words "right, close, or missed" and schedules with SM-2.
- [ReciteWell](https://apps.apple.com/us/app/recitewell/id6759792785): on-device Whisper; $39.99/yr.
- [OneNineteen](https://apps.apple.com/us/app/onenineteen-scripture-memory/id6774433572): word-by-word score plus widgets and Watch.
- [Speak](https://apps.apple.com/us/app/speak-memorize-scripture/id6779264233): dictation, church plans.
- [Bread](https://apps.apple.com/us/app/bread-bible-memorization/id6757946016)
- [Lantern](https://apps.apple.com/us/app/lantern-bible-memory/id6760799408): "Speak the Passage", groups.
- [MemoryVerses](https://apps.apple.com/us/app/memoryverses-bible-memory/id6761134446): pastor "Verse of the Week".
- [Yada Verses](https://apps.apple.com/us/app/yada-verses/id6785284874): "correct the transcribed text before you submit it".

**Their changelogs expose the same grading bugs this codebase has** (§7):
- Bread: "Number recitations now score correctly whether spoken as words or returned as digits" (= finding A4).
- Speak: "Punctuation is not a word. A dash standing on its own … no longer becomes a blank".
- Lantern: "Speaking long passages no longer times out" (= D3).
- Verses' Siri-based "Speak Out" has a "one minute time rule".

**Brazilian Portuguese is the open lane.**
- The sub-agent found **no app that scores spoken pt-BR against a Brazilian Bible text**.
- The closest Brazilian-market app is *Memory* (Janus Works, Android, 0+ installs). It uses Bíblia Livre text with self-rated recitation: "grave sua recitação e confira" ([Play](https://play.google.com/store/apps/details?id=com.janus.memory&hl=pt_BR)).
- VersoTranca records only and costs R$39,90/yr ([App Store BR](https://apps.apple.com/br/app/versotranca-mem%C3%B3ria-b%C3%ADblia/id6740823561)).
- YouVersion Bible App Lite's memorization (tap-to-fill blanks) supports Portuguese ([help](https://help.youversion.com/l/en/article/h8owck8of7-verse-memorization)).

### 5.2 Other notable 2026 facts

**Pricing anchors**
- **Bible Memory App IAPs:** PRO $9.99; PRO Monthly $1.99; PRO Lifetime $19.99; Unlimited Yearly $49.99 (App Store, re-fetched). The website sells Unlimited at "$9.99/month, $49.99/year … or a one-time $149.99 lifetime" ([biblememory.com](https://biblememory.com/)).
- **Bulk church licences:** "30% off (10+) or 40% off (50+)" (same page).
- **Paid voice apps cluster around $35–50/yr:** ReciteWell $39.99, OneNineteen Plus $34.99, Bible Memory Unlimited $49.99.
- **Most rivals are free:** Remember Me, VerseLocker, Versify, Lantern, Engraved.

**Other apps**
- **Dwell** ($59.99/yr) and **Hallow** ($69.99/yr) still have no active-recall memorization. Dwell offers "Repeat & Reflect" looping; Hallow has Lectio Divina ([Dwell](https://apps.apple.com/us/app/dwell-audio-bible/id1343917374), [Hallow](https://apps.apple.com/us/app/hallow-prayer-meditation/id1405323394)).
- **Verses – Bible Memory** has not been updated since 2020-03-13 ([App Store](https://apps.apple.com/us/app/verses-bible-memory/id939461663)).
- **Scripture Typer** is now a separate desktop typing tutor ("$99 for your first year"), not the mobile app ([scripturetyper.com](https://scripturetyper.com/)).

**YouVersion Platform** (public beta since Dec 2025; SDKs for "Web, React Native, Swift, and Kotlin")
- It requires apps to "Be free to the end user (no subscriptions, purchases, or upgrades)" and "Not place Scripture or Scripture-dependent features behind paywalls" ([youversion.com/platform](https://www.youversion.com/platform), re-fetched).
- **It cannot be the text source for a freemium app** (see §6).

**Group, church and catch-up mechanics in market** (all primary listings)
- Church challenges and bulk codes (Bible Memory App).
- A pastor's "Verse of the Week" with leaderboard (MemoryVerses).
- Aggregate-only group stats: "without exposing individual progress" ([Remember Me campaigns](https://www.remem.me/docs/guides/campaigns/)).
- A "Daily Bible Memory Goal: Number of words to be reviewed per day" ([Remember Me](https://www.remem.me/docs/study/)).
- "Customizable daily limits" (Bible Memory App 9.2).
- **No primary source showed a streak freeze or 1:1 memory-partner feature in any competitor.**

### 5.3 Recommendations

| ID | Recommendation | User value | Evidence | Effort | Dependencies | Risks | Touches |
|---|---|---|---|---|---|---|---|
| C1 | **Position as "the pt-BR voice-verified scripture memory app"**, and make Portuguese grading quality the moat: numerals, clitics, contractions, SENHOR/Senhor, homophones (§3). | Clear differentiation where no competitor scores spoken pt-BR | §5.1 | S (positioning) + the §3 work | A licensed or open pt-BR text that can actually ship (§6) | The Bible Memory App now has NVI-PT and paid speech recognition. If it adds pt-BR speech, the window narrows. | Store listing, `PRODUCT.md` |
| C2 | **Three-tier word marks (correct / close / missed).** A "close" word is phonetically or orthographically near the target. It is shown in amber, and does not count as a miss for scheduling when the ASR is the likely culprit. | Fewer unfair failures; users trust the grading | Recite (Gibson) "right, close, or missed"; Bread's and Speak's grading fixes | S–M | §3 near-match tolerance | Leniency could let real memory slips through. Limit "close" to edit distance ≤ 1–2 or homophone tables. | `diffEngine.ts`, `DiffView.tsx` |
| C3 | **Single-review queue → "Review all due" session** with an end-of-session summary. This is the prerequisite for the hands-free mode both prior notes rank P0. | One tap to finish today's work | B5; Remember Me's hands-free loop is the parity bar | M | M4 relearning | none | `HomeScreen.tsx`, a new queue orchestrator |
| C4 | **Hands-free commute loop, screen on first**: TTS speaks the reference → chime → recite → VAD end → spoken result plus a correction of missed words → next. | Ranked P0 by both prior notes. Remember Me offers this *without* grading; this app can add grading. | Prior notes; Remember Me docs | M (screen-on), L (screen-off, §4 P8) | C3, V2/V5 (§3) | Unsafe driving use. Make it fully voice-driven, with no reading required. | `RecitationSession.ts`, `SpeechSynthesizer.ts` |
| C5 | **Chapter / long-passage mode.** Split into verse or clause chunks (≈ 4-chunk working-memory limit, §2.1), chain cumulatively (1, 1–2, 1–3 …), and schedule each chunk. Recite the full passage in segments so the 300 s ceiling and O(n·m) diff are not an issue (D2/D3). | Captures the high-commitment memorizers both prior notes highlight. Only Lantern, Recite (Lau) and Janus's paid plan go beyond single verses. | §5.1; Cowan 2001 | L | M1/M3 per-chunk cards; chunked diff | Scheduling a chain is novel and unproven. Start with "practice a passage", not chapter scheduling. | `VerseEngine` (new Passage aggregate), `diffEngine.ts`, `RecitationSession.ts`, CONTEXT.md (new term) |
| C6 | **Daily workload cap + gentle catch-up**, as a user setting ("up to N verses/day"). | Prevents backlog guilt | Bible Memory App daily limits; Remember Me daily word goal | S (M7 makes it principled) | M2; ideally M3 | none | `VerseEngine.getVersesSummary` |
| C7 | **Church "memory plan" decks with no backend**: extend `deckSharing` with a start date and weekly cadence ("Verse of the Week" for a célula or EBD class), shareable as a link or QR. | Group adoption without accounts, consistent with ADR 0002 | MemoryVerses, Speak, Bible Memory App church challenge | M | P1 deep links | Aggregate stats and leaderboards need a server. **Defer**, and if added, follow Remember Me's aggregate-only privacy model. Sharing copyrighted pasted text inside a deck payload re-distributes it (§6). | `deckSharing.ts`, `SharedDeckModal.tsx` |
| C8 | **Editable-transcript override, limited**: let the learner mark a "close" or "missed" word as "I said this" at most once per attempt. Log it, and grade the attempt no higher than Hard. | Recourse against ASR errors (finding E6) | Yada Verses does full transcript editing | S | M1 log | Reintroduces the self-grading bias the product exists to avoid. Hence the cap and the logging. | `ReviewScreen.tsx`, `recitationEvaluator.ts` |
| C9 | *Watch item, speculative.* An **assistant / MCP connector** for hands-free review through general-purpose voice assistants. | New hands-free channel | Remember Me MCP docs | L | A server, which ADR 0002 does not have | Early and unproven. Privacy. | — |

## 6. Translations & Licensing (pt-BR focus)

### 6.1 Findings

**Critical: the bundled `ALMEIDA` text is copyrighted.**
- The bundled `almeida.json` matches the **"AA – Almeida Revisada Imprensa Bíblica"** text from the `thiagobodruk/biblia` dataset. The sub-agent compared Ps 23:2, Gen 1:3, Rom 8:28 and John 3:16 against `aa.json` and found exact matches. I independently confirmed that the local file contains those strings. Critical-text markers support the identification: Rom 10:17 reads "palavra de **Cristo**", and verses are bracketed in `{…}` (264 brace-marked verses, measured).
- That repository's README states, re-fetched 2026-10-08 ([github.com/thiagobodruk/biblia](https://github.com/thiagobodruk/biblia)):
  - "As traduções bíblicas deste projeto são de autoria e propriedade intelectual da … Imprensa Bíblica Brasileira (AA)"
  - "Este projeto é distribuído sob a licença Creative Commons BY-NC"
  - "Todos os direitos reservados aos autores"
- So **ADR 0007's statement that `ALMEIDA` is public domain is wrong.** The text is a copyrighted 1967/1974 revision, and the dataset licence is also NonCommercial. Each point independently rules out a freemium app.
- Secondary sources agree on the identification. Wikisource's discussion page calls it "a Versão Revisada … © (1967) 1974", and the Bíblia Livre coordinator wrote in 2016 that it is "ainda hoje protegida por direitos autorais". One claim to the contrary ("The Almeida Atualizada is in the public domain", biblestudytools.com) cites no evidence. The current rights holder (IBB / JUERP) is **UNVERIFIED**.
- *Note:* `docs/research/text-to-speech-apis.md` also says the app supports "Almeida Revista e Corrigida, Almeida Século 21". The app ships neither. ARC is © SBB, and Almeida Século 21's status was not re-checked; see §8.

**The Portuguese topical packs are a different, also-copyrighted edition (verified locally).**
- The 9 `ALMEIDA`-labelled pack verses use wording like ARC/ACF: "palavra de **Deus**", "Não estejais inquietos", "em crença" (finding F1).
- SBB's own pages give "Almeida Revista e Corrigida © 1969" and "…© 1995, 2009", along with "Almeida Revista e Atualizada © 1993", "Nova Almeida Atualizada © 2017" and "NTLH © 2000" (sbb.org.br, sub-agent fetch via browser). The ACF holder (SBTB) allows quoting "até 1.100 (mil e cem) versículos sem a permissão" with credit ([biblias.com.br/direitos-autorais](https://biblias.com.br/direitos-autorais), sub-agent fetch).
- The provenance of the pack text is **unknown and must be established.** Nine short verses may fall under a quotation allowance, but not under an unlabelled "public domain" claim.

**SBB enforces its rights.**
- SBB's platform terms: "Permitido apenas para uso pessoal e não comercial … É proibido usar o conteúdo da SBB com fins comerciais sem autorização prévia por escrito. Solicitações devem ser enviadas para direitos@sbb.org.br" ([sbb.org.br EULA](https://www.sbb.org.br/acordo-de-licenca-de-usuario-final-eula), sub-agent browser fetch).
- A 2021 São Paulo judgment ordered a publisher to pay SBB R$ 640.640,00 over plagiarism of its Almeida revision (jusbrasil court record, sub-agent fetch; **primary court text, not re-verified by me**).

**Openly licensed full Portuguese Bibles exist.**
- **ONBV** (Biblica® Open Nova Bíblia Viva) is CC BY-SA 4.0 and covers both OT and NT. Required notice: "Biblica® Open Nova Bíblia Viva™ Copyright © 2007, 2010 by Biblica, Inc. 'Biblica' is a trademark registered in the United States Patent and Trademark Office by Biblica, Inc. Used with permission." ([ebible.org/poronbv](https://ebible.org/find/details.php?id=poronbv), re-fetched). Yet the app ships only 67 ONBV verses (F3), and no attribution screen was found in `src/`.
- **Bíblia Livre (BLIVRE)** is a full Bible under an attribution-only Creative Commons licence. ebible.org says "Atribuição 4.0 Brasil", while the sub-agent's CrossWire row says "Attribution 3.0 Brazil". The discrepancy does not affect the recommendation, since both are attribution-only. Its suggested credit is "Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio, e Marco Teles" ([ebible.org/porbr2018](https://ebible.org/find/details.php?id=porbr2018), re-fetched). It belongs to the Almeida/Textus Receptus tradition, so it is the closest open substitute for Almeida-style wording.
- Others (sub-agent, ebible/CrossWire pages):
  - Bíblia Livre Para Todos (NT only, CC BY-SA)
  - PorAlmeida1911 ("Da reimpressão de 1911 de uma edição de 1900"; module licence "GPL"; archaic spelling)
  - Tradução Brasileira 1917 (SBB claims "© 1917, 2010"; possibly public domain from 2027 per a secondary source, **UNVERIFIED**)

**Licensed API options are narrow for a freemium voice app.**
- **API.Bible terms** (last updated 2026-09-03, [api.bible/terms-and-conditions](https://api.bible/terms-and-conditions), re-fetched):
  - "Commercial Use" explicitly includes "freemium models".
  - **"AI driven text-to-speech are not allowed for copyright content without prior written consent from the content's Intellectual Property owner"**, which matters for Echo Mode.
  - Offline copies must be refreshed: "check at least every 30 days".
- **API.Bible plans and catalogue** (sub-agent fetch):
  - The free Starter tier is "Noncommercial use" ([api.bible](https://api.bible/)).
  - Pro starts "From $29 per month", and "NIV commercial use not available".
  - DRM and a 100-verse print cap are required.
  - The Portuguese catalogue's only commercially licensable copyrighted text is **NVT**.
- **YouVersion Platform** grants no rights in Bible texts ("We are not providing You rights in biblical works", platform terms, sub-agent fetch). Its program is non-commercial: "free to the end user … not place Scripture … behind paywalls" (re-fetched). It is unusable for freemium.

**English**
- **WEB** is public domain, but "'World English Bible' is a Trademark of eBible.org". If you "CHANGE the actual text … you not call the result the World English Bible" ([ebible.org/engwebp](https://ebible.org/find/details.php?id=engwebp), sub-agent).
  - *Inference:* stripping formatting is fine. The pack's divergent wording (F2) should be reconciled with the bundled file so the app does not label altered text "WEB".
- **KJV** is out of copyright except in the UK. "Book of Common Prayer and King James Bible: These are subject to perpetual protection in the UK (only)" ([UK National Archives](https://cdn.nationalarchives.gov.uk/documents/centenary-crown-copyright-timeline.pdf), sub-agent).
- **BSB** is "officially dedicated to the public domain as of April 30, 2023" ([berean.bible](https://berean.bible/terms.htm), sub-agent). It is a modern-English public-domain option the prior notes missed.
- **ASV** is public domain.

### 6.2 Recommendations

| ID | Recommendation | User value | Evidence | Effort | Dependencies | Risks | Touches |
|---|---|---|---|---|---|---|---|
| L1 | **Stop shipping the AA text as `ALMEIDA` before any commercial release.** Replace it with **Bíblia Livre (BLIVRE)** as the default Almeida-style pt-BR text, or get a written licence from the rights holder. Keep the `ALMEIDA` code only if the source is a verified public-domain Almeida (e.g. 1911), and accept its archaic spelling. | Legal shipability in Brazil | §6.1 | S (data swap) – M (re-verify packs, tests, migrate stored verses' `translation` field) | Licence text and attribution screen (L3) | Users already memorizing AA wording will see different text. Keep the stored verse text (the user's own copy) and only change new fetches. | `src/data/bibles/almeida.json`, `ScriptureCatalog.ts:9-22,287-300`, ADR 0003/0007 (new ADR) |
| L2 | **Ship the full ONBV Bible** (CC BY-SA, OT+NT) instead of the 67-verse stub, verbatim and with its required notice. | A modern-language pt-BR option that actually works in the picker | §6.1; F3 | S | L3 | Share-alike applies only if the text is modified. *Inference:* bundling verbatim text next to app code is a collection, not an adaptation. Get legal confirmation. | `onbv.json`, `ScriptureCatalog.ts` |
| L3 | **Add a "Translations & Copyright" screen** with the exact notices for ONBV, BLIVRE, WEB's trademark condition, and KJV's UK caveat. | Licence compliance; trust | Licence pages above | S | none | none | New component; `AddVerseModal.tsx` translation chips |
| L4 | **Fix the pack provenance**: regenerate pack texts *from the bundled datasets* at build time, or from an open text, and add a test that pack text equals the dataset text. | One verse, one wording, everywhere | F1/F2 | S | L1 | none | `topicalPacks.ts`, new test |
| L5 | **Strip `{…}` markers at the data layer.** Either remove the braces and keep the words (KJV italics), or render them as italics. | Clean display, cloze and TTS for KJV and ALMEIDA | A5 | S | none | none | `ScriptureCatalog.fetchPassageText` or a one-time data script |
| L6 | **Licensed premium texts (ADR 0003's plan) need re-scoping.** API.Bible's commercial tier excludes NIV/NVI and forbids AI TTS on copyrighted text without publisher consent. YouVersion is non-commercial only. SBB requires direct written permission. **Approach SBB (direitos@sbb.org.br) for ARA/NAA licensing, and Tyndale (NVT via API.Bible Pro) as a fallback.** | Users want ARA/NVI/NAA | §6.1 | L (business) | Budget; legal | TTS restrictions may block Echo Mode for licensed texts. Fall back to user-voice-only modes for those. | ADR 0003, `SpeechSynthesizer.ts` |
| L7 | **Add BSB as a modern public-domain English option.** | Modern English without licence cost | berean.bible | S | none | none | `ScriptureCatalog.ts` |
| L8 | **Geo-exclude KJV in the UK**, or obtain Cambridge University Press permission. | Compliance in the UK store | UK National Archives | S | Store territory settings | none | Store configuration |

## 7. Engineering Quality of the Current Codebase

All findings in this section were **verified by reading the code** in the working tree at commit `58223ac` on 2026-10-08. Data-file findings were measured with read-only Python scripts against `src/data/bibles/*.json` and `src/data/topicalPacks.ts`. `node_modules` is absent, so `npm test` was **not** run, and no test results are claimed here.

### 7.1 Findings

**A. Scoring integrity (memory failures vs. infrastructure failures)**

| # | Finding (verified in code) | Where | Consequence |
|---|---|---|---|
| A1 | The native adapter's `error` listener only calls `console.warn`. `stop()` then returns whatever `liveTranscript` holds, including `''`. | `src/services/VoiceInput.ts:101-103`, `:151-165` | A recognizer error (for example a network or language error) produces an empty or truncated transcript. That transcript is diffed, scored and **recorded as a failed review** (`RecitationSession.ts:474-486`). Streak goes to 0 and interval to 1 day. ADR 0006 explicitly forbids recording infrastructure outages as memorization failures. |
| A2 | The cloud path does the same if Whisper returns `""` for audible-but-unintelligible audio, because `CloudAudioVoiceAdapter.stop()` returns `res.text` verbatim. | `VoiceInput.ts:254-260` | Same as A1. |
| A3 | `calculateScore` is an F1 over `correct/missed/added`. Anything the user says that is not verse text counts as `added` and lowers precision. That includes **reciting the reference** ("John 3:16 …"), which the Navigators-style "reference, verse, reference" habit encourages. | `src/engines/diffEngine.ts:122-142` | A perfect "Jesus wept." (2 words) preceded by "John 11:35" (2–3 extra tokens, depending on how the ASR writes the numbers) scores 57–67% and **fails**. A perfect 20-word verse with the reference said before *and* after (~6 extra tokens) scores ~87%. That maps to SM-2 quality 3, which cuts the ease factor by 0.14 on every review (`srsEngine.ts:70-71`). |
| A4 | There is no numeral normalization. Bundled texts contain no digits (measured: 0 in WEB and 1 each in KJV and ALMEIDA), but cloud ASR commonly emits digits for spoken numbers. `toComparisonKey` keeps digits as-is. | `diffEngine.ts:29-41` | "forty days" ≠ "40 days" becomes a missed+added pair. Bread's changelog fix (§5) shows ASR returning digits in practice. |
| A5 | **KJV text carries `{…}` translator-italics markers in 17,366 of 31,100 verses** (measured), and ALMEIDA carries them in 264 verses. `fetchPassageText` only `trim()`s. | `src/services/ScriptureCatalog.ts:303-343` | Braces show up in verse cards, cloze masks (`{___}`) and TTS input. Matching is unaffected, because `toComparisonKey` strips non-letters. |
| A6 | The SM-2 "assisted pass" branch fires for an **unassisted** score of exactly 75 (`score === ASSISTED_SCORE_THRESHOLD`), because `evaluateRecitation` and `VerseEngine.recordReview` never pass `assistanceUsed` through to `calculateNextReview`. | `src/engines/srsEngine.ts:41-43`, `src/engines/recitationEvaluator.ts:46`, `src/services/VerseEngine.ts:378-392` | It is an edge case, but the invariant is held by a numeric coincidence instead of the flag. |
| A7 | The rate-limit quota is consumed **before** capture starts, so cancelled attempts and attempts that end in a transcription error still count. | `RecitationSession.ts:335-338` | Minor. It matters only near the 500/day ceiling. |

**B. Scheduling and time handling**

| # | Finding | Where | Consequence |
|---|---|---|---|
| B1 | The next review is set to `now + interval × 24h`, compared to the millisecond, with no day-rollover hour. | `srsEngine.ts:74`, `:90-96` | Someone who reviews at 21:00 finds the verse *not due* at 07:00 the next morning. Anki avoids this with a "next day starts at" hour (see §2). |
| B2 | The daily-ceiling key uses the **UTC** date (`toISOString().slice(0,10)`), while the habit streak uses the **local** date. | `SubscriptionService.ts:84-86` vs `VerseEngine.ts:53-58` | In Brazil (UTC−3) the quota day rolls over at 21:00 local. Daily keys are never pruned. |
| B3 | There is **no review log**. Only `lastScore`, `intervalDays`, `streak` and `easeFactor` are stored. | `VerseEngine.ts:395-401` | Any later scheduler change (FSRS, §2) has no history to optimize from. **This is the cheapest high-leverage fix in the report.** |
| B4 | New, never-reviewed verses open straight into Level 3 Blind Recitation. | `src/screens/ReviewScreen.tsx:79` | The first official attempt on an unlearned verse is likely to fail, which resets the streak and gives the learner no learning phase. |
| B5 | There is no "review all due" queue. Each review returns to Home, and the user has to pick the next verse by hand. | `src/screens/HomeScreen.tsx:182-194` | This is friction, and it also blocks any hands-free or commute mode, which needs a queue first. |

**C. Security, privacy and robustness**

| # | Finding | Where | Consequence |
|---|---|---|---|
| C1 | Cloud STT keys are read from `process.env.EXPO_PUBLIC_GROQ_API_KEY` / `EXPO_PUBLIC_OPENAI_API_KEY` and used in client-side `Authorization` headers. | `VoiceInput.ts:221-226`, `:374-391`; `SpeechTranscriber.ts:153-161`, `:375-393` | Expo inlines `EXPO_PUBLIC_*` values into the shipped JS bundle (see §4 for the doc quote). Anyone with the APK or IPA can extract the key, and the client-side rate limiter in AsyncStorage (`SubscriptionService.ts:7-10`, `:89-166`) cannot protect it. |
| C2 | No request timeouts are set on `fetch` or `uploadAsync`. | `SpeechTranscriber.ts:153-162`, `:218-224`, `:320-326` | On a captive or slow network the session can stay in `verifying` indefinitely. |
| C3 | `deleteAudioFile` returns `true` even when deletion throws. There is no startup sweep for recordings orphaned by a crash or force-quit mid-recitation. | `src/services/AudioDriver.ts:386-410` | The "instantaneous audio deletion" promise in CONTEXT.md cannot be verified at runtime. This matters for privacy disclosures (§3.4). |
| C4 | `temperature: '0'` is sent only on the native `uploadAsync` path. The `fetch`/`FormData` fallback (web, and native when `uploadAsync` is unavailable) omits it. | `SpeechTranscriber.ts:142-146` vs `:101-106` | ADR 0016's invariant is only half enforced. See §3 for what `temperature=0` actually means on the OpenAI API. |
| C5 | All verses live in one AsyncStorage JSON blob, and every write is an unserialized read-modify-write. | `VerseEngine.ts:74`, `:104-106`, `:378-404` | Concurrent writes can lose updates. There is no export or backup, so a lost phone loses all progress (ADR 0002 deferred sync). |
| C6 | `HomeScreen` calls `Clipboard.getStringAsync()` on mount and on **every** foreground to detect shared decks. | `HomeScreen.tsx:90-107` | On iOS 16+ a programmatic read can trigger the system paste-permission prompt (see §4). The `voice-scripture://` scheme parsed in `src/utils/deckSharing.ts:115` is not declared in `app.json` (no `scheme` key), and `App.tsx` has no `Linking` handler, so shared links cannot open the app. |
| C7 | Recordings use 44.1 kHz at 128 kbps. | `AudioDriver.ts:146-150`, `:232-256` | Whisper resamples all input to 16 kHz (`SAMPLE_RATE = 16000`, [openai/whisper audio.py](https://github.com/openai/whisper/blob/main/whisper/audio.py)), so far more bytes are uploaded than the model uses. *Inference:* 16 kHz mono at ~32 kbps would be about 4× smaller, which would cut upload latency on mobile networks. |
| C8 | Production `console.log` calls include local file URIs. | `SpeechTranscriber.ts:151` | Log hygiene. |

**D. Performance and scale**

| # | Finding | Where | Consequence |
|---|---|---|---|
| D1 | `ScriptureCatalog` statically imports all four Bible JSON files: WEB 4.2 MB, KJV 4.7 MB, ALMEIDA 4.1 MB, ONBV 9.7 KB. | `ScriptureCatalog.ts:9-12` | About 13 MB of scripture is parsed into the JS heap at module load, even for a user of a single translation. *Inference:* this hurts cold start and memory on low-end Android. Lazy per-translation loading or `expo-sqlite` would avoid it. |
| D2 | `diffVerses` allocates a full (n+1)×(m+1) matrix. | `diffEngine.ts:74-93` | That is fine for verses. Psalm 119 is 2,307 words in WEB (measured), which means ~5.3 M cells per attempt. Chapter mode (§5) needs per-verse chunked alignment. |
| D3 | The utterance ceiling caps at 300 s. | `RecitationSession.ts:46-53` | Romans 8 (890 WEB words, measured) at a typical recitation pace exceeds 5 minutes. Chapter mode must recite in segments. |

**E. Product and UX gaps visible in code**

| # | Finding | Where |
|---|---|---|
| E1 | `app.json` sets `"userInterfaceStyle": "light"`, so the Sanctuary dark theme in `DESIGN.md` and `src/theme/tokens.ts` is unreachable on device (see §4 for the doc quote). | `app.json:8` |
| E2 | `expo-haptics` is `require`d but not a dependency (absent from `package.json` and `package-lock.json`). The touch-down haptic from ADR 0016 and ticket 69 is a silent no-op at best. ADR 0004 (visual-only, no haptics) was never superseded. | `src/components/FloatingMicButton.tsx:24-35` |
| E3 | `expo-file-system` is used (`/legacy` and the new `File` API) but is only a transitive dependency. | `SpeechTranscriber.ts:130`, `AudioDriver.ts:389-399` |
| E4 | There is no i18n layer. Home chrome is English-only ("Share Deck", "Recite", "Browse Topical Packs"), and the reminder notification is English-only and claims verses are due even when none are. | `HomeScreen.tsx:390,564,601`; `src/services/ReminderService.ts:96-99` |
| E5 | `DiffView` shows correct, missed and added **only by colour**. There is no `accessibilityLabel`, and cloze tokens and level-card buttons carry no accessibility props. No reduce-motion handling exists for the waveform or breathing aura. | `src/components/DiffView.tsx`, `src/components/ScaffoldingLevelCard.tsx:94-179`, `src/components/WaveformVisualizer.tsx:44-48` |
| E6 | There is no override when ASR mishears a correctly recited word. The learner can only re-recite. | `ReviewScreen.tsx` (no override path) |

**F. Data integrity of bundled content**

| # | Finding (measured) |
|---|---|
| F1 | **All 9 Portuguese topical-pack verses labelled `ALMEIDA` differ from the bundled `almeida.json` text for the same reference.** They also appear to come from a *different Almeida edition*. For example, Rom 10:17 reads "De sorte que a fé é pelo ouvir, e o ouvir pela palavra de **Deus**" in the pack but "Logo a fé é pelo ouvir, e o ouvir pela palavra de **Cristo**" in the dataset, and Phil 4:6 reads "Não estejais inquietos…" in the pack but "Não andeis ansiosos…" in the dataset. One translation code covers two editions, so a pack verse and the same verse fetched through the Reference Picker will never match. Licensing implications are covered in §6. |
| F2 | 4 of 9 English pack verses also differ from `web.json`: John 14:27 "give I to you" vs "I give to you", and Joshua 1:9 has different punctuation and wording. This suggests the pack was typed from a different WEB revision. |
| F3 | `onbv.json` holds **67 verses across 19 books**, not a Bible. Reference-picker auto-fetch for ONBV fails for almost every reference. |
| F4 | ADR 0007 says ASV was removed, and no ASV dataset ships. The task brief and older notes still list ASV. |

**G. Test, CI and documentation hygiene**

- **No CI configuration** exists in the workspace (no `.github/`), and `jest.config.js` has no coverage thresholds.
- Untested surfaces: `DiffView`, `ScaffoldingLevelCard`, `AddVerseModal`, `ReminderSettingsModal`, `WaveformVisualizer`, `topicalPacks.ts`, and `ScriptureCatalog.fetchPassageText` across all translations. A data-integrity test that checks pack text against bundled datasets would have caught F1 and F2.
- Missing test cases: numerals (A4), spoken references (A3), KJV braces (A5), empty-transcript handling (A1), and the exact-75 edge (A6).
- Dead code: `src/services/HabitTracker.ts` (+ test; ticket 66 says it was retired), the `src/services/AudioRecorderService.ts` re-export shim (ticket 64), `src/components/PaywallModal.tsx` and `src/screens/VoiceSpikeScreen.tsx`. None is imported by `App.tsx` or `HomeScreen`.
- Empty files: `docs/adr/0014-…md`, `docs/research/ideal-voice-architecture-for-scripture-memorization.md`, `docs/research/speech-transcription-apis.md`, and tickets 34–39 and 60–66 (0 bytes each).
- **Stale ticket statuses:**
  - Tickets 40, 41, 42, 43 and 67 say `ready-for-agent`, but every acceptance box is checked and the work landed in commits `2bbd292` (40–42), `2f6b097` (43–46) and `58223ac` (67–70).
  - Tickets 47–50 say `ready-for-human`. Commit `b9f9b7a` is titled "mark tickets 47-50 as completed (ready-for-human)", and their code is present.

  All nine should be closed. Ticket 47 ("Extract HabitTracker") was later reversed by tickets 65–66, so close it as *superseded*.
- Doc drift:
  - `PRODUCT.md` promises FSRS, but the code is SM-2.
  - `CONTEXT.md` still defines "Speech Transcriber" and "Native Speech Transcriber" as seams, though ticket 64 excised them in favour of `VoiceInput`, and it lists ASV.
  - `DESIGN.md` says the hero mic is 64 pt, while ADR 0015 says 76 dp.

### 7.2 Recommended engineering improvements

The evidence for each item is the finding it cites in §7.1.

| ID | Improvement | User value | Effort | Risks | Touches |
|---|---|---|---|---|---|
| E-R1 | **Scoring integrity pack.** Covers A1–A6, delivered as one ticket with tests: (a) treat an empty transcript or a recognizer `error` event as a `TranscriptionError` and never record it as a review; (b) strip a spoken reference at the start or end before diffing (match book aliases from `bibleCanon` plus chapter/verse numbers); (c) normalize numerals to number words for the verse language (en/pt); (d) strip `{…}` markers (L5); (e) pass `assistanceUsed` explicitly to the scheduler instead of relying on `score === 75`. | Stops unfair failures and streak resets caused by infrastructure and ASR artefacts. Competitors had to ship the same fixes (§5). | S | Reference stripping must not eat verse text that starts with a book name. Anchor it to the canon aliases plus digits. | `VoiceInput.ts`, `RecitationSession.ts:466-486`, `diffEngine.ts`, `recitationEvaluator.ts`, `srsEngine.ts`, `ScriptureCatalog.ts` |
| E-R2 | **"Review all due" queue orchestrator.** A headless `ReviewQueue` that `HomeScreen` and a later commute mode can share. It orders verses by urgency, caps the daily load (C6) and requeues relearning items (M4). | One tap a day, and the basis for hands-free mode | M | — | New `services/ReviewQueue.ts`; `HomeScreen.tsx:182-194` |
| E-R3 | **Request timeouts and offline fallback.** Wrap cloud calls in a timeout (`AbortController` for `fetch`; a race for `uploadAsync`). On `network_error`, fall back to on-device recognition for the *next* attempt and say so plainly. | No more "verifying…" forever | S | — | `SpeechTranscriber.ts`, `VoiceInput.ts` |
| E-R4 | **Use local time consistently.** Use the local calendar date for the daily quota key and prune old daily keys and `completedDates`. | Correct quota and streak boundaries in Brazil | S | — | `SubscriptionService.ts:84-86`, `VerseEngine.ts:222-255` |
| E-R5 | **Serialize storage writes.** Use a single write queue/mutex in `VerseEngine` now; move to `expo-sqlite` later (P7). | Prevents lost updates | S | — | `VerseEngine.ts` |
| E-R6 | **JSON export/import backup** through the share sheet: verses, SRS state, review log and settings. | Phone loss no longer means losing years of memorization. It is also a safety net for the P7 and M3 migrations. | S | The export contains religious-practice data, so warn the user before they share it. | New util; `HomeScreen` settings |
| E-R7 | **Lazy-load Bible datasets** per translation (dynamic `require` behind a cache, or `expo-sqlite` assets). Measure cold start before and after. | Faster start and less memory on low-end Android *(inference until measured)* | M | Metro bundles statically required JSON anyway. Real savings need asset files or SQLite, not just deferred parsing. | `ScriptureCatalog.ts:9-12,59-64` |
| E-R8 | **Reduce recording size.** Record at 16 kHz mono and about 32 kbps AAC for the cloud path. | Faster uploads; lower latency on 3G/4G | S | Validate WER does not regress on real devices | `AudioDriver.ts:146-150,232-256` |
| E-R9 | **Observability without content.** Add `@sentry/react-native` (Expo guide: "no additional work is needed … when using EAS Build", [docs.expo.dev/guides/using-sentry](https://docs.expo.dev/guides/using-sentry/)) with PII scrubbing. Record counters only: transcription error codes, empty-transcript rate, ASR latency, engine used, and the score distribution per engine. **No transcripts and no references.** | Find ASR regressions per device and locale | S–M | LGPD: no religious content in telemetry; disclose crash reporting | `RecitationSession.ts`, `App.tsx` |
| E-R10 | **CI + test gaps.** Add a GitHub Actions `npm ci && npm test` job with a coverage floor. Add tests for: pack-vs-dataset equality, `fetchPassageText` on every translation, KJV braces, numerals, spoken references, empty transcripts, `DiffView` accessibility labels, and the scheduler day boundary. | Prevents silent regressions like F1/F2 | S | — | `.github/workflows/`, new tests |
| E-R11 | **Hygiene.** (a) Close stale tickets 40–43, 47–50 and 67; mark 47 superseded by 65–66. (b) Delete or fill the empty ADR 0014, the two empty research notes and the 13 empty tickets. (c) Remove dead code: `HabitTracker.ts`, `AudioRecorderService.ts`, `PaywallModal.tsx`, `VoiceSpikeScreen.tsx`. (d) Make `expo-file-system` (and `expo-haptics` if kept) direct dependencies via `npx expo install`. (e) Update CONTEXT.md (`VoiceInput` replaces "Speech Transcriber"; drop ASV), PRODUCT.md (SM-2 until M3 lands) and DESIGN.md (mic size). | Docs match code; less agent confusion | S | — | Docs, `package.json` |

## 8. Changed Since Prior Research

"Prior" means `competitive-benchmarks-and-feature-opportunities.md` ("CB"), workspace `docs/research/02-market-research-and-feature-opportunities.md` ("MR"), `text-to-speech-apis.md` ("TTS"), and the ADRs. Each row says what the older document claims and what is true as of 2026-10-08.

| # | Older claim (where) | Current fact (source) |
|---|---|---|
| 1 | Bible Memory App Pro is "$29.99/yr or $69.99 lifetime" (CB) **and** "$9.99/yr or $29.99 lifetime" (MR). The two notes contradict each other. | Both are outdated. App Store IAPs: PRO $9.99, PRO Monthly $1.99, PRO Lifetime $19.99, Unlimited Yearly $49.99 (plus ESV/NIV bundles). The website sells Unlimited at $9.99/mo, $49.99/yr or $149.99 lifetime ([App Store](https://apps.apple.com/us/app/the-bible-memory-app/id496790833), re-fetched; [biblememory.com](https://biblememory.com/)). |
| 2 | Bible Memory App audio is a "basic voice memo recorder … **No STT, no recitation verification**" (MR); "Manual audio … no speech recognition or automated diff" (CB) | It sells "speech recognition" as a paid feature (part of the PRO feature set; which tier is unconfirmed). "Improved speech recognition accuracy" shipped 2025-10-28. It also has Apple Watch flash cards (v9.6) and Portuguese NVI-PT (v9.5, Sep 2026) (same sources). |
| 3 | "Not a single market incumbent allows a user to practice scripture while driving" / "No competitor offers an automated audio verification loop" (MR, CB) | Memverse Voice Review (2026-02-14) grades spoken recitation and feeds SRS. At least nine 2025–26 indie apps grade speech. Remember Me runs a hands-free TTS recall loop, though without grading (§5). |
| 4 | Memverse: "Audio: None"; "first-letter typing" (MR) | Now has Voice Review, Chrome/Edge only ([blog](https://www.memverse.com/blog/)). |
| 5 | Fighter Verses "$2.99–$3.99 paid app" (CB) / "$2.99" (MR) | $4.99 upfront, plus translation add-ons ([App Store](https://apps.apple.com/us/app/fighter-verses-memorize-bible/id411711646), sub-agent). |
| 6 | Verses: KJV free, other translations $4.99 each or $9.99/yr (MR) | The app has not been updated since 2020-03-13. IAPs: Verses Basic $4.99, Pro $9.99 ([App Store](https://apps.apple.com/us/app/verses-bible-memory/id939461663), sub-agent). |
| 7 | YouVersion is "Passive reading only: No active retrieval practice" (CB) | Bible App Lite has a "Verse Memorization" feature in Portuguese among other languages ([help](https://help.youversion.com/l/en/article/h8owck8of7-verse-memorization)). The **YouVersion Platform** (public beta Dec 2025) offers SDKs, but only for apps that are "free to the end user" ([platform](https://www.youversion.com/platform), re-fetched). |
| 8 | Remember Me relies on "silent reading and subjective self-grading" (CB) | Still self-graded, but it offers recording and a hands-free "recall pause" TTS loop, plus an MCP connector for voice assistants ([remem.me docs](https://www.remem.me/docs/audio/)). |
| 9 | `ALMEIDA` is "public-domain" (ADR 0007, CONTEXT.md, MR) | It is the copyrighted Almeida Revisada IBB text from a CC BY-NC dataset (§6). |
| 10 | The app supports "Almeida Revista e Corrigida, Almeida Século 21" and "ASV" (TTS §1) | It ships none of these. ARC is "© 1969 / © 1995, 2009" (SBB) and Almeida Século 21 is a copyrighted modern edition (**not re-checked**). ADR 0007 removed ASV; ASV *is* public domain if wanted ([ebible](https://ebible.org/find/details.php?id=eng-asv), sub-agent). |
| 11 | ONBV is an openly licensed bundled translation (ADR 0007) | The licence is correct: CC BY-SA 4.0, OT + NT ([ebible](https://ebible.org/find/details.php?id=poronbv), re-fetched). But the app ships **67 verses**, and no required attribution notice was found. |
| 12 | ADR 0003: premium copyrighted translations later "via official providers like API.Bible" | API.Bible's 2026-09-03 terms treat freemium as "Commercial Use". They forbid "AI driven text-to-speech … for copyright content without prior written consent" and require a 30-day refresh for offline copies ([terms](https://api.bible/terms-and-conditions), re-fetched). NIV/NVI is not commercially available there (sub-agent). The premium-translation plan needs re-scoping (L6). |
| 13 | `temperature: 0` gives deterministic greedy decoding, "strictly necessary" (ADR 0016) | At 0, "the model will use log probability to automatically increase the temperature until certain thresholds are hit" ([groq-typescript](https://github.com/groq/groq-typescript/blob/main/src/resources/audio/transcriptions.ts), verified; OpenAI API reference per sub-agent). |
| 14 | Visual-only feedback, no haptics (ADR 0004) vs. haptics on touch-down (ADR 0016) | Neither ADR reflects reality. `expo-haptics` is not installed, so the call is a silent no-op (E2). iOS also mutes haptics while recording (§4). |
| 15 | Spaced repetition is FSRS (PRODUCT.md) | The code is SM-2 (`srsEngine.ts`). Current FSRS is FSRS-6, in Anki since 25.07, with `ts-fsrs` 5.4.2 (§2.2). |
| 16 | Widgets need "Native iOS WidgetKit / Android AppWidget via Expo config plugins", effort 4/5 (CB) | First-party `expo-widgets` for iOS has been **stable since SDK 56** and is documented for v57. Android support is in the SDK 58 beta (§4). |
| 17 | Commute mode can route through CarPlay (CB, implicitly) | CarPlay needs an Apple-approved entitlement. The new "voice-based conversational apps" category arrived with iOS 26.4. No maintained Expo/RN CarPlay library exists ("No Expo support due to Scenes") (§4). |
| 18 | Groq cloud transcription costs "less than $0.0007 per recitation" (ADR 0015) | Still true and conservative: $0.04/h with a 10-s minimum is ≈ $0.00011 per ≤10-s recitation (§3.2, Groq pricing via Wayback). |
| 19 | No prior STT survey exists. `speech-transcription-apis.md` and `ideal-voice-architecture-…md` are empty. | §3.2 is the current survey. OpenAI's recommended default is now `gpt-transcribe` at $0.0045/min. Only `whisper-1` returns word timestamps on OpenAI. |
| 20 | Several prior market figures carry no citation: "abandonment rate exceeding 90% within 14 days", "over 60% of SRS dropouts", "700M+ downloads", "Hallow ($105M+ raised)", and verbatim "user quotes" attributed to Reddit threads (CB, MR) | **Not verified in this pass.** No primary source is cited for them, so treat them as unverified and do not reuse them in external material. Hallow's price ($69.99/yr) and Dwell's ($59.99/yr, $9.99/mo) were confirmed on their App Store listings (sub-agent). |
| 21 | Physical-Bible OCR import is "100% fair use, bypassing … licensing" (CB) | This is an unverified legal claim, and Brazilian copyright law was not researched for it. Note also that `deckSharing` would then *redistribute* scanned copyrighted text through share links (C7). Treat it as a legal question. |

## 9. Open Questions for the Product Owner

1. **Default pt-BR text.** Once the AA "ALMEIDA" text is removed: should the default be Bíblia Livre (CC BY, Almeida-style), ONBV (CC BY-SA, modern), or should we pursue a licence for ARA/NAA (SBB, direitos@sbb.org.br) or for the AA text (IBB/JUERP)? What licensing budget is acceptable?
2. **Monetization model.** Freemium excludes the YouVersion Platform and puts API.Bible on commercial terms, with no NIV/NVI and no AI TTS on copyrighted text. Would a free, donation-supported app (like Remember Me or Lantern) be acceptable if it unlocks better texts?
3. **Backend.** S1 requires a small stateless proxy, the first server component. Is that an acceptable amendment to ADR 0002? Who operates it and pays for it?
4. **Default speech engine.** On-device first (private, free, offline, less accurate), with cloud as an explicit opt-in? Or keep cloud by default with LGPD consent at first run?
5. **Word Peek under FSRS.** Should a peeked recitation count as **Again** (strict; the recommended option) or **Hard**? Should the visible streak still be preserved after a peek, as today?
6. **Spoken references.** Should learners say the reference ("Romans 8:28 …") as part of the recitation (the Navigators habit)? If so, should it be graded separately or ignored?
7. **Transcript override.** Is a capped "I said that" override (C8) acceptable, given the product's stance against self-grading?
8. **Publisher identity.** Is the app published by a legal entity? Apple 5.1.1(ix) expects that for apps handling sensitive information.
9. **Audience age.** Will children use the app? The ECA Digital (Lei 15.211/2025) "acesso provável" test and LGPD Art. 14 may require an age gate or parental consent before cloud transcription.
10. **Workload defaults.** What should the default desired retention be (e.g. 0.90)? What should the default daily cap be? Should there be a weekly rest day (the prior notes' Sabbath idea)?
11. **Scope for 2027.** Is chapter or long-passage memorization (C5) a strategic goal? It is the largest differentiator left in English, and it reshapes the data model (a `Passage` aggregate).
12. **Domain.** Is `voice-scripture.app` (hard-coded in `deckSharing.ts`) owned? It is needed for Universal Links and App Links.
13. **Test-set consent.** Can we collect a consented set of 50–100 real recitations to benchmark engines (V8)? That means retaining audio, which needs its own consent and retention policy.
14. **UK distribution.** Exclude the UK storefront, or license the KJV from Cambridge University Press (L8)?

## 10. Sources

All pages were accessed on **2026-10-08** unless noted otherwise. Pricing pages and store listings change, so re-check them before quoting them externally. Rows marked *sub-agent* in the body were fetched by a delegated research agent; the load-bearing ones were re-fetched and are marked *re-fetched*. Pages read through the Wayback Machine because the live page blocked automated access are noted in the body: Groq STT docs and pricing (snapshots of 2026-09-14 and 2026-08-04), Groq data retention (2026-09-23), and OpenAI's March 2025 launch-post chart data (2025-03-30).

**Memorization Science & Scheduling**

- Roediger & Karpicke (2006), Test-enhanced learning, Psychological Science — <https://doi.org/10.1111/j.1467-9280.2006.01693.x>
- Rowland (2014), testing effect meta-analysis, Psychological Bulletin — <https://doi.org/10.1037/a0037559>
- Adesope, Trevisan & Sundararajan (2017), practice tests meta-analysis, Review of Educational Research — <https://doi.org/10.3102/0034654316689306>
- Cepeda et al. (2006), distributed practice meta-analysis, Psychological Bulletin — <https://doi.org/10.1037/0033-2909.132.3.354>
- Cepeda et al. (2008), spacing effects in learning, Psychological Science — <https://doi.org/10.1111/j.1467-9280.2008.02209.x>
- Rawson & Dunlosky (2011), successive relearning, JEP: General — <https://doi.org/10.1037/a0023956>
- Rawson & Dunlosky (2022), successive relearning, Current Directions in Psychological Science — <https://doi.org/10.1177/09637214221100484>
- SuperMemo SM-2 — <https://www-v1.supermemo.com/archives1990-2015/english/ol/sm2>
- Pashler et al. (2005), feedback in verbal learning, JEP: LMC — <https://doi.org/10.1037/0278-7393.31.1.3>
- Butler & Roediger (2008), feedback and multiple-choice testing, Memory & Cognition — <https://doi.org/10.3758/MC.36.3.604>
- Kornell, Hays & Bjork (2009), unsuccessful retrieval attempts, JEP: LMC — <https://doi.org/10.1037/a0015729>
- MacLeod et al. (2010), the production effect, JEP: LMC — <https://doi.org/10.1037/a0018785>
- Forrin & MacLeod (2018), "This time it's personal", Memory — <https://doi.org/10.1080/09658211.2017.1383434>
- Fawcett (2013), production effect meta-analysis, Acta Psychologica — <https://doi.org/10.1016/j.actpsy.2012.10.001>
- Slamecka & Graf (1978), the generation effect, JEP: HLM — <https://doi.org/10.1037/0278-7393.4.6.592>
- Bertsch et al. (2007), generation effect meta-analysis, Memory & Cognition — <https://doi.org/10.3758/BF03193441>
- Brunmair & Richter (2019), interleaving meta-analysis, Psychological Bulletin — <https://doi.org/10.1037/bul0000209>
- Glisky, Schacter & Tulving (1986), method of vanishing cues, J Clin Exp Neuropsychol — <https://doi.org/10.1080/01688638608401320>
- Kessels & de Haan (2003), errorless learning & vanishing cues meta-analysis, J Clin Exp Neuropsychol — <https://doi.org/10.1076/jcen.25.6.805.16474>
- Cowan (2001), the magical number 4, Behavioral and Brain Sciences — <https://doi.org/10.1017/S0140525X01003922>
- Soderstrom & Bjork (2015), learning versus performance, Perspectives on Psychological Science — <https://doi.org/10.1177/1745691615569000>
- Bjork & Bjork (2020), desirable difficulties in theory and practice, JARMAC — <https://doi.org/10.1016/j.jarmac.2020.09.003>
- algorithm wiki — <https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm>
- Anki 25.07 release notes — <https://github.com/ankitects/anki/releases/tag/25.07>
- deck options — <https://docs.ankiweb.net/deck-options.html>
- Ye, Su & Cao (2022), stochastic shortest path SRS scheduling, KDD — <https://doi.org/10.1145/3534678.3539081>
- Su, Ye et al. (2023), optimizing spaced repetition schedule, IEEE TKDE — <https://doi.org/10.1109/TKDE.2023.3251721>
- srs-benchmark — <https://github.com/open-spaced-repetition/srs-benchmark>
- srs-benchmark README, archived June 2025 table — <https://github.com/open-spaced-repetition/srs-benchmark/blob/f0cc6814c0/README.md>
- ABC of FSRS — <https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS>
- FSRS FAQ — <https://docs.ankiweb.net/faqs/frequently-asked-questions-about-fsrs>
- ts-fsrs npm registry entry — <https://registry.npmjs.org/ts-fsrs/latest>
- ts-fsrs README — <https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md>
- ts-fsrs defaults (constant.ts) — <https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/constant.ts>
- @open-spaced-repetition/binding 0.5.0 typings (memoryStateFromSM2) — <https://cdn.jsdelivr.net/npm/@open-spaced-repetition/binding@0.5.0/dist/index.d.ts>
- fsrs-rs (model_v6.rs, inference.rs) — <https://github.com/open-spaced-repetition/fsrs-rs>
- Anki manual — <https://docs.ankiweb.net/studying.html>

**Voice & ASR**

- expo-speech-recognition npm registry — <https://registry.npmjs.org/expo-speech-recognition>
- expo-speech-recognition CHANGELOG — <https://github.com/jamsch/expo-speech-recognition/blob/main/CHANGELOG.md>
- expo-speech-recognition README — <https://github.com/jamsch/expo-speech-recognition>
- expo-speech-recognition option types — <https://github.com/jamsch/expo-speech-recognition/blob/main/src/ExpoSpeechRecognitionModule.types.ts>
- react-native-nitro-speech (npm) — <https://www.npmjs.com/package/react-native-nitro-speech>
- SpeechAnalyzer — <https://developer.apple.com/documentation/speech/speechanalyzer>
- SpeechTranscriber — <https://developer.apple.com/documentation/speech/speechtranscriber>
- WWDC25 session 277 — <https://developer.apple.com/videos/play/wwdc2025/277/>
- AnalysisContext.contextualStrings — <https://developer.apple.com/documentation/speech/analysiscontext/contextualstrings>
- ResultAttributeOption — <https://developer.apple.com/documentation/speech/speechtranscriber/resultattributeoption>
- Speech updates — <https://developer.apple.com/documentation/updates/speech>
- SFSpeechRecognizer — <https://developer.apple.com/documentation/speech/sfspeechrecognizer>
- Apple: requiresOnDeviceRecognition — <https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition>
- Android SpeechRecognizer reference — <https://developer.android.com/reference/android/speech/SpeechRecognizer>
- Android RecognizerIntent reference — <https://developer.android.com/reference/android/speech/RecognizerIntent>
- whisper.rn (GitHub) — <https://github.com/mybigday/whisper.rn>
- NVIDIA Parakeet-TDT-0.6B-v3 model card — <https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3>
- NVIDIA Nemotron 3.5 ASR streaming model card — <https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b>
- Groq speech-to-text docs (via Wayback 2026-09-14) — <https://console.groq.com/docs/speech-to-text>
- groq-typescript SDK — <https://github.com/groq/groq-typescript/blob/main/src/resources/audio/transcriptions.ts>
- OpenAI speech-to-text guide — <https://developers.openai.com/api/docs/guides/speech-to-text>
- OpenAI API pricing — <https://developers.openai.com/api/docs/pricing>
- OpenAI's launch post — <https://openai.com/index/introducing-our-next-generation-audio-models/>
- Deepgram pricing — <https://deepgram.com/pricing>
- Deepgram keyterm prompting — <https://developers.deepgram.com/docs/keyterm>
- Chirp 3 docs — <https://cloud.google.com/speech-to-text/v2/docs/chirp_3-model>
- Azure Pronunciation Assessment how-to — <https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment>
- Azure Pronunciation Assessment language support — <https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=pronunciation-assessment>
- Apple SpeechTranscriber.Preset — <https://developer.apple.com/documentation/speech/speechtranscriber/preset>
- Memverse blog (Voice Review, 2026-02-14) — <https://www.memverse.com/blog/>
- Lei 13.709/2018 — <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm>
- ANPD Resolução CD/ANPD nº 19/2024 (DOU) — <https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-19-de-23-de-agosto-de-2024-580095396>
- App Review Guidelines — <https://developer.apple.com/app-store/review/guidelines/>
- App Privacy Details — <https://developer.apple.com/app-store/app-privacy-details/>
- Asking permission to use speech recognition — <https://developer.apple.com/documentation/speech/asking-permission-to-use-speech-recognition>
- Google Play Data safety — <https://support.google.com/googleplay/android-developer/answer/10787469>
- Google Play User Data policy — <https://support.google.com/googleplay/android-developer/answer/10144311>
- OpenAI: your data (per-endpoint retention) — <https://developers.openai.com/api/docs/guides/your-data>
- Groq: your data, Wayback capture 2026-09-23 — <https://web.archive.org/web/20260923121047/https://console.groq.com/docs/your-data>
- Deepgram your data — <https://developers.deepgram.com/trust-security/your-data>
- OpenAI API reference: authentication — <https://developers.openai.com/api/reference/overview>
- OWASP MASWE-0004 hardcoded secrets — <https://mas.owasp.org/MASWE/MASVS-STORAGE/MASWE-0004/>
- Groq: your data (live page; read via Wayback 2026-09-23) — <https://console.groq.com/docs/your-data>

**Expo SDK 57 / Platform Capabilities**

- expo.dev/changelog/sdk-57 — <https://expo.dev/changelog/sdk-57>
- expo.dev/changelog/sdk-56 — <https://expo.dev/changelog/sdk-56>
- expo.dev/changelog/sdk-58-beta — <https://expo.dev/changelog/sdk-58-beta>
- Expo expo-widgets (v57) — <https://docs.expo.dev/versions/v57.0.0/sdk/widgets/>
- react-native-android-widget Expo tutorial — <https://saleksovski.github.io/react-native-android-widget/docs/tutorial/register-widget-expo>
- Apple ActivityKit — <https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities>
- developer.apple.com/carplay — <https://developer.apple.com/carplay/>
- Apple CarPlay Developer Guide (PDF, rev. 2026-06-08) — <https://developer.apple.com/download/files/CarPlay-Developer-Guide.pdf>
- developer.android.com/training/cars — <https://developer.android.com/training/cars>
- cars/media — <https://developer.android.com/training/cars/media>
- react-native-carplay (GitHub) — <https://github.com/birkir/react-native-carplay>
- docs v57 audio — <https://docs.expo.dev/versions/v57.0.0/sdk/audio/>
- Android FGS types — <https://developer.android.com/develop/background-work/services/fgs/service-types>
- @bacons/apple-targets (GitHub) — <https://github.com/EvanBacon/expo-apple-targets>
- Expo expo-app-intents (v58, alpha) — <https://docs.expo.dev/versions/v58.0.0/sdk/app-intents/>
- react-native-watch-connectivity (GitHub) — <https://github.com/watch-connectivity/react-native-watch-connectivity>
- react-native-wear-connectivity — <https://github.com/fabOnReact/react-native-wear-connectivity>
- docs v57 notifications — <https://docs.expo.dev/versions/v57.0.0/sdk/notifications/>
- Android alarms — <https://developer.android.com/develop/background-work/services/alarms/schedule>
- docs v57 haptics — <https://docs.expo.dev/versions/v57.0.0/sdk/haptics/>
- Apple allowHapticsAndSystemSoundsDuringRecording — <https://developer.apple.com/documentation/avfaudio/avaudiosession/allowhapticsandsystemsoundsduringrecording>
- metro-config defaults — <https://github.com/facebook/metro/blob/main/packages/metro-config/src/defaults/index.js>
- Expo's Metro config — <https://github.com/expo/expo/blob/sdk-57/packages/@expo/metro-config/src/ExpoMetroConfig.ts>
- app config v57 — <https://docs.expo.dev/versions/v57.0.0/config/app/>
- color themes guide — <https://docs.expo.dev/develop/user-interface/color-themes/>
- environment variables guide — <https://docs.expo.dev/guides/environment-variables/>
- API routes — <https://docs.expo.dev/router/web/api-routes/>
- Expo @expo/app-integrity (v57, alpha) — <https://docs.expo.dev/versions/v57.0.0/sdk/app-integrity/>
- UIPasteControl — <https://developer.apple.com/documentation/uikit/uipastecontrol>
- expo-clipboard iOS source (sdk-57) — <https://github.com/expo/expo/blob/sdk-57/packages/expo-clipboard/ios/ClipboardModule.swift>
- docs v57 clipboard — <https://docs.expo.dev/versions/v57.0.0/sdk/clipboard/>
- Android 12 changes — <https://developer.android.com/about/versions/12/behavior-changes-all>
- async-storage 2.2.0 Limits — <https://github.com/react-native-async-storage/async-storage/blob/%40react-native-async-storage/async-storage%402.2.0/packages/website/docs/Limits.md>
- docs v57 sqlite — <https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/>
- expo-file-system package.json (sdk-57) — <https://github.com/expo/expo/blob/sdk-57/packages/expo-file-system/package.json>
- React Native 0.86 accessibility — <https://reactnative.dev/docs/0.86/accessibility>
- React Native 0.86 AccessibilityInfo — <https://reactnative.dev/docs/0.86/accessibilityinfo>

**Product & Competitive Landscape**

- The Bible Memory App (App Store US) — <https://apps.apple.com/us/app/the-bible-memory-app/id496790833>
- biblememory.com — <https://biblememory.com/>
- Bible Memory App groups / church challenge — <https://biblememory.com/bible-memory-groups>
- Versify (App Store US) — <https://apps.apple.com/us/app/versify-app/id1597230197>
- Remember Me docs: audio — <https://www.remem.me/docs/audio/>
- Remember Me docs: MCP connector — <https://www.remem.me/docs/mcp/>
- Engraved — <https://apps.apple.com/us/app/engraved-voice-bible-memory/id6791640543>
- Recite (Gibson) — <https://www.reciteapp.co.uk/>
- ReciteWell — <https://apps.apple.com/us/app/recitewell/id6759792785>
- OneNineteen — <https://apps.apple.com/us/app/onenineteen-scripture-memory/id6774433572>
- Speak — <https://apps.apple.com/us/app/speak-memorize-scripture/id6779264233>
- Bread — <https://apps.apple.com/us/app/bread-bible-memorization/id6757946016>
- Lantern — <https://apps.apple.com/us/app/lantern-bible-memory/id6760799408>
- MemoryVerses — <https://apps.apple.com/us/app/memoryverses-bible-memory/id6761134446>
- Yada Verses — <https://apps.apple.com/us/app/yada-verses/id6785284874>
- Memory – Janus Works (Google Play BR) — <https://play.google.com/store/apps/details?id=com.janus.memory&hl=pt_BR>
- VersoTranca (App Store BR) — <https://apps.apple.com/br/app/versotranca-mem%C3%B3ria-b%C3%ADblia/id6740823561>
- YouVersion help: Verse Memorization — <https://help.youversion.com/l/en/article/h8owck8of7-verse-memorization>
- Dwell (App Store US) — <https://apps.apple.com/us/app/dwell-audio-bible/id1343917374>
- Hallow (App Store US) — <https://apps.apple.com/us/app/hallow-prayer-meditation/id1405323394>
- Verses – Bible Memory (App Store US) — <https://apps.apple.com/us/app/verses-bible-memory/id939461663>
- scripturetyper.com — <https://scripturetyper.com/>
- youversion.com/platform — <https://www.youversion.com/platform>
- Remember Me docs: church campaigns — <https://www.remem.me/docs/guides/campaigns/>
- Remember Me docs: study settings — <https://www.remem.me/docs/study/>

**Translations & Licensing (pt-BR focus)**

- github.com/thiagobodruk/biblia — <https://github.com/thiagobodruk/biblia>
- biblias.com.br/direitos-autorais — <https://biblias.com.br/direitos-autorais>
- sbb.org.br EULA — <https://www.sbb.org.br/acordo-de-licenca-de-usuario-final-eula>
- ebible.org/poronbv — <https://ebible.org/find/details.php?id=poronbv>
- ebible.org/porbr2018 — <https://ebible.org/find/details.php?id=porbr2018>
- api.bible/terms-and-conditions — <https://api.bible/terms-and-conditions>
- API.Bible pricing — <https://api.bible/>
- ebible.org/engwebp — <https://ebible.org/find/details.php?id=engwebp>
- UK National Archives — <https://cdn.nationalarchives.gov.uk/documents/centenary-crown-copyright-timeline.pdf>
- berean.bible — <https://berean.bible/terms.htm>

**Engineering Quality of the Current Codebase**

- docs.expo.dev/guides/using-sentry — <https://docs.expo.dev/guides/using-sentry/>
- openai/whisper `audio.py` (SAMPLE_RATE = 16000) — <https://github.com/openai/whisper/blob/main/whisper/audio.py>

**Changed Since Prior Research**

- Fighter Verses (App Store US) — <https://apps.apple.com/us/app/fighter-verses-memorize-bible/id411711646>
- eBible: ASV — <https://ebible.org/find/details.php?id=eng-asv>

