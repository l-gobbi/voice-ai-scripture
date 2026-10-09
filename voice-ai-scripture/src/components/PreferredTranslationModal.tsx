import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { verseEngine, PreferredTranslations } from '../services/VerseEngine';
import { scriptureCatalog, TranslationMetadata } from '../services/ScriptureCatalog';
import TranslationsCopyrightModal from './TranslationsCopyrightModal';
import { getTheme, ThemeColors, typography, spacing, radius, touchTarget } from '../theme/tokens';
import type { Language } from '../utils/languageNormalizer';

export interface PreferredTranslationModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Each language in its own name, with the word for the catalog default in that language. */
const LANGUAGES: Array<{ language: Language; name: string; defaultLabel: string }> = [
  { language: 'pt', name: 'Português', defaultLabel: 'Padrão' },
  { language: 'en', name: 'English', defaultLabel: 'Default' },
];

/**
 * The Preferred Translation setting (Ticket 82): one choice per language among the bundled
 * Translations of that language. A choice applies at once and only to verses added from now
 * on; saved verses keep their translation and text.
 */
export default function PreferredTranslationModal({
  visible,
  onClose,
}: PreferredTranslationModalProps) {
  const theme = getTheme(useColorScheme());
  const c = theme.colors;
  // Null until the stored preferences are read, so no choice shows as selected by mistake.
  const [preferred, setPreferred] = useState<PreferredTranslations | null>(null);
  const [copyrightVisible, setCopyrightVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let active = true;
    verseEngine
      .getPreferredTranslations()
      .then((loaded) => {
        if (active) setPreferred(loaded);
      })
      .catch(() => {
        // Nothing is shown as selected; a tap still sets the preference.
      });
    return () => {
      active = false;
    };
  }, [visible]);

  const choose = async (language: Language, meta: TranslationMetadata) => {
    try {
      const code = await verseEngine.setPreferredTranslation(language, meta.code);
      setPreferred((current) => ({
        pt: current?.pt ?? scriptureCatalog.getDefaultTranslation('pt'),
        en: current?.en ?? scriptureCatalog.getDefaultTranslation('en'),
        [language]: code,
      }));
    } catch {
      // The choice was not saved: keep showing the stored one.
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: c.background }]}>
        <View style={[styles.headerRow, { borderBottomColor: c.border }]}>
          <View style={styles.headerTitles}>
            <Text style={[styles.title, { color: c.textPrimary }]} accessibilityRole="header">
              Tradução preferida
            </Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>Preferred Translation</Text>
          </View>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}
            onPress={onClose}
            testID="close-preferred-translation"
            accessibilityRole="button"
            accessibilityLabel="Fechar / Close"
            activeOpacity={0.7}
          >
            <Text style={[styles.closeButtonText, { color: c.textPrimary }]}>Fechar / Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.intro, { color: c.textSecondary }]}>
            Versículos novos usam a tradução escolhida para o idioma da referência. Os versículos
            já salvos mantêm o texto.
          </Text>
          <Text style={[styles.intro, styles.introLast, { color: c.textSecondary }]}>
            New verses use the translation chosen for their reference's language. Verses you
            already saved keep their text.
          </Text>

          {LANGUAGES.map(({ language, name, defaultLabel }) => (
            <View
              key={language}
              style={styles.languageSection}
              testID={`preferred-language-${language}`}
              accessibilityRole="radiogroup"
              accessibilityLabel={name}
            >
              <Text style={[styles.languageHeading, { color: c.textSecondary }]}>{name}</Text>
              {scriptureCatalog.getBundledTranslations(language).map((meta) => (
                <TranslationChoice
                  key={meta.code}
                  meta={meta}
                  language={language}
                  selected={preferred?.[language] === meta.code}
                  isDefault={scriptureCatalog.getDefaultTranslation(language) === meta.code}
                  defaultLabel={defaultLabel}
                  colors={c}
                  onPress={() => choose(language, meta)}
                />
              ))}
            </View>
          ))}

          <TouchableOpacity
            style={styles.copyrightLink}
            onPress={() => setCopyrightVisible(true)}
            testID="open-translations-copyright-settings"
            accessibilityRole="link"
            activeOpacity={0.7}
          >
            <Text style={[styles.copyrightLinkText, { color: c.accentSacred }]}>
              Traduções e direitos autorais / Translations & Copyright
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <TranslationsCopyrightModal
        visible={copyrightVisible}
        onClose={() => setCopyrightVisible(false)}
      />
    </Modal>
  );
}

function TranslationChoice({
  meta,
  language,
  selected,
  isDefault,
  defaultLabel,
  colors: c,
  onPress,
}: {
  meta: TranslationMetadata;
  language: Language;
  selected: boolean;
  isDefault: boolean;
  defaultLabel: string;
  colors: ThemeColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.choice,
        { backgroundColor: c.surface, borderColor: selected ? c.accentSacred : c.border },
      ]}
      onPress={onPress}
      testID={`preferred-option-${language}-${meta.code}`}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={`${meta.name} (${meta.code})`}
      activeOpacity={0.7}
    >
      <View
        style={[styles.radioOuter, { borderColor: selected ? c.accentSacred : c.textSecondary }]}
      >
        {selected ? <View style={[styles.radioInner, { backgroundColor: c.accentSacred }]} /> : null}
      </View>
      <View style={styles.choiceText}>
        <Text style={[styles.choiceName, { color: c.textPrimary }]}>{meta.name}</Text>
        <Text style={[styles.choiceMeta, { color: c.textSecondary }]}>
          {isDefault ? `${meta.code} · ${defaultLabel}` : meta.code}
        </Text>
      </View>
    </TouchableOpacity>
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
    marginBottom: spacing.lg,
  },
  languageHeading: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.badge.fontSize,
    lineHeight: typography.badge.lineHeight,
    fontWeight: typography.badge.fontWeight,
    letterSpacing: typography.badge.letterSpacing,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md_sm,
    minHeight: touchTarget.min,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md_sm,
    marginBottom: spacing.sm,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
  },
  choiceText: {
    flex: 1,
  },
  choiceName: {
    fontFamily: typography.fontFamily.scripture,
    fontSize: typography.subheading.fontSize,
    lineHeight: typography.subheading.lineHeight,
    fontWeight: '600',
  },
  choiceMeta: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: typography.caption.fontWeight,
  },
  copyrightLink: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
  },
  copyrightLinkText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
