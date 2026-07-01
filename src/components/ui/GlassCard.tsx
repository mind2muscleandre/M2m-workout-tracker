import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { coachColors, borderRadius, shadows } from '../../lib/theme';

export type GlassCardVariant = 'default' | 'coach' | 'accent' | 'alert';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: GlassCardVariant;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}

const variantStyles: Record<GlassCardVariant, ViewStyle> = {
  default: {
    backgroundColor: coachColors.glassBg,
    borderColor: coachColors.glassBorder,
  },
  coach: {
    backgroundColor: coachColors.glassBgCoach,
    borderColor: 'rgba(0,212,170,0.18)',
  },
  accent: {
    backgroundColor: coachColors.glassBgAccent,
    borderColor: 'rgba(247,233,40,0.18)',
  },
  alert: {
    backgroundColor: 'rgba(255,95,31,0.07)',
    borderColor: 'rgba(255,95,31,0.24)',
  },
};

export function GlassCard({
  children,
  variant = 'default',
  style,
  padding = 14,
}: GlassCardProps) {
  const variantStyle = variantStyles[variant];
  const shadow = variant === 'coach' ? shadows.glassCoach : shadows.glass;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.card, variantStyle, shadow, { padding }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.card, variantStyle, shadow, style]}>
      <BlurView intensity={40} tint="dark" style={[styles.blur, { padding }]}>
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
  },
});
