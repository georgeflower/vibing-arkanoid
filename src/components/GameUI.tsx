interface GameUIProps {
  score: number;
  lives: number;
}

export const GameUI = ({ score, lives }: GameUIProps) => {
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
        <div className="text-neon-pink text-sm font-semibold tracking-wider">
          LIVES
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full transition-all ${
                i < lives
                  ? "bg-neon-pink shadow-[0_0_10px_hsl(330,100%,65%)]"
                  : "bg-muted opacity-30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
