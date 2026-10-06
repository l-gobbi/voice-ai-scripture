export interface VADConfig {
  noiseFloorDurationMs?: number; // default: 300ms
  initialSilenceTimeoutMs?: number; // default: 10000ms (10s)
  minSpeechDurationMs?: number; // default: 1000ms (1.0s)
  thinkingGracePeriodMs?: number; // default: 3500ms (3.5s)
  delayedArcThresholdMs?: number; // default: 1500ms (1.5s)
  volumeThresholdDelta?: number; // default: 0.10
  minSpeechVolume?: number; // default: 0.22
}

export type VADState =
  | 'idle'
  | 'calibrating'
  | 'listening_initial'
  | 'speaking'
  | 'thinking_grace'
  | 'auto_completed';

export interface VADCallbacks {
  onSpeechStart?: () => void;
  onProgress?: (ratio: number) => void;
  onSilenceTimeout?: () => void;
  onInitialTimeout?: () => void;
}

export class VoiceActivityDetector {
  private config: Required<VADConfig>;
  private callbacks: VADCallbacks;
  private state: VADState = 'idle';
  private noiseFloorSamples: number[] = [];
  private noiseFloor: number = 0.08;
  private calibrationTimer: NodeJS.Timeout | null = null;
  private initialSilenceTimer: NodeJS.Timeout | null = null;
  private progressInterval: NodeJS.Timeout | null = null;

  private cumulativeSpeechMs: number = 0;
  private speechStartTimestamp: number = 0;
  private silenceStartTimestamp: number = 0;
  private progress: number = 0;

  private consecutiveAudibleFrames: number = 0;

  constructor(callbacks?: VADCallbacks, config?: VADConfig) {
    this.callbacks = callbacks ?? {};
    this.config = {
      noiseFloorDurationMs: config?.noiseFloorDurationMs ?? 300,
      initialSilenceTimeoutMs: config?.initialSilenceTimeoutMs ?? 10000,
      minSpeechDurationMs: config?.minSpeechDurationMs ?? 1000,
      thinkingGracePeriodMs: config?.thinkingGracePeriodMs ?? 3500,
      delayedArcThresholdMs: config?.delayedArcThresholdMs ?? 1500,
      volumeThresholdDelta: config?.volumeThresholdDelta ?? 0.10,
      minSpeechVolume: config?.minSpeechVolume ?? 0.22,
    };
  }

  getState(): VADState {
    return this.state;
  }

  getNoiseFloor(): number {
    return this.noiseFloor;
  }

  getProgress(): number {
    return this.progress;
  }

  start(): void {
    this.cancel();
    this.state = 'calibrating';
    this.noiseFloorSamples = [];
    this.cumulativeSpeechMs = 0;
    this.speechStartTimestamp = 0;
    this.consecutiveAudibleFrames = 0;
    this.progress = 0;

    this.calibrationTimer = setTimeout(() => {
      this.finishCalibration();
    }, this.config.noiseFloorDurationMs);
    this.calibrationTimer?.unref?.();
  }

  private finishCalibration(): void {
    if (this.state !== 'calibrating') return;
    if (this.noiseFloorSamples.length > 0) {
      const sorted = [...this.noiseFloorSamples].sort((a, b) => a - b);
      // Discard top 25% if at least 4 samples exist to eliminate any onset spike
      const count = sorted.length >= 4 ? Math.ceil(sorted.length * 0.75) : sorted.length;
      const baselineSamples = sorted.slice(0, count);
      const avg = baselineSamples.reduce((a, b) => a + b, 0) / baselineSamples.length;
      this.noiseFloor = Math.min(0.70, Math.max(0.04, avg));
    } else {
      this.noiseFloor = 0.08;
    }

    this.state = 'listening_initial';
    this.armInitialSilenceTimer();
  }

  private armInitialSilenceTimer(): void {
    this.clearInitialSilenceTimer();
    this.initialSilenceTimer = setTimeout(() => {
      if (this.state === 'listening_initial') {
        this.cancel();
        this.callbacks.onInitialTimeout?.();
      }
    }, this.config.initialSilenceTimeoutMs);
    this.initialSilenceTimer?.unref?.();
  }

  getThreshold(): number {
    const margin = Math.max(
      this.config.volumeThresholdDelta,
      Math.min(0.18, (1 - this.noiseFloor) * 0.25)
    );
    return Math.min(0.92, Math.max(this.config.minSpeechVolume, this.noiseFloor + margin));
  }

  private isAudible(volume: number): boolean {
    return volume >= this.getThreshold();
  }

