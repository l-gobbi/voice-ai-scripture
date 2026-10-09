import {
  STUDY_DAY_ROLLOVER_HOUR,
  addStudyDays,
  compareStudyDays,
  isStudyDay,
  readStudyDay,
  studyDaysBetween,
  toStudyDay,
} from './studyDay';

// All instants are built from local components (month is 0-based), so these tests
// hold in any machine time zone. The rollover is 04:00 *local*.
const at = (month: number, day: number, hour: number, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute);

describe('Study Day (Ticket 71)', () => {
  it('rolls over at 04:00 local time', () => {
    expect(STUDY_DAY_ROLLOVER_HOUR).toBe(4);
  });

  describe('toStudyDay', () => {
    it('maps an instant at or after 04:00 to its own calendar date', () => {
      expect(toStudyDay(at(10, 9, 4, 0))).toBe('2026-10-09');
      expect(toStudyDay(at(10, 9, 12, 0))).toBe('2026-10-09');
      expect(toStudyDay(at(10, 9, 23, 59))).toBe('2026-10-09');
    });

    it('maps an instant before 04:00 to the previous Study Day', () => {
      expect(toStudyDay(at(10, 9, 0, 0))).toBe('2026-10-08');
      expect(toStudyDay(at(10, 9, 0, 30))).toBe('2026-10-08');
      expect(toStudyDay(at(10, 9, 3, 59))).toBe('2026-10-08');
    });

    it('puts 23:30 and the following 00:30 on the same Study Day', () => {
      expect(toStudyDay(at(10, 8, 23, 30))).toBe(toStudyDay(at(10, 9, 0, 30)));
    });

    it('crosses month and year boundaries before the rollover', () => {
      expect(toStudyDay(at(11, 1, 2, 0))).toBe('2026-10-31');
      expect(toStudyDay(new Date(2027, 0, 1, 1, 0))).toBe('2026-12-31');
      expect(toStudyDay(new Date(2028, 2, 1, 3, 0))).toBe('2028-02-29');
    });

    it('rejects an invalid instant', () => {
      expect(() => toStudyDay(new Date('not a date'))).toThrow(RangeError);
    });
  });

  describe('isStudyDay', () => {
    it('accepts calendar-date strings and rejects everything else', () => {
      expect(isStudyDay('2026-10-09')).toBe(true);
      expect(isStudyDay('2026-02-30')).toBe(false);
      expect(isStudyDay('2026-10-09T12:00:00.000Z')).toBe(false);
      expect(isStudyDay('')).toBe(false);
      expect(isStudyDay(undefined)).toBe(false);
    });
  });

  describe('readStudyDay', () => {
    it('reads a stored Study Day as itself, never as a UTC instant', () => {
      // new Date('2026-10-09') would be UTC midnight, i.e. the evening of Oct 8 west of Greenwich.
      expect(readStudyDay('2026-10-09')).toBe('2026-10-09');
    });

    it('reads a legacy ISO timestamp as the Study Day it falls in', () => {
      expect(readStudyDay(at(10, 9, 21, 0).toISOString())).toBe('2026-10-09');
      expect(readStudyDay(at(10, 10, 2, 0).toISOString())).toBe('2026-10-09');
    });

    it('reads a Date as the Study Day it falls in', () => {
      expect(readStudyDay(at(10, 10, 3, 0))).toBe('2026-10-09');
    });

    it('returns null for a missing or unreadable value', () => {
      expect(readStudyDay(undefined)).toBeNull();
      expect(readStudyDay(null)).toBeNull();
      expect(readStudyDay('')).toBeNull();
      expect(readStudyDay('soon')).toBeNull();
      expect(readStudyDay(new Date('not a date'))).toBeNull();
    });
  });

  describe('compareStudyDays', () => {
    it('orders Study Days chronologically', () => {
      expect(compareStudyDays('2026-10-08', '2026-10-09')).toBeLessThan(0);
      expect(compareStudyDays('2026-10-09', '2026-10-09')).toBe(0);
      expect(compareStudyDays('2026-11-01', '2026-10-31')).toBeGreaterThan(0);
    });
  });

  describe('addStudyDays', () => {
    it('adds and subtracts whole Study Days across month and year ends', () => {
      expect(addStudyDays('2026-10-08', 1)).toBe('2026-10-09');
      expect(addStudyDays('2026-10-31', 1)).toBe('2026-11-01');
      expect(addStudyDays('2026-12-31', 6)).toBe('2027-01-06');
      expect(addStudyDays('2026-10-01', -1)).toBe('2026-09-30');
      expect(addStudyDays('2026-10-09', 0)).toBe('2026-10-09');
      expect(addStudyDays('2028-02-28', 1)).toBe('2028-02-29');
    });

    it('rejects a value that is not a Study Day', () => {
      expect(() => addStudyDays('2026-10-09T12:00:00.000Z', 1)).toThrow(RangeError);
    });
  });

  describe('studyDaysBetween', () => {
    it('counts Study Days between two Study Days', () => {
      expect(studyDaysBetween('2026-10-08', '2026-10-09')).toBe(1);
      expect(studyDaysBetween('2026-10-09', '2026-10-09')).toBe(0);
      expect(studyDaysBetween('2026-10-09', '2026-10-06')).toBe(-3);
      expect(studyDaysBetween('2026-12-30', '2027-01-02')).toBe(3);
    });

    it('counts Study Days between two instants, not 24-hour periods', () => {
      // 23:00 to 05:00 the next morning is 6 hours but one Study Day.
      expect(studyDaysBetween(at(10, 8, 23, 0), at(10, 9, 5, 0))).toBe(1);
      // 23:30 to 00:30 is the same Study Day.
      expect(studyDaysBetween(at(10, 8, 23, 30), at(10, 9, 0, 30))).toBe(0);
      // 05:00 to 23:00 two days later is 66 hours but two Study Days.
      expect(studyDaysBetween(at(10, 8, 5, 0), at(10, 10, 23, 0))).toBe(2);
    });

    it('mixes an instant and a Study Day', () => {
      expect(studyDaysBetween(at(10, 9, 1, 0), '2026-10-09')).toBe(1);
    });
  });
});
