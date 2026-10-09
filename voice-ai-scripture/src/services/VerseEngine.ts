import {
  DEFAULT_SRS_STATE,
  RandomSource,
  SM2_QUALITY,
  SRSResult,
  SRSState,
  calculateNextReview,
  isVerseDue,
} from '../engines/srsEngine';
import { DiffToken, countComparableWords } from '../engines/diffEngine';
import { RecitationEvaluation, RecitationOutcome, isRecalled } from '../engines/recitationEvaluator';
import {
  StudyDay,
  addStudyDays,
  compareStudyDays,
  readStudyDay,
  studyDaysBetween,
  toStudyDay,
} from '../engines/studyDay';
import {
  scriptureCatalog,
  SupportedTranslation,
} from './ScriptureCatalog';
import {
  AttemptKind,
  AttemptLevel,
  Recognizer,
  REVIEW_LOG_SCHEMA_VERSION,
  ReviewLog,
  ReviewLogEntry,
  hashCanonicalText,
} from './ReviewLog';
import { TranscriptionErrorCode } from './SpeechTranscriberTypes';

export { SRSResult, AttemptKind, AttemptLevel, Recognizer, ReviewLogEntry, RecitationOutcome };

/**
 * The grading rule behind each logged grade: the Error Budget (ADR 0017). Unaided errors are
 * missed or Word-Peeked words, once each, plus added words beyond two; up to 5% of the verse's
 * words (at least one) is a slip, none is clean, more is forgotten. It replaced
 * `f1-80-peek-cap-75@1` (F1 ≥ 80 passes, a Word Peek caps the score at 75).
 */
export const GRADING_RULE_ID = 'error-budget-5pct@1';
/**
 * The scheduler behind each logged Official Review: the app's SM-2 in Study Days, taking the
 * outcome as quality 5/4/2 with Woźniak's ease formula for every quality (forgotten lowers ease
 * by 0.32), fuzzing intervals of 3 days or more by up to ±5% and capping them at 365 days.
 * It replaced `sm2-app@2` (no fuzz, no cap), which replaced `sm2-app@1`, which left ease
 * alone on a failure.
 */
export const SCHEDULER_ID = 'sm2-app@3';

export type VerseTranslation = SupportedTranslation | 'CUSTOM' | string;

export interface Verse {
  id: string;
  reference: string;
  text: string;
  translation?: VerseTranslation;
  deck?: string;
  lastScore?: number;
  srs?: SRSState & {
    /**
     * The due Study Day (`YYYY-MM-DD`). Verses saved before Study Days may hold a legacy
     * ISO timestamp; read it only through the Study Day module (`readStudyDay`).
     */
    nextReviewDate?: StudyDay | string;
    lastScore?: number;
    /** Study Day of the verse's most recent Official Review: at most one per Study Day. */
    lastOfficialReviewDay?: StudyDay;
  };
}

/** The graded outcome of one recitation, as the recitation evaluator returned it. */
export type AttemptEvaluation = RecitationEvaluation;

export interface RecordAttemptInput {
  verseId: string;
  level: AttemptLevel;
  evaluation: AttemptEvaluation;
  /**
   * Canonical word positions (as the diff counts words) revealed with the Word Peek Lifeline
   * during the attempt; the evaluation already counts them as errors.
   */
  peekedWordPositions?: number[];
  /** Words revealed during Cloze Practice. */
  clozeRevealCount?: number;
  recognizer?: Recognizer;
  durationMs?: number;
  /** Instant of the attempt (defaults to now); its Study Day decides due-ness. */
  now?: Date;
}

/**
 * A recitation that ended in a Transcription Error: the app failed to hear the learner, so
 * there is nothing to grade (ticket 74).
 */
export interface RecordTranscriptionErrorInput {
  verseId: string;
  level: AttemptLevel;
  code: TranscriptionErrorCode;
  /** Words revealed with the Word Peek Lifeline during the attempt, kept as raw data. */
  peekedWordPositions?: number[];
  /** Words revealed during Cloze Practice. */
  clozeRevealCount?: number;
  recognizer?: Recognizer;
  durationMs?: number;
  /** Instant of the attempt (defaults to now). */
  now?: Date;
}

