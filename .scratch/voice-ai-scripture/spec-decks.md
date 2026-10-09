# Specification: Shareable Decks

**Status:** ready-for-agent  
**Domain:** Decks / Sharing / Verse Library  
**Governing Documents:** `CONTEXT.md` (Deck, Own Deck, Received Deck, Deck Section, Verse Note, Verse, Translation, Verse Removal), `docs/adr/0002-*`, `docs/adr/0009-hard-deletion-with-custom-confirmation-modal.md`, `docs/adr/0017-*`, `docs/adr/0018-*`, `docs/adr/0019-small-stateless-edge-function.md`, `docs/adr/0020-decks-travel-inside-the-shared-message.md`  
**Research:** `docs/research/world-class-strategy-and-differentiation.md` (bet 3: church plans over WhatsApp), `docs/research/feature-and-improvement-opportunities.md` (P1, C6, C7)

---

## Problem Statement

A church asks its members to memorize a set of verses, such as its catechism, in one specific wording, often mixing versions. That way everyone recites the same text. Today the app can't carry that:

1. **A deck is only a tag on a verse.**
   - A verse can be in one deck at most.
   - A deck has no order and no sections. The catechism is ordered by topic ("1º Tópico – Jesus, sua vida e sua obra").
2. **Importing a shared deck silently drops verses.** If the learner already has João 1:14 in Bíblia Livre, the catechism's wording of João 1:14 is skipped, so they memorize a different text from everyone else.
3. **Received decks can drift.** Nothing distinguishes a deck the learner made from one a church sent. Nothing keeps the latter faithful to its source, and an updated catechism can't be applied without creating duplicates.
4. **Excerpts and glosses don't fit.** Catechisms quote partial verses ("Atos 1:8 … mas recebereis poder…") and add glosses that are not recited ("Verbo = Palavra").
5. **Importing is invasive and the link is unsafe.**
   - The app reads the clipboard by itself on every launch and foreground. On iOS this can trigger the system paste prompt.
   - The share link points at `voice-scripture.app`, a domain the project does not own. Whoever registers it would receive every shared deck link.
6. **There is no way to see, organize or delete decks as such,** or to see how far along a deck is.

## Solution

Decks become first-class:
- **Ordered:** a Deck is an ordered set of verses with optional Deck Sections.
- **Exact wording:** each verse keeps its exact wording, version and optional Verse Note.
- **Shared membership:** a verse can belong to several Decks.

Learners build **Own Decks**. They can create, rename, add new or existing verses, reorder, add sections, set a default version, share, and delete.

Decks are shared as a message that the learner sends (e.g. on WhatsApp):
- The message carries **readable verses**, the line **"Texto fornecido por quem compartilhou este deck"**, and an **encoded deck code**.
- The recipient taps **"Importar deck"**. Only then does the app read the clipboard, and it never reads it on its own again.
- The unowned domain link is removed. An `https` link will come once the app has a domain (ADR 0019/0020).

An imported deck becomes a **Received Deck** that follows its source:
- **Read-only:** its order, sections, wording and notes change only when an update from the same source is imported.
- **Updates:** importing a newer version shows a summary (new verses, wording updated, verses removed, order changed) before applying.
- **Wording conflicts:** when an incoming verse has the same reference as one the learner already has but different wording, the app asks. The default is "use the deck's wording", which keeps the verse's Memory Tier and schedule and records the text change.
- **Forward or copy:** the learner can forward a Received Deck, or "Duplicate as my deck" to get an editable Own Deck.

Deleting a Deck asks "delete only the deck" (default) or "delete the deck and verses only in it". Deleting a verse removes it from every Deck and says how many Decks it was in. Existing `#tag` decks are converted to Own Decks automatically.

## User Stories

