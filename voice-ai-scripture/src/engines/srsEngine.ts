export interface SRSState {
  intervalDays: number;
  streak: number;
  repetitions?: number;
  easeFactor: number;
}

export interface SRSResult extends SRSState {
  nextReviewDate: Date;
}

export const PASSING_SCORE_THRESHOLD = 80;

export const DEFAULT_SRS_STATE: SRSState = {
  intervalDays: 0,
  streak: 0,
  repetitions: 0,
  easeFactor: 2.5,
};

/**
 * Calculates the next review date based on a simplified SuperMemo-2 (SM-2) algorithm.
 * @param currentState Current repetition and interval state
 * @param score Accuracy score from 0 to 100
 * @param now Reference date (defaults to current time)
 */
export function calculateNextReview(
  currentState: SRSState = DEFAULT_SRS_STATE,
  score: number,
  now: Date = new Date()
): SRSResult {
  const isPassing = score >= PASSING_SCORE_THRESHOLD;

  let streak = currentState.streak !== undefined ? currentState.streak : (currentState.repetitions ?? 0);
  let intervalDays = currentState.intervalDays;
  let easeFactor = currentState.easeFactor;

  if (!isPassing) {
    // Reset streak upon failure
    streak = 0;
    intervalDays = 1;
  } else {
    // Successful repetition
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

  const nextReviewDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    streak,
    repetitions: streak,
    intervalDays,
    easeFactor: Math.round(easeFactor * 100) / 100,
    nextReviewDate,
  };
}

/**
 * Determines whether a verse is currently due for review.
 * A verse is due if it has never been reviewed or its scheduled date is past or equal to now.
 */
export function isVerseDue(nextReviewDate?: Date | string | null, now: Date = new Date()): boolean {
  if (!nextReviewDate) return true;
  const reviewTime = typeof nextReviewDate === 'string'
    ? new Date(nextReviewDate).getTime()
    : nextReviewDate.getTime();
  return reviewTime <= now.getTime();
}
