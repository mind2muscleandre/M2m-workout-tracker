// ============================================
// Design System - Dark Theme
// ============================================

export const colors = {
  background: '#0F0F0F',
  card: '#1A1A1A',
  cardElevated: '#222222',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5A4BD1',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  border: '#2C2C2E',
  borderLight: '#3A3A3C',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
  info: '#5AC8FA',
  inputBg: '#1C1C1E',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const categoryColors: Record<string, string> = {
  strength: '#FF3B30',
  power: '#FF9500',
  conditioning: '#34C759',
  mobility: '#5AC8FA',
  injury_prevention: '#AF52DE',
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
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
