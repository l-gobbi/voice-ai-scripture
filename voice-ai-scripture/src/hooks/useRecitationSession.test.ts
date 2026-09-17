import { renderHook, act } from '@testing-library/react-native';
import { useRecitationSession } from './useRecitationSession';
import { Verse } from '../services/VerseStorageService';
import { SubscriptionService } from '../services/SubscriptionService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('useRecitationSession hook (Ticket 08)', () => {
  const mockVerse: Verse = {
    id: '1',
    reference: 'John 3:16',
    text: 'For God so loved the world...',
  };

  it('exposes initial idle state and actions', async () => {
    const { result } = await renderHook(() => useRecitationSession(mockVerse));

    expect(result.current.status).toBe('idle');
    expect(result.current.volumeLevel).toBe(0);
    expect(result.current.result).toBeNull();
    expect(result.current.errorMessage).toBeNull();
    expect(typeof result.current.startReciting).toBe('function');
    expect(typeof result.current.stopAndVerify).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('reflects quota_exhausted status when startReciting fails quota check', async () => {
    jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      isSubscribed: false,
    });

    const { result } = await renderHook(() => useRecitationSession(mockVerse));

    await act(async () => {
      await result.current.startReciting();
    });

    expect(result.current.status).toBe('quota_exhausted');
  });

  it('cleans up recitation session on unmount', async () => {
    const { unmount } = await renderHook(() => useRecitationSession(mockVerse));
    expect(() => unmount()).not.toThrow();
  });
});
