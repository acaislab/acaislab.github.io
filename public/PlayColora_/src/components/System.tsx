import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Check, X, Settings } from 'lucide-react';
import { Note, Shape, Pitch, Alteration, Duration, Barline, TimeSignature, KeySignature, ClefSignature, ClefType } from '../types';
import { NoteElement } from './NoteElement';
import { SYSTEM_WIDTH, SYSTEM_HEIGHT, UNIT_WIDTH, SYSTEM_CENTER_Y, PITCH_HEIGHT, VALUE_TO_PITCH, CLEF_WIDTH, GridSubdivision, GRID_SUBDIVISIONS, PITCH_VALUES } from '../constants';
import { detectChord, getMidiNumber } from '../utils/chordDetector';
import { getBarLength, getTimeSignatureAt, getDurationValue, getClefSignatureAt } from '../utils';
import { getKeySignatureAt, getAccidentalsForMode, getAccidentalWidth, ROOT_NOTES, MODES } from '../utils/keySignatures';
import { BassClefSVG } from './BassClefSVG';

interface SystemProps {
  systemIndex: number;
  systemStartTime: number;
  systemEndTime: number;
  notes: Note[];
  allNotes?: Note[];
  barlines: Barline[];
  phraseBarlines?: Barline[];
  timeSignatures: TimeSignature[];
  isBarMode: boolean;
  hasManualBarlines: boolean;
  gridSubdivision: GridSubdivision | null;
  scoreShape: Shape;
  selectedNoteIds: string[];
  selectedBarlineIds: string[];
  onNoteClick: (id: string | string[], systemIndex: number, e: React.PointerEvent) => void;
  onNoteDragStart?: (note: Note, e: React.PointerEvent) => void;
  onBarlineClick: (id: string, systemIndex: number, e: React.PointerEvent) => void;
  onAddNote: (startTime: number, octave: number, pitch: Pitch, tripletGroupId?: string) => void;
  onAddBarline: (startTime: number) => void;
  onUpdateBarline: (id: string, updates: Partial<Barline>) => void;
  onDeleteSystem: (index: number) => void;
  onUpdateTimeSignature: (startTime: number, numerator: number, denominator: number) => void;
  onDeleteTimeSignature: (startTime: number) => void;
  onUpdateKeySignature: (startTime: number, rootNote: string, mode: string) => void;
  onDeleteKeySignature: (startTime: number) => void;
  onUpdateClefSignature: (startTime: number, clef: ClefType) => void;
  onDeleteClefSignature: (startTime: number) => void;
  onUpdateSystemMeasures: (systemIndex: number, measures: number, applyToAll: boolean) => void;
  onGroupRests: (startTime: number, measures: number) => void;
  onUngroupRests: (id: string) => void;
  currentTool: 'cursor' | 'barline';
  playingNoteIds: string[];
  keySignatures?: KeySignature[];
  clefSignatures?: ClefSignature[];
  isGrandStaff?: boolean;
  groupedRests?: { id: string, startTime: number, measures: number }[];
  emptyMeasureSequences?: { startTime: number, penultimateTime: number, measures: number }[];
  theme?: 'dark' | 'light';
  systemText?: string;
  textOptions?: { fontFamily: string; fontSize: number; letterSpacing: number; showNoteNames: boolean };
  onUpdateSystemText?: (systemIndex: number, text: string) => void;
  isExporting?: boolean;
  isExtendedStaff?: boolean;
  dynamicTransitions?: import('../types').DynamicTransition[];
}