  feedMeter(volume: number): void {
    if (this.state === 'idle' || this.state === 'auto_completed') {
      return;
    }

    const now = Date.now();

    if (this.state === 'calibrating') {
      if (volume >= 0.75) {
        // Immediate loud speech (>= 75% in quadratic curve ≈ >= -10 dBFS) detected during calibration window!
        this.clearTimers();
        const quiet = this.noiseFloorSamples.filter((v) => v < 0.65);
        this.noiseFloor = quiet.length > 0
          ? Math.min(0.70, Math.max(0.04, quiet.reduce((a, b) => a + b, 0) / quiet.length))
          : 0.15;
        this.state = 'speaking';
        this.speechStartTimestamp = now;
        this.callbacks.onSpeechStart?.();
        return;
      }

      this.noiseFloorSamples.push(volume);
      return;
    }

    if (this.state === 'listening_initial') {
      if (!this.isAudible(volume)) {
        this.noiseFloor = this.noiseFloor * 0.90 + volume * 0.10;
      }
    }

    const audible = this.isAudible(volume);

    if (audible) {
      if (this.state === 'thinking_grace') {
        const strongSpeechDelta = Math.max(0.15, (1 - this.noiseFloor) * 0.35);
        const isStrongSpeech = volume >= Math.min(0.95, this.noiseFloor + strongSpeechDelta);
        if (!isStrongSpeech && this.consecutiveAudibleFrames < 3) {
          this.consecutiveAudibleFrames++;
          return;
        }
      }
      this.consecutiveAudibleFrames = 0;
      this.clearInitialSilenceTimer();
      this.clearProgressInterval();
      this.progress = 0;
      this.callbacks.onProgress?.(0);

      if (this.state === 'listening_initial' || this.state === 'thinking_grace') {
        const wasThinkingGrace = this.state === 'thinking_grace';
        this.state = 'speaking';
        this.speechStartTimestamp = now;
        console.log('[DEBUG-vad] State -> speaking:', { volume, threshold: this.getThreshold(), wasThinkingGrace });
        if (!wasThinkingGrace && this.cumulativeSpeechMs === 0) {
          this.callbacks.onSpeechStart?.();
        }
      }
    } else {
      this.consecutiveAudibleFrames = 0;
      // Inaudible / Silence: adapt background noise floor
      this.noiseFloor = this.noiseFloor * 0.95 + volume * 0.05;

      if (this.state === 'speaking') {
        const speechDuration = this.speechStartTimestamp > 0 ? now - this.speechStartTimestamp : 0;
        this.cumulativeSpeechMs += speechDuration;
        this.speechStartTimestamp = 0;

        if (this.cumulativeSpeechMs >= this.config.minSpeechDurationMs) {
          this.state = 'thinking_grace';
          this.silenceStartTimestamp = now;
          console.log('[DEBUG-vad] Speaking -> thinking_grace! Cumulative speech:', this.cumulativeSpeechMs, 'ms. Silence countdown armed.');
          this.startProgressInterval();
        } else {
          // Insufficient cumulative speech (< 1.0s) -> return to listening_initial
          this.state = 'listening_initial';
          this.armInitialSilenceTimer();
        }
      }
    }
  }

  private startProgressInterval(): void {
    this.clearProgressInterval();
    const intervalMs = 50;

    this.progressInterval = setInterval(() => {
      if (this.state !== 'thinking_grace') {
        this.clearProgressInterval();
        return;
      }

      const elapsed = Date.now() - this.silenceStartTimestamp;

      if (elapsed >= this.config.thinkingGracePeriodMs) {
        this.progress = 1;
        this.callbacks.onProgress?.(1);
        this.clearProgressInterval();
        this.state = 'auto_completed';
        console.log('[DEBUG-vad] Thinking grace complete (3.5s). Triggering onSilenceTimeout!');
        this.callbacks.onSilenceTimeout?.();
        return;
      }

      if (elapsed <= this.config.delayedArcThresholdMs) {
        this.progress = 0;
        this.callbacks.onProgress?.(0);
      } else {
        const activeDuration = this.config.thinkingGracePeriodMs - this.config.delayedArcThresholdMs;
        const currentActive = elapsed - this.config.delayedArcThresholdMs;
        this.progress = Math.min(1, Math.max(0, currentActive / activeDuration));
        this.callbacks.onProgress?.(this.progress);
      }
    }, intervalMs);
    this.progressInterval?.unref?.();
  }

  cancel(): void {
    this.state = 'idle';
    this.progress = 0;
    this.cumulativeSpeechMs = 0;
    this.speechStartTimestamp = 0;
    this.silenceStartTimestamp = 0;
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.calibrationTimer) {
      clearTimeout(this.calibrationTimer);
      this.calibrationTimer = null;
    }
    this.clearInitialSilenceTimer();
    this.clearProgressInterval();
  }

  private clearInitialSilenceTimer(): void {
    if (this.initialSilenceTimer) {
      clearTimeout(this.initialSilenceTimer);
      this.initialSilenceTimer = null;
    }
  }

  private clearProgressInterval(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
}
