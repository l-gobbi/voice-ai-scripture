# 88: Deck-Aware Deletion

**What to build:**
Deleting a Deck asks "Apagar só o deck" (default) or "Apagar o deck e os versículos que só estão nele". The second option deletes only verses that belong to no other Deck, and never touches verses shared with another Deck. Deleting a verse (Verse Removal, ADR 0009) removes it from every Deck, and the confirmation says how many Decks contain it. See `spec-decks.md`.

**Blocked by:** 86: Decks as First-Class and the Decks Screen

**Status:** ready-for-agent

- [ ] The Deck Library deletes in two modes, `deckOnly` and `deckAndExclusiveVerses`, and protects verses shared with other Decks.
- [ ] Verse Removal removes the verse from all Decks. The delete confirmation shows the number of Decks containing it (en/pt).
- [ ] The deck delete confirmation offers both modes, with "only the deck" as the default.
- [ ] Deck Library and screen tests cover both modes, shared-verse protection and the verse confirmation copy.
