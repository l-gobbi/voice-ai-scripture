# Voice Activity Detection (VAD), AGC Pumping, and Silence Detection in Mobile Production Apps

**Author**: Voice AI Engineering Research  
**Date**: October 2026  
**Status**: Completed  
**Context**: Investigating why silence levels reached >80% on Android physical hardware during hands-free scripture recitation, and surveying how commercial mobile apps (Duolingo, WhatsApp, ChatGPT Voice, Speech Recognition engines) solve hands-free turn-taking and silence detection.

---

## 1. Executive Summary

When attempting hands-free recitation with `expo-audio` on physical Android devices, the volume meter unexpectedly climbed above **80%** even when the room was completely silent. This prevented the silence timer from activating, kept recording indefinitely, and caused Groq Whisper's autoregressive decoder to hallucinate repetitive phrases on long audio files.

Our investigation traced this issue down to three combined factors:
1. **Android Hardware Automatic Gain Control (AGC) Pumping**: In quiet rooms, Android's telephony audio HAL continuously ramps analog/digital pre-amp gain by up to +40 dB to +50 dB to "find" a signal, elevating ambient noise and thermal hiss into the -15 dBFS to -10 dBFS range.
2. **Peak Amplitude vs. RMS in `MediaRecorder.getMaxAmplitude()`**: `expo-audio` relies on Android `MediaRecorder.getMaxAmplitude()`, which returns the single highest absolute sample in the interval (not RMS power). Handling vibrations, thumb friction, or faint room clicks produce peak spikes of 8,000–12,000 on a 16-bit integer scale (25%–35% of full scale), translating to -12 dBFS to -8 dBFS.
3. **Linear `(dB + 60) / 60` Mapping with Instantaneous Attack**: Mapping -12 dBFS via `(db + 60) / 60` yields 0.80 (80%). With instant attack smoothing, a single transient sample latches the meter to >= 80%, making silence indistinguishable from speech.

In production apps across the industry:
- **Duolingo** does not use raw decibel meters to detect end-of-speech. It uses **streaming token alignment** (finishing immediately when all target words are uttered) and measures elapsed time **since the last recognized word token**, backed by an explicit button.
- **Voice AI Apps (ChatGPT Voice)** run on-device **Neural VAD** (e.g. Silero VAD) on raw PCM buffers, classifying harmonic vocal cord formants (300–3400 Hz) where AGC noise registers 0.0 probability.
- **Messaging Apps (WhatsApp, Telegram)** completely avoid automatic silence termination, using **Push-to-Talk** or explicit tap-to-send because acoustic volume gates are notoriously unreliable in real-world ambient acoustics.

---

## 2. Root Cause: Why Android Microphone Metering Reached >80% in Silence

### 2.1 The Native `expo-audio` Android Implementation
Inspecting the primary source code in `node_modules/expo-audio/android/src/main/java/expo/modules/audio/AudioRecorder.kt`:
- `recorder.maxAmplitude` calls Android's native `android.media.MediaRecorder.getMaxAmplitude()`.
- This measures the single largest sample peak across thousands of audio frames, rather than the Root Mean Square (average energy) of the window.
- Decibel calculation: `dBFS = 20 * log10(amplitude / 32767.0)`.

### 2.2 The AGC Pumping Phenomenon
In Android telephony and standard audio capture (`AudioSource.MIC` or `AudioSource.DEFAULT`), the hardware/kernel Audio HAL enables Automatic Gain Control (AGC):
- When someone speaks loudly, AGC attenuates the pre-amp to prevent clipping distortion.
- When the speaker stops and the room is quiet, the AGC control loop interprets the silence as a weak signal and progressively boosts gain by +30 dB to +50 dB.
- This phenomenon—known in audio engineering as "AGC Pumping" or "breathing"—drastically elevates the device's self-noise, fan hum, AC airflow, and room reverberation into active speech energy levels.

### 2.3 The Mathematical Normalization Formula
The application converted the reported `db` value to a normalized [0, 1] range via `(db + 60) / 60`.
Evaluating this for common values:
- Digital Mute: 0 amplitude -> -160 dBFS -> 0%
- Quiet Room (without AGC): ~100 amplitude -> -50 dBFS -> 16%
- Quiet Room (with AGC pumped): ~3,000 amplitude -> -20 dBFS -> 66%
- Phone Handling / Hand Rustle: ~8,500 amplitude -> -11.7 dBFS -> 80.5%
- Normal Speech: ~16,000 amplitude -> -6.2 dBFS -> 90%
- Loud Speech: 32,767 amplitude -> 0.0 dBFS -> 100%

Because smoothing used instant attack (`if (raw >= smoothed) smoothed = raw`), a single 100ms sample with handling noise or pumped AGC instantly pinned the meter to 80%–85%. Since the VAD considered anything above the calibrated baseline as speech, the silence timer never counted up.

---

## 3. Recommended Architectural Patterns for Scripture Memorization

1. **User-Initiated Primary Control ("Tap to Recite, Tap to Finish")**:
   - The user taps the sacred Floating Mic Button to start.
   - When finished, tapping the button submits for immediate verification with zero delay.
   - This eliminates all anxiety of false cutoffs during prayerful contemplation.

2. **Incremental Speech Token Alignment ("Duolingo for Scripture")**:
   - As the user recites, spoken tokens are matched against the canonical verse in real time.
   - When the user speaks the final words of the verse, verification triggers immediately with zero silence delay.
   - Silence timeout is measured by time elapsed since the last recognized word token (immune to AGC pumping).

3. **Maximum Utterance Safety Guardrail**:
   - Audio recording is capped at 20-30 seconds to prevent endless dead air recordings and Groq Whisper hallucinations.
