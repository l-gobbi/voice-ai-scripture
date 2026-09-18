import { Verse, VerseEngine, verseEngine, SRSResult } from './VerseEngine';
import { SubscriptionService } from './SubscriptionService';
import { audioRecorder, AudioRecorderService } from './AudioRecorderService';
import { diffVerses, calculateScore, DiffToken } from '../engines/diffEngine';
import {
  SpeechTranscriber,
  TranscriptionOptions,
  TranscriptionError,
  createDefaultTranscriber,
} from './SpeechTranscriber';

export { SpeechTranscriber };

export type RecitationStatus =
  | 'idle'
  | 'reciting'
  | 'verifying'
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

export type AnyTranscriber =
  | SpeechTranscriber
  | ((audioUri: string, options?: TranscriptionOptions) => Promise<string>);

export class RecitationSession {
  private verse: Verse;
  private recorder: AudioRecorderService;
  private transcriber: AnyTranscriber;
  private verseEngine: VerseEngine;
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
      transcriber?: AnyTranscriber;
      verseEngine?: VerseEngine;
    }
  ) {
    this.verse = verse;
    this.recorder = options?.recorder ?? audioRecorder;
    this.verseEngine = options?.verseEngine ?? verseEngine;
    this.transcriber = options?.transcriber ?? createDefaultTranscriber();
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
      // 1. Microphone Permissions
      const hasPermission = await this.recorder.requestPermissions();
      if (!hasPermission) {
        this.setState({
          status: 'error',
          errorMessage: 'Microphone permission was not granted.',
        });
        return;
      }

      // 2. Quota Gating Check
      const quota = await SubscriptionService.consumeRecitation();
      if (!quota.allowed) {
        this.setState({ status: 'quota_exhausted' });
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

    this.setState({ status: 'verifying', volumeLevel: 0 });

    try {
      this.currentAudioUri = await this.recorder.stopRecording();
      if (!this.currentAudioUri) {
        this.setState({
          status: 'error',
          errorMessage: 'No audio recorded.',
        });
        return null;
      }

      const prompt = `${this.verse.reference}: ${this.verse.text}`;
      let transcript: string;
      if (typeof this.transcriber === 'function') {
        transcript = await this.transcriber(this.currentAudioUri, { prompt });
      } else {
        const res = await this.transcriber.transcribe(this.currentAudioUri, { prompt });
        transcript = res.text;
      }

      const tokens = diffVerses(this.verse.text, transcript);
      const score = calculateScore(tokens);

      // Coordinate review recording and SM-2 progression via VerseEngine
      const srsResult = await this.verseEngine.recordReview(this.verse.id, score);
      const passed = srsResult.passed;

      const result: VoiceRecitationResult = {
        tokens,
        score,
        passed,
        srsResult,
      };

      // Atomic Privacy Invariant: discard audio file before publishing verified state
      if (this.currentAudioUri) {
        await this.recorder.deleteAudioFile(this.currentAudioUri);
        this.currentAudioUri = null;
      }

      this.setState({ status: 'verified', result });
      return result;
    } catch (err: any) {
      let userMessage = err?.message || 'An error occurred during verification.';
      if (err instanceof TranscriptionError) {
        switch (err.code) {
          case 'network_error':
            userMessage = 'Network connection failed. Please check your internet connection.';
            break;
          case 'rate_limited':
            userMessage = 'Transcription service is temporarily busy. Please try again shortly.';
            break;
          case 'unauthorized':
            userMessage = 'Transcription authentication failed. Please check your API key.';
            break;
          case 'unintelligible':
            userMessage = 'Could not transcribe audio. Please speak clearly and try again.';
            break;
          case 'unknown':
          default:
            userMessage = 'An unexpected transcription error occurred.';
            break;
        }
      }

      this.setState({
        status: 'error',
        errorMessage: userMessage,
      });
      return null;
    } finally {
      // Atomic Privacy Invariant: audio recordings are always discarded
      if (this.currentAudioUri) {
        await this.recorder.deleteAudioFile(this.currentAudioUri);
        this.currentAudioUri = null;
      }
    }
  }

  async reset(): Promise<void> {
    if (this.state.status === 'reciting') {
      const uri = await this.recorder.stopRecording();
      if (uri) {
        await this.recorder.deleteAudioFile(uri);
      }
    } else if (this.currentAudioUri) {
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

