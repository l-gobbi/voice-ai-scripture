import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export class MapStorageAdapter implements StorageAdapter {
  private data = new Map<string, string>();

  constructor(initialData?: Record<string, string>) {
    if (initialData) {
      for (const [k, v] of Object.entries(initialData)) {
        this.data.set(k, v);
      }
    }
  }

  async getItem(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }
}

export class AsyncStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }
}
