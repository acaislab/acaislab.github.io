import { Note, Pitch, Alteration, Duration, Barline, Score, KeySignature, DynamicTransition } from './types';
import { DURATION_UNITS, PITCH_VALUES } from './constants';
import { getKeySignatureAt } from './utils/keySignatures';

export interface UnrolledNote extends Note {
  originalId: string;
  unrolledStartTime: number;
}

export const DYNAMIC_VALUES: Record<string, number> = {
  'ppp': 0.2,
  'pp': 0.3,
  'p': 0.4,
  'mp': 0.55,
  'mf': 0.7,
  'f': 0.85,
  'ff': 0.95,
  'fff': 1.0
};

export function getDynamicGainAtTime(time16n: number, unrolledNotes: UnrolledNote[], dynamicTransitions: DynamicTransition[]): number {
  const staticEvents = unrolledNotes
    .filter(n => n.dynamic && n.dynamic !== 'crescendo' && n.dynamic !== 'decrescendo')
    .map(n => ({ time16n: n.unrolledStartTime, gain: DYNAMIC_VALUES[n.dynamic!] }))
    .sort((a, b) => a.time16n - b.time16n);

  const transitionEvents: any[] = [];
  dynamicTransitions.forEach(transition => {
    const startNotes = unrolledNotes.filter(n => n.originalId === transition.startNoteId);
    const endNotes = unrolledNotes.filter(n => n.originalId === transition.endNoteId);
    for (let i = 0; i < Math.min(startNotes.length, endNotes.length); i++) {
      const startNote = startNotes[i];
      const endNote = endNotes[i];
      if (startNote && endNote && startNote.dynamic && endNote.dynamic) {
        transitionEvents.push({
          startTime: startNote.unrolledStartTime,
          endTime: endNote.unrolledStartTime,
          startGain: DYNAMIC_VALUES[startNote.dynamic],
          endGain: DYNAMIC_VALUES[endNote.dynamic]
        });
      }
    }
  });

  for (const t of transitionEvents) {
    if (time16n >= t.startTime && time16n <= t.endTime && t.startTime < t.endTime) {
      const progress = (time16n - t.startTime) / (t.endTime - t.startTime);
      return t.startGain + (t.endGain - t.startGain) * progress;
    }
  }

  let lastGain = 0.7; // default mf
  for (const e of staticEvents) {
    if (e.time16n <= time16n) {
      lastGain = e.gain;
    } else {
      break;
    }
  }
  return lastGain;
}

export function getDurationValue(duration: Duration, isDotted?: boolean, isTriplet?: boolean): number {
  const base = DURATION_UNITS[duration];
  let value = isDotted ? base + base / 2 : base;
  if (isTriplet) {
    value = value * 2 / 3;
  }
  return value;
}

export interface TimeMapEntry {
  unrolledStart: number;
  unrolledEnd: number;
  originalStart: number;
  originalEnd: number;
}

export function unrollScore(notes: Note[], barlines: Barline[]): { unrolledNotes: UnrolledNote[], timeMap: TimeMapEntry[] } {
  const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
  const sortedBarlines = [...barlines].sort((a, b) => a.startTime - b.startTime);

  const unrolledNotes: UnrolledNote[] = [];
  const timeMap: TimeMapEntry[] = [];
  
  interface Section {
    startTime: number;
    endTime: number;
    repeatCount: number;
  }

  const sections: Section[] = [];
  let lastSectionStart = 0;

  for (let i = 0; i < sortedBarlines.length; i++) {
    const barline = sortedBarlines[i];
    
    if (barline.type === 'repeat-start') {
      if (barline.startTime > lastSectionStart) {
        sections.push({
          startTime: lastSectionStart,
          endTime: barline.startTime,
          repeatCount: 1
        });
      }
      lastSectionStart = barline.startTime;
    } else if (barline.type === 'repeat-end' || barline.type === 'repeat-both') {
      if (barline.startTime > lastSectionStart) {
        sections.push({
          startTime: lastSectionStart,
          endTime: barline.startTime,
          repeatCount: typeof barline.repeatCount === 'number' ? barline.repeatCount : 2
        });
      }
      lastSectionStart = barline.startTime;
    }
  }

  const maxNoteTime = sortedNotes.length > 0 
    ? Math.max(...sortedNotes.map(n => n.startTime + getDurationValue(n.duration, n.isDotted, n.isTriplet)))
    : 0;
  const overallEndTime = Math.max(maxNoteTime, sortedBarlines.length > 0 ? sortedBarlines[sortedBarlines.length - 1].startTime : 0);

  if (overallEndTime > lastSectionStart || sections.length === 0) {
    sections.push({
      startTime: lastSectionStart,
      endTime: Math.max(overallEndTime, lastSectionStart + 1), // ensure positive duration
      repeatCount: 1
    });
  }

  let currentTimeOffset = 0;

  for (const section of sections) {
    const sectionNotes = sortedNotes.filter(n => n.startTime >= section.startTime && n.startTime < section.endTime);
    const sectionDuration = section.endTime - section.startTime;

    const actualRepeatCount = section.repeatCount === 999 ? 100 : (typeof section.repeatCount === 'number' ? section.repeatCount : 2); // Limit infinite loop for unrolling

    for (let r = 0; r < actualRepeatCount; r++) {
      timeMap.push({
        unrolledStart: currentTimeOffset,
        unrolledEnd: currentTimeOffset + sectionDuration,
        originalStart: section.startTime,
        originalEnd: section.endTime
      });

      for (const note of sectionNotes) {
        unrolledNotes.push({
          ...note,
          id: `${note.id}-repeat-${r}`,
          originalId: note.id,
          unrolledStartTime: (note.startTime - section.startTime) + currentTimeOffset
        });
      }
      currentTimeOffset += sectionDuration;
    }
  }

  return { unrolledNotes, timeMap };
}

