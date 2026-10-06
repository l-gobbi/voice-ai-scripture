# 55: Review Screen Editorial Dock & Bilingual Recitation Integration

**What to build:** Integrate the `FloatingMicButton` into `ReviewScreen`, replacing the full-width rectangular hero button. Wire live volume metering, delayed silence arc, instant tap-to-verify, clean cancel, and automated hands-free transition to verification. Dynamically detect verse language (`en` vs `pt`) using `ScriptureCatalog` to render localized hints and devotional cooldown messages. Hide the floating mic when results are displayed to present the diff tokens and review action bar.

**Blocked by:** 52: Recitation Controller VAD Integration, Cancel Action & Headless Auto-Verification, 53: Hybrid Abuse-Prevention Rate Limiter & Paywall Decoupling, 54: Bilingual Duolingo-Style Floating Microphone Button Component

**Status:** resolved

- [x] Replaces full-width `primaryHeroButton` in `ReviewScreen` with the centered `FloatingMicButton` dock
- [x] Connects `vadProgress`, `volumeLevel`, `isReciting`, `stopAndVerify`, and `cancelRecitation` from `useRecitationSession`
- [x] Detects verse language via `ScriptureCatalog.detectLanguage(verse)` to pass `en` or `pt` to the floating button
- [x] Displays localized status hints:
  - English: *"Listening... Recite clearly!"* / *"Recite the full verse from memory into the mic."*
  - Portuguese: *"Ouvindo... Recite com clareza!"* / *"Recite o versículo de memória no microfone."*
- [x] Displays localized devotional cooldown message if burst rate limit is hit:
  - English: *"Taking a quick breath... Please wait a few seconds before your next recitation."*
  - Portuguese: *"Respirando fundo... Aguarde alguns segundos antes da próxima recitação."*
- [x] Displays localized initial silence prompt if 10s grace expires without speech:
  - English: *"No speech detected. Tap the mic to try again."*
  - Portuguese: *"Nenhuma fala detectada. Toque no microfone para tentar novamente."*
- [x] Completely removes `PaywallModal` and quota gate from the review screen
- [x] Hides floating mic when results are displayed (`currentResult !== null`) and shows review action bar (`Practice Again` + `Next / Done`)
- [x] Comprehensive screen integration tests for both English and Portuguese verses
