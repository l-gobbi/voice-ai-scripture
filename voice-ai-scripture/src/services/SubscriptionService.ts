import AsyncStorage from '@react-native-async-storage/async-storage';

const SUB_KEY = 'user_is_subscribed';
const FREE_QUOTA_KEY = 'free_recitations_remaining';
const INITIAL_FREE_QUOTA = 3;

export const SubscriptionService = {
  async isSubscribed(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(SUB_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  },

  async getRemainingFreeRecitations(): Promise<number> {
    try {
      const val = await AsyncStorage.getItem(FREE_QUOTA_KEY);
      if (val === null) {
        return INITIAL_FREE_QUOTA;
      }
      return parseInt(val, 10);
    } catch {
      return INITIAL_FREE_QUOTA;
    }
  },

  async consumeRecitation(): Promise<{ allowed: boolean; remaining: number }> {
    const subscribed = await this.isSubscribed();
    if (subscribed) {
      return { allowed: true, remaining: Infinity };
    }

    const currentRemaining = await this.getRemainingFreeRecitations();
    if (currentRemaining <= 0) {
      return { allowed: false, remaining: 0 };
    }

    const nextRemaining = currentRemaining - 1;
    await AsyncStorage.setItem(FREE_QUOTA_KEY, nextRemaining.toString());

    return { allowed: true, remaining: nextRemaining };
  },

  async subscribePremium(): Promise<void> {
    await AsyncStorage.setItem(SUB_KEY, 'true');
  },

  async cancelSubscription(): Promise<void> {
    await AsyncStorage.setItem(SUB_KEY, 'false');
  },
};
