import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Verse } from '../services/VerseEngine';
import { scriptureCatalog } from '../services/ScriptureCatalog';
import { getTheme, touchTarget } from '../theme/tokens';
import type { Language } from '../utils/languageNormalizer';

export interface SandboxWelcomeCardProps {
  onStartSandbox: (verse: Verse) => void;
  initialLanguage?: Language;
}

export interface SandboxPassage {
  reference: string;
  translation: string;
  text: string;
}

/** The sample verse, read from the bundled Bible in the default Translation of its language. */
function sandboxPassage(reference: string): SandboxPassage {
  const passage = scriptureCatalog.resolvePassage(reference);
  if (!passage?.text) {
    throw new Error(`Sandbox verse ${reference} has no text in the bundled default translation`);
  }
  return { reference: passage.canonicalRef, translation: passage.translation, text: passage.text };
}

export const SANDBOX_PASSAGES: Record<Language, SandboxPassage> = {
  en: sandboxPassage('Acts 2:38'),
  pt: sandboxPassage('Atos 2:38'),
};

export default function SandboxWelcomeCard({
  onStartSandbox,
  initialLanguage = 'en',
}: SandboxWelcomeCardProps) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme);

  const [language, setLanguage] = useState<Language>(initialLanguage);
  const passage = SANDBOX_PASSAGES[language];

  const currentVerse: Verse = {
    id: 'sandbox-acts-2-38',
    reference: passage.reference,
    text: passage.text,
    translation: passage.translation,
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      testID="sandbox-welcome-card"
    >
      <View
        style={[
          styles.badgeContainer,
          { backgroundColor: theme.colors.surfaceMuted },
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            { color: theme.colors.accentSacred },
          ]}
        >
          ⚡ 60-Second Quick Start
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
        Welcome to Voice AI Scripture! 📖
      </Text>
      <Text
        style={[
          styles.subtitle,
          {
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamily.ui,
          },
        ]}
      >
        Experience 3-tier voice recall (Echo → Cloze → Recite) before adding verses to your library.
        No setup or commitment required.
      </Text>

      <View
        style={[
          styles.languageRow,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.langButton,
            language === 'en' && [
              styles.langButtonActive,
              { backgroundColor: theme.colors.surface },
            ],
          ]}
          onPress={() => setLanguage('en')}
          testID="sandbox-lang-en"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.langButtonText,
              {
                color:
                  language === 'en'
                    ? theme.colors.textPrimary
                    : theme.colors.textSecondary,
                fontWeight: language === 'en' ? '700' : '500',
              },
            ]}
          >
            English ({SANDBOX_PASSAGES.en.translation})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.langButton,
            language === 'pt' && [
              styles.langButtonActive,
              { backgroundColor: theme.colors.surface },
            ],
          ]}
          onPress={() => setLanguage('pt')}
          testID="sandbox-lang-pt"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.langButtonText,
              {
                color:
                  language === 'pt'
                    ? theme.colors.textPrimary
                    : theme.colors.textSecondary,
                fontWeight: language === 'pt' ? '700' : '500',
              },
            ]}
          >
            Português ({SANDBOX_PASSAGES.pt.translation})
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.previewBox,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.previewHeader}>
          <Text
            style={[
              styles.previewReference,
              { color: theme.colors.textPrimary },
            ]}
          >
            {passage.reference}
          </Text>
          <Text
            style={[
              styles.previewBadge,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.textSecondary,
              },
            ]}
          >
            [{passage.translation}]
          </Text>
        </View>
        <Text
          style={[
            styles.previewText,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.fontFamily.scripture,
            },
          ]}
        >
          "{passage.text}"
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.actionButton,
          { backgroundColor: theme.colors.accentSacred },
        ]}
        onPress={() => onStartSandbox(currentVerse)}
        testID="start-sandbox-button"
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text style={styles.actionButtonText}>🎤 Try Interactive Recitation (Acts 2:38)</Text>
      </TouchableOpacity>
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
  badgeContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  languageRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
    gap: 4,
    borderWidth: 1,
  },
  langButton: {
    flex: 1,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  langButtonActive: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  langButtonText: {
    fontSize: 13,
  },
  previewBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  previewReference: {
    fontSize: 16,
    fontWeight: '700',
  },
  previewBadge: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  previewText: {
    fontSize: 17,
    lineHeight: 26,
    fontStyle: 'italic',
  },
  actionButton: {
    minHeight: touchTarget.min,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
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
