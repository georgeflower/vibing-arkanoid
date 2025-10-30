interface HighScoreTableProps {
  scores: Array<{ name: string; score: number; level: number }>;
}

export const HighScoreTable = ({ scores }: HighScoreTableProps) => {
  return (
    <div className="bg-slate-900/80 rounded-lg p-6 border-2 border-cyan-500/30 w-full max-w-md">
      <h2 className="text-3xl font-bold text-center mb-4 text-cyan-400 font-mono">
        HIGH SCORES
      </h2>
      <div className="space-y-2">
        {scores.map((entry, index) => (
          <div
            key={index}
            className="flex justify-between items-center font-mono text-lg px-3 py-2 bg-slate-800/50 rounded border border-cyan-500/20"
          >
            <span className="text-cyan-300 w-8">{index + 1}.</span>
            <span className="text-pink-400 font-bold w-16 text-center">
              {entry.name}
            </span>
            <span className="text-amber-300 flex-1 text-right">
              {entry.score.toLocaleString()}
            </span>
            <span className="text-purple-400 w-20 text-right text-sm">
              LVL {entry.level}
            </span>
          </div>
        ))}
        {scores.length === 0 && (
          <div className="text-center text-slate-500 py-8 font-mono">
            No scores yet!
          </div>
        )}
      </div>
    </div>
  );
};
