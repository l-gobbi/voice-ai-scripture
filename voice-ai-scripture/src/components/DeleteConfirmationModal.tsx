import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Verse, getMemoryTier, memoryTierLabel } from '../services/VerseEngine';
import { scriptureCatalog } from '../services/ScriptureCatalog';
import { colors, typography, spacing, radius, touchTarget } from '../theme/tokens';

export interface DeleteConfirmationModalProps {
  visible: boolean;
  verse?: Verse | null;
  reference?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({
  visible,
  verse,
  reference,
  onConfirm,
  onCancel,
}: DeleteConfirmationModalProps) {
  if (!visible || (!verse && !reference)) {
    return null;
  }

  const targetReference = verse?.reference ?? reference ?? '';
  const tierLabel = verse
    ? memoryTierLabel(getMemoryTier(verse), scriptureCatalog.detectLanguage(verse))
    : null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback testID="delete-modal-backdrop" onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.dialog}>
              <Text style={styles.title}>Excluir versículo?</Text>

              {verse || reference ? (
                <View style={styles.verseInfoContainer}>
                  <Text style={styles.referenceText}>
                    {targetReference}
                    {verse?.translation ? (
                      <Text style={styles.translationText}> [{verse.translation}]</Text>
                    ) : null}
                  </Text>
                  {tierLabel ? (
                    <Text style={styles.tierText} testID="delete-modal-memory-tier">
                      {tierLabel}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <Text style={styles.warningText}>
                Esta ação removerá permanentemente o versículo e todo o histórico de repetição espaçada. Não é possível desfazer.
              </Text>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                  testID="cancel-delete-button"
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar exclusão"
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.confirmButton]}
                  onPress={onConfirm}
                  testID="confirm-delete-button"
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir definitivamente ${targetReference}`.trim()}
                >
                  <Text style={styles.confirmButtonText}>Excluir definitivamente</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.parchment.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.parchment.border,
    padding: spacing.lg,
    shadowColor: colors.parchment.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontFamily: typography.fontFamily.scripture,
    fontSize: typography.heading.fontSize,
    lineHeight: typography.heading.lineHeight,
    fontWeight: typography.heading.fontWeight,
    color: colors.parchment.textPrimary,
    marginBottom: spacing.md_sm,
  },
  verseInfoContainer: {
    backgroundColor: colors.parchment.surfaceMuted,
    padding: spacing.md_sm,
    borderRadius: radius.md,
    marginBottom: spacing.md_sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.parchment.diffMissedText,
  },
  referenceText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.subheading.fontSize,
    fontWeight: typography.subheading.fontWeight,
    color: colors.parchment.textPrimary,
  },
  translationText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    color: colors.parchment.accentSacred,
  },
  tierText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: typography.caption.fontWeight,
    color: colors.parchment.textSecondary,
    marginTop: spacing.xs,
  },
  warningText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.parchment.textSecondary,
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  button: {
    minHeight: touchTarget.min,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.parchment.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.parchment.border,
  },
  cancelButtonText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.parchment.textPrimary,
  },
  confirmButton: {
    backgroundColor: colors.parchment.diffMissedText,
  },
  confirmButtonText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: '#ffffff',
  },
});
