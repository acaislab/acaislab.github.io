import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Check, Music2 } from 'lucide-react';
import { NotationSVG, TrebleClefSVG } from './Notation';
import { NoteType } from '../types';

export interface IntroItem {
  title: string;
  description: string;
  type?: NoteType;
  accidental?: '#' | 'b';
  isClef?: boolean;
}

export interface LevelIntroData {
  level: number;
  title: string;
  badge: string;
  items: IntroItem[];
  extraNote?: string;
}

export const LEVEL_INTROS: Record<number, LevelIntroData> = {
  1: {
    level: 1,
    title: "Nivel 1: El Pulso Inicial",
    badge: "Fundamentos Rítmicos",
    items: [
      {
        title: "Negra (1 tiempo)",
        description: "Esta figura se llama negra y debe sonar.",
        type: 'quarter'
      },
      {
        title: "Silencio de Negra (1 tiempo)",
        description: "Este es el silencio de negra y NO debe sonar.",
        type: 'quarter_rest'
      }
    ],
    extraNote: "Cada figura o silencio dura exactamente 1 pulso de compás. ¡Escucha el metrónomo para seguir el tiempo!"
  },
  2: {
    level: 2,
    title: "Nivel 2: Subdivisión en Pares",
    badge: "Subdivisión Binaria",
    items: [
      {
        title: "Corcheas en pares",
        description: "Estas son corcheas en pares. Suenan juntas y dividen el pulso en dos partes iguales sin generar contratiempos.",
        type: 'eighth'
      }
    ],
    extraNote: "En este nivel las corcheas siempre aparecen de a dos completando 1 tiempo entero para evitar desajustes."
  },
  3: {
    level: 3,
    title: "Nivel 3: Figuras Largas",
    badge: "Valores de 2 Tiempos",
    items: [
      {
        title: "Blanca (2 tiempos)",
        description: "Esta figura se llama blanca y dura 2 tiempos sonando.",
        type: 'half'
      },
      {
        title: "Silencio de Blanca (2 tiempos)",
        description: "Este es el silencio de blanca y dura 2 tiempos en silencio. Se representa como un sombrero apoyado sobre la línea.",
        type: 'half_rest'
      }
    ]
  },
  4: {
    level: 4,
    title: "Nivel 4: Contratiempos y Síncopas",
    badge: "Corcheas Libres",
    items: [
      {
        title: "Corcheas sueltas",
        description: "Ahora pueden haber corcheas solas, generando contratiempos y síncopas al romper la regularidad del pulso.",
        type: 'eighth'
      }
    ],
    extraNote: "Las corcheas individuales pueden hacer que las notas suenen a contratiempo o en el aire entre pulsos."
  },
  5: {
    level: 5,
    title: "Nivel 5: Silencios de Corchea & Compás Doble",
    badge: "2 Compases (8 Pulsos)",
    items: [
      {
        title: "Silencio de Corchea (0.5 tiempo)",
        description: "Este es el silencio de corchea y NO debe sonar. Al ocupar medio tiempo crea contratiempos directos.",
        type: 'eighth_rest'
      }
    ],
    extraNote: "¡Atención! A partir de este nivel los ejercicios se extienden a 2 compases completos (8 pulsos en total)."
  },
  6: {
    level: 6,
    title: "Nivel 6: La Redonda",
    badge: "Compás Completo",
    items: [
      {
        title: "Redonda (4 tiempos)",
        description: "Esta figura se llama redonda y dura 4 tiempos completos sonando. Aparece con menor frecuencia.",
        type: 'whole'
      }
    ]
  },
  7: {
    level: 7,
    title: "Nivel 7: Semicorcheas en Pares",
    badge: "Subdivisión Rápida",
    items: [
      {
        title: "Semicorcheas en pares",
        description: "Estas son semicorcheas en pares. Dos semicorcheas suenan muy rápido y juntas completan siempre medio tiempo (0.5).",
        type: 'sixteenth'
      }
    ]
  },
  8: {
    level: 8,
    title: "Nivel 8: Variantes de Cuartina",
    badge: "Combinaciones Métricas",
    items: [
      {
        title: "Cuartinas y Galopas",
        description: "Semicorcheas sueltas que se combinan con corcheas completando tiempos enteros o medios tiempos perfectos, evitando quedar junto a figuras largas como blancas.",
        type: 'sixteenth'
      }
    ]
  },
  9: {
    level: 9,
    title: "Nivel 9: Todos los Silencios",
    badge: "Maestro del Silencio",
    items: [
      {
        title: "Silencio de Semicorchea",
        description: "Este es el silencio de semicorchea (0.25 tiempo). Una pausa relámpago que no debe sonar.",
        type: 'sixteenth_rest'
      },
      {
        title: "Silencio de Redonda",
        description: "Silencio de redonda (4 tiempos). Cuelga de la línea del pentagrama y llena un compás entero de silencio.",
        type: 'whole_rest'
      }
    ]
  },
  10: {
    level: 10,
    title: "Nivel 10: Pentagrama & Modo Melódico",
    badge: "Afinación & Pentagrama",
    items: [
      {
        title: "Pentagrama y Llave de Sol",
        description: "¡Bienvenido al modo melódico! Aparece el pentagrama de 5 líneas con la Llave de Sol y notas diatónicas afinadas (Do4 a Do5).",
        isClef: true
      }
    ],
    extraNote: "¡ATENCIÓN! A partir de este nivel los impostores pueden equivocarse SOLO en lo melódico (afinación incorrecta), SOLO en lo rítmico, o en AMBAS cosas."
  },
  11: {
    level: 11,
    title: "Nivel 11: Notas con Alteraciones",
    badge: "Cromático Avanzado",
    items: [
      {
        title: "Alteraciones (# y b)",
        description: "Se incorporan notas con sostenidos (#) y bemoles (b) en combinaciones rítmicas mucho más rebuscadas.",
        type: 'quarter',
        accidental: '#'
      }
    ],
    extraNote: "Las combinaciones rítmicas ya no tienen restricciones de adyacencia y el oído armónico es esencial."
  },
  12: {
    level: 12,
    title: "Nivel 12: Virtuoso Impostor",
    badge: "Dificultad Extrema",
    items: [
      {
        title: "Combinaciones Extremas",
        description: "Ritmos altamente complejos (ej: semicorcheas junto a blancas, síncopas extremas y silencios sincopados) junto a notas con alteraciones cromáticas.",
        type: 'sixteenth',
        accidental: 'b'
      }
    ],
    extraNote: "El reto definitivo para tu oído rítmico y melódico. ¡Identifica al impostor sin dudar!"
  }
};

