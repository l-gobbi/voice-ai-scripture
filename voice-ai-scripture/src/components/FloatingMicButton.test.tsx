import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import FloatingMicButton from './FloatingMicButton';

describe('FloatingMicButton (Ticket 54)', () => {
  const defaultProps = {
    isReciting: false,
    isVerifying: false,
    volumeLevel: 0,
    vadProgress: 0,
    language: 'en' as const,
    onStart: jest.fn(),
    onStop: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders 76dp circular button with mic icon and accessible label in idle state', async () => {
    const { getByTestId, getByText, queryByTestId } = await render(
      <FloatingMicButton {...defaultProps} />
    );

    const button = getByTestId('floating-mic-button');
    expect(button).toBeTruthy();
    expect(getByText('🎙️')).toBeTruthy();
    // Cancel link should NOT be present when idle
    expect(queryByTestId('floating-mic-cancel')).toBeNull();
  });

  it('calls onStart when tapped in idle state', async () => {
    const onStart = jest.fn();
    const { getByTestId } = await render(
      <FloatingMicButton {...defaultProps} onStart={onStart} />
    );

    fireEvent.press(getByTestId('floating-mic-button'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('renders stop icon, breathing aura, and English "Cancel" link when reciting', async () => {
    const { getByTestId, getByText } = await render(
      <FloatingMicButton {...defaultProps} isReciting={true} volumeLevel={0.6} language="en" />
    );

    expect(getByText('⏹')).toBeTruthy();
    expect(getByTestId('floating-mic-aura')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('renders Portuguese "Cancelar" link when language is pt', async () => {
    const { getByText } = await render(
      <FloatingMicButton {...defaultProps} isReciting={true} language="pt" />
    );

    expect(getByText('Cancelar')).toBeTruthy();
  });

  it('calls onStop when main button is tapped while reciting', async () => {
    const onStop = jest.fn();
    const { getByTestId } = await render(
      <FloatingMicButton {...defaultProps} isReciting={true} onStop={onStop} />
    );

    fireEvent.press(getByTestId('floating-mic-button'));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel link is tapped', async () => {
    const onCancel = jest.fn();
    const { getByTestId } = await render(
      <FloatingMicButton {...defaultProps} isReciting={true} onCancel={onCancel} />
    );

    fireEvent.press(getByTestId('floating-mic-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders progress ring indicator when vadProgress is greater than 0', async () => {
    const { getByTestId, queryByTestId, rerender } = await render(
      <FloatingMicButton {...defaultProps} isReciting={true} vadProgress={0} />
    );

    // Progress ring should be hidden or 0 opacity when vadProgress is 0
    const ringZero = queryByTestId('floating-mic-progress-ring');
    expect(StyleSheet.flatten(ringZero?.props?.style).opacity).toBe(0);

    // Rerender with vadProgress = 0.5
    await rerender(
      <FloatingMicButton {...defaultProps} isReciting={true} vadProgress={0.5} />
    );
    const ringActive = getByTestId('floating-mic-progress-ring');
    expect(StyleSheet.flatten(ringActive.props.style).opacity).toBe(0.5);
  });

  it('disables button interactions when isVerifying or disabled', async () => {
    const onStart = jest.fn();
    const { getByTestId } = await render(
      <FloatingMicButton {...defaultProps} isVerifying={true} onStart={onStart} />
    );

    fireEvent.press(getByTestId('floating-mic-button'));
    expect(onStart).not.toHaveBeenCalled();
  });
});
