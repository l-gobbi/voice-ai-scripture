# 23: Home Screen Card Deletion Integration

**What to build:**
Integrate the delete button and confirmation modal into `HomeScreen`. Each verse card will feature an isolated delete action button (`🗑️`). Activating this button must open `DeleteConfirmationModal` without triggering the recitation practice screen. Confirming deletion removes the verse via `verseEngine.deleteVerse`, refreshes the Home Screen list and counters, and gracefully displays empty state messages when the last verse is removed.

**Blocked by:** 21 (Domain Method for Verse Removal), 22 (Cross-Platform Delete Confirmation Modal)

**Status:** closed

- [x] Add an isolated delete touchable button (`🗑️` or icon) on each verse card header with `testID="delete-verse-{id}"` and accessible labeling
- [x] Ensure tapping the delete button does NOT trigger the card's `activeReviewVerse` navigation
- [x] Connect `DeleteConfirmationModal` in `HomeScreen`, tracking the active `verseToDelete` in state
- [x] On confirmation, call `await verseEngine.deleteVerse(verse.id)`, close modal, and refresh list via `loadVerses()`
- [x] Ensure tab counters (`📚 All (N)` and `⏳ Due (N)`) update immediately after deletion
- [x] Ensure empty states render appropriately when all due verses or all verses are deleted
- [x] Add integration tests in `HomeScreen.test.tsx` verifying card delete button rendering, modal trigger, cancel flow, confirm deletion, and counter updates
