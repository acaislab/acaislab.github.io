import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { motion, AnimatePresence } from 'motion/react';
import { Play, SkipForward, Users, Trophy, Music, CheckCircle, XCircle, Info, RefreshCw, Volume2, VolumeX, ArrowRight, ArrowLeft, Settings, LogOut, History, Trash2, MoveHorizontal } from 'lucide-react';
import { GameState, Crewmate, LeaderboardEntry, LeaderboardHistoryEntry, RhythmNote } from './types';
import { setupCrew, getDurationValue, isRest } from './lib/gameLogic';
import { CrewmateSVG } from './components/Crewmate';
import { NotationSVG } from './components/Notation';
import { MetronomeIcon } from './components/MetronomeIcon';
import { RhythmStaff } from './components/RhythmStaff';
import { LevelIntroModal } from './components/LevelIntroModal';

const STORAGE_KEY = 'ritmo_impostor_leaderboard';
const HISTORY_STORAGE_KEY = 'ritmo_impostor_leaderboard_history';
const SEEN_LEVELS_KEY = 'ritmo_impostor_seen_levels';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'menu',
    nickname: '',
    level: 1,
    score: 0,
    crewSize: 8,
    crew: [],
    currentInterviewIndex: 0,
    soundType: 'beep',
    metronomeEnabled: false,
    metronomeVolume: 0.5,
    tempo: 120,
    autoscrollEnabled: true
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number | null>(null);
  const [showMetronomeSettings, setShowMetronomeSettings] = useState(false);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [selectedImpostors, setSelectedImpostors] = useState<number[]>([]);
  const [results, setResults] = useState<{ correct: boolean, impostorsFound: number, totalImpostors: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardHistory, setLeaderboardHistory] = useState<LeaderboardHistoryEntry[]>([]);
  const [highestScore, setHighestScore] = useState<number | null>(null);
  const [navigationMuted, setNavigationMuted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [seenLevels, setSeenLevels] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(SEEN_LEVELS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeIntroLevel, setActiveIntroLevel] = useState<number | null>(null);

  const checkAndShowIntro = (lvl: number) => {
    if (!seenLevels.includes(lvl)) {
      setActiveIntroLevel(lvl);
      const updated = [...seenLevels, lvl];
      setSeenLevels(updated);
      localStorage.setItem(SEEN_LEVELS_KEY, JSON.stringify(updated));
    }
  };

  const synthRef = useRef<Tone.PolySynth | Tone.Sampler | null>(null);
  const metronomeSynthRef = useRef<Tone.MembraneSynth | null>(null);
  const uiSynthRef = useRef<Tone.PolySynth | null>(null);
  const metronomeVolumeRef = useRef<Tone.Gain | null>(null);
  const metronomeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMetronomeSettings && metronomeContainerRef.current && !metronomeContainerRef.current.contains(event.target as Node)) {
        // Also ensure it wasn't the toggle button that was clicked
        if (!(event.target as Element).closest('.metronome-toggle-btn')) {
          playCloseMenu();
          setShowMetronomeSettings(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMetronomeSettings]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setLeaderboard(JSON.parse(saved));
    }
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (savedHistory) {
      setLeaderboardHistory(JSON.parse(savedHistory));
    }

    // Initialize metronome audio structure
    metronomeVolumeRef.current = new Tone.Gain(gameState.metronomeVolume).toDestination();
    metronomeSynthRef.current = new Tone.MembraneSynth({
      pitchDecay: 0.001,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).connect(metronomeVolumeRef.current);

    return () => {
      metronomeSynthRef.current?.dispose();
      metronomeVolumeRef.current?.dispose();
      uiSynthRef.current?.dispose();
    };
  }, []);

  // Update highest score when nickname changes
  useEffect(() => {
    if (gameState.nickname) {
      const playerEntries = leaderboard.filter(e => e.nickname.toLowerCase() === gameState.nickname.toLowerCase());
      if (playerEntries.length > 0) {
        setHighestScore(Math.max(...playerEntries.map(e => e.score)));
      } else {
        setHighestScore(null);
      }
    } else {
      setHighestScore(null);
    }
  }, [gameState.nickname, leaderboard]);

  useEffect(() => {
    Tone.Transport.bpm.value = gameState.tempo;
  }, [gameState.tempo]);

  useEffect(() => {
    if (metronomeVolumeRef.current) {
      if (gameState.metronomeEnabled) {
        metronomeVolumeRef.current.gain.rampTo(gameState.metronomeVolume, 0.1);
      } else {
        metronomeVolumeRef.current.gain.rampTo(0, 0.1);
      }
    }
  }, [gameState.metronomeVolume, gameState.metronomeEnabled]);

  const ensureUiSynth = () => {
    if (navigationMuted) return null;
    if (Tone.context.state !== 'running') {
      Tone.start().catch(() => {});
    }
    if (!uiSynthRef.current) {
      uiSynthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.15, sustain: 0.0, release: 0.1 }
      }).toDestination();
      uiSynthRef.current.volume.value = -22; // Much softer and subtle default volume for retro synth so it's pleasant
    }
    return uiSynthRef.current;
  };

  const playClick = () => {
    const synth = ensureUiSynth();
    if (!synth) return;
    synth.triggerAttackRelease("C5", "32n");
  };

  const playHover = () => {
    if (navigationMuted) return;
    if (Tone.context.state === 'running' && uiSynthRef.current) {
      uiSynthRef.current.triggerAttackRelease("G4", "64n", Tone.now(), 0.08);
    }
  };

  const playOpenMenu = () => {
    const synth = ensureUiSynth();
    if (!synth) return;
    const now = Tone.now();
    synth.triggerAttackRelease("E5", "32n", now);
    synth.triggerAttackRelease("G5", "32n", now + 0.05);
  };

  const playCloseMenu = () => {
    const synth = ensureUiSynth();
    if (!synth) return;
    const now = Tone.now();
    synth.triggerAttackRelease("D4", "32n", now);
    synth.triggerAttackRelease("A3", "32n", now + 0.05);
  };

  const playFanfare = () => {
    const synth = ensureUiSynth();
    if (!synth) return;
    const now = Tone.now();
    synth.triggerAttackRelease("G4", "8n", now);
    synth.triggerAttackRelease("C5", "8n", now + 0.15);
    synth.triggerAttackRelease("E5", "8n", now + 0.3);
    synth.triggerAttackRelease("G5", "2n", now + 0.45);
  };

  const playSuccess = () => {
    const synth = ensureUiSynth();
    if (!synth) return;
    const now = Tone.now();
    synth.triggerAttackRelease("C5", "8n", now);
    synth.triggerAttackRelease("E5", "8n", now + 0.15);
    synth.triggerAttackRelease("G5", "4n", now + 0.3);
  };

  const playFailure = () => {
    const synth = ensureUiSynth();
    if (!synth) return;
    const now = Tone.now();
    synth.triggerAttackRelease("D4", "8n", now);
    synth.triggerAttackRelease("C#4", "8n", now + 0.15);
    synth.triggerAttackRelease("C4", "4n", now + 0.3);
  };

  const initAudio = async () => {
    await Tone.start();
    ensureUiSynth();
    
    // For melodic levels (10+), always use pitched PolySynth for clear tone & accidentals
    if (gameState.level >= 10 || gameState.soundType === 'beep') {
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.008, decay: 0.1, sustain: 0.3, release: 0.2 }
      }).toDestination();
    } else if (gameState.soundType === 'claves') {
      // Claves simulation
      synthRef.current = new Tone.PolySynth(Tone.MembraneSynth, {
        pitchDecay: 0.05,
        octaves: 4,
        oscillator: { type: 'sine' }
      }).toDestination();
    } else {
      // Drum simulation
      synthRef.current = new Tone.PolySynth(Tone.MembraneSynth).toDestination();
    }
  };

  const startGame = async () => {
    if (!gameState.nickname) return;
    await initAudio();
    playFanfare();
    const newCrew = setupCrew(gameState.crewSize, gameState.level);
    setGameState(prev => ({
      ...prev,
      phase: 'interview',
      crew: newCrew,
      currentInterviewIndex: 0,
      score: 0
    }));
    setSelectedImpostors([]);
    setResults(null);
    checkAndShowIntro(gameState.level);
  };

  const playRhythm = async (rhythm: RhythmNote[]) => {
    if (isPlaying) return;
    setIsPlaying(true);
    
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Tone.Transport.position = 0;
    
    // Fix transport BPM to 60 so 1 beat = 1 second in transport time
    Tone.Transport.bpm.value = 60;

    const beatSec = 60 / gameState.tempo;
    let timeOffsetSecs = 0;

    // Countdown: 4 beats (4/4 measure)
    for (let i = 0; i < 4; i++) {
      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => {
          setCountdown(i === 3 ? "GO!" : (3 - i).toString());
        }, time);
        
        // Metronome sound for countdown
        metronomeSynthRef.current?.triggerAttackRelease("C6", 0.1, time, i === 0 ? 0.8 : 0.4);
      }, timeOffsetSecs);
      timeOffsetSecs += beatSec;
    }

    // Clear countdown
    Tone.Transport.schedule((time) => {
      Tone.Draw.schedule(() => {
        setCountdown(null);
      }, time);
    }, timeOffsetSecs);

    const rhythmStartSecs = timeOffsetSecs;

    rhythm.forEach((note, index) => {
      const durationBeats = getDurationValue(note.type);
      const durationSecs = durationBeats * beatSec;
      
      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => {
          setCurrentPlayingIndex(index);
        }, time);

        // Rests do NOT sound!
        if (!isRest(note.type)) {
          let pitch = 'C4';
          if (gameState.level >= 10 && note.pitch) {
            pitch = note.pitch;
          } else if (gameState.soundType === 'claves') {
            pitch = 'C5';
          } else if (gameState.soundType === 'drum') {
            pitch = 'C2';
          }
          // Slightly shorter than full duration for articulation
          synthRef.current?.triggerAttackRelease(pitch, Math.max(0.04, durationSecs * 0.88), time);
        }
      }, timeOffsetSecs);
      
      timeOffsetSecs += durationSecs;
    });

    const totalRhythmSecs = timeOffsetSecs - rhythmStartSecs;
    const totalBeats = Math.ceil(totalRhythmSecs / beatSec);
    
    // Schedule metronome during rhythm
    for (let i = 0; i < totalBeats; i++) {
      Tone.Transport.schedule((time) => {
        metronomeSynthRef.current?.triggerAttackRelease("C6", 0.1, time, 0.4);
      }, rhythmStartSecs + (i * beatSec));
    }

    // Finish playing
    Tone.Transport.schedule((time) => {
      Tone.Draw.schedule(() => {
        setIsPlaying(false);
        setCurrentPlayingIndex(null);
        Tone.Transport.stop();
      }, time);
    }, timeOffsetSecs + 0.5);

    Tone.Transport.start();
  };

  const nextInterview = () => {
    playClick();
    if (gameState.currentInterviewIndex < gameState.crew.length - 1) {
      setGameState(prev => ({
        ...prev,
        currentInterviewIndex: prev.currentInterviewIndex + 1
      }));
    } else {
      setGameState(prev => ({ ...prev, phase: 'voting' }));
    }
  };

  const previousInterview = () => {
    playClick();
    if (gameState.currentInterviewIndex > 0) {
      setGameState(prev => ({
        ...prev,
        currentInterviewIndex: prev.currentInterviewIndex - 1
      }));
    }
  };

  const submitVotes = () => {
    playClick();
    const impostors = gameState.crew.filter(c => c.isImpostor);
    const found = selectedImpostors.filter(id => gameState.crew.find(c => c.id === id)?.isImpostor).length;
    const errors = selectedImpostors.filter(id => !gameState.crew.find(c => c.id === id)?.isImpostor).length;
    const missed = impostors.length - found;

    const correct = errors === 0 && missed === 0;
    
    if (correct) playSuccess();
    else playFailure();
    
    // Calculate Score
    const roundScore = (found * 100) - (errors * 50);
    const totalScore = Math.max(0, gameState.score + roundScore);

    setResults({ correct, impostorsFound: found, totalImpostors: impostors.length });
    setGameState(prev => ({ ...prev, phase: 'reveal', score: totalScore }));

    if (correct) {
      let currentEntries = [...leaderboard];
      const existingIdx = currentEntries.findIndex(e => e.nickname.toLowerCase() === gameState.nickname.toLowerCase());
      
      if (existingIdx >= 0) {
        if (totalScore > currentEntries[existingIdx].score) {
          currentEntries[existingIdx].score = totalScore;
          currentEntries[existingIdx].level = Math.max(currentEntries[existingIdx].level, gameState.level);
        }
      } else {
        currentEntries.push({
          nickname: gameState.nickname,
          level: gameState.level,
          score: totalScore
        });
      }

      const newLeaderboard = currentEntries
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
        
      setLeaderboard(newLeaderboard);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLeaderboard));
    }
  };

  const nextLevel = async () => {
    playFanfare();
    const nextLvl = Math.min(12, gameState.level + 1);
    await initAudio();
    const newCrew = setupCrew(gameState.crewSize, nextLvl);
    setGameState(prev => ({
      ...prev,
      level: nextLvl,
      phase: 'interview',
      crew: newCrew,
      currentInterviewIndex: 0
    }));
    setSelectedImpostors([]);
    setResults(null);
    checkAndShowIntro(nextLvl);
  };

  const renderMetronomePanel = () => (
    <div className="bg-slate-950/90 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MetronomeIcon size={18} className="text-blue-400" />
          <span className="text-sm font-bold">Metrónomo</span>
        </div>
        <button 
          onClick={() => setGameState(prev => ({ ...prev, metronomeEnabled: !prev.metronomeEnabled }))}
          className={`w-12 h-6 rounded-full transition-colors relative ${gameState.metronomeEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${gameState.metronomeEnabled ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono text-slate-500 uppercase tracking-widest">
          <span>Tempo</span>
          <span className="text-blue-400 font-bold">{gameState.tempo} BPM</span>
        </div>
        <input 
          type="range" 
          min="40" 
          max="240" 
          value={gameState.tempo}
          onChange={(e) => setGameState(prev => ({ ...prev, tempo: parseInt(e.target.value) }))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono text-slate-500 uppercase tracking-widest">
          <span>Volumen</span>
          <span className="text-blue-400 font-bold">{Math.round(gameState.metronomeVolume * 100)}%</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01"
          value={gameState.metronomeVolume}
          onChange={(e) => setGameState(prev => ({ ...prev, metronomeVolume: parseFloat(e.target.value) }))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  );

  const handleExit = () => {
    playCloseMenu();
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    setIsPlaying(false);
    setGameState(prev => ({ 
      ...prev, 
      phase: 'menu',
      nickname: '',
      score: 0,
      level: 1
    }));
  };

  const TopBar = ({ title, icon: Icon }: { title: string, icon: any }) => (
    <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
      <div className="flex items-center gap-4">
        <Icon className="text-blue-400" />
        <span className="font-mono text-sm uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex items-center gap-4 justify-between sm:justify-end">
        <button 
          onClick={() => {
            playClick();
            setActiveIntroLevel(gameState.level);
          }}
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all hover:bg-slate-700"
          title="Ver guía y elementos de este nivel"
        >
          <Info size={20} />
        </button>
        <button 
          onClick={() => {
            playClick();
            setGameState(prev => ({ ...prev, autoscrollEnabled: !prev.autoscrollEnabled }));
          }}
          className={`p-2 rounded-lg transition-all ${gameState.autoscrollEnabled ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          title={gameState.autoscrollEnabled ? "Desactivar Desplazamiento Automático" : "Activar Desplazamiento Automático"}
        >
          <MoveHorizontal size={20} />
        </button>
        <div className="relative" ref={gameState.phase !== 'menu' ? metronomeContainerRef : undefined}>
          <button 
            onClick={() => {
              if (showMetronomeSettings) {
                playCloseMenu();
              } else {
                playOpenMenu();
              }
              setShowMetronomeSettings(!showMetronomeSettings);
            }}
            className={`p-2 rounded-lg transition-all metronome-toggle-btn ${gameState.metronomeEnabled ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            title="Configurar Metrónomo"
          >
            <MetronomeIcon size={20} />
          </button>
          <AnimatePresence>
            {showMetronomeSettings && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full right-0 mt-4 w-72 z-50 origin-top-right"
              >
                {renderMetronomePanel()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="w-px h-6 bg-slate-700 hidden sm:block" />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 border border-slate-700/60 rounded-lg text-xs font-mono font-bold text-slate-300">
            <span className="text-slate-400">NIVEL</span>
            <span className="text-blue-400">{gameState.level}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 border border-slate-700/60 rounded-lg text-xs font-mono font-bold text-slate-300">
            <Trophy className="text-yellow-400" size={14} />
            <span className="text-white">{gameState.score}</span>
          </div>
        </div>
        <div className="w-px h-6 bg-slate-700 hidden sm:block" />
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-950/80 border border-red-900/30 text-red-400 rounded-lg text-xs font-bold transition-all"
          title="Abandonar partida"
        >
          <LogOut size={14} />
          <span>Salir</span>
        </button>
      </div>
    </div>
  );

  const renderMenu = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-2xl relative"
    >
      <button 
        onClick={() => {
          const nextMuted = !navigationMuted;
          setNavigationMuted(nextMuted);
          if (!nextMuted) {
            if (Tone.context.state !== 'running') {
              Tone.start().catch(() => {});
            }
            if (!uiSynthRef.current) {
              uiSynthRef.current = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'square' },
                envelope: { attack: 0.005, decay: 0.15, sustain: 0.0, release: 0.1 }
              }).toDestination();
              uiSynthRef.current.volume.value = -22;
            }
            uiSynthRef.current.triggerAttackRelease("C5", "32n");
          }
        }}
        className="absolute top-6 right-6 text-slate-500 hover:text-slate-300 transition-colors p-1.5 rounded-lg hover:bg-slate-800/50"
        title={navigationMuted ? "Activar Sonidos de Navegación" : "Silenciar Sonidos de Navegación"}
      >
        {navigationMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <div className="text-center mb-8">
        <h1 className="text-5xl font-display font-bold text-white mb-2 tracking-wide uppercase">El Compás del Impostor</h1>
        <p className="text-slate-400 italic">Descubre impostores sin votar tripulantes</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Apodo</label>
          <input 
            type="text"
            value={gameState.nickname}
            onChange={(e) => setGameState(prev => ({ ...prev, nickname: e.target.value }))}
            onFocus={() => {
              if (Tone.context.state !== 'running') Tone.start();
              playHover();
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="Escribe tu apodo..."
          />
          {highestScore !== null && (
            <p className="text-xs text-blue-400 mt-2 font-mono flex items-center gap-1">
              <Trophy size={12} /> Tu mejor puntaje: {highestScore}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-mono uppercase tracking-widest text-slate-500">Nivel</label>
            <button 
              type="button"
              onClick={() => {
                playClick();
                setActiveIntroLevel(gameState.level);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono transition-colors"
            >
              <Info size={13} /> Guía del nivel
            </button>
          </div>
          <select 
            value={gameState.level}
            onChange={(e) => {
              setGameState(prev => ({ ...prev, level: parseInt(e.target.value) }));
              playClick();
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none text-sm"
          >
            <option value={1}>🎵 Nivel 1 (Negras y Silencios de Negra)</option>
            <option value={2}>🎵 Nivel 2 (Negras, Silencios y Corcheas en Pares)</option>
            <option value={3}>🎵 Nivel 3 (Blancas, Silencios de Blanca y Corcheas)</option>
            <option value={4}>🎵 Nivel 4 (Corcheas Sueltas, Contratiempos y Síncopas)</option>
            <option value={5}>🎵 Nivel 5 (Silencios de Corchea - 2 Compases)</option>
            <option value={6}>🎵 Nivel 6 (Redondas y Variedad Métrica)</option>
            <option value={7}>⚡ Nivel 7 (Semicorcheas en Pares)</option>
            <option value={8}>⚡ Nivel 8 (Variantes de Cuartina Estructuradas)</option>
            <option value={9}>⚡ Nivel 9 (Todos los Silencios)</option>
            <option value={10}>🎶 Nivel 10 (Melódico: Pentagrama Diatónico Do a Do)</option>
            <option value={11}>🔮 Nivel 11 (Melódico con Alteraciones # y b)</option>
            <option value={12}>👑 Nivel 12 (Virtuoso: Asimetría Extrema y Cromatismo)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Tripulación</label>
          <select 
            value={gameState.crewSize}
            onChange={(e) => {
              setGameState(prev => ({ ...prev, crewSize: parseInt(e.target.value) }));
              playClick();
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none"
          >
            {[5, 6, 7, 8, 9, 10].map(n => (
              <option key={n} value={n}>{n} Miembros</option>
            ))}
          </select>
        </div>

        <div ref={gameState.phase === 'menu' ? metronomeContainerRef : undefined}>
          <AnimatePresence>
            {showMetronomeSettings && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
                {renderMetronomePanel()}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => {
                if (showMetronomeSettings) {
                  playCloseMenu();
                } else {
                  playOpenMenu();
                }
                setShowMetronomeSettings(!showMetronomeSettings);
              }}
              onMouseEnter={playHover}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-bold transition-all metronome-toggle-btn ${
                showMetronomeSettings ? 'bg-blue-600/20 border-blue-600 text-blue-400' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <MetronomeIcon size={18} />
              Configurar Metrónomo
            </button>
          </div>
        </div>

        <button 
          onClick={startGame}
          onMouseEnter={playHover}
          disabled={!gameState.nickname}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
        >
          <Play size={20} fill="currentColor" />
          ¡Comenzar Partida!
        </button>

        <button 
          onClick={() => { playClick(); setGameState(prev => ({ ...prev, phase: 'leaderboard' })); }}
          onMouseEnter={playHover}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          <Trophy size={18} />
          Ver Ranking
        </button>
      </div>
    </motion.div>
  );

  const renderInterview = () => {
    const currentMember = gameState.crew[gameState.currentInterviewIndex];
    if (!currentMember) return null;

    return (
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-20 sm:pb-24">
        <TopBar title={`Entrevista ${gameState.currentInterviewIndex + 1} / ${gameState.crew.length}`} icon={Users} />

        <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6 md:gap-10 py-1 sm:py-6">
          <motion.div 
            key={currentMember.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-28 h-28 sm:w-40 sm:h-40 md:w-56 md:h-56 relative shrink-0"
          >
            <CrewmateSVG color={currentMember.color} className="w-full h-full drop-shadow-[0_0_25px_rgba(255,255,255,0.12)]" />
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-black px-3 sm:px-4 py-0.5 sm:py-1 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap shadow-md">
              {currentMember.name}
            </div>
            {countdown && (
              <motion.div 
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl sm:text-8xl font-display font-black text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]"
              >
                {countdown}
              </motion.div>
            )}
          </motion.div>

          <div className="flex-1 space-y-4 sm:space-y-6 w-full min-w-0">
            <div className="bg-slate-900/80 p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl border border-slate-700 shadow-xl space-y-2 sm:space-y-4">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-slate-400">
                <span className="flex items-center gap-1.5"><Music size={14} className="text-blue-400" /> Partitura Original</span>
                {!gameState.autoscrollEnabled && (
                  <span className="text-[10px] text-blue-400/90 font-sans normal-case">↔ Desplazamiento manual</span>
                )}
              </div>
              <RhythmStaff 
                rhythm={currentMember.visualRhythm} 
                level={gameState.level} 
                isPlaying={isPlaying}
                currentPlayingIndex={currentPlayingIndex}
                tempo={gameState.tempo}
                isAutoscrollDisabled={!gameState.autoscrollEnabled}
              />
            </div>

            <div className="flex gap-2.5 sm:gap-4 items-center w-full">
              <button 
                onClick={previousInterview}
                onMouseEnter={playHover}
                disabled={isPlaying || gameState.currentInterviewIndex === 0}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 transition-all text-xs sm:text-sm shrink-0"
                title="Tripulante anterior"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Anterior</span>
              </button>
              
              <button 
                onClick={() => playRhythm(currentMember.audibleRhythm)}
                onMouseEnter={playHover}
                disabled={isPlaying}
                className="flex-1 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3 sm:py-4 px-3 sm:px-6 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/40 text-sm sm:text-base border border-indigo-400/30 active:scale-[0.99]"
              >
                <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" fill="currentColor" />
                <span className="truncate">
                  {isPlaying ? 'Escuchando...' : gameState.level >= 10 ? 'Escuchar Melodía' : 'Escuchar Ritmo'}
                </span>
              </button>
              
              <button 
                onClick={nextInterview}
                onMouseEnter={playHover}
                disabled={isPlaying}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 transition-all text-xs sm:text-sm shrink-0"
                title="Siguiente tripulante"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderVoting = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <TopBar title="Sala de Votación" icon={Music} />

      <div className="text-center">
        <h2 className="text-3xl font-display font-bold mb-2">¿Quién es el Impostor?</h2>
        <p className="text-slate-400">
          {gameState.level >= 10 
            ? 'Selecciona a los tripulantes que tocaron el ritmo o la melodía incorrecta' 
            : 'Selecciona a los tripulantes que tocaron el ritmo incorrecto'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {gameState.crew.map((member) => (
          <motion.div 
            key={member.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={playHover}
            onClick={() => {
              playClick();
              if (selectedImpostors.includes(member.id)) {
                setSelectedImpostors(selectedImpostors.filter(id => id !== member.id));
              } else {
                setSelectedImpostors([...selectedImpostors, member.id]);
              }
            }}
            className={`cursor-pointer p-6 rounded-3xl border-2 transition-all ${
              selectedImpostors.includes(member.id) 
                ? 'bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' 
                : 'bg-slate-900 border-slate-800 hover:border-slate-600'
            }`}
          >
            <CrewmateSVG color={member.color} className="w-full h-32 mb-4" />
            <div className="text-center font-bold">{member.name}</div>
          </motion.div>
        ))}
      </div>

      <button 
        onClick={submitVotes}
        onMouseEnter={playHover}
        className="w-full max-w-sm mx-auto block bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-2xl text-xl shadow-xl shadow-red-900/20 transition-all"
      >
        Enviar Votos
      </button>
    </div>
  );

  const renderReveal = () => (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <TopBar title="Resultados" icon={Music} />

      <div className="text-center">
        {results?.correct ? (
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4">
            <CheckCircle size={80} className="text-green-500" />
            <h2 className="text-4xl font-display font-bold">¡Victoria!</h2>
            <p className="text-slate-400">Has identificado a todos los impostores</p>
          </motion.div>
        ) : (
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4">
            <XCircle size={80} className="text-red-500" />
            <h2 className="text-4xl font-display font-bold">¡Derrota!</h2>
            <p className="text-slate-400">Había impostores entre nosotros...</p>
          </motion.div>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6">
        {gameState.crew.map((member) => {
          const isSelected = selectedImpostors.includes(member.id);
          const isCorrect = (member.isImpostor && isSelected) || (!member.isImpostor && !isSelected);
          
          return (
            <div key={member.id} className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6 md:gap-8">
              {/* Crewmate + Info for mobile and desktop */}
              <div className="flex items-center gap-3.5 w-full md:w-auto shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 shrink-0">
                  <CrewmateSVG color={member.color} className="w-full h-full" isDead={!isCorrect} />
                </div>
                <div className="flex-1 md:hidden flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-white">{member.name}</h3>
                    <span className={`text-xs font-bold uppercase ${member.isImpostor ? 'text-red-400' : 'text-slate-400'}`}>
                      {member.isImpostor ? 'Impostor' : 'Tripulante'}
                    </span>
                  </div>
                  {isSelected && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      Votado
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex-1 space-y-4 min-w-0 w-full">
                <div className="hidden md:flex justify-between items-center">
                  <h3 className="font-bold text-xl">{member.name} {member.isImpostor ? '(Impostor)' : '(Tripulante)'}</h3>
                  {isSelected && (
                    <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      Votado
                    </span>
                  )}
                </div>

                {member.isImpostor && (
                  <div className="space-y-3.5 sm:space-y-4 w-full">
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
                        <span className="font-semibold text-slate-300">Partitura Original</span>
                        <span className="text-[11px] text-blue-400 flex items-center gap-1 font-sans normal-case">
                          <MoveHorizontal size={13} /> Desliza para revisar
                        </span>
                      </div>
                      <RhythmStaff 
                        rhythm={member.visualRhythm} 
                        level={gameState.level} 
                        isSmall={true} 
                        isAutoscrollDisabled={true} 
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center justify-between text-xs font-mono text-red-400 uppercase tracking-wider">
                        <span className="font-semibold">Real (Impostor)</span>
                        <span className="text-[11px] text-red-400/90 font-bold font-sans normal-case">
                          Rojo = Fallo detectado
                        </span>
                      </div>
                      <RhythmStaff 
                        rhythm={member.audibleRhythm} 
                        level={gameState.level} 
                        isSmall={true} 
                        highlightDiffWith={member.visualRhythm} 
                        isAutoscrollDisabled={true} 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => { playClick(); setGameState(prev => ({ ...prev, phase: 'menu' })); }}
          onMouseEnter={playHover}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all"
        >
          Volver al Menú
        </button>
        {results?.correct && (
          <button 
            onClick={nextLevel}
            onMouseEnter={playHover}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/20"
          >
            Siguiente Nivel <ArrowRight size={20} />
          </button>
        )}
      </div>
    </div>
  );

  const renderLeaderboard = () => {
    const handleClearLeaderboard = () => {
      playClick();
      if (leaderboard.length === 0) return;
      
      const newHistoryEntry: LeaderboardHistoryEntry = {
        date: new Date().toISOString(),
        entries: [...leaderboard]
      };
      
      const newHistory = [newHistoryEntry, ...leaderboardHistory];
      setLeaderboardHistory(newHistory);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
      
      setLeaderboard([]);
      localStorage.removeItem(STORAGE_KEY);
    };

    return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <Trophy size={60} className="mx-auto text-yellow-500 mb-4" />
        <h2 className="text-4xl font-display font-bold">Ranking de Astronautas</h2>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => { playClick(); setShowHistory(!showHistory); }}
          className={`flex items-center justify-center gap-2 flex-1 py-3 rounded-xl border font-bold transition-all ${
            showHistory ? 'bg-blue-600/20 border-blue-600 text-blue-400' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <History size={18} />
          {showHistory ? 'Ocultar Historial' : 'Ver Historial'}
        </button>
        <button 
          onClick={handleClearLeaderboard}
          disabled={leaderboard.length === 0}
          className="flex items-center justify-center gap-2 flex-1 py-3 bg-red-950/40 border border-red-900/30 text-red-400 hover:bg-red-950/80 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={18} />
          Reiniciar Ranking
        </button>
      </div>

      {!showHistory ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-mono text-xs uppercase tracking-widest text-slate-500">Puesto</th>
                <th className="px-6 py-4 font-mono text-xs uppercase tracking-widest text-slate-500">Apodo</th>
                <th className="px-6 py-4 font-mono text-xs uppercase tracking-widest text-slate-500">Nivel</th>
                <th className="px-6 py-4 font-mono text-xs uppercase tracking-widest text-slate-500">Puntos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {leaderboard.length > 0 ? leaderboard.map((entry, idx) => (
                <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-400">#{idx + 1}</td>
                  <td className="px-6 py-4 font-bold">{entry.nickname}</td>
                  <td className="px-6 py-4">{entry.level}</td>
                  <td className="px-6 py-4 text-blue-400 font-bold">{entry.score}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">Aún no hay puntuaciones</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          {leaderboardHistory.length > 0 ? leaderboardHistory.map((historyItem, hIdx) => (
            <div key={hIdx} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="bg-slate-800/80 px-6 py-3 font-mono text-xs uppercase tracking-widest text-slate-400 flex justify-between">
                <span>Historial</span>
                <span>{new Date(historyItem.date).toLocaleString()}</span>
              </div>
              <table className="w-full text-left">
                <tbody className="divide-y divide-slate-800/50">
                  {historyItem.entries.map((entry, idx) => (
                    <tr key={idx} className="bg-slate-900/50">
                      <td className="px-6 py-3 font-bold text-slate-500 text-sm">#{idx + 1}</td>
                      <td className="px-6 py-3 font-bold text-sm">{entry.nickname}</td>
                      <td className="px-6 py-3 text-sm">{entry.level}</td>
                      <td className="px-6 py-3 text-blue-400/70 font-bold text-sm">{entry.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 shadow-2xl">
              No hay historial de rankings pasados
            </div>
          )}
        </div>
      )}

      <button 
        onClick={() => { playClick(); setGameState(prev => ({ ...prev, phase: 'menu' })); }}
        onMouseEnter={playHover}
        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all"
      >
        Volver al Menú
      </button>
    </div>
  );
  };

  return (
    <main className="min-h-screen relative p-3 sm:p-6 md:p-12 pb-24 sm:pb-28 selection:bg-blue-500/30">
      {/* Background stars effect / Custom Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {gameState.phase === 'menu' ? (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
            style={{ backgroundImage: "url('background.png')" }}
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e293b_0%,#020617_100%)] opacity-50" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full" />
          </>
        )}
      </div>

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {gameState.phase === 'menu' && renderMenu()}
          {gameState.phase === 'interview' && renderInterview()}
          {gameState.phase === 'voting' && renderVoting()}
          {gameState.phase === 'reveal' && renderReveal()}
          {gameState.phase === 'leaderboard' && renderLeaderboard()}
        </AnimatePresence>
      </div>

      {/* Subtle footer link - only on main menu */}
      {gameState.phase === 'menu' && (
        <div className="relative z-10 text-center mt-6 pb-6 max-w-sm mx-auto">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 px-6 py-3 rounded-2xl shadow-xl inline-block">
            <a 
              href="https://acaislab.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-slate-400 hover:text-blue-400 text-xs font-mono tracking-wider transition-colors inline-flex items-center gap-1 hover:underline"
              onClick={playClick}
              onMouseEnter={playHover}
            >
              Conoce todas las Apps en acaislab.com
            </a>
          </div>
        </div>
      )}

      {/* Floating status for game active - compact and non-obstructive */}
      {gameState.phase !== 'menu' && gameState.phase !== 'leaderboard' && (
        <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-full border border-slate-800 flex items-center gap-4 sm:gap-6 shadow-2xl z-30 pointer-events-none select-none">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs font-mono text-slate-400">NIVEL</span>
            <span className="font-bold text-xs sm:text-sm text-white">{gameState.level}</span>
          </div>
          <div className="w-px h-3.5 bg-slate-700" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs font-mono text-slate-400">PUNTOS</span>
            <span className="font-bold text-xs sm:text-sm text-blue-400">{gameState.score}</span>
          </div>
        </div>
      )}

      {/* Level Introduction Tutorial Modal */}
      {activeIntroLevel !== null && (
        <LevelIntroModal 
          level={activeIntroLevel} 
          isOpen={true} 
          onClose={() => {
            playClick();
            setActiveIntroLevel(null);
          }} 
        />
      )}
    </main>
  );
}
