import { Pitch, Duration } from './types';

export const PITCH_COLORS: Record<Pitch, string> = {
  DO: 'var(--color-do, #3b82f6)',
  RE: 'var(--color-re, #22c55e)',
  MI: 'var(--color-mi, #eab308)',
  FA: 'var(--color-fa, #f97316)',
  SOL: 'var(--color-sol, #ef4444)',
  LA: 'var(--color-la, #a855f7)',
  SI: 'var(--color-si, #38bdf8)',
};

export const DURATION_UNITS: Record<Duration, number> = {
  F: 0.5,
  S: 1,
  C: 2,
  N: 4,
  B: 8,
  R: 16,
};

export const PITCH_VALUES: Record<Pitch, number> = {
  DO: 0, RE: 1, MI: 2, FA: 3, SOL: 4, LA: 5, SI: 6
};

export const VALUE_TO_PITCH: Pitch[] = ['DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI'];

export const SYSTEM_UNITS = 64;
export const UNIT_WIDTH = 16;
export const CLEF_WIDTH = 51;
export const SYSTEM_WIDTH = SYSTEM_UNITS * UNIT_WIDTH + CLEF_WIDTH; // 1024 + 51
export const SYSTEM_HEIGHT = 540;
export const PITCH_HEIGHT = 8; // Distance between note steps (line to space)
export const SYSTEM_CENTER_Y = 200; // Corresponds to SI4 (middle line)

export type GridSubdivision = 'F' | 'S' | 'C' | 'N' | 'B' | 'R';

export const GRID_SUBDIVISIONS: Record<GridSubdivision, number> = {
  F: 0.5, // Fusa
  S: 1, // Semicorchea
  C: 2, // Corchea
  N: 4, // Negra
  B: 8, // Blanca
  R: 16, // Redonda
};

export const DEFAULT_TIME_SIGNATURE = { numerator: 4, denominator: 4, startTime: 0 };

export const SELECTED_NOTE_BORDER_COLOR = '#4B0082'; // Dark Purple
export const DEFAULT_MEASURES_PER_SYSTEM = 4;
