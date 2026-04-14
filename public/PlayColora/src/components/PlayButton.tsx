import React, { useState, useEffect } from 'react';
import { Play, Square } from 'lucide-react';

interface Particle {
  id: string;
  dx: number;
  dy: number;
  rotation: number;
}

interface PlayButtonProps {
  isPlaying: boolean;
  onClick: () => void;
  className?: string;
  buttonClassName?: string;
  iconSize?: number;
}

export const PlayButton: React.FC<PlayButtonProps> = ({ isPlaying, onClick, className = '', buttonClassName = 'p-3', iconSize = 20 }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  useEffect(() => {
    if (isPlaying) {
      setIsShaking(false);
      return;
    }

    const triggerShake = () => {
      setIsShaking(true);
      
      const newParticles: Particle[] = Array.from({ length: 4 }).map(() => ({
        id: crypto.randomUUID(),
        dx: (Math.random() - 0.5) * 60,
        dy: -40 - Math.random() * 20,
        rotation: (Math.random() - 0.5) * 90
      }));
      setParticles(newParticles);

      setTimeout(() => {
        setIsShaking(false);
      }, 800);

      setTimeout(() => {
        setParticles([]);
      }, 1400); // 800ms shake + 600ms particle fade
    };

    const scheduleNext = () => {
      const delay = 8000 + Math.random() * 7000;
      return setTimeout(() => {
        triggerShake();
        timeoutId = scheduleNext();
      }, delay);
    };

    let timeoutId = scheduleNext();

    return () => clearTimeout(timeoutId);
  }, [isPlaying]);

  return (
    <div className={className}>
      <div className="relative">
        <button
          className={`${buttonClassName} rounded-full shadow-lg transition-all shrink-0 ${
            isPlaying 
              ? 'bg-red-500 text-white shadow-red-900/20' 
              : 'bg-green-500 text-white shadow-green-900/20 animate-subtle-bounce'
          } ${isShaking ? 'animate-dog-shake' : ''}`}
          onClick={onClick}
        >
          {isPlaying ? <Square size={iconSize} fill="currentColor" /> : <Play size={iconSize} fill="currentColor" className="ml-0.5" />}
        </button>

        {particles.map(p => (
          <div
            key={p.id}
            className="absolute top-1/2 left-1/2 text-green-400 pointer-events-none font-bold text-lg particle-anim z-50"
            style={{
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--rot': `${p.rotation}deg`
            } as React.CSSProperties}
          >
            ♪
          </div>
        ))}
      </div>
    </div>
  );
};
