import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { Soundfont, Reverb } from 'smplr';
import { AudioWorkletNode } from 'standardized-audio-context';
import { Score, Note, Barline, Pitch, Duration, TimeSignature, KeySignature } from '../types';
import { DURATION_UNITS } from '../constants';
import { getDurationValue, getBarLength, unrollScore, UnrolledNote, TimeMapEntry, getOriginalTime, getDynamicGainAtTime } from '../utils';
import { getKeySignatureAt } from '../utils/keySignatures';
import { PITCH_VALUES } from '../constants';

if (typeof window !== 'undefined') {
  (window as any).AudioWorkletNode = AudioWorkletNode;
}

type Instrument = 'piano' | 'violin' | 'flute' | 'guitar' | 'marimba' | 'synth';

export type MetronomeSound = 'wood' | 'digital' | 'analog';

type PlaybackProps = {
  notes: Note[];
  barlines: Barline[];
  timeSignatures: TimeSignature[];
  keySignatures?: KeySignature[];
  dynamicTransitions?: import('../types').DynamicTransition[];
  isBarMode: boolean;
};

const PITCH_MAP: Record<Pitch, string> = {
  DO: 'C',
  RE: 'D',
  MI: 'E',
  FA: 'F',
  SOL: 'G',
  LA: 'A',
  SI: 'B',
};

const INSTRUMENT_MAP: Record<Instrument, string> = {
  piano: 'acoustic_grand_piano',
  violin: 'violin',
  flute: 'flute',
  guitar: 'acoustic_guitar_nylon',
  marimba: 'marimba',
  synth: 'lead_1_square'
};

const RHYTHM_TO_NOTATION: Record<Duration, string> = {
  F: '32n',
  S: '16n',
  C: '8n',
  N: '4n',
  B: '2n',
  R: '1n'
};

