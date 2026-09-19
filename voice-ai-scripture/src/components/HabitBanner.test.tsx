import React from 'react';
import { render } from '@testing-library/react-native';
import HabitBanner from './HabitBanner';

describe('HabitBanner component (Ticket 30)', () => {
  it('renders streak invitation when currentStreak is 0', async () => {
    const { getByText } = await render(
      <HabitBanner currentStreak={0} completedTodayCount={0} totalDueToday={3} />
    );

    expect(getByText('Start your streak today!')).toBeTruthy();
    expect(getByText('0 of 3 Due Today')).toBeTruthy();
  });

  it('renders active flame streak count when currentStreak > 0', async () => {
    const { getByText } = await render(
      <HabitBanner currentStreak={5} completedTodayCount={2} totalDueToday={4} />
    );

    expect(getByText('5 Day Streak')).toBeTruthy();
    expect(getByText('2 of 4 Due Today')).toBeTruthy();
  });

  it('renders all caught up message when totalDueToday is 0', async () => {
    const { getByText } = await render(
      <HabitBanner currentStreak={3} completedTodayCount={2} totalDueToday={0} />
    );

    expect(getByText('3 Day Streak')).toBeTruthy();
    expect(getByText('All caught up! 🎉')).toBeTruthy();
  });
});
