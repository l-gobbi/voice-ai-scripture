# ADR 0009: Hard Deletion of Verses with Explicit Confirmation Modal

## Status
Accepted

## Context
As users add verses into their local memory repository (manually, via clipboard, via the Bible reference picker, or from topical packs), they need the ability to remove verses they no longer wish to memorize, or that were added by mistake.

Two primary dimensions were evaluated:
1. **Deletion Semantics**: Hard Delete (permanent removal from storage) vs Soft Delete / Archiving (flagging records as inactive and hiding them from review queues).
2. **Confirmation UX**: Platform native dialog (`Alert.alert`) vs in-app confirmation modal (`<DeleteConfirmationModal>`).

## Decision
1. **Hard Deletion (`VerseEngine.deleteVerse`)**:
   - Deleting a verse immediately and permanently removes its record and associated Spaced Repetition (SRS) state from local storage (`AsyncStorage`).
   - If a deleted verse originated from a Topical Pack, the user is free to re-import it later if desired.
2. **Dedicated Confirmation Modal (`DeleteConfirmationModal`)**:
   - To guard against accidental deletion on mobile touchscreens without relying on platform-inconsistent alerts (e.g. `Alert.alert` behaving differently on web versus iOS/Android), an explicit, accessible modal dialog is rendered.
   - The modal clearly displays the canonical reference being removed and informs the user that memorization streak and history will be lost.
3. **Card Layout Separation**:
   - The trash button is an isolated touchable in the header of each card with dedicated hit-slop and accessibility labels, preventing accidental opening of the recitation practice screen.

## Consequences
- **Positive**: Clean, predictable storage footprint ($0 waste); consistent cross-platform behavior between mobile and web; 100% testable via standard component test harnesses.
- **Negative**: No undo history; once confirmed, memorization streak cannot be recovered unless re-memorized from scratch.
