# 0018: Bundle Only Open-Licensed Translations

## Context
ADR 0003 and ADR 0007 assumed the bundled `ALMEIDA` text was public domain. The October 2026 research (`docs/research/feature-and-improvement-opportunities.md` §6) found otherwise:
- The bundled `ALMEIDA` text is the 1967/1974 *Almeida Revisada Imprensa Bíblica*, which is under copyright, and it came from a CC BY-NC dataset.
- The Portuguese Topical Pack verses were hand-copied from yet another copyrighted Almeida edition.
- The `KJV` is under perpetual Crown protection in the UK, and its text carries `{…}` markers in about 17,000 verses.

Licensed alternatives are slow or narrow:
- SBB grants written permission only, case by case.
- API.Bible's commercial plan offers only NVT in Portuguese and forbids AI text-to-speech on copyrighted text.
- The YouVersion Platform is non-commercial only.

## Decision
- **Bundled texts:** the app bundles only translations it may freely ship in a freemium app:
  - **Bíblia Livre (`BLIVRE`)**, CC BY, the default in Portuguese;
  - the full **Open Nova Bíblia Viva (`ONBV`)**, CC BY-SA, shipped verbatim with its required notice;
  - the **Berean Standard Bible (`BSB`)**, public domain, the default in English;
  - the **World English Bible (`WEB`)**, public domain, used under its trademark condition.
- **Removed:** `ALMEIDA` (the AA text) and `KJV`.
- **Text markers:** `{…}` and `[…]` markers are removed at import and the words are kept.
- **Preferred Translation:** each learner picks a Preferred Translation per language.
- **Topical Packs:** they become reference lists whose text is fetched in that translation, so no hand-copied wording ships.
- **Credits:** a "Translations & Copyright" screen carries every required notice.

## Consequences
- **No church Almeida yet.** Churches that memorize in ARA, ARC, NAA or NVI are served by the learner's own wording (`CUSTOM` verses and shared Decks) until a licence is signed. Licensed texts, if they come, get their own ADR covering text-to-speech and voice grading rights.
- **Saved verses keep their text.** A verse already saved in `ALMEIDA` or `KJV` keeps its stored wording, because it is the learner's own copy.
