import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { SectionRadarChart } from '../components/movementAssessment/SectionRadarChart';
import type { ScoreBand } from '../types/movementAssessment';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { StepIndicator } from '../components/ui/StepIndicator';
import { SectionLabel } from '../components/ui/SectionLabel';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useClientStore } from '../stores/clientStore';
import { listMovementAssessmentsForClient } from '../services/clientAssessments';
import type { MovementAssessmentSummary } from '../types/athlete';
import { coachColors, fonts, borderRadius, shadows } from '../lib/theme';

type Props = StackScreenProps<RootStackParamList, 'MovementAssessmentResult'>;

const STEP_LABELS = ['Atlet', 'Bedömning', 'Program', 'Resultat'];

function scoreBarColor(score: number): string {
  if (score >= 75) return coachColors.coach;
  if (score >= 55) return coachColors.accent;
  return coachColors.orange;
}

function ScoreRing({ score, max = 5 }: { score: number; max?: number }) {
  const pct = Math.min(1, Math.max(0, score / max));
  const size = 80;
  const stroke = 7;
  const r = 33;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size} viewBox="0 0 80 80">
        <Circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="rgba(0,212,170,0.12)"
          strokeWidth={stroke}
        />
        <Circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={coachColors.coach}
          strokeWidth={stroke}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin="40, 40"
        />
      </Svg>
      <Text style={styles.ringValue}>{Math.round(score * 10) / 10}</Text>
    </View>
  );
}

type Recommendation = {
  icon: string;
  title: string;
  text: string;
  priority: 'high' | 'med' | 'low';
  priorityLabel: string;
};

function buildRecommendations(scores: {
  postural: number;
  mobility: number | null;
  core: number | null;
  stability: number | null;
}): Recommendation[] {
  const recs: Recommendation[] = [];

  if (scores.mobility != null && scores.mobility < 60) {
    recs.push({
      icon: '🤸',
      title: 'Förbättra rörlighet',
      text: 'Höft-, axel- och ankelrörlighet under målnivå. Daglig mobilitet och foam rolling rekommenderas.',
      priority: 'high',
      priorityLabel: 'Hög prioritet',
    });
  }

  if (scores.core != null && scores.core < 60) {
    recs.push({
      icon: '💪',
      title: 'Stärk kärnstabilitet',
      text: 'Anti-extensions- och lateral kontroll behöver riktad träning 3×/vecka.',
      priority: 'med',
      priorityLabel: 'Medel prioritet',
    });
  }

  if (scores.stability != null && scores.stability < 60) {
    recs.push({
      icon: '⚖️',
      title: 'Träna enbensstabilitet',
      text: 'Stabilitet i frontal och transversal plan bör prioriteras i uppvärmning och avslut.',
      priority: 'med',
      priorityLabel: 'Medel prioritet',
    });
  }

  if (scores.postural >= 70) {
    recs.push({
      icon: '🧍',
      title: 'Behåll stark hållningsrutin',
      text: 'Hållningen är i gott skick. Fortsätt med befintliga hållningsövningar.',
      priority: 'low',
      priorityLabel: 'Bibehåll',
    });
  }

  if (recs.length === 0) {
    recs.push({
      icon: '✓',
      title: 'Balanserad profil',
      text: 'Inga kritiska avvikelser. Fokusera på underhåll och progressiv belastning.',
      priority: 'low',
      priorityLabel: 'Bibehåll',
    });
  }

  return recs;
}

const priorityStyles = {
  high: {
    bg: 'rgba(255,95,31,0.12)',
    border: 'rgba(255,95,31,0.22)',
    text: coachColors.orange,
  },
  med: {
    bg: coachColors.accentDim,
    border: 'rgba(247,233,40,0.20)',
    text: coachColors.accent,
  },
  low: {
    bg: coachColors.coachDim,
    border: 'rgba(0,212,170,0.20)',
    text: coachColors.coach,
  },
};

