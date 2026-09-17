export interface TranscriptionResult {
  text: string;
}

/**
 * Sends an audio file to OpenAI Whisper API for speech-to-text transcription.
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

  const formData = new FormData();

  // On Web or React Native, create the file entry
  const filename = audioUri.split('/').pop() || 'recording.m4a';
  const fileType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/m4a';

  formData.append('file', {
    uri: audioUri,
    name: filename,
    type: fileType,
  } as any);

  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper transcription failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    text: data.text || '',
  };
}
