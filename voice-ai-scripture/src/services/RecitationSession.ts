import { Verse, VerseEngine, verseEngine, SRSResult } from './VerseEngine';
import { SubscriptionService, subscriptionService } from './SubscriptionService';
import { audioRecorder, AudioRecorderService } from './AudioRecorderService';
import {
  generateClozeTokens,
  revealWord,
  hideWord,
  ClozeToken,
} from '../engines/clozeEngine';
import {
  evaluateRecitation,
  DiffToken,
} from '../engines/recitationEvaluator';
import {
  SpeechTranscriber,
  TranscriptionError,
  createDefaultTranscriber,
} from './SpeechTranscriber';
import {
  SpeechSynthesizer,
  getDefaultSpeechSynthesizer,
} from './SpeechSynthesizer';
import { scriptureCatalog } from './ScriptureCatalog';
import {
  VoiceInput,
  createDefaultVoiceInput,
  CloudAudioVoiceAdapter,
} from './VoiceInput';

export { SpeechTranscriber, SpeechSynthesizer, ClozeToken, DiffToken, VoiceInput };

export function inferVerseLanguage(verse: { translation?: string; reference: string; text?: string }): 'en' | 'pt' {
  return scriptureCatalog.detectLanguage(verse);
}

export type RecitationStatus =
  | 'idle'
  | 'reciting'
  | 'verifying'
  | 'verified'
  | 'quota_exhausted'
  | 'error';

export type RecitationLevel = 1 | 2 | 3;

export interface VoiceRecitationResult {
  tokens: DiffToken[];
  score: number;
  passed: boolean;
  srsResult: SRSResult;
  rawTranscript?: string;
}

export interface RecitationState {
  level: RecitationLevel;
  status: RecitationStatus;
  volumeLevel: number;
  clozeTokens: ClozeToken[];
  isTextRevealed: boolean;
  assistanceUsed: boolean;
  currentResult: VoiceRecitationResult | null;
  officialResult: VoiceRecitationResult | null;
  result: VoiceRecitationResult | null;
  rawTranscript?: string | null;
  errorMessage: string | null;
  errorDetails?: string | null;
}

export interface RecitationSessionOptions {
  voiceInput?: VoiceInput;
  recorder?: AudioRecorderService;
  transcriber?: SpeechTranscriber;
  verseEngine?: VerseEngine;
  subscriptionService?: SubscriptionService;
  synthesizer?: SpeechSynthesizer;
  initialLevel?: RecitationLevel;
  autoVocalizeOnLevel1?: boolean;
  isSandbox?: boolean;
  isUnmetered?: boolean;
}

export class RecitationSession {
  private verse: Verse;
  private voiceInput: VoiceInput;
  private verseEngine: VerseEngine;
  private subscriptionService: SubscriptionService;
  private synthesizer: SpeechSynthesizer;
  private autoVocalizeOnLevel1: boolean;
  private isSandbox: boolean;
  private isUnmetered: boolean;
  private listeners: Set<(state: RecitationState) => void> = new Set();
  private peekTimers: Map<number, NodeJS.Timeout> = new Map();

  private state: RecitationState;

