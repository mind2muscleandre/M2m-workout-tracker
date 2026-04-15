// ============================================
// Välj typ av screening — separat från varandra
// ============================================

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type Props = StackScreenProps<RootStackParamList, 'ScreeningHub'>;

const colors = {
  background: '#0F0F0F',
  card: '#1A1A1A',
  primary: '#F7E928',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#2C2C2E',
};

export function ScreeningHubScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
          <Text style={styles.back}>Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Screeningar</Text>
        <Text style={styles.subtitle}>
          Välj typ av screening. Bild-screening och rörelsebedömning är två separata flöden.
        </Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('BatchScreeningUpload')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Screening med bild, overhead squat och mobility"
        >
          <Text style={styles.cardIcon}>{'\u{1F4F7}'}</Text>
          <Text style={styles.cardTitle}>Bild-screening</Text>
          <Text style={styles.cardBody}>
            Overhead squat (fram/sidor) eller mobility. Ladda upp foton för AI-analys.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('MovementAssessmentClientPick')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Rörelsebedömning, välj klient"
        >
          <Text style={styles.cardIcon}>{'\u{1F9D8}'}</Text>
          <Text style={styles.cardTitle}>Rörelsebedömning</Text>
          <Text style={styles.cardBody}>
            Strukturerad bedömning i fyra delar (hållning, rörlighet, kärna, stabilitet). Välj klient
            först.
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 8, paddingBottom: 8 },
  back: { color: colors.primary, fontSize: 16, marginBottom: 12 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  cards: { padding: 16, gap: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIcon: { fontSize: 32, marginBottom: 12 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
});

export default ScreeningHubScreen;
