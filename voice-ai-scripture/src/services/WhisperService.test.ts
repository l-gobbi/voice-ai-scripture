import { transcribeAudio } from './WhisperService';

describe('WhisperService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('sends audio to OpenAI Whisper API and returns transcribed text', async () => {
    const mockResponse = { text: 'For God so loved the world' };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const result = await transcribeAudio('file:///mock/audio.m4a', 'sk-test-key');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];

    expect(url).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer sk-test-key');
    expect(result.text).toBe('For God so loved the world');
  });

  it('throws an error when the API request fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('Invalid API Key'),
    });

    await expect(transcribeAudio('file:///mock/audio.m4a', 'bad-key')).rejects.toThrow(
      'Whisper transcription failed: 401 - Invalid API Key'
    );
  });
});
