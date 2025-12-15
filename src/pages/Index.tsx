import { useState, useEffect } from "react";
import { Game } from "@/components/Game";
import { MainMenu } from "@/components/MainMenu";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import type { GameSettings } from "@/types/game";

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);

  // Check for SW updates on main menu or when starting a new game
  useServiceWorkerUpdate({
    isMainMenu: !gameStarted,
    isStartingGame,
    shouldApplyUpdate: !gameStarted,
  });

  // Reset isStartingGame flag after it's been processed
  useEffect(() => {
    if (isStartingGame) {
      setIsStartingGame(false);
    }
  }, [isStartingGame]);

  const handleStartGame = (settings: GameSettings) => {
    setIsStartingGame(true);
    setGameSettings(settings);
    setGameStarted(true);
  };

  const handleReturnToMenu = () => {
    setGameStarted(false);
    setGameSettings(null);
  };

  if (!gameStarted || !gameSettings) {
    return <MainMenu onStartGame={handleStartGame} />;
  }

  return <Game settings={gameSettings} onReturnToMenu={handleReturnToMenu} />;
};

export default Index;
