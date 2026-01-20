import { useBossRushScores } from "@/hooks/useBossRushScores";

export const BossRushLeaderboard = () => {
  const { scores, isLoading, formatTime } = useBossRushScores();

  return (
    <div className="bg-slate-900/80 rounded-lg p-6 border-2 border-red-500/30 w-full max-w-md max-h-[80vh] overflow-y-auto smooth-scroll">
      <h2 className="text-2xl font-bold text-center mb-4 font-mono">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400">
          ⚔️ BOSS RUSH SCORES ⚔️
        </span>
      </h2>

      {isLoading ? (
        <div className="text-center text-slate-400 py-8 font-mono">
          Loading...
        </div>
      ) : (
        <div className="space-y-2">
          {scores.map((entry, index) => (
            <div
              key={entry.id || index}
              className="flex items-center font-mono text-sm px-2 py-2 bg-slate-800/50 rounded border border-red-500/20 gap-2"
            >
              <span className="text-red-300 w-6 flex-shrink-0">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
              </span>
              <span className="text-orange-400 font-bold w-12 flex-shrink-0 truncate">
                {entry.name}
              </span>
              <span className="text-amber-300 flex-1 text-right font-bold">
                {entry.score.toLocaleString()}
              </span>
              <span className="text-cyan-300 w-16 text-right flex-shrink-0">
                {formatTime(entry.completionTimeMs)}
              </span>
            </div>
          ))}
          {scores.length === 0 && (
            <div className="text-center text-slate-500 py-8 font-mono">
              No scores yet! Be the first!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
