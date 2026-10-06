import { RecitationSession } from './RecitationSession';
import { Verse, verseEngine } from './VerseEngine';
import { audioRecorder } from './AudioRecorderService';
import { createDefaultTranscriber } from './SpeechTranscriber';
import { CloudAudioVoiceAdapter } from './VoiceInput';

describe('Reproduction: Mobile Expo Go Recitation without API Key', () => {
  const mockVerse: Verse = {
    id: 'v1',
    reference: 'John 3:16',
    text: 'For God so loved the world that he gave his only begotten Son',
  };

  beforeEach(() => {
    delete (global as any).window;
    delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
    jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
    jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///audio/recording.m4a');
    jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);
    jest.spyOn(verseEngine, 'recordReview').mockResolvedValue({
      streak: 1,
      repetitions: 1,
      intervalDays: 1,
      easeFactor: 2.5,
      nextReviewDate: new Date(),
      passed: true,
    });
  });

  it('fails gracefully with informative message when no API key or speech driver is available by default', async () => {
    const transcriber = createDefaultTranscriber();
    const voiceInput = new CloudAudioVoiceAdapter({ transcriber });
    const session = new RecitationSession(mockVerse, { voiceInput });

    await session.startReciting();
    const result = await session.stopAndVerify();

    expect(result).toBeNull();
    expect(session.getState().status).toBe('error');
    expect(session.getState().errorMessage).toContain('Speech recognition is not available');
  });

  it('verifies successfully when dev fallbackToPrompt option is enabled', async () => {
    const transcriber = createDefaultTranscriber(undefined, { fallbackToPrompt: true });
    const voiceInput = new CloudAudioVoiceAdapter({ transcriber });
    const session = new RecitationSession(mockVerse, { voiceInput });

    await session.startReciting();
    const result = await session.stopAndVerify();

    expect(session.getState().errorMessage).toBeNull();
    expect(session.getState().status).toBe('verified');
    expect(result).not.toBeNull();
    expect(result?.passed).toBe(true);
  });
});
