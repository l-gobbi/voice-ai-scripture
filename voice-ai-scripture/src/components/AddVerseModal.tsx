import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { verseEngine, VerseTranslation } from '../services/VerseEngine';
import { bibleProvider, isBundledTranslation } from '../services/BibleProvider';
import { parseScriptureClipboard } from '../utils/clipboardParser';
import { normalizeReference } from '../services/ReferenceNormalizer';
import ReferencePickerModal from './ReferencePickerModal';

export interface AddVerseModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

interface TranslationOption {
  code: string;
  label: string;
  isBundled: boolean;
}

export const TRANSLATION_GROUPS: Array<{ groupName: string; options: TranslationOption[] }> = [
  {
    groupName: '🇺🇸 English',
    options: [
      { code: 'WEB', label: 'WEB (World English Bible)', isBundled: true },
      { code: 'KJV', label: 'KJV (King James Version)', isBundled: true },
    ],
  },
  {
    groupName: '🇧🇷 Português',
    options: [
      { code: 'ALMEIDA', label: 'Almeida (JFA)', isBundled: true },
      { code: 'ONBV', label: 'ONBV (Nova Bíblia Viva)', isBundled: true },
    ],
  },
  {
    groupName: '📋 Copiada',
    options: [
      { code: 'NVI', label: 'NVI', isBundled: false },
      { code: 'ARA', label: 'ARA', isBundled: false },
      { code: 'ESV', label: 'ESV', isBundled: false },
      { code: 'CUSTOM', label: 'Outra (Personalizada)', isBundled: false },
    ],
  },
];

const KNOWN_MODAL_CODES = new Set(
  TRANSLATION_GROUPS.flatMap((group) => group.options.map((opt) => opt.code))
);

export default function AddVerseModal({ visible, onClose, onSaveSuccess }: AddVerseModalProps) {
  const [reference, setReference] = useState('');
  const [text, setText] = useState('');
  const [selectedTranslation, setSelectedTranslation] = useState<VerseTranslation>('WEB');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchNotice, setFetchNotice] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textAreaRef = useRef<TextInput | null>(null);

  const fetchVerseText = async (refQuery: string, translation: string, manual = false) => {
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

    if (!isBundledTranslation(translation)) {
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
        setFetchNotice(null);
      } else if (manual) {
        setFetchNotice(`Versículo não encontrado na versão ${translation}.`);
      }
    } catch {
      if (manual) {
        setFetchNotice('Erro ao buscar versículo.');
      }
    } finally {
      setIsFetching(false);
    }
  };

  // Debounced auto-fetch (500ms)
  useEffect(() => {
    if (!visible) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = reference.trim();
    if (!trimmed || !isBundledTranslation(selectedTranslation)) {
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchVerseText(trimmed, selectedTranslation, false);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [reference, selectedTranslation, visible]);

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
      }
      if (parsed.translation) {
        const transUpper = parsed.translation.toUpperCase();
        if (KNOWN_MODAL_CODES.has(transUpper)) {
          setSelectedTranslation(transUpper);
        } else {
          // If translation is not explicitly in groups (e.g. NIV, NVT), fallback to CUSTOM
          setSelectedTranslation('CUSTOM');
        }
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
    onSaveSuccess();
    onClose();
  };

  const handleCancelModal = () => {
    setReference('');
    setText('');
    setFetchNotice(null);
    setPickerVisible(false);
    onClose();
  };

  const handleSelectReference = (canonicalRef: string) => {
    setReference(canonicalRef);
    setPickerVisible(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (isBundledTranslation(selectedTranslation)) {
      fetchVerseText(canonicalRef, selectedTranslation, false);
    } else {
      setFetchNotice('Referência definida! Cole o texto da sua Bíblia ou digite-o abaixo.');
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);
    }
  };

  const isCopyrighted = !isBundledTranslation(selectedTranslation);

  return (
    <Modal visible={visible} animationType="slide">
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

          {/* Reference Input & Guided Picker Trigger */}
          <View style={styles.referenceHeaderRow}>
            <Text style={styles.inputLabel}>Referência Bíblica</Text>
            <TouchableOpacity
              testID="open-reference-picker-btn"
              style={styles.pickerTriggerBtn}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerTriggerBtnText}>📖 Escolher da Bíblia</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.referenceRow}>
            <TextInput
              style={[styles.input, styles.referenceInput]}
              placeholder="Reference (e.g. John 3:16)"
              value={reference}
              onChangeText={setReference}
            />
            <TouchableOpacity
              style={styles.fetchButton}
              onPress={() => fetchVerseText(reference, selectedTranslation, true)}
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
          {fetchNotice && <Text style={styles.noticeText}>{fetchNotice}</Text>}

          {/* Verse Text Area */}
          <Text style={styles.inputLabel}>Texto do Versículo</Text>
          <TextInput
            ref={textAreaRef}
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

      <ReferencePickerModal
        visible={pickerVisible}
        translation={selectedTranslation}
        onClose={() => setPickerVisible(false)}
        onSelectReference={handleSelectReference}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  referenceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pickerTriggerBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pickerTriggerBtnText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '600',
  },
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
