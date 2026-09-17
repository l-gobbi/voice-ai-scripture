import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VerseStorageService, Verse } from '../services/VerseStorageService';
import { isVerseDue } from '../engines/srsEngine';
import ReviewScreen from './ReviewScreen';
import PackBrowserModal from '../components/PackBrowserModal';
import ReminderSettingsModal from '../components/ReminderSettingsModal';

export default function HomeScreen() {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [packBrowserVisible, setPackBrowserVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [reference, setReference] = useState('');
  const [text, setText] = useState('');
  const [activeReviewVerse, setActiveReviewVerse] = useState<Verse | null>(null);

  const [filterMode, setFilterMode] = useState<'all' | 'due'>('due');

  const loadVerses = async () => {
    const data = await VerseStorageService.getAllVerses();
    setVerses(data);
  };

  useEffect(() => {
    loadVerses();
  }, []);

  const handleSave = async () => {
    if (!reference || !text) return;
    await VerseStorageService.addVerse({ reference, text });
    setReference('');
    setText('');
    setModalVisible(false);
    await loadVerses();
  };

  if (activeReviewVerse) {
    return (
      <ReviewScreen
        verse={activeReviewVerse}
        onComplete={() => {
          setActiveReviewVerse(null);
          loadVerses();
        }}
      />
    );
  }

  // Filter verses using domain predicate (single pass)
  const now = new Date();
  const dueVerses = verses.filter((v) => isVerseDue(v.srs?.nextReviewDate, now));
  const displayedVerses = filterMode === 'due' ? dueVerses : verses;
  const dueCount = dueVerses.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>My Memory Verses</Text>
        <TouchableOpacity
          style={styles.reminderHeaderButton}
          onPress={() => setReminderModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.reminderButtonText}>⏰ Reminders</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs for User Story 6 (Daily Due Dashboard) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, filterMode === 'due' && styles.activeTabButton]}
          onPress={() => setFilterMode('due')}
        >
          <Text style={[styles.tabText, filterMode === 'due' && styles.activeTabText]}>
            🔥 Due Today ({dueCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, filterMode === 'all' && styles.activeTabButton]}
          onPress={() => setFilterMode('all')}
        >
          <Text style={[styles.tabText, filterMode === 'all' && styles.activeTabText]}>
            📚 All ({verses.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={displayedVerses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const streak = item.srs?.streak ?? item.srs?.repetitions;
          return (
            <TouchableOpacity 
              style={styles.verseCard} 
              onPress={() => setActiveReviewVerse(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.verseReference}>{item.reference}</Text>
                {streak !== undefined && streak > 0 && (
                  <Text style={styles.streakBadge}>Streak: {streak}</Text>
                )}
              </View>
              <Text style={styles.tapPrompt}>Tap to practice →</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {filterMode === 'due'
              ? '🎉 All caught up for today! No verses due.'
              : 'No verses added yet. Add one below!'}
          </Text>
        }
      />

      <View style={styles.footerButtons}>
        <View style={styles.buttonSpacing}>
          <Button 
            title="📖 Browse Topical Packs" 
            color="#4f46e5" 
            onPress={() => setPackBrowserVisible(true)} 
          />
        </View>
        <View style={styles.buttonSpacing}>
          <Button title="+ Type Custom Verse" color="#4b5563" onPress={() => setModalVisible(true)} />
        </View>
      </View>

      <PackBrowserModal
        visible={packBrowserVisible}
        onClose={() => setPackBrowserVisible(false)}
        onImportComplete={loadVerses}
      />

      <ReminderSettingsModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
      />

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <Text style={styles.modalHeader}>Add New Verse</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Reference (e.g. John 3:16)"
            value={reference}
            onChangeText={setReference}
          />
          
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Verse text..."
            value={text}
            onChangeText={setText}
            multiline
          />
          
          <View style={styles.modalButtons}>
            <Button title="Cancel" color="red" onPress={() => setModalVisible(false)} />
            <Button title="Save Verse" onPress={handleSave} />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  reminderHeaderButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  reminderButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338ca',
  },
  verseCard: { 
    padding: 16, 
    backgroundColor: 'white', 
    borderRadius: 8, 
    marginBottom: 10, 
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verseReference: { fontSize: 18, fontWeight: '600', color: '#1f2937' },
  streakBadge: { fontSize: 12, backgroundColor: '#e0e7ff', color: '#4338ca', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, fontWeight: '600' },
  tapPrompt: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#6b7280' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#1e293b',
  },
  footerButtons: {
    paddingBottom: 36, // Generous padding so Android home/nav bar never overlaps buttons
    paddingTop: 12,
  },
  buttonSpacing: {
    marginBottom: 12,
  },
  modalContainer: { flex: 1, padding: 24, justifyContent: 'center' },
  modalHeader: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 }
});
