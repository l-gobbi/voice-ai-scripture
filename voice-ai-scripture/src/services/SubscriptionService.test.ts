import { SubscriptionService, subscriptionService } from './SubscriptionService';
import { MapStorageAdapter } from './StorageAdapter';

describe('SubscriptionService (Ticket 24)', () => {
  it('provides 3 free voice recitations initially for non-subscribed users', async () => {
    const storage = new MapStorageAdapter();
    const service = new SubscriptionService(storage);

    const isSub = await service.isSubscribed();
    expect(isSub).toBe(false);

    const remaining = await service.getRemainingFreeRecitations();
    expect(remaining).toBe(3);
  });

  it('decrements free recitations on consume, and blocks once limit is reached', async () => {
    const storage = new MapStorageAdapter();
    const service = new SubscriptionService(storage);

    // Initial quota is 3
    const attempt1 = await service.consumeRecitation();
    expect(attempt1.allowed).toBe(true);
    expect(attempt1.remaining).toBe(2);

    const attempt2 = await service.consumeRecitation();
    expect(attempt2.allowed).toBe(true);
    expect(attempt2.remaining).toBe(1);

    const attempt3 = await service.consumeRecitation();
    expect(attempt3.allowed).toBe(true);
    expect(attempt3.remaining).toBe(0);

    // Limit reached
    const attempt4 = await service.consumeRecitation();
    expect(attempt4.allowed).toBe(false);
    expect(attempt4.remaining).toBe(0);

    expect(await service.getRemainingFreeRecitations()).toBe(0);
  });

  it('allows unlimited recitations once user is subscribed and preserves status', async () => {
    const storage = new MapStorageAdapter({
      user_is_subscribed: 'true',
      free_recitations_remaining: '0',
    });
    const service = new SubscriptionService(storage);

    const isSub = await service.isSubscribed();
    expect(isSub).toBe(true);

    const attempt = await service.consumeRecitation();
    expect(attempt.allowed).toBe(true);
    expect(attempt.remaining).toBe(Infinity);
    expect(attempt.isSubscribed).toBe(true);
  });

  it('supports upgrading to premium and canceling subscription', async () => {
    const storage = new MapStorageAdapter();
    const service = new SubscriptionService(storage);

    expect(await service.isSubscribed()).toBe(false);

    await service.subscribePremium();
    expect(await service.isSubscribed()).toBe(true);
    expect(await storage.getItem('user_is_subscribed')).toBe('true');

    await service.cancelSubscription();
    expect(await service.isSubscribed()).toBe(false);
    expect(await storage.getItem('user_is_subscribed')).toBe('false');
  });

  it('supports backward-compatible static singleton methods', async () => {
    expect(typeof SubscriptionService.isSubscribed).toBe('function');
    expect(typeof SubscriptionService.consumeRecitation).toBe('function');
    expect(typeof SubscriptionService.getRemainingFreeRecitations).toBe('function');
    expect(typeof SubscriptionService.subscribePremium).toBe('function');
    expect(typeof SubscriptionService.cancelSubscription).toBe('function');
    expect(subscriptionService).toBeInstanceOf(SubscriptionService);
  });
});
