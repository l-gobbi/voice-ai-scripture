# Text-to-Speech (TTS) APIs for Scripture Verse Recitation

**Author**: Voice AI Engineering Research  
**Date**: October 2026  
**Status**: Completed  
**Context**: Voice AI Scripture currently uses Groq Whisper Large V3 Turbo for Speech-to-Text (STT) during recitation evaluation (~300ms latency). We are evaluating Text-to-Speech (TTS) APIs for the reciprocal auditory experience: reciting biblical verses aloud to the user (e.g. Echo Mode / Level 1 Auditory Scaffolding, verse practice, and read-aloud features).

---

## 1. Executive Summary & Recommended Strategy

Scripture recitation presents unique acoustic and domain requirements that differ sharply from customer service chatbots or sales agents:
1. **Sacred, Reverent Tone & Paced Cadence**: Fast, conversational, or hyped podcast-style voices ruin the contemplative experience. The voice must sound calm, warm, authoritative, and deliberate.
2. **Bilingual Requirement (English & Brazilian Portuguese)**: The app supports English translations (KJV, WEB, ASV) and Portuguese translations (Almeida Revista e Corrigida, Almeida Século 21). Both languages must sound native, particularly with biblical proper nouns (*Nebuchadnezzar*, *Melchizedek*, *Nabucodonosor*, *Getsêmani*).
3. **The Static Verse Arbitrage (Caching)**: Biblical verses are immutable canonical text. Synthesizing the audio dynamically on every single recitation session is an anti-pattern. Audio should be synthesized once and cached permanently on device (`expo-file-system`) or served via CDN (Cloudflare R2 / AWS S3).
4. **Latency vs. Quality Trade-off**: For real-time conversational agents, sub-100ms TTFB is essential. For verse recitation in Echo Mode, a 200–500ms streaming startup or pre-cached instant playback with high emotional warmth is far superior to ultra-fast robotic speech.

### The Recommendation Matrix

| Provider & Engine | Price / 1M Chars | Latency (TTFB) | EN Quality | PT-BR Quality | SSML / Pacing Control | Verdict for Voice AI Scripture |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ElevenLabs (Flash v2.5)** | **$50.00** ($0.05/1k) | ~75ms | ⭐⭐⭐⭐⭐ (Sacred, Warm) | ⭐⭐⭐⭐⭐ (Natural) | Punctuation / Prompting only | **Top Pick for Sacred Timbre** |
| **Azure AI Speech (Neural)** | **$16.00** | ~150–250ms | ⭐⭐⭐⭐ (Clean) | ⭐⭐⭐⭐⭐ (Native BR) | Full SSML + `<mstts:express-as>` | **Top Pick for Prosody & SSML Control** |
| **OpenAI Audio (`tts-1`)** | **$15.00** | ~200–350ms | ⭐⭐⭐⭐ (Natural) | ⭐⭐⭐⭐ (Very good) | Punctuation only | **Best Simple REST / Budget Cloud Pick** |
| **Amazon Polly (Generative)** | **$30.00** | ~250–400ms | ⭐⭐⭐⭐ (Warm) | Region-dependent | Full SSML + Phonemes | **Solid Alternative for AWS ecosystems** |
| **Cartesia (Sonic)** | **~$37.40** (Scale plan) | **~90ms** | ⭐⭐⭐⭐ (Conversational) | ⭐⭐⭐⭐ (Fast) | Emotion / Speed sliders | Built for real-time WebSocket agents; overkill for static verses |
| **Google Cloud (Chirp HD)** | **$30.00** | ~300ms | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Full SSML | Reliable corporate cloud |
| **Groq (`orpheus-v1`)** | Pay-as-you-go | ~100ms | ⭐⭐⭐⭐ | ❌ **No PT-BR** (EN + Arabic only) | OpenAI-compatible endpoint | **Eliminated** (no Portuguese) |
| **Deepgram (Aura-2)** | $15.00 | ~150ms | ⭐⭐⭐⭐ | ❌ **No PT-BR** (EN, ES, FR, DE, IT, JA, NL) | Limited | **Eliminated** (no Portuguese) |
| **Expo Speech (`expo-speech`)** | **$0.00** (Free) | **0ms** (Offline) | ⭐⭐ (Mechanical) | ⭐⭐ (Mechanical) | Rate / Pitch only | **Kept as Offline Fallback Baseline** |

