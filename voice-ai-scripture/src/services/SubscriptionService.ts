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
  private static defaultInstance: SubscriptionService;

  static getDefaultInstance(): SubscriptionService {
    if (!SubscriptionService.defaultInstance) {
      SubscriptionService.defaultInstance = new SubscriptionService();
    }
    return SubscriptionService.defaultInstance;
  }

  static resetDefaultInstance(storage?: StorageAdapter): SubscriptionService {
    SubscriptionService.defaultInstance = new SubscriptionService(storage);
    return SubscriptionService.defaultInstance;
  }

  static async isSubscribed(): Promise<boolean> {
    return SubscriptionService.getDefaultInstance().isSubscribed();
  }

  static async getRemainingFreeRecitations(): Promise<number> {
    return SubscriptionService.getDefaultInstance().getRemainingFreeRecitations();
  }

  static async consumeRecitation(): Promise<QuotaConsumptionResult> {
    return SubscriptionService.getDefaultInstance().consumeRecitation();
  }

  static async subscribePremium(): Promise<void> {
    return SubscriptionService.getDefaultInstance().subscribePremium();
  }

  static async cancelSubscription(): Promise<void> {
    return SubscriptionService.getDefaultInstance().cancelSubscription();
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

export const subscriptionService = SubscriptionService.getDefaultInstance();
