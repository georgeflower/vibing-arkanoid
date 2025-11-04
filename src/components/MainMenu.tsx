import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { GameSettings, Difficulty } from "@/types/game";
import startScreenImg from "@/assets/start-screen-new.png";
import { useHighScores } from "@/hooks/useHighScores";
import { HighScoreDisplay } from "./HighScoreDisplay";
import { soundManager } from "@/utils/sounds";

interface MainMenuProps {
  onStartGame: (settings: GameSettings) => void;
}

export const MainMenu = ({ onStartGame }: MainMenuProps) => {
  const [startingLives, setStartingLives] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [showInstructions, setShowInstructions] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const { highScores } = useHighScores();

  const handleStart = () => {
    const settings: GameSettings = {
      startingLives,
      difficulty,
    };
    onStartGame(settings);
  };

  if (showHighScores) {
    return (
      <HighScoreDisplay 
        scores={highScores} 
        onClose={() => setShowHighScores(false)} 
      />
    );
  }

  if (showAbout) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[hsl(220,25%,12%)] to-[hsl(220,30%,8%)] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 bg-[hsl(220,20%,15%)] border-[hsl(200,70%,50%)]">
          <h2 className="text-3xl font-bold mb-6 text-center text-[hsl(200,70%,50%)]">About Vibing Arkanoid</h2>
          
          <div className="space-y-4 text-white">
            <p className="text-lg leading-relaxed">
              Welcome to <span className="text-[hsl(200,70%,50%)] font-bold">Vibing Arkanoid</span> - the most electrifying brick-breaking experience ever created! This isn't just another Breakout clone - it's a pulsating, neon-drenched journey through 50 levels of pure arcade bliss.
            </p>
            
            <p className="text-lg leading-relaxed">
              Featuring an authentic retro aesthetic with modern gameplay mechanics, power-ups that actually matter, enemies that fight back, and a soundtrack that'll make your speakers weep with joy. Collect the legendary <span className="text-[hsl(330,100%,65%)] font-bold">Q-U-M-R-A-N</span> bonus letters for massive rewards!
            </p>

            <div className="bg-black/30 p-4 rounded-lg border border-[hsl(200,70%,50%)]/30">
              <h3 className="font-bold text-xl mb-2 text-[hsl(200,70%,50%)]">Vibe Coded to Perfection</h3>
              <p className="text-base leading-relaxed">
                This game is the result of pure <span className="text-[hsl(330,100%,65%)] font-bold">vibe coding</span> - that magical state where code flows like music and creativity knows no bounds. Every pixel, every sound effect, every level was crafted with passion and energy.
              </p>
            </div>

            <div className="bg-black/30 p-4 rounded-lg border border-[hsl(330,100%,65%)]/30">
              <h3 className="font-bold text-xl mb-2 text-[hsl(330,100%,65%)]">Created By</h3>
              <p className="text-base leading-relaxed">
                <span className="text-[hsl(200,70%,50%)] font-bold text-2xl">Qumran</span>
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Game Design • Programming • Music Production • Vibe Engineering
              </p>
            </div>

            <p className="text-center text-sm text-gray-500 italic mt-6">
              "In the zone, riding the wave of pure creativity." - The Vibe Coding Manifesto
            </p>
          </div>

          <Button
            onClick={() => {
              soundManager.playMenuClick();
              setShowAbout(false);
            }}
            onMouseEnter={() => soundManager.playMenuHover()}
            className="w-full mt-6 bg-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,60%)] text-white"
          >
            Back to Menu
          </Button>
        </Card>
      </div>
    );
  }

  if (showInstructions) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[hsl(220,25%,12%)] to-[hsl(220,30%,8%)] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 bg-[hsl(220,20%,15%)] border-[hsl(200,70%,50%)]">
          <h2 className="text-3xl font-bold mb-6 text-center text-[hsl(200,70%,50%)]">Instructions</h2>
          
          <div className="space-y-4 text-white">
            <div>
              <h3 className="font-bold text-xl mb-2 text-[hsl(200,70%,50%)]">Controls</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><span className="font-mono bg-black/30 px-2 py-1 rounded">←→</span> or <span className="font-mono bg-black/30 px-2 py-1 rounded">A/D</span> - Move paddle</li>
                <li><span className="font-mono bg-black/30 px-2 py-1 rounded">Space</span> - Launch ball / Fire bullets</li>
                <li><span className="font-mono bg-black/30 px-2 py-1 rounded">P</span> - Pause game</li>
                <li><span className="font-mono bg-black/30 px-2 py-1 rounded">N</span> - Next music track</li>
                <li><span className="font-mono bg-black/30 px-2 py-1 rounded">B</span> - Previous music track</li>
                <li><span className="font-mono bg-black/30 px-2 py-1 rounded">M</span> - Toggle music</li>
                <li><span className="font-mono bg-black/30 px-2 py-1 rounded">S</span> - Toggle sound effects</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-xl mb-2 text-[hsl(200,70%,50%)]">Gameplay</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Break all bricks to advance to the next level</li>
                <li>Collect power-ups for special abilities</li>
                <li>Collect bonus letters Q-U-M-R-A-N for massive rewards</li>
                <li>Watch out for enemies and their projectiles</li>
                <li>Don't let the ball fall off the screen</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-xl mb-2 text-[hsl(200,70%,50%)]">Power-ups</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><span className="text-[hsl(330,100%,65%)]">Multiball</span> - Split ball into three</li>
                <li><span className="text-[hsl(30,100%,60%)]">Turrets</span> - Add cannons to paddle</li>
                <li><span className="text-[hsl(30,100%,60%)]">Fireball</span> - Ball destroys everything</li>
                <li><span className="text-[hsl(0,100%,60%)]">Extra Life</span> - Gain one life</li>
                <li><span className="text-[hsl(200,100%,60%)]">Slowdown</span> - Slow ball speed</li>
                <li><span className="text-[hsl(120,60%,45%)]">Extend</span> - Wider paddle</li>
                <li><span className="text-[hsl(0,75%,55%)]">Shrink</span> - Smaller paddle</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-xl mb-2 text-[hsl(200,70%,50%)]">Difficulty Modes</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><span className="text-[hsl(120,60%,45%)]">Normal</span> - Standard gameplay with power-ups</li>
                <li><span className="text-[hsl(0,85%,55%)]">Godlike</span> - No extra life power-ups, faster enemy spawns, more enemy fire</li>
              </ul>
            </div>
          </div>

          <Button
            onClick={() => {
              soundManager.playMenuClick();
              setShowInstructions(false);
            }}
            onMouseEnter={() => soundManager.playMenuHover()}
            className="w-full mt-6 bg-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,60%)] text-white"
          >
            Back to Menu
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[hsl(220,25%,12%)] to-[hsl(220,30%,8%)] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 bg-[hsl(220,20%,15%)] border-[hsl(200,70%,50%)]">
        {/* Title Image */}
        <div className="mb-8">
          <img 
            src={startScreenImg} 
            alt="Breakout Game" 
            className="w-full h-auto rounded-lg shadow-lg"
          />
        </div>

        {/* Settings */}
        <div className="space-y-6">
          {/* Starting Lives */}
          <div className="space-y-2">
            <Label className="text-white text-lg">Starting Lives: {startingLives}</Label>
            <Slider
              value={[startingLives]}
              onValueChange={(value) => {
                setStartingLives(value[0]);
                soundManager.playSliderChange();
              }}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label className="text-white text-lg">Difficulty</Label>
            <RadioGroup 
              value={difficulty} 
              onValueChange={(value) => {
                setDifficulty(value as Difficulty);
                soundManager.playMenuClick();
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal" className="text-white cursor-pointer">Normal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="godlike" id="godlike" />
                <Label htmlFor="godlike" className="text-[hsl(0,85%,55%)] cursor-pointer font-bold">
                  Godlike (No extra lives, harder enemies)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mt-8">
          <Button
            onClick={() => {
              soundManager.playMenuClick();
              handleStart();
            }}
            onMouseEnter={() => soundManager.playMenuHover()}
            className="w-full bg-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,60%)] text-white text-xl py-6"
          >
            Start Game
          </Button>
          
          <Button
            onClick={() => {
              soundManager.playMenuClick();
              setShowInstructions(true);
            }}
            onMouseEnter={() => soundManager.playMenuHover()}
            variant="outline"
            className="w-full border-[hsl(200,70%,50%)] text-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,50%)] hover:text-white"
          >
            Instructions
          </Button>
          
          <Button
            onClick={() => {
              soundManager.playMenuClick();
              setShowHighScores(true);
            }}
            onMouseEnter={() => soundManager.playMenuHover()}
            variant="outline"
            className="w-full border-[hsl(200,70%,50%)] text-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,50%)] hover:text-white"
          >
            High Scores
          </Button>

          <Button
            onClick={() => {
              soundManager.playMenuClick();
              setShowAbout(true);
            }}
            onMouseEnter={() => soundManager.playMenuHover()}
            variant="outline"
            className="w-full border-[hsl(200,70%,50%)] text-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,50%)] hover:text-white"
          >
            About
          </Button>
        </div>
      </Card>
    </div>
  );
};