export interface RecordedAttempt {
  kind: AttemptKind;
  /** The verse's SRS state after the attempt: moved by an Official Review, unchanged by practice. */
  srsResult: SRSResult;
  memoryTier: MemoryTier;
  entry: ReviewLogEntry;
}

export interface VerseSummary {
  allVerses: Verse[];
  dueVerses: Verse[];
  dueCount: number;
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  /** Study Day of the most recent activity. */
  lastActiveDate: StudyDay | null;
  completedTodayCount: number;
  totalDueToday: number;
  dueCount: number;
}

export interface StoredHabitData {
  currentStreak: number;
  longestStreak: number;
  /** Study Day of the most recent activity. */
  lastActiveDate: StudyDay | null;
  /** Verse ids completed while due, keyed by Study Day. */
  completedDates: Record<StudyDay, string[]>;
}

export interface DashboardData {
  summary: VerseSummary;
  habitStats: HabitStats;
}

export const HABIT_STORAGE_KEY = 'global_habit_stats';

/**
 * The displayed stage of a verse's memorization, derived from its current review interval
 * (CONTEXT.md). It replaces the per-verse streak and the "mastered" badge: a forgotten verse
 * returns to Seed instead of showing a count of zero.
 */
export type MemoryTier = 'seed' | 'growing' | 'rooted' | 'hidden_in_the_heart';

/**
 * Derives the Memory Tier from the verse's current interval in Study Days: under 7 Seed,
 * under 30 Growing, under 180 Rooted, 180 or more Hidden in the Heart. A verse never
 * officially reviewed (interval 0, or no SRS data) is a Seed.
 */
export function getMemoryTier(verse: Pick<Verse, 'srs'>): MemoryTier {
  const interval = verse.srs?.intervalDays || 0;
  if (interval < 7) return 'seed';
  if (interval < 30) return 'growing';
  if (interval < 180) return 'rooted';
  return 'hidden_in_the_heart';
}

const MEMORY_TIER_LABELS: Record<'en' | 'pt', Record<MemoryTier, string>> = {
  en: {
    seed: 'Seed',
    growing: 'Growing',
    rooted: 'Rooted',
    hidden_in_the_heart: 'Hidden in the Heart',
  },
  pt: {
    seed: 'Semente',
    growing: 'Crescendo',
    rooted: 'Enraizado',
    hidden_in_the_heart: 'Guardado no coração',
  },
};

/** The Memory Tier's name in the verse's language. */
export function memoryTierLabel(tier: MemoryTier, language: 'en' | 'pt'): string {
  return MEMORY_TIER_LABELS[language][tier];
}

/**
 * The verse's SRS state as it stands, reported as an SRS result. This is what a Practice
 * Attempt returns, since practice never moves the schedule.
 */
export function currentSrsResult(srs: Verse['srs'], passed: boolean, now = new Date()): SRSResult {
  const streak = srs?.streak ?? srs?.repetitions ?? 0;
  return {
    streak,
    repetitions: streak,
    intervalDays: srs?.intervalDays ?? DEFAULT_SRS_STATE.intervalDays,
    easeFactor: srs?.easeFactor ?? DEFAULT_SRS_STATE.easeFactor,
    // A verse with no readable due date is due today.
    nextReviewDate: readStudyDay(srs?.nextReviewDate) ?? toStudyDay(now),
    passed,
  };
}

/**
 * Whether the verse is a Due Verse at `now`. A verse never reviewed is due: it was due on the
 * Study Day it was added.
 */
function isDueAt(verse: Verse, now: Date): boolean {
  const neverReviewed = (verse.srs?.streak ?? 0) === 0 && (verse.srs?.intervalDays ?? 0) === 0;
  return neverReviewed || isVerseDue(verse.srs?.nextReviewDate, now);
}

function countTokens(tokens: DiffToken[]) {
  const count = (status: DiffToken['status']) => tokens.filter((t) => t.status === status).length;
  return { correct: count('correct'), missed: count('missed'), added: count('added') };
}

const createAttemptId = (now: Date) =>
  `${now.getTime()}-${Math.random().toString(36).substring(2, 10)}`;

