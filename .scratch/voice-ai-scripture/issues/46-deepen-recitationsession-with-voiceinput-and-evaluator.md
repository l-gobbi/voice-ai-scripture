# 46: Deepen RecitationSession with VoiceInput & Evaluator

**What to build:**
Refactor `RecitationSession` to consume the unified `VoiceInput` seam and pure `RecitationEvaluator`. Deletes all temporary audio file management, URI passing, and manual file deletion hooks from the session, and eliminates imperative SRS unmetered patching.

**Blocked by:** 43: Pure Recitation Evaluator Pipeline, 44: Scripture Catalog & Canon Resolution, 45: Unified VoiceInput Seam & Streaming Adapters

**Status:** closed

- [x] `RecitationSession` accepts injected `VoiceInput` (defaulting to system factory) and calls `voiceInput.start()` and `voiceInput.stop()`.
- [x] All temporary audio file tracking (`currentAudioUri`), `.m4a` file paths, and defensive `deleteAudioFile` cleanup logic are deleted from `RecitationSession`.
- [x] `stopAndVerify()` delegates directly to `evaluateRecitation()` in a single call without manual SRS unmetered patching.
- [x] Language inference delegates cleanly to `ScriptureCatalog.detectLanguage()`.
- [x] All existing 46 `RecitationSession` tests pass cleanly with backwards-compatible adapter and unified seam.
- [x] End-to-end multi-tier recitation flow verified in `ReviewScreen`.
