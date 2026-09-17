import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TOPICAL_PACKS, TopicalPack } from '../data/topicalPacks';
import { verseEngine } from '../services/VerseEngine';

interface PackBrowserModalProps {
  visible: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function PackBrowserModal({
  visible,
  onClose,
  onImportComplete,
}: PackBrowserModalProps) {
  const [selectedPack, setSelectedPack] = useState<TopicalPack | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async (pack: TopicalPack) => {
    setImporting(true);
    try {
      const addedCount = await verseEngine.importVerses(pack.verses);
      Alert.alert(
        'Topical Pack Imported! 🎉',
        addedCount > 0
          ? `Added ${addedCount} new verse(s) from "${pack.title}" to your memory verses!`
          : `All verses from "${pack.title}" are already in your memory verses!`,
        [
          {
            text: 'Great',
            onPress: () => {
              setImporting(false);
              setSelectedPack(null);
              onImportComplete();
              onClose();
            },
          },
        ]
      );
    } catch {
      setImporting(false);
      Alert.alert('Import Failed', 'Unable to save verses to storage.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <Button title="Done" onPress={onClose} />
          <Text style={styles.headerTitle}>Curated Topical Packs</Text>
          <View style={{ width: 50 }} />
        </View>

        {!selectedPack ? (
          // Pack List View
          <FlatList
            data={TOPICAL_PACKS}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.packCard}
                onPress={() => setSelectedPack(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.packIcon}>{item.icon}</Text>
                <View style={styles.packInfo}>
                  <Text style={styles.packTitle}>{item.title}</Text>
                  <Text style={styles.packDesc}>{item.description}</Text>
                  <Text style={styles.verseCount}>{item.verses.length} Verses (WEB)</Text>
                </View>
                <Text style={styles.chevron}>→</Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          // Pack Detail View
          <View style={styles.detailContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => setSelectedPack(null)}>
              <Text style={styles.backButtonText}>← Back to all topical packs</Text>
            </TouchableOpacity>

            <View style={styles.detailHeader}>
              <Text style={styles.detailIcon}>{selectedPack.icon}</Text>
              <Text style={styles.detailTitle}>{selectedPack.title}</Text>
              <Text style={styles.detailDesc}>{selectedPack.description}</Text>
            </View>

            <FlatList
              data={selectedPack.verses}
              keyExtractor={(item) => item.reference}
              contentContainerStyle={styles.verseList}
              renderItem={({ item }) => (
                <View style={styles.verseItem}>
                  <Text style={styles.verseRef}>{item.reference}</Text>
                  <Text style={styles.verseSnippet}>{item.text}</Text>
                </View>
              )}
            />

            <View style={styles.importActionWrapper}>
              <Button
                title={importing ? 'Importing...' : `Add All to My Verses (${selectedPack.verses.length})`}
                color="#4f46e5"
                onPress={() => handleImport(selectedPack)}
                disabled={importing}
              />
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  listContent: { padding: 16, gap: 12 },
  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  packIcon: { fontSize: 32, marginRight: 16 },
  packInfo: { flex: 1 },
  packTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  packDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 6 },
  verseCount: { fontSize: 12, color: '#4f46e5', fontWeight: '600' },
  chevron: { fontSize: 20, color: '#9ca3af', marginLeft: 8 },
  detailContainer: { flex: 1, padding: 16 },
  backButton: { marginBottom: 12 },
  backButtonText: { color: '#4f46e5', fontWeight: '600', fontSize: 15 },
  detailHeader: { alignItems: 'center', marginBottom: 16 },
  detailIcon: { fontSize: 40, marginBottom: 6 },
  detailTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  detailDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },
  verseList: { paddingBottom: 80 },
  verseItem: {
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  verseRef: { fontSize: 15, fontWeight: 'bold', color: '#374151', marginBottom: 4 },
  verseSnippet: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
  importActionWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 12,
    elevation: 4,
  },
});
