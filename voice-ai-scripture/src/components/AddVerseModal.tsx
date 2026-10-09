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
import { scriptureCatalog } from '../services/ScriptureCatalog';
import { parseScriptureClipboard } from '../utils/clipboardParser';
import ReferencePickerModal from './ReferencePickerModal';
import TranslationsCopyrightModal from './TranslationsCopyrightModal';
import { colors, typography, spacing, radius, touchTarget } from '../theme/tokens';

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
      { code: 'BSB', label: 'BSB (Berean Standard Bible)', isBundled: true },
      { code: 'WEB', label: 'WEB (World English Bible)', isBundled: true },
    ],
  },
  {
    groupName: '🇧🇷 Português',
    options: [
      { code: 'BLIVRE', label: 'Bíblia Livre (BLIVRE)', isBundled: true },
      // "Open" is part of the licensed title; plain Nova Bíblia Viva is a different text.
      { code: 'ONBV', label: 'ONBV (Open Nova Bíblia Viva)', isBundled: true },
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

// Until the Preferred Translation exists (ticket 82), new verses start in the catalog's
// English default, as they did with the WEB.
const DEFAULT_TRANSLATION: VerseTranslation = scriptureCatalog.getDefaultTranslation('en');

export default function AddVerseModal({ visible, onClose, onSaveSuccess }: AddVerseModalProps) {
  const [reference, setReference] = useState('');
  const [text, setText] = useState('');
  const [deck, setDeck] = useState('');
  const [selectedTranslation, setSelectedTranslation] = useState<VerseTranslation>(DEFAULT_TRANSLATION);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchNotice, setFetchNotice] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [copyrightVisible, setCopyrightVisible] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textAreaRef = useRef<TextInput | null>(null);
  const skipNextAutoFetchRef = useRef(false);

  const fetchVerseText = async (refQuery: string, translation: string, manual = false) => {
    const trimmed = refQuery.trim();
    if (!trimmed) {
      if (manual) {
        setFetchNotice('Por favor, informe a referência bíblica.');
      }
      return;
    }

    try {
      setIsFetching(true);
      setFetchNotice(null);

      const resolved = scriptureCatalog.resolvePassage(trimmed, translation);
      if (!resolved) {
        if (manual) {
          setFetchNotice('Referência não reconhecida. Ex: João 3:16 ou Rom 8:28.');
        }
        return;
      }

      if (!resolved.isBundled) {
        if (manual) {
          setFetchNotice('Esta tradução requer digitação manual ou o botão "Colar".');
        }
        return;
      }

      if (resolved.text) {
        setText(resolved.text);
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

    if (skipNextAutoFetchRef.current) {
      skipNextAutoFetchRef.current = false;
      return;
    }

    const trimmed = reference.trim();
    if (!trimmed || !scriptureCatalog.isBundledTranslation(selectedTranslation)) {
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
      deck: deck.trim() ? deck.trim().replace(/^#/, '') : undefined,
    });
    setReference('');
    setText('');
    setDeck('');
    setSelectedTranslation(DEFAULT_TRANSLATION);
    setFetchNotice(null);
    onSaveSuccess();
    onClose();
  };

  const handleCancelModal = () => {
    setReference('');
    setText('');
    setDeck('');
    setFetchNotice(null);
    setPickerVisible(false);
    setCopyrightVisible(false);
    onClose();
  };

  const handleSelectReference = (canonicalRef: string) => {
    skipNextAutoFetchRef.current = true;
    setReference(canonicalRef);
    setPickerVisible(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const resolved = scriptureCatalog.resolvePassage(canonicalRef, selectedTranslation);
    if (resolved?.isBundled && resolved.text) {
      setText(resolved.text);
      setFetchNotice(null);
    } else if (resolved && !resolved.isBundled) {
      setFetchNotice('Referência definida! Cole o texto da sua Bíblia ou digite-o abaixo.');
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);
    }
  };

  const isCopyrighted = !scriptureCatalog.isBundledTranslation(selectedTranslation);

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.modalSafeArea}>
        <ScrollView contentContainerStyle={styles.modalScrollContent}>
          <Text style={styles.modalHeader}>Add New Verse</Text>

          {/* Translation Selection Section */}
          <View style={styles.translationHeaderRow}>
            <Text style={styles.sectionLabel}>Tradução / Translation</Text>
            <TouchableOpacity
              testID="open-translations-copyright-add-verse"
              style={styles.copyrightLink}
              onPress={() => setCopyrightVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="link"
            >
              <Text style={styles.copyrightLinkText}>Direitos autorais / Copyright</Text>
            </TouchableOpacity>
          </View>
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

          {/* Deck Tag */}
          <Text style={styles.inputLabel}># Tag / Deck (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="#Deck (ex: Peace, Romans Road)"
            value={deck}
            onChangeText={setDeck}
            testID="add-verse-deck-input"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalActionBtn, styles.cancelBtn]}
              onPress={handleCancelModal}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalActionBtn, styles.saveBtn]}
              onPress={handleSave}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.saveBtnText}>Save Verse</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <ReferencePickerModal
        visible={pickerVisible}
        translation={selectedTranslation}
        onClose={() => setPickerVisible(false)}
        onSelectReference={handleSelectReference}
      />

      <TranslationsCopyrightModal
        visible={copyrightVisible}
        onClose={() => setCopyrightVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.parchment.background,
  },
  modalScrollContent: {
    padding: spacing.md,
  },
  modalHeader: {
    fontFamily: typography.fontFamily.scripture,
    fontSize: typography.heading.fontSize,
    lineHeight: typography.heading.lineHeight,
    fontWeight: typography.heading.fontWeight,
    marginBottom: spacing.md,
    color: colors.parchment.textPrimary,
  },
  translationHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.subheading.fontSize,
    fontWeight: typography.subheading.fontWeight,
    color: colors.parchment.textPrimary,
    marginBottom: spacing.xs,
  },
  copyrightLink: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  copyrightLinkText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: '600',
    color: colors.parchment.accentSacred,
    textDecorationLine: 'underline',
  },
  translationSection: {
    marginBottom: spacing.md,
  },
  groupContainer: {
    marginBottom: spacing.sm,
  },
  groupTitle: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    color: colors.parchment.textSecondary,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    minHeight: touchTarget.min,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.parchment.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.parchment.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeChip: {
    backgroundColor: colors.parchment.accentSacred,
    borderColor: colors.parchment.accentSacred,
  },
  chipText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    color: colors.parchment.textPrimary,
    fontWeight: '500',
  },
  activeChipText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  copyrightBanner: {
    backgroundColor: colors.parchment.surfaceMuted,
    borderColor: colors.parchment.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  copyrightText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    color: colors.parchment.textSecondary,
    lineHeight: 16,
  },
  inputLabel: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.subheading.fontSize,
    fontWeight: typography.subheading.fontWeight,
    color: colors.parchment.textPrimary,
    marginBottom: spacing.xs,
  },
  referenceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  pickerTriggerBtn: {
    minHeight: touchTarget.min,
    backgroundColor: colors.parchment.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.parchment.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerTriggerBtnText: {
    fontFamily: typography.fontFamily.ui,
    color: colors.parchment.accentSacred,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  referenceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    minHeight: touchTarget.min,
    borderWidth: 1,
    borderColor: colors.parchment.border,
    backgroundColor: colors.parchment.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    fontSize: typography.body.fontSize,
    color: colors.parchment.textPrimary,
  },
  referenceInput: {
    flex: 1,
  },
  fetchButton: {
    minHeight: touchTarget.min,
    backgroundColor: colors.parchment.surfaceMuted,
    borderColor: colors.parchment.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fetchButtonText: {
    fontFamily: typography.fontFamily.ui,
    color: colors.parchment.accentSacred,
    fontWeight: '600',
    fontSize: typography.body.fontSize,
  },
  clipboardButton: {
    minHeight: touchTarget.min,
    backgroundColor: colors.parchment.surfaceMuted,
    borderColor: colors.parchment.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  clipboardButtonText: {
    fontFamily: typography.fontFamily.ui,
    color: colors.parchment.accentSacred,
    fontWeight: '600',
    fontSize: typography.body.fontSize,
  },
  noticeText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    color: colors.parchment.accentSacred,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  textArea: {
    fontFamily: typography.fontFamily.scripture,
    minHeight: 110,
    fontSize: typography.scriptureBody.fontSize,
    lineHeight: typography.scriptureBody.lineHeight,
    color: colors.parchment.textPrimary,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  modalActionBtn: {
    flex: 1,
    minHeight: touchTarget.min,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  cancelBtn: {
    backgroundColor: colors.parchment.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.parchment.border,
  },
  cancelBtnText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.parchment.diffMissedText,
  },
  saveBtn: {
    backgroundColor: colors.parchment.accentSacred,
  },
  saveBtnText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: '#ffffff',
  },
});
