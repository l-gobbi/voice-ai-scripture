# 0005: Deep VerseEngine Domain Architecture Over Fragmented Storage and Computation

We decided to consolidate verse persistence, due-date calculation, and SM-2 review recording into an authoritative, deep `VerseEngine` module rather than having presentation components and recitation controllers coordinate raw `AsyncStorage` and mathematical utility functions directly.

Previously, `VerseStorageService` handled generic JSON CRUD while `HomeScreen`, `ReviewScreen`, and `RecitationSession` each independently computed Spaced Repetition dates and filtered due verses. This created scattered domain logic and exposed UI screens to algorithmic details. 

`VerseEngine` encapsulates:
1. Unified Review Recording (`recordReview(verseId, score)`), mapping both manual pass/fail and recitation accuracy into SM-2 updates atomically.
2. Consolidated Querying (`getVersesSummary(now)`), delivering both the full verse collection and currently due verses in a single pass without caller-side filtering.
3. Injectable Storage Adapter (`StorageAdapter`), allowing instant headless in-memory execution in test environments while defaulting to `AsyncStorage` in production.
4. Pure math (`srsEngine.ts`) and pure diffing (`diffEngine.ts`) remain isolated functional cores called internally by the engine.
