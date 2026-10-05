# Specification: Groq Cloud Whisper, Diacritic-Lenient Verification & Canonical Scripture Projection

**Status:** ready-for-agent  
**Domain:** Audio Transcription / Speech Recognition / Verification Engine / Scripture Recitation / UI Diffing  
**Governing Documents:** `CONTEXT.md`, `docs/adr/0006-speech-transcriber-seam.md`, `docs/adr/0011-three-tier-scaffolded-recitation-and-speech-infrastructure.md`, `docs/adr/0014-canonical-projection-and-diacritic-lenient-verification.md`

---

## Problem Statement

When learners recite scripture in languages with diacritics and accents (such as Portuguese Salmos 23:1, *"O Senhor é o meu pastor; nada me faltará"*), the application's verification engine incorrectly penalizes them and produces mangled output:
1. **Unicode Diacritic Stripping**: The verification normalizer relies on ASCII regex that completely strips accented characters. Single-letter accented words like *"é"* disappear entirely, and accented words like *"faltará"* have trailing letters stripped into *"faltar"*.
2. **Degraded Visual Presentation**: The diff visualization displays stripped, lowercased, punctuation-free word tokens rather than the formatted biblical verse, making learners believe the speech recognizer corrupted their recitation.
3. **Transcription Speed & Latency**: Commodity on-device speech dictation lacks biblical vocabulary priming, while standard cloud transcription often takes 1.5 to 3 seconds of round-trip latency, disrupting the immersive rhythm of scripture memory.

Learners need instantaneous, high-precision speech transcription that accurately recognizes biblical proper nouns and archaic vocabulary, paired with a verification display that respects canonical scripture formatting and ignores minor microphone acoustic accent omissions.

---

## Solution

Implement an ultra-low-latency **Groq Cloud Whisper (`whisper-large-v3-turbo`)** transcription provider, upgrade the verification engine with **Diacritic-Lenient Matching** and **Canonical Scripture Projection**, and provide a developer **Acoustic Debug Tray**:

1. **Groq Cloud Whisper Integration (`whisper-large-v3-turbo`)**:
   - Deliver near-instantaneous transcription (~250ms–400ms mobile round-trip) running on Groq LPUs via an OpenAI-compatible audio transcription seam.
   - Prime the model with canonical scripture reference and passage text prompts, virtually eliminating word error rates on biblical proper nouns.
   - Support seamless provider resolution: prioritize Groq Cloud Whisper when `EXPO_PUBLIC_GROQ_API_KEY` is present, fall back to OpenAI `gpt-transcribe` when `EXPO_PUBLIC_OPENAI_API_KEY` is present, and gracefully fall back to native on-device dictation when offline or unkeyed.
2. **Diacritic-Lenient Verification**:
   - Normalize strings by stripping diacritics strictly during sequence alignment (`diffVerses`), equating unaccented or alternate forms (e.g. `e` matching `é`, `faltara` matching `faltará`) so acoustic speech recognizer imperfections do not penalize Spaced Repetition scores.
3. **Canonical Scripture Projection**:
   - Map aligned diff tokens back onto the original canonical scripture verse words. Diff badges in the UI retain original capitalization, accents, and attached punctuation (`[O]`, `[Senhor,]`, `[é]`, `[o]`, `[meu]`, `[pastor;]`), while spoken additions retain user phrasing.
4. **Developer Acoustic Debug Tray**:
   - Provide an inspection overlay in development mode (`__DEV__`), toggled via a long-press on the scripture reference header, to display raw recognized transcripts for diagnostic verification.

---

## User Stories