export function getOriginalTime(unrolledTime: number, timeMap: TimeMapEntry[]): number {
  for (const entry of timeMap) {
    if (unrolledTime >= entry.unrolledStart && unrolledTime < entry.unrolledEnd) {
      return entry.originalStart + (unrolledTime - entry.unrolledStart);
    }
  }
  // If beyond the end, extrapolate from the last entry
  if (timeMap.length > 0) {
    const lastEntry = timeMap[timeMap.length - 1];
    if (unrolledTime >= lastEntry.unrolledEnd) {
      return lastEntry.originalEnd + (unrolledTime - lastEntry.unrolledEnd);
    }
  }
  return unrolledTime;
}

export function getSystemBoundaries(score: Score, isHorizontalView: boolean = false) {
  const { notes, barlines, timeSignatures = [], measuresPerSystem = 4, systemMeasures = [], manualSystems = 1, groupedRests = [] } = score;
  
  const maxStartTime = notes.length > 0 
    ? Math.max(...notes.map(n => n.startTime + getDurationValue(n.duration, n.isDotted, n.isTriplet))) 
    : 0;
  const maxBarlineTime = barlines?.length > 0
    ? Math.max(...barlines.map(b => b.startTime))
    : 0;
  const overallMaxTime = Math.max(maxStartTime, maxBarlineTime);

  if (isHorizontalView) {
    // Return a single system that encompasses the entire score plus some padding
    return [{
      startTime: 0,
      endTime: Math.max(overallMaxTime + 16, 64), // At least 64 units or overallMaxTime + 16
      measures: 9999 // Arbitrary large number
    }];
  }

  const boundaries: { startTime: number, endTime: number, measures: number }[] = [];
  let currentTime = 0;
  let systemIndex = 0;

  // Calculate boundaries based on content
  while (currentTime < overallMaxTime || boundaries.length < manualSystems) {
    const numMeasures = systemMeasures[systemIndex] || measuresPerSystem;
    let systemEndTime = currentTime;
    let visualMeasures = 0;
    
    while (visualMeasures < numMeasures) {
      const gr = groupedRests.find(g => Math.abs(g.startTime - systemEndTime) < 0.001);
      if (gr) {
        let tempTime = systemEndTime;
        for (let i = 0; i < gr.measures; i++) {
          const ts = getTimeSignatureAt(tempTime, timeSignatures);
          tempTime += getBarLength(ts.numerator, ts.denominator);
        }
        systemEndTime = tempTime;
        visualMeasures++;
      } else {
        const ts = getTimeSignatureAt(systemEndTime, timeSignatures);
        const barLength = getBarLength(ts.numerator, ts.denominator);
        
        const sortedTs = [...timeSignatures].sort((a, b) => a.startTime - b.startTime);
        const nextTs = sortedTs.find(t => t.startTime > systemEndTime && t.startTime < systemEndTime + barLength);
        
        if (nextTs) {
          systemEndTime = nextTs.startTime;
        } else {
          systemEndTime += barLength;
        }
        visualMeasures++;
      }
    }
    
    boundaries.push({
      startTime: currentTime,
      endTime: systemEndTime,
      measures: numMeasures
    });
    
    currentTime = systemEndTime;
    systemIndex++;

    // Safety break to prevent infinite loops if something goes wrong
    if (systemIndex > 1000) break;
  }
  
  return boundaries;
}

