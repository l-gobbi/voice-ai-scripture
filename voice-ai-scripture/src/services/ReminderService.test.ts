import { ReminderService } from './ReminderService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

describe('ReminderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns default reminder settings (8:00 AM, disabled) when none stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const settings = await ReminderService.getReminderSettings();

    expect(settings).toEqual({
      enabled: false,
      hour: 8,
      minute: 0,
    });
  });

  it('saves and updates reminder settings to AsyncStorage', async () => {
    const result = await ReminderService.saveReminderSettings({
      enabled: true,
      hour: 7,
      minute: 30,
    });

    expect(result.success).toBeDefined();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'quiet_time_reminder_settings',
      JSON.stringify({
        enabled: true,
        hour: 7,
        minute: 30,
      })
    );
  });

  it('safely cancels notifications without throwing', async () => {
    await expect(ReminderService.cancelDailyNotification()).resolves.toBeUndefined();
  });
});
