import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TOPICAL_PACKS, TopicalPack, PackLanguage } from '../data/topicalPacks';
import { verseEngine } from '../services/VerseEngine';
import { colors, typography, spacing, radius, touchTarget } from '../theme/tokens';

interface PackBrowserModalProps {
  visible: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type LanguageFilter = 'all' | PackLanguage;

const LANGUAGE_TABS: Array<{ id: LanguageFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'en', label: 'English' },
  { id: 'pt', label: 'Português' },
];

function LanguageBadge({ language }: { language: PackLanguage }) {
  return (
    <Text
      style={[
        styles.langBadge,
        language === 'pt' ? styles.langBadgePt : styles.langBadgeEn,
      ]}
    >
      {language === 'pt' ? '[PT]' : '[EN]'}
    </Text>
  );
}

export default function PackBrowserModal({
  visible,
  onClose,
  onImportComplete,
}: PackBrowserModalProps) {
  const [selectedPack, setSelectedPack] = useState<TopicalPack | null>(null);
  const [filterLang, setFilterLang] = useState<LanguageFilter>('all');
  const [importing, setImporting] = useState(false);

  const displayedPacks =
    filterLang === 'all'
      ? TOPICAL_PACKS
      : TOPICAL_PACKS.filter((pack) => pack.language === filterLang);

  const handleImport = async (pack: TopicalPack) => {
    setImporting(true);
    try {
      const versesToImport = pack.verses.map((v) => ({
        reference: v.reference,
        text: v.text,
        translation: v.translation || pack.translation,
      }));
      const addedCount = await verseEngine.importVerses(versesToImport);
      Alert.alert(
        'Topical Pack Imported! 🎉',
        addedCount > 0
          ? `Added ${addedCount} new verse(s) from "${pack.title}" to your memory verses!`
          : `All verses from "${pack.title}" are already in your memory verses!`,
        [
          {
            text: 'Great',
            onPress: () => {
              setImporting(false);
              setSelectedPack(null);
              onImportComplete();
              onClose();
            },
          },
        ]
      );
    } catch {
      setImporting(false);
      Alert.alert('Import Failed', 'Unable to save verses to storage.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <Button title="Done" onPress={onClose} />
          <Text style={styles.headerTitle}>Curated Topical Packs</Text>
          <View style={{ width: 50 }} />
        </View>

        {!selectedPack ? (
          // Pack List View with Filter Tabs
          <View style={styles.listContainer}>
            <View style={styles.tabBar}>
              {LANGUAGE_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabButton, filterLang === tab.id && styles.activeTabButton]}
                  onPress={() => setFilterLang(tab.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.tabText, filterLang === tab.id && styles.activeTabText]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              data={displayedPacks}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.packCard}
                  onPress={() => setSelectedPack(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.packIcon}>{item.icon}</Text>
                  <View style={styles.packInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.packTitle}>{item.title}</Text>
                      <LanguageBadge language={item.language} />
                    </View>
                    <Text style={styles.packDesc}>{item.description}</Text>
                    <Text style={styles.verseCount}>
                      {item.verses.length} Verses ({item.translation})
                    </Text>
                  </View>
                  <Text style={styles.chevron}>→</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : (
          // Pack Detail View
          <View style={styles.detailContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => setSelectedPack(null)}>
              <Text style={styles.backButtonText}>← Back to all topical packs</Text>
            </TouchableOpacity>

            <View style={styles.detailHeader}>
              <Text style={styles.detailIcon}>{selectedPack.icon}</Text>
              <View style={styles.detailTitleRow}>
                <Text style={styles.detailTitle}>{selectedPack.title}</Text>
                <LanguageBadge language={selectedPack.language} />
              </View>
              <Text style={styles.detailDesc}>{selectedPack.description}</Text>
            </View>

            <FlatList
              data={selectedPack.verses}
              keyExtractor={(item) => item.reference}
              contentContainerStyle={styles.verseList}
              renderItem={({ item }) => (
                <View style={styles.verseItem}>
                  <View style={styles.verseHeaderRow}>
                    <Text style={styles.verseRef}>{item.reference}</Text>
                    <Text style={styles.verseTranslationBadge}>
                      [{item.translation || selectedPack.translation}]
                    </Text>
                  </View>
                  <Text style={styles.verseText}>{item.text}</Text>
                </View>
              )}
            />

            <View style={styles.importActionWrapper}>
              <Button
                title={importing ? 'Importing...' : `Add All to My Verses (${selectedPack.verses.length})`}
                color="#4f46e5"
                onPress={() => handleImport(selectedPack)}
                disabled={importing}
              />
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.parchment.background },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.parchment.border,
    backgroundColor: colors.parchment.surface,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.scripture,
    fontSize: typography.heading.fontSize,
    fontWeight: '700',
    color: colors.parchment.textPrimary,
  },
  listContainer: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.parchment.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginHorizontal: spacing.md,
    marginTop: spacing.md_sm,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  tabButton: {
    flex: 1,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  activeTabButton: {
    backgroundColor: colors.parchment.surface,
    shadowColor: colors.parchment.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: colors.parchment.textSecondary,
  },
  activeTabText: {
    color: colors.parchment.textPrimary,
    fontWeight: '700',
  },
  listContent: { padding: spacing.md, gap: spacing.md_sm },
  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.parchment.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.parchment.border,
  },
  packIcon: { fontSize: 32, marginRight: spacing.md },
  packInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  packTitle: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.subheading.fontSize,
    fontWeight: '700',
    color: colors.parchment.textPrimary,
  },
  langBadge: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    fontWeight: '700',
  },
  langBadgeEn: {
    backgroundColor: colors.parchment.surfaceMuted,
    color: colors.parchment.textSecondary,
  },
  langBadgePt: {
    backgroundColor: colors.parchment.diffMatchBg,
    color: colors.parchment.diffMatchText,
  },
  packDesc: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    color: colors.parchment.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  verseCount: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    color: colors.parchment.accentSacred,
    fontWeight: '600',
  },
  chevron: { fontSize: 20, color: colors.parchment.textSecondary, marginLeft: spacing.sm },
  detailContainer: { flex: 1, padding: spacing.md },
  backButton: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  backButtonText: {
    fontFamily: typography.fontFamily.ui,
    color: colors.parchment.accentSacred,
    fontWeight: '600',
    fontSize: typography.body.fontSize,
  },
  detailHeader: { alignItems: 'center', marginBottom: spacing.md },
  detailIcon: { fontSize: 40, marginBottom: spacing.xs },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailTitle: {
    fontFamily: typography.fontFamily.scripture,
    fontSize: typography.heading.fontSize,
    fontWeight: 'bold',
    color: colors.parchment.textPrimary,
  },
  detailDesc: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    color: colors.parchment.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  verseList: { paddingBottom: 80 },
  verseItem: {
    backgroundColor: colors.parchment.surface,
    padding: spacing.md_sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.parchment.border,
  },
  verseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  verseRef: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.subheading.fontSize,
    fontWeight: 'bold',
    color: colors.parchment.textPrimary,
  },
  verseTranslationBadge: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.badge.fontSize,
    backgroundColor: colors.parchment.surfaceMuted,
    color: colors.parchment.textSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    fontWeight: '600',
  },
  verseText: {
    fontFamily: typography.fontFamily.scripture,
    fontSize: typography.scriptureBody.fontSize,
    color: colors.parchment.textPrimary,
    lineHeight: typography.scriptureBody.lineHeight,
  },
  importActionWrapper: {
    position: 'absolute',
    bottom: 24,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.parchment.surface,
    padding: spacing.sm,
    borderRadius: radius.lg,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.parchment.border,
  },
});