interface LevelIntroModalProps {
  level: number;
  isOpen: boolean;
  onClose: () => void;
}

export const LevelIntroModal: React.FC<LevelIntroModalProps> = ({ level, isOpen, onClose }) => {
  const introData = LEVEL_INTROS[level] || LEVEL_INTROS[1];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-lg bg-slate-900 border border-blue-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
          >
            {/* Glowing gradient accent */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} /> {introData.badge}
              </span>
              <span className="text-xs font-mono text-slate-400">Nivel {level} de 12</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">
              {introData.title}
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              Nuevos elementos que se incorporan en este nivel:
            </p>

            <div className="space-y-4 mb-6 max-h-[46vh] overflow-y-auto pr-1">
              {introData.items.map((item, idx) => (
                <div 
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 hover:border-slate-700 transition-colors"
                >
                  <div className="w-14 h-16 sm:w-16 sm:h-20 bg-slate-900 rounded-xl flex items-center justify-center p-2 border border-slate-800 shrink-0">
                    {item.isClef ? (
                      <TrebleClefSVG className="w-9 h-14" color="#60a5fa" />
                    ) : item.type ? (
                      <NotationSVG type={item.type} accidental={item.accidental} className="w-8 h-12 text-blue-400" />
                    ) : (
                      <Music2 className="text-blue-400" size={28} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      {item.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}

              {introData.extraNote && (
                <div className="p-3.5 bg-blue-950/40 border border-blue-900/40 rounded-xl text-xs text-blue-200 flex items-start gap-2.5">
                  <Sparkles size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  <p>{introData.extraNote}</p>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Check size={18} />
              <span>¡Entendido, jugar!</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
