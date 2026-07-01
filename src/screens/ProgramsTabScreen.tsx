import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { EnergySystemPill } from '../components/ui/StatusPill';
import { fetchCoachTrackerPrograms } from '../services/platformTracker';
import type { TrainingProgramRow } from '../types/platform';
import { coachColors, fonts, borderRadius } from '../lib/theme';

type Nav = StackNavigationProp<RootStackParamList>;

function programSystem(program: TrainingProgramRow): 'atp' | 'glyco' | 'aero' | 'gym' | 'off' {
  const tag = (program.sport_tag ?? program.program_type ?? '').toLowerCase();
  if (tag.includes('sprint') || tag.includes('atp')) return 'atp';
  if (tag.includes('glyco') || tag.includes('intervall')) return 'glyco';
  if (tag.includes('styrka') || tag.includes('gym')) return 'gym';
  if (tag.includes('aero') || tag.includes('endurance')) return 'aero';
  return 'off';
}

export function ProgramsTabScreen() {
  const navigation = useNavigation<Nav>();
  const [programs, setPrograms] = useState<TrainingProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await fetchCoachTrackerPrograms();
      setPrograms(rows);
    } catch {
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScreenContainer
      title="Program"
      subtitle="Tracker — skapa och tilldela"
      refreshing={refreshing}
      onRefresh={onRefresh}
      headerRight={
        <Button
          label="Nytt"
          size="sm"
          variant="primary"
          onPress={() => navigation.navigate('ProgramBuilder', {})}
        />
      }
    >
      {loading ? (
        <ActivityIndicator color={coachColors.coach} style={{ marginTop: 32 }} />
      ) : programs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Inga program ännu.</Text>
          <Button
            label="Skapa program"
            variant="primary"
            onPress={() => navigation.navigate('ProgramBuilder', {})}
          />
        </View>
      ) : (
        <FlatList
          data={programs}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ProgramBuilder', {
                  programId: item.id,
                  userId: item.user_id ?? undefined,
                })
              }
              activeOpacity={0.75}
            >
              <GlassCard style={styles.progCard}>
                <View style={styles.progCardTop}>
                  <View style={styles.progCardBody}>
                    <Text style={styles.progName}>{item.name}</Text>
                    <Text style={styles.progSub}>
                      {item.program_type ?? 'program'} ·{' '}
                      {item.duration_weeks ?? item.weeks ?? '?'} veckor ·{' '}
                      {item.status ?? '—'}
                    </Text>
                  </View>
                  <EnergySystemPill system={programSystem(item)} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8, paddingBottom: 24 },
  progCard: {
    padding: 12,
    borderRadius: borderRadius.md,
  },
  progCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  progCardBody: { flex: 1, minWidth: 0 },
  progName: {
    fontSize: 13,
    fontWeight: '500',
    color: coachColors.fg,
    fontFamily: fonts.body,
  },
  progSub: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  empty: { alignItems: 'center', gap: 16, marginTop: 32 },
  emptyText: { color: coachColors.muted, fontSize: 14, fontFamily: fonts.body },
});
