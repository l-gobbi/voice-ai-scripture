import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { verseEngine, Verse, VerseSummary } from '../services/VerseEngine';
import { bibleProvider, SupportedTranslation } from '../services/BibleProvider';
import { parseScriptureClipboard } from '../utils/clipboardParser';
import { normalizeReference } from '../services/ReferenceNormalizer';
import ReviewScreen from './ReviewScreen';
import PackBrowserModal from '../components/PackBrowserModal';
import ReminderSettingsModal from '../components/ReminderSettingsModal';

interface TranslationOption {
  code: string;
  label: string;
  name: string;
  isBundled: boolean;
}

const TRANSLATION_GROUPS: Array<{ groupName: string; options: TranslationOption[] }> = [
  {
    groupName: '🇺🇸 English',
    options: [
      { code: 'WEB', label: 'WEB', name: 'World English Bible', isBundled: true },
      { code: 'KJV', label: 'KJV', name: 'King James Version', isBundled: true },
    ],
  },
  {
    groupName: '🇧🇷 Português',
    options: [
      { code: 'ALMEIDA', label: 'Almeida', name: 'João Ferreira de Almeida', isBundled: true },
      { code: 'ONBV', label: 'ONBV', name: 'Nova Bíblia Viva', isBundled: true },
    ],
  },
  {
    groupName: '📋 Copiada / Custom',
    options: [
      { code: 'NVI', label: 'NVI', name: 'Nova Versão Internacional', isBundled: false },
      { code: 'ARA', label: 'ARA', name: 'Almeida Revista e Atualizada', isBundled: false },
      { code: 'ESV', label: 'ESV', name: 'English Standard Version', isBundled: false },
      { code: 'CUSTOM', label: 'Outra', name: 'Personalizada', isBundled: false },
    ],
  },
];

const BUNDLED_CODES = new Set(['WEB', 'KJV', 'ALMEIDA', 'ONBV']);

