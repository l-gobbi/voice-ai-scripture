import {
  AttemptKind,
  Recognizer,
  SandboxAttempt,
  Verse,
  VerseEngine,
  verseEngine,
  SRSResult,
  currentSrsResult,
} from './VerseEngine';
import { SubscriptionService, subscriptionService } from './SubscriptionService';
import {
  generateClozeTokens,
  revealWord,
  hideWord,
  ClozeToken,
} from '../engines/clozeEngine';
import {
  evaluateRecitation,
  isRecalled,
  DiffToken,
  RecitationOutcome,
} from '../engines/recitationEvaluator';
import { canonicalPositionsByWord, countComparableWords } from '../engines/diffEngine';
import { TranscriptionError, TranscriptionErrorCode } from './SpeechTranscriber';
import {
  SpeechSynthesizer,
  getDefaultSpeechSynthesizer,
} from './SpeechSynthesizer';
import { scriptureCatalog } from './ScriptureCatalog';
import {
  VoiceInput,
  SimulatedVoiceAdapter,
  NativeStreamVoiceAdapter,
  CloudAudioVoiceAdapter,
  createDefaultVoiceInput,
} from './VoiceInput';
import {
  VoiceActivityDetector,
  VADConfig,
  VADState,
} from '../engines/VoiceActivityDetector';

export {
  SpeechSynthesizer,
  ClozeToken,
  DiffToken,
  RecitationOutcome,
  VoiceInput,
  VoiceActivityDetector,
  VADConfig,
  VADState,
};

/**
 * Dynamic utterance ceiling (in seconds) to avoid runaway recordings and Whisper hallucinations.
 * Minimum: 30 seconds.
 * Maximum: 300 seconds (5 minutes) for full chapters.
 * Scales based on word count (~1.5s per word + 15s buffer).
 */
export function calculateMaxRecitationDurationSeconds(verseText: string): number {
  if (!verseText || typeof verseText !== 'string') {
    return 30;
  }
  const words = verseText.trim().split(/\s+/).filter(Boolean).length;
  const scaledSeconds = Math.round(words * 1.5) + 15;
  return Math.min(300, Math.max(30, scaledSeconds));
}

export function inferVerseLanguage(verse: { translation?: string; reference: string; text?: string }): 'en' | 'pt' {
  return scriptureCatalog.detectLanguage(verse);
}

export function formatAcousticPrompt(verse: { translation?: string; reference: string; text?: string }): string {
  const language = inferVerseLanguage(verse);
  const translation = verse.translation || scriptureCatalog.getDefaultTranslation(language);
  return language === 'pt'
    ? `Bíblia Sagrada. Tradução: ${translation}. Referência: ${verse.reference}.`
    : `Holy Bible. Translation: ${translation}. Reference: ${verse.reference}.`;
}

export type RecitationStatus =
  | 'idle'
  | 'reciting'
  | 'verifying'
  | 'verified'
  | 'quota_exhausted'
  | 'rate_limited'
  | 'error';

export type RecitationLevel = 1 | 2 | 3;

export interface VoiceRecitationResult {
  tokens: DiffToken[];
  /** Word-level F1 score, 0–100: secondary detail for display. The outcome is the grade. */
  score: number;
  /** The Error Budget grade: `clean`, `slip` or `forgotten`. */
  outcome: RecitationOutcome;
  /** Unaided errors: missed or peeked words (once each), plus added words beyond two. */
  errorCount: number;
  /** Errors the verse may contain and still count as recalled. */
  errorBudget: number;
  /** Recalled: the outcome is `clean` or `slip`. */
  passed: boolean;
  srsResult: SRSResult;
  rawTranscript?: string;
  /**
   * Official Review or Practice Attempt, as the Verse Engine classified it. Sandbox attempts
   * are practice and are not recorded.
   */
  kind: AttemptKind;
  /** Made during accepted Same-Day Relearning (ticket 78), after the day's Official Review. */
  isRelearning: boolean;
}

/** Relearning Blind Recitations offered after a forgotten Official Review (ticket 78). */
export const RELEARNING_LOOPS = 2;

