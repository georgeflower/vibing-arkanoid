import { useState, useEffect } from "react";
import { useHighScores } from "@/hooks/useHighScores";

export const TopScoresDisplay = () => {
  const { fetchTopScores } = useHighScores();
  const [topScores, setTopScores] = useState<{
    daily: { name: string; score: number } | null;
    weekly: { name: string; score: number } | null;
    allTime: { name: string; score: number } | null;
  }>({ daily: null, weekly: null, allTime: null });

  useEffect(() => {
    const loadTopScores = async () => {
      const scores = await fetchTopScores();
      setTopScores(scores);
    };
    loadTopScores();
  }, [fetchTopScores]);

  const formatScore = (score: number | undefined) => {
    if (!score) return "---";
    return score.toString().padStart(6, "0");
  };

  return (
    <div className="retro-border bg-background/95 backdrop-blur-sm rounded-lg p-6 w-full">
      <h3 className="text-2xl font-bold text-center mb-4 font-mono text-primary">
        🏆 LEADERBOARDS
      </h3>
      
      <div className="space-y-2 font-mono">
        {/* Daily */}
        <div className="flex justify-between items-center text-sm md:text-base">
          <span className="text-cyan-300">📅 TODAY</span>
          <span className="text-white">
            {topScores.daily ? (
              <>
                <span className="text-cyan-300">{topScores.daily.name}</span>
                {" "}
                <span>{formatScore(topScores.daily.score)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">---</span>
            )}
          </span>
        </div>

        {/* Weekly */}
        <div className="flex justify-between items-center text-sm md:text-base">
          <span className="text-purple-400">📆 WEEKLY</span>
          <span className="text-white">
            {topScores.weekly ? (
              <>
                <span className="text-purple-400">{topScores.weekly.name}</span>
                {" "}
                <span>{formatScore(topScores.weekly.score)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">---</span>
            )}
          </span>
        </div>

        {/* All-Time */}
        <div className="flex justify-between items-center text-sm md:text-base">
          <span className="text-amber-400">🌟 ALL-TIME</span>
          <span className="text-white">
            {topScores.allTime ? (
              <>
                <span className="text-amber-400">{topScores.allTime.name}</span>
                {" "}
                <span>{formatScore(topScores.allTime.score)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">---</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
