import { Platform, Share } from 'react-native';
import type { Client } from '../types/database';
import type { Workout } from '../types/database';

export type ReportExportRow = {
  clientName: string;
  clientId: string;
  completedWorkouts: number;
  goalPct: number | null;
  status: string;
};

export type ReportExportPayload = {
  period: string;
  generatedAt: string;
  summary: {
    sessions: number;
    activeAthletes: number;
    alerts: number;
    avgGoalPct: number;
  };
  athletes: ReportExportRow[];
};

export function buildReportCsv(payload: ReportExportPayload): string {
  const lines = [
    `Period,${payload.period}`,
    `Genererad,${payload.generatedAt}`,
    `Sessioner,${payload.summary.sessions}`,
    `Aktiva atleter,${payload.summary.activeAthletes}`,
    `Varningar,${payload.summary.alerts}`,
    `Snitt mål %,${payload.summary.avgGoalPct}`,
    '',
    'Atlet,ID,Sessioner,Mål %,Status',
    ...payload.athletes.map(
      (a) =>
        `"${a.clientName.replace(/"/g, '""')}",${a.clientId},${a.completedWorkouts},${a.goalPct ?? ''},${a.status}`
    ),
  ];
  return lines.join('\n');
}

export async function downloadOrShareExport(
  filename: string,
  content: string,
  mime: string
): Promise<void> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({
    title: filename,
    message: content.length > 8000 ? `${content.slice(0, 8000)}\n…` : content,
  });
}

export function workoutsForClientInPeriod(
  workouts: Workout[],
  clientId: string,
  periodStart: Date
): number {
  return workouts.filter(
    (w) =>
      w.client_id === clientId &&
      w.status === 'completed' &&
      new Date(w.date) >= periodStart
  ).length;
}

export function activeClients(clients: Client[]): Client[] {
  return clients.filter((c) => c.is_active);
}
