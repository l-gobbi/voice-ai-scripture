import { getExpoSpeechRecognitionModule } from './NativeSpeechRecognitionHelper';

describe('NativeSpeechRecognitionHelper (Expo Go Safety Guard)', () => {
  it('returns null safely when ExpoSpeechRecognition is not installed (e.g. Expo Go)', () => {
    // In our test environment, ExpoSpeechRecognition is not installed as a native module
    const result = getExpoSpeechRecognitionModule();
    expect(result).toBeNull();
  });

  it('never throws even if module resolution or require fails', () => {
    expect(() => {
      getExpoSpeechRecognitionModule();
    }).not.toThrow();
  });
});
