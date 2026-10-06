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
  useColorScheme,
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
import { VoiceInput } from '../services/VoiceInput';
import { getTheme, touchTarget } from '../theme/tokens';

export function getNextReviewText(allVerses: Verse[], now: Date = new Date()): string {
  return verseEngine.getNextReviewMessage(allVerses, now);
}

interface HomeScreenProps {
  voiceInput?: VoiceInput;
}

export default function HomeScreen({ voiceInput }: HomeScreenProps = {}) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme);

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
    const { summary: dashboardSummary, habitStats: dashboardStats } =
      await verseEngine.getDashboard();
    setSummary(dashboardSummary);
    setHabitStats(dashboardStats);
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
        voiceInput={voiceInput}
        onComplete={() => {
          setSandboxVerse(null);
          loadVerses();
        }}
        onSandboxComplete={async (verse, saveRequested) => {
          if (saveRequested) {
            const added = await verseEngine.addVerse({
              reference: verse.reference,
              text: verse.text,
              translation: verse.translation,
            });
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await verseEngine.updateVerse(added.id, {
              srs: {
                streak: 1,
                intervalDays: 1,
                easeFactor: 2.5,
                nextReviewDate: tomorrow.toISOString(),
                lastScore: 100,
              },
            });
          }
          setSandboxVerse(null);
          await loadVerses();
        }}
      />
    );
  }

  const dueVerseIds = new Set(summary.dueVerses.map((v) => v.id));

  if (activeReviewVerse) {
    const isDue = dueVerseIds.has(activeReviewVerse.id);
    return (
      <ReviewScreen
        verse={activeReviewVerse}
        voiceInput={voiceInput}
        isUnmetered={!isDue}
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
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.header,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.fontFamily.ui,
            },
          ]}
        >
          My Memory Verses
        </Text>
        <TouchableOpacity
          style={[
            styles.reminderHeaderButton,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => setReminderModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.reminderButtonText,
              { color: theme.colors.textPrimary },
            ]}
          >
            ⏰ Reminders
          </Text>
        </TouchableOpacity>
      </View>

      <HabitBanner
        currentStreak={habitStats.currentStreak}
        completedTodayCount={habitStats.completedTodayCount}
        totalDueToday={habitStats.totalDueToday}
      />

      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tabButton,
            filterMode === 'due' && [
              styles.activeTabButton,
              { backgroundColor: theme.colors.surface },
            ],
          ]}
          onPress={() => setFilterMode('due')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  filterMode === 'due'
                    ? theme.colors.textPrimary
                    : theme.colors.textSecondary,
                fontWeight: filterMode === 'due' ? '700' : '500',
              },
            ]}
          >
            🔥 Due Today ({summary.dueCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            filterMode === 'all' && [
              styles.activeTabButton,
              { backgroundColor: theme.colors.surface },
            ],
          ]}
          onPress={() => setFilterMode('all')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  filterMode === 'all'
                    ? theme.colors.textPrimary
                    : theme.colors.textSecondary,
                fontWeight: filterMode === 'all' ? '700' : '500',
              },
            ]}
          >
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
                style={[
                  styles.deckChip,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.accentSacred
                      : theme.colors.surface,
                    borderColor: isSelected
                      ? theme.colors.accentSacred
                      : theme.colors.border,
                  },
                ]}
                onPress={() => setSelectedDeckFilter(isSelected ? null : deck)}
                testID={`deck-filter-${deck}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.deckChipText,
                    {
                      color: isSelected
                        ? '#FFFFFF'
                        : theme.colors.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  #{deck}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {selectedDeckFilter ? (
        <View
          style={[
            styles.deckBannerRow,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.deckBannerText,
              { color: theme.colors.textPrimary },
            ]}
          >
            Deck: #{selectedDeckFilter}
          </Text>
          <TouchableOpacity
            style={[
              styles.shareDeckButton,
              { backgroundColor: theme.colors.accentSacred },
            ]}
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
          const isDue = dueVerseIds.has(item.id);
          const interval = item.srs?.intervalDays ?? 0;
          const streak = item.srs?.streak ?? item.srs?.repetitions ?? 0;
          const isMastered = verseEngine.isVerseMastered(item, isDue);
          const lastScore = item.lastScore ?? item.srs?.lastScore;

          return (
            <View
              style={[
                styles.verseItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              testID={`verse-card-${item.id}`}
            >
              <View style={styles.cardTopRow}>
                <TouchableOpacity
                  style={styles.verseContentTouchable}
                  testID={`verse-recite-${item.id}`}
                  onPress={() => setActiveReviewVerse(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.verseTitleContainer}>
                    <Text
                      style={[
                        styles.verseReference,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {item.reference}
                    </Text>
                    {item.translation ? (
                      <Text
                        style={[
                          styles.translationBadge,
                          {
                            backgroundColor: theme.colors.surfaceMuted,
                            color: theme.colors.textSecondary,
                          },
                        ]}
                      >
                        [{item.translation}]
                      </Text>
                    ) : null}
                    {item.deck ? (
                      <Text
                        style={[
                          styles.deckTagBadge,
                          {
                            backgroundColor: theme.colors.surfaceMuted,
                            color: theme.colors.accentSacred,
                          },
                        ]}
                      >
                        #{item.deck}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.statusPillsRow}>
                    {isDue ? (
                      <Text
                        style={[
                          styles.dueStatusPill,
                          {
                            backgroundColor: theme.colors.diffMissedBg,
                            color: theme.colors.diffMissedText,
                            borderColor: theme.colors.diffMissedBg,
                          },
                        ]}
                      >
                        Due Today
                      </Text>
                    ) : isMastered ? (
                      <Text
                        style={[
                          styles.masteredStatusPill,
                          {
                            backgroundColor: theme.colors.diffMatchBg,
                            color: theme.colors.diffMatchText,
                            borderColor: theme.colors.diffMatchBg,
                          },
                        ]}
                      >
                        Mastered (Interval: {interval}d)
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.learningStatusPill,
                          {
                            backgroundColor: theme.colors.surfaceMuted,
                            color: theme.colors.textSecondary,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        Learning (Streak: {streak})
                      </Text>
                    )}
                    {lastScore !== undefined ? (
                      <Text
                        style={[
                          styles.accuracyText,
                          {
                            backgroundColor: theme.colors.diffMatchBg,
                            color: theme.colors.diffMatchText,
                            borderColor: theme.colors.diffMatchBg,
                          },
                        ]}
                      >
                        {lastScore}% Accuracy
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    setVerseToDelete(item);
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  testID={`delete-verse-${item.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir versículo ${item.reference}`}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.cardBottomRow,
                  { borderTopColor: theme.colors.border },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setActiveReviewVerse(item)}
                  activeOpacity={0.7}
                  style={styles.tapPromptTouchable}
                >
                  <Text
                    style={[
                      styles.tapPrompt,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Tap to practice →
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.reciteActionButton,
                    { backgroundColor: theme.colors.accentSacred },
                  ]}
                  testID={`recite-button-${item.id}`}
                  onPress={() => setActiveReviewVerse(item)}
                  activeOpacity={0.8}
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
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.textSecondary },
              ]}
            >
              No verses found.
            </Text>
          )
        }
      />

      <View style={styles.footerButtons}>
        <View style={styles.buttonSpacing}>
          <TouchableOpacity
            style={[
              styles.footerPrimaryButton,
              { backgroundColor: theme.colors.accentSacred },
            ]}
            onPress={() => setPackBrowserVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.footerPrimaryButtonText}>📖 Browse Topical Packs</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonSpacing}>
          <TouchableOpacity
            style={[
              styles.footerSecondaryButton,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.footerSecondaryButtonText,
                { color: theme.colors.textPrimary },
              ]}
            >
              + Type Custom Verse
            </Text>
          </TouchableOpacity>
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
  container: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  reminderHeaderButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  verseItem: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
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
    minHeight: touchTarget.min,
    minWidth: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
  },
  verseTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  verseReference: {
    fontSize: 18,
    fontWeight: '700',
  },
  translationBadge: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
  },
  deckTagBadge: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
  },
  tapPromptTouchable: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
  },
  tapPrompt: {
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    minHeight: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
  },
  footerButtons: {
    paddingBottom: 28,
    paddingTop: 10,
  },
  buttonSpacing: {
    marginBottom: 10,
  },
  footerPrimaryButton: {
    minHeight: touchTarget.min,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  footerPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerSecondaryButton: {
    minHeight: touchTarget.min,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  dueStatusPill: {
    fontSize: 11,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontWeight: '700',
  },
  masteredStatusPill: {
    fontSize: 11,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontWeight: '700',
  },
  learningStatusPill: {
    fontSize: 11,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontWeight: '600',
  },
  accuracyText: {
    fontSize: 11,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontWeight: '600',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  reciteActionButton: {
    minHeight: touchTarget.min,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reciteActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  deckFilterScrollView: {
    marginBottom: 12,
  },
  deckFilterContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  deckChip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deckChipText: {
    fontSize: 13,
  },
  deckBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  deckBannerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  shareDeckButton: {
    minHeight: touchTarget.min,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareDeckButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
