// ============================================
// PT Workout Tracker - Profile Screen
// ============================================

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../stores/authStore';
import { useClientStore } from '../stores/clientStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { usePlatformStore } from '../stores/platformStore';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { clientToAthleteCard } from '../lib/athleteStatus';
import { fetchAppBadgesForUser } from '../services/platformUsers';
import { coachColors, fonts, borderRadius, spacing, shadows } from '../lib/theme';

const APP_VERSION = '2.1.0';

const ROLE_LABELS: Record<string, string> = {
  pt: 'Head Coach',
  client: 'Klient',
};

const INTEGRATIONS = [
  { id: 'adapt', label: 'M2M Adapt', desc: 'Program, övningar och energisystem' },
  { id: 'timer', label: 'M2M Timer', desc: 'Live-sessioner, set och vilor' },
  { id: 'goalsetter', label: 'M2M Goalsetter', desc: 'Mål, rutiner och säsongsplanering' },
] as const;

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const stackNav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user, signOut, isLoading } = useAuthStore();
  const { clients, fetchClients } = useClientStore();
  const { workouts, fetchAllWorkouts } = useWorkoutStore();
  const { loadForClients, getTimerSessions, getAggregate } = usePlatformStore();
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [sessionAlerts, setSessionAlerts] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<'sv' | 'en'>('sv');
  const [appBadges, setAppBadges] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    (async () => {
      await fetchClients().catch(() => {});
      await fetchAllWorkouts().catch(() => {});
      await loadForClients(
        useClientStore.getState().clients,
        useWorkoutStore.getState().workouts
      ).catch(() => {});
      if (user?.id) {
        const badges = await fetchAppBadgesForUser(user.id).catch(() => null);
        if (badges) setAppBadges(badges);
      }
    })();
  }, [fetchClients, fetchAllWorkouts, loadForClients, user?.id]);

  const activeClients = clients.filter((c) => c.is_active);
  const monthStart = new Date();
  monthStart.setMonth(monthStart.getMonth() - 1);
  const sessionsThisMonth = workouts.filter(
    (w) => new Date(w.date) >= monthStart && w.status === 'completed'
  ).length;

  const avgGoal = useMemo(() => {
    const pcts = activeClients
      .map((c) =>
        clientToAthleteCard(c, workouts, {
          timerSessions: getTimerSessions(c.client_user_id),
          aggregate: getAggregate(c.id),
        }).goalPct
      )
      .filter((p): p is number => p != null);
    if (!pcts.length) return null;
    return Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length);
  }, [activeClients, workouts, getTimerSessions, getAggregate]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Logga ut', 'Är du säker på att du vill logga ut?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Logga ut',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert('Fel', 'Kunde inte logga ut. Försök igen.');
          }
        },
      },
    ]);
  }, [signOut]);

  const handleExportData = useCallback(() => {
    Alert.alert('Kommer snart', 'Denna funktion är under utveckling.');
  }, []);

  const handleDeleteData = useCallback(() => {
    Alert.alert(
      'Radera all data',
      'Är du säker på att du vill radera all din data? Denna åtgärd kan inte ångras och all data kommer att försvinna permanent enligt GDPR.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Radera all data',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Bekräfta radering',
              'Skriv "RADERA" i en framtida version för att bekräfta. Denna funktion är under utveckling.',
              [{ text: 'OK', style: 'default' }]
            );
          },
        },
      ]
    );
  }, []);

  const handleThemeToggle = useCallback((value: boolean) => {
    setDarkMode(value);
    if (!value) {
      Alert.alert('Kommer snart', 'Ljust tema är under utveckling. Dark mode är standard.');
      setDarkMode(true);
    }
  }, []);

  const handleNotificationsToggle = useCallback((value: boolean) => {
    setNotifications(value);
    Alert.alert('Kommer snart', 'Notifikationer är under utveckling.');
  }, []);

  const handleSessionAlertsToggle = useCallback((value: boolean) => {
    setSessionAlerts(value);
    Alert.alert('Kommer snart', 'Sessionsvarningar är under utveckling.');
  }, []);

  const handleAutoSyncToggle = useCallback((value: boolean) => {
    setAutoSync(value);
    Alert.alert('Kommer snart', 'Automatisk synk är under utveckling.');
  }, []);

  const handleLanguageToggle = useCallback(() => {
    Alert.alert('Kommer snart', 'Språkval är under utveckling.');
  }, []);

  const handleUnitsToggle = useCallback(() => {
    Alert.alert('Kommer snart', 'Enhetsval är under utveckling.');
  }, []);

  const handleEditProfile = useCallback(() => {
    Alert.alert('Kommer snart', 'Redigera profil är under utveckling.');
  }, []);

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <ScreenContainer title="Profil" scroll>
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile} activeOpacity={0.75}>
          <Text style={styles.editBtnText}>✎ Redigera</Text>
        </TouchableOpacity>
        <View style={styles.heroRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.profileName}>{user?.full_name ?? 'Okänd användare'}</Text>
            <Text style={styles.profileRole}>
              {user?.role ? ROLE_LABELS[user.role] ?? user.role : '—'} · Mind2Muscle
            </Text>
            <Text style={styles.profileEmail}>{user?.email ?? 'Ingen e-post'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: coachColors.coach }]}>{activeClients.length}</Text>
          <Text style={styles.kpiLbl}>Aktiva atleter</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: coachColors.accent }]}>{sessionsThisMonth}</Text>
          <Text style={styles.kpiLbl}>Sessioner / månad</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiVal}>{avgGoal != null ? `${avgGoal}%` : '—'}</Text>
          <Text style={styles.kpiLbl}>Snitt målstatus</Text>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>App-inställningar</Text>
        <SettingRow
          label="Mörkt läge"
          sub="Coach-appen är alltid i dark mode"
          control={<ToggleSwitch value={darkMode} onValueChange={handleThemeToggle} />}
          isLast={false}
        />
        <SettingRow
          label="Push-notiser"
          sub="Varningar, meddelanden och påminnelser"
          control={<ToggleSwitch value={notifications} onValueChange={handleNotificationsToggle} />}
          isLast={false}
        />
        <SettingRow
          label="Sessionsvarning"
          sub="Avisera när atleter missar sessioner"
          control={<ToggleSwitch value={sessionAlerts} onValueChange={handleSessionAlertsToggle} />}
          isLast={false}
        />
        <SettingRow
          label="Automatisk synk"
          sub="Synka data från Adapt och Timer"
          control={<ToggleSwitch value={autoSync} onValueChange={handleAutoSyncToggle} />}
          isLast={false}
        />
        <TouchableOpacity style={styles.settingRow} onPress={handleLanguageToggle} activeOpacity={0.7}>
          <Text style={styles.settingLabel}>Språk</Text>
          <View style={styles.settingRight}>
            <Text style={styles.settingVal}>
              {selectedLanguage === 'sv' ? 'Svenska' : 'English'}
            </Text>
            <Text style={styles.settingArrow}>›</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingRow, styles.settingRowLast]}
          onPress={handleUnitsToggle}
          activeOpacity={0.7}
        >
          <Text style={styles.settingLabel}>Enhet</Text>
          <View style={styles.settingRight}>
            <Text style={styles.settingVal}>Metrisk (kg, km)</Text>
            <Text style={styles.settingArrow}>›</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>M2M-integrationer</Text>
        {INTEGRATIONS.map((app, index) => {
          const connected = appBadges ? Boolean(appBadges[app.id]) : false;
          const label = appBadges ? (connected ? 'Ansluten' : 'Ej ansluten') : '—';
          return (
            <View
              key={app.id}
              style={[
                styles.settingRow,
                index === INTEGRATIONS.length - 1 && styles.settingRowLast,
              ]}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>{app.label}</Text>
                <Text style={styles.settingSub}>{app.desc}</Text>
              </View>
              <View style={[styles.integrationBadge, !connected && styles.integrationBadgeOff]}>
                <View style={[styles.integrationDot, !connected && styles.integrationDotOff]} />
                <Text style={[styles.integrationText, !connected && styles.integrationTextOff]}>{label}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Konto</Text>
        <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
          <Text style={styles.settingLabel}>E-postadress</Text>
          <View style={styles.settingRight}>
            <Text style={styles.settingVal} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
            <Text style={styles.settingArrow}>›</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => stackNav.navigate('UpdatePassword')}
          activeOpacity={0.7}
        >
          <Text style={styles.settingLabel}>Lösenord</Text>
          <View style={styles.settingRight}>
            <Text style={styles.settingVal}>Uppdatera</Text>
            <Text style={styles.settingArrow}>›</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => navigation.navigate('Screening')}
          activeOpacity={0.7}
        >
          <Text style={styles.settingLabel}>Screening</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow} onPress={handleExportData} activeOpacity={0.7}>
          <Text style={styles.settingLabel}>Exportera coachdata</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingRow, styles.settingRowLast]}
          onPress={handleDeleteData}
          activeOpacity={0.7}
        >
          <View style={styles.settingLeft}>
            <Text style={[styles.settingLabel, styles.dangerText]}>GDPR — Radera data</Text>
            <Text style={styles.settingSub}>Radera permanent all din data</Text>
          </View>
          <Text style={[styles.settingArrow, styles.dangerText]}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleSignOut}
        disabled={isLoading}
        activeOpacity={0.75}
      >
        <Text style={styles.logoutText}>{isLoading ? 'Loggar ut…' : 'Logga ut'}</Text>
      </TouchableOpacity>

      <Text style={styles.versionTag}>M2M Coach v{APP_VERSION} · Build 2026.06</Text>
    </ScreenContainer>
  );
};

