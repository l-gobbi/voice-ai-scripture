import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VerseTranslation } from '../services/VerseEngine';
import { isPortugueseTranslation } from '../services/BibleProvider';
import {
  CanonBook,
  getCanonBooks,
  searchCanonBooks,
  getVerseCount,
} from '../data/bibleCanon';
import { colors, typography, spacing, radius, touchTarget } from '../theme/tokens';

export interface ReferencePickerModalProps {
  visible: boolean;
  translation: VerseTranslation;
  onClose: () => void;
  onSelectReference: (canonicalRef: string) => void;
}

type Step = 'book' | 'chapter' | 'verse';
type TestamentFilter = 'all' | 'OT' | 'NT';

export default function ReferencePickerModal({
  visible,
  translation,
  onClose,
  onSelectReference,
}: ReferencePickerModalProps) {
  const isPt = useMemo(() => isPortugueseTranslation(translation), [translation]);

  const [step, setStep] = useState<Step>('book');
  const [selectedBook, setSelectedBook] = useState<CanonBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [startVerse, setStartVerse] = useState<number | null>(null);
  const [endVerse, setEndVerse] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [testamentFilter, setTestamentFilter] = useState<TestamentFilter>('all');

  useEffect(() => {
    if (visible) {
      setStep('book');
      setSelectedBook(null);
      setSelectedChapter(null);
      setStartVerse(null);
      setEndVerse(null);
      setSearchQuery('');
      setTestamentFilter('all');
    }
  }, [visible]);

  const bookName = selectedBook ? (isPt ? selectedBook.ptName : selectedBook.enName) : '';

  const displayedBooks = useMemo(() => {
    const filter = testamentFilter === 'all' ? undefined : testamentFilter;
    if (searchQuery.trim()) {
      return searchCanonBooks(searchQuery, filter);
    }
    return getCanonBooks(filter);
  }, [searchQuery, testamentFilter]);

  const handleSelectBook = (book: CanonBook) => {
    setSelectedBook(book);
    setSelectedChapter(null);
    setStartVerse(null);
    setEndVerse(null);
    setStep('chapter');
  };

  const handleSelectChapter = (chapterNum: number) => {
    setSelectedChapter(chapterNum);
    setStartVerse(null);
    setEndVerse(null);
    setStep('verse');
  };

  const handleSelectVerse = (verseNum: number) => {
    if (startVerse === null) {
      setStartVerse(verseNum);
      setEndVerse(null);
    } else if (endVerse === null) {
      if (verseNum === startVerse) {
        // Keep single verse
        setStartVerse(verseNum);
      } else if (verseNum > startVerse) {
        setEndVerse(verseNum);
      } else {
        // verseNum < startVerse -> swap so range is in order
        setEndVerse(startVerse);
        setStartVerse(verseNum);
      }
    } else {
      // Both were set, reset to this verse as single
      setStartVerse(verseNum);
      setEndVerse(null);
    }
  };

  const handleConfirm = () => {
    if (!selectedBook || !selectedChapter || startVerse === null) return;
    const refBook = isPt ? selectedBook.ptName : selectedBook.enName;
    const span = endVerse !== null ? `${startVerse}-${endVerse}` : `${startVerse}`;
    const canonicalRef = `${refBook} ${selectedChapter}:${span}`;
    onSelectReference(canonicalRef);
    onClose();
  };

  const handleBack = () => {
    if (step === 'verse') {
      setStep('chapter');
    } else if (step === 'chapter') {
      setStep('book');
    } else {
      onClose();
    }
  };

  const handleJumpToBook = () => {
    setStep('book');
  };

  const handleJumpToChapter = () => {
    if (selectedBook) {
      setStep('chapter');
    }
  };

  const handleJumpToVerse = () => {
    if (selectedBook && selectedChapter) {
      setStep('verse');
    }
  };

  const totalVerses =
    selectedBook && selectedChapter
      ? getVerseCount(selectedBook.id, selectedChapter)
      : 0;

  const chaptersArray = useMemo(() => {
    if (!selectedBook) return [];
    return Array.from({ length: selectedBook.chapters }, (_, i) => i + 1);
  }, [selectedBook]);

  const versesArray = useMemo(() => {
    return Array.from({ length: totalVerses }, (_, i) => i + 1);
  }, [totalVerses]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header with Navigation & Breadcrumbs */}
        <View style={styles.header}>
          <TouchableOpacity
            testID="picker-back-btn"
            style={styles.headerBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Text style={styles.headerBtnText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.breadcrumbContainer}>
            {/* Step 1: Book */}
            <TouchableOpacity
              onPress={handleJumpToBook}
              disabled={step === 'book'}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.breadcrumbText,
                  step === 'book' ? styles.breadcrumbActive : styles.breadcrumbInactive,
                ]}
              >
                {selectedBook ? bookName : isPt ? 'Livros' : 'Books'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.breadcrumbSeparator}>›</Text>

            {/* Step 2: Chapter */}
            <TouchableOpacity
              onPress={handleJumpToChapter}
              disabled={!selectedBook || step === 'chapter'}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.breadcrumbText,
                  step === 'chapter'
                    ? styles.breadcrumbActive
                    : selectedBook
                    ? styles.breadcrumbInactive
                    : styles.breadcrumbDisabled,
                ]}
              >
                {selectedChapter
                  ? isPt
                    ? `Cap. ${selectedChapter}`
                    : `Ch. ${selectedChapter}`
                  : isPt
                  ? 'Capítulo'
                  : 'Chapter'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.breadcrumbSeparator}>›</Text>

            {/* Step 3: Verse */}
            <TouchableOpacity
              onPress={handleJumpToVerse}
              disabled={!selectedBook || !selectedChapter || step === 'verse'}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.breadcrumbText,
                  step === 'verse'
                    ? styles.breadcrumbActive
                    : selectedBook && selectedChapter
                    ? styles.breadcrumbInactive
                    : styles.breadcrumbDisabled,
                ]}
              >
                {startVerse !== null
                  ? `${startVerse}${endVerse !== null ? `-${endVerse}` : ''}`
                  : isPt
                  ? 'Versículo'
                  : 'Verse'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="picker-close-btn"
            style={styles.headerBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* STEP 1: BOOK SELECTION */}
        {step === 'book' && (
          <View style={styles.stepContainer}>
            {/* Search Input */}
            <View style={styles.searchWrapper}>
              <TextInput
                style={styles.searchInput}
                autoFocus={true}
                placeholder={
                  isPt ? 'Buscar livro (ex: João, Sl)...' : 'Search book (e.g. John, Ps)...'
                }
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchBtn}
                >
                  <Text style={styles.clearSearchText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Testament Segmented Filter Tabs */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabBtn, testamentFilter === 'all' && styles.tabBtnActive]}
                onPress={() => setTestamentFilter('all')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    testamentFilter === 'all' && styles.tabBtnTextActive,
                  ]}
                >
                  {isPt ? 'Todos (66)' : 'All (66)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, testamentFilter === 'OT' && styles.tabBtnActive]}
                onPress={() => setTestamentFilter('OT')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    testamentFilter === 'OT' && styles.tabBtnTextActive,
                  ]}
                >
                  {isPt ? 'Antigo Testamento (39)' : 'Old Testament (39)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, testamentFilter === 'NT' && styles.tabBtnActive]}
                onPress={() => setTestamentFilter('NT')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    testamentFilter === 'NT' && styles.tabBtnTextActive,
                  ]}
                >
                  {isPt ? 'Novo Testamento (27)' : 'New Testament (27)'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Book List */}
            <FlatList
              data={displayedBooks}
              keyExtractor={(item) => item.id}
              initialNumToRender={66}
              maxToRenderPerBatch={66}
              contentContainerStyle={styles.bookListContent}
              renderItem={({ item }) => {
                const name = isPt ? item.ptName : item.enName;
                const testamentLabel = isPt
                  ? item.testament === 'OT'
                    ? 'AT'
                    : 'NT'
                  : item.testament;
                return (
                  <TouchableOpacity
                    style={styles.bookRow}
                    onPress={() => handleSelectBook(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.bookRowName}>{name}</Text>
                    <View style={styles.testamentBadge}>
                      <Text style={styles.testamentBadgeText}>{testamentLabel}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {isPt ? 'Nenhum livro encontrado.' : 'No books found.'}
                  </Text>
                </View>
              }
            />
          </View>
        )}

        {/* STEP 2: CHAPTER SELECTION */}
        {step === 'chapter' && selectedBook && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>
              {isPt ? `Capítulos de ${bookName}` : `Chapters of ${bookName}`}
            </Text>
            <ScrollView contentContainerStyle={styles.gridContainer}>
              {chaptersArray.map((ch) => (
                <TouchableOpacity
                  key={ch}
                  style={styles.gridItem}
                  onPress={() => handleSelectChapter(ch)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.gridItemText}>{ch}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* STEP 3: VERSE SELECTION */}
        {step === 'verse' && selectedBook && selectedChapter && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>
              {isPt
                ? `${bookName} ${selectedChapter}: Escolha o versículo`
                : `${bookName} ${selectedChapter}: Choose verse`}
            </Text>
            <ScrollView contentContainerStyle={styles.gridContainerWithBottomBar}>
              {versesArray.map((v) => {
                const isStart = startVerse === v;
                const isEnd = endVerse === v;
                const inRange =
                  startVerse !== null &&
                  endVerse !== null &&
                  v >= startVerse &&
                  v <= endVerse;

                const isSelected = isStart || isEnd;

                return (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.gridItem,
                      inRange && styles.gridItemInRange,
                      isSelected && styles.gridItemSelected,
                    ]}
                    onPress={() => handleSelectVerse(v)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.gridItemText,
                        inRange && styles.gridItemTextInRange,
                        isSelected && styles.gridItemTextSelected,
                      ]}
                    >
                      {v}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Floating Confirmation Bar */}
            {startVerse !== null && (
              <View style={styles.floatingActionWrapper}>
                <TouchableOpacity
                  style={styles.confirmPillBtn}
                  onPress={handleConfirm}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmPillBtnText}>
                    {endVerse !== null
                      ? `${isPt ? 'Inserir' : 'Insert'} ${bookName} ${selectedChapter}:${startVerse}-${endVerse}`
                      : `${isPt ? 'Inserir' : 'Insert'} ${bookName} ${selectedChapter}:${startVerse}`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.parchment.border,
    backgroundColor: colors.parchment.surface,
  },
  headerBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.parchment.surfaceMuted,
  },
  headerBtnText: {
    fontSize: 24,
    color: colors.parchment.textPrimary,
    fontWeight: '300',
    marginTop: -2,
  },
  closeBtnText: {
    fontSize: 15,
    color: colors.parchment.textSecondary,
    fontWeight: 'bold',
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
  },
  breadcrumbText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  breadcrumbActive: {
    color: colors.parchment.accentSacred,
  },
  breadcrumbInactive: {
    color: colors.parchment.textSecondary,
  },
  breadcrumbDisabled: {
    color: colors.parchment.border,
  },
  breadcrumbSeparator: {
    marginHorizontal: spacing.xs,
    color: colors.parchment.border,
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepContainer: {
    flex: 1,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md_sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md_sm,
    backgroundColor: colors.parchment.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.parchment.border,
    minHeight: touchTarget.min,
  },
  searchInput: {
    flex: 1,
    height: touchTarget.min,
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    color: colors.parchment.textPrimary,
  },
  clearSearchBtn: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSearchText: {
    fontSize: 14,
    color: colors.parchment.textSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  tabBtn: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.parchment.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.parchment.border,
  },
  tabBtnActive: {
    backgroundColor: colors.parchment.accentSacred,
    borderColor: colors.parchment.accentSacred,
  },
  tabBtnText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: colors.parchment.textSecondary,
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  bookListContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTarget.min,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.parchment.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.parchment.border,
    elevation: 1,
  },
  bookRowName: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.parchment.textPrimary,
  },
  testamentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.parchment.surfaceMuted,
  },
  testamentBadgeText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.badge.fontSize,
    fontWeight: '700',
    color: colors.parchment.textSecondary,
  },
  stepTitle: {
    fontFamily: typography.fontFamily.scripture,
    fontSize: typography.subheading.fontSize,
    fontWeight: 'bold',
    color: colors.parchment.textPrimary,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md_sm,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md_sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  gridContainerWithBottomBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md_sm,
    paddingBottom: 96,
    gap: spacing.sm,
  },
  gridItem: {
    width: '18%',
    minHeight: touchTarget.min,
    aspectRatio: 1,
    backgroundColor: colors.parchment.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.parchment.border,
    elevation: 1,
  },
  gridItemInRange: {
    backgroundColor: colors.parchment.diffAddedBg,
    borderColor: colors.parchment.accentSacred,
  },
  gridItemSelected: {
    backgroundColor: colors.parchment.accentSacred,
    borderColor: colors.parchment.accentSacred,
  },
  gridItemText: {
    fontFamily: typography.fontFamily.ui,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.parchment.textPrimary,
  },
  gridItemTextInRange: {
    color: colors.parchment.diffAddedText,
  },
  gridItemTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.parchment.textSecondary,
  },
  floatingActionWrapper: {
    position: 'absolute',
    bottom: 20,
    left: spacing.md,
    right: spacing.md,
  },
  confirmPillBtn: {
    backgroundColor: colors.parchment.accentSacred,
    borderRadius: radius.pill,
    minHeight: touchTarget.min,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.parchment.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  confirmPillBtnText: {
    fontFamily: typography.fontFamily.ui,
    color: '#ffffff',
    fontSize: typography.body.fontSize,
    fontWeight: 'bold',
  },
});
