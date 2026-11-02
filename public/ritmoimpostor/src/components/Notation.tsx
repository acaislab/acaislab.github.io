import React from 'react';
import { NoteType } from '../types';

interface NoteProps {
  type: NoteType;
  color?: string;
  className?: string;
  highlight?: boolean;
  accidental?: '#' | 'b';
}

export const TrebleClefSVG: React.FC<{ className?: string; color?: string }> = ({ 
  className = "w-10 h-24", 
  color = "currentColor" 
}) => {
  return (
    <svg viewBox="0 0 50 120" className={className} fill="none">
      {/* Authentic Treble Clef (G-Clef) path centered on G4 (second line from bottom) */}
      <path
        d="M26 112 C24 114 20 114 18 111 C16 108 17 104 20 102 C23 100 27 102 27 106 C27 108 26 110 25 111 L25 55 C23 58 19 63 15 67 C10 72 8 78 8 84 C8 93 14 100 24 100 C35 100 42 91 42 80 C42 68 34 58 25 50 C25 36 27 22 30 14 C32 10 32 6 30 6 C28 6 26 9 25 14 C23 23 22 38 22 55 L22 62 C24 60 26 58 29 58 C36 58 40 64 40 73 C40 82 34 89 26 89 C20 89 16 85 16 79 C16 72 21 66 26 62 Z"
        fill={color}
      />
    </svg>
  );
};

export const NotationSVG: React.FC<NoteProps> = ({ 
  type, 
  color = "currentColor", 
  className = "", 
  highlight = false,
  accidental
}) => {
  const strokeColor = highlight ? "#ef4444" : color;
  const fillColor = highlight ? "#ef4444" : color;

  const renderAccidental = () => {
    if (!accidental) return null;
    if (accidental === '#') {
      return (
        <g stroke={strokeColor} strokeWidth="2" strokeLinecap="round">
          {/* Vertical lines */}
          <line x1="4" y1="32" x2="6" y2="58" />
          <line x1="9" y1="30" x2="11" y2="56" />
          {/* Angled cross bars */}
          <line x1="1" y1="43" x2="14" y2="40" strokeWidth="2.8" />
          <line x1="1" y1="49" x2="14" y2="46" strokeWidth="2.8" />
        </g>
      );
    }
    if (accidental === 'b') {
      return (
        <g stroke={strokeColor} strokeWidth="2" fill="none">
          <line x1="4" y1="30" x2="4" y2="52" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M4 42 C7 39 12 40 12 45 C12 50 6 51 4 48" strokeWidth="2" fill={fillColor} />
        </g>
      );
    }
    return null;
  };

  switch (type) {
    case 'quarter':
      return (
        <svg viewBox="0 0 46 60" className={className} fill="none">
          {renderAccidental()}
          <ellipse cx="20" cy="45" rx="8" ry="6" transform="rotate(-20 20 45)" fill={fillColor} />
          <path d="M27 45V10" stroke={strokeColor} strokeWidth="3" />
        </svg>
      );
    case 'eighth':
      return (
        <svg viewBox="0 0 46 60" className={className} fill="none">
          {renderAccidental()}
          <ellipse cx="20" cy="45" rx="8" ry="6" transform="rotate(-20 20 45)" fill={fillColor} />
          <path d="M27 45V10" stroke={strokeColor} strokeWidth="3" />
          <path d="M27 10C27 10 37 15 37 25" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'half':
      return (
        <svg viewBox="0 0 46 60" className={className} fill="none">
          {renderAccidental()}
          <ellipse cx="20" cy="45" rx="8" ry="6" transform="rotate(-20 20 45)" stroke={strokeColor} strokeWidth="3" />
          <path d="M27 45V10" stroke={strokeColor} strokeWidth="3" />
        </svg>
      );
    case 'whole':
      return (
        <svg viewBox="0 0 46 60" className={className} fill="none">
          {renderAccidental()}
          <ellipse cx="23" cy="45" rx="11" ry="7.5" transform="rotate(-20 23 45)" stroke={strokeColor} strokeWidth="3" />
        </svg>
      );
    case 'sixteenth':
      return (
        <svg viewBox="0 0 46 60" className={className} fill="none">
          {renderAccidental()}
          <ellipse cx="20" cy="45" rx="8" ry="6" transform="rotate(-20 20 45)" fill={fillColor} />
          <path d="M27 45V10" stroke={strokeColor} strokeWidth="3" />
          <path d="M27 10C27 10 37 15 37 25" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
          <path d="M27 18C27 18 37 23 37 33" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'quarter_rest':
      return (
        <svg viewBox="0 0 40 60" className={className} fill="none">
          <path d="M16 10 L25 24 L16 34 L21 44 C21 44 11 48 16 54" stroke={strokeColor} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'half_rest':
      return (
        <svg viewBox="0 0 40 60" className={className} fill="none">
          {/* Reference staff line */}
          <line x1="4" y1="36" x2="36" y2="36" stroke={strokeColor} strokeWidth="1.5" strokeOpacity="0.4" />
          {/* Sits on top of the line */}
          <rect x="11" y="27" width="18" height="9" fill={fillColor} rx="1" />
        </svg>
      );
    case 'whole_rest':
      return (
        <svg viewBox="0 0 40 60" className={className} fill="none">
          {/* Reference staff line */}
          <line x1="4" y1="27" x2="36" y2="27" stroke={strokeColor} strokeWidth="1.5" strokeOpacity="0.4" />
          {/* Hangs under the line */}
          <rect x="11" y="27" width="18" height="9" fill={fillColor} rx="1" />
        </svg>
      );
    case 'eighth_rest':
      return (
        <svg viewBox="0 0 40 60" className={className} fill="none">
          {/* Upper circular head and curved hook connecting to diagonal stem */}
          <circle cx="15" cy="23" r="3.4" fill={fillColor} />
          <path d="M15 23 C 18 20, 24 22, 24 27 L 17 48" stroke={strokeColor} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'sixteenth_rest':
      return (
        <svg viewBox="0 0 40 60" className={className} fill="none">
          {/* Two dots/heads and hooks */}
          <circle cx="15" cy="18" r="3.2" fill={fillColor} />
          <circle cx="13" cy="28" r="3.2" fill={fillColor} />
          <path d="M15 18 C 18 16, 23 18, 23 22" stroke={strokeColor} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M13 28 C 16 26, 21 28, 21 32" stroke={strokeColor} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M23 19 L 14 50" stroke={strokeColor} strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
};
