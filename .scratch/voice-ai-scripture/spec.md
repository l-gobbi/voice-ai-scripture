# Specification: Three-Tier Scaffolded Recitation & Native Speech Infrastructure

**Status:** ready-for-agent  
**Domain:** Christian EdTech / Faith-Tech / Spaced Repetition (SRS)  
**Governing Documents:** `CONTEXT.md`, `docs/adr/0011-three-tier-scaffolded-recitation-and-speech-infrastructure.md`

---

## Problem Statement

When learners attempt to memorize new, lengthy, or complex scripture passages, facing an unassisted blank screen immediately creates high cognitive anxiety ("blank-slate paralysis"). Users resort to reading visual text passively or typing on smartphone screens, which feels like data entry and breaks the contemplative, devotional nature of scripture meditation. 

Furthermore, existing voice verification relies on cloud API tokens, leaving offline and free users without live speech verification, while competitors offer no auditory scaffolding to transition users smoothly from first exposure to unassisted recall.

---

## Solution

A three-tier scaffolded learning progression powered by on-device Speech Synthesis and Native Speech Recognition:
1. **Echo Mode (Level 1)**: Auditory-first ear training. The app vocalizes the verse aloud via Speech Synthesis while text is concealed by default, inviting the user to repeat the verse from auditory memory with an optional "Reveal Text" lifeline.
2. **Cloze Practice (Level 2)**: Visual retrieval scaffolding. Words are displayed as first-letter anchors with blanks (`F___ G__ s_ l____`). Tapping any blanked word reveals it inline permanently for that attempt. Includes on-demand audio vocalization.
3. **Blind Recitation (Level 3)**: Official active recall from memory with text blanked. Includes a 3-second **Word Peek Lifeline** allowing users to peek at a forgotten word; using a peek caps the session score at 75% to schedule reinforcement tomorrow without a punishing streak reset.
4. **Pedagogical Separation**: Levels 1 & 2 are free, unmetered **Practice Mode**; only Level 3 consumes trial quota and records official Spaced Repetition (SRS) updates.
5. **Dual-Tier Speech Infrastructure**: Native on-device dictation provides 100% offline, zero-latency, free voice verification for all users, reserving cloud neural AI for premium subscribers.

---

## User Stories

1. As a learner memorizing a new verse, I want the app to vocalize the verse aloud in its native language while concealing the text, so that I train my auditory ear before reading visually.
2. As a learner in Echo Mode, I want an optional "Reveal Text" button, so that I can verify difficult spellings or pronunciations if I miss words in the audio.
3. As a learner in Echo Mode, I want to recite the verse aloud and see my recitation verified without consuming my trial quota or resetting my memory streak.
4. As a learner practicing in Level 2 (Cloze Practice), I want every word displayed with its first letter and blanks (e.g. `F___ G__ s_ l____`), so that my brain gets minimal visual scaffolding without giving away the answer.
5. As a learner in Cloze Practice, I want to tap any individual blanked word to reveal it inline, so that I can unblock myself if I only forgot one specific word.
6. As a learner in Cloze Practice, I want an on-demand audio button, so that I can listen to the verse vocalized again without leaving the first-letter cloze view.
7. As a learner conducting an official due review in Level 3 (Blind Recitation), I want the words blanked out completely, so that I test pure active recall from memory.
8. As a learner stuck on a word during Blind Recitation, I want to tap a blanked word to peek at it for 3 seconds before it re-blanks, so that I can complete my recitation without quitting in frustration.
9. As a learner who used a Word Peek Lifeline in Level 3, I want my recitation score capped at 75%, so that Spaced Repetition schedules a reinforcement review for tomorrow without wiping out my multi-day streak.
10. As a learner completing an unassisted 100% Blind Recitation in Level 3, I want full Spaced Repetition credit, so that my streak increases and my review interval advances according to the SM-2 algorithm.
11. As a learner opening a due verse in ReviewScreen, I want the screen to default directly to Level 3 (Recite) while offering one-tap segmented tabs to jump to Level 1 or Level 2, so that experienced reviews remain fast and friction-free.
12. As a Portuguese-language learner, I want Speech Synthesis and voice verification to automatically speak and listen in Portuguese (`pt-BR`) when reviewing Portuguese translations (e.g., Almeida, ONBV, NVI), so that pronunciation and verification are accurate.
13. As an English-language learner, I want Speech Synthesis and voice verification to automatically speak and listen in English (`en-US`) when reviewing English translations (e.g., WEB, KJV), so that the experience matches the text.
14. As a mobile user without cellular reception or Wi-Fi, I want Speech Synthesis and voice verification to work 100% offline, so that I can practice scripture anywhere without network errors.
15. As a free-tier user without a personal OpenAI API key, I want real voice recitation verification on my device, so that I can experience voice verification without setup friction.
16. As an engineer navigating the repository, I want pure cloze token generation and masking isolated into a deterministic domain module (`clozeEngine`), so that UI components remain thin and testable.
17. As an engineer maintaining test suites, I want Speech Synthesis and Native Speech Transcriber to expose clean in-memory test doubles, so that all 20+ test suites run fast and hermetically in Node/Jest.

