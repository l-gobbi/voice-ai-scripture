import { ColorSchemeName, Platform } from 'react-native';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accentSacred: string;
  diffMatchText: string;
  diffMatchBg: string;
  diffMissedText: string;
  diffMissedBg: string;
  diffAddedText: string;
  diffAddedBg: string;
}

export const colors: {
  parchment: ThemeColors;
  sanctuary: ThemeColors;
} = {
  parchment: {
    background: '#FAF8F5',
    surface: '#FFFFFF',
    surfaceMuted: '#F3EFEA',
    textPrimary: '#1C1917',
    textSecondary: '#78716C',
    border: '#E7E5E4',
    accentSacred: '#D97706',
    diffMatchText: '#15803D',
    diffMatchBg: '#DCFCE7',
    diffMissedText: '#B91C1C',
    diffMissedBg: '#FEE2E2',
    diffAddedText: '#B45309',
    diffAddedBg: '#FEF3C7',
  },
  sanctuary: {
    background: '#121214',
    surface: '#1C1C20',
    surfaceMuted: '#27272A',
    textPrimary: '#F5F5F4',
    textSecondary: '#A1A1AA',
    border: '#2E2E33',
    accentSacred: '#F59E0B',
    diffMatchText: '#4ADE80',
    diffMatchBg: '#052E16',
    diffMissedText: '#F87171',
    diffMissedBg: '#450A0A',
    diffAddedText: '#FBBF24',
    diffAddedBg: '#451A03',
  },
};

export const typography = {
  fontFamily: {
    scripture: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    ui: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  },
  scriptureHero: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 22,
    lineHeight: 34,
    fontWeight: '400' as const,
  },
  scriptureBody: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400' as const,
  },
  scriptureCloze: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '500' as const,
  },
  heading: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700' as const,
  },
  subheading: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  body: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  caption: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  badge: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md_sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 18,
  pill: 9999,
};

export const touchTarget = {
  min: 44,
  hero: 64,
};

export function getTheme(scheme?: ColorSchemeName | null): {
  isDark: boolean;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  touchTarget: typeof touchTarget;
} {
  const isDark = scheme === 'dark';
  return {
    isDark,
    colors: isDark ? colors.sanctuary : colors.parchment,
    typography,
    spacing,
    radius,
    touchTarget,
  };
}