1. As a learner, I want a Decks screen listing my decks, so that I can see how my memorization is organized.
2. As a learner, I want each deck to show its progress by Memory Tier (e.g. "12 of 30 Rooted"), so that I know how far along I am.
3. As a learner, I want to create a deck with a name and an optional description, so that I can group verses for a purpose.
4. As a learner, I want to set a deck's default version, so that new verses I add to it start with the right version label.
5. As a learner, I want to add a new verse to a deck by typing or pasting its reference and wording, so that I can build the deck from my church's material.
6. As a learner, I want a deck verse to be a single verse or a range recited as one (e.g. João 1:1-3), so that it matches how my church memorizes it.
7. As a learner, I want to enter an excerpt of a verse as its wording, so that I memorize exactly the part my church quotes.
8. As a learner, I want leading or trailing ellipses in an excerpt to be ignored when I recite, so that "…" never counts against me.
9. As a learner, I want to add a Verse Note such as "Verbo = Palavra", so that I see the gloss without having to recite it.
10. As a learner, I want to add a verse that is already in my library to a deck, so that I don't create duplicates.
11. As a learner, I want one verse to belong to several decks, so that a verse can be in my catechism deck and in a personal deck.
12. As a learner, I want to add Deck Sections (e.g. "1º Tópico – Jesus, sua vida e sua obra"), so that a long deck reads like the catechism.
13. As a learner, I want to rename and remove sections, so that I can fix the structure.
14. As a learner, I want to move verses up and down, and between sections, so that the deck follows the right order.
15. As a learner, I want to remove a verse from a deck without deleting it from my library, so that I keep my progress.
16. As a learner, I want to rename a deck and edit its description, so that it stays accurate.
17. As a learner, I want to open a deck and see its verses in order, grouped by section, so that I can study it as a whole.
18. As a learner, I want to tap a verse in a deck to recite it, so that the deck is a starting point for practice.
19. As a learner, I want to still filter my Home Screen by deck, so that the quick filter I'm used to keeps working.
20. As a learner, I want to share a deck through my phone's share sheet, so that I can send it on WhatsApp to my small group.
21. As a recipient without the app, I want the shared message to show the verses in readable form, so that the message is useful even before installing.
22. As a recipient, I want to tap "Importar deck" after copying the message, so that the app reads my clipboard only when I ask.
23. As a learner, I want the app to stop reading my clipboard on its own, so that I'm never interrupted by paste prompts.
24. As a recipient, I want to preview the deck (name, sections, verses, versions) before importing, so that I know what I'm adding.
25. As a recipient, I want the preview and the deck to say "Texto fornecido por quem compartilhou este deck", so that I know where the wording came from.
26. As a recipient who already has a verse in different wording, I want to choose between the deck's wording (default) and mine, so that I can recite the same text as my church.
27. As a recipient switching to the deck's wording, I want to keep my Memory Tier and schedule for that verse, so that I don't lose progress over a small wording change.
28. As a recipient, I want verses I already have in the same wording to be linked rather than duplicated, so that my library stays clean.
29. As a recipient, I want an imported deck to stay faithful to its source (no local reordering or editing), so that everyone in my church recites the same thing.
30. As a recipient, I want to duplicate a received deck as my own, so that I can customize a copy.
31. As a recipient, I want to forward a received deck to others, so that the church's deck spreads unchanged.
32. As a recipient of an updated deck, I want the app to recognize it as the same deck and show what changed (new verses, updated wording, removed verses, reordering) before applying, so that I'm never surprised.
33. As a recipient, I want applying an update never to delete my verses or progress, so that updates are safe.
34. As a recipient importing an older or identical version, I want to be told I already have the latest, so that nothing is duplicated.
35. As a learner deleting a deck, I want to choose between deleting only the deck and deleting the deck plus the verses that are only in it, so that I control what is lost.
36. As a learner deleting a deck, I want verses that are also in other decks never to be deleted, so that other decks stay intact.
37. As a learner deleting a verse, I want the confirmation to tell me how many decks it is in, so that I understand the impact.
38. As a learner with `#tag` decks from before, I want them converted to real decks automatically, in the order I added the verses, so that nothing is lost.
39. As a learner sharing a deck I edited, I want recipients who import the new message to get it as an update of the same deck, so that my small group stays in sync.
40. As a learner, I want a deck code that has been corrupted or truncated to give a clear error, so that I know to ask for it again.
41. As a recipient of a deck shared from an older app version, I want it to still import, so that old messages keep working.
42. As a learner pasting a verse copied from YouVersion (pt or en), I want the reference, wording and version label filled in correctly, so that adding my church's verses is quick.
43. As the product owner, I want no shared deck to point at a domain we don't own, so that links can't be hijacked.
44. As the product owner, I want decks to travel inside the message without any server storing them, so that no religious content is hosted by us (ADR 0002/0019/0020).