/**
 * Same-Day Relearning (ticket 78): after an Official Review graded `forgotten`, the learner is
 * offered Cloze Practice, then Blind Recitation again. Each relearning Blind Recitation uses one
 * loop. Relearning ends when the learner recalls the verse or no loops remain; a forgotten one
 * with loops left offers again. Its attempts are Practice Attempts, so the schedule stays.
 */
export interface RelearningState {
  /** The offer is waiting for the learner to accept or decline it. */
  offered: boolean;
  /** Relearning Blind Recitations left today. */
  loopsRemaining: number;
  /** The learner accepted: the next Blind Recitation uses a loop. */
  active: boolean;
}

/** Said after every Transcription Error, in the verse's language (ticket 74). */
const NOT_GRADED_NOTICE: Record<'en' | 'pt', string> = {
  en: 'Nothing was graded and no recitation was used.',
  pt: 'Nada foi avaliado e nenhuma recitação foi usada.',
};

/** Which recognizer produced the transcript, when the voice input is one of the app's adapters. */
function recognizerOf(voiceInput: VoiceInput): Recognizer | undefined {
  if (voiceInput instanceof NativeStreamVoiceAdapter) return 'native';
  if (voiceInput instanceof CloudAudioVoiceAdapter) return 'cloud';
  if (voiceInput instanceof SimulatedVoiceAdapter) return 'simulated';
  return undefined;
}

export interface RecitationState {
  level: RecitationLevel;
  status: RecitationStatus;
  volumeLevel: number;
  vadProgress: number;
  vadState?: VADState;
  vadThreshold?: number;
  clozeTokens: ClozeToken[];
  isTextRevealed: boolean;
  /**
   * Canonical word positions (as the diff counts words, in order) revealed with the Word Peek
   * Lifeline during the current attempt. Each counts as one error against the Error Budget.
   */
  peekedWordPositions: number[];
  currentResult: VoiceRecitationResult | null;
  officialResult: VoiceRecitationResult | null;
  result: VoiceRecitationResult | null;
  rawTranscript?: string | null;
  errorMessage: string | null;
  errorDetails?: string | null;
  /**
   * Set when the last attempt ended in a Transcription Error: the app failed to hear the
   * learner, so nothing was graded and any quota unit was refunded (ticket 74).
   */
  transcriptionErrorCode: TranscriptionErrorCode | null;
  /**
   * In sandbox mode, the last graded Blind Recitation (ticket 79). Nothing is recorded in the
   * sandbox, so it is kept for a possible save, which hands it to the Verse Engine as a Practice
   * Attempt. A later Blind Recitation replaces it; Echo Mode, Cloze Practice, a Transcription
   * Error or a level change leave it in place. Always null outside the sandbox.
   */
  sandboxAttempt: SandboxAttempt | null;
  /** The Same-Day Relearning offer or drill in progress; null when there is none. */
  relearning: RelearningState | null;
  rateLimitCooldownSeconds?: number;
}

export interface RecitationSessionOptions {
  voiceInput?: VoiceInput;
  verseEngine?: VerseEngine;
  subscriptionService?: SubscriptionService;
  synthesizer?: SpeechSynthesizer;
  initialLevel?: RecitationLevel;
  autoVocalizeOnLevel1?: boolean;
  isSandbox?: boolean;
  /** Skips the recitation quota. It never decides scheduling: the Verse Engine does. */
  isUnmetered?: boolean;
  vadConfig?: VADConfig;
  /** The clock for Study Days and timing (defaults to the system time). */
  now?: () => Date;
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
  private vadConfig?: VADConfig;
  private vad: VoiceActivityDetector | null = null;
  private utteranceCeilingTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(state: RecitationState) => void> = new Set();
  private peekTimers: Map<number, NodeJS.Timeout> = new Map();
  private now: () => Date;
  /** Canonical word positions of each Cloze token (a hyphenated token holds several). */
  private canonicalPositionsByClozeIndex: number[][];
  private recitationStartedAt: Date | null = null;
  /** When the current attempt consumed a quota unit; null when it is unmetered. */
  private quotaConsumedAt: Date | null = null;

  private state: RecitationState;

