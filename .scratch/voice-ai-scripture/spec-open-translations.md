# Specification: Open-Licensed Translations & Preferred Translation

**Status:** ready-for-agent  
**Domain:** Scripture & Translation Infrastructure / Topical Packs / Learner Settings  
**Governing Documents:** `CONTEXT.md` (Translation, Preferred Translation, Topical Pack, Deck, Bible Provider), `docs/adr/0003-public-domain-translations-and-premium-api-expansion.md`, `docs/adr/0007-multi-translation-and-bible-provider.md`, `docs/adr/0018-open-licensed-bundled-translations-only.md`  
**Research:** `docs/research/feature-and-improvement-opportunities.md` §6 (L1–L5, L7)

---

## Problem Statement

The app cannot ship as it is, and learners can't choose the Bible they memorize in:

1. **The bundled Portuguese Bible is copyrighted.** What the app calls `ALMEIDA` is the 1967/1974 *Almeida Revisada Imprensa Bíblica*, taken from a dataset licensed CC BY-NC. Shipping it in a freemium app is not allowed. ADR 0007 wrongly records it as public domain.
2. **The Topical Packs ship hand-copied wording.** The Portuguese pack verses come from yet another copyrighted Almeida edition, and some English pack verses differ from the bundled WEB text while still being labelled "WEB".
3. **The `KJV` is a liability.** It is under perpetual Crown protection in the UK, and about 17,000 of its verses contain `{…}` markers that appear in the text, in Cloze Practice and in Speech Synthesis.
4. **The open Portuguese option is a stub.** Only 67 verses of the openly licensed ONBV are bundled, so it fails in the Reference Picker for almost everything.
5. **No credits are shown.** There is no screen with the notices that the open licences require.
6. **The English default sounds wrong to most evangelicals.** The WEB says "Yahweh" throughout the Old Testament.
7. **The learner has no choice.** The app picks a translation from the reference's language (`João` → ALMEIDA, `John` → WEB). Topical Packs are tied to whatever wording was typed into them, not to the version the learner's church uses.

## Solution

Ship only texts the app may freely distribute, and let each learner choose their version.

1. **Bundled translations:**
   - **Bíblia Livre (`BLIVRE`)**, CC BY, the Portuguese default;
   - the **full Open Nova Bíblia Viva (`ONBV`)**, CC BY-SA, shipped verbatim;
   - the **Berean Standard Bible (`BSB`)**, public domain, the English default;
   - the **World English Bible (`WEB`)**, public domain.
   
   `ALMEIDA` (the AA text) and `KJV` are removed. Any `{…}` or `[…]` markers are removed when the texts are imported, and the words inside them are kept.
2. **Preferred Translation.** The learner picks one per language: Bíblia Livre or ONBV, and BSB or WEB. New verses and imported Topical Packs use it.
3. **Topical Packs become reference lists.** They carry no text. Importing a pack fetches every verse in the learner's Preferred Translation for that pack's language, so one verse has one wording everywhere.
4. **Translations & Copyright screen.** It lists every bundled translation with its full name, licence and required notice. It can be reached from the Home Screen menu and from the translation picker.
5. **Verses saved earlier keep their text.** A verse already labelled `ALMEIDA`, `KJV` or any other version keeps its stored wording and label. Those labels simply have no bundled text behind them anymore.
6. **The sandbox verse comes from the catalog,** in the default translation for its language, instead of hand-typed text.

## User Stories

