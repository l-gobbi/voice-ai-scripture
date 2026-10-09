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
  ReviewLogSchedulingState,
  hashCanonicalText,
} from './ReviewLog';
import { TranscriptionErrorCode } from './SpeechTranscriberTypes';
import type { Language } from '../utils/languageNormalizer';

export { SRSResult, AttemptKind, AttemptLevel, Recognizer, ReviewLogEntry, RecitationOutcome };

/**
 * The verification rule behind each logged Recitation Outcome: the Error Budget (ADR 0017).
 * Unaided errors are missed or Word-Peeked words, once each, plus added words beyond two; up to
 * 5% of the verse's words (at least one) is a slip, none is clean, more is forgotten. It
 * replaced `f1-80-peek-cap-75@1` (F1 ≥ 80 passes, a Word Peek caps the score at 75).
 */
export const VERIFICATION_RULE_ID = 'error-budget-5pct@1';
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
  /**
   * The legacy `#tag` deck of verses saved before Decks were first-class. The Deck Library
   * migrates it into an Own Deck and clears it (ticket 86); nothing writes it anymore.
   */
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

/** The verified outcome of one recitation, as the recitation evaluator returned it. */
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
 * A verified recitation attempt: everything `recordAttempt` needs except the verse. The
 * Recitation Session builds one for every attempt it verifies; in the sandbox, whose verse is
 * not stored yet, it keeps the last Blind Recitation's for a possible save (ticket 79).
 */
export type VerifiedAttempt = Omit<RecordAttemptInput, 'verseId'>;

export interface AddVerseOptions {
  /**
   * The sandbox's last Blind Recitation, when the verse is the saved sandbox verse. It is
   * appended to the new verse's Review Log as a Practice Attempt with its real outcome.
   */
  sandboxAttempt?: VerifiedAttempt | null;
  /** Instant of the save (defaults to now): the new verse is due on its Study Day. */
  now?: Date;
}

/**
 * A recitation that ended in a Transcription Error: the app failed to hear the learner, so
 * there is nothing to verify (ticket 74).
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

const MEMORY_TIER_LABELS: Record<Language, Record<MemoryTier, string>> = {
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
export function memoryTierLabel(tier: MemoryTier, language: Language): string {
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

/** The Review Log fields every attempt shares, verified or not. */
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
  | 'verificationRuleId'
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
    verificationRuleId: VERIFICATION_RULE_ID,
    schedulerId: SCHEDULER_ID,
  };
}

/** How the engine classified a verified attempt, and the verse's SRS state around it. */
interface AttemptScheduling {
  kind: AttemptKind;
  wasDue: boolean;
  before: ReviewLogSchedulingState;
  srsResult: SRSResult;
}

