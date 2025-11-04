import { useState } from "react";
import { Game } from "@/components/Game";
import { MainMenu } from "@/components/MainMenu";
import type { GameSettings } from "@/types/game";

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);

  const handleStartGame = (settings: GameSettings) => {
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
