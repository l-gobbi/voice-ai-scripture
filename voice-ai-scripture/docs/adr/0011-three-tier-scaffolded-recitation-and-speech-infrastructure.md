# 0011: Three-Tier Scaffolded Recitation and Dual-Tier Speech Infrastructure

We decided to introduce a three-tier scaffolded learning progression (Echo Mode, Cloze Practice, Blind Recitation) and establish an on-device Speech Synthesis and Native Speech Recognition foundation with dual-tier monetization.

Previously, the application only offered a single binary interaction model: a learner either performed an unassisted blind voice recitation or flipped a manual self-review card. When encountering an unfamiliar or lengthy verse, this created an intimidating barrier to entry ("blank-slate paralysis") that forced users into manual typing or abandoning voice recall. Furthermore, cloud speech recognition incurred external latency and operational cost even for basic practice.

Under this architecture:
1. **Three-Tier Scaffolded Learning**:
   - **Echo Mode (Level 1)**: Auditory-first familiarity. The verse is vocalized via Speech Synthesis (`expo-speech`) while text is concealed by default (with an optional "Reveal Text" button), training the ear and auditory memory before visual scanning.
   - **Cloze Practice (Level 2)**: Visual retrieval scaffolding. Every word is presented as a first-letter anchor with blanks (`F___ G__ s_ l____`). Tapping any blanked word reveals it inline permanently for the attempt. Features an on-demand recitation playback button.
   - **Blind Recitation (Level 3)**: Official unassisted recall from memory with text blanked. Includes an interactive **Word Peek Lifeline** allowing users to temporarily reveal any chosen word for 3 seconds; utilizing this lifeline caps the session's SRS review score at 75% to ensure reinforcement without a punitive streak reset.
2. **Pedagogical and SRS Separation**:
   - Levels 1 and 2 operate as an unpenalized **Practice Mode** with unlimited access, preserving Spaced Repetition (SRS) data integrity.
   - Only Level 3 (Blind Recitation) advances Spaced Repetition streaks and calculates future review dates via `srsEngine`.
3. **Dual-Tier Voice Infrastructure & Monetization**:
   - **Free Tier (Native On-Device Speech & Synthesis)**: Utilizes native OS dictation (Apple Speech / Google SpeechRecognizer) and native OS TTS (`expo-speech`). Runs 100% offline at zero latency with zero server cost, providing free and unlimited voice practice.
   - **Premium Tier (Cloud Neural AI)**: Reserves high-fidelity cloud Whisper AI transcription and neural voices for paying subscribers within `SubscriptionManager`.
