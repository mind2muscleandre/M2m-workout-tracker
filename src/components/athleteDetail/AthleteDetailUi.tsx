import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Line, Polygon, Path, Polyline } from 'react-native-svg';
import { coachColors, fonts, borderRadius } from '../../lib/theme';
import { GlassCard } from '../ui/GlassCard';
import { SectionLabel } from '../ui/SectionLabel';
import { Button } from '../ui/Button';
import type {
  TrainingSessionRow,
  WorkoutSessionRow,
  MacroView,
  GoalsetterView,
  AppBadges,
  ScreeningSessionGroup,
} from '../../types/platform';

/* ── Tab nav (athlete-detail.html .tab-nav) ── */
export interface AthleteTab {
  id: string;
  label: string;
}

export function AthleteTabNav({
  tabs,
  activeId,
  onChange,
}: {
  tabs: AthleteTab[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabNav}
      contentContainerStyle={styles.tabNavContent}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.tabBtn, active && styles.tabBtnActive]}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabBtnLabel, active && styles.tabBtnLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/* ── App section header ── */
export function AppSectionHeader({
  barColor,
  title,
  titleColor,
  subtitle,
  linkLabel,
  onLinkPress,
}: {
  barColor: string;
  title: string;
  titleColor?: string;
  subtitle?: string;
  linkLabel?: string;
  onLinkPress?: () => void;
}) {
  return (
    <View style={styles.appSectionHdr}>
      <View style={styles.appSectionSource}>
        <View style={[styles.appSectionBar, { backgroundColor: barColor }]} />
        <View>
          <Text style={[styles.appSectionName, titleColor ? { color: titleColor } : null]}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.appSectionSub}>{subtitle}</Text> : null}
        </View>
      </View>
      {linkLabel && onLinkPress ? (
        <TouchableOpacity onPress={onLinkPress} style={styles.appSectionLink} activeOpacity={0.7}>
          <Text style={styles.appSectionLinkText}>{linkLabel}</Text>
          <Text style={styles.appSectionLinkArrow}>›</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ── Primary goal card ── */
export function PrimaryGoalCard({
  title,
  subtitle,
  pct,
  startLabel,
  deadlineLabel,
}: {
  title: string;
  subtitle?: string;
  pct: number;
  startLabel?: string;
  deadlineLabel?: string;
}) {
  return (
    <GlassCard variant="coach" style={styles.goalCard}>
      <SectionLabel>Primärt mål</SectionLabel>
      <Text style={styles.goalTitle}>{title}</Text>
      {subtitle ? <Text style={styles.goalSub}>{subtitle}</Text> : null}
      <View style={styles.goalBarRow}>
        <View style={styles.goalBarTrack}>
          <View style={[styles.goalFill, { width: `${Math.min(100, pct)}%` }]} />
        </View>
        <Text style={styles.goalPctBig}>{pct}%</Text>
      </View>
      {startLabel || deadlineLabel ? (
        <View style={styles.goalDatesRow}>
          {startLabel ? <Text style={styles.goalDateText}>{startLabel}</Text> : <View />}
          {deadlineLabel ? <Text style={styles.goalDateText}>{deadlineLabel}</Text> : null}
        </View>
      ) : null}
    </GlassCard>
  );
}

/* ── Factors grid ── */
export function FactorsGrid({
  items,
}: {
  items: { name: string; pct: number; color: string }[];
}) {
  return (
    <View style={styles.factorsGrid}>
      {items.map((f) => (
        <View key={f.name} style={styles.factorCard}>
          <Text style={styles.factorName}>{f.name}</Text>
          <Text style={[styles.factorVal, { color: f.color }]}>{f.pct}%</Text>
          <View style={styles.factorBar}>
            <View style={[styles.factorFill, { width: `${f.pct}%`, backgroundColor: f.color }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

/* ── Program week grid ── */
const DAY_ORDER = ['MÅN', 'TIS', 'ONS', 'TOR', 'FRE', 'LÖR', 'SÖN'];

export function ProgramWeekGrid({
  days,
}: {
  days: { label: string; type: string; isToday?: boolean; isRest?: boolean; color: string }[];
}) {
  return (
    <View style={styles.progWeek}>
      {days.map((d) => (
        <View
          key={d.label}
          style={[styles.progDay, d.isToday && styles.progDayToday, d.isRest && styles.progDayRest]}
        >
          <Text style={styles.progDayLabel}>{d.label}</Text>
          <Text style={[styles.progDayType, { color: d.isRest ? coachColors.muted : d.color }]}>
            {d.type}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function buildWeekDaysFromSchedule(
  schedule: { label: string; session: TrainingSessionRow | null; isRest: boolean }[],
  todayDow: number,
  scheduleDays: number[]
): { label: string; type: string; isToday?: boolean; isRest?: boolean; color: string }[] {
  return schedule.map((d, i) => {
    const dayNum = scheduleDays[i] ?? i;
    const name = d.session?.session_name ?? '';
    const upper = name.slice(0, 6).toUpperCase() || (d.isRest ? 'VILA' : 'PASS');
    let color: string = coachColors.coach;
    if (d.isRest) color = coachColors.muted;
    else if (/styrk|gym|kraft/i.test(name)) color = coachColors.accent;
    else if (/aero|distans|z2/i.test(name)) color = coachColors.mutedHi;
    return {
      label: DAY_ORDER[i] ?? d.label.slice(0, 3).toUpperCase(),
      type: upper,
      isToday: dayNum === todayDow,
      isRest: d.isRest,
      color,
    };
  });
}

/* ── Session row ── */
export function SessionListRow({
  date,
  name,
  sys,
  load,
  loadColor,
  onPress,
}: {
  date: string;
  name: string;
  sys: string;
  load: string;
  loadColor?: string;
  onPress?: () => void;
}) {
  const inner = (
    <View style={styles.sessionRow}>
      <Text style={styles.sessionDate}>{date}</Text>
      <View style={styles.sessionType}>
        <Text style={styles.sessionTypeName}>{name}</Text>
        <Text style={styles.sessionTypeSys}>{sys}</Text>
      </View>
      <View style={styles.sessionLoadWrap}>
        <Text style={[styles.sessionLoad, loadColor ? { color: loadColor } : null]}>{load}</Text>
        <Text style={styles.sessionLoadLabel}>{load === '—' ? 'Vila' : 'Belastning'}</Text>
      </View>
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

/* ── Routine list ── */
export function RoutineList({
  items,
}: {
  items: { id: string; label: string; time: string; done: boolean; onToggle?: () => void }[];
}) {
  return (
    <View style={styles.routineList}>
      {items.map((r) => (
        <TouchableOpacity
          key={r.id}
          onPress={r.onToggle}
          disabled={!r.onToggle}
          activeOpacity={r.onToggle ? 0.75 : 1}
        >
          <View style={styles.routineItem}>
            <View style={[styles.riCheck, r.done && styles.riCheckDone]}>
              {r.done ? <Text style={styles.riCheckMark}>✓</Text> : null}
            </View>
            <Text style={styles.riLabel}>{r.label}</Text>
            <Text style={[styles.riTime, !r.done && r.time === '—' && styles.riTimePending]}>
              {r.time}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ── Inline edit button ── */
export function InlineEditButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.inlineEditBtn} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.inlineEditBtnText}>✎ {label}</Text>
    </TouchableOpacity>
  );
}

/* ── Perform: Athletic score ring ── */
export function PerformScoreRing({ score, delta }: { score: number; delta?: string }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  return (
    <View style={styles.pfCard}>
      <Text style={styles.pfCardLabel}>Athletic Score</Text>
      <View style={styles.pfRingWrap}>
        <Svg width={80} height={80} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={7} fill="none" />
          <Circle
            cx={50}
            cy={50}
            r={r}
            stroke={coachColors.accent}
            strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={offset}
            rotation={-90}
            origin="50, 50"
          />
        </Svg>
        <View style={styles.pfRingCenter}>
          <Text style={styles.pfRingVal}>{score}</Text>
          <Text style={styles.pfRingPct}>%</Text>
        </View>
      </View>
      {delta ? <Text style={styles.pfDelta}>{delta}</Text> : null}
    </View>
  );
}

/* ── Perform: Radar mini ── */
export function PerformRadarCard({ scores }: { scores?: number[] }) {
  if (!scores || scores.length === 0) {
    return (
      <View style={[styles.pfCard, styles.pfCardRadar]}>
        <Text style={styles.pfCardLabel}>Radar Analys</Text>
        <Text style={styles.mutedInline}>Ingen screeningdata</Text>
      </View>
    );
  }
  const cx = 90;
  const cy = 82;
  const r = 56;
  const n = scores.length;
  const point = (rad: number, i: number) => ({
    x: cx + rad * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / n),
    y: cy + rad * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / n),
  });
  const dataPts = scores
    .map((s, i) => {
      const p = point((r * s) / 100, i);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <View style={[styles.pfCard, styles.pfCardRadar]}>
      <Text style={styles.pfCardLabel}>Radar Analys</Text>
      <Svg viewBox="0 0 180 165" width="100%" height={100}>
        {[0.25, 0.5, 0.75, 1].map((pct) => {
          const pts = scores
            .map((_, i) => {
              const p = point(r * pct, i);
              return `${p.x},${p.y}`;
            })
            .join(' ');
          return (
            <Polygon
              key={pct}
              points={pts}
              fill="none"
              stroke={`rgba(255,255,255,${pct === 1 ? 0.09 : 0.05})`}
              strokeWidth={1}
            />
          );
        })}
        <Polygon
          points={dataPts}
          fill="rgba(247,233,40,0.12)"
          stroke={coachColors.accent}
          strokeWidth={1.6}
        />
      </Svg>
    </View>
  );
}

/* ── Perform: Progression line chart ── */
export function PerformProgressCard({
  points,
}: {
  points: { label: string; v: number }[];
}) {
  const w = 280;
  const h = 68;
  const pL = 28;
  const pR = 8;
  const pT = 8;
  const pB = 22;
  const cw = w - pL - pR;
  const ch = h - pT - pB;
  const coords = points.map((d, i) => ({
    x: pL + (i / (points.length - 1)) * cw,
    y: pT + ch * (1 - d.v / 100),
  }));
  const linePath = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${pT + ch} L${coords[0].x},${pT + ch} Z`;

  return (
    <View style={styles.pfCardFull}>
      <Text style={styles.pfCardLabel}>Progression</Text>
      <View style={styles.pfProgWrap}>
        <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
          {[0, 50, 100].map((v) => {
            const y = pT + ch * (1 - v / 100);
            return (
              <Line
                key={v}
                x1={pL}
                y1={y}
                x2={pL + cw}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
              />
            );
          })}
          <Path d={areaPath} fill="rgba(247,233,40,0.25)" />
          <Polyline
            points={coords.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={coachColors.accent}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {coords.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === coords.length - 1 ? 4 : 2.5}
              fill={coachColors.accent}
            />
          ))}
        </Svg>
      </View>
    </View>
  );
}

/* ── OH-Squat summary ── */
export function OhsSquatCard({
  score,
  delta,
  cells,
  fullBreakdown,
}: {
  score: number;
  delta?: string;
  cells: { label: string; val: number; color: string }[];
  fullBreakdown?: boolean;
}) {
  return (
    <GlassCard style={styles.ohsCard}>
      <SectionLabel>{`OH-Squat${fullBreakdown ? ' Bedömning' : ''} · Senaste`}</SectionLabel>
      <View style={styles.ohsScoreRow}>
        <Text style={styles.ohsScoreBig}>{score}</Text>
        <Text style={styles.ohsScoreDenom}>/100</Text>
        {delta ? <Text style={styles.ohsDelta}>{delta}</Text> : null}
      </View>
      {fullBreakdown ? (
        <View style={styles.ohsBreakdown}>
          {cells.map((c) => (
            <View key={c.label} style={styles.ohsBreakdownRow}>
              <View style={styles.ohsBreakdownHdr}>
                <Text style={styles.ohsBreakdownLbl}>{c.label}</Text>
                <Text style={[styles.ohsBreakdownVal, { color: c.color }]}>{c.val}</Text>
              </View>
              <View style={styles.progTrack}>
                <View
                  style={[styles.progFill, { width: `${c.val}%`, backgroundColor: c.color }]}
                />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.pfOhsqGrid}>
          {cells.map((c) => (
            <View key={c.label} style={styles.pfOhsqCell}>
              <Text style={[styles.pfOhsqVal, { color: c.color }]}>{c.val}</Text>
              <Text style={styles.pfOhsqLbl}>{c.label}</Text>
            </View>
          ))}
        </View>
      )}
    </GlassCard>
  );
}

/* ── Risk areas ── */
export type RiskArea = {
  key: string;
  label: string;
  avg: number;
  H?: number;
  V?: number;
  central?: number;
};

function scoreColor(s: number) {
  if (s < 65) return '#FF4545';
  if (s < 75) return '#EBA800';
  return coachColors.fg;
}

export function RiskAreaList({ areas }: { areas: RiskArea[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <View>
      {areas.map((a) => {
        const bilateral = a.central === undefined && a.H != null && a.V != null;
        const open = openKey === a.key;
        const asym =
          bilateral && a.H != null && a.V != null
            ? Math.round((Math.abs(a.H - a.V) / ((a.H + a.V) / 2)) * 100)
            : 0;
        return (
          <View key={a.key}>
            <TouchableOpacity
              style={[styles.pfAreaRow, open && styles.pfAreaRowOpen]}
              onPress={() => bilateral && setOpenKey(open ? null : a.key)}
              activeOpacity={bilateral ? 0.7 : 1}
              disabled={!bilateral}
            >
              <Text style={styles.pfAreaLabel}>{a.label}</Text>
              <View style={styles.pfAreaBwrap}>
                <View style={styles.progTrack}>
                  <View
                    style={[styles.progFill, { width: `${a.avg}%`, backgroundColor: coachColors.accent }]}
                  />
                </View>
              </View>
              <Text style={[styles.pfAreaVal, { color: scoreColor(a.avg) }]}>{a.avg}</Text>
              {bilateral ? (
                <Text style={[styles.pfAreaToggle, open && styles.pfAreaToggleOpen]}>›</Text>
              ) : (
                <View style={{ width: 16 }} />
              )}
            </TouchableOpacity>
            {bilateral && open && a.H != null && a.V != null ? (
              <View style={styles.pfAreaDetail}>
                <View style={styles.pfSideRow}>
                  <Text style={styles.pfSideLbl}>Höger (H)</Text>
                  <View style={[styles.progTrack, { flex: 1 }]}>
                    <View
                      style={[
                        styles.progFill,
                        { width: `${a.H}%`, backgroundColor: coachColors.accent },
                      ]}
                    />
                  </View>
                  <Text style={[styles.pfSideVal, { color: scoreColor(a.H) }]}>{a.H}</Text>
                </View>
                <View style={styles.pfSideRow}>
                  <Text style={styles.pfSideLbl}>Vänster (V)</Text>
                  <View style={[styles.progTrack, { flex: 1 }]}>
                    <View
                      style={[
                        styles.progFill,
                        { width: `${a.V}%`, backgroundColor: coachColors.coach },
                      ]}
                    />
                  </View>
                  <Text style={[styles.pfSideVal, { color: scoreColor(a.V) }]}>{a.V}</Text>
                </View>
                {asym > 10 ? (
                  <View style={styles.pfRiskWarn}>
                    <Text style={styles.pfRiskIcon}>⚠</Text>
                    <Text style={styles.pfRiskTxt}>
                      Skaderisk · {asym}% asymmetri H/V
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function deriveRiskAreas(
  areas: { testområde: string | null; score: number | null }[]
): RiskArea[] {
  return areas
    .filter((a) => a.score != null)
    .map((a, i) => ({
      key: `area-${i}`,
      label: a.testområde ?? 'Område',
      avg: Math.round(a.score ?? 0),
    }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 4);
}

/* ── Recommendation cards ── */
export function RecCard({
  icon,
  title,
  priority,
  text,
}: {
  icon: string;
  title: string;
  priority: 'high' | 'med' | 'low';
  text: string;
}) {
  const prioStyle =
    priority === 'high' ? styles.rpHigh : priority === 'med' ? styles.rpMed : styles.rpLow;
  const prioLabel =
    priority === 'high' ? 'Hög prioritet' : priority === 'med' ? 'Medel prioritet' : 'Bibehåll';
  return (
    <View style={styles.recCard}>
      <View style={styles.recHeader}>
        <Text style={styles.recIcon}>{icon}</Text>
        <Text style={styles.recTitle}>{title}</Text>
        <Text style={[styles.recPriority, prioStyle]}>{prioLabel}</Text>
      </View>
      <Text style={styles.recText}>{text}</Text>
    </View>
  );
}

/* ── Hero wrapper with mobile compaction ── */
export function AthleteHero({
  children,
  backButton,
}: {
  children: React.ReactNode;
  backButton?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 768;
  return (
    <View style={[styles.athleteHero, compact && styles.athleteHeroCompact]}>
      {backButton ? <View style={styles.heroBack}>{backButton}</View> : null}
      <View style={[styles.heroInner, compact && styles.heroInnerCompact]}>{children}</View>
    </View>
  );
}

export function usePerformScore(
  areas: { score: number | null }[]
): { score: number; progression: { label: string; v: number }[] } | null {
  return useMemo(() => {
    const scores = areas.map((a) => a.score).filter((s): s is number => s != null);
    if (scores.length === 0) return null;
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const baseline = avg;
    return {
      score: avg,
      progression: [
        { label: 'N-3', v: baseline },
        { label: 'N-2', v: baseline },
        { label: 'N-1', v: baseline },
        { label: 'Nu', v: avg },
      ],
    };
  }, [areas]);
}

/* ── Whoop-style metric ring ── */
export function WhoopMetricRing({
  label,
  value,
  maxValue = 100,
  color,
  status,
  delta,
  size = 88,
}: {
  label: string;
  value: number | null;
  maxValue?: number;
  color: string;
  status?: string;
  delta?: string;
  size?: number;
}) {
  const strokeW = 7;
  const r = (size - strokeW * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = value != null ? Math.min(Math.max(value / maxValue, 0), 1) : 0;
  const dash = pct * circumference;
  const hasData = value != null;
  const dimColor = color.startsWith('rgba') ? color : `${color}33`;
  return (
    <View style={whoopRingStyles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={dimColor} strokeWidth={strokeW} />
        {hasData && (
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={circumference / 4}
            strokeLinecap="round"
          />
        )}
      </Svg>
      <View style={[whoopRingStyles.ringCenter, { width: size, height: size }]}>
        <Text style={[whoopRingStyles.ringValue, { color: hasData ? color : coachColors.muted }]}>
          {hasData ? Math.round(value!) : '—'}
        </Text>
        {status ? (
          <Text style={whoopRingStyles.ringStatus} numberOfLines={1}>
            {status}
          </Text>
        ) : null}
      </View>
      <Text style={whoopRingStyles.ringLabel}>{label}</Text>
      {delta ? <Text style={whoopRingStyles.ringDelta}>{delta}</Text> : null}
    </View>
  );
}

const whoopRingStyles = StyleSheet.create({
  ringWrap: { alignItems: 'center', gap: 4 },
  ringCenter: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontFamily: 'DDINCondensedBold', fontSize: 22, fontWeight: '700', lineHeight: 24 },
  ringStatus: { fontSize: 9, color: coachColors.muted, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  ringLabel: { fontSize: 10, color: coachColors.muted, fontFamily: 'DMSans_500Medium', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
  ringDelta: { fontSize: 10, color: coachColors.coach, fontFamily: 'DMSans_400Regular' },
});

/* ── Energy/strain line chart ── */
type ChartPeriod = '1D' | '7D' | '30D' | '90D';

function buildChartPoints(
  sessions: WorkoutSessionRow[],
  period: ChartPeriod
): { day: string; energy: number; strain: number }[] {
  const days = period === '1D' ? 1 : period === '7D' ? 7 : period === '30D' ? 30 : 90;
  const now = Date.now();
  const buckets: Record<string, { energy: number; strain: number; count: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { energy: 0, strain: 0, count: 0 };
  }
  for (const s of sessions) {
    if (!s.completed_at) continue;
    const key = s.completed_at.slice(0, 10);
    if (!buckets[key]) continue;
    const durationMin = (s.duration_seconds ?? 0) / 60;
    const intensity = s.intensity ?? 5;
    const strain = Math.min((durationMin * intensity) / 60, 10);
    buckets[key].strain += strain;
    buckets[key].energy += Math.max(0, 10 - strain);
    buckets[key].count += 1;
  }
  return Object.entries(buckets).map(([day, v]) => ({
    day,
    energy: v.count > 0 ? Math.round((v.energy / v.count) * 10) : 5,
    strain: Math.min(Math.round(v.strain * 10), 100),
  }));
}

export function EnergyLineChart({
  sessions,
  width = 280,
  height = 80,
}: {
  sessions: WorkoutSessionRow[];
  width?: number;
  height?: number;
}) {
  const [period, setPeriod] = useState<ChartPeriod>('7D');
  const periods: ChartPeriod[] = ['1D', '7D', '30D', '90D'];
  const data = useMemo(() => buildChartPoints(sessions, period), [sessions, period]);
  const pL = 4; const pR = 4; const pT = 4; const pB = 20;
  const cw = width - pL - pR;
  const ch = height - pT - pB;
  const n = data.length;
  const toX = (i: number) => pL + (n > 1 ? (i / (n - 1)) * cw : cw / 2);
  const toY = (v: number) => pT + ch * (1 - v / 100);
  const energyPts = data.map((d, i) => `${toX(i)},${toY(d.energy)}`).join(' ');
  const strainPts = data.map((d, i) => `${toX(i)},${toY(d.strain)}`).join(' ');
  return (
    <View style={energyStyles.wrap}>
      <View style={energyStyles.periodRow}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriod(p)}
            style={[energyStyles.periodBtn, period === p && energyStyles.periodBtnActive]}
          >
            <Text style={[energyStyles.periodTxt, period === p && energyStyles.periodTxtActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Svg width={width} height={height}>
        {[0, 50, 100].map((tick) => (
          <Line
            key={tick}
            x1={pL}
            y1={toY(tick)}
            x2={pL + cw}
            y2={toY(tick)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}
        <Polyline
          points={energyPts}
          fill="none"
          stroke={coachColors.coach}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <Polyline
          points={strainPts}
          fill="none"
          stroke={coachColors.orange}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      </Svg>
      <View style={energyStyles.legend}>
        <View style={energyStyles.legendItem}>
          <View style={[energyStyles.legendDot, { backgroundColor: coachColors.coach }]} />
          <Text style={energyStyles.legendTxt}>Energi</Text>
        </View>
        <View style={energyStyles.legendItem}>
          <View style={[energyStyles.legendDot, { backgroundColor: coachColors.orange }]} />
          <Text style={energyStyles.legendTxt}>Belastning</Text>
        </View>
      </View>
    </View>
  );
}

const energyStyles = StyleSheet.create({
  wrap: { gap: 6 },
  periodRow: { flexDirection: 'row', gap: 4, justifyContent: 'flex-end' },
  periodBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: 'transparent' },
  periodBtnActive: { backgroundColor: coachColors.coachDim },
  periodTxt: { fontSize: 10, color: coachColors.muted, fontFamily: 'DMSans_500Medium' },
  periodTxtActive: { color: coachColors.coach },
  legend: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendTxt: { fontSize: 10, color: coachColors.muted, fontFamily: 'DMSans_400Regular' },
});

/* ── Whoop-style hero section ── */
export interface WhoopHeroProps {
  name: string;
  sport?: string | null;
  avatarInitials: string;
  statusLabel?: string;
  statusColor?: string;
  energySystemLabel?: string;
  agePill?: string;
  weightPill?: string;
  email?: string | null;
  summary?: string;
  recoveryScore: number | null;
  strainScore: number | null;
  nutritionScore: number | null;
  sleepScore: number | null;
  sessions: WorkoutSessionRow[];
  apps: AppBadges;
  backButton?: React.ReactNode;
  onMessage?: () => void;
  onSession?: () => void;
  onInfo?: () => void;
}

export function WhoopHeroSection({
  name,
  sport,
  avatarInitials,
  statusLabel,
  statusColor,
  energySystemLabel,
  agePill,
  weightPill,
  email,
  summary,
  recoveryScore,
  strainScore,
  nutritionScore,
  sleepScore,
  sessions,
  apps,
  backButton,
  onMessage,
  onSession,
  onInfo,
}: WhoopHeroProps) {
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const connectedNames = (Object.entries(apps) as [string, boolean][])
    .filter(([, v]) => v)
    .map(([k]) => k);

  return (
    <View style={heroSectionStyles.hero}>
      {backButton ? <View style={heroSectionStyles.backSlot}>{backButton}</View> : null}
      <View style={[heroSectionStyles.inner, compact && heroSectionStyles.innerCompact]}>
        {/* Left column */}
        <View style={[heroSectionStyles.leftCol, compact && heroSectionStyles.leftColCompact]}>
          <View style={heroSectionStyles.avatarRow}>
            <View style={heroSectionStyles.avatar}>
              <Text style={heroSectionStyles.avatarText}>{avatarInitials}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={heroSectionStyles.nameText}>{name}</Text>
              {sport ? (
                <View style={heroSectionStyles.chipRow}>
                  <View style={heroSectionStyles.chip}>
                    <Text style={heroSectionStyles.chipTxt}>{sport}</Text>
                  </View>
                  {energySystemLabel ? (
                    <View style={[heroSectionStyles.chip, heroSectionStyles.chipAccent]}>
                      <Text style={[heroSectionStyles.chipTxt, { color: coachColors.accent }]}>{energySystemLabel}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              <View style={heroSectionStyles.chipRow}>
                {statusLabel ? (
                  <View style={[heroSectionStyles.chip, { borderColor: statusColor ?? coachColors.glassBorder }]}>
                    <View style={[heroSectionStyles.statusDot, { backgroundColor: statusColor ?? coachColors.coach }]} />
                    <Text style={[heroSectionStyles.chipTxt, { color: statusColor ?? coachColors.coach }]}>{statusLabel}</Text>
                  </View>
                ) : null}
                {agePill ? (
                  <View style={heroSectionStyles.chip}>
                    <Text style={heroSectionStyles.chipTxt}>{agePill}</Text>
                  </View>
                ) : null}
                {weightPill ? (
                  <View style={heroSectionStyles.chip}>
                    <Text style={heroSectionStyles.chipTxt}>{weightPill}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {summary ? (
            <Text style={heroSectionStyles.summary} numberOfLines={2}>{summary}</Text>
          ) : null}

          {email ? <Text style={heroSectionStyles.contactLine}>{email}</Text> : null}

          {connectedNames.length > 0 ? (
            <View style={heroSectionStyles.chipRow}>
              {connectedNames.map((n) => (
                <View key={n} style={[heroSectionStyles.chip, heroSectionStyles.chipCoach]}>
                  <Text style={[heroSectionStyles.chipTxt, { color: coachColors.coach }]}>M2M {n}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={heroSectionStyles.btnRow}>
            {onInfo ? (
              <TouchableOpacity style={heroSectionStyles.btnInfo} onPress={onInfo}>
                <Text style={heroSectionStyles.btnInfoTxt}>Info</Text>
              </TouchableOpacity>
            ) : null}
            {onMessage ? (
              <TouchableOpacity style={heroSectionStyles.btnSecondary} onPress={onMessage}>
                <Text style={heroSectionStyles.btnSecondaryTxt}>Meddelande</Text>
              </TouchableOpacity>
            ) : null}
            {onSession ? (
              <TouchableOpacity style={heroSectionStyles.btnPrimary} onPress={onSession}>
                <Text style={heroSectionStyles.btnPrimaryTxt}>+ Session</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Right column */}
        <View style={[heroSectionStyles.rightCol, compact && heroSectionStyles.rightColCompact]}>
          <View style={heroSectionStyles.ringsGrid}>
            <WhoopMetricRing label="Återhämtning" value={recoveryScore} color={coachColors.coach} status={recoveryScore != null ? (recoveryScore >= 67 ? 'Optimal' : recoveryScore >= 34 ? 'Måttlig' : 'Låg') : undefined} />
            <WhoopMetricRing label="Belastning" value={strainScore} color={coachColors.orange} status={strainScore != null ? (strainScore >= 70 ? 'Hög' : strainScore >= 40 ? 'Medel' : 'Låg') : undefined} />
            <WhoopMetricRing label="Kost" value={nutritionScore} color="#5AC8FA" status={nutritionScore != null ? (nutritionScore >= 80 ? 'I mål' : 'Under mål') : undefined} />
            <WhoopMetricRing label="Sömn" value={sleepScore} color="#BF7FFF" status={sleepScore != null ? (sleepScore >= 80 ? 'God' : sleepScore >= 60 ? 'OK' : 'Bristfällig') : undefined} />
          </View>
          <EnergyLineChart sessions={sessions} width={compact ? width - 48 : 280} />
        </View>
      </View>
    </View>
  );
}

const heroSectionStyles = StyleSheet.create({
  hero: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: coachColors.glassBgCoach,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,212,170,0.12)',
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 0,
  },
  backSlot: { position: 'absolute', top: 14, left: 16, zIndex: 2 },
  inner: { flexDirection: 'row', gap: 20, marginTop: 20, alignItems: 'flex-start' },
  innerCompact: { flexDirection: 'column', marginTop: 14 },
  leftCol: { flex: 1, gap: 10 },
  leftColCompact: { width: '100%' },
  rightCol: { width: 300, gap: 14 },
  rightColCompact: { width: '100%' },
  avatarRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: coachColors.coachDim,
    borderWidth: 2, borderColor: 'rgba(0,212,170,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: 'DDINCondensedBold', fontSize: 22, color: coachColors.coach },
  nameText: { fontFamily: 'DDINCondensedBold', fontSize: 24, color: coachColors.fg, lineHeight: 26 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    borderWidth: 1, borderColor: coachColors.glassBorder,
    backgroundColor: coachColors.glassBg,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  chipAccent: { borderColor: 'rgba(247,233,40,0.25)', backgroundColor: 'rgba(247,233,40,0.07)' },
  chipCoach: { borderColor: 'rgba(0,212,170,0.22)', backgroundColor: coachColors.glassBgCoach },
  chipTxt: { fontSize: 11, color: coachColors.mutedHi, fontFamily: 'DMSans_400Regular' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  summary: { fontSize: 12, color: coachColors.muted, fontFamily: 'DMSans_400Regular', lineHeight: 17 },
  contactLine: { fontSize: 11, color: coachColors.muted, fontFamily: 'DMSans_400Regular' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnPrimary: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    backgroundColor: coachColors.coach,
  },
  btnPrimaryTxt: { fontSize: 13, color: '#000', fontFamily: 'DMSans_600SemiBold' },
  btnInfo: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: coachColors.coach + '60',
    backgroundColor: coachColors.coach + '18',
  },
  btnInfoTxt: { fontSize: 13, color: coachColors.coach, fontFamily: 'DMSans_400Regular' },
  btnSecondary: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: coachColors.glassBorder,
    backgroundColor: coachColors.glassBg,
  },
  btnSecondaryTxt: { fontSize: 13, color: coachColors.mutedHi, fontFamily: 'DMSans_400Regular' },
  ringsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
});

/* ── Today stats grid ── */
export interface TodayStats {
  trainingMinutes: number | null;
  calories: number | null;
  sleepHours: number | null;
  streak: number | null;
  completedRoutines: number | null;
}

export function TodayStatsGrid({ stats }: { stats: TodayStats }) {
  const items: { icon: string; label: string; value: string | null }[] = [
    { icon: '🏋️', label: 'Träning', value: stats.trainingMinutes != null ? `${stats.trainingMinutes} min` : null },
    { icon: '🔥', label: 'Kalorier', value: stats.calories != null ? `${stats.calories} kcal` : null },
    { icon: '😴', label: 'Sömn', value: stats.sleepHours != null ? `${stats.sleepHours.toFixed(1)} h` : null },
    { icon: '⚡', label: 'Streak', value: stats.streak != null ? `${stats.streak} dagar` : null },
    { icon: '✅', label: 'Rutiner', value: stats.completedRoutines != null ? `${stats.completedRoutines} avklarade` : null },
  ].filter((i) => i.value != null);

  if (items.length === 0) return null;
  return (
    <View style={todayStyles.grid}>
      {items.map((item) => (
        <View key={item.label} style={todayStyles.cell}>
          <Text style={todayStyles.icon}>{item.icon}</Text>
          <Text style={todayStyles.value}>{item.value}</Text>
          <Text style={todayStyles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function deriveTodayStats(
  timerSessions: WorkoutSessionRow[],
  gsData: GoalsetterView
): TodayStats {
  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = timerSessions.filter(
    (s) => s.completed_at && s.completed_at.slice(0, 10) === today
  );
  const trainingMinutes =
    todaySessions.length > 0
      ? Math.round(todaySessions.reduce((a, s) => a + (s.duration_seconds ?? 0), 0) / 60)
      : null;
  const sleepHabit = gsData.habits.find((h) => /sömn|sleep/i.test(h.name));
  const streak = gsData.activityStreak?.current_streak ?? null;
  const completedToday = gsData.routines.filter(
    (r) => r.is_completed && r.completed_at && r.completed_at.slice(0, 10) === today
  ).length;
  return {
    trainingMinutes,
    calories: null,
    sleepHours: sleepHabit ? (sleepHabit.streak_current > 0 ? 7.5 : null) : null,
    streak,
    completedRoutines: completedToday > 0 ? completedToday : null,
  };
}

const todayStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    flex: 1, minWidth: 80,
    padding: 12, borderRadius: 10,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1, borderColor: coachColors.glassBorder,
    alignItems: 'center', gap: 2,
  },
  icon: { fontSize: 18 },
  value: { fontFamily: 'DDINCondensedBold', fontSize: 16, color: coachColors.fg },
  label: { fontSize: 10, color: coachColors.muted, fontFamily: 'DMSans_400Regular', textTransform: 'uppercase', letterSpacing: 0.4 },
});

/* ── Vital trends card ── */
export function VitalTrendsCard({ screeningSessions }: { screeningSessions: ScreeningSessionGroup[] }) {
  if (screeningSessions.length === 0) return null;
  const latest = screeningSessions[0];
  const trends: { label: string; value: number | null; unit: string; color: string }[] = [
    {
      label: 'Rörlighet',
      value: latest.areas.find((a) => /rörl/i.test(a.testområde ?? ''))?.score ?? null,
      unit: '/100',
      color: '#5AC8FA',
    },
    {
      label: 'Stabilitet',
      value: latest.areas.find((a) => /stabil/i.test(a.testområde ?? ''))?.score ?? null,
      unit: '/100',
      color: coachColors.accent,
    },
    {
      label: 'Kärna',
      value: latest.areas.find((a) => /kärn|core/i.test(a.testområde ?? ''))?.score ?? null,
      unit: '/100',
      color: coachColors.coach,
    },
  ].filter((t) => t.value != null);

  if (trends.length === 0) return null;

  return (
    <GlassCard style={vitalStyles.card}>
      <Text style={vitalStyles.heading}>Vitala Trender</Text>
      {trends.map((t) => (
        <View key={t.label} style={vitalStyles.row}>
          <Text style={vitalStyles.rowLabel}>{t.label}</Text>
          <View style={vitalStyles.barTrack}>
            <View style={[vitalStyles.barFill, { width: `${t.value ?? 0}%`, backgroundColor: t.color }]} />
          </View>
          <Text style={[vitalStyles.rowVal, { color: t.color }]}>
            {t.value}{t.unit}
          </Text>
        </View>
      ))}
    </GlassCard>
  );
}

const vitalStyles = StyleSheet.create({
  card: { padding: 14, gap: 10 },
  heading: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: coachColors.fg, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { width: 76, fontSize: 12, color: coachColors.muted, fontFamily: 'DMSans_400Regular' },
  barTrack: { flex: 1, height: 6, backgroundColor: coachColors.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  rowVal: { width: 44, textAlign: 'right', fontSize: 12, fontFamily: 'DMSans_500Medium' },
});

/* ── Connected apps card ── */
const APP_META: Record<string, { label: string; color: string }> = {
  perform: { label: 'M2M Perform', color: coachColors.coach },
  tracker: { label: 'M2M Tracker', color: '#5AC8FA' },
  macro: { label: 'M2M Macro', color: coachColors.accent },
  goalsetter: { label: 'M2M Goalsetter', color: '#BF7FFF' },
};

export function ConnectedAppsCard({ apps }: { apps: AppBadges }) {
  const connected = (Object.entries(apps) as [keyof AppBadges, boolean][]).filter(([, v]) => v);
  if (connected.length === 0) return null;
  return (
    <GlassCard style={appsCardStyles.card}>
      <Text style={appsCardStyles.heading}>Kopplade Appar</Text>
      <View style={appsCardStyles.list}>
        {connected.map(([id]) => {
          const meta = APP_META[id] ?? { label: id, color: coachColors.muted };
          return (
            <View key={id} style={appsCardStyles.row}>
              <View style={[appsCardStyles.dot, { backgroundColor: meta.color }]} />
              <Text style={appsCardStyles.appName}>{meta.label}</Text>
              <View style={appsCardStyles.activeBadge}>
                <Text style={appsCardStyles.activeTxt}>Aktiv</Text>
              </View>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}

const appsCardStyles = StyleSheet.create({
  card: { padding: 14, gap: 10 },
  heading: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: coachColors.fg, marginBottom: 2 },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  appName: { flex: 1, fontSize: 13, color: coachColors.mutedHi, fontFamily: 'DMSans_400Regular' },
  activeBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
    backgroundColor: coachColors.coachDim, borderWidth: 1, borderColor: 'rgba(0,212,170,0.20)',
  },
  activeTxt: { fontSize: 10, color: coachColors.coach, fontFamily: 'DMSans_500Medium' },
});

const styles = StyleSheet.create({
  tabNav: {
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
    flexGrow: 0,
  },
  tabNavContent: { flexDirection: 'row' },
  tabBtn: {
    paddingHorizontal: 20,
    height: 44,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: coachColors.coach },
  tabBtnLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: coachColors.muted,
  },
  tabBtnLabelActive: { color: coachColors.coach },
  appSectionHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  appSectionSource: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  appSectionBar: { width: 3, height: 16, borderRadius: 2 },
  appSectionName: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  appSectionSub: { fontSize: 11, color: coachColors.muted, marginTop: 1, fontFamily: fonts.body },
  appSectionLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  appSectionLinkText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: coachColors.muted,
  },
  appSectionLinkArrow: { color: coachColors.muted, fontSize: 12 },
  goalCard: { padding: 16 },
  goalTitle: { fontSize: 15, fontWeight: '600', color: coachColors.fg, fontFamily: fonts.bodySemiBold },
  goalSub: { fontSize: 12, color: coachColors.muted, marginBottom: 12, fontFamily: fonts.body },
  goalBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: coachColors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalFill: { height: '100%', borderRadius: 4, backgroundColor: coachColors.coach },
  goalPctBig: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '700',
    color: coachColors.coach,
    lineHeight: 28,
  },
  goalDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  goalDateText: { fontSize: 11, color: coachColors.muted, fontFamily: fonts.body },
  factorsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  factorCard: {
    width: '48%',
    minWidth: 140,
    padding: 12,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  factorName: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
    marginBottom: 6,
  },
  factorVal: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  factorBar: {
    height: 3,
    backgroundColor: coachColors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  factorFill: { height: '100%', borderRadius: 2 },
  progWeek: { flexDirection: 'row', gap: 4, marginTop: 10 },
  progDay: {
    flex: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: coachColors.glassBgHi,
    borderWidth: 1,
    borderColor: coachColors.border,
  },
  progDayToday: {
    borderColor: coachColors.coach,
    backgroundColor: coachColors.coachDim,
  },
  progDayRest: { opacity: 0.4 },
  progDayLabel: {
    fontFamily: fonts.mono,
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.muted,
  },
  progDayType: { fontSize: 10, fontWeight: '600', marginTop: 4, fontFamily: fonts.bodySemiBold },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  sessionDate: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: coachColors.muted,
    width: 64,
  },
  sessionType: { flex: 1 },
  sessionTypeName: { fontSize: 13, fontWeight: '500', color: coachColors.fg, fontFamily: fonts.bodyMedium },
  sessionTypeSys: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sessionLoadWrap: { alignItems: 'flex-end' },
  sessionLoad: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: coachColors.coach,
    lineHeight: 20,
  },
  sessionLoadLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: coachColors.muted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  routineList: { gap: 6 },
  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  riCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: coachColors.glassBorderHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riCheckDone: { backgroundColor: coachColors.coach, borderColor: coachColors.coach },
  riCheckMark: { color: '#000', fontSize: 11, fontWeight: '700' },
  riLabel: { flex: 1, fontSize: 13, color: coachColors.fg, fontFamily: fonts.body },
  riTime: { fontFamily: fonts.mono, fontSize: 10, color: coachColors.muted },
  riTimePending: { color: coachColors.muted },
  inlineEditBtn: {
    marginTop: 10,
    height: 32,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: coachColors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineEditBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: coachColors.mutedHi,
    fontFamily: fonts.bodyMedium,
  },
  pfCard: {
    flex: 1,
    backgroundColor: 'rgba(20,23,28,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'stretch',
  },
  pfCardRadar: { paddingHorizontal: 8 },
  pfCardFull: {
    backgroundColor: 'rgba(20,23,28,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pfCardLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: coachColors.accent,
    marginBottom: 10,
    opacity: 0.85,
  },
  pfRingWrap: { width: 80, height: 80, alignSelf: 'center', marginBottom: 6 },
  pfRingCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pfRingVal: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '700',
    color: coachColors.fg,
    lineHeight: 24,
  },
  pfRingPct: {
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 11,
  },
  pfDelta: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.coach,
    textAlign: 'center',
    marginTop: 4,
  },
  pfProgWrap: { height: 68, overflow: 'hidden' },
  ohsCard: { paddingVertical: 12, paddingHorizontal: 14 },
  ohsScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 10,
  },
  ohsScoreBig: {
    fontFamily: fonts.display,
    fontSize: 38,
    fontWeight: '700',
    color: coachColors.accent,
    lineHeight: 38,
  },
  ohsScoreDenom: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: coachColors.muted,
    marginBottom: 4,
  },
  ohsDelta: {
    marginLeft: 'auto',
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.coach,
  },
  pfOhsqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pfOhsqCell: {
    width: '48%',
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  pfOhsqVal: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 2,
  },
  pfOhsqLbl: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
  },
  mutedInline: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: coachColors.muted,
    marginTop: 16,
    textAlign: 'center',
  },
  ohsBreakdown: { gap: 10 },
  ohsBreakdownRow: { gap: 4 },
  ohsBreakdownHdr: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  ohsBreakdownLbl: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
  },
  ohsBreakdownVal: {
    fontFamily: fonts.display,
    fontSize: 14,
    fontWeight: '700',
  },
  progTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progFill: { height: '100%', borderRadius: 2 },
  pfAreaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  pfAreaRowOpen: {},
  pfAreaLabel: { fontSize: 12, fontWeight: '500', width: 98, lineHeight: 16, color: coachColors.fg },
  pfAreaBwrap: { flex: 1 },
  pfAreaVal: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
    width: 24,
    textAlign: 'right',
  },
  pfAreaToggle: { color: coachColors.muted, fontSize: 14, width: 16, textAlign: 'center' },
  pfAreaToggleOpen: { transform: [{ rotate: '90deg' }] },
  pfAreaDetail: { paddingVertical: 8 },
  pfSideRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  pfSideLbl: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
    width: 56,
  },
  pfSideVal: {
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '700',
    width: 24,
    textAlign: 'right',
  },
  pfRiskWarn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 9,
    backgroundColor: 'rgba(235,168,0,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(235,168,0,0.26)',
    borderRadius: 7,
    marginTop: 4,
  },
  pfRiskIcon: { fontSize: 10, marginTop: 1 },
  pfRiskTxt: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#EBA800',
    lineHeight: 12,
    flex: 1,
  },
  recCard: {
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  recHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 5 },
  recIcon: { fontSize: 15 },
  recTitle: { fontSize: 13, fontWeight: '600', flex: 1, color: coachColors.fg, fontFamily: fonts.bodySemiBold },
  recPriority: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  rpHigh: {
    backgroundColor: coachColors.orangeDim,
    color: coachColors.orange,
    borderWidth: 1,
    borderColor: 'rgba(255,95,31,0.22)',
  },
  rpMed: {
    backgroundColor: coachColors.accentDim,
    color: coachColors.accent,
    borderWidth: 1,
    borderColor: 'rgba(247,233,40,0.20)',
  },
  rpLow: {
    backgroundColor: coachColors.coachDim,
    color: coachColors.coach,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.20)',
  },
  recText: { fontSize: 12, color: coachColors.mutedHi, lineHeight: 18, fontFamily: fonts.body },
  athleteHero: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: coachColors.glassBgCoach,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,212,170,0.12)',
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 0,
  },
  athleteHeroCompact: { paddingVertical: 10, paddingHorizontal: 14 },
  heroBack: { position: 'absolute', top: 14, left: 16, zIndex: 2 },
  heroInner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 20,
  },
  heroInnerCompact: { marginTop: 14, gap: 12 },
});