export const usePlayback = ({ notes, barlines, timeSignatures, keySignatures = [], dynamicTransitions = [], isBarMode }: PlaybackProps) => {
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [timeMap, setTimeMap] = useState<TimeMapEntry[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNoteIds, setCurrentNoteIds] = useState<string[]>([]);
  const [tempo, setTempo] = useState(120);
  const [volume, setVolume] = useState(0.8); // 0.0 to 1.0
  const [instrument, setInstrument] = useState<Instrument>('piano');
  
  // Metronome state
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState(false);
  const [metronomeRhythm, setMetronomeRhythm] = useState<Duration>('N');
  const [isMetronomeDotted, setIsMetronomeDotted] = useState(false);
  const [metronomeSound, setMetronomeSound] = useState<MetronomeSound>('wood');
  const [metronomeVolume, setMetronomeVolume] = useState(0.5); // 0.0 to 1.0
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const samplersRef = useRef<Record<string, Soundfont>>({});
  const activeSamplerRef = useRef<Soundfont | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const loopRef = useRef<Tone.Loop | null>(null);
  const metronomeSynthRef = useRef<Tone.Synth | Tone.MembraneSynth | Tone.NoiseSynth | null>(null);
  const metronomeVolRef = useRef<Tone.Gain | null>(null);
  const reverbRef = useRef<Reverb | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const masterGainRef = useRef<Tone.Gain | null>(null);
  const dynamicGainRef = useRef<Tone.Gain | null>(null);

  // Initialize gain nodes
  useEffect(() => {
    if (!masterGainRef.current) {
      masterGainRef.current = new Tone.Gain(volume * 12.0).toDestination();
    }
    if (!dynamicGainRef.current) {
      dynamicGainRef.current = new Tone.Gain(1).connect(masterGainRef.current);
    }
  }, []);

  // Update main volume
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume * 12.0;
    }
  }, [volume]);

  // Update current playback time for autoscroll
  useEffect(() => {
    if (isPlaying) {
      const updateTime = () => {
        // Convert Tone.Transport.seconds to semicorchea units
        // 1 beat = 4 semicorcheas
        // beats per second = tempo / 60
        // semicorcheas per second = (tempo / 60) * 4
        const semicorcheasPerSecond = (Tone.Transport.bpm.value / 60) * 4;
        const unrolledTime = Tone.Transport.seconds * semicorcheasPerSecond;
        const originalTime = getOriginalTime(unrolledTime, timeMap);
        setCurrentPlaybackTime(originalTime);
        animationFrameRef.current = requestAnimationFrame(updateTime);
      };
      animationFrameRef.current = requestAnimationFrame(updateTime);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setCurrentPlaybackTime(0);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, timeMap]);

  // Update metronome volume
  useEffect(() => {
    if (!metronomeVolRef.current) {
      metronomeVolRef.current = new Tone.Gain(metronomeVolume).toDestination();
    } else {
      metronomeVolRef.current.gain.value = metronomeVolume;
    }
  }, [metronomeVolume]);

  // Update metronome synth
  useEffect(() => {
    if (metronomeSynthRef.current) {
      metronomeSynthRef.current.dispose();
    }
    
    if (!metronomeVolRef.current) {
      metronomeVolRef.current = new Tone.Gain(metronomeVolume).toDestination();
    }

    if (metronomeSound === 'wood') {
      metronomeSynthRef.current = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 1.5,
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 }
      }).connect(metronomeVolRef.current);
    } else if (metronomeSound === 'digital') {
      metronomeSynthRef.current = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 }
      }).connect(metronomeVolRef.current);
    } else {
      // analog
      metronomeSynthRef.current = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.01 }
      }).connect(metronomeVolRef.current);
    }
  }, [metronomeSound]);

  // Update metronome loop
  useEffect(() => {
    if (loopRef.current) {
      loopRef.current.dispose();
      loopRef.current = null;
    }

    if (isMetronomeEnabled) {
      const baseInterval = RHYTHM_TO_NOTATION[metronomeRhythm];
      const interval = isMetronomeDotted ? `${baseInterval}.` : baseInterval;
      
      loopRef.current = new Tone.Loop((time) => {
        if (!metronomeSynthRef.current) return;
        if (metronomeSound === 'digital') {
          (metronomeSynthRef.current as Tone.Synth).triggerAttackRelease("C6", "32n", time, 0.5);
        } else if (metronomeSound === 'wood') {
          (metronomeSynthRef.current as Tone.MembraneSynth).triggerAttackRelease("C5", "32n", time, 0.8);
        } else {
          (metronomeSynthRef.current as Tone.NoiseSynth).triggerAttackRelease("16n", time, 0.8);
        }
      }, interval);

      if (isPlaying) {
        loopRef.current.start(0);
      }
    }
  }, [isMetronomeEnabled, metronomeRhythm, isMetronomeDotted, metronomeSound, isPlaying]);

  // Update tempo
  useEffect(() => {
    if (Number.isFinite(tempo) && tempo > 0) {
      Tone.Transport.bpm.value = tempo;
    }
  }, [tempo]);

  // Global audio unlock for iOS
  useEffect(() => {
    const unlockAudio = async () => {
      await Tone.start();
      const context = Tone.getContext().rawContext as unknown as AudioContext;
      if (context.state === 'suspended') {
        await context.resume();
      }
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      gainNode.gain.value = 0;
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(0);
      oscillator.stop(context.currentTime + 0.001);
      
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
    
    document.addEventListener('pointerdown', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    
    return () => {
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Preload instrument
  useEffect(() => {
    const preloadInstrument = async () => {
      const context = Tone.getContext().rawContext as unknown as AudioContext;
      if (!samplersRef.current[instrument]) {
        try {
          const instrumentName = INSTRUMENT_MAP[instrument];
          
          const nativeGain = context.createGain();
          if (dynamicGainRef.current) {
            Tone.connect(nativeGain, dynamicGainRef.current);
          } else {
            Tone.connect(nativeGain, Tone.getDestination());
          }

          const sampler = new Soundfont(context, {
            instrument: instrumentName,
            destination: nativeGain,
          });
          
          if (!reverbRef.current) {
            reverbRef.current = new Reverb(context);
          }
          if (reverbRef.current) {
            sampler.output.addEffect("reverb", reverbRef.current, 0.2);
          }
          
          sampler.output.setVolume(127);
          
          samplersRef.current[instrument] = sampler;
          await sampler.load;
        } catch (error) {
          console.error(`Failed to preload instrument ${instrument}:`, error);
        }
      }
    };
    
    preloadInstrument();
  }, [instrument]);

  const stop = useCallback(() => {
    try {
      if (Tone.Transport.state === 'started') {
        Tone.Transport.stop();
      }
      Tone.Transport.cancel();
      if (partRef.current) {
        partRef.current.dispose();
        partRef.current = null;
      }
      if (loopRef.current) {
        loopRef.current.dispose();
        loopRef.current = null;
      }
    } catch (error) {
      console.error("Error stopping playback:", error);
    } finally {
      setIsPlaying(false);
      setCurrentNoteIds([]);
    }
  }, []);

  const play = useCallback(async (selectedNoteIds: string[] = []) => {
    if (isPlaying) {
      stop();
      return;
    }

    try {
      setPlaybackError(null);
      await Tone.start();
      const context = Tone.getContext().rawContext as unknown as AudioContext;
      
      if (context.state === 'suspended') {
        await context.resume();
      }

      // Play a silent buffer immediately to unlock audio on iOS
      const unlockAudio = () => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        gainNode.gain.value = 0;
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start(0);
        oscillator.stop(context.currentTime + 0.001);
      };
      unlockAudio();

      // Lazy initialize Reverb
      if (!reverbRef.current) {
        reverbRef.current = new Reverb(context);
      }

      // Ensure instrument is loaded
      if (!samplersRef.current[instrument]) {
        try {
          const instrumentName = INSTRUMENT_MAP[instrument];
          
          const nativeGain = context.createGain();
          if (dynamicGainRef.current) {
            Tone.connect(nativeGain, dynamicGainRef.current);
          } else {
            Tone.connect(nativeGain, Tone.getDestination());
          }

          const sampler = new Soundfont(context, {
            instrument: instrumentName,
            destination: nativeGain,
          });
          
          if (reverbRef.current) {
            sampler.output.addEffect("reverb", reverbRef.current, 0.2);
          }
          
          sampler.output.setVolume(127);
          
          samplersRef.current[instrument] = sampler;
          await sampler.load;
        } catch (error) {
          console.error(`Failed to load instrument ${instrument}:`, error);
          return;
        }
      } else {
        // Wait for it to finish loading if it's currently preloading
        await samplersRef.current[instrument].load;
      }
      
      activeSamplerRef.current = samplersRef.current[instrument];

      if (!activeSamplerRef.current) return;

      // Unroll the score to handle repeats
      const { unrolledNotes, timeMap: newTimeMap } = unrollScore(notes, barlines);
      setTimeMap(newTimeMap);
      
      let notesToPlay = unrolledNotes;
      let startOffset16n = 0;

      if (selectedNoteIds.length === 1) {
        // Play from the selected note
        const selectedNote = unrolledNotes.find(n => n.originalId === selectedNoteIds[0]);
        if (selectedNote) {
          startOffset16n = selectedNote.unrolledStartTime;
          notesToPlay = unrolledNotes.filter(n => n.unrolledStartTime >= startOffset16n);
        }
      } else if (selectedNoteIds.length > 1) {
        // Play ONLY selected notes
        notesToPlay = unrolledNotes.filter(n => selectedNoteIds.includes(n.originalId));
        if (notesToPlay.length > 0) {
          startOffset16n = Math.min(...notesToPlay.map(n => n.unrolledStartTime));
        }
      }

      // Prepare events
      const events = notesToPlay
        .filter(note => !note.isSilence)
        .map(note => {
          const pitchName = PITCH_MAP[note.pitch];
          // Use standard octave mapping (C4 = middle C)
          const octave = note.octave; 
          
          let effectiveAlteration = note.alteration;
          if (!effectiveAlteration) {
            const ks = getKeySignatureAt(note.startTime, keySignatures); // Use original startTime for key signature
            const pitchClass = PITCH_VALUES[note.pitch];
            const acc = ks.accidentals.find(a => a.pitchClass === pitchClass);
            if (acc) {
              effectiveAlteration = acc.alteration as any;
            }
          }

          const alteration = effectiveAlteration === '#' ? '#' : effectiveAlteration === '-' ? 'b' : '';
          const noteName = `${pitchName}${alteration}${octave}`;

          // Duration in 16th notes
          const duration16n = getDurationValue(note.duration, note.isDotted, note.isTriplet);
          
          // Start time in 16th notes (use unrolled time)
          const startTime16n = note.unrolledStartTime;

          // Check for accent
          let isAccented = false;
          if (isBarMode) {
            // Automatic accent based on time signatures (use original time for metric position)
            for (let i = 0; i < timeSignatures.length; i++) {
              const ts = timeSignatures[i];
              const nextTsTime = timeSignatures[i + 1]?.startTime ?? Infinity;
              const barLen = getBarLength(ts.numerator, ts.denominator);
              
              if (note.startTime >= ts.startTime && note.startTime < nextTsTime) {
                if ((note.startTime - ts.startTime) % barLen === 0) {
                  isAccented = true;
                }
                break;
              }
            }
          } else {
            // Manual accent based on barlines (use original time)
            isAccented = barlines.some(b => Math.abs(b.startTime - note.startTime) < 0.1);
          }
          
          const timeOffset = (Math.random() - 0.5) * 0.01; // ±5ms
          const velOffset = Math.round((Math.random() - 0.5) * 10); // ±5

          const dynamicGain = getDynamicGainAtTime(startTime16n, unrolledNotes, dynamicTransitions);
          let baseVelocity = Math.round(dynamicGain * 100);
          if (isAccented) baseVelocity += 20;
          if (note.articulation === 'accent') baseVelocity += 35;
          const velocity = Math.max(0, Math.min(127, baseVelocity + velOffset));

          let durationSeconds = Tone.Time(`0:0:${duration16n}`).toSeconds();
          if (note.articulation === 'staccato') {
            durationSeconds *= 0.5;
          } else if (note.articulation === 'staccatissimo') {
            durationSeconds *= 0.25;
          } else if (note.articulation === 'tenuto') {
            durationSeconds *= 1.05;
          }

          let glissandoTargetNoteName = undefined;
          if (note.glissandoTargetId) {
            const targetNote = notes.find(n => n.id === note.glissandoTargetId);
            if (targetNote) {
              const targetPitchName = PITCH_MAP[targetNote.pitch];
              const targetOctave = targetNote.octave;
              let targetEffectiveAlteration = targetNote.alteration;
              if (!targetEffectiveAlteration) {
                const ks = getKeySignatureAt(targetNote.startTime, keySignatures);
                const pitchClass = PITCH_VALUES[targetNote.pitch];
                const acc = ks.accidentals.find(a => a.pitchClass === pitchClass);
                if (acc) {
                  targetEffectiveAlteration = acc.alteration as any;
                }
              }
              const targetAlteration = targetEffectiveAlteration === '#' ? '#' : targetEffectiveAlteration === '-' ? 'b' : '';
              glissandoTargetNoteName = `${targetPitchName}${targetAlteration}${targetOctave}`;
            }
          }

          return {
            time: Math.max(0, Tone.Time(`0:0:${startTime16n}`).toSeconds() + timeOffset),
            note: noteName,
            duration: durationSeconds,
            velocity: velocity,
            id: note.originalId, // Use originalId for visual highlighting
            glissandoTargetNoteName
          };
        });

      // Reset dynamic gain to 1 since we handle dynamics via velocity now
      if (dynamicGainRef.current) {
        dynamicGainRef.current.gain.cancelScheduledValues(0);
        dynamicGainRef.current.gain.setValueAtTime(1, 0);
      }

      // Create Part
      const part = new Tone.Part((time, event) => {
        try {
          if (activeSamplerRef.current) {
            const durationSecs = Tone.Time(event.duration).toSeconds();
            
            if (event.glissandoTargetNoteName) {
              const startMidi = Tone.Frequency(event.note).toMidi();
              const endMidi = Tone.Frequency(event.glissandoTargetNoteName).toMidi();
              const distance = Math.abs(endMidi - startMidi);
              const direction = endMidi > startMidi ? 1 : -1;
              
              if (distance === 0) {
                activeSamplerRef.current.start({
                  note: event.note,
                  time: time,
                  duration: durationSecs,
                  velocity: event.velocity
                });
              } else if (distance <= 2) {
                // Quick slide at the end
                activeSamplerRef.current.start({
                  note: event.note,
                  time: time,
                  duration: durationSecs * 0.8,
                  velocity: event.velocity
                });
                
                // Play intermediate notes quickly
                for (let i = 1; i < distance; i++) {
                  const intermediateNote = Tone.Frequency(startMidi + i * direction, "midi").toNote();
                  activeSamplerRef.current.start({
                    note: intermediateNote,
                    time: time + durationSecs * 0.8 + (durationSecs * 0.2 * (i / distance)),
                    duration: durationSecs * 0.2 / distance,
                    velocity: event.velocity * 0.8
                  });
                }
              } else {
                // Spaced slide
                const stepDuration = durationSecs / distance;
                for (let i = 0; i < distance; i++) {
                  const intermediateNote = Tone.Frequency(startMidi + i * direction, "midi").toNote();
                  activeSamplerRef.current.start({
                    note: intermediateNote,
                    time: time + i * stepDuration,
                    duration: stepDuration,
                    velocity: i === 0 ? event.velocity : event.velocity * 0.7
                  });
                }
              }
            } else {
              activeSamplerRef.current.start({
                note: event.note,
                time: time,
                duration: durationSecs,
                velocity: event.velocity
              });
            }
          }
        } catch (err) {
          console.error("Error playing note:", err, event);
        }

        // Visual feedback
        Tone.Draw.schedule(() => {
          setCurrentNoteIds(prev => [...prev, event.id]);
        }, time);

        Tone.Draw.schedule(() => {
          setCurrentNoteIds(prev => prev.filter(id => id !== event.id));
        }, time + Tone.Time(event.duration).toSeconds());

      }, events).start(0);

      partRef.current = part;

      // Calculate end time to stop automatically
      if (notesToPlay.length > 0) {
        const maxEndTime = Math.max(...notesToPlay.map(n => n.unrolledStartTime + getDurationValue(n.duration, n.isDotted, n.isTriplet)));
        const totalDuration = `0:0:${maxEndTime + 4}`; // Add a buffer
        Tone.Transport.scheduleOnce(() => {
          stop();
        }, totalDuration);
      }

      if (Tone.Transport.state !== 'started') {
        Tone.Transport.start(undefined, `0:0:${startOffset16n}`);
      }
      setIsPlaying(true);
    } catch (error) {
      console.error("Playback error:", error);
      setPlaybackError(error instanceof Error ? error.message : String(error));
      stop();
    }
  }, [notes, barlines, timeSignatures, isBarMode, isPlaying, stop]);

  const playSingleNote = useCallback(async (pitch: Pitch, octave: number, alteration: string) => {
    try {
      await Tone.start();
      const context = Tone.getContext().rawContext as unknown as AudioContext;
      if (context.state === 'suspended') {
        await context.resume();
      }

      if (!samplersRef.current[instrument]) {
        const instrumentName = INSTRUMENT_MAP[instrument];
        const nativeGain = context.createGain();
        Tone.connect(nativeGain, Tone.getDestination());
        const sampler = new Soundfont(context, {
          instrument: instrumentName,
          destination: nativeGain,
        });
        await sampler.load;
        samplersRef.current[instrument] = sampler;
      }

      const sampler = samplersRef.current[instrument];
      if (sampler) {
        const pitchMap: Record<string, number> = {
          'DO': 0, 'RE': 2, 'MI': 4, 'FA': 5, 'SOL': 7, 'LA': 9, 'SI': 11
        };
        let midiNote = pitchMap[pitch] + (octave + 1) * 12;
        if (alteration === '#') midiNote += 1;
        if (alteration === '-') midiNote -= 1;
        
        sampler.start({ note: midiNote, velocity: 80, duration: 0.5 });
      }
    } catch (err) {
      console.error("Error playing single note:", err);
    }
  }, [instrument]);

  return {
    isPlaying,
    currentNoteIds,
    currentPlaybackTime,
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
  };
};
