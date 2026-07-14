// ============================================
// M2M Coach Design System
// Dark glass + teal coach accent
// ============================================

export const coachColors = {
  bg: '#1a1d21',
  screenBg: '#22262b',
  surface: 'rgba(56,62,69,0.78)',
  surfaceHi: 'rgba(68,75,84,0.82)',
  surfaceSolid: '#3A4048',
  fg: '#FFFFFF',
  muted: 'rgba(255,255,255,0.48)',
  mutedHi: 'rgba(255,255,255,0.74)',
  border: 'rgba(255,255,255,0.08)',
  borderHi: 'rgba(255,255,255,0.17)',
  coach: '#00D4AA',
  coachDim: 'rgba(0,212,170,0.10)',
  coachHi: 'rgba(0,212,170,0.24)',
  accent: '#F7E928',
  accentDim: 'rgba(247,233,40,0.11)',
  accentHi: 'rgba(247,233,40,0.26)',
  orange: '#FF5F1F',
  orangeDim: 'rgba(255,95,31,0.11)',
  danger: '#FF4545',
  dangerDim: 'rgba(255,69,69,0.10)',
  glassBg: 'rgba(48,54,62,0.56)',
  glassBgHi: 'rgba(60,68,78,0.64)',
  glassBgCoach: 'rgba(0,212,170,0.07)',
  glassBgAccent: 'rgba(247,233,40,0.08)',
  glassBorder: 'rgba(255,255,255,0.12)',
  glassBorderHi: 'rgba(255,255,255,0.21)',
  sidebarBg: 'rgba(24,28,34,0.92)',
  panelBg: 'rgba(22,26,32,0.94)',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

/** Backward-compatible aliases used across existing screens */
export const colors = {
  background: coachColors.bg,
  card: coachColors.glassBg,
  cardElevated: coachColors.glassBgHi,
  primary: coachColors.accent,
  primaryLight: '#F9ED4A',
  primaryDark: '#D4C820',
  secondary: coachColors.coach,
  text: coachColors.fg,
  textSecondary: coachColors.muted,
  textTertiary: 'rgba(255,255,255,0.24)',
  border: coachColors.border,
  borderLight: coachColors.borderHi,
  success: '#4ADE80',
  danger: coachColors.danger,
  warning: coachColors.orange,
  info: '#60A5FA',
  inputBg: coachColors.glassBg,
  overlay: coachColors.overlay,
  coach: coachColors.coach,
  accent: coachColors.accent,
  orange: coachColors.orange,
  muted: coachColors.muted,
  mutedHi: coachColors.mutedHi,
  screenBg: coachColors.screenBg,
  glassBg: coachColors.glassBg,
  glassBorder: coachColors.glassBorder,
} as const;

export const categoryColors: Record<string, string> = {
  strength: coachColors.orange,
  power: coachColors.orange,
  conditioning: coachColors.coach,
  mobility: '#5AC8FA',
  injury_prevention: coachColors.accent,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  xs: 5,
  sm: 8,
  md: 12,
  lg: 22,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/** Display: D-DIN Condensed Bold; body: DM Sans per coach.css --font-body */
export const fonts = {
  display: 'DDINCondensedBold',
  displayRegular: 'DDINCondensed',
  din: 'DDIN',
  dinBold: 'DDINBold',
  dinExp: 'DDINExp',
  dinExpBold: 'DDINExpBold',
  displayFallback: 'DMSans_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemiBold: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoRegular: 'JetBrainsMono_400Regular',
} as const;

export const layout = {
  sidebarIcon: 64,
  sidebarFull: 220,
  panelWidth: 340,
  topbarHeight: 56,
  pageHeaderHeight: 60,
  bottomNavMaxWidth: 440,
  tabletBreakpoint: 768,
  panelBreakpoint: 768,
  desktopBreakpoint: 1280,
} as const;

export const shadows = {
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 8,
  },
  glassCoach: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 8,
  },
  glowCoach: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomNav: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

export type AthleteStatus = 'training' | 'recovery' | 'alert' | 'rest' | 'inactive';

export const statusColors: Record<AthleteStatus, { bg: string; text: string; border: string }> = {
  training: { bg: coachColors.coachDim, text: coachColors.coach, border: 'rgba(0,212,170,0.22)' },
  recovery: { bg: coachColors.accentDim, text: coachColors.accent, border: 'rgba(247,233,40,0.20)' },
  alert: { bg: coachColors.orangeDim, text: coachColors.orange, border: 'rgba(255,95,31,0.22)' },
  rest: { bg: 'rgba(255,255,255,0.05)', text: coachColors.muted, border: coachColors.border },
  inactive: { bg: 'rgba(255,255,255,0.03)', text: coachColors.muted, border: coachColors.border },
};

export const statusLabels: Record<AthleteStatus, string> = {
  training: 'Tränar',
  recovery: 'Återhämtning',
  alert: 'Varning',
  rest: 'Vila',
  inactive: 'Inaktiv',
};
