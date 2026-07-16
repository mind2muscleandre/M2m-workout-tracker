import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionLabel } from '../components/ui/SectionLabel';
import { Button } from '../components/ui/Button';
import { SplitPane } from '../components/ui/SplitPane';
import { DetailPanel } from '../components/ui/DetailPanel';
import { StickyCTA } from '../components/ui/StickyCTA';
import { EnergySystemPill, EnergySystem } from '../components/ui/StatusPill';
import { useLayout } from '../lib/useLayout';
import { supabase } from '../lib/supabase';
import { PLATFORM_DB } from '../lib/dbTables';
import {
  fetchSessionExercises,
  weekScheduleForProgram,
  dayLabel,
} from '../services/platformAdapt';
import { fetchActiveProgramForAthlete } from '../services/platformAdapt';
import { fetchTrackerViewForUser } from '../services/platformTracker';
import {
  createTrackerProgramForAthlete,
  schedulePlannedSession,
} from '../services/platformTrackerWrite';
import type {
  AdaptProgramView,
  SessionExerciseRow,
  TrainingSessionRow,
  TrackerProgramView,
} from '../types/platform';
import { KravStrip } from '../components/coach/KravStrip';
import { BlockPhaseCard } from '../components/coach/BlockPhaseCard';
import { CoverageBanner } from '../components/coach/CoverageBanner';
import { SaveTemplateSheet } from '../components/coach/CoachModals';
import { coachColors, fonts, borderRadius } from '../lib/theme';

type Props = StackScreenProps<RootStackParamList, 'ProgramBuilder'>;

const DAY_LABELS = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];

const ENERGY_LEGEND: EnergySystem[] = ['atp', 'glyco', 'aero'];

const KRAV_CHIPS = [
  { label: 'HÖFT/LJUMSK-PRIO' },
  { label: 'UNILATERAL UNDERKROPP' },
  { label: 'MAXSTYRKA + POWER' },
  { label: 'FOTLED DORSALFLEX. 58', tone: 'scr' as const },
  { label: '12% ASYMMETRI VÄ FOTLED', tone: 'warn' as const },
];

