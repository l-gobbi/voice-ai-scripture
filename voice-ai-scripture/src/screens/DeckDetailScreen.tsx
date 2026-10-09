import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResolvedDeck, ResolvedDeckEntry, deckLibrary } from '../services/DeckLibrary';
import { Verse, getMemoryTier, memoryTierLabel } from '../services/VerseEngine';
import { scriptureCatalog } from '../services/ScriptureCatalog';
import DeckProgress from '../components/DeckProgress';
import { getTheme, radius, spacing, touchTarget, typography } from '../theme/tokens';

interface DeckDetailScreenProps {
  deckId: string;
  /** Opens recitation of the verse, as tapping a verse card on the Home Screen does. */
  onRecite: (verse: Verse) => void;
  onBack: () => void;
}

const entryKey = (entry: ResolvedDeckEntry) =>
  entry.kind === 'section' ? `section-${entry.id}` : `verse-${entry.verse.id}`;

/** One Deck's verses in order, under their Deck Section headings (ticket 86). */
export default function DeckDetailScreen({ deckId, onRecite, onBack }: DeckDetailScreenProps) {
  const theme = getTheme(useColorScheme());
  const c = theme.colors;
  // undefined while loading, null when the Deck no longer exists.
  const [deck, setDeck] = useState<ResolvedDeck | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    deckLibrary
      .getDeck(deckId)
      .then((loaded) => {
        if (active) setDeck(loaded);
      })
      .catch(() => {
        if (active) setDeck(null);
      });
    return () => {
      active = false;
    };
  }, [deckId]);

  const renderEntry = ({ item }: { item: ResolvedDeckEntry }) => {
    if (item.kind === 'section') {
      return (
        <Text
          style={[styles.sectionHeading, { color: c.accentSacred }]}
          accessibilityRole="header"
          testID={`deck-section-${item.id}`}
        >
          {item.title}
        </Text>
      );
    }

    const { verse } = item;
    const tierLabel = memoryTierLabel(getMemoryTier(verse), scriptureCatalog.detectLanguage(verse));
    return (
      <TouchableOpacity
        style={[styles.verseRow, { backgroundColor: c.surface, borderColor: c.border }]}
        onPress={() => onRecite(verse)}
        testID={`deck-verse-${verse.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Recitar versículo ${verse.reference}`}
        activeOpacity={0.7}
      >
        <View style={styles.verseTitleRow}>
          <Text style={[styles.verseReference, { color: c.textPrimary }]}>{verse.reference}</Text>
          {verse.translation ? (
            <Text
              style={[styles.badge, { backgroundColor: c.surfaceMuted, color: c.textSecondary }]}
            >
              [{verse.translation}]
            </Text>
          ) : null}
          <Text
            style={[
              styles.tierPill,
              { backgroundColor: c.surfaceMuted, color: c.textSecondary, borderColor: c.border },
            ]}
          >
            {tierLabel}
          </Text>
        </View>
        <Text style={[styles.verseText, { color: c.textSecondary }]} numberOfLines={2}>
          {verse.text}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="deck-detail-screen"
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}
          onPress={onBack}
          testID="close-deck-detail"
          accessibilityRole="button"
          accessibilityLabel="Voltar aos decks / Back to decks"
          activeOpacity={0.7}
        >
          <Text style={[styles.backButtonText, { color: c.textPrimary }]}>← Decks</Text>
        </TouchableOpacity>
      </View>

      {deck === undefined ? (
        <ActivityIndicator color={c.accentSacred} style={styles.loading} />
      ) : deck === null ? (
        <Text style={[styles.emptyText, { color: c.textSecondary }]}>
          Este deck não existe mais. / This deck no longer exists.
        </Text>
      ) : (
        <FlatList
          data={deck.entries}
          keyExtractor={entryKey}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.deckHeader}>
              <Text style={[styles.title, { color: c.textPrimary }]} accessibilityRole="header">
                {deck.name}
              </Text>
              {deck.description ? (
                <Text style={[styles.description, { color: c.textSecondary }]}>
                  {deck.description}
                </Text>
              ) : null}
              <DeckProgress
                deck={deck}
                colors={c}
                progressTestID="deck-detail-progress"
                tiersTestID="deck-detail-tiers"
              />
            </View>
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              Este deck ainda não tem versículos. / This deck has no verses yet.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  backButton: {
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.md_sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  loading: {
    marginTop: spacing.xl,
  },
  deckHeader: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.ui,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  description: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  sectionHeading: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: spacing.md_sm,
  },
  verseRow: {
    minHeight: touchTarget.min,
    padding: spacing.md_sm,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  verseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  verseReference: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.subheading.fontSize,
    fontWeight: '700',
  },
  badge: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.badge.fontSize,
    fontWeight: typography.badge.fontWeight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  tierPill: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.badge.fontSize,
    fontWeight: typography.badge.fontWeight,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verseText: {
    fontFamily: typography.fontFamily.scripture,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  emptyText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
