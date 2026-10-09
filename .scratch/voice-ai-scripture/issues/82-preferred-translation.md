# 82: Preferred Translation

**What to build:**
Let the learner choose a Preferred Translation for each language: Bíblia Livre or ONBV, and BSB or WEB. It is stored by the Verse Engine behind the storage adapter and defaults to the catalog default when unset. Only bundled translations of the right language are accepted. New verses created without an explicit translation use it, and the add-verse picker preselects it. A small settings surface, reached from the Home Screen menu next to the reminder settings, offers one choice per language. See `spec-open-translations.md` and CONTEXT.md (Preferred Translation).

**Blocked by:** 81: Remove ALMEIDA and KJV and Switch the Defaults

**Status:** done

- [x] The Verse Engine gets and sets the Preferred Translation per language, persists it, and rejects non-bundled or wrong-language choices.
- [x] New verses default to the Preferred Translation for their reference's language.
- [x] The add-verse picker preselects the Preferred Translation.
- [x] A settings surface reachable from the Home Screen menu shows and changes the preference per language (en/pt copy).
- [x] Verse Engine and screen tests cover defaults, persistence, validation and the settings UI.