### High-Fidelity Neural Transcription
1. As a learner reciting a verse, I want my spoken audio transcribed via Groq Cloud Whisper in under 400 milliseconds, so that I receive immediate evaluation without waiting in a loading state.
2. As a learner reciting complex biblical passages, I want the speech transcriber primed with the verse reference and text prompt, so that biblical proper nouns and archaic terms are recognized accurately.
3. As a learner practicing in Portuguese, I want Portuguese recitations (`pt-BR`) transcribed faithfully without losing accentuation or elided syllables, so that my recitation accuracy reflects my true recall.
4. As a learner practicing in English, I want English recitations (`en-US`) transcribed accurately across modern and archaic translations (KJV, WEB, ESV), so that reverent phrasing is respected.
5. As a developer configuring the app, I want to provide `EXPO_PUBLIC_GROQ_API_KEY` in `.env`, so that the app automatically routes recitations through Groq Cloud Whisper.
6. As a developer with an OpenAI key, I want the app to support `EXPO_PUBLIC_OPENAI_API_KEY` using `gpt-transcribe`, so that I have a reliable secondary cloud neural provider.
7. As an offline learner without an API key, I want the app to fall back to native on-device speech recognition, so that basic recitation practice remains free and accessible.

### Diacritic-Lenient Verification
8. As a Portuguese learner reciting *"O Senhor é o meu pastor"*, I want the word *"é"* to match correctly even if speech recognition outputs *"e"*, so that my Spaced Repetition streak is not penalized by acoustic ambiguity.
9. As a learner reciting *"nada me faltará"*, I want the word to match correctly even if speech recognition transcribes *"faltara"*, so that verb tense memory is evaluated fairly.
10. As a learner reciting in English with contractions (e.g., *"doesn't"*, *"God's"*), I want straight and curly apostrophes to align identically, so that typography differences do not affect my score.
11. As a learner reciting hyphenated words or passages with em-dashes, I want dash-separated words to split and align cleanly, so that punctuation pacing does not cause false errors.
12. As a learner who stutters or repeats a word while thinking, I want the alignment algorithm to penalize only the repeated token as an addition without corrupting subsequent matched words, so that balanced F1 accuracy is preserved.

### Canonical Scripture Projection & Visual Feedback
13. As a learner reviewing my recitation results, I want the evaluated verse tokens to appear with original canonical capitalization and accents, so that the scripture reads like a sacred, dignified passage.
14. As a learner viewing the diff badges, I want trailing punctuation (commas, periods, semicolons) attached to matched canonical tokens, so that the natural literary rhythm of the verse is visible.
15. As a learner who omitted a word, I want the missing word displayed with a strikethrough badge in its proper canonical position, so that I can see exactly what I forgot.
16. As a learner who spoke an extra word not present in scripture, I want the added word highlighted with a distinct plus badge showing what I said, so that I know where I hallucinated or added words.
17. As a learner in dark mode, I want the diff view tokens and badges to follow theme token contrast standards, so that verification results are easily readable in any lighting.

### Developer Diagnostics & Seam Integrity
18. As a developer testing recitation accuracy in development mode, I want to long-press the scripture reference header to toggle an Acoustic Debug Tray, so that I can inspect the raw transcript returned by the speech model.
19. As a user in production builds, I want the Acoustic Debug Tray completely hidden and dormant, so that the user interface remains distraction-free and clean.
20. As a developer running unit tests, I want the verification engine and speech transcriber factory to test cleanly without network dependencies, so that CI test suites run deterministically and fast.
21. As a privacy-conscious user, I want the recorded audio file deleted from disk immediately after transcription verification completes, so that device storage and privacy are strictly safeguarded.

---

## Implementation Decisions

### 1. Seams & Speech Transcriber Factory
- **Primary Seam (`SpeechTranscriber`)**:
  - Located within the speech transcription service layer.
  - Implement `GroqTranscriber` conforming to `SpeechTranscriber`:
    - Connects to Groq's OpenAI-compatible endpoint: `https://api.groq.com/openai/v1/audio/transcriptions`.
    - Uses default model: `whisper-large-v3-turbo`.
    - Passes `prompt` and `language` options for acoustic priming.
    - Maps HTTP and network errors to domain `TranscriptionError`.
  - Update `WhisperTranscriber`:
    - Upgrade model from deprecated `whisper-1` to `gpt-transcribe`.
  - Update `createDefaultTranscriber(apiKey?, options?)`:
    - Evaluates keys in precedence:
      1. `EXPO_PUBLIC_GROQ_API_KEY` -> instantiate `GroqTranscriber`.
      2. `EXPO_PUBLIC_OPENAI_API_KEY` (or explicit `apiKey`) -> instantiate `WhisperTranscriber`.
      3. Otherwise -> instantiate `NativeSpeechTranscriber`.

