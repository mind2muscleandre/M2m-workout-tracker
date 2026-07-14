import type { Client, Workout } from '../types/database';
import type { AthleteAggregateView, WorkoutSessionRow } from '../types/platform';
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

export function buildKpiDeltas(activeCount: number, alertCount: number): Record<string, KpiDelta | undefined> {
  return {
    clients: activeCount >= 10
      ? { label: `+${Math.min(3, Math.max(1, Math.floor(activeCount / 6)))} denna månad`, tone: 'up' }
      : undefined,
    alerts: alertCount > 0 ? { label: `▲ +${alertCount} idag`, tone: 'down' } : undefined,
    screenings: { label: '▲ +3', tone: 'up' },
  };
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

export function sparklineFromGoalPct(pct: number | null | undefined): number[] {
  const base = pct ?? 50;
  return [
    Math.max(10, base - 18),
    Math.max(15, base - 12),
    Math.max(20, base - 8),
    Math.max(25, base - 4),
    Math.max(30, base - 2),
    base,
  ];
}
