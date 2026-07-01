import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { coachColors, fonts, borderRadius } from '../../lib/theme';
import { IconButton } from './Button';
import { IconClose } from './icons';

interface SlideOverProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  tabs?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function SlideOver({
  visible,
  title,
  onClose,
  tabs,
  children,
  footer,
}: SlideOverProps) {
  const slideAnim = React.useRef(new Animated.Value(Dimensions.get('window').width)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : Dimensions.get('window').width,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <IconButton onPress={onClose} size={32}>
            <IconClose />
          </IconButton>
        </View>
        {tabs}
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
    zIndex: 199,
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: Math.min(420, Dimensions.get('window').width),
    backgroundColor: 'rgba(18,22,28,0.98)',
    borderLeftWidth: 1,
    borderLeftColor: coachColors.glassBorder,
    zIndex: 200,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(28px) saturate(180%)' } as const)
      : null),
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.coach,
  },
  body: { flex: 1 },
  bodyContent: {
    padding: 14,
    gap: 10,
    paddingBottom: 24,
  },
  footer: {
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: coachColors.border,
  },
});
