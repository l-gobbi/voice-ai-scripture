import React from 'react';
import { render, fireEvent, getDefaultNormalizer, within } from '@testing-library/react-native';
import TranslationsCopyrightModal from './TranslationsCopyrightModal';
import { BUNDLED_TRANSLATIONS, scriptureCatalog } from '../services/ScriptureCatalog';

// Exact text, line breaks and all: the default normalizer would collapse them.
const VERBATIM = { normalizer: getDefaultNormalizer({ trim: false, collapseWhitespace: false }) };

/** The ONBV notice as eBible requires it, line for line (https://ebible.org/find/details.php?id=poronbv). */
const ONBV_NOTICE = [
  'Biblica® Open Nova Bíblia Viva™',
  'Copyright © 2007, 2010 by Biblica, Inc.',
  '“Biblica” é uma marca registrada na Oficina de Patentes e Marcas dos Estados Unidos por Biblica, Inc. Usado com permissão.',
  '“Biblica” is a trademark registered in the United States Patent and Trademark Office by Biblica, Inc. Used with permission.',
].join('\n');

/** What the ONBV licence asks a changed work to state about the original (same page). */
const ONBV_ORIGINAL_WORK =
  'The original Work by its copyright holders is available for free at www.biblica.com and open.bible.';

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

  it('shows the exact four-line ONBV notice', async () => {
    const { getByTestId } = await renderScreen();

    const entry = within(getByTestId('translation-entry-ONBV'));
    expect(entry.getByText(ONBV_NOTICE, VERBATIM)).toBeTruthy();
  });

  it('shows where the original ONBV is available, since the app changes it (Ticket 92)', async () => {
    const { getByTestId } = await renderScreen();

    const onbv = within(getByTestId('translation-entry-ONBV'));
    expect(onbv.getByText('Obra original')).toBeTruthy();
    expect(onbv.getByText(ONBV_ORIGINAL_WORK, VERBATIM)).toBeTruthy();

    // The other licences ask nothing of the kind.
    for (const code of ['BLIVRE', 'BSB', 'WEB']) {
      const entry = within(getByTestId(`translation-entry-${code}`));
      expect(entry.queryByText(/Obra original|Original work/)).toBeNull();
      expect(entry.queryByText(/original Work/)).toBeNull();
    }
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
