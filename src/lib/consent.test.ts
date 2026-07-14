import { describe, expect, it } from 'vitest';

/** Mirrors coach_athlete_has_scope client check before fetch. */
export function coachCanReadScope(
  scopes: { nutrition?: boolean; training?: boolean; goals?: boolean } | null,
  scope: 'nutrition' | 'training' | 'goals',
  hasLegacyClientLink: boolean,
): boolean {
  if (scopes) return scopes[scope] === true;
  return hasLegacyClientLink;
}

describe('consent scope RLS helper', () => {
  it('denies when scope false', () => {
    expect(coachCanReadScope({ nutrition: false, training: false, goals: false }, 'nutrition', true)).toBe(false);
  });

  it('allows when scope true', () => {
    expect(coachCanReadScope({ nutrition: true, training: false, goals: false }, 'nutrition', false)).toBe(true);
  });

  it('falls back to legacy client link when no relationship scopes', () => {
    expect(coachCanReadScope(null, 'training', true)).toBe(true);
    expect(coachCanReadScope(null, 'training', false)).toBe(false);
  });
});
