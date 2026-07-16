import type { Client, Workout } from '../types/database';
import type { AthleteAggregateView } from '../types/platform';
import { fetchUserProfile, fetchUserProfileByEmail } from './platformAthlete';
import { fetchWorkoutSessionsForUser } from './platformTimer';
import { fetchActiveProgramForAthlete } from './platformAdapt';
import { fetchGoalsetterViewForUser } from './platformGoalsetter';
import { fetchPerformViewForUser } from './platformPerform';
import { fetchTrackerViewForUser } from './platformTracker';
import { fetchMacroViewForUser } from './platformMacro';
import { fetchAppBadgesForUser } from './platformUsers';
import { getSharedScopesForAthlete, type SharedScopes } from '../lib/consent';

const NO_SCOPES_SHARED: SharedScopes = { nutrition: false, training: false, goals: false };

function formatLoadError(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === 'object') {
    const obj = reason as Record<string, unknown>;
    const parts = [obj.message, obj.details, obj.hint, obj.code].filter(
      (part): part is string => typeof part === 'string' && part.length > 0
    );
    if (parts.length > 0) return parts.join(' — ');
  }
  return String(reason);
}

export async function fetchAthleteAggregate(
  client: Client,
  coachWorkouts: Workout[] = []
): Promise<AthleteAggregateView> {
  const loadWarnings: string[] = [];
  const linkedUserId = client.client_user_id;
  let userId = linkedUserId;
  const clientWorkouts = coachWorkouts.filter((w) => w.client_id === client.id);

  let profile = null;
  if (userId) {
    try {
      profile = await fetchUserProfile(userId);
      if (!profile) {
        loadWarnings.push('Atletprofil saknas för länkat user_id.');
      }
    } catch (error) {
      loadWarnings.push(`Kunde inte läsa atletprofil: ${formatLoadError(error)}`);
    }
  }

  const clientEmail = client.email?.trim() ?? null;
  if ((!userId || !profile) && clientEmail) {
    try {
      const fallbackProfile = await fetchUserProfileByEmail(clientEmail);
      if (fallbackProfile) {
        if (userId && fallbackProfile.user_id !== userId) {
          loadWarnings.push(
            'client_user_id matchar inte user_profiles för e-post. Visar data från e-postmatchning.'
          );
        } else if (!userId) {
          loadWarnings.push(
            'client_user_id saknas. Visar data från user_profiles via e-postmatchning.'
          );
        }
        userId = fallbackProfile.user_id;
        profile = fallbackProfile;
      }
    } catch (error) {
      loadWarnings.push(`Kunde inte slå upp atlet via e-post: ${formatLoadError(error)}`);
    }
  }

  if (!userId) {
    return {
      clientId: client.id,
      userId: null,
      linkedUserId,
      profile,
      apps: { perform: false, tracker: false, macro: false, goalsetter: false },
      timerSessions: [],
      coachWorkouts: clientWorkouts,
      adapt: null,
      perform: null,
      tracker: null,
      macro: null,
      goalsetter: {
        nutritionGoal: null,
        routines: [],
        physicalTests: [],
        hasSportGoals: false,
        goals: [],
        habits: [],
        tasks: [],
        activityStreak: null,
      },
      sharedScopes: { ...NO_SCOPES_SHARED },
      lastActivityAt: latestTimestamp(
        clientWorkouts.map((w) => w.completed_at ?? w.created_at)
      ),
      loadWarnings: [
        ...loadWarnings,
        'Atleten saknar kopplat user_id i Coach och kunde inte matchas via e-post.',
      ],
    };
  }

  const timerSessions = await fetchWorkoutSessionsForUser(userId, 14).catch((error) => {
    loadWarnings.push(`Timer-data kunde inte laddas: ${formatLoadError(error)}`);
    return [];
  });
  const adapt = await fetchActiveProgramForAthlete(userId).catch((error) => {
    loadWarnings.push(`Adapt-program kunde inte laddas: ${formatLoadError(error)}`);
    return null;
  });
  const goalsetter = await fetchGoalsetterViewForUser(userId).catch((error) => {
    loadWarnings.push(`Goalsetter-data kunde inte laddas: ${formatLoadError(error)}`);
    return {
      nutritionGoal: null,
      routines: [],
      physicalTests: [],
      hasSportGoals: false,
      goals: [],
      habits: [],
      tasks: [],
      activityStreak: null,
    };
  });
  const perform = await fetchPerformViewForUser(userId, {
    email: client.email ?? undefined,
  }).catch((error) => {
    loadWarnings.push(`Perform-data kunde inte laddas: ${formatLoadError(error)}`);
    return null;
  });
  if (
    perform &&
    linkedUserId &&
    perform.movementAssessments.length > 0 &&
    perform.movementAssessments.some((row) => row.user_id !== linkedUserId)
  ) {
    loadWarnings.push(
      'Rörelsebedömning matchar inte clients.client_user_id. Kontrollera användarkopplingen.'
    );
  }
  const tracker = await fetchTrackerViewForUser(userId).catch((error) => {
    loadWarnings.push(`Tracker-data kunde inte laddas: ${formatLoadError(error)}`);
    return null;
  });
  const macro = await fetchMacroViewForUser(userId).catch((error) => {
    loadWarnings.push(`Macro-data kunde inte laddas: ${formatLoadError(error)}`);
    return null;
  });
  const apps = await fetchAppBadgesForUser(userId).catch((error) => {
    loadWarnings.push(`App-badges kunde inte laddas: ${formatLoadError(error)}`);
    return {
      perform: false,
      tracker: false,
      macro: false,
      goalsetter: false,
    };
  });
  const sharedScopes = await getSharedScopesForAthlete(userId).catch((error) => {
    loadWarnings.push(`Delningsinställningar kunde inte läsas: ${formatLoadError(error)}`);
    return { ...NO_SCOPES_SHARED };
  });

  const lastActivityAt = latestTimestamp([
    ...clientWorkouts.map((w) => w.completed_at ?? w.created_at),
    ...timerSessions.map((s) => s.completed_at),
    ...(tracker?.sessions.map((s) => s.ended_at) ?? []),
  ]);

  return {
    clientId: client.id,
    userId,
    linkedUserId,
    profile,
    apps,
    timerSessions,
    coachWorkouts: clientWorkouts,
    adapt,
    perform,
    tracker,
    macro,
    goalsetter,
    sharedScopes,
    lastActivityAt,
    loadWarnings,
  };
}

