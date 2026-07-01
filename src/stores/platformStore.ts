import { create } from 'zustand';
import type { Client, Workout } from '../types/database';
import type { AthleteAggregateView, WorkoutSessionRow } from '../types/platform';
import { fetchWorkoutSessionsForUsers } from '../services/platformTimer';
import { fetchDashboardAggregates } from '../services/athleteAggregator';

type PlatformState = {
  timerSessionsByUser: Record<string, WorkoutSessionRow[]>;
  aggregatesByClient: Record<string, AthleteAggregateView>;
  isLoading: boolean;
};

type PlatformActions = {
  loadForClients: (clients: Client[], workouts: Workout[]) => Promise<void>;
  getTimerSessions: (userId: string | null | undefined) => WorkoutSessionRow[];
  getAggregate: (clientId: string) => AthleteAggregateView | undefined;
  clear: () => void;
};

export const usePlatformStore = create<PlatformState & PlatformActions>((set, get) => ({
  timerSessionsByUser: {},
  aggregatesByClient: {},
  isLoading: false,

  loadForClients: async (clients, workouts) => {
    set({ isLoading: true });
    try {
      const userIds = clients
        .map((c) => c.client_user_id)
        .filter((id): id is string => Boolean(id));

      const [timerSessions, aggregates] = await Promise.all([
        userIds.length > 0
          ? fetchWorkoutSessionsForUsers(userIds, 8).catch(() => [])
          : Promise.resolve([]),
        fetchDashboardAggregates(clients, workouts).catch(() => []),
      ]);

      const timerSessionsByUser: Record<string, WorkoutSessionRow[]> = {};
      for (const session of timerSessions) {
        if (!timerSessionsByUser[session.user_id]) {
          timerSessionsByUser[session.user_id] = [];
        }
        timerSessionsByUser[session.user_id].push(session);
      }

      const aggregatesByClient: Record<string, AthleteAggregateView> = {};
      for (const agg of aggregates) {
        aggregatesByClient[agg.clientId] = agg;
      }

      set({ timerSessionsByUser, aggregatesByClient });
    } finally {
      set({ isLoading: false });
    }
  },

  getTimerSessions: (userId) => {
    if (!userId) return [];
    return get().timerSessionsByUser[userId] ?? [];
  },

  getAggregate: (clientId) => get().aggregatesByClient[clientId],

  clear: () => set({ timerSessionsByUser: {}, aggregatesByClient: {}, isLoading: false }),
}));
