import { motion } from 'motion/react';

export function SurveyPage() {
  return (
    <div className="min-h-screen bg-[#050A15] text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl md:text-6xl font-display font-bold mb-16 text-center">Proyecto Quintos Básicos 2026</h1>
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl justify-center">
        <a 
          href="https://forms.gle/2XY1UUwvRNSdAVtHA" 
          target="_blank" 
          rel="noopener noreferrer"
          className="glass-panel flex-1 p-8 rounded-3xl flex flex-col items-center gap-6 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-2 border border-white/10"
        >
          <svg className="w-24 h-24 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <circle cx="15.5" cy="8.5" r="1.5" />
            <circle cx="8.5" cy="15.5" r="1.5" />
            <circle cx="15.5" cy="15.5" r="1.5" />
          </svg>
          <span className="text-2xl font-semibold">Dilemas de juegos</span>
        </a>
        <a 
          href="https://docs.google.com/forms/d/e/1FAIpQLSd3usfoqMg875MTAFG4FRGbUKbE1FRRxZ6p3BHrvOTgAJELgg/viewform" 
          target="_blank" 
          rel="noopener noreferrer"
          className="glass-panel flex-1 p-8 rounded-3xl flex flex-col items-center gap-6 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-2 border border-white/10"
        >
          <svg className="w-24 h-24 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="text-2xl font-semibold">Actividad de artes</span>
        </a>
      </div>
    </div>
  );
}
