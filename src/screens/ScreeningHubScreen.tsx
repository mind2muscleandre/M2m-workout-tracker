// ============================================
// Välj typ av screening — separat från varandra
// ============================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { useClientStore } from '../stores/clientStore';
import { listMovementAssessmentsForClient } from '../services/clientAssessments';
import { listImageScreeningsForClient } from '../services/clientScreenings';
import { getClientAvatarColor, getClientInitials } from '../lib/athleteStatus';
import type { MovementAssessmentSummary } from '../types/athlete';
import { coachColors, fonts, borderRadius, shadows } from '../lib/theme';

type StackProps = StackScreenProps<RootStackParamList, 'ScreeningHub'>;

type RecentItem = {
  key: string;
  clientId: string;
  name: string;
  type: 'movement' | 'image';
  date: string;
  score: number | null;
  assessment?: MovementAssessmentSummary;
};

function useRootStackNavigation(): StackNavigationProp<RootStackParamList> {
  const navigation = useNavigation();
  const parent = navigation.getParent();
  const root = (parent?.getParent() ?? parent) as StackNavigationProp<RootStackParamList> | undefined;
  return (root ?? navigation) as StackNavigationProp<RootStackParamList>;
}

function scoreTone(score: number | null): 'good' | 'ok' | 'low' {
  if (score == null) return 'ok';
  if (score >= 4) return 'good';
  if (score >= 3.5) return 'ok';
  return 'low';
}

const scoreColors = {
  good: coachColors.coach,
  ok: coachColors.accent,
  low: coachColors.orange,
};

