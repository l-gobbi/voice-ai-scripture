import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DiffToken } from '../engines/diffEngine';

interface DiffViewProps {
  tokens: DiffToken[];
}

export default function DiffView({ tokens }: DiffViewProps) {
  if (!tokens || tokens.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.tokenFlow}>
        {tokens.map((token, index) => {
          if (token.status === 'correct') {
            return (
              <View key={index} style={[styles.badge, styles.correctBadge]}>
                <Text style={styles.correctText}>{token.word}</Text>
              </View>
            );
          }

          if (token.status === 'missed') {
            return (
              <View key={index} style={[styles.badge, styles.missedBadge]}>
                <Text style={styles.missedText}>{token.word}</Text>
              </View>
            );
          }

          // status === 'added'
          return (
            <View key={index} style={[styles.badge, styles.addedBadge]}>
              <Text style={styles.addedText}>+{token.word}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.legendLabel}>Correct</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendLabel}>Missed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.legendLabel}>Added word</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    width: '100%',
  },
  tokenFlow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  correctBadge: {
    backgroundColor: '#dcfce7',
  },
  correctText: {
    color: '#15803d',
    fontWeight: '600',
    fontSize: 16,
  },
  missedBadge: {
    backgroundColor: '#fee2e2',
  },
  missedText: {
    color: '#b91c1c',
    textDecorationLine: 'line-through',
    fontWeight: '500',
    fontSize: 16,
  },
  addedBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
  },
  addedText: {
    color: '#b45309',
    fontSize: 14,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: '#64748b',
  },
});
