import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Button } from './ui/Button';
import { coachColors, fonts, borderRadius } from '../lib/theme';

interface AddAthleteMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onAssignExisting: () => void;
  onCreateManual: () => void;
}

export function AddAthleteMenuModal({
  visible,
  onClose,
  onAssignExisting,
  onCreateManual,
}: AddAthleteMenuModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <SafeAreaView style={styles.safe}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>Lägg till atlet</Text>
            <Text style={styles.subtitle}>
              Sök en befintlig M2M-användare och tilldela dig som tränare, eller skapa en ny klientpost.
            </Text>

            <Button
              label="Sök och tilldela atlet"
              variant="primary"
              onPress={() => {
                onClose();
                onAssignExisting();
              }}
            />
            <Button
              label="Skapa ny klient (utan konto)"
              variant="secondary"
              onPress={() => {
                onClose();
                onCreateManual();
              }}
            />
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Avbryt</Text>
            </TouchableOpacity>
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
  safe: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: coachColors.screenBg,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: coachColors.border,
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
    marginBottom: 4,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: coachColors.muted,
  },
});