## Implementation Decisions

**Deck Library (new deep module, the primary seam)**
- **Ownership:** one module owns Decks and their membership. It sits behind the existing storage adapter, under its own key, and collaborates with the Verse Engine for verse creation, lookup, text changes and deletion. The Verse Engine stays the owner of verses, scheduling and the Review Log.
- **Deck record:**
  - id, name, optional description, optional default version;
  - origin: `own` or `received`;
  - for received decks, the source deck id and the source `updatedAt`;
  - for own decks, its own `updatedAt`, bumped on every structural or wording edit;
  - an **ordered list of entries**, where an entry is either a Deck Section heading or a verse reference by verse id.

  A Deck Section is the run of verse entries that follows its heading.
- **Interface (small):**
  - **Own Deck editing:** create, rename and describe, set default version, add a new verse, add an existing verse, add/rename/remove section, move an entry up or down, remove a verse from the deck;
  - **lifecycle:** delete (`deckOnly` | `deckAndExclusiveVerses`), duplicate as own;
  - **sharing:** export for sharing;
  - **importing:** preview an import, which returns an **import plan**, and apply an import plan with the learner's conflict choices;
  - **reading:** list decks with Memory Tier counts, and get one deck with its entries resolved to verses.
- **Received Decks reject every editing operation.** Only delete, duplicate, export (forward) and apply-update are allowed.
- **Verse identity on import:** a match is the same canonical reference, through the catalog's reference resolution. Same reference with the same normalized wording means link the existing verse. Same reference with different wording is a **conflict**.
- **Conflict resolution "use the deck's wording":**
  - it updates the existing verse's text, version label and Verse Note;
  - it keeps its SRS state, and therefore its Memory Tier;
  - it appends a `text-change` row to the Review Log, with the before and after text hashes and the deck id.

  "Keep mine" links the learner's verse as is.
- **Updates:** importing a payload whose source id matches a Received Deck compares `updatedAt`.
  - Older or equal → "already up to date".
  - Newer → an update plan listing new verses, wording conflicts and updates, entries removed from the deck, and order or section changes.
  - Applying never deletes verses from the library. Removed entries only leave the deck.
- **Importing your own deck:** if the payload's id matches an Own Deck the learner made, the import is treated as an update of that Own Deck, and the summary is shown.
- **Migration:** on first load, every distinct legacy verse `deck` tag becomes an Own Deck, with verses ordered by creation time, and the tag is cleared. It is idempotent. No migration UI (no users).

**Verse changes (Verse Engine)**
- `Verse` gains an optional **Verse Note**, shown under the verse and never part of recitation, grading, Cloze or Speech Synthesis.
- Deleting a verse removes it from every Deck. The Deck Library exposes how many decks contain a verse, for the confirmation copy.
- Excerpts need no special type: their text is stored as given. Ellipsis tokens already produce no comparable words in the diff, so verify with a test.

**Deck payload and message (pure codec, extending the existing deck-sharing utility)**
- **Version 2 payload:** version marker, deck id, `updatedAt`, name, description, default version, and ordered entries (section headings, and verses with reference, text, version label and optional note). It is encoded as URL-safe base64 of JSON.
- **Version 1 payloads** (name plus flat verses) still decode, and import as a new Received Deck with no sections.
- **Share message:**
  - the deck name and description;
  - the readable verses grouped by section, each with its version label;
  - the line "Texto fornecido por quem compartilhou este deck" (with an en equivalent for en decks);
  - short instructions ("Copie esta mensagem e toque em Importar deck no app") and the code.
- **Link:** no `https://voice-scripture.app` link and no other domain. Once a domain exists, a later ticket adds an `https` link (ADR 0019/0020).
- **Extraction:** pulls the code out of a pasted message, accepting either the code alone or a whole message, and rejects corrupted or truncated codes with a clear error.

