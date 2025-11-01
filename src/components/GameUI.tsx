interface GameUIProps {
  score: number;
  lives: number;
  level: number;
}

export const GameUI = ({ score, lives, level }: GameUIProps) => {
  return (
    <div className="flex gap-12 items-center">
      <div className="flex flex-col items-center gap-2">
        <div className="text-neon-cyan text-sm font-semibold tracking-wider">
          SCORE
        </div>
        <div className="text-4xl font-bold neon-text text-neon-purple">
          {score.toString().padStart(6, "0")}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="text-neon-orange text-sm font-semibold tracking-wider">
          LEVEL
        </div>
        <div className="text-4xl font-bold neon-text text-neon-orange">
          {level.toString().padStart(2, "0")}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="text-neon-pink text-sm font-semibold tracking-wider">
          LIVES
        </div>
        <div className="text-4xl font-bold neon-text text-neon-pink">
          {lives}
        </div>
      </div>
    </div>
  );
};
