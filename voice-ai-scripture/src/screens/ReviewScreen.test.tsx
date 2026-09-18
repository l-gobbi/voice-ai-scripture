import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import ReviewScreen from './ReviewScreen';
import { Verse, verseEngine } from '../services/VerseEngine';
import { SubscriptionService } from '../services/SubscriptionService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('ReviewScreen Integration (Ticket 08)', () => {
  const mockVerse: Verse = {
    id: 'verse-1',
    reference: 'Philippians 4:13',
    text: 'I can do all this through him who gives me strength.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial voice AI recitation screen', async () => {
    const onComplete = jest.fn();
    const { getByText } = await render(
      <ReviewScreen verse={mockVerse} onComplete={onComplete} />
    );

    expect(getByText('Philippians 4:13')).toBeTruthy();
    expect(getByText('🎤 Start Reciting')).toBeTruthy();
    expect(getByText('🎤 Voice AI')).toBeTruthy();
    expect(getByText('📄 Self-Review')).toBeTruthy();
  });

  it('switches to self-review mode and allows manual pass/fail verification', async () => {
    const onComplete = jest.fn();
    const recordSpy = jest.spyOn(verseEngine, 'recordReview').mockResolvedValueOnce({
      streak: 1,
      repetitions: 1,
      intervalDays: 1,
      easeFactor: 2.5,
      nextReviewDate: new Date(),
      passed: true,
    });

    const { getByText, queryByText } = await render(
      <ReviewScreen verse={mockVerse} onComplete={onComplete} />
    );

    // Switch to Self-Review
    await act(async () => {
      fireEvent.press(getByText('📄 Self-Review'));
    });

    expect(getByText('Reveal Text')).toBeTruthy();
    expect(queryByText('I can do all this through him who gives me strength.')).toBeNull();

    // Reveal text
    await act(async () => {
      fireEvent.press(getByText('Reveal Text'));
    });

    expect(getByText('I can do all this through him who gives me strength.')).toBeTruthy();
    expect(getByText('✅ Pass')).toBeTruthy();

    // Verify Pass
    await act(async () => {
      fireEvent.press(getByText('✅ Pass'));
    });

    expect(recordSpy).toHaveBeenCalledWith('verse-1', 100);
    expect(onComplete).toHaveBeenCalled();
  });

  it('shows paywall modal when quota is exhausted', async () => {
    jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      isSubscribed: false,
    });

    const onComplete = jest.fn();
    const { getByText, findByText } = await render(
      <ReviewScreen verse={mockVerse} onComplete={onComplete} />
    );

    await act(async () => {
      fireEvent.press(getByText('🎤 Start Reciting'));
    });

    // Paywall appears
    const paywallHeader = await findByText('Unlock Unlimited Voice AI');
    expect(paywallHeader).toBeTruthy();
  });
});
