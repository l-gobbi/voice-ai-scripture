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
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  header: {
    marginBottom: 14,
  },
  badgeRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338ca',
  },
  deckName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#4b5563',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  countText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  versesList: {
    marginVertical: 10,
  },
  versesListContent: {
    gap: 8,
  },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  verseRowSelected: {
    borderColor: '#818cf8',
    backgroundColor: '#eef2ff',
  },
  checkbox: {
    marginRight: 12,
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
    gap: 6,
    marginBottom: 2,
  },
  verseRef: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  transBadge: {
    fontSize: 11,
    backgroundColor: '#e2e8f0',
    color: '#475569',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    fontWeight: '600',
  },
  verseSnippet: {
    fontSize: 13,
    color: '#4b5563',
  },
  actions: {
    marginTop: 14,
    gap: 10,
  },
  importButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#a5b4fc',
  },
  importButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
});
