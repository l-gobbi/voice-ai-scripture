# Specification: Instant Voice Capture & Acoustic Translation Metadata Prompting

**Status:** ready-for-agent  
**Domain:** Voice AI Infrastructure / Recitation Lifecycle / Acoustic Prompt Conditioning  
**Governing Documents:** `CONTEXT.md`, `docs/adr/0015-floating-microphone-button-and-vad-silence-autocompletion.md`, `docs/adr/0016-hybrid-sacred-intent-voice-architecture.md`

---

## Problem Statement

When reciting scripture out loud from memory, learners experience two critical voice recitation frictions:

1. **Acoustic Hallucination & Phantom Stutter Recognition**:
   - When reciting passages (such as Psalm 23:1, *"O Senhor é o meu pastor, nada me faltará"*), learners occasionally receive bizarre, repetitive recognized transcripts such as `"O Sra. O Sra. O Senhor é o meu pastor, nada me faltará."`, despite reciting the passage cleanly without stuttering.
   - Because the previous prompt implementation injected the entire verbatim passage text into the Whisper transcription prompt, the autoregressive decoder treated the scripture as preceding dialogue context.
   - When encountering slight initial microphone noise, room ambiance, or acoustic onset ambiguity, Whisper's greedy decoding loop at `temperature: 0` hallucinated repetitions of common Portuguese honorific abbreviations (`"O Sra."` / `"O Sr."`) before synchronizing with the clear audio.
   - Furthermore, passing the verbatim verse text to the speech model biases the transcriber toward the expected answer, creating a risk that speech recognition "corrects" the learner's actual memory slips.

2. **Cold-Start Recording Latency (Audio Inception Delay)**:
   - When learners press the floating microphone button and begin speaking naturally without waiting, their opening syllables (e.g. *"O Sen..."*) are clipped and lost before the recording stream opens.
   - In popular voice applications (such as Duolingo or WhatsApp), speech capture is instantaneous upon touch. In contrast, the application executed asynchronous permission verification, storage quota transactions, native audio session mode switching, and encoder preparation *after* the button touch event.
   - This 300–500ms initialization window forces learners into an unnatural, anxious pause before speaking, conflicting with the contemplative, fluid experience of scripture recitation.

---

## Solution

Eliminate recording startup latency and transcription prompt hallucination through two architectural solutions:

1. **Warm Standby Audio Driver (Zero-Wait Pre-Warming)**:
   - Introduce a `warmUp()` lifecycle method across the audio driver and voice input seams.
   - When the recitation review screen mounts, the system pre-configures native audio session routing and pre-allocates the native recorder in a warm standby state in the background.
   - When the learner taps the floating microphone button, audio capture begins immediately (<15ms) with synchronous execution and instant haptic feedback, allowing the learner to speak in the exact millisecond of touch without onset clipping.

2. **Acoustic Translation Metadata Prompting**:
   - Completely eliminate verbatim verse text from the cloud transcription prompt.
   - Replace the prompt with canonical scripture metadata (Holy Bible identifier, translation edition, and canonical reference), omitting the text itself (e.g. `"Bíblia Sagrada. Tradução: ALMEIDA. Referência: Salmos 23:1."`).
   - Guide Whisper's acoustic vocabulary toward the specific historical and grammatical register of the translation (e.g., archaic conjugations in Almeida vs modern English in WEB) without providing candidate text for the decoder to loop or hallucinate upon.
   - Preserve `temperature: 0` (greedy argmax decoding) to maximize phonetic discrimination between phonetically close words (e.g., *"dar"* vs *"dá"*, *"glória"* vs *"graça"*).
   - Preserve strict, mathematical word-by-word evaluation inside the deterministic `RecitationEvaluator` pipeline against stored canonical verse text.

---

## User Stories

### Instant Audio Capture & Warm Standby
1. As a scripture learner, I want voice recording to begin instantly the moment I press the microphone button, so that I never have to wait or pause before speaking.
2. As a scripture learner reciting immediately after tapping the button, I want my opening words to be captured fully, so that my first syllables are never clipped or lost.
3. As a learner entering the review screen, I want the audio hardware to prepare in the background without freezing the UI, so that the screen opens smoothly and remains responsive.
4. As a learner tapping the microphone button, I want subtle haptic feedback at the instant of touch, so that I have physical confirmation that the device is listening.
5. As an acoustic engine, I want the audio driver to pre-configure audio mode permissions and native recording objects upon component mount, so that button presses execute in under 15 milliseconds.
6. As a developer writing tests for recitation flows, I want the `warmUp()` method to be optional and safely no-op in simulated adapters, so that unit tests remain fast and in-memory.
7. As an application running on the web, I want `WebAudioDriver` to pre-request or warm up media streams smoothly, so that web browser recitation experiences minimal initialization delay.

