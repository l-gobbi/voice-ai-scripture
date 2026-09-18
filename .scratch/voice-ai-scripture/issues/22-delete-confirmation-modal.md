# 22: Cross-Platform Delete Confirmation Modal (DeleteConfirmationModal)

**What to build:**
Create an accessible, cross-platform React Native modal dialog component (`DeleteConfirmationModal`) that warns users when they attempt to delete a verse. The modal must clearly display the biblical reference of the verse being deleted, warn that memorization history and streak data will be lost, and provide high-contrast "Cancelar" and "Excluir definitivamente" buttons.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Create `src/components/DeleteConfirmationModal.tsx` accepting `visible`, `verse` (or `reference`), `onConfirm`, and `onCancel` props
- [ ] Render a semi-transparent overlay backdrop with a centered, rounded alert container
- [ ] Display dialog title "Excluir versículo?" and display the target verse's citation
- [ ] Display clear warning that memorization streak and Spaced Repetition progress will be lost
- [ ] Render a neutral "Cancelar" button that calls `onCancel`
- [ ] Render a high-contrast destructive "Excluir definitivamente" button that calls `onConfirm`
- [ ] Add component tests in `DeleteConfirmationModal.test.tsx` verifying visibility, text content, cancel, and confirm interactions
