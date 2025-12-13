import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'vibing-arkanoid-max-level-reached';

export const useLevelProgress = () => {
  const [maxLevelReached, setMaxLevelReached] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? parseInt(stored, 10) : 1;
    } catch {
      return 1;
    }
  });

  // Sync with localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setMaxLevelReached(parseInt(stored, 10));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const updateMaxLevel = useCallback((level: number) => {
    setMaxLevelReached((prev) => {
      if (level > prev) {
        try {
          localStorage.setItem(STORAGE_KEY, level.toString());
        } catch {
          // Ignore localStorage errors
        }
        return level;
      }
      return prev;
    });
  }, []);

  const isLevelUnlocked = useCallback((level: number) => {
    return level <= maxLevelReached;
  }, [maxLevelReached]);

  return {
    maxLevelReached,
    updateMaxLevel,
    isLevelUnlocked,
  };
};
