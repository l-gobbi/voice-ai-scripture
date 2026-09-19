import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Verse } from '../services/VerseEngine';

export interface SandboxWelcomeCardProps {
  onStartSandbox: (verse: Verse) => void;
  initialLanguage?: 'en' | 'pt';
}

export const SANDBOX_PASSAGES: Record<
  'en' | 'pt',
  { reference: string; translation: string; text: string }
> = {
  en: {
    reference: 'Acts 2:38',
    translation: 'WEB',
    text: 'Peter said to them, “Repent, and be baptized, every one of you, in the name of Jesus Christ for the forgiveness of sins, and you will receive the gift of the Holy Spirit.”',
  },
  pt: {
    reference: 'Atos 2:38',
    translation: 'ALMEIDA',
    text: 'Pedro então lhes respondeu: Arrependei-vos, e cada um de vós seja batizado em nome de Jesus Cristo, para remissão de vossos pecados; e recebereis o dom do Espírito Santo.',
  },
};

export default function SandboxWelcomeCard({
  onStartSandbox,
  initialLanguage = 'en',
}: SandboxWelcomeCardProps) {
  const [language, setLanguage] = useState<'en' | 'pt'>(initialLanguage);
  const passage = SANDBOX_PASSAGES[language];

  const currentVerse: Verse = {
    id: 'sandbox-acts-2-38',
    reference: passage.reference,
    text: passage.text,
    translation: passage.translation,
  };

  return (
    <View style={styles.container} testID="sandbox-welcome-card">
      <View style={styles.badgeContainer}>
        <Text style={styles.badgeText}>⚡ 60-Second Quick Start</Text>
      </View>

      <Text style={styles.title}>Welcome to Voice AI Scripture! 📖</Text>
      <Text style={styles.subtitle}>
        Experience 3-tier voice recall (Echo → Cloze → Recite) before adding verses to your library.
        No setup or commitment required.
      </Text>

      <View style={styles.languageRow}>
        <TouchableOpacity
          style={[styles.langButton, language === 'en' && styles.langButtonActive]}
          onPress={() => setLanguage('en')}
          testID="sandbox-lang-en"
          accessibilityRole="button"
        >
          <Text style={[styles.langButtonText, language === 'en' && styles.langButtonTextActive]}>
            English (WEB)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.langButton, language === 'pt' && styles.langButtonActive]}
          onPress={() => setLanguage('pt')}
          testID="sandbox-lang-pt"
          accessibilityRole="button"
        >
          <Text style={[styles.langButtonText, language === 'pt' && styles.langButtonTextActive]}>
            Português (Almeida)
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.previewBox}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewReference}>{passage.reference}</Text>
          <Text style={styles.previewBadge}>[{passage.translation}]</Text>
        </View>
        <Text style={styles.previewText}>"{passage.text}"</Text>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
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
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  languageRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  langButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  langButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  langButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  langButtonTextActive: {
    color: '#1e293b',
  },
  previewBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  previewReference: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  previewBadge: {
    fontSize: 12,
    backgroundColor: '#e2e8f0',
    color: '#475569',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  previewText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    fontStyle: 'italic',
  },
  actionButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
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
