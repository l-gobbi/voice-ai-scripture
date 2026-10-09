import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import SandboxWelcomeCard from './SandboxWelcomeCard';

// The sample verse comes from the bundled Bible in the language default (Ticket 81).
const ACTS_2_38_BSB =
  'Peter replied, “Repent and be baptized, every one of you, in the name of Jesus Christ for the forgiveness of your sins, and you will receive the gift of the Holy Spirit.';
const ATOS_2_38_BLIVRE =
  'E Pedro lhes disse: Arrependei-vos, e batize-se cada um de vós no nome de Jesus Cristo, para perdão dos pecados; e vós recebereis o dom do Espírito Santo.';

describe('SandboxWelcomeCard (Tickets 31 and 81)', () => {
  it('renders the Acts 2:38 preview in the Berean Standard Bible by default and triggers onStartSandbox', async () => {
    const onStartSandbox = jest.fn();
    const { getByText, getByTestId, queryByText } = await render(
      <SandboxWelcomeCard onStartSandbox={onStartSandbox} />
    );

    expect(getByTestId('sandbox-welcome-card')).toBeTruthy();
    expect(getByText('Welcome to Voice AI Scripture! 📖')).toBeTruthy();
    expect(getByText('English (BSB)')).toBeTruthy();
    expect(getByText('Acts 2:38')).toBeTruthy();
    expect(getByText('[BSB]')).toBeTruthy();
    expect(getByText(`"${ACTS_2_38_BSB}"`)).toBeTruthy();
    expect(queryByText('[WEB]')).toBeNull();

    const startButton = getByTestId('start-sandbox-button');
    expect(startButton).toBeTruthy();

    await act(async () => {
      fireEvent.press(startButton);
    });

    expect(onStartSandbox).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'Acts 2:38',
        translation: 'BSB',
        text: ACTS_2_38_BSB,
      })
    );
  });

  it('switches to the Portuguese preview in Bíblia Livre and triggers onStartSandbox with it', async () => {
    const onStartSandbox = jest.fn();
    const { getByText, getByTestId, queryByText } = await render(
      <SandboxWelcomeCard onStartSandbox={onStartSandbox} />
    );

    expect(getByText('Português (BLIVRE)')).toBeTruthy();
    expect(queryByText('Português (Almeida)')).toBeNull();

    // Switch to Portuguese
    await act(async () => {
      fireEvent.press(getByTestId('sandbox-lang-pt'));
    });

    expect(getByText('Atos 2:38')).toBeTruthy();
    expect(getByText('[BLIVRE]')).toBeTruthy();
    expect(getByText(`"${ATOS_2_38_BLIVRE}"`)).toBeTruthy();
    expect(queryByText('[ALMEIDA]')).toBeNull();

    const startButton = getByTestId('start-sandbox-button');
    await act(async () => {
      fireEvent.press(startButton);
    });

    expect(onStartSandbox).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'Atos 2:38',
        translation: 'BLIVRE',
        text: ATOS_2_38_BLIVRE,
      })
    );
  });

  it('opens in Portuguese when the initial language is Portuguese', async () => {
    const { getByText } = await render(
      <SandboxWelcomeCard onStartSandbox={jest.fn()} initialLanguage="pt" />
    );

    expect(getByText('Atos 2:38')).toBeTruthy();
    expect(getByText('[BLIVRE]')).toBeTruthy();
  });
});
