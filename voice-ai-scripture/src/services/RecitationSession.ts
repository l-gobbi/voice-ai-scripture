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
import { normalizeReference } from './ReferenceNormalizer';

import { PT_TRANSLATIONS } from './BibleProvider';

export { SpeechTranscriber };

const EN_TRANSLATIONS = new Set(['WEB', 'KJV', 'ESV', 'NIV', 'NKJV', 'NASB', 'NLT', 'MSG']);

export function inferVerseLanguage(verse: { translation?: string; reference: string }): 'en' | 'pt' {
  if (verse.translation) {
    const upperTrans = verse.translation.toUpperCase().trim();
    if (PT_TRANSLATIONS.has(upperTrans)) return 'pt';
    if (EN_TRANSLATIONS.has(upperTrans)) return 'en';
  }

  const normalized = normalizeReference(verse.reference);
  if (normalized?.language === 'pt') return 'pt';

  return 'en';
}

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

class DefaultSubscriptionProxy extends SubscriptionService {
  override consumeRecitation() {
    return SubscriptionService.consumeRecitation();
  }
  override isSubscribed() {
    return SubscriptionService.isSubscribed();
  }
  override getRemainingFreeRecitations() {
    return SubscriptionService.getRemainingFreeRecitations();
  }
  override subscribePremium() {
    return SubscriptionService.subscribePremium();
  }
  override cancelSubscription() {
    return SubscriptionService.cancelSubscription();
  }
}

export class RecitationSession {
  private verse: Verse;
  private recorder: AudioRecorderService;
  private transcriber: SpeechTranscriber;
  private verseEngine: VerseEngine;
  private subscriptionService: SubscriptionService;
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
      verseEngine?: VerseEngine;
      subscriptionService?: SubscriptionService;
    }
  ) {
    this.verse = verse;
    this.recorder = options?.recorder ?? audioRecorder;
    this.verseEngine = options?.verseEngine ?? verseEngine;
    this.transcriber = options?.transcriber ?? createDefaultTranscriber();
    this.subscriptionService = options?.subscriptionService ?? new DefaultSubscriptionProxy();
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
      const quota = await this.subscriptionService.consumeRecitation();
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
      const language = inferVerseLanguage(this.verse);

      const res = await this.transcriber.transcribe(this.currentAudioUri, {
        prompt,
        simulatedText: this.verse.text,
        language,
      });
      const transcript = res.text;

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
      const userMessage = err instanceof TranscriptionError
        ? err.getUserFacingMessage()
        : err?.message || 'An error occurred during verification.';

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

