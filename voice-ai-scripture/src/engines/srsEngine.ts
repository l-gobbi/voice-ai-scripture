import { StudyDay, addStudyDays, compareStudyDays, readStudyDay, toStudyDay } from './studyDay';

export interface SRSState {
  intervalDays: number;
  streak: number;
  repetitions?: number;
  easeFactor: number;
}

export interface SRSResult extends SRSState {
  /** The due Study Day: the Study Day of the review plus `intervalDays` Study Days. */
  nextReviewDate: StudyDay;
  passed: boolean;
}

export const PASSING_SCORE_THRESHOLD = 80;
export const ASSISTED_SCORE_THRESHOLD = 75;

export const DEFAULT_SRS_STATE: SRSState = {
  intervalDays: 0,
  streak: 0,
  repetitions: 0,
  easeFactor: 2.5,
};

export interface CalculateNextReviewOptions {
  assistanceUsed?: boolean;
}

/**
 * Calculates the next review date based on a simplified SuperMemo-2 (SM-2) algorithm.
 * Intervals are counted in Study Days from the Study Day the review falls in.
 * @param currentState Current repetition and interval state
 * @param score Accuracy score from 0 to 100
 * @param now Instant of the review (defaults to current time); only its Study Day matters
 * @param options Optional flags such as assistanceUsed
 */
export function calculateNextReview(
  currentState: SRSState = DEFAULT_SRS_STATE,
  score: number,
  now: Date = new Date(),
  options?: CalculateNextReviewOptions
): SRSResult {
  const isFullPass = score >= PASSING_SCORE_THRESHOLD;
  const isAssistedPass =
    !isFullPass &&
    (options?.assistanceUsed ? score >= ASSISTED_SCORE_THRESHOLD : score === ASSISTED_SCORE_THRESHOLD);
  const isPassing = isFullPass || isAssistedPass;

  let streak = currentState.streak !== undefined ? currentState.streak : (currentState.repetitions ?? 0);
  let intervalDays = currentState.intervalDays;
  let easeFactor = currentState.easeFactor;

  if (isAssistedPass) {
    // Assisted review: preserves existing streak, schedules reinforcement for tomorrow
    intervalDays = 1;
  } else if (!isPassing) {
    // Reset streak upon genuine failure (< 75%)
    streak = 0;
    intervalDays = 1;
  } else {
    // Successful independent repetition
    if (streak === 0) {
      intervalDays = 1;
    } else if (streak === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    streak += 1;

    // Small ease factor adjustment based on performance
    // Quality maps score 80-100 to scale 3-5
    const quality = score >= 95 ? 5 : score >= 90 ? 4 : 3;
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  }

  const nextReviewDate = addStudyDays(toStudyDay(now), intervalDays);

  return {
    streak,
    repetitions: streak,
    intervalDays,
    easeFactor: Math.round(easeFactor * 100) / 100,
    nextReviewDate,
    passed: isPassing,
  };
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
