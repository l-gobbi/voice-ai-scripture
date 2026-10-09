import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DeckSummary } from '../services/DeckLibrary';
import { MemoryTier, memoryTierLabel } from '../services/VerseEngine';
import { ThemeColors, radius, spacing, typography } from '../theme/tokens';

const TIERS: readonly MemoryTier[] = ['seed', 'growing', 'rooted', 'hidden_in_the_heart'];

type DeckProgressSource = Pick<DeckSummary, 'verseIds' | 'tierCounts' | 'language'>;

/** Verses at least Rooted: Rooted or Hidden in the Heart. */
const rootedCount = ({ tierCounts }: DeckProgressSource) =>
  tierCounts.rooted + tierCounts.hidden_in_the_heart;

/**
 * The Deck's headline progress in its language: "12 of 30 Rooted", "12 de 30 Enraizados",
 * where Rooted counts the verses Rooted or Hidden in the Heart.
 */
export function deckProgressText(deck: DeckProgressSource): string {
  const total = deck.verseIds.length;
  if (total === 0) {
    return deck.language === 'pt' ? 'Nenhum versículo ainda' : 'No verses yet';
  }
  const rooted = rootedCount(deck);
  if (deck.language === 'pt') {
    return `${rooted} de ${total} ${rooted === 1 ? 'Enraizado' : 'Enraizados'}`;
  }
  return `${rooted} of ${total} Rooted`;
}

/** How many verses are at each Memory Tier, empty tiers left out: "Seed 2 · Rooted 1". */
export function deckTierBreakdown(deck: DeckProgressSource): string {
  return TIERS.filter((tier) => deck.tierCounts[tier] > 0)
    .map((tier) => `${memoryTierLabel(tier, deck.language)} ${deck.tierCounts[tier]}`)
    .join(' · ');
}

interface DeckProgressProps {
  deck: DeckProgressSource;
  colors: ThemeColors;
  progressTestID: string;
  tiersTestID: string;
}

/** The headline, a quiet bar of the share Rooted, and the per-tier breakdown. */
export default function DeckProgress({ deck, colors, progressTestID, tiersTestID }: DeckProgressProps) {
  const total = deck.verseIds.length;
  const breakdown = deckTierBreakdown(deck);
  const rootedShare = total === 0 ? 0 : rootedCount(deck) / total;

  return (
    <View style={styles.container}>
      <Text style={[styles.headline, { color: colors.textPrimary }]} testID={progressTestID}>
        {deckProgressText(deck)}
      </Text>
      {total > 0 ? (
        <View
          style={[styles.track, { backgroundColor: colors.surfaceMuted }]}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <View
            style={[
              styles.fill,
              { backgroundColor: colors.accentSacred, width: `${Math.round(rootedShare * 100)}%` },
            ]}
          />
        </View>
      ) : null}
      {breakdown ? (
        <Text style={[styles.breakdown, { color: colors.textSecondary }]} testID={tiersTestID}>
          {breakdown}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  headline: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: '600',
  },
  track: {
    height: spacing.xs,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  breakdown: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.badge.fontSize,
    lineHeight: typography.badge.lineHeight,
    fontWeight: typography.badge.fontWeight,
    letterSpacing: typography.badge.letterSpacing,
  },
});
