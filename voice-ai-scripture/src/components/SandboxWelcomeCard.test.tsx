import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import SandboxWelcomeCard from './SandboxWelcomeCard';

describe('SandboxWelcomeCard (Ticket 31)', () => {
  it('renders Acts 2:38 English (WEB) preview by default and triggers onStartSandbox', async () => {
    const onStartSandbox = jest.fn();
    const { getByText, getByTestId } = await render(
      <SandboxWelcomeCard onStartSandbox={onStartSandbox} />
    );

    expect(getByTestId('sandbox-welcome-card')).toBeTruthy();
    expect(getByText('Welcome to Voice AI Scripture! 📖')).toBeTruthy();
    expect(getByText('Acts 2:38')).toBeTruthy();
    expect(getByText('[WEB]')).toBeTruthy();
    expect(getByText(/Repent, and be baptized/)).toBeTruthy();

    const startButton = getByTestId('start-sandbox-button');
    expect(startButton).toBeTruthy();

    await act(async () => {
      fireEvent.press(startButton);
    });

    expect(onStartSandbox).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'Acts 2:38',
        translation: 'WEB',
        text: expect.stringContaining('Repent, and be baptized'),
      })
    );
  });

  it('switches to Portuguese (Almeida) preview and triggers onStartSandbox with Almeida passage', async () => {
    const onStartSandbox = jest.fn();
    const { getByText, getByTestId } = await render(
      <SandboxWelcomeCard onStartSandbox={onStartSandbox} />
    );

    // Switch to Portuguese
    await act(async () => {
      fireEvent.press(getByTestId('sandbox-lang-pt'));
    });

    expect(getByText('Atos 2:38')).toBeTruthy();
    expect(getByText('[ALMEIDA]')).toBeTruthy();
    expect(getByText(/Arrependei-vos, e cada um de vós seja batizado/)).toBeTruthy();

    const startButton = getByTestId('start-sandbox-button');
    await act(async () => {
      fireEvent.press(startButton);
    });

    expect(onStartSandbox).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'Atos 2:38',
        translation: 'ALMEIDA',
        text: expect.stringContaining('Arrependei-vos'),
      })
    );
  });
});
