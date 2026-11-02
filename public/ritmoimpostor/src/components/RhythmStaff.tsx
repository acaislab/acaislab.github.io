import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as Tone from 'tone';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RhythmNote } from '../types';
import { NotationSVG, TrebleClefSVG } from './Notation';
import { getDurationValue, isRest } from '../lib/gameLogic';

interface RhythmStaffProps {
  rhythm: RhythmNote[];
  level: number;
  isSmall?: boolean;
  highlightDiffWith?: RhythmNote[];
  isPlaying?: boolean;
  currentPlayingIndex?: number | null;
  tempo?: number;
  isAutoscrollDisabled?: boolean;
}

export const RhythmStaff: React.FC<RhythmStaffProps> = ({ 
  rhythm, 
  level, 
  isSmall = false, 
  highlightDiffWith,
  isPlaying = false,
  tempo = 120,
  isAutoscrollDisabled = false
}) => {
  const isMelodic = level >= 10;
  const scoreContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const userScrollTimeRef = useRef(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollBoundaries = () => {
    if (!scoreContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scoreContainerRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  };

  const handleUserScroll = () => {
    userScrollTimeRef.current = Date.now();
    checkScrollBoundaries();
  };

  const scrollByDelta = (delta: number) => {
    if (!scoreContainerRef.current) return;
    scoreContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    userScrollTimeRef.current = Date.now();
    setTimeout(checkScrollBoundaries, 250);
  };

  const noteStartTimesBeats = useMemo(() => {
    let currentBeat = 0;
    return rhythm.map(note => {
      const start = currentBeat;
      const duration = getDurationValue(note.type);
      currentBeat += duration;
      return { start, duration };
    });
  }, [rhythm]);

  const noteCentersRef = useRef<number[]>([]);

  useEffect(() => {
    const updateCenters = () => {
      if (!scoreContainerRef.current) return;
      const container = scoreContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const centers: number[] = [];
      for (let i = 0; i < rhythm.length; i++) {
        const noteEl = container.querySelector(`#note-${i}`);
        if (noteEl) {
          const rect = noteEl.getBoundingClientRect();
          const absoluteLeft = rect.left - containerRect.left + container.scrollLeft;
          centers.push(absoluteLeft + rect.width / 2);
        } else {
          centers.push(0);
        }
      }
      noteCentersRef.current = centers;
      checkScrollBoundaries();
    };
    
    const timer = setTimeout(updateCenters, 50);
    window.addEventListener('resize', updateCenters);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateCenters);
    };
  }, [rhythm, isSmall]);

  // When changing crew member (rhythm identity changes), start from beat 1
  const prevRhythmRef = useRef(rhythm);
  useEffect(() => {
    if (prevRhythmRef.current !== rhythm) {
      prevRhythmRef.current = rhythm;
      if (scoreContainerRef.current) {
        scoreContainerRef.current.scrollLeft = 0;
      }
      checkScrollBoundaries();
    }
  }, [rhythm]);

  // ONLY reset scrollLeft if autoscroll is enabled and playback finishes.
  // When autoscroll is disabled, do NOT touch scrollLeft so the user can freely scroll manually!
  useEffect(() => {
    if (!isAutoscrollDisabled && !isPlaying && scoreContainerRef.current) {
      scoreContainerRef.current.scrollLeft = 0;
      checkScrollBoundaries();
    }
  }, [isPlaying, isAutoscrollDisabled]);

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

      // Allow user manual scroll override for 2 seconds
      if (Date.now() - userScrollTimeRef.current < 2000) {
        scrollAnimationRef.current = requestAnimationFrame(smoothScroll);
        return;
      }

      const beatSec = 60 / tempo;
      const startTime = 4 * beatSec; // 4 beats countdown
      
      const currentTime = Tone.Transport.seconds;
      
      if (Tone.Transport.state !== 'started') {
        scrollAnimationRef.current = requestAnimationFrame(smoothScroll);
        return;
      }

      if (currentTime < startTime) {
        container.scrollLeft = 0;
      } else {
        const elapsedRhythmTime = currentTime - startTime;
        const currentBeatElapsed = elapsedRhythmTime / beatSec;
        
        let visualIndex = 0;
        const lastNote = noteStartTimesBeats[noteStartTimesBeats.length - 1];
        if (lastNote) {
          const totalBeats = lastNote.start + lastNote.duration;

          if (currentBeatElapsed >= totalBeats) {
            visualIndex = rhythm.length - 1;
          } else {
            for (let i = 0; i < noteStartTimesBeats.length; i++) {
              const { start, duration } = noteStartTimesBeats[i];
              if (currentBeatElapsed >= start && currentBeatElapsed < start + duration) {
                const progressWithinNote = (currentBeatElapsed - start) / duration;
                visualIndex = i + progressWithinNote;
                break;
              }
            }
          }
        }

        const centers = noteCentersRef.current;
        let targetPixel = 0;
        
        if (centers.length > 0) {
          const maxIndex = centers.length - 1;
          const i = Math.floor(visualIndex);
          if (i >= maxIndex) {
            targetPixel = centers[maxIndex];
          } else {
            const frac = visualIndex - i;
            targetPixel = centers[i] + frac * (centers[i+1] - centers[i]);
          }
        }
        
        const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
        const targetScrollLeft = targetPixel - (container.clientWidth / 2);
        
        container.scrollLeft = Math.max(0, Math.min(maxScroll, targetScrollLeft));
      }
      
      scrollAnimationRef.current = requestAnimationFrame(smoothScroll);
    };

    scrollAnimationRef.current = requestAnimationFrame(smoothScroll);

    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, [isPlaying, tempo, isAutoscrollDisabled, noteStartTimesBeats, rhythm.length]);

  return (
    <div className="relative w-full group">
      {/* Left Scroll Nudge Arrow */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByDelta(-180)}
          aria-label="Desplazar a la izquierda"
          className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900/90 border border-slate-700/80 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 transition-all opacity-85 hover:opacity-100"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Right Scroll Nudge Arrow */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByDelta(180)}
          aria-label="Desplazar a la derecha"
          className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900/90 border border-slate-700/80 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 transition-all opacity-85 hover:opacity-100"
        >
          <ChevronRight size={16} />
        </button>
      )}

      <div 
        ref={scoreContainerRef}
        onScroll={handleUserScroll}
        className="w-full max-w-full rounded-2xl border bg-slate-950/60 border-slate-800/80 overflow-x-auto shadow-inner touch-pan-x overscroll-x-contain"
      >
        <div 
          className="relative min-w-max flex items-center justify-start px-4 sm:px-6"
          style={{ minHeight: isSmall ? '88px' : '140px' }}
        >
          {/* LEVEL < 10: Single neutral rhythm guide line */}
          {!isMelodic && (
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="border-b-2 border-slate-600/40 w-full" />
            </div>
          )}

          {/* LEVEL >= 10: 5-Line Melodic Pentagram with Treble Clef */}
          {isMelodic && (
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col justify-between h-[44px]">
              <div className="border-b border-slate-500/50 w-full" />
              <div className="border-b border-slate-500/50 w-full" />
              <div className="border-b border-slate-500/50 w-full" />
              <div className="border-b border-slate-500/50 w-full" />
              <div className="border-b border-slate-500/50 w-full" />
            </div>
          )}

          <div className="relative flex items-center gap-2.5 sm:gap-3 z-10 select-none py-3 sm:py-4">
            {/* Treble Clef for Melodic levels */}
            {isMelodic && (
              <div className="flex items-center pr-1 text-slate-300">
                <TrebleClefSVG className={isSmall ? "w-6 h-14" : "w-9 h-20 sm:w-10 sm:h-22"} color="#93c5fd" />
              </div>
            )}

            {rhythm.map((note, idx) => {
              const rest = isRest(note.type);
              
              // Melodic staff vertical placement
              let translateY = 0;
              let hasLedger = false;

              if (isMelodic && !rest) {
                const step = note.staffStep ?? 4; // default G4 (line 2)
                const stepPx = isSmall ? 3.8 : 5.5;
                translateY = (6 - step) * stepPx;
                if (step === 0) {
                  hasLedger = true; // C4 ledger line below staff
                }
              }

              let isDifferent = false;
              if (highlightDiffWith && highlightDiffWith[idx]) {
                const cmp = highlightDiffWith[idx];
                const typeDiff = note.type !== cmp.type;
                const pitchDiff = isMelodic && (note.pitch !== cmp.pitch || note.accidental !== cmp.accidental);
                isDifferent = typeDiff || pitchDiff;
              }

              // Measure divider check: if 8-beat piece, render barline at 4 beats
              const isBarlineBefore = idx > 0 && noteStartTimesBeats[idx]?.start === 4;

              return (
                <React.Fragment key={idx}>
                  {isBarlineBefore && (
                    <div 
                      className={`border-r-2 border-slate-500/70 mx-1 self-center ${isSmall ? 'h-8' : 'h-12 sm:h-14'}`} 
                      title="División de compás"
                    />
                  )}
                  <div 
                    id={`note-${idx}`}
                    className="relative flex items-center justify-center transition-transform duration-200"
                    style={{ transform: `translateY(${translateY}px)` }}
                  >
                    {/* C4 Ledger Line if applicable */}
                    {hasLedger && (
                      <div className="absolute top-[75%] left-1/2 -translate-x-1/2 w-7 sm:w-8 h-[2px] bg-slate-400 pointer-events-none" />
                    )}

                    <NotationSVG 
                      type={note.type} 
                      accidental={note.accidental}
                      className={`${isSmall ? 'w-6 h-10 sm:w-7 sm:h-11' : 'w-8 h-13 sm:w-10 sm:h-16'} text-white`} 
                      highlight={isDifferent} 
                    />
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
