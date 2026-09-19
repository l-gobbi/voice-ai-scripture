import { VerseEngine, MapStorageAdapter, Verse, resolveDefaultTranslation } from './VerseEngine';

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
      expect(created.srs?.nextReviewDate).toBeDefined();

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

      const now = new Date('2026-09-17T12:00:00.000Z');

      // Verse 1: Due in the past (overdue)
      const v1 = await engine.addVerse({ reference: 'John 1:1', text: 'In the beginning...' });
      // Verse 2: Due exactly now
      const v2 = await engine.addVerse({ reference: 'Psalm 23:1', text: 'The Lord is my shepherd...' });
      // Verse 3: Due tomorrow (future)
      const v3 = await engine.addVerse({ reference: 'Proverbs 3:5', text: 'Trust in the Lord...' });

      // Directly adjust dates in storage to simulate schedule states
      const all = await engine.getAllVerses();
      all.find((v) => v.id === v1.id)!.srs!.nextReviewDate = new Date('2026-09-16T12:00:00.000Z').toISOString();
      all.find((v) => v.id === v2.id)!.srs!.nextReviewDate = new Date('2026-09-17T12:00:00.000Z').toISOString();
      all.find((v) => v.id === v3.id)!.srs!.nextReviewDate = new Date('2026-09-18T12:00:00.000Z').toISOString();
      await storage.setItem('verses', JSON.stringify(all));

      const summary = await engine.getVersesSummary(now);

      expect(summary.allVerses).toHaveLength(3);
      expect(summary.dueVerses).toHaveLength(2);
      expect(summary.dueCount).toBe(2);
      expect(summary.dueVerses.map((v) => v.id)).toEqual([v1.id, v2.id]);
    });
  });

  describe('Slice 3: Unified Review Recording & SM-2 Progression', () => {
    it('advances streak and calculates next review on passing score', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const verse = await engine.addVerse({ reference: '1 John 4:19', text: 'We love because he first loved us.' });
      const now = new Date('2026-09-17T10:00:00.000Z');

      const srsResult = await engine.recordReview(verse.id, 100, now);

      expect(srsResult.streak).toBe(1);
      expect(srsResult.repetitions).toBe(1);
      expect(srsResult.intervalDays).toBe(1);
      expect(srsResult.nextReviewDate).toEqual(new Date('2026-09-18T10:00:00.000Z'));

      const all = await engine.getAllVerses();
      const updated = all.find((v) => v.id === verse.id);
      expect(updated?.srs?.streak).toBe(1);
      expect(updated?.srs?.intervalDays).toBe(1);
      expect(updated?.srs?.nextReviewDate).toBe(new Date('2026-09-18T10:00:00.000Z').toISOString());
    });

    it('resets streak to 0 on failing score', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const verse = await engine.addVerse({ reference: 'Galatians 5:22', text: 'The fruit of the Spirit...' });
      const now = new Date('2026-09-17T10:00:00.000Z');

      // Pre-set streak to 3 in storage
      const all = await engine.getAllVerses();
      all[0].srs = {
        streak: 3,
        repetitions: 3,
        intervalDays: 14,
        easeFactor: 2.5,
        nextReviewDate: now.toISOString(),
      };
      await storage.setItem('verses', JSON.stringify(all));

      // Record a failing score (e.g. 50% or 0)
      const srsResult = await engine.recordReview(verse.id, 50, now);

      expect(srsResult.streak).toBe(0);
      expect(srsResult.intervalDays).toBe(1);

      const reloaded = await engine.getAllVerses();
      expect(reloaded[0].srs?.streak).toBe(0);
    });

    it('handles binary manual review failure with score = 0', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const verse = await engine.addVerse({ reference: 'Psalm 119:105', text: 'Your word is a lamp...' });
      const now = new Date('2026-09-17T10:00:00.000Z');

      const srsResult = await engine.recordReview(verse.id, 0, now);

      expect(srsResult.streak).toBe(0);
      expect(srsResult.passed).toBe(false);
      expect(srsResult.intervalDays).toBe(1);

      const all = await engine.getAllVerses();
      expect(all[0].srs?.streak).toBe(0);
    });

    it('evaluates passing threshold accurately at score = 80 (pass) vs 79 (fail)', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const vPass = await engine.addVerse({ reference: 'Hebrews 11:1', text: 'Now faith is confidence...' });
      const vFail = await engine.addVerse({ reference: 'Hebrews 11:6', text: 'And without faith...' });
      const now = new Date('2026-09-17T10:00:00.000Z');

      const passResult = await engine.recordReview(vPass.id, 80, now);
      const failResult = await engine.recordReview(vFail.id, 79, now);

      expect(passResult.passed).toBe(true);
      expect(passResult.streak).toBe(1);

      expect(failResult.passed).toBe(false);
      expect(failResult.streak).toBe(0);
    });

    it('throws when recording review for a non-existent verse', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      await expect(engine.recordReview('non-existent-id', 100)).rejects.toThrow('Verse not found');
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
      await engine.recordReview(verse.id, 100);
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

  describe('Slice 8: Global Daily Streak Engine & Habit Stats (Ticket 30)', () => {
    it('initializes with 0 streak and 0 completed reviews', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const stats = await engine.getHabitStats();
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(0);
      expect(stats.lastActiveDate).toBeNull();
      expect(stats.completedTodayCount).toBe(0);
      expect(stats.dueCount).toBe(0);
      expect(stats.totalDueToday).toBe(0);
    });

    it('increments streak to 1 on first recorded review and tracks completed today count', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const v1 = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });

      const day1 = new Date('2026-09-18T10:00:00Z');
      await engine.recordReview(v1.id, 100, day1);

      const stats = await engine.getHabitStats(day1);
      expect(stats.currentStreak).toBe(1);
      expect(stats.longestStreak).toBe(1);
      expect(stats.lastActiveDate).toBe('2026-09-18');
      expect(stats.completedTodayCount).toBe(1);
    });

    it('maintains streak on multiple reviews on the same calendar day', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const v1 = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });
      const v2 = await engine.addVerse({ reference: 'Romans 8:28', text: 'And we know...' });

      const day1Morning = new Date('2026-09-18T09:00:00Z');
      await engine.recordReview(v1.id, 100, day1Morning);

      const day1Evening = new Date('2026-09-18T19:00:00Z');
      await engine.recordReview(v2.id, 95, day1Evening);

      const stats = await engine.getHabitStats(day1Evening);
      expect(stats.currentStreak).toBe(1);
      expect(stats.longestStreak).toBe(1);
      expect(stats.completedTodayCount).toBe(2);
    });

    it('increments streak on consecutive calendar days', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const v1 = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });

      const day1 = new Date('2026-09-18T10:00:00Z');
      await engine.recordReview(v1.id, 100, day1);

      const day2 = new Date('2026-09-19T10:00:00Z');
      await engine.recordReview(v1.id, 100, day2);

      const stats = await engine.getHabitStats(day2);
      expect(stats.currentStreak).toBe(2);
      expect(stats.longestStreak).toBe(2);
      expect(stats.lastActiveDate).toBe('2026-09-19');
      expect(stats.completedTodayCount).toBe(1);
    });

    it('reports streak as 0 when a calendar day is missed, resetting to 1 upon next review', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);
      const v1 = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });

      const day1 = new Date('2026-09-18T10:00:00Z');
      await engine.recordReview(v1.id, 100, day1);

      const day2 = new Date('2026-09-19T10:00:00Z');
      await engine.recordReview(v1.id, 100, day2);

      // Missed 2026-09-20. Checking on 2026-09-21:
      const day4 = new Date('2026-09-21T10:00:00Z');
      const brokenStats = await engine.getHabitStats(day4);
      expect(brokenStats.currentStreak).toBe(0);
      expect(brokenStats.longestStreak).toBe(2);

      // User performs a review on day 4:
      await engine.recordReview(v1.id, 100, day4);
      const renewedStats = await engine.getHabitStats(day4);
      expect(renewedStats.currentStreak).toBe(1);
      expect(renewedStats.longestStreak).toBe(2);
      expect(renewedStats.lastActiveDate).toBe('2026-09-21');
    });

    it('calculates totalDueToday based on completed today plus current due count', async () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const v1 = await engine.addVerse({ reference: 'John 3:16', text: 'For God so loved...' });
      const v2 = await engine.addVerse({ reference: 'Romans 8:28', text: 'And we know...' });

      // Both are due immediately upon creation:
      const initialStats = await engine.getHabitStats();
      expect(initialStats.dueCount).toBe(2);
      expect(initialStats.completedTodayCount).toBe(0);
      expect(initialStats.totalDueToday).toBe(2);

      // Review v1:
      await engine.recordReview(v1.id, 100);
      const postStats = await engine.getHabitStats();
      expect(postStats.completedTodayCount).toBe(1);
      expect(postStats.dueCount).toBe(1);
      expect(postStats.totalDueToday).toBe(2);
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

  describe('Slice 10: Review Message and Mastery Status Helpers', () => {
    it('computes next review message correctly', () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      expect(engine.getNextReviewMessage([])).toBe('Next review due tomorrow');

      const now = new Date('2026-09-18T10:00:00Z');
      const tomorrowVerse = {
        id: '1',
        reference: 'John 3:16',
        text: 'Text',
        srs: {
          streak: 1,
          intervalDays: 1,
          easeFactor: 2.5,
          nextReviewDate: '2026-09-19T10:00:00Z',
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
          nextReviewDate: '2026-09-21T10:00:00Z',
        },
      };
      expect(engine.getNextReviewMessage([in3DaysVerse as any], now)).toBe(
        'Next review due in 3 days'
      );
    });

    it('determines verse mastery based on interval threshold and due status', () => {
      const storage = new MapStorageAdapter();
      const engine = new VerseEngine(storage);

      const masteredVerse = {
        id: '1',
        reference: 'John 3:16',
        text: 'Text',
        srs: { streak: 5, intervalDays: 25, easeFactor: 2.5, nextReviewDate: '' },
      };
      expect(engine.isVerseMastered(masteredVerse as any, false)).toBe(true);
      expect(engine.isVerseMastered(masteredVerse as any, true)).toBe(false);

      const learningVerse = {
        id: '2',
        reference: 'John 3:16',
        text: 'Text',
        srs: { streak: 2, intervalDays: 6, easeFactor: 2.5, nextReviewDate: '' },
      };
      expect(engine.isVerseMastered(learningVerse as any, false)).toBe(false);
    });
  });
});


