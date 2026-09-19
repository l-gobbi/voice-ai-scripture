import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import SharedDeckModal from './SharedDeckModal';
import { SharedDeckPayload } from '../utils/deckSharing';

describe('SharedDeckModal (Ticket 33)', () => {
  jest.setTimeout(15000);

  const sampleDeck: SharedDeckPayload = {
    name: 'Faith & Trust',
    verses: [
      { ref: 'Proverbs 3:5-6', text: 'Trust in the Lord with all your heart...', trans: 'WEB' },
      { ref: 'Hebrews 11:1', text: 'Now faith is confidence in what we hope for...', trans: 'WEB' },
    ],
    note: 'Weekly memory set',
  };

  it('previews deck title, note, and verses with default selections, and triggers onImport', async () => {
    const onImport = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    const { getByText, getByTestId } = await render(
      <SharedDeckModal
        visible={true}
        deck={sampleDeck}
        onClose={onClose}
        onImport={onImport}
      />
    );

    expect(getByTestId('shared-deck-modal')).toBeTruthy();
    expect(getByText('Faith & Trust')).toBeTruthy();
    expect(getByText('"Weekly memory set"')).toBeTruthy();
    expect(getByText('Proverbs 3:5-6')).toBeTruthy();
    expect(getByText('Hebrews 11:1')).toBeTruthy();
    expect(getByText('2 of 2 verses selected')).toBeTruthy();

    const importButton = getByTestId('import-shared-deck-button');
    await act(async () => {
      fireEvent.press(importButton);
    });

    expect(onImport).toHaveBeenCalledWith('Faith & Trust', sampleDeck.verses);
    expect(onClose).toHaveBeenCalled();
  });

  it('allows deselecting verses and imports only selected subset', async () => {
    const onImport = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    const { getByText, getByTestId } = await render(
      <SharedDeckModal
        visible={true}
        deck={sampleDeck}
        onClose={onClose}
        onImport={onImport}
      />
    );

    // Deselect first verse
    await act(async () => {
      fireEvent.press(getByTestId('deck-verse-toggle-0'));
    });

    expect(getByText('1 of 2 verses selected')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('import-shared-deck-button'));
    });

    expect(onImport).toHaveBeenCalledWith('Faith & Trust', [sampleDeck.verses[1]]);
  });
});
