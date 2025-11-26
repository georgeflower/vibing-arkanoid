import { useState, useEffect } from "react";
import { useHighScores } from "@/hooks/useHighScores";

export const TopScoresDisplay = () => {
  const { fetchTopScores } = useHighScores();
  const [topScores, setTopScores] = useState<{
    daily: { name: string; score: number } | null;
    weekly: { name: string; score: number } | null;
    allTime: { name: string; score: number } | null;
  }>({ daily: null, weekly: null, allTime: null });
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    const loadTopScores = async () => {
      const scores = await fetchTopScores();
      setTopScores(scores);
    };
    loadTopScores();
  }, [fetchTopScores]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsScrolling(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % 3);
        setIsScrolling(false);
      }, 500);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatScore = (score: number | undefined) => {
    if (!score) return "---";
    return score.toString().padStart(6, "0");
  };

  const getDisplayText = () => {
    const labels = ["TODAY", "WEEKLY", "ALL-TIME"];
    const scores = [topScores.daily, topScores.weekly, topScores.allTime];
    const current = scores[currentIndex];
    const label = labels[currentIndex];
    
    if (!current) return `HIGH SCORE - ${label}: ---`;
    return `HIGH SCORE - ${label}: ${current.name} ${formatScore(current.score)}`;
  };

  return (
    <div className="retro-border bg-black/90 backdrop-blur-sm rounded-lg p-3 w-full overflow-hidden">
      <div className="relative h-8 flex items-center justify-center">
        <div
          className={`font-mono text-sm md:text-base tracking-wider transition-transform duration-500 ${
            isScrolling ? "-translate-x-full" : "translate-x-0"
          }`}
          style={{
            color: "#ff9500",
            textShadow: "0 0 10px rgba(255, 149, 0, 0.6), 0 0 20px rgba(255, 149, 0, 0.3)",
          }}
        >
          🏆 {getDisplayText()}
        </div>
      </div>
    </div>
  );
};