### 2. Verification Normalization & Diacritic-Lenient Matching
- **Diff Engine Redesign**:
  - Replace the ASCII regex `/[^\w\s']/gi` with unicode-aware normalization.
  - Establish a dual-representation token architecture:
    - **Canonical Tokens**: Extracted directly from canonical verse text, retaining original word spelling, accents, capitalization, and attached punctuation.
    - **Normalized Keys**: Computed by lowercasing, normalizing unicode NFD, stripping diacritics (`\p{Diacritic}`), and removing non-alphanumeric characters.
  - Sequence alignment (Myers / Levenshtein edit distance) runs on the **Normalized Keys**.
  - Backtracking produces `DiffToken` instances where:
    - `status: 'correct'`: Contains the **Canonical Token** from the verse.
    - `status: 'missed'`: Contains the **Canonical Token** from the verse.
    - `status: 'added'`: Contains the transcribed spoken word.

### 3. Canonical Scripture Projection in DiffView
- Update the DiffView component to render tokens with their canonical casing and attached punctuation.
- Ensure the badge typography adheres to the sacred scripture font family and design system tokens.

### 4. Acoustic Debug Tray
- Add diagnostic state in the recitation review interface to capture and retain the raw transcript string returned by the `SpeechTranscriber`.
- In `__DEV__`, wrap the reference header in a pressable handler that toggles the display of an expandable debug drawer showing:
  - Active transcriber engine name (Groq Whisper / OpenAI gpt-transcribe / Native).
  - Raw transcribed text string.
  - Spoken duration or token count.

---

## Testing Decisions

- **What makes a good test**: Tests must verify observable behavioral contracts rather than internal variable states. A good test asserts that a Portuguese verse reciting *"O Senhor é o meu pastor; nada me faltará"* with an unaccented transcript *"o senhor e o meu pastor nada me faltara"* returns a 100% score and outputs canonical diff tokens with original accents and punctuation preserved.
- **Modules to test**:
  - **Verification Engine (`diffEngine.test.ts`)**:
    - Portuguese diacritic-lenient matching (`e` vs `é`, `faltara` vs `faltará`, `coracao` vs `coração`).
    - Canonical token projection with attached punctuation.
    - English contractions, hyphenated words, and stutter resistance.
    - Accurate score calculation across perfect, partial, and empty recitations.
  - **Speech Transcriber (`SpeechTranscriber.test.ts`)**:
    - `GroqTranscriber` payload construction, authorization header, and endpoint URL.
    - Error mapping from Groq HTTP status codes to `TranscriptionError`.
    - Factory precedence resolution across Groq, OpenAI, and Native.
  - **Recitation Session Integration (`RecitationSession.test.ts`)**:
    - Full recitation lifecycle through audio capture, transcription prompt conditioning, verification scoring, and audio file cleanup.
- **Prior art**:
  - `src/engines/diffEngine.test.ts` for alignment matrices.
  - `src/services/SpeechTranscriber.test.ts` for HTTP mock verification.
  - `src/services/RecitationSession.test.ts` for lifecycle invariants.

---

## Out of Scope

- Real-time streaming WebSocket speech recognition during live recitation (batch transcription on recording stop is sufficient).
- On-device compilation of native C++ `whisper.cpp` (`whisper.rn`).
- Audio pitch or phonetic pronunciation scoring.
- Automated speech evaluation for languages outside Latin and Greek alphabets.

---

## Further Notes

- Groq Cloud provides a free tier with high rate limits (up to 7,200 audio seconds per hour for Whisper), making it completely free for personal development and testing.
- The `EXPO_PUBLIC_` prefix is required in Expo so variables defined in `.env` are accessible in the client bundle.

