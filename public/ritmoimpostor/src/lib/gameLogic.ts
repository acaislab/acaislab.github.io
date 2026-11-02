import { NoteType, RhythmNote, Crewmate } from '../types';

const COLOR_ENTRIES = [
  { color: 'rojo', name: 'Rojo' },
  { color: 'rosa', name: 'Rosa' },
  { color: 'fucsia', name: 'Fucsia' },
  { color: 'indigo', name: 'Índigo' },
  { color: 'violeta', name: 'Violeta' },
  { color: 'azul', name: 'Azul' },
  { color: 'cian', name: 'Cian' },
  { color: 'verde_oscuro', name: 'Verde Oscuro' },
  { color: 'verde_claro', name: 'Verde Claro' },
  { color: 'amarillo', name: 'Amarillo' },
  { color: 'dorado', name: 'Dorado' },
  { color: 'naranjo', name: 'Naranjo' }
];

export const isRest = (type: NoteType): boolean => {
  return type.endsWith('_rest');
};

export const getDurationValue = (type: NoteType): number => {
  switch (type) {
    case 'whole':
    case 'whole_rest':
      return 4;
    case 'half':
    case 'half_rest':
      return 2;
    case 'quarter':
    case 'quarter_rest':
      return 1;
    case 'eighth':
    case 'eighth_rest':
      return 0.5;
    case 'sixteenth':
    case 'sixteenth_rest':
      return 0.25;
    default:
      return 1;
  }
};

const NOTE_DURATIONS: Record<NoteType, string> = {
  quarter: '4n',
  quarter_rest: '4n',
  eighth: '8n',
  eighth_rest: '8n',
  half: '2n',
  half_rest: '2n',
  whole: '1n',
  whole_rest: '1n',
  sixteenth: '16n',
  sixteenth_rest: '16n',
};

export const getNoteFromType = (type: NoteType): RhythmNote => {
  return {
    type,
    duration: NOTE_DURATIONS[type] || '4n'
  };
};

// Diatonic scale pitches for level 10: C4 to C5
// staffStep: 0 for C4 (ledger line below staff), up to 7 for C5 (space 3)
const DIATONIC_PITCHES: { pitch: string; staffStep: number }[] = [
  { pitch: 'C4', staffStep: 0 },
  { pitch: 'D4', staffStep: 1 },
  { pitch: 'E4', staffStep: 2 },
  { pitch: 'F4', staffStep: 3 },
  { pitch: 'G4', staffStep: 4 },
  { pitch: 'A4', staffStep: 5 },
  { pitch: 'B4', staffStep: 6 },
  { pitch: 'C5', staffStep: 7 }
];

// Chromatic pitches with accidentals for level 11 & 12
const ACCIDENTAL_PITCHES: { pitch: string; staffStep: number; accidental: '#' | 'b' }[] = [
  { pitch: 'F#4', staffStep: 3, accidental: '#' },
  { pitch: 'G#4', staffStep: 4, accidental: '#' },
  { pitch: 'C#5', staffStep: 7, accidental: '#' },
  { pitch: 'Bb4', staffStep: 6, accidental: 'b' },
  { pitch: 'Eb4', staffStep: 2, accidental: 'b' }
];

const assignPitch = (note: RhythmNote, level: number) => {
  if (level < 10 || isRest(note.type)) return;

  if (level === 10) {
    // Pure diatonic scale
    const p = DIATONIC_PITCHES[Math.floor(Math.random() * DIATONIC_PITCHES.length)];
    note.pitch = p.pitch;
    note.staffStep = p.staffStep;
  } else {
    // Level 11 and 12: Diatonic + common accidentals
    const useAccidental = Math.random() < 0.35;
    if (useAccidental) {
      const p = ACCIDENTAL_PITCHES[Math.floor(Math.random() * ACCIDENTAL_PITCHES.length)];
      note.pitch = p.pitch;
      note.staffStep = p.staffStep;
      note.accidental = p.accidental;
    } else {
      const p = DIATONIC_PITCHES[Math.floor(Math.random() * DIATONIC_PITCHES.length)];
      note.pitch = p.pitch;
      note.staffStep = p.staffStep;
    }
  }
};

