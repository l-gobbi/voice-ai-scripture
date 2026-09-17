import { SubscriptionService } from './SubscriptionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

describe('SubscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides 3 free voice recitations initially for non-subscribed users', async () => {
    // Initial state: nothing in storage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const isSub = await SubscriptionService.isSubscribed();
    expect(isSub).toBe(false);

    const remaining = await SubscriptionService.getRemainingFreeRecitations();
    expect(remaining).toBe(3);
  });

  it('decrements free recitations on consume, and blocks once limit is reached', async () => {
    // Storage has 1 remaining
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'user_is_subscribed') return Promise.resolve('false');
      if (key === 'free_recitations_remaining') return Promise.resolve('1');
      return Promise.resolve(null);
    });

    const firstAttempt = await SubscriptionService.consumeRecitation();
    expect(firstAttempt.allowed).toBe(true);
    expect(firstAttempt.remaining).toBe(0);

    // Now storage reflects 0 remaining
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'user_is_subscribed') return Promise.resolve('false');
      if (key === 'free_recitations_remaining') return Promise.resolve('0');
      return Promise.resolve(null);
    });

    const secondAttempt = await SubscriptionService.consumeRecitation();
    expect(secondAttempt.allowed).toBe(false);
    expect(secondAttempt.remaining).toBe(0);
  });

  it('allows unlimited recitations once user is subscribed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'user_is_subscribed') return Promise.resolve('true');
      if (key === 'free_recitations_remaining') return Promise.resolve('0');
      return Promise.resolve(null);
    });

    const isSub = await SubscriptionService.isSubscribed();
    expect(isSub).toBe(true);

    const attempt = await SubscriptionService.consumeRecitation();
    expect(attempt.allowed).toBe(true);
  });
});
