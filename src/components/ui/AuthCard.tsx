import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { coachColors, borderRadius, fonts, shadows } from '../../lib/theme';

interface AuthCardProps {
  title?: string;
  titleAccent?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthCard({
  title = 'M2M',
  titleAccent = 'Coach',
  subtitle = 'DITT PT-NAV · HELA BILDEN AV VARJE ATLET',
  children,
}: AuthCardProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>M</Text>
          </View>
          <Text style={styles.logo}>
            {title}
            {titleAccent ? <Text style={styles.logoAccent}> {titleAccent}</Text> : null}
          </Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        <View style={styles.body}>{children}</View>
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
  logoWrap: {
    width: '100%',
    alignItems: 'center',
  },
  body: {
    width: '100%',
    gap: 16,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: coachColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoMarkText: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '700',
    color: '#17191c',
  },
  logo: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: coachColors.fg,
    textAlign: 'center',
  },
  logoAccent: {
    color: coachColors.accent,
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