**UI**
- **Decks screen:** reached from the Home Screen. It lists Own and Received Decks (received ones marked as such) with Memory Tier progress, and has a "Novo deck" action and an **"Importar deck"** action.
- **Deck detail:**
  - entries in order with section headings, each verse showing its version label, Memory Tier and note;
  - tapping a verse opens recitation;
  - Own Decks have edit affordances (add verse new/existing, add section, move up/down, remove from deck, rename, default version);
  - Received Decks show the provenance line and the actions forward, duplicate and delete.
- **Add/edit verse:** gains a Verse Note field and, when opened from a deck, prefills the deck's default version and adds the verse to that deck. Range references keep working.
- **Import flow:**
  - "Importar deck" reads the clipboard **only on that tap** (consider the platform paste button where available);
  - then it shows the preview, or the update summary, with per-conflict choices defaulting to the deck's wording, and the provenance line;
  - then it applies.
- **Removing clipboard polling:** the Home Screen's automatic clipboard check on mount and foreground is removed.
- **Delete flows:**
  - deleting a deck offers the two modes (default "only the deck");
  - deleting a verse states how many decks contain it.
- **Home filter:** the deck filter chips filter by Deck membership.
- **Copy:** new copy is pt/en, following existing conventions and DESIGN.md.

**YouVersion paste fidelity**
- Add tests with real YouVersion share texts (pt and en, single verse and range, several versions such as ARA, NVI, NVT, NAA, BLIVRE, KJV, NIV). Fix whatever the parser gets wrong.
- Version labels are kept as labels, without auto-fetching bundled text for non-bundled labels. This builds on ticket 82.

## Testing Decisions

**What a good test looks like.** Tests drive behavior through the highest seam and assert observable results:
- deck contents and order;
- verse wording, version, note, Memory Tier and schedule;
- Review Log rows;
- what screens show.

Payload internals are never asserted except at the codec seam.

**Seams (agreed):**
1. **Deck Library**, the primary seam. It runs headless with the map storage adapter and a real Verse Engine, and covers:
   - Own Deck editing, sections and ordering;
   - multi-deck membership;
   - remove-from-deck vs delete;
   - both delete modes, with shared verses protected;
   - export → preview → apply round trips;
   - linking same-wording verses;
   - conflicts (deck wording keeps SRS and logs `text-change`; keep mine);
   - Received Decks rejecting edits;
   - duplicating as own;
   - updates (newer applies with a correct summary, older or equal is "up to date", removed entries leave the deck but not the library);
   - importing your own deck as an update;
   - legacy tag migration (idempotent).

   Prior art: the Verse Engine suite with the map storage adapter.
2. **Deck codec**, for v2 round trips, v1 compatibility, corrupted and truncated codes, extraction from a whole pasted message, and the message containing no domain. Prior art: the existing deck-sharing suite.
3. **Screens**, for:
   - the Decks screen list and progress;
   - deck detail for own vs received;
   - the "Importar deck" tap reading the clipboard, and no clipboard read on mount or foreground;
   - the preview with the provenance line and conflict choices;
   - the update summary;
   - the note field and add-to-deck;
   - the deck and verse delete confirmations.

   Prior art: the Home Screen and Shared Deck Modal suites.
4. **Clipboard parser**, with real YouVersion share texts. Prior art: the existing parser suite.

The full suite must stay green.

## Out of Scope

- Pasting a whole catechism at once and splitting it into verses automatically (revisit after the owner builds the catechism by hand).
- Catechism question-and-answer items.
- `https` links and Universal/App Links (needs the domain and ADR 0019's edge function).
- A QR code (a 30-verse deck doesn't fit).
- "Recite the due verses of this deck" (needs the review queue).
- Leader dashboards and group totals (need stored shared state; a separate ADR).
- Any server storing decks.
- Licensing of the texts that learners share. The provenance line is shown, but get legal advice before launch.

## Further Notes

- **No migration needed:** the app has no users, so data migrations can be silent.
- **Size:** a 30-verse catechism produces a code of a few kilobytes, which fits comfortably in a WhatsApp message.
- **Licensing:** decks carry text a learner supplies. The app never adds bundled text to a shared deck unless the learner chose a bundled version for that verse.
