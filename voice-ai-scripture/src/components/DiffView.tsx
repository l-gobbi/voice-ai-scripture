import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { DiffToken } from '../engines/diffEngine';
import { getTheme } from '../theme/tokens';

interface DiffViewProps {
  tokens: DiffToken[];
}

export default function DiffView({ tokens }: DiffViewProps) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme);

  if (!tokens || tokens.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.tokenFlow,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {tokens.map((token, index) => {
          if (token.status === 'correct') {
            return (
              <View
                key={index}
                style={[
                  styles.badge,
                  { backgroundColor: theme.colors.diffMatchBg },
                ]}
              >
                <Text
                  style={[
                    styles.tokenText,
                    styles.correctText,
                    {
                      color: theme.colors.diffMatchText,
                      fontFamily: theme.typography.fontFamily.scripture,
                    },
                  ]}
                >
                  {token.word}
                </Text>
              </View>
            );
          }

          if (token.status === 'missed') {
            return (
              <View
                key={index}
                style={[
                  styles.badge,
                  { backgroundColor: theme.colors.diffMissedBg },
                ]}
              >
                <Text
                  style={[
                    styles.tokenText,
                    styles.missedText,
                    {
                      color: theme.colors.diffMissedText,
                      fontFamily: theme.typography.fontFamily.scripture,
                    },
                  ]}
                >
                  {token.word}
                </Text>
              </View>
            );
          }

          // status === 'added'
          return (
            <View
              key={index}
              style={[
                styles.badge,
                styles.addedBadge,
                {
                  backgroundColor: theme.colors.diffAddedBg,
                  borderColor: theme.colors.accentSacred,
                },
              ]}
            >
              <Text
                style={[
                  styles.tokenText,
                  styles.addedText,
                  {
                    color: theme.colors.diffAddedText,
                    fontFamily: theme.typography.fontFamily.scripture,
                  },
                ]}
              >
                +{token.word}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: theme.colors.diffMatchText },
            ]}
          />
          <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>
            Correct
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: theme.colors.diffMissedText },
            ]}
          />
          <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>
            Missed
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: theme.colors.diffAddedText },
            ]}
          />
          <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>
            Added word
          </Text>
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
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tokenText: {
    fontSize: 17,
    lineHeight: 24,
  },
  correctText: {
    fontWeight: '600',
  },
  missedText: {
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  addedBadge: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addedText: {
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
  },
});