/** The Review Log row of a verified attempt. */
function verifiedAttemptRow(
  verse: Verse,
  input: VerifiedAttempt,
  now: Date,
  { kind, wasDue, before, srsResult }: AttemptScheduling
): ReviewLogEntry {
  const { tokens, rawScore, errorCount, errorBudget, outcome } = input.evaluation;
  const counts = countTokens(tokens);
  return {
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
}

import {
  StorageAdapter,
  MapStorageAdapter,
  AsyncStorageAdapter,
} from './StorageAdapter';

export { StorageAdapter, MapStorageAdapter, AsyncStorageAdapter };

const STORAGE_KEY = 'verses';

// A new verse is due on the Study Day it is added.
const createInitialSRS = (now: Date) => ({
  ...DEFAULT_SRS_STATE,
  nextReviewDate: toStudyDay(now),
});

/**
 * The catalog's default Translation for the reference's language (BLIVRE or BSB). Verses
 * already saved without a translation read as this, never as the Preferred Translation, so
 * changing the preference does not relabel them.
 */
export const resolveDefaultTranslation = (reference: string): VerseTranslation =>
  scriptureCatalog.getDefaultTranslation(reference);

/** The learner's Preferred Translation per language. */
export type PreferredTranslations = Record<Language, SupportedTranslation>;

export const PREFERRED_TRANSLATIONS_STORAGE_KEY = 'preferred_translations';

const PREFERENCE_LANGUAGES: readonly Language[] = ['pt', 'en'];

const LANGUAGE_NAMES: Record<Language, string> = {
  pt: 'Portuguese',
  en: 'English',
};

/** "a Portuguese translation", "an English translation". */
const A_TRANSLATION_OF: Record<Language, string> = {
  pt: 'a Portuguese translation',
  en: 'an English translation',
};

/** The stored code if it is still a bundled Translation of `language`; otherwise null. */
function allowedPreference(raw: unknown, language: Language): SupportedTranslation | null {
  if (typeof raw !== 'string') return null;
  const meta = scriptureCatalog.getTranslationMetadata(raw);
  return meta && meta.language === language ? meta.code : null;
}

/**
 * A new verse record, due on its Study Day. A verse without a translation gets the Preferred
 * Translation of its reference's language.
 */
const createVerseRecord = (
  verseData: Omit<Verse, 'id' | 'srs'>,
  preferred: PreferredTranslations,
  now = new Date()
): Verse => {
  const translation =
    verseData.translation || preferred[scriptureCatalog.referenceLanguage(verseData.reference)];

  return {
    ...verseData,
    translation,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    srs: createInitialSRS(now),
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

  /**
   * The learner's Preferred Translation for each language. A language never set, or set to
   * something that is no longer a bundled Translation of that language, has the catalog
   * default (Bíblia Livre, BSB).
   */
  async getPreferredTranslations(): Promise<PreferredTranslations> {
    let stored: Partial<Record<Language, unknown>> = {};
    try {
      const data = await this.storage.getItem(PREFERRED_TRANSLATIONS_STORAGE_KEY);
      const parsed = data ? JSON.parse(data) : null;
      if (parsed && typeof parsed === 'object') {
        stored = parsed;
      }
    } catch {
      // Unreadable: every language keeps its default.
    }
    return {
      pt: allowedPreference(stored.pt, 'pt') ?? scriptureCatalog.getDefaultTranslation('pt'),
      en: allowedPreference(stored.en, 'en') ?? scriptureCatalog.getDefaultTranslation('en'),
    };
  }

  /** The learner's Preferred Translation for one language. */
  async getPreferredTranslation(language: Language): Promise<SupportedTranslation> {
    return (await this.getPreferredTranslations())[language];
  }

  /**
   * Sets the Preferred Translation for a language and returns its code. Only a bundled
   * Translation of that language is accepted (any of its names): anything else throws and
   * leaves the preference unchanged. Verses already saved keep their translation and text.
   */
  async setPreferredTranslation(
    language: Language,
    translation: string
  ): Promise<SupportedTranslation> {
    if (!PREFERENCE_LANGUAGES.includes(language)) {
      throw new Error(
        `Unknown language "${language}": a Preferred Translation is set for "pt" or "en".`
      );
    }
    const choices = scriptureCatalog
      .getBundledTranslations(language)
      .map((meta) => meta.code)
      .join(', ');
    const meta = scriptureCatalog.getTranslationMetadata(translation);
    if (!meta) {
      throw new Error(
        `"${translation}" is not a bundled translation, so it cannot be the Preferred ` +
          `Translation for ${LANGUAGE_NAMES[language]}. Choose one of: ${choices}.`
      );
    }
    if (meta.language !== language) {
      throw new Error(
        `${meta.code} is ${A_TRANSLATION_OF[meta.language]}, so it cannot be the ` +
          `Preferred Translation for ${LANGUAGE_NAMES[language]}. Choose one of: ${choices}.`
      );
    }

    const next = { ...(await this.getPreferredTranslations()), [language]: meta.code };
    await this.storage.setItem(PREFERRED_TRANSLATIONS_STORAGE_KEY, JSON.stringify(next));
    return meta.code;
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

  /**
   * Adds a new verse: default SRS state, due on the Study Day it is added.
   *
   * Saving the sandbox verse (ticket 79) also passes the sandbox's last Blind Recitation, if
   * there was one. It is appended to the new verse's Review Log as a Practice Attempt with its
   * real outcome. It was made before the verse was stored, so it is never an Official Review:
   * it moves neither the schedule nor the daily habit streak, and the verse's first Official
   * Review is still ahead.
   */
  async addVerse(verseData: Omit<Verse, 'id' | 'srs'>, options: AddVerseOptions = {}): Promise<Verse> {
    const now = options.now ?? new Date();
    const verses = await this.getAllVerses();
    const newVerse = createVerseRecord(verseData, await this.getPreferredTranslations(), now);
    verses.push(newVerse);
    await this.persistVerses(verses);

    const attempt = options.sandboxAttempt;
    if (attempt) {
      const srsResult = currentSrsResult(newVerse.srs, isRecalled(attempt.evaluation.outcome), now);
      const entry = verifiedAttemptRow(newVerse, attempt, attempt.now ?? now, {
        kind: 'practice',
        // The verse was not stored at the time of the recitation, so it had no due Study Day.
        wasDue: false,
        before: { intervalDays: srsResult.intervalDays, easeFactor: srsResult.easeFactor },
        srsResult,
      });
      await this.reviewLog.append(entry);
    }

    return newVerse;
  }

  async importVerses(versesToImport: Array<Omit<Verse, 'id' | 'srs'>>): Promise<number> {
    const existing = await this.getAllVerses();
    const existingRefs = new Set(existing.map((verse) => verse.reference.trim().toLowerCase()));
    const preferred = await this.getPreferredTranslations();

    const newVerses: Verse[] = [];

    for (const verse of versesToImport) {
      const normalized = verse.reference.trim().toLowerCase();
      if (!existingRefs.has(normalized)) {
        newVerses.push(createVerseRecord(verse, preferred));
        existingRefs.add(normalized);
      }
    }

    if (newVerses.length > 0) {
      const combined = [...existing, ...newVerses];
      await this.persistVerses(combined);
    }

    return newVerses.length;
  }

  /**
   * Removes the legacy `#tag` deck from these verses once the Deck Library has migrated it
   * (ticket 86). Writes nothing when none of them has one.
   */
  async clearLegacyDeckTags(verseIds: string[]): Promise<void> {
    const ids = new Set(verseIds);
    const verses = await this.getAllVerses();
    let cleared = false;
    const untagged = verses.map((verse) => {
      if (!ids.has(verse.id) || !('deck' in verse)) return verse;
      cleared = true;
      const { deck: _legacyTag, ...rest } = verse;
      return rest;
    });
    if (cleared) {
      await this.persistVerses(untagged);
    }
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
    const { rawScore, outcome } = input.evaluation;
    const srsResult =
      kind === 'official'
        ? await this.applyOfficialReview(verses, index, outcome, now, rawScore)
        : currentSrsResult(verse.srs, isRecalled(outcome), now);

    const entry = verifiedAttemptRow(verse, input, now, { kind, wasDue, before, srsResult });
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
   * Moves the schedule and the daily habit streak for an Official Review, and persists both.
   * An Official Review is always of a Due Verse, so it counts as completed for the Study Day.
   * `rawScore` (the F1 percentage) is kept as the verse's last score for display.
   */
  private async applyOfficialReview(
    verses: Verse[],
    index: number,
    outcome: RecitationOutcome,
    now: Date,
    rawScore: number
  ): Promise<SRSResult> {
    const currentSRS: SRSState = verses[index].srs || DEFAULT_SRS_STATE;
    const srsResult = calculateNextReview(currentSRS, outcome, now, this.random);

    verses[index].srs = {
      streak: srsResult.streak ?? 0,
      intervalDays: srsResult.intervalDays,
      easeFactor: srsResult.easeFactor,
      nextReviewDate: srsResult.nextReviewDate,
      lastScore: rawScore,
      lastOfficialReviewDay: toStudyDay(now),
    };
    verses[index].lastScore = rawScore;

    await this.persistVerses(verses);
    await this.updateHabitStreak(verses[index].id, true, now);

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