/**
 * Generates rhythm according to the 12 pedagogical levels.
 */
export const generateRhythm = (level: number): RhythmNote[] => {
  const notes: RhythmNote[] = [];
  // Levels 1-4: 1 measure (4 beats). Levels 5-12: 2 measures (8 beats).
  const totalBeats = level >= 5 ? 8 : 4;
  let beatsLeft = totalBeats;

  while (beatsLeft > 0) {
    // LEVEL 1: Negras y silencios de negra (tiempos enteros de 1 pulso)
    if (level === 1) {
      const isQuarterRest = Math.random() < 0.25;
      const type: NoteType = isQuarterRest ? 'quarter_rest' : 'quarter';
      notes.push(getNoteFromType(type));
      beatsLeft -= 1;
      continue;
    }

    // LEVEL 2: Negras, silencios de negra y corcheas SIEMPRE en pares (para evitar contratiempos)
    if (level === 2) {
      const rand = Math.random();
      if (rand < 0.45) {
        // Par de corcheas = 1 tiempo exacto
        notes.push(getNoteFromType('eighth'), getNoteFromType('eighth'));
      } else if (rand < 0.80) {
        notes.push(getNoteFromType('quarter'));
      } else {
        notes.push(getNoteFromType('quarter_rest'));
      }
      beatsLeft -= 1;
      continue;
    }

    // LEVEL 3: Blancas, silencios de blanca, negras, silencios de negra, corcheas en pares
    if (level === 3) {
      // Si nos quedan al menos 2 tiempos, podemos meter una blanca o silencio de blanca
      if (beatsLeft >= 2 && Math.random() < 0.35) {
        const isHalfRest = Math.random() < 0.3;
        notes.push(getNoteFromType(isHalfRest ? 'half_rest' : 'half'));
        beatsLeft -= 2;
      } else {
        // Bloque de 1 tiempo
        const rand = Math.random();
        if (rand < 0.4) {
          notes.push(getNoteFromType('eighth'), getNoteFromType('eighth'));
        } else if (rand < 0.8) {
          notes.push(getNoteFromType('quarter'));
        } else {
          notes.push(getNoteFromType('quarter_rest'));
        }
        beatsLeft -= 1;
      }
      continue;
    }

    // LEVEL 4: Blancas, negras, corcheas (esta vez sí pueden haber corcheas solas generando contratiempos y síncopas),
    // silencios de negra y blanca.
    if (level === 4) {
      if (beatsLeft >= 2 && Math.random() < 0.25) {
        const isHalfRest = Math.random() < 0.25;
        notes.push(getNoteFromType(isHalfRest ? 'half_rest' : 'half'));
        beatsLeft -= 2;
      } else if (beatsLeft >= 1) {
        const rand = Math.random();
        if (rand < 0.30) {
          // Corchea suelta + negra / contratiempo o par
          notes.push(getNoteFromType('eighth'));
          beatsLeft -= 0.5;
        } else if (rand < 0.65) {
          notes.push(getNoteFromType('quarter'));
          beatsLeft -= 1;
        } else if (rand < 0.85) {
          notes.push(getNoteFromType('eighth'), getNoteFromType('eighth'));
          beatsLeft -= 1;
        } else {
          notes.push(getNoteFromType('quarter_rest'));
          beatsLeft -= 1;
        }
      } else {
        // beatsLeft is 0.5
        notes.push(getNoteFromType('eighth'));
        beatsLeft -= 0.5;
      }
      continue;
    }

    // LEVEL 5: 8 beats. Incorpora a lo anterior silencios de corchea (0.5) y silencios de blanca.
    if (level === 5) {
      if (beatsLeft >= 2 && Math.random() < 0.2) {
        const isRestType = Math.random() < 0.3;
        notes.push(getNoteFromType(isRestType ? 'half_rest' : 'half'));
        beatsLeft -= 2;
      } else if (beatsLeft >= 1) {
        const rand = Math.random();
        if (rand < 0.25) {
          // Silencio de corchea o corchea suelta
          const isRestEighth = Math.random() < 0.5;
          notes.push(getNoteFromType(isRestEighth ? 'eighth_rest' : 'eighth'));
          beatsLeft -= 0.5;
        } else if (rand < 0.55) {
          notes.push(getNoteFromType('quarter'));
          beatsLeft -= 1;
        } else if (rand < 0.75) {
          notes.push(getNoteFromType('eighth'), getNoteFromType('eighth'));
          beatsLeft -= 1;
        } else if (rand < 0.90) {
          notes.push(getNoteFromType('quarter_rest'));
          beatsLeft -= 1;
        } else {
          // Contratiempo: silencio de corchea + corchea
          notes.push(getNoteFromType('eighth_rest'), getNoteFromType('eighth'));
          beatsLeft -= 1;
        }
      } else {
        const isRestEighth = Math.random() < 0.4;
        notes.push(getNoteFromType(isRestEighth ? 'eighth_rest' : 'eighth'));
        beatsLeft -= 0.5;
      }
      continue;
    }

    // LEVEL 6: Lo anterior + algunas redondas (whole, 4 beats) con baja frecuencia.
    if (level === 6) {
      // Redonda permitida solo al inicio de compás (cuando beatsLeft == 8 o beatsLeft == 4)
      if ((beatsLeft === 8 || beatsLeft === 4) && Math.random() < 0.12) {
        notes.push(getNoteFromType('whole'));
        beatsLeft -= 4;
        continue;
      }
      if (beatsLeft >= 2 && Math.random() < 0.2) {
        const isRestType = Math.random() < 0.25;
        notes.push(getNoteFromType(isRestType ? 'half_rest' : 'half'));
        beatsLeft -= 2;
      } else if (beatsLeft >= 1) {
        const rand = Math.random();
        if (rand < 0.25) {
          const isRestEighth = Math.random() < 0.4;
          notes.push(getNoteFromType(isRestEighth ? 'eighth_rest' : 'eighth'));
          beatsLeft -= 0.5;
        } else if (rand < 0.55) {
          notes.push(getNoteFromType('quarter'));
          beatsLeft -= 1;
        } else if (rand < 0.8) {
          notes.push(getNoteFromType('eighth'), getNoteFromType('eighth'));
          beatsLeft -= 1;
        } else {
          notes.push(getNoteFromType('quarter_rest'));
          beatsLeft -= 1;
        }
      } else {
        notes.push(getNoteFromType(Math.random() < 0.4 ? 'eighth_rest' : 'eighth'));
        beatsLeft -= 0.5;
      }
      continue;
    }

    // LEVEL 7: Lo anterior + semicorcheas en pares (siempre de a dos = 0.5 tiempos).
    if (level === 7) {
      if ((beatsLeft === 8 || beatsLeft === 4) && Math.random() < 0.08) {
        notes.push(getNoteFromType('whole'));
        beatsLeft -= 4;
        continue;
      }
      if (beatsLeft >= 2 && Math.random() < 0.18) {
        notes.push(getNoteFromType(Math.random() < 0.25 ? 'half_rest' : 'half'));
        beatsLeft -= 2;
        continue;
      }
      if (beatsLeft >= 1) {
        const rand = Math.random();
        if (rand < 0.28) {
          // Par de semicorcheas (0.5 beat)
          notes.push(getNoteFromType('sixteenth'), getNoteFromType('sixteenth'));
          beatsLeft -= 0.5;
        } else if (rand < 0.55) {
          notes.push(getNoteFromType('quarter'));
          beatsLeft -= 1;
        } else if (rand < 0.80) {
          notes.push(getNoteFromType('eighth'), getNoteFromType('eighth'));
          beatsLeft -= 1;
        } else if (rand < 0.90) {
          notes.push(getNoteFromType('quarter_rest'));
          beatsLeft -= 1;
        } else {
          notes.push(getNoteFromType(Math.random() < 0.5 ? 'eighth_rest' : 'eighth'));
          beatsLeft -= 0.5;
        }
      } else {
        if (Math.random() < 0.5) {
          notes.push(getNoteFromType('sixteenth'), getNoteFromType('sixteenth'));
        } else {
          notes.push(getNoteFromType('eighth'));
        }
        beatsLeft -= 0.5;
      }
      continue;
    }

    // LEVEL 8: Semicorcheas sueltas / variantes de cuartina (galopa, cuartina, síncopa).
    // Evitando semicorchea al lado de una blanca, asegurando tiempos enteros o medios tiempos exactos.
    if (level === 8) {
      if (beatsLeft >= 2 && Math.random() < 0.15) {
        notes.push(getNoteFromType(Math.random() < 0.2 ? 'half_rest' : 'half'));
        beatsLeft -= 2;
        continue;
      }
      if (beatsLeft >= 1) {
        const patternRand = Math.random();
        if (patternRand < 0.20) {
          // Cuartina: 4 semicorcheas = 1 beat
          notes.push(
            getNoteFromType('sixteenth'),
            getNoteFromType('sixteenth'),
            getNoteFromType('sixteenth'),
            getNoteFromType('sixteenth')
          );
          beatsLeft -= 1;
        } else if (patternRand < 0.35) {
          // Galopa: corchea + 2 semicorcheas = 1 beat
          notes.push(
            getNoteFromType('eighth'),
            getNoteFromType('sixteenth'),
            getNoteFromType('sixteenth')
          );
          beatsLeft -= 1;
        } else if (patternRand < 0.48) {
          // Galopa inversa: 2 semicorcheas + corchea = 1 beat
          notes.push(
            getNoteFromType('sixteenth'),
            getNoteFromType('sixteenth'),
            getNoteFromType('eighth')
          );
          beatsLeft -= 1;
        } else if (patternRand < 0.68) {
          notes.push(getNoteFromType('quarter'));
          beatsLeft -= 1;
        } else if (patternRand < 0.85) {
          notes.push(getNoteFromType('eighth'), getNoteFromType('eighth'));
          beatsLeft -= 1;
        } else {
          notes.push(getNoteFromType('quarter_rest'));
          beatsLeft -= 1;
        }
      } else {
        // 0.5 beat left: safe pair of sixteenths or eighth
        if (Math.random() < 0.5) {
          notes.push(getNoteFromType('sixteenth'), getNoteFromType('sixteenth'));
        } else {
          notes.push(getNoteFromType('eighth'));
        }
        beatsLeft -= 0.5;
      }
      continue;
    }

    // LEVEL 9: Todos los silencios (sixteenth_rest, eighth_rest, quarter_rest, half_rest, whole_rest)
    // + todas las figuras rítmicas.
    if (level === 9) {
      if ((beatsLeft === 8 || beatsLeft === 4) && Math.random() < 0.08) {
        const isRestType = Math.random() < 0.3;
        notes.push(getNoteFromType(isRestType ? 'whole_rest' : 'whole'));
        beatsLeft -= 4;
        continue;
      }
      if (beatsLeft >= 2 && Math.random() < 0.15) {
        const isRestType = Math.random() < 0.35;
        notes.push(getNoteFromType(isRestType ? 'half_rest' : 'half'));
        beatsLeft -= 2;
        continue;
      }
      if (beatsLeft >= 1) {
        const r = Math.random();
        if (r < 0.2) {
          // Bloque de cuartina o variante con silencio de semicorchea
          if (Math.random() < 0.3) {
            notes.push(
              getNoteFromType('sixteenth_rest'),
              getNoteFromType('sixteenth'),
              getNoteFromType('sixteenth'),
              getNoteFromType('sixteenth')
            );
          } else {
            notes.push(
              getNoteFromType('sixteenth'),
              getNoteFromType('sixteenth'),
              getNoteFromType('sixteenth'),
              getNoteFromType('sixteenth')
            );
          }
          beatsLeft -= 1;
        } else if (r < 0.45) {
          notes.push(getNoteFromType(Math.random() < 0.25 ? 'quarter_rest' : 'quarter'));
          beatsLeft -= 1;
        } else if (r < 0.70) {
          notes.push(getNoteFromType('eighth'), getNoteFromType('eighth'));
          beatsLeft -= 1;
        } else if (r < 0.85) {
          notes.push(getNoteFromType('eighth_rest'), getNoteFromType('eighth'));
          beatsLeft -= 1;
        } else {
          notes.push(getNoteFromType('eighth'));
          beatsLeft -= 0.5;
        }
      } else if (beatsLeft >= 0.5) {
        const r = Math.random();
        if (r < 0.3) {
          notes.push(getNoteFromType('sixteenth'), getNoteFromType('sixteenth'));
        } else if (r < 0.6) {
          notes.push(getNoteFromType('eighth_rest'));
        } else {
          notes.push(getNoteFromType('eighth'));
        }
        beatsLeft -= 0.5;
      } else {
        // 0.25
        notes.push(getNoteFromType(Math.random() < 0.3 ? 'sixteenth_rest' : 'sixteenth'));
        beatsLeft -= 0.25;
      }
      continue;
    }

    // LEVEL 10: Rítmico completo (como nivel 9) + MELÓDICO (pentagrama y notas diatónicas)
    if (level === 10) {
      if ((beatsLeft === 8 || beatsLeft === 4) && Math.random() < 0.08) {
        notes.push(getNoteFromType(Math.random() < 0.2 ? 'whole_rest' : 'whole'));
        beatsLeft -= 4;
        continue;
      }
      if (beatsLeft >= 2 && Math.random() < 0.15) {
        notes.push(getNoteFromType(Math.random() < 0.3 ? 'half_rest' : 'half'));
        beatsLeft -= 2;
        continue;
      }
      if (beatsLeft >= 1) {
        const r = Math.random();
        if (r < 0.22) {
          notes.push(
            getNoteFromType('sixteenth'),
            getNoteFromType('sixteenth'),
            getNoteFromType('sixteenth'),
            getNoteFromType('sixteenth')
          );
          beatsLeft -= 1;
        } else if (r < 0.50) {
          notes.push(getNoteFromType(Math.random() < 0.2 ? 'quarter_rest' : 'quarter'));
          beatsLeft -= 1;
        } else if (r < 0.75) {
          notes.push(getNoteFromType('eighth'), getNoteFromType('eighth'));
          beatsLeft -= 1;
        } else if (r < 0.88) {
          notes.push(getNoteFromType('eighth_rest'), getNoteFromType('eighth'));
          beatsLeft -= 1;
        } else {
          notes.push(getNoteFromType('eighth'));
          beatsLeft -= 0.5;
        }
      } else if (beatsLeft >= 0.5) {
        notes.push(getNoteFromType(Math.random() < 0.4 ? 'eighth_rest' : 'eighth'));
        beatsLeft -= 0.5;
      } else {
        notes.push(getNoteFromType('sixteenth'));
        beatsLeft -= 0.25;
      }
      continue;
    }

    // LEVEL 11 & 12: Todo lo anterior en combinaciones mucho más rebuscadas,
    // permitiendo por ejemplo semicorchea al lado de blanca, silencios de corchea sincopados,
    // y notas con alteraciones (# y b).
    if (level >= 11) {
      if (level === 12 && beatsLeft >= 2.25 && Math.random() < 0.25) {
        // Ejemplo explícito del usuario: una semicorchea junto a una blanca
        notes.push(getNoteFromType('sixteenth'), getNoteFromType('half'));
        beatsLeft -= 2.25;
        continue;
      }
      if (beatsLeft >= 2 && Math.random() < 0.18) {
        notes.push(getNoteFromType(Math.random() < 0.25 ? 'half_rest' : 'half'));
        beatsLeft -= 2;
        continue;
      }
      if (beatsLeft >= 1) {
        const r = Math.random();
        if (r < 0.25) {
          // Cuartina o variante
          notes.push(
            getNoteFromType('sixteenth'),
            getNoteFromType('sixteenth'),
            getNoteFromType('sixteenth'),
            getNoteFromType('sixteenth')
          );
          beatsLeft -= 1;
        } else if (r < 0.45) {
          // Síncopa o contratiempo
          notes.push(getNoteFromType('eighth_rest'), getNoteFromType('quarter'));
          beatsLeft -= 1.5;
        } else if (r < 0.70) {
          notes.push(getNoteFromType(Math.random() < 0.2 ? 'quarter_rest' : 'quarter'));
          beatsLeft -= 1;
        } else if (r < 0.88) {
          notes.push(getNoteFromType('eighth'), getNoteFromType('eighth'));
          beatsLeft -= 1;
        } else {
          notes.push(getNoteFromType('sixteenth'));
          beatsLeft -= 0.25;
        }
      } else if (beatsLeft >= 0.5) {
        const r = Math.random();
        if (r < 0.4) {
          notes.push(getNoteFromType('sixteenth'), getNoteFromType('sixteenth'));
        } else if (r < 0.7) {
          notes.push(getNoteFromType('eighth_rest'));
        } else {
          notes.push(getNoteFromType('eighth'));
        }
        beatsLeft -= 0.5;
      } else {
        notes.push(getNoteFromType(Math.random() < 0.3 ? 'sixteenth_rest' : 'sixteenth'));
        beatsLeft -= 0.25;
      }
      continue;
    }
  }

  // Fallback if empty
  if (notes.length === 0) {
    notes.push(getNoteFromType('quarter'));
  }

  // Assign pitch if melodic level (>= 10)
  notes.forEach(note => {
    assignPitch(note, level);
  });

  return notes;
};

