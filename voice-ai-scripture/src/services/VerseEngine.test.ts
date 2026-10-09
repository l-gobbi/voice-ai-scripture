import {
  VerseEngine,
  MapStorageAdapter,
  Verse,
  resolveDefaultTranslation,
  getMemoryTier,
  memoryTierLabel,
} from './VerseEngine';
import { isStudyDay } from '../engines/studyDay';
import { evaluateRecitation } from '../engines/recitationEvaluator';
import { hashCanonicalText } from './ReviewLog';

// Instants are built from local components (month is 1-based here) so every test holds in
// any machine time zone. The Study Day rolls over at 04:00 local time.
const at = (year: number, month: number, day: number, hour: number, minute = 0) =>
  new Date(year, month - 1, day, hour, minute);

describe('VerseEngine (Ticket 09)', () => {
  describe('Slice 1: In-Memory / Pluggable Storage & Basic CRUD', () => {
    it('initializes with MapStorageAdapter, adds a verse with default SRS, and retrieves all verses', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const created = await engine.addVerse({
        reference: 'John 3:16',
        text: 'For God so loved the world...',
      });

      expect(created.id).toBeDefined();
      expect(created.reference).toBe('John 3:16');
      expect(created.text).toBe('For God so loved the world...');
      expect(created.srs).toBeDefined();
      expect(created.srs?.streak).toBe(0);
      expect(isStudyDay(created.srs?.nextReviewDate)).toBe(true);

      const all = await engine.getAllVerses();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(created.id);
    });

    it('permits intentional multiple translations of the same reference via addVerse', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const niv = await engine.addVerse({
        reference: 'John 3:16',
        text: 'For God so loved the world that he gave his one and only Son...',
      });

      const esv = await engine.addVerse({
        reference: 'John 3:16',
        text: 'For God so loved the world, that he gave his only Son...',
      });

      expect(niv.id).not.toBe(esv.id);
      const all = await engine.getAllVerses();
      expect(all).toHaveLength(2);
      expect(all.map((v) => v.text)).toEqual([niv.text, esv.text]);
    });

    it('deletes a verse by id', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const v1 = await engine.addVerse({ reference: 'Romans 8:28', text: 'And we know...' });
      const v2 = await engine.addVerse({ reference: 'Philippians 4:13', text: 'I can do all things...' });

      expect(await engine.getAllVerses()).toHaveLength(2);

      await engine.deleteVerse(v1.id);

      const remaining = await engine.getAllVerses();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(v2.id);
    });
  });

  describe('Slice 2: Single-Pass Verse Summary Query', () => {
    it('returns all verses, due verses, and due count in a single pass using domain due predicate', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const now = at(2026, 9, 17, 12, 0);

      // Verse 1: Due in the past (overdue)
      const v1 = await engine.addVerse({ reference: 'John 1:1', text: 'In the beginning...' });
      // Verse 2: Due on the current Study Day
      const v2 = await engine.addVerse({ reference: 'Psalm 23:1', text: 'The Lord is my shepherd...' });
      // Verse 3: Due tomorrow (future)
      const v3 = await engine.addVerse({ reference: 'Proverbs 3:5', text: 'Trust in the Lord...' });

      // Directly adjust dates in storage to simulate schedule states
      const all = await engine.getAllVerses();
      all.find((v) => v.id === v1.id)!.srs!.nextReviewDate = '2026-09-16';
      all.find((v) => v.id === v2.id)!.srs!.nextReviewDate = '2026-09-17';
      all.find((v) => v.id === v3.id)!.srs!.nextReviewDate = '2026-09-18';
      await storage.setItem('verses', JSON.stringify(all));

      const summary = await engine.getVersesSummary(now);

      expect(summary.allVerses).toHaveLength(3);
      expect(summary.dueVerses).toHaveLength(2);
      expect(summary.dueCount).toBe(2);
      expect(summary.dueVerses.map((v) => v.id)).toEqual([v1.id, v2.id]);
    });
  });

  describe('Slice 3: Unified Review Recording & SM-2 Progression', () => {
    it('advances streak and schedules the next review on the next Study Day on a clean recall', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const verse = await engine.addVerse({ reference: '1 John 4:19', text: 'We love because he first loved us.' });
      const now = at(2026, 9, 17, 10, 0);

      const srsResult = await engine.recordReview(verse.id, 'clean', now);

      expect(srsResult.streak).toBe(1);
      expect(srsResult.repetitions).toBe(1);
      expect(srsResult.intervalDays).toBe(1);
      expect(srsResult.nextReviewDate).toBe('2026-09-18');

      const all = await engine.getAllVerses();
      const updated = all.find((v) => v.id === verse.id);
      expect(updated?.srs?.streak).toBe(1);
      expect(updated?.srs?.intervalDays).toBe(1);
      expect(updated?.srs?.nextReviewDate).toBe('2026-09-18');
    });

    it('resets streak to 0 and lowers ease by 0.32 when the verse is forgotten', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const verse = await engine.addVerse({ reference: 'Galatians 5:22', text: 'The fruit of the Spirit...' });
      const now = at(2026, 9, 17, 10, 0);

      // Pre-set streak to 3 in storage
      const all = await engine.getAllVerses();
      all[0].srs = {
        streak: 3,
        repetitions: 3,
        intervalDays: 14,
        easeFactor: 2.5,
        nextReviewDate: '2026-09-17',
      };
      await storage.setItem('verses', JSON.stringify(all));

      const srsResult = await engine.recordReview(verse.id, 'forgotten', now);

      expect(srsResult.streak).toBe(0);
      expect(srsResult.intervalDays).toBe(1);
      expect(srsResult.easeFactor).toBe(2.18);

      const reloaded = await engine.getAllVerses();
      expect(reloaded[0].srs?.streak).toBe(0);
      expect(reloaded[0].srs?.easeFactor).toBe(2.18);
      expect(reloaded[0].srs?.nextReviewDate).toBe('2026-09-18');
    });

    it('handles a forgotten first review of a new verse', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const verse = await engine.addVerse({ reference: 'Psalm 119:105', text: 'Your word is a lamp...' });
      const now = at(2026, 9, 17, 10, 0);

      const srsResult = await engine.recordReview(verse.id, 'forgotten', now);

      expect(srsResult.streak).toBe(0);
      expect(srsResult.passed).toBe(false);
      expect(srsResult.intervalDays).toBe(1);

      const all = await engine.getAllVerses();
      expect(all[0].srs?.streak).toBe(0);
    });

    it('a slip passes and advances the streak while forgotten fails and resets it', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const vSlip = await engine.addVerse({ reference: 'Hebrews 11:1', text: 'Now faith is confidence...' });
      const vForgotten = await engine.addVerse({ reference: 'Hebrews 11:6', text: 'And without faith...' });
      const now = at(2026, 9, 17, 10, 0);

      const slipResult = await engine.recordReview(vSlip.id, 'slip', now);
      const forgottenResult = await engine.recordReview(vForgotten.id, 'forgotten', now);

      expect(slipResult.passed).toBe(true);
      expect(slipResult.streak).toBe(1);
      expect(slipResult.easeFactor).toBe(2.5);

      expect(forgottenResult.passed).toBe(false);
      expect(forgottenResult.streak).toBe(0);
    });

    it('throws when recording review for a non-existent verse', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      await expect(engine.recordReview('non-existent-id', 'clean')).rejects.toThrow('Verse not found');
    });
  });

  describe('Slice 4: Deduplicating Bulk Pack Import', () => {
    it('imports new verses, skips existing references case-insensitively, and returns added count', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      // Pre-add a verse
      await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });

      const packToImport = [
        { reference: 'john 3:16  ', text: 'Different translation text' }, // duplicate (different casing & space)
        { reference: 'Jeremiah 29:11', text: 'For I know the plans...' }, // new
        { reference: 'Philippians 4:6', text: 'Do not be anxious...' }, // new
      ];

      const addedCount = await engine.importVerses(packToImport);

      expect(addedCount).toBe(2);

      const all = await engine.getAllVerses();
      expect(all).toHaveLength(3);

      const references = all.map((v) => v.reference);
      expect(references).toContain('John 3:16');
      expect(references).toContain('Jeremiah 29:11');
      expect(references).toContain('Philippians 4:6');
    });

    it('returns 0 if all verses in the imported pack already exist', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      await engine.addVerse({ reference: 'Genesis 1:1', text: 'In the beginning...' });

      const count = await engine.importVerses([{ reference: 'Genesis 1:1', text: 'Duplicate' }]);
      expect(count).toBe(0);

      const all = await engine.getAllVerses();
      expect(all).toHaveLength(1);
    });

    it('returns empty array gracefully if storage is corrupt', async () => {
      const storage = new MapStorageAdapter();
      await storage.setItem('verses', '{ invalid-json');
      const engine = new VerseEngine(storage);

      const all = await engine.getAllVerses();
      expect(all).toEqual([]);
    });
  });

  describe('Slice 5: Translation Metadata, Defaults, and Update Seam (Ticket 15)', () => {
    it('persists explicit translation passed to addVerse', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const verse = await engine.addVerse({
        reference: 'John 3:16',
        text: 'For God so loved the world...',
        translation: 'KJV',
      });

      expect(verse.translation).toBe('KJV');
      const all = await engine.getAllVerses();
      expect(all[0].translation).toBe('KJV');
    });

    it('defaults translation to WEB for English references when omitted', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const verse = await engine.addVerse({
        reference: 'Romans 8:28',
        text: 'And we know that all things work together for good...',
      });

      expect(verse.translation).toBe('WEB');
    });

    it('defaults translation to ALMEIDA for Portuguese references when omitted', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const verse = await engine.addVerse({
        reference: 'João 3:16',
        text: 'Porque Deus amou o mundo de tal maneira...',
      });

      expect(verse.translation).toBe('ALMEIDA');
    });

    it('allows updateVerse to switch translation and text while preserving SRS progression', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const verse = await engine.addVerse({
        reference: 'John 3:16',
        text: 'Initial text',
        translation: 'WEB',
      });

      // Advance review streak
      await engine.recordReview(verse.id, 'clean');
      const afterReview = (await engine.getAllVerses())[0];
      expect(afterReview.srs?.streak).toBe(1);

      // Update translation and text
      const updated = await engine.updateVerse(verse.id, {
        text: 'Updated KJV text',
        translation: 'KJV',
      });

      expect(updated.text).toBe('Updated KJV text');
      expect(updated.translation).toBe('KJV');
      expect(updated.srs?.streak).toBe(1);

      const all = await engine.getAllVerses();
      expect(all[0].translation).toBe('KJV');
      expect(all[0].srs?.streak).toBe(1);
    });

    it('gracefully falls back for legacy stored verses lacking a translation field', async () => {
      const storage = new MapStorageAdapter();
      // Raw legacy JSON without translation field
      const legacyVerses = [
        {
          id: 'legacy-1',
          reference: 'Philippians 4:13',
          text: 'I can do all things...',
          srs: { streak: 3, intervalDays: 6, easeFactor: 2.5 },
        },
        {
          id: 'legacy-2',
          reference: 'Salmos 23:1',
          text: 'O Senhor é o meu pastor...',
          srs: { streak: 2, intervalDays: 3, easeFactor: 2.5 },
        },
      ];
      await storage.setItem('verses', JSON.stringify(legacyVerses));

      const engine = new VerseEngine(storage);
      const all = await engine.getAllVerses();

      expect(all[0].translation).toBe('WEB');
      expect(all[1].translation).toBe('ALMEIDA');
      expect(all[0].srs?.streak).toBe(3);
    });

    it('exports resolveDefaultTranslation mapping references to canonical translations', () => {
      expect(resolveDefaultTranslation('John 3:16')).toBe('WEB');
      expect(resolveDefaultTranslation('João 3:16')).toBe('ALMEIDA');
      expect(resolveDefaultTranslation('1 Jo 1:9')).toBe('ALMEIDA');
    });

    it('handles updateVerse with empty translation string by falling back to reference default', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const verse = await engine.addVerse({
        reference: 'John 3:16',
        text: 'For God so loved...',
        translation: 'KJV',
      });

      const updated = await engine.updateVerse(verse.id, {
        translation: '',
      });

      expect(updated.translation).toBe('WEB');
    });
  });

  describe('Slice 6: Verse Removal & Deletion Semantics (Ticket 21)', () => {
    it('returns true when deleting an existing verse and removes it from storage', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const v1 = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });
      const v2 = await engine.addVerse({ reference: 'Romans 8:28', text: 'And we know...' });

      const result = await engine.deleteVerse(v1.id);
      expect(result).toBe(true);

      const all = await engine.getAllVerses();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(v2.id);
    });

    it('returns false when verse ID is not found and leaves storage unchanged', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const v1 = await engine.addVerse({ reference: 'Psalm 23:1', text: 'The Lord is my shepherd...' });

      const result = await engine.deleteVerse('non-existent-id-999');
      expect(result).toBe(false);

      const all = await engine.getAllVerses();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(v1.id);
    });

    it('updates getVersesSummary counts and excludes deleted verse from due queue', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const due1 = await engine.addVerse({ reference: 'Salmos 91:1', text: 'Aquele que habita...' });
      const due2 = await engine.addVerse({ reference: 'Filipenses 4:6', text: 'Não andeis ansiosos...' });

      const initialSummary = await engine.getVersesSummary();
      expect(initialSummary.allVerses).toHaveLength(2);
      expect(initialSummary.dueCount).toBe(2);

      const deleted = await engine.deleteVerse(due1.id);
      expect(deleted).toBe(true);

      const updatedSummary = await engine.getVersesSummary();
      expect(updatedSummary.allVerses).toHaveLength(1);
      expect(updatedSummary.dueCount).toBe(1);
      expect(updatedSummary.dueVerses[0].id).toBe(due2.id);
    });

    it('reaches empty repository state cleanly when all verses are deleted', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const soleVerse = await engine.addVerse({ reference: 'Gênesis 1:1', text: 'No princípio...' });
      await engine.deleteVerse(soleVerse.id);

      const summary = await engine.getVersesSummary();
      expect(summary.allVerses).toHaveLength(0);
      expect(summary.dueVerses).toHaveLength(0);
      expect(summary.dueCount).toBe(0);
    });
  });

  describe('Slice 8: Habit Retention Tracking in VerseEngine (Tickets 47 & 65)', () => {
    it('records review activity and updates daily streak in storage', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const v1 = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });

      const day1 = at(2026, 9, 18, 10, 0);
      await engine.recordReview(v1.id, 'clean', day1);

      const dashboard = await engine.getDashboard(day1);
      expect(dashboard.habitStats.currentStreak).toBe(1);
      expect(dashboard.habitStats.completedTodayCount).toBe(1);
      expect(dashboard.habitStats.lastActiveDate).toBe('2026-09-18');
    });

    it('passes wasDue = false when reviewing a non-due verse ahead of schedule', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const now = at(2026, 9, 18, 10, 0);

      const verse = await engine.addVerse({ reference: 'John 3:16', text: 'Text' });
      await engine.updateVerse(verse.id, {
        srs: {
          streak: 1,
          intervalDays: 1,
          easeFactor: 2.5,
          nextReviewDate: '2026-09-19',
          lastScore: 100,
        },
      });

      await engine.recordReview(verse.id, 'clean', now);
      const dashboard = await engine.getDashboard(now);
      expect(dashboard.habitStats.currentStreak).toBe(1);
      expect(dashboard.habitStats.completedTodayCount).toBe(0);
    });
  });

  describe('Slice 9: Deck Import (Ticket 33)', () => {
    it('imports verses with deck tags and skips duplicates', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const existing = await engine.addVerse({
        reference: 'John 3:16',
        text: 'For God so loved...',
        translation: 'WEB',
      });

      const imported = await engine.importDeck('Gospel Basics', [
        { reference: 'John 3:16', text: 'For God so loved...', translation: 'WEB' },
        { reference: 'Romans 10:9', text: 'If you declare with your mouth...', translation: 'WEB' },
      ]);

      expect(imported).toHaveLength(1);
      expect(imported[0].reference).toBe('Romans 10:9');
      expect(imported[0].deck).toBe('Gospel Basics');

      const all = await engine.getAllVerses();
      expect(all).toHaveLength(2);
      expect(all.find((v) => v.reference === 'Romans 10:9')?.deck).toBe('Gospel Basics');
    });
  });

  describe('Slice 10: Review Message Helper', () => {
    it('computes next review message correctly', () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      expect(engine.getNextReviewMessage([])).toBe('Next review due tomorrow');

      const now = at(2026, 9, 18, 10, 0);
      const tomorrowVerse = {
        id: '1',
        reference: 'John 3:16',
        text: 'Text',
        srs: {
          streak: 1,
          intervalDays: 1,
          easeFactor: 2.5,
          nextReviewDate: '2026-09-19',
        },
      };
      expect(engine.getNextReviewMessage([tomorrowVerse as any], now)).toBe(
        'Next review due tomorrow'
      );

      const in3DaysVerse = {
        id: '2',
        reference: 'Romans 8:28',
        text: 'Text',
        srs: {
          streak: 3,
          intervalDays: 3,
          easeFactor: 2.5,
          nextReviewDate: '2026-09-21',
        },
      };
      expect(engine.getNextReviewMessage([in3DaysVerse as any], now)).toBe(
        'Next review due in 3 days'
      );
    });
  });

  describe('Slice 11: Deep VerseEngine Dashboard & Atomic Habit Retention (Ticket 65)', () => {
    it('returns combined verse summary and habit statistics via getDashboard()', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const now = new Date(Date.now() + 1000);

      await engine.addVerse({
        reference: 'John 3:16',
        text: 'For God so loved the world...',
      });

      const dashboard = await engine.getDashboard(now);

      expect(dashboard.summary.allVerses).toHaveLength(1);
      expect(dashboard.summary.dueCount).toBe(1);
      expect(dashboard.habitStats.currentStreak).toBe(0);
      expect(dashboard.habitStats.longestStreak).toBe(0);
      expect(dashboard.habitStats.completedTodayCount).toBe(0);
      expect(dashboard.habitStats.dueCount).toBe(1);
      expect(dashboard.habitStats.totalDueToday).toBe(1);
    });

    it('recordReview() atomically updates SRS schedule and daily habit streak', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const day1 = at(2026, 10, 6, 10, 0);

      const verse = await engine.addVerse({
        reference: 'Romans 8:28',
        text: 'And we know that in all things God works for the good...',
      });

      // Review verse on day 1 with perfect score
      const srsResult = await engine.recordReview(verse.id, 'clean', day1);
      expect(srsResult.passed).toBe(true);
      expect(srsResult.streak).toBe(1);

      // Verify dashboard immediately reflects both updated verse SRS and active streak
      const dashboard = await engine.getDashboard(day1);
      expect(dashboard.summary.dueCount).toBe(0);
      expect(dashboard.habitStats.currentStreak).toBe(1);
      expect(dashboard.habitStats.longestStreak).toBe(1);
      expect(dashboard.habitStats.completedTodayCount).toBe(1);
      expect(dashboard.habitStats.totalDueToday).toBe(1);
    });

    it('tracks streaks across date boundaries (same day, consecutive day, skipped day)', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const day1 = at(2026, 10, 6, 10, 0);
      const day2 = at(2026, 10, 7, 10, 0);
      const day4 = at(2026, 10, 9, 10, 0);

      const v1 = await engine.addVerse({ reference: 'Verse 1', text: 'Text 1' });
      const v2 = await engine.addVerse({ reference: 'Verse 2', text: 'Text 2' });
      const v3 = await engine.addVerse({ reference: 'Verse 3', text: 'Text 3' });

      // Day 1: review v1 and v2 on same day
      await engine.recordReview(v1.id, 'clean', day1);
      const statsSameDay = (await engine.getDashboard(day1)).habitStats;
      expect(statsSameDay.currentStreak).toBe(1);
      expect(statsSameDay.completedTodayCount).toBe(1);

      await engine.recordReview(v2.id, 'clean', day1);
      const statsSameDay2 = (await engine.getDashboard(day1)).habitStats;
      expect(statsSameDay2.currentStreak).toBe(1); // Same day maintains streak
      expect(statsSameDay2.completedTodayCount).toBe(2);

      // Day 2: consecutive day review increments streak
      await engine.recordReview(v3.id, 'clean', day2);
      const statsDay2 = (await engine.getDashboard(day2)).habitStats;
      expect(statsDay2.currentStreak).toBe(2);
      expect(statsDay2.longestStreak).toBe(2);
      expect(statsDay2.completedTodayCount).toBe(1);

      // Day 4: skipped day 3, query shows broken streak (0) while preserving longest (2)
      const statsDay4 = (await engine.getDashboard(day4)).habitStats;
      expect(statsDay4.currentStreak).toBe(0);
      expect(statsDay4.longestStreak).toBe(2);
    });

    it('resetHabit() clears streak data while preserving verses', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const today = at(2026, 10, 6, 10, 0);

      const v = await engine.addVerse({ reference: 'Verse 1', text: 'Text 1' });
      await engine.recordReview(v.id, 'clean', today);

      expect((await engine.getDashboard(today)).habitStats.currentStreak).toBe(1);

      await engine.resetHabit();

      const dashboard = await engine.getDashboard(today);
      expect(dashboard.summary.allVerses).toHaveLength(1);
      expect(dashboard.habitStats.currentStreak).toBe(0);
      expect(dashboard.habitStats.longestStreak).toBe(0);
      expect(dashboard.habitStats.lastActiveDate).toBeNull();
    });
  });
  describe('Slice 12: Study Day Scheduling with a 04:00 Rollover (Ticket 71)', () => {
    const setDueDates = async (
      storage: MapStorageAdapter,
      engine: VerseEngine,
      dueDates: Record<string, string>
    ) => {
      const all = await engine.getAllVerses();
      for (const verse of all) {
        if (dueDates[verse.id] !== undefined) {
          verse.srs = { streak: 1, intervalDays: 1, easeFactor: 2.5, nextReviewDate: dueDates[verse.id] };
        }
      }
      await storage.setItem('verses', JSON.stringify(all));
    };

    const dueIdsAt = async (engine: VerseEngine, now: Date) =>
      (await engine.getVersesSummary(now)).dueVerses.map((v) => v.id);

    it('a verse reviewed at 23:00 with a 1-day interval is due from 04:00 the next morning', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const verse = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });

      const result = await engine.recordReview(verse.id, 'clean', at(2026, 10, 8, 23, 0));

      expect(result.intervalDays).toBe(1);
      expect(result.nextReviewDate).toBe('2026-10-09');
      expect((await engine.getAllVerses())[0].srs?.nextReviewDate).toBe('2026-10-09');
      expect(await dueIdsAt(engine, at(2026, 10, 9, 3, 59))).toEqual([]);
      expect(await dueIdsAt(engine, at(2026, 10, 9, 4, 0))).toEqual([verse.id]);
    });

    it('a review at 01:00 counts as the previous Study Day', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const verse = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });

      const result = await engine.recordReview(verse.id, 'clean', at(2026, 10, 9, 1, 0));

      // Study Day of the review is Oct 8, so a 1-day interval is due on Oct 9 from 04:00.
      expect(result.nextReviewDate).toBe('2026-10-09');
      expect(await dueIdsAt(engine, at(2026, 10, 9, 3, 59))).toEqual([]);
      expect(await dueIdsAt(engine, at(2026, 10, 9, 4, 0))).toEqual([verse.id]);
    });

    it('counts intervals in Study Days from the Study Day of the review', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const verse = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });
      await engine.updateVerse(verse.id, {
        srs: { streak: 1, intervalDays: 1, easeFactor: 2.5, nextReviewDate: '2026-10-08' },
      });

      const result = await engine.recordReview(verse.id, 'clean', at(2026, 10, 9, 2, 30));

      expect(result.intervalDays).toBe(6);
      expect(result.nextReviewDate).toBe('2026-10-14');
    });

    it('a Due Verse is one whose due Study Day is today or earlier', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const overdue = await engine.addVerse({ reference: 'Psalm 23:1', text: 'The Lord is my shepherd...' });
      const today = await engine.addVerse({ reference: 'John 1:1', text: 'In the beginning...' });
      const tomorrow = await engine.addVerse({ reference: 'Proverbs 3:5', text: 'Trust in the Lord...' });
      await setDueDates(storage, engine, {
        [overdue.id]: '2026-10-07',
        [today.id]: '2026-10-09',
        [tomorrow.id]: '2026-10-10',
      });

      // Late on Oct 9 and early on Oct 10 are both still Study Day Oct 9.
      expect(await dueIdsAt(engine, at(2026, 10, 9, 4, 0))).toEqual([overdue.id, today.id]);
      expect(await dueIdsAt(engine, at(2026, 10, 9, 23, 59))).toEqual([overdue.id, today.id]);
      expect(await dueIdsAt(engine, at(2026, 10, 10, 3, 59))).toEqual([overdue.id, today.id]);
      expect(await dueIdsAt(engine, at(2026, 10, 10, 4, 0))).toEqual([overdue.id, today.id, tomorrow.id]);
    });

    it('reads legacy ISO due timestamps as the Study Day they fall in', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const evening = await engine.addVerse({ reference: 'Psalm 23:1', text: 'The Lord is my shepherd...' });
      const smallHours = await engine.addVerse({ reference: 'John 1:1', text: 'In the beginning...' });
      const nextMorning = await engine.addVerse({ reference: 'Proverbs 3:5', text: 'Trust in the Lord...' });
      await setDueDates(storage, engine, {
        [evening.id]: at(2026, 10, 9, 21, 0).toISOString(), // Study Day Oct 9
        [smallHours.id]: at(2026, 10, 10, 2, 0).toISOString(), // still Study Day Oct 9
        [nextMorning.id]: at(2026, 10, 10, 5, 0).toISOString(), // Study Day Oct 10
      });

      expect(await dueIdsAt(engine, at(2026, 10, 9, 3, 59))).toEqual([]);
      expect(await dueIdsAt(engine, at(2026, 10, 9, 5, 0))).toEqual([evening.id, smallHours.id]);
    });

    it('a verse due on the next Study Day is not yet due at 01:00 and does not count as completed', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const verse = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });
      await setDueDates(storage, engine, { [verse.id]: '2026-10-09' });

      const lateNight = at(2026, 10, 9, 1, 0);
      await engine.recordReview(verse.id, 'clean', lateNight);

      expect((await engine.getDashboard(lateNight)).habitStats.completedTodayCount).toBe(0);
    });

    it('recitations at 23:30 and 00:30 count toward the same Study Day', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const v1 = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });
      const v2 = await engine.addVerse({ reference: 'Romans 8:28', text: 'And we know...' });

      await engine.recordReview(v1.id, 'clean', at(2026, 10, 8, 23, 30));
      await engine.recordReview(v2.id, 'clean', at(2026, 10, 9, 0, 30));

      const { habitStats } = await engine.getDashboard(at(2026, 10, 9, 0, 30));
      expect(habitStats.currentStreak).toBe(1);
      expect(habitStats.completedTodayCount).toBe(2);
      expect(habitStats.lastActiveDate).toBe('2026-10-08');
    });

    it("reciting at 00:30 keeps yesterday's habit streak alive", async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const v1 = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });
      const v2 = await engine.addVerse({ reference: 'Romans 8:28', text: 'And we know...' });

      await engine.recordReview(v1.id, 'clean', at(2026, 10, 7, 20, 0));

      // 00:30 on Oct 9 is still Study Day Oct 8, the day after the last activity.
      expect((await engine.getDashboard(at(2026, 10, 9, 0, 30))).habitStats.currentStreak).toBe(1);

      const stats = await engine.recordHabitActivity(v2.id, true, at(2026, 10, 9, 0, 30));
      expect(stats.currentStreak).toBe(2);
      expect(stats.longestStreak).toBe(2);
      expect(stats.lastActiveDate).toBe('2026-10-08');
    });

    it('the habit streak breaks only once a whole Study Day has been missed', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const v1 = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });

      await engine.recordReview(v1.id, 'clean', at(2026, 10, 7, 20, 0));

      expect((await engine.getDashboard(at(2026, 10, 9, 3, 59))).habitStats.currentStreak).toBe(1);
      expect((await engine.getDashboard(at(2026, 10, 9, 4, 0))).habitStats.currentStreak).toBe(0);
    });

    it('the next review message counts Study Days, not 24-hour periods', () => {
      const engine = new VerseEngine(new MapStorageAdapter());
      const dueOn = (nextReviewDate: string): Verse => ({
        id: nextReviewDate,
        reference: 'John 3:16',
        text: 'Text',
        srs: { streak: 1, intervalDays: 1, easeFactor: 2.5, nextReviewDate },
      });

      // 23:00 to the next Study Day is "tomorrow", even though it is only 5 hours away.
      expect(engine.getNextReviewMessage([dueOn('2026-10-09')], at(2026, 10, 8, 23, 0))).toBe(
        'Next review due tomorrow'
      );
      // A stored Study Day is not read as UTC midnight (which would be "tomorrow" west of Greenwich).
      expect(engine.getNextReviewMessage([dueOn('2026-10-11')], at(2026, 10, 9, 22, 0))).toBe(
        'Next review due in 2 days'
      );
      // A legacy timestamp 66 hours ahead falls two Study Days ahead.
      expect(
        engine.getNextReviewMessage([dueOn(at(2026, 10, 10, 23, 0).toISOString())], at(2026, 10, 8, 5, 0))
      ).toBe('Next review due in 2 days');
      // The earliest future Study Day wins; verses due today are not "next".
      expect(
        engine.getNextReviewMessage(
          [dueOn('2026-10-09'), dueOn('2026-10-14'), dueOn('2026-10-12')],
          at(2026, 10, 9, 12, 0)
        )
      ).toBe('Next review due in 3 days');
    });
  });

  describe('Slice 13: Memory Tier (Ticket 77)', () => {
    const withInterval = (intervalDays: number): Verse => ({
      id: `interval-${intervalDays}`,
      reference: 'John 3:16',
      text: 'For God so loved the world...',
      srs: { streak: 3, intervalDays, easeFactor: 2.5, nextReviewDate: '2026-10-09' },
    });

    it('derives the tier from the current interval at the 7, 30 and 180 day thresholds', () => {
      expect(getMemoryTier(withInterval(1))).toBe('seed');
      expect(getMemoryTier(withInterval(6))).toBe('seed');
      expect(getMemoryTier(withInterval(7))).toBe('growing');
      expect(getMemoryTier(withInterval(29))).toBe('growing');
      expect(getMemoryTier(withInterval(30))).toBe('rooted');
      expect(getMemoryTier(withInterval(179))).toBe('rooted');
      expect(getMemoryTier(withInterval(180))).toBe('hidden_in_the_heart');
      expect(getMemoryTier(withInterval(365))).toBe('hidden_in_the_heart');
    });

    it('a verse never officially reviewed is a Seed', async () => {
      const engine = new VerseEngine(new MapStorageAdapter());
      const created = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });

      expect(getMemoryTier(created)).toBe('seed');
      expect(getMemoryTier(withInterval(0))).toBe('seed');
      expect(getMemoryTier({ srs: undefined })).toBe('seed');
    });

    it('the tier ignores the per-verse streak and the due status', () => {
      const rootedWithNoStreak: Verse = {
        ...withInterval(45),
        srs: { streak: 0, intervalDays: 45, easeFactor: 2.5, nextReviewDate: '2026-01-01' },
      };
      expect(getMemoryTier(rootedWithNoStreak)).toBe('rooted');
    });

    it('a forgotten verse returns to Seed', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const verse = await engine.addVerse({ reference: 'Psalm 119:11', text: 'I have hidden your word...' });
      await engine.updateVerse(verse.id, {
        srs: { streak: 8, intervalDays: 200, easeFactor: 2.5, nextReviewDate: '2026-10-09' },
      });
      expect(getMemoryTier((await engine.getAllVerses())[0])).toBe('hidden_in_the_heart');

      await engine.recordReview(verse.id, 'forgotten', at(2026, 10, 9, 10, 0));

      expect(getMemoryTier((await engine.getAllVerses())[0])).toBe('seed');
    });

    it('labels each tier in English and Portuguese', () => {
      expect(memoryTierLabel('seed', 'en')).toBe('Seed');
      expect(memoryTierLabel('growing', 'en')).toBe('Growing');
      expect(memoryTierLabel('rooted', 'en')).toBe('Rooted');
      expect(memoryTierLabel('hidden_in_the_heart', 'en')).toBe('Hidden in the Heart');

      expect(memoryTierLabel('seed', 'pt')).toBe('Semente');
      expect(memoryTierLabel('growing', 'pt')).toBe('Crescendo');
      expect(memoryTierLabel('rooted', 'pt')).toBe('Enraizado');
      expect(memoryTierLabel('hidden_in_the_heart', 'pt')).toBe('Guardado no coração');
    });
  });

  describe('Slice 14: Review Log and Official Review Classification (Ticket 72)', () => {
    const PSALM_23_1 = {
      reference: 'Psalm 23:1',
      text: 'The Lord is my shepherd; I shall not want.',
      translation: 'WEB',
    };

    /** A stored verse whose SRS state (due Study Day, interval, ease) the test sets explicitly. */
    async function storedVerse(
      srs: { intervalDays: number; streak: number; easeFactor: number; nextReviewDate: string },
      verseData = PSALM_23_1
    ) {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const added = await engine.addVerse(verseData);
      const verse = await engine.updateVerse(added.id, { srs });
      return { storage, engine, verse };
    }

    /** Records a recitation of `transcript` through the engine's single attempt operation. */
    function recite(
      engine: VerseEngine,
      verse: Verse,
      level: 1 | 2 | 3,
      transcript: string,
      now: Date,
      extra: { peekedWordPositions?: number[]; clozeRevealCount?: number; durationMs?: number } = {}
    ) {
      const evaluation = evaluateRecitation({
        expectedText: verse.text,
        transcribedText: transcript,
        peekedWordPositions: extra.peekedWordPositions,
      });
      return engine.recordAttempt({
        verseId: verse.id,
        level,
        evaluation,
        recognizer: 'simulated',
        now,
        ...extra,
      });
    }

    const storedSrs = async (engine: VerseEngine) => (await engine.getAllVerses())[0].srs;

    const DUE_TODAY = { intervalDays: 1, streak: 1, easeFactor: 2.5, nextReviewDate: '2026-10-09' };
    const morning = at(2026, 10, 9, 7, 30);

    it('the first Blind Recitation of a Due Verse on a Study Day is an Official Review that moves the schedule', async () => {
      const { engine, verse } = await storedVerse(DUE_TODAY);

      const attempt = await recite(engine, verse, 3, verse.text, morning);

      expect(attempt.kind).toBe('official');
      expect(attempt.srsResult).toMatchObject({ intervalDays: 6, nextReviewDate: '2026-10-15', passed: true });
      expect(attempt.memoryTier).toBe('seed');
      expect(await storedSrs(engine)).toMatchObject({ intervalDays: 6, nextReviewDate: '2026-10-15' });
      expect((await engine.getReviewLog(verse.id)).map((r) => r.kind)).toEqual(['official']);
    });

    it('Practice Again: a second Blind Recitation the same Study Day is a Practice Attempt and leaves the schedule untouched', async () => {
      const { engine, verse } = await storedVerse(DUE_TODAY);
      await recite(engine, verse, 3, verse.text, morning);
      const afterOfficial = await storedSrs(engine);

      const again = await recite(engine, verse, 3, verse.text, at(2026, 10, 9, 7, 35));
      const thirdTime = await recite(engine, verse, 3, verse.text, at(2026, 10, 10, 1, 0)); // still Oct 9's Study Day

      expect(again.kind).toBe('practice');
      expect(thirdTime.kind).toBe('practice');
      expect(again.srsResult).toMatchObject({ intervalDays: 6, nextReviewDate: '2026-10-15', passed: true });
      expect(await storedSrs(engine)).toEqual(afterOfficial);
      expect((await engine.getReviewLog(verse.id)).map((r) => r.kind)).toEqual([
        'official',
        'practice',
        'practice',
      ]);
    });

    it('allows only one Official Review per Study Day even if the verse is due again that day', async () => {
      const { engine, verse } = await storedVerse(DUE_TODAY);
      await recite(engine, verse, 3, verse.text, morning);
      // A scheduler that left the verse due today must still not get a second Official Review.
      await engine.updateVerse(verse.id, {
        srs: { intervalDays: 6, streak: 2, easeFactor: 2.6, nextReviewDate: '2026-10-09' },
      });

      const again = await recite(engine, verse, 3, verse.text, at(2026, 10, 9, 21, 0));

      expect(again.kind).toBe('practice');
      expect((await storedSrs(engine))?.nextReviewDate).toBe('2026-10-09');
    });

    it('a Blind Recitation of a verse that is not yet due is a Practice Attempt', async () => {
      const { engine, verse } = await storedVerse({ ...DUE_TODAY, nextReviewDate: '2026-10-10' });

      const early = await recite(engine, verse, 3, verse.text, morning);

      expect(early.kind).toBe('practice');
      expect(early.srsResult).toMatchObject({ intervalDays: 1, nextReviewDate: '2026-10-10', passed: true });
      expect(await storedSrs(engine)).toMatchObject({ intervalDays: 1, nextReviewDate: '2026-10-10' });
      expect(await engine.getReviewLog(verse.id)).toEqual([
        expect.objectContaining({ kind: 'practice', wasDue: false }),
      ]);
    });

    it('Echo Mode and Cloze Practice recitations are Practice Attempts and keep the day’s Official Review available', async () => {
      const { engine, verse } = await storedVerse(DUE_TODAY);

      const echo = await recite(engine, verse, 1, verse.text, morning);
      const cloze = await recite(engine, verse, 2, verse.text, at(2026, 10, 9, 7, 32), { clozeRevealCount: 2 });
      expect(echo.kind).toBe('practice');
      expect(cloze.kind).toBe('practice');
      expect(await storedSrs(engine)).toMatchObject(DUE_TODAY);

      const blind = await recite(engine, verse, 3, verse.text, at(2026, 10, 9, 7, 34));
      expect(blind.kind).toBe('official');

      expect(
        (await engine.getReviewLog(verse.id)).map((r) => [r.level, r.kind, r.clozeRevealCount])
      ).toEqual([
        [1, 'practice', undefined],
        [2, 'practice', 2],
        [3, 'official', undefined],
      ]);
    });

    it('a verse forgotten today can be officially reviewed again from 04:00 on the next Study Day', async () => {
      const { engine, verse } = await storedVerse(DUE_TODAY);
      const forgotten = await recite(engine, verse, 3, 'I do not remember', morning);
      expect(forgotten).toMatchObject({ kind: 'official', srsResult: { passed: false, nextReviewDate: '2026-10-10' } });

      expect((await recite(engine, verse, 3, verse.text, at(2026, 10, 10, 3, 59))).kind).toBe('practice');
      expect((await recite(engine, verse, 3, verse.text, at(2026, 10, 10, 4, 0))).kind).toBe('official');
    });

    it('a never-reviewed verse is due, so its first Blind Recitation is official', async () => {
      const engine = new VerseEngine(new MapStorageAdapter());
      const verse = await engine.addVerse(PSALM_23_1);

      const first = await recite(engine, verse, 3, verse.text, new Date());

      expect(first.kind).toBe('official');
      expect(first.srsResult.intervalDays).toBe(1);
    });

    it('only Official Reviews advance the daily habit streak', async () => {
      const { engine, verse } = await storedVerse({ ...DUE_TODAY, nextReviewDate: '2026-10-10' });

      await recite(engine, verse, 3, verse.text, morning); // not due: practice
      await recite(engine, verse, 2, verse.text, morning);
      expect((await engine.getHabitStats(morning)).currentStreak).toBe(0);

      await recite(engine, verse, 3, verse.text, at(2026, 10, 10, 8, 0)); // due: official
      const habit = await engine.getHabitStats(at(2026, 10, 10, 8, 0));
      expect(habit.currentStreak).toBe(1);
      expect(habit.completedTodayCount).toBe(1);
    });

    it('logs each attempt with timing, classification, raw outcome, recognizer and scheduling', async () => {
      const { engine, verse } = await storedVerse(DUE_TODAY);
      const transcript = 'The Lord is my good shepherd; I shall not';

      await recite(engine, verse, 3, transcript, morning, { peekedWordPositions: [3], durationMs: 5400 });

      const [entry] = await engine.getReviewLog(verse.id);
      expect(entry).toEqual({
        id: expect.any(String),
        schemaVersion: 1,
        verseId: verse.id,
        reviewedAt: morning.toISOString(),
        utcOffsetMinutes: -morning.getTimezoneOffset(),
        studyDay: '2026-10-09',
        durationMs: 5400,
        kind: 'official',
        level: 3,
        translation: 'WEB',
        textHash: hashCanonicalText(PSALM_23_1.text),
        wordCount: 9,
        correct: 8,
        missed: 1,
        added: 1,
        rawScore: 89,
        peekedWordPositions: [3],
        // "want" missed and "my" peeked: 2 errors against a budget of 1 for 9 words.
        errorCount: 2,
        errorBudget: 1,
        outcome: 'forgotten',
        recognizer: 'simulated',
        wasDue: true,
        gradingRuleId: 'error-budget-5pct@1',
        schedulerId: 'sm2-app@2',
        sm2Quality: 2,
        before: { intervalDays: 1, easeFactor: 2.5 },
        after: { intervalDays: 1, easeFactor: 2.18 },
        dueStudyDayAfter: '2026-10-10',
      });
    });

    it('an Official Review gives SM-2 quality 5, 4 or 2 for a clean recall, a slip or a forgotten verse', async () => {
      const graded = async (transcript: string) => {
        const { engine, verse } = await storedVerse(DUE_TODAY);
        const attempt = await recite(engine, verse, 3, transcript, morning);
        const [row] = await engine.getReviewLog(verse.id);
        return { attempt, row, stored: await storedSrs(engine) };
      };

      const clean = await graded(PSALM_23_1.text);
      const slip = await graded('The Lord is my pastor; I shall not want.');
      const forgotten = await graded('The Lord is my shepherd');

      expect(clean.attempt.srsResult).toMatchObject({ passed: true, streak: 2, intervalDays: 6, easeFactor: 2.6 });
      expect(clean.row).toMatchObject({ outcome: 'clean', errorCount: 0, errorBudget: 1, sm2Quality: 5 });

      expect(slip.attempt.srsResult).toMatchObject({ passed: true, streak: 2, intervalDays: 6, easeFactor: 2.5 });
      expect(slip.row).toMatchObject({ outcome: 'slip', errorCount: 1, errorBudget: 1, sm2Quality: 4 });

      expect(forgotten.attempt.srsResult).toMatchObject({
        passed: false,
        streak: 0,
        intervalDays: 1,
        easeFactor: 2.18,
        nextReviewDate: '2026-10-10',
      });
      expect(forgotten.row).toMatchObject({ outcome: 'forgotten', errorCount: 4, errorBudget: 1, sm2Quality: 2 });
      expect(forgotten.stored).toMatchObject({ streak: 0, intervalDays: 1, easeFactor: 2.18, nextReviewDate: '2026-10-10' });
      expect(forgotten.attempt.memoryTier).toBe('seed');
    });

    it('a Practice Attempt logs its grade with no SM-2 quality and leaves the schedule and ease alone', async () => {
      const { engine, verse } = await storedVerse({ ...DUE_TODAY, nextReviewDate: '2026-10-10' });

      const early = await recite(engine, verse, 3, 'The Lord is my shepherd', morning);

      expect(early.kind).toBe('practice');
      expect(early.srsResult).toMatchObject({ passed: false, intervalDays: 1, easeFactor: 2.5, nextReviewDate: '2026-10-10' });
      expect(await storedSrs(engine)).toMatchObject({ intervalDays: 1, streak: 1, easeFactor: 2.5 });
      const [row] = await engine.getReviewLog(verse.id);
      expect(row).toMatchObject({
        kind: 'practice',
        outcome: 'forgotten',
        errorCount: 4,
        errorBudget: 1,
        sm2Quality: null,
        before: { intervalDays: 1, easeFactor: 2.5 },
        after: { intervalDays: 1, easeFactor: 2.5 },
      });
    });

    it('a forgotten Official Review still counts toward the daily habit streak', async () => {
      const { engine, verse } = await storedVerse(DUE_TODAY);

      const forgotten = await recite(engine, verse, 3, 'I do not remember', morning);

      expect(forgotten.kind).toBe('official');
      const habit = await engine.getHabitStats(morning);
      expect(habit.currentStreak).toBe(1);
      expect(habit.completedTodayCount).toBe(1);
    });

    it('keeps the raw F1 score as the verse’s last score for display', async () => {
      const { engine, verse } = await storedVerse(DUE_TODAY);

      await recite(engine, verse, 3, 'The Lord is my pastor; I shall not want.', morning);

      const [stored] = await engine.getAllVerses();
      expect(stored.lastScore).toBe(89);
      expect(stored.srs?.lastScore).toBe(89);
    });

    it('gives every row its own id', async () => {
      const { engine, verse } = await storedVerse(DUE_TODAY);
      await recite(engine, verse, 3, verse.text, morning);
      await recite(engine, verse, 3, verse.text, morning);

      const ids = (await engine.getReviewLog(verse.id)).map((r) => r.id);
      expect(new Set(ids).size).toBe(2);
    });

    it('keeps the Review Log out of the verses record', async () => {
      const { storage, engine, verse } = await storedVerse({ ...DUE_TODAY, nextReviewDate: '2026-10-10' });
      const versesBefore = await storage.getItem('verses');

      await recite(engine, verse, 3, verse.text, morning);
      await recite(engine, verse, 1, verse.text, morning);

      expect(await storage.getItem('verses')).toBe(versesBefore);
      expect(await engine.getReviewLog(verse.id)).toHaveLength(2);
    });

    it('deleting a verse deletes its Review Log rows and keeps other verses’ rows', async () => {
      const { engine, verse } = await storedVerse(DUE_TODAY);
      const other = await engine.addVerse({ reference: 'John 11:35', text: 'Jesus wept.' });
      await recite(engine, verse, 3, verse.text, morning);
      await recite(engine, verse, 3, verse.text, at(2026, 11, 2, 8, 0)); // another month's shard
      await recite(engine, other, 3, other.text, morning);

      expect(await engine.deleteVerse(verse.id)).toBe(true);

      expect(await engine.getReviewLog(verse.id)).toEqual([]);
      expect(await engine.getReviewLog(other.id)).toHaveLength(1);
    });

    it('rejects an attempt for a verse that is not stored', async () => {
      const engine = new VerseEngine(new MapStorageAdapter());
      const ghost: Verse = { id: 'ghost', ...PSALM_23_1 };

      await expect(recite(engine, ghost, 3, ghost.text, morning)).rejects.toThrow('Verse not found');
      expect(await engine.getReviewLog('ghost')).toEqual([]);
    });
  });
});
