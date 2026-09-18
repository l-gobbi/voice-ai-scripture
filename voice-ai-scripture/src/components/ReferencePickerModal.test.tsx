import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import ReferencePickerModal from './ReferencePickerModal';

describe('ReferencePickerModal (Ticket 19)', () => {
  const defaultProps = {
    visible: true,
    translation: 'ALMEIDA' as const,
    onClose: jest.fn(),
    onSelectReference: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Slice 1: Book Step, Testament Tabs & Search Filter', () => {
    it('renders Portuguese testament tabs and book list when translation is ALMEIDA', async () => {
      const { getByText, queryByText } = await render(
        <ReferencePickerModal {...defaultProps} />
      );

      expect(getByText('Todos (66)')).toBeTruthy();
      expect(getByText('Antigo Testamento (39)')).toBeTruthy();
      expect(getByText('Novo Testamento (27)')).toBeTruthy();

      expect(getByText('Gênesis')).toBeTruthy();
      expect(getByText('Mateus')).toBeTruthy();
    });

    it('renders English testament tabs and book names when translation is WEB', async () => {
      const { getByText } = await render(
        <ReferencePickerModal {...defaultProps} translation="WEB" />
      );

      expect(getByText('All (66)')).toBeTruthy();
      expect(getByText('Old Testament (39)')).toBeTruthy();
      expect(getByText('New Testament (27)')).toBeTruthy();

      expect(getByText('Genesis')).toBeTruthy();
      expect(getByText('Matthew')).toBeTruthy();
    });

    it('filters books by testament tabs', async () => {
      const { getByText, queryByText } = await render(
        <ReferencePickerModal {...defaultProps} />
      );

      // Filter by New Testament
      await act(async () => {
        fireEvent.press(getByText('Novo Testamento (27)'));
      });

      expect(getByText('Mateus')).toBeTruthy();
      expect(queryByText('Gênesis')).toBeNull();

      // Filter by Old Testament
      await act(async () => {
        fireEvent.press(getByText('Antigo Testamento (39)'));
      });
      expect(getByText('Gênesis')).toBeTruthy();
      expect(queryByText('Mateus')).toBeNull();
    });

    it('filters books in real-time with search input', async () => {
      const { getByPlaceholderText, getByText, queryByText } = await render(
        <ReferencePickerModal {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Buscar livro (ex: João, Sl)...');
      await act(async () => {
        fireEvent.changeText(searchInput, 'Rom');
      });

      expect(getByText('Romanos')).toBeTruthy();
      expect(queryByText('Gênesis')).toBeNull();
      expect(queryByText('Mateus')).toBeNull();
    });
  });

  describe('Slice 2: Sequential Drill-Down (Book -> Chapter -> Verse)', () => {
    it('selects book, then chapter, then verse for single verse selection', async () => {
      const onSelectReference = jest.fn();
      const { getByText } = await render(
        <ReferencePickerModal
          {...defaultProps}
          onSelectReference={onSelectReference}
        />
      );

      // Step 1: Select "João"
      await act(async () => {
        fireEvent.press(getByText('João'));
      });

      // Step 2: In Chapter step, John has 21 chapters. Tap chapter 3
      expect(getByText('3')).toBeTruthy();
      await act(async () => {
        fireEvent.press(getByText('3'));
      });

      // Step 3: In Verse step, John 3 has 36 verses. Tap verse 16
      expect(getByText('16')).toBeTruthy();
      await act(async () => {
        fireEvent.press(getByText('16'));
      });

      // Floating action pill should appear
      const confirmButton = getByText('Inserir João 3:16');
      expect(confirmButton).toBeTruthy();

      await act(async () => {
        fireEvent.press(confirmButton);
      });
      expect(onSelectReference).toHaveBeenCalledWith('João 3:16');
    });

    it('supports selecting a multi-verse range (e.g. Filipenses 4:6-7)', async () => {
      const onSelectReference = jest.fn();
      const { getByText } = await render(
        <ReferencePickerModal
          {...defaultProps}
          onSelectReference={onSelectReference}
        />
      );

      // Select Filipenses
      await act(async () => {
        fireEvent.press(getByText('Filipenses'));
      });

      // Select Chapter 4
      await act(async () => {
        fireEvent.press(getByText('4'));
      });

      // Tap verse 6, then verse 7
      await act(async () => {
        fireEvent.press(getByText('6'));
      });
      expect(getByText('Inserir Filipenses 4:6')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByText('7'));
      });
      const confirmRange = getByText('Inserir Filipenses 4:6-7');
      expect(confirmRange).toBeTruthy();

      await act(async () => {
        fireEvent.press(confirmRange);
      });
      expect(onSelectReference).toHaveBeenCalledWith('Filipenses 4:6-7');
    });
  });

  describe('Slice 3: Breadcrumb Back-Navigation', () => {
    it('allows jumping back to Book or Chapter step via breadcrumb header', async () => {
      const { getByText } = await render(
        <ReferencePickerModal {...defaultProps} />
      );

      // Navigate to Genesis -> Chapter 1 -> Verses
      await act(async () => {
        fireEvent.press(getByText('Gênesis'));
      });
      await act(async () => {
        fireEvent.press(getByText('1'));
      });

      // Breadcrumb should show "Gênesis" and "Cap. 1"
      expect(getByText('Gênesis')).toBeTruthy();
      expect(getByText('Cap. 1')).toBeTruthy();

      // Tap "Gênesis" breadcrumb to jump back to Book step
      await act(async () => {
        fireEvent.press(getByText('Gênesis'));
      });
      expect(getByText('Todos (66)')).toBeTruthy();
      expect(getByText('Mateus')).toBeTruthy();
    });

    it('calls onClose when close button is pressed', async () => {
      const onClose = jest.fn();
      const { getByTestId } = await render(
        <ReferencePickerModal {...defaultProps} onClose={onClose} />
      );

      await act(async () => {
        fireEvent.press(getByTestId('picker-close-btn'));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
