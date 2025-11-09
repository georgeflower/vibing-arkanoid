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
import { Changelog } from "./Changelog";
import { soundManager } from "@/utils/sounds";
import { useNavigate } from "react-router-dom";
import { GAME_VERSION } from "@/constants/version";

interface MainMenuProps {
  onStartGame: (settings: GameSettings) => void;
}

export const MainMenu = ({ onStartGame }: MainMenuProps) => {
  const navigate = useNavigate();
  const [startingLives, setStartingLives] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [showInstructions, setShowInstructions] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showPressToStart, setShowPressToStart] = useState(true);
  const [showChangelog, setShowChangelog] = useState(false);
  const { highScores } = useHighScores();

  const handleStart = () => {
    const settings: GameSettings = {
      startingLives,
      difficulty,
    };
    onStartGame(settings);
  };

  if (showHighScores) {
    return <HighScoreDisplay scores={highScores} onClose={() => setShowHighScores(false)} />;
  }

  if (showChangelog) {
    return <Changelog onClose={() => setShowChangelog(false)} />;
  }

  if (showAbout) {
    return (
      <div className="fixed inset-0 w-full h-screen bg-gradient-to-b from-[hsl(220,25%,12%)] to-[hsl(220,30%,8%)] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        <Card className="w-full h-full max-w-5xl max-h-screen overflow-y-auto p-4 sm:p-6 md:p-8 bg-[hsl(220,20%,15%)] border-[hsl(200,70%,50%)]">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 text-center text-[hsl(200,70%,50%)]">
            About Vibing Arkanoid
          </h2>

          <div className="space-y-2 sm:space-y-3 md:space-y-4 text-white">
            <p className="text-xs sm:text-sm md:text-base leading-relaxed">
              Welcome to <span className="text-[hsl(200,70%,50%)] font-bold">Vibing Arkanoid</span> - the most
              electrifying brick-breaking experience ever created! This isn't just another Breakout clone - it's a
              pulsating, retro-drenched journey through 50 levels of pure arcade bliss.
            </p>

            <p className="text-xs sm:text-sm md:text-base leading-relaxed">
              Featuring an authentic retro aesthetic with modern gameplay mechanics, power-ups that actually matter,
              enemies that fight back, and a soundtrack that'll make your speakers weep with joy. Collect the legendary{" "}
              <span className="text-[hsl(330,100%,65%)] font-bold">Q-U-M-R-A-N</span> bonus letters for massive rewards!
            </p>

            <div className="bg-black/30 p-3 sm:p-4 md:p-5 rounded-lg border border-[hsl(200,70%,50%)]/30">
              <h3 className="font-bold text-sm sm:text-base md:text-lg mb-2 text-[hsl(200,70%,50%)]">
                Vibe Coded to Perfection
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed">
                This game is the result of pure <span className="text-[hsl(330,100%,65%)] font-bold">vibe coding</span>{" "}
                - that magical state where code flows like music and creativity knows no bounds. Every pixel, every
                sound effect, every level was crafted with passion and energy.
              </p>
            </div>

            <div className="bg-black/30 p-3 sm:p-4 md:p-5 rounded-lg border border-[hsl(330,100%,65%)]/30">
              <h3 className="font-bold text-sm sm:text-base md:text-lg mb-2 text-[hsl(330,100%,65%)]">Created By</h3>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed">
                <span className="text-[hsl(200,70%,50%)] font-bold text-lg sm:text-xl md:text-2xl">Qumran</span>
              </p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Game Design • Programming • Music Viber • Vibe Engineering
              </p>
            </div>

            <p className="text-center text-xs sm:text-sm text-gray-500 italic mt-3 sm:mt-4">
              "In the zone, riding the wave of pure creativity." - The Vibe Coding Manifesto
            </p>
          </div>
          <Button
            onClick={() => {
              soundManager.playMenuClick();
              setShowChangelog(true);
            }}
            onMouseEnter={() => soundManager.playMenuHover()}
            className="w-full mt-3 sm:mt-4 bg-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,60%)] text-white text-sm sm:text-base py-3 sm:py-4"
          >
            v{GAME_VERSION} - Changelog
          </Button>
          <Button
            onClick={() => {
              soundManager.playMenuClick();
              setShowAbout(false);
            }}
            onMouseEnter={() => soundManager.playMenuHover()}
            className="w-full mt-3 sm:mt-4 bg-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,60%)] text-white text-sm sm:text-base py-3 sm:py-4"
          >
            Back to Menu
          </Button>
        </Card>
      </div>
    );
  }

  if (showPressToStart) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center bg-contain bg-center bg-no-repeat bg-[hsl(220,25%,12%)] cursor-pointer"
        style={{ backgroundImage: `url(${startScreenImg})` }}
        onClick={() => {
          soundManager.playMenuClick();
          soundManager.initializeRandomTrack();
          soundManager.playBackgroundMusic();
          setShowPressToStart(false);
        }}
        onKeyDown={() => {
          soundManager.playMenuClick();
          soundManager.initializeRandomTrack();
          soundManager.playBackgroundMusic();
          setShowPressToStart(false);
        }}
        tabIndex={0}
      >
        <div className="text-center animate-pulse">
          <p className="text-white text-2xl font-bold">Press key/mouse to continue</p>
        </div>
      </div>
    );
  }

  if (showInstructions) {
    return (
      <div className="fixed inset-0 w-full h-screen bg-gradient-to-b from-[hsl(220,25%,12%)] to-[hsl(220,30%,8%)] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        <Card className="w-full h-full max-w-5xl max-h-screen overflow-y-auto p-4 sm:p-6 md:p-8 bg-[hsl(220,20%,15%)] border-[hsl(200,70%,50%)]">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 text-center text-[hsl(200,70%,50%)]">
            Instructions
          </h2>

          <div className="space-y-2 sm:space-y-3 md:space-y-4 text-white">
            <div>
              <h3 className="font-bold text-sm sm:text-base md:text-lg mb-2 text-[hsl(200,70%,50%)]">Controls</h3>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                <li>
                  <span className="font-mono bg-black/30 px-1 py-0.5 rounded text-xs">Mouse</span> - Move paddle (click
                  to capture mouse)
                </li>
                <li>
                  <span className="font-mono bg-black/30 px-1 py-0.5 rounded text-xs">←→ / A/D / Scroll</span> - Adjust
                  launch angle
                </li>
                <li>
                  <span className="font-mono bg-black/30 px-1 py-0.5 rounded text-xs">Click / Space</span> - Launch ball
                  / Fire bullets
                </li>
                <li>
                  <span className="font-mono bg-black/30 px-1 py-0.5 rounded text-xs">ESC</span> - Release mouse capture
                </li>
                <li>
                  <span className="font-mono bg-black/30 px-1 py-0.5 rounded text-xs">P</span> - Pause game
                </li>
                <li>
                  <span className="font-mono bg-black/30 px-1 py-0.5 rounded text-xs">N / B</span> - Next/Previous music
                  track
                </li>
                <li>
                  <span className="font-mono bg-black/30 px-1 py-0.5 rounded text-xs">M</span> - Toggle music
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-sm sm:text-base md:text-lg mb-2 text-[hsl(200,70%,50%)]">Gameplay</h3>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                <li>Break all bricks to advance to the next level</li>
                <li>Collect power-ups for special abilities</li>
                <li>Collect bonus letters Q-U-M-R-A-N for massive rewards</li>
                <li>Watch out for enemies and their projectiles</li>
                <li>Ball bounces only from top half of paddle</li>
                <li>If ball doesn't touch paddle for 15s, it auto-diverts</li>
                <li>After 25s without paddle, closest enemy kamikazes the ball</li>
                <li>Get extra life every 50,000 score points</li>
                <li>Powerup drops every 3 enemies destroyed</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-sm sm:text-base md:text-lg mb-2 text-[hsl(200,70%,50%)]">Power-ups</h3>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                <li>
                  <span className="text-[hsl(330,100%,65%)]">Multiball</span> - Split ball into three
                </li>
                <li>
                  <span className="text-[hsl(30,100%,60%)]">Turrets</span> - Add cannons to paddle (50% chance at 90s)
                </li>
                <li>
                  <span className="text-[hsl(30,100%,60%)]">Fireball</span> - Ball destroys everything
                </li>
                <li>
                  <span className="text-[hsl(0,100%,60%)]">Extra Life</span> - Gain one life
                </li>
                <li>
                  <span className="text-[hsl(200,100%,60%)]">Slowdown</span> - Slow ball speed
                </li>
                <li>
                  <span className="text-[hsl(120,60%,45%)]">Extend</span> - Wider paddle
                </li>
                <li>
                  <span className="text-[hsl(0,75%,55%)]">Shrink</span> - Smaller paddle
                </li>
                <li>
                  <span className="text-[hsl(280,80%,60%)]">Shield</span> - Protects paddle from 1 projectile hit
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-sm sm:text-base md:text-lg mb-2 text-[hsl(200,70%,50%)]">
                Difficulty Modes
              </h3>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                <li>
                  <span className="text-[hsl(120,60%,45%)]">Normal</span> - Standard gameplay, speed cap 150%
                </li>
                <li>
                  <span className="text-[hsl(0,85%,55%)]">Godlike</span> - No extra life power-ups, speed cap 175%,
                  faster enemies, more enemy fire
                </li>
              </ul>
            </div>
          </div>

          <Button
            onClick={() => {
              soundManager.playMenuClick();
              setShowInstructions(false);
            }}
            onMouseEnter={() => soundManager.playMenuHover()}
            className="w-full mt-3 sm:mt-4 bg-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,60%)] text-white text-sm sm:text-base py-3 sm:py-4"
          >
            Back to Menu
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 bg-contain bg-center bg-no-repeat bg-[hsl(220,25%,12%)] relative"
      style={{ backgroundImage: `url(${startScreenImg})` }}
    >
      <Card className="max-w-sm w-full p-6 bg-black/60 backdrop-blur-sm border-[hsl(200,70%,50%)]">
        {/* Settings */}
        <div className="space-y-4">
          {/* Starting Lives */}
          <div className="space-y-2">
            <Label className="text-white text-base">Starting Lives: {startingLives}</Label>
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
            <Label className="text-white text-base">Difficulty</Label>
            <RadioGroup
              value={difficulty}
              onValueChange={(value) => {
                setDifficulty(value as Difficulty);
                soundManager.playMenuClick();
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal" className="text-white cursor-pointer">
                  Normal
                </Label>
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
        <div className="space-y-2 mt-6">
          <Button
            onClick={() => {
              soundManager.playMenuClick();
              handleStart();
            }}
            onMouseEnter={() => soundManager.playMenuHover()}
            className="w-full bg-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,60%)] text-white text-lg py-4"
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

          <Button
            onClick={() => {
              soundManager.playMenuClick();
              navigate("/level-editor");
            }}
            onMouseEnter={() => soundManager.playMenuHover()}
            variant="outline"
            className="w-full border-[hsl(330,100%,65%)] text-[hsl(330,100%,65%)] hover:bg-[hsl(330,100%,65%)] hover:text-white"
          >
            Level Editor
          </Button>
        </div>
      </Card>
    </div>
  );
};
