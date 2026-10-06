import { SubscriptionService, subscriptionService, BURST_LIMIT, DAILY_LIMIT } from './SubscriptionService';
import { MapStorageAdapter, AsyncStorageAdapter } from './StorageAdapter';

describe('SubscriptionService (Ticket 53: Hybrid Abuse-Prevention Rate Limiter)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('allows unmetered normal recitations without a 3-try paywall limit', async () => {
    const storage = new MapStorageAdapter();
    const service = new SubscriptionService(storage);

    // Perform 5 recitations (previously would have blocked on 4th)
    for (let i = 0; i < 5; i++) {
      const res = await service.consumeRecitation();
      expect(res.allowed).toBe(true);
      expect(res.reason).toBe('ok');
    }
  });

  it('enforces a 10 recitations per rolling minute burst limit', async () => {
    const storage = new MapStorageAdapter();
    const service = new SubscriptionService(storage);

    // Call 10 times rapidly
    for (let i = 0; i < BURST_LIMIT; i++) {
      const res = await service.consumeRecitation();
      expect(res.allowed).toBe(true);
    }

    // 11th call within the same minute should be rate limited
    const throttled = await service.consumeRecitation();
    expect(throttled.allowed).toBe(false);
    expect(throttled.reason).toBe('rate_limited');
    expect(throttled.retryAfterSeconds).toBeGreaterThan(0);

    // Advance 61 seconds
    jest.advanceTimersByTime(61000);

    // Now allowed again
    const postCooldown = await service.consumeRecitation();
    expect(postCooldown.allowed).toBe(true);
    expect(postCooldown.reason).toBe('ok');
  });

  it('tracks daily count and flags useNativeFallback once reaching 500 recitations/day', async () => {
    const storage = new MapStorageAdapter();
    const service = new SubscriptionService(storage);

    // Seed storage with 499 daily recitations for today
    const today = new Date().toISOString().slice(0, 10);
    await storage.setItem(`daily_recitations_${today}`, '499');

    // 500th recitation is allowed
    const res500 = await service.consumeRecitation();
    expect(res500.allowed).toBe(true);
    expect(res500.useNativeFallback).toBe(false);

    // 501st recitation is STILL allowed, but flags useNativeFallback: true
    const res501 = await service.consumeRecitation();
    expect(res501.allowed).toBe(true);
    expect(res501.useNativeFallback).toBe(true);
  });

  it('resets daily count on the next calendar day', async () => {
    const storage = new MapStorageAdapter();
    const service = new SubscriptionService(storage);

    // Seed storage with 500 recitations for yesterday
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    await storage.setItem(`daily_recitations_${yesterday}`, '500');

    // Today should start fresh at 0
    const res = await service.consumeRecitation();
    expect(res.allowed).toBe(true);
    expect(res.useNativeFallback).toBe(false);
  });

  it('supports backward-compatible static singleton methods', async () => {
    expect(typeof SubscriptionService.isSubscribed).toBe('function');
    expect(typeof SubscriptionService.consumeRecitation).toBe('function');
    expect(typeof SubscriptionService.subscribePremium).toBe('function');
    expect(typeof SubscriptionService.cancelSubscription).toBe('function');
    expect(subscriptionService).toBeInstanceOf(SubscriptionService);
  });

  it('purges and ignores legacy trial quota key on AsyncStorageAdapter so existing device data never blocks recitation', async () => {
    const mockStorage = {
      getItem: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'free_recitations_remaining') return '0';
        return null;
      }),
      setItem: jest.fn().mockResolvedValue(undefined),
      removeItem: jest.fn().mockResolvedValue(undefined),
    };
    Object.setPrototypeOf(mockStorage, AsyncStorageAdapter.prototype);

    const service = new SubscriptionService(mockStorage as any);
    const res = await service.consumeRecitation();

    expect(res.allowed).toBe(true);
    expect(res.reason).toBe('ok');
    expect(mockStorage.removeItem).toHaveBeenCalledWith('free_recitations_remaining');
  });

  it('defaults getRemainingFreeRecitations to DAILY_LIMIT and purges legacy quota on AsyncStorageAdapter', async () => {
    const mockStorage = {
      getItem: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'free_recitations_remaining') return '0';
        return null;
      }),
      setItem: jest.fn().mockResolvedValue(undefined),
      removeItem: jest.fn().mockResolvedValue(undefined),
    };
    Object.setPrototypeOf(mockStorage, AsyncStorageAdapter.prototype);

    const service = new SubscriptionService(mockStorage as any);
    const remaining = await service.getRemainingFreeRecitations();

    expect(remaining).toBe(DAILY_LIMIT);
    expect(mockStorage.removeItem).toHaveBeenCalledWith('free_recitations_remaining');
  });
});
