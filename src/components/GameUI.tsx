interface GameUIProps {
  score: number;
  lives: number;
  level: number;
  timer: number;
  speed: number;
}

export const GameUI = ({ score, lives, level, timer, speed }: GameUIProps) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Score */}
      <div className="amiga-box px-4 py-3 min-w-[140px]">
        <div className="text-[10px] retro-pixel-text mb-2 text-center" style={{ color: 'hsl(0, 0%, 60%)' }}>
          SCORE
        </div>
        <div className="text-xl retro-pixel-text text-center" style={{ color: 'hsl(0, 0%, 85%)' }}>
          {score.toString().padStart(6, "0")}
        </div>
      </div>

      {/* Level */}
      <div className="amiga-box px-4 py-3 min-w-[140px]">
        <div className="text-[10px] retro-pixel-text mb-2 text-center" style={{ color: 'hsl(30, 75%, 55%)' }}>
          LEVEL
        </div>
        <div className="text-xl retro-pixel-text text-center" style={{ color: 'hsl(0, 0%, 85%)' }}>
          {level.toString().padStart(2, "0")}
        </div>
      </div>

      {/* Lives */}
      <div className="amiga-box px-4 py-3 min-w-[140px]">
        <div className="text-[10px] retro-pixel-text mb-2 text-center" style={{ color: 'hsl(0, 70%, 55%)' }}>
          LIVES
        </div>
        <div className="text-xl retro-pixel-text text-center" style={{ color: 'hsl(0, 0%, 85%)' }}>
          {lives}
        </div>
      </div>

      {/* Timer */}
      <div className="amiga-box px-4 py-3 min-w-[140px]">
        <div className="text-[10px] retro-pixel-text mb-2 text-center" style={{ color: 'hsl(210, 60%, 55%)' }}>
          TIMER
        </div>
        <div className="text-xl retro-pixel-text text-center" style={{ color: 'hsl(0, 0%, 85%)' }}>
          {timer}s
        </div>
      </div>

      {/* Speed */}
      <div className="amiga-box px-4 py-3 min-w-[140px]">
        <div className="text-[10px] retro-pixel-text mb-2 text-center" style={{ color: 'hsl(120, 50%, 50%)' }}>
          SPEED
        </div>
        <div className="text-xl retro-pixel-text text-center" style={{ color: 'hsl(0, 0%, 85%)' }}>
          {Math.round(speed * 100)}%
        </div>
      </div>
    </div>
  );
};
