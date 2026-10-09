import { StudyDay } from '../engines/studyDay';
import type { RecitationOutcome } from '../engines/recitationEvaluator';
import { TranscriptionErrorCode } from './SpeechTranscriberTypes';
import { StorageAdapter } from './StorageAdapter';

/**
 * Review Log (CONTEXT.md, ADR 0017): the append-only record of every recitation attempt
 * against a verse, official or practice, keeping the raw outcome so grades can be re-derived
 * and a future scheduler can replay history.
 *
 * Rows live behind the storage adapter, separate from the `verses` record, in one shard per
 * month of their Study Day (AsyncStorage on Android caps an entry at about 2 MB). An index
 * key lists the shard keys, so queries and deletion never scan unknown keys. Rows are never
 * edited; the only removal is deleting a verse's whole history (ADR 0009).
 */

export const REVIEW_LOG_SCHEMA_VERSION = 1;
export const REVIEW_LOG_INDEX_KEY = 'review_log:index';
const SHARD_KEY_PREFIX = 'review_log:';

export type AttemptKind = 'official' | 'practice';
export type AttemptLevel = 1 | 2 | 3;
export type Recognizer = 'native' | 'cloud' | 'simulated';
export type { RecitationOutcome };

export interface ReviewLogSchedulingState {
  intervalDays: number;
  easeFactor: number;
}

export interface ReviewLogEntry {
  // --- identity and version ---
  id: string;
  schemaVersion: typeof REVIEW_LOG_SCHEMA_VERSION;
  verseId: string;

  // --- timing ---
  /** UTC instant of the attempt (ISO-8601). */
  reviewedAt: string;
  /** Local offset from UTC at that instant, in minutes (e.g. -180 in Brasília). */
  utcOffsetMinutes: number;
  /** The Study Day the attempt belongs to. */
  studyDay: StudyDay;
  /** From the start of the recitation to its verification, when known. */
  durationMs?: number;

  // --- classification ---
  kind: AttemptKind;
  level: AttemptLevel;
  translation: string;
  /** Hash of the canonical text recited against; detects edits and translation switches. */
  textHash: string;
  /** Canonical word count, as the diff counts words. */
  wordCount: number;

  // --- raw outcome ---
  correct: number;
  missed: number;
  added: number;
  /** Word-level F1 score, 0–100. Kept for display; the Error Budget decides the outcome. */
  rawScore: number;
  /**
   * Canonical word positions (from 0, as the diff counts words) revealed with the Word Peek
   * Lifeline during the attempt. Each counts as one error.
   */
  peekedWordPositions: number[];
  /** Words revealed during Cloze Practice (Level 2). */
  clozeRevealCount?: number;
  /**
   * Unaided errors: missed or peeked words (once each), plus added words beyond two.
   * Null when the attempt ended in a Transcription Error (ticket 74).
   */
  errorCount: number | null;
  /** The verse's Error Budget: 5% of its words, never less than one. Null as `errorCount`. */
  errorBudget: number | null;
  /** `clean`, `slip` or `forgotten`; null when the attempt ended in a Transcription Error (ticket 74). */
  outcome: RecitationOutcome | null;

  // --- recognizer ---
  recognizer?: Recognizer;
  /** Set when the attempt ended in a Transcription Error (ticket 74). */
  transcriptionErrorCode?: TranscriptionErrorCode;

  // --- scheduling ---
  /** Whether the verse was a Due Verse at the moment of the attempt. */
  wasDue: boolean;
  gradingRuleId: string;
  schedulerId: string;
  /** SM-2 quality given by an Official Review (clean 5, slip 4, forgotten 2); null for practice. */
  sm2Quality: number | null;
  before: ReviewLogSchedulingState;
  after: ReviewLogSchedulingState;
  /** The verse's due Study Day after the attempt. */
  dueStudyDayAfter: StudyDay;
}

/** The storage key of the shard holding rows of the given Study Day's month. */
export function reviewLogShardKey(studyDay: StudyDay): string {
  return `${SHARD_KEY_PREFIX}${studyDay.slice(0, 7)}`;
}

/** FNV-1a (32-bit) over the UTF-16 code units of the text: cheap, stable and dependency-free. */
export function hashCanonicalText(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

const byReviewedAt = (a: ReviewLogEntry, b: ReviewLogEntry) =>
  a.reviewedAt < b.reviewedAt ? -1 : a.reviewedAt > b.reviewedAt ? 1 : 0;

export class ReviewLog {
  constructor(private readonly storage: StorageAdapter) {}

  /** Appends one row. The row is copied, so later changes by the caller never reach the log. */
  async append(entry: ReviewLogEntry): Promise<void> {
    const row: ReviewLogEntry = JSON.parse(JSON.stringify(entry));
    const shardKey = reviewLogShardKey(row.studyDay);

    // Index first: a failure after it leaves an empty shard listed, never an unlisted row.
    const index = await this.readIndex();
    if (!index.includes(shardKey)) {
      await this.writeIndex([...index, shardKey].sort());
    }

    const shard = await this.readShard(shardKey);
    shard.push(row);
    await this.storage.setItem(shardKey, JSON.stringify(shard));
  }

  /** The verse's rows, oldest first. */
  async listForVerse(verseId: string): Promise<ReviewLogEntry[]> {
    const rows: ReviewLogEntry[] = [];
    for (const shardKey of await this.readIndex()) {
      for (const entry of await this.readShard(shardKey)) {
        if (entry.verseId === verseId) rows.push(entry);
      }
    }
    return rows.sort(byReviewedAt);
  }

  /** Removes every row of the verse and returns how many were removed. */
  async deleteForVerse(verseId: string): Promise<number> {
    const index = await this.readIndex();
    const keptShards: string[] = [];
    let removed = 0;

    for (const shardKey of index) {
      const shard = await this.readShard(shardKey);
      const kept = shard.filter((entry) => entry.verseId !== verseId);
      removed += shard.length - kept.length;

      if (kept.length === 0) {
        await this.removeShard(shardKey);
        continue;
      }
      keptShards.push(shardKey);
      if (kept.length !== shard.length) {
        await this.storage.setItem(shardKey, JSON.stringify(kept));
      }
    }

    if (keptShards.length !== index.length) {
      await this.writeIndex(keptShards);
    }
    return removed;
  }

  private async readIndex(): Promise<string[]> {
    const parsed = await this.readJson(REVIEW_LOG_INDEX_KEY);
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : [];
  }

  private async writeIndex(index: string[]): Promise<void> {
    await this.storage.setItem(REVIEW_LOG_INDEX_KEY, JSON.stringify(index));
  }

  private async readShard(shardKey: string): Promise<ReviewLogEntry[]> {
    const parsed = await this.readJson(shardKey);
    return Array.isArray(parsed) ? parsed : [];
  }

  private async removeShard(shardKey: string): Promise<void> {
    if (this.storage.removeItem) {
      await this.storage.removeItem(shardKey);
    } else {
      await this.storage.setItem(shardKey, '[]');
    }
  }

  private async readJson(key: string): Promise<unknown> {
    try {
      const data = await this.storage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Failed to read Review Log key ${key}`, error);
      return null;
    }
  }
}
