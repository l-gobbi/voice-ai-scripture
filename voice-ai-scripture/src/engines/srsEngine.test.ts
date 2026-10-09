import { SM2_QUALITY, calculateNextReview, isVerseDue, SRSState } from './srsEngine';

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
    const result = calculateNextReview(state, 'clean', baseDate);

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
      const result = calculateNextReview(seasoned, 'clean', baseDate);

      expect(result.passed).toBe(true);
      expect(result.intervalDays).toBe(38); // round(15 * 2.5), computed with the ease before the review
      expect(result.streak).toBe(4);
      expect(result.easeFactor).toBe(2.6);
    });

    it('a slip is quality 4: the interval grows just as far and ease is unchanged', () => {
      const result = calculateNextReview(seasoned, 'slip', baseDate);

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
      const first = calculateNextReview(lapsed, 'slip', baseDate);
      const second = calculateNextReview(first, 'slip', baseDate);
      const third = calculateNextReview(second, 'slip', baseDate);

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
