// ============================================
// Utility functions
// ============================================

/**
 * Calculate estimated 1RM using Epley formula
 * 1RM = weight × (1 + reps/30)
 */
export function calculateEstimated1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/**
 * Calculate volume (weight × reps)
 */
export function calculateVolume(weight: number, reps: number): number {
  return weight * reps;
}

/**
 * Format seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date to readable string
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date for display (shorter)
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('sv-SE', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate a UUID v4 (for offline-first creation)
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Debounce function for auto-save
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

import type { ExerciseTrackingType } from '../types/database';

export type LibraryCategory =
  | 'styrka'
  | 'kondition'
  | 'rorlighet'
  | 'koordination'
  | 'explosion';

/**
 * Get category display name
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    strength: 'Styrka',
    power: 'Power',
    conditioning: 'Kondition',
    mobility: 'Mobilitet',
    injury_prevention: 'Skadeprevention',
  };
  return labels[category] || category;
}

export function getLibraryCategoryLabel(category: LibraryCategory | 'alla'): string {
  const labels: Record<LibraryCategory | 'alla', string> = {
    alla: 'Alla',
    styrka: 'Styrka',
    kondition: 'Kondition',
    rorlighet: 'Rörlighet',
    koordination: 'Koordination',
    explosion: 'Explosivitet',
  };
  return labels[category] ?? category;
}

export function getTrackingTypeLabel(trackingType: ExerciseTrackingType | string | null): string {
  switch (trackingType) {
    case 'weight':
      return 'Vikt/Reps';
    case 'time':
      return 'Tid';
    case 'other':
      return 'Reps';
    default:
      return trackingType ?? 'Reps';
  }
}

export function getEnergyLabelForCategory(category: LibraryCategory): string {
  switch (category) {
    case 'kondition':
      return 'Aerob';
    case 'explosion':
      return 'ATP-PC';
    case 'rorlighet':
      return 'Återhämtning';
    case 'koordination':
      return 'Styrka';
    default:
      return 'Styrka';
  }
}

/**
 * Get muscle group display name
 */
export function getMuscleGroupLabel(group: string): string {
  const labels: Record<string, string> = {
    chest: 'Bröst',
    back: 'Rygg',
    shoulders: 'Axlar',
    biceps: 'Biceps',
    triceps: 'Triceps',
    legs: 'Ben',
    glutes: 'Rumpa',
    core: 'Core',
    calves: 'Vader',
    forearms: 'Underarmar',
    full_body: 'Helkropp',
  };
  return labels[group] || group;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
