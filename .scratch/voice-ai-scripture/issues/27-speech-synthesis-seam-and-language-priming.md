# 27: Speech Synthesis Seam and Language Priming

**What to build:** Implement a platform-agnostic `SpeechSynthesizer` seam that vocalizes verse text using on-device Text-to-Speech (TTS), automatically configured with the appropriate language code (`en-US` or `pt-BR`) derived from the verse translation. Provide a production adapter delegating to `expo-speech` and a hermetic `MockSpeechSynthesizer` for automated testing.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Create `src/services/SpeechSynthesizer.ts` defining the `SpeechSynthesizer` interface with `speak(text: string, options?: SpeechOptions): Promise<void>`, `stop(): Promise<void>`, and `isSpeaking(): Promise<boolean>`.
- [x] Implement `ExpoSpeechSynthesizer` delegating to `expo-speech` with language routing (`en-US` for English translations, `pt-BR` for Portuguese translations).
- [x] Implement `MockSpeechSynthesizer` capturing spoken utterances, options, and completion callbacks for fast in-memory testing.
- [x] Write unit tests in `src/services/SpeechSynthesizer.test.ts` verifying language routing, stop/cancel behavior, and error handling.
- [x] Ensure all existing test suites and TypeScript typechecking remain 100% green.