/**
 * Mutates rhythm for impostors.
 * For levels 1-9: Mutates rhythmic figures.
 * For levels 10-12: Can mutate rhythm only, pitch only, or BOTH.
 */
export const mutateRhythm = (rhythm: RhythmNote[], level: number): RhythmNote[] => {
  const mutated: RhythmNote[] = rhythm.map(note => ({ ...note }));
  if (mutated.length === 0) return mutated;

  const isMelodic = level >= 10;
  
  // Decide mutation mode for level >= 10:
  // 'pitch' | 'rhythm' | 'both'
  let mutationMode: 'rhythm' | 'pitch' | 'both' = 'rhythm';
  if (isMelodic) {
    const soundNoteIndices = mutated
      .map((n, i) => (!isRest(n.type) ? i : -1))
      .filter(i => i >= 0);

    if (soundNoteIndices.length > 0) {
      const modeRoll = Math.random();
      if (modeRoll < 0.35) {
        mutationMode = 'pitch';
      } else if (modeRoll < 0.70) {
        mutationMode = 'rhythm';
      } else {
        mutationMode = 'both';
      }
    }
  }

  // 1. PITCH MUTATION
  if (mutationMode === 'pitch' || mutationMode === 'both') {
    const soundIndices = mutated
      .map((n, i) => (!isRest(n.type) ? i : -1))
      .filter(i => i >= 0);

    if (soundIndices.length > 0) {
      const idx = soundIndices[Math.floor(Math.random() * soundIndices.length)];
      const targetNote = mutated[idx];
      const currentPitch = targetNote.pitch || 'C4';

      let pool: { pitch: string; staffStep: number; accidental?: '#' | 'b' }[] = [];
      if (level === 10) {
        pool = DIATONIC_PITCHES.filter(p => p.pitch !== currentPitch);
      } else {
        pool = [...DIATONIC_PITCHES, ...ACCIDENTAL_PITCHES].filter(p => p.pitch !== currentPitch);
      }

      const newPitchObj = pool[Math.floor(Math.random() * pool.length)];
      mutated[idx] = {
        ...targetNote,
        pitch: newPitchObj.pitch,
        staffStep: newPitchObj.staffStep,
        accidental: newPitchObj.accidental
      };

      if (mutationMode === 'pitch') {
        return mutated;
      }
    }
  }

  // 2. RHYTHMIC MUTATION
  const rIdx = Math.floor(Math.random() * mutated.length);
  const target = mutated[rIdx];

  // Try duration-preserving or clean substitutions
  if (target.type === 'quarter') {
    // Substitute with quarter_rest OR split into two eighth notes
    if (level >= 2 && Math.random() < 0.5) {
      const e1 = getNoteFromType('eighth');
      const e2 = getNoteFromType('eighth');
      assignPitch(e1, level);
      assignPitch(e2, level);
      mutated.splice(rIdx, 1, e1, e2);
    } else {
      mutated[rIdx] = getNoteFromType('quarter_rest');
    }
  } else if (target.type === 'quarter_rest') {
    const q = getNoteFromType('quarter');
    assignPitch(q, level);
    mutated[rIdx] = q;
  } else if (target.type === 'eighth') {
    // If next note is also eighth, could merge into quarter
    if (rIdx < mutated.length - 1 && mutated[rIdx + 1].type === 'eighth') {
      const q = getNoteFromType('quarter');
      assignPitch(q, level);
      mutated.splice(rIdx, 2, q);
    } else {
      mutated[rIdx] = getNoteFromType(level >= 5 ? 'eighth_rest' : 'quarter_rest');
    }
  } else if (target.type === 'eighth_rest') {
    const e = getNoteFromType('eighth');
    assignPitch(e, level);
    mutated[rIdx] = e;
  } else if (target.type === 'half') {
    // Turn to half_rest or split to two quarters
    if (Math.random() < 0.5) {
      mutated[rIdx] = getNoteFromType('half_rest');
    } else {
      const q1 = getNoteFromType('quarter');
      const q2 = getNoteFromType('quarter');
      assignPitch(q1, level);
      assignPitch(q2, level);
      mutated.splice(rIdx, 1, q1, q2);
    }
  } else if (target.type === 'half_rest') {
    const h = getNoteFromType('half');
    assignPitch(h, level);
    mutated[rIdx] = h;
  } else if (target.type === 'whole') {
    mutated[rIdx] = getNoteFromType(level >= 9 ? 'whole_rest' : 'half');
  } else if (target.type === 'whole_rest') {
    const w = getNoteFromType('whole');
    assignPitch(w, level);
    mutated[rIdx] = w;
  } else if (target.type === 'sixteenth') {
    mutated[rIdx] = getNoteFromType(level >= 9 ? 'sixteenth_rest' : 'eighth');
  } else if (target.type === 'sixteenth_rest') {
    const s = getNoteFromType('sixteenth');
    assignPitch(s, level);
    mutated[rIdx] = s;
  }

  return mutated;
};

export const setupCrew = (size: number, level: number): Crewmate[] => {
  let impostorCount = 3;
  if (size <= 6) impostorCount = 2;
  else if (size <= 8) impostorCount = 3;
  else impostorCount = 4;

  const crew: Crewmate[] = [];
  const shuffledEntries = [...COLOR_ENTRIES].sort(() => Math.random() - 0.5);
  
  const impostorIndices = new Set<number>();
  while (impostorIndices.size < impostorCount) {
    impostorIndices.add(Math.floor(Math.random() * size));
  }

  for (let i = 0; i < size; i++) {
    const isImpostor = impostorIndices.has(i);
    const visualRhythm = generateRhythm(level);
    const audibleRhythm = isImpostor ? mutateRhythm(visualRhythm, level) : visualRhythm;

    crew.push({
      id: i,
      color: shuffledEntries[i].color,
      name: shuffledEntries[i].name,
      isImpostor,
      visualRhythm,
      audibleRhythm,
      hasBeenInterviewed: false
    });
  }

  return crew;
};
