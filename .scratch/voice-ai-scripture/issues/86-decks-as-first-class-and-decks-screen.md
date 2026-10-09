# 86: Decks as First-Class and the Decks Screen

**What to build:**
Introduce the Deck Library module. A Deck is a first-class, ordered set of verses with optional Deck Sections, `own` or `received` origin, and `updatedAt`. A verse can belong to several Decks. It sits behind the storage adapter and collaborates with the Verse Engine.
- **Migration:** existing `#tag` decks (the legacy `deck` field on verses) are converted automatically, and idempotently, into Own Decks with verses in creation order. The tag is then cleared.
- **Decks screen:** reached from the Home Screen. It lists Decks with Memory Tier progress (e.g. "12 of 30 Rooted"), and a deck detail shows its verses in order (tapping one opens recitation).
- **Home filter:** the deck filter chips now filter by Deck membership.

See `spec-decks.md` and CONTEXT.md (Deck, Own Deck, Received Deck, Deck Section).

**Blocked by:** None (can start immediately). Schedule it after tickets 82 and 83, because they edit the same Home Screen.

**Status:** done

- [x] A Deck Library module (headless, map-storage testable) stores Decks with an ordered entries list (section headings and verse ids), origin, and `updatedAt`. It lists Decks with Memory Tier counts and gets one Deck with resolved verses.
- [x] Legacy `deck` tags migrate to Own Decks on first load (idempotent, creation order), and the tag is cleared.
- [x] A verse can be in several Decks.
- [x] The Decks screen lists Decks with progress, opens a deck detail in order, and tapping a verse opens recitation.
- [x] The Home deck filter uses Deck membership.
- [x] Deck Library tests and screen tests cover the above.
