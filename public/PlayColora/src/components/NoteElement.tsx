import { Note, Shape, Pitch, Alteration, ClefType } from '../types';
import { ShapeRenderer } from './ShapeRenderer';
import { UNIT_WIDTH, PITCH_VALUES, SYSTEM_CENTER_Y, PITCH_HEIGHT, PITCH_COLORS, CLEF_WIDTH, SELECTED_NOTE_BORDER_COLOR } from '../constants';
import { getDurationValue } from '../utils';

interface NoteElementProps {
  note: Note;
  shape: Shape;
  isSelected: boolean;
  isPlaying?: boolean;
  isInteractive?: boolean;
  onClick: (e: React.PointerEvent) => void;
  onDragStart?: (e: React.PointerEvent) => void;
  x?: number;
  width?: number;
  isSplitStart?: boolean;
  isSplitEnd?: boolean;
  isSplitMiddle?: boolean;
  effectiveAlteration?: Alteration;
  clef?: ClefType;
  isGrandStaff?: boolean;
  systemCenterY: number;
  theme: 'light' | 'dark';
}

export const NoteElement = ({ note, shape, isSelected, isPlaying, isInteractive = true, onClick, onDragStart, x, width: customWidth, isSplitStart, isSplitEnd, isSplitMiddle, effectiveAlteration, clef = 'treble', isGrandStaff = false, systemCenterY, theme }: NoteElementProps) => {
  const defaultWidth = getDurationValue(note.duration, note.isDotted, note.isTriplet) * UNIT_WIDTH;
  const width = customWidth !== undefined ? customWidth : defaultWidth;
  const color = note.isSilence ? '#475569' : PITCH_COLORS[note.pitch]; // Slate-600 for silences
  
  // Calculate relative position within its system
  const finalX = x !== undefined ? x : CLEF_WIDTH + (note.startTime % 64) * UNIT_WIDTH;
  
  // DO4 is first line below, DO5 is 3rd space, DO6 is 2nd line above.
  // absolutePitch: DO5 = 0.
  // Lines are at -5 (MI4), -3 (SOL4), -1 (SI4), 1 (RE5), 3 (FA5).
  let absolutePitch = (note.octave - 5) * 7 + PITCH_VALUES[note.pitch];
  
  // Adjust absolutePitch based on clef
  if (!isGrandStaff) {
    if (clef === 'bass') {
      absolutePitch += 12;
    } else if (clef === 'alto') {
      absolutePitch += 6;
    }
  }
  
  // y calculation needs to map absolutePitch to the staff
  let y;
  if (isGrandStaff) {
    // In grand staff, C4 (-7) is at systemCenterY
    y = systemCenterY - (absolutePitch + 7) * PITCH_HEIGHT;
  } else {
    // SI4 (-1) is on the 3rd line (systemCenterY).
    y = systemCenterY - (absolutePitch + 1) * PITCH_HEIGHT;
  }
  
  const ledgerLines = [];
  if (!note.isSilence) {
    if (isGrandStaff) {
      if (absolutePitch >= 5) {
        for (let p = 5; p <= absolutePitch; p += 2) {
          const lineY = 12 + (absolutePitch - p) * PITCH_HEIGHT;
          ledgerLines.push(<div key={`ledger-${p}`} className="absolute left-1/2 -translate-x-1/2 w-[120%] h-px bg-slate-400 z-0" style={{ top: lineY }} />);
        }
      } else if (absolutePitch <= -19) {
        for (let p = -19; p >= absolutePitch; p -= 2) {
          const lineY = 12 + (absolutePitch - p) * PITCH_HEIGHT;
          ledgerLines.push(<div key={`ledger-${p}`} className="absolute left-1/2 -translate-x-1/2 w-[120%] h-px bg-slate-400 z-0" style={{ top: lineY }} />);
        }
      } else if (absolutePitch === -7) {
        ledgerLines.push(<div key={`ledger--7`} className="absolute left-1/2 -translate-x-1/2 w-[120%] h-px bg-slate-400 z-0" style={{ top: 12 }} />);
      }
    } else {
      if (absolutePitch <= -7) {
        for (let p = -7; p >= absolutePitch; p -= 2) {
          const lineY = 12 + (absolutePitch - p) * PITCH_HEIGHT;
          ledgerLines.push(<div key={`ledger-${p}`} className="absolute left-1/2 -translate-x-1/2 w-[120%] h-px bg-slate-400 z-0" style={{ top: lineY }} />);
        }
      } else if (absolutePitch >= 5) {
        for (let p = 5; p <= absolutePitch; p += 2) {
          const lineY = 12 + (absolutePitch - p) * PITCH_HEIGHT;
          ledgerLines.push(<div key={`ledger-${p}`} className="absolute left-1/2 -translate-x-1/2 w-[120%] h-px bg-slate-400 z-0" style={{ top: lineY }} />);
        }
      }
    }
  }
  
  return (
    <div
      className={`absolute z-10 note-element ${isInteractive ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'} ${note.isSilence ? 'opacity-50' : ''}`}
      data-note-id={note.id}
      style={{ left: finalX, top: y - 12, width, height: 24 }}
      onPointerDown={(e) => {
        if (!isInteractive) return;
        e.preventDefault(); // Prevent text selection
        onClick(e);
        if (onDragStart) onDragStart(e);
        e.stopPropagation();
      }}
    >
      {/* Ledger lines */}
      {ledgerLines}
      
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {note.isSilence ? (
          <div className="w-full h-2 border-2 border-dashed border-slate-500 rounded-sm flex items-center justify-center">
            <span className="text-[8px] font-bold text-slate-500">_</span>
          </div>
        ) : (
          <div className="relative group flex items-center justify-center w-full h-full">
            <ShapeRenderer 
              shape={shape} 
              color={color} 
              width={width} 
              alteration={effectiveAlteration !== undefined ? effectiveAlteration : note.alteration} 
              isSplitStart={isSplitStart}
              isSplitEnd={isSplitEnd}
              isSplitMiddle={isSplitMiddle}
            />
            {!note.isSilence && (
              <div 
                className={`absolute inset-0 blur-[6px] opacity-30 pointer-events-none z-[-1] ${isSplitMiddle ? 'rounded-none' : isSplitStart ? 'rounded-l-full' : isSplitEnd ? 'rounded-r-full' : 'rounded-full'}`} 
                style={{ backgroundColor: color }}
              />
            )}
          </div>
        )}
        {note.isDotted && !isSplitStart && !isSplitMiddle && (
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full shadow-sm" />
        )}
        
        {note.articulation && !isSplitMiddle && !isSplitEnd && (
          <div className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center justify-center" style={{ top: -16, width: 16, height: 16 }}>
            {note.articulation === 'staccato' && (
              <div className={`w-1.5 h-1.5 rounded-full ${theme === 'light' ? 'bg-slate-900' : 'bg-slate-100'}`} />
            )}
            {note.articulation === 'staccatissimo' && (
              <svg viewBox="0 0 10 10" className={`w-2 h-3 ${theme === 'light' ? 'fill-slate-900' : 'fill-slate-100'}`}>
                <polygon points="0,0 10,0 5,10" />
              </svg>
            )}
            {note.articulation === 'accent' && (
              <svg viewBox="0 0 10 10" className={`w-3 h-2 ${theme === 'light' ? 'stroke-slate-900' : 'stroke-slate-100'}`} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 1 1 L 9 5 L 1 9" />
              </svg>
            )}
            {note.articulation === 'tenuto' && (
              <div className={`w-3 h-[2px] rounded-full ${theme === 'light' ? 'bg-slate-900' : 'bg-slate-100'}`} />
            )}
          </div>
        )}
      </div>
      {isSelected && (
        <div 
          className="absolute -inset-[2px] border-2 rounded-md pointer-events-none z-20" 
          style={{ 
            borderColor: SELECTED_NOTE_BORDER_COLOR,
            boxShadow: `0 0 4px ${SELECTED_NOTE_BORDER_COLOR}80`
          }} 
        />
      )}
      {isPlaying && <div className="absolute -inset-2 bg-yellow-400/30 rounded-lg pointer-events-none z-0 animate-pulse shadow-[0_0_15px_rgba(250,204,21,0.6)]" />}
    </div>
  );
};
