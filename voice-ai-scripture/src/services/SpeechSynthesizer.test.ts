import {
  SpeechSynthesizer,
  MockSpeechSynthesizer,
  ExpoSpeechSynthesizer,
  SpeechOptions,
} from './SpeechSynthesizer';

describe('SpeechSynthesizer', () => {
  describe('MockSpeechSynthesizer', () => {
    it('records spoken utterances, options, and handles stop', async () => {
      const synth = new MockSpeechSynthesizer();

      expect(await synth.isSpeaking()).toBe(false);

      let completed = false;
      const speakPromise = synth.speak('For God so loved the world', {
        language: 'en',
        onDone: () => {
          completed = true;
        },
      });

      expect(await synth.isSpeaking()).toBe(true);
      expect(synth.getSpokenUtterances()).toEqual([
        {
          text: 'For God so loved the world',
          options: {
            language: 'en-US',
            pitch: 1.0,
            rate: 0.95,
          },
        },
      ]);

      await speakPromise;
      expect(await synth.isSpeaking()).toBe(false);
      expect(completed).toBe(true);
    });

    it('stops speech when stop() is called', async () => {
      const synth = new MockSpeechSynthesizer({ autoComplete: false });

      let stopped = false;
      synth.speak('Long verse text...', {
        onStopped: () => {
          stopped = true;
        },
      });

      expect(await synth.isSpeaking()).toBe(true);
      await synth.stop();
      expect(await synth.isSpeaking()).toBe(false);
      expect(stopped).toBe(true);
    });
  });

  describe('ExpoSpeechSynthesizer language formatting', () => {
    it('maps language shortcodes en and pt to native BCP-47 identifiers en-US and pt-BR', async () => {
      const mockExpoSpeech = {
        speak: jest.fn((text, options) => {
          options?.onDone?.();
        }),
        stop: jest.fn().mockResolvedValue(undefined),
        isSpeakingAsync: jest.fn().mockResolvedValue(false),
      };

      const synth = new ExpoSpeechSynthesizer(mockExpoSpeech as any);

      await synth.speak('No princípio era o Verbo', { language: 'pt' });
      expect(mockExpoSpeech.speak).toHaveBeenCalledWith(
        'No princípio era o Verbo',
        expect.objectContaining({ language: 'pt-BR' })
      );

      await synth.speak('In the beginning was the Word', { language: 'en' });
      expect(mockExpoSpeech.speak).toHaveBeenCalledWith(
        'In the beginning was the Word',
        expect.objectContaining({ language: 'en-US' })
      );
    });

    it('passes explicit BCP-47 tags or defaults gracefully', async () => {
      const mockExpoSpeech = {
        speak: jest.fn((text, options) => {
          options?.onDone?.();
        }),
        stop: jest.fn().mockResolvedValue(undefined),
        isSpeakingAsync: jest.fn().mockResolvedValue(false),
      };

      const synth = new ExpoSpeechSynthesizer(mockExpoSpeech as any);

      await synth.speak('Custom tag', { language: 'pt-PT' });
      expect(mockExpoSpeech.speak).toHaveBeenCalledWith(
        'Custom tag',
        expect.objectContaining({ language: 'pt-PT' })
      );

      await synth.speak('Default fallback');
      expect(mockExpoSpeech.speak).toHaveBeenCalledWith(
        'Default fallback',
        expect.objectContaining({ language: 'en-US' })
      );
    });

    it('delegates stop and isSpeaking to expo-speech', async () => {
      const mockExpoSpeech = {
        speak: jest.fn(),
        stop: jest.fn().mockResolvedValue(undefined),
        isSpeakingAsync: jest.fn().mockResolvedValue(true),
      };

      const synth = new ExpoSpeechSynthesizer(mockExpoSpeech as any);

      expect(await synth.isSpeaking()).toBe(true);
      await synth.stop();
      expect(mockExpoSpeech.stop).toHaveBeenCalled();
    });
  });
});
