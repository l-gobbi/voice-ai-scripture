# 0015. Floating Microphone Button, VAD Silence Auto-Completion, and Hybrid Abuse-Prevention Rate Limiting

## Context and Problem Statement

The recitation experience in `ReviewScreen` previously presented three notable UX frictions:
1. **Button Modality**: A full-width rectangular banner (`[ 🎤 Start Reciting ]` / `[ ⏹ Stop & Verify ]`) dominated the bottom docked bar, demanding manual physical button presses to start and stop recitation.
2. **Manual Stop Requirement**: Users had to manually tap "Stop Reciting" after vocalizing scripture from memory. This interrupted the sacred, contemplative immersion of active recall and forced the user to shift visual focus to a button press immediately after speaking.
3. **Premature Quota Anxiety**: The previous monetization model enforced a strict 3-recitation trial quota with an intrusive paywall modal (`PaywallModal`). In a scripture memorization app, this created acute friction before prayerful habits could form, despite Groq Whisper cloud transcription costing less than $0.0007 per recitation.

Furthermore, automatic silence detection in scripture memorization presents a unique domain challenge: unlike language-learning apps where learners read visible prompts with negligible pause, scripture learners perform active memory retrieval, frequently pausing 2–3 seconds to recall the next clause. A naive silence cutoff cuts learners off mid-verse, while a visible ticking countdown induces stress.

## Decision

We decided to implement the following architectural and UX specifications:

1. **Floating Microphone Button (76dp Circular Target)**:
   - Replace the full-width rectangular hero button with a 76dp circular floating button centered at the bottom of the recitation screen.
   - **Idle State**: `accentSacred` gold background with a crisp microphone icon (`🎙️`).
   - **Active Reciting State**: Circular button retains accent styling with a breathing radial aura that pulses to live audio volume. The center icon transforms into a stop glyph (`⏹`), providing an instant manual finish fallback for users who do not want to wait for auto-completion.
   - **Cancel Action**: A subtle, low-contrast text link (`Cancel`) rendered beneath the circular button during active recitation, discarding the attempt without evaluation or scoring.
   - **Post-Verification**: Once accuracy results and diff tokens are displayed, the bottom bar transitions back to the review controls (`Practice Again` and `Next: Level X / Done`).

2. **Decoupled Voice Activity Detector (`VoiceActivityDetector`)**:
   - Encapsulate silence detection, audio energy monitoring, and state transitions into a pure, testable `VoiceActivityDetector` engine:
     - **Dynamic Noise Floor**: Samples background room noise in the initial 300ms to establish an adaptive silence floor.
     - **Initial Silence Grace Period**: A generous 10-second window before auto-reset if no speech is detected.
     - **Speech Requirement**: Requires at least 1.0s of cumulative audible speech before silence auto-completion arms.
     - **Thinking Grace Period**: 3.5 seconds of sustained silence triggers automatic transition to verification (`stopAndVerify()`).
     - **Anxiety-Free Delayed Progress Arc**: The visual silence timer ring around the microphone remains completely invisible for the first 1.5 seconds of silence (allowing natural contemplative pauses without alarming the user). It softly fills only during the final 2.0 seconds (1.5s → 3.5s) and immediately vanishes if the user speaks again.

3. **Hybrid Abuse-Prevention Rate Limiting**:
   - Remove the 3-recitation trial paywall modal from the recitation user flow. Normal learners never encounter payment prompts during recitation practice.
   - **Burst Limit (10 recitations / rolling minute)**: Catches automated loops or accidental rapid-tap jitter. If exceeded, displays a gentle devotional cooldown: *"Taking a quick breath... Please wait a few seconds before your next recitation."*
   - **Daily Ceiling (500 recitations / calendar day)**: Bounds total daily cloud API exposure. If a learner reaches 500 recitations in a single day, the application seamlessly falls back to zero-cost on-device native speech recognition (`NativeStreamVoiceAdapter`), ensuring the user's practice continues uninterrupted without incurring cloud transcription costs.
