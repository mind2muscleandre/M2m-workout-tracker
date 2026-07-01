import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { coachColors, fonts, layout } from '../../lib/theme';
import { IconButton } from './Button';
import { IconClose } from './icons';

interface DetailPanelProps {
  title: string;
  onClose?: () => void;
  tabs?: React.ReactNode;
  children: React.ReactNode;
}

export function DetailPanel({ title, onClose, tabs, children }: DetailPanelProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onClose ? (
          <IconButton onPress={onClose} size={28}>
            <IconClose />
          </IconButton>
        ) : null}
      </View>
      {tabs}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    flex: 1,
    flexShrink: 0,
    alignSelf: 'stretch',
    backgroundColor: coachColors.panelBg,
    borderLeftWidth: 1,
    borderLeftColor: coachColors.border,
    minHeight: 0,
    ...(Platform.OS === 'web' ? ({ height: '100%' } as const) : null),
  },
  header: {
    height: layout.pageHeaderHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  title: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
  },
  body: { flex: 1 },
  bodyContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
});