---

## 2. Detailed Primary-Source Provider Breakdown

### 2.1 ElevenLabs (Flash v2.5 & Multilingual v2)

- **Primary Sources**: [ElevenLabs Pricing](https://elevenlabs.io/pricing), [ElevenLabs Models Documentation](https://elevenlabs.io/docs/models).
- **Pricing**:
  - **Flash v2.5**: ~$0.05 per 1,000 characters ($50 per 1M characters).
  - **Multilingual v2**: ~$0.10 per 1,000 characters ($100 per 1M characters).
  - Free tier offers 10,000 characters/month (good for development).
- **Latency**: Flash v2.5 achieves ~75ms model inference latency. HTTP chunked transfer and WebSocket streaming available.
- **Voice Timbre & Emotion**:
  - The gold standard in synthetic audiobooks and narration.
  - Voices like *George* (warm British narrator), *Daniel* (deep, authoritative), or *Liam* produce an immediate, reverence-inspiring scripture reading.
  - Brazilian Portuguese voices sound indistinguishable from human voice actors.
- **Cadence & Prosody Control**:
  - Does **not** support standard W3C SSML tags.
  - Pacing is guided using punctuation (dashes, ellipses `...`, commas for breath pauses) and model prompt hints.
  - Offers granular sliders: `stability` (higher = more consistent cadence, ideal for scripture), `similarity_boost`, and `style`.
- **Caching & Terms of Service**:
  - Output audio files belong to the user. Client-side caching and persistent CDN hosting are explicitly permitted.
- **Expo / React Native Integration**:
  - Standard REST POST request to `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream`.
  - Returns `audio/mpeg` stream or binary buffer that can be directly played via `expo-audio` or saved to file via `expo-file-system`.

---

### 2.2 OpenAI Audio (`tts-1` & `tts-1-hd`)

- **Primary Sources**: [OpenAI Audio API Reference](https://platform.openai.com/docs/api-reference/audio/createSpeech), [OpenAI Pricing](https://openai.com/api/pricing/).
- **Pricing**:
  - `tts-1` (optimized for real-time speed): **$15.00 per 1M characters** ($0.015 / 1k chars).
  - `tts-1-hd` (optimized for quality): **$30.00 per 1M characters** ($0.030 / 1k chars).
- **Latency**: 200ms to 400ms TTFB over HTTP chunked streaming.
- **Language Support**:
  - Multilingual across 57 languages. Infers language automatically from input text.
  - Handles Portuguese and English smoothly within the same model.
- **Voices**:
  - 6 preset voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`.
  - `onyx` (deep, warm male) and `fable` (expressive, articulate) work very well for scripture.
- **Cadence & Prosody**:
  - No SSML support. Pacing relies on natural punctuation.
  - Speed can be set from `0.25` to `4.0` (setting `speed: 0.9` produces a calm, measured devotional cadence).
- **Output Formats**: MP3, Opus, AAC, FLAC, WAV, PCM.
- **Caching**:
  - OpenAI does not provide prompt caching for Audio TTS, but developers own all outputs and are encouraged to cache generated files.
- **Expo / React Native Integration**:
  - Cleanest REST API integration: simple POST request with `{ model: "tts-1", voice: "onyx", input: verseText }`.

---

### 2.3 Microsoft Azure AI Speech (Neural TTS)

- **Primary Sources**: [Azure AI Speech Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/), [Azure SSML Documentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup).
- **Pricing**:
  - Standard Neural TTS: **$16.00 per 1M characters**.
  - Neural HD: **$22.00 per 1M characters** (reduced from $30 in 2026).
  - Free F0 tier: **500,000 characters free every month**.
- **Latency**: 150ms to 250ms TTFB with HTTP streaming.
- **Language Support**:
  - Unsurpassed global catalog: dedicated `pt-BR` voices (e.g., `pt-BR-AntonioNeural`, `pt-BR-FranciscaNeural`, `pt-BR-BrendaNeural`) and `en-US` / `en-GB` voices.
- **Cadence, SSML & Phoneme Power**:
  - **Industry leader in fine-grained control**:
    ```xml
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
           xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
      <voice name="en-US-DavisNeural">
        <mstts:express-as style="calm">
          <prosody rate="-10%" pitch="-2Hz">
            For God so loved the world, <break time="450ms"/> that he gave his only Son...
          </prosody>
        </mstts:express-as>
      </voice>
    </speak>
    ```
  - Supports IPA phonetic spelling (`<phoneme alphabet="ipa" ph="...">`) to guarantee flawless pronunciation of ancient Hebrew and Greek transliterations in scripture.
  - Supports Word Boundary events (Visemes/Bookmarks) which would allow **karaoke-style visual word highlighting** during verse recitation.
- **Caching**: Fully permitted.

---

### 2.4 Amazon Polly (Generative & Neural Engines)

- **Primary Sources**: [Amazon Polly Pricing](https://aws.amazon.com/polly/pricing/), [Amazon Polly Developer Guide](https://docs.aws.amazon.com/polly/latest/dg/what-is.html).
- **Pricing**:
  - Neural voices: **$16.00 per 1M characters** (1M chars/mo free for 12 months).
  - Generative voices: **$30.00 per 1M characters** (100k chars/mo free for 12 months).
  - Standard voices: $4.00 per 1M characters.
- **Language Support**:
  - Robust `pt-BR` Neural voices (`Camila`, `Vitoria`, `Thiago`).
  - English Neural/Generative voices (`Matthew`, `Joanna`, `Ruth`, `Stephen`).
- **Cadence & Prosody**:
  - Extensive SSML support, including `<amazon:breath>`, `<break time="..."/>`, and prosody adjustments.
- **Caching & Distribution**:
  - Amazon Polly terms explicitly allow storing, caching, and unlimited redistribution of generated audio files without ongoing licensing fees.

---

### 2.5 Cartesia (Sonic & Sonic Multilingual)

- **Primary Sources**: [Cartesia Pricing](https://cartesia.ai/pricing), [Cartesia Documentation](https://docs.cartesia.ai/).
- **Pricing**:
  - Credit-based: 1 credit per character.
  - Scale Plan ($299/mo for 8M credits) yields **~$37.40 per 1M characters**.
  - Pro Plan ($5/mo for 100k credits) with overages at $65.00 per 1M characters.
- **Latency**: **Sub-90ms TTFB**. Built on State Space Models (Mamba architecture) rather than autoregressive transformers.
- **Language Support**: Supports 44 languages including English and Brazilian Portuguese.
- **Evaluation for Voice AI Scripture**:
  - While extraordinarily fast for interactive conversational bots, Cartesia's protocol is heavily biased toward WebSocket raw PCM byte streams.
  - Playing chunked raw PCM in React Native / Expo requires audio bridging that adds unnecessary complexity compared to standard streaming MP3 containers for pre-written verses.

---

### 2.6 Eliminated Candidates

1. **Groq Cloud (`canopylabs/orpheus-v1-english`)**:
   - *Why Eliminated*: Groq hosts Whisper V3 Turbo for STT (which we love for transcription), and recently added speech synthesis at `https://api.groq.com/openai/v1/audio/speech`. However, Groq's Orpheus TTS model is currently restricted to **English and Saudi Arabic only**. There is **no Portuguese support**, making it unsuitable as the unified TTS provider for this bilingual app.
2. **Deepgram (Aura / Aura-2)**:
   - *Why Eliminated*: Deepgram Aura-2 only supports 7 languages: English, Dutch, French, German, Italian, Japanese, and Spanish. **Portuguese (pt-BR) is not supported for TTS** (even though Deepgram supports it for STT Nova-3).

---

### 2.7 Native Device Baseline (`expo-speech`)

- **Primary Sources**: `expo-speech` documentation (Expo SDK 57), `AVSpeechSynthesizer` (iOS), `TextToSpeech` (Android).
- **Cost**: **$0.00** forever.
- **Latency**: **0ms network latency** (executes on-device).
- **Language Support**: Uses the OS installed voices for `en-US` and `pt-BR`.
- **Limitation**: Timbre is noticeably mechanical and varies wildly between an iPhone 16 Pro (high quality Siri voice) and a budget Android phone (harsh robotic synthesizer).
- **Role in App**: Already implemented in `src/services/SpeechSynthesizer.ts`. Serves as the zero-cost unmetered offline fallback when network is unavailable or user quota is exhausted.

---

## 3. The Scripture Memorization Domain: Special Considerations

### 3.1 Biblical Proper Noun Pronunciation
Biblical texts contain ancient personal and geographical names that trip up generic TTS models:
- Examples: *Melchizedek* (`/mɛlˈkɪzədɛk/`), *Habakkuk* (`/həˈbækək/`), *Nebuchadnezzar*, *Getsêmani*, *Colossenses*.
- **SSML Providers (Azure & Polly)** allow passing explicit IPA phonemes (`<phoneme alphabet="ipa" ph="...">`), guaranteeing 100% correct canonical pronunciation.
- **LLM/Diffusion Providers (ElevenLabs & OpenAI)** handle most biblical pronunciations through extensive training on religious literature, but occasionally misplace stress on obscure Old Testament genealogies. ElevenLabs allows phonetic text spellings or voice prompt notes to correct anomalies.

### 3.2 Sacred Cadence, Breathing, and Pause Architecture
Scripture recitation requires rhythmic breathing pauses between clauses and verse transitions:
- A pause after a colon, semicolon, or verse citation (`"John 3:16 — For God so loved..."`) should be ~400ms to 600ms, not the rushed 100ms of conversational speech.
- **ElevenLabs**: Achieve this by replacing commas with em-dashes (` — `) or ellipses (`...`).
- **Azure & Polly**: Achieve this deterministically via `<break time="500ms"/>`.

---

## 4. The Architectural Recommendation: Hybrid Cached Pipeline

Because scripture verses are finite and static, Voice AI Scripture should adopt a **two-tier architecture**:

```
                       ┌───────────────────────────────┐
                       │ User requests Verse Recitation │
                       └───────────────┬───────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │  Is Verse Audio Cached in      │
                       │  Device FileSystem / R2 CDN?   │
                       └───────┬───────────────┬───────┘
                          YES  │               │ NO
                               │               │
                               ▼               ▼
                     ┌──────────────────┐  ┌───────────────────────────┐
                     │ Instant Playback │  │ Call Cloud TTS API        │
                     │ (0ms Latency,    │  │ (ElevenLabs / Azure / OAI)│
                     │  $0 Cost)        │  └─────────────┬─────────────┘
                     └──────────────────┘                │
                                                         ▼
                                           ┌───────────────────────────┐
                                           │ Save Audio to Cache       │
                                           │ & Stream to Audio Driver  │
                                           └───────────────────────────┘
```

### Economics of Cached Recitation
- Average Bible verse: **120 characters**.
- Cost to synthesize 1 verse:
  - **OpenAI `tts-1`**: $0.0018 (less than one-fifth of a cent).
  - **Azure Neural**: $0.0019.
  - **ElevenLabs Flash v2.5**: $0.006 (six-tenths of a cent).
- Once synthesized, the verse is stored locally via `FileSystem.cacheDirectory` or uploaded to an app-level audio repository (e.g. Cloudflare R2).
- **Result**: Even if a learner recites John 3:16 a hundred times over a 6-month Spaced Repetition interval, the app pays the API synthesis fee **exactly once**.

---

## 5. Implementation Roadmap for Voice AI Scripture

1. **Update `SpeechSynthesizer` Seam (`src/services/SpeechSynthesizer.ts`)**:
   - Extend the existing `SpeechSynthesizer` interface to support cloud adapters alongside `ExpoSpeechSynthesizer`.
   - Add `OpenAISpeechSynthesizer` and/or `ElevenLabsSpeechSynthesizer`.
2. **Implement File Caching Adapter**:
   - Hash `verse.id + translation + language + voiceId`.
   - Check if `${FileSystem.cacheDirectory}/verses/${hash}.mp3` exists before issuing network requests.
3. **Playback via `expo-audio`**:
   - Feed the cached local URI or cloud streaming URL directly into the `AudioDriver`.
4. **Offline Graceful Degradation**:
   - If offline or API fails, automatically fall back to the existing `ExpoSpeechSynthesizer` (`expo-speech`), guaranteeing that learners are never blocked during daily quiet time.
