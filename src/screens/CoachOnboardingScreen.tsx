import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionLabel } from '../components/ui/SectionLabel';
import { StepIndicator } from '../components/ui/StepIndicator';
import { StickyCTA } from '../components/ui/StickyCTA';
import { ProgressBar } from '../components/ui/ProgressBar';
import { markCoachOnboardingComplete } from '../lib/coachOnboarding';
import { coachColors, fonts, borderRadius } from '../lib/theme';

const SPORT_OPTIONS = ['Hockey', 'Fotboll', 'Basket', 'Löpning', 'Golf', 'Friidrott'];
const OTHER_SPORT = 'Annan';
const FOCUS_OPTIONS = ['Fysträning / S&C', 'Rehab', 'Ungdomsutveckling', 'Elit / senior'];

const ACTIVATION_STEPS = [
  {
    key: 'profile',
    label: 'Coachprofil',
    title: 'Din coachprofil',
    body: 'Vi anpassar kravprofiler, mallar och rekommendationer efter hur du tränar dina atleter.',
  },
  {
    key: 'ready',
    label: 'Klar',
    title: 'Redo att coacha',
    body: 'Din panel är konfigurerad. Börja med att tilldela din första atlet eller utforska helhetsvyn.',
  },
] as const;

type Nav = StackNavigationProp<RootStackParamList, 'CoachOnboarding'>;
type Route = RouteProp<RootStackParamList, 'CoachOnboarding'>;

const STEPS = [
  {
    key: 'overview',
    label: 'Överblick',
    title: 'Hela truppen i en vy',
    body: 'Se vilka atleter tränar, vilka behöver återhämtning och vilka kräver uppföljning — utan att växla mellan appar.',
    projection: '24 atleter · 3 varningar idag',
  },
  {
    key: 'integration',
    label: 'Integration',
    title: 'Data från hela M2M-ekosystemet',
    body: 'Adapt-program, Timer-pass, Goalsetter-mål och Macro-kost samlas i samma atletprofil när atleten delar data med dig.',
    projection: 'Snitt målstatus 68 % · 47 sessioner / månad',
  },
  {
    key: 'account',
    label: 'Konto',
    title: 'Redo att coacha smartare',
    body: 'Din coach-panel är förberedd. Spara den genom att skapa konto — du kan börja tilldela atleter direkt efter inloggning.',
    projection: 'Steg 1: tilldela atlet · Steg 2: starta session',
  },
] as const;

