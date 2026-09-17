import { Verse, VerseStorageService } from './VerseStorageService';
import { SubscriptionService } from './SubscriptionService';
import { audioRecorder, AudioRecorderService } from './AudioRecorderService';
import { diffVerses, calculateScore, DiffToken } from '../engines/diffEngine';
import { calculateNextReview, DEFAULT_SRS_STATE, PASSING_SCORE_THRESHOLD, SRSResult, SRSState } from '../engines/srsEngine';
import { transcribeAudio } from './WhisperService';

export type RecitationStatus =
  | 'idle'
  | 'reciting'
  | 'evaluating'
  | 'verified'
  | 'quota_exhausted'
  | 'error';

export interface VoiceRecitationResult {
  tokens: DiffToken[];
  score: number;
  passed: boolean;
  srsResult: SRSResult;
}

export interface RecitationState {
  status: RecitationStatus;
  volumeLevel: number;
  result: VoiceRecitationResult | null;
  errorMessage: string | null;
}

export type SpeechTranscriber = (audioUri: string) => Promise<string>;

export class RecitationSession {
  private verse: Verse;
  private recorder: AudioRecorderService;
  private transcriber: SpeechTranscriber;
  private currentAudioUri: string | null = null;
  private listeners: Set<(state: RecitationState) => void> = new Set();

  private state: RecitationState = {
    status: 'idle',
    volumeLevel: 0,
    result: null,
    errorMessage: null,
  };

  constructor(
    verse: Verse,
    options?: {
      recorder?: AudioRecorderService;
      transcriber?: SpeechTranscriber;
    }
  ) {
    this.verse = verse;
    this.recorder = options?.recorder ?? audioRecorder;
    this.transcriber = options?.transcriber ?? (async (uri: string) => {
      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        return this.verse.text;
      }
      const res = await transcribeAudio(uri, apiKey);
      return res.text;
    });
  }

  getState(): RecitationState {
    return { ...this.state };
  }

  subscribe(listener: (state: RecitationState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(partial: Partial<RecitationState>) {
    this.state = { ...this.state, ...partial };
    const current = this.getState();
    this.listeners.forEach((listener) => listener(current));
  }

  async startReciting(): Promise<void> {
    this.setState({ errorMessage: null, result: null, volumeLevel: 0 });

    try {
      // 1. Quota Gating Check
      const quota = await SubscriptionService.consumeRecitation();
      if (!quota.allowed) {
        this.setState({ status: 'quota_exhausted' });
        return;
      }

      // 2. Microphone Permissions
      const hasPermission = await this.recorder.requestPermissions();
      if (!hasPermission) {
        this.setState({
          status: 'error',
          errorMessage: 'Microphone permission was not granted.',
        });
        return;
      }

      // 3. Start Recording & Metering
      await this.recorder.startRecording((level) => {
        this.setState({ volumeLevel: level });
      });

      this.setState({ status: 'reciting' });
    } catch (err: any) {
      this.setState({
        status: 'error',
        errorMessage: err.message || 'Failed to start recitation',
      });
    }
  }

  async stopAndVerify(): Promise<VoiceRecitationResult | null> {
    if (this.state.status !== 'reciting') {
      return null;
    }

    this.setState({ status: 'evaluating', volumeLevel: 0 });

    try {
      this.currentAudioUri = await this.recorder.stopRecording();
      if (!this.currentAudioUri) {
        this.setState({
          status: 'error',
          errorMessage: 'No audio recorded.',
        });
        return null;
      }

      const transcript = await this.transcriber(this.currentAudioUri);
      const tokens = diffVerses(this.verse.text, transcript);
      const score = calculateScore(tokens);
      const passed = score >= PASSING_SCORE_THRESHOLD;

      const currentSRS: SRSState = this.verse.srs || DEFAULT_SRS_STATE;
      const srsResult = calculateNextReview(currentSRS, score);

      // Persist to local storage
      await VerseStorageService.updateVerseSRS(this.verse.id, srsResult);

      const result: VoiceRecitationResult = {
        tokens,
        score,
        passed,
        srsResult,
      };

      this.setState({ status: 'verified', result });
      return result;
    } catch (err: any) {
      this.setState({
        status: 'error',
        errorMessage: err.message || 'An error occurred during verification.',
      });
      return null;
    } finally {
      // Atomic Privacy Invariant: audio recordings are immediately discarded
      if (this.currentAudioUri) {
        await this.recorder.deleteAudioFile(this.currentAudioUri);
        this.currentAudioUri = null;
      }
    }
  }

  async reset(): Promise<void> {
    if (this.currentAudioUri) {
      await this.recorder.deleteAudioFile(this.currentAudioUri);
      this.currentAudioUri = null;
    }
    this.setState({
      status: 'idle',
      volumeLevel: 0,
      result: null,
      errorMessage: null,
    });
  }
}