export function ScreeningHubContent({
  showBack = true,
  onBack,
  onBatchUpload,
  onMovementPick,
  onRecentPress,
}: {
  showBack?: boolean;
  onBack?: () => void;
  onBatchUpload: () => void;
  onMovementPick: () => void;
  onRecentPress?: (item: RecentItem) => void;
}) {
  const clients = useClientStore((s) => s.clients);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [assessedIds, setAssessedIds] = useState<Set<string>>(new Set());
  const [actionCount, setActionCount] = useState(0);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const activeClients = useMemo(
    () => clients.filter((c) => c.is_active),
    [clients]
  );

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoadingRecent(true);
      const slice = activeClients.slice(0, 12);
      const assessed = new Set<string>();
      let actions = 0;
      const merged: RecentItem[] = [];

      await Promise.all(
        slice.map(async (client) => {
          const [assessments, screenings] = await Promise.all([
            listMovementAssessmentsForClient(client.id, 5).catch(() => []),
            listImageScreeningsForClient(client.id, 5).catch(() => []),
          ]);

          if (assessments.length > 0 || screenings.length > 0) {
            assessed.add(client.id);
          }

          for (const a of assessments) {
            const rawTotal = a.resultat_totalt != null ? Number(a.resultat_totalt) : null;
            const totalOnFive =
              rawTotal != null ? Math.round((rawTotal / 20) * 10) / 10 : null;
            if (rawTotal != null && rawTotal < 70) actions += 1;
            merged.push({
              key: `ma-${a.id}`,
              clientId: client.id,
              name: client.name,
              type: 'movement',
              date: a.assessment_date || a.created_at.slice(0, 10),
              score: totalOnFive,
              assessment: a,
            });
          }

          for (const s of screenings) {
            merged.push({
              key: `sc-${s.id}`,
              clientId: client.id,
              name: client.name,
              type: 'image',
              date: s.uploaded_at.slice(0, 10),
              score: null,
            });
          }
        })
      );

      if (!alive) return;
      merged.sort((a, b) => b.date.localeCompare(a.date));
      setRecent(merged.slice(0, 8));
      setAssessedIds(assessed);
      setActionCount(actions);
      setLoadingRecent(false);
    };

    void load();
    return () => {
      alive = false;
    };
  }, [activeClients]);

  const stats = useMemo(
    () => ({
      assessed: assessedIds.size,
      unassessed: Math.max(0, activeClients.length - assessedIds.size),
      actionNeeded: actionCount,
    }),
    [assessedIds.size, activeClients.length, actionCount]
  );

  return (
    <ScreenContainer
      title="Screening"
      scroll
      headerLeft={
        showBack && onBack ? (
          <TouchableOpacity onPress={onBack} hitSlop={12} accessibilityRole="button">
            <Text style={styles.back}>Tillbaka</Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      <View style={styles.statStrip}>
        {[
          { value: stats.assessed, label: 'Bedömda', color: coachColors.coach },
          { value: stats.unassessed, label: 'Ej bedömda', color: coachColors.accent },
          { value: stats.actionNeeded, label: 'Åtgärdsbehov', color: coachColors.orange },
        ].map((item) => (
          <View key={item.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.heroGrid}>
        <TouchableOpacity
          onPress={onMovementPick}
          activeOpacity={0.85}
          style={styles.heroCell}
          accessibilityRole="button"
          accessibilityLabel="Rörelsebedömning, välj klient"
        >
          <GlassCard variant="coach" padding={20} style={styles.typeCard}>
            <View style={[styles.typeIcon, styles.typeIconCoach]}>
              <Text style={styles.typeEmoji}>🧘</Text>
            </View>
            <Text style={styles.typeTitle}>Rörelse-bedömning</Text>
            <Text style={styles.typeBody}>
              Strukturerad bedömning av hållning, rörlighet, kärna och stabilitet. Genererar
              åtgärdsprogram automatiskt.
            </Text>
            <Text style={styles.typeArrow}>→</Text>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onBatchUpload}
          activeOpacity={0.85}
          style={styles.heroCell}
          accessibilityRole="button"
          accessibilityLabel="Bild-screening, overhead squat och mobility"
        >
          <GlassCard variant="accent" padding={20} style={styles.typeCard}>
            <View style={[styles.typeIcon, styles.typeIconAccent]}>
              <Text style={styles.typeEmoji}>📷</Text>
            </View>
            <Text style={styles.typeTitle}>Bild-screening</Text>
            <Text style={styles.typeBody}>
              Ladda upp bilder för AI-analys av hållning, symmetri och rörelsemönster. Resultat
              inom 60 sekunder.
            </Text>
            <Text style={[styles.typeArrow, styles.typeArrowAccent]}>→</Text>
          </GlassCard>
        </TouchableOpacity>
      </View>

      <Text style={styles.recentSectionLabel}>Senaste screeningar</Text>

      {loadingRecent ? (
        <ActivityIndicator color={coachColors.coach} style={styles.loader} />
      ) : recent.length === 0 ? (
        <Text style={styles.emptyRecent}>Inga screeningar ännu. Starta med ett av alternativen ovan.</Text>
      ) : (
        recent.map((item) => {
          const tone = scoreTone(item.score);
          const avatarColor = getClientAvatarColor(item.clientId);
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.recentRow}
              activeOpacity={0.75}
              onPress={() => onRecentPress?.(item)}
              accessibilityRole="button"
            >
              <View style={[styles.recentAvatar, { backgroundColor: `${avatarColor}55` }]}>
                <Text style={styles.recentInitials}>{getClientInitials(item.name)}</Text>
              </View>
              <View style={styles.recentBody}>
                <Text style={styles.recentName}>{item.name}</Text>
                <View style={styles.recentMeta}>
                  <Text style={styles.recentMetaText}>
                    {item.type === 'movement' ? 'Rörelsebedömning' : 'Bildscreening'}
                  </Text>
                  <Text style={styles.recentMetaDot}>·</Text>
                  <Text style={styles.recentMetaText}>{item.date}</Text>
                </View>
              </View>
              {item.score != null ? (
                <Text style={[styles.recentScore, { color: scoreColors[tone] }]}>
                  {Math.round(item.score * 10) / 10}/5
                </Text>
              ) : (
                <Text style={styles.recentPending}>—</Text>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </ScreenContainer>
  );
}

export function ScreeningHubScreen({ navigation }: StackProps) {
  return (
    <ScreeningHubContent
      showBack={navigation.canGoBack()}
      onBack={() => navigation.goBack()}
      onBatchUpload={() => navigation.navigate('BatchScreeningUpload')}
      onMovementPick={() => navigation.navigate('MovementAssessmentClientPick')}
      onRecentPress={(item) => {
        if (item.type === 'movement' && item.assessment) {
          navigation.navigate('MovementAssessmentResult', {
            clientId: item.clientId,
            assessment: item.assessment,
          });
          return;
        }
        navigation.navigate('ClientDetail', { clientId: item.clientId });
      }}
    />
  );
}

/** Tab route — navigates via root stack */
export function ScreeningTabScreen() {
  const navigation = useRootStackNavigation();
  return (
    <ScreeningHubContent
      showBack={false}
      onBatchUpload={() => navigation.navigate('BatchScreeningUpload')}
      onMovementPick={() => navigation.navigate('MovementAssessmentClientPick')}
      onRecentPress={(item) => {
        if (item.type === 'movement' && item.assessment) {
          navigation.navigate('MovementAssessmentResult', {
            clientId: item.clientId,
            assessment: item.assessment,
          });
          return;
        }
        navigation.navigate('ClientDetail', { clientId: item.clientId });
      }}
    />
  );
}

const styles = StyleSheet.create({
  back: {
    color: coachColors.coach,
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    marginBottom: Platform.OS === 'web' ? 0 : 4,
  },
  statStrip: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    ...shadows.glass,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 28,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: coachColors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  recentSectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
    marginBottom: 10,
  },
  heroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  heroCell: {
    flex: 1,
    minWidth: 160,
  },
  typeCard: {
    minHeight: 180,
    position: 'relative',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  typeIconCoach: { backgroundColor: 'rgba(0,212,170,0.12)' },
  typeIconAccent: { backgroundColor: 'rgba(247,233,40,0.10)' },
  typeEmoji: { fontSize: 26 },
  typeTitle: {
    color: coachColors.fg,
    fontSize: 20,
    fontFamily: fonts.display,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  typeBody: {
    color: coachColors.mutedHi,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.body,
    paddingRight: 24,
  },
  typeArrow: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    fontSize: 18,
    color: coachColors.muted,
  },
  typeArrowAccent: { color: coachColors.accent },
  loader: { marginVertical: 16 },
  emptyRecent: {
    color: coachColors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: 12,
    fontFamily: fonts.body,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 12,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    marginBottom: 8,
  },
  recentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInitials: {
    fontFamily: fonts.display,
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  recentBody: { flex: 1, minWidth: 0 },
  recentName: {
    fontSize: 13,
    fontWeight: '600',
    color: coachColors.fg,
    fontFamily: fonts.bodySemiBold,
    marginBottom: 3,
  },
  recentMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recentMetaText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.muted,
  },
  recentMetaDot: { color: coachColors.muted, fontSize: 9 },
  recentScore: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
  },
  recentPending: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: coachColors.muted,
  },
});

export default ScreeningHubScreen;
