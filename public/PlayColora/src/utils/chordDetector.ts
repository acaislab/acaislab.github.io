import { Note, KeySignature } from '../types';
import { PITCH_VALUES } from '../constants';

const PITCH_TO_SEMITONE: Record<string, number> = {
  'DO': 0,
  'RE': 2,
  'MI': 4,
  'FA': 5,
  'SOL': 7,
  'LA': 9,
  'SI': 11
};

const ALTERATION_TO_SEMITONE: Record<string, number> = {
  '': 0,
  '#': 1,
  '-': -1,
  'n': 0
};

// Interval structure to chord suffix
const CHORD_STRUCTURES: Record<string, string> = {
  '4,7': '', // Major
  '3,7': 'm', // Minor
  '4,8': 'aug', // Augmented
  '3,6': 'dim', // Diminished
  '4,7,10': '7', // Dominant 7
  '4,7,11': 'maj7', // Major 7
  '3,7,10': 'm7', // Minor 7
  '3,7,11': 'm(maj7)', // Minor (major 7)
  '3,6,10': 'm7b5', // Half-diminished (m7b5 / Ø)
  '3,6,9': 'dim7', // Fully diminished
  '4,7,9': '6', // Major 6
  '3,7,9': 'm6', // Minor 6
  '5,7': 'sus4', // Sus 4
  '2,7': 'sus2', // Sus 2
  '4,7,10,2': '9', // Dominant 9
  '4,7,11,2': 'maj9', // Major 9
  '3,7,10,2': 'm9', // Minor 9
  '4,7,2': 'add9', // Major add9
  '3,7,2': 'madd9', // Minor add9
  '4,7,10,6': '7b5', // 7b5
  '4,8,10': '7#5', // 7#5
  '4,7,11,6': 'maj7#11', // maj7#11
};

export const getMidiNumber = (note: Note, keySignature?: KeySignature): number => {
  const base = PITCH_TO_SEMITONE[note.pitch];
  let alt = ALTERATION_TO_SEMITONE[note.alteration || ''];
  
  // If no explicit alteration, check key signature
  if (!note.alteration && keySignature) {
    const pitchClass = PITCH_VALUES[note.pitch as keyof typeof PITCH_VALUES];
    const acc = keySignature.accidentals.find(a => a.pitchClass === pitchClass);
    if (acc) {
      alt = ALTERATION_TO_SEMITONE[acc.alteration || ''];
    }
  }
  
  // Assuming octave 4 is middle C (MIDI 60)
  return 60 + ((note.octave - 4) * 12) + base + alt;
};

const getPitchClassName = (pc: number, ks?: KeySignature): string => {
  const sharps = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const mixed = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  
  if (!ks) return mixed[pc];
  
  // Heuristic: check if the key signature uses sharps or flats
  const sharpsCount = ks.accidentals.filter(a => a.alteration === '#').length;
  const flatsCount = ks.accidentals.filter(a => a.alteration === '-').length;
  
  if (sharpsCount > flatsCount) return sharps[pc];
  if (flatsCount > sharpsCount) return flats[pc];
  
  return mixed[pc];
};

export const detectChord = (notes: Note[], keySignature?: KeySignature): string | null => {
  if (notes.length < 3) return null;

  const midiNumbers = notes.map(n => getMidiNumber(n, keySignature)).sort((a, b) => a - b);
  const pitchClasses = Array.from(new Set(midiNumbers.map(m => m % 12)));
  const bassNote = midiNumbers[0] % 12;

  if (pitchClasses.length < 3) return null;

  let bestChord = null;
  let minComplexity = Infinity;

  // Try each note in the set as a potential root
  for (const root of pitchClasses) {
    const intervals = pitchClasses
      .map(pc => (pc - root + 12) % 12)
      .filter(i => i !== 0) // Remove root
      .sort((a, b) => a - b);

    const structureKey = intervals.join(',');
    
    // Check for exact match in our common structures
    if (CHORD_STRUCTURES[structureKey]) {
      const rootName = getPitchClassName(root, keySignature);
      const suffix = CHORD_STRUCTURES[structureKey];
      const slash = root === bassNote ? '' : `/${getPitchClassName(bassNote, keySignature)}`;
      return `${rootName}${suffix}${slash}`;
    }

    // If no exact match, we try to find the "best" interpretation
    const complexity = intervals.reduce((acc, interval) => {
      if ([3, 4, 7, 10, 11].includes(interval)) return acc + 1;
      if ([2, 5, 6, 8, 9].includes(interval)) return acc + 2;
      return acc + 3; // Dissonant/Cluster intervals
    }, 0);

    if (complexity < minComplexity) {
      minComplexity = complexity;
      bestChord = { root, intervals };
    }
  }

  if (bestChord) {
    const { root, intervals } = bestChord;
    const rootName = getPitchClassName(root, keySignature);
    const slash = root === bassNote ? '' : `/${getPitchClassName(bassNote, keySignature)}`;
    
    // Descriptive name for complex/cluster chords
    if (minComplexity > pitchClasses.length * 2) {
      return `${getPitchClassName(bassNote, keySignature)} (cluster)`;
    }

    // Try to build a name from intervals
    let name = rootName;
    if (intervals.includes(3)) name += 'm';
    else if (intervals.includes(4)) name += '';
    
    if (intervals.includes(6) && !intervals.includes(7)) name += 'b5';
    if (intervals.includes(8) && !intervals.includes(7)) name += 'aug';
    
    if (intervals.includes(10)) name += '7';
    else if (intervals.includes(11)) name += 'maj7';

    // Add extensions
    const extensions = [];
    if (intervals.includes(2)) extensions.push('add9');
    if (intervals.includes(5)) extensions.push('sus4');
    if (intervals.includes(6) && intervals.includes(7)) extensions.push('#11');
    if (intervals.includes(8) && intervals.includes(7)) extensions.push('b13');
    
    if (extensions.length > 0) {
      name += `(${extensions.join(',')})`;
    }

    return `${name}${slash}`;
  }

  return `${getPitchClassName(bassNote, keySignature)} (cluster)`;
};
