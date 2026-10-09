import { SubscriptionService, subscriptionService, BURST_LIMIT, DAILY_LIMIT } from './SubscriptionService';
import { MapStorageAdapter, AsyncStorageAdapter } from './StorageAdapter';

// Instants are built from local components (month is 1-based here) so the Study Day
// (04:00 local rollover) is the same in any machine time zone.
const at = (year: number, month: number, day: number, hour: number, minute = 0) =>
  new Date(year, month - 1, day, hour, minute);

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
    const now = at(2026, 10, 9, 10, 0);

    // Seed storage with 499 recitations for today's Study Day
    await storage.setItem('daily_recitations_2026-10-09', '499');

    // 500th recitation is allowed
    const res500 = await service.consumeRecitation(now);
    expect(res500.allowed).toBe(true);
    expect(res500.useNativeFallback).toBe(false);

    // 501st recitation is STILL allowed, but flags useNativeFallback: true
    const res501 = await service.consumeRecitation(now);
    expect(res501.allowed).toBe(true);
    expect(res501.useNativeFallback).toBe(true);
  });

  it('resets daily count at the start of the next Study Day (04:00 local), not at midnight', async () => {
    const storage = new MapStorageAdapter();
    const service = new SubscriptionService(storage);

    // Seed storage with 500 recitations for Study Day Oct 8
    await storage.setItem('daily_recitations_2026-10-08', '500');

    // 00:30 and 03:59 on Oct 9 still belong to Study Day Oct 8: the quota is spent
    expect(await service.getRemainingFreeRecitations(at(2026, 10, 9, 0, 30))).toBe(0);
    const lateNight = await service.consumeRecitation(at(2026, 10, 9, 3, 59));
    expect(lateNight.allowed).toBe(true);
    expect(lateNight.useNativeFallback).toBe(true);

    // 04:00 starts Study Day Oct 9 with a fresh quota
    expect(await service.getRemainingFreeRecitations(at(2026, 10, 9, 4, 0))).toBe(DAILY_LIMIT);
    const morning = await service.consumeRecitation(at(2026, 10, 9, 4, 0));
    expect(morning.allowed).toBe(true);
    expect(morning.useNativeFallback).toBe(false);
    expect(morning.remaining).toBe(DAILY_LIMIT - 1);
  });

  it('counts a recitation at 00:30 toward the same Study Day as one at 23:30', async () => {
    const storage = new MapStorageAdapter();
    const service = new SubscriptionService(storage);

    await service.consumeRecitation(at(2026, 10, 8, 23, 30));
    const afterMidnight = await service.consumeRecitation(at(2026, 10, 9, 0, 30));

    expect(afterMidnight.remaining).toBe(DAILY_LIMIT - 2);
    expect(await service.getRemainingFreeRecitations(at(2026, 10, 9, 3, 0))).toBe(DAILY_LIMIT - 2);
    // The count is stored under the Study Day, keeping the existing key prefix.
    expect(await storage.getItem('daily_recitations_2026-10-08')).toBe('2');
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

describe('SubscriptionService: refunding a recitation (Ticket 74)', () => {
  const morning = at(2026, 10, 9, 7, 30);

  it('returns one unit to the current Study Day', async () => {
    const service = new SubscriptionService(new MapStorageAdapter());
    await service.consumeRecitation(morning);
    await service.consumeRecitation(morning);

    await service.refundRecitation(morning);

    expect(await service.getRemainingFreeRecitations(morning)).toBe(DAILY_LIMIT - 1);
  });

  it('never takes the count below zero', async () => {
    const storage = new MapStorageAdapter();
    const service = new SubscriptionService(storage);

    await service.refundRecitation(morning);
    await service.consumeRecitation(morning);
    await service.refundRecitation(morning);
    await service.refundRecitation(morning);

    expect(await service.getRemainingFreeRecitations(morning)).toBe(DAILY_LIMIT);
    expect(Number((await storage.getItem('daily_recitations_2026-10-09')) ?? '0')).toBe(0);
  });

  it('refunds the Study Day of the given instant: 03:59 belongs to the previous day', async () => {
    const storage = new MapStorageAdapter();
    const service = new SubscriptionService(storage);
    const lateNight = at(2026, 10, 10, 3, 59);
    await service.consumeRecitation(lateNight);
    await service.consumeRecitation(at(2026, 10, 10, 4, 0));

    await service.refundRecitation(lateNight);

    expect(await storage.getItem('daily_recitations_2026-10-09')).toBe('0');
    expect(await storage.getItem('daily_recitations_2026-10-10')).toBe('1');
  });

  it('frees the burst slot of the refunded recitation', async () => {
    const service = new SubscriptionService(new MapStorageAdapter());
    for (let i = 0; i < BURST_LIMIT; i++) {
      expect((await service.consumeRecitation(morning)).allowed).toBe(true);
    }
    expect((await service.consumeRecitation(morning)).reason).toBe('rate_limited');

    await service.refundRecitation(morning);

    expect((await service.consumeRecitation(morning)).allowed).toBe(true);
    expect((await service.consumeRecitation(morning)).reason).toBe('rate_limited');
  });

  it('refunds nothing to a subscriber, who consumes nothing', async () => {
    const storage = new MapStorageAdapter({ 'daily_recitations_2026-10-09': '3' });
    const service = new SubscriptionService(storage);
    await service.subscribePremium();

    await service.consumeRecitation(morning);
    await service.refundRecitation(morning);

    expect(await storage.getItem('daily_recitations_2026-10-09')).toBe('3');
  });
});
