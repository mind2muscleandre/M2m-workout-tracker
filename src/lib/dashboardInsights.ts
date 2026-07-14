import type { Client, Workout } from '../types/database';
import type { AthleteAggregateView, TrackerTrendPoint, WorkoutSessionRow } from '../types/platform';
import { deriveAthleteStatus, deriveGoalPct } from './athleteStatus';

export type KpiDelta = {
  label: string;
  tone: 'up' | 'down' | 'flat';
};

export type NeedsYouItem = {
  clientId: string;
  name: string;
  initials: string;
  reason: string;
  reasonHighlight?: string;
  actionLabel: string;
  status: 'alert' | 'review' | 'session';
};

export type ActivityItem = {
  id: string;
  severity: 'high' | 'med' | 'good';
  time: string;
  text: string;
  bold?: string;
};

function startOfIsoWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isInWeek(iso: string | null | undefined, weekStart: Date, weekEnd: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= weekStart.getTime() && t < weekEnd.getTime();
}

export function countScreeningsForWeek(
  clients: Client[],
  getAggregate: (clientId: string) => AthleteAggregateView | null | undefined,
  weekOffset = 0
): number {
  const now = new Date();
  const start = startOfIsoWeek(now);
  start.setDate(start.getDate() + weekOffset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  let count = 0;
  for (const client of clients) {
    const sessions = getAggregate(client.id)?.perform?.screeningSessions ?? [];
    for (const session of sessions) {
      if (isInWeek(session.analysedAt, start, end)) count += 1;
    }
  }
  return count;
}

export function buildKpiDeltas(
  activeCount: number,
  alertCount: number,
  screeningWeekDelta: number | null = null
): Record<string, KpiDelta | undefined> {
  return {
    clients:
      activeCount >= 10
        ? {
            label: `+${Math.min(3, Math.max(1, Math.floor(activeCount / 6)))} denna månad`,
            tone: 'up',
          }
        : undefined,
    alerts: alertCount > 0 ? { label: `▲ +${alertCount} idag`, tone: 'down' } : undefined,
    screenings:
      screeningWeekDelta != null && screeningWeekDelta !== 0
        ? {
            label: screeningWeekDelta > 0 ? `▲ +${screeningWeekDelta}` : `▼ ${screeningWeekDelta}`,
            tone: screeningWeekDelta > 0 ? 'up' : 'down',
          }
        : undefined,
  };
}

function deriveRecoveryScore(aggregate: AthleteAggregateView | null | undefined): number | null {
  const sessions = aggregate?.timerSessions ?? [];
  if (sessions.length === 0) return null;
  const twoDaysAgo = Date.now() - 2 * 86400000;
  const recent = sessions.filter((s) => s.completed_at && new Date(s.completed_at).getTime() > twoDaysAgo);
  if (recent.length === 0) return null;
  const totalStrain = recent.reduce((acc, s) => {
    const durMin = (s.duration_seconds ?? 0) / 60;
    return acc + (durMin * (s.intensity ?? 5)) / 60;
  }, 0);
  return Math.round(Math.max(10, Math.min(100, 100 - totalStrain * 8)));
}

export function computeAvgReadiness(
  clients: Client[],
  getAggregate: (clientId: string) => AthleteAggregateView | null | undefined
): number | null {
  const scores = clients
    .map((c) => deriveRecoveryScore(getAggregate(c.id)))
    .filter((s): s is number => s != null);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function computeAdherenceSparkline(
  clients: Client[],
  workouts: Workout[],
  days = 7
): number[] {
  const counts = Array.from({ length: days }, () => 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const clientIds = new Set(clients.map((c) => c.id));

  for (const w of workouts) {
    if (!clientIds.has(w.client_id) || w.status !== 'completed' || !w.completed_at) continue;
    const d = new Date(w.completed_at);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < days) {
      counts[days - 1 - diff] += 1;
    }
  }

  return counts.some((c) => c > 0) ? counts : [];
}

export function computeTodaySessionStats(workouts: Workout[], clientIds: Set<string>) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayWorkouts = workouts.filter((w) => {
    if (!clientIds.has(w.client_id)) return false;
    const d = w.date?.slice(0, 10) ?? w.completed_at?.slice(0, 10);
    return d === todayStr;
  });
  const completed = todayWorkouts.filter((w) => w.status === 'completed').length;
  const remaining = todayWorkouts.filter(
    (w) => w.status === 'planned' || w.status === 'in_progress'
  ).length;
  return { completed, remaining, total: todayWorkouts.length };
}

export function computeAdherenceWeekDelta(
  clients: Client[],
  workouts: Workout[]
): number | null {
  const clientIds = new Set(clients.map((c) => c.id));
  const now = new Date();
  const thisWeekStart = startOfIsoWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  let thisWeek = 0;
  let lastWeek = 0;
  for (const w of workouts) {
    if (!clientIds.has(w.client_id) || w.status !== 'completed' || !w.completed_at) continue;
    const t = new Date(w.completed_at).getTime();
    if (t >= thisWeekStart.getTime()) thisWeek += 1;
    else if (t >= lastWeekStart.getTime() && t < thisWeekStart.getTime()) lastWeek += 1;
  }
  if (thisWeek === 0 && lastWeek === 0) return null;
  return thisWeek - lastWeek;
}

export function sparklineFromTrackerTrends(trends: TrackerTrendPoint[] | undefined | null): number[] {
  if (!trends?.length) return [];
  const byDate = new Map<string, number>();
  for (const t of trends) {
    byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.totalSets);
  }
  const sorted = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  const values = sorted.slice(-6).map(([, v]) => v);
  return values.length > 0 ? values : [];
}

