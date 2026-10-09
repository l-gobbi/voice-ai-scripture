# 89: Share and Import Received Decks

**What to build:**
Share a Deck as a message, and import it as a Received Deck (ADR 0020).

**Sharing**
- **Payload v2:** versioned, URL-safe base64 JSON with the deck id, `updatedAt`, name, description, default version, and ordered entries (sections, and verses with reference, text, version label and note). v1 payloads still import, as a new Received Deck with no sections.
- **The share message** contains:
  - the readable verses grouped by section, each with its version label;
  - the line "Texto fornecido por quem compartilhou este deck" (en equivalent for en decks);
  - short instructions and the code.

  It has **no `voice-scripture.app` link and no domain at all**.

**Importing**
- Learners import with an **"Importar deck"** action on the Decks screen. It reads the clipboard **only on that tap**. The Home Screen's automatic clipboard check on mount and foreground is **removed**.
- **The preview** shows the name, sections, verses with versions and the provenance line.
- **Verse identity:** a verse with the same canonical reference and the same wording is linked, not duplicated.
- **Wording conflicts:** for a same reference with different wording, the learner chooses per conflict, defaulting to "use the deck's wording". That choice keeps the verse's SRS state and Memory Tier, updates its text, version and note, and appends a `text-change` Review Log row with the before and after text hashes and the deck id.
- **The result** is a Received Deck that rejects edits and shows the provenance line.

Corrupted or truncated codes give a clear error. See `spec-decks.md`.

**Blocked by:** 87: Build and Organize Own Decks

**Status:** ready-for-agent

- [ ] The deck codec round-trips v2, still decodes v1, extracts a code from a whole pasted message, rejects corrupted or truncated input, and the share message contains no domain.
- [ ] The Deck Library exports, previews (an import plan) and applies a new Received Deck, with linking, conflicts and choices. "Use the deck's wording" keeps SRS and logs `text-change`; "keep mine" links as is.
- [ ] "Importar deck" reads the clipboard only on tap. No clipboard read happens on mount or foreground (test).
- [ ] The preview UI shows the provenance line and per-conflict choices. The Received Deck detail shows the provenance line and no edit affordances.
- [ ] Deck Library, codec and screen tests cover all of the above.
