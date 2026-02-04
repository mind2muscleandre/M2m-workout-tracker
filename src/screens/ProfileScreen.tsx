// ============================================
// PT Workout Tracker - Profile Screen
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { useAuthStore } from '../stores/authStore';
import type { MainTabParamList } from '../navigation/types';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ============================================
// Constants
// ============================================

const APP_VERSION = '1.0.0';

const ROLE_LABELS: Record<string, string> = {
  pt: 'Personal Trainer',
  client: 'Klient',
};

// ============================================
// Component
// ============================================

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

export const ProfileScreen: React.FC<Props> = () => {
  // ---- Store ----
  const { user, signOut, isLoading } = useAuthStore();

  // ---- Placeholder State ----
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<'sv' | 'en'>('sv');

  // ---- Sign Out Handler ----
  const handleSignOut = useCallback(() => {
    Alert.alert('Logga ut', 'Ar du saker pa att du vill logga ut?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Logga ut',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert('Fel', 'Kunde inte logga ut. Forsok igen.');
          }
        },
      },
    ]);
  }, [signOut]);

  // ---- Export Data Handler ----
  const handleExportData = useCallback(() => {
    Alert.alert('Kommer snart', 'Denna funktion ar under utveckling.');
  }, []);

  // ---- Delete Data Handler ----
  const handleDeleteData = useCallback(() => {
    Alert.alert(
      'Radera all data',
      'Ar du saker pa att du vill radera all din data? Denna atgard kan inte angras och all data kommer att forsvinna permanent enligt GDPR.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Radera all data',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Bekrafta radering',
              'Skriv "RADERA" i en framtida version for att bekrafta. Denna funktion ar under utveckling.',
              [{ text: 'OK', style: 'default' }]
            );
          },
        },
      ]
    );
  }, []);

  // ---- Theme Toggle (placeholder) ----
  const handleThemeToggle = useCallback((value: boolean) => {
    setDarkMode(value);
    if (!value) {
      Alert.alert('Kommer snart', 'Ljust tema ar under utveckling. Dark mode ar standard.');
      setDarkMode(true);
    }
  }, []);

  // ---- Notifications Toggle (placeholder) ----
  const handleNotificationsToggle = useCallback((value: boolean) => {
    setNotifications(value);
    Alert.alert('Kommer snart', 'Notifikationer ar under utveckling.');
  }, []);

  // ---- Language Toggle (placeholder) ----
  const handleLanguageToggle = useCallback(() => {
    Alert.alert('Kommer snart', 'Sprakval ar under utveckling.');
  }, []);

  // ============================================
  // Render
  // ============================================

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Header ---- */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profil</Text>
        </View>

        {/* ---- User Info Section ---- */}
        <View style={styles.section}>
          <View style={styles.userInfoCard}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.full_name
                  ? user.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : '??'}
              </Text>
            </View>

            {/* Name & Email */}
            <View style={styles.userInfoTextContainer}>
              <Text style={styles.userName}>
                {user?.full_name ?? 'Okand anvandare'}
              </Text>
              <Text style={styles.userEmail}>
                {user?.email ?? 'Ingen e-post'}
              </Text>
            </View>

            {/* Role Badge */}
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {user?.role ? ROLE_LABELS[user.role] ?? user.role : '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* ---- Settings Section ---- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Installningar</Text>

          {/* Theme Toggle */}
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingRowLeft}>
                <Text style={styles.settingIcon}>{'\uD83C\uDF19'}</Text>
                <View>
                  <Text style={styles.settingLabel}>Morkt tema</Text>
                  <Text style={styles.settingDescription}>
                    Dark mode ar aktiverat som standard
                  </Text>
                </View>
              </View>
              <Switch
                value={darkMode}
                onValueChange={handleThemeToggle}
                trackColor={{
                  false: '#2C2C2E',
                  true: '#F7E928' + '60',
                }}
                thumbColor={darkMode ? '#F7E928' : '#8E8E93'}
              />
            </View>

            <View style={styles.settingDivider} />

            {/* Notifications Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingRowLeft}>
                <Text style={styles.settingIcon}>{'\uD83D\uDD14'}</Text>
                <View>
                  <Text style={styles.settingLabel}>Notifikationer</Text>
                  <Text style={styles.settingDescription}>
                    Paminnelser om pass och uppdateringar
                  </Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={handleNotificationsToggle}
                trackColor={{
                  false: '#2C2C2E',
                  true: '#F7E928' + '60',
                }}
                thumbColor={notifications ? '#F7E928' : '#8E8E93'}
              />
            </View>

            <View style={styles.settingDivider} />

            {/* Language Selector */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleLanguageToggle}
              activeOpacity={0.7}
            >
              <View style={styles.settingRowLeft}>
                <Text style={styles.settingIcon}>{'\uD83C\uDF10'}</Text>
                <View>
                  <Text style={styles.settingLabel}>Sprak</Text>
                  <Text style={styles.settingDescription}>
                    {selectedLanguage === 'sv' ? 'Svenska' : 'English'}
                  </Text>
                </View>
              </View>
              <Text style={styles.settingChevron}>{'\u203A'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ---- Data Section ---- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>

          <View style={styles.settingsCard}>
            {/* Export Data */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleExportData}
              activeOpacity={0.7}
            >
              <View style={styles.settingRowLeft}>
                <Text style={styles.settingIcon}>{'\uD83D\uDCE4'}</Text>
                <View>
                  <Text style={styles.settingLabel}>Exportera data</Text>
                  <Text style={styles.settingDescription}>
                    Ladda ner all din data som fil
                  </Text>
                </View>
              </View>
              <Text style={styles.settingChevron}>{'\u203A'}</Text>
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            {/* GDPR Delete */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleDeleteData}
              activeOpacity={0.7}
            >
              <View style={styles.settingRowLeft}>
                <Text style={styles.settingIcon}>{'\uD83D\uDDD1\uFE0F'}</Text>
                <View>
                  <Text style={[styles.settingLabel, styles.dangerText]}>
                    GDPR - Radera data
                  </Text>
                  <Text style={styles.settingDescription}>
                    Radera permanent all din data
                  </Text>
                </View>
              </View>
              <Text style={[styles.settingChevron, styles.dangerText]}>
                {'\u203A'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ---- App Info Section ---- */}
        <View style={styles.section}>
          <View style={styles.appInfoContainer}>
            <View style={styles.appLogoSmall}>
              <Text style={styles.appLogoText}>M2M</Text>
            </View>
            <Text style={styles.appName}>M2M Workout Tracker</Text>
            <Text style={styles.appVersion}>Version {APP_VERSION}</Text>
          </View>
        </View>

        {/* ---- Sign Out Button ---- */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Text style={styles.signOutButtonText}>
              {isLoading ? 'Loggar ut...' : 'Logga ut'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ---- Header ----
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ---- Sections ----
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ---- User Info Card ----
  userInfoCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F7E928',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfoTextContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    color: '#8E8E93',
  },
  roleBadge: {
    backgroundColor: '#F7E928' + '20',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FBF47A',
  },

  // ---- Settings Card ----
  settingsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 60,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 12,
  },
  settingIcon: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  settingChevron: {
    fontSize: 24,
    color: '#8E8E93',
    fontWeight: '300',
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginLeft: 60,
  },
  dangerText: {
    color: '#FF3B30',
  },

  // ---- App Info ----
  appInfoContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appLogoSmall: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F7E928',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appLogoText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  appName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#8E8E93',
  },

  // ---- Sign Out Button ----
  signOutButton: {
    backgroundColor: '#FF3B30' + '15',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30' + '30',
  },
  signOutButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FF3B30',
  },

  // ---- Bottom Spacer ----
  bottomSpacer: {
    height: 40,
  },
});
