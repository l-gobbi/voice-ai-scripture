# 0020: Decks Travel Inside the Shared Message

## Status
Accepted.

## Context
Churches need to share a Deck, such as a catechism in a specific wording, with their members. Members mostly communicate over WhatsApp.

The app has no domain yet. The only server allowed is a small stateless edge function (ADR 0019), and learner content must not be hosted (ADR 0002). The previous sharing code linked to `voice-scripture.app`, a domain the project does not own.

## Decision
A Deck is shared as a message the learner sends from their phone. The message has three parts:
1. the readable verses, grouped by Deck Section;
2. a provenance line ("Texto fornecido por quem compartilhou este deck");
3. an encoded copy of the whole Deck.

The encoded copy is versioned, URL-safe base64 JSON. It carries the deck id and `updatedAt`, so that a newer message from the same source imports as an update.

The recipient imports by tapping "Importar deck", which reads the clipboard only on that tap. No server stores, indexes or relays Decks. The unowned domain link is removed. An `https` link that opens the app will be added only once the project owns a domain served by ADR 0019's function.

## Consequences
- **The encoding is a public format.** Decks shared in group chats live for years, so every future app version must keep decoding older payload versions.
- **Updates spread like the original did:** by re-sharing the message. There is no push or sync.
- **The app distributes no deck text.** The wording travels between people, which keeps the app out of hosting third-party (possibly copyrighted) text. Legal advice is still recommended before launch.
- **Shared state needs its own ADR.** Group features that need shared state (leader dashboards, group totals) are not possible under this decision.
