import { supabase } from '../lib/supabase';
import { PLATFORM_DB } from '../lib/dbTables';
import type { PhysicalTestResultRow } from '../types/platform';

export async function fetchPhysicalTestsForUser(
  userId: string,
  limit = 20
): Promise<PhysicalTestResultRow[]> {
  const { data, error } = await supabase
    .from(PLATFORM_DB.physicalTestResults)
    .select('id, user_id, test_type, performed_at, result')
    .eq('user_id', userId)
    .order('performed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PhysicalTestResultRow[];
}

export function formatPhysicalTestValue(result: Record<string, unknown> | null): string {
  if (!result) return '—';
  const keys = ['value', 'score', 'cm', 'seconds', 'time', 'distance_m', 'weight_kg'];
  for (const key of keys) {
    const v = result[key];
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string' && v.trim()) return v;
  }
  const first = Object.values(result).find((v) => typeof v === 'number' || typeof v === 'string');
  return first != null ? String(first) : '—';
}

export function physicalTestLabel(testType: string): string {
  const map: Record<string, string> = {
    cmj: 'CMJ',
    sprint_30m: '30m sprint',
    yo_yo: 'Yo-Yo',
    broad_jump: 'Stående längdhopp',
  };
  return map[testType] ?? testType.replace(/_/g, ' ');
}
