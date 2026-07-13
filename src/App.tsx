/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Palette, 
  BookOpen, 
  Music, 
  ChevronDown, 
  ExternalLink,
  Code,
  GraduationCap,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const APPS = [
  {
    id: 'karekau',
    name: 'Karekau',
    description: 'Un juego de cartas donde las emociones lo son todo',
    icon: Sparkles,
    imageUrl: '/karekau.png',
    url: 'https://acaislab.com/karekau',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'ritmoimpostor',
    name: 'Ritmo Impostor',
    description: '¿Puedes descubrir quién falla el silencio? Juega a tu nivel',
    icon: Music,
    imageUrl: '/rojo.png',
    url: 'https://acaislab.com/ritmoimpostor',
    color: 'from-red-500 to-orange-500'
  },
  {
    id: 'playcolora',
    name: 'PlayColora',
    description: 'Herramienta de creación y reproducción de música en colores',
    icon: Palette,
    imageUrl: '/playcolora-logo.png',
    url: 'https://acaislab.com/playcolora/',
    color: 'from-pink-500 to-rose-500'
  },
  {
    id: 'enfasisapp',
    name: 'Énfasis App',
    description: 'Diseñada para la universidad, esta app automatiza tus prioridades y calcula cómo llegar a tus metas',
    icon: BookOpen,
    imageUrl: '/enfasisapp-logo.png',
    url: 'https://daleenfasis.netlify.app/',
    color: 'from-cyan-500 to-blue-500'
  },
  {
    id: 'proadelaida',
    name: 'Pro Adelaida',
    description: 'Un cuaderno para profes orientado al reconocimiento de valores con respaldo seguro de su información',
    icon: Music,
    imageUrl: '/proadelaida-logo.png',
    url: 'https://pro-adelaidapp.vercel.app/',
    color: 'from-violet-500 to-purple-500'
  }
];

const FAQS = [
  {
    question: '¿Las aplicaciones son gratuitas?',
    answer: 'Sí, actualmente todas las herramientas alojadas en Acaïs Lab son de acceso libre para educadores y estudiantes, puedes apoyar estos proyectos en Ko-Fi'
  },
  {
    question: '¿Necesito crear una cuenta para usar las apps?',
    answer: 'No es necesario. Las aplicaciones están diseñadas para ser utilizadas inmediatamente sin barreras de entrada, en Pro Adelaida puedes opcionalmente respaldar tu información en la nube.'
  },
  {
    question: '¿Necesito un tutorial para usar las apps?',
    answer: 'Intentamos que las herramientas sean lo más intuitivas posibles, sin embargo estamos trabajando una serie de vídeos para youtube (próximamente).'
  },
  {
    question: '¿Cómo puedo hacer una pregunta específica o sugerir una mejora?',
    answer: 'Puedes contactarnos través de nuestro correo contacto@acaislab.com estarémos felices de ayudarte!'
  },
  {
    question: '¿Las apps son para dispositivos móviles o de escritorio?',
    answer: 'ProAdelaida está diseñada para computador, PlayColora admite ambos dispositivos, pero está optimizada para uso con teclado físico, en cambio ÉnfasisApp está totalmente optimizada para ser usada en dispositivos móviles.'
  }
];

const HERO_SLIDES = [
  { id: 'intro', type: 'content' },
  { id: 'video1', type: 'video', src: '/video.mp4', url: 'https://acaislab.com/playcolora/' },
  { id: 'img1', type: 'image', src: '/slide1.jpg', url: 'https://pro-adelaidapp.vercel.app/' },
  { id: 'img2', type: 'image', src: '/slide2.jpg', url: 'https://acaislab.com/ritmoimpostor' },
  { id: 'img3', type: 'image', src: '/slide3.jpg', url: 'https://acaislab.com/playcolora/' },
  { id: 'img4', type: 'image', src: '/slide4.jpg', url: 'https://acaislab.com/playcolora/' },
  { id: 'img5', type: 'image', src: '/slide5.jpg', url: 'https://acaislab.com/ritmoimpostor' },
  { id: 'img6', type: 'image', src: '/slide6.jpg', url: 'https://www.linkedin.com/in/isaac-araya-inostroza-226577b0/' },
  { id: 'img7', type: 'image', src: '/slide7.jpg', url: 'https://pro-adelaidapp.vercel.app/' },
  { id: 'img8', type: 'image', src: '/slide8.png', url: 'https://acaislab.com/karekau' },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass-panel py-4' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center relative">
        <a href="#" className="text-2xl font-display font-bold tracking-tight flex items-center gap-1">
          Aca<span className="relative">i<span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[#00E5FF] text-lg leading-none drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]">..</span></span>s Lab
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#inicio" className="hover:text-white transition-colors">Inicio</a>
          <a href="#apps" className="hover:text-white transition-colors">Apps</a>
          <a href="#sobre-mi" className="hover:text-white transition-colors">Sobre Mí</a>
          <a href="#faqs" className="hover:text-white transition-colors">FAQs</a>
        </div>
      </div>
    </nav>
  );
}

