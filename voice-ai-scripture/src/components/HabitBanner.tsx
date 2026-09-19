import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  const percentage =
    totalDueToday > 0
      ? Math.min(100, Math.round((completedTodayCount / totalDueToday) * 100))
      : 100;

  return (
    <View style={styles.container} testID="habit-banner">
      <View style={styles.headerRow}>
        <View style={styles.streakBadge}>
          <Text style={styles.streakFlame}>🔥</Text>
          <Text style={styles.streakText}>
            {currentStreak > 0
              ? `${currentStreak} Day Streak`
              : 'Start your streak today!'}
          </Text>
        </View>
        <Text style={styles.progressText}>
          {totalDueToday > 0
            ? `${completedTodayCount} of ${totalDueToday} Due Today`
            : 'All caught up! 🎉'}
        </Text>
      </View>

      <View style={styles.progressBarTrack}>
        <View
          style={[styles.progressBarFill, { width: `${percentage}%` }]}
          testID="habit-progress-fill"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    color: '#312e81',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#e0e7ff',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 4,
  },
});
