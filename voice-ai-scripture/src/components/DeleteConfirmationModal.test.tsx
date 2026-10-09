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

  it('renders modal with reference, translation, Memory Tier, and warning when visible', async () => {
    const { getByText, getByTestId, queryByText } = await render(
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
    expect(getByText('Crescendo')).toBeTruthy();
    expect(queryByText(/Streak/)).toBeNull();
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

  it('shows a forgotten verse as Semente instead of a zero streak (Ticket 77)', async () => {
    const forgottenVerse: Verse = {
      ...mockVerse,
      srs: {
        streak: 0,
        intervalDays: 1,
        easeFactor: 2.5,
      },
    };

    const { getByText, queryByText } = await render(
      <DeleteConfirmationModal
        visible={true}
        verse={forgottenVerse}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(getByText('Semente')).toBeTruthy();
    expect(queryByText(/Streak/)).toBeNull();
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

  it('derives the tier from the interval, not the legacy repetitions count (Ticket 77)', async () => {
    const verseWithRepetitions: Verse = {
      ...mockVerse,
      srs: {
        repetitions: 7,
        intervalDays: 200,
        easeFactor: 2.5,
      } as any,
    };

    const { getByText, queryByText } = await render(
      <DeleteConfirmationModal
        visible={true}
        verse={verseWithRepetitions}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(getByText('Guardado no coração')).toBeTruthy();
    expect(queryByText(/Streak/)).toBeNull();
  });

  it('names the tier in the language of an English verse (Ticket 77)', async () => {
    const englishVerse: Verse = {
      id: 'test-verse-en',
      reference: 'Philippians 4:6-7',
      text: 'Do not be anxious about anything, but in every situation, by prayer and petition...',
      translation: 'WEB',
      srs: {
        streak: 4,
        intervalDays: 45,
        easeFactor: 2.5,
      },
    };

    const { getByText, queryByText } = await render(
      <DeleteConfirmationModal
        visible={true}
        verse={englishVerse}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(getByText('Rooted')).toBeTruthy();
    expect(queryByText('Enraizado')).toBeNull();
  });

  it('shows no tier when only a reference is provided', async () => {
    const { queryByText } = await render(
      <DeleteConfirmationModal
        visible={true}
        reference="João 3:16"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(queryByText(/Semente|Crescendo|Enraizado|Guardado no coração|Seed|Growing|Rooted|Hidden in the Heart/)).toBeNull();
  });
});
