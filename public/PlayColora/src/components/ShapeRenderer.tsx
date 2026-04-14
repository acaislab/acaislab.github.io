import { Shape, Alteration } from '../types';

interface ShapeRendererProps {
  shape: Shape;
  color: string;
  width: number;
  alteration: Alteration;
  isSplitStart?: boolean;
  isSplitEnd?: boolean;
  isSplitMiddle?: boolean;
}

export const ShapeRenderer = ({ shape, color, width, alteration, isSplitStart, isSplitEnd, isSplitMiddle }: ShapeRendererProps) => {
  const borderRadiusClass = isSplitMiddle ? 'rounded-none' : isSplitStart ? 'rounded-l-full' : isSplitEnd ? 'rounded-r-full' : 'rounded-full';
  const rectRadiusClass = isSplitMiddle ? 'rounded-none' : isSplitStart ? 'rounded-l-sm' : isSplitEnd ? 'rounded-r-sm' : 'rounded-sm';

  return (
    <div className="w-full h-full flex items-center justify-center relative pointer-events-none">
      {shape === 'oval' && (
        <div className={`w-full h-4 ${borderRadiusClass} shadow-md`} style={{ backgroundColor: color }} />
      )}
      {shape === 'rectangle' && (
        <div className={`w-full h-4 ${rectRadiusClass} shadow-md`} style={{ backgroundColor: color }} />
      )}
      
      {/* Alteration overlay */}
      {alteration === '#' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1 bg-black z-10" />
      )}
      {alteration === '-' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1 bg-white z-10" />
      )}
      {alteration === 'n' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black font-bold text-[10px] leading-none z-10" style={{ textShadow: '0 0 2px white' }}>♮</div>
      )}
    </div>
  );
}
