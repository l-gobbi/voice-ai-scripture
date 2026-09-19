# 33: Deck Collections, Home Screen Filters, and Viral Deck Sharing

**What to build:**  
Lightweight deck organization and a viral sharing pipeline that lets users share custom verse decks with church friends, Bible study groups, and families. Verses can be tagged with a `#Deck` name (e.g. `"Peace in Anxiety"`, `"Romans Road"`). The Home Screen provides quick filter pills to view individual decks. Tapping "Share Deck" opens the native OS share sheet (`Share.share`) containing formatted, human-readable scripture text and a universal import URL (`https://voice-scripture.app/i#<payload>`). When another user opens the app with a shared link or copied payload, the app automatically detects it and displays a `SharedDeckModal` with a 1-tap `[Import All Verses]` button.

**Blocked by:** 30: Global Daily Streak & Habit Progress Banner

**Status:** resolved

- [x] `Verse` entity supports an optional `deck?: string` tag in `VerseEngine`.
- [x] Users can assign or edit a deck tag when adding or editing verses.
- [x] Home Screen displays filter pills along the top for active `#Deck` collections alongside `Due Today` and `All`.
- [x] Filtering by a deck displays a prominent `📤 Share Deck` action.
- [x] Pure utility `deckSharing.ts` encodes and decodes deck payloads into compact, URL-safe base64 strings with error handling for corrupted inputs.
- [x] `deckSharing.generateShareMessage()` produces a dual-format message: readable verse quotations for non-app users + universal import link.
- [x] `Share.share` is invoked with the formatted payload when tapping "Share Deck".
- [x] App checks clipboard for shared deck links on launch or focus and opens `SharedDeckModal`.
- [x] `SharedDeckModal` previews the deck title, creator note, and individual verses with checkboxes.
- [x] Tapping "Import All" calls `VerseEngine.importDeck()`, adds the verses under that deck tag, and updates the Home Screen.
- [x] All encoding, decoding, and modal interactions are verified with unit tests in `deckSharing.test.ts` and integration tests in `HomeScreen.test.tsx`.
