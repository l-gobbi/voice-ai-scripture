# Specification: Sacred Intent Turn-Taking, Physical Decibel Normalization & Dynamic Utterance Ceiling

**Status:** ready-for-agent  
**Domain:** Voice AI Recitation Lifecycle / Acoustic Metering / Turn-Taking Architecture  
**Governing Documents:** `CONTEXT.md`, `docs/adr/0015-floating-microphone-button-and-vad-silence-autocompletion.md`, `docs/adr/0016-hybrid-sacred-intent-voice-architecture.md`, `docs/research/voice-activity-detection-and-silence-detection.md`, `docs/research/ideal-voice-architecture-for-scripture-memorization.md`

---

## Problem Statement

When memorizing scripture using voice recitation on mobile devices (particularly Android), users face three critical acoustic and psychological frictions:

1. **Hardware AGC Pumping and Silence Failure**:
   Mobile hardware employs aggressive hardware Automatic Gain Control (AGC). When a user pauses or stops speaking, the microphone pre-amp automatically increases gain by $+40\text{ dB}$ to $+50\text{ dB}$, amplifying room hiss, fan hum, or handling rustle up to $-25\text{ dBFS}$ to $-12\text{ dBFS}$. Under standard linear $[ -60, 0 ]\text{ dBFS}$ volume normalization, this noise floor registers as $80\%\text{--}90\%$ audio volume. Consequently, silence auto-completion never triggers, leaving the user stuck waiting in front of an unresponsive screen.

2. **Whisper Hallucinations on Runaway Recordings**:
   Because silence detection fails to auto-complete, audio recordings can run indefinitely. When lengthy silent audio is passed to cloud Whisper speech models, the neural decoder hallucinates repetitive nonsense (such as endless loops of theological titles or city names) instead of transcribing the verse accurately. Furthermore, runaway recordings exhaust recitation quotas and battery.

3. **Psychological Tension Between Contemplative Pauses and Auto-Cutoffs**:
   Scripture memorization is inherently meditative. Users often take 2-to-3 second contemplative pauses to recall the next phrase. Aggressive conversational voice activity detection (common in callbots with 700ms thresholds) cuts the user off mid-verse. Conversely, relying purely on hands-free silence creates ambiguity over when evaluation will happen. Users need clear intentional control to verify immediately without latency, backed by a safety backstop that takes over when hands are busy.

---

## Solution

Adopt the **"Sacred Intent" Hybrid Architecture** across the recitation lifecycle:

1. **Sacred Intent Turn-Taking**:
   - **Primary Action (Tap-to-Verify)**: The floating microphone button acts as a clear, intentional toggle. Tapping immediately halts recording and initiates verification with zero latency.
   - **Hands-Free Backstop (3.5s Contemplative Silence)**: If the user stops reciting and does not tap, a 3.5-second silence countdown automatically finalizes and verifies the attempt. A delayed progress ring (first appearing after 1.5s of silence) informs the user of pending completion without causing visual anxiety during brief memory pauses.

2. **Expanded Physical Decibel Normalization**:
   - Expand the dynamic decibel metering range from $[-60, 0]\text{ dBFS}$ to $[-80, 0]\text{ dBFS}$ and apply an quadratic response curve.
   - Compress ambient room hiss and AGC-boosted silence ($-25\text{ dBFS}$ to $-20\text{ dBFS}$) down to $\approx 47\%\text{--}56\%$, cleanly below the speech detection threshold.
   - Amplify audible recitation speech ($-10\text{ dBFS}$ to $-4\text{ dBFS}$) into a solid $77\%\text{--}90\%$ range.
   - Apply symmetric Exponential Moving Average (EMA) smoothing ($\alpha = 0.35$) to eliminate transient phone handling clicks and plosive drops.

3. **Dynamic Utterance Ceiling**:
   - Establish an automatic maximum duration ceiling scaled to passage length: a floor of 30 seconds for single short verses, scaling by $\approx 1.5\text{ s}$ per word, capped at a maximum of 300 seconds (5 minutes) for whole chapters.
   - Automatically halt recording and trigger verification when the ceiling is reached, preventing runaway recordings, quota depletion, and Whisper hallucination loops.

4. **Transparent Turn-Taking Guidance**:
   - Display explicit bilingual guidance on screen during recitation: informing the user that tapping the button verifies instantly, while pausing for 3.5s provides hands-free verification.

---

## User Stories