  constructor(verse: Verse, options?: RecitationSessionOptions) {
    this.verse = verse;
    this.verseEngine = options?.verseEngine ?? verseEngine;
    this.subscriptionService = options?.subscriptionService ?? subscriptionService;
    this.synthesizer = options?.synthesizer ?? getDefaultSpeechSynthesizer();
    this.autoVocalizeOnLevel1 = options?.autoVocalizeOnLevel1 ?? true;
    this.isSandbox = options?.isSandbox ?? false;
    this.isUnmetered = options?.isUnmetered ?? false;
    this.vadConfig = options?.vadConfig;
    this.voiceInput = options?.voiceInput ?? createDefaultVoiceInput();
    this.now = options?.now ?? (() => new Date());
    this.canonicalPositionsByClozeIndex = canonicalPositionsByWord(verse.text);

    const initialLevel = options?.initialLevel ?? (this.isSandbox ? 1 : 3);
    const clozeTokens = this.getClozeTokensForLevel(initialLevel);

    this.state = {
      level: initialLevel,
      status: 'idle',
      volumeLevel: 0,
      vadProgress: 0,
      vadState: 'idle',
      vadThreshold: 0.58,
      clozeTokens,
      isTextRevealed: false,
      peekedWordPositions: [],
      currentResult: null,
      officialResult: null,
      result: null,
      rawTranscript: null,
      errorMessage: null,
      errorDetails: null,
      transcriptionErrorCode: null,
      sandboxAttempt: null,
      relearning: null,
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

  private clearUtteranceCeilingTimer(): void {
    if (this.utteranceCeilingTimer) {
      clearTimeout(this.utteranceCeilingTimer);
      this.utteranceCeilingTimer = null;
    }
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
      peekedWordPositions: [],
      currentResult: null,
      result: null,
      errorMessage: null,
      transcriptionErrorCode: null,
      relearning: this.relearningAfterMovingOn(),
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

  /** Starts a new attempt on the same level: fresh Cloze tokens and no Word Peeks. */
  practiceAgain(): void {
    this.clearPeekTimers();
    const clozeTokens = this.getClozeTokensForLevel(this.state.level);

    this.setState({
      status: 'idle',
      volumeLevel: 0,
      clozeTokens,
      isTextRevealed: false,
      peekedWordPositions: [],
      currentResult: null,
      result: null,
      rawTranscript: null,
      errorMessage: null,
      transcriptionErrorCode: null,
      relearning: this.relearningAfterMovingOn(),
    });
  }

  /** Accepts the Same-Day Relearning offer: Cloze Practice first, then Blind Recitation. */
  acceptRelearning(): void {
    const relearning = this.state.relearning;
    if (!relearning?.offered) return;

    this.setState({ relearning: { offered: false, loopsRemaining: relearning.loopsRemaining, active: true } });
    this.setLevel(2);
  }

  /** Declines Same-Day Relearning. The verse is still due tomorrow. */
  declineRelearning(): void {
    if (this.state.relearning) {
      this.setState({ relearning: null });
    }
  }

  /**
   * An offer belongs to the result that made it: moving on without answering it (Practice
   * Again, a level change or a reset) withdraws it. Accepted relearning carries on.
   */
  private relearningAfterMovingOn(): RelearningState | null {
    return this.state.relearning?.active ? this.state.relearning : null;
  }

  /** The Same-Day Relearning state after a graded attempt. */
  private relearningAfter(level: RecitationLevel, kind: AttemptKind, outcome: RecitationOutcome): RelearningState | null {
    if (kind === 'official' && outcome === 'forgotten') {
      return { offered: true, loopsRemaining: RELEARNING_LOOPS, active: false };
    }
    const relearning = this.state.relearning;
    if (!relearning?.active) return null;
    // Echo Mode and Cloze Practice prepare the relearning Blind Recitation; they use no loop.
    if (level !== 3) return relearning;

    const loopsRemaining = relearning.loopsRemaining - 1;
    return isRecalled(outcome) || loopsRemaining <= 0
      ? null
      : { offered: true, loopsRemaining, active: false };
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
      // A Word Peek reveals every canonical word of the token, and each counts once.
      const peeked = new Set([
        ...this.state.peekedWordPositions,
        ...(this.canonicalPositionsByClozeIndex[index] ?? []),
      ]);
      this.setState({ clozeTokens, peekedWordPositions: [...peeked].sort((a, b) => a - b) });

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

  /**
   * Pre-warms the underlying audio capture driver in warm standby (<15ms instant onset).
   * Verifies microphone permissions and prepares recording buffers in advance so that
   * recitation begins without audio hardware initialization delay or opening-syllable clipping.
   */
  async warmUp(): Promise<void> {
    try {
      const hasPermission = await this.voiceInput.requestPermissions();
      if (hasPermission && typeof this.voiceInput.warmUp === 'function') {
        await this.voiceInput.warmUp();
      }
    } catch (e) {
      console.warn('[RecitationSession] warmUp error:', e);
    }
  }

  /** `unmetered` skips the recitation quota for this attempt; it does not affect scheduling. */
  async startReciting(options?: { unmetered?: boolean }): Promise<void> {
    await this.synthesizer.stop().catch(() => {});

    this.setState({
      errorMessage: null,
      errorDetails: null,
      transcriptionErrorCode: null,
      currentResult: null,
      result: null,
      volumeLevel: 0,
      vadProgress: 0,
    });
    this.quotaConsumedAt = null;

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

      // 2. Quota & Rate Limit Gating Check
      const isUnmetered = this.isSandbox || this.isUnmetered || (options?.unmetered ?? (this.state.level !== 3));
      if (!isUnmetered) {
        const consumedAt = this.now();
        const rateLimit = await this.subscriptionService.consumeRecitation(consumedAt);
        if (!rateLimit.allowed) {
          const isRateLimited = rateLimit.reason === 'rate_limited';
          const isPt = inferVerseLanguage(this.verse) === 'pt';
          this.setState({
            status: isRateLimited ? 'rate_limited' : 'quota_exhausted',
            rateLimitCooldownSeconds: rateLimit.retryAfterSeconds,
            errorMessage: isRateLimited
              ? isPt
                ? 'Respirando fundo... Aguarde alguns segundos antes da próxima recitação.'
                : 'Taking a quick breath... Please wait a few seconds before your next recitation.'
              : 'Recitation quota exhausted.',
          });
          return;
        }

        this.quotaConsumedAt = consumedAt;

        if (rateLimit.useNativeFallback) {
          this.voiceInput = createDefaultVoiceInput({ engine: 'native' });
        }
      }

      // 3. Initialize and Start VoiceActivityDetector before audio capture begins
      this.vad?.cancel();
      this.vad = new VoiceActivityDetector(
        {
          onProgress: (ratio) => {
            this.setState({
              vadProgress: ratio,
              vadState: this.vad?.getState() ?? 'thinking_grace',
              vadThreshold: this.vad?.getThreshold() ?? 0.58,
            });
          },
          onSilenceTimeout: () => {
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
              console.log('[RecitationSession] VAD silence timeout reached (3.5s). Auto-completing recitation.');
            }
            this.stopAndVerify().catch((err) => {
              console.error('[RecitationSession] stopAndVerify error on silence timeout:', err);
            });
          },
          onInitialTimeout: () => {
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
              console.log('[RecitationSession] VAD initial silence timeout (10s no speech).');
            }
            this.clearUtteranceCeilingTimer();
            this.voiceInput.cancel().catch(() => {});
            const isPt = inferVerseLanguage(this.verse) === 'pt';
            this.setState({
              status: 'idle',
              volumeLevel: 0,
              vadProgress: 0,
              vadState: 'idle',
              vadThreshold: 0.58,
              errorMessage: isPt
                ? 'Nenhuma fala detectada. Toque no microfone para tentar novamente.'
                : 'No speech detected. Tap the mic to try again.',
            });
          },
        },
        this.vadConfig
      );

      // 4. Start VoiceInput Streaming / Audio Capture
      const language = inferVerseLanguage(this.verse);
      const prompt = formatAcousticPrompt(this.verse);

      await this.voiceInput.start({
        language,
        prompt,
        onMeter: (level) => {
          this.vad?.feedMeter(level);
          this.setState({
            volumeLevel: level,
            vadState: this.vad?.getState() ?? 'idle',
            vadThreshold: this.vad?.getThreshold() ?? 0.58,
          });
        },
      });

      this.vad.start();
      this.recitationStartedAt = this.now();

      // Utterance ceiling backstop: auto-complete runaway recordings and prevent Whisper hallucinations
      this.clearUtteranceCeilingTimer();
      const maxDurationSeconds = calculateMaxRecitationDurationSeconds(this.verse.text);
      this.utteranceCeilingTimer = setTimeout(() => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log(`[RecitationSession] Utterance ceiling (${maxDurationSeconds}s) reached. Auto-completing recitation.`);
        }
        if (this.state.status === 'reciting') {
          this.stopAndVerify().catch((err) => {
            console.error('[RecitationSession] Error auto-completing at utterance ceiling:', err);
          });
        }
      }, maxDurationSeconds * 1000);
      this.utteranceCeilingTimer?.unref?.();

      this.setState({
        status: 'reciting',
        vadProgress: 0,
        vadState: this.vad?.getState() ?? 'calibrating',
        vadThreshold: this.vad?.getThreshold() ?? 0.58,
      });
    } catch (err: any) {
      this.clearUtteranceCeilingTimer();
      console.error('[RecitationSession] startReciting error:', err);
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

    this.clearUtteranceCeilingTimer();
    this.vad?.cancel();
    this.setState({
      status: 'verifying',
      volumeLevel: 0,
      vadProgress: 0,
      vadState: 'idle',
    });

    const level = this.state.level;
    // Word Peeks exist only in Blind Recitation; level changes clear them.
    const peekedWordPositions = level === 3 ? [...this.state.peekedWordPositions] : [];

    try {
      const voiceResult = await this.voiceInput.stop();
      const transcript = voiceResult.transcript ?? '';
      // Nothing to compare, from any engine, means the app did not hear the learner.
      if (countComparableWords(transcript) === 0) {
        throw new TranscriptionError('unintelligible', 'The transcript has no words to compare.');
      }
      const now = this.now();

      // Pure Recitation Evaluator Pipeline (grading only; the Verse Engine schedules)
      const evaluation = evaluateRecitation({
        expectedText: this.verse.text,
        transcribedText: transcript,
        reference: scriptureCatalog.resolveReference(this.verse.reference),
        language: inferVerseLanguage(this.verse),
        peekedWordPositions,
      });
      const passed = isRecalled(evaluation.outcome);
      const attempt: SandboxAttempt = {
        level,
        evaluation,
        peekedWordPositions,
        clozeRevealCount: this.clozeRevealCount(level),
        recognizer: recognizerOf(this.voiceInput),
        durationMs: this.durationUntil(now),
        now,
      };

      let kind: AttemptKind;
      let srsResult: SRSResult;
      let sandboxAttempt = this.state.sandboxAttempt;
      if (this.isSandbox) {
        // The sandbox verse is not stored yet, so nothing is recorded. Its last Blind
        // Recitation is kept, so that saving the verse can log it as practice (ticket 79).
        kind = 'practice';
        srsResult = currentSrsResult(this.verse.srs, passed, now);
        if (level === 3) {
          sandboxAttempt = attempt;
        }
      } else {
        const recorded = await this.verseEngine.recordAttempt({ verseId: this.verse.id, ...attempt });
        kind = recorded.kind;
        srsResult = recorded.srsResult;
      }

      const result: VoiceRecitationResult = {
        tokens: evaluation.tokens,
        score: evaluation.rawScore,
        outcome: evaluation.outcome,
        errorCount: evaluation.errorCount,
        errorBudget: evaluation.errorBudget,
        passed,
        srsResult,
        rawTranscript: transcript,
        kind,
        isRelearning: this.state.relearning?.active ?? false,
      };

      this.setState({
        status: 'verified',
        currentResult: result,
        result,
        officialResult: kind === 'official' ? result : this.state.officialResult,
        sandboxAttempt,
        relearning: this.relearningAfter(level, kind, evaluation.outcome),
        rawTranscript: transcript,
      });
      return result;
    } catch (err: any) {
      if (err instanceof TranscriptionError) {
        await this.endInTranscriptionError(err, level, peekedWordPositions);
        return null;
      }

      console.error('[RecitationSession] Verification error:', err);
      this.setState({
        status: 'error',
        errorMessage: err?.message || 'An error occurred during verification.',
        errorDetails: err?.message || null,
        rawTranscript: null,
      });
      return null;
    }
  }

