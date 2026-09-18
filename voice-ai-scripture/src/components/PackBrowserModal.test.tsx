import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PackBrowserModal from './PackBrowserModal';
import { verseEngine } from '../services/VerseEngine';

jest.mock('../services/VerseEngine', () => ({
  verseEngine: {
    importVerses: jest.fn().mockResolvedValue(3),
  },
}));

describe('PackBrowserModal (Ticket 17: Dual-Language Topical Packs)', () => {
  const mockOnClose = jest.fn();
  const mockOnImportComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  jest.setTimeout(15000);

  it('renders all packs with [EN] and [PT] language badges by default', async () => {
    const { getByText, getAllByText } = await render(
      <PackBrowserModal
        visible={true}
        onClose={mockOnClose}
        onImportComplete={mockOnImportComplete}
      />
    );

    // Header
    expect(getByText('Curated Topical Packs')).toBeTruthy();

    // Check English packs and badge
    expect(getByText('Peace & Anxiety')).toBeTruthy();
    expect(getAllByText('[EN]').length).toBeGreaterThanOrEqual(3);

    // Check Portuguese packs and badge
    expect(getByText('Paz')).toBeTruthy();
    expect(getByText('Fé')).toBeTruthy();
    expect(getByText('Esperança')).toBeTruthy();
    expect(getAllByText('[PT]').length).toBeGreaterThanOrEqual(3);
  });

  it('filters packs when selecting language filter tabs', async () => {
    const { getByText, queryByText } = await render(
      <PackBrowserModal
        visible={true}
        onClose={mockOnClose}
        onImportComplete={mockOnImportComplete}
      />
    );

    // Select Portuguese tab
    await act(async () => {
      fireEvent.press(getByText('Português'));
    });
    expect(getByText('Paz')).toBeTruthy();
    expect(getByText('Fé')).toBeTruthy();
    expect(getByText('Esperança')).toBeTruthy();
    expect(queryByText('Peace & Anxiety')).toBeNull();
    expect(queryByText('Faith & Courage')).toBeNull();

    // Select English tab
    await act(async () => {
      fireEvent.press(getByText('English'));
    });
    expect(getByText('Peace & Anxiety')).toBeTruthy();
    expect(getByText('Faith & Courage')).toBeTruthy();
    expect(queryByText('Paz')).toBeNull();
    expect(queryByText('Fé')).toBeNull();

    // Select All tab
    await act(async () => {
      fireEvent.press(getByText('All'));
    });
    expect(getByText('Peace & Anxiety')).toBeTruthy();
    expect(getByText('Paz')).toBeTruthy();
  });

  it('opens pack detail and imports verses with their respective translation metadata', async () => {
    jest.spyOn(Alert, 'alert');

    const { getByText } = await render(
      <PackBrowserModal
        visible={true}
        onClose={mockOnClose}
        onImportComplete={mockOnImportComplete}
      />
    );

    // Open Portuguese "Paz" pack
    await act(async () => {
      fireEvent.press(getByText('Paz'));
    });

    // Detail view should show verses
    expect(getByText('Salmos 23:1')).toBeTruthy();
    expect(getByText('João 14:27')).toBeTruthy();

    // Press import button
    await act(async () => {
      fireEvent.press(getByText(/Add All to My Verses/i));
    });

    // Expect verseEngine.importVerses to have been called with ALMEIDA verses
    expect(verseEngine.importVerses).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          reference: 'Salmos 23:1',
          translation: 'ALMEIDA',
        }),
        expect.objectContaining({
          reference: 'João 14:27',
          translation: 'ALMEIDA',
        }),
      ])
    );

    // Confirm alert callback triggers callbacks
    expect(Alert.alert).toHaveBeenCalled();
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const okButton = alertCall[2][0];

    await act(async () => {
      okButton.onPress();
    });

    expect(mockOnImportComplete).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });
});
