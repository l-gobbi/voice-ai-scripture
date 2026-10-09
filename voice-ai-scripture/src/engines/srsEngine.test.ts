import { MAX_INTERVAL_DAYS, SM2_QUALITY, calculateNextReview, isVerseDue, SRSState } from './srsEngine';

/** A random source whose fuzz factor is exactly 1, for tests about anything but fuzz. */
const noFuzz = () => 0.5;

describe('srsEngine', () => {
  // Local components keep the Study Day (04:00 local rollover) independent of the machine's time zone.
  const baseDate = new Date(2026, 0, 1, 12, 0);

  const initialState: SRSState = {
    intervalDays: 0,
    streak: 0,
    easeFactor: 2.5,
  };

  it('schedules for 1 Study Day later on the first recall', () => {
    const result = calculateNextReview(initialState, 'clean', baseDate);

    expect(result.intervalDays).toBe(1);
    expect(result.streak).toBe(1);
    expect(result.nextReviewDate).toBe('2026-01-02');
  });

  it('schedules for 6 Study Days later on the second consecutive recall', () => {
    const firstState: SRSState = {
      intervalDays: 1,
      streak: 1,
      easeFactor: 2.5,
    };
    const result = calculateNextReview(firstState, 'slip', baseDate);

    expect(result.intervalDays).toBe(6);
    expect(result.streak).toBe(2);
    expect(result.nextReviewDate).toBe('2026-01-07');
  });

  it('multiplies the previous interval by the ease factor on later recalls', () => {
    const state: SRSState = {
      intervalDays: 6,
      streak: 2,
      easeFactor: 2.5,
    };
    const result = calculateNextReview(state, 'clean', baseDate, noFuzz);

    expect(result.intervalDays).toBe(15); // round(6 * 2.5) = 15
    expect(result.streak).toBe(3);
    expect(result.nextReviewDate).toBe('2026-01-16');
  });

  describe('outcome to SM-2 quality (Ticket 73)', () => {
    const seasoned: SRSState = { intervalDays: 15, streak: 3, repetitions: 3, easeFactor: 2.5 };

    it('maps clean to quality 5, slip to quality 4 and forgotten to quality 2', () => {
      expect(SM2_QUALITY).toEqual({ clean: 5, slip: 4, forgotten: 2 });
    });

    it('a clean recall is quality 5: the interval grows and ease rises by 0.10', () => {
      const result = calculateNextReview(seasoned, 'clean', baseDate, noFuzz);

      expect(result.passed).toBe(true);
      expect(result.intervalDays).toBe(38); // round(15 * 2.5), computed with the ease before the review
      expect(result.streak).toBe(4);
      expect(result.easeFactor).toBe(2.6);
    });

    it('a slip is quality 4: the interval grows just as far and ease is unchanged', () => {
      const result = calculateNextReview(seasoned, 'slip', baseDate, noFuzz);

      expect(result.passed).toBe(true);
      expect(result.intervalDays).toBe(38);
      expect(result.streak).toBe(4);
      expect(result.repetitions).toBe(4);
      expect(result.easeFactor).toBe(2.5);
    });

    it('forgotten is quality 2: back to 1 Study Day, repetitions to 0 and ease down by 0.32', () => {
      const result = calculateNextReview(seasoned, 'forgotten', baseDate);

      expect(result.passed).toBe(false);
      expect(result.intervalDays).toBe(1);
      expect(result.streak).toBe(0);
      expect(result.repetitions).toBe(0);
      expect(result.easeFactor).toBe(2.18);
      expect(result.nextReviewDate).toBe('2026-01-02');
    });

    it('a forgotten verse grows more slowly afterwards: 1, 6, then the lowered ease', () => {
      const lapsed = calculateNextReview(seasoned, 'forgotten', baseDate);
      const first = calculateNextReview(lapsed, 'slip', baseDate, noFuzz);
      const second = calculateNextReview(first, 'slip', baseDate, noFuzz);
      const third = calculateNextReview(second, 'slip', baseDate, noFuzz);

      expect([first.intervalDays, second.intervalDays, third.intervalDays]).toEqual([1, 6, 13]); // round(6 * 2.18)
    });

    it('never lowers ease below 1.3', () => {
      const fragile: SRSState = { intervalDays: 1, streak: 0, easeFactor: 1.5 };

      const once = calculateNextReview(fragile, 'forgotten', baseDate);
      const twice = calculateNextReview(once, 'forgotten', baseDate);

      expect(once.easeFactor).toBe(1.3);
      expect(twice.easeFactor).toBe(1.3);
    });

    it('a slip never resets the streak, whatever the interval was', () => {
      const result = calculateNextReview({ intervalDays: 1, streak: 1, easeFactor: 1.3 }, 'slip', baseDate);

      expect(result.streak).toBe(2);
      expect(result.intervalDays).toBe(6);
      expect(result.easeFactor).toBe(1.3);
    });
  });

  describe('interval fuzz and cap (Ticket 76)', () => {
    // The fuzz factor is 0.95 + 0.10 × the random draw: 0 gives ×0.95, 0.5 gives ×1, just under 1 gives ×1.05.
    const JUST_UNDER_ONE = 0.9999999;
    const draw = (value: number) => () => value;
    const mustNotDraw = () => {
      throw new Error('the random source was consulted');
    };
    /** A recalled verse whose next SM-2 interval, before fuzz, is round(intervalDays × 2.5). */
    const recalledFrom = (intervalDays: number): SRSState => ({ intervalDays, streak: 3, easeFactor: 2.5 });

    it('multiplies an interval of 3 days or more by a factor from 0.95 to 1.05, rounded', () => {
      const seasoned = recalledFrom(15); // round(15 × 2.5) = 38 before fuzz

      expect(calculateNextReview(seasoned, 'slip', baseDate, draw(0)).intervalDays).toBe(36); // 38 × 0.95 = 36.1
      expect(calculateNextReview(seasoned, 'slip', baseDate, draw(0.5)).intervalDays).toBe(38);
      expect(calculateNextReview(seasoned, 'slip', baseDate, draw(JUST_UNDER_ONE)).intervalDays).toBe(40); // 38 × 1.05 = 39.9
    });

    it('schedules the due Study Day with the fuzzed interval', () => {
      const result = calculateNextReview(recalledFrom(15), 'clean', baseDate, draw(0));

      expect(result.intervalDays).toBe(36);
      expect(result.nextReviewDate).toBe('2026-02-06'); // 2026-01-01 + 36
    });

    it('leaves ease growth alone: fuzz moves only the interval', () => {
      const low = calculateNextReview(recalledFrom(15), 'clean', baseDate, draw(0));
      const high = calculateNextReview(recalledFrom(15), 'clean', baseDate, draw(JUST_UNDER_ONE));

      expect(low.easeFactor).toBe(2.6);
      expect(high.easeFactor).toBe(2.6);
      expect([low.streak, high.streak]).toEqual([4, 4]);
    });

    it('never brings a fuzzed interval below 3 days', () => {
      const result = calculateNextReview({ intervalDays: 2, streak: 2, easeFactor: 1.5 }, 'slip', baseDate, draw(0));

      expect(result.intervalDays).toBe(3); // round(2 × 1.5) = 3, and 3 × 0.95 = 2.85 rounds back to 3
    });

    it('never fuzzes an interval of 1 or 2 days, so the random source is not consulted', () => {
      const firstRecall = calculateNextReview({ intervalDays: 0, streak: 0, easeFactor: 2.5 }, 'clean', baseDate, mustNotDraw);
      const twoDays = calculateNextReview({ intervalDays: 1, streak: 2, easeFactor: 2.0 }, 'slip', baseDate, mustNotDraw);
      const forgotten = calculateNextReview(recalledFrom(15), 'forgotten', baseDate, mustNotDraw);

      expect(firstRecall.intervalDays).toBe(1);
      expect(twoDays.intervalDays).toBe(2);
      expect(forgotten.intervalDays).toBe(1);
    });

    it('caps the interval at 365 days, after fuzz', () => {
      const longBase = recalledFrom(160); // round(160 × 2.5) = 400 before fuzz

      // Capping first and fuzzing second would give 365 × 0.95 = 347 here.
      expect(calculateNextReview(longBase, 'clean', baseDate, draw(0)).intervalDays).toBe(MAX_INTERVAL_DAYS);
      expect(calculateNextReview(longBase, 'clean', baseDate, draw(0.5)).intervalDays).toBe(MAX_INTERVAL_DAYS);
      expect(calculateNextReview(longBase, 'clean', baseDate, draw(JUST_UNDER_ONE)).intervalDays).toBe(MAX_INTERVAL_DAYS);
      expect(calculateNextReview(longBase, 'clean', baseDate, draw(0.5)).nextReviewDate).toBe('2027-01-01');
    });

    it('caps an interval that fuzz pushes past 365 days, and lets fuzz pull one below it', () => {
      expect(MAX_INTERVAL_DAYS).toBe(365);
      // round(140 × 2.5) = 350, and 350 × 1.05 = 367.5
      expect(calculateNextReview(recalledFrom(140), 'slip', baseDate, draw(JUST_UNDER_ONE)).intervalDays).toBe(365);
      // round(146 × 2.5) = 365, and 365 × 0.95 = 346.75
      expect(calculateNextReview(recalledFrom(146), 'slip', baseDate, draw(0)).intervalDays).toBe(347);
    });

    it('keeps a verse at the 365-day cap on every later recall', () => {
      const capped: SRSState = { intervalDays: MAX_INTERVAL_DAYS, streak: 9, easeFactor: 2.8 };

      expect(calculateNextReview(capped, 'clean', baseDate, draw(0)).intervalDays).toBe(MAX_INTERVAL_DAYS);
      expect(calculateNextReview(capped, 'slip', baseDate, draw(JUST_UNDER_ONE)).intervalDays).toBe(MAX_INTERVAL_DAYS);
    });
  });

  it('counts the interval from the Study Day of the review, which starts at 04:00 local', () => {
    const lateEvening = calculateNextReview(initialState, 'clean', new Date(2026, 0, 1, 23, 0));
    const smallHours = calculateNextReview(initialState, 'clean', new Date(2026, 0, 2, 1, 0));
    const morning = calculateNextReview(initialState, 'clean', new Date(2026, 0, 2, 4, 0));

    expect(lateEvening.nextReviewDate).toBe('2026-01-02');
    expect(smallHours.nextReviewDate).toBe('2026-01-02');
    expect(morning.nextReviewDate).toBe('2026-01-03');
  });

  it('exposes streak matching CONTEXT.md ubiquitous language', () => {
    const result = calculateNextReview(initialState, 'slip', baseDate);
    expect(result.streak).toBe(1);
  });

  describe('isVerseDue', () => {
    it('returns true if verse has never been reviewed (null/undefined)', () => {
      expect(isVerseDue(undefined, baseDate)).toBe(true);
      expect(isVerseDue(null, baseDate)).toBe(true);
    });

    it('returns true if the due Study Day is today or earlier', () => {
      expect(isVerseDue('2025-12-31', baseDate)).toBe(true);
      expect(isVerseDue('2026-01-01', baseDate)).toBe(true);
    });

    it('returns false if the due Study Day is later than today', () => {
      expect(isVerseDue('2026-01-02', baseDate)).toBe(false);
      // 03:59 on Jan 2 is still Study Day Jan 1; Jan 2 starts at 04:00.
      expect(isVerseDue('2026-01-02', new Date(2026, 0, 2, 3, 59))).toBe(false);
      expect(isVerseDue('2026-01-02', new Date(2026, 0, 2, 4, 0))).toBe(true);
    });

    it('reads legacy timestamps and Dates as the Study Day they fall in', () => {
      // Later the same Study Day: due, even though the instant is still in the future.
      expect(isVerseDue(new Date(2026, 0, 1, 23, 0).toISOString(), baseDate)).toBe(true);
      expect(isVerseDue(new Date(2026, 0, 2, 2, 0), baseDate)).toBe(true);
      expect(isVerseDue(new Date(2026, 0, 2, 4, 0).toISOString(), baseDate)).toBe(false);
    });
  });
});
