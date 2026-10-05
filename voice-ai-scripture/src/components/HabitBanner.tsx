import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { getTheme } from '../theme/tokens';

export interface HabitBannerProps {
  currentStreak: number;
  completedTodayCount: number;
  totalDueToday: number;
}

export default function HabitBanner({
  currentStreak,
  completedTodayCount,
  totalDueToday,
}: HabitBannerProps) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme);

  const percentage =
    totalDueToday > 0
      ? Math.min(100, Math.round((completedTodayCount / totalDueToday) * 100))
      : 100;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      testID="habit-banner"
    >
      <View style={styles.headerRow}>
        <View style={styles.streakBadge}>
          <Text style={styles.streakFlame}>🔥</Text>
          <Text
            style={[
              styles.streakText,
              {
                color: currentStreak > 0 ? theme.colors.accentSacred : theme.colors.textSecondary,
                fontFamily: theme.typography.fontFamily.ui,
              },
            ]}
          >
            {currentStreak > 0
              ? `${currentStreak} Day Streak`
              : 'Start your streak today!'}
          </Text>
        </View>
        <Text
          style={[
            styles.progressText,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.fontFamily.ui,
            },
          ]}
        >
          {totalDueToday > 0
            ? `${completedTodayCount} of ${totalDueToday} Due Today`
            : 'All caught up! 🎉'}
        </Text>
      </View>

      <View
        style={[
          styles.progressBarTrack,
          { backgroundColor: theme.colors.surfaceMuted },
        ]}
      >
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${percentage}%`,
              backgroundColor: theme.colors.accentSacred,
            },
          ]}
          testID="habit-progress-fill"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakFlame: {
    fontSize: 18,
    marginRight: 6,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
