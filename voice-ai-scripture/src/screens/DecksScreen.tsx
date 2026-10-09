import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeckSummary } from '../services/DeckLibrary';
import DeckProgress, { deckProgressText } from '../components/DeckProgress';
import { getTheme, radius, spacing, touchTarget, typography } from '../theme/tokens';

interface DecksScreenProps {
  decks: DeckSummary[];
  onOpenDeck: (deckId: string) => void;
  onBack: () => void;
}

/** The learner's Decks with their Memory Tier progress (ticket 86). */
export default function DecksScreen({ decks, onOpenDeck, onBack }: DecksScreenProps) {
  const theme = getTheme(useColorScheme());
  const c = theme.colors;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} testID="decks-screen">
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}
          onPress={onBack}
          testID="close-decks"
          accessibilityRole="button"
          accessibilityLabel="Voltar / Back"
          activeOpacity={0.7}
        >
          <Text style={[styles.backButtonText, { color: c.textPrimary }]}>← Voltar / Back</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.title, { color: c.textPrimary }]} accessibilityRole="header">
        Decks
      </Text>

      <FlatList
        data={decks}
        keyExtractor={(deck) => deck.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: deck }) => (
          <TouchableOpacity
            style={[styles.deckCard, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => onOpenDeck(deck.id)}
            testID={`deck-card-${deck.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${deck.name}, ${deckProgressText(deck)}`}
            activeOpacity={0.7}
          >
            <View style={styles.deckTitleRow}>
              <Text style={[styles.deckName, { color: c.textPrimary }]} numberOfLines={2}>
                {deck.name}
              </Text>
              <Text style={[styles.chevron, { color: c.textSecondary }]}>›</Text>
            </View>
            {deck.description ? (
              <Text style={[styles.description, { color: c.textSecondary }]} numberOfLines={2}>
                {deck.description}
              </Text>
            ) : null}
            <DeckProgress
              deck={deck}
              colors={c}
              progressTestID={`deck-progress-${deck.id}`}
              tiersTestID={`deck-tiers-${deck.id}`}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>
              Nenhum deck ainda. / No decks yet.
            </Text>
            <Text style={[styles.emptyHint, { color: c.textSecondary }]}>
              Para começar um, escreva o nome do deck ao adicionar um versículo.
            </Text>
            <Text style={[styles.emptyHint, { color: c.textSecondary }]}>
              To start one, name the deck when you add a verse.
            </Text>
          </View>
        }
      />
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
  title: {
    fontFamily: typography.fontFamily.ui,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: spacing.md,
  },
  listContent: {
    gap: spacing.md_sm,
    paddingBottom: spacing.lg,
  },
  deckCard: {
    minHeight: touchTarget.min,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  deckTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  deckName: {
    flex: 1,
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.subheading.fontSize,
    lineHeight: typography.subheading.lineHeight,
    fontWeight: typography.subheading.fontWeight,
  },
  chevron: {
    fontSize: 22,
  },
  description: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  emptyState: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.subheading.fontSize,
    fontWeight: typography.subheading.fontWeight,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    textAlign: 'center',
  },
});
