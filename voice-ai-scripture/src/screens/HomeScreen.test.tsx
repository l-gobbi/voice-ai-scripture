import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';
import { verseEngine } from '../services/VerseEngine';

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
    }),
  }
}));

describe('HomeScreen Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows a user to add a new verse and see it in the list', async () => {
    const { getByText, getByPlaceholderText, queryByText } = await render(<HomeScreen />);

    // Initially list fetches verses
    await waitFor(() => {
      expect(verseEngine.getVersesSummary).toHaveBeenCalledTimes(1);
    });

    // 1. User clicks Add Verse button
    await act(async () => {
      fireEvent.press(getByText('+ Type Custom Verse'));
    });

    // 2. Wait for modal to appear and fill out form
    await waitFor(() => {
      expect(getByPlaceholderText('Reference (e.g. John 3:16)')).toBeTruthy();
    });
    const refInput = getByPlaceholderText('Reference (e.g. John 3:16)');
    const textInput = getByPlaceholderText('Verse text...');

    await act(async () => {
      refInput.props.onChangeText('John 3:16');
      textInput.props.onChangeText('For God so loved the world...');
    });

    // 3. Setup mock for the refresh after saving
    (verseEngine.getVersesSummary as jest.Mock).mockResolvedValueOnce({
      allVerses: [
        { id: '1', reference: 'John 3:16', text: 'For God so loved the world...' }
      ],
      dueVerses: [
        { id: '1', reference: 'John 3:16', text: 'For God so loved the world...' }
      ],
      dueCount: 1,
    });

    // 4. User clicks Save
    await act(async () => {
      fireEvent.press(getByText('Save Verse'));
    });

    // 5. Assert the service was called correctly
    await waitFor(() => {
      expect(verseEngine.addVerse).toHaveBeenCalledWith({
        reference: 'John 3:16',
        text: 'For God so loved the world...'
      });
    });

    // 6. Assert the new verse appears on screen
    await waitFor(() => {
      expect(queryByText('John 3:16')).toBeTruthy();
    });
  });
});
