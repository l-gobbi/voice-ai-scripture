import { RecitationSession } from './RecitationSession';
import { Verse, verseEngine } from './VerseEngine';
import { SimulatedVoiceAdapter } from './VoiceInput';

describe('Regression: Recitation accuracy does not produce false 100% positive scores', () => {
  const mockVerse: Verse = {
    id: 'v1',
    reference: 'John 3:16',
    text: 'For God so loved the world that he gave his only begotten Son',
  };

  it('fails gracefully with error when transcription driver is unavailable instead of blindly awarding 100%', async () => {
    await verseEngine.addVerse({
      reference: mockVerse.reference,
      text: mockVerse.text,
    });
    const verses = await verseEngine.getAllVerses();
    const storedVerse = verses[0];

    // Default session created without custom mock transcriber (just like in the running app)
    const session = new RecitationSession(storedVerse);

    await session.startReciting();
    const result = await session.stopAndVerify();

    // Must NOT award 100% score when speech recognition is unavailable
    expect(result).toBeNull();
    expect(session.getState().status).toBe('error');
    expect(session.getState().errorMessage).toContain('Speech recognition is not available');
  });

  it('grades an unrelated recitation as forgotten, with every word an error', async () => {
    const verses = await verseEngine.getAllVerses();
    const storedVerse = verses[0] || mockVerse;

    const session = new RecitationSession(storedVerse, {
      voiceInput: new SimulatedVoiceAdapter({
        defaultTranscript: 'something completely random and incorrect',
      }),
    });

    await session.startReciting();
    const result = await session.stopAndVerify();

    expect(result).not.toBeNull();
    expect(result?.score).toBe(0);
    expect(result?.outcome).toBe('forgotten');
    // 13 missed words, plus 5 added words of which 3 are beyond the allowance of two.
    expect(result?.errorCount).toBe(16);
    expect(result?.errorBudget).toBe(1);
    expect(result?.passed).toBe(false);
    expect(session.getState().status).toBe('verified');
  });

  it('grades a verbatim recitation as clean with 100% accuracy', async () => {
    const verses = await verseEngine.getAllVerses();
    const storedVerse = verses[0] || mockVerse;

    const session = new RecitationSession(storedVerse, {
      voiceInput: new SimulatedVoiceAdapter({
        defaultTranscript: storedVerse.text,
      }),
    });

    await session.startReciting();
    const result = await session.stopAndVerify();

    expect(result).not.toBeNull();
    expect(result?.score).toBe(100);
    expect(result?.outcome).toBe('clean');
    expect(result?.errorCount).toBe(0);
    expect(result?.passed).toBe(true);
    expect(session.getState().status).toBe('verified');
  });
});