export const System = ({ 
  systemIndex, 
  systemStartTime,
  systemEndTime,
  notes, 
  allNotes = [],
  barlines,
  phraseBarlines = [],
  timeSignatures,
  isBarMode,
  hasManualBarlines,
  gridSubdivision,
  scoreShape, 
  selectedNoteIds, 
  selectedBarlineIds,
  onNoteClick, 
  onNoteDragStart,
  onBarlineClick,
  onAddNote,
  onAddBarline,
  onUpdateBarline,
  onDeleteSystem,
  onUpdateTimeSignature,
  onDeleteTimeSignature,
  onUpdateKeySignature,
  onDeleteKeySignature,
  onUpdateClefSignature,
  onDeleteClefSignature,
  onUpdateSystemMeasures,
  onGroupRests,
  onUngroupRests,
  currentTool,
  playingNoteIds,
  keySignatures = [],
  clefSignatures = [],
  isGrandStaff = false,
  groupedRests = [],
  emptyMeasureSequences = [],
  theme = 'dark',
  systemText = '',
  textOptions = { fontFamily: 'sans-serif', fontSize: 16, letterSpacing: 0, showNoteNames: true },
  onUpdateSystemText,
  isExporting = false,
  isExtendedStaff = false,
  dynamicTransitions = []
}: SystemProps) => {
  const { t } = useTranslation();
  const systemHeight = isExtendedStaff ? (isGrandStaff ? 600 : 540) : (isGrandStaff ? 340 : 280);
  const baseCenterY = isExtendedStaff ? 240 : 140;
  const systemCenterY = isGrandStaff ? baseCenterY + 30 : baseCenterY;
  const systemMarginBottom = isGrandStaff ? -30 : 0;
  const textBottomY = systemHeight - 40;

  const [pointerDownPos, setPointerDownPos] = useState<{x: number, y: number, time: number} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMeasuresMenu, setShowMeasuresMenu] = useState(false);
  const [measuresValue, setMeasuresValue] = useState(4);
  const [showTSMenu, setShowTSMenu] = useState<{startTime: number, x: number, y: number} | null>(null);
  const [showKSMenu, setShowKSMenu] = useState<{startTime: number, x: number, y: number} | null>(null);
  const [showClefMenu, setShowClefMenu] = useState<{startTime: number, x: number, y: number} | null>(null);
  const [showBarlineMenu, setShowBarlineMenu] = useState<{startTime: number, id: string, x: number, y: number, isGhostStart?: boolean, isGhostEnd?: boolean, isSystemStart?: boolean, isSystemEnd?: boolean} | null>(null);
  const [customTS, setCustomTS] = useState({ numerator: 4, denominator: 4 });
  const [customKS, setCustomKS] = useState({ rootNote: 'Do', mode: 'Jónico (Mayor)' });
  const [hoverArea, setHoverArea] = useState<'clef' | 'notes' | 'names'>('notes');

  const measuresMenuRef = useRef<HTMLDivElement>(null);
  const measuresButtonRef = useRef<HTMLButtonElement>(null);
  const tsMenuRef = useRef<HTMLDivElement>(null);
  const ksMenuRef = useRef<HTMLDivElement>(null);
  const clefMenuRef = useRef<HTMLDivElement>(null);
  const barlineMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMeasuresMenu && measuresMenuRef.current && !measuresMenuRef.current.contains(event.target as Node) && measuresButtonRef.current && !measuresButtonRef.current.contains(event.target as Node)) {
        setShowMeasuresMenu(false);
      }
      if (showTSMenu && tsMenuRef.current && !tsMenuRef.current.contains(event.target as Node)) {
        setShowTSMenu(null);
      }
      if (showKSMenu && ksMenuRef.current && !ksMenuRef.current.contains(event.target as Node)) {
        setShowKSMenu(null);
      }
      if (showClefMenu && clefMenuRef.current && !clefMenuRef.current.contains(event.target as Node)) {
        setShowClefMenu(null);
      }
      if (showBarlineMenu && barlineMenuRef.current && !barlineMenuRef.current.contains(event.target as Node)) {
        setShowBarlineMenu(null);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [showMeasuresMenu, showTSMenu, showKSMenu, showClefMenu, showBarlineMenu]);

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < CLEF_WIDTH) {
      setHoverArea('clef');
    } else if (y > (isExtendedStaff ? 540 : 280) - 60) {
      setHoverArea('names');
    } else {
      setHoverArea('notes');
    }
  };

  const systemUnits = systemEndTime - systemStartTime;

  const TS_GAP = 2 * UNIT_WIDTH; // 32px
  const getVisualX = (timeInSystem: number, isBarline = false) => {
    const absoluteTime = systemStartTime + timeInSystem;
    
    // 1. Internal Time Signatures (after start)
    const tsCount = timeSignatures.filter(ts => 
      ts.startTime > systemStartTime && 
      (isBarline ? ts.startTime < absoluteTime : ts.startTime <= absoluteTime)
    ).length;

    // 2. Internal Key Signatures (after start)
    let internalKSWidth = 0;
    const internalKS = keySignatures.filter(ks => 
      ks.startTime > systemStartTime && 
      (isBarline ? ks.startTime < absoluteTime : ks.startTime <= absoluteTime)
    );
    internalKS.forEach(ks => {
      internalKSWidth += getAccidentalWidth(ks.accidentals.length) + (ks.accidentals.length > 0 ? 10 : 0);
    });

    // 2.5 Internal Clef Signatures (after start)
    let internalCSWidth = 0;
    const internalCS = clefSignatures.filter(cs => 
      cs.startTime > systemStartTime && 
      (isBarline ? cs.startTime < absoluteTime : cs.startTime <= absoluteTime)
    );
    internalCS.forEach(cs => {
      internalCSWidth += 60; // Space for the new clef
    });

    // 2.7 Internal Repeat Barlines
    let internalRepeatWidth = 0;
    barlines.forEach(b => {
      if (b.startTime >= systemStartTime && b.startTime <= absoluteTime) {
        const isRepeatEnd = b.type === 'repeat-end' || b.type === 'repeat-both';
        const isRepeatStart = b.type === 'repeat-start' || b.type === 'repeat-both';
        
        if (isRepeatEnd && b.startTime > systemStartTime) {
          if (b.startTime <= absoluteTime) {
            internalRepeatWidth += 13;
          }
        }
        
        if (isRepeatStart) {
          if (isBarline ? b.startTime < absoluteTime : b.startTime <= absoluteTime) {
            internalRepeatWidth += 13;
          }
        }
      }
    });

    // 3. Start of System Signatures (Ruling)
    const rulingKS = getKeySignatureAt(systemStartTime, keySignatures);
    const startKSWidth = getAccidentalWidth(rulingKS.accidentals.length) + (rulingKS.accidentals.length > 0 ? 10 : 0);
    
    const startTSWidth = 22; 

    // 4. Grouped Rests (Skipped Time)
    let skippedTime = 0;
    groupedRests.forEach(gr => {
      if (gr.startTime >= systemStartTime && gr.startTime < systemEndTime) {
        let grDuration = 0;
        let tempTime = gr.startTime;
        for (let i = 0; i < gr.measures; i++) {
          const ts = getTimeSignatureAt(tempTime, timeSignatures);
          const barLength = getBarLength(ts.numerator, ts.denominator);
          grDuration += barLength;
          tempTime += barLength;
        }
        
        if (absoluteTime >= gr.startTime + grDuration) {
          // We are after the grouped rest, subtract all but 1 measure
          const ts = getTimeSignatureAt(gr.startTime, timeSignatures);
          const firstBarLength = getBarLength(ts.numerator, ts.denominator);
          skippedTime += (grDuration - firstBarLength);
        } else if (absoluteTime > gr.startTime) {
          // We are inside the grouped rest
          // Map to a single measure width
          const ts = getTimeSignatureAt(gr.startTime, timeSignatures);
          const firstBarLength = getBarLength(ts.numerator, ts.denominator);
          const progress = (absoluteTime - gr.startTime) / grDuration;
          const visualTimeInside = progress * firstBarLength;
          skippedTime += (absoluteTime - gr.startTime) - visualTimeInside;
        }
      }
    });

    const visualTimeInSystem = timeInSystem - skippedTime;

    // 5. Final Calculation
    // Note at time 0 should be at CLEF_WIDTH - 5 + startTSWidth + startKSWidth
    return CLEF_WIDTH - 5 + startTSWidth + startKSWidth + 
           visualTimeInSystem * UNIT_WIDTH + 
           tsCount * TS_GAP + 
           internalKSWidth +
           internalCSWidth +
           internalRepeatWidth;
  };


  const getTimeFromVisualX = (x: number): { time: number, tripletGroupId?: string } => {
    let bestTime = 0;
    let minDiff = Infinity;
    let bestGroupId: string | undefined = undefined;
    
    // Check standard grid
    for (let t = 0; t <= systemUnits; t++) {
      const vx = getVisualX(t);
      const diff = Math.abs(x - vx);
      if (diff < minDiff) {
        minDiff = diff;
        bestTime = t;
        bestGroupId = undefined;
      }
    }
    
    // Check missing triplet slots
    const systemNotes = notes.filter(n => n.startTime >= systemStartTime && n.startTime < systemEndTime);
    const tripletGroups = new Set(systemNotes.filter(n => n.isTriplet && n.tripletGroupId).map(n => n.tripletGroupId!));
    
    // Also check all notes in the system to see if we are inside a triplet's range
    tripletGroups.forEach(groupId => {
      const groupNotes = notes.filter(n => n.tripletGroupId === groupId).sort((a, b) => a.startTime - b.startTime);
      if (groupNotes.length > 0) {
        const firstNote = groupNotes[0];
        const D = getDurationValue(firstNote.duration, firstNote.isDotted);
        const tStart = firstNote.tripletStartTime ?? firstNote.startTime;
        const tEnd = tStart + D * 2; // Triplets take the space of 2 normal notes of same duration
        
        const slots = [tStart, tStart + D * 2/3, tStart + D * 4/3];
        
        // If we are within the triplet's range, prefer snapping to its slots
        const tStartVX = getVisualX(tStart - systemStartTime);
        const tEndVX = getVisualX(tEnd - systemStartTime);
        
        if (x >= tStartVX - 10 && x <= tEndVX + 10) {
          slots.forEach(slotTime => {
            const slotTimeInSystem = slotTime - systemStartTime;
            if (slotTimeInSystem >= 0 && slotTimeInSystem <= systemUnits) {
              const vx = getVisualX(slotTimeInSystem);
              const diff = Math.abs(x - vx);
              if (diff < minDiff) {
                minDiff = diff;
                bestTime = slotTimeInSystem;
                bestGroupId = groupId;
              }
            }
          });
        }
      }
    });
    
    return { time: bestTime, tripletGroupId: bestGroupId };
  };

  const dynamicSystemWidth = getVisualX(systemUnits);

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const { time: startTimeInSystem } = getTimeFromVisualX(x);
    const startTime = systemStartTime + startTimeInSystem;

    if (!(e.target as HTMLElement).classList.contains('system-bg')) {
      return;
    }
    setPointerDownPos({ x: e.clientX, y: e.clientY, time: startTime });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerDownPos) return;
    const dx = Math.abs(e.clientX - pointerDownPos.x);
    const dy = Math.abs(e.clientY - pointerDownPos.y);
    
    // If it was a drag on a barline to change time signature
    if (dx > 20 && currentTool === 'barline') {
      // Logic for metric change on drag could go here if we had a specific barline ref
    }

    setPointerDownPos(null);
    
    if (dx > 5 || dy > 5) return; // It was a drag

    if (!(e.target as HTMLElement).classList.contains('system-bg')) {
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // If clicking in the clef area (left margin) or the bottom text area, deselect all and return
    if (x < CLEF_WIDTH || y > (isExtendedStaff ? 540 : 280) - 60) {
      onNoteClick('', systemIndex, { shiftKey: false } as React.PointerEvent);
      return;
    }

    const { time: startTimeInSystem, tripletGroupId } = getTimeFromVisualX(x);
    const startTime = systemStartTime + startTimeInSystem;
    
    if (currentTool === 'cursor') {
      const activeClef = getClefSignatureAt(startTime, clefSignatures).clef;
      
      let visualPitch = Math.round((systemCenterY - y) / PITCH_HEIGHT) - (isGrandStaff ? 7 : 1);
      
      let clefAdjustment = 0;
      if (!isGrandStaff) {
        if (activeClef === 'bass') clefAdjustment = 12;
        else if (activeClef === 'alto') clefAdjustment = 6;
      }
      
      const absolutePitchBase = visualPitch - clefAdjustment;
      
      let octave = Math.floor(absolutePitchBase / 7) + 5;
      let pitchValue = absolutePitchBase % 7;
      if (pitchValue < 0) pitchValue += 7;
      
      // Clamp octave to prevent notes from going off-screen (adjust limits for grand staff)
      const minOctave = 0;
      const maxOctave = 8;
      octave = Math.max(minOctave, Math.min(maxOctave, octave));
      
      onAddNote(startTime, octave, VALUE_TO_PITCH[pitchValue], tripletGroupId);
    } else if (currentTool === 'barline' && !isBarMode) {
      onAddBarline(startTime);
    }
  };

  // Calculate automatic barlines
  const autoBarlinesSet = new Set<number>();
  let currentTime = 0;
  const maxTime = systemEndTime;
  let safetyCounter = 0;
  
  while (currentTime < maxTime && safetyCounter < 2000) {
    safetyCounter++;
    // Check if current time is inside a grouped rest
    const activeGroupedRest = groupedRests.find(gr => {
      let grDuration = 0;
      let tempTime = gr.startTime;
      for (let i = 0; i < gr.measures; i++) {
        const ts = getTimeSignatureAt(tempTime, timeSignatures);
        const barLength = getBarLength(ts.numerator, ts.denominator);
        grDuration += barLength;
        tempTime += barLength;
      }
      return currentTime >= gr.startTime && currentTime < gr.startTime + grDuration;
    });

    if (activeGroupedRest) {
      let grDuration = 0;
      let tempTime = activeGroupedRest.startTime;
      for (let i = 0; i < activeGroupedRest.measures; i++) {
        const ts = getTimeSignatureAt(tempTime, timeSignatures);
        const barLength = getBarLength(ts.numerator, ts.denominator);
        grDuration += barLength;
        tempTime += barLength;
      }
      currentTime = activeGroupedRest.startTime + grDuration;
      if (currentTime > systemStartTime && currentTime < maxTime) {
        autoBarlinesSet.add(currentTime);
      }
      continue;
    }

    const ts = getTimeSignatureAt(currentTime, timeSignatures);
    const barLen = Math.max(1, getBarLength(ts.numerator, ts.denominator)); // Ensure progress
    
    // Find if there's a time signature change before the next expected barline
    const sortedTs = [...timeSignatures].sort((a, b) => a.startTime - b.startTime);
    const nextTs = sortedTs.find(t => t.startTime > currentTime && t.startTime <= currentTime + barLen);
    
    if (nextTs && nextTs.startTime < currentTime + barLen) {
      currentTime = nextTs.startTime;
    } else {
      currentTime += barLen;
    }
    
    if (currentTime > systemStartTime && currentTime < maxTime) {
      autoBarlinesSet.add(currentTime);
    }
  }

  const autoBarlines = Array.from(autoBarlinesSet);

  const renderTimeSignature = (ts: TimeSignature) => {
    // Check if inside a grouped rest
    const isInsideGroupedRest = groupedRests.some(gr => {
      let grDuration = 0;
      let tempTime = gr.startTime;
      for (let i = 0; i < gr.measures; i++) {
        const tsAt = getTimeSignatureAt(tempTime, timeSignatures);
        const barLength = getBarLength(tsAt.numerator, tsAt.denominator);
        grDuration += barLength;
        tempTime += barLength;
      }
      return ts.startTime > gr.startTime && ts.startTime < gr.startTime + grDuration;
    });
    if (isInsideGroupedRest) return null;

    const timeInSystem = ts.startTime - systemStartTime;
    const isAtStart = ts.startTime === systemStartTime;
    const x = getVisualX(timeInSystem, true);
    
    const rulingKS = getKeySignatureAt(systemStartTime, keySignatures);
    const startKSWidth = getAccidentalWidth(rulingKS.accidentals.length) + (rulingKS.accidentals.length > 0 ? 10 : 0);
    
    let displayX = isAtStart ? CLEF_WIDTH - 5 + startKSWidth : x + 10;
    if (!isAtStart) {
      const hasClef = clefSignatures.some(cs => cs.startTime === ts.startTime);
      const hasKS = keySignatures.some(ks => ks.startTime === ts.startTime);
      if (hasClef) displayX += 60;
      if (hasKS) {
        const ksAt = keySignatures.find(ks => ks.startTime === ts.startTime)!;
        displayX += getAccidentalWidth(ksAt.accidentals.length) + (ksAt.accidentals.length > 0 ? 10 : 0);
      }
    }

    const renderTSContent = () => {
      const tsStyle = {
        fontSize: '28px',
        fontFamily: 'serif',
        fontWeight: 'bold'
      };
      
      if (isGrandStaff) {
        return (
          <>
            <div className="absolute flex flex-col items-center justify-center w-full" style={{ top: -30, ...tsStyle }}>
              <span className="h-6 flex items-center justify-center leading-none">{ts.numerator}</span>
              <span className="h-6 flex items-center justify-center leading-none">{ts.denominator}</span>
            </div>
            <div className="absolute flex flex-col items-center justify-center w-full" style={{ top: 30, ...tsStyle }}>
              <span className="h-6 flex items-center justify-center leading-none">{ts.numerator}</span>
              <span className="h-6 flex items-center justify-center leading-none">{ts.denominator}</span>
            </div>
          </>
        );
      }
      return (
        <div className="flex flex-col items-center justify-center" style={tsStyle}>
          <span className="h-6 flex items-center justify-center leading-none">{ts.numerator}</span>
          <span className="h-6 flex items-center justify-center leading-none">{ts.denominator}</span>
        </div>
      );
    };

    if (ts.startTime < systemStartTime || ts.startTime >= systemEndTime) {
      // Only show at start of system if it's the active one
      if (ts.startTime < systemStartTime && getTimeSignatureAt(systemStartTime, timeSignatures).startTime === ts.startTime) {
        // Show at start of system if it's the ruling TS
        displayX = CLEF_WIDTH - 5 + startKSWidth;
      } else {
        return null;
      }
    }

    return (
      <button 
        key={`ts-${ts.startTime}`}
        className={`absolute z-30 flex flex-col items-center justify-center font-bold transition-colors ${isBarMode ? (theme === 'light' ? 'text-slate-800 hover:text-black cursor-pointer pointer-events-auto' : 'text-slate-200 hover:text-white cursor-pointer pointer-events-auto') : (theme === 'light' ? 'text-slate-800 cursor-default pointer-events-none' : 'text-slate-400 cursor-default pointer-events-none')}`}
        style={{ left: displayX, top: systemCenterY - 24, fontSize: '20px', lineHeight: '0.8', width: 20 }}
        onPointerDown={(e) => {
          if (!isBarMode) return;
          e.stopPropagation();
          setShowTSMenu({ startTime: ts.startTime, x: displayX, y: systemCenterY - 24 });
        }}
      >
        {renderTSContent()}
      </button>
    );
  };

  const renderClefSignature = (cs: ClefSignature) => {
    const isInsideGroupedRest = groupedRests.some(gr => {
      let grDuration = 0;
      let tempTime = gr.startTime;
      for (let i = 0; i < gr.measures; i++) {
        const tsAt = getTimeSignatureAt(tempTime, timeSignatures);
        const barLength = getBarLength(tsAt.numerator, tsAt.denominator);
        grDuration += barLength;
        tempTime += barLength;
      }
      return cs.startTime > gr.startTime && cs.startTime < gr.startTime + grDuration;
    });
    if (isInsideGroupedRest) return null;

    const timeInSystem = cs.startTime - systemStartTime;
    const isAtStart = cs.startTime === systemStartTime;
    
    let baseX = getVisualX(timeInSystem, true);
    
    if (isAtStart) {
      baseX = -CLEF_WIDTH; // Default clef position
    } else {
      baseX = baseX - 45; // Shifted 23px left from previous -22
    }

    if (cs.startTime < systemStartTime || cs.startTime >= systemEndTime) {
      if (cs.startTime < systemStartTime && getClefSignatureAt(systemStartTime, clefSignatures).startTime === cs.startTime) {
        baseX = -CLEF_WIDTH;
      } else {
        return null;
      }
    }

    if (isGrandStaff) {
      return (
        <React.Fragment key={`cs-${cs.startTime}`}>
          <div 
            className={`absolute z-40 flex items-center justify-center transition-colors group ${isBarMode ? (theme === 'light' ? 'text-slate-800' : 'text-slate-200') : (theme === 'light' ? 'text-slate-800' : 'text-slate-400')} pointer-events-none`}
            style={{ left: baseX + 23, top: systemCenterY - 131, fontSize: '100px', fontFamily: 'serif', width: 100, fontWeight: 300 }}
          >
            <div 
              className={`absolute w-[25px] h-full left-1/2 -translate-x-1/2 ${isBarMode ? 'cursor-pointer pointer-events-auto' : ''}`}
              onPointerDown={(e) => {
                if (!isBarMode) return;
                e.stopPropagation();
                setShowClefMenu({ startTime: cs.startTime, x: baseX + 7, y: systemCenterY - 100 });
              }}
            />
            <span className={`transition-colors ${theme === 'light' ? 'group-hover:text-black' : 'group-hover:text-white'}`}>𝄞</span>
          </div>
          <div 
            className={`absolute z-40 flex items-center justify-center transition-colors group ${isBarMode ? (theme === 'light' ? 'text-slate-800' : 'text-slate-200') : (theme === 'light' ? 'text-slate-800' : 'text-slate-400')} pointer-events-none`}
            style={{ left: baseX + 48, top: systemCenterY + 16, width: 48, height: 64 }}
          >
            <div 
              className={`absolute w-[25px] h-full left-1/2 -translate-x-1/2 ${isBarMode ? 'cursor-pointer pointer-events-auto' : ''}`}
              onPointerDown={(e) => {
                if (!isBarMode) return;
                e.stopPropagation();
                setShowClefMenu({ startTime: cs.startTime, x: baseX + 32, y: systemCenterY + 40 });
              }}
            />
            <div className={`transition-colors ${theme === 'light' ? 'group-hover:text-black' : 'group-hover:text-white'} w-full h-full flex items-center justify-center`}>
              <BassClefSVG />
            </div>
          </div>
        </React.Fragment>
      );
    }

    let clefSymbol: React.ReactNode = '𝄞';
    let clefStyle: React.CSSProperties = { top: systemCenterY - 80, fontSize: '100px', fontFamily: 'serif', width: 100, fontWeight: 300 };
    let currentBaseX = baseX + 23; // Treble offset (23px right)
    
    if (cs.clef === 'bass') {
      clefSymbol = <BassClefSVG />;
      clefStyle = { top: systemCenterY - 32, width: 48, height: 64 };
      currentBaseX = baseX + 48; // Bass offset (48px right)
    } else if (cs.clef === 'alto') {
      clefSymbol = '𝄡';
      clefStyle = { top: systemCenterY - 57, fontSize: '80px', fontFamily: 'serif', width: 80, fontWeight: 300 }; // Alto offset (3px down)
      currentBaseX = baseX + 32; // Alto offset (32px right)
    }

    return (
      <div 
        key={`cs-${cs.startTime}`}
        className={`absolute z-40 flex items-center justify-center transition-colors group ${isBarMode ? (theme === 'light' ? 'text-slate-800' : 'text-slate-200') : (theme === 'light' ? 'text-slate-800' : 'text-slate-400')} pointer-events-none`}
        style={{ left: currentBaseX, ...clefStyle }}
      >
        <div 
          className={`absolute w-[25px] h-full left-1/2 -translate-x-1/2 ${isBarMode ? 'cursor-pointer pointer-events-auto' : ''}`}
          onPointerDown={(e) => {
            if (!isBarMode) return;
            e.stopPropagation();
            setShowClefMenu({ startTime: cs.startTime, x: currentBaseX, y: systemCenterY - 40 });
          }}
        />
        <div className={`transition-colors ${theme === 'light' ? 'group-hover:text-black' : 'group-hover:text-white'} w-full h-full flex items-center justify-center`}>
          {clefSymbol}
        </div>
      </div>
    );
  };

  const renderKeySignature = (ks: KeySignature) => {
    // Check if inside a grouped rest
    const isInsideGroupedRest = groupedRests.some(gr => {
      let grDuration = 0;
      let tempTime = gr.startTime;
      for (let i = 0; i < gr.measures; i++) {
        const tsAt = getTimeSignatureAt(tempTime, timeSignatures);
        const barLength = getBarLength(tsAt.numerator, tsAt.denominator);
        grDuration += barLength;
        tempTime += barLength;
      }
      return ks.startTime > gr.startTime && ks.startTime < gr.startTime + grDuration;
    });
    if (isInsideGroupedRest) return null;

    const timeInSystem = ks.startTime - systemStartTime;
    const isAtStart = ks.startTime === systemStartTime;
    
    const activeClef = getClefSignatureAt(ks.startTime, clefSignatures).clef;
    
    let baseX = getVisualX(timeInSystem, true);
    
    if (isAtStart) {
      baseX = CLEF_WIDTH - 5;
      if (ks.accidentals.length === 0) {
        baseX -= 20; // Shift left to avoid overlapping TS
      }
    } else {
      const hasClef = clefSignatures.some(cs => cs.startTime === ks.startTime);
      let offset = 5;
      if (hasClef) offset += 60;
      baseX = baseX + offset;
    }

    if (ks.startTime < systemStartTime || ks.startTime >= systemEndTime) {
      if (ks.startTime < systemStartTime && getKeySignatureAt(systemStartTime, keySignatures).startTime === ks.startTime) {
        baseX = CLEF_WIDTH - 5;
        if (ks.accidentals.length === 0) {
          baseX -= 20;
        }
      } else {
        return null;
      }
    }

    const width = Math.max(20, getAccidentalWidth(ks.accidentals.length));

    return (
      <button 
        key={`ks-${ks.startTime}`}
        className={`absolute z-30 flex items-center justify-start transition-colors ${isBarMode ? 'hover:bg-slate-700/50 cursor-pointer rounded pointer-events-auto' : 'cursor-default pointer-events-none'}`}
        style={{ left: baseX, top: isGrandStaff ? systemCenterY - 100 : systemCenterY - 40, height: isGrandStaff ? 200 : 80, width: width + 10 }}
        onPointerDown={(e) => {
          if (!isBarMode) return;
          e.stopPropagation();
          setShowKSMenu({ startTime: ks.startTime, x: baseX, y: systemCenterY - 16 });
        }}
      >
        {ks.accidentals.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 text-slate-400 text-xs">
            {isBarMode ? '+' : ''}
          </div>
        ) : (
          <div className="relative w-full h-full">
            {ks.accidentals.map((acc, i) => {
              // Offsets in terms of PITCH_HEIGHT from systemCenterY (for normal treble staff)
              const sharpY: Record<number, number> = {
                3: -4, // F5
                0: -1, // C5
                4: -5, // G5
                1: -2, // D5
                5: 1,  // A4
                2: -3, // E5
                6: 0   // B4
              };
              const flatY: Record<number, number> = {
                6: 0,  // B4
                2: -3, // E5
                5: 1,  // A4
                1: -2, // D5
                4: 2,  // G4 (second line)
                0: -1, // C5
                3: 3   // F4 (first space)
              };
              
              let yOffset = acc.alteration === '#' ? sharpY[acc.pitchClass] : flatY[acc.pitchClass];
              
              // Adjust yOffset based on clef
              if (activeClef === 'bass') {
                yOffset += 2; // Shift up by 2 steps for bass clef
              } else if (activeClef === 'alto') {
                yOffset += 1; // Shift up by 1 step for alto clef
              }
              
              if (isGrandStaff) {
                const trebleY = systemCenterY - 6 * PITCH_HEIGHT + (yOffset * PITCH_HEIGHT);
                const bassY = systemCenterY + 8 * PITCH_HEIGHT + (yOffset * PITCH_HEIGHT);
                
                return (
                  <React.Fragment key={i}>
                    <div 
                      className={`absolute font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}
                      style={{ left: i * 10, top: trebleY - (systemCenterY - 100) - 10, fontSize: '24px', lineHeight: '20px' }}
                    >
                      {acc.alteration === '#' ? '♯' : '♭'}
                    </div>
                    <div 
                      className={`absolute font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}
                      style={{ left: i * 10, top: bassY - (systemCenterY - 100) - 10, fontSize: '24px', lineHeight: '20px' }}
                    >
                      {acc.alteration === '#' ? '♯' : '♭'}
                    </div>
                  </React.Fragment>
                );
              }

              const y = systemCenterY + (yOffset * PITCH_HEIGHT);

              return (
                <div 
                  key={i} 
                  className={`absolute font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}
                  style={{ left: i * 10, top: y - (systemCenterY - 40) - 10, fontSize: '24px', lineHeight: '20px' }}
                >
                  {acc.alteration === '#' ? '♯' : '♭'}
                </div>
              );
            })}
          </div>
        )}
      </button>
    );
  };

  let cursorClass = 'cursor-default';
  if (isBarMode) {
    cursorClass = 'cursor-default';
  } else if (currentTool === 'cursor') {
    if (hoverArea === 'clef') cursorClass = 'cursor-not-allowed';
    else if (hoverArea === 'names') cursorClass = 'cursor-default';
    else cursorClass = 'cursor-crosshair';
  } else if (currentTool === 'barline') {
    cursorClass = 'cursor-col-resize';
  }

  return (
    <div 
      id={`system-${systemIndex}`}
      className={`relative ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-slate-800'} rounded-xl border shrink-0 shadow-lg transition-opacity duration-300 opacity-100 system-container pointer-events-none`}
      style={{ width: dynamicSystemWidth, height: systemHeight, marginBottom: systemMarginBottom }}
      data-system-index={systemIndex}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      {/* Background click target */}
      <div className={`absolute inset-0 system-bg ${cursorClass} z-0 pointer-events-auto`} />
      
      {/* Grid Subdivisions */}
      {gridSubdivision && Array.from({ length: Math.ceil(systemUnits / GRID_SUBDIVISIONS[gridSubdivision]) }).map((_, i) => {
        const timeInSystem = i * GRID_SUBDIVISIONS[gridSubdivision];
        if (timeInSystem > systemUnits) return null;
        const x = getVisualX(timeInSystem, false);
        return (
          <div 
            key={`grid-${i}`}
            className={`absolute top-0 bottom-0 border-l ${theme === 'light' ? 'border-slate-300' : 'border-slate-700/30'} pointer-events-none`}
            style={{ left: x }}
          />
        );
      })}

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 pointer-events-none">

      {/* Clef Signatures */}
      {clefSignatures.map(renderClefSignature)}

      {/* Time Signatures */}
      {timeSignatures.map(renderTimeSignature)}
      
      {/* Key Signatures */}
      {keySignatures.map(renderKeySignature)}
      
      {/* 5 lines of the staff */}
      {isGrandStaff ? (
        <>
          {/* Treble staff */}
          {[-5, -3, -1, 1, 3].map(pitch => {
            const y = systemCenterY - (pitch + 7) * PITCH_HEIGHT;
            return (
              <div 
                key={`treble-${pitch}`}
                className={`absolute right-0 border-t ${theme === 'light' ? 'border-slate-800' : 'border-slate-600/80'} pointer-events-none`}
                style={{ top: y, left: 0 }}
              />
            );
          })}
          {/* Bass staff */}
          {[-17, -15, -13, -11, -9].map(pitch => {
            const y = systemCenterY - (pitch + 7) * PITCH_HEIGHT;
            return (
              <div 
                key={`bass-${pitch}`}
                className={`absolute right-0 border-t ${theme === 'light' ? 'border-slate-800' : 'border-slate-600/80'} pointer-events-none`}
                style={{ top: y, left: 0 }}
              />
            );
          })}
          {/* Brace */}
          <div 
            className={`absolute ${theme === 'light' ? 'text-slate-800' : 'text-slate-400'} pointer-events-none select-none flex items-center justify-center z-40`} 
            style={{ left: -CLEF_WIDTH + 15, top: systemCenterY - 97, width: 30, height: 160 }}
          >
            <span style={{ fontSize: '150px', fontFamily: 'serif', fontWeight: 300, transform: 'scaleY(1.15) scaleX(0.6)' }}>{'{'}</span>
          </div>
          {/* Connecting line at the start */}
          {isBarMode && (
            <div 
              className={`absolute left-0 ${theme === 'light' ? 'bg-slate-400/50' : 'bg-slate-500/50'} pointer-events-none`}
              style={{ top: systemCenterY - 10 * PITCH_HEIGHT, width: 2, height: 20 * PITCH_HEIGHT }}
            />
          )}
        </>
      ) : (
        [-5, -3, -1, 1, 3].map(pitch => {
          const y = systemCenterY - (pitch + 1) * PITCH_HEIGHT;
          return (
            <div 
              key={pitch}
              className={`absolute right-0 border-t ${theme === 'light' ? 'border-slate-800' : 'border-slate-600/80'} pointer-events-none`}
              style={{ top: y, left: 0 }}
            />
          );
        })
      )}
      
      {/* Barlines */}
      {(() => {
        const hideAutoBarlines = (!isBarMode && currentTool === 'barline') || (!isBarMode && hasManualBarlines);
        
        const barlinesToRender = (hideAutoBarlines ? 
          [
            ...phraseBarlines, 
            ...barlines,
            ...emptyMeasureSequences
              .filter(seq => !barlines.some(b => Math.abs(b.startTime - seq.penultimateTime) < 0.001) && !phraseBarlines.some(b => Math.abs(b.startTime - seq.penultimateTime) < 0.001))
              .map(seq => ({ id: `group-${seq.penultimateTime}`, startTime: seq.penultimateTime } as Barline))
          ] :
          [
            ...autoBarlines.map(t => {
              const manualBarline = barlines.find(b => b.startTime === t);
              return manualBarline ? manualBarline : { id: `auto-${t}`, startTime: t } as Barline;
            }),
            ...barlines.filter(b => !autoBarlines.includes(b.startTime)),
            ...timeSignatures
              .filter(ts => ts.startTime > 0 && ts.startTime >= systemStartTime && ts.startTime < systemEndTime)
              .filter(ts => !barlines.some(b => b.startTime === ts.startTime) && !autoBarlines.includes(ts.startTime))
              .map(ts => {
                const manualBarline = barlines.find(b => b.startTime === ts.startTime);
                return manualBarline ? manualBarline : { id: `ts-${ts.startTime}`, startTime: ts.startTime } as Barline;
              })
          ]).filter(b => {
            if (b.startTime < systemStartTime || b.startTime > systemEndTime) return false;
            
            if (Math.abs(b.startTime - systemStartTime) < 0.001 && systemIndex > 0) {
              if (b.type === 'repeat-end' || b.type === 'single' || b.type === 'double' || !b.type) return false;
            }
            
            if (Math.abs(b.startTime - systemEndTime) < 0.001) {
              if (b.type === 'repeat-start') return false;
            }
            
            return true;
          }).map(b => {
            if (b.type === 'repeat-both') {
              if (Math.abs(b.startTime - systemEndTime) < 0.001) {
                return { ...b, type: 'repeat-end' };
              } else if (Math.abs(b.startTime - systemStartTime) < 0.001 && systemIndex > 0) {
                return { ...b, type: 'repeat-start' };
              }
            }
            return b;
          }) as Barline[];

        if (isBarMode) {
          const hasStartBarline = barlinesToRender.some(b => Math.abs(b.startTime - systemStartTime) < 0.001);
          if (!hasStartBarline) {
            barlinesToRender.push({ id: `auto-${systemStartTime}-ghost-start`, startTime: systemStartTime, type: 'single' } as Barline);
          }
          
          const hasEndBarline = barlinesToRender.some(b => Math.abs(b.startTime - systemEndTime) < 0.001);
          if (!hasEndBarline) {
            barlinesToRender.push({ id: `auto-${systemEndTime}-ghost-end`, startTime: systemEndTime, type: 'single' } as Barline);
          }
        }

        return (
          <>
            {barlinesToRender.filter(barline => {
              return !groupedRests.some(gr => {
                let grDuration = 0;
                let tempTime = gr.startTime;
                for (let i = 0; i < gr.measures; i++) {
                  const ts = getTimeSignatureAt(tempTime, timeSignatures);
                  const barLength = getBarLength(ts.numerator, ts.denominator);
                  grDuration += barLength;
                  tempTime += barLength;
                }
                // Strictly inside the grouped rest
                return barline.startTime > gr.startTime && barline.startTime < gr.startTime + grDuration;
              });
            }).map(barline => {
          const timeInSystem = barline.startTime - systemStartTime;
          const x = getVisualX(timeInSystem, true);
          const isSelected = isBarMode && selectedBarlineIds.includes(barline.id);
          const isAuto = barline.id.toString().startsWith('auto-');
          const isGhostStart = barline.id.toString().includes('-ghost-start');
          const isGhostEnd = barline.id.toString().includes('-ghost-end');
          const isGhost = isGhostStart || isGhostEnd;
          
          const ts = timeSignatures.find(t => t.startTime === barline.startTime);
          const isSpecial = !isBarMode && ts && ts.startTime > 0;
          
          let bgColor = isSelected ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]' : isAuto ? (theme === 'light' ? 'bg-slate-400/50' : 'bg-slate-500/50') : (theme === 'light' ? 'bg-slate-800 hover:bg-black' : 'bg-slate-400 hover:bg-slate-300');
          
          if (isGhost) {
            bgColor = theme === 'light' 
              ? 'bg-slate-400/40 hover:bg-slate-500/60 border-l border-dashed border-slate-500/50' 
              : 'bg-slate-500/30 hover:bg-slate-400/60 border-l border-dashed border-slate-400/50';
          }
          
          if (isSpecial && !isGhost) {
            switch (ts.denominator) {
              case 2: bgColor = 'bg-red-500'; break;
              case 4: bgColor = 'bg-blue-500'; break;
              case 8: bgColor = 'bg-green-500'; break;
              case 16: bgColor = 'bg-yellow-500'; break;
              default: bgColor = 'bg-purple-500'; break;
            }
            if (isSelected) {
              bgColor += ' shadow-[0_0_10px_rgba(255,255,255,0.8)]';
            }
          }

          const groupSeq = emptyMeasureSequences.find(seq => Math.abs(seq.penultimateTime - barline.startTime) < 0.001);
          if (groupSeq) {
            bgColor = 'bg-purple-500';
          }
          
          const isRepeatStart = barline.type === 'repeat-start' || barline.type === 'repeat-both';
          const isRepeatEnd = barline.type === 'repeat-end' || barline.type === 'repeat-both';
          const isDouble = barline.type === 'double';
          
          return (
            <div 
              key={`${barline.id}-${barline.startTime}`}
              className={`absolute ${isBarMode || currentTool === 'barline' || groupSeq ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'} z-20 transition-colors barline-element ${bgColor} ${groupSeq ? 'group w-[6px] hover:w-[8px] -ml-[2px] hover:-ml-[3px]' : isGhost ? 'w-[6px] -ml-[3px]' : 'w-[2px]'}`}
              style={{ 
                left: x - 1, 
                top: isGrandStaff ? systemCenterY - 10 * PITCH_HEIGHT : systemCenterY - 4 * PITCH_HEIGHT, 
                height: isGrandStaff ? 20 * PITCH_HEIGHT : 8 * PITCH_HEIGHT 
              }}
              onPointerDown={(e) => {
                if (groupSeq) {
                  e.stopPropagation();
                  onGroupRests(groupSeq.startTime, groupSeq.measures);
                  return;
                }
                if (isBarMode) {
                  e.stopPropagation();
                  setShowBarlineMenu({ 
                    startTime: barline.startTime, 
                    id: barline.id, 
                    x, 
                    y: isGrandStaff ? systemCenterY - 10 * PITCH_HEIGHT : systemCenterY - 4 * PITCH_HEIGHT,
                    isGhostStart,
                    isGhostEnd,
                    isSystemStart: Math.abs(barline.startTime - systemStartTime) < 0.001,
                    isSystemEnd: Math.abs(barline.startTime - systemEndTime) < 0.001
                  });
                } else {
                  onBarlineClick(barline.id, systemIndex, e);
                  e.stopPropagation();
                }
              }}
              data-barline-id={barline.id}
              title={barline.type === 'repeat-end' || barline.type === 'repeat-both' ? t('repeats_count', { count: barline.repeatCount === 999 ? '∞' : (barline.repeatCount || 2) }) : undefined}
            >
              {groupSeq && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-2 py-1 rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Agrupar compases en silencio
                </div>
              )}
              {isSpecial && !groupSeq && ts.numerator > 1 && Array.from({ length: ts.numerator - 1 }).map((_, i) => (
                <div 
                  key={i}
                  className="absolute w-[4px] h-[4px] bg-black rounded-full left-1/2"
                  style={{ top: `${((i + 1) / ts.numerator) * 100}%`, transform: 'translate(-50%, -50%)' }}
                />
              ))}

              {/* Repeat Start Dots */}
              {isRepeatStart && (
                <div className="absolute left-[8px] top-1/2 -translate-y-1/2 flex flex-col gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                </div>
              )}

              {/* Repeat End Dots */}
              {isRepeatEnd && (
                <div className="absolute right-[8px] top-1/2 -translate-y-1/2 flex flex-col gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                </div>
              )}

              {/* Thick line for repeats or double */}
              {(isRepeatStart || isRepeatEnd || isDouble) && (
                <div className={`absolute top-0 bottom-0 w-[4px] bg-slate-400 ${isRepeatStart && !isRepeatEnd ? 'left-[4px]' : isRepeatEnd && !isRepeatStart ? 'right-[4px]' : 'left-[4px]'}`} />
              )}
            </div>
          );
        })}

            {groupedRests.map(gr => {
              if (gr.startTime < systemStartTime || gr.startTime >= systemEndTime) return null;
              
              let grDuration = 0;
              let tempTime = gr.startTime;
              for (let i = 0; i < gr.measures; i++) {
                const ts = getTimeSignatureAt(tempTime, timeSignatures);
                const barLength = getBarLength(ts.numerator, ts.denominator);
                grDuration += barLength;
                tempTime += barLength;
              }

              const startX = getVisualX(gr.startTime - systemStartTime, true);
              const endX = getVisualX(gr.startTime + grDuration - systemStartTime, true);
              const width = endX - startX;

              return (
                <div
                  key={gr.id}
                  className="absolute z-20 flex flex-col items-center justify-center cursor-pointer group pointer-events-auto"
                  style={{
                    left: startX,
                    top: systemCenterY - 4 * PITCH_HEIGHT,
                    width: width,
                    height: 8 * PITCH_HEIGHT
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onUngroupRests(gr.id);
                  }}
                >
                  <div className={`w-full h-2 rounded-sm relative ${theme === 'light' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1/2 left-0 w-1 h-4 -translate-y-1/2 ${theme === 'light' ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    <div className={`absolute top-1/2 right-0 w-1 h-4 -translate-y-1/2 ${theme === 'light' ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  </div>
                  <div className={`absolute -top-6 font-bold text-lg ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    {gr.measures}
                  </div>
                  <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white text-xs px-2 py-1 rounded shadow whitespace-nowrap">
                    Desagrupar
                  </div>
                </div>
              );
            })}
          </>
        );
      })()}
      
      
      {/* Triplet Brackets */}
      {Object.values(
        notes.reduce((acc, note) => {
          if (note.isTriplet && note.tripletGroupId) {
            if (!acc[note.tripletGroupId]) acc[note.tripletGroupId] = [];
            acc[note.tripletGroupId].push(note);
          }
          return acc;
        }, {} as Record<string, Note[]>)
      ).map(group => {
        if (group.length === 0) return null;
        
        const minStart = Math.min(...group.map(n => n.startTime));
        const maxEnd = Math.max(...group.map(n => n.startTime + getDurationValue(n.duration, n.isDotted, n.isTriplet)));
        
        if (maxEnd <= systemStartTime || minStart >= systemEndTime) return null;
        
        const renderStart = Math.max(minStart, systemStartTime);
        const renderEnd = Math.min(maxEnd, systemEndTime);
        
        const startX = getVisualX(renderStart - systemStartTime, false);
        const endX = getVisualX(renderEnd - systemStartTime, false);
        const width = endX - startX;
        
        const minPitchY = Math.min(...group.map(n => {
          let absolutePitch = (n.octave - 5) * 7 + PITCH_VALUES[n.pitch];
          
          if (!isGrandStaff) {
            const activeClef = getClefSignatureAt(n.startTime, clefSignatures).clef;
            if (activeClef === 'bass') absolutePitch += 12;
            else if (activeClef === 'alto') absolutePitch += 6;
          }
          
          if (isGrandStaff) {
            return systemCenterY - (absolutePitch + 7) * PITCH_HEIGHT;
          } else {
            return systemCenterY - (absolutePitch + 1) * PITCH_HEIGHT;
          }
        }));
        
        const bracketY = minPitchY - 30;
        
        return (
          <div key={group[0].tripletGroupId} className="absolute pointer-events-none" style={{ left: startX, top: bracketY, width: width, height: 10 }}>
            <div className="absolute left-0 top-0 w-px h-full bg-slate-400" />
            <div className="absolute left-0 top-0 h-px bg-slate-400" style={{ width: 'calc(50% - 6px)' }} />
            <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 bg-slate-900 px-1 leading-none">3</div>
            <div className="absolute right-0 top-0 h-px bg-slate-400" style={{ width: 'calc(50% - 6px)' }} />
            <div className="absolute right-0 top-0 w-px h-full bg-slate-400" />
          </div>
        );
      })}

      {/* Glissandos */}
      {allNotes.map(note => {
        if (!note.glissandoTargetId) return null;
        
        const targetNote = allNotes.find(n => n.id === note.glissandoTargetId);
        if (!targetNote) return null;

        const noteStart = note.startTime;
        const noteDuration = getDurationValue(note.duration, note.isDotted, note.isTriplet);
        const noteEnd = noteStart + noteDuration;
        
        // The glissando line goes from noteEnd to targetNote.startTime
        const glissandoStart = noteEnd;
        const glissandoEnd = targetNote.startTime;

        // Check if the glissando line intersects with this system
        if (glissandoEnd <= systemStartTime || glissandoStart >= systemEndTime) return null;

        // Calculate Y for a note
        const getNoteY = (n: Note) => {
          let absolutePitch = (n.octave - 5) * 7 + PITCH_VALUES[n.pitch];
          const activeClef = getClefSignatureAt(n.startTime, clefSignatures).clef;
          if (!isGrandStaff) {
            if (activeClef === 'bass') {
              absolutePitch += 12;
            } else if (activeClef === 'alto') {
              absolutePitch += 6;
            }
          }
          if (isGrandStaff) {
            return systemCenterY - (absolutePitch + 7) * PITCH_HEIGHT;
          } else {
            return systemCenterY - (absolutePitch + 1) * PITCH_HEIGHT;
          }
        };

        const y1 = getNoteY(note);
        const y2 = getNoteY(targetNote);

        // Interpolate Y for the start and end of the system if necessary
        const getInterpolatedY = (time: number) => {
          if (time <= glissandoStart) return y1;
          if (time >= glissandoEnd) return y2;
          const progress = (time - glissandoStart) / (glissandoEnd - glissandoStart);
          return y1 + (y2 - y1) * progress;
        };

        let x1, finalY1;
        if (glissandoStart < systemStartTime) {
          x1 = CLEF_WIDTH;
          finalY1 = getInterpolatedY(systemStartTime);
        } else {
          const timeInSystem = glissandoStart - systemStartTime;
          x1 = getVisualX(timeInSystem, false);
          finalY1 = y1;
        }

        let x2, finalY2;
        if (glissandoEnd > systemEndTime) {
          x2 = SYSTEM_WIDTH;
          finalY2 = getInterpolatedY(systemEndTime);
        } else {
          const targetTimeInSystem = glissandoEnd - systemStartTime;
          x2 = getVisualX(targetTimeInSystem, false);
          finalY2 = y2;
        }

        if (x1 >= x2) return null;

        return (
          <svg key={`gliss-${note.id}`} className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
            <line 
              x1={x1} 
              y1={finalY1} 
              x2={x2} 
              y2={finalY2} 
              stroke="currentColor" 
              strokeWidth="1" 
              className={`${theme === 'light' ? 'text-slate-950' : 'text-slate-100'} opacity-70`}
            />
          </svg>
        );
      })}

      {/* Notes */}
      {notes.map(note => {
        const noteStart = note.startTime;
        const noteDuration = getDurationValue(note.duration, note.isDotted, note.isTriplet);
        const noteEnd = noteStart + noteDuration;
        
        // Calculate intersection with current system
        const renderStart = Math.max(noteStart, systemStartTime);
        const renderEnd = Math.min(noteEnd, systemEndTime);
        const renderDuration = renderEnd - renderStart;
        
        const timeInSystem = renderStart - systemStartTime;
        const x = getVisualX(timeInSystem, false);
        const width = renderDuration * UNIT_WIDTH;

        const isSplitStart = noteEnd > systemEndTime && renderStart === noteStart;
        const isSplitEnd = noteStart < systemStartTime && renderEnd === noteEnd;
        const isSplitMiddle = noteStart < systemStartTime && noteEnd > systemEndTime;

        let effectiveAlteration = note.alteration;
        if (!effectiveAlteration) {
          const ks = getKeySignatureAt(noteStart, keySignatures);
          const pitchClass = PITCH_VALUES[note.pitch];
          const acc = ks.accidentals.find(a => a.pitchClass === pitchClass);
          if (acc) {
            effectiveAlteration = acc.alteration as Alteration;
          }
        }

        const activeClef = getClefSignatureAt(noteStart, clefSignatures).clef;

        return (
          <NoteElement 
            key={note.id} 
            note={note} 
            shape={scoreShape}
            isSelected={selectedNoteIds.includes(note.id)}
            isPlaying={playingNoteIds.includes(note.id)}
            isInteractive={currentTool === 'cursor' && !isBarMode}
            onClick={(e) => onNoteClick(note.id, systemIndex, e)}
            onDragStart={(e) => onNoteDragStart && onNoteDragStart(note, e)}
            x={x}
            width={width}
            isSplitStart={isSplitStart}
            isSplitEnd={isSplitEnd}
            isSplitMiddle={isSplitMiddle}
            effectiveAlteration={effectiveAlteration}
            clef={activeClef}
            isGrandStaff={isGrandStaff}
            systemCenterY={systemCenterY}
            theme={theme}
          />
        );
      })}
      
      {/* Dynamics */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl z-20">
        {notes.map(note => {
          if (!note.dynamic || note.dynamic === 'crescendo' || note.dynamic === 'decrescendo') return null;
          
          const noteStart = note.startTime;
          if (noteStart >= systemEndTime || noteStart < systemStartTime) return null;
          
          const timeInSystem = noteStart - systemStartTime;
          const x = getVisualX(timeInSystem, false);
          const topPos = textBottomY - 28; // Moved 8px higher from -20
          
          return (
            <div 
              key={`dynamic-${note.id}`}
              className="absolute pointer-events-none flex items-center justify-center"
              style={{ 
                left: x, 
                top: topPos,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="text-lg font-serif italic font-bold" style={{ color: 'var(--dynamic-text-color)' }}>{note.dynamic}</div>
            </div>
          );
        })}

        {/* Dynamic Transitions */}
        {dynamicTransitions.map(transition => {
          const startNote = allNotes?.find(n => n.id === transition.startNoteId);
          const endNote = allNotes?.find(n => n.id === transition.endNoteId);

          if (!startNote || !endNote || !startNote.dynamic || !endNote.dynamic) return null;

          // Check if the transition is visible in this system
          if (endNote.startTime < systemStartTime || startNote.startTime >= systemEndTime) return null;

          // Calculate start and end positions within this system
          const effectiveStartTime = Math.max(startNote.startTime, systemStartTime);
          const effectiveEndTime = Math.min(endNote.startTime, systemEndTime);

          const startX = getVisualX(effectiveStartTime - systemStartTime, false);
          const endX = getVisualX(effectiveEndTime - systemStartTime, false);

          // Add padding so it doesn't overlap with the dynamic text
          const paddingLeft = effectiveStartTime === startNote.startTime ? 20 : 0;
          const paddingRight = effectiveEndTime === endNote.startTime ? 20 : 0;

          const wedgeWidth = Math.max(10, endX - startX - paddingLeft - paddingRight);
          const leftPos = startX + paddingLeft;
          const topPos = textBottomY - 28 + 4;

          // Calculate opening height based on dynamic difference
          const DYNAMIC_LEVELS = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff'];
          const startIdx = DYNAMIC_LEVELS.indexOf(startNote.dynamic);
          const endIdx = DYNAMIC_LEVELS.indexOf(endNote.dynamic);
          
          const diff = Math.abs(startIdx - endIdx);
          const openingHeight = Math.max(6, 6 + diff * 3); // 6px min, up to 24px max

          return (
            <div 
              key={`dt-${transition.id}`}
              className="absolute pointer-events-none flex items-center"
              style={{ 
                left: leftPos,
                top: topPos - (openingHeight - 12) / 2,
                width: wedgeWidth,
                height: openingHeight,
              }}
            >
              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 100 ${openingHeight}`}>
                {transition.type === 'crescendo' ? (
                  <path d={`M 0 ${openingHeight/2} L 100 0 M 0 ${openingHeight/2} L 100 ${openingHeight}`} stroke="currentColor" strokeWidth="2" fill="none" style={{ color: 'var(--dynamic-text-color)' }} />
                ) : (
                  <path d={`M 0 0 L 100 ${openingHeight/2} M 0 ${openingHeight} L 100 ${openingHeight/2}`} stroke="currentColor" strokeWidth="2" fill="none" style={{ color: 'var(--dynamic-text-color)' }} />
                )}
              </svg>
            </div>
          );
        })}
      </div>


      {/* Time Signature Menu */}
      {showTSMenu && (
        <div 
          ref={tsMenuRef}
          className="absolute z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-3 flex flex-col gap-3 animate-in fade-in zoom-in duration-200 pointer-events-auto"
          style={{ left: showTSMenu.x + 20, top: showTSMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-2 gap-2">
            {[ [2,4], [3,4], [4,4], [6,8], [12,8] ].map(([n, d]) => (
              <button 
                key={`${n}/${d}`}
                className="px-2 py-1 bg-slate-700 hover:bg-blue-600 rounded text-xs font-bold"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onUpdateTimeSignature(showTSMenu.startTime, n, d);
                  setShowTSMenu(null);
                }}
              >
                {n}/{d}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-700 pt-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                className="w-12 bg-slate-900 border border-slate-700 rounded px-1 text-sm text-white"
                value={customTS.numerator}
                onChange={(e) => setCustomTS({ ...customTS, numerator: parseInt(e.target.value) || 1 })}
              />
              <span className="text-slate-400">/</span>
              <select 
                className="bg-slate-900 border border-slate-700 rounded px-1 text-sm text-white"
                value={customTS.denominator}
                onChange={(e) => setCustomTS({ ...customTS, denominator: parseInt(e.target.value) || 4 })}
              >
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="8">8</option>
                <option value="16">16</option>
              </select>
            </div>
            <button 
              className="w-full py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold"
              onPointerDown={(e) => {
                e.stopPropagation();
                onUpdateTimeSignature(showTSMenu.startTime, customTS.numerator, customTS.denominator);
                setShowTSMenu(null);
              }}
            >
              Aplicar Personalizado
            </button>
            {showTSMenu.startTime > 0 && (
              <button 
                className="w-full py-1 bg-red-600/80 hover:bg-red-500 rounded text-xs font-bold mt-1"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onDeleteTimeSignature(showTSMenu.startTime);
                  setShowTSMenu(null);
                }}
              >
                Eliminar Heterometría
              </button>
            )}
          </div>
          <button 
            className="text-[10px] text-slate-500 hover:text-slate-300 text-center"
            onPointerDown={(e) => {
              e.stopPropagation();
              setShowTSMenu(null);
            }}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Key Signature Menu */}
      {showKSMenu && (
        <div 
          ref={ksMenuRef}
          className="absolute z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-3 flex flex-col gap-3 animate-in fade-in zoom-in duration-200 w-64 pointer-events-auto"
          style={{ left: showKSMenu.x + 20, top: showKSMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-bold">Tonalidad / Nota Raíz</label>
            <select 
              className="bg-slate-700 text-white rounded p-1 text-sm"
              value={customKS.rootNote}
              onChange={(e) => setCustomKS({ ...customKS, rootNote: e.target.value })}
            >
              {ROOT_NOTES.map(note => (
                <option key={note} value={note}>{note}</option>
              ))}
            </select>

            <label className="text-xs text-slate-400 font-bold mt-2">Modo</label>
            <select 
              className="bg-slate-700 text-white rounded p-1 text-sm"
              value={customKS.mode}
              onChange={(e) => setCustomKS({ ...customKS, mode: e.target.value })}
            >
              {[...MODES, 'Sin modo'].map(mode => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>

            <button 
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold mt-2"
              onPointerDown={(e) => {
                e.stopPropagation();
                onUpdateKeySignature(showKSMenu.startTime, customKS.rootNote, customKS.mode);
                setShowKSMenu(null);
              }}
            >
              Aplicar Armadura
            </button>
            
            {showKSMenu.startTime > 0 && (
              <button 
                className="w-full py-1 bg-red-600/80 hover:bg-red-500 rounded text-xs font-bold mt-1"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onDeleteKeySignature(showKSMenu.startTime);
                  setShowKSMenu(null);
                }}
              >
                Eliminar Armadura
              </button>
            )}
          </div>
          <button 
            className="text-[10px] text-slate-500 hover:text-slate-300 text-center"
            onPointerDown={(e) => {
              e.stopPropagation();
              setShowKSMenu(null);
            }}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Clef Menu */}
      {showClefMenu && (
        <div 
          ref={clefMenuRef}
          className="absolute z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-3 flex flex-col gap-3 animate-in fade-in zoom-in duration-200 w-48 pointer-events-auto"
          style={{ left: showClefMenu.x + 20, top: showClefMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-bold">Clave</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                className="bg-slate-700 hover:bg-blue-600 rounded p-2 text-2xl font-serif flex items-center justify-center leading-none"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onUpdateClefSignature(showClefMenu.startTime, 'treble');
                  setShowClefMenu(null);
                }}
                title="Clave de Sol"
              >
                𝄞
              </button>
              <button 
                className="bg-slate-700 hover:bg-blue-600 rounded p-2 text-2xl font-serif flex items-center justify-center leading-none"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onUpdateClefSignature(showClefMenu.startTime, 'bass');
                  setShowClefMenu(null);
                }}
                title="Clave de Fa"
              >
                𝄢
              </button>
              <button 
                className="bg-slate-700 hover:bg-blue-600 rounded p-2 text-2xl font-serif flex items-center justify-center leading-none"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onUpdateClefSignature(showClefMenu.startTime, 'alto');
                  setShowClefMenu(null);
                }}
                title="Clave de Do"
              >
                𝄡
              </button>
            </div>
            
            {showClefMenu.startTime > 0 && (
              <button 
                className="w-full py-1 bg-red-600/80 hover:bg-red-500 rounded text-xs font-bold mt-1"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onDeleteClefSignature(showClefMenu.startTime);
                  setShowClefMenu(null);
                }}
              >
                Eliminar Clave
              </button>
            )}
          </div>
          <button 
            className="text-[10px] text-slate-500 hover:text-slate-300 text-center"
            onPointerDown={(e) => {
              e.stopPropagation();
              setShowClefMenu(null);
            }}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Barline Menu (Add TS, KS, Clef, or Repeats) */}
      {showBarlineMenu && (
        <div 
          ref={barlineMenuRef}
          className="absolute z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-2 flex flex-col gap-2 animate-in fade-in zoom-in duration-200 pointer-events-auto"
          style={{ left: showBarlineMenu.x + 10, top: showBarlineMenu.y - 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {(!showBarlineMenu.isGhostStart && !showBarlineMenu.isGhostEnd && !showBarlineMenu.isSystemEnd) && (
            <>
              <div className="flex gap-2">
                <button 
                  className="px-3 py-2 bg-slate-700 hover:bg-blue-600 rounded text-sm font-bold flex items-center justify-center"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onUpdateClefSignature(showBarlineMenu.startTime, 'treble');
                    setShowBarlineMenu(null);
                  }}
                  title="Insertar Clave"
                >
                  <span className="font-serif text-lg leading-none">𝄞</span>
                </button>
                <button 
                  className="px-3 py-2 bg-slate-700 hover:bg-blue-600 rounded text-sm font-bold flex items-center justify-center"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onUpdateTimeSignature(showBarlineMenu.startTime, 4, 4);
                    setShowBarlineMenu(null);
                  }}
                  title="Insertar Cifra de Compás"
                >
                  4/4
                </button>
                <button 
                  className="px-3 py-2 bg-slate-700 hover:bg-blue-600 rounded text-sm font-bold flex items-center justify-center"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onUpdateKeySignature(showBarlineMenu.startTime, 'Do', 'Jónico (Mayor)');
                    setShowBarlineMenu(null);
                  }}
                  title="Insertar Armadura"
                >
                  ♯♭
                </button>
              </div>
              <div className="h-px bg-slate-700 w-full" />
            </>
          )}
          <div className="flex gap-2">
            {!showBarlineMenu.isSystemEnd && (
              <button 
                className="px-3 py-2 bg-slate-700 hover:bg-purple-600 rounded text-sm font-bold flex items-center justify-center"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onUpdateBarline(showBarlineMenu.id, { type: 'repeat-start' });
                  setShowBarlineMenu(null);
                }}
                title="Inicio de Repetición"
              >
                |:
              </button>
            )}
            {!showBarlineMenu.isSystemStart && (
              <button 
                className="px-3 py-2 bg-slate-700 hover:bg-purple-600 rounded text-sm font-bold flex items-center justify-center"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onUpdateBarline(showBarlineMenu.id, { type: 'repeat-end', repeatCount: 2 });
                  const newId = showBarlineMenu.id.replace('-ghost-start', '').replace('-ghost-end', '');
                  if (newId !== showBarlineMenu.id) {
                    setShowBarlineMenu({ ...showBarlineMenu, id: newId, isGhostEnd: false, isGhostStart: false });
                  }
                }}
                title="Fin de Repetición"
              >
                :|
              </button>
            )}
            {(!showBarlineMenu.isSystemStart && !showBarlineMenu.isSystemEnd) && (
              <button 
                className="px-3 py-2 bg-slate-700 hover:bg-purple-600 rounded text-sm font-bold flex items-center justify-center"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onUpdateBarline(showBarlineMenu.id, { type: 'single' });
                  setShowBarlineMenu(null);
                }}
                title="Barra Simple"
              >
                |
              </button>
            )}
          </div>
          {barlines.find(b => b.id === showBarlineMenu.id)?.type === 'repeat-end' && (
            <>
              <div className="h-px bg-slate-700 w-full" />
              <div className="flex items-center gap-2 justify-between px-1">
                <span className="text-xs text-slate-400">{t('repeats')}:</span>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" 
                    min="2" 
                    max="9" 
                    value={barlines.find(b => b.id === showBarlineMenu.id)?.repeatCount === 999 ? '' : (barlines.find(b => b.id === showBarlineMenu.id)?.repeatCount || '')}
                    onChange={(e) => {
                      if (e.target.value === '') {
                        onUpdateBarline(showBarlineMenu.id, { repeatCount: '' as any });
                        return;
                      }
                      let val = parseInt(e.target.value);
                      if (isNaN(val)) val = 2;
                      if (val < 2) val = 2;
                      if (val > 9) val = 9;
                      onUpdateBarline(showBarlineMenu.id, { repeatCount: val });
                    }}
                    onBlur={(e) => {
                      const current = barlines.find(b => b.id === showBarlineMenu.id)?.repeatCount;
                      if (current === '' as any || current === undefined || current === null) {
                        onUpdateBarline(showBarlineMenu.id, { repeatCount: 2 });
                      }
                    }}
                    className="w-12 bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-sm text-center text-white"
                  />
                  <button
                    className={`p-1 rounded ${barlines.find(b => b.id === showBarlineMenu.id)?.repeatCount === 999 ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const current = barlines.find(b => b.id === showBarlineMenu.id)?.repeatCount;
                      onUpdateBarline(showBarlineMenu.id, { repeatCount: current === 999 ? 2 : 999 });
                    }}
                    title="Bucle infinito"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
                  </button>
                </div>
              </div>
            </>
          )}
          <button 
            className="text-[10px] text-slate-500 hover:text-slate-300 text-center mt-1"
            onPointerDown={(e) => {
              e.stopPropagation();
              setShowBarlineMenu(null);
            }}
          >
            Cerrar
          </button>
        </div>
      )}


      </div>
      </div>

      {/* Note names below staff */}
      {textOptions.showNoteNames && Object.entries(
        notes.reduce((acc, note) => {
          const noteStart = note.startTime;
          
          // Only render note names at the actual start of the note.
          // This prevents duplicate names across systems and helps with persistence issues.
          if (noteStart < systemStartTime) return acc;
          
          if (!acc[noteStart]) acc[noteStart] = [];
          acc[noteStart].push(note);
          return acc;
        }, {} as Record<number, Note[]>)
      ).map(([timeStr, groupNotes]) => {
        const time = parseFloat(timeStr); // Use parseFloat for precision with triplets
        const timeInSystem = time - systemStartTime;
        const x = getVisualX(timeInSystem, false);
        
        const ks = getKeySignatureAt(time, keySignatures);
        
        const getEffectiveAlteration = (n: Note) => {
          if (n.alteration) return n.alteration;
          const pitchClass = PITCH_VALUES[n.pitch];
          const acc = ks.accidentals.find(a => a.pitchClass === pitchClass);
          return acc ? acc.alteration : '';
        };
        
        // Sort notes from highest pitch to lowest pitch for stacking
        const sortedNotes = [...groupNotes].sort((a, b) => getMidiNumber(b, ks) - getMidiNumber(a, ks));
        
        const isChord = sortedNotes.length >= 3 && !!detectChord(sortedNotes, ks);
        const chordName = isChord ? detectChord(sortedNotes, ks) : null;
        
        return (
          <div 
            key={`name-group-${timeStr}`}
            className="absolute pointer-events-none flex flex-col items-center justify-end gap-1 group"
            style={{ 
              left: x, 
              top: chordName ? systemHeight - 20 : textBottomY, 
              zIndex: 20,
              transform: 'translateX(-50%)' // Center text under the note
            }}
          >
            {/* Chord Name */}
            {chordName && (
              <div 
                className={`font-bold text-sm px-1 rounded transition-colors pointer-events-auto ${currentTool === 'cursor' && !isBarMode ? 'cursor-pointer' : 'cursor-default'} ${theme === 'light' ? 'text-purple-700 bg-transparent hover:text-purple-900 hover:bg-slate-200' : 'text-purple-400 bg-slate-900/80 hover:text-purple-200 hover:bg-slate-700'}`}
                onPointerDown={(e) => {
                  if (currentTool !== 'cursor' || isBarMode) return;
                  e.stopPropagation();
                  onNoteClick(sortedNotes.map(n => n.id), systemIndex, e);
                }}
              >
                {chordName}
              </div>
            )}
            
            {/* Note Names */}
            <div className={`flex flex-col items-center gap-[2px] transition-opacity duration-200 ${chordName ? 'opacity-0 group-hover:opacity-100 absolute top-full mt-1 p-1 rounded-md shadow-lg pointer-events-auto ' + (theme === 'light' ? 'bg-white/90 border border-slate-200' : 'bg-slate-900/90 border border-slate-700') : ''}`}>
              {sortedNotes.map((n, i) => (
                <div 
                  key={n.id} 
                  className={`font-bold text-[10px] leading-none px-1 rounded transition-colors ${currentTool === 'cursor' && !isBarMode ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'} ${theme === 'light' ? 'text-slate-800 bg-transparent hover:text-black hover:bg-slate-200' : 'text-slate-400 bg-slate-900/80 hover:text-white hover:bg-slate-700'}`}
                  onPointerDown={(e) => {
                    if (currentTool !== 'cursor' || isBarMode) return;
                    e.stopPropagation();
                    onNoteClick([n.id], systemIndex, e);
                  }}
                >
                  {n.pitch}{getEffectiveAlteration(n)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      
      {/* System Text Area */}
      {!textOptions.showNoteNames && (
        <div className="absolute bottom-[11px] left-0 right-0 h-16 pointer-events-auto z-30 px-12">
          {isExporting ? (
            <div
              className={`w-full h-full bg-transparent whitespace-pre-wrap break-words ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}
              style={{
                fontFamily: textOptions.fontFamily,
                fontSize: `${textOptions.fontSize}px`,
                letterSpacing: `${textOptions.letterSpacing}px`,
                lineHeight: '1.2'
              }}
            >
              {systemText}
            </div>
          ) : (
            <textarea
              className={`w-full h-full bg-transparent resize-none outline-none ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}
              style={{
                fontFamily: textOptions.fontFamily,
                fontSize: `${textOptions.fontSize}px`,
                letterSpacing: `${textOptions.letterSpacing}px`,
                lineHeight: '1.2'
              }}
              value={systemText}
              onChange={(e) => onUpdateSystemText?.(systemIndex, e.target.value)}
              placeholder="Escribe aquí la letra o acordes..."
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      {/* System Number */}
      <div className="absolute top-2 left-2 text-slate-500 font-bold text-sm pointer-events-none z-10">
        {systemIndex + 1}
      </div>

      {/* Delete System Button */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 pointer-events-auto">
        {showDeleteConfirm ? (
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg shadow-xl border border-slate-700 animate-in fade-in zoom-in duration-200">
            <span className="text-[10px] text-slate-300 px-1 font-medium whitespace-nowrap">¿Eliminar sistema {systemIndex + 1}?</span>
            <button 
              className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors pointer-events-auto"
              onPointerDown={(e) => {
                e.stopPropagation();
                onDeleteSystem(systemIndex);
                setShowDeleteConfirm(false);
              }}
              title="Confirmar"
            >
              <Check size={14} />
            </button>
            <button 
              className="p-1 hover:bg-slate-700 text-slate-400 rounded transition-colors pointer-events-auto"
              onPointerDown={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(false);
                setShowMeasuresMenu(false);
              }}
              title="Cancelar"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <button 
              ref={measuresButtonRef}
              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md border border-slate-700 transition-all pointer-events-auto"
              onPointerDown={(e) => {
                e.stopPropagation();
                setShowMeasuresMenu(!showMeasuresMenu);
              }}
              title="Configurar compases por sistema"
            >
              <Settings size={14} className={showMeasuresMenu ? 'text-blue-400' : ''} />
            </button>
            <button
              className="p-1.5 bg-slate-800/80 hover:bg-red-600 text-slate-400 hover:text-white rounded-md border border-slate-700 transition-all pointer-events-auto"
              onPointerDown={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              title="Eliminar este sistema"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>

      {/* Measures per System Menu */}
      {showMeasuresMenu && (
        <div 
          ref={measuresMenuRef}
          className="absolute top-12 right-2 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-3 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200 w-48 pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Compases por sistema</label>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                min="1" 
                max="16"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white pointer-events-auto"
                value={measuresValue}
                onChange={(e) => setMeasuresValue(parseInt(e.target.value) || 1)}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button 
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-[10px] font-bold uppercase tracking-wider transition-colors pointer-events-auto"
              onPointerDown={(e) => {
                e.stopPropagation();
                onUpdateSystemMeasures(systemIndex, measuresValue, false);
                setShowMeasuresMenu(false);
                setShowDeleteConfirm(false);
              }}
            >
              Solo este sistema
            </button>
            <button 
              className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-[10px] font-bold uppercase tracking-wider transition-colors pointer-events-auto"
              onPointerDown={(e) => {
                e.stopPropagation();
                onUpdateSystemMeasures(systemIndex, measuresValue, true);
                setShowMeasuresMenu(false);
                setShowDeleteConfirm(false);
              }}
            >
              Toda la partitura
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
