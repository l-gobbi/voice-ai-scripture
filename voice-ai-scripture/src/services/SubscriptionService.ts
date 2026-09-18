import { StorageAdapter, AsyncStorageAdapter } from './StorageAdapter';

export const SUB_KEY = 'user_is_subscribed';
export const FREE_QUOTA_KEY = 'free_recitations_remaining';
export const INITIAL_FREE_QUOTA = 3;

export interface QuotaConsumptionResult {
  allowed: boolean;
  remaining: number;
  isSubscribed?: boolean;
}

export class SubscriptionService {
  static async isSubscribed(): Promise<boolean> {
    return subscriptionService.isSubscribed();
  }

  static async getRemainingFreeRecitations(): Promise<number> {
    return subscriptionService.getRemainingFreeRecitations();
  }

  static async consumeRecitation(): Promise<QuotaConsumptionResult> {
    return subscriptionService.consumeRecitation();
  }

  static async subscribePremium(): Promise<void> {
    return subscriptionService.subscribePremium();
  }

  static async cancelSubscription(): Promise<void> {
    return subscriptionService.cancelSubscription();
  }

  constructor(private storage: StorageAdapter = new AsyncStorageAdapter()) {}

  async isSubscribed(): Promise<boolean> {
    try {
      const val = await this.storage.getItem(SUB_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  }

  async getRemainingFreeRecitations(): Promise<number> {
    try {
      const val = await this.storage.getItem(FREE_QUOTA_KEY);
      if (val === null) {
        return INITIAL_FREE_QUOTA;
      }
      return parseInt(val, 10);
    } catch {
      return INITIAL_FREE_QUOTA;
    }
  }

  async consumeRecitation(): Promise<QuotaConsumptionResult> {
    if (
      this === subscriptionService &&
      SubscriptionService.consumeRecitation !== defaultStaticConsume
    ) {
      return SubscriptionService.consumeRecitation();
    }

    const subscribed = await this.isSubscribed();
    if (subscribed) {
      return { allowed: true, remaining: Infinity, isSubscribed: true };
    }

    const currentRemaining = await this.getRemainingFreeRecitations();
    if (currentRemaining <= 0) {
      return { allowed: false, remaining: 0 };
    }

    const nextRemaining = currentRemaining - 1;
    await this.storage.setItem(FREE_QUOTA_KEY, nextRemaining.toString());

    return { allowed: true, remaining: nextRemaining };
  }

  async subscribePremium(): Promise<void> {
    await this.storage.setItem(SUB_KEY, 'true');
  }

  async cancelSubscription(): Promise<void> {
    await this.storage.setItem(SUB_KEY, 'false');
  }
}

export const subscriptionService = new SubscriptionService();
const defaultStaticConsume = SubscriptionService.consumeRecitation;