  constructor(verse: Verse, options?: RecitationSessionOptions) {
    this.verse = verse;
    this.verseEngine = options?.verseEngine ?? verseEngine;
    this.subscriptionService = options?.subscriptionService ?? subscriptionService;
    this.synthesizer = options?.synthesizer ?? getDefaultSpeechSynthesizer();
    this.autoVocalizeOnLevel1 = options?.autoVocalizeOnLevel1 ?? true;
    this.isSandbox = options?.isSandbox ?? false;
    this.isUnmetered = options?.isUnmetered ?? false;

    if (options?.voiceInput) {
      this.voiceInput = options.voiceInput;
    } else if (options?.recorder || options?.transcriber || process.env.NODE_ENV === 'test') {
      this.voiceInput = new CloudAudioVoiceAdapter({
        recorder: options?.recorder ?? audioRecorder,
        transcriber: options?.transcriber ?? createDefaultTranscriber(),
      });
    } else {
      this.voiceInput = createDefaultVoiceInput();
    }

    const initialLevel = options?.initialLevel ?? (this.isSandbox ? 1 : 3);
    const clozeTokens = this.getClozeTokensForLevel(initialLevel);

    this.state = {
      level: initialLevel,
      status: 'idle',
      volumeLevel: 0,
      clozeTokens,
      isTextRevealed: false,
      assistanceUsed: false,
      currentResult: null,
      officialResult: null,
      result: null,
      rawTranscript: null,
      errorMessage: null,
      errorDetails: null,
    };

    if (initialLevel === 1 && this.autoVocalizeOnLevel1) {
      this.vocalize().catch(() => {});
    }
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
    if ('currentResult' in partial && !('result' in partial)) {
      this.state.result = partial.currentResult ?? null;
    } else if ('result' in partial && !('currentResult' in partial)) {
      this.state.currentResult = partial.result ?? null;
    }
    const current = this.getState();
    this.listeners.forEach((listener) => listener(current));
  }

  private clearPeekTimers(): void {
    this.peekTimers.forEach((timer) => clearTimeout(timer));
    this.peekTimers.clear();
  }

  private getClozeTokensForLevel(level: RecitationLevel): ClozeToken[] {
    if (level === 1) return [];
    if (level === 2) return generateClozeTokens(this.verse.text, 'first-letter');
    return generateClozeTokens(this.verse.text, 'blank');
  }

  setLevel(level: RecitationLevel): void {
    if (this.state.level === level) return;

    this.clearPeekTimers();
    this.synthesizer.stop().catch(() => {});

    const clozeTokens = this.getClozeTokensForLevel(level);

    this.setState({
      level,
      status: 'idle',
      volumeLevel: 0,
      clozeTokens,
      isTextRevealed: false,
      assistanceUsed: false,
      currentResult: null,
      result: null,
      errorMessage: null,
    });

    if (level === 1 && this.autoVocalizeOnLevel1) {
      this.vocalize().catch(() => {});
    }
  }

  nextLevel(): void {
    if (this.state.level < 3) {
      this.setLevel((this.state.level + 1) as RecitationLevel);
    }
  }

  practiceAgain(): void {
    this.clearPeekTimers();
    const clozeTokens = this.getClozeTokensForLevel(this.state.level);

    this.setState({
      status: 'idle',
      volumeLevel: 0,
      clozeTokens,
      isTextRevealed: false,
      currentResult: null,
      result: null,
      rawTranscript: null,
      errorMessage: null,
    });
  }

  toggleTextReveal(): void {
    if (this.state.level === 1) {
      this.setState({ isTextRevealed: !this.state.isTextRevealed });
    }
  }

  tapWord(index: number): void {
    if (index < 0 || index >= this.state.clozeTokens.length) return;

    if (this.state.level === 2) {
      const clozeTokens = revealWord(this.state.clozeTokens, index);
      this.setState({ clozeTokens });
    } else if (this.state.level === 3) {
      const clozeTokens = revealWord(this.state.clozeTokens, index);
      this.setState({ clozeTokens, assistanceUsed: true });

      const existingTimer = this.peekTimers.get(index);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        const nextTokens = hideWord(this.state.clozeTokens, index);
        this.peekTimers.delete(index);
        this.setState({ clozeTokens: nextTokens });
      }, 3000);

