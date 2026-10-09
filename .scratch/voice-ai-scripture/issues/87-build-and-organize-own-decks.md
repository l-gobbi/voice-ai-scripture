# 87: Build and Organize Own Decks

**What to build:**
Let a learner build an Own Deck:
- create a deck with a name, description and default version, and rename it;
- add a **new** verse into the deck through the add-verse flow, with the deck's default version prefilled, single verses or ranges, and a new **Verse Note** field (shown, never recited, graded, clozed or spoken);
- add an **existing** library verse;
- add, rename and remove Deck Sections;
- move verses up and down and between sections;
- remove a verse from the deck without deleting it from the library.

Excerpts are stored as given, and leading or trailing ellipses never count as words. Received Decks reject all of these edits. See `spec-decks.md`.

**Blocked by:** 86: Decks as First-Class and the Decks Screen

**Status:** ready-for-agent

- [ ] Deck Library editing operations: create/rename/describe/default version, add new verse, add existing verse, add/rename/remove section, move entry, remove from deck. Every one of them is rejected on a Received Deck.
- [ ] `Verse` gains an optional Verse Note. It is shown in the deck detail and on the review screen, and excluded from recitation, grading, Cloze and Speech Synthesis.
- [ ] The add-verse flow opened from a deck prefills the default version and adds the verse to that deck. Ranges work.
- [ ] A test proves that an excerpt with leading or trailing "…" grades as clean when recited without the ellipses.
- [ ] Deck Library and screen tests cover editing, ordering, sections and the Received Deck rejection.