### Turn-Taking & Recitation Flow
1. As a scripture memorizer, I want to tap the microphone button when I finish reciting, so that verification begins instantly without having to wait in silence.
2. As a scripture memorizer driving or holding a Bible with both hands, I want the app to automatically detect when I have finished speaking and submit my recitation after a 3.5s pause, so that I can practice completely hands-free.
3. As a learner reciting a difficult passage, I want to be able to pause for 1 to 2 seconds to recall the next phrase, so that the app does not prematurely cut me off while I am thinking.
4. As a learner looking at the screen during recitation, I want to see clear instructions explaining that I can either tap to verify immediately or pause for 3.5 seconds, so that I never wonder what the app is waiting for.
5. As a Portuguese-speaking user, I want the recitation prompt to display in Portuguese ("Ouvindo... Toque no botão para verificar (ou pause 3.5s)"), so that the guidance feels native and welcoming.
6. As an English-speaking user, I want the recitation prompt to display in English ("Listening... Tap button to verify (or pause 3.5s)"), so that the guidance is clear and accessible.
7. As a learner whose recitation is interrupted, I want to tap Cancel at any moment, so that the attempt is discarded immediately without consuming quota or penalizing my streak.

### Acoustic Normalization & Silence Detection
8. As a mobile user practicing in an ordinary room with background noise (air conditioning, computer fans), I want quiet room noise not to register as speech, so that the app correctly senses when I stop talking.
9. As an Android user whose phone hardware boosts mic gain during quiet pauses (AGC), I want the audio metering to compress that boosted hiss below speech levels, so that the silence timer reliably triggers after recitation.
10. As a learner speaking quietly or firmly, I want speech volumes between $-10\text{ dBFS}$ and $-4\text{ dBFS}$ to clearly register as active voice, so that the visual breathing aura and audio indicator pulse noticeably.
11. As a user handling or adjusting my phone while reciting, I want momentary handling clicks or finger movements not to reset the silence timer, so that small physical adjustments don't delay verification.
12. As a user tapping the microphone without speaking, I want the session to timeout after 10 seconds with a helpful prompt ("No speech detected. Tap the mic to try again"), so that the app doesn't stay open indefinitely.

### Utterance Ceiling & Runaway Prevention
13. As a learner reciting a single short verse (e.g. John 11:35), I want a safety recording ceiling of 30 seconds, so that if I forget to stop the recording, it never runs indefinitely.
14. As a user memorizing an entire chapter (e.g. Psalm 23 or 1 Corinthians 13), I want the recording ceiling to scale up to 5 minutes (300 seconds), so that I have plenty of time to recite the full passage without being cut off.
15. As a user whose recording reaches the duration ceiling, I want the app to automatically stop and verify what I have recited so far, so that my voice input is not lost.
16. As a user practicing via cloud Whisper, I want runaway recordings to be prevented, so that Whisper never enters repetitive hallucination loops.
17. As a subscriber with daily recitation allowances, I want runaway recordings prevented, so that unexpected audio duration does not exhaust API limits or consume unnecessary device bandwidth.

### Visual Feedback & Diagnostics
18. As a developer debugging audio performance on real devices, I want an in-app diagnostic tray showing real-time Mic Level percentage and Silence Timer progress, so that acoustic calibration can be validated in real room environments.
19. As a learner in silence during the 3.5s backstop, I want the progress ring around the microphone to begin filling only after 1.5s of silence, so that brief natural pauses don't show distracting animations.
20. As a learner who resumes speaking while the progress ring is filling, I want the progress ring to instantly reset to zero, so that the app indicates it is back to listening without penalizing my hesitation.

---

## Implementation Decisions

### 1. Quadratic Decibel Normalization
- **Dynamic Decibel Range**: Metering decibels are normalized across $[-80\text{ dBFS}, 0\text{ dBFS}]$ rather than $[-60, 0]\text{ dBFS}$.
- **Quadratic Response Function**:
  Linear scaling: $\text{linear} = \max\left(0, \min\left(1, \frac{\text{dB} + 80}{80}\right)\right)$  
  Normalized power: $\text{rawNormalized} = \text{linear}^2$
- **Acoustic Separation**:
  - Background hiss and AGC-boosted quiet ($-25\text{ dBFS}$ to $-20\text{ dBFS}$) map to $0.47\text{--}0.56$.
  - Recitation speech ($-10\text{ dBFS}$ to $-4\text{ dBFS}$) maps to $0.77\text{--}0.90$.
- **Symmetric Exponential Moving Average (EMA)**:
  - $\alpha = 0.35$ smoothing factor: $\text{smoothed} = \text{smoothed} \times 0.65 + \text{rawNormalized} \times 0.35$.
  - First sample initializes immediately to avoid onset delay.
  - Dampens transient noise spikes (clicks, taps) and prevents plosive dropouts.

