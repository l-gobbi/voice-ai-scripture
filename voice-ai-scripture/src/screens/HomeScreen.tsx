import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { verseEngine, Verse, VerseSummary, HabitStats } from '../services/VerseEngine';
import ReviewScreen from './ReviewScreen';
import PackBrowserModal from '../components/PackBrowserModal';
import ReminderSettingsModal from '../components/ReminderSettingsModal';
import AddVerseModal from '../components/AddVerseModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import HabitBanner from '../components/HabitBanner';
import SandboxWelcomeCard from '../components/SandboxWelcomeCard';
import DailyDoneCard from '../components/DailyDoneCard';
import SharedDeckModal from '../components/SharedDeckModal';
import {
  extractDeckFromClipboard,
  generateShareMessage,
  SharedDeckPayload,
  SharedDeckVerse,
} from '../utils/deckSharing';
import { SpeechTranscriber } from '../services/SpeechTranscriber';

export function getNextReviewText(allVerses: Verse[], now: Date = new Date()): string {
  return verseEngine.getNextReviewMessage(allVerses, now);
}

interface HomeScreenProps {
  transcriber?: SpeechTranscriber;
}

export default function HomeScreen({ transcriber }: HomeScreenProps = {}) {
  const [summary, setSummary] = useState<VerseSummary>({
    allVerses: [],
    dueVerses: [],
    dueCount: 0,
  });
  const [habitStats, setHabitStats] = useState<HabitStats>({
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    completedTodayCount: 0,
    totalDueToday: 0,
    dueCount: 0,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [packBrowserVisible, setPackBrowserVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [verseToDelete, setVerseToDelete] = useState<Verse | null>(null);

  const [activeReviewVerse, setActiveReviewVerse] = useState<Verse | null>(null);
  const [sandboxVerse, setSandboxVerse] = useState<Verse | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'due'>('due');
  const [selectedDeckFilter, setSelectedDeckFilter] = useState<string | null>(null);
  const [detectedSharedDeck, setDetectedSharedDeck] = useState<SharedDeckPayload | null>(null);

  const loadVerses = async () => {
    const data = await verseEngine.getVersesSummary();
    const stats = await verseEngine.getHabitStats();
    setSummary(data);
    setHabitStats(stats);
  };

  const handleConfirmDelete = async () => {
    if (!verseToDelete) return;
    const toDelete = verseToDelete;
    setVerseToDelete(null);
    await verseEngine.deleteVerse(toDelete.id);
    await loadVerses();
  };

  useEffect(() => {
    loadVerses();
  }, []);

  useEffect(() => {
    const checkClipboardForDeck = async () => {
      try {
        const text = await Clipboard.getStringAsync();
        const extracted = extractDeckFromClipboard(text);
        if (extracted) {
          setDetectedSharedDeck(extracted);
        }
      } catch {
        // Ignore clipboard read errors
      }
    };
    checkClipboardForDeck();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkClipboardForDeck();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleShareCurrentDeck = async () => {
    if (!selectedDeckFilter) return;
    const deckVerses = summary.allVerses.filter((v) => v.deck === selectedDeckFilter);
    const payload: SharedDeckPayload = {
      name: selectedDeckFilter,
      verses: deckVerses.map((v) => ({
        ref: v.reference,
        text: v.text,
        trans: v.translation,
      })),
    };
    const message = generateShareMessage(payload);
    await Share.share({ message });
  };

  const handleImportSharedDeck = async (
    deckName: string,
    selectedVerses: SharedDeckVerse[]
  ) => {
    await verseEngine.importDeck(
      deckName,
      selectedVerses.map((v) => ({
        reference: v.ref,
        text: v.text,
        translation: v.trans,
      }))
    );
    await loadVerses();
  };

  if (sandboxVerse) {
    return (
      <ReviewScreen
        verse={sandboxVerse}
        isSandbox={true}
        transcriber={transcriber}
        onComplete={() => {
          setSandboxVerse(null);
          loadVerses();
        }}
        onSandboxComplete={async (verse, saveRequested) => {
          if (saveRequested) {
            await verseEngine.addVerse({
              reference: verse.reference,
              text: verse.text,
              translation: verse.translation,
            });
          }
          setSandboxVerse(null);
          await loadVerses();
        }}
      />
    );
  }

  if (activeReviewVerse) {
    return (
      <ReviewScreen
        verse={activeReviewVerse}
        transcriber={transcriber}
        onComplete={() => {
          setActiveReviewVerse(null);
          loadVerses();
        }}
      />
    );
  }

  const uniqueDecks = Array.from(
    new Set(summary.allVerses.map((v) => v.deck).filter((d): d is string => !!d))
  );

  const displayedVerses = selectedDeckFilter
    ? summary.allVerses.filter((v) => v.deck === selectedDeckFilter)
    : filterMode === 'due'
    ? summary.dueVerses
    : summary.allVerses;

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

      <HabitBanner
        currentStreak={habitStats.currentStreak}
        completedTodayCount={habitStats.completedTodayCount}
        totalDueToday={habitStats.totalDueToday}
      />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, filterMode === 'due' && styles.activeTabButton]}
          onPress={() => setFilterMode('due')}
        >
          <Text style={[styles.tabText, filterMode === 'due' && styles.activeTabText]}>
            🔥 Due Today ({summary.dueCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, filterMode === 'all' && styles.activeTabButton]}
          onPress={() => setFilterMode('all')}
        >
          <Text style={[styles.tabText, filterMode === 'all' && styles.activeTabText]}>
            📚 All ({summary.allVerses.length})
          </Text>
        </TouchableOpacity>
      </View>

      {uniqueDecks.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.deckFilterScrollView}
          contentContainerStyle={styles.deckFilterContainer}
        >
          {uniqueDecks.map((deck) => {
            const isSelected = selectedDeckFilter === deck;
            return (
              <TouchableOpacity
                key={deck}
                style={[styles.deckChip, isSelected && styles.activeDeckChip]}
                onPress={() => setSelectedDeckFilter(isSelected ? null : deck)}
                testID={`deck-filter-${deck}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.deckChipText, isSelected && styles.activeDeckChipText]}>
                  #{deck}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {selectedDeckFilter ? (
        <View style={styles.deckBannerRow}>
          <Text style={styles.deckBannerText}>Deck: #{selectedDeckFilter}</Text>
          <TouchableOpacity
            style={styles.shareDeckButton}
            testID="share-deck-button"
            onPress={handleShareCurrentDeck}
            accessibilityRole="button"
            accessibilityLabel={`Share deck ${selectedDeckFilter}`}
          >
            <Text style={styles.shareDeckButtonText}>📤 Share Deck</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={displayedVerses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isDue = summary.dueVerses.some((v) => v.id === item.id);
          const interval = item.srs?.intervalDays ?? 0;
          const streak = item.srs?.streak ?? item.srs?.repetitions ?? 0;
          const isMastered = verseEngine.isVerseMastered(item, isDue);
          const lastScore = item.lastScore ?? item.srs?.lastScore;

          return (
            <View style={styles.verseItem} testID={`verse-card-${item.id}`}>
              <View style={styles.cardTopRow}>
                <TouchableOpacity
                  style={styles.verseContentTouchable}
                  testID={`verse-recite-${item.id}`}
                  onPress={() => setActiveReviewVerse(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.verseTitleContainer}>
                    <Text style={styles.verseReference}>{item.reference}</Text>
                    {item.translation ? (
                      <Text style={styles.translationBadge}>[{item.translation}]</Text>
                    ) : null}
                    {item.deck ? (
                      <Text style={styles.deckTagBadge}>#{item.deck}</Text>
                    ) : null}
                  </View>
                  <View style={styles.statusPillsRow}>
                    {isDue ? (
                      <Text style={styles.dueStatusPill}>Due Today</Text>
                    ) : isMastered ? (
                      <Text style={styles.masteredStatusPill}>
                        Mastered (Interval: {interval}d)
                      </Text>
                    ) : (
                      <Text style={styles.learningStatusPill}>
                        Learning (Streak: {streak})
                      </Text>
                    )}
                    {lastScore !== undefined ? (
                      <Text style={styles.accuracyText}>{lastScore}% Accuracy</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    setVerseToDelete(item);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  testID={`delete-verse-${item.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir versículo ${item.reference}`}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardBottomRow}>
                <TouchableOpacity
                  onPress={() => setActiveReviewVerse(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tapPrompt}>Tap to practice →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.reciteActionButton}
                  testID={`recite-button-${item.id}`}
                  onPress={() => setActiveReviewVerse(item)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Recitar versículo ${item.reference}`}
                >
                  <Text style={styles.reciteActionButtonText}>🎤 Recite</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          summary.allVerses.length === 0 ? (
            <SandboxWelcomeCard onStartSandbox={(verse) => setSandboxVerse(verse)} />
          ) : !selectedDeckFilter && filterMode === 'due' && summary.dueCount === 0 ? (
            <DailyDoneCard
              nextReviewText={getNextReviewText(summary.allVerses)}
              onPracticeAhead={() => setFilterMode('all')}
            />
          ) : (
            <Text style={styles.emptyText}>No verses found.</Text>
          )
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

      <AddVerseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaveSuccess={loadVerses}
      />

      <DeleteConfirmationModal
        visible={verseToDelete !== null}
        verse={verseToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setVerseToDelete(null)}
      />

      <SharedDeckModal
        visible={detectedSharedDeck !== null}
        deck={detectedSharedDeck}
        onClose={() => setDetectedSharedDeck(null)}
        onImport={handleImportSharedDeck}
      />
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
  verseItem: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'column',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  verseContentTouchable: {
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 15,
  },
  verseTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  verseReference: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  translationBadge: {
    fontSize: 12,
    backgroundColor: '#f1f5f9',
    color: '#475569',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
  },
  streakBadge: {
    fontSize: 12,
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontWeight: '600',
  },
  tapPrompt: { fontSize: 13, color: '#6b7280' },
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
    paddingBottom: 36,
    paddingTop: 12,
  },
  buttonSpacing: {
    marginBottom: 12,
  },
  statusPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  dueStatusPill: {
    fontSize: 12,
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    borderColor: '#fecaca',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontWeight: '700',
  },
  masteredStatusPill: {
    fontSize: 12,
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontWeight: '700',
  },
  learningStatusPill: {
    fontSize: 12,
    backgroundColor: '#eef2ff',
    color: '#4338ca',
    borderColor: '#c7d2fe',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontWeight: '600',
  },
  accuracyText: {
    fontSize: 12,
    backgroundColor: '#ecfdf5',
    color: '#059669',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontWeight: '600',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reciteActionButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reciteActionButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  deckFilterScrollView: {
    maxHeight: 44,
    marginBottom: 12,
  },
  deckFilterContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  deckChip: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeDeckChip: {
    backgroundColor: '#4f46e5',
    borderColor: '#4338ca',
  },
  deckChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  activeDeckChipText: {
    color: 'white',
  },
  deckBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  deckBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3730a3',
  },
  shareDeckButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  shareDeckButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  deckTagBadge: {
    fontSize: 12,
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
  },
});

