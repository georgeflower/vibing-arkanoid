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
  const [flickerOpacity, setFlickerOpacity] = useState(1);

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
        setTimeout(() => setIsScrolling(false), 800); // Allow scroll animation to complete
      }, 100);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // LED flicker effect
  useEffect(() => {
    const flickerInterval = setInterval(() => {
      // Random subtle opacity variation between 0.92 and 1.0
      const newOpacity = 0.92 + Math.random() * 0.08;
      setFlickerOpacity(newOpacity);
    }, 100 + Math.random() * 150); // Random interval between 100-250ms
    
    return () => clearInterval(flickerInterval);
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
    
    if (!current) return `${label}: ---`;
    return `${label}: ${current.name} ${formatScore(current.score)}`;
  };

  return (
    <div className="retro-border bg-black/90 backdrop-blur-sm rounded-lg p-3 w-full overflow-hidden">
      <div className="relative h-8 flex items-center justify-center">
        <div
          className={`text-xs md:text-sm tracking-wider whitespace-nowrap transition-transform duration-700 ease-out ${
            isScrolling ? "translate-x-[-100%]" : "translate-x-0"
          }`}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            color: "#ff9500",
            textShadow: "0 0 10px rgba(255, 149, 0, 0.6), 0 0 20px rgba(255, 149, 0, 0.3)",
            opacity: flickerOpacity,
          }}
        >
          {getDisplayText()}
        </div>
      </div>
    </div>
  );
};