function showResultAlert(title: string, message?: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

function CompareRow({
  label,
  prev,
  curr,
  currColor,
}: {
  label: string;
  prev: number | null;
  curr: number | null;
  currColor: string;
}) {
  if (prev == null || curr == null) return null;
  const diff = Math.round((curr - prev) * 10) / 10;
  const up = diff >= 0;
  return (
    <View style={styles.compareRow}>
      <Text style={styles.compareLabel}>{label}</Text>
      <View style={styles.compareVals}>
        <Text style={styles.comparePrev}>{prev.toFixed(1)}</Text>
        <Svg width={14} height={14} viewBox="0 0 14 14">
          <Path
            d="M3 7h8M8 4l3 3-3 3"
            fill="none"
            stroke={coachColors.muted}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </Svg>
        <Text style={[styles.compareCurr, { color: currColor }]}>{curr.toFixed(1)}</Text>
        <Text style={[styles.compareDiff, up ? styles.diffUp : styles.diffDown]}>
          {up ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
        </Text>
      </View>
    </View>
  );
}

export default function MovementAssessmentResultScreen({ route, navigation }: Props) {
  const { assessment, clientId } = route.params;
  const client = useClientStore((s) => s.clients.find((c) => c.id === clientId) ?? null);
  const [previousAssessment, setPreviousAssessment] = useState<MovementAssessmentSummary | null>(
    null
  );

  useEffect(() => {
    let alive = true;
    listMovementAssessmentsForClient(clientId, 10)
      .then((rows) => {
        if (!alive) return;
        const prev = rows.find((row) => row.id !== assessment.id) ?? null;
        setPreviousAssessment(prev);
      })
      .catch(() => {
        if (alive) setPreviousAssessment(null);
      });
    return () => {
      alive = false;
    };
  }, [assessment.id, clientId]);

  const scores = useMemo(() => {
    const raw = assessment.raw_assessment as { scores?: Record<string, unknown> } | null;
    const s = raw?.scores;
    if (s && typeof s === 'object') {
      return {
        postural: Number(s.postural ?? assessment.resultat_hallning ?? 0),
        mobility:
          s.mobility != null
            ? Number(s.mobility)
            : assessment.resultat_rorlighet != null
              ? Number(assessment.resultat_rorlighet)
              : null,
        core:
          s.core != null
            ? Number(s.core)
            : assessment.resultat_karna != null
              ? Number(assessment.resultat_karna)
              : null,
        stability:
          s.stability != null
            ? Number(s.stability)
            : assessment.resultat_stabilitet != null
              ? Number(assessment.resultat_stabilitet)
              : null,
        total: Number(s.total ?? assessment.resultat_totalt ?? 0),
        band: String(s.band ?? assessment.resultat_band ?? 'fair') as ScoreBand,
      };
    }
    return {
      postural: Number(assessment.resultat_hallning ?? 0),
      mobility:
        assessment.resultat_rorlighet != null ? Number(assessment.resultat_rorlighet) : null,
      core: assessment.resultat_karna != null ? Number(assessment.resultat_karna) : null,
      stability:
        assessment.resultat_stabilitet != null ? Number(assessment.resultat_stabilitet) : null,
      total: Number(assessment.resultat_totalt ?? 0),
      band: String(assessment.resultat_band ?? 'fair') as ScoreBand,
    };
  }, [assessment]);

  const displayTotal = scores.total / 20;
  const recommendations = useMemo(() => buildRecommendations(scores), [scores]);

  const breakdown = [
    { label: 'Hållning', value: scores.postural },
    { label: 'Rörlighet', value: scores.mobility },
    { label: 'Kärna', value: scores.core },
    { label: 'Stabilitet', value: scores.stability },
  ];

  const athleteName = client?.name ?? assessment.client_name;
  const assessmentDate = assessment.assessment_date || assessment.created_at.slice(0, 10);

  const previousScores = useMemo(() => {
    if (!previousAssessment) return null;
    return {
      total:
        previousAssessment.resultat_totalt != null
          ? Number(previousAssessment.resultat_totalt) / 20
          : null,
      mobility:
        previousAssessment.resultat_rorlighet != null
          ? Number(previousAssessment.resultat_rorlighet) / 20
          : null,
      core:
        previousAssessment.resultat_karna != null
          ? Number(previousAssessment.resultat_karna) / 20
          : null,
    };
  }, [previousAssessment]);

  const summaryText = useMemo(() => {
    const parts: string[] = [];
    if (scores.mobility != null && scores.mobility < 60) {
      parts.push('Rörlighet');
    }
    if (scores.core != null && scores.core < 60) {
      parts.push('kärnstabilitet');
    }
    if (parts.length > 0) {
      return `${parts.join(' och ')} kräver riktade insatser. ${
        scores.postural >= 70 ? 'Hållning och koordination är starka.' : ''
      } ${selectedCountLabel(recommendations.length)}`;
    }
    return `Balanserad profil — totalpoäng ${Math.round(displayTotal * 10) / 10}/5.`;
  }, [scores, displayTotal, recommendations.length]);

  function selectedCountLabel(count: number) {
    if (count <= 0) return '';
    return `${count} åtgärdsrekommendationer nedan.`;
  }

  return (
    <ScreenContainer
      title="Bedömningsresultat"
      subtitle={assessmentDate}
      scroll
      headerLeft={
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>Tillbaka</Text>
        </TouchableOpacity>
      }
    >
      <StepIndicator current={4} labels={STEP_LABELS} />

      <GlassCard variant="coach" padding={20} style={styles.hero}>
        <ScoreRing score={displayTotal} />
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{athleteName}</Text>
          <Text style={styles.heroDate}>Rörelsebedömning · {assessmentDate}</Text>
          <Text style={styles.heroSummary}>{summaryText}</Text>
        </View>
      </GlassCard>

      <GlassCard padding={20} style={styles.radarCard}>
        <Text style={styles.radarTitle}>Poängfördelning</Text>
        <SectionRadarChart
          postural={scores.postural}
          mobility={scores.mobility}
          core={scores.core}
          stability={scores.stability}
        />
        <View style={styles.breakdown}>
          {breakdown.map((row) => {
            const val = row.value ?? 0;
            const display = row.value != null ? (val / 20).toFixed(1) : '—';
            return (
              <View key={row.label} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{row.label}</Text>
                <ProgressBar
                  value={row.value ?? 0}
                  max={100}
                  color={scoreBarColor(val)}
                  height={8}
                  style={styles.breakdownBar}
                />
                <Text style={[styles.breakdownVal, { color: scoreBarColor(val) }]}>{display}</Text>
              </View>
            );
          })}
        </View>
      </GlassCard>

      <SectionLabel>Prioriterade åtgärder</SectionLabel>
      {recommendations.map((rec) => {
        const p = priorityStyles[rec.priority];
        return (
          <GlassCard key={rec.title} padding={14} style={styles.recCard}>
            <View style={styles.recHeader}>
              <Text style={styles.recIcon}>{rec.icon}</Text>
              <Text style={styles.recTitle}>{rec.title}</Text>
              <View style={[styles.recPriority, { backgroundColor: p.bg, borderColor: p.border }]}>
                <Text style={[styles.recPriorityText, { color: p.text }]}>{rec.priorityLabel}</Text>
              </View>
            </View>
            <Text style={styles.recText}>{rec.text}</Text>
          </GlassCard>
        );
      })}

      {previousScores ? (
        <>
          <SectionLabel>Jämförelse med föregående bedömning</SectionLabel>
          <CompareRow
            label="Total poäng"
            prev={previousScores.total}
            curr={displayTotal}
            currColor={coachColors.coach}
          />
          <CompareRow
            label="Rörlighet"
            prev={previousScores.mobility}
            curr={scores.mobility != null ? scores.mobility / 20 : null}
            currColor={coachColors.accent}
          />
          <CompareRow
            label="Kärna"
            prev={previousScores.core}
            curr={scores.core != null ? scores.core / 20 : null}
            currColor={coachColors.orange}
          />
        </>
      ) : null}

      <View style={styles.actionRow}>
        <Button
          label="Exportera"
          variant="secondary"
          onPress={() => showResultAlert('Exportera PDF', 'Export kommer snart.')}
          style={styles.actionBtn}
        />
        <Button
          label="Skicka"
          variant="secondary"
          onPress={() => showResultAlert('Skicka till atleten', 'Utskick kommer snart.')}
          style={styles.actionBtn}
        />
        <Button
          label="Öppna profil →"
          variant="primary"
          onPress={() => navigation.navigate('ClientDetail', { clientId })}
          style={styles.actionBtnPrimary}
        />
      </View>

      <Button
        label="Åtgärdsprogram"
        variant="primary"
        onPress={() =>
          navigation.navigate('MovementAssessmentProgramBuilder', {
            clientId: route.params.clientId,
            assessmentId: assessment.id,
          })
        }
        style={styles.cta}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { color: coachColors.coach, fontSize: 16, fontFamily: fonts.bodyMedium },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
    borderColor: 'rgba(0,212,170,0.2)',
    ...shadows.glassCoach,
  },
  ringWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    position: 'absolute',
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700',
    color: coachColors.coach,
  },
  heroInfo: { flex: 1 },
  heroName: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.fg,
  },
  heroDate: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroSummary: {
    fontSize: 12,
    color: coachColors.mutedHi,
    marginTop: 8,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
  radarCard: { marginBottom: 16, borderRadius: borderRadius.xl, ...shadows.glass },
  radarTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: coachColors.fg,
    marginBottom: 12,
  },
  breakdown: { marginTop: 12, gap: 10 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  breakdownLabel: {
    width: 120,
    fontSize: 12,
    fontWeight: '500',
    color: coachColors.fg,
    fontFamily: fonts.bodyMedium,
  },
  breakdownBar: { flex: 1 },
  breakdownVal: {
    width: 28,
    textAlign: 'right',
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
  },
  recCard: { marginBottom: 8, borderRadius: borderRadius.lg },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  recIcon: { fontSize: 16 },
  recTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: coachColors.fg,
    fontFamily: fonts.bodySemiBold,
  },
  recPriority: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
    borderWidth: 1,
  },
  recPriorityText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recText: {
    fontSize: 12,
    color: coachColors.mutedHi,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: coachColors.border,
    marginBottom: 6,
  },
  compareLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: coachColors.fg,
    fontFamily: fonts.bodyMedium,
  },
  compareVals: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  comparePrev: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: coachColors.muted,
  },
  compareCurr: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
  },
  compareDiff: {
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  diffUp: { color: coachColors.coach },
  diffDown: { color: coachColors.danger },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  actionBtn: { flex: 1, height: 44, justifyContent: 'center' },
  actionBtnPrimary: { flex: 1.5, height: 44, justifyContent: 'center' },
  cta: { marginTop: 4, marginBottom: 16 },
});
