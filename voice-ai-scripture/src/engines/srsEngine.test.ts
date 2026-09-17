import { calculateNextReview, isVerseDue, SRSState } from './srsEngine';

describe('srsEngine', () => {
  const baseDate = new Date('2026-01-01T12:00:00Z');

  const initialState: SRSState = {
    intervalDays: 0,
    streak: 0,
    easeFactor: 2.5,
  };

  it('schedules for 1 day later on first successful attempt', () => {
    const result = calculateNextReview(initialState, 95, baseDate);

    expect(result.intervalDays).toBe(1);
    expect(result.streak).toBe(1);
    expect(result.nextReviewDate.toISOString()).toBe('2026-01-02T12:00:00.000Z');
  });

  it('schedules for 6 days later on second consecutive successful attempt', () => {
    const firstState: SRSState = {
      intervalDays: 1,
      streak: 1,
      easeFactor: 2.5,
    };
    const result = calculateNextReview(firstState, 90, baseDate);

    expect(result.intervalDays).toBe(6);
    expect(result.streak).toBe(2);
    expect(result.nextReviewDate.toISOString()).toBe('2026-01-07T12:00:00.000Z');
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
    expect(result.nextReviewDate.toISOString()).toBe('2026-01-16T12:00:00.000Z');
  });

  it('resets interval and streak on failure (< 80% accuracy)', () => {
    const seasonedState: SRSState = {
      intervalDays: 15,
      streak: 3,
      easeFactor: 2.5,
    };
    const result = calculateNextReview(seasonedState, 50, baseDate);

    expect(result.intervalDays).toBe(1);
    expect(result.streak).toBe(0);
    expect(result.nextReviewDate.toISOString()).toBe('2026-01-02T12:00:00.000Z');
  });

  it('exposes streak matching CONTEXT.md ubiquitous language', () => {
    const result = calculateNextReview(initialState, 90, baseDate);
    expect(result.streak).toBe(1);
  });

  describe('isVerseDue', () => {
    it('returns true if verse has never been reviewed (null/undefined)', () => {
      // @ts-ignore
      expect(isVerseDue(undefined, baseDate)).toBe(true);
      // @ts-ignore
      expect(isVerseDue(null, baseDate)).toBe(true);
    });

    it('returns true if nextReviewDate is in the past or right now', () => {
      const past = new Date('2026-01-01T11:59:59Z');
      // @ts-ignore
      expect(isVerseDue(past, baseDate)).toBe(true);
      // @ts-ignore
      expect(isVerseDue(baseDate.toISOString(), baseDate)).toBe(true);
    });

    it('returns false if nextReviewDate is in the future', () => {
      const future = new Date('2026-01-02T12:00:00Z');
      // @ts-ignore
      expect(isVerseDue(future, baseDate)).toBe(false);
    });
  });
});
