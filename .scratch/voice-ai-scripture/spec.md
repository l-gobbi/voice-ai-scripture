---
labels: ["ready-for-agent"]
---

# Specification: Multi-Translation Selection & Offline Bible Synchronization

## Problem Statement

Users currently experience significant friction when adding new scripture verses to memorize. The "Add Verse" modal requires manually typing or copying and pasting the complete verse text on a mobile keyboard, which is the primary cause of user drop-off during onboarding. Furthermore, the application is locked to English, with topical packs and hardcoded default texts only available in English. Additionally, Brazilian Portuguese users and users of different theological backgrounds prefer specific biblical translations (such as World English Bible or King James Version for English, and João Ferreira de Almeida or Nova Bíblia Viva for Portuguese). 

Finally, relying on third-party remote Bible REST APIs poses severe operational and commercial risks: strict rate limits (e.g., 15 requests per 30 seconds per IP on public hobbyist endpoints) trigger frequent `429 Rate Limited` errors on carrier-grade cellular NATs or church Wi-Fi networks, while modern copyrighted translations (such as NVI and ARA) carry copyright licensing liabilities if bundled without royalty permissions.

## Solution

Implement an instant, zero-latency, rate-limit-free **Multi-Translation Selection and Offline Bible Synchronization** architecture:
1. **Commercial-Compliant Translation Catalog**: Support verified Public Domain and Open-Access (CC BY-SA 4.0) translations that permit 100% royalty-free commercial freemium usage:
   - 🇺🇸 **English**: `WEB` (World English Bible - modern English, default) and `KJV` (King James Version - classic English).
   - 🇧🇷 **Português**: `ALMEIDA` (João Ferreira de Almeida - traditional Portuguese, default) and `ONBV` (Biblica® Open Nova Bíblia Viva - modern Portuguese, CC BY-SA 4.0).
2. **Offline-First Bundled `BibleProvider` Seam**: A formalized Ports & Adapters boundary (`BibleProvider`) backed by a lightweight, locally bundled scripture database (`LocalBibleProvider`). Queries run in `<1ms` without network calls, eliminating all server costs, rate limits, and connectivity failures.
3. **Smart Reference Normalizer**: A forgiving reference parser that recognizes colloquial and localized abbreviations in both English and Portuguese (e.g., `Jo 3:16`, `João 3:16`, `John 3:16`, `Rm 8:28`, `Sl 23:1`, `1 Co 13:4`), automatically resolving multi-verse spans (e.g., `John 3:16-17`) into continuous recitation text.
4. **Interactive "Add Verse" Auto-Populate & Clipboard Import**:
   - As the user types a recognized reference and selects a translation, the canonical text auto-populates instantly with zero latency.
   - For copyrighted translations (e.g. `NVI`, `ARA`), the UI provides a 1-tap **"📋 Paste from Clipboard"** button and editable text area, empowering users to memorize in their favorite translation under personal-study fair use without app copyright liability.
5. **Whisper Speech Transcriber Language Priming**: Dynamically condition the Whisper speech-to-text language based on the verse's translation (`'pt'` for `ALMEIDA` and `ONBV`; `'en'` for `WEB` and `KJV`), ensuring Brazilian recitations are transcribed with maximum accuracy and zero foreign-language hallucinations.
6. **Dual-Language Topical Packs**: Expand the topical pack library to include Brazilian Portuguese collections (*Paz*, *Fé*, *Esperança* in Almeida) alongside English collections (*Peace*, *Faith*, *Strength* in WEB).

## User Stories