function SettingRow({
  label,
  sub,
  control,
  isLast = true,
}: {
  label: string;
  sub?: string;
  control: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.settingRow, isLast && styles.settingRowLast]}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sub ? <Text style={styles.settingSub}>{sub}</Text> : null}
      </View>
      {control}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 20,
    borderRadius: borderRadius.xl,
    backgroundColor: coachColors.glassBgCoach,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.18)',
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.glassCoach,
  },
  heroGlow: {
    position: 'absolute',
    right: -24,
    top: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,212,170,0.18)',
    opacity: 0.35,
  },
  editBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  editBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: coachColors.mutedHi,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: coachColors.coach,
    borderWidth: 3,
    borderColor: coachColors.coach,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...shadows.glowCoach,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: fonts.display,
    fontWeight: '700',
    color: '#000',
  },
  heroInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 72,
  },
  profileName: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.96,
    color: coachColors.fg,
    lineHeight: 24,
  },
  profileRole: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.coach,
    marginTop: 4,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: coachColors.muted,
    marginTop: 6,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    alignItems: 'center',
    ...shadows.glass,
  },
  kpiVal: {
    fontFamily: fonts.display,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 32,
    color: coachColors.fg,
  },
  kpiLbl: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.56,
    color: coachColors.muted,
    marginTop: 5,
    textAlign: 'center',
  },
  settingsSection: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: coachColors.glassBg,
    marginBottom: 12,
  },
  settingsSectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fonts.mono,
    fontSize: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: coachColors.fg,
    fontFamily: fonts.bodyMedium,
  },
  settingSub: {
    fontSize: 11,
    color: coachColors.muted,
    marginTop: 2,
    fontFamily: fonts.body,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
    maxWidth: '55%',
  },
  settingVal: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: coachColors.mutedHi,
    flexShrink: 1,
  },
  settingArrow: {
    fontSize: 18,
    color: coachColors.muted,
    fontWeight: '300',
  },
  integrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: coachColors.coachDim,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.22)',
    flexShrink: 0,
  },
  integrationDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: coachColors.coach,
  },
  integrationText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.54,
    color: coachColors.coach,
  },
  integrationBadgeOff: {
    backgroundColor: coachColors.glassBg,
    borderColor: coachColors.glassBorder,
  },
  integrationDotOff: {
    backgroundColor: coachColors.muted,
  },
  integrationTextOff: {
    color: coachColors.muted,
  },
  dangerText: {
    color: coachColors.danger,
  },
  logoutBtn: {
    width: '100%',
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,69,69,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,69,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  logoutText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: coachColors.danger,
  },
  versionTag: {
    textAlign: 'center',
    paddingTop: 16,
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    color: coachColors.muted,
    marginBottom: 24,
  },
});