function Hero({ 
  currentIndex, 
  setCurrentIndex,
  nextSlide,
  prevSlide,
  isPinned,
  setIsPinned
}: { 
  currentIndex: number;
  setCurrentIndex: (idx: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  isPinned: boolean;
  setIsPinned: (pinned: boolean) => void;
}) {
  return (
    <section id="inicio" className="min-h-screen flex items-center justify-center pt-20 px-6 relative overflow-hidden bg-[#050A15]">
      
      {/* Side Navigation Controls */}
      <button 
        onClick={() => { prevSlide(); setIsPinned(false); }}
        className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 z-20 text-slate-500 hover:text-white transition-all p-2 rounded-full hover:bg-white/10"
        aria-label="Anterior pantalla"
      >
        <ChevronLeft className="w-8 h-8 md:w-12 md:h-12 opacity-30 hover:opacity-100 transition-opacity" />
      </button>

      <button 
        onClick={() => { nextSlide(); setIsPinned(false); }}
        className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 z-20 text-slate-500 hover:text-white transition-all p-2 rounded-full hover:bg-white/10"
        aria-label="Siguiente pantalla"
      >
        <ChevronRight className="w-8 h-8 md:w-12 md:h-12 opacity-30 hover:opacity-100 transition-opacity" />
      </button>

      {/* Dots Navigation */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        {HERO_SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (index !== currentIndex) {
                setCurrentIndex(index);
                setIsPinned(false);
              } else {
                setIsPinned(false);
              }
            }}
            onDoubleClick={() => {
              setCurrentIndex(index);
              setIsPinned(true);
            }}
            className={`transition-all duration-300 rounded-full ${
              index === currentIndex 
                ? (isPinned ? 'w-6 h-2 bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]' : 'w-6 h-2 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]') 
                : 'w-2 h-2 bg-slate-600 hover:bg-slate-400'
            }`}
            aria-label={`Ir a la pantalla ${index + 1}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 w-full h-full flex items-center justify-center"
        >
          {HERO_SLIDES[currentIndex].type === 'content' && (
            <div className="max-w-7xl mx-auto text-center z-10 px-6 mt-16 lg:mt-0">
              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tighter leading-[1.1] mb-8 text-slate-50 max-w-6xl mx-auto whitespace-normal">
                Desarrollo de herramientas <br className="hidden md:block" />
                <span className="text-gradient">educativas y musicales</span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-400 font-light max-w-3xl mx-auto leading-relaxed mb-12">
                Laboratorio de progressive web apps con sentido
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a 
                  href="#apps"
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.5)] transition-all duration-300 transform hover:-translate-y-1"
                >
                  Explorar Aplicaciones
                </a>
                <a 
                  href="#sobre-mi"
                  className="px-8 py-4 rounded-2xl glass-panel text-white font-medium hover:bg-white/10 transition-all duration-300"
                >
                  Conocer al creador
                </a>
              </div>
            </div>
          )}

          {HERO_SLIDES[currentIndex].type === 'image' && (
            <div className="w-full h-full p-4 md:p-12 lg:p-24 pb-32 flex items-center justify-center mt-16 z-0">
              <a 
                href={HERO_SLIDES[currentIndex].url || "#"} 
                target={HERO_SLIDES[currentIndex].url ? "_blank" : "_self"} 
                rel={HERO_SLIDES[currentIndex].url ? "noopener noreferrer" : ""}
                className={`w-full h-full flex items-center justify-center ${HERO_SLIDES[currentIndex].url ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <img 
                  src={HERO_SLIDES[currentIndex].src} 
                  alt="Pantalla de aplicación" 
                  className="w-full h-full object-contain drop-shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-2xl"
                />
              </a>
            </div>
          )}

          {HERO_SLIDES[currentIndex].type === 'video' && (
            <div className="w-full h-full p-4 md:p-12 lg:p-24 pb-32 flex items-center justify-center mt-16 z-0">
              <a 
                href={HERO_SLIDES[currentIndex].url || "#"} 
                target={HERO_SLIDES[currentIndex].url ? "_blank" : "_self"} 
                rel={HERO_SLIDES[currentIndex].url ? "noopener noreferrer" : ""}
                className={`w-full h-full flex items-center justify-center ${HERO_SLIDES[currentIndex].url ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <video 
                  src={HERO_SLIDES[currentIndex].src} 
                  autoPlay 
                  muted 
                  loop 
                  playsInline
                  className="w-full h-full object-contain drop-shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-2xl pointer-events-none"
                />
              </a>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
    </section>
  );
}

function AppsShowcase() {
  return (
    <section id="apps" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 md:mb-24">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Prueba Las Apps ¡Son Gratis!</h2>
          <p className="text-slate-400 font-light text-lg max-w-2xl leading-relaxed">
            Te recomendamos PlayColora disponible en versión móvil y sin conexión
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {APPS.map((app, index) => (
            <motion.a
              key={app.id}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="glass-panel rounded-3xl p-8 group hover:bg-white/10 transition-all duration-500 flex flex-col h-full cursor-pointer block"
            >
              {app.imageUrl ? (
                <div className="w-16 h-16 rounded-2xl mb-8 shadow-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center p-2">
                  <img src={app.imageUrl} alt={`${app.name} logo`} className="w-full h-full object-contain drop-shadow-md" referrerPolicy="no-referrer" />
                </div>
              ) : (
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center mb-8 shadow-lg`}>
                  <app.icon className="w-7 h-7 text-white" />
                </div>
              )}
              <h3 className="text-2xl font-display font-semibold mb-4 group-hover:text-[#00E5FF] transition-colors">{app.name}</h3>
              <p className="text-slate-400 font-light leading-relaxed mb-8 flex-grow">
                {app.description}
              </p>
              <div 
                className="inline-flex items-center gap-2 text-sm font-medium text-white/80 group-hover:text-white transition-colors mt-auto w-fit"
              >
                Abrir aplicación <ExternalLink className="w-4 h-4" />
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="sobre-mi" className="py-32 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <div className="glass-panel rounded-[3rem] p-8 md:p-16 overflow-hidden relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10">
            <div className="lg:col-span-8 xl:col-span-8">
              <h2 className="text-[2.25rem] sm:text-5xl lg:text-[3rem] xl:text-[3.5rem] font-display font-bold mb-8 tracking-tight whitespace-normal lg:whitespace-nowrap">Bienvenid꩜ al laboratorio 👨🏻‍💻♬♪</h2>
              <div className="space-y-6 text-slate-300 font-light leading-relaxed text-[26px]">
                <p>
                  Soy Isaac Araya, profesor de música especialista en educación emocional y neurociencias aplicadas, desarrollador de estas apps con agentes de IA. 
                  Creé AcaïsLab para resolver problemáticas surgidas en el contexto educativo ingeniando herramientas prácticas, entretenidas y gratuitas. Estas apps hacen mejor mi vida cotidiana ¡Espero que las disfrutes!
                </p>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 text-sm text-slate-400 italic max-w-2xl">
                Aprovecho de agradecer a la persona que me nominó al Global Teacher Prize, aún no sé quién eres, pero quiero que sepas que completé la postulación 🤗
              </div>
              
              <div className="flex flex-wrap gap-4 mt-10">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm">
                  <GraduationCap className="w-4 h-4 text-violet-400" />
                  <span>Educación</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm">
                  <Music className="w-4 h-4 text-cyan-400" />
                  <span>Música</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm">
                  <Code className="w-4 h-4 text-pink-400" />
                  <span>Desarrollo</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center lg:justify-end lg:col-span-4 xl:col-span-4">
              <a href="https://www.linkedin.com/in/isaac-araya-inostroza-226577b0" target="_blank" rel="noopener noreferrer">
                <img 
                  src="/retrato.png" 
                  alt="Isaac Araya" 
                  className="w-[300px] h-[300px] md:w-[360px] md:h-[360px] lg:w-[400px] lg:h-[400px] object-cover rounded-full border-4 border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)] transition-transform duration-500 hover:scale-105"
                />
              </a>
            </div>
          </div>
          
          {/* Decorative background for about section */}
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-cyan-500/10 rounded-full blur-[100px] -z-0 pointer-events-none" />
        </div>
      </div>
    </section>
  );
}

function Support() {
  return (
    <section id="apoyo" className="py-32 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Si sientes gratitud puedes regalarme un café ☕️</h2>
        <p className="text-slate-400 font-light text-lg mb-12">
          Aquí puedes donar un café a mi trabajo de manera segura mediante Ko-fi
        </p>
        <div className="glass-panel rounded-3xl overflow-hidden p-2 bg-white/5">
          <iframe 
            id='kofiframe' 
            src='https://ko-fi.com/acaislab/?hidefeed=true&widget=true&embed=true&preview=true' 
            style={{ border: 'none', width: '100%', padding: '4px', background: '#f9f9f9', borderRadius: '1.25rem' }} 
            height='712' 
            title='acaislab'
          />
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faqs" className="py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Preguntas Frecuentes</h2>
          <p className="text-slate-400 font-light text-lg">
            Todo lo que necesitas saber sobre el uso de nuestras herramientas.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => (
            <div 
              key={index}
              className="glass-panel rounded-2xl overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-6 flex items-center justify-between text-left focus:outline-none"
              >
                <span className="font-medium text-lg pr-8">{faq.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${openIndex === index ? 'rotate-180' : ''}`} 
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 text-slate-400 font-light leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <footer className="py-12 px-6 border-t border-white/10 mt-20 relative">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-2xl font-display font-bold tracking-tight flex items-center gap-1 opacity-80">
          Aca<span className="relative">i<span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[#00E5FF] text-lg leading-none">..</span></span>s Lab
        </div>
        <p className="text-slate-500 text-sm font-light text-center md:text-left">
          © {new Date().getFullYear()} Acaïs Lab.{' '}
          <a href="mailto:contacto@acaislab.com" className="hover:text-white transition-colors underline decoration-white/30 underline-offset-4">
            Todos los derechos reservados.
          </a>
        </p>
        <div className="flex flex-col md:flex-row gap-6 items-center text-sm text-slate-500">
          <div className="flex gap-6">
            <button onClick={() => setActiveModal('privacy')} className="hover:text-white transition-colors cursor-pointer">Privacidad</button>
            <button onClick={() => setActiveModal('terms')} className="hover:text-white transition-colors cursor-pointer">Términos</button>
          </div>
          <div className="flex items-center justify-center bg-white/5 rounded-full px-2 py-1 border border-white/10">
            <div className="flex items-center justify-center">
              <img src="https://api.visitorbadge.io/api/visitors?path=acaislab.com&label=Visitas&labelColor=%23050A15&countColor=%2340C1C1&style=flat" alt="Contador de visitas" className="h-6" />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel p-8 rounded-3xl max-w-lg w-full relative"
            >
              <button 
                onClick={() => setActiveModal(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              {activeModal === 'privacy' ? (
                <>
                  <h3 className="text-2xl font-display font-bold mb-4">Privacidad</h3>
                  <p className="text-slate-300 font-light leading-relaxed">
                    Nuestras aplicaciones no requieren datos sensibles. Todos los datos proporcionados están totalmente seguros, no se venden ni se recopilan con fines comerciales.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-display font-bold mb-4">Términos y Condiciones</h3>
                  <p className="text-slate-300 font-light leading-relaxed">
                    Las aplicaciones alojadas en Acaïs Lab son propiedad exclusiva de Isaac Araya Inostroza. No está permitido hacer copias, reproducciones ni hacer uso de las imágenes, logos o código fuente.
                    <br /><br />
                    Si necesitas algún permiso especial, puedes contactarnos en{' '}
                    <a href="mailto:contacto@acaislab.com" className="text-[#00E5FF] hover:underline">contacto@acaislab.com</a>.
                  </p>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </footer>
  );
}

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPinned, setIsPinned] = useState(false);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  useEffect(() => {
    if (isPinned) return;

    const currentSlide = HERO_SLIDES[currentIndex];
    const duration = currentSlide.type === 'video' ? 30000 : 9000;
    
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, duration);
    return () => clearTimeout(timer);
  }, [currentIndex, isPinned]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero 
          currentIndex={currentIndex} 
          setCurrentIndex={setCurrentIndex}
          nextSlide={nextSlide}
          prevSlide={prevSlide}
          isPinned={isPinned}
          setIsPinned={setIsPinned}
        />
        <AppsShowcase />
        <About />
        <Support />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
