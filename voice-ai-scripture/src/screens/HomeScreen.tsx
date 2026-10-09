import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
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
import {
  verseEngine,
  Verse,
  VerseSummary,
  HabitStats,
  getMemoryTier,
  memoryTierLabel,
} from '../services/VerseEngine';
import { scriptureCatalog } from '../services/ScriptureCatalog';
import ReviewScreen from './ReviewScreen';
import DecksScreen from './DecksScreen';
import DeckDetailScreen from './DeckDetailScreen';
import { deckLibrary, DeckSummary } from '../services/DeckLibrary';
import ReminderSettingsModal from '../components/ReminderSettingsModal';
import TranslationsCopyrightModal from '../components/TranslationsCopyrightModal';
import PreferredTranslationModal from '../components/PreferredTranslationModal';
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
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [translationsModalVisible, setTranslationsModalVisible] = useState(false);
  const [preferredTranslationVisible, setPreferredTranslationVisible] = useState(false);
  const [verseToDelete, setVerseToDelete] = useState<Verse | null>(null);

  const [activeReviewVerse, setActiveReviewVerse] = useState<Verse | null>(null);
  const [sandboxVerse, setSandboxVerse] = useState<Verse | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'due'>('due');
  // The id of the Deck whose verses the Home Screen shows, if any.
  const [selectedDeckFilter, setSelectedDeckFilter] = useState<string | null>(null);
  const [detectedSharedDeck, setDetectedSharedDeck] = useState<SharedDeckPayload | null>(null);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [decksScreenVisible, setDecksScreenVisible] = useState(false);
  const [openDeckId, setOpenDeckId] = useState<string | null>(null);

  const loadDecks = async () => {
    try {
      // The first listing of a launch also migrates legacy #tag decks (ticket 86).
      setDecks(await deckLibrary.listDecks());
    } catch {
      // Keep the Decks already shown.
    }
  };

  const loadVerses = async () => {
    await loadDecks();
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

  const selectedDeck = decks.find((deck) => deck.id === selectedDeckFilter) ?? null;

  // Ticket 89 replaces the payload and the message; the verses now come from the Deck, in order.
  const handleShareCurrentDeck = async () => {
    if (!selectedDeck) return;
    const deck = await deckLibrary.getDeck(selectedDeck.id);
    const deckVerses = (deck?.entries ?? []).flatMap((entry) =>
      entry.kind === 'verse' ? [entry.verse] : []
    );
    if (!deck || deckVerses.length === 0) return;
    const payload: SharedDeckPayload = {
      name: deck.name,
      verses: deckVerses.map((v) => ({
        ref: v.reference,
        text: v.text,
        trans: v.translation,
      })),
      ...(deck.description ? { note: deck.description } : {}),
    };
    const message = generateShareMessage(payload);
    await Share.share({ message });
  };

  const handleImportSharedDeck = async (
    deckName: string,
    selectedVerses: SharedDeckVerse[]
  ) => {
    await deckLibrary.importSharedDeck({
      name: deckName,
      description: detectedSharedDeck?.note,
      verses: selectedVerses.map((v) => ({
        reference: v.ref,
        text: v.text,
        translation: v.trans,
      })),
    });
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
        onSandboxComplete={async (verse, saveRequested, sandboxAttempt) => {
          if (saveRequested) {
            // A new verse, due today; the sandbox's Blind Recitation is logged as practice.
            await verseEngine.addVerse(
              {
                reference: verse.reference,
                text: verse.text,
                translation: verse.translation,
              },
              { sandboxAttempt }
            );
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

  if (openDeckId) {
    return (
      <DeckDetailScreen
        deckId={openDeckId}
        onRecite={(verse) => setActiveReviewVerse(verse)}
        onBack={() => setOpenDeckId(null)}
      />
    );
  }

  if (decksScreenVisible) {
    return (
      <DecksScreen
        decks={decks}
        onOpenDeck={(deckId) => setOpenDeckId(deckId)}
        onBack={() => setDecksScreenVisible(false)}
      />
    );
  }

  const versesById = new Map(summary.allVerses.map((v) => [v.id, v]));
  const displayedVerses = selectedDeck
    ? selectedDeck.verseIds.flatMap((id) => {
        const verse = versesById.get(id);
        return verse ? [verse] : [];
      })
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
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.reminderHeaderButton,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setDecksScreenVisible(true)}
            activeOpacity={0.7}
            testID="open-decks-home"
            accessibilityRole="button"
            accessibilityLabel="Decks"
          >
            <Text
              style={[
                styles.reminderButtonText,
                { color: theme.colors.textPrimary },
              ]}
            >
              Decks
            </Text>
          </TouchableOpacity>
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
          <TouchableOpacity
            style={[
              styles.reminderHeaderButton,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setPreferredTranslationVisible(true)}
            activeOpacity={0.7}
            testID="open-preferred-translation-home"
            accessibilityRole="button"
            accessibilityLabel="Tradução preferida / Preferred Translation"
          >
            <Text
              style={[
                styles.reminderButtonText,
                { color: theme.colors.textPrimary },
              ]}
            >
              Translations
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.reminderHeaderButton,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setTranslationsModalVisible(true)}
            activeOpacity={0.7}
            testID="open-translations-copyright-home"
            accessibilityRole="button"
            accessibilityLabel="Translations & Copyright"
          >
            <Text
              style={[
                styles.reminderButtonText,
                { color: theme.colors.textPrimary },
              ]}
            >
              Copyright
            </Text>
          </TouchableOpacity>
        </View>
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

      {decks.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.deckFilterScrollView}
          contentContainerStyle={styles.deckFilterContainer}
        >
          {decks.map((deck) => {
            const isSelected = selectedDeck?.id === deck.id;
            return (
              <TouchableOpacity
                key={deck.id}
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
                onPress={() => setSelectedDeckFilter(isSelected ? null : deck.id)}
                testID={`deck-filter-${deck.id}`}
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
                  {deck.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {selectedDeck ? (
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
            Deck: {selectedDeck.name}
          </Text>
          {selectedDeck.verseIds.length > 0 ? (
            <TouchableOpacity
              style={[
                styles.shareDeckButton,
                { backgroundColor: theme.colors.accentSacred },
              ]}
              testID="share-deck-button"
              onPress={handleShareCurrentDeck}
              accessibilityRole="button"
              accessibilityLabel={`Share deck ${selectedDeck.name}`}
            >
              <Text style={styles.shareDeckButtonText}>📤 Share Deck</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={displayedVerses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isDue = dueVerseIds.has(item.id);
          const tierLabel = memoryTierLabel(
            getMemoryTier(item),
            scriptureCatalog.detectLanguage(item)
          );
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
                    ) : null}
                    <Text
                      style={[
                        styles.memoryTierPill,
                        {
                          backgroundColor: theme.colors.surfaceMuted,
                          color: theme.colors.textSecondary,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      testID={`memory-tier-${item.id}`}
                    >
                      {tierLabel}
                    </Text>
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
          ) : !selectedDeck && filterMode === 'due' && summary.dueCount === 0 ? (
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
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.footerPrimaryButtonText}>+ Type Custom Verse</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ReminderSettingsModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
      />

      <TranslationsCopyrightModal
        visible={translationsModalVisible}
        onClose={() => setTranslationsModalVisible(false)}
      />

      <PreferredTranslationModal
        visible={preferredTranslationVisible}
        onClose={() => setPreferredTranslationVisible(false)}
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    rowGap: 8,
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    marginLeft: 'auto',
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
  memoryTierPill: {
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
