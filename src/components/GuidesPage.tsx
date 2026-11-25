import { useState } from 'react';
import { ArrowLeft, BookOpen, ExternalLink, Music, Clock } from 'lucide-react';

interface InteractiveGuide {
  id: string;
  numberLabel: string;
  title: string;
  subtitle: string;
  description: string;
  fileUrl: string;
  topics: string[];
  accentClass: string;
}

const INTERACTIVE_GUIDES: InteractiveGuide[] = [
  {
    id: 'guia-1',
    numberLabel: 'Guía 1',
    title: 'El Pentagrama Musical',
    subtitle: 'Pentagrama, Llave de Sol y Líneas Divisorias',
    description:
      'Explora de forma interactiva las 5 líneas y 4 espacios, aprende el origen de la Llave de Sol en la 2.ª línea, practica compases y obtén tu comprobante final.',
    fileUrl: encodeURI('/el pentagrama.html'),
    topics: ['5 líneas y 4 espacios', 'Llave de Sol', 'Líneas divisorias', 'Evaluación con comprobante'],
    accentClass: 'from-amber-500 to-orange-600'
  },
  {
    id: 'guia-2',
    numberLabel: 'Guía 2',
    title: 'La Cifra Indicadora de Compás',
    subtitle: 'Compases simples de 2/4, 3/4 y 4/4',
    description:
      'Comprende la función del numerador y denominador, escucha los pulsos en 2/4, 3/4 y 4/4, completa compases en el taller práctico y descarga tu comprobante en PDF.',
    fileUrl: encodeURI('/la cifra de compás.html'),
    topics: ['Numerador y denominador', 'Compases 2/4, 3/4 y 4/4', 'Taller interactivo con audio', 'Certificado PDF'],
    accentClass: 'from-cyan-500 to-violet-600'
  }
];

export function GuidesPage({ onBack }: { onBack: () => void }) {
  const [activeGuide, setActiveGuide] = useState<InteractiveGuide | null>(null);

  if (activeGuide) {
    return (
      <div className="min-h-screen bg-[#050A15] text-slate-50 flex flex-col">
        <header className="bg-[#0B1221] border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setActiveGuide(null)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/8 hover:bg-white/15 border border-white/12 text-xs sm:text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Todas las guías</span>
            </button>
            <div className="min-w-0 hidden sm:block">
              <p className="text-sm font-display font-semibold text-white truncate">
                {activeGuide.numberLabel}: {activeGuide.title}
              </p>
            </div>
          </div>

          <a
            href={activeGuide.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <span>Abrir en pestaña aparte</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </header>

        <iframe
          src={activeGuide.fileUrl}
          title={`${activeGuide.numberLabel}: ${activeGuide.title}`}
          className="w-full flex-grow border-0 bg-white min-h-[calc(100vh-58px)]"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050A15] text-slate-50 px-6 py-12 md:py-20">
      <div className="max-w-5xl mx-auto">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onBack();
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-slate-300 hover:text-white transition-colors mb-10 whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Acaïs Lab</span>
        </a>

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 text-balance">
            Guías Interactivas
          </h1>
          <p className="text-slate-400 font-light text-lg leading-relaxed max-w-2xl">
            Material autónomo de Educación Musical creado por el profesor Isaac Araya. Selecciona la guía para comenzar y realiza la evaluación final.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {INTERACTIVE_GUIDES.map((guide) => (
            <article
              key={guide.id}
              className="glass-panel rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:bg-white/10"
            >
              <div>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${guide.accentClass} flex items-center justify-center shadow-lg shrink-0`}
                  >
                    {guide.id === 'guia-1' ? (
                      <Music className="w-7 h-7 text-white" />
                    ) : (
                      <Clock className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-cyan-300">
                    {guide.numberLabel} · HTML interactivo
                  </span>
                </div>

                <h2 className="text-2xl font-display font-bold text-white mb-1.5">
                  {guide.title}
                </h2>
                <p className="text-sm font-medium text-slate-300 mb-4">
                  {guide.subtitle}
                </p>
                <p className="text-slate-400 font-light text-sm sm:text-base leading-relaxed mb-6">
                  {guide.description}
                </p>

                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300 mb-8">
                  {guide.topics.map((topic) => (
                    <li key={topic} className="flex items-center gap-2">
                      <span className="text-[#00E5FF]" aria-hidden="true">•</span>
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveGuide(guide)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:shadow-[0_0_24px_-4px_rgba(139,92,246,0.6)] transition-all duration-200 cursor-pointer whitespace-nowrap"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Abrir {guide.numberLabel}</span>
                </button>
                <a
                  href={guide.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-slate-200 hover:text-white transition-colors whitespace-nowrap"
                >
                  <span>Nueva pestaña</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
