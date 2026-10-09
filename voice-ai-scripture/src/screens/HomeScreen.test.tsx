import React from 'react';
import { Share } from 'react-native';
import {
  render,
  fireEvent,
  waitFor,
  act,
  getDefaultNormalizer,
  within,
} from '@testing-library/react-native';
import HomeScreen from './HomeScreen';
import { verseEngine, VerseEngine, MapStorageAdapter } from '../services/VerseEngine';
import { SimulatedVoiceAdapter } from '../services/VoiceInput';
import * as Clipboard from 'expo-clipboard';
import { encodeDeckPayload } from '../utils/deckSharing';
import { toStudyDay } from '../engines/studyDay';
import { scriptureCatalog } from '../services/ScriptureCatalog';

// Mock the verseEngine instance; the pure helpers (Memory Tier) stay real.
jest.mock('../services/VerseEngine', () => {
  const actual = jest.requireActual('../services/VerseEngine');
  const getVersesSummary = jest.fn().mockResolvedValue({
    allVerses: [],
    dueVerses: [],
    dueCount: 0,
  });
  const getHabitStats = jest.fn().mockResolvedValue({
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    completedTodayCount: 0,
    totalDueToday: 0,
    dueCount: 0,
  });
  const getDashboard = jest.fn(async () => ({
    summary: await getVersesSummary(),
    habitStats: await getHabitStats(),
  }));

  return {
    ...actual,
    verseEngine: {
      getDashboard,
      getVersesSummary,
      getHabitStats,
      addVerse: jest.fn().mockResolvedValue({
        id: '1',
        reference: 'John 3:16',
        text: 'For God so loved the world...',
        translation: 'WEB',
      }),
      deleteVerse: jest.fn().mockResolvedValue(true),
      importDeck: jest.fn().mockResolvedValue([]),
      getNextReviewMessage: jest.fn().mockReturnValue('Next review due tomorrow'),
      updateVerse: jest.fn().mockResolvedValue({}),
      getPreferredTranslations: jest.fn().mockResolvedValue({ pt: 'BLIVRE', en: 'BSB' }),
      setPreferredTranslation: jest.fn(async (_language: string, code: string) => code),
    },
  };
});

/**
 * The mocked engine's Preferred Translations, kept in memory so the settings surface and the
 * add-verse picker see each other's changes as they would with the real engine.
 */
function usePreferredTranslations(initial: { pt: string; en: string }) {
  const preferred = { ...initial };
  (verseEngine.getPreferredTranslations as jest.Mock).mockImplementation(async () => ({
    ...preferred,
  }));
  (verseEngine.setPreferredTranslation as jest.Mock).mockImplementation(
    async (language: 'pt' | 'en', code: string) => {
      preferred[language] = code;
      return code;
    }
  );
  return preferred;
}

/** Whether the add-verse translation chip for `code` is the selected one. */
const isChipSelected = (getByTestId: (id: string) => any, code: string) =>
  getByTestId(`translation-chip-${code}`).props.accessibilityState?.selected === true;

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(),
  setStringAsync: jest.fn(),
}));

// The sandbox sample verse, from the bundled Berean Standard Bible (Ticket 81).
const ACTS_2_38_BSB =
  'Peter replied, “Repent and be baptized, every one of you, in the name of Jesus Christ for the forgiveness of your sins, and you will receive the gift of the Holy Spirit.';