1. As a Portuguese-speaking learner, I want Bíblia Livre as my default, so that I memorize an Almeida-style text the app is allowed to ship.
2. As a Portuguese-speaking learner, I want the full ONBV available, so that I can choose a modern-language version for any verse.
3. As an English-speaking learner, I want the Berean Standard Bible as my default, so that the wording feels familiar and doesn't say "Yahweh" throughout the Old Testament.
4. As an English-speaking learner, I want the WEB still available, so that I can keep using it if I prefer it.
5. As a learner, I want to choose my Preferred Translation for Portuguese and for English, so that the app follows the Bible I actually read.
6. As a learner, I want new verses I add to use my Preferred Translation by default, so that I don't have to switch the version every time.
7. As a learner, I want to still pick a different translation for an individual verse, so that I can memorize a verse in the wording my church uses.
8. As a learner, I want to import a Topical Pack and receive its verses in my Preferred Translation, so that a pack never forces another version on me.
9. As a learner who changes my Preferred Translation, I want verses I already saved to keep their text, so that my memorization isn't disrupted.
10. As a learner, I want Topical Pack previews to show the text in my Preferred Translation, so that I know exactly what I will memorize.
11. As a learner, I want importing a pack twice to skip verses I already have, so that I don't get duplicates.
12. As a learner, I want the Reference Picker to work for every book, chapter and verse of every bundled translation, so that I can find any verse.
13. As a learner, I want verse text free of `{…}` or `[…]` markers, so that reading, Cloze Practice and Speech Synthesis show only real words.
14. As a learner, I want Echo Mode to read verses in the right language for the translation, so that Bíblia Livre is spoken in Portuguese and BSB in English.
15. As a learner, I want a Translations & Copyright screen, so that I know where each text comes from and who to credit.
16. As a learner choosing a translation, I want a link to that screen next to the options, so that licence details are one tap away.
17. As a learner who saved verses in `ALMEIDA` or `KJV` during testing, I want them to keep working with their stored text and label, so that nothing breaks.
18. As a learner pasting a verse copied from another Bible app, I want the version label (e.g. ARA, NVI, KJV, BLIVRE, BSB) recognized, so that my own copy is labelled correctly.
19. As a learner typing my own wording in a version the app doesn't bundle, I want to label it with that version's name, so that I know which wording I'm memorizing.
20. As a first-time learner trying the sandbox, I want the sample verse in my language's default translation, so that it matches the rest of the app.
21. As a learner, I want the version shown on the review screen to be the verse's real translation, so that I never see a wrong label.
22. As a Portuguese-speaking learner, I want the speech recognizer primed with the right translation name, so that the Acoustic Translation Metadata Prompt matches my verse.
23. As the product owner, I want only open-licensed texts in the app bundle, so that the app can be published commercially in Brazil and abroad.
24. As the product owner, I want the ONBV shipped verbatim with its exact notice, so that we meet CC BY-SA without creating an adaptation.
25. As the product owner, I want the WEB shipped under its trademark condition, so that we don't call altered text "World English Bible".
26. As the product owner, I want an automated check that every bundled Bible is complete and free of markers, so that a bad data rebuild can't ship.
27. As the product owner, I want an automated check that every Topical Pack reference resolves in every bundled translation of its language, so that no pack import silently drops verses.
28. As a developer, I want one reproducible script that rebuilds the bundled Bibles from their open sources, so that the data's provenance is documented and repeatable.
29. As a developer, I want ADRs 0003 and 0007 marked as superseded in part by ADR 0018, so that nobody trusts the old public-domain claim.

## Implementation Decisions

**Data build (script)**
- **Sources:** the build script downloads Bíblia Livre (`porbr2018`), ONBV (`poronbv`) and BSB (`engbsb`) from eBible.org in a verse-per-line format. It keeps the current WEB source. The `ALMEIDA` and `KJV` builders are removed.
- **Conversion:**
  - eBible book codes are mapped to the app's canon book ids;
  - whitespace is normalized;
  - `{…}` and `[…]` markers are removed while keeping their words;
  - nothing else in the wording changes.
- **Dataset shape:** each dataset keeps its current shape (translation code, name, language, books → chapters → verses) and adds metadata: full name, licence, the required attribution notice, and source URL.
- **ONBV and markers:** if the ONBV source contains markers at all, the build reports it instead of silently rewriting a CC BY-SA text, and the decision is escalated.
- **Removed files:** the AA and KJV dataset files are deleted from the bundle.

**Scripture Catalog**
- **Bundled translations** become `BLIVRE`, `ONBV`, `BSB` and `WEB`.
- **Each translation exposes metadata:** code, display name, language, licence, notice and source. The Translations & Copyright screen and the translation picker read it from here.
- **Alias canonicalization** recognizes the new names ("Bíblia Livre", "blivre", "Berean", "bsb", …).
- **Non-bundled labels stay recognized** with their language: `ALMEIDA`, `ARA`, `ARC`, `ACF`, `NAA`, `NVI`, `NTLH`, `NVT`, `KJV`, `NIV`, `ESV`, `NKJV`, … They are recognized as labels only, with no text behind them. `isBundledTranslation` is false for them, and language detection still works for them.
- **Defaults:** the catalog's per-language default (when no preference applies) is `BLIVRE` for pt and `BSB` for en.
- **Text lookup** behaves as today, but only for bundled translations.

**Preferred Translation (Verse Engine)**
- **Storage:** the Verse Engine stores one Preferred Translation per language behind the existing storage adapter. It defaults to the catalog default when unset. Only bundled translations of that language can be chosen.
- **New verses:** creating a verse without an explicit translation uses the Preferred Translation for the reference's language. This replaces today's hard-coded `ALMEIDA`/`WEB` choice.
- **Topical Pack import:** moves from the pack browser into the Verse Engine. Importing a pack:
  1. resolves each reference in the Preferred Translation for the pack's language;
  2. skips references already in the learner's library (as today);
  3. reports how many were added.

**Topical Packs (data)**
- A pack becomes an id, a language, a title, a description and an ordered list of references. Text and translation fields are removed.
- The existing pack themes and references are kept.