1. As a believer opening the "Add Verse" modal, I want to select my preferred translation (WEB, KJV, Almeida, ONBV) from a clean dropdown, so that I can memorize in the version my church and community use.
2. As a Brazilian believer typing "Jo 3:16", I want the app to recognize the Portuguese abbreviation and instantly fill in *"Porque Deus amou o mundo de tal maneira..."*, so that I don't have to painstakingly type out the entire verse on my phone keyboard.
3. As a user memorizing in English typing "Romans 8:28" in the WEB translation, I want the full passage to load immediately without waiting for a spinning network loader, so that adding verses feels effortless and instantaneous.
4. As a believer studying inside a church sanctuary or on an airplane with no internet connection, I want verse search and auto-fill to work completely offline, so that lack of Wi-Fi or cellular service never interrupts my spiritual discipline.
5. As a mobile user connected to carrier-grade cellular data (where thousands of devices share an IP), I want verse lookups to never fail with rate-limit or 429 errors, so that my experience remains stable and frustration-free.
6. As a believer memorizing a longer passage like "Salmos 23:1-3", I want the app to fetch and concatenate the verses into a unified, continuous recitation text, so that I can practice reciting the full psalm smoothly.
7. As a believer whose favorite translation is copyrighted (such as NVI or ARA), I want to tap a "Paste from Clipboard" button that extracts text I copied from the YouVersion Bible app, so that I can still memorize my favorite version under personal study fair use.
8. As a user who prefers specific punctuation, capitalized divine pronouns, or a slightly different wording, I want the auto-filled verse text box to remain fully editable, so that I can refine the text to match my exact memorization preference before saving.
9. As a Brazilian believer reciting Portuguese scripture out loud, I want the voice recognition engine to be explicitly primed with Portuguese language phonemes (`language: 'pt'`), so that my Portuguese recitation is not misrecognized as English words.
10. As an English believer reciting King James Version scripture out loud, I want the voice recognition engine to be primed with English language phonemes (`language: 'en'`), so that archaic terms like *"begotten"* and *"whosoever"* are accurately transcribed.
11. As a new Brazilian user browsing topical packs, I want to see curated Portuguese packs (*Paz*, *Fé*, *Esperança*), so that I can start memorizing immediately with one tap without configuring anything.
12. As a user reviewing my saved verses on the home screen, I want to see a clear translation badge (e.g., `WEB`, `KJV`, `ALMEIDA`, `ONBV`) on each verse card, so that I immediately know which version I am practicing.
13. As a user who edits an existing verse to switch translations, I want my review streak and Spaced Repetition interval to remain intact, so that changing translations does not erase my memorization progress.
14. As an automated test suite or AI developer, I want an in-memory `SimulatedBibleProvider` that returns deterministic passages without touching the filesystem or network, so that test suites run in milliseconds.

## Implementation Decisions

- **Translation Domain Model & Metadata:**
  - Update `Verse` entity in `VerseEngine.ts` to include `translation: string` (e.g. `'WEB' | 'KJV' | 'ALMEIDA' | 'ONBV' | 'CUSTOM'`).
  - Update `VerseEngine.addVerse()` and `VerseEngine.updateVerse()` to accept and persist `translation`, defaulting to `'WEB'` for English references and `'ALMEIDA'` for Portuguese references when unspecified.
  - When switching translation on an existing verse, update the verse text while preserving existing `streak`, `repetitions`, `intervalDays`, and `nextReviewDate`.

- **BibleProvider Seam (Ports & Adapters):**
  - Create `src/services/BibleProvider.ts` defining the domain interface:
    ```typescript
    export interface BiblePassage {
      reference: string;
      text: string;
      translation: string;
      language: 'en' | 'pt';
    }

    export interface BibleProvider {
      fetchPassage(reference: string, translation: string): Promise<BiblePassage | null>;
    }
    ```
  - **`LocalBibleProvider`**: Production adapter accessing local bundled scripture JSON data in `src/data/bibles/` (`web.json`, `kjv.json`, `almeida.json`, `onbv.json`). Performs zero network calls, runs synchronously in `<1ms`, and returns trimmed, normalized scripture text.
  - **`SimulatedBibleProvider`**: In-memory test adapter pre-loaded with mock passages or custom handler overrides for headless testing.
  - **`createDefaultBibleProvider()` Factory**: Returns `new LocalBibleProvider()`.

