import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { coachColors, borderRadius, fonts } from '../../lib/theme';

interface UploadZoneProps {
  onFilesSelected: (uris: string[]) => void;
  label?: string;
  hint?: string;
}

export function UploadZone({
  onFilesSelected,
  label = 'Dra och släpp eller klicka för att ladda upp',
  hint = 'JPG, PNG — max 10 MB',
}: UploadZoneProps) {
  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (!result.canceled && result.assets.length) {
      onFilesSelected(result.assets.map((a) => a.uri));
    }
  };

  return (
    <TouchableOpacity style={styles.zone} onPress={pick} activeOpacity={0.8}>
      <Text style={styles.icon}>↑</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>{hint}</Text>
      {Platform.OS === 'web' ? (
        <Text style={styles.webNote}>Klicka för att välja filer</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  zone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.lg,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    backgroundColor: coachColors.glassBg,
  },
  icon: {
    fontSize: 28,
    color: coachColors.muted,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: coachColors.mutedHi,
    textAlign: 'center',
  },
  hint: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    textTransform: 'uppercase',
  },
  webNote: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: coachColors.coach,
    marginTop: 4,
  },
});
