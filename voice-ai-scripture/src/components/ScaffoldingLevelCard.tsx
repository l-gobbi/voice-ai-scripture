import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { Verse } from '../services/VerseEngine';
import { ClozeToken } from '../engines/clozeEngine';
import { RecitationLevel } from '../hooks/useRecitationSession';
import { getTheme } from '../theme/tokens';
import { styles } from '../screens/ReviewScreen.styles';

export interface ScaffoldingLevelCardProps {
  level: RecitationLevel;
  verse: Verse;
  clozeTokens: ClozeToken[];
  isTextRevealed: boolean;
  assistanceUsed: boolean;
  onToggleTextReveal: () => void;
  onVocalize: () => void;
  onTapWord: (index: number) => void;
}

export default function ScaffoldingLevelCard({
  level,
  verse,
  clozeTokens,
  isTextRevealed,
  assistanceUsed,
  onToggleTextReveal,
  onVocalize,
  onTapWord,
}: ScaffoldingLevelCardProps) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme);

  if (level === 1) {
    return (
      <View style={styles.levelCard}>
        <View
          style={[
            styles.levelBadgeContainer,
            { backgroundColor: theme.colors.surfaceMuted },
          ]}
        >
          <Text
            style={[
              styles.levelBadge,
              { color: theme.colors.accentSacred },
            ]}
          >
            Level 1: Echo Mode (Listen & Read Aloud)
          </Text>
        </View>

        <Text
          style={[
            styles.instructionText,
            { color: theme.colors.textSecondary, marginTop: 8 },
          ]}
        >
          Listen to the verse spoken aloud, then recite with full text support.
        </Text>

        {isTextRevealed ? (
          <Text
            style={[
              styles.verseText,
              {
                color: theme.colors.textPrimary,
                fontFamily: theme.typography.fontFamily.scripture,
              },
            ]}
          >
            {verse.text}
          </Text>
        ) : (
          <View style={styles.clozeContainer}>
            {clozeTokens.map((token, idx) => (
              <Text
                key={idx}
                style={[
                  styles.clozeToken,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.fontFamily.scripture,
                  },
                ]}
              >
                {token.masked}
                {token.trailingSpace ? ' ' : ''}
              </Text>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <TouchableOpacity
            style={[
              styles.secondaryPillButton,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={onToggleTextReveal}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.secondaryPillButtonText,
                { color: theme.colors.textPrimary },
              ]}
            >
              {isTextRevealed ? 'Conceal Text' : 'Reveal Text'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryPillButton,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={onVocalize}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.secondaryPillButtonText,
                { color: theme.colors.textPrimary },
              ]}
            >
              🔊 Listen Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (level === 2) {
    return (
      <View style={styles.levelCard}>
        <View style={styles.levelHeaderRow}>
          <View
            style={[
              styles.levelBadgeContainer,
              { backgroundColor: theme.colors.surfaceMuted },
            ]}
          >
            <Text
              style={[
                styles.levelBadge,
                { color: theme.colors.accentSacred },
              ]}
            >
              Level 2: Cloze Practice
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.secondaryPillButton,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={onVocalize}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.secondaryPillButtonText,
                { color: theme.colors.textPrimary },
              ]}
            >
              🔊 Listen
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.instructionText,
            { color: theme.colors.textSecondary },
          ]}
        >
          Tap any blanked word to reveal it inline if you need a prompt.
        </Text>

        <View style={styles.clozeContainer}>
          {clozeTokens.map((token, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => onTapWord(idx)}
              activeOpacity={0.7}
              style={styles.tokenTouchTarget}
            >
              <Text
                style={[
                  styles.clozeToken,
                  {
                    color: theme.colors.textPrimary,
                    fontFamily: theme.typography.fontFamily.scripture,
                  },
                  token.isRevealed && [
                    styles.clozeRevealed,
                    { color: theme.colors.accentSacred },
                  ],
                ]}
              >
                {token.isRevealed ? token.word : token.masked}
                {token.trailingSpace ? ' ' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // Level 3: Blind Recitation
  return (
    <View style={styles.levelCard}>
      <View
        style={[
          styles.levelBadgeContainer,
          { backgroundColor: theme.colors.surfaceMuted },
        ]}
      >
        <Text
          style={[
            styles.levelBadge,
            { color: theme.colors.accentSacred },
          ]}
        >
          Level 3: Blind Recitation (Active Recall)
        </Text>
      </View>

      {assistanceUsed && (
        <Text
          style={[
            styles.assistedWarning,
            { color: theme.colors.diffAddedText },
          ]}
        >
          ⚠️ Word Peek Lifeline used (Session score capped at 75%)
        </Text>
      )}

      <Text
        style={[
          styles.instructionText,
          { color: theme.colors.textSecondary, marginTop: 8 },
        ]}
      >
        Tap any masked word for a 3-second peek lifeline if you get stuck.
      </Text>

      <View style={styles.clozeContainer}>
        {clozeTokens.map((token, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => onTapWord(idx)}
            activeOpacity={0.7}
            style={styles.tokenTouchTarget}
          >
            <Text
              style={[
                styles.clozeToken,
                {
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.fontFamily.scripture,
                },
                token.isRevealed && [
                  styles.peekToken,
                  {
                    color: theme.colors.diffAddedText,
                    backgroundColor: theme.colors.diffAddedBg,
                  },
                ],
              ]}
            >
              {token.isRevealed ? token.word : token.masked}
              {token.trailingSpace ? ' ' : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
