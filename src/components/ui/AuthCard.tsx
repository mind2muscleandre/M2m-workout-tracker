import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { coachColors, borderRadius, fonts, shadows } from '../../lib/theme';

interface AuthCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthCard({ title = 'M2M COACH', subtitle, children }: AuthCardProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.logo}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: coachColors.bg,
    minHeight: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 28,
    borderRadius: borderRadius.xl,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    ...shadows.glass,
    gap: 16,
  },
  logo: {
    fontFamily: fonts.display,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
    color: coachColors.coach,
    textAlign: 'center',
  },
  sub: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: coachColors.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
});
