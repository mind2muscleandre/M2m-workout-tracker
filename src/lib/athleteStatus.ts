import type { Client, Workout } from '../types/database';
import type { AthleteAggregateView, WorkoutSessionRow } from '../types/platform';
import type { AthleteStatus } from './theme';
import type { AthleteCardData } from '../components/ui/AthleteCard';

const AVATAR_COLORS = [
  '#00D4AA', '#5E9EFF', '#FF9A3C', '#7EC8E3', '#FF5F1F', '#F7E928', '#A8E6CF',
];

export function getClientAvatarColor(clientId: string): string {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getClientInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

export function deriveAthleteStatus(
  client: Client,
  workouts: Workout[] = [],
  timerSessions: WorkoutSessionRow[] = []
): AthleteStatus {
  if (!client.is_active) return 'inactive';

  const clientWorkouts = workouts.filter((w) => w.client_id === client.id);
  const inProgress = clientWorkouts.some((w) => w.status === 'in_progress');
  if (inProgress) return 'training';

  const completedWorkouts = clientWorkouts
    .filter((w) => w.status === 'completed' && w.completed_at)
    .map((w) => w.completed_at!);

  const completedTimer = timerSessions
    .filter((s) => s.completed_at)
    .map((s) => s.completed_at!);

  const allCompleted = [...completedWorkouts, ...completedTimer].sort((a, b) =>
    b.localeCompare(a)
  );

  if (allCompleted.length === 0) return 'rest';

  const days = daysSince(allCompleted[0]);
  if (days > 5) return 'alert';
  if (days > 2) return 'recovery';
  return 'training';
}

export function formatLastSession(
  workouts: Workout[],
  clientId: string,
  timerSessions: WorkoutSessionRow[] = []
): string {
  const relevant = workouts
    .filter((w) => w.client_id === clientId && (w.completed_at || w.status === 'in_progress'))
    .sort((a, b) => {
      const da = a.completed_at ?? a.created_at;
      const db = b.completed_at ?? b.created_at;
      return db.localeCompare(da);
    });

  const latestTimer = timerSessions
    .filter((s) => s.completed_at)
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))[0];

  const latestWorkout = relevant[0];
  if (latestWorkout?.status === 'in_progress') return 'Pågår nu';

  const workoutTs = latestWorkout?.completed_at ?? latestWorkout?.created_at;
  const timerTs = latestTimer?.completed_at;
  const latest =
    workoutTs && timerTs
      ? workoutTs > timerTs
        ? workoutTs
        : timerTs
      : workoutTs ?? timerTs;

  if (!latest) return 'Ingen session';

  const d = new Date(latest);
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Idag';
  if (days === 1) return 'Igår';
  return `${days} dagar sedan`;
}

export function deriveGoalLabel(
  client: Client,
  aggregate?: AthleteAggregateView | null
): string {
  if (aggregate?.goalsetter.nutritionGoal) {
    const g = aggregate.goalsetter.nutritionGoal;
    if (g.goal_type) return `Näring: ${g.goal_type}`;
    if (g.calories) return `Näring: ${g.calories} kcal/dag`;
  }
  if (aggregate?.adapt?.program) {
    return aggregate.adapt.program.name;
  }
  return client.notes?.split('\n')[0]?.slice(0, 60) || 'Inget mål angivet';
}

export function deriveGoalPct(aggregate?: AthleteAggregateView | null): number | null {
  if (!aggregate) return null;
  if (aggregate.goalsetter.hasSportGoals) return null;
  const routines = aggregate.goalsetter.routines;
  if (routines.length > 0) {
    const done = routines.filter((r) => r.is_completed).length;
    return Math.round((done / routines.length) * 100);
  }
  if (aggregate.goalsetter.nutritionGoal) return null;
  return null;
}

export function clientToAthleteCard(
  client: Client,
  workouts: Workout[] = [],
  options?: {
    selected?: boolean;
    timerSessions?: WorkoutSessionRow[];
    aggregate?: AthleteAggregateView | null;
  }
): AthleteCardData {
  const timerSessions = options?.timerSessions ?? [];
  const status = deriveAthleteStatus(client, workouts, timerSessions);
  const goalPct = deriveGoalPct(options?.aggregate) ?? undefined;

  return {
    id: client.id,
    initials: getClientInitials(client.name),
    name: client.name,
    sport: client.sport,
    goal: deriveGoalLabel(client, options?.aggregate),
    goalPct,
    status,
    lastSession: formatLastSession(workouts, client.id, timerSessions),
    color: getClientAvatarColor(client.id),
    selected: options?.selected,
  };
}
