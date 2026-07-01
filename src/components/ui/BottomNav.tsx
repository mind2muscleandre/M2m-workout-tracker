import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { coachColors, fonts, layout, shadows } from '../../lib/theme';
import { BOTTOM_NAV_ITEMS } from '../../navigation/navConfig';
import { useMessageStore } from '../../stores/messageStore';
export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const unreadCount = useMessageStore((s) => s.unreadCount);
  const fetchUnreadCount = useMessageStore((s) => s.fetchUnreadCount);

  useEffect(() => {
    fetchUnreadCount().catch(() => {});
  }, [fetchUnreadCount]);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(14, insets.bottom) }]}>
      <View style={styles.nav}>
        {BOTTOM_NAV_ITEMS.map((item) => {
          const routeIndex = state.routes.findIndex((r) => r.name === item.name);
          const active = state.index === routeIndex;
          const Icon = item.Icon;
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.item, active && styles.itemActive]}
              onPress={() => navigation.navigate(item.name)}
              activeOpacity={0.75}
            >
              <View>
                <Icon size={20} color={active ? coachColors.coach : 'rgba(245,246,247,0.35)'} />
                {item.name === 'Messages' && unreadCount > 0 ? (
                  <View style={styles.badgeDot} />
                ) : null}
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>
                {item.shortLabel ?? item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    pointerEvents: 'box-none',
  },
  nav: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: layout.bottomNavMaxWidth,
    backgroundColor: 'rgba(26,30,35,0.82)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    padding: 5,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 8px 16px rgba(0,0,0,0.44)' } as const)
      : shadows.bottomNav),
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    borderRadius: 26,
    minHeight: 44,
  },
  itemActive: {
    backgroundColor: coachColors.coachDim,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: 'rgba(245,246,247,0.35)',
    fontWeight: '600',
  },
  labelActive: {
    color: coachColors.coach,
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: coachColors.orange,
  },
});