      this.peekTimers.set(index, timer);
    }
  }

  async vocalize(): Promise<void> {
    const lang = inferVerseLanguage(this.verse);
    await this.synthesizer.speak(this.verse.text, { language: lang });
  }

  async startReciting(options?: { unmetered?: boolean }): Promise<void> {
    await this.synthesizer.stop().catch(() => {});

    this.setState({ errorMessage: null, errorDetails: null, currentResult: null, result: null, volumeLevel: 0 });

    try {
      // 1. Microphone Permissions
      const hasPermission = await this.voiceInput.requestPermissions();
      if (!hasPermission) {
        this.setState({
          status: 'error',
          errorMessage: 'Microphone permission was not granted.',
        });
        return;
      }

      // 2. Quota Gating Check (Levels 1 & 2 are unmetered practice; Level 3 is metered)
      const isUnmetered = this.isSandbox || this.isUnmetered || (options?.unmetered ?? (this.state.level !== 3));
      if (!isUnmetered) {
        const quota = await this.subscriptionService.consumeRecitation();
        if (!quota.allowed) {
          this.setState({ status: 'quota_exhausted' });
          return;
        }
      }

      // 3. Start VoiceInput Streaming / Audio Capture
      const language = inferVerseLanguage(this.verse);
      const prompt = `${this.verse.reference}: ${this.verse.text}`;

      await this.voiceInput.start({
        language,
        prompt,
        onMeter: (level) => {
          this.setState({ volumeLevel: level });
        },
      });

      this.setState({ status: 'reciting' });
    } catch (err: any) {
      this.setState({
        status: 'error',
        errorMessage: err.message || 'Failed to start recitation',
      });
    }
  }

  async stopAndVerify(options?: {
    unmetered?: boolean;
    assistanceUsed?: boolean;
  }): Promise<VoiceRecitationResult | null> {
    if (this.state.status !== 'reciting') {
      return null;
    }

    this.setState({ status: 'verifying', volumeLevel: 0 });

    try {
      const voiceResult = await this.voiceInput.stop();
      const transcript = voiceResult.transcript;

      const isUnmetered = this.isSandbox || this.isUnmetered || (options?.unmetered ?? (this.state.level !== 3));
      const assistanceUsed = options?.assistanceUsed ?? this.state.assistanceUsed;

      // Pure Recitation Evaluator Pipeline
      const evalResult = evaluateRecitation({
        expectedText: this.verse.text,
        transcribedText: transcript,
        assistanceUsed,
        currentSRS: this.verse.srs,
        isUnmetered,
      });

      let srsResult: SRSResult;
      if (isUnmetered) {
        srsResult = evalResult.srsResult;
      } else {
        srsResult = await this.verseEngine.recordReview(this.verse.id, evalResult.finalScore);
      }
      const passed = srsResult.passed;

      const result: VoiceRecitationResult = {
        tokens: evalResult.tokens,
        score: evalResult.finalScore,
        passed,
        srsResult,
        rawTranscript: transcript,
      };

      const officialResult = (!isUnmetered && this.state.level === 3)
        ? result
        : this.state.officialResult;

      this.setState({
        status: 'verified',
        currentResult: result,
        result,
        officialResult,
        rawTranscript: transcript,
      });
      return result;
    } catch (err: any) {
      console.error('[RecitationSession] Verification error:', err);
      const userMessage = err instanceof TranscriptionError
        ? err.getUserFacingMessage()
        : err?.message || 'An error occurred during verification.';

      this.setState({
        status: 'error',
        errorMessage: userMessage,
        errorDetails: err?.message || null,
        rawTranscript: null,
      });
      return null;
    }
  }

  async reset(): Promise<void> {
    this.clearPeekTimers();
    await this.synthesizer.stop().catch(() => {});
    await this.voiceInput.cancel().catch(() => {});

    this.setState({
      status: 'idle',
      volumeLevel: 0,
      currentResult: null,
      result: null,
      rawTranscript: null,
      errorMessage: null,
    });
  }

  async dispose(): Promise<void> {
    this.clearPeekTimers();
    await this.synthesizer.stop().catch(() => {});
    await this.voiceInput.cancel().catch(() => {});
    this.listeners.clear();
  }
}
