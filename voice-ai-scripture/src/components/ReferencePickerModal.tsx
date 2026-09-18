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
import {
  CanonBook,
  getCanonBooks,
  searchCanonBooks,
  getVerseCount,
} from '../data/bibleCanon';

export interface ReferencePickerModalProps {
  visible: boolean;
  translation: VerseTranslation;
  onClose: () => void;
  onSelectReference: (canonicalRef: string) => void;
}

type Step = 'book' | 'chapter' | 'verse';
type TestamentFilter = 'all' | 'OT' | 'NT';

const PT_TRANSLATIONS = new Set([
  'ALMEIDA',
  'ONBV',
  'NVI',
  'ARA',
  'NAA',
  'NTLH',
  'ARC',
  'NVT',
]);

export default function ReferencePickerModal({
  visible,
  translation,
  onClose,
  onSelectReference,
}: ReferencePickerModalProps) {
  const isPt = useMemo(() => {
    return PT_TRANSLATIONS.has((translation ?? '').toUpperCase().trim());
  }, [translation]);

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
      setStartVerse(null);
      setEndVerse(null);
    } else if (step === 'chapter') {
      setStep('book');
      setSelectedChapter(null);
    } else {
      onClose();
    }
  };

  const handleJumpToBook = () => {
    setStep('book');
    setSelectedChapter(null);
    setStartVerse(null);
    setEndVerse(null);
  };

  const handleJumpToChapter = () => {
    setStep('chapter');
    setStartVerse(null);
    setEndVerse(null);
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

            {selectedBook && (
              <>
                <Text style={styles.breadcrumbSeparator}>›</Text>
                <TouchableOpacity
                  onPress={handleJumpToChapter}
                  disabled={step === 'chapter'}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.breadcrumbText,
                      step === 'chapter'
                        ? styles.breadcrumbActive
                        : styles.breadcrumbInactive,
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
              </>
            )}

            {selectedChapter && (
              <>
                <Text style={styles.breadcrumbSeparator}>›</Text>
                <Text
                  style={[
                    styles.breadcrumbText,
                    step === 'verse' ? styles.breadcrumbActive : styles.breadcrumbInactive,
                  ]}
                >
                  {isPt ? 'Versículo' : 'Verse'}
                </Text>
              </>
            )}
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
                return (
                  <TouchableOpacity
                    style={styles.bookRow}
                    onPress={() => handleSelectBook(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.bookRowName}>{name}</Text>
                    <View style={styles.testamentBadge}>
                      <Text style={styles.testamentBadgeText}>{item.testament}</Text>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  headerBtnText: {
    fontSize: 24,
    color: '#334155',
    fontWeight: '300',
    marginTop: -2,
  },
  closeBtnText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: 'bold',
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    paddingHorizontal: 8,
  },
  breadcrumbText: {
    fontSize: 15,
    fontWeight: '600',
  },
  breadcrumbActive: {
    color: '#4f46e5',
  },
  breadcrumbInactive: {
    color: '#64748b',
  },
  breadcrumbSeparator: {
    marginHorizontal: 6,
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepContainer: {
    flex: 1,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#1e293b',
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  tabBtnActive: {
    backgroundColor: '#4f46e5',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  bookListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 1,
  },
  bookRowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  testamentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  testamentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginHorizontal: 16,
    marginVertical: 14,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 8,
  },
  gridContainerWithBottomBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 96,
    gap: 8,
  },
  gridItem: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  gridItemInRange: {
    backgroundColor: '#e0e7ff',
    borderColor: '#c7d2fe',
  },
  gridItemSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4338ca',
  },
  gridItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  gridItemTextInRange: {
    color: '#3730a3',
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
    color: '#94a3b8',
  },
  floatingActionWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  confirmPillBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  confirmPillBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
