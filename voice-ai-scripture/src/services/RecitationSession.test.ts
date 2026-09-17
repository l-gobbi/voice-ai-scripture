import { RecitationSession, RecitationState } from './RecitationSession';
import { Verse, VerseStorageService } from './VerseStorageService';
import { SubscriptionService } from './SubscriptionService';
import { audioRecorder } from './AudioRecorderService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('RecitationSession (Ticket 07)', () => {
  const mockVerse: Verse = {
    id: '1',
    reference: 'John 3:16',
    text: 'For God so loved the world that he gave his one and only Son',
    srs: {
      intervalDays: 1,
      streak: 0,
      easeFactor: 2.5,
      nextReviewDate: new Date().toISOString(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Slice 1: Quota Gating and Start Reciting', () => {
    it('initializes in idle state', () => {
      const session = new RecitationSession(mockVerse);
      expect(session.getState()).toEqual({
        status: 'idle',
        volumeLevel: 0,
        result: null,
        errorMessage: null,
      });
    });

    it('transitions to quota_exhausted and does NOT start recording when quota is exhausted', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        isSubscribed: false,
      });
      const startSpy = jest.spyOn(audioRecorder, 'startRecording');

      const session = new RecitationSession(mockVerse);
      await session.startReciting();

      expect(session.getState().status).toBe('quota_exhausted');
      expect(startSpy).not.toHaveBeenCalled();
    });

    it('transitions to reciting and starts audio recording when quota is allowed', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
        allowed: true,
        remaining: 2,
        isSubscribed: false,
      });
      const startSpy = jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);

      const session = new RecitationSession(mockVerse);
      await session.startReciting();

      expect(session.getState().status).toBe('reciting');
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('Slice 2: Microphone Permissions & Volume Metering', () => {
    it('sets error status and does NOT consume quota when microphone permission is denied', async () => {
      const quotaSpy = jest.spyOn(SubscriptionService, 'consumeRecitation');
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(false);

      const session = new RecitationSession(mockVerse);
      await session.startReciting();

      expect(session.getState().status).toBe('error');
      expect(session.getState().errorMessage).toContain('Microphone permission');
      expect(quotaSpy).not.toHaveBeenCalled();
    });

    it('updates volumeLevel and notifies subscribers during live recitation', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
        allowed: true,
        remaining: 3,
        isSubscribed: false,
      });

      let meterCb: ((level: number) => void) | undefined;
      jest.spyOn(audioRecorder, 'startRecording').mockImplementationOnce(async (cb) => {
        meterCb = cb;
      });

      const session = new RecitationSession(mockVerse);
      const states: RecitationState[] = [];
      session.subscribe((s) => states.push(s));

      await session.startReciting();
      expect(session.getState().status).toBe('reciting');

      // Simulate audio meter tick
      meterCb?.(0.75);
      expect(session.getState().volumeLevel).toBe(0.75);
      expect(states.some((s) => s.volumeLevel === 0.75)).toBe(true);
    });
  });

  describe('Slice 3: Verification, Myers Diffing, and SRS Updates', () => {
    it('stops recording, runs diff verification, updates SRS, and transitions to verified', async () => {
      jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
        allowed: true,
        remaining: 3,
        isSubscribed: true,
      });
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/recitation.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);
      const updateSRSSpy = jest.spyOn(VerseStorageService, 'updateVerseSRS').mockResolvedValueOnce(undefined);

      // Injected mock speech transcriber that returns verbatim text
      const mockTranscriber = jest.fn().mockResolvedValueOnce(mockVerse.text);

      const session = new RecitationSession(mockVerse, { transcriber: mockTranscriber });
      await session.startReciting();

      const result = await session.stopAndVerify();

      expect(result).not.toBeNull();
      expect(result?.passed).toBe(true);
      expect(result?.score).toBe(100);
      expect(result?.srsResult.streak).toBe(1);
      expect(updateSRSSpy).toHaveBeenCalledWith('1', expect.objectContaining({ streak: 1 }));
      expect(session.getState().status).toBe('verified');
      expect(session.getState().result).toEqual(result);
    });

    it('handles recitation failure: score below threshold resets streak to 0', async () => {
      jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
        allowed: true,
        remaining: 3,
        isSubscribed: true,
      });
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/recitation.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);
      const updateSRSSpy = jest.spyOn(VerseStorageService, 'updateVerseSRS').mockResolvedValueOnce(undefined);

      // Injected transcriber with incorrect text
      const mockTranscriber = jest.fn().mockResolvedValueOnce('Totally different words');

      const session = new RecitationSession(mockVerse, { transcriber: mockTranscriber });
      await session.startReciting();

      const result = await session.stopAndVerify();

      expect(result?.passed).toBe(false);
      expect(result?.score).toBeLessThan(80);
      expect(result?.srsResult.streak).toBe(0);
      expect(updateSRSSpy).toHaveBeenCalledWith('1', expect.objectContaining({ streak: 0 }));
      expect(session.getState().status).toBe('verified');
    });

    it('transitions to verifying status during stopAndVerify before resolution', async () => {
      jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
        allowed: true,
        remaining: 3,
        isSubscribed: true,
      });
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/status-test.m4a');
      jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);
      jest.spyOn(VerseStorageService, 'updateVerseSRS').mockResolvedValueOnce(undefined);

      let statusDuringVerification: string | null = null;
      let sessionInstance: RecitationSession | null = null;
      const mockTranscriber = jest.fn().mockImplementation(async () => {
        statusDuringVerification = sessionInstance?.getState().status ?? null;
        return mockVerse.text;
      });

      sessionInstance = new RecitationSession(mockVerse, { transcriber: mockTranscriber });
      await sessionInstance.startReciting();
      await sessionInstance.stopAndVerify();

      expect(statusDuringVerification).toBe('verifying');
      expect(sessionInstance.getState().status).toBe('verified');
    });
  });

  describe('Slice 4: Guaranteed Audio File Disposal (Privacy Invariant)', () => {
    it('deletes audio file upon successful verification', async () => {
      jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
        allowed: true,
        remaining: 3,
        isSubscribed: true,
      });
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/privacy-test.m4a');
      const deleteSpy = jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);

      const mockTranscriber = jest.fn().mockResolvedValueOnce(mockVerse.text);
      const session = new RecitationSession(mockVerse, { transcriber: mockTranscriber });

      await session.startReciting();
      await session.stopAndVerify();

      expect(deleteSpy).toHaveBeenCalledWith('file:///audio/privacy-test.m4a');
    });

    it('deletes audio file even when speech transcription rejects with error', async () => {
      jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
        allowed: true,
        remaining: 3,
        isSubscribed: true,
      });
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/failing-network.m4a');
      const deleteSpy = jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);

      const failingTranscriber = jest.fn().mockRejectedValueOnce(new Error('Network timeout'));
      const session = new RecitationSession(mockVerse, { transcriber: failingTranscriber });

      await session.startReciting();
      const result = await session.stopAndVerify();

      expect(result).toBeNull();
      expect(session.getState().status).toBe('error');
      expect(session.getState().errorMessage).toContain('Network timeout');
      // CRITICAL PRIVACY INVARIANT: must be deleted even on error
      expect(deleteSpy).toHaveBeenCalledWith('file:///audio/failing-network.m4a');
    });

    it('stops recorder and deletes audio file when reset() is called mid-recitation', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
        allowed: true,
        remaining: 3,
        isSubscribed: true,
      });
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/abort.m4a');
      const deleteSpy = jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValueOnce(true);

      const session = new RecitationSession(mockVerse);
      await session.startReciting();
      expect(session.getState().status).toBe('reciting');

      await session.reset();

      expect(session.getState().status).toBe('idle');
      expect(deleteSpy).toHaveBeenCalledWith('file:///audio/abort.m4a');
    });

    it('deletes audio file before transitioning to verified state', async () => {
      jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValueOnce(true);
      jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
        allowed: true,
        remaining: 3,
        isSubscribed: true,
      });
      jest.spyOn(audioRecorder, 'startRecording').mockResolvedValueOnce(undefined);
      jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValueOnce('file:///audio/order-test.m4a');

      let deletedBeforeVerified = false;
      const deleteSpy = jest.spyOn(audioRecorder, 'deleteAudioFile').mockImplementationOnce(async () => {
        deletedBeforeVerified = session.getState().status !== 'verified';
        return true;
      });
      jest.spyOn(VerseStorageService, 'updateVerseSRS').mockResolvedValueOnce(undefined);

      const mockTranscriber = jest.fn().mockResolvedValueOnce(mockVerse.text);
      const session = new RecitationSession(mockVerse, { transcriber: mockTranscriber });

      await session.startReciting();
      await session.stopAndVerify();

      expect(deleteSpy).toHaveBeenCalledWith('file:///audio/order-test.m4a');
      expect(deletedBeforeVerified).toBe(true);
    });

    it('cleans up and resets session on reset()', async () => {
      const session = new RecitationSession(mockVerse);
      await session.reset();

      expect(session.getState()).toEqual({
        status: 'idle',
        volumeLevel: 0,
        result: null,
        errorMessage: null,
      });
    });
  });
});
