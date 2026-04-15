import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
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
} from '../types/movementAssessment';
import {
  computeScores,
  MOBILITY_TESTS,
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
import type { ScoreBand } from '../types/movementAssessment';

type Props = StackScreenProps<RootStackParamList, 'MovementAssessment'>;

const colors = {
  background: '#0F0F0F',
  card: '#1A1A1A',
  primary: '#F7E928',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#2C2C2E',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
};

const POSTURAL_IDS = Object.keys(POSTURAL_LABELS_SV) as PosturalObservationId[];

function bandColor(band: ScoreBand): string {
  switch (band) {
    case 'excellent':
      return colors.success;
    case 'good':
      return '#32D74B';
    case 'fair':
      return colors.warning;
    case 'poor':
      return '#FF9F0A';
    default:
      return colors.danger;
  }
}

function parseNum(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const MOBILITY_TOTAL_FIELDS = 36;

function countMobilityFilled(m: MovementAssessment['mobility']): number {
  let n = 0;
  for (const t of MOBILITY_TESTS) {
    if (m[t.leftKey] != null) n++;
    if (m[t.rightKey] != null) n++;
  }
  if (m.overheadSquat != null) n++;
  if (m.overheadReach != null) n++;
  return n;
}

function countCoreFilled(c: MovementAssessment['core']): number {
  let n = 0;
  if (c.breathingPattern != null) n++;
  if (c.recruitmentPattern != null) n++;
  if (c.lumbarPelvicAngle != null) n++;
  if (c.lumbarPelvicAngle === '90' && c.lumbarPelvicReps != null) n++;
  if (c.neckStrengthGrade != null) n++;
  return n;
}

function coreDenom(c: MovementAssessment['core']): number {
  return c.lumbarPelvicAngle === '90' ? 5 : 4;
}

function MovementAssessmentScreen({ navigation, route }: Props) {
  const { clientId } = route.params;
  const clients = useClientStore((s) => s.clients);
  const client = useMemo(() => clients.find((c) => c.id === clientId) ?? null, [clients, clientId]);
  const authUser = useAuthStore((s) => s.user);

  const [step, setStep] = useState(0);
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
  const stability = useMemo(() => ({ stickTest: stick, lungeTest: lunge }), [stick, lunge]);

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

  const completionPercent = useMemo(() => {
    if (step >= 4) return 100;
    const mob = countMobilityFilled(mobility) / MOBILITY_TOTAL_FIELDS;
    const cd = coreDenom(core);
    const co = cd > 0 ? Math.min(1, countCoreFilled(core) / cd) : 0;
    const post = 1;
    const stab = 1;
    const depth = (post + mob + co + stab) / 4;
    return Math.min(99, Math.round(((step + depth) / 4) * 100));
  }, [step, mobility, core]);

  const toggleObservation = (id: PosturalObservationId) => {
    setObservations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const setMobilityField = (key: keyof MovementAssessment['mobility'], value: number | null) => {
    setMobility((m) => ({ ...m, [key]: value }));
  };

  const goNext = () => {
    if (step < 4) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else navigation.goBack();
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

  const handleSubmit = async () => {
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
      if (res.success) {
        Alert.alert('Skickat', 'Bedömningen har sparats i screening.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error(res.error || 'Okänt fel');
      }
    } catch (e) {
      Alert.alert('Kunde inte skicka', e instanceof Error ? e.message : 'Försök igen.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!client) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.errorText}>Klienten hittades inte.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Tillbaka</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const sectionTitle =
    step === 0
      ? 'Hållning'
      : step === 1
        ? 'Rörlighet och mobilitet'
        : step === 2
          ? 'Kärna'
          : step === 3
            ? 'Stabilitet'
            : 'Resultat';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} hitSlop={12}>
          <Text style={styles.back}>{step === 0 ? 'Avbryt' : 'Tillbaka'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rörelsebedömning</Text>
        <Text style={styles.headerSub}>{client.name}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
      </View>
      <Text style={styles.progressLabel}>
        {sectionTitle} · {completionPercent}% ifyllt
      </Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Avvikelser (kryssa vid fynd)</Text>
            {POSTURAL_IDS.map((id) => (
              <TouchableOpacity
                key={id}
                style={styles.checkRow}
                onPress={() => toggleObservation(id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: observations.includes(id) }}
              >
                <View
                  style={[
                    styles.checkbox,
                    observations.includes(id) && styles.checkboxOn,
                  ]}
                >
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
              placeholder="Valfritt"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </View>
        )}

        {step === 1 && (
          <View style={styles.card}>
            {MOBILITY_TESTS.map((t) => {
              const bilateralPoang = mobilityTestPoang(mobility, t);
              const leftPoang = mobilitySidePoang(mobility, t, 'left');
              const rightPoang = mobilitySidePoang(mobility, t, 'right');
              return (
                <View key={t.key} style={styles.mobilityBlock}>
                  <Text style={styles.mobilityTitle}>
                    {t.labelSv} (normal {t.min}–{t.max}
                    {t.key === 'shoulder_pos' ? ' cm' : t.key === 'ankle' ? ' cm' : '°'})
                  </Text>
                  <View style={styles.lrRow}>
                    <View style={styles.lrCol}>
                      <Text style={styles.lrHint}>Vänster</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        placeholder={`${t.min}–${t.max}`}
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
                        placeholder={`${t.min}–${t.max}`}
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
              <Text style={styles.mobilityTitle}>Overhead squat (°) · normal 80–90°</Text>
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
              <Text style={styles.mobilityTitle}>Räckvidd över huvudet</Text>
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
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Andning</Text>
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

            <Text style={[styles.cardTitle, styles.mt]}>Rekryteringsmönster</Text>
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

            <Text style={[styles.cardTitle, styles.mt]}>Lumbopelvikontroll (vinkel)</Text>
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

            <Text style={[styles.cardTitle, styles.mt]}>Statisk styrka huvud/hals (0–5)</Text>
            <View style={styles.gradeRow}>
              {([0, 1, 2, 3, 4, 5] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.gradeBtn, core.neckStrengthGrade === g && styles.gradeBtnOn]}
                  onPress={() => setCore((c) => ({ ...c, neckStrengthGrade: g }))}
                >
                  <Text
                    style={[
                      styles.gradeBtnText,
                      core.neckStrengthGrade === g && styles.gradeBtnTextOn,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pinnetest (markera svag/ostabil)</Text>
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
              <TouchableOpacity
                key={key}
                style={styles.checkRow}
                onPress={() => setStick((s) => ({ ...s, [key]: !s[key] }))}
              >
                <View style={[styles.checkbox, stick[key] && styles.checkboxOn]}>
                  {stick[key] ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
                <Text style={styles.checkLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.notes}
              value={stick.notes}
              onChangeText={(t) => setStick((s) => ({ ...s, notes: t }))}
              placeholder="Anteckningar pinnetest"
              placeholderTextColor={colors.textSecondary}
              multiline
            />

            <Text style={[styles.cardTitle, styles.mt]}>Utfall (markera segment med dysfunktion)</Text>
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
              <TouchableOpacity
                key={key}
                style={styles.checkRow}
                onPress={() => setLunge((s) => ({ ...s, [key]: !s[key] }))}
              >
                <View style={[styles.checkbox, lunge[key] && styles.checkboxOn]}>
                  {lunge[key] ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
                <Text style={styles.checkLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.notes}
              value={lunge.notes}
              onChangeText={(t) => setLunge((s) => ({ ...s, notes: t }))}
              placeholder="Anteckningar utfall"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </View>
        )}

        {step === 4 && (
          <View style={styles.card}>
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
              Rörlighet:{' '}
              {scores.mobility != null ? Math.round(scores.mobility) : 'Ej mätt'}
            </Text>
            <Text style={styles.breakdown}>
              Kärna: {scores.core != null ? Math.round(scores.core) : 'Ej mätt'}
            </Text>
            <Text style={styles.breakdown}>Stabilitet: {Math.round(scores.stability)}</Text>

            <Text style={[styles.cardTitle, styles.mt]}>Prioriterade fynd</Text>
            {flags.length === 0 ? (
              <Text style={styles.muted}>Inga markerade avvikelser.</Text>
            ) : (
              flags.map((f) => (
                <View key={f.id} style={styles.flagRow}>
                  <Text style={styles.flagLabel}>{f.label}</Text>
                  {f.impactHint ? (
                    <Text style={styles.flagHint}>{f.impactHint}</Text>
                  ) : null}
                </View>
              ))
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Skicka till screening</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {step < 4 && (
        <View style={styles.footer}>
          <View style={styles.preview}>
            <Text style={styles.previewText}>
              Förhandsvisning: {Math.round(scores.total * 10) / 10} ·{' '}
              {bandDisplaySv(scores.band)}
            </Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
            <Text style={styles.primaryBtnText}>{step === 3 ? 'Visa resultat' : 'Nästa'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 8, paddingBottom: 8 },
  back: { color: colors.primary, fontSize: 16, marginBottom: 8 },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: '700' },
  headerSub: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '600', marginBottom: 12 },
  mt: { marginTop: 20 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { borderColor: colors.primary, backgroundColor: colors.primary + '33' },
  checkMark: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  checkLabel: { color: colors.text, flex: 1, fontSize: 15 },
  inputLabel: { color: colors.textSecondary, fontSize: 13, marginBottom: 6, marginTop: 8 },
  notes: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    minHeight: 80,
    padding: 12,
    textAlignVertical: 'top',
  },
  mobilityBlock: { marginBottom: 20 },
  mobilityTitle: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  mobilityScore: { color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 8 },
  lrRow: { flexDirection: 'row', gap: 12 },
  lrCol: { flex: 1 },
  lrHint: { color: colors.textSecondary, fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 12,
    fontSize: 16,
  },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
  },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioLabel: { color: colors.text, fontSize: 15 },
  gradeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gradeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gradeBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  gradeBtnText: { color: colors.text, fontSize: 16 },
  gradeBtnTextOn: { color: '#000', fontWeight: '700' },
  totalScore: { fontSize: 48, fontWeight: '800', textAlign: 'center' },
  bandLabel: { fontSize: 18, textAlign: 'center', marginBottom: 16 },
  breakdown: { color: colors.text, fontSize: 15, marginBottom: 6 },
  muted: { color: colors.textSecondary, fontSize: 14 },
  flagRow: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  flagLabel: { color: colors.text, fontSize: 15 },
  flagHint: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  preview: { marginBottom: 12 },
  previewText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  errorText: { color: colors.text, textAlign: 'center', margin: 24 },
  link: { color: colors.primary, textAlign: 'center' },
});

export default MovementAssessmentScreen;
