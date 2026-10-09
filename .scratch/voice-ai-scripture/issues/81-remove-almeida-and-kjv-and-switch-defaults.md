# 81: Remove ALMEIDA and KJV and Switch the Defaults

**What to build:**
Make the app ship only open-licensed texts. The per-language defaults become `BLIVRE` (pt) and `BSB` (en). The AA `ALMEIDA` and the `KJV` datasets are deleted from the bundle and the build script. Verses already stored with those labels keep their text and label: `ALMEIDA`, `KJV` and other non-bundled names (`ARA`, `ARC`, `ACF`, `NAA`, `NVI`, `NTLH`, `NVT`, `NIV`, `ESV`, …) remain recognized as labels with a language but no bundled text. Every caller of the old `ALMEIDA`/`WEB` defaults moves to the new defaults:
- the Acoustic Translation Metadata Prompt fallback;
- the review screen's version label;
- the sandbox welcome card's sample verses, now resolved through the catalog;
- the clipboard parser's known codes;
- the add-verse picker's default.

ADRs 0003 and 0007 get a status line saying they are superseded in part by ADR 0018. See `spec-open-translations.md`.

**Blocked by:** 80: Add the Open-Licensed Bibles

**Status:** done

- [x] Only BLIVRE, ONBV, BSB and WEB are bundled. The ALMEIDA and KJV dataset files and builders are removed.
- [x] Per-language defaults are BLIVRE and BSB everywhere the app previously defaulted to ALMEIDA or WEB.
- [x] Stored verses labelled ALMEIDA or KJV still load, show their stored text and label, and are recited and spoken in the right language.
- [x] The clipboard parser recognizes BLIVRE and BSB and keeps recognizing non-bundled labels.
- [x] The sandbox welcome card's verses come from the catalog in the language default.
- [x] ADRs 0003 and 0007 carry a "superseded in part by ADR 0018" status line.
- [x] Tests that treated ALMEIDA or KJV text as bundled are rewritten (they may keep those codes as labels on stored verses).