/** The Review Log fields every attempt shares, graded or not. */
type AttemptRowBase = Pick<
  ReviewLogEntry,
  | 'id'
  | 'schemaVersion'
  | 'verseId'
  | 'reviewedAt'
  | 'utcOffsetMinutes'
  | 'studyDay'
  | 'durationMs'
  | 'level'
  | 'translation'
  | 'textHash'
  | 'peekedWordPositions'
  | 'clozeRevealCount'
  | 'recognizer'
  | 'gradingRuleId'
  | 'schedulerId'
>;

function attemptRowBase(
  verse: Verse,
  input: Pick<
    RecordAttemptInput,
    'level' | 'peekedWordPositions' | 'clozeRevealCount' | 'recognizer' | 'durationMs'
  >,
  now: Date
): AttemptRowBase {
  return {
    id: createAttemptId(now),
    schemaVersion: REVIEW_LOG_SCHEMA_VERSION,
    verseId: verse.id,
    reviewedAt: now.toISOString(),
    utcOffsetMinutes: -now.getTimezoneOffset(),
    studyDay: toStudyDay(now),
    durationMs: input.durationMs,
    level: input.level,
    translation: verse.translation || resolveDefaultTranslation(verse.reference),
    textHash: hashCanonicalText(verse.text),
    peekedWordPositions: [...(input.peekedWordPositions ?? [])],
    clozeRevealCount: input.clozeRevealCount,
    recognizer: input.recognizer,
    gradingRuleId: GRADING_RULE_ID,
    schedulerId: SCHEDULER_ID,
  };
}

import {
  StorageAdapter,
  MapStorageAdapter,
  AsyncStorageAdapter,
} from './StorageAdapter';

export { StorageAdapter, MapStorageAdapter, AsyncStorageAdapter };

const STORAGE_KEY = 'verses';

// A new verse is due on the Study Day it is added.
const createInitialSRS = () => ({
  ...DEFAULT_SRS_STATE,
  nextReviewDate: toStudyDay(new Date()),
});

export const resolveDefaultTranslation = (reference: string): VerseTranslation => {
  const norm = scriptureCatalog.resolveReference(reference);
  return norm?.language === 'pt' ? 'ALMEIDA' : 'WEB';
};

const createVerseRecord = (verseData: Omit<Verse, 'id' | 'srs'>): Verse => {
  const translation = verseData.translation || resolveDefaultTranslation(verseData.reference);

  return {
    ...verseData,
    translation,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    srs: createInitialSRS(),
  };
};

export interface VerseEngineOptions {
  /** Random source for the interval fuzz (defaults to `Math.random`). */
  random?: RandomSource;
}

export class VerseEngine {
  private storage: StorageAdapter;
  private reviewLog: ReviewLog;
  private random: RandomSource;

  constructor(storage?: StorageAdapter, options: VerseEngineOptions = {}) {
    this.storage = storage ?? new AsyncStorageAdapter();
    this.reviewLog = new ReviewLog(this.storage);
    this.random = options.random ?? Math.random;
  }

  private async persistVerses(verses: Verse[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(verses));
  }

