import { KeySignature } from '../types';

export const MODES = [
  'Jónico (Mayor)',
  'Dórico',
  'Frigio',
  'Lidio',
  'Mixolidio',
  'Eolio (Menor)',
  'Locrio'
];

export const ROOT_NOTES = ['Do', 'Do#', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Fa#', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si'];

// 0=DO, 1=RE, 2=MI, 3=FA, 4=SOL, 5=LA, 6=SI
const SHARPS_ORDER = [3, 0, 4, 1, 5, 2, 6]; // FA, DO, SOL, RE, LA, MI, SI
const FLATS_ORDER = [6, 2, 5, 1, 4, 0, 3]; // SI, MI, LA, RE, SOL, DO, FA

// Number of accidentals for each major scale (Ionian)
// Positive = sharps, Negative = flats
const MAJOR_ACCIDENTALS: Record<string, number> = {
  'Do': 0,
  'Sol': 1,
  'Re': 2,
  'La': 3,
  'Mi': 4,
  'Si': 5,
  'Fa#': 6,
  'Do#': 7,
  'Fa': -1,
  'Sib': -2,
  'Mib': -3,
  'Lab': -4,
  'Reb': -5,
  'Solb': -6,
  'Dob': -7
};

// Mode offsets in the circle of fifths relative to Ionian
const MODE_OFFSETS: Record<string, number> = {
  'Jónico (Mayor)': 0,
  'Dórico': -2,
  'Frigio': -4,
  'Lidio': 1,
  'Mixolidio': -1,
  'Eolio (Menor)': -3,
  'Locrio': -5
};

export function getAccidentalsForMode(rootNote: string, mode: string): { pitchClass: number, alteration: '#' | '-' | 'n' }[] {
  if (mode === 'Sin modo' || mode === 'Personalizado') return [];
  
  const baseAccidentals = MAJOR_ACCIDENTALS[rootNote];
  if (baseAccidentals === undefined) return [];

  const offset = MODE_OFFSETS[mode] || 0;
  const totalAccidentals = baseAccidentals + offset;

  const accidentals: { pitchClass: number, alteration: '#' | '-' | 'n' }[] = [];

  if (totalAccidentals > 0) {
    for (let i = 0; i < totalAccidentals && i < SHARPS_ORDER.length; i++) {
      accidentals.push({ pitchClass: SHARPS_ORDER[i], alteration: '#' });
    }
  } else if (totalAccidentals < 0) {
    for (let i = 0; i < Math.abs(totalAccidentals) && i < FLATS_ORDER.length; i++) {
      accidentals.push({ pitchClass: FLATS_ORDER[i], alteration: '-' });
    }
  }

  return accidentals;
}

export function getKeySignatureAt(time: number, keySignatures: KeySignature[] = []): KeySignature {
  if (!keySignatures || keySignatures.length === 0) {
    return { id: 'default', startTime: 0, rootNote: 'Do', mode: 'Jónico (Mayor)', accidentals: [] };
  }
  
  let currentKS = keySignatures[0];
  for (const ks of keySignatures) {
    if (ks.startTime <= time) {
      currentKS = ks;
    } else {
      break;
    }
  }
  return currentKS;
}

export function getAccidentalWidth(accidentalsCount: number): number {
  return accidentalsCount * 12; // 12px per accidental
}
