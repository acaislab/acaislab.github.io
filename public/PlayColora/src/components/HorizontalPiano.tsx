import React from 'react';
import { Pitch, ClefType } from '../types';
import { PITCH_COLORS, PITCH_VALUES, PITCH_HEIGHT } from '../constants';

interface HorizontalPianoProps {
  isGrandStaff: boolean;
  clef: ClefType;
  isExtendedStaff?: boolean;
  onNoteClick: (pitch: Pitch, octave: number, alteration: string) => void;
}

export const HorizontalPiano: React.FC<HorizontalPianoProps> = ({ isGrandStaff, clef, isExtendedStaff = false, onNoteClick }) => {
  const systemHeight = isExtendedStaff ? (isGrandStaff ? 600 : 540) : (isGrandStaff ? 340 : 280);
  const baseCenterY = isExtendedStaff ? 240 : 140;
  const systemCenterY = isGrandStaff ? baseCenterY + 30 : baseCenterY;

  // Define the range of notes to show (full 88-key piano range: A0 to C8)
  // A0 is absolutePitch -30
  // C8 is absolutePitch 21
  const minAbsolutePitch = -30;
  const maxAbsolutePitch = 21;

  const keys = [];

  for (let absPitch = minAbsolutePitch; absPitch <= maxAbsolutePitch; absPitch++) {
    // Calculate octave and pitch
    // absolutePitch 0 is DO5.
    // absolutePitch = (octave - 5) * 7 + pitchValue
    const octaveOffset = Math.floor(absPitch / 7);
    const octave = 5 + octaveOffset;
    let pitchValue = absPitch % 7;
    if (pitchValue < 0) pitchValue += 7;
    
    const pitchNames: Pitch[] = ['DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI'];
    const pitch = pitchNames[pitchValue];
    
    let adjustedPitch = absPitch;
    if (!isGrandStaff) {
      if (clef === 'bass') adjustedPitch += 12;
      else if (clef === 'alto') adjustedPitch += 6;
    }
    
    let y;
    if (isGrandStaff) {
      y = systemCenterY - (adjustedPitch + 7) * PITCH_HEIGHT;
    } else {
      y = systemCenterY - (adjustedPitch + 1) * PITCH_HEIGHT;
    }

    // White key
    keys.push(
      <div
        key={`white-${absPitch}`}
        className="absolute right-0 border border-slate-800 cursor-pointer hover:brightness-110 active:brightness-90 transition-all"
        style={{
          top: y - 8, // Center the 16px height on the y coordinate
          width: 20,
          height: 16,
          backgroundColor: PITCH_COLORS[pitch],
          zIndex: 10
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onNoteClick(pitch, octave, '');
        }}
      />
    );

    // Black key (if applicable)
    // Black keys are above DO, RE, FA, SOL, LA
    if (['DO', 'RE', 'FA', 'SOL', 'LA'].includes(pitch)) {
      keys.push(
        <div
          key={`black-${absPitch}`}
          className="absolute right-0 border border-slate-700 cursor-pointer brightness-50 hover:brightness-75 active:brightness-90 transition-all rounded-l-sm"
          style={{
            top: y - 4 - 4, // 4px above the white key center (y - 4 is the center of the black key)
            width: 12,
            height: 8,
            backgroundColor: PITCH_COLORS[pitch],
            zIndex: 20
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onNoteClick(pitch, octave, '#');
          }}
        />
      );
    }
  }

  return (
    <div className="sticky right-0 top-0 w-5 z-50 pointer-events-none" style={{ height: systemHeight }}>
      <div className="absolute top-0 right-0 w-full h-full pointer-events-auto">
        {keys}
      </div>
    </div>
  );
};