export default function CoachOnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const flow = route.params?.flow ?? 'welcome';
  const isPostAuth = flow === 'activation';

  const [step, setStep] = useState(0);
  const [sports, setSports] = useState<string[]>(['Hockey', 'Fotboll']);
  const [focus, setFocus] = useState<string[]>(['Fysträning / S&C', 'Ungdomsutveckling']);
  const [capacity, setCapacity] = useState(15);

  const activationFlow = isPostAuth;
  const steps = activationFlow ? ACTIVATION_STEPS : STEPS;
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const indicatorStep = step + 2;
  const indicatorTotal = activationFlow ? 3 : 4;

  const ctaLabel = useMemo(() => {
    if (!isLast) return 'Fortsätt';
    return isPostAuth ? 'Gå till min dashboard' : 'Spara min coach-panel — skapa konto';
  }, [isLast, isPostAuth]);

  const handleBack = useCallback(async () => {
    if (step > 0) {
      setStep((s) => s - 1);
      return;
    }
    if (isPostAuth) {
      await markCoachOnboardingComplete();
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Auth');
    }
  }, [navigation, step, isPostAuth]);

  const handlePrimary = useCallback(async () => {
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }

    if (isPostAuth) {
      await markCoachOnboardingComplete();
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
      return;
    }

    navigation.navigate('Auth', { mode: 'signup' });
  }, [isLast, isPostAuth, navigation]);

  const progressPct = Math.round(((indicatorStep - 1) / (indicatorTotal - 1)) * 100);

  return (
    <View style={styles.root}>
      <View style={styles.ambientTop} pointerEvents="none" />
      <View style={styles.ambientBottom} pointerEvents="none" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>M2M Coach</Text>
          <Text style={styles.kicker}>Coach Platform</Text>
        </View>

        {activationFlow ? (
          <View style={styles.stepBarsWrap}>
            <View style={styles.stepBars}>
              {Array.from({ length: indicatorTotal }, (_, i) => (
                <View key={i} style={[styles.stepBar, i < indicatorStep && styles.stepBarOn]} />
              ))}
            </View>
            <Text style={styles.stepBarLabel}>
              STEG {indicatorStep} AV {indicatorTotal}
            </Text>
          </View>
        ) : (
          <>
            <StepIndicator
              current={indicatorStep}
              total={indicatorTotal}
              labels={['Start', ...STEPS.map((s) => s.label)]}
            />

            <ProgressBar
              value={progressPct}
              label={`Steg ${indicatorStep} av ${indicatorTotal}`}
              variant="coach"
            />
          </>
        )}

        <GlassCard variant="coach" padding={18}>
          <SectionLabel>{current.label}</SectionLabel>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>
          {!activationFlow && 'projection' in current ? (
            <View style={styles.projectionBox}>
              <Text style={styles.projectionLabel}>Projektion</Text>
              <Text style={styles.projectionValue}>{current.projection}</Text>
            </View>
          ) : null}
        </GlassCard>

        {activationFlow && step === 0 ? (
          <>
            <SectionLabel>Idrotter du coachar</SectionLabel>
            <View style={styles.chips}>
              {SPORT_OPTIONS.map((s) => {
                const on = sports.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() =>
                      setSports((prev) => (on ? prev.filter((x) => x !== s) : [...prev, s]))
                    }
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
              {(() => {
                const otherOn = sports.includes(OTHER_SPORT);
                return (
                  <TouchableOpacity
                    style={[styles.chip, otherOn && styles.chipOn]}
                    onPress={() =>
                      setSports((prev) =>
                        otherOn ? prev.filter((x) => x !== OTHER_SPORT) : [...prev, OTHER_SPORT]
                      )
                    }
                  >
                    <Text style={[styles.chipText, otherOn && styles.chipTextOn]}>
                      {otherOn ? OTHER_SPORT : `+ ${OTHER_SPORT}`}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
            <SectionLabel>Din inriktning</SectionLabel>
            <View style={styles.chips}>
              {FOCUS_OPTIONS.map((f) => {
                const on = focus.includes(f);
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() =>
                      setFocus((prev) => (on ? prev.filter((x) => x !== f) : [...prev, f]))
                    }
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{f}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <SectionLabel>Klientkapacitet</SectionLabel>
            <GlassCard padding={16}>
              <View style={styles.capRow}>
                <Text style={styles.capVal}>{capacity}</Text>
                <View style={styles.capMid}>
                  <Text style={styles.capTitle}>Aktiva klienter samtidigt</Text>
                  <Text style={styles.capMeta}>STYR PÅMINNELSER OCH DASHBOARD-LAYOUT</Text>
                </View>
                <View style={styles.capBtns}>
                  <TouchableOpacity
                    style={styles.capBtn}
                    onPress={() => setCapacity((c) => Math.max(1, c - 1))}
                  >
                    <Text style={styles.capBtnText}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.capBtn}
                    onPress={() => setCapacity((c) => Math.min(50, c + 1))}
                  >
                    <Text style={styles.capBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          </>
        ) : null}

        {step === 1 && !activationFlow ? (
          <GlassCard padding={16}>
            <SectionLabel>M2M-appar</SectionLabel>
            <IntegrationRow name="Adapt" desc="Program och energisystem" active />
            <IntegrationRow name="Timer" desc="Live-sessioner och set" active />
            <IntegrationRow name="Goalsetter" desc="Mål och rutiner" active />
            <IntegrationRow name="Macro" desc="Kost och makron" active />
            <Text style={styles.consentNote}>
              Atleter styr själva vilken data de delar via samtycke per område.
            </Text>
          </GlassCard>
        ) : null}

        {step === 0 && !activationFlow ? (
          <GlassCard padding={16}>
            <SectionLabel>Dagöversikt</SectionLabel>
            <PreviewRow label="Tränar idag" value="12" color={coachColors.coach} />
            <PreviewRow label="Återhämtning" value="6" color={coachColors.accent} />
            <PreviewRow label="Varningar" value="3" color={coachColors.orange} />
            <Text style={styles.mathNote}>Så räknade vi: status från senaste pass + planerade sessioner.</Text>
          </GlassCard>
        ) : null}

        {isLast && !isPostAuth ? (
          <GlassCard variant="accent" padding={16}>
            <SectionLabel>Nästa steg</SectionLabel>
            <Text style={styles.accountHint}>
              Skapa ditt coach-konto för att spara panelen och börja tilldela atleter. Ingen betalning krävs
              för att komma igång.
            </Text>
          </GlassCard>
        ) : null}

        <TouchableOpacity onPress={handleBack} style={styles.backLink} activeOpacity={0.7}>
          {step === 0 && isPostAuth ? (
            <Text style={styles.skipLinkText}>
              HOPPA ÖVER — GÅR ATT ÄNDRA I INSTÄLLNINGAR
            </Text>
          ) : (
            <Text style={styles.backLinkText}>
              {step > 0 ? 'Tillbaka' : 'Till inloggning'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <StickyCTA
        label={ctaLabel}
        sublabel={isLast && !isPostAuth ? 'Gratis att börja' : undefined}
        onPress={handlePrimary}
        variant="flush"
      />
    </View>
  );
}

function PreviewRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.previewRow}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={[styles.previewValue, { color }]}>{value}</Text>
    </View>
  );
}

function IntegrationRow({
  name,
  desc,
  active,
}: {
  name: string;
  desc: string;
  active?: boolean;
}) {
  return (
    <View style={styles.integrationRow}>
      <View style={styles.integrationText}>
        <Text style={styles.integrationName}>M2M {name}</Text>
        <Text style={styles.integrationDesc}>{desc}</Text>
      </View>
      <View style={[styles.integrationBadge, !active && styles.integrationBadgeOff]}>
        <View style={[styles.integrationDot, !active && styles.integrationDotOff]} />
        <Text style={[styles.integrationBadgeText, !active && styles.integrationBadgeTextOff]}>
          {active ? 'Redo' : 'Ej aktiv'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: coachColors.bg,
  },
  ambientTop: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0,212,170,0.09)',
  },
  ambientBottom: {
    position: 'absolute',
    bottom: -100,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(247,233,40,0.07)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 120,
    gap: 14,
    maxWidth: 430,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: 4,
    marginBottom: 4,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '700',
    color: coachColors.fg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: coachColors.coach,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700',
    color: coachColors.fg,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: coachColors.mutedHi,
    lineHeight: 21,
    marginBottom: 14,
  },
  projectionBox: {
    padding: 12,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    gap: 4,
  },
  projectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
  },
  projectionValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: coachColors.coach,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  previewLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: coachColors.mutedHi,
  },
  previewValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700',
  },
  mathNote: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  consentNote: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: coachColors.muted,
    marginTop: 10,
    lineHeight: 16,
  },
  integrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  integrationText: {
    flex: 1,
    minWidth: 0,
  },
  integrationName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: coachColors.fg,
  },
  integrationDesc: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: coachColors.muted,
    marginTop: 2,
  },
  integrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: coachColors.coachDim,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.22)',
  },
  integrationBadgeOff: {
    backgroundColor: coachColors.glassBg,
    borderColor: coachColors.glassBorder,
  },
  integrationDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: coachColors.coach,
  },
  integrationDotOff: {
    backgroundColor: coachColors.muted,
  },
  integrationBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.coach,
  },
  integrationBadgeTextOff: {
    color: coachColors.muted,
  },
  accountHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: coachColors.mutedHi,
    lineHeight: 19,
  },
  backLink: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  backLinkText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: coachColors.muted,
  },
  skipLinkText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: coachColors.muted,
    textAlign: 'center',
  },
  stepBarsWrap: {
    marginBottom: 20,
  },
  stepBars: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: coachColors.border,
  },
  stepBarOn: {
    backgroundColor: coachColors.accent,
  },
  stepBarLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: coachColors.muted,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipOn: {
    backgroundColor: coachColors.accent,
    borderColor: coachColors.accent,
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: coachColors.mutedHi,
  },
  chipTextOn: {
    color: '#17191c',
    fontFamily: fonts.bodySemiBold,
  },
  capRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  capVal: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    color: coachColors.accent,
    width: 56,
    textAlign: 'center',
  },
  capMid: { flex: 1 },
  capTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: coachColors.fg,
  },
  capMeta: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.6,
    color: coachColors.muted,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  capBtns: { flexDirection: 'row', gap: 8 },
  capBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capBtnText: { fontSize: 15, color: coachColors.mutedHi },
});