---

## Implementation Decisions

1. **Pure Cloze Logic Engine (`clozeEngine.ts`)**:
   - Expose pure domain functions:
     - `generateClozeTokens(text: string, mode: 'first-letter' | 'blank'): ClozeToken[]`
     - `revealWord(tokens: ClozeToken[], index: number): ClozeToken[]`
     - `hideWord(tokens: ClozeToken[], index: number): ClozeToken[]`
     - `evaluateAssistedScore(score: number, assistanceUsed: boolean): number` (caps score at 75% if assistance was utilized).
   - Each `ClozeToken` encapsulates: `word`, `firstLetter`, `punctuation`, `isRevealed`.

2. **Speech Synthesis Seam (`SpeechSynthesizer.ts`)**:
   - Provide a deep interface:
     - `speak(text: string, options?: { language?: 'en' | 'pt'; onDone?: () => void }): Promise<void>`
     - `stop(): Promise<void>`
     - `isSpeaking(): Promise<boolean>`
   - Production implementation delegates to `expo-speech`.
   - In-memory mock implementation (`MockSpeechSynthesizer`) captures spoken text and execution callbacks for automated testing.

3. **Native Speech Transcriber (`NativeSpeechTranscriber.ts`)**:
   - Implements the existing `SpeechTranscriber` seam (`transcribe(audioUri: string, options?: TranscriptionOptions): Promise<TranscriptionResult>`).
   - Delegates on-device dictation to native mobile speech recognition services (iOS Apple Speech framework and Android SpeechRecognizer).
   - Injected seamlessly into `createDefaultTranscriber()` alongside `OpenAISpeechTranscriber` and `SimulatedTranscriber`.

4. **ReviewScreen UI & Segmented Navigation**:
   - Replace the two-way mode toggle with a three-tier segmented control: `[1. Echo | 2. Practice | 3. Recite]`.
   - Level 1 (Echo): Concealed text card with "Reveal Text" toggle; auto-vocalizes via `SpeechSynthesizer` on entry.
   - Level 2 (Practice): Interactive cloze view displaying first letters; tapping any blank reveals the word persistently for the attempt; includes an on-demand "🔊 Listen" button.
   - Level 3 (Recite): Blanked text view; tapping any word reveals it temporarily for 3 seconds and sets `assistanceUsed = true`; records official SRS review upon completion.

---

## Testing Decisions

- **Seam 1: Cloze Engine (`clozeEngine.test.ts`)**:
  - Test first-letter masking across punctuation, quotes, and hyphens (e.g., `"For God so loved..."` $\rightarrow$ `"F__ G__ s_ l____..."`).
  - Test persistent vs. temporary word reveal mutations.
  - Test assisted score capping (score of 95% with assistance caps to 75%; score of 60% remains 60%).
- **Seam 2: Speech Synthesis (`SpeechSynthesizer.test.ts`)**:
  - Test language priming and stop/cancel semantics using `MockSpeechSynthesizer`.
- **Seam 3: Native Speech Transcriber (`NativeSpeechTranscriber.test.ts`)**:
  - Test integration with `SpeechTranscriber` seam, prompt conditioning, and error handling.
- **Seam 4: ReviewScreen & Recitation Integration (`ReviewScreen.test.tsx`)**:
  - Test segmented level switching (Echo $\rightarrow$ Practice $\rightarrow$ Recite).
  - Test Level 1 text reveal toggle.
  - Test Level 2 tap-to-reveal word peek.
  - Test Level 3 3-second temporary peek and resulting 75% score cap on Spaced Repetition review recording.

---

## Out of Scope

- Cloud audio streaming from ElevenLabs or custom neural voice cloning (reserved for future cloud voice packs).
- Community social leaderboards or multiplayer recitation challenges.
- In-App Purchase billing SDK integration (StoreKit/Google Play Billing), which will be addressed in a dedicated monetization release.