  /**
   * The app failed to hear the learner (ticket 74). The attempt is never evaluated or
   * scheduled: its quota unit, if it used one, is refunded, it is logged with its error code
   * and no outcome, and the learner is asked calmly to try again. Neither a failed refund nor
   * a failed log write changes what the learner is told.
   */
  private async endInTranscriptionError(
    error: TranscriptionError,
    level: RecitationLevel,
    peekedWordPositions: number[]
  ): Promise<void> {
    const now = this.now();

    const consumedAt = this.quotaConsumedAt;
    this.quotaConsumedAt = null;
    if (consumedAt) {
      // The unit belongs to the Study Day it was consumed on.
      await this.subscriptionService
        .refundRecitation(consumedAt)
        .catch((err) => console.warn('[RecitationSession] Quota refund failed:', err));
    }

    // The sandbox verse is not stored yet, so nothing is recorded.
    if (!this.isSandbox) {
      await this.verseEngine
        .recordTranscriptionError({
          verseId: this.verse.id,
          level,
          code: error.code,
          peekedWordPositions,
          clozeRevealCount: this.clozeRevealCount(level),
          recognizer: recognizerOf(this.voiceInput),
          durationMs: this.durationUntil(now),
          now,
        })
        .catch((err) => console.warn('[RecitationSession] Review Log write failed:', err));
    }

    const language = inferVerseLanguage(this.verse);
    this.setState({
      status: 'error',
      transcriptionErrorCode: error.code,
      errorMessage: `${error.getUserFacingMessage(language)} ${NOT_GRADED_NOTICE[language]}`,
      errorDetails: error.message,
      rawTranscript: null,
    });
  }

