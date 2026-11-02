import React from 'react';

interface CrewmateProps {
  color: string;
  className?: string;
  isDead?: boolean;
}

const COLOR_IMAGE_MAP: Record<string, string> = {
  rojo: 'rojo.png',
  rosa: 'rosa.png',
  fucsia: 'fucsia.png',
  indigo: 'indigo.png',
  violeta: 'violeta.png',
  azul: 'azul.png',
  cian: 'cian.png',
  verde_oscuro: 'verdeoscuro.png',
  verde_claro: 'verdeclaro.png',
  amarillo: 'amarillo.png',
  dorado: 'dorado.png',
  naranjo: 'naranjo.png',
};

export const CrewmateSVG: React.FC<CrewmateProps> = ({ color, className = "", isDead = false }) => {
  const imageUrl = COLOR_IMAGE_MAP[color] || COLOR_IMAGE_MAP.rojo;

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`w-full h-full rounded-2xl ${isDead ? 'opacity-30 grayscale filter' : ''}`}
        style={{
          backgroundImage: `url('${imageUrl}')`,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        {isDead && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-red-500 font-bold text-4xl transform -rotate-12 bg-black/50 px-4 py-2 rounded-xl">ELIMINADO</span>
          </div>
        )}
      </div>
    </div>
  );
};

