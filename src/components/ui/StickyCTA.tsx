import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { coachColors, fonts, borderRadius } from '../../lib/theme';

export type StickyCTAProps = {
  label: string;
  sublabel?: string;
  locked?: boolean;
  lockedReason?: string;
  onPress?: () => void;
  variant?: 'tab' | 'flush';
  style?: ViewStyle;
};

export function StickyCTA({
  label,
  sublabel,
  locked = false,
  lockedReason,
  onPress,
  variant = 'tab',
  style,
}: StickyCTAProps) {
  const insets = useSafeAreaInsets();
  const bottom =
    variant === 'flush'
      ? Math.max(20, insets.bottom)
      : Math.max(88, 72 + insets.bottom);

  const displayLabel = locked && lockedReason ? lockedReason : label;

  return (
    <View style={[styles.wrap, { bottom }, style]} pointerEvents="box-none">
      <Pressable
        onPress={locked ? undefined : onPress}
        disabled={locked}
        style={({ pressed }) => [
          styles.btn,
          locked ? styles.btnLocked : styles.btnReady,
          pressed && !locked && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: locked }}
      >
        <Text style={[styles.label, locked && styles.labelLocked]}>{displayLabel}</Text>
        {sublabel && !locked ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99,
    maxWidth: 402,
    alignSelf: 'center',
  },
  btn: {
    width: '100%',
    minHeight: 52,
    borderRadius: borderRadius.full,
    paddingHorizontal: 22,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnReady: {
    backgroundColor: coachColors.accent,
  },
  btnLocked: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: coachColors.border,
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#17191C',
  },
  labelLocked: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.44)',
    textAlign: 'center',
    flex: 1,
  },
  sublabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: 'rgba(23,25,28,0.65)',
    textTransform: 'uppercase',
  },
});
