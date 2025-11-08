import { useState, useEffect } from "react";

export interface HighScore {
  name: string;
  score: number;
  level: number;
  difficulty?: string;
  beatLevel50?: boolean;
  startingLives?: number;
}

const STORAGE_KEY = "neon_breaker_high_scores";
const MAX_HIGH_SCORES = 10;

export const useHighScores = () => {
  const [highScores, setHighScores] = useState<HighScore[]>([]);

  // Load high scores from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHighScores(parsed);
      } catch (e) {
        console.error("Failed to load high scores:", e);
      }
    }
  }, []);

  // Save high scores to localStorage whenever they change
  useEffect(() => {
    if (highScores.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(highScores));
    }
  }, [highScores]);

  const isHighScore = (score: number): boolean => {
    if (highScores.length < MAX_HIGH_SCORES) return true;
    return score > highScores[highScores.length - 1].score;
  };

  const addHighScore = (name: string, score: number, level: number, difficulty?: string, beatLevel50?: boolean, startingLives?: number) => {
    const newScore: HighScore = { name, score, level, difficulty, beatLevel50, startingLives };
    const updatedScores = [...highScores, newScore]
      .sort((a, b) => {
        // Sort by starting lives first (lower is better), then by score (higher is better)
        const aLives = a.startingLives || 3;
        const bLives = b.startingLives || 3;
        if (aLives !== bLives) {
          return aLives - bLives;
        }
        return b.score - a.score;
      })
      .slice(0, MAX_HIGH_SCORES);
    setHighScores(updatedScores);
  };

  const clearHighScores = () => {
    setHighScores([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    highScores,
    isHighScore,
    addHighScore,
    clearHighScores,
  };
};
