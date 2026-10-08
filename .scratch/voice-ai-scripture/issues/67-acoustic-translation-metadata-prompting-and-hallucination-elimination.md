# 67: Acoustic Translation Metadata Prompting & Hallucination Elimination

**What to build:**
Update the speech transcription prompt construction in `RecitationSession` to supply canonical translation metadata (`Bíblia Sagrada. Tradução: ${translation}. Referência: ${reference}.`) and strictly omit the verbatim verse text. This eliminates Whisper repetition loops (e.g. `"O Sra. O Sra."`) and prevents the speech model from auto-correcting user memory slips, while maintaining deterministic greedy decoding (`temperature: 0`) and verbatim mathematical evaluation against stored text.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `RecitationSession.startReciting()` constructs the transcription prompt from translation metadata and reference without the verbatim verse text.
- [x] In Portuguese, prompt is formatted as `Bíblia Sagrada. Tradução: ${translation}. Referência: ${reference}.`
- [x] In English, prompt is formatted as `Holy Bible. Translation: ${translation}. Reference: ${reference}.`
- [x] Cloud transcription retains `temperature: '0'` for maximum phonetic fidelity.
- [x] Verbatim word-by-word accuracy verification in `RecitationEvaluator` continues to evaluate 100% against stored verse text.
- [x] Unit tests in `RecitationSession.test.ts` verify the prompt contents and evaluation independence.
