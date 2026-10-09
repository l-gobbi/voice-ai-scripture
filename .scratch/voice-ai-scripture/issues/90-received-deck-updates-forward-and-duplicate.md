# 90: Received Deck Updates, Forwarding and Duplicating

**What to build:**
**Updates**
- Importing a message whose deck id matches an existing Received Deck compares `updatedAt`:
  - older or equal → "Você já tem a versão mais recente";
  - newer → an update summary (new verses, wording conflicts and updates, verses removed from the deck, order or section changes) shown before applying.
- Applying never deletes library verses or progress. Removed entries only leave the deck.
- Importing a message of a deck the learner owns (same id as an Own Deck) is treated as an update of that Own Deck, with the summary shown.

**Forward and duplicate**
- A Received Deck can be **forwarded**: shared again with the same id and `updatedAt`.
- It can be **duplicated as an Own Deck** with a new id, editable, referencing the same verses.
- Editing an Own Deck bumps its `updatedAt`, so that re-sharing produces an update for recipients.

See `spec-decks.md`.

**Blocked by:** 89: Share and Import Received Decks

**Status:** ready-for-agent

- [ ] The Deck Library update plan, with the correct summary and safe apply; older or equal imports report "up to date"; importing your own deck counts as an update.
- [ ] Own Deck edits bump `updatedAt`.
- [ ] Forwarding keeps the source id and `updatedAt`.
- [ ] "Duplicar como meu deck" creates an editable Own Deck sharing the same verses.
- [ ] Deck Library and screen tests cover update, up-to-date, own-deck update, forward and duplicate.
