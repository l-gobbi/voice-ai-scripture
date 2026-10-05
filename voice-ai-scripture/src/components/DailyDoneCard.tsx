import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { getTheme, touchTarget } from '../theme/tokens';

export interface DailyDoneCardProps {
  nextReviewText?: string;
  onPracticeAhead?: () => void;
}

export default function DailyDoneCard({
  nextReviewText = 'Next review due tomorrow',
  onPracticeAhead,
}: DailyDoneCardProps) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      testID="daily-done-card"
    >
      <View
        style={[
          styles.badgeRow,
          { backgroundColor: theme.colors.diffMatchBg },
        ]}
      >
        <Text style={[styles.badgeText, { color: theme.colors.diffMatchText }]}>
          🏆 All Caught Up!
        </Text>
      </View>

      <Text
        style={[
          styles.title,
          {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.fontFamily.ui,
          },
        ]}
      >
        🎉 Daily Goal Achieved! Streak Protected for Today.
      </Text>

      <Text
        style={[
          styles.description,
          {
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamily.ui,
          },
        ]}
      >
        Great job meditating on God's word today! Your spaced repetition queue is clear and your streak is locked in.
      </Text>

      <View
        style={[
          styles.scheduleBox,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.scheduleLabel,
            { color: theme.colors.textSecondary },
          ]}
        >
          Next Review Schedule:
        </Text>
        <Text
          style={[
            styles.scheduleText,
            { color: theme.colors.diffMatchText },
          ]}
        >
          {nextReviewText}
        </Text>
      </View>

      {onPracticeAhead && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.accentSacred },
          ]}
          testID="practice-ahead-button"
          onPress={onPracticeAhead}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>Practice Ahead (Unmetered) →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    padding: 22,
    marginVertical: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  badgeRow: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  scheduleBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
  },
  scheduleLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionButton: {
    minHeight: touchTarget.min,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
