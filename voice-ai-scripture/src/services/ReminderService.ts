import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const REMINDER_KEY = 'quiet_time_reminder_settings';

function getNotificationsModule() {
  try {
    // Avoid root 'expo-notifications' barrel which executes DevicePushTokenAutoRegistration.fx on load
    return {
      scheduleNotificationAsync: require('expo-notifications/build/scheduleNotificationAsync').scheduleNotificationAsync,
      cancelAllScheduledNotificationsAsync: require('expo-notifications/build/cancelAllScheduledNotificationsAsync').cancelAllScheduledNotificationsAsync,
      requestPermissionsAsync: require('expo-notifications/build/NotificationPermissions').requestPermissionsAsync,
      setNotificationChannelAsync: require('expo-notifications/build/setNotificationChannelAsync').setNotificationChannelAsync,
    };
  } catch {
    try {
      return require('expo-notifications');
    } catch {
      return null;
    }
  }
}

export const ReminderService = {
  async getReminderSettings(): Promise<ReminderSettings> {
    try {
      const data = await AsyncStorage.getItem(REMINDER_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}

    return {
      enabled: false,
      hour: 8,
      minute: 0,
    };
  },

  async saveReminderSettings(settings: ReminderSettings): Promise<{ success: boolean; isExpoGoAndroid?: boolean }> {
    await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(settings));

    const isExpoGoAndroid = isRunningInExpoGo() && Platform.OS === 'android';

    if (settings.enabled) {
      const scheduled = await this.scheduleDailyNotification(settings.hour, settings.minute);
      return { success: scheduled, isExpoGoAndroid };
    } else {
      await this.cancelDailyNotification();
      return { success: true, isExpoGoAndroid };
    }
  },

  async scheduleDailyNotification(hour: number, minute: number): Promise<boolean> {
    if (Platform.OS === 'web') {
      return true; // Web notification mock
    }

    try {
      const Notifications = getNotificationsModule();
      if (!Notifications) {
        return false;
      }

      // Configure Android channel if available
      if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
        try {
          await Notifications.setNotificationChannelAsync('quiet-time', {
            name: 'Daily Scripture Reminders',
            importance: 4,
            sound: 'default',
          });
        } catch {}
      }

      if (Notifications.requestPermissionsAsync) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          return false;
        }
      }

      if (Notifications.cancelAllScheduledNotificationsAsync) {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }

      if (Notifications.scheduleNotificationAsync) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📖 Quiet-Time Scripture Reminder',
            body: 'You have scripture memory verses due for review today! Take 2 minutes to recite them.',
            sound: true,
          },
          trigger: {
            type: 'daily',
            hour,
            minute,
            channelId: 'quiet-time',
          },
        });
      }

      return true;
    } catch (e) {
      console.warn('Notification scheduling gracefully caught:', e);
      return false;
    }
  },

  async cancelDailyNotification(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const Notifications = getNotificationsModule();
      if (Notifications?.cancelAllScheduledNotificationsAsync) {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    } catch (e) {
      console.warn('Failed to cancel notifications:', e);
    }
  },
};

