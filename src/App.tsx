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
  X
} from 'lucide-react';

const APPS = [
  {
    id: 'playcolora',
    name: 'PlayColora',
    description: 'Herramienta de creación y reproducción de música en colores',
    icon: Palette,
    imageUrl: '/playcolora-logo.png',
    url: 'https://playcolora.netlify.app/playcolora',
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
    answer: 'Sí, actualmente todas las herramientas alojadas en Acaïs Lab son de acceso libre para educadores y estudiantes, puedes apoyar estos proyectos en buymeacoffe'
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
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
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

function Hero() {
  return (
    <section id="inicio" className="min-h-screen flex items-center justify-center pt-20 px-6 relative overflow-hidden">
      <div className="max-w-5xl mx-auto text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm text-slate-300 mb-8">
            <Sparkles className="w-4 h-4 text-[#00E5FF]" />
            <span>Estudio de Software Educativo</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tighter leading-[1.1] mb-8">
            Desarrollo de <br className="hidden md:block" />
            <span className="text-gradient">herramientas educativas</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 font-light max-w-2xl mx-auto leading-relaxed mb-12">
            Creando experiencias digitales que transforman el aprendizaje. 
            Funcionalidad, rendimiento y propósito en cada línea de código.
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
        </motion.div>
      </div>
      
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
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">El Laboratorio</h2>
          <p className="text-slate-400 font-light text-lg max-w-2xl leading-relaxed">
            Un ecosistema de aplicaciones independientes diseñadas para resolver problemas específicos en el aula y fuera de ella.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {APPS.map((app, index) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="glass-panel rounded-3xl p-8 group hover:bg-white/10 transition-all duration-500 flex flex-col h-full"
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
              <a 
                href={app.url}
                className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-colors mt-auto w-fit"
              >
                Abrir aplicación <ExternalLink className="w-4 h-4" />
              </a>
            </motion.div>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
            <div>
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-8">Isaac Araya Inostroza</h2>
              <div className="space-y-6 text-slate-300 font-light leading-relaxed text-lg">
                <p>
                  Profesor, músico y desarrollador de software. Mi objetivo es tender un puente entre la pedagogía tradicional y las posibilidades infinitas de la tecnología.
                </p>
                <p>
                  Acaïs Lab nace de la necesidad de crear herramientas prácticas, con una mirada distinta, que realmente entiendan el contexto educativo y las necesidades tanto de docentes como de estudiantes.
                </p>
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
            
            <div className="relative h-full min-h-[400px] rounded-3xl overflow-hidden glass-panel border-white/20 flex items-center justify-center">
              {/* Abstract representation instead of a real photo for now */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 to-cyan-900/40 mix-blend-overlay" />
              <div className="text-center p-8">
                <div className="w-24 h-24 mx-auto border border-white/20 rounded-full flex items-center justify-center mb-6 bg-white/5">
                  <span className="text-3xl font-display font-bold">IA</span>
                </div>
                <p className="text-sm tracking-widest uppercase text-slate-400 font-medium">Fundador & Desarrollador</p>
              </div>
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
        <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Apoya nuestro trabajo</h2>
        <p className="text-slate-400 font-light text-lg mb-12">
          Si estas herramientas te han sido útiles, considera apoyarnos para seguir creando y manteniendo Acaïs Lab.
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
        <div className="flex gap-6 text-sm text-slate-500">
          <button onClick={() => setActiveModal('privacy')} className="hover:text-white transition-colors cursor-pointer">Privacidad</button>
          <button onClick={() => setActiveModal('terms')} className="hover:text-white transition-colors cursor-pointer">Términos</button>
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
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <AppsShowcase />
        <About />
        <Support />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
