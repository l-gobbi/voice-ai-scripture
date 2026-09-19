import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export interface DailyDoneCardProps {
  nextReviewText?: string;
  onPracticeAhead?: () => void;
}

export default function DailyDoneCard({
  nextReviewText = 'Next review due tomorrow',
  onPracticeAhead,
}: DailyDoneCardProps) {
  return (
    <View style={styles.container} testID="daily-done-card">
      <View style={styles.badgeRow}>
        <Text style={styles.badgeText}>🏆 All Caught Up!</Text>
      </View>

      <Text style={styles.title}>🎉 Daily Goal Achieved! Streak Protected for Today.</Text>
      
      <Text style={styles.description}>
        Great job meditating on God's word today! Your spaced repetition queue is clear and your streak is locked in.
      </Text>

      <View style={styles.scheduleBox}>
        <Text style={styles.scheduleLabel}>Next Review Schedule:</Text>
        <Text style={styles.scheduleText}>{nextReviewText}</Text>
      </View>

      {onPracticeAhead && (
        <TouchableOpacity
          style={styles.actionButton}
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
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    shadowColor: '#16a34a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  badgeRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#14532d',
    marginBottom: 8,
    lineHeight: 26,
  },
  description: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
    marginBottom: 16,
  },
  scheduleBox: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  scheduleLabel: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '600',
    marginBottom: 2,
  },
  scheduleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803d',
  },
  actionButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});