export async function fetchAthleteAggregateByUserId(
  userId: string,
  clientId: string,
  coachWorkouts: Workout[] = []
): Promise<AthleteAggregateView> {
  const stubClient: Client = {
    id: clientId,
    assigned_pt_id: '',
    client_user_id: userId,
    name: '',
    email: null,
    phone: null,
    notes: null,
    sport: null,
    age: null,
    weight_kg: null,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  const agg = await fetchAthleteAggregate(stubClient, coachWorkouts);
  if (agg.profile?.name) {
    stubClient.name = agg.profile.name;
  }
  return agg;
}

export async function fetchAthleteAggregateById(
  clientId: string,
  clients: Client[],
  coachWorkouts: Workout[] = []
): Promise<AthleteAggregateView | null> {
  const client = clients.find((c) => c.id === clientId);
  if (!client) return null;
  return fetchAthleteAggregate(client, coachWorkouts);
}

export async function fetchDashboardAggregates(
  clients: Client[],
  coachWorkouts: Workout[] = []
): Promise<AthleteAggregateView[]> {
  const active = clients.filter((c) => c.is_active && c.client_user_id);
  const results = await Promise.all(
    active.map((c) => fetchAthleteAggregate(c, coachWorkouts).catch(() => null))
  );
  return results.filter((r): r is AthleteAggregateView => r !== null);
}

function latestTimestamp(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((d): d is string => Boolean(d));
  if (valid.length === 0) return null;
  return valid.sort((a, b) => b.localeCompare(a))[0];
}
