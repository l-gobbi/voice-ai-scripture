import React from 'react';
import { Share } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';
import { verseEngine } from '../services/VerseEngine';
import { SimulatedVoiceAdapter } from '../services/VoiceInput';
import * as Clipboard from 'expo-clipboard';
import { encodeDeckPayload } from '../utils/deckSharing';
import { addStudyDays, toStudyDay } from '../engines/studyDay';

// Mock verseEngine
jest.mock('../services/VerseEngine', () => {
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
      isVerseMastered: jest.fn(
        (verse: any, isDue: boolean) => !isDue && (verse.srs?.intervalDays ?? 0) >= 21
      ),
      getNextReviewMessage: jest.fn().mockReturnValue('Next review due tomorrow'),
      updateVerse: jest.fn().mockResolvedValue({}),
    },
  };
});

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(),
  setStringAsync: jest.fn(),
}));

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

    // Select KJV
    await act(async () => {
      fireEvent.press(getByText(/KJV/i));
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
          translation: 'KJV',
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
        translation: 'KJV',
      });
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

    // Select Almeida
    await act(async () => {
      fireEvent.press(getByText('Almeida (JFA)'));
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

    it('launches sandbox ReviewScreen when tapping sandbox button and saves verse on opt-in', async () => {
      (verseEngine.getVersesSummary as jest.Mock)
        .mockResolvedValueOnce({
          allVerses: [],
          dueVerses: [],
          dueCount: 0,
        })
        .mockResolvedValueOnce({
          allVerses: [
            {
              id: 'saved-acts',
              reference: 'Acts 2:38',
              text: 'Peter said to them...',
              translation: 'WEB',
            },
          ],
          dueVerses: [
            {
              id: 'saved-acts',
              reference: 'Acts 2:38',
              text: 'Peter said to them...',
              translation: 'WEB',
            },
          ],
          dueCount: 1,
        });

      const mockVoiceInput = new SimulatedVoiceAdapter({
        defaultTranscript:
          'Peter said to them, “Repent, and be baptized, every one of you, in the name of Jesus Christ for the forgiveness of sins, and you will receive the gift of the Holy Spirit.”',
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

      // Verify verseEngine.addVerse was called
      expect(verseEngine.addVerse).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: 'Acts 2:38',
          translation: 'WEB',
        })
      );

      // Verify verseEngine.updateVerse was called to schedule for the next Study Day
      expect(verseEngine.updateVerse).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          srs: expect.objectContaining({
            intervalDays: 1,
            streak: 1,
            nextReviewDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          }),
        })
      );
      const savedDueStudyDay = (verseEngine.updateVerse as jest.Mock).mock.calls[0][1].srs.nextReviewDate;
      expect([addStudyDays(studyDayBeforeSave, 1), addStudyDays(studyDayAfterSave, 1)]).toContain(
        savedDueStudyDay
      );
    });

    it('returns to empty HomeScreen when choosing Explore App without Saving', async () => {
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValue({
        allVerses: [],
        dueVerses: [],
        dueCount: 0,
      });

      const mockVoiceInput = new SimulatedVoiceAdapter({
        defaultTranscript:
          'Peter said to them, “Repent, and be baptized, every one of you, in the name of Jesus Christ for the forgiveness of sins, and you will receive the gift of the Holy Spirit.”',
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

    it('displays status pills (Due Today, Mastered, Learning) and last accuracy score on verse cards', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      (verseEngine.getVersesSummary as jest.Mock).mockResolvedValue({
        allVerses: [
          {
            id: 'v1',
            reference: 'Romans 8:28',
            text: 'And we know...',
            translation: 'WEB',
            lastScore: 95,
            srs: { intervalDays: 0, streak: 0, easeFactor: 2.5 },
          },
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
            srs: { intervalDays: 6, streak: 2, easeFactor: 2.5, nextReviewDate: tomorrow },
          },
        ],
        dueVerses: [
          {
            id: 'v1',
            reference: 'Romans 8:28',
            text: 'And we know...',
            translation: 'WEB',
            lastScore: 95,
            srs: { intervalDays: 0, streak: 0, easeFactor: 2.5 },
          },
        ],
        dueCount: 1,
      });

      const { getByText } = await render(<HomeScreen />);

      // Switch to All tab so all 3 cards are rendered
      await act(async () => {
        fireEvent.press(getByText(/All \(3\)/));
      });

      await waitFor(() => {
        // v1 is due today
        expect(getByText('Due Today')).toBeTruthy();
        expect(getByText('95% Accuracy')).toBeTruthy();

        // v2 is mastered (intervalDays >= 21, not due)
        expect(getByText('Mastered (Interval: 30d)')).toBeTruthy();
        expect(getByText('88% Accuracy')).toBeTruthy();

        // v3 is learning (intervalDays < 21, not due)
        expect(getByText('Learning (Streak: 2)')).toBeTruthy();
      });
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
});