export type ParsedItem = 
  | { type: 'note', pitch: Pitch, alteration: Alteration, duration: Duration, octave: number, isDotted: boolean, isSilence?: boolean }
  | { type: 'barline' };

export function parseTextToNotes(text: string): ParsedItem[] {
  // Regex updated to capture:
  // 1. Notes: (DO|RE|MI|FA|SOL|LA|SI)(#|-)?(F|S|C|N|B|R)(\.)?([0-8])?
  // 2. Silences: (-|_)(\.)?
  // 3. Barlines: /
  const regex = /((DO|RE|MI|FA|SOL|LA|SI)(#|-)?(F|S|C|N|B|R)(\.)?([0-8])?)|(-|_)(\.)?|(\/)/gi;
  const items: ParsedItem[] = [];
  let match;
  
  while ((match = regex.exec(text.toUpperCase())) !== null) {
    if (match[9] === '/') {
      items.push({ type: 'barline' });
      continue;
    }

    // Silence match (group 7 and 8)
    if (match[7]) {
      const char = match[7];
      const isDotted = !!match[8];
      const duration: Duration = char === '-' ? 'S' : 'N';
      items.push({
        type: 'note',
        pitch: 'SI', // Dummy pitch for silence (middle line)
        alteration: '',
        duration,
        octave: 4,
        isDotted,
        isSilence: true
      });
      continue;
    }

    // Note match (group 1)
    const pitch = match[2] as Pitch;
    const alteration = (match[3] || '') as Alteration;
    const duration = match[4] as Duration;
    const isDotted = !!match[5];
    const octaveStr = match[6];
    
    // Default to octave 4 (middle C) if not specified
    let octave = 4;
    if (octaveStr) {
      octave = parseInt(octaveStr, 10);
    }
    
    items.push({
      type: 'note',
      pitch,
      alteration,
      duration,
      octave,
      isDotted
    });
  }
  
  return items;
}

export function getBarLength(numerator: number, denominator: number): number {
  // Length in semicorchea units
  // 4/4 -> 16 units
  // 3/4 -> 12 units
  // 6/8 -> 12 units (6 * 2)
  return numerator * (16 / denominator);
}

export function getTimeSignatureAt(time: number, timeSignatures: { numerator: number, denominator: number, startTime: number }[]) {
  const sorted = [...timeSignatures].sort((a, b) => b.startTime - a.startTime);
  return sorted.find(ts => ts.startTime <= time) || { numerator: 4, denominator: 4, startTime: 0 };
}

export function getClefSignatureAt(time: number, clefSignatures: { clef: 'treble' | 'bass' | 'alto', startTime: number }[]) {
  const sorted = [...clefSignatures].sort((a, b) => b.startTime - a.startTime);
  return sorted.find(cs => cs.startTime <= time) || { clef: 'treble' as const, startTime: 0 };
}

export function generateTextFromNotes(notes: Note[], barlines: Barline[] = [], keySignatures: KeySignature[] = []): string {
  const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
  const sortedBarlines = [...barlines].sort((a, b) => a.startTime - b.startTime);
  
  const result: string[] = [];
  
  // We'll iterate through notes and barlines by time
  const allItems: ({ type: 'note', data: Note } | { type: 'barline', data: Barline })[] = [
    ...sortedNotes.map(n => ({ type: 'note' as const, data: n })),
    ...sortedBarlines.map(b => ({ type: 'barline' as const, data: b }))
  ].sort((a, b) => a.data.startTime - b.data.startTime);

  allItems.forEach(item => {
    if (item.type === 'barline') {
      result.push('/');
    } else {
      const n = item.data;
      let octaveSuffix = '';
      if (n.octave !== 4) octaveSuffix = n.octave.toString();
      
      const dot = n.isDotted ? '.' : '';
      
      if (n.isSilence) {
        if (n.duration === 'S') result.push(`-${dot}`);
        else if (n.duration === 'N') result.push(`_${dot}`);
        else result.push(`${n.duration}${dot}`); // Fallback for other durations if they exist
      } else {
        let altStr = n.alteration;
        if (altStr === 'n') altStr = 'n'; // Explicit natural
        result.push(`${n.pitch}${altStr}${n.duration}${dot}${octaveSuffix}`);
      }
    }
  });
  
  return result.join(' ');
}