### Acoustic Prompting & Model Fidelity
8. As a scripture learner reciting in Portuguese, I want speech recognition to recognize my actual spoken words without hallucinating phantom abbreviations like `"O Sra. O Sra."`, so that my recitation diff accurately reflects what I spoke.
9. As a learner testing my scripture memory, I want the speech model not to know the expected verse text in advance, so that if I make a mistake or use a wrong word, the model does not "auto-correct" me to the canonical passage.
10. As a learner reciting an archaic Bible translation (like Almeida Revista e Corrigida), I want the speech model to know which translation is being recited, so that it accurately transcribes formal biblical vocabulary without replacing it with colloquial slang.
11. As a learner reciting similar-sounding words, I want transcription to run with deterministic greedy decoding (temperature 0), so that the model accurately distinguishes between *"dar"* and *"dá"*, or *"glória"* and *"graça"*.
12. As an automated evaluation pipeline, I want verification scoring to remain completely independent of the transcription prompt, so that accuracy grading is always computed mathematically against the stored translation text.
13. As an English learner reciting King James or World English Bible, I want the acoustic metadata prompt to reflect the English biblical edition without verse text, so that English recitations enjoy the same hallucination-free experience.

### Session Lifecycle & Resilience
14. As a learner practicing multiple times in a row, I want the audio driver to automatically re-warm after completing or canceling a recitation, so that subsequent recitation attempts remain instantaneous.
15. As a learner leaving the review screen without reciting, I want unrecorded warm-standby audio resources to dispose cleanly, so that microphone hardware is released and battery is preserved.
16. As a learner whose microphone permission is not yet granted, I want pre-warming to handle permission denial gracefully without throwing unhandled exceptions, so that the user can grant permission via standard flows.

---

## Implementation Decisions

### Decision 1: Warm Standby Audio Driver Interface
- The `AudioDriver` interface is deepened with an optional `warmUp(options?: AudioRecordingOptions): Promise<void>` method.
- `NativeAudioDriver` implements `warmUp`:
  - Asynchronously configures `AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })`.
  - Instantiates the platform audio recorder and calls `prepareToRecordAsync()` in advance, setting an internal `isPrepared` flag.
- When `startRecording()` is invoked:
  - If `isPrepared` is true, it synchronously or immediately calls `this.recording.record()`, initiating audio capture in <15ms.
  - If `isPrepared` is false (fallback for cold starts or edge cases), it awaits `warmUp()` before calling `record()`.
- After `stopRecording()` or `deleteAudioFile()`, the driver resets `isPrepared = false`.

### Decision 2: Unified VoiceInput Seam Delegation
- The `VoiceInput` interface is extended with an optional `warmUp(): Promise<void>` lifecycle method.
- `CloudAudioVoiceAdapter` delegates `warmUp()` directly to `this.driver.warmUp?.()`.
- `NativeStreamVoiceAdapter` pre-checks native permissions and warms up on-device speech recognizer instances.
- `SimulatedVoiceAdapter` provides an empty asynchronous no-op for hermetic testing.

### Decision 3: RecitationSession Prompt Formatting
- In `RecitationSession`, prompt construction inside `startReciting()` is updated:
  - The verbatim verse text (`${this.verse.text}`) is strictly removed.
  - The prompt is formatted as pure canonical metadata:
    - Portuguese: `Bíblia Sagrada. Tradução: ${translation}. Referência: ${reference}.`
    - English: `Holy Bible. Translation: ${translation}. Reference: ${reference}.`
  - Where `${translation}` defaults to the verse's explicit translation code (e.g. `ALMEIDA`, `WEB`, `KJV`) or the inferred canonical default.
- The decoding parameter `temperature: '0'` is maintained across all Whisper API requests to ensure deterministic acoustic argmax decoding.

### Decision 4: Lifecycle Pre-Warming in Presentation Surface
- `useRecitationSession` exposes a `warmUp()` callback and invokes `session.warmUp().catch(() => {})` inside an initial mount effect.
- `ReviewScreen` triggers `warmUp()` when mounting the active verse card.
- `FloatingMicButton` or `ReviewScreen` triggers light haptic feedback upon touch down, providing immediate physical confirmation to the learner.

---

## Testing Decisions

### Seam Testing Strategy
- Tests must verify external behavior through public module interfaces, avoiding assertions on private variables or internal timer loops.
- **Seam 1: `AudioDriver`**:
  - Test that `NativeAudioDriver.warmUp()` pre-configures audio mode and prepares the native recorder.
  - Test that calling `startRecording()` when already warmed executes `record()` without calling `setAudioModeAsync` again.
  - Test that calling `startRecording()` without `warmUp()` gracefully prepares and starts recording (defensive backward compatibility).
- **Seam 2: `VoiceInput` & `RecitationSession`**:
  - Test that `RecitationSession.warmUp()` delegates to `voiceInput.warmUp()`.
  - Test that `startReciting()` generates the metadata prompt without verse text, including translation and reference.
  - Test that evaluation accuracy continues to match verbatim canonical text independently of prompt content.

### Prior Art
- `src/services/VoiceInput.test.ts`: Unified VoiceInput seam testing verifying adapter mechanics and prompt passing.
- `src/services/RecitationSession.test.ts`: Session lifecycle tests covering level transitions, VAD triggers, and diff evaluations.

---

## Out of Scope

- Modifying the Myers Sequence Alignment algorithm or F1 scoring formulas in `RecitationEvaluator`.
- Continuous background audio streaming over WebSockets.
- Changing the Spaced Repetition SuperMemo-2 scheduling calculation.
- Third-party speech transcription providers beyond OpenAI Whisper and Groq Whisper.

---

## Further Notes

- By eliminating cold-start latency, the application achieves feature parity with top-tier commercial language and voice learning apps (Duolingo).
- Removing the verse text from the prompt permanently prevents Whisper from masking human memory errors or entering repetitive honorific hallucination loops.
