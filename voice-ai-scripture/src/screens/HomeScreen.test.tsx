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
import { encodeDeckPayload, extractDeckFromClipboard } from '../utils/deckSharing';
import { deckLibrary, DeckSummary, ResolvedDeck } from '../services/DeckLibrary';
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
      getNextReviewMessage: jest.fn().mockReturnValue('Next review due tomorrow'),
      updateVerse: jest.fn().mockResolvedValue({}),
      getPreferredTranslations: jest.fn().mockResolvedValue({ pt: 'BLIVRE', en: 'BSB' }),
      setPreferredTranslation: jest.fn(async (_language: string, code: string) => code),
    },
  };
});

// Mock the Deck Library instance; the Deck Library suite runs the real one headless.
jest.mock('../services/DeckLibrary', () => ({
  deckLibrary: {
    listDecks: jest.fn().mockResolvedValue([]),
    getDeck: jest.fn().mockResolvedValue(null),
    addVersesToDeckNamed: jest.fn(),
    importSharedDeck: jest.fn(),
  },
}));

const NO_TIERS = { seed: 0, growing: 0, rooted: 0, hidden_in_the_heart: 0 };

/** A listed Deck, as the Deck Library returns it. */
const deckSummary = (
  deck: Pick<DeckSummary, 'id' | 'name'> & Partial<DeckSummary>
): DeckSummary => ({
  origin: 'own',
  updatedAt: '2026-10-09T12:00:00.000Z',
  verseIds: [],
  tierCounts: { ...NO_TIERS },
  language: 'en',
  ...deck,
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
    (deckLibrary.listDecks as jest.Mock).mockReset();
    (deckLibrary.listDecks as jest.Mock).mockResolvedValue([]);
    (deckLibrary.getDeck as jest.Mock).mockReset();
    (deckLibrary.getDeck as jest.Mock).mockResolvedValue(null);
    (deckLibrary.addVersesToDeckNamed as jest.Mock).mockReset();
    (deckLibrary.importSharedDeck as jest.Mock).mockReset();
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

  describe('Deck filter, sharing and import through Deck membership (Ticket 86)', () => {
    const peaceVerse = {
      id: 'v1',
      reference: 'John 14:27',
      text: 'Peace I leave with you; my peace I give you.',
      translation: 'WEB',
    };
    const hopeVerse = {
      id: 'v2',
      reference: 'Romans 15:13',
      text: 'May the God of hope fill you with all joy and peace.',
      translation: 'WEB',
    };
    const shepherdVerse = {
      id: 'v3',
      reference: 'Psalm 23:1',
      text: 'The Lord is my shepherd...',
      translation: 'WEB',
    };
    const guardVerse = {
      id: 'v4',
      reference: 'Philippians 4:7',
      text: 'And the peace of God will guard your hearts.',
      translation: 'WEB',
    };
    const library = [peaceVerse, hopeVerse, shepherdVerse, guardVerse];
    const peaceDeck = deckSummary({ id: 'peace', name: 'Peace', verseIds: ['v4', 'v1'] });
    // John 14:27 is in both decks.
    const hopeDeck = deckSummary({ id: 'hope', name: 'Hope', verseIds: ['v2', 'v1'] });

    const visibleCards = (getAllByTestId: (id: RegExp) => any[]) =>
      getAllByTestId(/^verse-card-/).map((card) => card.props.testID);

    beforeEach(() => {
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValue({
        allVerses: library,
        dueVerses: [],
        dueCount: 0,
      });
      (deckLibrary.listDecks as jest.Mock).mockResolvedValue([peaceDeck, hopeDeck]);
    });

    it('shows a chip per Deck and filters the verses by membership, in deck order', async () => {
      const { getByTestId, getAllByTestId, getByText, queryByText } = await render(
        <HomeScreen />
      );

      await waitFor(() => {
        expect(getByTestId('deck-filter-peace')).toBeTruthy();
        expect(getByTestId('deck-filter-hope')).toBeTruthy();
      });
      expect(getByText('Peace')).toBeTruthy();
      expect(getByText('Hope')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByText(/📚 All/i));
      });
      expect(visibleCards(getAllByTestId)).toEqual([
        'verse-card-v1',
        'verse-card-v2',
        'verse-card-v3',
        'verse-card-v4',
      ]);

      await act(async () => {
        fireEvent.press(getByTestId('deck-filter-peace'));
      });
      expect(visibleCards(getAllByTestId)).toEqual(['verse-card-v4', 'verse-card-v1']);
      expect(getByText('Deck: Peace')).toBeTruthy();
      expect(getByTestId('share-deck-button')).toBeTruthy();
      expect(getByTestId('deck-filter-peace').props.accessibilityState).toEqual({ selected: true });

      // A verse in several decks shows under each of them.
      await act(async () => {
        fireEvent.press(getByTestId('deck-filter-hope'));
      });
      expect(visibleCards(getAllByTestId)).toEqual(['verse-card-v2', 'verse-card-v1']);
      expect(getByText('Deck: Hope')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByTestId('deck-filter-hope'));
      });
      expect(visibleCards(getAllByTestId)).toHaveLength(4);
      expect(queryByText(/^Deck: /)).toBeNull();
    });

    it('no longer reads the legacy tag on verses', async () => {
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValue({
        allVerses: [{ ...shepherdVerse, deck: 'Legacy' }],
        dueVerses: [],
        dueCount: 0,
      });
      (deckLibrary.listDecks as jest.Mock).mockResolvedValue([]);

      const { getByText, queryByText, queryByTestId } = await render(<HomeScreen />);
      await act(async () => {
        fireEvent.press(getByText(/📚 All/i));
      });

      expect(getByText('Psalm 23:1')).toBeTruthy();
      expect(queryByTestId('deck-filter-Legacy')).toBeNull();
      expect(queryByText(/Legacy/)).toBeNull();
    });

    it('shares the Deck with its verses in deck order', async () => {
      (deckLibrary.getDeck as jest.Mock).mockImplementation(async (id: string) =>
        id === 'peace'
          ? ({
              ...peaceDeck,
              description: 'For anxious days',
              entries: [
                { kind: 'section', id: 's1', title: 'Promises' },
                { kind: 'verse', verse: guardVerse },
                { kind: 'verse', verse: peaceVerse },
              ],
            } as ResolvedDeck)
          : null
      );

      const { getByTestId } = await render(<HomeScreen />);
      await waitFor(() => expect(getByTestId('deck-filter-peace')).toBeTruthy());

      await act(async () => {
        fireEvent.press(getByTestId('deck-filter-peace'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('share-deck-button'));
      });

      expect(deckLibrary.getDeck).toHaveBeenCalledWith('peace');
      const message = (Share.share as jest.Mock).mock.calls[0][0].message as string;
      expect(message).toContain('Deck: Peace (2 verses)');
      expect(message.indexOf('Philippians 4:7')).toBeLessThan(message.indexOf('John 14:27'));
      // The recipient's app reads the same deck back.
      expect(extractDeckFromClipboard(message)).toEqual({
        name: 'Peace',
        note: 'For anxious days',
        verses: [
          { ref: 'Philippians 4:7', text: guardVerse.text, trans: 'WEB' },
          { ref: 'John 14:27', text: peaceVerse.text, trans: 'WEB' },
        ],
      });
    });

    it('offers no sharing for a Deck without verses', async () => {
      (deckLibrary.listDecks as jest.Mock).mockResolvedValue([
        deckSummary({ id: 'empty', name: 'Empty' }),
      ]);

      const { getByTestId, getByText, queryByTestId } = await render(<HomeScreen />);
      await waitFor(() => expect(getByTestId('deck-filter-empty')).toBeTruthy());
      await act(async () => {
        fireEvent.press(getByTestId('deck-filter-empty'));
      });

      expect(getByText('Deck: Empty')).toBeTruthy();
      expect(queryByTestId('share-deck-button')).toBeNull();
    });

    it('imports a shared deck from the clipboard as a new Deck, and shows its chip', async () => {
      (deckLibrary.listDecks as jest.Mock).mockResolvedValue([]);
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
      (Clipboard.getStringAsync as jest.Mock).mockResolvedValue(
        `https://voice-scripture.app/i#${encodeDeckPayload(payload)}`
      );

      const { getByTestId, getByText } = await render(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('shared-deck-modal')).toBeTruthy();
        expect(getByText('Faith')).toBeTruthy();
        expect(getByText('"Encouraging verses"')).toBeTruthy();
        expect(getByText('Hebrews 11:1')).toBeTruthy();
      });

      (deckLibrary.listDecks as jest.Mock).mockResolvedValue([
        deckSummary({ id: 'faith', name: 'Faith', verseIds: ['n1'] }),
      ]);
      await act(async () => {
        fireEvent.press(getByTestId('import-shared-deck-button'));
      });

      expect(deckLibrary.importSharedDeck).toHaveBeenCalledWith({
        name: 'Faith',
        description: 'Encouraging verses',
        verses: [
          {
            reference: 'Hebrews 11:1',
            text: 'Now faith is the assurance of things hoped for.',
            translation: 'WEB',
          },
        ],
      });
      await waitFor(() => expect(getByTestId('deck-filter-faith')).toBeTruthy());
    });

    it('files a new verse under the Deck named in the add-verse form', async () => {
      const { getByText, getByPlaceholderText, getByTestId } = await render(<HomeScreen />);

      await act(async () => {
        fireEvent.press(getByText('+ Type Custom Verse'));
      });
      await act(async () => {
        getByPlaceholderText('Reference (e.g. John 3:16)').props.onChangeText('John 3:16');
        getByPlaceholderText('Verse text...').props.onChangeText('For God so loved the world...');
        getByTestId('add-verse-deck-input').props.onChangeText(' #Peace ');
      });
      await act(async () => {
        fireEvent.press(getByText('Save Verse'));
      });

      expect(verseEngine.addVerse).toHaveBeenCalledWith(
        expect.not.objectContaining({ deck: expect.anything() })
      );
      expect(deckLibrary.addVersesToDeckNamed).toHaveBeenCalledWith('Peace', ['1']);
    });
  });

  describe('Decks screen (Ticket 86)', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const joao1 = {
      id: 'v1',
      reference: 'João 1:1',
      text: 'No princípio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus.',
      translation: 'BLIVRE',
      srs: { intervalDays: 40, streak: 4, easeFactor: 2.5, nextReviewDate: tomorrow },
    };
    const joao14 = {
      id: 'v2',
      reference: 'João 1:14',
      text: 'E o Verbo se fez carne, e habitou entre nós.',
      translation: 'NVI',
      srs: { intervalDays: 0, streak: 0, easeFactor: 2.5 },
    };
    const atos = {
      id: 'v3',
      reference: 'Atos 1:8',
      text: '… mas recebereis poder, ao descer sobre vós o Espírito Santo…',
      translation: 'ARA',
      srs: { intervalDays: 10, streak: 2, easeFactor: 2.5, nextReviewDate: tomorrow },
    };
    const catecismo = deckSummary({
      id: 'cat',
      name: 'Catecismo',
      description: 'Versículos da igreja',
      verseIds: ['v2', 'v1', 'v3'],
      tierCounts: { seed: 1, growing: 1, rooted: 1, hidden_in_the_heart: 0 },
      language: 'pt',
    });

    const openDecks = async (getByTestId: (id: string) => any) => {
      await waitFor(() => expect(getByTestId('open-decks-home')).toBeTruthy());
      await act(async () => {
        fireEvent.press(getByTestId('open-decks-home'));
      });
    };

    it('lists the Decks with their Memory Tier progress, and goes back Home', async () => {
      (deckLibrary.listDecks as jest.Mock).mockResolvedValue([
        deckSummary({
          id: 'cat',
          name: 'Catecismo',
          description: 'Versículos da igreja',
          verseIds: ['a', 'b', 'c', 'd', 'e'],
          tierCounts: { seed: 2, growing: 1, rooted: 1, hidden_in_the_heart: 1 },
          language: 'pt',
        }),
        deckSummary({
          id: 'gospel',
          name: 'Gospel',
          verseIds: ['f', 'g', 'h'],
          tierCounts: { seed: 2, growing: 0, rooted: 1, hidden_in_the_heart: 0 },
        }),
        deckSummary({ id: 'new', name: 'New deck' }),
      ]);

      const { getByTestId, getAllByTestId, getByText, queryByTestId } = await render(
        <HomeScreen />
      );
      await openDecks(getByTestId);

      expect(getByTestId('decks-screen')).toBeTruthy();
      expect(getAllByTestId(/^deck-card-/).map((card) => card.props.testID)).toEqual([
        'deck-card-cat',
        'deck-card-gospel',
        'deck-card-new',
      ]);
      expect(getByText('Versículos da igreja')).toBeTruthy();
      // Rooted counts the verses Rooted or Hidden in the Heart.
      expect(getByTestId('deck-progress-cat')).toHaveTextContent('2 de 5 Enraizados');
      expect(getByTestId('deck-tiers-cat')).toHaveTextContent(
        'Semente 2 · Crescendo 1 · Enraizado 1 · Guardado no coração 1'
      );
      expect(getByTestId('deck-progress-gospel')).toHaveTextContent('1 of 3 Rooted');
      expect(getByTestId('deck-tiers-gospel')).toHaveTextContent('Seed 2 · Rooted 1');
      expect(getByTestId('deck-progress-new')).toHaveTextContent('No verses yet');

      await act(async () => {
        fireEvent.press(getByTestId('close-decks'));
      });
      expect(queryByTestId('decks-screen')).toBeNull();
      expect(getByText('My Memory Verses')).toBeTruthy();
    });

    it('says so when there are no Decks yet', async () => {
      const { getByTestId, getByText } = await render(<HomeScreen />);
      await openDecks(getByTestId);

      expect(getByText('Nenhum deck ainda. / No decks yet.')).toBeTruthy();
    });

    it('opens a deck detail with its verses in order under their sections, and tapping one opens recitation', async () => {
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValue({
        allVerses: [joao1, joao14, atos],
        dueVerses: [joao14],
        dueCount: 1,
      });
      (deckLibrary.listDecks as jest.Mock).mockResolvedValue([catecismo]);
      (deckLibrary.getDeck as jest.Mock).mockResolvedValue({
        ...catecismo,
        entries: [
          { kind: 'section', id: 's1', title: '1º Tópico – Jesus, sua vida e sua obra' },
          { kind: 'verse', verse: joao14 },
          { kind: 'verse', verse: joao1 },
          { kind: 'section', id: 's2', title: '2º Tópico – O Espírito Santo' },
          { kind: 'verse', verse: atos },
        ],
      } as ResolvedDeck);

      const { getByTestId, getAllByTestId, getByText, queryByTestId } = await render(
        <HomeScreen />
      );
      await openDecks(getByTestId);
      await act(async () => {
        fireEvent.press(getByTestId('deck-card-cat'));
      });

      await waitFor(() => expect(getByTestId('deck-detail-screen')).toBeTruthy());
      expect(deckLibrary.getDeck).toHaveBeenCalledWith('cat');
      expect(getByText('Catecismo')).toBeTruthy();
      expect(getByTestId('deck-detail-progress')).toHaveTextContent('1 de 3 Enraizado');
      expect(
        getAllByTestId(/^deck-(section|verse)-/).map((row) => row.props.testID)
      ).toEqual(['deck-section-s1', 'deck-verse-v2', 'deck-verse-v1', 'deck-section-s2', 'deck-verse-v3']);
      expect(getByText('1º Tópico – Jesus, sua vida e sua obra')).toBeTruthy();
      expect(within(getByTestId('deck-verse-v2')).getByText('[NVI]')).toBeTruthy();
      expect(within(getByTestId('deck-verse-v2')).getByText('Semente')).toBeTruthy();
      expect(within(getByTestId('deck-verse-v1')).getByText('Enraizado')).toBeTruthy();
      expect(within(getByTestId('deck-verse-v3')).getByText('Crescendo')).toBeTruthy();

      // Tapping a verse opens recitation, as a verse card on Home does.
      await act(async () => {
        fireEvent.press(getByTestId('deck-verse-v1'));
      });
      await waitFor(() => {
        expect(getByText('1. Echo')).toBeTruthy();
        expect(getByText('João 1:1')).toBeTruthy();
      });
      expect(queryByTestId('deck-detail-screen')).toBeNull();

      // Leaving recitation returns to the deck, reloaded.
      await act(async () => {
        fireEvent.press(getByText('← Back'));
      });
      await waitFor(() => expect(getByTestId('deck-detail-screen')).toBeTruthy());
      expect(deckLibrary.getDeck).toHaveBeenCalledTimes(2);

      await act(async () => {
        fireEvent.press(getByTestId('close-deck-detail'));
      });
      expect(getByTestId('decks-screen')).toBeTruthy();
    });

    it('shows an empty deck plainly', async () => {
      const empty = deckSummary({ id: 'empty', name: 'Empty' });
      (deckLibrary.listDecks as jest.Mock).mockResolvedValue([empty]);
      (deckLibrary.getDeck as jest.Mock).mockResolvedValue({ ...empty, entries: [] });

      const { getByTestId, getByText } = await render(<HomeScreen />);
      await openDecks(getByTestId);
      await act(async () => {
        fireEvent.press(getByTestId('deck-card-empty'));
      });

      await waitFor(() =>
        expect(
          getByText('Este deck ainda não tem versículos. / This deck has no verses yet.')
        ).toBeTruthy()
      );
      expect(getByTestId('deck-detail-progress')).toHaveTextContent('No verses yet');
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
      expect(deckLibrary.importSharedDeck).not.toHaveBeenCalled();

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