### 2. Turn-Taking State Machine & Silence Backstop
- **Primary Action (Tap-to-Verify)**: Tapping the circular floating microphone button while in `reciting` state immediately transitions to `verifying`, cancelling all background VAD intervals and finalizing speech capture.
- **VAD State Cycle**:
  - `calibrating` (300ms baseline sampling; loud speech $\ge 75\%$ triggers immediate transition to `speaking`).
  - `listening_initial` (waiting for speech onset; 10s timeout triggers idle return with user prompt).
  - `speaking` (accumulates cumulative speech duration).
  - `thinking_grace` (arms after $\ge 1.0\text{ s}$ of cumulative speech when volume drops below adaptive threshold).
  - `auto_completed` (triggers verification callback after 3.5s elapsed in `thinking_grace`).
- **Delayed Visual Progress**:
  - Silence progress remains $0\%$ during the initial 1.5s contemplative window.
  - Linearly fills from $0\%$ to $100\%$ across the remaining 2.0s of the 3.5s grace period.
  - Resets immediately to $0\%$ if strong speech resumes.

### 3. Dynamic Utterance Ceiling
- **Scaling Formula**:
  $$\text{durationSeconds} = \min\left(300, \max\left(30, \text{round}(\text{wordCount} \times 1.5) + 15\right)\right)$$
- **Boundary Clamping**:
  - Minimum floor: 30 seconds for short verses (ensuring ample time for slow recitation).
  - Maximum ceiling: 300 seconds (5 minutes) for long passages or full chapters.
- **Timer Lifecycle**:
  - Armed when audio recording starts.
  - Automatically invokes verification if still in `reciting` state when expired.
  - Guaranteed cleanup upon manual stop, cancellation, session reset, and session disposal.

### 4. Bilingual Editorial Copy
- **Active Recitation Hint**:
  - Portuguese: `"Ouvindo... Toque no botão para verificar (ou pause 3.5s)"`
  - English: `"Listening... Tap button to verify (or pause 3.5s)"`
- **Initial Silence Timeout Prompt**:
  - Portuguese: `"Nenhuma fala detectada. Toque no microfone para tentar novamente."`
  - English: `"No speech detected. Tap the mic to try again."`

---

## Testing Decisions

### What Makes a Good Test
- **Behavioral Assertions**: Tests assert on state transitions (`reciting` $\to$ `verifying` $\to$ `verified`), emitted volume ratios, and triggered callbacks, never internal timer handle pointers.
- **Acoustic Mathematics Verification**: Pure functions for decibel normalization and duration calculation are tested against exact mathematical boundary values and physical audio levels.
- **Timer Determinism**: Time-dependent behavior (300ms calibration, 10s initial silence, 3.5s thinking grace, and utterance ceiling) is verified using deterministic simulated clocks, validating both natural progression and early manual interruption.

### Modules Tested
1. **Audio Metering Normalization**:
   - Boundary tests for $<-80\text{ dBFS}$ (clamps to 0) and $>0\text{ dBFS}$ (clamps to 1).
   - AGC hiss levels ($-25\text{ dBFS}$ and $-20\text{ dBFS}$) confirm values below speech threshold.
   - Speech levels ($-10\text{ dBFS}$ and $-4\text{ dBFS}$) confirm values in high speech range.
2. **Voice Activity Detector Engine**:
   - Initial calibration and noise floor adaptation.
   - Hysteresis thresholds under varying noise floors.
   - Speech onset, cumulative speech minimum (1.0s), and 3.5s auto-completion.
   - Speech interruption resetting progress during the thinking grace period.
3. **Recitation Session Controller**:
   - Dynamic utterance ceiling calculation across short verses, medium verses, and chapters.
   - Automatic stop and verify when utterance ceiling is reached.
   - Timer cancellation when user manually taps stop or cancel before ceiling.
4. **Review Screen Component**:
   - Rendering of localized turn-taking hints in Portuguese and English.
   - Interaction with floating mic button and cancellation links.

### Prior Art
- `src/services/AudioRecorderService.test.ts`: Quadratic dBFS mapping tests.
- `src/engines/VoiceActivityDetector.test.ts`: Real-room acoustic noise repro tests.
- `src/services/RecitationSession.test.ts`: Utterance ceiling lifecycle tests.
- `src/screens/ReviewScreen.test.tsx`: Bilingual UI turn-taking hint assertions.

---

## Out of Scope
- Native C++ or ONNX neural VAD modules (e.g. Silero VAD) requiring custom native Expo prebuild dev clients.
- Modifying the Myers diff evaluation engine or SRS scheduling algorithms.
- Changing paywall or subscription entitlement policies.
- Altering the Cloze practice or Echo Mode recitation mechanics.

---

## Further Notes
- This specification formalizes the architectural decisions captured in `docs/adr/0016-hybrid-sacred-intent-voice-architecture.md` and supersedes the pure silence-only assumptions in earlier VAD tickets.
- Phase 1 implementation is verified with all unit tests passing and TypeScript strict type-checking green.
