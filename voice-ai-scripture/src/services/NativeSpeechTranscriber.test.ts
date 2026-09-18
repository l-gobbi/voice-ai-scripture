import {
  NativeSpeechTranscriber,
  NativeSpeechRecognizerDriver,
  formatNativeRecognizerLanguage,
} from './NativeSpeechTranscriber';
import { TranscriptionError } from './SpeechTranscriber';

describe('NativeSpeechTranscriber', () => {
  describe('formatNativeRecognizerLanguage', () => {
    it('normalizes en to en-US and pt to pt-BR', () => {
      expect(formatNativeRecognizerLanguage('en')).toBe('en-US');
      expect(formatNativeRecognizerLanguage('pt')).toBe('pt-BR');
      expect(formatNativeRecognizerLanguage('pt-BR')).toBe('pt-BR');
      expect(formatNativeRecognizerLanguage(undefined)).toBe('en-US');
    });
  });

  describe('transcription with driver', () => {
    it('delegates audio transcription to native driver with formatted language', async () => {
      const mockDriver: NativeSpeechRecognizerDriver = {
        isAvailable: jest.fn().mockResolvedValue(true),
        transcribeAudio: jest.fn().mockResolvedValue('No princípio Deus criou os céus e a terra'),
      };

      const transcriber = new NativeSpeechTranscriber({ driver: mockDriver });
      const result = await transcriber.transcribe('file:///path/audio.m4a', { language: 'pt' });

      expect(mockDriver.transcribeAudio).toHaveBeenCalledWith('file:///path/audio.m4a', {
        language: 'pt-BR',
        prompt: undefined,
      });
      expect(result.text).toBe('No princípio Deus criou os céus e a terra');
    });

    it('falls back to simulated prompt if driver reports unavailable or returns empty', async () => {
      const mockDriver: NativeSpeechRecognizerDriver = {
        isAvailable: jest.fn().mockResolvedValue(false),
        transcribeAudio: jest.fn().mockResolvedValue(''),
      };

      const transcriber = new NativeSpeechTranscriber({
        driver: mockDriver,
        fallbackToPrompt: true,
      });

      const result = await transcriber.transcribe('file:///audio.m4a', {
        prompt: 'The Lord is my shepherd',
      });
      expect(result.text).toBe('The Lord is my shepherd');
    });

    it('throws TranscriptionError if driver fails and no fallback is enabled', async () => {
      const mockDriver: NativeSpeechRecognizerDriver = {
        isAvailable: jest.fn().mockResolvedValue(true),
        transcribeAudio: jest.fn().mockRejectedValue(new Error('Device recognition failed')),
      };

      const transcriber = new NativeSpeechTranscriber({
        driver: mockDriver,
        fallbackToPrompt: false,
      });

      await expect(
        transcriber.transcribe('file:///audio.m4a')
      ).rejects.toThrow(TranscriptionError);
    });
  });

  describe('WebSpeechRecognizerDriver', () => {
    const { WebSpeechRecognizerDriver, DefaultNativeDriver } = require('./NativeSpeechTranscriber');
    const { setWebTranscript, clearWebTranscript } = require('./AudioRecorderService');

    afterEach(() => {
      clearWebTranscript();
      delete (global as any).window;
    });

    it('reports unavailable when window is undefined', async () => {
      const driver = new WebSpeechRecognizerDriver();
      expect(await driver.isAvailable()).toBe(false);
    });

    it('reports available when window.SpeechRecognition exists', async () => {
      (global as any).window = {
        SpeechRecognition: class MockSpeechRecognition {},
      };
      const driver = new WebSpeechRecognizerDriver();
      expect(await driver.isAvailable()).toBe(true);
    });

    it('reports available when window.webkitSpeechRecognition exists', async () => {
      (global as any).window = {
        webkitSpeechRecognition: class MockWebKitSpeechRecognition {},
      };
      const driver = new WebSpeechRecognizerDriver();
      expect(await driver.isAvailable()).toBe(true);
    });

    it('retrieves cached live transcript for matching audioUri', async () => {
      (global as any).window = {
        webkitSpeechRecognition: class MockWebKitSpeechRecognition {},
      };
      const testUri = 'blob:http://localhost:8081/test-audio';
      setWebTranscript(testUri, 'In the beginning was the Word');

      const driver = new WebSpeechRecognizerDriver();
      const text = await driver.transcribeAudio(testUri);
      expect(text).toBe('In the beginning was the Word');
    });

    it('DefaultNativeDriver automatically delegates to WebSpeechRecognizerDriver when in browser', async () => {
      (global as any).window = {
        webkitSpeechRecognition: class MockWebKitSpeechRecognition {},
      };
      const testUri = 'blob:http://localhost:8081/test-audio-2';
      setWebTranscript(testUri, 'O Senhor é o meu pastor');

      const defaultDriver = new DefaultNativeDriver();
      expect(await defaultDriver.isAvailable()).toBe(true);

      const text = await defaultDriver.transcribeAudio(testUri);
      expect(text).toBe('O Senhor é o meu pastor');
    });
  });
});
