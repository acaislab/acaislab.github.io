import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { Plus, Download, Music, FileText, MousePointer2, Copy, Minus, Trash2, Check, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Menu, Play, Square, Volume2, RotateCcw, Settings, Eye, Info, Scissors, Clipboard, Undo, Redo, Hash, Folder as FolderIcon, FolderOpen, GripVertical, Edit2, ArrowLeftRight } from 'lucide-react';
import { toPng, toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Score, Note, Shape, Duration, Alteration, Pitch, Barline, TimeSignature, KeySignature, Folder, ClefType, DynamicTransition } from './types';
import { HorizontalPiano } from './components/HorizontalPiano';
import { System } from './components/System';
import { SYSTEM_UNITS, DURATION_UNITS, PITCH_VALUES, VALUE_TO_PITCH, PITCH_COLORS, GRID_SUBDIVISIONS, GridSubdivision, PITCH_HEIGHT, UNIT_WIDTH } from './constants';
import { parseTextToNotes, generateTextFromNotes, getDurationValue, getBarLength, getTimeSignatureAt, getSystemBoundaries, unrollScore, getDynamicGainAtTime } from './utils';
import { detectChord, getMidiNumber } from './utils/chordDetector';
import { getKeySignatureAt } from './utils/keySignatures';
import { usePlayback } from './hooks/usePlayback';
import { Midi } from '@tonejs/midi';
import { FileDropZone } from './components/FileDropZone';
import { PlayButton } from './components/PlayButton';
import { ShapeRenderer } from './components/ShapeRenderer';
import { DEFAULT_MEASURES_PER_SYSTEM } from './constants';
import { AnimatePresence } from 'motion/react';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const downloadOrShare = async (blob: Blob, filename: string, title: string) => {
  if (navigator.share && /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document) {
    const file = new File([blob], filename, { type: blob.type });
    try {
      await navigator.share({
        files: [file],
        title: title,
      });
      return;
    } catch (err) {
      console.error('Share failed:', err);
      // Fallback to download
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

const MetronomeIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.2 3.2l-6 16c-.3.8.3 1.8 1.2 1.8h13.2c.9 0 1.5-1 1.2-1.8l-6-16a1.7 1.7 0 0 0-3.2 0z" />
    <path d="M12 14v7" />
    <path d="M12 14l-4-6" />
    <circle cx="12" cy="14" r="2" />
  </svg>
);

const MascotIcon = ({ size = 24, className = "", isHovered = false }: { size?: number, className?: string, isHovered?: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <defs>
      <linearGradient id="tornasol" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a18cd1" />
        <stop offset="50%" stopColor="#fbc2eb" />
        <stop offset="100%" stopColor="#8fd3f4" />
      </linearGradient>
    </defs>
    <path d="M9 18V5l12-2v13"></path>
    <ellipse cx="6" cy="18" rx="4" ry="5.5" fill={isHovered ? "url(#tornasol)" : "currentColor"} stroke="none" />
    <ellipse cx="18" cy="16" rx="4" ry="5.5" fill={isHovered ? "url(#tornasol)" : "currentColor"} stroke="none" />

    <motion.g 
      initial={{ opacity: 0 }}
      animate={{ opacity: isHovered ? 1 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <ellipse cx="4.5" cy="17.5" rx="1.2" ry="2" fill="white" stroke="none" />
      <ellipse cx="7.5" cy="17.5" rx="1.2" ry="2" fill="white" stroke="none" />
      
      <motion.g
        animate={isHovered ? { x: [-0.6, 0.6, -0.6] } : { x: 0 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
      >
        <circle cx="4.5" cy="17.5" r="0.6" fill="black" stroke="none" />
        <circle cx="7.5" cy="17.5" r="0.6" fill="black" stroke="none" />
      </motion.g>
    </motion.g>

    <motion.g 
      initial={{ opacity: 0 }}
      animate={{ opacity: isHovered ? 1 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <ellipse cx="16.5" cy="15.5" rx="1.2" ry="2" fill="white" stroke="none" />
      <ellipse cx="19.5" cy="15.5" rx="1.2" ry="2" fill="white" stroke="none" />
      
      <motion.g
        animate={isHovered ? { x: [-0.6, 0.6, -0.6] } : { x: 0 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0.1 }}
      >
        <circle cx="16.5" cy="15.5" r="0.6" fill="black" stroke="none" />
        <circle cx="19.5" cy="15.5" r="0.6" fill="black" stroke="none" />
      </motion.g>
    </motion.g>
  </svg>
);

const STORAGE_KEY = 'musica-en-colores-scores';
const FOLDERS_STORAGE_KEY = 'musica-en-colores-folders';

export default function App() {
  const { t, i18n } = useTranslation();
  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved folders', e);
      }
    }
    return [{ id: 'default', name: t('my_scores'), order: 0, isOpen: true }];
  });

  const [scores, setScores] = useState<Score[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({
          ...s,
          isBarMode: s.isBarMode ?? false,
          timeSignatures: s.timeSignatures ?? [{ numerator: 4, denominator: 4, startTime: 0 }],
          keySignatures: s.keySignatures ?? [{ id: `ks-${Date.now()}`, startTime: 0, rootNote: 'Do', mode: 'Jónico (Mayor)', accidentals: [] }],
          clefSignatures: s.clefSignatures ?? [{ id: `cs-${Date.now()}`, startTime: 0, clef: 'treble' }],
          folderId: s.folderId ?? 'default',
          order: s.order ?? 0
        }));
      } catch (e) {
        console.error('Failed to parse saved scores', e);
      }
    }
    return [
      {
        id: crypto.randomUUID(),
        title: t('my_first_score'),
        shape: 'oval',
        notes: [],
        barlines: [],
        manualSystems: 1,
        isBarMode: false,
        timeSignatures: [{ numerator: 4, denominator: 4, startTime: 0 }],
        keySignatures: [{ id: `ks-${Date.now()}`, startTime: 0, rootNote: 'Do', mode: 'Jónico (Mayor)', accidentals: [] }],
        clefSignatures: [{ id: `cs-${Date.now()}`, startTime: 0, clef: 'treble' }],
        folderId: 'default',
        order: 0
      }
    ];
  });
  const [activeScoreId, setActiveScoreId] = useState<string>(scores[0].id);
  const [mode, setMode] = useState<'cursor' | 'text'>('cursor');
  
  // Toolbar state
  const [currentTool, setCurrentTool] = useState<'cursor' | 'barline'>('cursor');
  const [displacementStep, setDisplacementStep] = useState<Duration>('S');
  const [showDisplacementMenu, setShowDisplacementMenu] = useState(false);
  const [currentDuration, setCurrentDuration] = useState<Duration>('N');
  const [currentIsDotted, setCurrentIsDotted] = useState(false);
  const [currentIsTriplet, setCurrentIsTriplet] = useState(false);
  const [currentAlteration, setCurrentAlteration] = useState<Alteration>('');
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [selectedBarlineIds, setSelectedBarlineIds] = useState<string[]>([]);
  const [scoreToDelete, setScoreToDelete] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  // Drag and drop state
  const [draggedScoreId, setDraggedScoreId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverScoreId, setDragOverScoreId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'top' | 'bottom'>('top');
  const [showDPad, setShowDPad] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
  
  // Grid state
  const [gridSubdivision, setGridSubdivision] = useState<GridSubdivision | null>(null);
  const [showGridMenu, setShowGridMenu] = useState(false);
  const [showMidiMenu, setShowMidiMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDynamicsMenu, setShowDynamicsMenu] = useState(false);
  const [showArticulationsMenu, setShowArticulationsMenu] = useState(false);
  const [toolbarViewMode, setToolbarViewMode] = useState<number>(0);
  const [dPadPos, setDPadPos] = useState({ x: 0, y: 0 });
  const [dPadScale, setDPadScale] = useState(1);
  const lastWheelTimeRef = useRef<number>(0);
  
  // Shortcut states
  const dynamicShortcutCountRef = useRef(0);
  const crescendoShortcutCountRef = useRef(0);
  const barlineShortcutCountRef = useRef(0);
  const barlineShortcutIdRef = useRef<{ id: string, startTime: number } | null>(null);
  const dynamicShortcutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const crescendoShortcutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const barlineShortcutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [colorMode, setColorMode] = useState<'blue' | 'red'>('blue');
  const [customRedColors, setCustomRedColors] = useState<Record<Pitch, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('playcolora-custom-red-colors');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse custom colors', e);
        }
      }
    }
    return {
      DO: '#ef4444', // red
      RE: '#f97316', // orange
      MI: '#eab308', // yellow
      FA: '#22c55e', // green
      SOL: '#3b82f6', // blue
      LA: '#a855f7', // purple
      SI: '#ec4899', // pink
    };
  });

  useEffect(() => {
    localStorage.setItem('playcolora-custom-red-colors', JSON.stringify(customRedColors));
  }, [customRedColors]);
  const [isHorizontalView, setIsHorizontalView] = useState(false);
  const [isExtendedStaffView, setIsExtendedStaffView] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('playcolora-tutorial-done') ? -1 : 0;
    }
    return -1;
  });

  const closeTutorial = () => {
    setTutorialStep(-1);
    localStorage.setItem('playcolora-tutorial-done', 'true');
  };

  const nextTutorialStep = () => {
    setTutorialStep(prev => prev + 1);
  };
  const [showSidePiano, setShowSidePiano] = useState(true);
  const [isAutoscrollDisabled, setIsAutoscrollDisabled] = useState(false);
  const [eyeState, setEyeState] = useState({ blink: false, x: 0 });
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [dynamicError, setDynamicError] = useState<string | null>(null);
  const [selectAllState, setSelectAllState] = useState<0 | 1 | 2>(0);
  const dragCounter = useRef(0);
  
  const [draggedNote, setDraggedNote] = useState<{
    id: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    noteX: number;
    noteY: number;
    originalStartTime: number;
    originalPitch: Pitch;
    originalOctave: number;
    systemIndex: number;
  } | null>(null);

  const handleNoteDragStart = (note: Note, systemIndex: number, e: React.PointerEvent) => {
    if (mode !== 'cursor' || currentTool !== 'cursor') return;
    
    const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
    if (!isMultiSelect && !selectedNoteIds.includes(note.id)) {
      setSelectedNoteIds([note.id]);
    }
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    
    setDraggedNote({
      id: note.id,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      noteX: rect.left,
      noteY: rect.top,
      originalStartTime: note.startTime,
      originalPitch: note.pitch,
      originalOctave: note.octave,
      systemIndex
    });
    
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn('Failed to set pointer capture', err);
    }
  };

  const handleMidiFilesDrop = useCallback(async (files: File[]) => {
    const newScores: Score[] = [];
    
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const midi = new Midi(arrayBuffer);
        const scoreName = file.name.replace(/\.[^/.]+$/, "");
        
        const notes: Note[] = [];
        const ppq = midi.header.ppq;
        const ticksPerSemicorchea = ppq / 4;

        midi.tracks.forEach(track => {
          track.notes.forEach(midiNote => {
            const startTime = Math.round(midiNote.ticks / ticksPerSemicorchea);
            const durationTicks = midiNote.durationTicks;
            const durationUnits = Math.round(durationTicks / ticksPerSemicorchea);
            
            let duration: Duration = 'N';
            let isDotted = false;
            
            if (durationUnits <= 1) duration = 'S';
            else if (durationUnits <= 2) duration = 'C';
            else if (durationUnits <= 4) duration = 'N';
            else if (durationUnits <= 8) duration = 'B';
            else duration = 'R';

            const pitchIndex = midiNote.midi % 12;
            const pitchMap: { pitch: Pitch, alteration: Alteration }[] = [
              { pitch: 'DO', alteration: '' },
              { pitch: 'DO', alteration: '#' },
              { pitch: 'RE', alteration: '' },
              { pitch: 'RE', alteration: '#' },
              { pitch: 'MI', alteration: '' },
              { pitch: 'FA', alteration: '' },
              { pitch: 'FA', alteration: '#' },
              { pitch: 'SOL', alteration: '' },
              { pitch: 'SOL', alteration: '#' },
              { pitch: 'LA', alteration: '' },
              { pitch: 'LA', alteration: '#' },
              { pitch: 'SI', alteration: '' },
            ];
            
            const { pitch, alteration } = pitchMap[pitchIndex];
            const octave = Math.floor(midiNote.midi / 12) - 1;

            notes.push({
              id: crypto.randomUUID(),
              pitch,
              alteration,
              duration,
              octave,
              startTime,
              isDotted
            });
          });
        });

        const newScore: Score = {
          id: crypto.randomUUID(),
          title: scoreName,
          shape: 'oval',
          notes,
          barlines: [],
          manualSystems: 1,
          isBarMode: false,
          timeSignatures: [{ numerator: 4, denominator: 4, startTime: 0 }],
          keySignatures: [{ id: `ks-${Date.now()}`, startTime: 0, rootNote: 'Do', mode: 'Jónico (Mayor)', accidentals: [] }],
          clefSignatures: [{ id: `cs-${Date.now()}`, startTime: 0, clef: 'treble' }],
          folderId: 'default',
          order: scores.length + newScores.length,
          measuresPerSystem: DEFAULT_MEASURES_PER_SYSTEM
        };
        newScores.push(newScore);
      } catch (err) {
        console.error('Error parsing MIDI file:', file.name, err);
      }
    }

    if (newScores.length > 0) {
      setScores(prev => [...prev, ...newScores]);
      setActiveScoreId(newScores[0].id);
    }
  }, [scores.length]);

  const handleGlobalDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!showMidiMenu) return;
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsGlobalDragging(true);
    }
  }, [showMidiMenu]);

  const handleGlobalDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!showMidiMenu) return;
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsGlobalDragging(false);
    }
  }, [showMidiMenu]);

  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!showMidiMenu) return;
    setIsGlobalDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    const midiFiles = files.filter(file => /\.(mid|midi)$/i.test(file.name));
    
    if (midiFiles.length > 0) {
      handleMidiFilesDrop(midiFiles);
    }
  }, [handleMidiFilesDrop, showMidiMenu]);

  const applySystemLayout = useCallback(() => {
    setScores(prev => prev.map(s => {
      if (s.id === activeScoreId) {
        const currentMeasures = s.measuresPerSystem || DEFAULT_MEASURES_PER_SYSTEM;
        return { 
          ...s, 
          measuresPerSystem: currentMeasures,
          layoutConfig: {
            ...s.layoutConfig,
            prevMeasuresPerSystem: currentMeasures
          }
        };
      }
      return s;
    }));
  }, [activeScoreId]);

  useEffect(() => {
    // Force note insertion mode on startup
    setScores(prev => prev.map(s => s.id === activeScoreId ? { ...s, isBarMode: false } : s));
    setCurrentTool('cursor');
    setMode('cursor');
  }, []);

  useEffect(() => {
    if (!isHorizontalView) {
      applySystemLayout();
    }
  }, [isHorizontalView, applySystemLayout]);

  useEffect(() => {
    const interval = setInterval(() => {
      const rand = Math.random();
      if (rand > 0.6) {
        setEyeState(prev => ({ ...prev, blink: true }));
        setTimeout(() => setEyeState(prev => ({ ...prev, blink: false })), 150);
      } else if (rand > 0.3) {
        const newX = (Math.random() - 0.5) * 4;
        setEyeState(prev => ({ ...prev, x: newX }));
        setTimeout(() => setEyeState(prev => ({ ...prev, x: 0 })), 1000);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Selection mode state

  // Selection box state
  const [selectionBox, setSelectionBox] = useState<{startX: number, startY: number, endX: number, endY: number} | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  
  // Clipboard and History
  const clipboardRef = React.useRef<{ notes: Note[], barlines: Barline[], minTime: number } | null>(null);
  const historyRef = React.useRef<Score[][]>([]);
  const futureRef = React.useRef<Score[][]>([]);
  const scoresRef = React.useRef<Score[]>(scores);

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  useEffect(() => {
    // Initial snapshot
    historyRef.current.push(scoresRef.current);
    
    const interval = setInterval(() => {
      historyRef.current.push(scoresRef.current);
      if (historyRef.current.length > 50) {
        historyRef.current.shift();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Text mode state
  const [textValue, setTextValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobilePlaybackOpen, setIsMobilePlaybackOpen] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [isMascotHovered, setIsMascotHovered] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const activeScore = scores.find(s => s.id === activeScoreId) || scores[0];

  const { 
    isPlaying, 
    currentNoteIds, 
    tempo, 
    setTempo, 
    volume, 
    setVolume, 
    instrument, 
    setInstrument, 
    isMetronomeEnabled,
    setIsMetronomeEnabled,
    metronomeRhythm,
    setMetronomeRhythm,
    isMetronomeDotted,
    setIsMetronomeDotted,
    metronomeSound,
    setMetronomeSound,
    metronomeVolume,
    setMetronomeVolume,
    playbackError,
    setPlaybackError,
    play, 
    playSingleNote,
    stop,
    currentPlaybackTime
  } = usePlayback({
    notes: activeScore.notes,
    barlines: activeScore.barlines || [],
    timeSignatures: activeScore.timeSignatures || [],
    keySignatures: activeScore.keySignatures || [],
    isBarMode: activeScore.isBarMode || false
  });

  const handleTempoChange = (newTempo: number) => {
    setTempo(newTempo);
    if (!Number.isNaN(newTempo)) {
      updateActiveScore({ tempo: newTempo });
    }
  };

  useEffect(() => {
    if (activeScore.tempo && !Number.isNaN(activeScore.tempo)) {
      setTempo(activeScore.tempo);
    } else {
      setTempo(120);
    }
  }, [activeScoreId]); // Sync tempo when switching scores

  const [isExporting, setIsExporting] = useState(false);

  // Calculate number of systems needed
  const systemBoundaries = useMemo(() => getSystemBoundaries(activeScore, isHorizontalView && !isExporting), [activeScore, isHorizontalView, isExporting]);
  const numSystems = systemBoundaries.length;

  const scoreContainerRef = useRef<HTMLDivElement>(null);
  const dynamicsButtonRef = useRef<HTMLButtonElement>(null);
  const articulationsButtonRef = useRef<HTMLButtonElement>(null);
  const midiButtonRef = useRef<HTMLButtonElement>(null);
  const midiMenuRef = useRef<HTMLDivElement>(null);
  const gridButtonRef = useRef<HTMLButtonElement>(null);
  const gridMenuRef = useRef<HTMLDivElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const displacementButtonRef = useRef<HTMLButtonElement>(null);
  const displacementMenuRef = useRef<HTMLDivElement>(null);
  const tutorialStep1Ref = useRef<HTMLButtonElement>(null);
  const tutorialStep2Ref = useRef<HTMLButtonElement>(null);

  const lastScrollTargetRef = useRef({ x: 0, y: 0 });
  const scrollAnimationRef = useRef<number | null>(null);
  const userScrollTimeRef = useRef(0);

  const handleUserScroll = () => {
    userScrollTimeRef.current = Date.now();
  };

  // Autoscroll logic - update X and Y target continuously based on time and system
  useEffect(() => {
    if (isPlaying && scoreContainerRef.current && !isAutoscrollDisabled) {
      const container = scoreContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      
      const systemIndex = systemBoundaries.findIndex(b => currentPlaybackTime >= b.startTime && currentPlaybackTime < b.endTime);
      
      if (systemIndex !== -1) {
        const systemElement = document.getElementById(`system-${systemIndex}`);
        if (systemElement) {
          const systemRect = systemElement.getBoundingClientRect();
          const timeInSystem = currentPlaybackTime - systemBoundaries[systemIndex].startTime;
          
          // Approximate X offset within the system
          // 51 is CLEF_WIDTH, 16 is UNIT_WIDTH
          const xOffset = 51 + timeInSystem * 16;
          
          const absoluteLeft = systemRect.left - containerRect.left + container.scrollLeft + xOffset;
          lastScrollTargetRef.current.x = Math.max(0, absoluteLeft - (containerRect.width / 2));
          
          // Y target is the center of the current system
          const absoluteTop = systemRect.top - containerRect.top + container.scrollTop + (systemRect.height / 2);
          lastScrollTargetRef.current.y = Math.max(0, absoluteTop - (containerRect.height / 2));
        }
      }
    }
  }, [isPlaying, currentPlaybackTime, systemBoundaries, isAutoscrollDisabled]);

  // Continuous smooth scroll loop
  useEffect(() => {
    if (!isPlaying || isAutoscrollDisabled) {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
      return;
    }

    const smoothScroll = () => {
      const container = scoreContainerRef.current;
      if (!container) return;

      // If user scrolled recently, pause autoscroll for 2 seconds
      if (Date.now() - userScrollTimeRef.current < 2000) {
        scrollAnimationRef.current = requestAnimationFrame(smoothScroll);
        return;
      }

      const target = lastScrollTargetRef.current;
      const currentX = container.scrollLeft;
      const currentY = container.scrollTop;
      
      // Interpolation factors based on BPM (tempo)
      // Base tempo is 120. If tempo is higher, it scrolls faster to keep up.
      const tempoMultiplier = tempo / 120;
      
      // X tracks the playback time smoothly.
      // Y makes fast and precise jumps between systems.
      const lerpFactorX = Math.min(0.5, 0.2 * tempoMultiplier);
      const lerpFactorY = Math.min(0.8, 0.4 * tempoMultiplier);
      
      const nextX = currentX + (target.x - currentX) * lerpFactorX;
      const nextY = currentY + (target.y - currentY) * lerpFactorY;
      
      // Only apply if the difference is noticeable to avoid micro-jitters
      if (Math.abs(target.x - currentX) > 0.5) {
        container.scrollLeft = nextX;
      }
      if (Math.abs(target.y - currentY) > 0.5) {
        container.scrollTop = nextY;
      }
      
      scrollAnimationRef.current = requestAnimationFrame(smoothScroll);
    };

    scrollAnimationRef.current = requestAnimationFrame(smoothScroll);

    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, [isPlaying, tempo, isAutoscrollDisabled]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    if (mode === 'text') {
      setTextValue(generateTextFromNotes(activeScore.notes, activeScore.isBarMode ? activeScore.barlines : activeScore.phraseBarlines, activeScore.keySignatures));
    }
  }, [mode, activeScoreId]); // Sync text when switching modes or scores

  const moveNotes = (dTime: number, dPitch: number) => {
    if (selectedNoteIds.length === 0 || mode !== 'cursor') return;
    
    const notesToMove = activeScore.notes.filter(n => selectedNoteIds.includes(n.id));
    if (notesToMove.length === 0) return;

    const actualDTime = dTime * DURATION_UNITS[displacementStep];

    // Check boundaries
    const minStartTime = Math.min(...notesToMove.map(n => n.startTime));
    let finalDTime = actualDTime;
    if (minStartTime + finalDTime < 0) finalDTime = -minStartTime; // Prevent moving before 0

    const updatedNotes = activeScore.notes.map(n => {
      if (selectedNoteIds.includes(n.id)) {
        const absolutePitch = n.octave * 7 + PITCH_VALUES[n.pitch] + dPitch;
        let newOctave = Math.floor(absolutePitch / 7);
        let pitchValue = absolutePitch % 7;
        if (pitchValue < 0) pitchValue += 7;
        
        // Clamp octave to prevent notes from going off-screen
        newOctave = Math.max(0, Math.min(8, newOctave));
        
        return {
          ...n,
          startTime: Math.max(0, n.startTime + finalDTime),
          octave: newOctave,
          pitch: VALUE_TO_PITCH[pitchValue] as Pitch
        };
      }
      return n;
    });
    
    updateActiveScore({ notes: updatedNotes });
  };

  const moveBarlines = (dTime: number) => {
    barlineShortcutIdRef.current = null;
    barlineShortcutCountRef.current = 0;
    if (barlineShortcutTimerRef.current) clearTimeout(barlineShortcutTimerRef.current);

    if (selectedBarlineIds.length === 0 || mode !== 'cursor' || activeScore.isBarMode) return;
    
    const barlinesToMove = (activeScore.phraseBarlines || []).filter(b => selectedBarlineIds.includes(b.id));
    if (barlinesToMove.length === 0) return;

    const actualDTime = dTime * DURATION_UNITS[displacementStep];

    // Check boundaries
    const minStartTime = Math.min(...barlinesToMove.map(b => b.startTime));
    let finalDTime = actualDTime;
    if (minStartTime + finalDTime < 0) finalDTime = -minStartTime; // Prevent moving before 0

    const updatedBarlines = (activeScore.phraseBarlines || []).map(b => {
      if (selectedBarlineIds.includes(b.id)) {
        return {
          ...b,
          startTime: Math.max(0, b.startTime + finalDTime)
        };
      }
      return b;
    });
    
    updateActiveScore({ phraseBarlines: updatedBarlines });
  };

  const copyToClipboard = () => {
    const notesToCopy = activeScore.notes.filter(n => selectedNoteIds.includes(n.id));
    const barlinesToCopy = activeScore.isBarMode 
      ? (activeScore.barlines || []).filter(b => selectedBarlineIds.includes(b.id))
      : (activeScore.phraseBarlines || []).filter(b => selectedBarlineIds.includes(b.id));
    if (notesToCopy.length > 0 || barlinesToCopy.length > 0) {
      const minNoteTime = notesToCopy.length > 0 ? Math.min(...notesToCopy.map(n => n.startTime)) : Infinity;
      const minBarlineTime = barlinesToCopy.length > 0 ? Math.min(...barlinesToCopy.map(b => b.startTime)) : Infinity;
      const minTime = Math.min(minNoteTime, minBarlineTime);
      clipboardRef.current = { notes: notesToCopy, barlines: barlinesToCopy, minTime };
    }
  };

  const cutToClipboard = () => {
    copyToClipboard();
    if (selectedNoteIds.length > 0) deleteNotes(selectedNoteIds);
    if (selectedBarlineIds.length > 0) deleteBarlines(selectedBarlineIds);
  };

  const pasteFromClipboard = () => {
    if (clipboardRef.current) {
      const { notes: clipNotes, barlines: clipBarlines, minTime } = clipboardRef.current;
      
      let pasteTime = 0;
      if (selectedNoteIds.length > 0) {
        const selectedNotes = activeScore.notes.filter(n => selectedNoteIds.includes(n.id));
        pasteTime = Math.max(...selectedNotes.map(n => n.startTime + getDurationValue(n.duration, n.isDotted, n.isTriplet)));
      } else {
        const allNotes = activeScore.notes;
        pasteTime = allNotes.length > 0 ? Math.max(...allNotes.map(n => n.startTime + getDurationValue(n.duration, n.isDotted, n.isTriplet))) : 0;
      }

      const timeOffset = pasteTime - minTime;
      
      const groupIdMap = new Map<string, string>();
      const idMap = new Map<string, string>();
      
      const newNotes = clipNotes.map(n => {
        let newGroupId = n.tripletGroupId;
        if (n.isTriplet && n.tripletGroupId) {
          if (!groupIdMap.has(n.tripletGroupId)) {
            groupIdMap.set(n.tripletGroupId, crypto.randomUUID());
          }
          newGroupId = groupIdMap.get(n.tripletGroupId);
        }
        const newId = crypto.randomUUID();
        idMap.set(n.id, newId);
        return {
          ...n,
          id: newId,
          startTime: n.startTime + timeOffset,
          tripletGroupId: newGroupId,
          ...(n.tripletStartTime !== undefined ? { tripletStartTime: n.tripletStartTime + timeOffset } : {})
        };
      });
      
      const updatedNewNotes = newNotes.map(n => {
        if (n.glissandoTargetId && idMap.has(n.glissandoTargetId)) {
          return { ...n, glissandoTargetId: idMap.get(n.glissandoTargetId) };
        } else if (n.glissandoTargetId) {
          const { glissandoTargetId, ...rest } = n;
          return rest;
        }
        return n;
      });
      
      const newBarlines = clipBarlines.map(b => ({
        ...b,
        id: crypto.randomUUID(),
        startTime: b.startTime + timeOffset
      }));

      if (activeScore.isBarMode) {
        updateActiveScore({
          notes: [...activeScore.notes, ...updatedNewNotes],
          barlines: [...(activeScore.barlines || []), ...newBarlines]
        });
      } else {
        updateActiveScore({
          notes: [...activeScore.notes, ...updatedNewNotes],
          phraseBarlines: [...(activeScore.phraseBarlines || []), ...newBarlines]
        });
      }
      
      setSelectedNoteIds(updatedNewNotes.map(n => n.id));
      setSelectedBarlineIds(newBarlines.map(b => b.id));
    }
  };



  const undo = () => {
    barlineShortcutIdRef.current = null;
    barlineShortcutCountRef.current = 0;
    if (barlineShortcutTimerRef.current) clearTimeout(barlineShortcutTimerRef.current);

    if (historyRef.current.length > 1) {
      const currentState = historyRef.current.pop();
      if (currentState) {
        futureRef.current.push(currentState);
      }
      const prevState = historyRef.current[historyRef.current.length - 1];
      setScores(prevState);
      setSelectedNoteIds([]);
      setSelectedBarlineIds([]);
    }
  };

  const redo = () => {
    barlineShortcutIdRef.current = null;
    barlineShortcutCountRef.current = 0;
    if (barlineShortcutTimerRef.current) clearTimeout(barlineShortcutTimerRef.current);

    if (futureRef.current.length > 0) {
      const nextState = futureRef.current.pop();
      if (nextState) {
        historyRef.current.push(nextState);
        setScores(nextState);
        setSelectedNoteIds([]);
        setSelectedBarlineIds([]);
      }
    }
  };

  const [showMetronomeSettings, setShowMetronomeSettings] = useState(false);
  const metronomeSettingsRef = useRef<HTMLDivElement>(null);

  // Close metronome settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (metronomeSettingsRef.current && !metronomeSettingsRef.current.contains(event.target as Node)) {
        setShowMetronomeSettings(false);
      }
      if (
        showGridMenu &&
        gridMenuRef.current &&
        !gridMenuRef.current.contains(event.target as Node) &&
        gridButtonRef.current &&
        !gridButtonRef.current.contains(event.target as Node)
      ) {
        setShowGridMenu(false);
      }
      if (
        showMidiMenu &&
        midiMenuRef.current &&
        !midiMenuRef.current.contains(event.target as Node) &&
        midiButtonRef.current &&
        !midiButtonRef.current.contains(event.target as Node)
      ) {
        setShowMidiMenu(false);
      }
      if (
        showExportMenu &&
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node) &&
        exportButtonRef.current &&
        !exportButtonRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
      if (
        showDisplacementMenu &&
        displacementMenuRef.current &&
        !displacementMenuRef.current.contains(event.target as Node) &&
        displacementButtonRef.current &&
        !displacementButtonRef.current.contains(event.target as Node)
      ) {
        setShowDisplacementMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showGridMenu, showMidiMenu, showExportMenu, showDisplacementMenu]);

  const updateActiveScore = (updates: Partial<Score> | ((prev: Score) => Partial<Score>)) => {
    setScores(prevScores => {
      const activeScore = prevScores.find(s => s.id === activeScoreId);
      if (!activeScore) return prevScores;
      
      const resolvedUpdates = typeof updates === 'function' ? updates(activeScore) : updates;
      const newScores = prevScores.map(s => s.id === activeScoreId ? { ...s, ...resolvedUpdates } : s);
      
      // Push to history on significant changes
      if (resolvedUpdates.notes || resolvedUpdates.barlines || resolvedUpdates.timeSignatures) {
        historyRef.current.push(newScores);
        if (historyRef.current.length > 50) historyRef.current.shift();
        futureRef.current = []; // Clear redo history
      }
      return newScores;
    });
  };

  useEffect(() => {
    if (!draggedNote) return;

    const handlePointerMove = (e: PointerEvent) => {
      setDraggedNote(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!draggedNote) return;
      
      try {
        if (e.target instanceof HTMLElement && e.target.hasPointerCapture(e.pointerId)) {
          e.target.releasePointerCapture(e.pointerId);
        }
      } catch (err) {
        // ignore
      }
      
      const dx = e.clientX - draggedNote.startX;
      const dy = e.clientY - draggedNote.startY;
      
      // Calculate time shift based on displacementStep
      const stepWidth = DURATION_UNITS[displacementStep] * UNIT_WIDTH;
      const stepsX = Math.round(dx / stepWidth);
      const timeShift = stepsX * DURATION_UNITS[displacementStep];
      
      // Calculate pitch shift
      const stepsY = Math.round(-dy / PITCH_HEIGHT);
      
      if (timeShift !== 0 || stepsY !== 0) {
        const updatedNotes = activeScore.notes.map(n => {
          if (selectedNoteIds.includes(n.id)) {
            const absolutePitch = n.octave * 7 + PITCH_VALUES[n.pitch] + stepsY;
            let newOctave = Math.floor(absolutePitch / 7);
            let pitchValue = absolutePitch % 7;
            if (pitchValue < 0) pitchValue += 7;
            
            newOctave = Math.max(0, Math.min(8, newOctave));
            
            return {
              ...n,
              startTime: Math.max(0, n.startTime + timeShift),
              octave: newOctave,
              pitch: VALUE_TO_PITCH[pitchValue] as Pitch
            };
          }
          return n;
        });
        
        updateActiveScore({ notes: updatedNotes });
      }
      
      setDraggedNote(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggedNote, activeScore, selectedNoteIds, displacementStep, updateActiveScore]);

  const updateTimeSignature = (startTime: number, numerator: number, denominator: number) => {
    setScores(prevScores => {
      const active = prevScores.find(s => s.id === activeScoreId);
      if (!active) return prevScores;
      const existingTS = active.timeSignatures || [];
      const filtered = existingTS.filter(ts => ts.startTime !== startTime);
      const newTimeSignatures = [...filtered, { startTime, numerator, denominator }].sort((a, b) => a.startTime - b.startTime);
      const newScores = prevScores.map(s => s.id === activeScoreId ? { ...s, timeSignatures: newTimeSignatures } : s);
      
      historyRef.current.push(newScores);
      if (historyRef.current.length > 50) historyRef.current.shift();
      futureRef.current = [];
      
      return newScores;
    });
  };

  const deleteTimeSignature = (startTime: number) => {
    if (startTime === 0) return; // Cannot delete the initial time signature
    setScores(prevScores => {
      const active = prevScores.find(s => s.id === activeScoreId);
      if (!active) return prevScores;
      const existingTS = active.timeSignatures || [];
      const filtered = existingTS.filter(ts => ts.startTime !== startTime);
      const newScores = prevScores.map(s => s.id === activeScoreId ? { ...s, timeSignatures: filtered } : s);
      
      historyRef.current.push(newScores);
      if (historyRef.current.length > 50) historyRef.current.shift();
      futureRef.current = [];
      
      return newScores;
    });
  };

  const updateClefSignature = (startTime: number, clef: 'treble' | 'bass' | 'alto') => {
    setScores(prevScores => {
      const active = prevScores.find(s => s.id === activeScoreId);
      if (!active) return prevScores;
      const existingCS = active.clefSignatures || [];
      const filtered = existingCS.filter(cs => cs.startTime !== startTime);
      const newClefSignatures = [...filtered, { id: `cs-${Date.now()}`, startTime, clef }].sort((a, b) => a.startTime - b.startTime);
      const newScores = prevScores.map(s => s.id === activeScoreId ? { ...s, clefSignatures: newClefSignatures } : s);
      
      historyRef.current.push(newScores);
      if (historyRef.current.length > 50) historyRef.current.shift();
      futureRef.current = [];
      
      return newScores;
    });
  };

  const deleteClefSignature = (startTime: number) => {
    if (startTime === 0) return; // Cannot delete the initial clef signature
    setScores(prevScores => {
      const active = prevScores.find(s => s.id === activeScoreId);
      if (!active) return prevScores;
      const existingCS = active.clefSignatures || [];
      const filtered = existingCS.filter(cs => cs.startTime !== startTime);
      const newScores = prevScores.map(s => s.id === activeScoreId ? { ...s, clefSignatures: filtered } : s);
      
      historyRef.current.push(newScores);
      if (historyRef.current.length > 50) historyRef.current.shift();
      futureRef.current = [];
      
      return newScores;
    });
  };

  const updateKeySignature = (startTime: number, rootNote: string, mode: string) => {
    import('./utils/keySignatures').then(({ getAccidentalsForMode }) => {
      const accidentals = getAccidentalsForMode(rootNote, mode);
      
      setScores(prevScores => {
        const active = prevScores.find(s => s.id === activeScoreId);
        if (!active) return prevScores;
        const existingKS = active.keySignatures || [];
        const filtered = existingKS.filter(ks => ks.startTime !== startTime);
        const newKeySignatures = [...filtered, { id: `ks-${Date.now()}`, startTime, rootNote, mode, accidentals }].sort((a, b) => a.startTime - b.startTime);
        const newScores = prevScores.map(s => s.id === activeScoreId ? { ...s, keySignatures: newKeySignatures } : s);
        
        historyRef.current.push(newScores);
        if (historyRef.current.length > 50) historyRef.current.shift();
        futureRef.current = [];
        
        return newScores;
      });
    });
  };

  const deleteKeySignature = (startTime: number) => {
    if (startTime === 0) return; // Cannot delete the initial key signature
    setScores(prevScores => {
      const active = prevScores.find(s => s.id === activeScoreId);
      if (!active) return prevScores;
      const existingKS = active.keySignatures || [];
      const filtered = existingKS.filter(ks => ks.startTime !== startTime);
      const newScores = prevScores.map(s => s.id === activeScoreId ? { ...s, keySignatures: filtered } : s);
      
      historyRef.current.push(newScores);
      if (historyRef.current.length > 50) historyRef.current.shift();
      futureRef.current = [];
      
      return newScores;
    });
  };

  const handleBarlineShortcut = () => {
    const currentSelectedId = barlineShortcutIdRef.current?.id || (selectedBarlineIds.length === 1 ? selectedBarlineIds[0] : null);
    
    if (currentSelectedId) {
      if (barlineShortcutTimerRef.current) clearTimeout(barlineShortcutTimerRef.current);
      barlineShortcutCountRef.current = (barlineShortcutCountRef.current % 6) + 1;
      const count = barlineShortcutCountRef.current;

      const barlineId = currentSelectedId;
      let startTime = -1;
      let isAuto = false;
      
      if (barlineShortcutIdRef.current && barlineShortcutIdRef.current.id === barlineId) {
        startTime = barlineShortcutIdRef.current.startTime;
      } else if (barlineId.startsWith('auto-')) {
        startTime = parseFloat(barlineId.split('-')[1]);
        isAuto = true;
      } else {
        const barline = activeScore.barlines?.find(b => b.id === barlineId);
        if (barline) startTime = barline.startTime;
      }
      
      if (startTime > 0) {
        let newSelectedBarlineId = isAuto ? crypto.randomUUID() : barlineId;
        if (count === 1 || count === 2 || count === 3 || count === 6) {
          newSelectedBarlineId = `auto-${startTime}`;
        }
        barlineShortcutIdRef.current = { id: newSelectedBarlineId, startTime };

        setScores(prevScores => {
          const active = prevScores.find(s => s.id === activeScoreId);
          if (!active) return prevScores;
          
          let newTimeSignatures = (active.timeSignatures || []).filter(ts => ts.startTime !== startTime);
          let newKeySignatures = (active.keySignatures || []).filter(ks => ks.startTime !== startTime);
          let newClefSignatures = (active.clefSignatures || []).filter(cs => cs.startTime !== startTime);
          
          let newBarlines = active.barlines || [];
          
          const barlineExists = newBarlines.some(b => b.id === newSelectedBarlineId || b.startTime === startTime);
          
          if (!barlineExists) {
            const newBarline: Barline = {
              id: newSelectedBarlineId,
              startTime
            };
            newBarlines = [...newBarlines, newBarline];
          }

          // Update the specific barline type
          newBarlines = newBarlines.map(b => {
            if (b.id === newSelectedBarlineId || b.startTime === startTime) {
              let type: 'single' | 'double' | 'repeat-start' | 'repeat-end' | 'repeat-both' = 'single';
              if (count === 4) type = 'repeat-start';
              if (count === 5) type = 'repeat-end';
              return { ...b, type };
            }
            return b;
          });

          // Filter out single barlines (they revert to automatic barlines)
          newBarlines = newBarlines.filter(b => b.type !== 'single' && b.type !== undefined);

          if (count === 1) {
            newTimeSignatures = [...newTimeSignatures, { startTime, numerator: 4, denominator: 4 }].sort((a, b) => a.startTime - b.startTime);
          } else if (count === 2) {
            newKeySignatures = [...newKeySignatures, { id: crypto.randomUUID(), startTime, rootNote: 'C', mode: 'Ionian', accidentals: [] }].sort((a, b) => a.startTime - b.startTime);
          } else if (count === 3) {
            newClefSignatures = [...newClefSignatures, { id: crypto.randomUUID(), startTime, clef: 'treble' as ClefType }].sort((a, b) => a.startTime - b.startTime);
          }
          
          const newScores = prevScores.map(s => s.id === activeScoreId ? { 
            ...s, 
            timeSignatures: newTimeSignatures, 
            keySignatures: newKeySignatures,
            clefSignatures: newClefSignatures,
            barlines: newBarlines 
          } : s);
          
          historyRef.current.push(newScores);
          if (historyRef.current.length > 50) historyRef.current.shift();
          futureRef.current = [];
          
          return newScores;
        });

        setSelectedBarlineIds([newSelectedBarlineId]);
      }

      barlineShortcutTimerRef.current = setTimeout(() => {
        barlineShortcutCountRef.current = 0;
        barlineShortcutIdRef.current = null;
      }, 1500);
    }
  };

  const addNote = (startTime: number, octave: number, pitch: Pitch, tripletGroupId?: string) => {
    setSelectAllState(0);
    if (tripletGroupId) {
      // Find the group to match its duration
      const groupNote = activeScore.notes.find(n => n.tripletGroupId === tripletGroupId);
      const durationToUse = groupNote ? groupNote.duration : currentDuration;
      const isDottedToUse = groupNote ? groupNote.isDotted : currentIsDotted;
      
      const newNote: Note = {
        id: crypto.randomUUID(),
        pitch,
        alteration: currentAlteration,
        duration: durationToUse,
        isDotted: isDottedToUse,
        isTriplet: true,
        tripletGroupId: tripletGroupId,
        tripletStartTime: groupNote?.tripletStartTime,
        octave,
        startTime
      };
      updateActiveScore({ notes: [...activeScore.notes, newNote] });
      setSelectedNoteIds([newNote.id]);
    } else if (currentIsTriplet) {
      const groupId = crypto.randomUUID();
      const D = getDurationValue(currentDuration, currentIsDotted);
      
      const newNote1: Note = {
        id: crypto.randomUUID(),
        pitch,
        alteration: currentAlteration,
        duration: currentDuration,
        isDotted: currentIsDotted,
        isTriplet: true,
        tripletGroupId: groupId,
        tripletStartTime: startTime,
        octave,
        startTime
      };
      const newNote2: Note = { ...newNote1, id: crypto.randomUUID(), startTime: startTime + D * 2/3 };
      const newNote3: Note = { ...newNote1, id: crypto.randomUUID(), startTime: startTime + D * 4/3 };
      
      updateActiveScore({ notes: [...activeScore.notes, newNote1, newNote2, newNote3] });
      setSelectedNoteIds([newNote1.id]);
    } else {
      const newNote: Note = {
        id: crypto.randomUUID(),
        pitch,
        alteration: currentAlteration,
        duration: currentDuration,
        isDotted: currentIsDotted,
        octave,
        startTime
      };
      updateActiveScore({ notes: [...activeScore.notes, newNote] });
      setSelectedNoteIds([newNote.id]);
    }
  };

  const addBarline = (startTime: number) => {
    if (activeScore.isBarMode) return;
    const newBarline: Barline = {
      id: crypto.randomUUID(),
      startTime
    };
    updateActiveScore({ phraseBarlines: [...(activeScore.phraseBarlines || []), newBarline] });
  };

  const deleteSelected = () => {
    barlineShortcutIdRef.current = null;
    barlineShortcutCountRef.current = 0;
    if (barlineShortcutTimerRef.current) clearTimeout(barlineShortcutTimerRef.current);

    setSelectAllState(0);
    if (currentTool === 'cursor') {
      if (selectedNoteIds.length > 0) deleteNotes(selectedNoteIds);
    } else if (currentTool === 'barline') {
      if (selectedBarlineIds.length > 0 && !activeScore.isBarMode) deleteBarlines(selectedBarlineIds);
    }
  };

  const deleteNotes = (ids: string[]) => {
    updateActiveScore({
      notes: activeScore.notes
        .filter(n => !ids.includes(n.id))
        .map(n => {
          if (n.glissandoTargetId && ids.includes(n.glissandoTargetId)) {
            const { glissandoTargetId, ...rest } = n;
            return rest;
          }
          return n;
        }),
      dynamicTransitions: (activeScore.dynamicTransitions || []).filter(t => !ids.includes(t.startNoteId) && !ids.includes(t.endNoteId))
    });
    setSelectedNoteIds([]);
  };

  const updateBarline = (id: string, updates: Partial<Barline>) => {
    updateActiveScore(prevScore => {
      let newBarlines = [...(prevScore.barlines || [])];
      const existingIndex = newBarlines.findIndex(b => b.id === id);
      
      let startTime = -1;
      if (existingIndex >= 0) {
        startTime = newBarlines[existingIndex].startTime;
        newBarlines[existingIndex] = { ...newBarlines[existingIndex], ...updates };
        if (newBarlines[existingIndex].type === 'single' || !newBarlines[existingIndex].type) {
          newBarlines.splice(existingIndex, 1);
        }
      } else if (id.startsWith('auto-') || id.startsWith('ts-')) {
        startTime = parseFloat(id.split('-')[1]);
        if (updates.type && updates.type !== 'single') {
          const cleanId = id.replace('-ghost-start', '').replace('-ghost-end', '');
          const cleanIndex = newBarlines.findIndex(b => b.id === cleanId);
          if (cleanIndex >= 0) {
            newBarlines[cleanIndex] = { ...newBarlines[cleanIndex], ...updates };
          } else {
            newBarlines.push({
              id: cleanId,
              startTime,
              ...updates
            });
          }
        }
      }
      
      if (updates.type === 'single' && startTime >= 0) {
        // Remove time signature, key signature, clef signature at this startTime
        const newTimeSignatures = (prevScore.timeSignatures || []).filter(ts => ts.startTime !== startTime);
        const newKeySignatures = (prevScore.keySignatures || []).filter(ks => ks.startTime !== startTime);
        const newClefSignatures = (prevScore.clefSignatures || []).filter(cs => cs.startTime !== startTime);
        
        return { 
          barlines: newBarlines,
          timeSignatures: newTimeSignatures,
          keySignatures: newKeySignatures,
          clefSignatures: newClefSignatures
        };
      }
      
      return { barlines: newBarlines };
    });
  };

  const deleteBarlines = (ids: string[]) => {
    barlineShortcutIdRef.current = null;
    barlineShortcutCountRef.current = 0;
    if (barlineShortcutTimerRef.current) clearTimeout(barlineShortcutTimerRef.current);

    const barlineIds = ids.filter(id => !id.startsWith('ts-'));
    const tsIdsFromSelection = ids.filter(id => id.startsWith('ts-')).map(id => parseInt(id.split('-')[1]));
    
    const barlinesToDelete = (activeScore.phraseBarlines || []).filter(b => barlineIds.includes(b.id));
    const startTimesToDelete = barlinesToDelete.map(b => b.startTime);
    
    const allTsIdsToDelete = [...tsIdsFromSelection, ...startTimesToDelete];
    
    updateActiveScore({
      phraseBarlines: (activeScore.phraseBarlines || []).filter(b => !barlineIds.includes(b.id)),
      barlines: (activeScore.barlines || []).filter(b => !barlineIds.includes(b.id)),
      timeSignatures: (activeScore.timeSignatures || []).filter(ts => !allTsIdsToDelete.includes(ts.startTime))
    });
    setSelectedBarlineIds([]);
  };

  const deleteSystem = (systemIndex: number) => {
    const boundaries = getSystemBoundaries(activeScore, isHorizontalView);
    if (systemIndex >= boundaries.length) return;
    
    const { startTime: startT, endTime: endT } = boundaries[systemIndex];
    const duration = endT - startT;
    
    const newNotes = activeScore.notes
      .filter(n => n.startTime < startT || n.startTime >= endT)
      .map(n => n.startTime >= endT ? { ...n, startTime: n.startTime - duration } : n);
      
    const newBarlines = (activeScore.barlines || [])
      .filter(b => b.startTime < startT || b.startTime >= endT)
      .map(b => b.startTime >= endT ? { ...b, startTime: b.startTime - duration } : b);
      
    const newPhraseBarlines = (activeScore.phraseBarlines || [])
      .filter(b => b.startTime < startT || b.startTime >= endT)
      .map(b => b.startTime >= endT ? { ...b, startTime: b.startTime - duration } : b);
      
    const newTimeSignatures = (activeScore.timeSignatures || [])
      .filter(ts => ts.startTime < startT || ts.startTime >= endT)
      .map(ts => ts.startTime >= endT ? { ...ts, startTime: ts.startTime - duration } : ts);

    const newSystemMeasures = [...(activeScore.systemMeasures || [])];
    newSystemMeasures.splice(systemIndex, 1);

    const deletedNoteIds = activeScore.notes
      .filter(n => n.startTime >= startT && n.startTime < endT)
      .map(n => n.id);

    const newDynamicTransitions = (activeScore.dynamicTransitions || []).filter(t => !deletedNoteIds.includes(t.startNoteId) && !deletedNoteIds.includes(t.endNoteId));

    updateActiveScore({
      notes: newNotes,
      barlines: newBarlines,
      phraseBarlines: newPhraseBarlines,
      timeSignatures: newTimeSignatures,
      systemMeasures: newSystemMeasures,
      manualSystems: Math.max(1, (activeScore.manualSystems || 1) - 1),
      dynamicTransitions: newDynamicTransitions
    });
  };

  const groupRests = (startTime: number, measures: number) => {
    const newGroupedRests = [...(activeScore.groupedRests || []), { id: `gr-${Date.now()}`, startTime, measures }];
    updateActiveScore({ groupedRests: newGroupedRests });
  };

  const ungroupRests = (id: string) => {
    const newGroupedRests = (activeScore.groupedRests || []).filter(gr => gr.id !== id);
    updateActiveScore({ groupedRests: newGroupedRests });
  };

  const handleNoteClick = (noteId: string | string[], systemIndex: number, e: React.PointerEvent) => {
    barlineShortcutIdRef.current = null;
    barlineShortcutCountRef.current = 0;
    if (barlineShortcutTimerRef.current) clearTimeout(barlineShortcutTimerRef.current);

    setSelectAllState(0);
    if (mode === 'cursor' && currentTool === 'cursor') {
      if (!noteId || (Array.isArray(noteId) && noteId.length === 0)) {
        if (!e.shiftKey) {
          setSelectedNoteIds([]);
          setSelectedBarlineIds([]);
        }
        return;
      }
      
      const ids = Array.isArray(noteId) ? noteId : [noteId];
      
      const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
      
      if (isMultiSelect) {
        setSelectedNoteIds(prev => {
          // If clicking a single note that is already selected, toggle it off
          if (ids.length === 1 && prev.includes(ids[0])) {
            return prev.filter(id => id !== ids[0]);
          } else {
            // Otherwise add all new ids
            const newIds = ids.filter(id => !prev.includes(id));
            return [...prev, ...newIds];
          }
        });
      } else {
        setSelectedNoteIds(ids);
        setSelectedBarlineIds([]);
      }
    }
  };

  const handleBarlineClick = (barlineId: string, systemIndex: number, e: React.PointerEvent) => {
    barlineShortcutIdRef.current = null;
    barlineShortcutCountRef.current = 0;
    if (barlineShortcutTimerRef.current) clearTimeout(barlineShortcutTimerRef.current);
    
    setSelectAllState(0);
    if (mode === 'cursor' && currentTool === 'barline') {
      if (activeScore.isBarMode) {
        let startTime = -1;
        if (barlineId.startsWith('auto-')) {
          startTime = parseFloat(barlineId.split('-')[1]);
        } else {
          const barline = activeScore.barlines?.find(b => b.id === barlineId);
          if (barline) startTime = barline.startTime;
        }
        
        if (startTime > 0) {
          updateTimeSignature(startTime, 4, 4);
        }
        return;
      }
      
      const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
      if (isMultiSelect) {
        setSelectedBarlineIds(prev => {
          if (prev.includes(barlineId)) {
            return prev.filter(id => id !== barlineId);
          } else {
            return [...prev, barlineId];
          }
        });
      } else {
        setSelectedBarlineIds([barlineId]);
        setSelectedNoteIds([]);
      }
    }
  };

  const handleDurationChange = (d: Duration) => {
    setCurrentDuration(d);
    if (selectedNoteIds.length > 0) {
      updateActiveScore({
        notes: activeScore.notes.map(n => selectedNoteIds.includes(n.id) ? { ...n, duration: d } : n)
      });
    }
  };

  const handleDotToggle = () => {
    const newVal = !currentIsDotted;
    setCurrentIsDotted(newVal);
    if (selectedNoteIds.length > 0) {
      updateActiveScore({
        notes: activeScore.notes.map(n => selectedNoteIds.includes(n.id) ? { ...n, isDotted: newVal } : n)
      });
    }
  };

  const handleTripletToggle = () => {
    const newVal = !currentIsTriplet;
    setCurrentIsTriplet(newVal);
    
    if (selectedNoteIds.length === 0) return;
    
    setScores(prevScores => {
      const active = prevScores.find(s => s.id === activeScoreId);
      if (!active) return prevScores;
      
      let newNotes = [...active.notes];
      let newBarlines = [...(active.barlines || [])];
      let newTimeSignatures = [...(active.timeSignatures || [])];
      let newKeySignatures = [...(active.keySignatures || [])];
      let newDynamicTransitions = active.dynamicTransitions ? [...active.dynamicTransitions] : [];
      
      if (selectedNoteIds.length === 2) {
        const n1 = newNotes.find(n => n.id === selectedNoteIds[0]);
        const n2 = newNotes.find(n => n.id === selectedNoteIds[1]);
        
        if (n1 && n2 && !n1.isTriplet && !n2.isTriplet) {
          const first = n1.startTime < n2.startTime ? n1 : n2;
          const second = n1.startTime < n2.startTime ? n2 : n1;
          
          const D1 = getDurationValue(first.duration, first.isDotted);
          const D2 = getDurationValue(second.duration, second.isDotted);
          
          if (D1 === D2 && Math.abs(second.startTime - (first.startTime + D1)) < 0.001) {
            const groupId = crypto.randomUUID();
            
            first.isTriplet = true;
            first.tripletGroupId = groupId;
            first.tripletStartTime = first.startTime;
            
            second.isTriplet = true;
            second.tripletGroupId = groupId;
            second.tripletStartTime = first.startTime;
            second.startTime = first.startTime + D1 * 2/3;
            
            if (first.pitch === second.pitch && first.octave === second.octave && first.alteration === second.alteration) {
              const third: Note = {
                ...first,
                id: crypto.randomUUID(),
                startTime: first.startTime + D1 * 4/3
              };
              newNotes.push(third);
            }
            
            const newScores = prevScores.map(s => s.id === activeScoreId ? { 
              ...s, 
              notes: newNotes, 
              barlines: newBarlines, 
              timeSignatures: newTimeSignatures,
              keySignatures: newKeySignatures
            } : s);
            
            historyRef.current.push(newScores);
            if (historyRef.current.length > 50) historyRef.current.shift();
            futureRef.current = [];
            
            return newScores;
          }
        }
      }
      
      const noteId = selectedNoteIds[0];
      const noteIndex = newNotes.findIndex(n => n.id === noteId);
      if (noteIndex === -1) return prevScores;
      const note = newNotes[noteIndex];
      
      if (!note.isTriplet) {
        // Convert to triplet
        const groupId = crypto.randomUUID();
        
        // To avoid shifting subsequent notes, we use the same duration
        // e.g. 1 quarter note (4 units) -> 3 quarter notes in triplet (4 * 2/3 * 3 = 8 units)
        // Wait, if we use the same duration, the triplet will take TWICE the space of the original note.
        // Let's check:
        // Original: Corchea (C) = 2 units.
        // Triplet of Corcheas = 3 * (2 * 2/3) = 4 units.
        // So the triplet takes 4 units, which is 1 Negra.
        // The user explicitly requested this behavior:
        // "al seleccionar una corchea y hacerla tresillo entre las 3 notas completen 1 negra."
        const tripletDuration = note.duration;
        const tripletUnit = getDurationValue(tripletDuration, false, true);
        
        newNotes = newNotes.map(n => {
          if (n.id === note.id) {
            return { ...n, duration: tripletDuration, isTriplet: true, tripletGroupId: groupId, tripletStartTime: note.startTime };
          }
          return n;
        });
        
        // Add 2 more notes of the smaller duration
        const note2: Note = { 
          ...note, 
          id: crypto.randomUUID(), 
          duration: tripletDuration,
          isTriplet: true, 
          tripletGroupId: groupId, 
          tripletStartTime: note.startTime, 
          startTime: note.startTime + tripletUnit 
        };
        const note3: Note = { 
          ...note, 
          id: crypto.randomUUID(), 
          duration: tripletDuration,
          isTriplet: true, 
          tripletGroupId: groupId, 
          tripletStartTime: note.startTime, 
          startTime: note.startTime + tripletUnit * 2 
        };
        
        newNotes.push(note2, note3);
        
      } else {
        // Untoggle triplet
        const groupId = note.tripletGroupId;
        if (!groupId) return prevScores;
        
        const groupNotes = newNotes.filter(n => n.tripletGroupId === groupId).sort((a, b) => a.startTime - b.startTime);
        if (groupNotes.length === 0) return prevScores;
        
        const firstNote = groupNotes[0];
        
        // When untoggling, we keep the duration of the first note
        const originalDuration = firstNote.duration;
        
        // Remove all notes in the group from newNotes
        const removedNoteIds = groupNotes.slice(1).map(n => n.id);
        newNotes = newNotes.filter(n => n.tripletGroupId !== groupId);
        
        // Keep only the first note, make it normal with the original duration
        const restoredNote: Note = {
          ...firstNote,
          duration: originalDuration,
          isTriplet: false,
          tripletGroupId: undefined,
          tripletStartTime: undefined,
          startTime: firstNote.startTime
        };
        
        newNotes.push(restoredNote);
        
        // Remove dynamic transitions that reference the removed notes
        if (removedNoteIds.length > 0) {
          newDynamicTransitions = newDynamicTransitions.filter(t => 
            !removedNoteIds.includes(t.startNoteId) && !removedNoteIds.includes(t.endNoteId)
          );
        }
      }
      
      const newScores = prevScores.map(s => s.id === activeScoreId ? { 
        ...s, 
        notes: newNotes, 
        barlines: newBarlines, 
        timeSignatures: newTimeSignatures,
        keySignatures: newKeySignatures,
        dynamicTransitions: newDynamicTransitions
      } : s);
      
      historyRef.current.push(newScores);
      if (historyRef.current.length > 50) historyRef.current.shift();
      futureRef.current = [];
      
      return newScores;
    });
  };

  const handleAlterationChange = (a: Alteration) => {
    setCurrentAlteration(a);
    if (selectedNoteIds.length > 0) {
      updateActiveScore({
        notes: activeScore.notes.map(n => selectedNoteIds.includes(n.id) ? { ...n, alteration: a } : n)
      });
    }
  };

  const handleArticulationChange = (art: 'staccato' | 'staccatissimo' | 'accent' | 'tenuto' | null) => {
    if (selectedNoteIds.length > 0) {
      updateActiveScore({
        notes: activeScore.notes.map(n => {
          if (selectedNoteIds.includes(n.id)) {
            if (art === null || n.articulation === art) {
              const { articulation, ...rest } = n;
              return rest;
            }
            return { ...n, articulation: art };
          }
          return n;
        })
      });
    }
  };

  const handleGlissando = () => {
    if (selectedNoteIds.length === 2) {
      const selectedNotes = activeScore.notes.filter(n => selectedNoteIds.includes(n.id));
      selectedNotes.sort((a, b) => a.startTime - b.startTime);
      
      const sourceNote = selectedNotes[0];
      const targetNote = selectedNotes[1];

      updateActiveScore({
        notes: activeScore.notes.map(n => {
          if (n.id === sourceNote.id) {
            if (n.glissandoTargetId === targetNote.id) {
              const { glissandoTargetId, ...rest } = n;
              return rest;
            }
            return { ...n, glissandoTargetId: targetNote.id };
          }
          return n;
        })
      });
    }
  };

  const handleDynamicChange = (d: 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'crescendo' | 'decrescendo' | null) => {
    if (selectedNoteIds.length > 0) {
      let notesWithRemovedDynamics: string[] = [];

      const newNotes = activeScore.notes.map(n => {
        if (selectedNoteIds.includes(n.id)) {
          if (d === null) {
            notesWithRemovedDynamics.push(n.id);
            const { dynamic, ...rest } = n;
            return rest as Note;
          }
          
          // If we are adding a dynamic, only add it to the FIRST selected note at this start time
          // to prevent overlapping dynamics on chords.
          const firstSelectedNoteAtThisTime = activeScore.notes.find(
            selectedNote => selectedNoteIds.includes(selectedNote.id) && selectedNote.startTime === n.startTime
          );
          
          if (firstSelectedNoteAtThisTime && firstSelectedNoteAtThisTime.id === n.id) {
            return { ...n, dynamic: d } as Note;
          } else {
            // Remove dynamic from other selected notes at the same time
            notesWithRemovedDynamics.push(n.id);
            const { dynamic, ...rest } = n;
            return rest as Note;
          }
        } else if (d !== null) {
          // Remove dynamic from non-selected notes at the same start time
          const isSameTime = activeScore.notes.some(selectedNote => 
            selectedNoteIds.includes(selectedNote.id) && selectedNote.startTime === n.startTime
          );
          if (isSameTime && n.dynamic) {
            notesWithRemovedDynamics.push(n.id);
            const { dynamic, ...rest } = n;
            return rest as Note;
          }
        }
        return n;
      });

      let newDynamicTransitions = notesWithRemovedDynamics.length > 0
        ? (activeScore.dynamicTransitions || []).filter(t => !notesWithRemovedDynamics.includes(t.startNoteId) && !notesWithRemovedDynamics.includes(t.endNoteId))
        : [...(activeScore.dynamicTransitions || [])];

      // Update transition types if dynamics changed
      if (d !== null) {
        const dynamicValues: Record<string, number> = {
          'ppp': 1, 'pp': 2, 'p': 3, 'mp': 4, 'mf': 5, 'f': 6, 'ff': 7
        };
        
        const validTransitions: DynamicTransition[] = [];
        for (const t of newDynamicTransitions) {
          const startNote = newNotes.find(n => n.id === t.startNoteId);
          const endNote = newNotes.find(n => n.id === t.endNoteId);
          
          if (startNote && endNote && startNote.dynamic && endNote.dynamic) {
            const startVol = dynamicValues[startNote.dynamic] || 0;
            const endVol = dynamicValues[endNote.dynamic] || 0;
            
            if (startVol !== 0 && endVol !== 0 && startVol !== endVol) {
              const newType = startVol < endVol ? 'crescendo' : 'decrescendo';
              validTransitions.push(t.type !== newType ? { ...t, type: newType } : t);
            }
          } else {
            validTransitions.push(t); // Keep it if we can't determine (though shouldn't happen if notes exist)
          }
        }
        newDynamicTransitions = validTransitions;
      }

      updateActiveScore({
        notes: newNotes,
        dynamicTransitions: newDynamicTransitions
      });
    }
  };

  const handleDynamicTransition = () => {
    if (selectedNoteIds.length !== 2) {
      showDynamicError('Primero inserta dinámicas');
      return;
    }

    const note1 = activeScore.notes.find(n => n.id === selectedNoteIds[0]);
    const note2 = activeScore.notes.find(n => n.id === selectedNoteIds[1]);

    if (!note1 || !note2 || !note1.dynamic || !note2.dynamic || note1.dynamic === 'crescendo' || note1.dynamic === 'decrescendo' || note2.dynamic === 'crescendo' || note2.dynamic === 'decrescendo') {
      showDynamicError('Primero inserta dinámicas');
      return;
    }

    // Determine order
    const [startNote, endNote] = note1.startTime <= note2.startTime ? [note1, note2] : [note2, note1];

    // Determine type based on volume
    const dynamicValues: Record<string, number> = {
      'ppp': 1, 'pp': 2, 'p': 3, 'mp': 4, 'mf': 5, 'f': 6, 'ff': 7
    };

    const startVol = dynamicValues[startNote.dynamic] || 0;
    const endVol = dynamicValues[endNote.dynamic] || 0;

    if (startVol === 0 || endVol === 0 || startVol === endVol) {
      showDynamicError('Las dinámicas deben ser distintas');
      return;
    }

    const type = startVol < endVol ? 'crescendo' : 'decrescendo';

    const newTransition = {
      id: `dt-${Date.now()}`,
      startNoteId: startNote.id,
      endNoteId: endNote.id,
      type: type as 'crescendo' | 'decrescendo'
    };

    // Remove existing transitions between these notes
    const existingTransitions = activeScore.dynamicTransitions || [];
    const existingTransition = existingTransitions.find(t => 
      t.startNoteId === startNote.id && t.endNoteId === endNote.id
    );

    const filteredTransitions = existingTransitions.filter(t => 
      !(t.startNoteId === startNote.id && t.endNoteId === endNote.id)
    );

    if (existingTransition) {
      updateActiveScore({
        dynamicTransitions: filteredTransitions
      });
    } else {
      updateActiveScore({
        dynamicTransitions: [...filteredTransitions, newTransition]
      });
    }
  };

  const showDynamicError = (msg: string) => {
    setDynamicError(msg);
    setTimeout(() => setDynamicError(null), 3000);
  };

  const exportScore = async (format: 'pdf' | 'png', exportTheme: 'dark' | 'light' = 'dark') => {
    // Deselect note before export
    setSelectedNoteIds([]);
    setIsExporting(true);
    
    const originalTheme = theme;
    setTheme(exportTheme);
    
    // Wait a tick for UI to update and systems to re-render
    await new Promise(resolve => setTimeout(resolve, 150));

    const element = document.getElementById('score-export-area');
    const titleElement = document.getElementById('export-title');
    if (!element) {
      setIsExporting(false);
      setTheme(originalTheme);
      return;
    }
    
    const originalPadding = element.style.padding;
    element.style.padding = '48px';
    
    try {
      const bgColor = exportTheme === 'light' ? '#ffffff' : '#0f172a';
      
      if (format === 'png') {
        if (titleElement) titleElement.style.display = 'flex';
        await new Promise(resolve => setTimeout(resolve, 50));
        const dataUrl = await toPng(element, { backgroundColor: bgColor, pixelRatio: 2 });
        const blob = await (await fetch(dataUrl)).blob();
        await downloadOrShare(blob, `${activeScore.title}.png`, activeScore.title);
      } else {
        // PDF Export: Dynamic page breaks
        const systems = Array.from(element.children).filter(c => c.id !== 'export-title') as HTMLElement[];
        if (systems.length === 0) return;

        // Hide all systems initially
        systems.forEach(sys => { sys.style.display = 'none'; });
        if (titleElement) titleElement.style.display = 'none';

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: 'a4'
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;
        let currentY = margin;
        
        if (exportTheme === 'dark') {
          pdf.setFillColor(15, 23, 42);
          pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
        }

        for (let i = 0; i < systems.length; i++) {
          const system = systems[i];
          system.style.display = 'block';
          
          // Wait for layout
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const canvas = await toCanvas(system, { backgroundColor: bgColor, pixelRatio: 2 });
          const imgData = canvas.toDataURL('image/png');
          
          const imgWidth = pdfWidth - (margin * 2);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // If it's the first system of the first page, we might want to show the title
          if (i === 0 && titleElement) {
            titleElement.style.display = 'flex';
            const titleH1 = titleElement.querySelector('h1');
            const titleIcon = titleElement.querySelector('svg');
            
            if (titleH1) {
              titleH1.style.setProperty('color', exportTheme === 'light' ? '#0f172a' : '#ffffff', 'important');
              titleH1.style.setProperty('fill', exportTheme === 'light' ? '#0f172a' : '#ffffff', 'important');
            }
            if (titleIcon) {
              titleIcon.style.setProperty('color', '#7c3aed', 'important');
              titleIcon.style.setProperty('fill', '#7c3aed', 'important');
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
            const titleCanvas = await toCanvas(titleElement, { backgroundColor: bgColor, pixelRatio: 2 });
            const titleImgData = titleCanvas.toDataURL('image/png');
            const titleImgWidth = pdfWidth - (margin * 2);
            const titleImgHeight = (titleCanvas.height * titleImgWidth) / titleCanvas.width;
            
            pdf.addImage(titleImgData, 'PNG', margin, currentY, titleImgWidth, titleImgHeight);
            currentY += titleImgHeight + 20;
            titleElement.style.display = 'none';
            if (titleH1) {
              titleH1.style.color = ''; // Reset
              titleH1.style.fill = '';
            }
            if (titleIcon) {
              titleIcon.style.color = ''; // Reset
              titleIcon.style.fill = '';
            }
          }

          if (currentY + imgHeight > pdfHeight - margin) {
            pdf.addPage();
            if (exportTheme === 'dark') {
              pdf.setFillColor(15, 23, 42);
              pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
            }
            currentY = margin;
          }

          pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 20; // Gap between systems
          
          system.style.display = 'none';
        }

        // Restore visibility for all systems
        systems.forEach(sys => { sys.style.display = 'block'; });

        const pdfBlob = pdf.output('blob');
        await downloadOrShare(pdfBlob, `${activeScore.title}.pdf`, activeScore.title);
      }
    } catch (error) {
      console.error('Error exporting score:', error);
      alert('Hubo un error al exportar la partitura. Intenta nuevamente.');
    } finally {
      element.style.padding = originalPadding;
      if (titleElement) titleElement.style.display = 'none';
      setTheme(originalTheme);
      setIsExporting(false);
    }
  };

  const exportMidi = () => {
    const midi = new Midi();
    const track = midi.addTrack();
    
    // Set default instrument to Acoustic Grand Piano
    track.instrument.number = 0;
    
    const currentTempo = activeScore.tempo || 120;
    const UNIT_TO_SECONDS = 15 / currentTempo;
    
    midi.header.setTempo(currentTempo);
    
    // Add time signatures
    activeScore.timeSignatures.forEach(ts => {
      midi.header.timeSignatures.push({
        ticks: (ts.startTime / 4) * midi.header.ppq,
        timeSignature: [ts.numerator, ts.denominator]
      });
    });

    // Add main volume (CC 7)
    track.addCC({
      number: 7,
      value: Math.max(0, Math.min(1, volume)), // Tonejs/midi expects value 0-1
      time: 0
    });

    const { unrolledNotes } = unrollScore(activeScore.notes, activeScore.barlines);
    const dynamicTransitions = activeScore.dynamicTransitions || [];

    unrolledNotes.forEach(note => {
      if (note.isSilence) return; // Skip silences

      const durationUnits = getDurationValue(note.duration, note.isDotted, note.isTriplet);
      const durationSeconds = durationUnits * UNIT_TO_SECONDS;
      const timeSeconds = note.unrolledStartTime * UNIT_TO_SECONDS;
      
      const pitchMap: Record<string, number> = {
        'DO': 0, 'RE': 2, 'MI': 4, 'FA': 5, 'SOL': 7, 'LA': 9, 'SI': 11
      };
      
      let midiNote = pitchMap[note.pitch] + (note.octave + 1) * 12;
      
      let effectiveAlteration = note.alteration;
      if (!effectiveAlteration) {
        const ks = getKeySignatureAt(note.startTime, activeScore.keySignatures || []);
        const pitchClass = PITCH_VALUES[note.pitch];
        const acc = ks.accidentals.find(a => a.pitchClass === pitchClass);
        if (acc) {
          effectiveAlteration = acc.alteration as any;
        }
      }

      if (effectiveAlteration === '#') midiNote += 1;
      if (effectiveAlteration === '-') midiNote -= 1;
      
      const dynamicGain = getDynamicGainAtTime(note.unrolledStartTime, unrolledNotes, dynamicTransitions);
      
      // Calculate velocity
      let isAccented = false;
      if (activeScore.isBarMode) {
        for (let i = 0; i < activeScore.timeSignatures.length; i++) {
          const ts = activeScore.timeSignatures[i];
          const nextTsTime = activeScore.timeSignatures[i + 1]?.startTime ?? Infinity;
          const barLen = getBarLength(ts.numerator, ts.denominator);
          if (note.startTime >= ts.startTime && note.startTime < nextTsTime) {
            if ((note.startTime - ts.startTime) % barLen === 0) {
              isAccented = true;
            }
            break;
          }
        }
      } else {
        isAccented = activeScore.barlines.some(b => Math.abs(b.startTime - note.startTime) < 0.1);
      }

      let baseVelocity = dynamicGain * (volume * 1.5);
      if (isAccented) baseVelocity += 0.15;
      if (note.articulation === 'accent') baseVelocity += 0.25;
      const velocity = Math.max(0, Math.min(1, baseVelocity)); // Tonejs/midi expects velocity 0-1
      
      track.addNote({
        midi: midiNote,
        time: timeSeconds,
        duration: durationSeconds,
        velocity: velocity
      });
    });

    const midiData = midi.toArray();
    const blob = new Blob([midiData], { type: 'audio/midi' });
    downloadOrShare(blob, `${activeScore.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mid`, activeScore.title);
  };

  const handleMidiImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const midi = new Midi(arrayBuffer);
      
      const UNIT_TO_SECONDS = 0.125; // Assuming 120 BPM
      const newNotes: Note[] = [];
      
      midi.tracks.forEach(track => {
        track.notes.forEach(midiNote => {
          const startTime = midiNote.time / UNIT_TO_SECONDS;
          const durationUnits = midiNote.duration / UNIT_TO_SECONDS;
          
          const octave = Math.floor(midiNote.midi / 12) - 1;
          const pitchClass = midiNote.midi % 12;
          
          const pitchMapReverse: Record<number, { pitch: Pitch, alteration: Alteration }> = {
            0: { pitch: 'DO', alteration: '' },
            1: { pitch: 'DO', alteration: '#' },
            2: { pitch: 'RE', alteration: '' },
            3: { pitch: 'MI', alteration: '-' },
            4: { pitch: 'MI', alteration: '' },
            5: { pitch: 'FA', alteration: '' },
            6: { pitch: 'FA', alteration: '#' },
            7: { pitch: 'SOL', alteration: '' },
            8: { pitch: 'SOL', alteration: '#' },
            9: { pitch: 'LA', alteration: '' },
            10: { pitch: 'SI', alteration: '-' },
            11: { pitch: 'SI', alteration: '' }
          };
          
          const { pitch, alteration } = pitchMapReverse[pitchClass];
          
          const diffs = [
            { d: 'R', dot: false, trip: false, val: 16 },
            { d: 'B', dot: true, trip: false, val: 12 },
            { d: 'B', dot: false, trip: false, val: 8 },
            { d: 'N', dot: true, trip: false, val: 6 },
            { d: 'N', dot: false, trip: false, val: 4 },
            { d: 'C', dot: true, trip: false, val: 3 },
            { d: 'C', dot: false, trip: false, val: 2 },
            { d: 'S', dot: false, trip: false, val: 1 },
          ];
          
          let closest = diffs[0];
          let minDiff = Math.abs(durationUnits - closest.val);
          for (const d of diffs) {
            const diff = Math.abs(durationUnits - d.val);
            if (diff < minDiff) {
              minDiff = diff;
              closest = d;
            }
          }
          
          newNotes.push({
            id: crypto.randomUUID(),
            startTime: Math.round(startTime * 4) / 4,
            pitch,
            octave,
            duration: closest.d as Duration,
            alteration,
            isDotted: closest.dot,
            isTriplet: closest.trip
          });
        });
      });
      
      updateActiveScore({ notes: newNotes });
    } catch (err) {
      console.error("Error importing MIDI:", err);
      alert("Error al importar el archivo MIDI.");
    }
    
    // Reset file input
    e.target.value = '';
  };

  const exportTextNotes = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 150));

    const element = document.getElementById('text-notes-export-area');
    if (!element) {
      setIsExporting(false);
      return;
    }
    
    // Freeze dimensions of all elements to prevent wrapping differences
    // caused by sub-pixel font rendering in html-to-image
    const originalStyle = element.getAttribute('style') || '';
    const rect = element.getBoundingClientRect();
    
    const notes = element.querySelectorAll('.note-item-export');
    const originalNoteStyles: string[] = [];
    notes.forEach(n => {
      originalNoteStyles.push(n.getAttribute('style') || '');
      const nRect = n.getBoundingClientRect();
      (n as HTMLElement).style.width = `${nRect.width}px`;
      (n as HTMLElement).style.minWidth = `${nRect.width}px`;
      (n as HTMLElement).style.maxWidth = `${nRect.width}px`;
      (n as HTMLElement).style.flexShrink = '0';
    });

    const groups = element.querySelectorAll('.note-group-export');
    const originalGroupStyles: string[] = [];
    groups.forEach(g => {
      originalGroupStyles.push(g.getAttribute('style') || '');
      const gRect = g.getBoundingClientRect();
      // Add a tiny 2px buffer to the group to absorb any sub-pixel rounding errors
      (g as HTMLElement).style.width = `${gRect.width + 2}px`;
    });

    // Add buffer to main container
    element.style.width = `${rect.width + 10}px`;
    
    try {
      const dataUrl = await toPng(element, { 
        backgroundColor: '#0f172a', 
        pixelRatio: 2,
        width: rect.width + 10,
        height: rect.height,
        style: {
          width: `${rect.width + 10}px`,
          height: `${rect.height}px`,
          margin: '0',
          transform: 'none'
        }
      });
      const blob = await (await fetch(dataUrl)).blob();
      await downloadOrShare(blob, `${activeScore.title}_nombres.png`, activeScore.title);
    } catch (error) {
      console.error('Error exporting text notes:', error);
      alert('Hubo un error al exportar los nombres de las notas.');
    } finally {
      element.setAttribute('style', originalStyle);
      notes.forEach((n, i) => {
        n.setAttribute('style', originalNoteStyles[i]);
      });
      groups.forEach((g, i) => {
        g.setAttribute('style', originalGroupStyles[i]);
      });
      setIsExporting(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setTextValue(newText);
    
    const parsedItems = parseTextToNotes(newText);
    
    // Get existing events sorted by time
    const existingEvents = [
      ...activeScore.notes.map(n => ({ type: 'note' as const, data: n })),
      ...(activeScore.barlines || []).map(b => ({ type: 'barline' as const, data: b }))
    ].sort((a, b) => a.data.startTime - b.data.startTime);
    
    const newNotes: Note[] = [];
    const newBarlines: Barline[] = [];
    
    let lastEndTime = 0;
    
    parsedItems.forEach((item, index) => {
      let startTime: number;
      let id: string;
      
      if (index < existingEvents.length) {
        // Reuse existing position
        startTime = existingEvents[index].data.startTime;
        // We generate a new ID to avoid type mismatches or stale state, 
        // but we keep the position.
        id = crypto.randomUUID();
      } else {
        // New item
        startTime = lastEndTime;
        id = crypto.randomUUID();
      }
      
      if (item.type === 'barline') {
        newBarlines.push({ id, startTime });
        // Barlines don't advance time for the *next* note if we are appending,
        // but if we are replacing, we just use the slot.
        // If we are appending new items:
        if (index >= existingEvents.length) {
           // If we just added a barline, the next note should probably start at the same time?
           // Or should it? Usually barline is at the end of a measure.
           // Let's assume barline takes 0 time.
           lastEndTime = startTime;
        } else {
           // If we replaced an item, we update lastEndTime based on what that item *was*?
           // No, we update based on what the *new* item is.
           // But a barline has 0 duration.
           // So lastEndTime remains startTime.
           lastEndTime = startTime;
        }
      } else {
        // It's a note
        newNotes.push({
          id,
          pitch: item.pitch,
          alteration: item.alteration,
          duration: item.duration,
          octave: item.octave,
          isDotted: item.isDotted,
          startTime
        });
        
        // Update lastEndTime for the next item
        const durationVal = DURATION_UNITS[item.duration] * (item.isDotted ? 1.5 : 1);
        lastEndTime = startTime + durationVal;
      }
    });
    
    updateActiveScore({ notes: newNotes, barlines: newBarlines });
  };

  const duplicateScore = (score: Score) => {
    const newScore = {
      ...score,
      id: crypto.randomUUID(),
      title: `${score.title} (Copia)`
    };
    setScores([...scores, newScore]);
    setActiveScoreId(newScore.id);
  };

  const handleAddFolder = () => {
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name: t('new_folder'),
      order: folders.length,
      isOpen: true
    };
    setFolders([...folders, newFolder]);
    setEditingFolderId(newFolder.id);
  };

  const confirmDeleteFolder = (id: string) => {
    if (id === 'default') return;
    setScores(scores.map(s => s.folderId === id ? { ...s, folderId: 'default' } : s));
    setFolders(folders.filter(f => f.id !== id));
    setFolderToDelete(null);
  };

  const toggleFolder = (id: string) => {
    setFolders(folders.map(f => f.id === id ? { ...f, isOpen: !f.isOpen } : f));
  };

  const handleDeleteScore = (id: string) => {
    if (scores.length === 1) {
      alert('No puedes eliminar la única partitura.');
      return;
    }
    setScoreToDelete(id);
  };

  const handleDragStart = (e: React.DragEvent, type: 'score' | 'folder', id: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('type', type);
    e.dataTransfer.setData('id', id);
    if (type === 'score') setDraggedScoreId(id);
  };

  const handleDragOver = (e: React.DragEvent, type: 'score' | 'folder', id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const position = y < rect.height / 2 ? 'top' : 'bottom';
    setDragPosition(position);
    
    if (type === 'score') setDragOverScoreId(id);
    if (type === 'folder') setDragOverFolderId(id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverScoreId(null);
    setDragOverFolderId(null);
  };

  const handleDrop = (e: React.DragEvent, targetType: 'score' | 'folder', targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverScoreId(null);
    setDragOverFolderId(null);
    setDraggedScoreId(null);

    const draggedType = e.dataTransfer.getData('type');
    const draggedId = e.dataTransfer.getData('id');

    if (draggedType === 'score') {
      const score = scores.find(s => s.id === draggedId);
      if (!score) return;

      if (targetType === 'folder') {
        // Move score to folder
        const targetFolderScores = scores.filter(s => s.folderId === targetId);
        const maxOrder = targetFolderScores.length > 0 ? Math.max(...targetFolderScores.map(s => s.order || 0)) : -1;
        setScores(scores.map(s => s.id === draggedId ? { ...s, folderId: targetId, order: maxOrder + 1 } : s));
      } else if (targetType === 'score') {
        // Reorder score within the same folder
        const targetScore = scores.find(s => s.id === targetId);
        if (!targetScore) return;

        const folderScores = scores.filter(s => s.folderId === targetScore.folderId).sort((a, b) => (a.order || 0) - (b.order || 0));
        const draggedIndex = folderScores.findIndex(s => s.id === draggedId);
        const targetIndex = folderScores.findIndex(s => s.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) {
          // Score dragged to a different folder's score
          setScores(scores.map(s => s.id === draggedId ? { ...s, folderId: targetScore.folderId } : s));
          return;
        }

        const newFolderScores = [...folderScores];
        const [removed] = newFolderScores.splice(draggedIndex, 1);
        
        let actualTargetIndex = newFolderScores.findIndex(s => s.id === targetId);
        if (dragPosition === 'bottom') {
          actualTargetIndex += 1;
        }
        
        newFolderScores.splice(actualTargetIndex, 0, removed);

        // Update orders
        const updatedScores = scores.map(s => {
          if (s.folderId === targetScore.folderId) {
            const newOrder = newFolderScores.findIndex(fs => fs.id === s.id);
            return { ...s, order: newOrder };
          }
          return s;
        });
        setScores(updatedScores);
      }
    } else if (draggedType === 'folder' && targetType === 'folder') {
      // Reorder folders
      const sortedFolders = [...folders].sort((a, b) => a.order - b.order);
      const draggedIndex = sortedFolders.findIndex(f => f.id === draggedId);
      const targetIndex = sortedFolders.findIndex(f => f.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1 || draggedId === 'default' || targetId === 'default') return;

      const [removed] = sortedFolders.splice(draggedIndex, 1);
      
      let actualTargetIndex = sortedFolders.findIndex(f => f.id === targetId);
      if (dragPosition === 'bottom') {
        actualTargetIndex += 1;
      }
      
      sortedFolders.splice(actualTargetIndex, 0, removed);

      setFolders(folders.map(f => {
        const newOrder = sortedFolders.findIndex(sf => sf.id === f.id);
        return { ...f, order: newOrder };
      }));
    }
  };

  const confirmDeleteScore = (id: string) => {
    const newScores = scores.filter(s => s.id !== id);
    setScores(newScores);
    
    if (activeScoreId === id) {
      const index = scores.findIndex(s => s.id === id);
      const nextScore = newScores[index] || newScores[index - 1] || newScores[0];
      setActiveScoreId(nextScore.id);
    }
    setScoreToDelete(null);
  };

  const emptyMeasureSequences = useMemo(() => {
    const sequences: { startTime: number, penultimateTime: number, measures: number }[] = [];
    const notes = activeScore.notes || [];
    const timeSignatures = activeScore.timeSignatures || [];
    const groupedRests = activeScore.groupedRests || [];
    
    // Get max time of the score
    const maxStartTime = notes.length > 0 
      ? Math.max(...notes.map(n => n.startTime + getDurationValue(n.duration, n.isDotted, n.isTriplet))) 
      : 0;
    const maxBarlineTime = activeScore.barlines?.length > 0
      ? Math.max(...activeScore.barlines.map(b => b.startTime))
      : 0;
    const lastSystemEndTime = systemBoundaries.length > 0 
      ? systemBoundaries[systemBoundaries.length - 1].endTime 
      : 0;
    const overallMaxTime = Math.max(maxStartTime, maxBarlineTime, lastSystemEndTime);

    // Generate all barlines up to overallMaxTime
    const allGlobalBarlineTimes: number[] = [];
    let currentTime = 0;
    
    // Calculate boundaries based on content
    while (currentTime <= overallMaxTime) {
      allGlobalBarlineTimes.push(currentTime);
      if (currentTime === overallMaxTime) break;
      const ts = getTimeSignatureAt(currentTime, timeSignatures);
      const barLength = getBarLength(ts.numerator, ts.denominator);
      currentTime += barLength;
      // Prevent infinite loop in case of weird time signatures
      if (barLength <= 0) break;
    }

    let currentSequenceStart = -1;
    let currentSequenceCount = 0;

    for (let i = 0; i < allGlobalBarlineTimes.length - 1; i++) {
      const measureStart = allGlobalBarlineTimes[i];
      const measureEnd = allGlobalBarlineTimes[i + 1];

      // Check if this measure is already part of a grouped rest
      const isGrouped = groupedRests.some(gr => {
        let grDuration = 0;
        let tempTime = gr.startTime;
        for (let j = 0; j < gr.measures; j++) {
          const ts = getTimeSignatureAt(tempTime, timeSignatures);
          const barLength = getBarLength(ts.numerator, ts.denominator);
          grDuration += barLength;
          tempTime += barLength;
        }
        return measureStart >= gr.startTime && measureEnd <= gr.startTime + grDuration;
      });

      // Check if there are any notes in this measure
      const hasNotes = notes.some(n => {
        const noteStart = n.startTime;
        const noteEnd = noteStart + getDurationValue(n.duration, n.isDotted, n.isTriplet);
        return noteStart < measureEnd && noteEnd > measureStart;
      });

      // Check if there's a time signature or key signature change at the start of this measure
      // (except for the very first measure of the sequence)
      const hasTsChange = currentSequenceCount > 0 && timeSignatures.some(ts => Math.abs(ts.startTime - measureStart) < 0.001);
      const hasKsChange = currentSequenceCount > 0 && activeScore.keySignatures?.some(ks => Math.abs(ks.startTime - measureStart) < 0.001);

      if (!hasNotes && !isGrouped && !hasTsChange && !hasKsChange) {
        if (currentSequenceStart === -1) currentSequenceStart = i;
        currentSequenceCount++;
      } else {
        if (currentSequenceCount >= 3) {
          sequences.push({
            startTime: allGlobalBarlineTimes[currentSequenceStart],
            penultimateTime: allGlobalBarlineTimes[i - 1],
            measures: currentSequenceCount
          });
        }
        
        // If this measure is empty but has a TS/KS change, it can start a new sequence
        if (!hasNotes && !isGrouped && (hasTsChange || hasKsChange)) {
          currentSequenceStart = i;
          currentSequenceCount = 1;
        } else {
          currentSequenceStart = -1;
          currentSequenceCount = 0;
        }
      }
    }
    if (currentSequenceCount >= 3) {
      sequences.push({
        startTime: allGlobalBarlineTimes[currentSequenceStart],
        penultimateTime: allGlobalBarlineTimes[allGlobalBarlineTimes.length - 2],
        measures: currentSequenceCount
      });
    }

    return sequences;
  }, [activeScore, systemBoundaries]);

  const updateSystemMeasures = (systemIndex: number, measures: number, applyToAll: boolean) => {
    const newScores = scores.map(s => {
      if (s.id === activeScoreId) {
        if (applyToAll) {
          return { ...s, measuresPerSystem: measures, systemMeasures: [] };
        } else {
          const newSystemMeasures = [...(s.systemMeasures || [])];
          // Fill gaps if necessary
          for (let i = 0; i <= systemIndex; i++) {
            if (newSystemMeasures[i] === undefined) {
              newSystemMeasures[i] = s.measuresPerSystem || 4;
            }
          }
          newSystemMeasures[systemIndex] = measures;
          return { ...s, systemMeasures: newSystemMeasures };
        }
      }
      return s;
    });
    setScores(newScores);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key.startsWith('Arrow')) {
        setSelectAllState(0);
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        copyToClipboard();
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        cutToClipboard();
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        pasteFromClipboard();
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        const notesToCopy = activeScore.notes.filter(n => selectedNoteIds.includes(n.id));
        const barlinesToCopy = activeScore.isBarMode 
          ? (activeScore.barlines || []).filter(b => selectedBarlineIds.includes(b.id))
          : (activeScore.phraseBarlines || []).filter(b => selectedBarlineIds.includes(b.id));
        if (notesToCopy.length > 0 || barlinesToCopy.length > 0) {
          const minTime = Math.min(...[...notesToCopy.map(n => n.startTime), ...barlinesToCopy.map(b => b.startTime)]);
          const maxTime = Math.max(...[...notesToCopy.map(n => n.startTime + getDurationValue(n.duration, n.isDotted, n.isTriplet)), ...barlinesToCopy.map(b => b.startTime)]);
          const duration = maxTime - minTime;
          
          const groupIdMap = new Map<string, string>();
          const newNotes = notesToCopy.map(n => {
            let newGroupId = n.tripletGroupId;
            if (n.isTriplet && n.tripletGroupId) {
              if (!groupIdMap.has(n.tripletGroupId)) {
                groupIdMap.set(n.tripletGroupId, crypto.randomUUID());
              }
              newGroupId = groupIdMap.get(n.tripletGroupId);
            }
            return {
              ...n,
              id: crypto.randomUUID(),
              startTime: n.startTime + duration,
              tripletGroupId: newGroupId,
              ...(n.tripletStartTime !== undefined ? { tripletStartTime: n.tripletStartTime + duration } : {})
            };
          });
          
          const newBarlines = barlinesToCopy.map(b => ({ ...b, id: crypto.randomUUID(), startTime: b.startTime + duration }));
          if (activeScore.isBarMode) {
            updateActiveScore({
              notes: [...activeScore.notes, ...newNotes],
              barlines: [...(activeScore.barlines || []), ...newBarlines]
            });
          } else {
            updateActiveScore({
              notes: [...activeScore.notes, ...newNotes],
              phraseBarlines: [...(activeScore.phraseBarlines || []), ...newBarlines]
            });
          }
          setSelectedNoteIds(newNotes.map(n => n.id));
          setSelectedBarlineIds(newBarlines.map(b => b.id));
        }
        e.preventDefault();
        return;
      }

      if (e.key.toLowerCase() === 'h') {
        handleBarlineShortcut();
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
        e.preventDefault();
        return;
      }

      if (e.key.toLowerCase() === 'g') {
        setShowDPad(prev => !prev);
        e.preventDefault();
        return;
      }

      const keyUpper = e.key.toUpperCase();
      if (['F', 'S', 'C', 'N', 'B', 'R'].includes(keyUpper) && !e.ctrlKey && !e.metaKey) {
        handleDurationChange(keyUpper as Duration);
        e.preventDefault();
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        if (isPlaying) {
          stop();
        } else {
          play(selectedNoteIds);
        }
        return;
      }

      if (mode !== 'cursor') return;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        deleteSelected();
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        barlineShortcutIdRef.current = null;
        barlineShortcutCountRef.current = 0;
        if (barlineShortcutTimerRef.current) clearTimeout(barlineShortcutTimerRef.current);

        e.preventDefault();
        if (selectAllState === 0) {
          setSelectedNoteIds(activeScore.notes.map(n => n.id));
          setSelectedBarlineIds((activeScore.barlines || []).map(b => b.id));
          setSelectAllState(1);
        } else if (selectAllState === 1) {
          // Filter to chords
          const selectedNotes = activeScore.notes.filter(n => selectedNoteIds.includes(n.id));
          const notesByTime = selectedNotes.reduce((acc, note) => {
            acc[note.startTime] = acc[note.startTime] || [];
            acc[note.startTime].push(note);
            return acc;
          }, {} as Record<number, Note[]>);
          
          const chordNotes = Object.values(notesByTime)
            .filter(group => new Set(group.map(n => n.pitch)).size >= 3)
            .flat();
            
          setSelectedNoteIds(chordNotes.map(n => n.id));
          setSelectedBarlineIds([]);
          setSelectAllState(2);
        } else {
          setSelectedNoteIds([]);
          setSelectedBarlineIds([]);
          setSelectAllState(0);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const delta = e.key === 'ArrowUp' ? 1 : -1;
        const newNotes = activeScore.notes.map(note => {
          if (selectedNoteIds.includes(note.id)) {
            const newOctave = Math.max(0, Math.min(8, note.octave + delta));
            return { ...note, octave: newOctave };
          }
          return note;
        });
        updateActiveScore({ notes: newNotes });
        return;
      }

      if (e.key === '1') {
        let startTime = 0;
        if (selectedNoteIds.length > 0) {
          const lastId = selectedNoteIds[selectedNoteIds.length - 1];
          const lastNote = activeScore.notes.find(n => n.id === lastId);
          if (lastNote) {
            startTime = lastNote.startTime + getDurationValue(lastNote.duration, lastNote.isDotted, lastNote.isTriplet);
          }
        }
        addNote(startTime, 4, 'SI'); // 3rd line
        e.preventDefault();
        return;
      }

      if (selectedNoteIds.length === 0 && selectedBarlineIds.length === 0) {
        if (e.key === 'ArrowUp') {
          scoreContainerRef.current?.scrollBy({ top: -100, behavior: 'smooth' });
          e.preventDefault();
        } else if (e.key === 'ArrowDown') {
          scoreContainerRef.current?.scrollBy({ top: 100, behavior: 'smooth' });
          e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
          scoreContainerRef.current?.scrollBy({ left: -100, behavior: 'smooth' });
          e.preventDefault();
        } else if (e.key === 'ArrowRight') {
          scoreContainerRef.current?.scrollBy({ left: 100, behavior: 'smooth' });
          e.preventDefault();
        }
        return;
      }

      if (selectedNoteIds.length > 0 || selectedBarlineIds.length > 0) {
        const isCtrl = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;

        if (selectedNoteIds.length > 0) {
          if (e.key === '.' && !isCtrl) {
            handleDotToggle();
            e.preventDefault();
            return;
          } else if (e.key === '.' && isCtrl) {
            const allHaveSharp = selectedNoteIds.every(id => activeScore.notes.find(n => n.id === id)?.alteration === '#');
            handleAlterationChange(allHaveSharp ? '' : '#');
            e.preventDefault();
            return;
          } else if (e.key === ',' && isCtrl) {
            const allHaveFlat = selectedNoteIds.every(id => activeScore.notes.find(n => n.id === id)?.alteration === '-');
            handleAlterationChange(allHaveFlat ? '' : '-');
            e.preventDefault();
            return;
          } else if (e.key === '3') {
            handleTripletToggle();
            e.preventDefault();
            return;
          } else if (isCtrl && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            if (dynamicShortcutTimerRef.current) clearTimeout(dynamicShortcutTimerRef.current);
            
            dynamicShortcutCountRef.current = (dynamicShortcutCountRef.current % 7) + 1;
            const count = dynamicShortcutCountRef.current;
            
            let dynamicValue: any = null;
            switch (count) {
              case 1: dynamicValue = 'ppp'; break;
              case 2: dynamicValue = 'pp'; break;
              case 3: dynamicValue = 'p'; break;
              case 4: dynamicValue = 'mf'; break;
              case 5: dynamicValue = 'f'; break;
              case 6: dynamicValue = 'ff'; break;
              case 7: dynamicValue = null; break;
            }
            
            handleDynamicChange(dynamicValue);
            
            dynamicShortcutTimerRef.current = setTimeout(() => {
              dynamicShortcutCountRef.current = 0;
            }, 1000);
            return;
          } else if (isCtrl && (e.key === '<' || (e.key === ',' && isShift))) {
            e.preventDefault();
            handleDynamicTransition();
            return;
          }
        }

        if (e.key === 'ArrowRight') {
          if (isShift || isCtrl) {
            const sorted = [...activeScore.notes].sort((a, b) => a.startTime - b.startTime || getMidiNumber(b) - getMidiNumber(a));
            const currentNoteId = isShift
              ? selectedNoteIds[selectedNoteIds.length - 1]
              : selectedNoteIds[0];
            const currentIdx = sorted.findIndex(n => n.id === currentNoteId);
            
            if (currentIdx !== -1) {
              const nextIdx = (currentIdx + 1) % sorted.length;
              const nextNoteId = sorted[nextIdx].id;
              if (isShift) {
                setSelectedNoteIds(prev => {
                  if (prev.includes(nextNoteId)) {
                    return prev.filter(id => id !== currentNoteId);
                  } else {
                    return [...prev, nextNoteId];
                  }
                });
              } else {
                setSelectedNoteIds([nextNoteId]);
              }
            } else if (sorted.length > 0) {
              setSelectedNoteIds([sorted[0].id]);
            }
          } else {
            if (selectedNoteIds.length > 0) moveNotes(1, 0);
            if (selectedBarlineIds.length > 0) moveBarlines(1);
          }
          e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
          if (isShift || isCtrl) {
            const sorted = [...activeScore.notes].sort((a, b) => a.startTime - b.startTime || getMidiNumber(b) - getMidiNumber(a));
            const currentNoteId = isShift
              ? selectedNoteIds[selectedNoteIds.length - 1]
              : selectedNoteIds[0];
            const currentIdx = sorted.findIndex(n => n.id === currentNoteId);
            
            if (currentIdx !== -1) {
              const prevIdx = (currentIdx - 1 + sorted.length) % sorted.length;
              const prevNoteId = sorted[prevIdx].id;
              if (isShift) {
                setSelectedNoteIds(prev => {
                  if (prev.includes(prevNoteId)) {
                    return prev.filter(id => id !== currentNoteId);
                  } else {
                    return [...prev, prevNoteId];
                  }
                });
              } else {
                setSelectedNoteIds([prevNoteId]);
              }
            } else if (sorted.length > 0) {
              setSelectedNoteIds([sorted[sorted.length - 1].id]);
            }
          } else {
            if (selectedNoteIds.length > 0) moveNotes(-1, 0);
            if (selectedBarlineIds.length > 0) moveBarlines(-1);
          }
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          if (isCtrl || isShift) {
            const currentNoteId = isShift
              ? selectedNoteIds[selectedNoteIds.length - 1] // Use the last added note as reference
              : selectedNoteIds[0];
            const currentNote = activeScore.notes.find(n => n.id === currentNoteId);
            if (currentNote) {
              const sameTimeNotes = activeScore.notes
                .filter(n => n.startTime === currentNote.startTime)
                .sort((a, b) => getMidiNumber(b) - getMidiNumber(a)); // Highest pitch first
              const idx = sameTimeNotes.findIndex(n => n.id === currentNote.id);
              if (idx > 0) {
                const nextNoteId = sameTimeNotes[idx - 1].id;
                if (isShift) {
                  setSelectedNoteIds(prev => {
                    if (prev.includes(nextNoteId)) {
                      return prev.filter(id => id !== currentNoteId);
                    } else {
                      return [...prev, nextNoteId];
                    }
                  });
                } else {
                  setSelectedNoteIds([nextNoteId]);
                }
              }
            }
          } else {
            if (selectedNoteIds.length > 0) moveNotes(0, 1);
          }
          e.preventDefault();
        } else if (e.key === 'ArrowDown') {
          if (isCtrl || isShift) {
            const currentNoteId = isShift
              ? selectedNoteIds[selectedNoteIds.length - 1] // Use the last added note as reference
              : selectedNoteIds[0];
            const currentNote = activeScore.notes.find(n => n.id === currentNoteId);
            if (currentNote) {
              const sameTimeNotes = activeScore.notes
                .filter(n => n.startTime === currentNote.startTime)
                .sort((a, b) => getMidiNumber(b) - getMidiNumber(a)); // Highest pitch first
              const idx = sameTimeNotes.findIndex(n => n.id === currentNote.id);
              if (idx < sameTimeNotes.length - 1) {
                const nextNoteId = sameTimeNotes[idx + 1].id;
                if (isShift) {
                  setSelectedNoteIds(prev => {
                    if (prev.includes(nextNoteId)) {
                      return prev.filter(id => id !== currentNoteId);
                    } else {
                      return [...prev, nextNoteId];
                    }
                  });
                } else {
                  setSelectedNoteIds([nextNoteId]);
                }
              }
            }
          } else {
            if (selectedNoteIds.length > 0) moveNotes(0, -1);
          }
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteIds, selectedBarlineIds, activeScore, mode, currentIsDotted, isPlaying, play, stop, addNote, moveNotes, moveBarlines, setSelectedNoteIds, setSelectedBarlineIds, handleDurationChange, handleDotToggle, handleTripletToggle, handleAlterationChange, handleDynamicChange, handleBarlineShortcut, undo, redo, copyToClipboard, cutToClipboard, pasteFromClipboard, deleteSelected, setShowDPad]);

  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        
        const now = Date.now();
        if (now - lastWheelTimeRef.current < 300) return; // 300ms throttle
        lastWheelTimeRef.current = now;

        setToolbarViewMode(prev => {
          if (e.deltaY > 0) {
            return (prev + 1) % 7;
          } else {
            return (prev - 1 + 7) % 7;
          }
        });
        setShowDynamicsMenu(false);
        setShowArticulationsMenu(false);
      }
    };
    
    toolbar.addEventListener('wheel', handleWheel, { passive: false });
    return () => toolbar.removeEventListener('wheel', handleWheel);
  }, [mode]);

  const renderDraggedNote = () => {
    if (!draggedNote) return null;
    
    const note = activeScore.notes.find(n => n.id === draggedNote.id);
    if (!note) return null;

    const dx = draggedNote.currentX - draggedNote.startX;
    const dy = draggedNote.currentY - draggedNote.startY;
    
    const stepWidth = DURATION_UNITS[displacementStep] * UNIT_WIDTH;
    const stepsX = Math.round(dx / stepWidth);
    
    const stepsY = Math.round(-dy / PITCH_HEIGHT);
    
    const absolutePitch = note.octave * 7 + PITCH_VALUES[note.pitch] + stepsY;
    let newOctave = Math.floor(absolutePitch / 7);
    let pitchValue = absolutePitch % 7;
    if (pitchValue < 0) pitchValue += 7;
    
    newOctave = Math.max(0, Math.min(8, newOctave));
    const newPitch = VALUE_TO_PITCH[pitchValue] as Pitch;
    
    const width = getDurationValue(note.duration, note.isDotted, note.isTriplet) * UNIT_WIDTH;
    const color = note.isSilence ? '#475569' : PITCH_COLORS[newPitch];
    
    // Calculate snapped position
    const snappedX = draggedNote.noteX + stepsX * stepWidth;
    const snappedY = draggedNote.noteY - stepsY * PITCH_HEIGHT;

    return (
      <div 
        className="fixed pointer-events-none z-[1000] opacity-70"
        style={{
          left: snappedX,
          top: snappedY,
          width,
          height: 24
        }}
      >
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          {note.isSilence ? (
            <div className="w-full h-2 border-2 border-dashed border-slate-500 rounded-sm flex items-center justify-center">
              <span className="text-[8px] font-bold text-slate-500">_</span>
            </div>
          ) : (
            <div className="relative group flex items-center justify-center w-full h-full">
              <ShapeRenderer 
                shape={activeScore.shape} 
                color={color} 
                width={width} 
                alteration={note.alteration || ''}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const currentColors = useMemo(() => {
    if (colorMode === 'blue') {
      return {
        DO: '#3b82f6', // blue
        RE: '#22c55e', // green
        MI: '#eab308', // yellow
        FA: '#f97316', // orange
        SOL: '#ef4444', // red
        LA: '#a855f7', // purple
        SI: '#38bdf8', // celeste
      };
    }
    return customRedColors;
  }, [colorMode, customRedColors]);

  return (
    <div 
      className={`flex h-screen font-sans overflow-hidden ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'} ${theme}`}
      style={{
        '--color-do': currentColors.DO,
        '--color-re': currentColors.RE,
        '--color-mi': currentColors.MI,
        '--color-fa': currentColors.FA,
        '--color-sol': currentColors.SOL,
        '--color-la': currentColors.LA,
        '--color-si': currentColors.SI,
      } as React.CSSProperties}
      onClick={() => setSelectAllState(0)}
      onDragEnter={handleGlobalDragEnter}
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
    >
      <AnimatePresence>
        {isGlobalDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-studio-accent/20 backdrop-blur-md border-4 border-dashed border-studio-accent m-4 rounded-3xl flex flex-col items-center justify-center gap-6"
          >
            <div className="flex flex-col items-center justify-center gap-6 pointer-events-none">
              <motion.div
                animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="bg-studio-accent p-6 rounded-full shadow-[0_0_30px_rgba(59,130,246,0.5)]"
              >
                <Upload className="w-16 h-16 text-white" />
              </motion.div>
              <div className="text-center">
                <h2 className="text-studio-accent font-bold text-3xl mb-2">{t('import_midi_scores')}</h2>
                <p className="text-slate-300 text-lg">{t('import_midi_description')}</p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setIsGlobalDragging(false);
                dragCounter.current = 0;
              }}
              className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-medium transition-all flex items-center gap-2 pointer-events-auto"
            >
              <X className="w-4 h-4" />
              {t('close')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {renderDraggedNote()}
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 flex flex-col z-[100] transition-all duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:-ml-72'}
        lg:relative lg:flex-shrink-0
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" className="w-full h-full object-contain drop-shadow-md" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-xl font-bold tracking-widest whitespace-nowrap bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Play Colora App
          </h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('my_scores')}</h2>
            <button 
              onClick={handleAddFolder}
              className="text-slate-400 hover:text-white transition-colors"
              title={t('new_folder')}
            >
              <FolderIcon size={14} />
            </button>
          </div>

          {folders.sort((a, b) => a.order - b.order).map(folder => (
            <div 
              key={folder.id} 
              className="flex flex-col gap-1"
              onDragOver={(e) => handleDragOver(e, 'folder', folder.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'folder', folder.id)}
            >
              <div 
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${dragOverFolderId === folder.id ? 'bg-slate-800 border-dashed border-slate-500' : 'hover:bg-slate-800/50 border-transparent'} border`}
                draggable
                onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
                onClick={() => toggleFolder(folder.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400">
                    <GripVertical size={14} />
                  </div>
                  {folder.isOpen ? <FolderOpen size={16} className="text-blue-400 flex-shrink-0" /> : <FolderIcon size={16} className="text-blue-400 flex-shrink-0" />}
                  
                  {editingFolderId === folder.id ? (
                    <input 
                      autoFocus
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 outline-none w-full text-sm text-white"
                      value={folder.name}
                      onChange={(e) => setFolders(folders.map(f => f.id === folder.id ? { ...f, name: e.target.value } : f))}
                      onBlur={() => setEditingFolderId(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingFolderId(null)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate font-medium text-sm text-slate-200">{folder.name}</span>
                  )}
                </div>

                {folderToDelete === folder.id ? (
                  <div 
                    className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg shadow-xl border border-slate-700 z-10" 
                    onClick={e => e.stopPropagation()}
                  >
                    <button className="p-1 hover:bg-red-500/20 text-red-400 rounded" onClick={() => confirmDeleteFolder(folder.id)}><Check size={14} /></button>
                    <button className="p-1 hover:bg-slate-700 text-slate-400 rounded" onClick={() => setFolderToDelete(null)}><X size={14} /></button>
                  </div>
                ) : (
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      className="text-slate-400 hover:text-white p-1"
                      onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); }}
                    >
                      <Edit2 size={12} />
                    </button>
                    {folder.id !== 'default' && (
                      <button 
                        className="text-slate-400 hover:text-red-400 p-1 ml-1"
                        onClick={(e) => { e.stopPropagation(); setFolderToDelete(folder.id); }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {folder.isOpen && (
                <div className="flex flex-col gap-1 pl-4 border-l border-slate-800 ml-3">
                  {scores.filter(s => s.folderId === folder.id).sort((a, b) => (a.order || 0) - (b.order || 0)).map(score => (
                    <div 
                      key={score.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'score', score.id)}
                      onDragOver={(e) => handleDragOver(e, 'score', score.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'score', score.id)}
                      className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${activeScoreId === score.id ? 'bg-purple-900/30 border-purple-500/50 shadow-inner' : 'hover:bg-slate-800/50 border-transparent'} ${dragOverScoreId === score.id ? (dragPosition === 'top' ? 'border-t-2 border-t-purple-500' : 'border-b-2 border-b-purple-500') : ''} border relative`}
                      onClick={() => {
                        setActiveScoreId(score.id);
                        setIsSidebarOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400">
                          <GripVertical size={14} />
                        </div>
                        {editingScoreId === score.id ? (
                          <input 
                            autoFocus
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 outline-none w-full text-sm text-white"
                            value={score.title}
                            onChange={(e) => setScores(scores.map(s => s.id === score.id ? { ...s, title: e.target.value } : s))}
                            onBlur={() => setEditingScoreId(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingScoreId(null)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="truncate font-medium text-sm text-slate-300">{score.title}</span>
                        )}
                      </div>
                      
                      {scoreToDelete === score.id ? (
                        <div 
                          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-slate-800 p-1 rounded-lg shadow-xl border border-slate-700 z-10" 
                          onClick={e => e.stopPropagation()}
                        >
                          <button className="p-1 hover:bg-red-500/20 text-red-400 rounded" onClick={() => confirmDeleteScore(score.id)}><Check size={14} /></button>
                          <button className="p-1 hover:bg-slate-700 text-slate-400 rounded" onClick={() => setScoreToDelete(null)}><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="text-slate-400 hover:text-white p-1"
                            onClick={(e) => { e.stopPropagation(); setEditingScoreId(score.id); }}
                            title={t('edit_name')}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            className="text-slate-400 hover:text-white p-1"
                            onClick={(e) => { e.stopPropagation(); duplicateScore(score); }}
                            title={t('duplicate')}
                          >
                            <Copy size={12} />
                          </button>
                          <button 
                            className="text-slate-400 hover:text-red-400 p-1"
                            onClick={(e) => { e.stopPropagation(); handleDeleteScore(score.id); }}
                            title={t('delete')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          <button 
            className="mt-4 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 hover:bg-slate-800/50 transition-all"
            onClick={() => {
              const newScore = { 
                id: crypto.randomUUID(), 
                title: t('new_score'), 
                shape: 'oval' as Shape, 
                notes: [],
                barlines: [],
                timeSignatures: [{ startTime: 0, numerator: 4, denominator: 4 }],
                keySignatures: [{ id: `ks-${Date.now()}`, startTime: 0, rootNote: 'Do', mode: 'Jónico (Mayor)', accidentals: [] }],
                clefSignatures: [{ id: `cs-${Date.now()}`, startTime: 0, clef: 'treble' as const }],
                manualSystems: 1,
                folderId: 'default',
                order: scores.filter(s => s.folderId === 'default').length
              };
              setScores([...scores, newScore]);
              setActiveScoreId(newScore.id);
            }}
          >
            <Plus size={16} />
            <span className="text-sm font-medium">{t('new_score')}</span>
          </button>
        </div>
        
        <div className="mt-auto p-4 border-t border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-medium text-slate-400">{t('language')}</span>
            <select 
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
          <a 
            href="https://acaislab.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[11px] text-center font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent uppercase tracking-wider hover:opacity-80 transition-opacity"
          >
            Isaac Araya Inostroza
          </a>
          <div className="text-[9px] text-slate-500 text-center leading-relaxed">
            <button 
              onClick={() => setShowPrivacy(!showPrivacy)}
              className="hover:text-slate-300 transition-colors cursor-pointer block w-full text-center"
            >
              &copy; {new Date().getFullYear()} ProColores. Todos los derechos reservados.
            </button>
            
            <button 
              onClick={() => setShowTerms(!showTerms)}
              className="mt-1 text-[8px] text-slate-600 hover:text-slate-400 transition-colors cursor-pointer block w-full text-center underline decoration-slate-800"
            >
              Términos y Condiciones
            </button>

            {showTerms && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 text-[8px] text-slate-600 text-left px-2 border-t border-slate-800/50 pt-2"
              >
                <p className="mb-1"><strong>Términos y Condiciones:</strong> Este software es una herramienta de creación y transcripción musical.</p>
                <p><strong>Responsabilidad:</strong> El usuario es el único responsable de poseer los derechos de autor, licencias o permisos necesarios sobre las obras que decida transcribir, almacenar o distribuir haciendo uso de esta aplicación.</p>
              </motion.div>
            )}

            {showPrivacy && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 bg-slate-900/50 p-2 rounded border border-slate-800 text-left"
              >
                <p className="mb-1">
                  <strong>Privacidad:</strong> Nadie tiene acceso a los archivos creados en esta app más que tú. Todo se guarda localmente en tu navegador.
                </p>
                <p>
                  <strong>Recomendación:</strong> Te sugerimos descargar tus partituras en caso de que la app deje de funcionar online o gratuitamente, para no perder el acceso a ellas.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {playbackError && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
            <Info size={16} />
            <span>Error de reproducción: {playbackError}</span>
            <button onClick={() => setPlaybackError(null)} className="ml-2 hover:bg-red-600 p-1 rounded">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="h-20 border-b border-slate-800 flex items-center justify-between px-4 lg:px-8 bg-slate-900 backdrop-blur-md relative z-[70] shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-4 lg:gap-8 min-w-max pr-4 lg:pr-0">
            <div className="flex items-center gap-3">
              <motion.button 
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors relative group"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                onMouseEnter={() => setIsMascotHovered(true)}
                onMouseLeave={() => setIsMascotHovered(false)}
                initial={{ scale: 0, rotate: -180, y: -50 }}
                animate={{ scale: 1, rotate: 0, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
                whileHover={{ 
                  scale: 1.15, 
                  rotate: [0, -15, 15, -15, 15, 0],
                  transition: { duration: 0.5 }
                }}
                whileTap={{ scale: 0.9 }}
                title={t('mascot_tooltip')}
              >
                <MascotIcon size={24} className="relative z-10" isHovered={isMascotHovered} />
              </motion.button>
              <input 
                className="text-lg lg:text-2xl font-bold bg-transparent outline-none focus:border-b-2 border-purple-500 pb-1 transition-all w-40 lg:w-auto text-white"
                value={activeScore.title}
                onChange={(e) => updateActiveScore({ title: e.target.value })}
                placeholder="Título de la canción"
              />
            </div>
            
            <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/50 shrink-0">
              <button 
                className={`flex items-center gap-2 px-3 lg:px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'cursor' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => setMode('cursor')}
              >
                <MousePointer2 size={14} />
                <span className="hidden sm:inline">{t('cursor')}</span>
              </button>
              <button 
                ref={tutorialStep2Ref}
                className={`flex items-center gap-2 px-3 lg:px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'text' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'} ${tutorialStep === 2 ? 'relative z-[10000] ring-4 ring-purple-500 ring-opacity-50' : ''}`}
                onClick={() => setMode('text')}
              >
                <FileText size={14} />
                <span className="hidden sm:inline">{t('text')}</span>
              </button>
            </div>
            
            <button 
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              onClick={undo}
              title={t('undo')}
            >
              <RotateCcw size={20} />
            </button>

            <div className="relative">
              <button 
                ref={midiButtonRef}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                onClick={() => setShowMidiMenu(!showMidiMenu)}
                title={t('import_midi')}
              >
                <Music size={20} />
                <span className="text-xs font-bold hidden lg:inline">MIDI</span>
              </button>
            </div>

            <div className="relative">
              <button 
                ref={gridButtonRef}
                className={`p-2 hover:bg-slate-800 rounded-lg transition-colors ${gridSubdivision ? 'text-blue-400' : 'text-slate-400'}`}
                onClick={() => setShowGridMenu(!showGridMenu)}
                title={t('grid_setup')}
              >
                <motion.div
                  animate={{ 
                    scaleY: eyeState.blink ? 0.1 : 1,
                    x: eyeState.x
                  }}
                  transition={{ duration: 0.1 }}
                >
                  <Eye size={20} />
                </motion.div>
              </button>
            </div>

            <div className="relative">
              <button 
                ref={exportButtonRef}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-3 lg:px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-900/20 shrink-0"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <Download size={16} />
                <span className="hidden sm:inline">{t('export_import')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dropdown Menus (Moved outside header to prevent clipping) */}
        {showMidiMenu && midiButtonRef.current && (
          <div 
            ref={midiMenuRef}
            className="fixed mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 z-[300] animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              top: midiButtonRef.current.getBoundingClientRect().bottom,
              left: Math.max(16, Math.min(
                midiButtonRef.current.getBoundingClientRect().left + midiButtonRef.current.offsetWidth / 2 - 128,
                window.innerWidth - 272 // 256 (w-64) + 16 (padding)
              )),
            }}
          >
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('import_midi_files')}</div>
            <FileDropZone 
              onFilesDrop={(files) => {
                handleMidiFilesDrop(files);
                setShowMidiMenu(false);
              }} 
            />
            <div className="mt-3 text-[10px] text-slate-500 text-center">
              {t('drag_files_directly')}
            </div>
          </div>
        )}

        {showGridMenu && gridButtonRef.current && (
          <div 
            ref={gridMenuRef}
            className="fixed mt-2 w-[450px] max-w-[90vw] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-[300] animate-in fade-in slide-in-from-top-2 duration-200 flex gap-4"
            style={{
              top: gridButtonRef.current.getBoundingClientRect().bottom,
              left: Math.max(16, Math.min(
                gridButtonRef.current.getBoundingClientRect().left + gridButtonRef.current.offsetWidth / 2 - 225,
                window.innerWidth - Math.min(450, window.innerWidth * 0.9) - 16
              )),
            }}
          >
            <div className="w-32 shrink-0">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">{t('subdivision')}</div>
              <button 
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${gridSubdivision === null ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                onClick={() => { setGridSubdivision(null); setShowGridMenu(false); }}
              >
                {t('disabled')}
              </button>
              {(Object.keys(GRID_SUBDIVISIONS) as GridSubdivision[]).map(sub => (
                <button 
                  key={sub}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${gridSubdivision === sub ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                  onClick={() => { setGridSubdivision(sub); setShowGridMenu(false); }}
                >
                  {sub === 'F' ? t('thirty_second_notes') : sub === 'S' ? t('sixteenth_notes') : sub === 'C' ? t('eighth_notes') : sub === 'N' ? t('quarter_notes') : sub === 'B' ? t('half_notes') : t('whole_notes')}
                </button>
              ))}
            </div>
            <div className="w-px bg-slate-700 my-1"></div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">{t('visualization')}</div>
              <div className="flex flex-col gap-3 px-2 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t('color_mode')}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${colorMode === 'blue' ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>{t('blue_c')}</span>
                    <button 
                      className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${colorMode === 'red' ? 'bg-red-500' : 'bg-blue-500'}`}
                      onClick={() => setColorMode(colorMode === 'blue' ? 'red' : 'blue')}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${colorMode === 'red' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className={`text-xs ${colorMode === 'red' ? 'text-red-400 font-bold' : 'text-slate-500'}`}>{t('red_c')}</span>
                  </div>
                </div>
                {colorMode === 'red' && (
                  <div className="mt-2 p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('customize_colors')}</span>
                      <button 
                        className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                        onClick={() => setCustomRedColors({
                          DO: '#ef4444',
                          RE: '#f97316',
                          MI: '#eab308',
                          FA: '#22c55e',
                          SOL: '#3b82f6',
                          LA: '#a855f7',
                          SI: '#ec4899',
                        })}
                      >
                        <RotateCcw size={12} />
                        {t('reset')}
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(customRedColors) as Pitch[]).map(pitch => (
                        <div key={pitch} className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-500">{pitch}</span>
                          <input 
                            type="color" 
                            value={customRedColors[pitch]}
                            onChange={(e) => setCustomRedColors(prev => ({ ...prev, [pitch]: e.target.value }))}
                            className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t('light_mode')}</span>
                  <button 
                    className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ml-2 ${theme === 'light' ? 'bg-blue-500' : 'bg-slate-600'}`}
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${theme === 'light' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t('note_names')}</span>
                  <button 
                    className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ml-2 ${activeScore.textOptions?.showNoteNames !== false ? 'bg-blue-500' : 'bg-slate-600'}`}
                    onClick={() => updateActiveScore({ textOptions: { ...(activeScore.textOptions || { fontFamily: 'sans-serif', fontSize: 16, letterSpacing: 0, showNoteNames: true }), showNoteNames: activeScore.textOptions?.showNoteNames === false } })}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${activeScore.textOptions?.showNoteNames !== false ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t('horizontal_view')}</span>
                  <button 
                    className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ml-2 ${isHorizontalView ? 'bg-blue-500' : 'bg-slate-600'}`}
                    onClick={() => setIsHorizontalView(!isHorizontalView)}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${isHorizontalView ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{t('extended_staff')}</span>
                  <button 
                    className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ml-2 ${isExtendedStaffView ? 'bg-blue-500' : 'bg-slate-600'}`}
                    onClick={() => setIsExtendedStaffView(!isExtendedStaffView)}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${isExtendedStaffView ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {isExtendedStaffView && (
                  <div className="flex items-center justify-between pl-4">
                    <span className="text-sm text-slate-400">{t('show_side_piano')}</span>
                    <button 
                      className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ml-2 ${showSidePiano ? 'bg-blue-500' : 'bg-slate-600'}`}
                      onClick={() => setShowSidePiano(!showSidePiano)}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${showSidePiano ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Desactivar desplazamiento automático</span>
                  <button 
                    className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ml-2 ${isAutoscrollDisabled ? 'bg-blue-500' : 'bg-slate-600'}`}
                    onClick={() => setIsAutoscrollDisabled(!isAutoscrollDisabled)}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${isAutoscrollDisabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                
                {activeScore.textOptions?.showNoteNames === false && (
                  <div className="mt-2 flex flex-col gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('text_options')}</div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400">{t('font')}</span>
                      <select 
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none w-24"
                        value={activeScore.textOptions?.fontFamily || 'sans-serif'}
                        onChange={(e) => updateActiveScore({ textOptions: { ...(activeScore.textOptions || { fontSize: 16, letterSpacing: 0, showNoteNames: false }), fontFamily: e.target.value } })}
                      >
                        <option value="sans-serif">Sans-serif</option>
                        <option value="serif">Serif</option>
                        <option value="monospace">Monospace</option>
                        <option value="cursive">Cursive</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400">{t('size')}</span>
                      <input 
                        type="number" 
                        className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"
                        value={activeScore.textOptions?.fontSize || 16}
                        onChange={(e) => updateActiveScore({ textOptions: { ...(activeScore.textOptions || { fontFamily: 'sans-serif', letterSpacing: 0, showNoteNames: false }), fontSize: parseInt(e.target.value) || 16 } })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400">{t('spacing')}</span>
                      <input 
                        type="number" 
                        className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"
                        value={activeScore.textOptions?.letterSpacing || 0}
                        onChange={(e) => updateActiveScore({ textOptions: { ...(activeScore.textOptions || { fontFamily: 'sans-serif', fontSize: 16, showNoteNames: false }), letterSpacing: parseInt(e.target.value) || 0 } })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showExportMenu && exportButtonRef.current && (
          <div 
            ref={exportMenuRef}
            className="fixed mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-[300] animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              top: exportButtonRef.current.getBoundingClientRect().bottom,
              right: Math.max(16, window.innerWidth - exportButtonRef.current.getBoundingClientRect().right),
            }}
          >
            <div className="text-xs font-bold text-slate-500 uppercase px-3 py-1">PDF</div>
            <button 
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-700 text-slate-300"
              onClick={() => { exportScore('pdf', 'dark'); setShowExportMenu(false); }}
            >
              {t('download_dark_bg')}
            </button>
            <button 
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-700 text-slate-300 mt-1"
              onClick={() => { exportScore('pdf', 'light'); setShowExportMenu(false); }}
            >
              {t('download_light_bg')}
            </button>
            <div className="h-px bg-slate-700 my-2"></div>
            <div className="text-xs font-bold text-slate-500 uppercase px-3 py-1">MIDI</div>
            <button 
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-700 text-slate-300"
              onClick={() => { exportMidi(); setShowExportMenu(false); }}
            >
              {t('export_midi_mid')}
            </button>
            <label className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-700 text-slate-300 mt-1 cursor-pointer block">
              {t('import_midi_mid')}
              <input type="file" accept=".mid,.midi" className="hidden" onChange={(e) => { handleMidiImport(e); setShowExportMenu(false); }} />
            </label>
          </div>
        )}

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden relative bg-slate-950 flex flex-row">
          {/* Vertical Toolbar */}
          {mode === 'cursor' && (
            <div className="w-14 border-r border-slate-800/50 bg-slate-900/30 flex flex-col items-center py-4 gap-4 shrink-0 z-[60]">
              {/* Tool Selection */}
              <div className="flex flex-col items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                <button 
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${!activeScore.isBarMode && currentTool === 'cursor' ? 'bg-yellow-500 text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                  onClick={() => {
                    setCurrentTool('cursor');
                    if (activeScore.isBarMode) updateActiveScore({ isBarMode: false });
                  }}
                  title={t('insert_notes')}
                >
                  <MousePointer2 size={16} />
                </button>
                <button 
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${!activeScore.isBarMode && currentTool === 'barline' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                  onClick={() => {
                    setCurrentTool('barline');
                    if (activeScore.isBarMode) updateActiveScore({ isBarMode: false });
                  }}
                  title={t('free_mode')}
                >
                  <Minus className="rotate-90" size={16} />
                </button>
                <div className="w-4 h-px bg-slate-700 my-1" />
                <button 
                  ref={tutorialStep1Ref}
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${activeScore.isBarMode ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'} ${tutorialStep === 1 ? 'relative z-[10000] ring-4 ring-purple-500 ring-opacity-50' : ''}`}
                  onClick={() => {
                    const newIsBarMode = !activeScore.isBarMode;
                    updateActiveScore({ isBarMode: newIsBarMode });
                    if (newIsBarMode) {
                      setCurrentTool('barline');
                    } else {
                      setCurrentTool('cursor');
                    }
                  }}
                  title={t('metrics_clefs')}
                >
                  <Hash size={16} />
                </button>
                <div className="w-4 h-px bg-slate-700 my-1" />
                <button 
                  className="w-8 h-8 flex items-center justify-center rounded-md transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateActiveScore({ manualSystems: (activeScore.manualSystems || 1) + 1 });
                  }}
                  title={t('new_system')}
                >
                  <Plus size={16} />
                </button>
                <div className="w-4 h-px bg-slate-700 my-1" />
                <button 
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${activeScore.isGrandStaff ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateActiveScore({ isGrandStaff: !activeScore.isGrandStaff });
                  }}
                  title={t('grand_staff')}
                >
                  <span className="font-serif text-2xl leading-none">{'{'}</span>
                </button>
                <div className="w-4 h-px bg-slate-700 my-1" />
                <div className="relative">
                  <button 
                    ref={displacementButtonRef}
                    className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${showDisplacementMenu ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDisplacementMenu(!showDisplacementMenu);
                    }}
                    title={t('displacement_setup')}
                  >
                    <ArrowLeftRight size={16} />
                  </button>
                  {showDisplacementMenu && (
                    <div 
                      ref={displacementMenuRef}
                      className="absolute left-full ml-2 bottom-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-[300] animate-in fade-in slide-in-from-left-2 duration-200 flex flex-col gap-1 w-40"
                    >
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">{t('displacement')}</div>
                      {(['F', 'S', 'C', 'N', 'B', 'R'] as Duration[]).map(dur => (
                        <button 
                          key={dur}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${displacementStep === dur ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                          onClick={() => { setDisplacementStep(dur); setShowDisplacementMenu(false); }}
                        >
                          <div className="w-6 h-6 flex items-center justify-center text-lg">
                            {dur === 'F' ? '𝅘𝅥𝅯' : dur === 'S' ? '𝅘𝅥𝅮' : dur === 'C' ? '♪' : dur === 'N' ? '♩' : dur === 'B' ? '𝅗𝅥' : '𝅝'}
                          </div>
                          {dur === 'F' ? t('thirty_second_note') : dur === 'S' ? t('sixteenth_note') : dur === 'C' ? t('eighth_note') : dur === 'N' ? t('quarter_note') : dur === 'B' ? t('half_note') : t('whole_note')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0 relative">
            {/* Mobile/Desktop Playback Controls - Fixed Bottom */}
            {!isMobilePlaybackOpen && !isSidebarOpen && (
              <PlayButton
                className="fixed bottom-6 left-6 z-[100]"
                buttonClassName="p-4 hover:bg-green-600"
                iconSize={24}
                isPlaying={isPlaying}
                onClick={() => {
                  setIsMobilePlaybackOpen(true);
                  if (!isPlaying) play(selectedNoteIds);
                }}
              />
            )}

            {isMobilePlaybackOpen && (
            <div className="absolute bottom-0 left-0 right-0 md:bottom-6 md:left-6 md:right-auto md:w-96 md:rounded-2xl bg-slate-900/95 backdrop-blur-lg border-t md:border border-slate-800 p-3 pb-6 md:pb-3 z-[60] flex flex-col gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
              <button 
                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-400 p-1 rounded-full border border-slate-700 shadow-md"
                onClick={() => setIsMobilePlaybackOpen(false)}
              >
                <ChevronDown size={16} />
              </button>

              <div className="flex items-center justify-between gap-3">
                <PlayButton 
                  isPlaying={isPlaying} 
                  onClick={() => play(selectedNoteIds)} 
                />
  
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Tempo:</span>
                        <input 
                          type="number" 
                          min="60" 
                          max="200" 
                          value={Number.isNaN(tempo) ? '' : tempo} 
                          onChange={(e) => handleTempoChange(e.target.value === '' ? NaN : parseInt(e.target.value))}
                          className="w-12 bg-slate-800 border border-slate-700 rounded px-1 text-xs text-center text-white"
                        />
                        <div className="relative" ref={metronomeSettingsRef}>
                          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-md overflow-hidden">
                            <button
                              className={`p-1.5 transition-colors ${isMetronomeEnabled ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                              onClick={() => setIsMetronomeEnabled(!isMetronomeEnabled)}
                              title={t('toggle_metronome')}
                            >
                              <MetronomeIcon size={14} />
                            </button>
                            <button
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 border-l border-slate-700"
                              onClick={() => setShowMetronomeSettings(!showMetronomeSettings)}
                              title={t('metronome_settings')}
                            >
                              <Settings size={12} />
                            </button>
                          </div>
                          
                          {showMetronomeSettings && (
                            <div className="absolute bottom-full left-0 mb-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 p-3 flex flex-col gap-3">
                              <div>
                                <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Figura Rítmica</label>
                                <div className="flex gap-1 mb-2">
                                  {(['F', 'S', 'C', 'N', 'B', 'R'] as Duration[]).map(r => (
                                    <button
                                      key={r}
                                      className={`flex-1 py-1 text-xs font-bold rounded ${metronomeRhythm === r ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                      onClick={() => setMetronomeRhythm(r)}
                                    >
                                      {r}
                                    </button>
                                  ))}
                                </div>
                                <button
                                  className={`w-full py-1 text-xs font-bold rounded flex items-center justify-center gap-1 ${isMetronomeDotted ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                  onClick={() => setIsMetronomeDotted(!isMetronomeDotted)}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                  Con Puntillo
                                </button>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">{t('sound')}</label>
                                <select
                                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-purple-500"
                                  value={metronomeSound}
                                  onChange={(e) => setMetronomeSound(e.target.value as any)}
                                >
                                  <option value="wood">{t('wood_classic')}</option>
                                  <option value="digital">Digital (Beep)</option>
                                  <option value="analog">Análogo (Ruido)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">{t('volume')}</label>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="1" 
                                  step="0.01"
                                  value={metronomeVolume} 
                                  onChange={(e) => setMetronomeVolume(parseFloat(e.target.value))}
                                  onWheel={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const step = 0.05;
                                    setMetronomeVolume(prev => Math.max(0, Math.min(1, prev + (e.deltaY < 0 ? step : -step))));
                                  }}
                                  className="w-full accent-purple-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                    </div>
                    <select 
                      className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-300 outline-none focus:border-purple-500"
                      value={instrument}
                      onChange={(e) => setInstrument(e.target.value as any)}
                    >
                      <option value="piano">🎹 {t('piano')}</option>
                      <option value="violin">🎻 {t('violin')}</option>
                      <option value="flute">🌬️ {t('flute')}</option>
                      <option value="guitar">🎸 {t('guitar')}</option>
                      <option value="marimba">🪵 {t('marimba')}</option>
                      <option value="synth">🎹 {t('synth')}</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Volume2 size={16} className="text-slate-400" />
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01"
                      value={volume} 
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      onWheel={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const step = 0.05;
                        setVolume(prev => Math.max(0, Math.min(1, prev + (e.deltaY < 0 ? step : -step))));
                      }}
                      className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Floating Controls for Mobile */}
            {(selectedNoteIds.length > 0 || selectedBarlineIds.length > 0) && mode === 'cursor' && showDPad && (
              <motion.div 
                drag
                dragMomentum={false}
                style={{ x: dPadPos.x, y: dPadPos.y, scale: dPadScale }}
                onDragEnd={(_, info) => setDPadPos(prev => ({ x: prev.x + info.offset.x, y: prev.y + info.offset.y }))}
                className="absolute bottom-24 md:bottom-8 right-4 md:right-8 flex flex-col items-center gap-2 z-50 touch-none"
              >
                <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700 shadow-2xl flex flex-col gap-2 relative group">
                  {/* Resize and Reset Controls */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDPadScale(s => Math.max(0.5, s - 0.1)); }}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title={t('zoom_out')}
                    >
                      <Minus size={16} />
                    </button>
                    <div className="w-px h-4 bg-slate-700" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDPadScale(s => Math.min(2, s + 0.1)); }}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title={t('zoom_in')}
                    >
                      <Plus size={16} />
                    </button>
                    <div className="w-px h-4 bg-slate-700" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDPadPos({ x: 0, y: 0 }); setDPadScale(1); }}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title={t('reset')}
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>

                  {/* Drag Handle */}
                  <div className="absolute -top-2 -left-2 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shadow-lg cursor-move z-10 border-2 border-slate-900">
                    <GripVertical size={16} className="text-white" />
                  </div>

                  <div className="flex justify-center">
                    <button 
                      className={`p-3 rounded-xl text-white transition-all shadow-lg ${selectedBarlineIds.length > 0 ? 'bg-slate-800/50 opacity-50 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 active:scale-95'}`}
                      onClick={() => selectedNoteIds.length > 0 && moveNotes(0, 1)}
                      disabled={selectedBarlineIds.length > 0}
                    >
                      <ChevronUp size={24} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-all active:scale-95 shadow-lg"
                      onClick={() => {
                        if (selectedNoteIds.length > 0) moveNotes(-1, 0);
                        if (selectedBarlineIds.length > 0) moveBarlines(-1);
                      }}
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      className="p-3 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-400 transition-all active:scale-95 shadow-lg"
                      onClick={() => {
                        if (selectedNoteIds.length > 0) deleteNotes(selectedNoteIds);
                        if (selectedBarlineIds.length > 0) deleteBarlines(selectedBarlineIds);
                      }}
                    >
                      <Trash2 size={24} />
                    </button>
                    <button 
                      className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-all active:scale-95 shadow-lg"
                      onClick={() => {
                        if (selectedNoteIds.length > 0) moveNotes(1, 0);
                        if (selectedBarlineIds.length > 0) moveBarlines(1);
                      }}
                    >
                      <ChevronRight size={24} />
                    </button>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button 
                      className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-all active:scale-95 shadow-lg"
                      onClick={copyToClipboard}
                      title={t('copy')}
                    >
                      <Copy size={20} />
                    </button>
                    <button 
                      className={`p-3 rounded-xl text-white transition-all shadow-lg ${selectedBarlineIds.length > 0 ? 'bg-slate-800/50 opacity-50 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 active:scale-95'}`}
                      onClick={() => selectedNoteIds.length > 0 && moveNotes(0, -1)}
                      disabled={selectedBarlineIds.length > 0}
                    >
                      <ChevronDown size={24} />
                    </button>
                    <button 
                      className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-all active:scale-95 shadow-lg"
                      onClick={pasteFromClipboard}
                      title={t('paste')}
                    >
                      <Clipboard size={20} />
                    </button>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button 
                      className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-all active:scale-95 shadow-lg"
                      onClick={undo}
                      title={t('undo')}
                    >
                      <Undo size={20} />
                    </button>
                    <button 
                      className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-all active:scale-95 shadow-lg"
                      onClick={redo}
                      title={t('redo')}
                    >
                      <Redo size={20} />
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <button 
                      className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-all active:scale-95 shadow-lg"
                      onClick={cutToClipboard}
                      title={t('cut')}
                    >
                      <Scissors size={20} />
                    </button>
                  </div>
                </div>
                <div className="bg-purple-600 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg animate-pulse">
                  {t('edit_mode')}
                </div>
              </motion.div>
            )}
  
            {mode === 'cursor' && (
              <div 
                ref={toolbarRef} 
                onScroll={() => setShowDynamicsMenu(false)}
                onDoubleClick={() => {
                  setToolbarViewMode(prev => (prev + 1) % 7);
                  setShowDynamicsMenu(false);
                  setShowArticulationsMenu(false);
                }}
                className="min-h-[3.5rem] py-2 border-b border-slate-800/50 bg-slate-900/30 flex items-center overflow-x-auto no-scrollbar px-4 md:px-8 shrink-0 z-50 relative"
              >
              <AnimatePresence mode="wait">
                <motion.div
                  key={toolbarViewMode}
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 300, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-4 md:gap-6 min-w-max"
                >
                  {(toolbarViewMode === 0 || toolbarViewMode === 2) && (
                    <div className={`flex items-center gap-2 transition-opacity ${currentTool !== 'cursor' ? 'opacity-30 pointer-events-none' : ''}`}>
                      <span className="text-xs text-slate-500 uppercase font-semibold mr-2">{t('figure')}</span>
                      {(['F', 'S', 'C', 'N', 'B', 'R'] as Duration[]).map(d => (
                        <button 
                          key={d}
                          className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-all ${currentDuration === d ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                          onClick={() => handleDurationChange(d)}
                          title={t('duration', { d })}
                        >
                          {d}
                        </button>
                      ))}
                      <button 
                        className={`w-8 h-8 flex items-center justify-center rounded-md text-lg font-bold transition-all ml-1 ${currentIsDotted ? 'bg-amber-500 text-white shadow-md shadow-amber-900/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                        onClick={handleDotToggle}
                        title={t('dot')}
                      >
                        .
                      </button>
                      <button 
                        className={`w-8 h-8 flex items-center justify-center rounded-md text-lg font-bold transition-all ml-1 ${currentIsTriplet ? 'bg-amber-500 text-white shadow-md shadow-amber-900/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                        onClick={handleTripletToggle}
                        title={t('triplet')}
                      >
                        3
                      </button>
                    </div>
                  )}
                  
                  {toolbarViewMode === 0 && (
                    <div className={`w-px h-6 bg-slate-800 transition-opacity ${currentTool !== 'cursor' ? 'opacity-30' : ''}`} />
                  )}
                  
                  {(toolbarViewMode === 0 || toolbarViewMode === 3) && (
                    <div className={`flex items-center gap-2 transition-opacity ${currentTool !== 'cursor' ? 'opacity-30 pointer-events-none' : ''}`}>
                      <span className="text-xs text-slate-500 uppercase font-semibold mr-2">{t('alteration')}</span>
                      {[ {label: 'Auto', val: ''}, {label: '♮', val: 'n'}, {label: '#', val: '#'}, {label: 'b', val: '-'} ].map(a => (
                        <button
                          key={a.label}
                          className={`w-10 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-all ${currentAlteration === a.val ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                          onClick={() => handleAlterationChange(a.val as Alteration)}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {toolbarViewMode === 0 && (
                    <div className="w-px h-6 bg-slate-800" />
                  )}
                  
                  {(toolbarViewMode === 0 || toolbarViewMode === 4) && (
                    <div className={`relative flex items-center gap-1 transition-opacity ${selectedNoteIds.length === 0 ? 'opacity-30 pointer-events-none' : ''}`}>
                      <span className="text-xs text-slate-500 uppercase font-semibold mr-2">{t('dynamic_label')}</span>
                      <button
                        ref={dynamicsButtonRef}
                        className={`w-12 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-all ${showDynamicsMenu ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                        onClick={() => setShowDynamicsMenu(!showDynamicsMenu)}
                        title={t('dynamics')}
                      >
                        <span className="font-serif italic">&lt;mf&gt;</span>
                      </button>
                      
                      {showDynamicsMenu && dynamicsButtonRef.current && (
                        <div 
                          className="fixed mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-[300] animate-in fade-in slide-in-from-top-2 duration-200 flex flex-wrap gap-1 w-[140px]"
                          style={{
                            top: dynamicsButtonRef.current.getBoundingClientRect().bottom,
                            left: dynamicsButtonRef.current.getBoundingClientRect().left,
                          }}
                        >
                          {['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', '< >', 'X'].map(d => {
                            const isSelected = d === '< >' 
                              ? activeScore.dynamicTransitions?.some(t => selectedNoteIds.includes(t.startNoteId) && selectedNoteIds.includes(t.endNoteId))
                              : activeScore.notes.some(n => selectedNoteIds.includes(n.id) && n.dynamic === d);
                            return (
                              <button
                                key={d}
                                className={`w-10 h-10 flex items-center justify-center rounded-md text-sm font-bold transition-all ${isSelected ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'}`}
                                onClick={() => {
                                  if (d === '< >') {
                                    handleDynamicTransition();
                                  } else {
                                    handleDynamicChange(d === 'X' ? null : d as any);
                                  }
                                }}
                                title={d === 'X' ? t('remove_dynamic') : d === '< >' ? 'Crescendo / Decrescendo' : t('dynamic', { d })}
                              >
                                <span className={d !== 'X' && d !== '< >' ? "font-serif italic" : ""}>{d}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {toolbarViewMode === 0 && (
                    <div className="w-px h-6 bg-slate-800" />
                  )}

                  {(toolbarViewMode === 0 || toolbarViewMode === 5) && (
                    <div className={`relative flex items-center gap-1 transition-opacity ${selectedNoteIds.length === 0 ? 'opacity-30 pointer-events-none' : ''}`}>
                      <span className="text-xs text-slate-500 uppercase font-semibold mr-2">Artic.</span>
                      <button
                        ref={articulationsButtonRef}
                        className={`w-12 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-all ${showArticulationsMenu ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                        onClick={() => setShowArticulationsMenu(!showArticulationsMenu)}
                        title="Articulaciones"
                      >
                        <span className="font-serif font-bold">. &gt; _</span>
                      </button>
                      
                      {showArticulationsMenu && articulationsButtonRef.current && (
                        <div 
                          className="fixed mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-[300] animate-in fade-in slide-in-from-top-2 duration-200 flex flex-wrap gap-1 w-[140px]"
                          style={{
                            top: articulationsButtonRef.current.getBoundingClientRect().bottom,
                            left: articulationsButtonRef.current.getBoundingClientRect().left,
                          }}
                        >
                          {[
                            { id: 'staccato', label: '.', title: 'Staccato' },
                            { id: 'staccatissimo', label: 'S!', title: 'Staccatissimo' },
                            { id: 'accent', label: '>', title: 'Acento' },
                            { id: 'tenuto', label: '_', title: 'Tenuto' }
                          ].map(art => {
                            const selectedNotes = activeScore.notes.filter(n => selectedNoteIds.includes(n.id));
                            const isSelected = selectedNotes.length > 0 && selectedNotes.every(n => n.articulation === art.id);
                            return (
                              <button
                                key={art.id}
                                className={`w-10 h-10 flex items-center justify-center rounded-md text-sm font-bold transition-all ${isSelected ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'}`}
                                onClick={() => handleArticulationChange(art.id as any)}
                                title={art.title}
                              >
                                <span className="font-serif font-bold text-lg">{art.label}</span>
                              </button>
                            );
                          })}
                          <button
                            className={`w-10 h-10 flex items-center justify-center rounded-md text-sm font-bold transition-all ${
                              selectedNoteIds.length === 2 
                                ? (() => {
                                    const selectedNotes = activeScore.notes.filter(n => selectedNoteIds.includes(n.id));
                                    selectedNotes.sort((a, b) => a.startTime - b.startTime);
                                    const hasGlissando = selectedNotes[0].glissandoTargetId === selectedNotes[1].id;
                                    return hasGlissando 
                                      ? 'opacity-100 bg-purple-600 text-white shadow-md shadow-purple-900/50' 
                                      : 'opacity-100 bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white';
                                  })()
                                : 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500'
                            }`}
                            onClick={() => {
                              if (selectedNoteIds.length !== 2) return;
                              handleGlissando();
                            }}
                            title="Glissando (~)"
                          >
                            <span className="font-serif font-bold text-lg">~</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {toolbarViewMode === 0 && (
                    <div className="w-px h-6 bg-slate-800" />
                  )}

                  {(toolbarViewMode === 0 || toolbarViewMode === 6) && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 uppercase font-semibold mr-2">Tempo</span>
                      <input 
                        type="number" 
                        min="60" 
                        max="200" 
                        value={Number.isNaN(tempo) ? '' : tempo} 
                        onChange={(e) => handleTempoChange(e.target.value === '' ? NaN : parseInt(e.target.value))}
                        className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-center text-white font-bold"
                        title="Tempo de la partitura (BPM)"
                      />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              
              <div className="flex-1" />

              <div className="z-10 bg-slate-900/90 backdrop-blur-md pl-4 py-2 flex items-center shadow-[-10px_0_15px_-5px_rgba(15,23,42,0.8)]">
                <button 
                  className="px-4 py-1.5 rounded-md text-sm font-medium bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50 hover:text-red-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                  disabled={selectedNoteIds.length === 0 && selectedBarlineIds.length === 0}
                  onClick={deleteSelected}
                >
                  {(selectedNoteIds.length > 1 || selectedBarlineIds.length > 1) ? t('delete_selection_btn') : t('delete_element')}
                </button>
              </div>
            </div>
          )}

          <div 
            ref={scoreContainerRef}
            className="flex-1 overflow-auto py-4 md:py-8 pb-32 md:pb-24 relative select-none"
            onWheel={handleUserScroll}
            onTouchMove={handleUserScroll}
            onPointerDown={(e) => {
              if (e.pointerType === 'touch') return; // Disable selection on touch devices
              if (e.button !== 0 || mode !== 'cursor' || (currentTool !== 'cursor' && currentTool !== 'barline')) return;
              if ((e.target as HTMLElement).closest('.note-element') || (e.target as HTMLElement).closest('.barline-element') || (e.target as HTMLElement).closest('button')) return;
              
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
              const y = e.clientY - rect.top + e.currentTarget.scrollTop;
              
              setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
              setIsDraggingSelection(false);
            }}
            onPointerMove={(e) => {
              if (!selectionBox || mode !== 'cursor') return;
              
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
              const y = e.clientY - rect.top + e.currentTarget.scrollTop;
              
              if (!isDraggingSelection) {
                const dx = Math.abs(x - selectionBox.startX);
                const dy = Math.abs(y - selectionBox.startY);
                if (dx > 5 || dy > 5) {
                  setIsDraggingSelection(true);
                }
              }
              
              if (isDraggingSelection) {
                setSelectionBox({ ...selectionBox, endX: x, endY: y });
              }
            }}
            onPointerUp={(e) => {
              if (!selectionBox || mode !== 'cursor') return;
              
              if (isDraggingSelection) {
                const left = Math.min(selectionBox.startX, selectionBox.endX);
                const right = Math.max(selectionBox.startX, selectionBox.endX);
                const top = Math.min(selectionBox.startY, selectionBox.endY);
                const bottom = Math.max(selectionBox.startY, selectionBox.endY);
                
                const noteElements = document.querySelectorAll('.note-element');
                const barlineElements = document.querySelectorAll('.barline-element');
                const newSelectedIds: string[] = [];
                const newSelectedBarlineIds: string[] = [];
                
                const containerRect = e.currentTarget.getBoundingClientRect();
                
                noteElements.forEach(el => {
                  if (currentTool !== 'cursor') return;
                  const noteRect = el.getBoundingClientRect();
                  const noteLeft = noteRect.left - containerRect.left + e.currentTarget.scrollLeft;
                  const noteRight = noteRect.right - containerRect.left + e.currentTarget.scrollLeft;
                  const noteTop = noteRect.top - containerRect.top + e.currentTarget.scrollTop;
                  const noteBottom = noteRect.bottom - containerRect.top + e.currentTarget.scrollTop;
                  
                  if (noteLeft < right && noteRight > left && noteTop < bottom && noteBottom > top) {
                    const id = el.getAttribute('data-note-id');
                    if (id) newSelectedIds.push(id);
                  }
                });

                barlineElements.forEach(el => {
                  if (currentTool !== 'barline') return;
                  const barRect = el.getBoundingClientRect();
                  const barLeft = barRect.left - containerRect.left + e.currentTarget.scrollLeft;
                  const barRight = barRect.right - containerRect.left + e.currentTarget.scrollLeft;
                  const barTop = barRect.top - containerRect.top + e.currentTarget.scrollTop;
                  const barBottom = barRect.bottom - containerRect.top + e.currentTarget.scrollTop;
                  
                  if (barLeft < right && barRight > left && barTop < bottom && barBottom > top) {
                    const id = el.getAttribute('data-barline-id');
                    if (id) newSelectedBarlineIds.push(id);
                  }
                });
                
                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                  setSelectedNoteIds(prev => Array.from(new Set([...prev, ...newSelectedIds])));
                  setSelectedBarlineIds(prev => Array.from(new Set([...prev, ...newSelectedBarlineIds])));
                } else {
                  setSelectedNoteIds(Array.from(new Set(newSelectedIds)));
                  setSelectedBarlineIds(Array.from(new Set(newSelectedBarlineIds)));
                }
              }
              
              setSelectionBox(null);
              setIsDraggingSelection(false);
            }}
            onPointerLeave={() => {
              if (selectionBox) {
                setSelectionBox(null);
                setIsDraggingSelection(false);
              }
            }}
          >
            {/* Selection Box Rendering */}
            {isDraggingSelection && selectionBox && (
              <div 
                className="absolute border border-blue-500 bg-blue-500/20 pointer-events-none z-50"
                style={{
                  left: Math.min(selectionBox.startX, selectionBox.endX),
                  top: Math.min(selectionBox.startY, selectionBox.endY),
                  width: Math.abs(selectionBox.endX - selectionBox.startX),
                  height: Math.abs(selectionBox.endY - selectionBox.startY)
                }}
              />
            )}
            
            {mode === 'text' ? (
              <div className="max-w-4xl mx-auto min-h-full flex flex-col gap-4 pb-8">
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 text-sm text-slate-400 relative overflow-hidden">
                  <button 
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                    onClick={() => setShowInstructions(!showInstructions)}
                  >
                    <span className="font-bold text-slate-200">{t('format_and_shortcuts')} 😎</span>
                    {showInstructions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  
                  {showInstructions && (
                    <div className="p-4 pt-0 border-t border-slate-800/50 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div>
                          <h3 className="text-slate-200 font-bold mb-2">{t('note_format_title')}</h3>
                          <p className="mb-2"><strong className="text-slate-200">{t('format')}</strong> [Nota][Alteración][Figura][Punto][Octava]</p>
                          <p className="mb-1"><strong className="text-slate-200">{t('notes')}</strong> DO, RE, MI, FA, SOL, LA, SI</p>
                          <p className="mb-1"><strong className="text-slate-200">{t('alterations')}</strong> # (sostenido), - (bemol), o nada</p>
                          <p className="mb-1"><strong className="text-slate-200">{t('figures')}</strong> F (fusa), S (semicorchea), C (corchea), N (negra), B (blanca), R (redonda)</p>
                          <p className="mb-1"><strong className="text-slate-200">{t('extras')}</strong> . (puntillo), / (línea divisoria)</p>
                          <p className="mb-2"><strong className="text-slate-200">{t('octaves')}</strong> Referencia: Do central = 4</p>
                          <p><strong className="text-slate-200">{t('example')}</strong> DON4 DO#B4 / RES4 / RE-S4 FAR4</p>
                          <p className="mt-2 text-xs text-slate-500 italic">{t('note_horizontal_position')}</p>
                        </div>
                        <div>
                          <h3 className="text-slate-200 font-bold mb-2">{t('keyboard_shortcuts')}</h3>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Espacio</kbd> {t('play_stop')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Ctrl+Z</kbd> {t('undo_shortcut')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Ctrl+Y</kbd> {t('redo_shortcut')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Ctrl+C</kbd> {t('copy_shortcut')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Ctrl+V</kbd> {t('paste_shortcut')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Ctrl+X</kbd> {t('cut_shortcut')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Ctrl+D</kbd> {t('duplicate_shortcut')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">H</kbd> {t('insert_measure')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">G</kbd> {t('show_dpad')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">F</kbd> Fusa</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Ctrl+A</kbd> {t('select_all')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Supr</kbd> {t('delete_shortcut')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Flechas</kbd> {t('move')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Shift+Flechas</kbd> {t('accumulate_selection')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Ctrl+Flechas</kbd> {t('navigate_notes')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Ctrl+.</kbd> {t('sharp_shortcut')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Ctrl+,</kbd> {t('flat_shortcut')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Ctrl+M</kbd> {t('dynamics_repeat')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Ctrl+&lt;</kbd> {t('hairpins_repeat')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">F,S,C,N,B,R</kbd> {t('change_figure')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">.</kbd> {t('dotted')}</li>
                            <li className="flex items-center gap-2"><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">3</kbd> {t('triplet_shortcut')}</li>
                          </ul>
                          <p className="text-[10px] text-slate-500 mt-2">{t('requires_barline')}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <textarea 
                  className="w-full bg-slate-900 text-slate-100 p-6 font-mono text-lg rounded-xl border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-y shadow-inner leading-relaxed min-h-[200px]"
                  value={textValue}
                  onChange={handleTextChange}
                  placeholder={t('write_music_placeholder')}
                  spellCheck={false}
                />
                
                <div className="flex justify-between items-center mt-4">
                  <h3 className="text-lg font-bold text-slate-200">{t('note_names_preview')}</h3>
                  <button 
                    onClick={exportTextNotes}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all border border-slate-700"
                  >
                    <Download size={16} />
                    {t('export_note_names')}
                  </button>
                  <button 
                    onClick={exportMidi}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all border border-slate-700"
                  >
                    <Download size={16} />
                    {t('export_midi_mid')}
                  </button>
                  <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all border border-slate-700 cursor-pointer">
                    <Download size={16} className="rotate-180" />
                    {t('import_midi_mid')}
                    <input type="file" accept=".mid,.midi" className="hidden" onChange={handleMidiImport} />
                  </label>
                </div>
                
                <div id="text-notes-export-area" className="bg-slate-900 p-8 rounded-xl block min-h-[100px] border border-slate-800 h-auto shrink-0">
                  {systemBoundaries.map((boundary, sysIdx) => {
                    const systemStartTime = boundary.startTime;
                    const systemEndTime = boundary.endTime;
                    
                    const systemNotes = activeScore.notes.filter(n => n.startTime >= systemStartTime && n.startTime < systemEndTime).sort((a, b) => a.startTime - b.startTime);
                    const systemBarlines = (activeScore.barlines || []).filter(b => b.startTime >= systemStartTime && b.startTime < systemEndTime).sort((a, b) => a.startTime - b.startTime);
                    
                    if (systemNotes.length === 0 && systemBarlines.length === 0) {
                      return null;
                    }

                    const groups: Note[][] = [];
                    let currentGroup: Note[] = [];
                    
                    const allItems = [
                      ...systemNotes.map(n => ({ type: 'note' as const, data: n, time: n.startTime })),
                      ...systemBarlines.map(b => ({ type: 'barline' as const, data: b, time: b.startTime }))
                    ].sort((a, b) => a.time - b.time);

                    allItems.forEach(item => {
                      if (item.type === 'barline') {
                        groups.push(currentGroup);
                        currentGroup = [];
                      } else {
                        currentGroup.push(item.data as Note);
                      }
                    });
                    groups.push(currentGroup);

                    return (
                      <div key={sysIdx} className="flex flex-col gap-2 items-start w-full mb-4 last:mb-0">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Sistema {sysIdx + 1}</div>
                        <div className="flex flex-wrap gap-4 items-start content-start w-full">
                          {groups.map((group, grpIdx) => {
                            // Group notes by startTime within the measure
                            const timeGroups = group.reduce((acc, note) => {
                              if (!acc[note.startTime]) acc[note.startTime] = [];
                              acc[note.startTime].push(note);
                              return acc;
                            }, {} as Record<number, Note[]>);

                            const sortedTimes = Object.keys(timeGroups).map(Number).sort((a, b) => a - b);

                            return (
                              <div 
                                key={grpIdx} 
                                className={`note-group-export flex flex-wrap gap-2 items-start content-start ${systemBarlines.length > 0 ? 'bg-slate-800/50 p-3 rounded-xl border border-slate-700/50' : ''}`}
                              >
                                {sortedTimes.length > 0 ? sortedTimes.map(time => {
                                  const notesAtTime = timeGroups[time];
                                  const ks = getKeySignatureAt(time, activeScore.keySignatures || []);
                                  const sortedNotes = [...notesAtTime].sort((a, b) => getMidiNumber(b, ks) - getMidiNumber(a, ks));
                                  
                                  if (sortedNotes.length >= 3) {
                                    const chordName = detectChord(sortedNotes, ks);
                                    if (chordName) {
                                      return (
                                        <div 
                                          key={`chord-${time}`}
                                          className="note-item-export px-3 py-2 rounded-md font-bold text-white shadow-md flex items-center justify-center min-w-[3rem] bg-purple-600"
                                        >
                                          {chordName}
                                        </div>
                                      );
                                    }
                                  }
                                  
                                  if (sortedNotes.length > 1) {
                                    return (
                                      <div key={`stack-${time}`} className="note-item-export flex flex-col gap-1">
                                        {sortedNotes.map(note => (
                                          <div 
                                            key={note.id}
                                            className="px-3 py-1 rounded-md font-bold text-white shadow-md flex items-center justify-center min-w-[3rem] text-xs"
                                            style={{ 
                                              backgroundColor: PITCH_COLORS[note.pitch],
                                              border: note.alteration === '#' ? '2px solid black' : note.alteration === '-' ? '2px solid white' : '2px solid transparent'
                                            }}
                                          >
                                            {note.pitch}{note.alteration}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  }

                                  const note = sortedNotes[0];
                                  return (
                                    <div 
                                      key={note.id}
                                      className="note-item-export px-3 py-2 rounded-md font-bold text-white shadow-md flex items-center justify-center min-w-[3rem]"
                                      style={{ 
                                        backgroundColor: PITCH_COLORS[note.pitch],
                                        border: note.alteration === '#' ? '2px solid black' : note.alteration === '-' ? '2px solid white' : '2px solid transparent'
                                      }}
                                    >
                                      {note.pitch}{note.alteration}
                                    </div>
                                  );
                                }) : (
                                  systemBarlines.length > 0 && <div className="text-slate-600 italic text-sm py-2 px-1">Vacío</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex w-full min-w-max">
                <div 
                  id="score-export-area" 
                  className="flex flex-col gap-12 items-center pb-24 flex-1 px-4 md:px-8"
                  style={{ width: 'fit-content', margin: '0 auto' }}
                >
                  <div id="export-title" className="hidden flex items-center justify-center gap-4 mb-4 w-full">
                    <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" className="w-12 h-12 object-contain drop-shadow-md" referrerPolicy="no-referrer" />
                    <h1 className={`text-3xl font-bold tracking-wider uppercase ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{activeScore.title}</h1>
                  </div>
                  {systemBoundaries.map((boundary, i) => (
                    <System 
                      key={i} 
                      theme={theme}
                      systemIndex={i} 
                      systemStartTime={boundary.startTime}
                      systemEndTime={boundary.endTime}
                      notes={activeScore.notes.filter(n => {
                        const noteStart = n.startTime;
                        const noteEnd = noteStart + getDurationValue(n.duration, n.isDotted, n.isTriplet);
                        return noteStart < boundary.endTime && noteEnd > boundary.startTime;
                      })} 
                      allNotes={activeScore.notes}
                      barlines={(activeScore.barlines || []).filter(b => b.startTime >= boundary.startTime && b.startTime <= boundary.endTime)}
                      phraseBarlines={(activeScore.phraseBarlines || []).filter(b => b.startTime >= boundary.startTime && b.startTime <= boundary.endTime)}
                      timeSignatures={activeScore.timeSignatures || []}
                      keySignatures={activeScore.keySignatures || []}
                      clefSignatures={activeScore.clefSignatures || []}
                      isGrandStaff={activeScore.isGrandStaff || false}
                      groupedRests={activeScore.groupedRests || []}
                      emptyMeasureSequences={emptyMeasureSequences}
                      isBarMode={activeScore.isBarMode || false}
                      hasManualBarlines={(activeScore.phraseBarlines || []).length > 0}
                      gridSubdivision={gridSubdivision}
                      scoreShape={activeScore.shape}
                      selectedNoteIds={selectedNoteIds}
                      selectedBarlineIds={selectedBarlineIds}
                      onNoteClick={handleNoteClick}
                      onNoteDragStart={(note, e) => handleNoteDragStart(note, i, e)}
                      onBarlineClick={handleBarlineClick}
                      onAddNote={addNote}
                      onAddBarline={addBarline}
                      onUpdateBarline={updateBarline}
                      onDeleteSystem={deleteSystem}
                      onUpdateTimeSignature={updateTimeSignature}
                      onDeleteTimeSignature={deleteTimeSignature}
                      onUpdateKeySignature={updateKeySignature}
                      onDeleteKeySignature={deleteKeySignature}
                      onUpdateClefSignature={updateClefSignature}
                      onDeleteClefSignature={deleteClefSignature}
                      onUpdateSystemMeasures={updateSystemMeasures}
                      onGroupRests={groupRests}
                      onUngroupRests={ungroupRests}
                      currentTool={currentTool}
                      playingNoteIds={currentNoteIds}
                      systemText={activeScore.systemTexts?.[i] || ''}
                      textOptions={activeScore.textOptions}
                      isExporting={isExporting}
                      onUpdateSystemText={(sysIdx, text) => {
                        const newTexts = [...(activeScore.systemTexts || [])];
                        newTexts[sysIdx] = text;
                        updateActiveScore({ systemTexts: newTexts });
                      }}
                      isExtendedStaff={isExtendedStaffView && !isExporting}
                      dynamicTransitions={activeScore.dynamicTransitions || []}
                    />
                  ))}
                </div>
                {isExtendedStaffView && showSidePiano && (
                  <div className="sticky right-0 top-0 z-50 pointer-events-none" style={{ width: 20, height: activeScore.isGrandStaff ? 600 : 540 }}>
                    <HorizontalPiano 
                      isGrandStaff={activeScore.isGrandStaff || false}
                      clef={activeScore.clefSignatures?.[0]?.clef || 'treble'}
                      isExtendedStaff={isExtendedStaffView}
                      onNoteClick={(pitch, octave, alteration) => {
                        playSingleNote(pitch, octave, alteration);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
        </div>
      </div>
      {/* Floating Delete Button */}
      {(selectedNoteIds.length > 0 || selectedBarlineIds.length > 0) && (
        <button 
          className="fixed bottom-24 right-8 w-14 h-14 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-red-500 transition-all animate-in zoom-in duration-200 z-[100]"
          onClick={deleteSelected}
        >
          <Trash2 size={24} />
        </button>
      )}

      {/* Dynamic Error Toast */}
      {dynamicError && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold z-[1000] animate-in fade-in slide-in-from-bottom-4 duration-300">
          {dynamicError}
        </div>
      )}

      {/* Tutorial Overlay */}
      {tutorialStep === 0 && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 p-6 rounded-2xl shadow-2xl max-w-md text-center border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">¡Bienvenid@ a Play Colora!</h2>
            <p className="text-slate-300 mb-6">Haz click en donde quieras una nota, las puedes mover con las flechas o arrastrando con el cursor.</p>
            <button 
              onClick={nextTutorialStep}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold transition-colors"
            >
              Oki
            </button>
          </div>
        </div>
      )}

      {tutorialStep === 1 && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          {tutorialStep1Ref.current && (
            <div 
              className="absolute pointer-events-auto"
              style={{
                top: tutorialStep1Ref.current.getBoundingClientRect().top,
                left: tutorialStep1Ref.current.getBoundingClientRect().left,
                width: tutorialStep1Ref.current.getBoundingClientRect().width,
                height: tutorialStep1Ref.current.getBoundingClientRect().height,
              }}
            >
              <button className="w-full h-full flex items-center justify-center rounded-md bg-purple-600 text-white shadow-md relative z-[10000] ring-4 ring-purple-500 ring-opacity-50">
                <Hash size={16} />
              </button>
            </div>
          )}
          <div className="absolute top-[180px] left-20 bg-slate-800 p-4 rounded-xl shadow-2xl max-w-[250px] border border-purple-500 pointer-events-auto">
            <div className="absolute -left-2 top-4 w-4 h-4 bg-slate-800 border-l border-b border-purple-500 transform rotate-45" />
            <p className="text-slate-300 mb-4 text-sm">Si ya sabes escribir partituras aquí puedes configurar clave, cifra, armadura y barras de repetición</p>
            <button 
              onClick={nextTutorialStep}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-lg font-bold transition-colors text-sm w-full"
            >
              Oki
            </button>
          </div>
        </div>
      )}

      {tutorialStep === 2 && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          {tutorialStep2Ref.current && (
            <div 
              className="absolute pointer-events-auto"
              style={{
                top: tutorialStep2Ref.current.getBoundingClientRect().top,
                left: tutorialStep2Ref.current.getBoundingClientRect().left,
                width: tutorialStep2Ref.current.getBoundingClientRect().width,
                height: tutorialStep2Ref.current.getBoundingClientRect().height,
              }}
            >
              <button className="w-full h-full flex items-center gap-2 px-3 lg:px-4 py-1.5 rounded-md text-sm font-medium transition-all bg-slate-700 text-white shadow-sm relative z-[10000] ring-4 ring-purple-500 ring-opacity-50">
                <FileText size={14} />
                <span className="hidden sm:inline">{t('text')}</span>
              </button>
            </div>
          )}
          <div className="absolute top-24 left-1/2 -translate-x-1/2 md:left-[350px] md:translate-x-0 bg-slate-800 p-4 rounded-xl shadow-2xl max-w-[250px] border border-purple-500 pointer-events-auto">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-800 border-t border-l border-purple-500 transform rotate-45" />
            <p className="text-slate-300 mb-4 text-sm">Aquí están los atajos para escribir rápido 😎</p>
            <button 
              onClick={closeTutorial}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-lg font-bold transition-colors text-sm w-full"
            >
              Oki
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
