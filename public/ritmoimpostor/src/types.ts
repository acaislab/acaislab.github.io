export type NoteType = 
  | 'quarter' 
  | 'eighth' 
  | 'half' 
  | 'whole' 
  | 'sixteenth' 
  | 'quarter_rest'
  | 'half_rest'
  | 'whole_rest'
  | 'eighth_rest'
  | 'sixteenth_rest';

export interface RhythmNote {
  type: NoteType;
  duration: string; // Tone.js duration (e.g., '4n', '8n', '16n', '2n', '1n')
  pitch?: string; // Tone note string e.g. 'C4', 'D4', 'E4', 'F#4', 'G4', 'Ab4', 'A4', 'Bb4', 'B4', 'C5'
  accidental?: '#' | 'b';
  staffStep?: number; // 0 for C4, 1 for D4, 2 for E4 (line 1), 3 for F4, 4 for G4 (line 2), etc.
}

export interface Crewmate {
  id: number;
  color: string;
  name: string;
  isImpostor: boolean;
  visualRhythm: RhythmNote[];
  audibleRhythm: RhythmNote[];
  hasBeenInterviewed: boolean;
}

export interface GameState {
  phase: 'menu' | 'interview' | 'voting' | 'reveal' | 'leaderboard';
  nickname: string;
  level: number;
  score: number;
  crewSize: number;
  crew: Crewmate[];
  currentInterviewIndex: number;
  soundType: 'beep' | 'claves' | 'drum';
  metronomeEnabled: boolean;
  metronomeVolume: number;
  tempo: number;
  autoscrollEnabled: boolean;
}

export interface LeaderboardEntry {
  nickname: string;
  level: number;
  score: number;
}

export interface LeaderboardHistoryEntry {
  date: string; // ISO date string
  entries: LeaderboardEntry[];
}
