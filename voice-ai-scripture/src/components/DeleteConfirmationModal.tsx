import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Verse } from '../services/VerseEngine';

export interface DeleteConfirmationModalProps {
  visible: boolean;
  verse: Verse | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({
  visible,
  verse,
  onConfirm,
  onCancel,
}: DeleteConfirmationModalProps) {
  if (!verse && !visible) {
    return null;
  }

  const streak = verse?.srs?.streak ?? 0;

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

              {verse ? (
                <View style={styles.verseInfoContainer}>
                  <Text style={styles.referenceText}>
                    {verse.reference}
                    {verse.translation ? (
                      <Text style={styles.translationText}> [{verse.translation}]</Text>
                    ) : null}
                  </Text>
                  {streak > 0 ? (
                    <Text style={styles.streakText}>🔥 Streak atual: {streak}</Text>
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
                  accessibilityLabel={`Excluir definitivamente ${verse?.reference ?? ''}`}
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
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  verseInfoContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  referenceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  translationText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#4f46e5',
  },
  streakText: {
    fontSize: 13,
    color: '#ea580c',
    marginTop: 4,
    fontWeight: '500',
  },
  warningText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    backgroundColor: '#dc2626',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
