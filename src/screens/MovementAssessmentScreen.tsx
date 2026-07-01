import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { StackScreenProps } from '@react-navigation/stack';
import uuid from 'react-native-uuid';
import { RootStackParamList } from '../navigation/types';
import { useClientStore } from '../stores/clientStore';
import { useAuthStore } from '../stores/authStore';
import {
  type PosturalObservationId,
  type MovementAssessment,
  POSTURAL_LABELS_SV,
  createEmptyMobility,
  createEmptyCore,
  createEmptyStickTest,
  createEmptyLungeTest,
  cycleStabilityCheckValue,
  type StabilityCheckValue,
} from '../types/movementAssessment';
import {
  computeScores,
  MOBILITY_TESTS,
  mobilityTestCriteriaLabel,
  mobilityTestPlaceholder,
  scoreForValue,
  overheadReachScore,
} from '../lib/movementAssessment/scoring';
import {
  buildFlatAssessmentColumns,
  mobilitySidePoang,
  mobilityTestPoang,
} from '../lib/movementAssessment/supabaseFlatRow';
import { buildSortedFlags } from '../lib/movementAssessment/flags';
import { buildPerformExportPayload, bandDisplaySv } from '../lib/movementAssessment/exportPayload';
import { SectionRadarChart } from '../components/movementAssessment/SectionRadarChart';
import { uploadMovementAssessment } from '../services/movementAssessmentUpload';
import { supabase } from '../lib/supabase';
import type { ScoreBand } from '../types/movementAssessment';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { StepIndicator } from '../components/ui/StepIndicator';
import { ScoreButtons } from '../components/ui/ScoreButtons';
import { Button } from '../components/ui/Button';
import { colors, coachColors, fonts, borderRadius } from '../lib/theme';

type Props = StackScreenProps<RootStackParamList, 'MovementAssessment'>;

const POSTURAL_IDS = Object.keys(POSTURAL_LABELS_SV) as PosturalObservationId[];
const STEP_LABELS = ['Atlet', 'Bedömning', 'Program', 'Resultat'];

type SectionKey = 'postural' | 'mobility' | 'core' | 'stability';

const SECTION_META: Record<
  SectionKey,
  { title: string; icon: string; iconBg: string; scoreKey: keyof ReturnType<typeof computeScores> }
> = {
  postural: {
    title: 'Hållning',
    icon: '🧍',
    iconBg: 'rgba(0,212,170,0.12)',
    scoreKey: 'postural',
  },
  mobility: {
    title: 'Rörlighet',
    icon: '🤸',
    iconBg: 'rgba(247,233,40,0.10)',
    scoreKey: 'mobility',
  },
  core: {
    title: 'Kärna & Stabilitet',
    icon: '💪',
    iconBg: 'rgba(255,95,31,0.10)',
    scoreKey: 'core',
  },
  stability: {
    title: 'Stabilitet',
    icon: '⚖️',
    iconBg: 'rgba(139,92,246,0.10)',
    scoreKey: 'stability',
  },
};

function bandColor(band: ScoreBand): string {
  switch (band) {
    case 'excellent':
    case 'good':
      return colors.success;
    case 'fair':
      return colors.warning;
    case 'poor':
      return colors.warning;
    default:
      return colors.danger;
  }
}

function sectionScoreColor(score: number | null): string {
  if (score == null) return coachColors.muted;
  if (score >= 75) return coachColors.coach;
  if (score >= 55) return coachColors.accent;
  return coachColors.orange;
}

function stabilityCheckStyles(value: StabilityCheckValue) {
  if (value === false) {
    return { box: styles.checkboxOk, mark: styles.checkMarkOk, symbol: '✓' as const };
  }
  if (value === true) {
    return { box: styles.checkboxIssue, mark: styles.checkMarkIssue, symbol: '!' as const };
  }
  return { box: styles.checkbox, mark: null, symbol: null };
}

function StabilityCheckRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: StabilityCheckValue;
  onPress: () => void;
}) {
  const { box, mark, symbol } = stabilityCheckStyles(value);
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onPress}>
      <View style={box}>
        {symbol ? <Text style={mark}>{symbol}</Text> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function parseNum(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function AccordionSection({
  sectionKey,
  title,
  icon,
  iconBg,
  score,
  open,
  onToggle,
  children,
}: {
  sectionKey: SectionKey;
  title: string;
  icon: string;
  iconBg: string;
  score: number | null;
  open: boolean;
  onToggle: (key: SectionKey) => void;
  children: React.ReactNode;
}) {
  const displayScore =
    score != null ? (Math.round((score / 20) * 10) / 10).toFixed(1) : '—';

  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity
        style={[styles.sectionHeader, open && styles.sectionHeaderOpen]}
        onPress={() => onToggle(sectionKey)}
        activeOpacity={0.8}
      >
        <View style={[styles.sectionIcon, { backgroundColor: iconBg }]}>
          <Text style={styles.sectionIconText}>{icon}</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={[styles.sectionScore, { color: sectionScoreColor(score) }]}>
          {displayScore}
        </Text>
        <Svg
          width={14}
          height={14}
          viewBox="0 0 14 14"
          style={[styles.sectionChevronSvg, open && styles.sectionChevronOpen]}
        >
          <Path
            d="M5 3l4 4-4 4"
            fill="none"
            stroke={coachColors.muted}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </Svg>
      </TouchableOpacity>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

function MovementAssessmentScreen({ navigation, route }: Props) {
  const { clientId } = route.params;
  const clients = useClientStore((s) => s.clients);
  const client = useMemo(() => clients.find((c) => c.id === clientId) ?? null, [clients, clientId]);
  const authUser = useAuthStore((s) => s.user);

  const [showResults, setShowResults] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    postural: true,
    mobility: false,
    core: false,
    stability: false,
  });
  const [observations, setObservations] = useState<PosturalObservationId[]>([]);
  const [posturalNotes, setPosturalNotes] = useState('');
  const [mobility, setMobility] = useState(createEmptyMobility);
  const [core, setCore] = useState(createEmptyCore);
  const [stick, setStick] = useState(createEmptyStickTest);
  const [lunge, setLunge] = useState(createEmptyLungeTest);
  const [submitting, setSubmitting] = useState(false);

  const postural = useMemo(
    () => ({ observations, notes: posturalNotes }),
    [observations, posturalNotes]
  );
  const stability = useMemo(
    () => ({
      stabilityFormatVersion: 2 as const,
      stickTest: stick,
      lungeTest: lunge,
    }),
    [stick, lunge]
  );

  const scores = useMemo(
    () => computeScores(postural, mobility, core, stability),
    [postural, mobility, core, stability]
  );

  const overheadReachPoang = overheadReachScore(mobility.overheadReach);

  const flags = useMemo(
    () =>
      buildSortedFlags({
        id: '',
        clientId,
        assessorId: authUser?.id ?? '',
        date: new Date().toISOString().slice(0, 10),
        postural,
        mobility,
        core,
        stability,
      }),
    [postural, mobility, core, stability, clientId, authUser?.id]
  );

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleObservation = (id: PosturalObservationId) => {
    setObservations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const setMobilityField = (key: keyof MovementAssessment['mobility'], value: number | null) => {
    setMobility((m) => ({ ...m, [key]: value }));
  };

  const buildAssessment = useCallback((): MovementAssessment | null => {
    if (!authUser?.id || !client) return null;
    const id = uuid.v4() as string;
    return {
      id,
      clientId,
      assessorId: authUser.id,
      date: new Date().toISOString().slice(0, 10),
      postural,
      mobility,
      core,
      stability,
      scores,
    };
  }, [authUser?.id, client, clientId, postural, mobility, core, stability, scores]);

  const submitAndGoToProgram = useCallback(async () => {
    if (!client?.email?.trim()) {
      Alert.alert('Saknar e-post', 'Klienten måste ha en e-postadress för att skicka till screening.');
      return;
    }
    if (!client.name.trim()) {
      Alert.alert('Saknar namn', 'Klienten måste ha ett namn.');
      return;
    }
    const assessment = buildAssessment();
    if (!assessment) {
      Alert.alert('Fel', 'Kunde inte skapa bedömningen.');
      return;
    }
    const full = { ...assessment, scores: computeScores(postural, mobility, core, stability) };
    const exportPayload = buildPerformExportPayload(full);
    const flatAssessmentColumns = buildFlatAssessmentColumns(full);

    setSubmitting(true);
    try {
      const res = await uploadMovementAssessment({
        person: {
          email: client.email.trim().toLowerCase(),
          name: client.name.trim(),
          team: undefined,
        },
        trackerClientId: clientId,
        assessment: full,
        exportPayload,
        flatAssessmentColumns,
      });
      if (!res.success) {
        throw new Error(res.error || 'Okänt fel');
      }

      // Link the auth user back to the client record so publish can find them later
      if (res.target_user_id && clientId) {
        await supabase
          .from('clients')
          .update({ client_user_id: res.target_user_id })
          .eq('id', clientId)
          .is('client_user_id', null);
      }

      navigation.navigate('MovementAssessmentProgramBuilder', {
        clientId,
        assessmentId: res.assessment_id ?? assessment.id,
        inviteSent: res.invite_sent,
        targetEmail: res.target_email ?? client.email.trim().toLowerCase(),
      });
    } catch (e) {
      Alert.alert('Kunde inte skicka', e instanceof Error ? e.message : 'Försök igen.');
    } finally {
      setSubmitting(false);
    }
  }, [
    client,
    buildAssessment,
    postural,
    mobility,
    core,
    stability,
    clientId,
    navigation,
  ]);

  if (!client) {
    return (
      <ScreenContainer title="Rörelsebedömning" scroll>
        <Text style={styles.errorText}>Klienten hittades inte.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Tillbaka</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  if (showResults) {
    return (
      <ScreenContainer
        title="Rörelsebedömning"
        subtitle={client.name}
        scroll
        headerLeft={
          <TouchableOpacity onPress={() => setShowResults(false)} hitSlop={12}>
            <Text style={styles.back}>Tillbaka</Text>
          </TouchableOpacity>
        }
      >
        <StepIndicator current={2} labels={STEP_LABELS} />
        <GlassCard padding={16} style={styles.card}>
          <Text
            style={[styles.totalScore, { color: bandColor(scores.band) }]}
            accessibilityRole="header"
          >
            {Math.round(scores.total * 10) / 10}
          </Text>
          <Text style={[styles.bandLabel, { color: bandColor(scores.band) }]}>
            {bandDisplaySv(scores.band)}
          </Text>

          <SectionRadarChart
            postural={scores.postural}
            mobility={scores.mobility}
            core={scores.core}
            stability={scores.stability}
          />

          <Text style={[styles.cardTitle, styles.mt]}>Delpoäng</Text>
          <Text style={styles.breakdown}>Hållning: {Math.round(scores.postural)}</Text>
          <Text style={styles.breakdown}>
            Rörlighet: {scores.mobility != null ? Math.round(scores.mobility) : 'Ej mätt'}
          </Text>
          <Text style={styles.breakdown}>
            Kärna: {scores.core != null ? Math.round(scores.core) : 'Ej mätt'}
          </Text>
          <Text style={styles.breakdown}>
            Stabilitet: {scores.stability != null ? Math.round(scores.stability) : 'Ej mätt'}
          </Text>

          <Text style={[styles.cardTitle, styles.mt]}>Prioriterade fynd</Text>
          {flags.length === 0 ? (
            <Text style={styles.muted}>Inga markerade avvikelser.</Text>
          ) : (
            flags.map((f) => (
              <View key={f.id} style={styles.flagRow}>
                <Text style={styles.flagLabel}>{f.label}</Text>
                {f.impactHint ? <Text style={styles.flagHint}>{f.impactHint}</Text> : null}
              </View>
            ))
          )}

          <Button
            label="Skicka och skapa program"
            variant="primary"
            onPress={submitAndGoToProgram}
            loading={submitting}
            disabled={submitting}
            style={styles.mt}
          />
        </GlassCard>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title="Rörelsebedömning"
      subtitle={client.name}
      scroll={false}
      headerRight={
        <Text style={styles.headerAthlete} numberOfLines={1}>
          {client.name}
        </Text>
      }
      headerLeft={
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>Avbryt</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator current={2} labels={STEP_LABELS} />

        <AccordionSection
          sectionKey="postural"
          title={SECTION_META.postural.title}
          icon={SECTION_META.postural.icon}
          iconBg={SECTION_META.postural.iconBg}
          score={scores.postural}
          open={openSections.postural}
          onToggle={toggleSection}
        >
          <Text style={styles.criteriaLabel}>Avvikelser (kryssa vid fynd)</Text>
          {POSTURAL_IDS.map((id) => (
            <TouchableOpacity
              key={id}
              style={styles.checkRow}
              onPress={() => toggleObservation(id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: observations.includes(id) }}
            >
              <View style={[styles.checkbox, observations.includes(id) && styles.checkboxOn]}>
                {observations.includes(id) ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={styles.checkLabel}>{POSTURAL_LABELS_SV[id]}</Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.inputLabel}>Anteckningar</Text>
          <TextInput
            style={styles.notes}
            value={posturalNotes}
            onChangeText={setPosturalNotes}
            placeholder="Observationer om hållning…"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
        </AccordionSection>

        <AccordionSection
          sectionKey="mobility"
          title={SECTION_META.mobility.title}
          icon={SECTION_META.mobility.icon}
          iconBg={SECTION_META.mobility.iconBg}
          score={scores.mobility}
          open={openSections.mobility}
          onToggle={toggleSection}
        >
          {MOBILITY_TESTS.map((t) => {
            const bilateralPoang = mobilityTestPoang(mobility, t);
            const leftPoang = mobilitySidePoang(mobility, t, 'left');
            const rightPoang = mobilitySidePoang(mobility, t, 'right');
            return (
              <View key={t.key} style={styles.mobilityBlock}>
                <Text style={styles.criteriaLabel}>{mobilityTestCriteriaLabel(t)}</Text>
                <View style={styles.lrRow}>
                  <View style={styles.lrCol}>
                    <Text style={styles.lrHint}>Vänster</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      placeholder={mobilityTestPlaceholder(t)}
                      placeholderTextColor={colors.textSecondary}
                      value={mobility[t.leftKey] != null ? String(mobility[t.leftKey]) : ''}
                      onChangeText={(s) => setMobilityField(t.leftKey, parseNum(s))}
                    />
                  </View>
                  <View style={styles.lrCol}>
                    <Text style={styles.lrHint}>Höger</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      placeholder={mobilityTestPlaceholder(t)}
                      placeholderTextColor={colors.textSecondary}
                      value={mobility[t.rightKey] != null ? String(mobility[t.rightKey]) : ''}
                      onChangeText={(s) => setMobilityField(t.rightKey, parseNum(s))}
                    />
                  </View>
                </View>
                {leftPoang != null || rightPoang != null ? (
                  <Text style={styles.mobilityScore}>
                    Delpoäng V/H: {leftPoang != null ? Math.round(leftPoang) : '-'} /{' '}
                    {rightPoang != null ? Math.round(rightPoang) : '-'}
                  </Text>
                ) : null}
                {bilateralPoang != null ? (
                  <Text style={styles.mobilityScore}>Delpoäng: {Math.round(bilateralPoang)}</Text>
                ) : null}
              </View>
            );
          })}
          <View style={styles.mobilityBlock}>
            <Text style={styles.criteriaLabel}>Overhead squat (°) · normal 80–90°</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="80–90"
              placeholderTextColor={colors.textSecondary}
              value={mobility.overheadSquat != null ? String(mobility.overheadSquat) : ''}
              onChangeText={(s) => setMobilityField('overheadSquat', parseNum(s))}
            />
            {mobility.overheadSquat != null ? (
              <Text style={styles.mobilityScore}>
                Delpoäng: {Math.round(scoreForValue(mobility.overheadSquat, 80, 90))}
              </Text>
            ) : null}
          </View>
          <View style={styles.mobilityBlock}>
            <Text style={styles.criteriaLabel}>Räckvidd över huvudet</Text>
            {(
              [
                ['symmetric', 'Symmetrisk'],
                ['minor_asymmetry', 'Lätt asymmetri'],
                ['major_asymmetry', 'Större asymmetri'],
              ] as const
            ).map(([val, label]) => (
              <TouchableOpacity
                key={val}
                style={styles.radioRow}
                onPress={() => setMobility((m) => ({ ...m, overheadReach: val }))}
              >
                <View style={[styles.radio, mobility.overheadReach === val && styles.radioOn]} />
                <Text style={styles.radioLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
            {overheadReachPoang != null ? (
              <Text style={styles.mobilityScore}>Delpoäng: {Math.round(overheadReachPoang)}</Text>
            ) : null}
          </View>
          <TextInput
            style={styles.notes}
            placeholder="Observationer om rörlighet…"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
        </AccordionSection>

        <AccordionSection
          sectionKey="core"
          title={SECTION_META.core.title}
          icon={SECTION_META.core.icon}
          iconBg={SECTION_META.core.iconBg}
          score={scores.core}
          open={openSections.core}
          onToggle={toggleSection}
        >
          <Text style={styles.criteriaLabel}>Andning</Text>
          {(
            [
              ['belly', 'Mag (diafragma)'],
              ['can_alternate', 'Kan variera'],
              ['double', 'Dubbel'],
              ['chest', 'Bröst'],
            ] as const
          ).map(([val, label]) => (
            <TouchableOpacity
              key={val}
              style={styles.radioRow}
              onPress={() => setCore((c) => ({ ...c, breathingPattern: val }))}
            >
              <View style={[styles.radio, core.breathingPattern === val && styles.radioOn]} />
              <Text style={styles.radioLabel}>{label}</Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.criteriaLabel, styles.mt]}>Rekryteringsmönster</Text>
          {(
            [
              ['ok', 'OK'],
              ['r_dominant', 'R-dominant'],
              ['wrong_order', 'Fel ordning'],
              ['cant_recruit', 'Kan inte rekrytera'],
            ] as const
          ).map(([val, label]) => (
            <TouchableOpacity
              key={val}
              style={styles.radioRow}
              onPress={() => setCore((c) => ({ ...c, recruitmentPattern: val }))}
            >
              <View style={[styles.radio, core.recruitmentPattern === val && styles.radioOn]} />
              <Text style={styles.radioLabel}>{label}</Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.criteriaLabel, styles.mt]}>Lumbopelvikontroll (vinkel)</Text>
          {(
            [
              ['0-10', '0–10°'],
              ['11-25', '11–25°'],
              ['26-45', '26–45°'],
              ['46-60', '46–60°'],
              ['61-75', '61–75°'],
              ['76-89', '76–89°'],
              ['90', '90° (med repetitioner)'],
            ] as const
          ).map(([val, label]) => (
            <TouchableOpacity
              key={val}
              style={styles.radioRow}
              onPress={() =>
                setCore((c) => ({
                  ...c,
                  lumbarPelvicAngle: val,
                  lumbarPelvicReps: val === '90' ? c.lumbarPelvicReps : null,
                }))
              }
            >
              <View style={[styles.radio, core.lumbarPelvicAngle === val && styles.radioOn]} />
              <Text style={styles.radioLabel}>{label}</Text>
            </TouchableOpacity>
          ))}

          {core.lumbarPelvicAngle === '90' && (
            <>
              <Text style={styles.inputLabel}>Antal repetitioner vid 90°</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                placeholder="1–16+"
                placeholderTextColor={colors.textSecondary}
                value={core.lumbarPelvicReps != null ? String(core.lumbarPelvicReps) : ''}
                onChangeText={(s) => {
                  const n = parseInt(s.replace(/\D/g, ''), 10);
                  setCore((c) => ({
                    ...c,
                    lumbarPelvicReps: Number.isFinite(n) ? n : null,
                  }));
                }}
              />
            </>
          )}

          <Text style={[styles.criteriaLabel, styles.mt]}>Statisk styrka huvud/hals (1–5)</Text>
          <View style={styles.scoreLabels}>
            <Text style={styles.scoreLabelText}>Kritisk (1)</Text>
            <Text style={styles.scoreLabelText}>Utmärkt (5)</Text>
          </View>
          <ScoreButtons
            value={core.neckStrengthGrade ?? undefined}
            onChange={(g) =>
              setCore((c) => ({
                ...c,
                neckStrengthGrade: g as 0 | 1 | 2 | 3 | 4 | 5,
              }))
            }
          />
        </AccordionSection>

        <AccordionSection
          sectionKey="stability"
          title={SECTION_META.stability.title}
          icon={SECTION_META.stability.icon}
          iconBg={SECTION_META.stability.iconBg}
          score={scores.stability}
          open={openSections.stability}
          onToggle={toggleSection}
        >
          <Text style={styles.criteriaLabel}>Pinnetest (markera svag/ostabil)</Text>
          <Text style={styles.stabilityHint}>
            Tryck för OK eller avvikelse. Omarkerade räknas inte.
          </Text>
          {(
            [
              ['transversalLeft', 'Transversal vänster'],
              ['transversalRight', 'Transversal höger'],
              ['frontalLeft', 'Frontal vänster'],
              ['frontalRight', 'Frontal höger'],
              ['sagital', 'Sagittal'],
              ['shouldersLeft', 'Axlar vänster'],
              ['shouldersRight', 'Axlar höger'],
              ['pelvicHip', 'Bäcken/höft'],
            ] as const
          ).map(([key, label]) => (
            <StabilityCheckRow
              key={key}
              label={label}
              value={stick[key]}
              onPress={() =>
                setStick((s) => ({ ...s, [key]: cycleStabilityCheckValue(s[key]) }))
              }
            />
          ))}
          <TextInput
            style={styles.notes}
            value={stick.notes}
            onChangeText={(t) => setStick((s) => ({ ...s, notes: t }))}
            placeholder="Anteckningar pinnetest"
            placeholderTextColor={colors.textSecondary}
            multiline
          />

          <Text style={[styles.criteriaLabel, styles.mt]}>
            Utfall (markera segment med dysfunktion)
          </Text>
          <Text style={styles.stabilityHint}>
            Tryck för OK eller avvikelse. Omarkerade räknas inte.
          </Text>
          {(
            [
              ['footLeft', 'Fot vänster'],
              ['footRight', 'Fot höger'],
              ['kneeLeft', 'Knä vänster'],
              ['kneeRight', 'Knä höger'],
              ['hipLeft', 'Höft vänster'],
              ['hipRight', 'Höft höger'],
              ['upperBodyLeft', 'Överkropp vänster'],
              ['upperBodyRight', 'Överkropp höger'],
              ['postureLeft', 'Hållning vänster'],
              ['postureRight', 'Hållning höger'],
            ] as const
          ).map(([key, label]) => (
            <StabilityCheckRow
              key={key}
              label={label}
              value={lunge[key]}
              onPress={() =>
                setLunge((s) => ({ ...s, [key]: cycleStabilityCheckValue(s[key]) }))
              }
            />
          ))}
          <TextInput
            style={styles.notes}
            value={lunge.notes}
            onChangeText={(t) => setLunge((s) => ({ ...s, notes: t }))}
            placeholder="Anteckningar utfall"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
        </AccordionSection>

        <View style={styles.preview}>
          <Text style={styles.previewText}>
            Förhandsvisning: {Math.round(scores.total * 10) / 10} · {bandDisplaySv(scores.band)}
          </Text>
          <TouchableOpacity onPress={() => setShowResults(true)} hitSlop={8}>
            <Text style={styles.previewLink}>Förhandsgranska resultat</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.submitBar}>
          <Button
            label="Tillbaka"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.submitBack}
          />
          <Button
            label="Fortsätt till program →"
            variant="primary"
            onPress={submitAndGoToProgram}
            loading={submitting}
            disabled={submitting}
            style={styles.submitPrimary}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { color: coachColors.coach, fontSize: 16, fontFamily: fonts.bodyMedium },
  headerAthlete: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: coachColors.coach,
    flexShrink: 1,
    maxWidth: 140,
    textAlign: 'right',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  sectionCard: {
    marginBottom: 12,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  sectionHeaderOpen: {
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconText: { fontSize: 16 },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: coachColors.fg,
    fontFamily: fonts.bodySemiBold,
  },
  sectionScore: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'right',
  },
  sectionChevronSvg: {},
  sectionChevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  sectionBody: { paddingVertical: 14, paddingHorizontal: 16 },
  card: { marginBottom: 16 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '600', marginBottom: 12 },
  criteriaLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: coachColors.fg,
    marginBottom: 8,
    fontFamily: fonts.bodyMedium,
  },
  mt: { marginTop: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: coachColors.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { borderColor: coachColors.coach, backgroundColor: coachColors.coachDim },
  checkboxOk: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.success,
    backgroundColor: colors.success + '22',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxIssue: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.danger,
    backgroundColor: colors.danger + '22',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: coachColors.coach, fontSize: 14, fontWeight: '700' },
  checkMarkOk: { color: colors.success, fontSize: 14, fontWeight: '700' },
  checkMarkIssue: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  stabilityHint: {
    color: coachColors.muted,
    fontSize: 12,
    marginBottom: 10,
    fontStyle: 'italic',
    fontFamily: fonts.body,
  },
  checkLabel: { color: coachColors.fg, flex: 1, fontSize: 15, fontFamily: fonts.body },
  inputLabel: {
    color: coachColors.muted,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 8,
    fontFamily: fonts.body,
  },
  notes: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: coachColors.border,
    color: coachColors.mutedHi,
    minHeight: 56,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    textAlignVertical: 'top',
    marginTop: 8,
    fontFamily: fonts.body,
  },
  mobilityBlock: { marginBottom: 16 },
  mobilityScore: {
    color: coachColors.coach,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    fontFamily: fonts.bodySemiBold,
  },
  lrRow: { flexDirection: 'row', gap: 12 },
  lrCol: { flex: 1 },
  lrHint: { color: coachColors.muted, fontSize: 12, marginBottom: 4, fontFamily: fonts.body },
  input: {
    backgroundColor: coachColors.glassBg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: coachColors.border,
    color: coachColors.fg,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: fonts.body,
  },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: coachColors.border,
    marginRight: 12,
  },
  radioOn: { borderColor: coachColors.coach, backgroundColor: coachColors.coach },
  radioLabel: { color: coachColors.fg, fontSize: 15, fontFamily: fonts.body },
  scoreLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scoreLabelText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: coachColors.muted,
  },
  preview: { marginTop: 8, marginBottom: 12 },
  previewLink: {
    marginTop: 6,
    color: coachColors.coach,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  previewText: {
    color: coachColors.muted,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: fonts.body,
  },
  submitBar: { flexDirection: 'row', gap: 8, paddingTop: 16 },
  submitBack: { flex: 1, height: 48, justifyContent: 'center' },
  submitPrimary: { flex: 2, height: 48, justifyContent: 'center' },
  totalScore: { fontSize: 48, fontWeight: '800', textAlign: 'center', fontFamily: fonts.display },
  bandLabel: { fontSize: 18, textAlign: 'center', marginBottom: 16, fontFamily: fonts.bodySemiBold },
  breakdown: { color: colors.text, fontSize: 15, marginBottom: 6, fontFamily: fonts.body },
  muted: { color: colors.textSecondary, fontSize: 14 },
  flagRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  flagLabel: { color: colors.text, fontSize: 15 },
  flagHint: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  errorText: { color: colors.text, textAlign: 'center', margin: 24 },
  link: { color: colors.primary, textAlign: 'center' },
});

export default MovementAssessmentScreen;
