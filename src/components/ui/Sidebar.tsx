import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { coachColors, fonts, layout } from '../../lib/theme';
import { NAV_ITEMS } from '../../navigation/navConfig';
import { useLayout } from '../../lib/useLayout';
import { useAuthStore } from '../../stores/authStore';
import { useMessageStore } from '../../stores/messageStore';
import { Badge } from './Badge';

const SECTION_LABELS: Record<string, string> = {
  main: 'Trupp',
  training: 'Träning',
  communicate: 'Kommunikation',
  analytics: 'Hälsa & Analys',
};

export function Sidebar({ state, navigation }: BottomTabBarProps) {
  const { isDesktop } = useLayout();
  const user = useAuthStore((s) => s.user);
  const unreadCount = useMessageStore((s) => s.unreadCount);
  const fetchUnreadCount = useMessageStore((s) => s.fetchUnreadCount);
  const initials = (user?.email?.[0] ?? 'C').toUpperCase();

  useEffect(() => {
    fetchUnreadCount().catch(() => {});
  }, [fetchUnreadCount]);

  const sections = ['main', 'training', 'communicate', 'analytics'] as const;
  const footerItems = NAV_ITEMS.filter((i) => i.section === 'footer');

  return (
    <View style={[styles.sidebar, { width: isDesktop ? layout.sidebarFull : layout.sidebarIcon }]}>
      <View style={styles.logo}>
        <Text style={styles.logoMark}>M2M</Text>
        {isDesktop ? <Text style={styles.logoSub}>COACH</Text> : null}
      </View>

      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <View key={section}>
            {isDesktop ? (
              <Text style={styles.sectionLabel}>{SECTION_LABELS[section]}</Text>
            ) : null}
            {NAV_ITEMS.filter((i) => i.section === section).map((item) => {
              const routeIndex = state.routes.findIndex((r) => r.name === item.name);
              const active = state.index === routeIndex;
              const Icon = item.Icon;
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[styles.navItem, active && styles.navItemActive]}
                  onPress={() => navigation.navigate(item.name)}
                  activeOpacity={0.75}
                >
                  {active ? <View style={styles.activeBar} /> : null}
                  <Icon size={20} color={active ? coachColors.coach : coachColors.muted} />
                  {isDesktop ? (
                    <View style={styles.navLabelRow}>
                      <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                        {item.label}
                      </Text>
                      {item.name === 'Messages' ? <Badge count={unreadCount} /> : null}
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {footerItems.map((item) => {
          const routeIndex = state.routes.findIndex((r) => r.name === item.name);
          const active = state.index === routeIndex;
          return (
            <TouchableOpacity
              key={item.name}
              style={styles.footerInner}
              onPress={() => navigation.navigate(item.name)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              {isDesktop ? (
                <View>
                  <Text style={styles.footerName}>{user?.email?.split('@')[0] ?? 'Coach'}</Text>
                  <Text style={styles.footerRole}>Head Coach</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: coachColors.sidebarBg,
    borderRightWidth: 1,
    borderRightColor: coachColors.border,
    height: '100%',
  },
  logo: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
    paddingHorizontal: 18,
  },
  logoMark: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: coachColors.coach,
  },
  logoSub: {
    fontFamily: fonts.mono,
    fontSize: 7,
    letterSpacing: 2,
    color: coachColors.muted,
    textTransform: 'uppercase',
  },
  nav: { flex: 1, paddingVertical: 12 },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 44,
    paddingHorizontal: 20,
    position: 'relative',
  },
  navItemActive: {},
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: coachColors.coach,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  navLabelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: coachColors.muted,
  },
  navLabelActive: {
    color: coachColors.coach,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: coachColors.border,
    padding: 12,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: coachColors.coachDim,
    borderWidth: 2,
    borderColor: coachColors.coach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  footerName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: coachColors.fg,
  },
  footerRole: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    textTransform: 'uppercase',
  },
});
