import React from 'react';
import {
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scriptureCatalog, TranslationMetadata } from '../services/ScriptureCatalog';
import { getTheme, ThemeColors, typography, spacing, radius, touchTarget } from '../theme/tokens';
import type { Language } from '../utils/languageNormalizer';

export interface TranslationsCopyrightModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Field labels in the translation's own language, like the rest of its entry. */
const ENTRY_LABELS: Record<
  Language,
  { license: string; notice: string; changes: string; originalWork: string; source: string }
> = {
  pt: {
    license: 'Licença',
    notice: 'Aviso de direitos autorais',
    changes: 'Alterações no texto',
    originalWork: 'Obra original',
    source: 'Fonte',
  },
  en: {
    license: 'License',
    notice: 'Copyright notice',
    changes: 'Changes to the text',
    originalWork: 'Original work',
    source: 'Source',
  },
};

const LANGUAGE_NAMES: Record<Language, string> = {
  pt: 'Português',
  en: 'English',
};

/**
 * The Translations & Copyright screen (ADR 0018): every bundled Translation with its full
 * name, licence, the notice its licence requires, what was changed in its text and, where the
 * licence asks it of a changed work, where the original is available. Everything shown comes
 * from the Scripture Catalog, so the notices exist in one place only.
 */
export default function TranslationsCopyrightModal({
  visible,
  onClose,
}: TranslationsCopyrightModalProps) {
  const theme = getTheme(useColorScheme());
  const c = theme.colors;
  const translations = scriptureCatalog.getBundledTranslations();
  // Languages in the order the catalog lists their translations.
  const languages = Array.from(new Set(translations.map((t) => t.language)));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: c.background }]}>
        <View style={[styles.headerRow, { borderBottomColor: c.border }]}>
          <View style={styles.headerTitles}>
            <Text style={[styles.title, { color: c.textPrimary }]} accessibilityRole="header">
              Traduções e direitos autorais
            </Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              Translations & Copyright
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}
            onPress={onClose}
            testID="close-translations-copyright"
            accessibilityRole="button"
            accessibilityLabel="Fechar / Close"
            activeOpacity={0.7}
          >
            <Text style={[styles.closeButtonText, { color: c.textPrimary }]}>Fechar / Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.intro, { color: c.textSecondary }]}>
            Os textos bíblicos incluídos no app, com a licença e o aviso que cada um exige.
          </Text>
          <Text style={[styles.intro, styles.introLast, { color: c.textSecondary }]}>
            The Bible texts included in the app, with the license and notice each one requires.
          </Text>

          {languages.map((language) => (
            <View key={language} style={styles.languageSection}>
              <Text style={[styles.languageHeading, { color: c.textSecondary }]}>
                {LANGUAGE_NAMES[language].toUpperCase()}
              </Text>
              {translations
                .filter((t) => t.language === language)
                .map((meta) => (
                  <TranslationEntry key={meta.code} meta={meta} colors={c} />
                ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function TranslationEntry({ meta, colors: c }: { meta: TranslationMetadata; colors: ThemeColors }) {
  const labels = ENTRY_LABELS[meta.language];

  return (
    <View
      style={[styles.entry, { backgroundColor: c.surface, borderColor: c.border }]}
      testID={`translation-entry-${meta.code}`}
    >
      <View style={styles.entryTitleRow}>
        <Text style={[styles.fullName, { color: c.textPrimary }]}>{meta.fullName}</Text>
        <Text style={[styles.codeBadge, { color: c.accentSacred, backgroundColor: c.surfaceMuted }]}>
          {meta.code}
        </Text>
      </View>

      <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{labels.license}</Text>
      <Text style={[styles.fieldValue, { color: c.textPrimary }]} selectable>
        {meta.license}
      </Text>

      <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{labels.notice}</Text>
      <View style={[styles.noticeBlock, { backgroundColor: c.surfaceMuted, borderLeftColor: c.accentSacred }]}>
        {/* The licensor's exact text: one string, line breaks kept. */}
        <Text style={[styles.noticeText, { color: c.textPrimary }]} selectable>
          {meta.notice}
        </Text>
      </View>

      {meta.changes ? (
        <>
          <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{labels.changes}</Text>
          <Text style={[styles.fieldValue, { color: c.textPrimary }]} selectable>
            {meta.changes}
          </Text>
        </>
      ) : null}

      {meta.originalWork ? (
        <>
          {/* A changed work's licence asks it to say where the original is: verbatim. */}
          <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{labels.originalWork}</Text>
          <Text style={[styles.fieldValue, { color: c.textPrimary }]} selectable>
            {meta.originalWork}
          </Text>
        </>
      ) : null}

      <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{labels.source}</Text>
      <Text
        style={[styles.sourceLink, { color: c.accentSacred }]}
        onPress={() => {
          Linking.openURL(meta.sourceUrl).catch(() => {
            // No browser available: the address stays readable on screen.
          });
        }}
        accessibilityRole="link"
        selectable
      >
        {meta.sourceUrl}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md_sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md_sm,
    borderBottomWidth: 1,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontFamily: typography.fontFamily.scripture,
    fontSize: typography.heading.fontSize,
    lineHeight: typography.heading.lineHeight,
    fontWeight: typography.heading.fontWeight,
  },
  subtitle: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: typography.caption.fontWeight,
  },
  closeButton: {
    minHeight: touchTarget.min,
    minWidth: touchTarget.min,
    paddingHorizontal: spacing.md_sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  intro: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    marginBottom: spacing.xs,
  },
  introLast: {
    marginBottom: spacing.lg,
  },
  languageSection: {
    marginBottom: spacing.md,
  },
  languageHeading: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.badge.fontSize,
    lineHeight: typography.badge.lineHeight,
    fontWeight: typography.badge.fontWeight,
    letterSpacing: typography.badge.letterSpacing,
    marginBottom: spacing.sm,
  },
  entry: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md_sm,
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  fullName: {
    flex: 1,
    fontFamily: typography.fontFamily.scripture,
    fontSize: typography.subheading.fontSize + 2,
    lineHeight: typography.subheading.lineHeight + 2,
    fontWeight: '600',
  },
  codeBadge: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.badge.fontSize,
    lineHeight: typography.badge.lineHeight,
    fontWeight: typography.badge.fontWeight,
    letterSpacing: typography.badge.letterSpacing,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  fieldLabel: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.badge.fontSize,
    lineHeight: typography.badge.lineHeight,
    fontWeight: typography.badge.fontWeight,
    letterSpacing: typography.badge.letterSpacing,
    textTransform: 'uppercase',
    marginTop: spacing.md_sm,
    marginBottom: spacing.xs,
  },
  fieldValue: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  noticeBlock: {
    borderLeftWidth: 3,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md_sm,
  },
  noticeText: {
    fontFamily: typography.fontFamily.scripture,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
  sourceLink: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    textDecorationLine: 'underline',
  },
});