- **ReferenceNormalizer Module:**
  - Create `src/services/ReferenceNormalizer.ts` responsible for parsing, normalizing, and resolving reference strings.
  - Maintains an alias dictionary for all 66 canonical biblical books supporting:
    - English names & abbreviations (`Gen`, `Ex`, `Matt`, `Mt`, `Rom`, `Rm`, `1 Cor`, `1 Co`, `Rev`).
    - Portuguese names & abbreviations (`Gn`, `Êx`, `Mt`, `Mateus`, `Jo`, `João`, `Rm`, `Romanos`, `Sl`, `Salmos`, `1 Co`, `1 Coríntios`, `Ap`, `Apocalipse`).
  - Extracts book identifier, chapter number, starting verse number, and optional ending verse number.
  - Concatenates multi-verse ranges into continuous strings separated by single spaces.

- **SpeechTranscriber Language Priming:**
  - Update `TranscriptionOptions` in `SpeechTranscriber.ts` to accept optional `language?: string`.
  - Update `WhisperTranscriber.transcribe()` to append `formData.append('language', options.language ?? 'en')`.
  - In `RecitationSession.stopAndVerify()`, derive the language from `this.verse.translation`:
    - If `translation === 'ALMEIDA' || translation === 'ONBV'` (or Portuguese pack), pass `language: 'pt'`.
    - Otherwise pass `language: 'en'`.

- **Add Verse Modal & UI Overhaul:**
  - In `HomeScreen.tsx` (Add Verse Modal):
    - Add a styled Picker / Translation Selector segmented by language:
      - 🇺🇸 English: `WEB (World English Bible)`, `KJV (King James Version)`
      - 🇧🇷 Português: `Almeida (JFA)`, `ONBV (Nova Bíblia Viva)`
      - 📋 Outras: `NVI / ARA / Outra (Personalizado)`
    - Add debounced reference typing listener (500ms): when a valid book and chapter:verse are detected, automatically query `BibleProvider` and populate the text area with the scripture text.
    - Provide a manual **"Buscar Texto" / "Fetch Text"** button beside the reference input.
    - Provide a **"📋 Colar da Área de Transferência" / "Paste from Clipboard"** button that automatically parses copied text and reference.
    - Display translation badge on verse cards in the list.

- **Dual-Language Topical Packs:**
  - Expand `src/data/topicalPacks.ts` to include localized Portuguese topical packs (*Paz*, *Fé*, *Esperança* in Almeida) with full reference and text.
  - Update `PackBrowserModal.tsx` to display language tags (`[EN]` / `[PT]`) or a language filter toggle.

## Testing Decisions

- **Behavior-Driven at Seams:**
  - Test `ReferenceNormalizer` against a comprehensive battery of English and Portuguese abbreviations, capitalization variants, and multi-verse spans.
  - Test `LocalBibleProvider` ensuring valid passage retrieval across all 4 bundled translations (`WEB`, `KJV`, `ALMEIDA`, `ONBV`), verifying accurate handling of unknown references (returning `null` without throwing unhandled exceptions).
  - Test `SpeechTranscriber` verifying `FormData` receives `language: 'pt'` when `language` option is `'pt'`.
  - Test `RecitationSession` verifying language conditioning is correctly propagated based on verse translation.
  - Test `VerseEngine` verifying translation persistence and backward compatibility with existing saved verses that lack a translation field (defaulting safely to `'WEB'` or `'ALMEIDA'`).
- **Prior Art:**
  - Follows established Ports & Adapters patterns from `VerseEngine` (`StorageAdapter`) and `SpeechTranscriber` (`SimulatedTranscriber` / `createDefaultTranscriber`).

## Out of Scope

- Real-time audio text-to-speech narration (TTS) of verses (planned for future audio playback candidate).
- Cloud user account synchronization or multi-device sync (the app remains local-first).
- In-app payment integration for custom copyrighted Bible licenses (handled via clipboard import for now).

## Further Notes

- All bundled Bible translations (`WEB`, `KJV`, `ALMEIDA`, `ONBV`) have been verified for legal commercial freemium distribution with zero royalties.
- Bundling text for the selected versions in lightweight JSON adds minimal storage footprint (~5-8MB) while delivering an unmatched instant offline user experience.
