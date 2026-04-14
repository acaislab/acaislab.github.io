export type Pitch = 'DO' | 'RE' | 'MI' | 'FA' | 'SOL' | 'LA' | 'SI';
export type Alteration = '' | '#' | '-' | 'n';
export type Duration = 'F' | 'S' | 'C' | 'N' | 'B' | 'R';
export type Shape = 'oval' | 'rectangle';
export type ClefType = 'treble' | 'bass' | 'alto';

export interface Note {
  id: string;
  pitch: Pitch;
  alteration: Alteration;
  duration: Duration;
  octave: number; // 4 is DO4-SI4, 5 is DO5-SI5, 3 is DO3-SI3
  startTime: number; // in semicorchea units (0, 1, 2...)
  isDotted?: boolean;
  isSilence?: boolean;
  isTriplet?: boolean;
  tripletGroupId?: string;
  tripletStartTime?: number;
  dynamic?: 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'crescendo' | 'decrescendo';
  articulation?: 'staccato' | 'staccatissimo' | 'accent' | 'tenuto';
  glissandoTargetId?: string;
}

export interface Barline {
  id: string;
  startTime: number;
  type?: 'single' | 'double' | 'repeat-start' | 'repeat-end' | 'repeat-both';
  repeatCount?: number;
}

export interface TimeSignature {
  numerator: number;
  denominator: number;
  startTime: number; // in semicorchea units
}

export interface KeySignature {
  id: string;
  startTime: number;
  rootNote: string; // 'C', 'G', 'Custom', etc.
  mode: string; // 'Ionian', 'Aeolian', 'None', etc.
  accidentals: { pitchClass: number, alteration: '#' | '-' | 'n' }[]; // 0=DO, 1=RE, ..., 6=SI
}

export interface ClefSignature {
  id: string;
  startTime: number;
  clef: ClefType;
}

export interface GroupedRest {
  id: string;
  startTime: number;
  measures: number;
}

export interface Folder {
  id: string;
  name: string;
  order: number;
  isOpen?: boolean;
}

export interface TextOptions {
  fontFamily: string;
  fontSize: number;
  letterSpacing: number;
  showNoteNames: boolean;
}

export interface LayoutConfig {
  prevMeasuresPerSystem?: number; // Persistencia de configuración previa
}

export interface DynamicTransition {
  id: string;
  startNoteId: string;
  endNoteId: string;
  type: 'crescendo' | 'decrescendo';
}

export interface Score {
  id: string;
  title: string;
  notes: Note[];
  barlines: Barline[];
  phraseBarlines?: Barline[];
  shape: Shape;
  manualSystems?: number;
  measuresPerSystem?: number;
  systemMeasures?: number[];
  isBarMode?: boolean;
  timeSignatures?: TimeSignature[];
  keySignatures?: KeySignature[];
  clefSignatures?: ClefSignature[];
  isGrandStaff?: boolean;
  groupedRests?: GroupedRest[];
  folderId?: string;
  order?: number;
  systemTexts?: string[];
  textOptions?: TextOptions;
  layoutConfig?: LayoutConfig;
  tempo?: number;
  dynamicTransitions?: DynamicTransition[];
}