export function ProgramBuilderScreen({ route, navigation }: Props) {
  const { programId, clientId, userId: routeUserId } = route.params;
  const { isMobile, isDesktop } = useLayout();
  const [mode, setMode] = useState<'adapt' | 'tracker'>('tracker');
  const [adaptView, setAdaptView] = useState<AdaptProgramView | null>(null);
  const [trackerView, setTrackerView] = useState<TrackerProgramView | null>(null);
  const [selectedSession, setSelectedSession] = useState<TrainingSessionRow | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [exercises, setExercises] = useState<SessionExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [programName, setProgramName] = useState('Coach-program');
  const [weeks, setWeeks] = useState('4');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleName, setScheduleName] = useState('Träningspass');
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);

  const athleteUserId = routeUserId ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (clientId) {
        const { data: client } = await supabase
          .from('clients')
          .select('client_user_id')
          .eq('id', clientId)
          .maybeSingle();
        const uid = client?.client_user_id ?? routeUserId;
        if (uid) {
          const [adapt, tracker] = await Promise.all([
            fetchActiveProgramForAthlete(uid).catch(() => null),
            programId
              ? loadTrackerProgram(programId)
              : fetchTrackerViewForUser(uid).catch(() => null),
          ]);
          setAdaptView(adapt);
          setTrackerView(tracker);
          if (tracker) setMode('tracker');
          else if (adapt) setMode('adapt');
          return;
        }
      }

      if (programId) {
        const tracker = await loadTrackerProgram(programId);
        if (tracker) {
          setTrackerView(tracker);
          setMode('tracker');
          return;
        }

        const { data: program, error } = await supabase
          .from(PLATFORM_DB.trainingPrograms)
          .select(
            'id, coach_id, name, description, program_type, duration_weeks, weeks, status, sport_tag'
          )
          .eq('id', programId)
          .maybeSingle();
        if (error) throw error;
        if (!program) return;

        const { data: sessions } = await supabase
          .from(PLATFORM_DB.trainingSessions)
          .select(
            'id, program_id, week_number, day_of_week, session_name, estimated_duration_minutes, warmup_notes, cooldown_notes'
          )
          .eq('program_id', programId)
          .order('week_number')
          .order('day_of_week');

        setAdaptView({
          program,
          assignment: null,
          sessions: (sessions ?? []) as TrainingSessionRow[],
          currentWeek: 1,
        });
        setMode('adapt');
      }
    } finally {
      setLoading(false);
    }
  }, [programId, clientId, routeUserId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useEffect(() => {
    if (!selectedSession) {
      setExercises([]);
      return;
    }
    fetchSessionExercises(selectedSession.id)
      .then(setExercises)
      .catch(() => setExercises([]));
  }, [selectedSession]);

  const handleCreate = async () => {
    const uid = athleteUserId ?? (await resolveUserId(clientId));
    if (!uid) {
      Alert.alert('Saknas', 'Välj en atlet med plattformskonto.');
      return;
    }
    try {
      const program = await createTrackerProgramForAthlete({
        athleteUserId: uid,
        name: programName.trim() || 'Coach-program',
        weeks: Math.max(1, Number(weeks) || 4),
        startDate: new Date().toISOString().slice(0, 10),
      });
      Alert.alert('Skapat', `Program "${program.name}" skapat.`);
      navigation.replace('ProgramBuilder', {
        programId: program.id,
        clientId,
        userId: uid,
      });
    } catch (e) {
      Alert.alert('Fel', (e as Error).message);
    }
  };

  const handleSchedule = async () => {
    const uid = athleteUserId ?? (await resolveUserId(clientId));
    if (!uid || !scheduleDate.trim()) {
      Alert.alert('Saknas', 'Ange datum och atlet.');
      return;
    }
    try {
      await schedulePlannedSession(uid, scheduleDate.trim(), scheduleName.trim());
      Alert.alert('Schemalagt', `Pass planerat ${scheduleDate}.`);
    } catch (e) {
      Alert.alert('Fel', (e as Error).message);
    }
  };

  const weekSchedule = adaptView ? weekScheduleForProgram(adaptView) : [];
  const trackerSlots = trackerView?.slots ?? [];
  const kravStripTitle = adaptView
    ? `KRAV · ${(adaptView.program.sport_tag ?? 'ATLET').toUpperCase()} + SCREENING`
    : '';

  const kravPanel =
    isDesktop && mode === 'adapt' && adaptView ? (
      <DetailPanel title="Krav & täckning">
        <KravStrip title={kravStripTitle} chips={KRAV_CHIPS} />
        {selectedSession ? (
          <>
            <CoverageBanner
              tone="unmatched"
              message="Elsas svagaste område är **fotled dorsalflexion (58)** — det täcks inte fullt ut av passet."
              fixLabel="FIXA →"
              onFix={() =>
                Alert.alert('Täckningsanalys', 'Öppna övningsbiblioteket för att lägga till fotledsövningar.')
              }
            />
            <CoverageBanner
              tone="matched"
              message="**Unilateral underkropp** och **maxstyrka** matchar kravprofilen."
            />
          </>
        ) : (
          <Text style={styles.muted}>Välj ett pass för att se kravmatchning.</Text>
        )}
      </DetailPanel>
    ) : null;

  const programListPane = (
    <View style={styles.listPane}>
      <Text style={styles.listHeader}>Atlet · Program</Text>
      <ScrollView style={styles.progList} showsVerticalScrollIndicator={false}>
        {trackerView ? (
          <TouchableOpacity style={[styles.progItem, styles.progItemActive]}>
            <Text style={styles.progItemName}>{trackerView.program.name}</Text>
            <Text style={styles.progItemSub}>
              Tracker · {trackerView.program.weeks ?? trackerView.program.duration_weeks ?? '?'} veckor
            </Text>
          </TouchableOpacity>
        ) : adaptView ? (
          <TouchableOpacity style={[styles.progItem, styles.progItemActive]}>
            <Text style={styles.progItemName}>{adaptView.program.name}</Text>
            <Text style={styles.progItemSub}>
              {adaptView.program.program_type ?? 'Program'} · Vecka {adaptView.currentWeek}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.muted}>Inga program</Text>
        )}
      </ScrollView>
    </View>
  );

  const detailPane = loading ? (
    <ActivityIndicator color={coachColors.coach} style={{ marginTop: 32 }} />
  ) : !adaptView && !trackerView ? (
    <View style={styles.createBlock}>
      <SectionLabel>Skapa Tracker-program</SectionLabel>
      <GlassCard style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Programnamn"
          placeholderTextColor={coachColors.muted}
          value={programName}
          onChangeText={setProgramName}
        />
        <TextInput
          style={styles.input}
          placeholder="Veckor"
          placeholderTextColor={coachColors.muted}
          value={weeks}
          onChangeText={setWeeks}
          keyboardType="numeric"
        />
        <Button label="Skapa program" onPress={handleCreate} />
      </GlassCard>
    </View>
  ) : mode === 'tracker' && trackerView ? (
    <ScrollView
      style={styles.detailScroll}
      contentContainerStyle={[styles.detailContent, isMobile && styles.detailContentMobile]}
    >
      <View style={styles.detailHeader}>
        <View>
          <Text style={styles.detailTitle}>{trackerView.program.name}</Text>
          <Text style={styles.sub}>
            Tracker · {trackerView.program.weeks ?? trackerView.program.duration_weeks ?? '?'}{' '}
            veckor · {trackerView.program.status ?? '—'}
          </Text>
        </View>
      </View>

      <SectionLabel>Passmallar</SectionLabel>
      {trackerView.templates.map((t) => (
        <GlassCard key={t.id} style={styles.sessionCard}>
          <Text style={styles.sessionTitle}>{t.name}</Text>
          <Text style={styles.sub}>
            {t.goal_key} · {t.exercise_count} övningar
          </Text>
        </GlassCard>
      ))}

      <GlassCard style={styles.card}>
        <SectionLabel>Veckoschema (slots)</SectionLabel>
        <View style={styles.weekGrid}>
          {trackerSlots.length === 0 ? (
            <Text style={styles.muted}>Inget schema</Text>
          ) : (
            trackerSlots.slice(0, 21).map((slot, idx) => {
              const template = trackerView.templates.find((t) => t.id === slot.template_id);
              const isRest = !template;
              return (
                <TouchableOpacity
                  key={slot.id}
                  onPress={() => setSelectedDayIndex(idx)}
                  style={[
                    styles.dayCard,
                    selectedDayIndex === idx && styles.dayCardSelected,
                    isRest && styles.dayCardRest,
                  ]}
                >
                  <Text style={styles.dayHeader}>
                    V{slot.week_index + 1} {DAY_LABELS[slot.day_index] ?? `D${slot.day_index}`}
                  </Text>
                  <View style={styles.dayBody}>
                    <Text style={styles.dayType}>{template?.name ?? 'Vila'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </GlassCard>

      <SectionLabel>Schemalägg enstaka pass</SectionLabel>
      <GlassCard style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={coachColors.muted}
          value={scheduleDate}
          onChangeText={setScheduleDate}
        />
        <TextInput
          style={styles.input}
          placeholder="Passnamn"
          placeholderTextColor={coachColors.muted}
          value={scheduleName}
          onChangeText={setScheduleName}
        />
        <Button label="Schemalägg" variant="secondary" onPress={handleSchedule} />
      </GlassCard>
    </ScrollView>
  ) : adaptView ? (
    <ScrollView
      style={styles.detailScroll}
      contentContainerStyle={[styles.detailContent, isMobile && styles.detailContentMobile]}
    >
      <View style={styles.detailHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailTitle}>{adaptView.program.name}</Text>
          <Text style={styles.sub}>
            {adaptView.program.sport_tag ?? 'Program'} ·{' '}
            {adaptView.program.duration_weeks ?? adaptView.program.weeks ?? '?'} veckor ·{' '}
            {adaptView.sessions.length} pass
          </Text>
        </View>
        <TouchableOpacity style={styles.saveTpl} onPress={() => setTemplateSheetOpen(true)}>
          <Text style={styles.saveTplText}>Spara som mall</Text>
        </TouchableOpacity>
      </View>

      {!isDesktop ? <KravStrip title={kravStripTitle} chips={KRAV_CHIPS} /> : null}

      <SectionLabel>Block</SectionLabel>
      <BlockPhaseCard
        block={{
          id: 'b1',
          phaseLabel: 'BLOCK 1',
          title: 'Hypertrofi & bas',
          meta: `VECKA 1–4 · KLART · ${adaptView.sessions.length} PASS`,
          weeks: ['done', 'done', 'done', 'done'],
          onOpenSessions: () => adaptView.sessions[0] && setSelectedSession(adaptView.sessions[0]),
          onSaveTemplate: () => setTemplateSheetOpen(true),
        }}
      />
      <BlockPhaseCard
        block={{
          id: 'b2',
          phaseLabel: 'BLOCK 2',
          title: 'Maxstyrka',
          meta: `VECKA 5–8 · PÅGÅR · VECKA ${adaptView.currentWeek}`,
          weeks: ['done', 'done', 'current', 'plan'],
          accent: true,
          onOpenSessions: () => adaptView.sessions[0] && setSelectedSession(adaptView.sessions[0]),
          onSaveTemplate: () => setTemplateSheetOpen(true),
        }}
      />

      {!isDesktop && selectedSession ? (
        <>
          <CoverageBanner
            tone="unmatched"
            message="Elsas svagaste område är **fotled dorsalflexion (58)** — det täcks inte fullt ut av passet."
            fixLabel="FIXA →"
            onFix={() => Alert.alert('Täckningsanalys', 'Öppna övningsbiblioteket för att lägga till fotledsövningar.')}
          />
          <CoverageBanner
            tone="matched"
            message="**Unilateral underkropp** och **maxstyrka** matchar kravprofilen."
          />
        </>
      ) : null}

      <GlassCard style={styles.card}>
        <SectionLabel>Veckoschema</SectionLabel>
        <View style={styles.weekGrid}>
          {weekSchedule.map((d, idx) => (
            <TouchableOpacity
              key={d.day}
              disabled={!d.session}
              onPress={() => {
                if (d.session) {
                  setSelectedSession(d.session);
                  setSelectedDayIndex(idx);
                }
              }}
              style={[
                styles.dayCard,
                selectedDayIndex === idx && styles.dayCardSelected,
                d.isRest && styles.dayCardRest,
              ]}
            >
              <Text style={styles.dayHeader}>{d.label}</Text>
              <View style={styles.dayBody}>
                <Text style={[styles.dayType, d.isRest && { color: coachColors.muted }]}>
                  {d.session ? d.session.session_name : 'Vila'}
                </Text>
                {d.session ? (
                  <Text style={styles.daySets} numberOfLines={1}>
                    {d.session.estimated_duration_minutes
                      ? `~${d.session.estimated_duration_minutes} min`
                      : 'Pass'}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      {selectedSession ? (
        <GlassCard style={styles.card}>
          <View style={styles.dayDetailHeader}>
            <View>
              <Text style={styles.dayDetailTitle}>
                {dayLabel(selectedSession.day_of_week)} — {selectedSession.session_name}
              </Text>
              <Text style={styles.sub}>
                Uppskattad tid: {selectedSession.estimated_duration_minutes ?? '?'} min
              </Text>
            </View>
          </View>

          <View style={styles.exTable}>
            <View style={styles.exTableHead}>
              <Text style={[styles.exTh, styles.exColNum]}>#</Text>
              <Text style={[styles.exTh, styles.exColName]}>Övning</Text>
              <Text style={[styles.exTh, styles.exColSets]}>Set × Rep</Text>
              <Text style={[styles.exTh, styles.exColLoad]}>Belastning</Text>
            </View>
            {exercises.length === 0 ? (
              <Text style={styles.muted}>Inga övningar</Text>
            ) : (
              exercises.map((ex, i) => (
                <View key={ex.id} style={styles.exTableRow}>
                  <Text style={[styles.exNum, styles.exColNum]}>{i + 1}</Text>
                  <Text style={[styles.exName, styles.exColName]} numberOfLines={1}>
                    Övning {i + 1}
                  </Text>
                  <Text style={[styles.exSets, styles.exColSets]}>
                    {ex.sets ?? '?'}×{ex.reps ?? '?'}
                  </Text>
                  <Text style={[styles.exLoad, styles.exColLoad]}>
                    {ex.load_prescription ?? '—'}
                  </Text>
                </View>
              ))
            )}
          </View>
        </GlassCard>
      ) : null}

      <GlassCard variant="coach" style={styles.timerNotice}>
        <Text style={styles.timerNoticeIcon}>⏱</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.timerNoticeTitle}>M2M Timer kopplad</Text>
          <Text style={styles.timerNoticeSub}>
            Vilotider och intervaller skickas till Timer-appen när session startas.
          </Text>
        </View>
        <Button
          label="Starta session"
          variant="primary"
          size="sm"
          onPress={() => navigation.navigate('SessionTimer', { clientId: clientId ?? '' })}
        />
      </GlassCard>
    </ScrollView>
  ) : null;

  type StickyCta = { label: string; sublabel?: string; locked?: boolean; onPress?: () => void };
  const stickyCta: StickyCta | null = !isMobile || loading
    ? null
    : !adaptView && !trackerView
      ? { label: 'Skapa program', onPress: handleCreate }
      : mode === 'adapt' && selectedSession
        ? {
            label: 'Starta session',
            sublabel: dayLabel(selectedSession.day_of_week),
            onPress: () => navigation.navigate('SessionTimer', { clientId: clientId ?? '' }),
          }
        : mode === 'tracker' && trackerView
          ? { label: 'Schemalägg pass', onPress: handleSchedule }
          : { label: 'Välj ett pass för att starta', locked: true };

  return (
    <ScreenContainer
      title="Adapt — Program"
      scroll={false}
      detailPanel={kravPanel}
      headerLeft={
        <Button label="Tillbaka" size="sm" onPress={() => navigation.goBack()} />
      }
      headerRight={
        <View style={styles.headerActions}>
          <View style={styles.sysLegend}>
            {ENERGY_LEGEND.map((system) => (
              <EnergySystemPill key={system} system={system} />
            ))}
            <View style={styles.sysLegendItem}>
              <View style={styles.sysRestDot} />
              <Text style={styles.sysLegendText}>Vila</Text>
            </View>
          </View>
          <Button label="Nytt program" variant="primary" size="sm" onPress={handleCreate} />
        </View>
      }
    >
      {loading ? (
        <ActivityIndicator color={coachColors.coach} style={{ marginTop: 32 }} />
      ) : !adaptView && !trackerView ? (
        detailPane
      ) : (
        <SplitPane
          list={programListPane}
          detail={detailPane}
          listWidth={isDesktop ? 320 : 280}
          showDetail
        />
      )}
      {stickyCta ? (
        <StickyCTA
          variant="flush"
          label={stickyCta.label}
          sublabel={stickyCta.sublabel}
          locked={stickyCta.locked}
          onPress={stickyCta.onPress}
        />
      ) : null}
      <SaveTemplateSheet
        visible={templateSheetOpen}
        onClose={() => setTemplateSheetOpen(false)}
        onSave={() => {
          setTemplateSheetOpen(false);
          Alert.alert('Sparat', 'Blockmall sparad i mallbiblioteket.');
        }}
        preview={`${adaptView?.program.duration_weeks ?? 4} VECKOR · ${adaptView?.sessions.length ?? 0} PASS`}
      />
    </ScreenContainer>
  );
}

async function loadTrackerProgram(programId: string): Promise<TrackerProgramView | null> {
  const { data: program, error } = await supabase
    .from(PLATFORM_DB.trainingPrograms)
    .select(
      'id, coach_id, user_id, name, description, program_type, duration_weeks, weeks, status, sport_tag, start_date'
    )
    .eq('id', programId)
    .maybeSingle();
  if (error || !program) return null;

  const [templatesRes, slotsRes] = await Promise.all([
    supabase
      .from(PLATFORM_DB.workoutTemplates)
      .select('id, user_id, program_id, name, goal_key, exercise_count, sort_order, content')
      .eq('program_id', programId)
      .order('sort_order'),
    supabase
      .from(PLATFORM_DB.programScheduleSlots)
      .select('id, program_id, week_index, day_index, template_id')
      .eq('program_id', programId)
      .order('week_index')
      .order('day_index'),
  ]);

  const userId = (program as { user_id?: string }).user_id;
  let sessions: TrackerProgramView['sessions'] = [];
  if (userId) {
    const { fetchTrackerSessions } = await import('../services/platformTracker');
    sessions = await fetchTrackerSessions(userId);
  }

  return {
    program: program as TrackerProgramView['program'],
    templates: (templatesRes.data ?? []) as TrackerProgramView['templates'],
    slots: (slotsRes.data ?? []) as TrackerProgramView['slots'],
    sessions,
    trends: [],
  };
}

async function resolveUserId(clientId?: string): Promise<string | null> {
  if (!clientId) return null;
  const { data } = await supabase
    .from('clients')
    .select('client_user_id')
    .eq('id', clientId)
    .maybeSingle();
  return data?.client_user_id ?? null;
}

const styles = StyleSheet.create({
  listPane: { flex: 1 },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
  },
  progList: { flex: 1, padding: 8 },
  progItem: {
    padding: 10,
    borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  progItemActive: {
    backgroundColor: coachColors.glassBgCoach,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.20)',
  },
  progItemName: { fontSize: 13, fontWeight: '500', color: coachColors.fg },
  progItemSub: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  detailScroll: { flex: 1 },
  detailContent: { padding: 16, gap: 4, paddingBottom: 32 },
  detailContentMobile: { paddingBottom: 120 },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'flex-start',
    gap: 10,
  },
  saveTpl: {
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveTplText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.8,
    color: coachColors.mutedHi,
    textTransform: 'uppercase',
  },
  detailTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700',
    color: coachColors.fg,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  card: { padding: 16, marginBottom: 12 },
  createBlock: { gap: 12, padding: 16 },
  title: { fontFamily: fonts.display, fontSize: 20, fontWeight: '700', color: coachColors.fg },
  sub: { fontFamily: fonts.mono, fontSize: 10, color: coachColors.muted, marginTop: 4 },
  readOnly: {
    fontSize: 11,
    color: coachColors.orange,
    marginTop: 8,
    fontFamily: fonts.mono,
    textTransform: 'uppercase',
  },
  weekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  dayCard: {
    width: '13.5%',
    minWidth: 72,
    flexGrow: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: coachColors.glassBg,
    overflow: 'hidden',
  },
  dayCardSelected: {
    borderColor: coachColors.coach,
    backgroundColor: coachColors.glassBgCoach,
  },
  dayCardRest: { opacity: 0.45 },
  dayHeader: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.muted,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  dayBody: { padding: 8 },
  dayType: {
    fontFamily: fonts.display,
    fontSize: 13,
    fontWeight: '700',
    color: coachColors.fg,
    lineHeight: 14,
    marginBottom: 4,
  },
  daySets: { fontSize: 10, color: coachColors.muted, fontFamily: fonts.body },
  dayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayDetailTitle: { fontSize: 14, fontWeight: '600', color: coachColors.fg },
  exTable: { marginTop: 4 },
  exTableHead: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  exTh: {
    fontFamily: fonts.mono,
    fontSize: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
  },
  exTableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
    alignItems: 'center',
  },
  exColNum: { width: 24 },
  exColName: { flex: 2 },
  exColSets: { flex: 1 },
  exColLoad: { flex: 1, textAlign: 'right' },
  exNum: { fontFamily: fonts.mono, fontSize: 10, color: coachColors.muted },
  exName: { fontSize: 13, fontWeight: '500', color: coachColors.fg },
  exSets: { fontFamily: fonts.mono, fontSize: 12, color: coachColors.mutedHi },
  exLoad: {
    fontFamily: fonts.display,
    fontSize: 14,
    fontWeight: '700',
    color: coachColors.coach,
    textAlign: 'right',
  },
  sessionCard: { padding: 14, marginBottom: 8 },
  sessionTitle: { fontSize: 14, fontWeight: '500', color: coachColors.fg },
  input: {
    borderWidth: 1,
    borderColor: coachColors.border,
    borderRadius: borderRadius.md,
    padding: 12,
    color: coachColors.fg,
    fontFamily: fonts.body,
    fontSize: 14,
    marginBottom: 8,
  },
  muted: { color: coachColors.muted, fontSize: 13, fontFamily: fonts.body },
  timerNotice: {
    padding: 14,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  timerNoticeIcon: { fontSize: 22, color: coachColors.coach },
  timerNoticeTitle: { fontSize: 13, fontWeight: '600', color: coachColors.fg, marginBottom: 2, fontFamily: fonts.bodySemiBold },
  timerNoticeSub: { fontSize: 11, color: coachColors.muted, fontFamily: fonts.body, flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sysLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sysLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 2 },
  sysRestDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: coachColors.muted,
  },
  sysLegendText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.muted,
  },
});
