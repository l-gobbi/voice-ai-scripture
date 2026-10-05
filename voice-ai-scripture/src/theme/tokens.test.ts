import {
  typography,
  spacing,
  radius,
  touchTarget,
  colors,
  getTheme,
  ThemeColors,
} from './tokens';

describe('Design Tokens', () => {
  describe('Typography', () => {
    it('provides system serif for scripture and system sans-serif for UI', () => {
      expect(typography.fontFamily.scripture).toBeDefined();
      expect(typography.fontFamily.ui).toBeDefined();
    });

    it('defines comfortable reading scale for scripture passages', () => {
      expect(typography.scriptureHero.fontSize).toBe(22);
      expect(typography.scriptureHero.lineHeight).toBeGreaterThanOrEqual(32);
      expect(typography.scriptureBody.fontSize).toBe(18);
      expect(typography.scriptureBody.lineHeight).toBeGreaterThanOrEqual(26);
    });
  });

  describe('Spacing & Dimensions', () => {
    it('follows an 8pt/4pt modular rhythm', () => {
      expect(spacing.xs).toBe(4);
      expect(spacing.sm).toBe(8);
      expect(spacing.md).toBe(16);
      expect(spacing.lg).toBe(24);
      expect(spacing.xl).toBe(32);
    });

    it('enforces minimum 44pt touch target', () => {
      expect(touchTarget.min).toBe(44);
      expect(touchTarget.hero).toBe(64);
    });
  });

  describe('Color Palettes & getTheme', () => {
    it('provides both parchment and sanctuary palettes', () => {
      expect(colors.parchment.background).toBe('#FAF8F5');
      expect(colors.sanctuary.background).toBe('#121214');
    });

    it('returns parchment theme when light or undefined scheme', () => {
      const lightTheme = getTheme('light');
      expect(lightTheme.isDark).toBe(false);
      expect(lightTheme.colors.background).toBe('#FAF8F5');
      expect(lightTheme.colors.textPrimary).toBe('#1C1917');

      const defaultTheme = getTheme();
      expect(defaultTheme.isDark).toBe(false);
      expect(defaultTheme.colors.background).toBe('#FAF8F5');
    });

    it('returns sanctuary theme when dark scheme is passed', () => {
      const darkTheme = getTheme('dark');
      expect(darkTheme.isDark).toBe(true);
      expect(darkTheme.colors.background).toBe('#121214');
      expect(darkTheme.colors.textPrimary).toBe('#F5F5F4');
    });

    it('contains all essential semantic keys in both palettes', () => {
      const checkPalette = (c: ThemeColors) => {
        expect(c.background).toBeDefined();
        expect(c.surface).toBeDefined();
        expect(c.surfaceMuted).toBeDefined();
        expect(c.textPrimary).toBeDefined();
        expect(c.textSecondary).toBeDefined();
        expect(c.border).toBeDefined();
        expect(c.accentSacred).toBeDefined();
        expect(c.diffMatchText).toBeDefined();
        expect(c.diffMatchBg).toBeDefined();
        expect(c.diffMissedText).toBeDefined();
        expect(c.diffMissedBg).toBeDefined();
        expect(c.diffAddedText).toBeDefined();
        expect(c.diffAddedBg).toBeDefined();
      };

      checkPalette(colors.parchment);
      checkPalette(colors.sanctuary);
    });
  });
});