export default function HomeScreen() {
  const [summary, setSummary] = useState<VerseSummary>({
    allVerses: [],
    dueVerses: [],
    dueCount: 0,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [packBrowserVisible, setPackBrowserVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);

  const [reference, setReference] = useState('');
  const [text, setText] = useState('');
  const [selectedTranslation, setSelectedTranslation] = useState<string>('WEB');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchNotice, setFetchNotice] = useState<string | null>(null);

  const [activeReviewVerse, setActiveReviewVerse] = useState<Verse | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'due'>('due');

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedTextRef = useRef<string>('');

  const loadVerses = async () => {
    const data = await verseEngine.getVersesSummary();
    setSummary(data);
  };

  useEffect(() => {
    loadVerses();
  }, []);

  const fetchPassageText = async (refQuery: string, translation: string, manual = false) => {
    const trimmed = refQuery.trim();
    if (!trimmed) {
      if (manual) {
        setFetchNotice('Por favor, informe a referência bíblica.');
      }
      return;
    }

    const norm = normalizeReference(trimmed);
    if (!norm) {
      if (manual) {
        setFetchNotice('Referência não reconhecida. Ex: João 3:16 ou Rom 8:28.');
      }
      return;
    }

    if (!BUNDLED_CODES.has(translation.toUpperCase())) {
      if (manual) {
        setFetchNotice('Esta tradução requer digitação manual ou o botão "Colar".');
      }
      return;
    }

    try {
      setIsFetching(true);
      setFetchNotice(null);
      const passage = await bibleProvider.fetchPassage(trimmed, translation);
      if (passage && passage.text) {
        setText(passage.text);
        lastFetchedTextRef.current = passage.text;
        setFetchNotice(null);
      } else if (manual) {
        setFetchNotice(`Passagem não encontrada na versão ${translation}.`);
      }
    } catch {
      if (manual) {
        setFetchNotice('Erro ao buscar passagem.');
      }
    } finally {
      setIsFetching(false);
    }
  };

  // Debounced auto-fetch (500ms)
  useEffect(() => {
    if (!modalVisible) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = reference.trim();
    if (!trimmed || !BUNDLED_CODES.has(selectedTranslation.toUpperCase())) {
      return;
    }

    // Only auto-fetch if text is empty or matches what was previously auto-fetched
    if (text === '' || text === lastFetchedTextRef.current) {
      debounceTimerRef.current = setTimeout(() => {
        fetchPassageText(trimmed, selectedTranslation, false);
      }, 500);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [reference, selectedTranslation, modalVisible]);

  const handlePasteClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      const parsed = parseScriptureClipboard(clipboardContent);
      if (!parsed) {
        setFetchNotice('A área de transferência está vazia.');
        return;
      }

      if (parsed.reference) {
        setReference(parsed.reference);
      }
      if (parsed.text) {
        setText(parsed.text);
        lastFetchedTextRef.current = parsed.text;
      }
      if (parsed.translation) {
        const transUpper = parsed.translation.toUpperCase();
        setSelectedTranslation(transUpper);
      }
      setFetchNotice('Texto colado da área de transferência com sucesso!');
    } catch {
      setFetchNotice('Não foi possível ler a área de transferência.');
    }
  };

  const handleSave = async () => {
    if (!reference || !text) return;
    await verseEngine.addVerse({
      reference,
      text,
      translation: selectedTranslation,
    });
    setReference('');
    setText('');
    setSelectedTranslation('WEB');
    setFetchNotice(null);
    setModalVisible(false);
    await loadVerses();
  };

  const handleCancelModal = () => {
    setReference('');
    setText('');
    setFetchNotice(null);
    setModalVisible(false);
  };

  if (activeReviewVerse) {
    return (
      <ReviewScreen
        verse={activeReviewVerse}
        onComplete={() => {
          setActiveReviewVerse(null);
          loadVerses();
        }}
      />
    );
  }

  const displayedVerses = filterMode === 'due' ? summary.dueVerses : summary.allVerses;
  const dueCount = summary.dueCount;
  const isCopyrighted = !BUNDLED_CODES.has(selectedTranslation.toUpperCase());

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>My Memory Verses</Text>
        <TouchableOpacity
          style={styles.reminderHeaderButton}
          onPress={() => setReminderModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.reminderButtonText}>⏰ Reminders</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, filterMode === 'due' && styles.activeTabButton]}
          onPress={() => setFilterMode('due')}
        >
          <Text style={[styles.tabText, filterMode === 'due' && styles.activeTabText]}>
            🔥 Due Today ({dueCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, filterMode === 'all' && styles.activeTabButton]}
          onPress={() => setFilterMode('all')}
        >
          <Text style={[styles.tabText, filterMode === 'all' && styles.activeTabText]}>
            📚 All ({summary.allVerses.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayedVerses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const streak = item.srs?.streak ?? item.srs?.repetitions;
          return (
            <TouchableOpacity
              style={styles.verseCard}
              onPress={() => setActiveReviewVerse(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <Text style={styles.verseReference}>{item.reference}</Text>
                  {item.translation ? (
                    <Text style={styles.translationBadge}>[{item.translation}]</Text>
                  ) : null}
                </View>
                {streak !== undefined && streak > 0 && (
                  <Text style={styles.streakBadge}>Streak: {streak}</Text>
                )}
              </View>
              <Text style={styles.tapPrompt}>Tap to practice →</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {filterMode === 'due'
              ? '🎉 All caught up for today! No verses due.'
              : 'No verses added yet. Add one below!'}
          </Text>
        }
      />

      <View style={styles.footerButtons}>
        <View style={styles.buttonSpacing}>
          <Button
            title="📖 Browse Topical Packs"
            color="#4f46e5"
            onPress={() => setPackBrowserVisible(true)}
          />
        </View>
        <View style={styles.buttonSpacing}>
          <Button title="+ Type Custom Verse" color="#4b5563" onPress={() => setModalVisible(true)} />
        </View>
      </View>

      <PackBrowserModal
        visible={packBrowserVisible}
        onClose={() => setPackBrowserVisible(false)}
        onImportComplete={loadVerses}
      />

      <ReminderSettingsModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
      />

      {/* Add Verse Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.modalSafeArea}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <Text style={styles.modalHeader}>Add New Verse</Text>

            {/* Translation Selection Section */}
            <Text style={styles.sectionLabel}>Tradução / Translation</Text>
            <View style={styles.translationSection}>
              {TRANSLATION_GROUPS.map((group) => (
                <View key={group.groupName} style={styles.groupContainer}>
                  <Text style={styles.groupTitle}>{group.groupName}</Text>
                  <View style={styles.chipRow}>
                    {group.options.map((opt) => {
                      const isSelected = selectedTranslation.toUpperCase() === opt.code.toUpperCase();
                      return (
                        <TouchableOpacity
                          key={opt.code}
                          style={[styles.chip, isSelected && styles.activeChip]}
                          onPress={() => {
                            setSelectedTranslation(opt.code);
                            setFetchNotice(null);
                          }}
                        >
                          <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>

            {/* Copyright Notice for Pasted Translations */}
            {isCopyrighted && (
              <View style={styles.copyrightBanner}>
                <Text style={styles.copyrightText}>
                  ℹ️ Esta tradução não está embutida offline por direitos autorais. Use o botão
                  "Colar da Área de Transferência" abaixo ou digite o texto manualmente.
                </Text>
              </View>
            )}

            {/* Reference Input & Manual Fetch Button */}
            <Text style={styles.inputLabel}>Referência Bíblica</Text>
            <View style={styles.referenceRow}>
              <TextInput
                style={[styles.input, styles.referenceInput]}
                placeholder="Reference (e.g. John 3:16)"
                value={reference}
                onChangeText={setReference}
              />
              <TouchableOpacity
                style={styles.fetchButton}
                onPress={() => fetchPassageText(reference, selectedTranslation, true)}
                activeOpacity={0.7}
                disabled={isFetching}
              >
                {isFetching ? (
                  <ActivityIndicator size="small" color="#4338ca" />
                ) : (
                  <Text style={styles.fetchButtonText}>🔍 Buscar Texto</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* 1-Tap Paste from Clipboard */}
            <TouchableOpacity
              style={styles.clipboardButton}
              onPress={handlePasteClipboard}
              activeOpacity={0.7}
            >
              <Text style={styles.clipboardButtonText}>📋 Colar da Área de Transferência</Text>
            </TouchableOpacity>

            {/* Notice / Feedback banner */}
            {fetchNotice && (
              <Text style={styles.noticeText}>{fetchNotice}</Text>
            )}

            {/* Verse Text Area */}
            <Text style={styles.inputLabel}>Texto do Versículo</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Verse text..."
              value={text}
              onChangeText={setText}
              multiline
            />

            <View style={styles.modalButtons}>
              <Button title="Cancel" color="red" onPress={handleCancelModal} />
              <Button title="Save Verse" onPress={handleSave} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  reminderHeaderButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  reminderButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338ca',
  },
  verseCard: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verseReference: { fontSize: 18, fontWeight: '600', color: '#1f2937' },
  translationBadge: {
    fontSize: 12,
    backgroundColor: '#f1f5f9',
    color: '#475569',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
  },
  streakBadge: {
    fontSize: 12,
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontWeight: '600',
  },
  tapPrompt: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#6b7280' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#1e293b',
  },
  footerButtons: {
    paddingBottom: 36,
    paddingTop: 12,
  },
  buttonSpacing: {
    marginBottom: 12,
  },
  modalSafeArea: { flex: 1, backgroundColor: '#f9fafb' },
  modalScrollContent: { padding: 20 },
  modalHeader: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  translationSection: { marginBottom: 14 },
  groupContainer: { marginBottom: 8 },
  groupTitle: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  activeChip: {
    backgroundColor: '#4f46e5',
  },
  chipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  activeChipText: {
    color: 'white',
    fontWeight: '700',
  },
  copyrightBanner: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  copyrightText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
  },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  referenceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
  },
  referenceInput: {
    flex: 1,
  },
  fetchButton: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fetchButtonText: {
    color: '#4338ca',
    fontWeight: '600',
    fontSize: 13,
  },
  clipboardButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  clipboardButtonText: {
    color: '#15803d',
    fontWeight: '600',
    fontSize: 13,
  },
  noticeText: {
    fontSize: 12,
    color: '#4338ca',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    marginBottom: 24,
  },
});
