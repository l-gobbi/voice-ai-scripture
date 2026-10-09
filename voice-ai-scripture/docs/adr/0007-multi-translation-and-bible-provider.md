# 0007: Multi-Translation Strategy & Pluggable BibleProvider Seam

**Status:** Superseded in part by ADR 0018 (bundled translations are open-licensed only).

We decided to introduce a formalized `BibleProvider` adapter seam with explicit `translation` metadata on `Verse`, and establish a commercial-compliant translation catalog supporting English (`WEB`, `KJV`) and Brazilian Portuguese (`ALMEIDA`, `ONBV`), while dynamically conditioning Whisper speech-to-text language on the active translation.

Previously, verses had no explicit translation metadata, topical packs were hardcoded in English, Whisper speech transcription was statically hardcoded to `language: 'en'`, and adding verses required manual copy-pasting of text.

Under this architecture:
1. **Commercial-Compliant Translation Catalog**: To support a freemium production mobile app without copyright liabilities or licensing royalty fees, the app bundles and fetches strictly public-domain translations (`WEB`, `KJV` in English; `ALMEIDA` in Portuguese) alongside the openly-licensed Biblica® Open Nova Bíblia Viva (`ONBV`, CC BY-SA 4.0). ASV was eliminated to focus on modern readable public-domain texts.
2. **Pluggable BibleProvider Seam**: Callers interact exclusively with the `BibleProvider` interface (`fetchPassage(reference, translation): Promise<BiblePassage | null>`). The default adapter is `LocalBibleProvider`, which reads bundled offline scripture datasets (`web.json`, `kjv.json`, `almeida.json`, `onbv.json`) for instant, rate-limit-free lookups in `<1ms`, while an in-memory `SimulatedBibleProvider` enables fast, headless, zero-network unit testing.
3. **Automatic Language Priming for Whisper**: `SpeechTranscriber` accepts an optional `language` parameter inferred from the verse's translation (`'pt'` for `ALMEIDA` and `ONBV`; `'en'` for `WEB` and `KJV`). This prevents Portuguese recitations from being mangled by an English speech-recognition model.
4. **Forgiving Reference Normalization**: A `ReferenceNormalizer` unifies common English and Portuguese book abbreviations (`Jo 3:16`, `Rm 8:28`, `Sl 23:1`, `1 Co 13:4`) to canonical references before querying the provider.
5. **Non-Destructive Translation Association**: A `translation` field is added to the `Verse` domain model. When editing an existing verse to switch translations, the user's Spaced Repetition streak and review history are preserved.
