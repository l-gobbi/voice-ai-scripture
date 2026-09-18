import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';
import { verseEngine } from '../services/VerseEngine';
import { bibleProvider } from '../services/BibleProvider';
import * as Clipboard from 'expo-clipboard';

// Mock verseEngine
jest.mock('../services/VerseEngine', () => ({
  verseEngine: {
    getVersesSummary: jest.fn().mockResolvedValue({
      allVerses: [],
      dueVerses: [],
      dueCount: 0,
    }),
    addVerse: jest.fn().mockResolvedValue({
      id: '1',
      reference: 'John 3:16',
      text: 'For God so loved the world...',
      translation: 'WEB',
    }),
  },
}));

// Mock bibleProvider
jest.mock('../services/BibleProvider', () => {
  const actual = jest.requireActual('../services/BibleProvider');
  return {
    ...actual,
    bibleProvider: {
      fetchPassage: jest.fn(),
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

    (bibleProvider.fetchPassage as jest.Mock).mockResolvedValueOnce({
      reference: 'John 3:16',
      text: 'For God so loved the world, that he gave his one and only Son...',
      translation: 'WEB',
      language: 'en',
    });

    const { getByText, getByPlaceholderText } = await render(<HomeScreen />);

    await act(async () => {
      fireEvent.press(getByText('+ Type Custom Verse'));
    });

    const refInput = getByPlaceholderText('Reference (e.g. John 3:16)');
    const textInput = getByPlaceholderText('Verse text...');

    await act(async () => {
      refInput.props.onChangeText('John 3:16');
    });

    // Before debounce timer expires, fetchPassage has not been called
    expect(bibleProvider.fetchPassage).not.toHaveBeenCalled();

    // Advance debounce timer by 500ms
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(bibleProvider.fetchPassage).toHaveBeenCalledWith('John 3:16', expect.any(String));
      expect(textInput.props.value).toBe(
        'For God so loved the world, that he gave his one and only Son...'
      );
    });

    jest.useRealTimers();
  });

  it('fetches text immediately on manual "Fetch Text" button click', async () => {
    (bibleProvider.fetchPassage as jest.Mock).mockResolvedValueOnce({
      reference: 'Salmos 23:1',
      text: 'O Senhor é o meu pastor; de nada terei falta.',
      translation: 'ALMEIDA',
      language: 'pt',
    });

    const { getByText, getByPlaceholderText } = await render(<HomeScreen />);

    await act(async () => {
      fireEvent.press(getByText('+ Type Custom Verse'));
    });

    // Select Almeida
    await act(async () => {
      fireEvent.press(getByText(/Almeida/i));
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
      expect(bibleProvider.fetchPassage).toHaveBeenCalledWith('Salmos 23:1', 'ALMEIDA');
      expect(textInput.props.value).toBe('O Senhor é o meu pastor; de nada terei falta.');
    });
  });

  it('pastes from clipboard, extracting YouVersion reference, text, and translation tag', async () => {
    (Clipboard.getStringAsync as jest.Mock).mockResolvedValueOnce(
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
});
