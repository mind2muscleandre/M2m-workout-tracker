import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLayout } from '../../lib/useLayout';
import { useCoachNavStore } from '../../stores/coachNavStore';
import { AppShell } from './AppShell';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

interface CoachShellProps {
  children: React.ReactNode;
}

export function CoachShell({ children }: CoachShellProps) {
  const { showSidebar, showBottomNav } = useLayout();
  const tabBarProps = useCoachNavStore((s) => s.tabBarProps);

  return (
    <AppShell
      sidebar={showSidebar && tabBarProps ? <Sidebar {...tabBarProps} /> : undefined}
      bottomNav={showBottomNav && tabBarProps ? <BottomNav {...tabBarProps} /> : undefined}
    >
      <View style={styles.content}>{children}</View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});