**Other callers of the old defaults**
- **Acoustic Translation Metadata Prompting** falls back to the verse's resolved translation, or to the Preferred Translation, instead of `ALMEIDA`/`WEB`.
- **The review screen's version label** uses the verse's real translation.
- **The sandbox welcome card** resolves its sample verses through the catalog in the language default.
- **The clipboard parser** recognizes the new codes and keeps recognizing the non-bundled labels.
- **Language detection for Speech Synthesis and recognition** treats `BLIVRE` and `ONBV` as Portuguese and `BSB` and `WEB` as English.

**UI**
- **Translation picker (add/edit verse):**
  - the bundled options are grouped by language: Bíblia Livre and ONBV; BSB and WEB;
  - non-bundled labels remain available for the learner's own wording;
  - the default selection is the Preferred Translation;
  - a link opens the Translations & Copyright screen.
- **Preferred Translation setting:** a small settings surface reached from the Home Screen menu, next to the existing reminder settings. It has one choice per language and names the copyright screen.
- **Translations & Copyright screen:** a list of the bundled translations showing the full name, licence and the exact notice:
  - the ONBV notice verbatim: "Biblica® Open Nova Bíblia Viva™ Copyright © 2007, 2010 by Biblica, Inc. 'Biblica' is a trademark registered in the United States Patent and Trademark Office by Biblica, Inc. Used with permission.";
  - the Bíblia Livre credit: "Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio, e Marco Teles";
  - the BSB's public-domain status, with a courtesy credit;
  - the WEB's trademark note.
- **Pack browser:** shows the pack's references with text previewed in the Preferred Translation, and imports through the Verse Engine.
- **Copy language:** new copy follows the existing per-language convention, and new screens follow DESIGN.md.

**Docs**
- ADRs 0003 and 0007 get a status line saying they are superseded in part by ADR 0018.
- `CONTEXT.md` is already updated: Translation, Preferred Translation, Topical Pack, Deck.

## Testing Decisions

**What a good test looks like.** Tests assert behavior a learner or caller can observe:
- the text a reference resolves to;
- which translations are offered;
- what a pack import adds;
- what the screens show.

They do not assert private parsing helpers.

**Seams (agreed):**
1. **Scripture Catalog**, the primary seam. It covers:
   - the bundled set and the per-language defaults;
   - alias canonicalization;
   - non-bundled labels keeping their language but having no text;
   - passage resolution in each bundled translation;
   - a **dataset integrity test** for every bundled Bible.

   The integrity test checks 66 books, chapter and verse counts against the canon matrix, no `{`, `}`, `[` or `]` characters in any verse, and non-empty name, language and notice metadata. Where a translation's versification legitimately differs from the canon matrix, the exceptions are listed explicitly in the test so that new gaps fail loudly.

   Prior art: the existing Scripture Catalog suite and the canon matrix suite.
2. **Verse Engine.** It covers:
   - Preferred Translation get/set and defaults, and rejecting non-bundled or wrong-language choices;
   - new verses defaulting to the preference;
   - Topical Pack import resolving text in the preference and skipping duplicates;
   - a test that every pack reference resolves in every bundled translation of its language.

   Prior art: the existing Verse Engine suite with the map storage adapter.
3. **Screens**, for the visible parts only. It covers:
   - the translation picker's options and default;
   - the Preferred Translation setting;
   - the Translations & Copyright notices;
   - the pack browser preview and import;
   - the sandbox sample verse text.

   Prior art: the Pack Browser, Home Screen and Sandbox Welcome Card suites.

**Other:**
- The data build script has no unit tests. Its output is guarded by the integrity test.
- Existing tests that hard-code `ALMEIDA` or `KJV` text as bundled are rewritten. They may keep those codes as *labels* on stored verses.
- The full suite must stay green.

## Out of Scope

- **Shareable Decks:** creating and editing Decks, excerpts, notes, catechism question-and-answer items, deep links that open the app, sharing on WhatsApp, and improving pasting from YouVersion. This is the next effort.
- **Licensing negotiations** with SBB (ARA/ARC/NAA), Biblica Brasil (NVI) or SBTB (ACF), and any licensed text.
- Lazy-loading Bible datasets (only if cold start proves slow) and a move to SQLite.
- Choosing a translation inside onboarding (onboarding effort).
- Spanish or other languages.
- Store territory settings. With the KJV gone, the UK restriction no longer applies.

## Further Notes

- **Size:** the bundle grows from about 13 MB to about 17 MB of Bible JSON. Measure cold start after the change. If it regresses noticeably, open a lazy-loading ticket.
- **Licensing judgement:** "verbatim" for ONBV means no wording changes. Licence obligations are summarized from the research note and are not legal advice. Confirm with a lawyer before the commercial launch.
- **This spec file:** it lives beside `spec.md` because `spec.md` is still in use by tickets 72–79 (fair grading). Its tickets continue the numbering from 80.