  async getAllVerses(): Promise<Verse[]> {
    try {
      const data = await this.storage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }
      const parsed: Verse[] = JSON.parse(data);
      return parsed.map((verse) => {
        if (!verse.translation) {
          return {
            ...verse,
            translation: resolveDefaultTranslation(verse.reference),
          };
        }
        return verse;
      });
    } catch (error) {
      console.error('Failed to parse verses from storage', error);
      return [];
    }
  }

  async getVersesSummary(now = new Date()): Promise<VerseSummary> {
    const allVerses = await this.getAllVerses();
    const dueVerses: Verse[] = [];
    for (const verse of allVerses) {
      if (isVerseDue(verse.srs?.nextReviewDate, now)) {
        dueVerses.push(verse);
      }
    }
    return {
      allVerses,
      dueVerses,
      dueCount: dueVerses.length,
    };
  }

  private async getStoredHabitData(): Promise<StoredHabitData> {
    try {
      const data = await this.storage.getItem(HABIT_STORAGE_KEY);
      if (!data) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: null,
          completedDates: {},
        };
      }
      return JSON.parse(data);
    } catch {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        completedDates: {},
      };
    }
  }

  private async persistHabitData(data: StoredHabitData): Promise<void> {
    await this.storage.setItem(HABIT_STORAGE_KEY, JSON.stringify(data));
  }

  private buildHabitStats(
    habitData: StoredHabitData,
    completedToday: number,
    dueCount: number,
    displayStreak: number
  ): HabitStats {
    return {
      currentStreak: displayStreak,
      longestStreak: habitData.longestStreak,
      lastActiveDate: habitData.lastActiveDate,
      completedTodayCount: completedToday,
      totalDueToday: completedToday + dueCount,
      dueCount,
    };
  }

  async getDashboard(now = new Date()): Promise<DashboardData> {
    const summary = await this.getVersesSummary(now);
    const habitData = await this.getStoredHabitData();

    const todayStr = toStudyDay(now);
    const yesterdayStr = addStudyDays(todayStr, -1);

    let displayStreak = habitData.currentStreak;
    if (
      habitData.lastActiveDate &&
      habitData.lastActiveDate !== todayStr &&
      habitData.lastActiveDate !== yesterdayStr
    ) {
      displayStreak = 0;
    }

    const completedToday = (habitData.completedDates[todayStr] || []).length;
    const habitStats = this.buildHabitStats(
      habitData,
      completedToday,
      summary.dueCount,
      displayStreak
    );

    return {
      summary,
      habitStats,
    };
  }

  async getHabitStats(now = new Date()): Promise<HabitStats> {
    const { habitStats } = await this.getDashboard(now);
    return habitStats;
  }

  private async updateHabitStreak(
    verseId: string,
    wasDue: boolean,
    now = new Date()
  ): Promise<StoredHabitData> {
    const todayStr = toStudyDay(now);
    const yesterdayStr = addStudyDays(todayStr, -1);
    const habitData = await this.getStoredHabitData();

    if (habitData.lastActiveDate === todayStr) {
      // Already active today, maintain current streak
    } else if (habitData.lastActiveDate === yesterdayStr) {
      habitData.currentStreak += 1;
    } else {
      habitData.currentStreak = 1;
    }

    if (habitData.currentStreak > habitData.longestStreak) {
      habitData.longestStreak = habitData.currentStreak;
    }
    habitData.lastActiveDate = todayStr;

    if (wasDue) {
      const todaysCompletions = new Set(habitData.completedDates[todayStr] || []);
      todaysCompletions.add(verseId);
      habitData.completedDates = {
        ...habitData.completedDates,
        [todayStr]: Array.from(todaysCompletions),
      };
    }

    await this.persistHabitData(habitData);
    return habitData;
  }

  async recordHabitActivity(
    verseId: string,
    wasDue: boolean,
    now = new Date()
  ): Promise<HabitStats> {
    const habitData = await this.updateHabitStreak(verseId, wasDue, now);
    const todayStr = toStudyDay(now);
    const completedToday = (habitData.completedDates[todayStr] || []).length;
    const dueCount = (await this.getVersesSummary(now)).dueCount;

    return this.buildHabitStats(habitData, completedToday, dueCount, habitData.currentStreak);
  }

  async resetHabit(): Promise<void> {
    await this.persistHabitData({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      completedDates: {},
    });
  }

  async addVerse(verseData: Omit<Verse, 'id' | 'srs'>): Promise<Verse> {
    const verses = await this.getAllVerses();
    const newVerse = createVerseRecord(verseData);
    verses.push(newVerse);
    await this.persistVerses(verses);
    return newVerse;
  }

  async importVerses(versesToImport: Array<Omit<Verse, 'id' | 'srs'>>): Promise<number> {
    const existing = await this.getAllVerses();
    const existingRefs = new Set(existing.map((verse) => verse.reference.trim().toLowerCase()));

    const newVerses: Verse[] = [];

    for (const verse of versesToImport) {
      const normalized = verse.reference.trim().toLowerCase();
      if (!existingRefs.has(normalized)) {
        newVerses.push(createVerseRecord(verse));
        existingRefs.add(normalized);
      }
    }

    if (newVerses.length > 0) {
      const combined = [...existing, ...newVerses];
      await this.persistVerses(combined);
    }

    return newVerses.length;
  }

  async importDeck(
    deckName: string,
    versesToImport: Array<{ reference: string; text: string; translation?: string }>
  ): Promise<Verse[]> {
    const existing = await this.getAllVerses();
    const existingRefs = new Set(existing.map((verse) => verse.reference.trim().toLowerCase()));

    const newVerses: Verse[] = [];

    for (const verse of versesToImport) {
      const normalized = verse.reference.trim().toLowerCase();
      if (!existingRefs.has(normalized)) {
        const record = createVerseRecord({
          reference: verse.reference,
          text: verse.text,
          translation: verse.translation,
          deck: deckName,
        });
        newVerses.push(record);
        existingRefs.add(normalized);
      }
    }

    if (newVerses.length > 0) {
      const combined = [...existing, ...newVerses];
      await this.persistVerses(combined);
    }

    return newVerses;
  }

  async updateVerse(id: string, updates: Partial<Omit<Verse, 'id'>>): Promise<Verse> {
    const verses = await this.getAllVerses();
    const index = verses.findIndex((v) => v.id === id);
    if (index === -1) {
      throw new Error(`Verse not found: ${id}`);
    }

    const current = verses[index];
    const updatedRef = updates.reference ?? current.reference;
    let updatedTranslation = current.translation;

    if (updates.translation !== undefined) {
      updatedTranslation = updates.translation || resolveDefaultTranslation(updatedRef);
    } else if (updates.reference && !current.translation) {
      updatedTranslation = resolveDefaultTranslation(updatedRef);
    }

    const updated: Verse = {
      ...current,
      ...updates,
      srs: updates.srs !== undefined ? { ...current.srs, ...updates.srs } : current.srs,
      translation: updatedTranslation,
    };
    verses[index] = updated;
    await this.persistVerses(verses);
    return updated;
  }

  /** Permanently removes the verse and its whole Review Log history (ADR 0009). */
  async deleteVerse(verseId: string): Promise<boolean> {
    const verses = await this.getAllVerses();
    const filtered = verses.filter((verse) => verse.id !== verseId);
    const found = filtered.length !== verses.length;
    if (found) {
      await this.persistVerses(filtered);
    }
    // Also clears rows orphaned by an interrupted earlier deletion.
    await this.reviewLog.deleteForVerse(verseId);
    return found;
  }

  /** The verse's Review Log rows, oldest first. */
  async getReviewLog(verseId: string): Promise<ReviewLogEntry[]> {
    return this.reviewLog.listForVerse(verseId);
  }

  /**
   * Records one completed recitation attempt. This is the single entry point for recitations:
   * the engine, not the caller, decides whether the attempt is an Official Review.
   *
   * An attempt is an Official Review when it is a Blind Recitation (Level 3) of a Due Verse
   * and the verse has had no Official Review on the current Study Day. Only Official Reviews
   * move the SRS schedule and the daily habit streak. Every attempt, official or practice, is
   * appended to the Review Log.
   */
  async recordAttempt(input: RecordAttemptInput): Promise<RecordedAttempt> {
    const now = input.now ?? new Date();
    const studyDay = toStudyDay(now);
    const verses = await this.getAllVerses();
    const index = verses.findIndex((verse) => verse.id === input.verseId);
    if (index === -1) {
      throw new Error(`Verse not found: ${input.verseId}`);
    }

    const verse = verses[index];
    const before = {
      intervalDays: verse.srs?.intervalDays ?? DEFAULT_SRS_STATE.intervalDays,
      easeFactor: verse.srs?.easeFactor ?? DEFAULT_SRS_STATE.easeFactor,
    };
    const wasDue = isDueAt(verse, now);
    const kind: AttemptKind =
      input.level === 3 && wasDue && verse.srs?.lastOfficialReviewDay !== studyDay
        ? 'official'
        : 'practice';

    // The verse is persisted before the row is appended, and it alone records the day's
    // Official Review, so a failed append can never let a second one through.
    const { tokens, rawScore, errorCount, errorBudget, outcome } = input.evaluation;
    const srsResult =
      kind === 'official'
        ? await this.applyOfficialReview(verses, index, outcome, now, true, rawScore)
        : currentSrsResult(verse.srs, isRecalled(outcome), now);

    const counts = countTokens(tokens);
    const entry: ReviewLogEntry = {
      ...attemptRowBase(verse, input, now),
      kind,
      wordCount: counts.correct + counts.missed,
      ...counts,
      rawScore,
      errorCount,
      errorBudget,
      outcome,
      wasDue,
      sm2Quality: kind === 'official' ? SM2_QUALITY[outcome] : null,
      before,
      after: { intervalDays: srsResult.intervalDays, easeFactor: srsResult.easeFactor },
      dueStudyDayAfter: srsResult.nextReviewDate,
    };
    await this.reviewLog.append(entry);

    return { kind, srsResult, memoryTier: getMemoryTier(verses[index]), entry };
  }

  /**
   * Logs a recitation that ended in a Transcription Error (ticket 74). It is never evaluated or
   * scheduled: the row is a Practice Attempt with its error code and no outcome, the verse and
   * the daily habit streak are left untouched, and the verse's Official Review for the Study
   * Day stays available for the retry.
   */
  async recordTranscriptionError(input: RecordTranscriptionErrorInput): Promise<ReviewLogEntry> {
    const now = input.now ?? new Date();
    const verse = (await this.getAllVerses()).find((candidate) => candidate.id === input.verseId);
    if (!verse) {
      throw new Error(`Verse not found: ${input.verseId}`);
    }

    const unchanged = currentSrsResult(verse.srs, false, now);
    const schedule = { intervalDays: unchanged.intervalDays, easeFactor: unchanged.easeFactor };
    const entry: ReviewLogEntry = {
      ...attemptRowBase(verse, input, now),
      kind: 'practice',
      wordCount: countComparableWords(verse.text),
      correct: 0,
      missed: 0,
      added: 0,
      rawScore: 0,
      errorCount: null,
      errorBudget: null,
      outcome: null,
      transcriptionErrorCode: input.code,
      wasDue: isDueAt(verse, now),
      sm2Quality: null,
      before: schedule,
      after: { ...schedule },
      dueStudyDayAfter: unchanged.nextReviewDate,
    };
    await this.reviewLog.append(entry);
    return entry;
  }

  /**
   * Applies a review to the SRS schedule directly, with no classification and no Review Log
   * row. The app records recitations through `recordAttempt`; nothing in the app calls this.
   */
  async recordReview(verseId: string, outcome: RecitationOutcome, now = new Date()): Promise<SRSResult> {
    const verses = await this.getAllVerses();
    const index = verses.findIndex((verse) => verse.id === verseId);
    if (index === -1) {
      throw new Error(`Verse not found: ${verseId}`);
    }
    return this.applyOfficialReview(verses, index, outcome, now, isDueAt(verses[index], now));
  }

  /**
   * Moves the schedule and the daily habit streak for an Official Review, and persists both.
   * `rawScore` (the F1 percentage) is kept as the verse's last score for display.
   */
  private async applyOfficialReview(
    verses: Verse[],
    index: number,
    outcome: RecitationOutcome,
    now: Date,
    wasDue: boolean,
    rawScore?: number
  ): Promise<SRSResult> {
    const current = verses[index].srs;
    const currentSRS: SRSState = current || DEFAULT_SRS_STATE;
    const srsResult = calculateNextReview(currentSRS, outcome, now, this.random);
    const lastScore = rawScore ?? current?.lastScore;

    verses[index].srs = {
      streak: srsResult.streak ?? 0,
      intervalDays: srsResult.intervalDays,
      easeFactor: srsResult.easeFactor,
      nextReviewDate: srsResult.nextReviewDate,
      ...(lastScore !== undefined ? { lastScore } : {}),
      lastOfficialReviewDay: toStudyDay(now),
    };
    if (rawScore !== undefined) {
      verses[index].lastScore = rawScore;
    }

    await this.persistVerses(verses);
    await this.updateHabitStreak(verses[index].id, wasDue, now);

    return srsResult;
  }

  /** Describes the earliest future due Study Day, counted in Study Days from today. */
  getNextReviewMessage(allVerses: Verse[], now = new Date()): string {
    const today = toStudyDay(now);
    const futureStudyDays = allVerses
      .map((v) => readStudyDay(v.srs?.nextReviewDate))
      .filter((day): day is StudyDay => day !== null && compareStudyDays(day, today) > 0)
      .sort(compareStudyDays);

    if (futureStudyDays.length === 0) {
      return 'Next review due tomorrow';
    }

    const diffDays = studyDaysBetween(today, futureStudyDays[0]);
    if (diffDays <= 1) {
      return 'Next review due tomorrow';
    }
    return `Next review due in ${diffDays} days`;
  }
}

export const verseEngine = new VerseEngine();
