# 43: Pure Recitation Evaluator Pipeline

**What to build:**
A pure in-process `RecitationEvaluator` function that consolidates Myers sequence diffing, diacritic-lenient comparison, honorific abbreviation expansion (`Sra.` $\leftrightarrow$ `Senhor`), balanced F1 scoring, lifeline assistance score capping (75%), and SuperMemo-2 unmetered simulation. Relieves visual cloze masking (`clozeEngine`) from owning scoring policies and eliminates manual SRS result patching in `RecitationSession`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `evaluateRecitation(input)` receives expected text, transcribed text, assistance flag, and current SRS state, returning complete evaluation tokens, F1 score, pass/fail status, and prospective SRS result.
- [x] Recitations using word-peek lifelines have their final score capped at 75% without depending on `clozeEngine`.
- [x] Unmetered practice attempts (Levels 1 and 2) return simulated intervals while preserving existing verse SRS state.
- [x] Honorific abbreviations (`sr`, `sra`, `sto`, `st`, `mr`) match canonical words with 100% credit.
- [x] 100% deterministic pure function verified with fast unit tests and zero mocks.
