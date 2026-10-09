/**
 * Study Day (CONTEXT.md): the learner's local calendar day, starting at 04:00 local time
 * rather than midnight, so late-night and early-morning recitations belong to the same day.
 *
 * This pure module is the single owner of the Study Day rule. Due dates, the daily habit
 * streak and the daily recitation quota all ask it; no other module computes local days
 * or parses Study Day strings itself.
 *
 * Dates are always built from local components (year, month, day). A bare `YYYY-MM-DD`
 * string is never handed to `new Date()`, which would read it as UTC midnight (the evening
 * before, west of Greenwich).
 */

/** Local hour at which a new Study Day begins. A constant, not a user setting. */
export const STUDY_DAY_ROLLOVER_HOUR = 4;

/** A Study Day as a calendar-date string: `YYYY-MM-DD`. */
export type StudyDay = string;

const STUDY_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface DayParts {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

const pad = (value: number, width: number) => String(value).padStart(width, '0');

const formatParts = ({ year, month, day }: DayParts): StudyDay =>
  `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;

/**
 * Local noon of a calendar date. `Date` normalises overflowing days (e.g. Oct 32 → Nov 1),
 * and noon is never inside a DST gap, so whole-day arithmetic stays exact.
 */
const localNoon = (year: number, month: number, day: number): Date =>
  new Date(year, month - 1, day, 12, 0, 0, 0);

const partsOfLocalDate = (date: Date): DayParts => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1,
  day: date.getDate(),
});

function parseParts(value: unknown): DayParts | null {
  if (typeof value !== 'string') return null;
  const match = STUDY_DAY_PATTERN.exec(value);
  if (!match) return null;
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  // Reject impossible dates such as 2026-02-30 by round-tripping through the calendar.
  const roundTrip = partsOfLocalDate(localNoon(parts.year, parts.month, parts.day));
  return formatParts(roundTrip) === value ? parts : null;
}

function requireParts(day: StudyDay): DayParts {
  const parts = parseParts(day);
  if (!parts) {
    throw new RangeError(`Not a Study Day (expected YYYY-MM-DD): ${String(day)}`);
  }
  return parts;
}

const isValidInstant = (instant: Date): boolean =>
  instant instanceof Date && !Number.isNaN(instant.getTime());

/** The Study Day an instant belongs to: its local date, or the previous one before 04:00. */
export function toStudyDay(instant: Date): StudyDay {
  if (!isValidInstant(instant)) {
    throw new RangeError('Cannot map an invalid instant to a Study Day');
  }
  const { year, month, day } = partsOfLocalDate(instant);
  const beforeRollover = instant.getHours() < STUDY_DAY_ROLLOVER_HOUR;
  return formatParts(partsOfLocalDate(localNoon(year, month, beforeRollover ? day - 1 : day)));
}

/** Whether a value is a well-formed Study Day string (`YYYY-MM-DD`, a real calendar date). */
export function isStudyDay(value: unknown): value is StudyDay {
  return parseParts(value) !== null;
}

/**
 * Reads a stored due date as a Study Day. Accepts a Study Day string, a legacy ISO
 * timestamp (read as the Study Day it falls in, no migration needed) or a `Date`.
 * Returns null when the value is missing or unreadable.
 */
export function readStudyDay(stored: string | Date | null | undefined): StudyDay | null {
  if (stored === null || stored === undefined || stored === '') return null;
  if (stored instanceof Date) {
    return isValidInstant(stored) ? toStudyDay(stored) : null;
  }
  if (isStudyDay(stored)) return stored;
  if (STUDY_DAY_PATTERN.test(stored)) return null; // shaped like a day but not a real one
  const legacyInstant = new Date(stored);
  return isValidInstant(legacyInstant) ? toStudyDay(legacyInstant) : null;
}

/** Orders two Study Days: negative if `a` is earlier, 0 if equal, positive if later. */
export function compareStudyDays(a: StudyDay, b: StudyDay): number {
  return Math.sign(studyDaysBetween(b, a));
}

/** The Study Day `n` Study Days after `day` (negative `n` goes back). */
export function addStudyDays(day: StudyDay, n: number): StudyDay {
  if (!Number.isInteger(n)) {
    throw new RangeError(`Can only add whole Study Days, got ${n}`);
  }
  const { year, month, day: dayOfMonth } = requireParts(day);
  return formatParts(partsOfLocalDate(localNoon(year, month, dayOfMonth + n)));
}

/**
 * Number of Study Days from `from` to `to` (positive when `to` is later). Each side is an
 * instant or a Study Day; instants are first mapped to the Study Day they fall in.
 */
export function studyDaysBetween(from: Date | StudyDay, to: Date | StudyDay): number {
  const a = requireParts(typeof from === 'string' ? from : toStudyDay(from));
  const b = requireParts(typeof to === 'string' ? to : toStudyDay(to));
  const diffMs =
    localNoon(b.year, b.month, b.day).getTime() - localNoon(a.year, a.month, a.day).getTime();
  // Math.round absorbs 23- and 25-hour days in zones with DST.
  return Math.round(diffMs / MS_PER_DAY);
}
