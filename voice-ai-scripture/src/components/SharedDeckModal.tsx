import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SharedDeckPayload, SharedDeckVerse } from '../utils/deckSharing';
import { colors, typography, spacing, radius, touchTarget } from '../theme/tokens';

export interface SharedDeckModalProps {
  visible: boolean;
  deck: SharedDeckPayload | null;
  onClose: () => void;
  onImport: (deckName: string, selectedVerses: SharedDeckVerse[]) => Promise<void>;
}

export default function SharedDeckModal({
  visible,
  deck,
  onClose,
  onImport,
}: SharedDeckModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (deck) {
      setSelectedIndices(new Set(deck.verses.map((_, i) => i)));
    } else {
      setSelectedIndices(new Set());
    }
  }, [deck]);

  if (!deck) {
    return null;
  }

  const toggleVerse = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleImport = async () => {
    const chosen = deck.verses.filter((_, i) => selectedIndices.has(i));
    if (chosen.length === 0) return;

    setIsImporting(true);
    try {
      await onImport(deck.name, chosen);
      onClose();
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = selectedIndices.size;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      testID="shared-deck-modal"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <Text style={styles.badgeText}>📦 Shared Deck</Text>
            </View>
            <Text style={styles.deckName}>{deck.name}</Text>
            {deck.note ? <Text style={styles.noteText}>"{deck.note}"</Text> : null}
            <Text style={styles.countText}>
              {selectedCount} of {deck.verses.length} verses selected
            </Text>
          </View>

          <ScrollView style={styles.versesList} contentContainerStyle={styles.versesListContent}>
            {deck.verses.map((verse, index) => {
              const isSelected = selectedIndices.has(index);
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.verseRow, isSelected && styles.verseRowSelected]}
                  onPress={() => toggleVerse(index)}
                  activeOpacity={0.7}
                  testID={`deck-verse-toggle-${index}`}
                >
                  <View style={styles.checkbox}>
                    <Text style={styles.checkboxText}>{isSelected ? '✅' : '⬜'}</Text>
                  </View>
                  <View style={styles.verseDetails}>
                    <View style={styles.refRow}>
                      <Text style={styles.verseRef}>{verse.ref}</Text>
                      {verse.trans ? (
                        <Text style={styles.transBadge}>[{verse.trans}]</Text>
                      ) : null}
                    </View>
                    <Text style={styles.verseSnippet} numberOfLines={2}>
                      "{verse.text}"
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.importButton,
                (selectedCount === 0 || isImporting) && styles.disabledButton,
              ]}
              testID="import-shared-deck-button"
              onPress={handleImport}
              disabled={selectedCount === 0 || isImporting}
              activeOpacity={0.8}
            >
              {isImporting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.importButtonText}>
                  Import Selected ({selectedCount})
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              testID="dismiss-shared-deck-button"
              onPress={onClose}
              disabled={isImporting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.parchment.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.parchment.border,
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    padding: spacing.lg,
    shadowColor: colors.parchment.textPrimary,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  header: {
    marginBottom: spacing.md_sm,
  },
  badgeRow: {
    alignSelf: 'flex-start',
    backgroundColor: colors.parchment.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  badgeText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.badge.fontSize,
    fontWeight: '700',
    color: colors.parchment.accentSacred,
  },
  deckName: {
    fontFamily: typography.fontFamily.scripture,
    fontSize: typography.heading.fontSize,
    fontWeight: 'bold',
    color: colors.parchment.textPrimary,
    marginBottom: spacing.xs,
  },
  noteText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    color: colors.parchment.textSecondary,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  countText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    color: colors.parchment.textSecondary,
    fontWeight: '500',
  },
  versesList: {
    marginVertical: spacing.sm,
  },
  versesListContent: {
    gap: spacing.sm,
  },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget.min,
    padding: spacing.md_sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.parchment.border,
    backgroundColor: colors.parchment.surface,
  },
  verseRowSelected: {
    borderColor: colors.parchment.accentSacred,
    backgroundColor: colors.parchment.surfaceMuted,
  },
  checkbox: {
    marginRight: spacing.md_sm,
  },
  checkboxText: {
    fontSize: 16,
  },
  verseDetails: {
    flex: 1,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  verseRef: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.subheading.fontSize,
    fontWeight: '700',
    color: colors.parchment.textPrimary,
  },
  transBadge: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.badge.fontSize,
    backgroundColor: colors.parchment.surfaceMuted,
    color: colors.parchment.textSecondary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.sm,
    fontWeight: '600',
  },
  verseSnippet: {
    fontFamily: typography.fontFamily.scripture,
    fontSize: typography.caption.fontSize,
    color: colors.parchment.textSecondary,
  },
  actions: {
    marginTop: spacing.md_sm,
    gap: spacing.sm,
  },
  importButton: {
    minHeight: touchTarget.min,
    backgroundColor: colors.parchment.accentSacred,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: colors.parchment.surfaceMuted,
  },
  importButtonText: {
    fontFamily: typography.fontFamily.ui,
    color: '#ffffff',
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  cancelButton: {
    minHeight: touchTarget.min,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: typography.fontFamily.ui,
    color: colors.parchment.textSecondary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
});
