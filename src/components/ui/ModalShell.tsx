import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { coachColors, fonts, borderRadius } from '../../lib/theme';

export type ModalShellProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'sheet' | 'center';
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ModalShell({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  variant = 'sheet',
  scrollable = false,
  style,
}: ModalShellProps) {
  const isSheet = variant === 'sheet';

  const body = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.body}>{children}</View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.backdrop, !isSheet && styles.backdropCenter]}
        activeOpacity={1}
        onPress={onClose}
      >
        <SafeAreaView style={[styles.safe, !isSheet && styles.safeCenter]}>
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.panel,
              isSheet ? styles.panelSheet : styles.panelCenter,
              style,
            ]}
            onPress={() => {}}
          >
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {body}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </TouchableOpacity>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  backdropCenter: {
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  safe: {
    justifyContent: 'flex-end',
  },
  safeCenter: {
    justifyContent: 'center',
  },
  panel: {
    backgroundColor: coachColors.screenBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    padding: 20,
    gap: 12,
  },
  panelSheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '92%',
  },
  panelCenter: {
    borderRadius: borderRadius.xl,
    maxHeight: '85%',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: coachColors.fg,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: coachColors.muted,
    lineHeight: 20,
  },
  body: {
    gap: 12,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  footer: {
    gap: 10,
    paddingTop: 4,
  },
});
