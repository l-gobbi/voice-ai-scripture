import { WhisperTranscriber, TranscriptionResult } from './SpeechTranscriber';

export { TranscriptionResult };

/**
 * Sends an audio file to OpenAI Whisper API for speech-to-text transcription.
 * @deprecated Use SpeechTranscriber and WhisperTranscriber instead.
 * @param audioUri URI of the local audio recording
 * @param apiKey OpenAI API key (falls back to process.env.EXPO_PUBLIC_OPENAI_API_KEY)
 */
export async function transcribeAudio(
  audioUri: string,
  apiKey: string = process.env.EXPO_PUBLIC_OPENAI_API_KEY || ''
): Promise<TranscriptionResult> {
  if (!apiKey) {
    throw new Error('OpenAI API key is required for transcription');
  }

  const transcriber = new WhisperTranscriber(apiKey);
  try {
    return await transcriber.transcribe(audioUri);
  } catch (err: any) {
    const formatted = err?.message?.replace(/^Audio transcription failed \((.*?)\): /, '$1 - ') ?? err?.message;
    throw new Error(`Whisper transcription failed: ${formatted}`);
  }
}
