import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { coachColors, colors, borderRadius, fonts, shadows } from '../../lib/theme';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'secondary',
  size = 'md',
  icon,
  disabled,
  loading,
  style,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        size === 'sm' && styles.sm,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#000' : coachColors.fg} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.label,
              size === 'sm' && styles.labelSm,
              isPrimary && styles.labelPrimary,
              isDanger && styles.labelDanger,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function IconButton({
  onPress,
  children,
  size = 36,
  style,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  size?: number;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.iconBtn, { width: size, height: size }, style]}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 38,
    paddingHorizontal: 18,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  sm: {
    height: 30,
    paddingHorizontal: 12,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: coachColors.glassBg,
    borderColor: coachColors.glassBorder,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: coachColors.dangerDim,
    borderColor: 'rgba(255,69,69,0.30)',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: coachColors.fg,
  },
  labelSm: {
    fontSize: 12,
  },
  labelPrimary: {
    color: '#000',
    fontFamily: fonts.bodyBold,
  },
  labelDanger: {
    color: coachColors.orange,
  },
  iconBtn: {
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glass,
  },
});
