import { VerseStorageService } from './VerseStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

describe('VerseStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add a verse and retrieve it', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([]));

    await VerseStorageService.addVerse({
      reference: 'John 3:16',
      text: 'For God so loved the world...',
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'verses',
      expect.stringContaining('John 3:16')
    );
  });

  it('should retrieve all saved verses', async () => {
    const mockVerses = JSON.stringify([
      { id: '1', reference: 'John 3:16', text: 'For God so loved the world...' },
    ]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(mockVerses);

    const verses = await VerseStorageService.getAllVerses();

    expect(verses).toHaveLength(1);
    expect(verses[0].reference).toBe('John 3:16');
  });

  it('should update the SRS metadata for an existing verse', async () => {
    const mockVerses = [
      { id: '1', reference: 'John 3:16', text: 'For God so loved the world...' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockVerses));

    const srsUpdate = {
      streak: 1,
      repetitions: 1,
      intervalDays: 1,
      easeFactor: 2.5,
      nextReviewDate: new Date('2026-01-02T12:00:00Z'),
    };

    await VerseStorageService.updateVerseSRS('1', srsUpdate);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'verses',
      expect.stringContaining('"streak":1')
    );
  });

  it('should import multiple verses from a pack without creating duplicates', async () => {
    const existing = [
      { id: '1', reference: 'John 3:16', text: 'For God so loved the world...' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existing));

    const packToImport = [
      { reference: 'John 3:16', text: 'For God so loved the world...' },
      { reference: 'Philippians 4:6', text: 'Do not be anxious about anything...' },
    ];

    const count = await VerseStorageService.importVerses(packToImport);

    expect(count).toBe(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'verses',
      expect.stringContaining('Philippians 4:6')
    );
  });
});
