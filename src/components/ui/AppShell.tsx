import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { coachColors } from '../../lib/theme';
import { webOnly } from '../../lib/webStyles';
import { useLayout } from '../../lib/useLayout';
import { Topbar } from './Topbar';

interface AppShellProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  detailPanel?: React.ReactNode;
  topbarLeft?: React.ReactNode;
  topbarRight?: React.ReactNode;
  topbarTitle?: string;
  bottomNav?: React.ReactNode;
}

export function AppShell({
  children,
  sidebar,
  detailPanel,
  topbarLeft,
  topbarRight,
  topbarTitle,
  bottomNav,
}: AppShellProps) {
  const { showSidebar, showBottomNav, showDetailPanel, isMobile } = useLayout();

  return (
    <View style={styles.root}>
      <AmbientGlow />
      <View style={styles.row}>
        {showSidebar && sidebar ? <View style={styles.sidebar}>{sidebar}</View> : null}
        <View style={styles.main}>
          {isMobile ? (
            <Topbar title={topbarTitle} left={topbarLeft} right={topbarRight} />
          ) : null}
          <View style={styles.content}>{children}</View>
        </View>
        {showDetailPanel && detailPanel ? (
          <View style={styles.panel}>{detailPanel}</View>
        ) : null}
      </View>
      {showBottomNav && bottomNav}
    </View>
  );
}

function AmbientGlow() {
  if (Platform.OS === 'web') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={['rgba(0,212,170,0.09)', 'transparent']}
          style={[styles.glow, styles.glowTop]}
          start={{ x: 0.8, y: 0 }}
          end={{ x: 0.2, y: 1 }}
        />
        <LinearGradient
          colors={['rgba(247,233,40,0.07)', 'transparent']}
          style={[styles.glow, styles.glowBottom]}
          start={{ x: 0.15, y: 1 }}
          end={{ x: 0.85, y: 0 }}
        />
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: coachColors.screenBg,
    ...webOnly({
      height: '100vh',
      minHeight: '100vh',
      backgroundImage:
        'radial-gradient(90% 40% at 80% -5%, rgba(247,233,40,0.08), transparent 60%), linear-gradient(180deg, #22262b 0%, #1a1d21 50%, #17191d 100%)',
    }),
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  sidebar: {
    flexShrink: 0,
    height: '100%',
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  panel: {
    flexShrink: 0,
    height: '100%',
  },
  glow: {
    position: 'absolute',
    width: '100%',
    height: '50%',
  },
  glowTop: { top: 0 },
  glowBottom: { bottom: 0 },
});
