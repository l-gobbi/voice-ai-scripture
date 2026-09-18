import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MapStorageAdapter,
  AsyncStorageAdapter,
} from './StorageAdapter';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('StorageAdapter Persistence Seam', () => {
  describe('MapStorageAdapter (in-memory)', () => {
    it('stores and retrieves string values', async () => {
      const storage = new MapStorageAdapter();
      await storage.setItem('greeting', 'hello');
      const value = await storage.getItem('greeting');
      expect(value).toBe('hello');
    });

    it('returns null for missing keys', async () => {
      const storage = new MapStorageAdapter();
      const value = await storage.getItem('nonexistent');
      expect(value).toBeNull();
    });

    it('supports seed entries via constructor', async () => {
      const storage = new MapStorageAdapter({
        user_is_subscribed: 'true',
        free_recitations_remaining: '5',
      });
      expect(await storage.getItem('user_is_subscribed')).toBe('true');
      expect(await storage.getItem('free_recitations_remaining')).toBe('5');
    });

    it('overwrites existing values with setItem', async () => {
      const storage = new MapStorageAdapter({ count: '1' });
      await storage.setItem('count', '2');
      expect(await storage.getItem('count')).toBe('2');
    });
  });

  describe('AsyncStorageAdapter (React Native)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('delegates getItem to AsyncStorage.getItem', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce('stored_value');
      const adapter = new AsyncStorageAdapter();
      const result = await adapter.getItem('test_key');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('test_key');
      expect(result).toBe('stored_value');
    });

    it('delegates setItem to AsyncStorage.setItem', async () => {
      const setSpy = jest.spyOn(AsyncStorage, 'setItem').mockResolvedValueOnce();
      const adapter = new AsyncStorageAdapter();
      await adapter.setItem('test_key', 'test_value');
      expect(setSpy).toHaveBeenCalledWith('test_key', 'test_value');
    });
  });
});
