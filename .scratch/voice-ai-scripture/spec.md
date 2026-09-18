---
labels: ["ready-for-agent"]
---

# Specification: Verse Removal & Deletion Confirmation Modal

## Problem Statement

Users actively add scripture verses to their memory repository through various channels (manual typing, YouVersion clipboard import, topical packs, and the guided Bible reference picker). Inevitably, users add verses by mistake, mistype citations, change their study focus, or decide they no longer wish to maintain certain verses in their daily review queue.

Currently, there is no way to remove an inserted verse from the application. Once a verse is saved, it remains permanently in `AsyncStorage`, appears in the review queue whenever due, and clutters the user's repository. This causes frustration, artificial review burdens, and prevents users from curating their personal memorization deck.

## Solution

Provide a clean, safe, and thumb-friendly **Verse Removal** flow:
1. **Dedicated Trash Button on Verse Cards**:
   - Each verse card on the Home Screen features a discrete, accessible delete action icon (`🗑️`) isolated in the upper-right corner.
   - Touching the delete action does not trigger the card's practice session.
2. **Accessible In-App Confirmation Modal (`DeleteConfirmationModal`)**:
   - Tapping the delete action opens an explicit confirmation dialog.
   - The modal identifies the exact verse reference being deleted (e.g. "Filipenses 4:6-7") and warns that all memorization history and Spaced Repetition (SRS) streak data will be permanently removed.
   - Provides clear, high-contrast `Cancelar` (dismiss) and `Excluir definitivamente` (destructive red) buttons.
3. **Immediate Hard Deletion & State Recalculation**:
   - Confirming deletion invokes `VerseEngine.deleteVerse`, which immediately removes the verse from storage.
   - The Home Screen reloads its list and updates the `All` and `Due` tab counters without requiring a page reload.
   - If the deleted verse was imported from a Topical Pack, the user is free to re-import it later if desired.

## User Stories

1. As a believer curating my memorization deck, I want to delete a verse I added by accident, so that it no longer appears in my daily review queue.
2. As a user reviewing my verse cards on the Home Screen, I want to see a clear delete action on each card, so that I can initiate removal without digging through sub-menus.
3. As a mobile user tapping with my thumb, I want the delete button isolated from the main card touch area, so that I don't accidentally start a recitation review session when trying to delete.
4. As a user tapping the delete button, I want an explicit confirmation modal to pop up, so that accidental taps do not immediately destroy my verse.
5. As a user viewing the confirmation modal, I want to see the specific biblical citation displayed in the dialog, so that I can double-check which verse I am about to delete.
6. As a user who has built a streak on a verse, I want the confirmation modal to warn me that progress and streaks will be lost, so that I can make an informed decision before proceeding.
7. As a user who tapped delete by mistake, I want a prominent "Cancelar" button in the confirmation modal, so that I can safely dismiss the dialog and keep my verse intact.
8. As a user tapping "Excluir definitivamente", I want the modal to close and the verse to disappear immediately from the list, so that the action feels instantaneous and responsive.
9. As a user in the "Due" tab who deletes a due verse, I want the due count badge to decrement immediately, so that the counter accurately reflects my pending review workload.
10. As a user in the "All" tab who deletes a verse, I want the total verse count to decrement immediately, so that my repository totals remain accurate.
11. As a user who deletes the very last due verse, I want the empty state message ("All caught up for today!") to appear automatically, so that I know my queue is clear.
12. As a user who deletes the only verse in my repository, I want the general empty state ("No verses added yet") to appear automatically, so that I am guided to add new verses.
13. As a user running the app on a web browser, I want the deletion confirmation modal to render cleanly as an in-app overlay, so that behavior is consistent across desktop and mobile.
14. As a user using screen readers or assistive technology, I want the delete button to have an accessible label indicating which verse will be removed, so that I have clear context before activating it.
15. As a user who previously imported a verse from a Topical Pack and deleted it, I want to be able to re-import that verse from the Topical Pack browser later if I change my mind, so that deletion is never an irreversible lockout.

## Implementation Decisions

1. **Hard Deletion Semantics (`VerseEngine.deleteVerse`)**:
   - `VerseEngine` will expose a `deleteVerse(id: string): Promise<boolean>` method.
   - It searches the stored verse collection for a verse matching the given `id`.
   - If found, it filters out the record and persists the updated array to storage, returning `true`.
   - If not found, it leaves storage intact and returns `false`.
2. **Cross-Platform In-App Confirmation Modal (`DeleteConfirmationModal`)**:
   - Implemented as a reusable React Native `Modal` component rather than platform-varying `Alert.alert`.
   - Accepts `visible: boolean`, `verse: Verse | null`, `onConfirm: () => void`, and `onCancel: () => void`.
   - Renders a semi-transparent backdrop, centered dialog card, clear title ("Excluir versículo?"), descriptive text with the canonical reference and streak warning, and two accessible action buttons.
3. **Card Layout & Event Decoupling in `HomeScreen`**:
   - The verse card `TouchableOpacity` handles navigation to `ReviewScreen`.
   - Within the card header, a nested or adjacent `TouchableOpacity` with `testID="delete-verse-{id}"` and `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` triggers the deletion confirmation.
   - Prevents bubbling into the practice session.
4. **State Refresh & Synchronization**:
   - Upon successful confirmation, `loadVerses()` is called on `HomeScreen`.
   - Automatically recalculates `VerseSummary` (`allVerses`, `dueVerses`, `dueCount`).
   - If daily reminder notifications are active, `ReminderService` synchronizes naturally with the updated counts.
5. **Topical Pack Re-import Compatibility**:
   - `VerseEngine.importVerses` checks existing references. Because the deleted verse reference no longer exists in storage, re-importing the pack later will cleanly allow re-adding the verse.

## Testing Decisions

1. **Unit / Logic Tests (`VerseEngine.test.ts`)**:
   - Test that `deleteVerse(id)` removes the target verse from `MapStorageAdapter` while preserving other verses.
   - Test that `deleteVerse(id)` returns `true` when a verse is successfully removed and `false` when the ID does not exist.
   - Test that `getVersesSummary()` accurately reflects the updated counts and due lists after a deletion.
2. **Component Tests (`DeleteConfirmationModal.test.tsx`)**:
   - Test that the modal displays the verse reference and streak warning when `visible=true`.
   - Test that tapping "Cancelar" calls `onCancel` without triggering deletion.
   - Test that tapping "Excluir definitivamente" calls `onConfirm`.
3. **Integration Tests (`HomeScreen.test.tsx`)**:
   - Test that each verse card renders the delete button.
   - Test that clicking delete opens the confirmation modal with the correct verse reference.
   - Test that confirming deletion removes the card from the UI, updates the `All` and `Due` tab headers, and shows the empty state when the last verse is removed.
   - Test that canceling dismissal leaves the verse card in the list.

## Out of Scope

- Trash bin / Soft-delete recovery tab (deleted verses are permanently removed; can be re-added or re-imported manually).
- Multi-verse batch selection / bulk deletion (verses are removed individually).
- Custom undo snackbar with timer (explicit modal confirmation is used instead).

## Further Notes

- Aligns with ADR 0009 (`docs/adr/0009-hard-deletion-with-custom-confirmation-modal.md`) and the ubiquitous domain term **Verse Removal** in `CONTEXT.md`.
