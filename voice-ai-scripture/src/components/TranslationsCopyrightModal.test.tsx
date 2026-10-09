import React from 'react';
import { render, fireEvent, getDefaultNormalizer, within } from '@testing-library/react-native';
import TranslationsCopyrightModal from './TranslationsCopyrightModal';
import { BUNDLED_TRANSLATIONS, scriptureCatalog } from '../services/ScriptureCatalog';

// Exact text, line breaks and all: the default normalizer would collapse them.
const VERBATIM = { normalizer: getDefaultNormalizer({ trim: false, collapseWhitespace: false }) };

describe('TranslationsCopyrightModal (Ticket 84)', () => {
  const renderScreen = (onClose = jest.fn()) =>
    render(<TranslationsCopyrightModal visible={true} onClose={onClose} />);

  it('shows one entry per bundled translation, in catalog order', async () => {
    const { getAllByTestId } = await renderScreen();

    const entries = getAllByTestId(/^translation-entry-/);
    expect(entries.map((entry) => entry.props.testID)).toEqual(
      BUNDLED_TRANSLATIONS.map((code) => `translation-entry-${code}`)
    );
  });

  it("shows each translation's full name, licence, notice and changes from the catalog", async () => {
    const { getByTestId } = await renderScreen();

    for (const meta of scriptureCatalog.getBundledTranslations()) {
      const entry = within(getByTestId(`translation-entry-${meta.code}`));
      expect(entry.getByText(meta.fullName)).toBeTruthy();
      expect(entry.getByText(meta.license)).toBeTruthy();
      expect(entry.getByText(meta.notice, VERBATIM)).toBeTruthy();
      expect(entry.getByText(meta.changes, VERBATIM)).toBeTruthy();
      expect(entry.getByText(meta.sourceUrl)).toBeTruthy();
    }
  });

  it("shows the ONBV notice verbatim as the catalog's string, all four lines", async () => {
    const onbv = scriptureCatalog.getTranslationMetadata('ONBV')!;
    expect(onbv.notice.split('\n')).toHaveLength(4);

    const { getByTestId } = await renderScreen();

    const entry = within(getByTestId('translation-entry-ONBV'));
    expect(entry.getByText(onbv.notice, VERBATIM)).toBeTruthy();
  });

  it('shows the Bíblia Livre credit and what was changed in its text', async () => {
    const blivre = scriptureCatalog.getTranslationMetadata('BLIVRE')!;
    expect(blivre.notice).toContain(
      'Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio, e Marco Teles'
    );
    expect(blivre.changes).not.toBe('');

    const { getByTestId } = await renderScreen();

    const entry = within(getByTestId('translation-entry-BLIVRE'));
    expect(entry.getByText(blivre.notice, VERBATIM)).toBeTruthy();
    expect(entry.getByText(blivre.changes, VERBATIM)).toBeTruthy();
  });

  it('labels each entry in its own language', async () => {
    const { getByTestId } = await renderScreen();

    const blivre = within(getByTestId('translation-entry-BLIVRE'));
    expect(blivre.getByText('Licença')).toBeTruthy();
    expect(blivre.getByText('Alterações no texto')).toBeTruthy();

    const bsb = within(getByTestId('translation-entry-BSB'));
    expect(bsb.getByText('License')).toBeTruthy();
    expect(bsb.getByText('Changes to the text')).toBeTruthy();
  });

  it('closes from its close button', async () => {
    const onClose = jest.fn();
    const { getByTestId } = await renderScreen(onClose);

    fireEvent.press(getByTestId('close-translations-copyright'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while hidden', async () => {
    const { queryByTestId } = await render(
      <TranslationsCopyrightModal visible={false} onClose={jest.fn()} />
    );

    expect(queryByTestId(/^translation-entry-/)).toBeNull();
  });
});