  /** Words revealed during Cloze Practice, for the Review Log. */
  private clozeRevealCount(level: RecitationLevel): number | undefined {
    return level === 2 ? this.state.clozeTokens.filter((token) => token.isRevealed).length : undefined;
  }

  private durationUntil(now: Date): number | undefined {
    return this.recitationStartedAt
      ? Math.max(0, now.getTime() - this.recitationStartedAt.getTime())
      : undefined;
  }

  async cancelRecitation(): Promise<void> {
    this.clearUtteranceCeilingTimer();
    this.vad?.cancel();
    await this.voiceInput.cancel().catch(() => {});
    this.setState({
      status: 'idle',
      volumeLevel: 0,
      vadProgress: 0,
      vadState: 'idle',
      vadThreshold: 0.58,
      errorMessage: null,
      errorDetails: null,
      transcriptionErrorCode: null,
    });
  }

  async reset(): Promise<void> {
    this.clearUtteranceCeilingTimer();
    this.vad?.cancel();
    this.clearPeekTimers();
    await this.synthesizer.stop().catch(() => {});
    await this.voiceInput.cancel().catch(() => {});

    // A reset ends the attempt, so its Word Peeks go with it.
    this.setState({
      status: 'idle',
      volumeLevel: 0,
      vadProgress: 0,
      vadState: 'idle',
      vadThreshold: 0.58,
      clozeTokens: this.getClozeTokensForLevel(this.state.level),
      peekedWordPositions: [],
      currentResult: null,
      result: null,
      rawTranscript: null,
      errorMessage: null,
      transcriptionErrorCode: null,
      relearning: this.relearningAfterMovingOn(),
    });
  }

  async dispose(): Promise<void> {
    this.clearUtteranceCeilingTimer();
    this.vad?.cancel();
    this.clearPeekTimers();
    await this.synthesizer.stop().catch(() => {});
    await this.voiceInput.cancel().catch(() => {});
    this.listeners.clear();
  }
}
