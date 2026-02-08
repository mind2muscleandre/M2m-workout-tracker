// ============================================
// PT Workout Tracker - Standard Sports
// ============================================

export const STANDARD_SPORTS = [
  'Hockey',
  'Fotboll',
  'Volleyboll',
  'Tennis',
  'Basket',
  'Handboll',
  'Badminton',
  'Simning',
  'Löpning',
  'Cykling',
  'Golf',
  'Friidrott',
  'Kampsport',
  'Styrketräning',
  'Crossfit',
  'Yoga',
  'Dans',
  'Ridning',
  'Skidor',
  'Skridskor',
  'Orientering',
  'Triathlon',
  'Rodd',
  'Segling',
  'Klättring',
] as const;

export type StandardSport = typeof STANDARD_SPORTS[number];
