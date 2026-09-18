import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { Verse } from '../services/VerseEngine';

describe('DeleteConfirmationModal (Ticket 22)', () => {
  const mockVerse: Verse = {
    id: 'test-verse-1',
    reference: 'Filipenses 4:6-7',
    text: 'Não andeis ansiosos por coisa alguma...',
    translation: 'ALMEIDA',
    srs: {
      streak: 5,
      intervalDays: 10,
      easeFactor: 2.5,
      nextReviewDate: new Date().toISOString(),
    },
  };

  it('renders modal with reference, translation, and warning when visible', async () => {
    const { getByText, getByTestId } = await render(
      <DeleteConfirmationModal
        visible={true}
        verse={mockVerse}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(getByText('Excluir versículo?')).toBeTruthy();
    expect(getByText(/Filipenses 4:6-7/)).toBeTruthy();
    expect(getByText(/ALMEIDA/)).toBeTruthy();
    expect(getByText(/Streak atual: 5/)).toBeTruthy();
    expect(getByText(/Esta ação removerá permanentemente o versículo/)).toBeTruthy();
    expect(getByTestId('cancel-delete-button')).toBeTruthy();
    expect(getByTestId('confirm-delete-button')).toBeTruthy();
  });

  it('does not render content when visible is false', async () => {
    const { queryByText } = await render(
      <DeleteConfirmationModal
        visible={false}
        verse={mockVerse}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(queryByText('Excluir versículo?')).toBeNull();
  });

  it('calls onCancel when Cancelar button is pressed', async () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();

    const { getByTestId } = await render(
      <DeleteConfirmationModal
        visible={true}
        verse={mockVerse}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    fireEvent.press(getByTestId('cancel-delete-button'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when Excluir definitivamente button is pressed', async () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();

    const { getByTestId } = await render(
      <DeleteConfirmationModal
        visible={true}
        verse={mockVerse}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    fireEvent.press(getByTestId('confirm-delete-button'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when backdrop overlay is pressed', async () => {
    const onCancel = jest.fn();
    const { getByTestId } = await render(
      <DeleteConfirmationModal
        visible={true}
        verse={mockVerse}
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.press(getByTestId('delete-modal-backdrop'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('omits streak notice cleanly when verse has 0 streak', async () => {
    const zeroStreakVerse: Verse = {
      ...mockVerse,
      srs: {
        streak: 0,
        intervalDays: 1,
        easeFactor: 2.5,
      },
    };

    const { queryByText } = await render(
      <DeleteConfirmationModal
        visible={true}
        verse={zeroStreakVerse}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(queryByText(/Streak atual/)).toBeNull();
  });

  it('returns null when visible is true but neither verse nor reference is provided', async () => {
    const { queryByText } = await render(
      <DeleteConfirmationModal
        visible={true}
        verse={null}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(queryByText('Excluir versículo?')).toBeNull();
  });

  it('renders reference and allows confirmation when standalone reference prop is passed without verse', async () => {
    const onConfirm = jest.fn();
    const { getByText, getByTestId } = await render(
      <DeleteConfirmationModal
        visible={true}
        reference="João 3:16"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );

    expect(getByText('Excluir versículo?')).toBeTruthy();
    expect(getByText('João 3:16')).toBeTruthy();
    fireEvent.press(getByTestId('confirm-delete-button'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('falls back to srs.repetitions for streak calculation when srs.streak is undefined', async () => {
    const verseWithRepetitions: Verse = {
      ...mockVerse,
      srs: {
        repetitions: 7,
        intervalDays: 14,
        easeFactor: 2.5,
      } as any,
    };

    const { getByText } = await render(
      <DeleteConfirmationModal
        visible={true}
        verse={verseWithRepetitions}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(getByText(/Streak atual: 7/)).toBeTruthy();
  });
});
