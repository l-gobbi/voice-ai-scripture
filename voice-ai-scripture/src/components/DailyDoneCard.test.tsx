import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import DailyDoneCard from './DailyDoneCard';

describe('DailyDoneCard (Ticket 32)', () => {
  it('renders celebratory styling and next review date', async () => {
    const onPracticeAhead = jest.fn();
    const { getByText, getByTestId } = await render(
      <DailyDoneCard
        nextReviewText="Next review due tomorrow"
        onPracticeAhead={onPracticeAhead}
      />
    );

    expect(getByTestId('daily-done-card')).toBeTruthy();
    expect(
      getByText('🎉 Daily Goal Achieved! Streak Protected for Today.')
    ).toBeTruthy();
    expect(getByText('Next review due tomorrow')).toBeTruthy();

    const practiceButton = getByTestId('practice-ahead-button');
    expect(practiceButton).toBeTruthy();

    await act(async () => {
      fireEvent.press(practiceButton);
    });

    expect(onPracticeAhead).toHaveBeenCalledTimes(1);
  });
});