describe('HomeScreen Integration (Ticket 16)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verseEngine.getVersesSummary as jest.Mock).mockReset();
    (verseEngine.getVersesSummary as jest.Mock).mockResolvedValue({
      allVerses: [],
      dueVerses: [],
      dueCount: 0,
    });
    ((verseEngine as any).getHabitStats as jest.Mock).mockReset();
    ((verseEngine as any).getHabitStats as jest.Mock).mockResolvedValue({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      completedTodayCount: 0,
      totalDueToday: 0,
      dueCount: 0,
    });
    (verseEngine.getDashboard as jest.Mock).mockReset();
    (verseEngine.getDashboard as jest.Mock).mockImplementation(async () => ({
      summary: await verseEngine.getVersesSummary(),
      habitStats: await (verseEngine as any).getHabitStats(),
    }));
    (verseEngine.importDeck as jest.Mock).mockReset();
    (verseEngine.importDeck as jest.Mock).mockResolvedValue([]);
    (Clipboard.getStringAsync as jest.Mock).mockReset();
    (Clipboard.getStringAsync as jest.Mock).mockResolvedValue('');
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
    usePreferredTranslations({ pt: 'BLIVRE', en: 'BSB' });
  });

  jest.setTimeout(15000);

  it('displays styled translation badge on verse cards', async () => {
    (verseEngine.getVersesSummary as jest.Mock).mockResolvedValueOnce({
      allVerses: [
        { id: '1', reference: 'John 3:16', text: 'For God so loved...', translation: 'WEB' },
        { id: '2', reference: 'Salmos 23:1', text: 'O Senhor é o meu pastor...', translation: 'ALMEIDA' },
      ],
      dueVerses: [
        { id: '1', reference: 'John 3:16', text: 'For God so loved...', translation: 'WEB' },
      ],
      dueCount: 1,
    });

    const { getByText } = await render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('John 3:16')).toBeTruthy();
      expect(getByText('[WEB]')).toBeTruthy();
    });
  });

  it('allows selecting translation, typing reference, and saving verse with translation', async () => {
    const { getByText, getByPlaceholderText, queryByText } = await render(<HomeScreen />);

    // Open Add Verse modal
    await act(async () => {
      fireEvent.press(getByText('+ Type Custom Verse'));
    });

    await waitFor(() => {
      expect(getByPlaceholderText('Reference (e.g. John 3:16)')).toBeTruthy();
    });

    // Select ESV, a label without bundled text, for the learner's own wording
    await act(async () => {
      fireEvent.press(getByText('ESV'));
    });

    const refInput = getByPlaceholderText('Reference (e.g. John 3:16)');
    const textInput = getByPlaceholderText('Verse text...');

    await act(async () => {
      refInput.props.onChangeText('Romans 8:28');
      textInput.props.onChangeText('And we know that all things work together for good...');
    });

    (verseEngine.getVersesSummary as jest.Mock).mockResolvedValueOnce({
      allVerses: [
        {
          id: '1',
          reference: 'Romans 8:28',
          text: 'And we know that all things work together for good...',
          translation: 'ESV',
        },
      ],
      dueVerses: [],
      dueCount: 0,
    });

    await act(async () => {
      fireEvent.press(getByText('Save Verse'));
    });

    await waitFor(() => {
      expect(verseEngine.addVerse).toHaveBeenCalledWith({
        reference: 'Romans 8:28',
        text: 'And we know that all things work together for good...',
        translation: 'ESV',
      });
    });
  });

  it('offers only the open-licensed Bibles as bundled text and defaults to the BSB (Ticket 81)', async () => {
    const { getByText, getByPlaceholderText, queryByText, getByTestId } = await render(
      <HomeScreen />
    );

    await act(async () => {
      fireEvent.press(getByText('+ Type Custom Verse'));
    });

    // KJV and ALMEIDA are offered only as labels for the learner's own text (Ticket 82).
    for (const group of ['translation-group-en', 'translation-group-pt']) {
      expect(within(getByTestId(group)).queryByText(/KJV|ALMEIDA|Almeida/)).toBeNull();
    }
    expect(within(getByTestId('translation-group-own-text')).getByText('KJV')).toBeTruthy();
    expect(within(getByTestId('translation-group-own-text')).getByText('ALMEIDA')).toBeTruthy();
    // The default is bundled, so no copyright notice is shown.
    expect(queryByText(/Esta tradução não está embutida offline/)).toBeNull();

    const refInput = getByPlaceholderText('Reference (e.g. John 3:16)');
    const textInput = getByPlaceholderText('Verse text...');
    await act(async () => {
      refInput.props.onChangeText('John 11:35');
    });
    await act(async () => {
      fireEvent.press(getByText('🔍 Buscar Texto'));
    });
    await waitFor(() => {
      expect(textInput.props.value).toBe('Jesus wept.');
    });

    await act(async () => {
      fireEvent.press(getByText('Save Verse'));
    });

    expect(verseEngine.addVerse).toHaveBeenCalledWith({
      reference: 'John 11:35',
      text: 'Jesus wept.',
      translation: 'BSB',
    });
  });

  it('auto-fetches verse text after 500ms debounce when valid reference is typed', async () => {
    jest.useFakeTimers();

    const { getByText, getByPlaceholderText } = await render(<HomeScreen />);

    await act(async () => {
      fireEvent.press(getByText('+ Type Custom Verse'));
    });

    const refInput = getByPlaceholderText('Reference (e.g. John 3:16)');
    const textInput = getByPlaceholderText('Verse text...');

    await act(async () => {
      refInput.props.onChangeText('John 3:16');
    });

    // Advance debounce timer by 500ms
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(textInput.props.value).toBeTruthy();
      expect(textInput.props.value).toContain('For God so loved the world');
    });

    jest.useRealTimers();
  });

  it('fetches text immediately on manual "Fetch Text" button click', async () => {
    const { getByText, getByPlaceholderText } = await render(<HomeScreen />);

    await act(async () => {
      fireEvent.press(getByText('+ Type Custom Verse'));
    });

    // Select ONBV
    await act(async () => {
      fireEvent.press(getByText('ONBV (Open Nova Bíblia Viva)'));
    });

    const refInput = getByPlaceholderText('Reference (e.g. John 3:16)');
    const textInput = getByPlaceholderText('Verse text...');

    await act(async () => {
      refInput.props.onChangeText('Salmos 23:1');
    });

    await act(async () => {
      fireEvent.press(getByText('🔍 Buscar Texto'));
    });

    await waitFor(() => {
      expect(textInput.props.value).toBeTruthy();
      expect(textInput.props.value).toContain('pastor');
    });
  });

  it('offers Bíblia Livre, ONBV, BSB and WEB and fetches Bíblia Livre text (Ticket 80)', async () => {
    const { getByText, getByPlaceholderText } = await render(<HomeScreen />);

    await act(async () => {
      fireEvent.press(getByText('+ Type Custom Verse'));
    });

    expect(getByText('Bíblia Livre (BLIVRE)')).toBeTruthy();
    expect(getByText('ONBV (Open Nova Bíblia Viva)')).toBeTruthy();
    expect(getByText('BSB (Berean Standard Bible)')).toBeTruthy();
    expect(getByText('WEB (World English Bible)')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Bíblia Livre (BLIVRE)'));
    });

    const refInput = getByPlaceholderText('Reference (e.g. John 3:16)');
    const textInput = getByPlaceholderText('Verse text...');

    await act(async () => {
      refInput.props.onChangeText('Salmos 23:1');
    });

    await act(async () => {
      fireEvent.press(getByText('🔍 Buscar Texto'));
    });

    await waitFor(() => {
      expect(textInput.props.value).toContain('O SENHOR é meu pastor, nada me faltará.');
    });
  });

  it('pastes from clipboard, extracting YouVersion reference, text, and translation tag', async () => {
    (Clipboard.getStringAsync as jest.Mock).mockResolvedValue(
      `"Porque Deus tanto amou o mundo que deu o seu Filho Unigênito..."\n- João 3:16 NVI\nhttps://bible.com/bible/129/jhn.3.16.NVI`
    );

    const { getByText, getByPlaceholderText } = await render(<HomeScreen />);

    await act(async () => {
      fireEvent.press(getByText('+ Type Custom Verse'));
    });

    await act(async () => {
      fireEvent.press(getByText('📋 Colar da Área de Transferência'));
    });

    await waitFor(() => {
      const refInput = getByPlaceholderText('Reference (e.g. John 3:16)');
      const textInput = getByPlaceholderText('Verse text...');

      expect(refInput.props.value).toBe('João 3:16');
      expect(textInput.props.value).toBe(
        'Porque Deus tanto amou o mundo que deu o seu Filho Unigênito...'
      );
    });

    // Check that copyright notice is displayed for NVI
    expect(
      getByText(/Esta tradução não está embutida offline por direitos autorais/i)
    ).toBeTruthy();
  });

  describe('ReferencePickerModal Integration (Ticket 20)', () => {
    it('renders "📖 Escolher da Bíblia" button and opens picker modal', async () => {
      const { getByText } = await render(<HomeScreen />);

      await act(async () => {
        fireEvent.press(getByText('+ Type Custom Verse'));
      });

      expect(getByText('📖 Escolher da Bíblia')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByText('📖 Escolher da Bíblia'));
      });

      // Picker modal opens with book list
      expect(getByText('All (66)')).toBeTruthy();
      expect(getByText('Genesis')).toBeTruthy();
    });

    it('selects reference from picker and triggers auto-fetch for bundled translation', async () => {
      const { getByText, getByPlaceholderText } = await render(<HomeScreen />);

      await act(async () => {
        fireEvent.press(getByText('+ Type Custom Verse'));
      });

      await act(async () => {
        fireEvent.press(getByText('📖 Escolher da Bíblia'));
      });

      // Select Genesis -> Chapter 1 -> Verse 1
      await act(async () => {
        fireEvent.press(getByText('Genesis'));
      });
      await act(async () => {
        fireEvent.press(getByText('1'));
      });
      await act(async () => {
        fireEvent.press(getByText('1'));
      });

      // Confirm selection
      await act(async () => {
        fireEvent.press(getByText('Insert Genesis 1:1'));
      });

      // Reference input should be filled and auto-fetch triggered
      await waitFor(() => {
        const refInput = getByPlaceholderText('Reference (e.g. John 3:16)');
        const textInput = getByPlaceholderText('Verse text...');

        expect(refInput.props.value).toBe('Genesis 1:1');
        expect(textInput.props.value).toBeTruthy();
        expect(textInput.props.value).toContain('In the beginning');
      });
    });

    it('selects reference from picker for non-bundled translation and displays pasting notice', async () => {
      const { getByText, getByPlaceholderText } = await render(<HomeScreen />);

      await act(async () => {
        fireEvent.press(getByText('+ Type Custom Verse'));
      });

      // Select NVI (copyrighted / non-bundled)
      await act(async () => {
        fireEvent.press(getByText(/NVI/i));
      });

      await act(async () => {
        fireEvent.press(getByText('📖 Escolher da Bíblia'));
      });

      // NVI is Portuguese translation -> Picker displays Portuguese books
      await act(async () => {
        fireEvent.press(getByText('João'));
      });
      await act(async () => {
        fireEvent.press(getByText('3'));
      });
      await act(async () => {
        fireEvent.press(getByText('16'));
      });

      await act(async () => {
        fireEvent.press(getByText('Inserir João 3:16'));
      });

      await waitFor(() => {
        const refInput = getByPlaceholderText('Reference (e.g. John 3:16)');
        expect(refInput.props.value).toBe('João 3:16');
        expect(
          getByText('Referência definida! Cole o texto da sua Bíblia ou digite-o abaixo.')
        ).toBeTruthy();
      });
    });
  });

  describe('Verse Deletion Integration (Ticket 23)', () => {
    const verse1 = { id: 'v1', reference: 'Romans 8:28', text: 'And we know...', translation: 'WEB' };
    const verse2 = { id: 'v2', reference: 'Philippians 4:6', text: 'Be anxious for nothing...', translation: 'WEB' };

    it('renders delete button on each verse with testID and accessible label', async () => {
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValueOnce({
        allVerses: [verse1, verse2],
        dueVerses: [verse1, verse2],
        dueCount: 2,
      });

      const { getByTestId } = await render(<HomeScreen />);

      expect(getByTestId('delete-verse-v1')).toBeTruthy();
      expect(getByTestId('delete-verse-v2')).toBeTruthy();
    });

    it('decouples recitation tap target from delete button (sibling layout)', async () => {
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValueOnce({
        allVerses: [verse1],
        dueVerses: [verse1],
        dueCount: 1,
      });

      const { getByTestId, queryByText } = await render(<HomeScreen />);

      const reciteTarget = getByTestId('verse-recite-v1');
      const deleteTarget = getByTestId('delete-verse-v1');

      expect(reciteTarget).toBeTruthy();
      expect(deleteTarget).toBeTruthy();

      await act(async () => {
        fireEvent.press(reciteTarget);
      });

      expect(getByTestId('floating-mic-button')).toBeTruthy();
    });

    it('opens DeleteConfirmationModal when delete button is pressed without triggering review', async () => {
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValueOnce({
        allVerses: [verse1],
        dueVerses: [verse1],
        dueCount: 1,
      });

      const { getByTestId, getByText, getAllByText, queryByText } = await render(<HomeScreen />);

      await act(async () => {
        fireEvent.press(getByTestId('delete-verse-v1'));
      });

      expect(getByText('Excluir versículo?')).toBeTruthy();
      expect(getAllByText(/Romans 8:28/).length).toBeGreaterThanOrEqual(2);
      expect(queryByText('Tap to speak when ready')).toBeNull();
    });

    it('closes modal and preserves verse when Cancelar is clicked', async () => {
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValueOnce({
        allVerses: [verse1],
        dueVerses: [verse1],
        dueCount: 1,
      });

      const { getByTestId, queryByText } = await render(<HomeScreen />);

      await act(async () => {
        fireEvent.press(getByTestId('delete-verse-v1'));
      });

      await act(async () => {
        fireEvent.press(getByTestId('cancel-delete-button'));
      });

      expect(queryByText('Excluir versículo?')).toBeNull();
      expect(verseEngine.deleteVerse).not.toHaveBeenCalled();
    });

    it('deletes verse and refreshes list and counters when confirmed', async () => {
      (verseEngine.getVersesSummary as jest.Mock)
        .mockResolvedValueOnce({
          allVerses: [verse1],
          dueVerses: [verse1],
          dueCount: 1,
        })
        .mockResolvedValueOnce({
          allVerses: [],
          dueVerses: [],
          dueCount: 0,
        });

      const { getByTestId, getByText, queryByText } = await render(<HomeScreen />);

      await act(async () => {
        fireEvent.press(getByTestId('delete-verse-v1'));
      });

      await act(async () => {
        fireEvent.press(getByTestId('confirm-delete-button'));
      });

      expect(verseEngine.deleteVerse).toHaveBeenCalledWith('v1');
      await waitFor(() => {
        expect(queryByText('Excluir versículo?')).toBeNull();
        expect(getByTestId('sandbox-welcome-card')).toBeTruthy();
        expect(getByText(/Due Today \(0\)/)).toBeTruthy();
        expect(getByText(/All \(0\)/)).toBeTruthy();
      });
    });
  });

  describe('HomeScreen Habit Banner (Ticket 30)', () => {
    it('renders habit banner with streak and daily progress', async () => {
      ((verseEngine as any).getHabitStats as jest.Mock).mockResolvedValueOnce({
        currentStreak: 4,
        longestStreak: 7,
        lastActiveDate: '2026-09-18',
        completedTodayCount: 2,
        totalDueToday: 3,
        dueCount: 1,
      });

      const { getByText, getByTestId } = await render(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('habit-banner')).toBeTruthy();
        expect(getByText('4 Day Streak')).toBeTruthy();
        expect(getByText('2 of 3 Due Today')).toBeTruthy();
      });
    });
  });

  describe('HomeScreen Interactive Sandbox (Ticket 31)', () => {
    it('renders SandboxWelcomeCard when library is empty (allVerses === 0)', async () => {
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValueOnce({
        allVerses: [],
        dueVerses: [],
        dueCount: 0,
      });

      const { getByTestId, getByText } = await render(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('sandbox-welcome-card')).toBeTruthy();
        expect(getByText('Acts 2:38')).toBeTruthy();
        expect(getByText('🎤 Try Interactive Recitation (Acts 2:38)')).toBeTruthy();
      });
    });

    it('saves the sandbox verse as a new, due Seed and logs its Blind Recitation as practice (Ticket 79)', async () => {
      // A real Verse Engine on in-memory storage stands behind the screen for this save path.
      const engine = new VerseEngine(new MapStorageAdapter());
      (verseEngine.getDashboard as jest.Mock).mockImplementation(() => engine.getDashboard());
      (verseEngine.addVerse as jest.Mock).mockImplementationOnce((verseData, options) =>
        engine.addVerse(verseData, options)
      );

      const mockVoiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: ACTS_2_38_BSB,
      });

      const { getByTestId, getByText, findByText, queryByText, queryByTestId } = await render(
        <HomeScreen voiceInput={mockVoiceInput} />
      );

      await waitFor(() => {
        expect(getByTestId('start-sandbox-button')).toBeTruthy();
      });

      // Launch sandbox
      await act(async () => {
        fireEvent.press(getByTestId('start-sandbox-button'));
      });

      // ReviewScreen should be active in Echo mode
      await waitFor(() => {
        expect(getByText(/Level 1: Echo Mode/)).toBeTruthy();
      });

      // Navigate to Level 3
      await act(async () => {
        fireEvent.press(getByText('3. Recite'));
      });

      // Recite and stop
      await act(async () => {
        fireEvent.press(getByTestId('floating-mic-button'));
      });

      await act(async () => {
        fireEvent.press(getByTestId('floating-mic-button'));
      });

      // Opt-in dialog should appear
      expect(await findByText('Add Acts 2:38 to your memory verses?')).toBeTruthy();

      // Tap Add to My Verses
      const studyDayBeforeSave = toStudyDay(new Date());
      await act(async () => {
        fireEvent.press(getByTestId('sandbox-opt-in-save'));
      });
      const studyDayAfterSave = toStudyDay(new Date());

      // Back home, the saved verse is due today and a Seed, with no invented accuracy
      await waitFor(() => {
        expect(getByText('Acts 2:38')).toBeTruthy();
        expect(getByText('Due Today')).toBeTruthy();
        expect(getByText('Seed')).toBeTruthy();
      });
      expect(queryByTestId('sandbox-welcome-card')).toBeNull();
      expect(queryByText(/Accuracy/)).toBeNull();

      // The verse is new: default SRS state, due on the Study Day of the save
      expect(verseEngine.updateVerse).not.toHaveBeenCalled();
      const [saved] = await engine.getAllVerses();
      expect(saved).toMatchObject({ reference: 'Acts 2:38', translation: 'BSB', text: ACTS_2_38_BSB });
      expect(saved.srs).toMatchObject({ streak: 0, intervalDays: 0, easeFactor: 2.5 });
      expect([studyDayBeforeSave, studyDayAfterSave]).toContain(saved.srs?.nextReviewDate);
      expect(saved.lastScore).toBeUndefined();
      expect(saved.srs?.lastScore).toBeUndefined();

      // Its sandbox recitation is a Practice Attempt with its real outcome, not an Official Review
      expect(await engine.getReviewLog(saved.id)).toEqual([
        expect.objectContaining({
          kind: 'practice',
          level: 3,
          outcome: 'clean',
          errorCount: 0,
          rawScore: 100,
          sm2Quality: null,
        }),
      ]);
      expect((await engine.getHabitStats()).currentStreak).toBe(0);
    });

    it('returns to empty HomeScreen when choosing Explore App without Saving', async () => {
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValue({
        allVerses: [],
        dueVerses: [],
        dueCount: 0,
      });

      const mockVoiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: ACTS_2_38_BSB,
      });

      const { getByTestId, getByText, findByText } = await render(
        <HomeScreen voiceInput={mockVoiceInput} />
      );

      await waitFor(() => {
        expect(getByTestId('start-sandbox-button')).toBeTruthy();
      });

      // Launch sandbox
      await act(async () => {
        fireEvent.press(getByTestId('start-sandbox-button'));
      });

      // Navigate to Level 3
      await act(async () => {
        fireEvent.press(getByText('3. Recite'));
      });

      await act(async () => {
        fireEvent.press(getByTestId('floating-mic-button'));
      });

      await act(async () => {
        fireEvent.press(getByTestId('floating-mic-button'));
      });

      // Opt-in dialog
      expect(await findByText('Add Acts 2:38 to your memory verses?')).toBeTruthy();

      // Tap Explore App without Saving
      await act(async () => {
        fireEvent.press(getByTestId('sandbox-opt-in-dismiss'));
      });

      // Verify addVerse was NOT called
      expect(verseEngine.addVerse).not.toHaveBeenCalled();

      // Back to HomeScreen with SandboxWelcomeCard
      await waitFor(() => {
        expect(getByTestId('sandbox-welcome-card')).toBeTruthy();
      });
    });
  });

  describe('HomeScreen Daily Done Victory Card & Polished Verse Cards (Ticket 32)', () => {
    it('renders DailyDoneCard when dueCount === 0 and allVerses.length > 0 in Due Today tab, and switches to All tab on practice ahead', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValue({
        allVerses: [
          {
            id: 'v1',
            reference: 'John 3:16',
            text: 'For God so loved...',
            translation: 'WEB',
            srs: { intervalDays: 1, streak: 1, easeFactor: 2.5, nextReviewDate: tomorrow },
          },
        ],
        dueVerses: [],
        dueCount: 0,
      });

      const { getByTestId, getByText } = await render(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('daily-done-card')).toBeTruthy();
        expect(
          getByText('🎉 Daily Goal Achieved! Streak Protected for Today.')
        ).toBeTruthy();
        expect(getByText('Next review due tomorrow')).toBeTruthy();
      });

      // Tap Practice Ahead
      await act(async () => {
        fireEvent.press(getByTestId('practice-ahead-button'));
      });

      // Should now display the All tab containing John 3:16
      await waitFor(() => {
        expect(getByText('John 3:16')).toBeTruthy();
      });
    });

    it('displays the Due Today pill, the Memory Tier and last accuracy score on verse cards (Ticket 77)', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const dueSeed = {
        id: 'v1',
        reference: 'Romans 8:28',
        text: 'And we know...',
        translation: 'WEB',
        lastScore: 95,
        srs: { intervalDays: 0, streak: 0, easeFactor: 2.5 },
      };
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValue({
        allVerses: [
          dueSeed,
          {
            id: 'v2',
            reference: 'Philippians 4:13',
            text: 'I can do all things...',
            translation: 'WEB',
            lastScore: 88,
            srs: { intervalDays: 30, streak: 5, easeFactor: 2.5, nextReviewDate: tomorrow },
          },
          {
            id: 'v3',
            reference: 'Psalm 23:1',
            text: 'The Lord is my shepherd...',
            translation: 'WEB',
            srs: { intervalDays: 10, streak: 2, easeFactor: 2.5, nextReviewDate: tomorrow },
          },
          {
            id: 'v4',
            reference: 'Psalm 119:11',
            text: 'I have hidden your word in my heart...',
            translation: 'WEB',
            srs: { intervalDays: 200, streak: 9, easeFactor: 2.5, nextReviewDate: tomorrow },
          },
        ],
        dueVerses: [dueSeed],
        dueCount: 1,
      });

      const { getByText, queryByText } = await render(<HomeScreen />);

      // Switch to All tab so all 4 cards are rendered
      await act(async () => {
        fireEvent.press(getByText(/All \(4\)/));
      });

      await waitFor(() => {
        // v1 is due today and has never been reviewed: it is still a Seed
        expect(getByText('Due Today')).toBeTruthy();
        expect(getByText('Seed')).toBeTruthy();
        expect(getByText('95% Accuracy')).toBeTruthy();

        // v2 (30 days) is Rooted
        expect(getByText('Rooted')).toBeTruthy();
        expect(getByText('88% Accuracy')).toBeTruthy();

        // v3 (10 days) is Growing
        expect(getByText('Growing')).toBeTruthy();

        // v4 (200 days) is Hidden in the Heart
        expect(getByText('Hidden in the Heart')).toBeTruthy();
      });

      // The per-verse streak and the 21-day mastered badge are gone
      expect(queryByText(/Streak:/)).toBeNull();
      expect(queryByText(/Mastered/)).toBeNull();
      expect(queryByText(/Learning/)).toBeNull();
    });

    it('names the Memory Tier in the language of a Portuguese verse (Ticket 77)', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValue({
        allVerses: [
          {
            id: 'pt1',
            reference: 'Salmos 119:11',
            text: 'Escondi a tua palavra no meu coração, para eu não pecar contra ti.',
            translation: 'ALMEIDA',
            srs: { intervalDays: 1, streak: 0, easeFactor: 2.5, nextReviewDate: tomorrow },
          },
          {
            id: 'pt2',
            reference: 'João 3:16',
            text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito...',
            translation: 'ALMEIDA',
            srs: { intervalDays: 14, streak: 3, easeFactor: 2.5, nextReviewDate: tomorrow },
          },
          {
            id: 'pt3',
            reference: 'Romanos 8:28',
            text: 'E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus.',
            translation: 'ALMEIDA',
            srs: { intervalDays: 90, streak: 6, easeFactor: 2.5, nextReviewDate: tomorrow },
          },
          {
            id: 'pt4',
            reference: 'Filipenses 4:13',
            text: 'Posso todas as coisas naquele que me fortalece.',
            translation: 'ALMEIDA',
            srs: { intervalDays: 180, streak: 8, easeFactor: 2.5, nextReviewDate: tomorrow },
          },
        ],
        dueVerses: [],
        dueCount: 0,
      });

      const { getByText, queryByText } = await render(<HomeScreen />);

      await act(async () => {
        fireEvent.press(getByText(/All \(4\)/));
      });

      await waitFor(() => {
        expect(getByText('Semente')).toBeTruthy();
        expect(getByText('Crescendo')).toBeTruthy();
        expect(getByText('Enraizado')).toBeTruthy();
        expect(getByText('Guardado no coração')).toBeTruthy();
      });
      expect(queryByText('Seed')).toBeNull();
    });

    it('launches ReviewScreen when tapping the dedicated 🎤 Recite button', async () => {
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValue({
        allVerses: [
          {
            id: 'v1',
            reference: 'Romans 8:28',
            text: 'And we know...',
            translation: 'WEB',
          },
        ],
        dueVerses: [
          {
            id: 'v1',
            reference: 'Romans 8:28',
            text: 'And we know...',
            translation: 'WEB',
          },
        ],
        dueCount: 1,
      });

      const { getByTestId, getByText } = await render(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('recite-button-v1')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('recite-button-v1'));
      });

      // ReviewScreen should open
      await waitFor(() => {
        expect(getByText('Romans 8:28')).toBeTruthy();
        expect(getByText('1. Echo')).toBeTruthy();
      });
    });
  });

  describe('HomeScreen Deck Tags and Viral Deck Sharing (Ticket 33)', () => {
    it('displays deck filter chips, filters verses by deck, and displays deck tag badge', async () => {
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValue({
        allVerses: [
          {
            id: 'v1',
            reference: 'John 14:27',
            text: 'Peace I leave with you...',
            translation: 'WEB',
            deck: 'Peace',
          },
          {
            id: 'v2',
            reference: 'Romans 15:13',
            text: 'May the God of hope...',
            translation: 'WEB',
            deck: 'Hope',
          },
          {
            id: 'v3',
            reference: 'Psalm 23:1',
            text: 'The Lord is my shepherd...',
            translation: 'WEB',
          },
        ],
        dueVerses: [],
        dueCount: 0,
      });

      const { getByTestId, queryByTestId, getByText, queryByText } = await render(
        <HomeScreen />
      );

      // Deck chips should be present
      await waitFor(() => {
        expect(getByTestId('deck-filter-Peace')).toBeTruthy();
        expect(getByTestId('deck-filter-Hope')).toBeTruthy();
        expect(getByText('#Peace')).toBeTruthy();
        expect(getByText('#Hope')).toBeTruthy();
      });

      // Switch to All tab to see all verses
      await act(async () => {
        fireEvent.press(getByText(/📚 All/i));
      });

      expect(getByTestId('verse-card-v1')).toBeTruthy();
      expect(getByTestId('verse-card-v2')).toBeTruthy();
      expect(getByTestId('verse-card-v3')).toBeTruthy();

      // Tap Peace deck filter chip
      await act(async () => {
        fireEvent.press(getByTestId('deck-filter-Peace'));
      });

      // Only Peace deck verses should remain visible
      expect(getByTestId('verse-card-v1')).toBeTruthy();
      expect(queryByTestId('verse-card-v2')).toBeNull();
      expect(queryByTestId('verse-card-v3')).toBeNull();

      // Deck banner with share button appears
      expect(getByText('Deck: #Peace')).toBeTruthy();
      expect(getByTestId('share-deck-button')).toBeTruthy();

      // Tap Peace deck filter chip again to deselect
      await act(async () => {
        fireEvent.press(getByTestId('deck-filter-Peace'));
      });

      // All verses visible again
      expect(getByTestId('verse-card-v1')).toBeTruthy();
      expect(getByTestId('verse-card-v2')).toBeTruthy();
      expect(getByTestId('verse-card-v3')).toBeTruthy();
      expect(queryByText('Deck: #Peace')).toBeNull();
    });

    it('invokes Share.share with formatted message when tapping "Share Deck"', async () => {
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValue({
        allVerses: [
          {
            id: 'v1',
            reference: 'John 14:27',
            text: 'Peace I leave with you; my peace I give you.',
            translation: 'WEB',
            deck: 'Peace',
          },
        ],
        dueVerses: [],
        dueCount: 0,
      });

      const { getByTestId } = await render(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('deck-filter-Peace')).toBeTruthy();
      });

      // Select Peace deck filter
      await act(async () => {
        fireEvent.press(getByTestId('deck-filter-Peace'));
      });

      // Tap Share Deck
      await act(async () => {
        fireEvent.press(getByTestId('share-deck-button'));
      });

      expect(Share.share).toHaveBeenCalledWith({
        message: expect.stringContaining('Deck: Peace'),
      });
      const shareArg = (Share.share as jest.Mock).mock.calls[0][0].message;
      expect(shareArg).toContain('John 14:27');
      expect(shareArg).toContain('https://voice-scripture.app/i#');
    });

    it('detects shared deck from clipboard on mount, displays SharedDeckModal, and imports verses', async () => {
      const payload = {
        name: 'Faith',
        verses: [
          {
            ref: 'Hebrews 11:1',
            text: 'Now faith is the assurance of things hoped for.',
            trans: 'WEB',
          },
        ],
        note: 'Encouraging verses',
      };
      const encoded = encodeDeckPayload(payload);
      (Clipboard.getStringAsync as jest.Mock).mockResolvedValue(
        `https://voice-scripture.app/i#${encoded}`
      );

      const { getByTestId, getByText } = await render(<HomeScreen />);

      // SharedDeckModal should appear
      await waitFor(() => {
        expect(getByTestId('shared-deck-modal')).toBeTruthy();
        expect(getByText('Faith')).toBeTruthy();
        expect(getByText('"Encouraging verses"')).toBeTruthy();
        expect(getByText('Hebrews 11:1')).toBeTruthy();
      });

      // Tap Import Selected (1)
      await act(async () => {
        fireEvent.press(getByTestId('import-shared-deck-button'));
      });

      expect(verseEngine.importDeck).toHaveBeenCalledWith('Faith', [
        {
          reference: 'Hebrews 11:1',
          text: 'Now faith is the assurance of things hoped for.',
          translation: 'WEB',
        },
      ]);
    });
  });

  describe('Translations & Copyright entry points (Ticket 84)', () => {
    const onbvNotice = scriptureCatalog.getTranslationMetadata('ONBV')!.notice;
    // Exact text, line breaks and all.
    const VERBATIM = {
      normalizer: getDefaultNormalizer({ trim: false, collapseWhitespace: false }),
    };

    it('opens from the Home Screen menu, next to the reminder settings', async () => {
      const { getByTestId, queryByTestId, getByText } = await render(<HomeScreen />);

      expect(getByText('⏰ Reminders')).toBeTruthy();
      expect(queryByTestId('translation-entry-ONBV')).toBeNull();

      await act(async () => {
        fireEvent.press(getByTestId('open-translations-copyright-home'));
      });

      expect(getByTestId('translation-entry-ONBV')).toBeTruthy();
      expect(getByText(onbvNotice, VERBATIM)).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByTestId('close-translations-copyright'));
      });

      expect(queryByTestId('translation-entry-ONBV')).toBeNull();
    });

    it('opens from the link next to the translation options when adding a verse', async () => {
      const { getByText, getByTestId, queryByTestId, getByPlaceholderText } = await render(
        <HomeScreen />
      );

      await act(async () => {
        fireEvent.press(getByText('+ Type Custom Verse'));
      });
      await act(async () => {
        getByPlaceholderText('Reference (e.g. John 3:16)').props.onChangeText('Romanos 8:28');
      });
      expect(queryByTestId('translation-entry-ONBV')).toBeNull();

      await act(async () => {
        fireEvent.press(getByTestId('open-translations-copyright-add-verse'));
      });

      expect(getByTestId('translation-entry-BLIVRE')).toBeTruthy();
      expect(getByText(onbvNotice, VERBATIM)).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByTestId('close-translations-copyright'));
      });

      // Back in the add-verse form, with what was typed still there.
      expect(queryByTestId('translation-entry-ONBV')).toBeNull();
      expect(getByPlaceholderText('Reference (e.g. John 3:16)').props.value).toBe('Romanos 8:28');
    });
  });
  describe('Preferred Translation in the add-verse picker (Ticket 82)', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    const openAddVerse = async (screen: Awaited<ReturnType<typeof render>>) => {
      await act(async () => {
        fireEvent.press(screen.getByText('+ Type Custom Verse'));
      });
    };

    it('preselects the Preferred Translation for the language of the typed reference', async () => {
      usePreferredTranslations({ pt: 'ONBV', en: 'WEB' });
      const screen = await render(<HomeScreen />);
      const { getByTestId, getByText, getByPlaceholderText } = screen;
      await openAddVerse(screen);

      // Nothing typed yet: English.
      expect(isChipSelected(getByTestId, 'WEB')).toBe(true);
      expect(isChipSelected(getByTestId, 'BSB')).toBe(false);

      const refInput = getByPlaceholderText('Reference (e.g. John 3:16)');
      await act(async () => {
        refInput.props.onChangeText('Salmos 23:1');
      });
      expect(isChipSelected(getByTestId, 'ONBV')).toBe(true);
      expect(isChipSelected(getByTestId, 'WEB')).toBe(false);

      await act(async () => {
        fireEvent.press(getByText('🔍 Buscar Texto'));
      });
      const onbvText = scriptureCatalog.resolvePassage('Salmos 23:1', 'ONBV')!.text!;
      expect(getByPlaceholderText('Verse text...').props.value).toBe(onbvText);

      await act(async () => {
        refInput.props.onChangeText('Psalm 23:1');
      });
      expect(isChipSelected(getByTestId, 'WEB')).toBe(true);

      await act(async () => {
        fireEvent.press(getByText('🔍 Buscar Texto'));
      });
      const webText = scriptureCatalog.resolvePassage('Psalm 23:1', 'WEB')!.text!;
      expect(getByPlaceholderText('Verse text...').props.value).toBe(webText);

      await act(async () => {
        fireEvent.press(getByText('Save Verse'));
      });
      expect(verseEngine.addVerse).toHaveBeenCalledWith({
        reference: 'Psalm 23:1',
        text: webText,
        translation: 'WEB',
      });
    });

    it('keeps the language detected so far while the reference is unresolved or spelled the same in both languages', async () => {
      usePreferredTranslations({ pt: 'ONBV', en: 'WEB' });
      const screen = await render(<HomeScreen />);
      const { getByTestId, getByPlaceholderText } = screen;
      await openAddVerse(screen);
      const typeReference = async (value: string) => {
        await act(async () => {
          getByPlaceholderText('Reference (e.g. John 3:16)').props.onChangeText(value);
        });
      };

      // "Daniel" is Portuguese and English: nothing detected yet, so English.
      await typeReference('Daniel 6:22');
      expect(isChipSelected(getByTestId, 'WEB')).toBe(true);

      await typeReference('João 3:16');
      expect(isChipSelected(getByTestId, 'ONBV')).toBe(true);
      await typeReference('João 3:');
      expect(isChipSelected(getByTestId, 'ONBV')).toBe(true);
      await typeReference('Daniel 6:22');
      expect(isChipSelected(getByTestId, 'ONBV')).toBe(true);
      await typeReference('Gn 1:1');
      expect(isChipSelected(getByTestId, 'ONBV')).toBe(true);
      // Accents make "Gênesis" Portuguese; "Genesis" could be either.
      await typeReference('Psalm 23:1');
      expect(isChipSelected(getByTestId, 'WEB')).toBe(true);
      await typeReference('Gênesis 1:1');
      expect(isChipSelected(getByTestId, 'ONBV')).toBe(true);
      await typeReference('Genesis 1:1');
      expect(isChipSelected(getByTestId, 'ONBV')).toBe(true);
    });

    it("keeps the learner's chip when the reference changes language", async () => {
      const screen = await render(<HomeScreen />);
      const { getByTestId, getByText, getByPlaceholderText } = screen;
      await openAddVerse(screen);

      await act(async () => {
        fireEvent.press(getByText('WEB (World English Bible)'));
      });
      await act(async () => {
        getByPlaceholderText('Reference (e.g. John 3:16)').props.onChangeText('Salmos 23:1');
      });

      expect(isChipSelected(getByTestId, 'WEB')).toBe(true);
      expect(isChipSelected(getByTestId, 'BLIVRE')).toBe(false);
    });

    it("offers the learner's own-text labels for Portuguese and English, apart from the bundled Bibles", async () => {
      const screen = await render(<HomeScreen />);
      await openAddVerse(screen);

      const ownText = within(screen.getByTestId('translation-group-own-text'));
      expect(ownText.getByText('📋 Texto próprio / Your own text')).toBeTruthy();
      for (const label of [
        'ARA', 'ARC', 'ACF', 'NAA', 'NVI', 'NTLH', 'NVT', 'NBV', 'ALMEIDA',
        'KJV', 'NIV', 'ESV', 'NKJV', 'NASB',
      ]) {
        expect(ownText.getByText(label)).toBeTruthy();
      }
      expect(ownText.getByText('Outra (Personalizada)')).toBeTruthy();
      // The bundled Bibles are not among them.
      expect(ownText.queryByText(/BLIVRE|ONBV|BSB|WEB/)).toBeNull();
    });

    it('never fetches bundled text for an own-text label', async () => {
      jest.useFakeTimers();
      const screen = await render(<HomeScreen />);
      const { getByText, getByPlaceholderText } = screen;
      await openAddVerse(screen);

      await act(async () => {
        fireEvent.press(getByText('KJV'));
      });
      await act(async () => {
        getByPlaceholderText('Reference (e.g. John 3:16)').props.onChangeText('John 3:16');
      });
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(getByPlaceholderText('Verse text...').props.value).toBe('');

      await act(async () => {
        fireEvent.press(getByText('🔍 Buscar Texto'));
      });
      expect(getByPlaceholderText('Verse text...').props.value).toBe('');
      expect(getByText(/Esta tradução não está embutida offline/)).toBeTruthy();
    });

    it.each([
      ['ARA', '— Salmos 23:1 ARA', 'Salmos 23:1', 'O Senhor é o meu pastor; nada me faltará.'],
      ['KJV', 'Psalm 23:1 KJV', 'Psalm 23:1', 'The LORD is my shepherd; I shall not want.'],
      [
        'NBV',
        'João 3:16 NBV',
        'João 3:16',
        'Porque Deus amou tanto o mundo que deu o seu único Filho...',
      ],
    ])('keeps the label and the pasted text of a verse pasted as %s', async (label, citation, reference, text) => {
      jest.useFakeTimers();
      (Clipboard.getStringAsync as jest.Mock).mockResolvedValue(
        `“${text}”\n${citation}\nhttps://bible.com/bible/1/x.${label}`
      );
      const screen = await render(<HomeScreen />);
      const { getByText, getByTestId, getByPlaceholderText } = screen;
      await openAddVerse(screen);

      await act(async () => {
        fireEvent.press(getByText('📋 Colar da Área de Transferência'));
      });
      // Well past the auto-fetch debounce: no bundled text may replace the pasted wording.
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(getByPlaceholderText('Verse text...').props.value).toBe(text);
      expect(isChipSelected(getByTestId, label)).toBe(true);

      await act(async () => {
        fireEvent.press(getByText('Save Verse'));
      });
      expect(verseEngine.addVerse).toHaveBeenCalledWith({ reference, text, translation: label });
    });
  });

  describe('Preferred Translation settings (Ticket 82)', () => {
    const openSettings = async (screen: Awaited<ReturnType<typeof render>>) => {
      await act(async () => {
        fireEvent.press(screen.getByTestId('open-preferred-translation-home'));
      });
    };
    const isOptionSelected = (getByTestId: (id: string) => any, language: string, code: string) =>
      getByTestId(`preferred-option-${language}-${code}`).props.accessibilityState?.selected ===
      true;

    it('opens from the Home Screen header, next to Reminders and Copyright, with one choice per language', async () => {
      const screen = await render(<HomeScreen />);
      const { getByText, getByTestId, queryByTestId } = screen;

      expect(getByText('⏰ Reminders')).toBeTruthy();
      expect(getByTestId('open-translations-copyright-home')).toBeTruthy();
      expect(queryByTestId('preferred-option-pt-BLIVRE')).toBeNull();

      await openSettings(screen);

      expect(getByText('Tradução preferida')).toBeTruthy();
      expect(getByText('Preferred Translation')).toBeTruthy();

      const pt = within(getByTestId('preferred-language-pt'));
      expect(pt.getByText('Português')).toBeTruthy();
      expect(pt.getByText('Bíblia Livre')).toBeTruthy();
      expect(pt.getByText('Open Nova Bíblia Viva')).toBeTruthy();
      expect(pt.queryByText(/Berean|World English/)).toBeNull();

      const en = within(getByTestId('preferred-language-en'));
      expect(en.getByText('English')).toBeTruthy();
      expect(en.getByText('Berean Standard Bible')).toBeTruthy();
      expect(en.getByText('World English Bible')).toBeTruthy();
      expect(en.queryByText(/Bíblia/)).toBeNull();

      expect(isOptionSelected(getByTestId, 'pt', 'BLIVRE')).toBe(true);
      expect(isOptionSelected(getByTestId, 'pt', 'ONBV')).toBe(false);
      expect(isOptionSelected(getByTestId, 'en', 'BSB')).toBe(true);
      expect(isOptionSelected(getByTestId, 'en', 'WEB')).toBe(false);

      await act(async () => {
        fireEvent.press(getByTestId('close-preferred-translation'));
      });
      expect(queryByTestId('preferred-option-pt-BLIVRE')).toBeNull();
    });

    it('shows the stored preference when it opens', async () => {
      usePreferredTranslations({ pt: 'ONBV', en: 'WEB' });
      const screen = await render(<HomeScreen />);
      await openSettings(screen);

      expect(isOptionSelected(screen.getByTestId, 'pt', 'ONBV')).toBe(true);
      expect(isOptionSelected(screen.getByTestId, 'en', 'WEB')).toBe(true);
      expect(isOptionSelected(screen.getByTestId, 'pt', 'BLIVRE')).toBe(false);
    });

    it('changes the preference per language without rewriting saved verses, and new verses follow it', async () => {
      const saved = {
        id: '1',
        reference: 'Salmos 23:1',
        text: 'O SENHOR é meu pastor, nada me faltará.',
        translation: 'BLIVRE',
      };
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValue({
        allVerses: [saved],
        dueVerses: [saved],
        dueCount: 1,
      });
      const screen = await render(<HomeScreen />);
      const { getByTestId, getByText, getByPlaceholderText } = screen;
      await waitFor(() => expect(getByText('[BLIVRE]')).toBeTruthy());
      await openSettings(screen);

      await act(async () => {
        fireEvent.press(getByTestId('preferred-option-pt-ONBV'));
      });
      expect(verseEngine.setPreferredTranslation).toHaveBeenCalledWith('pt', 'ONBV');
      expect(isOptionSelected(getByTestId, 'pt', 'ONBV')).toBe(true);
      expect(isOptionSelected(getByTestId, 'pt', 'BLIVRE')).toBe(false);
      expect(isOptionSelected(getByTestId, 'en', 'BSB')).toBe(true);

      await act(async () => {
        fireEvent.press(getByTestId('preferred-option-en-WEB'));
      });
      expect(verseEngine.setPreferredTranslation).toHaveBeenCalledWith('en', 'WEB');
      expect(isOptionSelected(getByTestId, 'en', 'WEB')).toBe(true);

      // Saved verses are left alone.
      expect(verseEngine.updateVerse).not.toHaveBeenCalled();
      expect(verseEngine.addVerse).not.toHaveBeenCalled();
      expect(verseEngine.importDeck).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.press(getByTestId('close-preferred-translation'));
      });
      expect(getByText('[BLIVRE]')).toBeTruthy();

      // The next new verse starts in the new preference.
      await act(async () => {
        fireEvent.press(getByText('+ Type Custom Verse'));
      });
      expect(isChipSelected(getByTestId, 'WEB')).toBe(true);
      await act(async () => {
        getByPlaceholderText('Reference (e.g. John 3:16)').props.onChangeText('João 3:16');
      });
      expect(isChipSelected(getByTestId, 'ONBV')).toBe(true);
    });

    it('links to the Translations & Copyright screen', async () => {
      const screen = await render(<HomeScreen />);
      const { getByTestId, queryByTestId } = screen;
      await openSettings(screen);

      await act(async () => {
        fireEvent.press(getByTestId('open-translations-copyright-settings'));
      });
      expect(getByTestId('translation-entry-ONBV')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByTestId('close-translations-copyright'));
      });
      expect(queryByTestId('translation-entry-ONBV')).toBeNull();
      expect(getByTestId('preferred-option-pt-BLIVRE')).toBeTruthy();
    });
  });
});


