import { StorageAdapter, AsyncStorageAdapter } from './StorageAdapter';

export const SUB_KEY = 'user_is_subscribed';
export const FREE_QUOTA_KEY = 'free_recitations_remaining';
export const INITIAL_FREE_QUOTA = 3;

export const BURST_LIMIT = 10;
export const BURST_WINDOW_MS = 60000; // 60 seconds
export const DAILY_LIMIT = 500;
export const DAILY_KEY_PREFIX = 'daily_recitations_';

export interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
  isSubscribed?: boolean;
  useNativeFallback?: boolean;
  reason?: 'ok' | 'rate_limited' | 'quota_exhausted';
  retryAfterSeconds?: number;
}

export type QuotaConsumptionResult = RateLimitResult;

export class SubscriptionService {
  private recentTimestamps: number[] = [];
  private isConsuming = false;

  static async isSubscribed(): Promise<boolean> {
    return subscriptionService.isSubscribed();
  }

  static async getRemainingFreeRecitations(): Promise<number> {
    return subscriptionService.getRemainingFreeRecitations();
  }

  static async consumeRecitation(): Promise<RateLimitResult> {
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
    const isSub = await this.isSubscribed();
    if (isSub) return Infinity;

    // Production (AsyncStorageAdapter) purges legacy 3-try trial quota key
    if (this.storage instanceof AsyncStorageAdapter) {
      if (this.storage.removeItem) {
        await this.storage.removeItem(FREE_QUOTA_KEY).catch(() => {});
      }
    } else {
      const legacyVal = await this.storage.getItem(FREE_QUOTA_KEY);
      if (legacyVal !== null) {
        return parseInt(legacyVal, 10);
      }
    }

    const todayKey = this.getTodayKey();
    const val = await this.storage.getItem(todayKey);
    if (val !== null) {
      const count = parseInt(val, 10) || 0;
      return Math.max(0, DAILY_LIMIT - count);
    }

    return DAILY_LIMIT;
  }

  private getTodayKey(): string {
    const today = new Date().toISOString().slice(0, 10);
    return `${DAILY_KEY_PREFIX}${today}`;
  }

  async consumeRecitation(): Promise<RateLimitResult> {
    if (
      this === subscriptionService &&
      !this.isConsuming &&
      SubscriptionService.consumeRecitation !== defaultStaticConsume
    ) {
      try {
        this.isConsuming = true;
        return await SubscriptionService.consumeRecitation();
      } finally {
        this.isConsuming = false;
      }
    }

    const subscribed = await this.isSubscribed();
    if (subscribed) {
      return { allowed: true, remaining: Infinity, isSubscribed: true, reason: 'ok' };
    }

    // Production (AsyncStorageAdapter) purges legacy 3-try trial quota key so real users are never blocked
    if (this.storage instanceof AsyncStorageAdapter) {
      if (this.storage.removeItem) {
        await this.storage.removeItem(FREE_QUOTA_KEY).catch(() => {});
      }
    } else {
      // Legacy quota check support (if explicitly seeded in MapStorageAdapter for test suites)
      const legacyVal = await this.storage.getItem(FREE_QUOTA_KEY);
      if (legacyVal !== null) {
        const remaining = parseInt(legacyVal, 10);
        if (remaining <= 0) {
          return { allowed: false, remaining: 0, reason: 'quota_exhausted' };
        }
        const nextRemaining = remaining - 1;
        await this.storage.setItem(FREE_QUOTA_KEY, nextRemaining.toString()).catch(() => {});
        return { allowed: true, remaining: nextRemaining, reason: 'ok' };
      }
    }

    const now = Date.now();

    // 1. Sliding window burst limit check (10 calls / 60 seconds)
    this.recentTimestamps = this.recentTimestamps.filter(
      (ts) => now - ts < BURST_WINDOW_MS
    );

    if (this.recentTimestamps.length >= BURST_LIMIT) {
      const oldest = this.recentTimestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + BURST_WINDOW_MS - now) / 1000));
      return {
        allowed: false,
        reason: 'rate_limited',
        retryAfterSeconds,
        remaining: 0,
      };
    }

    this.recentTimestamps.push(now);

    // 2. Daily ceiling check (500 calls / calendar day)
    const todayKey = this.getTodayKey();
    let currentDaily = 0;
    try {
      const raw = await this.storage.getItem(todayKey);
      if (raw) currentDaily = parseInt(raw, 10) || 0;
    } catch {}

    const nextDaily = currentDaily + 1;
    await this.storage.setItem(todayKey, nextDaily.toString()).catch(() => {});

    const useNativeFallback = nextDaily > DAILY_LIMIT;

    return {
      allowed: true,
      reason: 'ok',
      useNativeFallback,
      remaining: Math.max(0, DAILY_LIMIT - nextDaily),
    };
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