export function sparklineFromGoalPct(
  pct: number | null | undefined,
  trends?: TrackerTrendPoint[] | null
): number[] {
  const fromTrends = sparklineFromTrackerTrends(trends);
  if (fromTrends.length > 0) return fromTrends;
  if (pct == null) return [];
  return [];
}

export function buildNeedsYouQueue(
  clients: Client[],
  workouts: Workout[],
  getTimerSessions: (userId: string | null | undefined) => WorkoutSessionRow[],
  getAggregate: (clientId: string) => AthleteAggregateView | null | undefined
): NeedsYouItem[] {
  const items: NeedsYouItem[] = [];

  for (const client of clients) {
    const status = deriveAthleteStatus(client, workouts, getTimerSessions(client.client_user_id));
    const initials = client.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    if (status === 'alert') {
      const missed = workouts.filter(
        (w) => w.client_id === client.id && w.status === 'planned'
      ).length;
      items.push({
        clientId: client.id,
        name: client.name,
        initials,
        reason: missed > 0 ? `${missed} missade pass` : 'Inaktiv > 5 dagar',
        reasonHighlight: 'VARNING',
        actionLabel: 'Öppna',
        status: 'alert',
      });
      continue;
    }

    const goalPct = deriveGoalPct(getAggregate(client.id));
    if (goalPct != null && goalPct < 45) {
      items.push({
        clientId: client.id,
        name: client.name,
        initials,
        reason: `Målstatus ${goalPct}%`,
        reasonHighlight: 'LÅGT MÅL',
        actionLabel: 'Planera',
        status: 'review',
      });
    }
  }

  const upcoming = workouts
    .filter((w) => w.status === 'planned' || w.status === 'in_progress')
    .slice(0, 2);

  for (const w of upcoming) {
    const client = clients.find((c) => c.id === w.client_id);
    if (!client) continue;
    items.push({
      clientId: client.id,
      name: client.name,
      initials: client.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
      reason: 'Nästa session väntar',
      actionLabel: 'Starta',
      status: 'session',
    });
  }

  return items.slice(0, 5);
}

export function buildActivityFeed(
  clients: Client[],
  workouts: Workout[]
): ActivityItem[] {
  const now = Date.now();
  const items: ActivityItem[] = [];

  const recentCompleted = [...workouts]
    .filter((w) => w.status === 'completed' && w.completed_at)
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
    .slice(0, 3);

  for (const w of recentCompleted) {
    const client = clients.find((c) => c.id === w.client_id);
    const mins = w.completed_at
      ? Math.max(1, Math.round((now - new Date(w.completed_at).getTime()) / 60000))
      : 0;
    items.push({
      id: `done-${w.id}`,
      severity: 'good',
      time: mins < 120 ? `${mins} MIN` : 'IDAG',
      bold: client?.name.split(' ')[0],
      text: ' avslutade pass',
    });
  }

  const alerts = clients.filter((c) => {
    const days = workouts
      .filter((w) => w.client_id === c.id && w.completed_at)
      .map((w) => w.completed_at!)
      .sort((a, b) => b.localeCompare(a))[0];
    if (!days) return true;
    return (now - new Date(days).getTime()) / (1000 * 60 * 60 * 24) > 5;
  });

  if (alerts[0]) {
    items.unshift({
      id: `alert-${alerts[0].id}`,
      severity: 'high',
      time: 'NU',
      bold: alerts[0].name.split(' ')[0],
      text: ' har inte tränat på 5+ dagar',
    });
  }

  if (alerts[1]) {
    items.push({
      id: `alert-${alerts[1].id}`,
      severity: 'med',
      time: '1 TIM',
      bold: alerts[1].name.split(' ')[0],
      text: ' missade planerat pass',
    });
  }

  return items.slice(0, 6);
}
