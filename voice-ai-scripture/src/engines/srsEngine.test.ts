import { calculateNextReview, isVerseDue, SRSState } from './srsEngine';

describe('srsEngine', () => {
  // Local components keep the Study Day (04:00 local rollover) independent of the machine's time zone.
  const baseDate = new Date(2026, 0, 1, 12, 0);

  const initialState: SRSState = {
    intervalDays: 0,
    streak: 0,
    easeFactor: 2.5,
  };

  it('schedules for 1 Study Day later on first successful attempt', () => {
    const result = calculateNextReview(initialState, 95, baseDate);

    expect(result.intervalDays).toBe(1);
    expect(result.streak).toBe(1);
    expect(result.nextReviewDate).toBe('2026-01-02');
  });

  it('schedules for 6 Study Days later on second consecutive successful attempt', () => {
    const firstState: SRSState = {
      intervalDays: 1,
      streak: 1,
      easeFactor: 2.5,
    };
    const result = calculateNextReview(firstState, 90, baseDate);

    expect(result.intervalDays).toBe(6);
    expect(result.streak).toBe(2);
    expect(result.nextReviewDate).toBe('2026-01-07');
  });

  it('multiplies interval by easeFactor on subsequent successful attempts', () => {
    const state: SRSState = {
      intervalDays: 6,
      streak: 2,
      easeFactor: 2.5,
    };
    const result = calculateNextReview(state, 100, baseDate);

    expect(result.intervalDays).toBe(15); // round(6 * 2.5) = 15
    expect(result.streak).toBe(3);
    expect(result.nextReviewDate).toBe('2026-01-16');
  });

  it('resets interval and streak on failure (< 75% accuracy)', () => {
    const seasonedState: SRSState = {
      intervalDays: 15,
      streak: 3,
      easeFactor: 2.5,
    };
    const result = calculateNextReview(seasonedState, 50, baseDate);

    expect(result.intervalDays).toBe(1);
    expect(result.streak).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.nextReviewDate).toBe('2026-01-02');
  });

  it('preserves multi-day streak and schedules reinforcement for tomorrow on assisted review (75% score)', () => {
    const seasonedState: SRSState = {
      intervalDays: 15,
      streak: 5,
      easeFactor: 2.5,
    };
    const result = calculateNextReview(seasonedState, 75, baseDate);

    expect(result.intervalDays).toBe(1);
    expect(result.streak).toBe(5); // Preserved, not wiped to 0
    expect(result.passed).toBe(true);
    expect(result.nextReviewDate).toBe('2026-01-02');
  });

  it('counts the interval from the Study Day of the review, which starts at 04:00 local', () => {
    const lateEvening = calculateNextReview(initialState, 100, new Date(2026, 0, 1, 23, 0));
    const smallHours = calculateNextReview(initialState, 100, new Date(2026, 0, 2, 1, 0));
    const morning = calculateNextReview(initialState, 100, new Date(2026, 0, 2, 4, 0));

    expect(lateEvening.nextReviewDate).toBe('2026-01-02');
    expect(smallHours.nextReviewDate).toBe('2026-01-02');
    expect(morning.nextReviewDate).toBe('2026-01-03');
  });

  it('exposes streak matching CONTEXT.md ubiquitous language', () => {
    const result = calculateNextReview(initialState, 90, baseDate);
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
