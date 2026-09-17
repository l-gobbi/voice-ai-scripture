# 0001: Deterministic Dynamic Programming Diffing Over LLM Evaluation

We decided to use an in-client Dynamic Programming string alignment algorithm (Levenshtein-based word diffing) instead of prompting an LLM (like GPT-4o) to grade recitations.

While an LLM could evaluate recitation semantics, it introduces unpredictable evaluation latency (1.5s–3s), significant per-recitation API token costs, and nondeterministic grading. Memorizing scripture requires exact verbatim fidelity rather than semantic paraphrasing. An in-client DP diff delivers sub-millisecond, deterministic word-level badges (`correct`, `missed`, `added`) with zero marginal server cost.
