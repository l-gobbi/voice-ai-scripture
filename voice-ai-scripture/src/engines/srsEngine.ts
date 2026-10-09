import { StudyDay, addStudyDays, compareStudyDays, readStudyDay, toStudyDay } from './studyDay';
import { isRecalled, RecitationOutcome } from './recitationEvaluator';

export type { RecitationOutcome };

export interface SRSState {
  intervalDays: number;
  streak: number;
  repetitions?: number;
  easeFactor: number;
}

export interface SRSResult extends SRSState {
  /** The due Study Day: the Study Day of the review plus `intervalDays` Study Days. */
  nextReviewDate: StudyDay;
  /** Whether the verse was recalled: the outcome was not `forgotten`. */
  passed: boolean;
}

/** SM-2 quality given for each Recitation Outcome of an Official Review (ADR 0017). */
export const SM2_QUALITY: Readonly<Record<RecitationOutcome, number>> = {
  clean: 5,
  slip: 4,
  forgotten: 2,
};

export const MIN_EASE_FACTOR = 1.3;

/** No interval is longer than this, so every verse comes back at least once a year (ADR 0017). */
export const MAX_INTERVAL_DAYS = 365;

/** Intervals of at least this many days are fuzzed, and a fuzzed interval never falls below it. */
export const MIN_FUZZED_INTERVAL_DAYS = 3;

/** Fuzz moves an interval by up to this fraction either way: a factor in [0.95, 1.05]. */
export const INTERVAL_FUZZ = 0.05;

/** A source of random numbers in [0, 1), like `Math.random`. */
export type RandomSource = () => number;

export const DEFAULT_SRS_STATE: SRSState = {
  intervalDays: 0,
  streak: 0,
  repetitions: 0,
  easeFactor: 2.5,
};

/**
 * Schedules the next review with SuperMemo-2, given the outcome of an Official Review.
 * Intervals are counted in Study Days from the Study Day the review falls in.
 *
 * - The outcome maps to an SM-2 quality: `clean` 5, `slip` 4, `forgotten` 2.
 * - Ease follows Woźniak's formula for every quality (+0.10, 0, −0.32), never below 1.3.
 * - A recall (`clean` or `slip`) schedules 1, then 6, then the previous interval × the ease
 *   before this review, rounded.
 * - `forgotten` resets the repetitions to 0 and the interval to 1 Study Day.
 * - Fuzz: an interval of 3 days or more is multiplied by a factor in [0.95, 1.05] drawn from
 *   `random` (0 gives 0.95, 0.5 gives exactly 1), rounded, and never brought below 3 days, so
 *   verses learned together stop falling due together. Intervals of 1–2 days are never fuzzed.
 * - Cap: after fuzz, the interval is capped at 365 days.
 *
 * The returned interval is the final one. It schedules the due Study Day and, once stored, it
 * is the interval the next recall multiplies (as Anki stores its fuzzed interval).
 *
 * @param currentState Current repetition, interval and ease state
 * @param outcome The Recitation Outcome of the Official Review (Error Budget)
 * @param now Instant of the review (defaults to current time); only its Study Day matters
 * @param random Random source for the fuzz (defaults to `Math.random`)
 */
export function calculateNextReview(
  currentState: SRSState = DEFAULT_SRS_STATE,
  outcome: RecitationOutcome,
  now: Date = new Date(),
  random: RandomSource = Math.random
): SRSResult {
  const quality = SM2_QUALITY[outcome];
  const recalled = isRecalled(outcome);

  let streak = currentState.streak !== undefined ? currentState.streak : (currentState.repetitions ?? 0);
  let intervalDays: number;

  if (!recalled) {
    streak = 0;
    intervalDays = 1;
  } else {
    if (streak === 0) {
      intervalDays = 1;
    } else if (streak === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(currentState.intervalDays * currentState.easeFactor);
    }
    streak += 1;
  }

  const easeFactor = Math.max(
    MIN_EASE_FACTOR,
    currentState.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  intervalDays = Math.min(MAX_INTERVAL_DAYS, fuzzInterval(intervalDays, random));
  const nextReviewDate = addStudyDays(toStudyDay(now), intervalDays);

  return {
    streak,
    repetitions: streak,
    intervalDays,
    easeFactor: Math.round(easeFactor * 100) / 100,
    nextReviewDate,
    passed: recalled,
  };
}

/** Spreads an interval of 3 days or more by up to ±5%. Shorter intervals are left alone. */
function fuzzInterval(intervalDays: number, random: RandomSource): number {
  if (intervalDays < MIN_FUZZED_INTERVAL_DAYS) return intervalDays;
  const factor = 1 + INTERVAL_FUZZ * (2 * random() - 1);
  return Math.max(MIN_FUZZED_INTERVAL_DAYS, Math.round(intervalDays * factor));
}

/**
 * Determines whether a verse is a Due Verse: its due Study Day is today's Study Day or earlier.
 * A verse with no (or an unreadable) due date is due. Accepts a stored Study Day string,
 * a legacy ISO timestamp (read as the Study Day it falls in) or a Date.
 */
export function isVerseDue(nextReviewDate?: Date | string | null, now: Date = new Date()): boolean {
  const dueStudyDay = readStudyDay(nextReviewDate);
  if (!dueStudyDay) return true;
  return compareStudyDays(dueStudyDay, toStudyDay(now)) <= 0;
}
