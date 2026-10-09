# 77: Memory Tier

**What to build:**
Replace the per-verse streak count and the 21-day "mastered" badge with the Memory Tier, derived from the verse's current interval:
- Seed: under 7 days, or never officially reviewed;
- Growing: under 30 days;
- Rooted: under 180 days;
- Hidden in the Heart: 180 days or more.

A forgotten verse returns to Seed and never shows "Streak: 0". Verse cards and the delete confirmation show the tier in the verse's language (pt: Semente, Crescendo, Enraizado, Guardado no coração). The daily habit streak banner stays as it is. See spec and CONTEXT.md.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The Verse Engine derives the Memory Tier from the interval, and the 21-day "mastered" check is removed.
- [ ] Verse cards show the tier instead of "Learning (Streak: N)" and the mastered badge.
- [ ] The delete confirmation shows the tier instead of the streak line.
- [ ] Tier names follow the verse language (en/pt).
- [ ] Verse Engine tests cover the thresholds. Home Screen and delete-modal tests cover the display.
