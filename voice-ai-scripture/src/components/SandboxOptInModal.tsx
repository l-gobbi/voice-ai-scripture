import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, useColorScheme } from 'react-native';
import { Verse } from '../services/VerseEngine';
import { getTheme, touchTarget } from '../theme/tokens';

export interface SandboxOptInModalProps {
  visible: boolean;
  verse: Verse;
  onSave: () => void;
  onDismiss: () => void;
}

export default function SandboxOptInModal({
  visible,
  verse,
  onSave,
  onDismiss,
}: SandboxOptInModalProps) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      testID="sandbox-opt-in-modal"
      onRequestClose={onDismiss}
    >
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.modalTitle,
              { color: theme.colors.textPrimary },
            ]}
          >
            Add {verse.reference} to your memory verses?
          </Text>
          <Text
            style={[
              styles.modalDescription,
              { color: theme.colors.textSecondary },
            ]}
          >
            You've successfully tested all 3 tiers of recitation! Would you like to add this verse to your memory verses for daily spaced repetition?
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: theme.colors.accentSacred },
              ]}
              testID="sandbox-opt-in-save"
              onPress={onSave}
              activeOpacity={0.8}
            >
              <Text style={styles.modalPrimaryButtonText}>Add to My Verses</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                },
              ]}
              testID="sandbox-opt-in-dismiss"
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.modalSecondaryButtonText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Explore App without Saving
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalActions: {
    gap: 12,
  },
  modalButton: {
    minHeight: touchTarget.min,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
