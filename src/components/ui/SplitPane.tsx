import React from 'react';
import { View, StyleSheet } from 'react-native';
import { coachColors, shadows } from '../../lib/theme';
import { useLayout } from '../../lib/useLayout';

interface SplitPaneProps {
  list: React.ReactNode;
  detail: React.ReactNode;
  listWidth?: number;
  showDetail?: boolean;
}

export function SplitPane({
  list,
  detail,
  listWidth = 280,
  showDetail = true,
}: SplitPaneProps) {
  const { isMobile } = useLayout();

  if (isMobile) {
    return (
      <View style={styles.mobile}>
        {showDetail ? detail : list}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={[styles.list, { width: listWidth }]}>{list}</View>
      <View style={styles.detail}>{detail}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: 16,
    overflow: 'hidden',
    ...shadows.glass,
  },
  list: {
    borderRightWidth: 1,
    borderRightColor: coachColors.border,
    backgroundColor: coachColors.glassBg,
  },
  detail: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(18,22,28,0.6)',
  },
  mobile: {
    flex: 1,
    minHeight: 0,
  },
});
