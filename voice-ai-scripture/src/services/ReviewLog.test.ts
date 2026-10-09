import {
  REVIEW_LOG_INDEX_KEY,
  REVIEW_LOG_SCHEMA_VERSION,
  ReviewLog,
  ReviewLogEntry,
  hashCanonicalText,
  reviewLogShardKey,
} from './ReviewLog';
import { MapStorageAdapter } from './StorageAdapter';

/** A complete practice row; tests override only what they look at. */
function row(overrides: Partial<ReviewLogEntry> & Pick<ReviewLogEntry, 'id' | 'verseId'>): ReviewLogEntry {
  return {
    schemaVersion: REVIEW_LOG_SCHEMA_VERSION,
    reviewedAt: '2026-10-09T12:00:00.000Z',
    utcOffsetMinutes: 0,
    studyDay: '2026-10-09',
    kind: 'practice',
    level: 3,
    translation: 'WEB',
    textHash: hashCanonicalText('Jesus wept.'),
    wordCount: 2,
    correct: 2,
    missed: 0,
    added: 0,
    rawScore: 100,
    score: 100,
    peekedWordPositions: [],
    wasDue: false,
    gradingRuleId: 'test-rule',
    schedulerId: 'test-scheduler',
    before: { intervalDays: 0, easeFactor: 2.5 },
    after: { intervalDays: 0, easeFactor: 2.5 },
    dueStudyDayAfter: '2026-10-09',
    ...overrides,
  };
}

async function readIndex(storage: MapStorageAdapter): Promise<string[]> {
  return JSON.parse((await storage.getItem(REVIEW_LOG_INDEX_KEY)) ?? '[]');
}

describe('ReviewLog (Ticket 72)', () => {
  it('lists a verse’s rows in chronological order, leaving other verses’ rows out', async () => {
    const log = new ReviewLog(new MapStorageAdapter());

    await log.append(row({ id: 'b', verseId: 'v1', reviewedAt: '2026-10-09T15:00:00.000Z' }));
    await log.append(row({ id: 'x', verseId: 'v2', reviewedAt: '2026-10-09T14:00:00.000Z' }));
    await log.append(row({ id: 'a', verseId: 'v1', reviewedAt: '2026-10-09T09:00:00.000Z' }));

    expect((await log.listForVerse('v1')).map((r) => r.id)).toEqual(['a', 'b']);
    expect((await log.listForVerse('v2')).map((r) => r.id)).toEqual(['x']);
    expect(await log.listForVerse('unknown')).toEqual([]);
  });

  it('keeps each row exactly as appended', async () => {
    const log = new ReviewLog(new MapStorageAdapter());
    const entry = row({ id: 'r1', verseId: 'v1', peekedWordPositions: [2, 5], durationMs: 4200 });

    await log.append(entry);
    entry.peekedWordPositions.push(9); // later changes by the caller do not reach the log

    expect(await log.listForVerse('v1')).toEqual([
      row({ id: 'r1', verseId: 'v1', peekedWordPositions: [2, 5], durationMs: 4200 }),
    ]);
  });

  it('shards rows by the month of their Study Day, with an index of shard keys', async () => {
    const storage = new MapStorageAdapter();
    const log = new ReviewLog(storage);

    // 00:30 local on Nov 1 still belongs to Study Day Oct 31, so it lands in October's shard.
    await log.append(row({ id: 'oct', verseId: 'v1', studyDay: '2026-10-31' }));
    await log.append(row({ id: 'nov', verseId: 'v1', studyDay: '2026-11-01' }));
    await log.append(row({ id: 'sep', verseId: 'v2', studyDay: '2026-09-15' }));

    expect(reviewLogShardKey('2026-10-31')).not.toBe(reviewLogShardKey('2026-11-01'));
    expect(await readIndex(storage)).toEqual([
      reviewLogShardKey('2026-09-15'),
      reviewLogShardKey('2026-10-31'),
      reviewLogShardKey('2026-11-01'),
    ]);
    const october = JSON.parse((await storage.getItem(reviewLogShardKey('2026-10-01')))!);
    expect(october.map((r: ReviewLogEntry) => r.id)).toEqual(['oct']);
  });

  it('deletes every row of a verse across shards, pruning shards left empty', async () => {
    const storage = new MapStorageAdapter();
    const log = new ReviewLog(storage);
    await log.append(row({ id: 'v1-sep', verseId: 'v1', studyDay: '2026-09-30' }));
    await log.append(row({ id: 'v1-oct', verseId: 'v1', studyDay: '2026-10-01' }));
    await log.append(row({ id: 'v2-oct', verseId: 'v2', studyDay: '2026-10-02' }));

    const removed = await log.deleteForVerse('v1');

    expect(removed).toBe(2);
    expect(await log.listForVerse('v1')).toEqual([]);
    expect((await log.listForVerse('v2')).map((r) => r.id)).toEqual(['v2-oct']);
    expect(await storage.getItem(reviewLogShardKey('2026-09-30'))).toBeNull();
    expect(await readIndex(storage)).toEqual([reviewLogShardKey('2026-10-02')]);
  });

  it('deleting the rows of a verse with no history changes nothing', async () => {
    const storage = new MapStorageAdapter();
    const log = new ReviewLog(storage);
    await log.append(row({ id: 'r1', verseId: 'v1' }));

    expect(await log.deleteForVerse('v2')).toBe(0);
    expect((await log.listForVerse('v1')).map((r) => r.id)).toEqual(['r1']);
  });

  it('hashes the canonical text so edits and translation switches are detectable', () => {
    expect(hashCanonicalText('Jesus wept.')).toBe(hashCanonicalText('Jesus wept.'));
    expect(hashCanonicalText('Jesus wept.')).not.toBe(hashCanonicalText('Jesus wept!'));
    expect(hashCanonicalText('Jesus chorou.')).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
  });
});
