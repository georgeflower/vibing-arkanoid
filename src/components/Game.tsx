import { useEffect, useRef, useState, useCallback } from "react";
import { GameCanvas } from "./GameCanvas";
import { GameUI } from "./GameUI";
import { HighScoreTable } from "./HighScoreTable";
import { HighScoreEntry } from "./HighScoreEntry";
import { HighScoreDisplay } from "./HighScoreDisplay";
import { EndScreen } from "./EndScreen";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Maximize2, Minimize2, Home } from "lucide-react";
import type {
  Brick,
  Ball,
  Paddle,
  GameState,
  Enemy,
  Bomb,
  Explosion,
  BonusLetter,
  BonusLetterType,
  GameSettings,
  EnemyType,
  Particle,
} from "@/types/game";
import { useHighScores } from "@/hooks/useHighScores";

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  BALL_RADIUS,
  BRICK_ROWS,
  BRICK_COLS,
  BRICK_WIDTH,
  BRICK_HEIGHT,
  BRICK_PADDING,
  BRICK_OFFSET_TOP,
  BRICK_OFFSET_LEFT,
  brickColors,
  POWERUP_DROP_CHANCE,
  getHitColor,
  getBrickColors,
} from "@/constants/game";
import { levelLayouts, getBrickHits } from "@/constants/levelLayouts";
import { usePowerUps } from "@/hooks/usePowerUps";
import { useBullets } from "@/hooks/useBullets";
import { soundManager } from "@/utils/sounds";

interface GameProps {
  settings: GameSettings;
  onReturnToMenu: () => void;
}

export const Game = ({ settings, onReturnToMenu }: GameProps) => {
  // Detect Mac and apply 10% scale reduction
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent);
  const scaleFactor = isMac ? 0.9 : 1;

  // Scale all game constants for Mac
  const SCALED_CANVAS_WIDTH = CANVAS_WIDTH * scaleFactor;
  const SCALED_CANVAS_HEIGHT = CANVAS_HEIGHT * scaleFactor;
  const SCALED_PADDLE_WIDTH = PADDLE_WIDTH * scaleFactor;
  const SCALED_PADDLE_HEIGHT = PADDLE_HEIGHT * scaleFactor;
  const SCALED_BALL_RADIUS = BALL_RADIUS * scaleFactor;
  const SCALED_BRICK_WIDTH = BRICK_WIDTH * scaleFactor;
  const SCALED_BRICK_HEIGHT = BRICK_HEIGHT * scaleFactor;
  const SCALED_BRICK_PADDING = BRICK_PADDING * scaleFactor;
  const SCALED_BRICK_OFFSET_TOP = BRICK_OFFSET_TOP * scaleFactor;
  const SCALED_BRICK_OFFSET_LEFT =
    (SCALED_CANVAS_WIDTH - (BRICK_COLS * SCALED_BRICK_WIDTH + (BRICK_COLS - 1) * SCALED_BRICK_PADDING)) / 2;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(settings.startingLives);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>("ready");
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [showHighScoreEntry, setShowHighScoreEntry] = useState(false);
  const [showHighScoreDisplay, setShowHighScoreDisplay] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [beatLevel50Completed, setBeatLevel50Completed] = useState(false);
  const [timer, setTimer] = useState(0);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [backgroundPhase, setBackgroundPhase] = useState(0);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [enemySpawnCount, setEnemySpawnCount] = useState(0);
  const [lastEnemySpawnTime, setLastEnemySpawnTime] = useState(0);
  const [launchAngle, setLaunchAngle] = useState(-20);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bonusLetters, setBonusLetters] = useState<BonusLetter[]>([]);
  const [collectedLetters, setCollectedLetters] = useState<Set<BonusLetterType>>(new Set());
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [framesVisible, setFramesVisible] = useState(true);
  const [titleVisible, setTitleVisible] = useState(true);
  const [gameScale, setGameScale] = useState(1);
  const [disableAutoZoom, setDisableAutoZoom] = useState(false);

  const [brickHitSpeedAccumulated, setBrickHitSpeedAccumulated] = useState(0);
  const [enemiesKilled, setEnemiesKilled] = useState(0);
  const [lastPaddleHitTime, setLastPaddleHitTime] = useState(0);
  const [screenShake, setScreenShake] = useState(0);
  const [backgroundFlash, setBackgroundFlash] = useState(0);
  const [lastScoreMilestone, setLastScoreMilestone] = useState(0);
  const [scoreBlinking, setScoreBlinking] = useState(false);
  const launchAngleDirectionRef = useRef(1);
  const animationFrameRef = useRef<number>();
  const nextBallId = useRef(1);
  const nextEnemyId = useRef(1);
  const timerIntervalRef = useRef<NodeJS.Timeout>();
  const bombIntervalsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const launchAngleIntervalRef = useRef<NodeJS.Timeout>();
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const timerStartedRef = useRef(false);

  const { highScores, isHighScore, addHighScore } = useHighScores();

  const { powerUps, createPowerUp, updatePowerUps, checkPowerUpCollision, setPowerUps } = usePowerUps(
    level,
    setLives,
    timer,
    settings.difficulty,
    setBrickHitSpeedAccumulated,
  );
  const { bullets, setBullets, fireBullets, updateBullets } = useBullets(setScore, setBricks, bricks, enemies, setPaddle);

  // Helper function to create explosion particles based on enemy type
  const createExplosionParticles = useCallback((x: number, y: number, enemyType: EnemyType): Particle[] => {
    const particles: Particle[] = [];
    const particleCount = 20; // More particles for better effect

    // Determine colors based on enemy type
    let colors: string[] = [];
    if (enemyType === "cube") {
      colors = [
        "hsl(200, 100%, 60%)", // Cyan
        "hsl(180, 100%, 50%)", // Light cyan
        "hsl(220, 100%, 70%)", // Light blue
      ];
    } else if (enemyType === "sphere") {
      colors = [
        "hsl(330, 100%, 60%)", // Pink
        "hsl(350, 100%, 65%)", // Light pink
        "hsl(310, 100%, 55%)", // Magenta
      ];
    } else if (enemyType === "pyramid") {
      colors = [
        "hsl(280, 100%, 60%)", // Purple
        "hsl(260, 100%, 65%)", // Light purple
        "hsl(300, 100%, 55%)", // Violet
      ];
    }

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      const size = 3 + Math.random() * 4;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 30,
        maxLife: 30,
      });
    }

    return particles;
  }, []);

  // Initialize sound settings - always enabled
  useEffect(() => {
    soundManager.setMusicEnabled(true);
    soundManager.setSfxEnabled(true);
  }, []);

  // Bonus letter drop logic - each letter drops on specific levels
  const letterLevels: Record<BonusLetterType, number[]> = {
    Q: [4, 11],
    U: [6, 12],
    M: [7, 13],
    R: [8, 14],
    A: [9, 15],
    N: [10, 16],
  };

  const dropBonusLetter = useCallback(
    (x: number, y: number) => {
      // Check each letter to see if it should drop on this level
      for (const letter of Object.keys(letterLevels) as BonusLetterType[]) {
        const levels = letterLevels[letter];

        // Drop if: current level matches AND letter hasn't been collected yet
        if (levels.includes(level) && !collectedLetters.has(letter)) {
          // Check if this letter is already falling
          const alreadyFalling = bonusLetters.some((bl) => bl.type === letter && bl.active);
          if (alreadyFalling) continue;

          setBonusLetters((prev) => [
            ...prev,
            {
              x: x - 15,
              y: y,
              width: 30,
              height: 30,
              type: letter,
              speed: 2,
              active: true,
            },
          ]);
          toast(`Bonus letter ${letter} dropped!`, { icon: "🎯" });
          break; // Only drop one letter at a time
        }
      }
    },
    [level, collectedLetters, bonusLetters],
  );

  const checkBonusLetterCollision = useCallback(() => {
    if (!paddle) return;

    setBonusLetters((prev) => {
      const updated = prev.filter((letter) => {
        if (!letter.active) return false;

        // Check collision with paddle
        if (
          letter.x + letter.width > paddle.x &&
          letter.x < paddle.x + paddle.width &&
          letter.y + letter.height > paddle.y &&
          letter.y < paddle.y + paddle.height
        ) {
          // Letter collected
          setCollectedLetters((prevCollected) => {
            const newCollected = new Set(prevCollected);
            newCollected.add(letter.type);

            // Check if all letters collected
            if (newCollected.size === 6) {
              setScore((s) => s + 500000);
              setLives((l) => l + 5);
              soundManager.playBonusComplete();
              toast.success("QUMRAN Complete! +5 Lives & +500,000 Points!", { duration: 5000 });
              // Long flash and screen shake for all letters
              setBackgroundFlash(1);
              setScreenShake(10);
              setTimeout(() => setBackgroundFlash(0), 800);
              setTimeout(() => setScreenShake(0), 800);
            } else {
              soundManager.playBonusLetterPickup();
              toast.success(`Letter ${letter.type} collected!`);
              // Quick flash for single letter
              setBackgroundFlash(0.5);
              setTimeout(() => setBackgroundFlash(0), 200);
            }

            return newCollected;
          });
          return false;
        }

        // Check if letter went off screen (missed)
        if (letter.y > SCALED_CANVAS_HEIGHT) {
          return false;
        }

        return true;
      });

      return updated;
    });
  }, [paddle]);

  const initBricksForLevel = useCallback((currentLevel: number) => {
    const layoutIndex = Math.min(currentLevel - 1, levelLayouts.length - 1);
    const layout = levelLayouts[layoutIndex];
    const levelColors = getBrickColors(currentLevel);

    const newBricks: Brick[] = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const cellValue = layout[row][col];
        if (cellValue === true || cellValue === 2) {
          const isIndestructible = cellValue === 2;
          const hasPowerUp = isIndestructible ? false : Math.random() < POWERUP_DROP_CHANCE;
          const maxHits = isIndestructible ? 1 : getBrickHits(currentLevel, row);
          const baseColor = isIndestructible ? "#333333" : levelColors[row % levelColors.length];

          // Indestructible bricks are bigger (no padding), so they take up the space including padding
          const brickWidth = isIndestructible ? SCALED_BRICK_WIDTH + SCALED_BRICK_PADDING * 2 : SCALED_BRICK_WIDTH;
          const brickHeight = isIndestructible ? SCALED_BRICK_HEIGHT + SCALED_BRICK_PADDING * 2 : SCALED_BRICK_HEIGHT;
          const xPos =
            col * (SCALED_BRICK_WIDTH + SCALED_BRICK_PADDING) +
            SCALED_BRICK_OFFSET_LEFT -
            (isIndestructible ? SCALED_BRICK_PADDING : 0);
          const yPos =
            row * (SCALED_BRICK_HEIGHT + SCALED_BRICK_PADDING) +
            SCALED_BRICK_OFFSET_TOP -
            (isIndestructible ? SCALED_BRICK_PADDING : 0);

          newBricks.push({
            x: xPos,
            y: yPos,
            width: brickWidth,
            height: brickHeight,
            color: baseColor,
            visible: true,
            points: isIndestructible ? 0 : (BRICK_ROWS - row) * 10 * maxHits,
            hasPowerUp,
            maxHits,
            hitsRemaining: maxHits,
            isIndestructible,
          });
        }
      }
    }
    return newBricks;
  }, []);

  const initGame = useCallback(() => {
    // Initialize paddle
    setPaddle({
      x: SCALED_CANVAS_WIDTH / 2 - SCALED_PADDLE_WIDTH / 2,
      y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
      width: SCALED_PADDLE_WIDTH,
      height: SCALED_PADDLE_HEIGHT,
      hasTurrets: false,
    });

    // Initialize ball with speed multiplier - waiting to launch
    const baseSpeed = 3.45; // 15% faster than original base speed of 3
    const initialBall: Ball = {
      x: SCALED_CANVAS_WIDTH / 2,
      y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
      dx: baseSpeed,
      dy: -baseSpeed,
      radius: SCALED_BALL_RADIUS,
      speed: baseSpeed,
      id: nextBallId.current++,
      isFireball: false,
      waitingToLaunch: true,
      rotation: 0,
    };
    setBalls([initialBall]);
    setLaunchAngle(-20); // Start from left side
    launchAngleDirectionRef.current = 1; // Move right initially
    setShowInstructions(true); // Show instructions for new game

    // Initialize bricks for level 1
    setBricks(initBricksForLevel(1));
    setScore(0);
    setLives(3);
    setLevel(1);
    setSpeedMultiplier(1);
    setGameState("ready");
    setPowerUps([]);
    setTimer(0);
    timerStartedRef.current = false;
    setEnemies([]);
    setBombs([]);
    setBackgroundPhase(0);
    setExplosions([]);
    setEnemySpawnCount(0);
    setLastEnemySpawnTime(0);
    setBonusLetters([]);
    setCollectedLetters(new Set());
    setEnemiesKilled(0);
    bombIntervalsRef.current.forEach((interval) => clearInterval(interval));
    bombIntervalsRef.current.clear();
  }, [setPowerUps, initBricksForLevel]);

  const nextLevel = useCallback(() => {
    // Cancel any running animation frame before starting new level
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Clear timer interval before resetting
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerStartedRef.current = false;
    bombIntervalsRef.current.forEach((interval) => clearInterval(interval));
    bombIntervalsRef.current.clear();

    const newLevel = level + 1;
    const maxSpeedMultiplier = settings.difficulty === "godlike" ? 1.75 : 1.5; // 175% godlike, 150% normal
    // Godlike starts at 125%, normal at 100%, both increase 5% per level
    const baseMultiplier = settings.difficulty === "godlike" ? 1.25 : 1.0;
    const newSpeedMultiplier = Math.min(maxSpeedMultiplier, baseMultiplier + (newLevel - 1) * 0.05);

    setLevel(newLevel);
    setSpeedMultiplier(newSpeedMultiplier);

    // Reset paddle
    setPaddle({
      x: SCALED_CANVAS_WIDTH / 2 - SCALED_PADDLE_WIDTH / 2,
      y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
      width: SCALED_PADDLE_WIDTH,
      height: SCALED_PADDLE_HEIGHT,
      hasTurrets: false,
    });

    // Initialize ball with new speed - waiting to launch (capped at 175%)
    const baseSpeed = 3.45 * Math.min(newSpeedMultiplier, 1.75); // 15% faster base speed
    const initialBall: Ball = {
      x: SCALED_CANVAS_WIDTH / 2,
      y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
      dx: baseSpeed,
      dy: -baseSpeed,
      radius: SCALED_BALL_RADIUS,
      speed: baseSpeed,
      id: nextBallId.current++,
      isFireball: false,
      waitingToLaunch: true,
    };
    setBalls([initialBall]);
    setLaunchAngle(-20); // Start from left side
    launchAngleDirectionRef.current = 1; // Move right initially
    setShowInstructions(true); // Show instructions for new level

    // Initialize bricks for new level
    setBricks(initBricksForLevel(newLevel));
    setPowerUps([]);
    setBullets([]);
    setTimer(0);
    setEnemies([]);
    setBombs([]);
    setExplosions([]);
    setEnemySpawnCount(0);
    setLastEnemySpawnTime(0);
    setBonusLetters([]);
    // Don't reset collected letters between levels
    // Reset accumulated slowdown speed on level clear
    setBrickHitSpeedAccumulated(0);
    setEnemiesKilled(0); // Reset enemy kills on level clear
    setTimer(0); // Reset timer on level clear (for turret drop chance reset)
    bombIntervalsRef.current.forEach((interval) => clearInterval(interval));
    bombIntervalsRef.current.clear();
    setGameState("playing");

    if (newLevel === 10) {
      toast.success(`Level ${newLevel}! New music unlocked!`);
    } else {
      toast.success(`Level ${newLevel}! Speed: ${Math.round(newSpeedMultiplier * 100)}%`);
    }
  }, [level, initBricksForLevel, setPowerUps]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!canvasRef.current || !paddle) return;

      // Use movementX when pointer is locked, otherwise use absolute position
      if (isPointerLocked) {
        const sensitivity = 1.5;
        const newX = Math.max(0, Math.min(SCALED_CANVAS_WIDTH - paddle.width, paddle.x + e.movementX * sensitivity));
        setPaddle((prev) => (prev ? { ...prev, x: newX } : null));
      } else if (gameState === "playing") {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = SCALED_CANVAS_WIDTH / rect.width;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const newX = Math.max(0, Math.min(SCALED_CANVAS_WIDTH - paddle.width, mouseX - paddle.width / 2));
        setPaddle((prev) => (prev ? { ...prev, x: newX } : null));
      }
    },
    [gameState, paddle, isPointerLocked, SCALED_CANVAS_WIDTH],
  );

  const activeTouchRef = useRef<number | null>(null);
  const secondTouchRef = useRef<number | null>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!canvasRef.current || !paddle) return;

      e.preventDefault();

      // Single-tap to start game when in "ready" state (mobile start)
      if (gameState === "ready" && e.touches.length === 1 && bricks.length > 0) {
        console.log('[Ready Tap Debug] readyTapStart: enabled - Single tap detected, starting game');
        
        const isLevelComplete = bricks.every((brick) => !brick.visible) && bricks.length > 0;

        if (isLevelComplete) {
          nextLevel();
        } else {
          // Start game - start music only if not already playing
          setGameState("playing");
          if (!soundManager.isMusicPlaying()) {
            soundManager.playBackgroundMusic();
          }
        }
        return;
      }

      const waitingBall = balls.find((ball) => ball.waitingToLaunch);

      // If ball is waiting and there are 2 fingers, second finger controls launch angle
      if (e.touches.length > 1 && waitingBall && gameState === "playing") {
        // First touch controls paddle, second touch sets launch angle
        if (activeTouchRef.current !== null && secondTouchRef.current === null) {
          // Find the second touch (not the first one)
          for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier !== activeTouchRef.current) {
              secondTouchRef.current = e.touches[i].identifier;
              
              // Calculate launch angle from second finger position relative to paddle
              const rect = canvasRef.current.getBoundingClientRect();
              const scaleX = SCALED_CANVAS_WIDTH / rect.width;
              const touchX = (e.touches[i].clientX - rect.left) * scaleX;
              
              // Calculate angle: -60 to +60 degrees based on second finger position relative to paddle center
              const paddleCenter = paddle.x + paddle.width / 2;
              const relativeX = touchX - paddleCenter;
              const maxDistance = SCALED_CANVAS_WIDTH / 3; // Max distance for full angle range
              const normalizedX = Math.max(-1, Math.min(1, relativeX / maxDistance));
              const angle = normalizedX * 60; // -60 to +60 degrees
              
              setLaunchAngle(angle);
              console.log('[Launch Debug] audioAndLaunchMode: applied - Second finger angle:', angle);
              break;
            }
          }
        }
        
        // Fire turrets if paddle has turrets
        if (paddle.hasTurrets) {
          fireBullets(paddle);
        }
        
        return; // Don't launch ball yet
      }

      // Fire turrets if there are multiple touches (2+ fingers) and paddle has turrets and ball is NOT waiting
      if (e.touches.length > 1 && paddle.hasTurrets && gameState === "playing" && !waitingBall) {
        fireBullets(paddle);
        return;
      }

      // Track the first touch for paddle control
      if (e.touches.length > 0 && activeTouchRef.current === null) {
        activeTouchRef.current = e.touches[0].identifier;

        // Update paddle position immediately on touch start
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = SCALED_CANVAS_WIDTH / rect.width;
        const touchX = (e.touches[0].clientX - rect.left) * scaleX;
        const newX = Math.max(0, Math.min(SCALED_CANVAS_WIDTH - paddle.width, touchX - paddle.width / 2));
        setPaddle((prev) => (prev ? { ...prev, x: newX } : null));

        // Single tap on ball when waiting launches it (explicit launch)
        if (waitingBall && gameState === "playing" && e.touches.length === 1) {
          setShowInstructions(false);

          // Start timer on first ball launch
          if (!timerStartedRef.current) {
            timerStartedRef.current = true;
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
            }
            timerIntervalRef.current = setInterval(() => {
              setTimer((prev) => prev + 1);
            }, 1000);
          }

          console.log('[Launch Debug] audioAndLaunchMode: applied - Ball launched at angle:', launchAngle);
          
          setBalls((prev) =>
            prev.map((ball) => {
              if (ball.waitingToLaunch) {
                const speed = ball.speed;
                const angle = (launchAngle * Math.PI) / 180;
                return {
                  ...ball,
                  dx: speed * Math.sin(angle),
                  dy: -speed * Math.cos(angle),
                  waitingToLaunch: false,
                };
              }
              return ball;
            }),
          );
        }
      }
    },
    [paddle, balls, gameState, launchAngle, fireBullets, SCALED_CANVAS_WIDTH, bricks, nextLevel],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!canvasRef.current || !paddle) return;

      e.preventDefault();

      const waitingBall = balls.find((ball) => ball.waitingToLaunch);

      // Update launch angle if second finger is moving and ball is waiting
      if (waitingBall && secondTouchRef.current !== null) {
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === secondTouchRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const scaleX = SCALED_CANVAS_WIDTH / rect.width;
            const touchX = (e.touches[i].clientX - rect.left) * scaleX;
            
            // Calculate angle from second finger position relative to paddle center
            const paddleCenter = paddle.x + paddle.width / 2;
            const relativeX = touchX - paddleCenter;
            const maxDistance = SCALED_CANVAS_WIDTH / 3;
            const normalizedX = Math.max(-1, Math.min(1, relativeX / maxDistance));
            const angle = normalizedX * 60;
            
            setLaunchAngle(angle);
            break;
          }
        }
      }

      // Track the first touch for paddle control
      let activeTouch = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchRef.current) {
          activeTouch = e.touches[i];
          break;
        }
      }

      // If no active touch found, use the first touch
      if (!activeTouch && e.touches.length > 0) {
        activeTouch = e.touches[0];
        activeTouchRef.current = activeTouch.identifier;
      }

      if (!activeTouch) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = SCALED_CANVAS_WIDTH / rect.width;
      const touchX = (activeTouch.clientX - rect.left) * scaleX;
      const newX = Math.max(0, Math.min(SCALED_CANVAS_WIDTH - paddle.width, touchX - paddle.width / 2));

      setPaddle((prev) => (prev ? { ...prev, x: newX } : null));
    },
    [paddle, balls, SCALED_CANVAS_WIDTH],
  );

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Clear active touches when they end
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchRef.current) {
        activeTouchRef.current = null;
      }
      if (e.changedTouches[i].identifier === secondTouchRef.current) {
        secondTouchRef.current = null;
        console.log('[Launch Debug] audioAndLaunchMode: default - Second finger released');
      }
    }
  }, []);

  const handleClick = useCallback(() => {
    // Request pointer lock on canvas click
    if (canvasRef.current && document.pointerLockElement !== canvasRef.current) {
      canvasRef.current.requestPointerLock();
    }

    // If game is ready, start the game first
    if (gameState === "ready" && bricks.length > 0) {
      const isLevelComplete = bricks.every((brick) => !brick.visible) && bricks.length > 0;

      if (isLevelComplete) {
        nextLevel();
      } else {
        // Start game - start music only if not already playing
        setGameState("playing");
        if (!soundManager.isMusicPlaying()) {
          soundManager.initializeRandomTrack();
          soundManager.playBackgroundMusic(level);
        }
        toast.success("Click again to launch!");
      }
      return;
    }

    if (!paddle || gameState !== "playing") return;

    // Check if ball is waiting to launch
    const waitingBall = balls.find((ball) => ball.waitingToLaunch);
    if (waitingBall) {
      // Launch ball in the direction of the current angle
      setShowInstructions(false);

      // Start timer on first ball launch
      if (!timerStartedRef.current) {
        timerStartedRef.current = true;
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
        timerIntervalRef.current = setInterval(() => {
          setTimer((prev) => prev + 1);
        }, 1000);
      }

      setBalls((prev) =>
        prev.map((ball) => {
          if (ball.waitingToLaunch) {
            const speed = ball.speed;
            const angle = (launchAngle * Math.PI) / 180;
            return {
              ...ball,
              dx: speed * Math.sin(angle),
              dy: -speed * Math.cos(angle),
              waitingToLaunch: false,
            };
          }
          return ball;
        }),
      );
      return;
    }

    // Fire turrets
    if (paddle.hasTurrets) {
      fireBullets(paddle);
    }
  }, [paddle, gameState, fireBullets, bricks, nextLevel, balls, launchAngle, level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Exit pointer lock
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      } else if (e.key === "n" || e.key === "N") {
        soundManager.nextTrack();
        toast.success("Next track");
      } else if (e.key === "b" || e.key === "B") {
        soundManager.previousTrack();
        toast.success("Previous track");
      } else if (e.key === "p" || e.key === "P") {
        // Toggle pause
        if (gameState === "playing") {
          setGameState("paused");
          toast.success("Game paused");
        } else if (gameState === "paused") {
          setGameState("playing");
          toast.success("Game resumed");
        }
      } else if (e.key === "m" || e.key === "M") {
        const enabled = soundManager.toggleMute();
        toast.success(enabled ? "Music on" : "Music muted");
      } else if (e.key === "0") {
        // Clear level and advance
        nextLevel();
        toast.success("Level skipped!");
      }
    };

    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === canvas);
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyPress);
    document.addEventListener("pointerlockchange", handlePointerLockChange);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyPress);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
    };
  }, [handleMouseMove, handleTouchMove, handleClick, nextLevel, gameState]);

  const checkCollision = useCallback(() => {
    if (!paddle || balls.length === 0) return;

    setBalls((prevBalls) => {
      let updatedBalls = prevBalls
        .map((ball) => {
          let newBall = { ...ball };

          // Wall collision
          if (
            newBall.x + newBall.dx > SCALED_CANVAS_WIDTH - newBall.radius ||
            newBall.x + newBall.dx < newBall.radius
          ) {
            newBall.dx = -newBall.dx;
          }
          if (newBall.y + newBall.dy < newBall.radius) {
            newBall.dy = -newBall.dy;
          }

          // Paddle collision - only bounce from top 50% of paddle
          if (
            newBall.y + newBall.dy > paddle.y - newBall.radius &&
            newBall.x > paddle.x &&
            newBall.x < paddle.x + paddle.width &&
            newBall.dy > 0
          ) {
            // Calculate where on paddle the ball hit (0 = top, 1 = bottom)
            const verticalHitPosition = (newBall.y - paddle.y) / paddle.height;

            // Only bounce if hitting top 50% of paddle
            if (verticalHitPosition <= 0.5) {
              soundManager.playBounce();

              // Update last paddle hit time
              setLastPaddleHitTime(Date.now());

              const hitPos = (newBall.x - paddle.x) / paddle.width;
              const angle = (hitPos - 0.5) * Math.PI * 0.6;
              const speed = Math.sqrt(newBall.dx * newBall.dx + newBall.dy * newBall.dy);
              newBall.dx = speed * Math.sin(angle);
              newBall.dy = -speed * Math.cos(angle);
            }
          }

          // Bottom collision (lose life)
          if (newBall.y + newBall.dy > SCALED_CANVAS_HEIGHT - newBall.radius) {
            // Remove this ball
            return null;
          }

          // Brick collision (expand collision area to cover padding gaps)
          setBricks((prevBricks) => {
            let brickHit = false;

            // Check cooldown - prevent hitting multiple bricks too quickly
            const now = Date.now();
            if (newBall.lastHitTime && now - newBall.lastHitTime < 10) {
              return prevBricks;
            }

            // First check for padding collisions between indestructible bricks
            const indestructibleBricks = prevBricks.filter((b) => b.isIndestructible && b.visible);
            for (const brick of indestructibleBricks) {
              // Check for adjacent indestructible bricks and create invisible walls in padding
              const rightNeighbor = indestructibleBricks.find(
                (b) => b.x === brick.x + brick.width + SCALED_BRICK_PADDING && Math.abs(b.y - brick.y) < 1,
              );
              const bottomNeighbor = indestructibleBricks.find(
                (b) => b.y === brick.y + brick.height + SCALED_BRICK_PADDING && Math.abs(b.x - brick.x) < 1,
              );

              // Check horizontal padding (between brick and right neighbor)
              if (rightNeighbor) {
                const paddingLeft = brick.x + brick.width;
                const paddingRight = rightNeighbor.x;
                const paddingTop = brick.y;
                const paddingBottom = brick.y + brick.height;

                if (
                  newBall.x + newBall.radius > paddingLeft &&
                  newBall.x - newBall.radius < paddingRight &&
                  newBall.y + newBall.radius > paddingTop &&
                  newBall.y - newBall.radius < paddingBottom
                ) {
                  // Ball is in horizontal padding - bounce horizontally
                  newBall.dx = -newBall.dx;
                  if (newBall.x < paddingLeft + SCALED_BRICK_PADDING / 2) {
                    newBall.x = paddingLeft - newBall.radius - 1;
                  } else {
                    newBall.x = paddingRight + newBall.radius + 1;
                  }
                  newBall.lastHitTime = now;
                  soundManager.playBounce();
                  return prevBricks;
                }
              }

              // Check vertical padding (between brick and bottom neighbor)
              if (bottomNeighbor) {
                const paddingTop = brick.y + brick.height;
                const paddingBottom = bottomNeighbor.y;
                const paddingLeft = brick.x;
                const paddingRight = brick.x + brick.width;

                if (
                  newBall.x + newBall.radius > paddingLeft &&
                  newBall.x - newBall.radius < paddingRight &&
                  newBall.y + newBall.radius > paddingTop &&
                  newBall.y - newBall.radius < paddingBottom
                ) {
                  // Ball is in vertical padding - bounce vertically
                  newBall.dy = -newBall.dy;
                  if (newBall.y < paddingTop + SCALED_BRICK_PADDING / 2) {
                    newBall.y = paddingTop - newBall.radius - 1;
                  } else {
                    newBall.y = paddingBottom + newBall.radius + 1;
                  }
                  newBall.lastHitTime = now;
                  soundManager.playBounce();
                  return prevBricks;
                }
              }
            }

            const newBricks = prevBricks.map((brick) => {
              if (
                !brickHit &&
                brick.visible &&
                newBall.x + newBall.radius > brick.x &&
                newBall.x - newBall.radius < brick.x + brick.width &&
                newBall.y + newBall.radius > brick.y &&
                newBall.y - newBall.radius < brick.y + brick.height
              ) {
                brickHit = true;

                // Set hit cooldown
                newBall.lastHitTime = now;

                // Calculate which side was hit by checking penetration depth
                const leftPenetration = newBall.x + newBall.radius - brick.x;
                const rightPenetration = brick.x + brick.width - (newBall.x - newBall.radius);
                const topPenetration = newBall.y + newBall.radius - brick.y;
                const bottomPenetration = brick.y + brick.height - (newBall.y - newBall.radius);

                const minHorizontal = Math.min(leftPenetration, rightPenetration);
                const minVertical = Math.min(topPenetration, bottomPenetration);

                // Determine collision side and move ball out
                const hitFromSide = minHorizontal < minVertical;

                // Indestructible bricks - just bounce off
                if (brick.isIndestructible) {
                  if (hitFromSide) {
                    newBall.dx = -newBall.dx;
                    // Move ball out horizontally
                    if (leftPenetration < rightPenetration) {
                      newBall.x = brick.x - newBall.radius - 1;
                    } else {
                      newBall.x = brick.x + brick.width + newBall.radius + 1;
                    }
                  } else {
                    newBall.dy = -newBall.dy;
                    // Move ball out vertically
                    if (topPenetration < bottomPenetration) {
                      newBall.y = brick.y - newBall.radius - 1;
                    } else {
                      newBall.y = brick.y + brick.height + newBall.radius + 1;
                    }
                  }
                  // Add slight random angle variation (±1 degree) to horizontal direction
                  const angleVariation = (Math.random() * 2 - 1) * (Math.PI / 180);
                  const speed = Math.sqrt(newBall.dx * newBall.dx + newBall.dy * newBall.dy);
                  newBall.dx += speed * Math.sin(angleVariation) * 0.1;
                  soundManager.playBounce();
                  return brick;
                }

                // Only bounce if not fireball
                if (!newBall.isFireball) {
                  if (hitFromSide) {
                    newBall.dx = -newBall.dx;
                    // Move ball out horizontally
                    if (leftPenetration < rightPenetration) {
                      newBall.x = brick.x - newBall.radius - 1;
                    } else {
                      newBall.x = brick.x + brick.width + newBall.radius + 1;
                    }
                  } else {
                    newBall.dy = -newBall.dy;
                    // Move ball out vertically
                    if (topPenetration < bottomPenetration) {
                      newBall.y = brick.y - newBall.radius - 1;
                    } else {
                      newBall.y = brick.y + brick.height + newBall.radius + 1;
                    }
                  }
                  // Add slight random angle variation (±1 degree) to horizontal direction
                  const angleVariation = (Math.random() * 2 - 1) * (Math.PI / 180);
                  const speed = Math.sqrt(newBall.dx * newBall.dx + newBall.dy * newBall.dy);
                  newBall.dx += speed * Math.sin(angleVariation) * 0.1;
                }

                soundManager.playBrickHit();

                const updatedBrick = { ...brick, hitsRemaining: brick.hitsRemaining - 1 };

                // Update brick color based on hits remaining
                if (updatedBrick.hitsRemaining > 0) {
                  updatedBrick.color = getHitColor(brick.color, updatedBrick.hitsRemaining, brick.maxHits);
                } else {
                  updatedBrick.visible = false;

                  // Award points and create power-up only when brick is destroyed
                  setScore((prev) => prev + brick.points);

                  if (brick.hasPowerUp) {
                    const powerUp = createPowerUp(brick);
                    if (powerUp) {
                      setPowerUps((prev) => [...prev, powerUp]);
                    }
                  }
                }

                // Increase ball speed slightly with each brick hit (but not for indestructible bricks)
                if (!brick.isIndestructible && updatedBrick.hitsRemaining === 0) {
                  // Only add speed when brick is fully destroyed
                  // Cap accumulated speed at 30%
                  if (brickHitSpeedAccumulated < 0.3) {
                    const speedIncrease = 0.005;
                    setBrickHitSpeedAccumulated((prev) => Math.min(0.3, prev + speedIncrease));
                    newBall.dx *= 1 + speedIncrease;
                    newBall.dy *= 1 + speedIncrease;
                  }
                }

                return updatedBrick;
              }
              return brick;
            });

            // Check win condition (don't count indestructible bricks)
            if (newBricks.every((brick) => !brick.visible || brick.isIndestructible)) {
              // Check if there are any destructible bricks left
              const hasDestructibleBricks = newBricks.some((brick) => !brick.isIndestructible);

              if (hasDestructibleBricks) {
                soundManager.playWin();

                // Check if player beat level 50
                if (level >= 50) {
                  setScore((prev) => prev + 1000000);
                  setBeatLevel50Completed(true);
                  setGameState("won");
                  setShowEndScreen(true);
                  soundManager.stopBackgroundMusic();
                  toast.success(`🎉 YOU WIN! Level ${level} Complete! Bonus: +1,000,000 points!`);
                } else {
                  setGameState("ready"); // Wait for click to start next level
                  toast.success(`Level ${level} Complete! Click to continue.`);
                }

                // Clear all indestructible bricks when all normal bricks are cleared
                return newBricks.map((brick) => ({
                  ...brick,
                  visible: false,
                }));
              } else {
                // No destructible bricks, just advance to next level
                soundManager.playWin();
                if (level >= 50) {
                  setScore((prev) => prev + 1000000);
                  setBeatLevel50Completed(true);
                  setGameState("won");
                  setShowEndScreen(true);
                  soundManager.stopBackgroundMusic();
                  toast.success(`🎉 YOU WIN! Level ${level} Complete! Bonus: +1,000,000 points!`);
                } else {
                  nextLevel(); // Automatically advance since no bricks to destroy
                }
              }
            }

            return newBricks;
          });

          return newBall;
        })
        .filter(Boolean) as Ball[];

      // Check if all balls are lost
      if (updatedBalls.length === 0) {
        setLives((prev) => {
          const newLives = prev - 1;
          soundManager.playLoseLife();

          if (newLives <= 0) {
            setGameState("gameOver");
            soundManager.stopBackgroundMusic();

            // Check if it's a high score
            if (isHighScore(score)) {
              setShowHighScoreEntry(true);
              soundManager.playHighScoreMusic();
              toast.success("New High Score!");
            } else {
              toast.error("Game Over!");
            }
          } else {
            // Reset ball and clear power-ups, but wait for click to continue
            const baseSpeed = 3.45; // 15% faster base speed
            const resetBall: Ball = {
              x: SCALED_CANVAS_WIDTH / 2,
              y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
              dx: baseSpeed,
              dy: -baseSpeed,
              radius: SCALED_BALL_RADIUS,
              speed: baseSpeed,
              id: nextBallId.current++,
              isFireball: false,
              waitingToLaunch: true,
            };
            setBalls([resetBall]);
            setLaunchAngle(-20); // Start from left side
            launchAngleDirectionRef.current = 1; // Move right initially
            setShowInstructions(true); // Show instructions when resetting ball
            setPowerUps([]);
            setPaddle((prev) => (prev ? { ...prev, hasTurrets: false, width: SCALED_PADDLE_WIDTH } : null));
            setBullets([]); // Clear all bullets
            // Only reset speed if it's slower than base speed
            if (speedMultiplier < 1) {
              setSpeedMultiplier(1);
            }
            // Reset accumulated brick hit speed on death
            setBrickHitSpeedAccumulated(0);
            setTimer(0);
            setEnemies([]);
            setBombs([]);
            setExplosions([]);
            bombIntervalsRef.current.forEach((interval) => clearInterval(interval));
            bombIntervalsRef.current.clear();
            setGameState("ready");
            toast(`Life lost! ${newLives} lives remaining. Click to continue.`);
          }
          return newLives;
        });
      }

      return updatedBalls;
    });
  }, [paddle, balls, createPowerUp, setPowerUps, nextLevel, speedMultiplier]);

  const gameLoop = useCallback(() => {
    if (gameState !== "playing") return;

    // Update background animation
    setBackgroundPhase((prev) => (prev + 1) % 360);

    // Update balls (only if not waiting to launch)
    setBalls((prev) =>
      prev.map((ball) => {
        if (ball.waitingToLaunch && paddle) {
          // Keep ball attached to paddle
          return {
            ...ball,
            x: paddle.x + paddle.width / 2,
            y: paddle.y - ball.radius - 5,
          };
        }
        return {
          ...ball,
          x: ball.x + ball.dx * speedMultiplier,
          y: ball.y + ball.dy * speedMultiplier,
          rotation: ((ball.rotation || 0) + 3) % 360, // Spinning rotation
        };
      }),
    );

    // Update power-ups
    updatePowerUps();

    // Update bonus letters
    setBonusLetters((prev) =>
      prev.map((letter) => ({
        ...letter,
        y: letter.y + letter.speed,
      })),
    );

    // Check bonus letter collisions
    checkBonusLetterCollision();

    // Update bullets
    updateBullets(bricks);

    // Update enemies
    setEnemies((prev) =>
      prev.map((enemy) => {
        let newX = enemy.x + enemy.dx;
        let newY = enemy.y + enemy.dy;
        let newDx = enemy.dx;
        let newDy = enemy.dy;

        // Sphere and Pyramid enemies have more random movement
        if (enemy.type === "sphere" || enemy.type === "pyramid") {
          // Add some randomness to movement
          if (Math.random() < (enemy.type === "pyramid" ? 0.08 : 0.05)) {
            const randomAngle = ((Math.random() - 0.5) * Math.PI) / 4;
            const currentAngle = Math.atan2(newDy, newDx);
            const newAngle = currentAngle + randomAngle;
            newDx = Math.cos(newAngle) * enemy.speed;
            newDy = Math.sin(newAngle) * enemy.speed;
          }
        }

        // Bounce off walls
        if (newX <= 0 || newX >= SCALED_CANVAS_WIDTH - enemy.width) {
          newDx = -enemy.dx;
          newX = Math.max(0, Math.min(SCALED_CANVAS_WIDTH - enemy.width, newX));
        }

        // Bounce off top and 60% boundary
        const maxY = SCALED_CANVAS_HEIGHT * 0.6;
        if (newY <= 0 || newY >= maxY - enemy.height) {
          newDy = -enemy.dy;
          newY = Math.max(0, Math.min(maxY - enemy.height, newY));
        }

        return {
          ...enemy,
          x: newX,
          y: newY,
          dx: newDx,
          dy: newDy,
          rotationX: enemy.rotationX + (enemy.type === "pyramid" ? 0.06 : enemy.type === "sphere" ? 0.08 : 0.05),
          rotationY: enemy.rotationY + (enemy.type === "pyramid" ? 0.09 : enemy.type === "sphere" ? 0.12 : 0.08),
          rotationZ: enemy.rotationZ + (enemy.type === "pyramid" ? 0.04 : enemy.type === "sphere" ? 0.06 : 0.03),
        };
      }),
    );

    // Check ball-enemy collisions and destroy enemies immediately
    const hitEnemiesThisFrame = new Set<number>(); // Track which enemies were hit this frame
    setBalls((prevBalls) => {
      let ballsUpdated = false;
      const newBalls = prevBalls.map((ball) => {
        if (ball.waitingToLaunch) return ball;

        for (const enemy of enemies) {
          // Skip if this enemy was already hit this frame
          if (hitEnemiesThisFrame.has(enemy.id || -1)) {
            continue;
          }

          if (
            ball.x + ball.radius > enemy.x &&
            ball.x - ball.radius < enemy.x + enemy.width &&
            ball.y + ball.radius > enemy.y &&
            ball.y - ball.radius < enemy.y + enemy.height
          ) {
            // Mark this enemy as hit in this frame
            if (enemy.id !== undefined) {
              hitEnemiesThisFrame.add(enemy.id);
            }

            // Change ball trajectory immediately
            const ballCenterX = ball.x;
            const ballCenterY = ball.y;
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;

            const dx = ballCenterX - enemyCenterX;
            const dy = ballCenterY - enemyCenterY;

            ballsUpdated = true;
            let updatedBall = ball;

            // Reverse ball direction based on collision side
            if (Math.abs(dx) > Math.abs(dy)) {
              updatedBall = { ...ball, dx: -ball.dx };
            } else {
              updatedBall = { ...ball, dy: -ball.dy };
            }

            // Handle enemy destruction/damage
            if (enemy.type === "pyramid") {
              const currentHits = enemy.hits || 0;
              if (currentHits === 0) {
                // First hit - change color to yellow
                soundManager.playBounce();
                toast.warning("Pyramid hit! 2 more hits needed");
                // Screen shake on enemy hit
                setScreenShake(5);
                setTimeout(() => setScreenShake(0), 500);
                setEnemies((prev) =>
                  prev.map((e) =>
                    e.id === enemy.id
                      ? {
                          ...e,
                          hits: 1,
                        }
                      : e,
                  ),
                );
              } else if (currentHits === 1) {
                // Second hit - change color to red, make it angry and faster
                soundManager.playBounce();
                toast.warning("Pyramid is angry! 1 more hit!");
                // Screen shake on enemy hit
                setScreenShake(5);
                setTimeout(() => setScreenShake(0), 500);
                setEnemies((prev) =>
                  prev.map((e) =>
                    e.id === enemy.id
                      ? {
                          ...e,
                          hits: 2,
                          isAngry: true,
                          speed: e.speed * 1.5,
                          dx: e.dx * 1.5,
                          dy: e.dy * 1.5,
                        }
                      : e,
                  ),
                );
              } else {
                // Third hit - destroy it
                setExplosions((prev) => [
                  ...prev,
                  {
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height / 2,
                    frame: 0,
                    maxFrames: 20,
                    enemyType: enemy.type,
                    particles: createExplosionParticles(
                      enemy.x + enemy.width / 2,
                      enemy.y + enemy.height / 2,
                      enemy.type,
                    ),
                  },
                ]);
                soundManager.playExplosion();
                setScore((s) => s + 300);
                toast.success("Pyramid destroyed! +300 points");

                // Check for bonus letter drop
                dropBonusLetter(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

                // Remove enemy
                setEnemies((prev) => prev.filter((e) => e.id !== enemy.id));

                // Track enemy kill and drop powerup every 3 kills
                setEnemiesKilled((prev) => {
                  const newCount = prev + 1;
                  if (newCount % 3 === 0) {
                    // Create a powerup at enemy location - always drop (retry until success)
                    const fakeBrick: Brick = {
                      x: enemy.x,
                      y: enemy.y,
                      width: enemy.width,
                      height: enemy.height,
                      visible: true,
                      color: "",
                      points: 0,
                      hasPowerUp: true,
                      hitsRemaining: 0,
                      maxHits: 1,
                      isIndestructible: false,
                    };
                    // Keep trying until we get a powerup (guaranteed drop)
                    let powerUp = createPowerUp(fakeBrick);
                    let attempts = 0;
                    while (!powerUp && attempts < 10) {
                      powerUp = createPowerUp(fakeBrick);
                      attempts++;
                    }
                    if (powerUp) {
                      setPowerUps((prev) => [...prev, powerUp]);
                      toast.success("Enemy kill bonus! Power-up dropped!");
                    }
                  }
                  return newCount;
                });

                // Clear bomb interval
                if (enemy.id !== undefined) {
                  const interval = bombIntervalsRef.current.get(enemy.id);
                  if (interval) {
                    clearInterval(interval);
                    bombIntervalsRef.current.delete(enemy.id);
                  }
                }
              }
            } else if (enemy.type === "sphere") {
              const currentHits = enemy.hits || 0;
              if (currentHits === 0) {
                // First hit - make it angry and faster
                soundManager.playBounce();
                toast.warning("Sphere enemy is angry!");
                // Screen shake on enemy hit
                setScreenShake(5);
                setTimeout(() => setScreenShake(0), 500);
                setEnemies((prev) =>
                  prev.map((e) =>
                    e.id === enemy.id
                      ? {
                          ...e,
                          hits: 1,
                          isAngry: true,
                          speed: e.speed * 1.3,
                          dx: e.dx * 1.3,
                          dy: e.dy * 1.3,
                        }
                      : e,
                  ),
                );
              } else {
                // Second hit - destroy it
                setExplosions((prev) => [
                  ...prev,
                  {
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height / 2,
                    frame: 0,
                    maxFrames: 20,
                    enemyType: enemy.type,
                    particles: createExplosionParticles(
                      enemy.x + enemy.width / 2,
                      enemy.y + enemy.height / 2,
                      enemy.type,
                    ),
                  },
                ]);
                soundManager.playExplosion();
                setScore((s) => s + 200);
                toast.success("Sphere enemy destroyed! +200 points");

                // Check for bonus letter drop
                dropBonusLetter(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

                // Remove enemy
                setEnemies((prev) => prev.filter((e) => e.id !== enemy.id));

                // Track enemy kill and drop powerup every 3 kills
                setEnemiesKilled((prev) => {
                  const newCount = prev + 1;
                  if (newCount % 3 === 0) {
                    // Create a powerup at enemy location - always drop (retry until success)
                    const fakeBrick: Brick = {
                      x: enemy.x,
                      y: enemy.y,
                      width: enemy.width,
                      height: enemy.height,
                      visible: true,
                      color: "",
                      points: 0,
                      hasPowerUp: true,
                      hitsRemaining: 0,
                      maxHits: 1,
                      isIndestructible: false,
                    };
                    // Keep trying until we get a powerup (guaranteed drop)
                    let powerUp = createPowerUp(fakeBrick);
                    let attempts = 0;
                    while (!powerUp && attempts < 10) {
                      powerUp = createPowerUp(fakeBrick);
                      attempts++;
                    }
                    if (powerUp) {
                      setPowerUps((prev) => [...prev, powerUp]);
                      toast.success("Enemy kill bonus! Power-up dropped!");
                    }
                  }
                  return newCount;
                });

                // Clear bomb interval
                if (enemy.id !== undefined) {
                  const interval = bombIntervalsRef.current.get(enemy.id);
                  if (interval) {
                    clearInterval(interval);
                    bombIntervalsRef.current.delete(enemy.id);
                  }
                }
              }
            } else {
              // Cube enemy - destroy on first hit
              // Screen shake on enemy hit
              setScreenShake(5);
              setTimeout(() => setScreenShake(0), 500);
              setExplosions((prev) => [
                ...prev,
                {
                  x: enemy.x + enemy.width / 2,
                  y: enemy.y + enemy.height / 2,
                  frame: 0,
                  maxFrames: 20,
                  enemyType: enemy.type,
                  particles: createExplosionParticles(
                    enemy.x + enemy.width / 2,
                    enemy.y + enemy.height / 2,
                    enemy.type,
                  ),
                },
              ]);
              soundManager.playExplosion();
              setScore((s) => s + 100);
              toast.success("Enemy destroyed! +100 points");

              // Check for bonus letter drop
              dropBonusLetter(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

              // Remove enemy
              setEnemies((prev) => prev.filter((e) => e.id !== enemy.id));

              // Track enemy kill and drop powerup every 3 kills
              setEnemiesKilled((prev) => {
                const newCount = prev + 1;
                if (newCount % 3 === 0) {
                  // Create a powerup at enemy location - always drop (retry until success)
                  const fakeBrick: Brick = {
                    x: enemy.x,
                    y: enemy.y,
                    width: enemy.width,
                    height: enemy.height,
                    visible: true,
                    color: "",
                    points: 0,
                    hasPowerUp: true,
                    hitsRemaining: 0,
                    maxHits: 1,
                    isIndestructible: false,
                  };
                  // Keep trying until we get a powerup (guaranteed drop)
                  let powerUp = createPowerUp(fakeBrick);
                  let attempts = 0;
                  while (!powerUp && attempts < 10) {
                    powerUp = createPowerUp(fakeBrick);
                    attempts++;
                  }
                  if (powerUp) {
                    setPowerUps((prev) => [...prev, powerUp]);
                    toast.success("Enemy kill bonus! Power-up dropped!");
                  }
                }
                return newCount;
              });

              // Clear bomb interval
              if (enemy.id !== undefined) {
                const interval = bombIntervalsRef.current.get(enemy.id);
                if (interval) {
                  clearInterval(interval);
                  bombIntervalsRef.current.delete(enemy.id);
                }
              }
            }

            return updatedBall;
          }
        }
        return ball;
      });

      return ballsUpdated ? newBalls : prevBalls;
    });

    // Update explosions and their particles
    setExplosions((prev) =>
      prev
        .map((exp) => ({
          ...exp,
          frame: exp.frame + 1,
          particles: exp.particles
            .map((p) => ({
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              vy: p.vy + 0.2, // Add gravity
              life: p.life - 1,
            }))
            .filter((p) => p.life > 0),
        }))
        .filter((exp) => exp.frame < exp.maxFrames),
    );

    // Update bombs and rockets (pyramid bullets move in straight lines with angle)
    setBombs((prev) =>
      prev
        .map((bomb) => {
          if (bomb.type === "pyramidBullet" && bomb.dx !== undefined) {
            // Pyramid bullets move in straight line at angle
            return {
              ...bomb,
              x: bomb.x + (bomb.dx || 0),
              y: bomb.y + bomb.speed,
            };
          }
          return {
            ...bomb,
            y: bomb.y + bomb.speed,
          };
        })
        .filter((bomb) => bomb.y < SCALED_CANVAS_HEIGHT),
    );

    // Check bomb-paddle collision
    if (paddle) {
      bombs.forEach((bomb) => {
        // Check for shield first
        if (
          paddle.hasShield &&
          bomb.x + bomb.width > paddle.x &&
          bomb.x < paddle.x + paddle.width &&
          bomb.y + bomb.height > paddle.y - 10 &&
          bomb.y < paddle.y
        ) {
          // Bomb hit shield - destroy both
          soundManager.playBounce();
          setBombs((prev) => prev.filter((b) => b.enemyId !== bomb.enemyId));
          setPaddle((prev) => (prev ? { ...prev, hasShield: false } : null));
          toast.success("Shield absorbed the hit!");
          return;
        }

        if (
          bomb.x + bomb.width > paddle.x &&
          bomb.x < paddle.x + paddle.width &&
          bomb.y + bomb.height > paddle.y &&
          bomb.y < paddle.y + paddle.height
        ) {
          // Bomb hit paddle - lose a life
          soundManager.playLoseLife();
          setBombs((prev) => prev.filter((b) => b.enemyId !== bomb.enemyId));

          setLives((prev) => {
            const newLives = prev - 1;

            if (newLives <= 0) {
              setGameState("gameOver");
              soundManager.stopBackgroundMusic();
              toast.error("Game Over!");

              if (isHighScore(score)) {
                setShowHighScoreEntry(true);
                soundManager.playHighScoreMusic();
              }
            } else {
              // Reset ball and clear power-ups, but wait for click to continue
              const baseSpeed = 3.45; // 15% faster base speed
              const resetBall: Ball = {
                x: SCALED_CANVAS_WIDTH / 2,
                y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
                dx: baseSpeed,
                dy: -baseSpeed,
                radius: SCALED_BALL_RADIUS,
                speed: baseSpeed,
                id: nextBallId.current++,
                isFireball: false,
                waitingToLaunch: true,
              };
              setBalls([resetBall]);
              setLaunchAngle(-20);
              launchAngleDirectionRef.current = 1;
              setShowInstructions(true); // Show instructions when resetting ball
              setPowerUps([]);
              setPaddle((prev) => (prev ? { ...prev, hasTurrets: false, width: SCALED_PADDLE_WIDTH } : null));
              setBullets([]); // Clear all bullets
              // Only reset speed if it's slower than base speed
              if (speedMultiplier < 1) {
                setSpeedMultiplier(1);
              }
              // Reset accumulated brick hit speed on death
              setBrickHitSpeedAccumulated(0);
              setTimer(0);
              setLastEnemySpawnTime(0);
              setEnemies([]); // Clear all enemies
              setBombs([]); // Clear all bombs
              setExplosions([]);
              // Clear all bomb intervals
              bombIntervalsRef.current.forEach((interval) => clearInterval(interval));
              bombIntervalsRef.current.clear();
              setGameState("ready");
              toast.error(`Bomb hit! ${newLives} lives remaining. Click to continue.`);
            }
            return newLives;
          });
        }
      });
    }

    // Check bounced bullet-paddle collision
    if (paddle) {
      bullets.forEach((bullet) => {
        // Check for shield first
        if (
          paddle.hasShield &&
          bullet.isBounced &&
          bullet.x + bullet.width > paddle.x &&
          bullet.x < paddle.x + paddle.width &&
          bullet.y + bullet.height > paddle.y - 10 &&
          bullet.y < paddle.y
        ) {
          // Bullet hit shield - destroy both
          soundManager.playBounce();
          setBullets((prev) => prev.filter((b) => b !== bullet));
          setPaddle((prev) => (prev ? { ...prev, hasShield: false } : null));
          toast.success("Shield absorbed the hit!");
          return;
        }

        if (
          bullet.isBounced &&
          bullet.x + bullet.width > paddle.x &&
          bullet.x < paddle.x + paddle.width &&
          bullet.y + bullet.height > paddle.y &&
          bullet.y < paddle.y + paddle.height
        ) {
          // Bounced bullet hit paddle - lose a life
          soundManager.playLoseLife();
          setBullets((prev) => prev.filter((b) => b !== bullet));

          setLives((prev) => {
            const newLives = prev - 1;

            if (newLives <= 0) {
              setGameState("gameOver");
              soundManager.stopBackgroundMusic();
              toast.error("Game Over!");

              if (isHighScore(score)) {
                setShowHighScoreEntry(true);
                soundManager.playHighScoreMusic();
              }
            } else {
              // Reset ball and clear power-ups, but wait for click to continue
              const baseSpeed = 3.45; // 15% faster base speed
              const resetBall: Ball = {
                x: SCALED_CANVAS_WIDTH / 2,
                y: SCALED_CANVAS_HEIGHT - 60 * scaleFactor,
                dx: baseSpeed,
                dy: -baseSpeed,
                radius: SCALED_BALL_RADIUS,
                speed: baseSpeed,
                id: nextBallId.current++,
                isFireball: false,
                waitingToLaunch: true,
              };
              setBalls([resetBall]);
              setLaunchAngle(-20);
              launchAngleDirectionRef.current = 1;
              setShowInstructions(true); // Show instructions when resetting ball
              setPowerUps([]);
              setPaddle((prev) => (prev ? { ...prev, hasTurrets: false, width: SCALED_PADDLE_WIDTH } : null));
              setBullets([]); // Clear all bullets
              // Only reset speed if it's slower than base speed
              if (speedMultiplier < 1) {
                setSpeedMultiplier(1);
              }
              // Reset accumulated brick hit speed on death
              setBrickHitSpeedAccumulated(0);
              setTimer(0);
              setLastEnemySpawnTime(0);
              setEnemies([]); // Clear all enemies
              setBombs([]); // Clear all bombs
              setExplosions([]);
              // Clear all bomb intervals
              bombIntervalsRef.current.forEach((interval) => clearInterval(interval));
              bombIntervalsRef.current.clear();
              setGameState("ready");
              toast.error(`Bullet hit! ${newLives} lives remaining. Click to continue.`);
            }
            return newLives;
          });
        }
      });
    }

    // Check collisions
    checkCollision();

    // Check power-up collision
    if (paddle) {
      checkPowerUpCollision(paddle, balls, setBalls, setPaddle, setSpeedMultiplier);
    }

    // Check ball timeout without paddle hit (15s and 25s)
    if (lastPaddleHitTime > 0) {
      const timeSinceHit = (Date.now() - lastPaddleHitTime) / 1000;

      if (timeSinceHit >= 25 && enemies.length > 0) {
        // 25s - nearest enemy kamikaze
        const activeBall = balls.find((b) => !b.waitingToLaunch);
        if (activeBall) {
          // Find closest enemy
          let closestEnemy = enemies[0];
          let minDistance = Infinity;

          for (const enemy of enemies) {
            const dx = enemy.x + enemy.width / 2 - activeBall.x;
            const dy = enemy.y + enemy.height / 2 - activeBall.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
              minDistance = distance;
              closestEnemy = enemy;
            }
          }

          // Make closest enemy go kamikaze towards ball
          setEnemies((prev) =>
            prev.map((e) =>
              e.id === closestEnemy.id
                ? {
                    ...e,
                    dx: ((activeBall.x - (e.x + e.width / 2)) / minDistance) * e.speed * 3,
                    dy: ((activeBall.y - (e.y + e.height / 2)) / minDistance) * e.speed * 3,
                  }
                : e,
            ),
          );
          toast.warning("Enemy kamikaze attack!");
          setLastPaddleHitTime(Date.now()); // Reset timer
        }
      } else if (timeSinceHit >= 15) {
        // 15s - divert ball by 10 degrees
        setBalls((prev) =>
          prev.map((ball) => {
            if (!ball.waitingToLaunch) {
              const currentAngle = Math.atan2(ball.dy, ball.dx);
              const divertAngle = currentAngle + (10 * Math.PI) / 180;
              const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
              return {
                ...ball,
                dx: Math.cos(divertAngle) * speed,
                dy: Math.sin(divertAngle) * speed,
              };
            }
            return ball;
          }),
        );
        setLastPaddleHitTime(Date.now()); // Reset timer
      }
    }

    // Check score milestones for extra lives (every 50000)
    const currentMilestone = Math.floor(score / 50000);
    if (currentMilestone > lastScoreMilestone && currentMilestone > 0) {
      setLastScoreMilestone(currentMilestone);
      setLives((prev) => prev + 1);
      soundManager.playExtraLifeSound();
      toast.success("Extra life awarded! +1 Life", { duration: 3000 });
      // Blink score
      setScoreBlinking(true);
      setTimeout(() => setScoreBlinking(false), 1000);
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [
    gameState,
    checkCollision,
    updatePowerUps,
    updateBullets,
    paddle,
    balls,
    checkPowerUpCollision,
    speedMultiplier,
    enemies,
    bombs,
    bricks,
    score,
    isHighScore,
    explosions,
    lastPaddleHitTime,
    lastScoreMilestone,
  ]);

  useEffect(() => {
    if (gameState === "playing") {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, gameLoop]);

  // Separate useEffect for timer management - handle pause/resume
  useEffect(() => {
    if (gameState === "playing" && timerStartedRef.current) {
      // Resume timer if it was started and we're playing
      if (!timerIntervalRef.current) {
        timerIntervalRef.current = setInterval(() => {
          setTimer((prev) => prev + 1);
        }, 1000);
      }
    } else if (gameState === "paused") {
      // Pause: clear interval but keep timerStartedRef true
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = undefined;
      }
    } else if (gameState !== "playing") {
      // Game over or not started: clear everything
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = undefined;
      }
      timerStartedRef.current = false;
      bombIntervalsRef.current.forEach((interval) => clearInterval(interval));
      bombIntervalsRef.current.clear();
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      bombIntervalsRef.current.forEach((interval) => clearInterval(interval));
      bombIntervalsRef.current.clear();
    };
  }, [gameState]);

  // Enemy spawn at regular intervals
  useEffect(() => {
    if (gameState === "playing" && timer > 0) {
      // Spawn interval decreases with level
      // Normal: 30s at level 1, 20s at level 2, 15s at level 3+
      // Godlike: 20s at level 1, 12s at level 2, 8s at level 3+
      const baseInterval = settings.difficulty === "godlike" ? 20 : 30;
      const minInterval = settings.difficulty === "godlike" ? 8 : 15;
      const spawnInterval = Math.max(
        minInterval,
        baseInterval - (level - 1) * (settings.difficulty === "godlike" ? 4 : 5),
      );

      if (timer - lastEnemySpawnTime >= spawnInterval) {
        // Cap speed increase at 5 enemies (30% * 5 = 150%, so cap at 200%)
        const speedIncrease = Math.min(2.0, 1 + Math.min(enemySpawnCount, 5) * 0.3);
        const enemyId = nextEnemyId.current++;

        // Determine enemy type - sphere from level 3+, pyramid from level 6+
        let enemyType: "cube" | "sphere" | "pyramid";
        if (level >= 6 && Math.random() < 0.3) {
          enemyType = "pyramid";
        } else if (level >= 3 && Math.random() > 0.5) {
          enemyType = "sphere";
        } else {
          enemyType = "cube";
        }

        let newEnemy: Enemy;

        if (enemyType === "pyramid") {
          // Pyramid enemy - very slow random movement, 3 hits to destroy
          const angle = Math.random() * Math.PI * 2;
          const speed = 1 * speedIncrease; // Very slow
          newEnemy = {
            id: enemyId,
            type: "pyramid",
            x: Math.random() * (SCALED_CANVAS_WIDTH - 40),
            y: 50 + Math.random() * 50,
            width: 40,
            height: 40,
            rotation: 0,
            rotationX: Math.random() * Math.PI,
            rotationY: Math.random() * Math.PI,
            rotationZ: Math.random() * Math.PI,
            speed: speed,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            hits: 0,
            isAngry: false,
          };
        } else if (enemyType === "sphere") {
          // Sphere enemy - random movement pattern
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 * speedIncrease; // Slightly faster
          newEnemy = {
            id: enemyId,
            type: "sphere",
            x: Math.random() * (SCALED_CANVAS_WIDTH - 40),
            y: 50 + Math.random() * 50,
            width: 35,
            height: 35,
            rotation: 0,
            rotationX: Math.random() * Math.PI,
            rotationY: Math.random() * Math.PI,
            rotationZ: Math.random() * Math.PI,
            speed: speed,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            hits: 0,
            isAngry: false,
          };
        } else {
          // Cube enemy - straight line movement
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 * speedIncrease;
          newEnemy = {
            id: enemyId,
            type: "cube",
            x: Math.random() * (SCALED_CANVAS_WIDTH - 40),
            y: 50 + Math.random() * 50,
            width: 30,
            height: 30,
            rotation: 0,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            speed: speed,
            dx: Math.cos(angle) * speed,
            dy: Math.abs(Math.sin(angle)) * speed, // Always move downward initially
          };
        }

        setEnemies((prev) => [...prev, newEnemy]);
        setLastEnemySpawnTime(timer);
        setEnemySpawnCount((prev) => prev + 1);
        const enemyName = enemyType === "sphere" ? "Sphere" : enemyType === "pyramid" ? "Pyramid" : "Cube";
        toast.warning(`${enemyName} enemy ${enemySpawnCount + 1} appeared! Speed: ${Math.round(speedIncrease * 100)}%`);

        // Start dropping projectiles for this enemy
        // Set up bomb/rocket drop with level-scaled intervals
        // Base: 7-12 seconds, increases 0.5s per level until level 8 (4-8s), then 3-7s from level 9+
        let minInterval, maxInterval;
        if (level <= 8) {
          const levelBonus = (level - 1) * 0.5;
          minInterval = Math.max(4, 7 - levelBonus);
          maxInterval = Math.max(8, 12 - levelBonus);
        } else {
          minInterval = 3;
          maxInterval = 7;
        }
        const randomInterval = minInterval * 1000 + Math.random() * (maxInterval - minInterval) * 1000;
        const projectileInterval = setInterval(() => {
          setEnemies((currentEnemies) => {
            const currentEnemy = currentEnemies.find((e) => e.id === enemyId);
            if (!currentEnemy) {
              clearInterval(projectileInterval);
              bombIntervalsRef.current.delete(enemyId);
              return currentEnemies;
            }

            // Pyramid enemies shoot bullets in random angles
            if (currentEnemy.type === "pyramid") {
              const randomAngle = (Math.random() * 160 - 80) * (Math.PI / 180); // -80 to +80 degrees
              const bulletSpeed = 4;
              const newBullet: Bomb = {
                x: currentEnemy.x + currentEnemy.width / 2 - 4,
                y: currentEnemy.y + currentEnemy.height,
                width: 8,
                height: 12,
                speed: bulletSpeed,
                enemyId: enemyId,
                type: "pyramidBullet",
                dx: Math.sin(randomAngle) * bulletSpeed,
              };
              soundManager.playPyramidBulletSound();
              setBombs((prev) => [...prev, newBullet]);
            } else {
              const newProjectile: Bomb = {
                x: currentEnemy.x + currentEnemy.width / 2 - 5,
                y: currentEnemy.y + currentEnemy.height,
                width: 10,
                height: 10,
                speed: 3,
                enemyId: enemyId,
                type: currentEnemy.type === "sphere" ? "rocket" : "bomb",
                dx: 0, // Initialize horizontal velocity for rockets
              };
              soundManager.playBombDropSound();
              setBombs((prev) => [...prev, newProjectile]);
            }
            return currentEnemies;
          });
        }, randomInterval);
        bombIntervalsRef.current.set(enemyId, projectileInterval);
      }
    }
  }, [timer, gameState, lastEnemySpawnTime, enemySpawnCount, level, settings.difficulty]);

  // Keyboard controls for launch angle
  useEffect(() => {
    const waitingBall = balls.find((ball) => ball.waitingToLaunch);
    if (gameState !== "playing" || !waitingBall) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        setLaunchAngle((prev) => Math.max(prev - 3, -80));
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        setLaunchAngle((prev) => Math.min(prev + 3, 80));
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        // Scroll up = left
        setLaunchAngle((prev) => Math.max(prev - 3, -80));
      } else if (e.deltaY > 0) {
        // Scroll down = right
        setLaunchAngle((prev) => Math.min(prev + 3, 80));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [gameState, balls]);

  const handleStart = () => {
    if (gameState === "ready") {
      // Check if this is level completion (all bricks destroyed)
      const isLevelComplete = bricks.every((brick) => !brick.visible) && bricks.length > 0;

      if (isLevelComplete) {
        // Start next level
        nextLevel();
      } else {
        // Continue current level - start music only if not already playing
        setGameState("playing");
        if (!soundManager.isMusicPlaying()) {
          soundManager.playBackgroundMusic(level);
        }
        toast.success("Continue!");
      }
    }
  };

  const handleRestart = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    soundManager.stopBackgroundMusic();
    soundManager.stopHighScoreMusic();
    setShowHighScoreEntry(false);
    setShowHighScoreDisplay(false);
    setShowEndScreen(false);
    setBeatLevel50Completed(false);
    initGame();
    toast("Game Reset!");
  }, [initGame]);

  const handleHighScoreSubmit = (name: string) => {
    addHighScore(name, score, level, settings.difficulty, beatLevel50Completed, settings.startingLives);
    setShowHighScoreEntry(false);
    setShowHighScoreDisplay(true);
    toast.success("High score saved!");
  };

  const handleEndScreenContinue = () => {
    setShowEndScreen(false);
    // Check if it's a high score
    if (isHighScore(score)) {
      setShowHighScoreEntry(true);
      soundManager.playHighScoreMusic();
      toast.success("New High Score!");
    } else {
      // Show high score display even if not a high score
      setShowHighScoreDisplay(true);
    }
  };

  const handleCloseHighScoreDisplay = () => {
    setShowHighScoreDisplay(false);
    soundManager.stopHighScoreMusic();
    onReturnToMenu();
  };

  const toggleFullscreen = async () => {
    if (!fullscreenContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await fullscreenContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // F key to toggle fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Adaptive header and frame visibility based on vertical space
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const checkFrameVisibility = () => {
      if (!fullscreenContainerRef.current) return;

      const containerHeight = fullscreenContainerRef.current.clientHeight;
      const containerWidth = fullscreenContainerRef.current.clientWidth;
      const isMobile = containerWidth < 768; // Mobile breakpoint
      
      const titleBarHeight = 60;
      const statsBarHeight = 80;
      const bottomBarHeight = 60;
      const sideFrameHeight = 40;
      
      // Desktop-specific adaptive layout
      if (!isMobile) {
        const playableAreaHeight = SCALED_CANVAS_HEIGHT;
        const statsAndBottomHeight = statsBarHeight + bottomBarHeight + sideFrameHeight;
        const fullHeightNeeded = playableAreaHeight + titleBarHeight + statsAndBottomHeight;
        
        // Check if we need to hide title
        const shouldShowTitle = containerHeight >= fullHeightNeeded;
        
        if (!shouldShowTitle && !disableAutoZoom) {
          // Hide title and calculate scale
          const availableHeight = containerHeight - statsAndBottomHeight;
          const minimalTopMargin = 20;
          const scalableHeight = playableAreaHeight + minimalTopMargin;
          let scaleFactor = availableHeight / scalableHeight;
          
          // Clamp scale to prevent unreadably small UI
          const minScale = 0.5;
          scaleFactor = Math.max(minScale, Math.min(1.0, scaleFactor));
          
          if (titleVisible || gameScale !== scaleFactor) {
            setTitleVisible(false);
            setGameScale(scaleFactor);
            console.log(`[Desktop Layout] desktopLayoutMode: titleHidden, scale: ${scaleFactor.toFixed(2)}`);
          }
        } else {
          // Show title and reset scale
          if (!titleVisible || gameScale !== 1) {
            setTitleVisible(true);
            setGameScale(1);
            console.log(`[Desktop Layout] desktopLayoutMode: titleVisible, scale: 1.0`);
          }
        }
        
        // Stats and controls always visible on desktop
        if (!framesVisible) {
          setFramesVisible(true);
          setHeaderVisible(true);
        }
      } else {
        // Mobile: existing behavior - hide all frames if constrained
        const requiredHeight = SCALED_CANVAS_HEIGHT + titleBarHeight + statsBarHeight + bottomBarHeight + sideFrameHeight;
        const shouldShowFrames = containerHeight >= requiredHeight;
        
        if (shouldShowFrames !== framesVisible) {
          setFramesVisible(shouldShowFrames);
          setHeaderVisible(shouldShowFrames);
          setTitleVisible(shouldShowFrames);
          setGameScale(1);
          
          const layoutMode = shouldShowFrames ? "headerVisible" : "headerHidden";
          console.log(`[Layout Debug] layoutMode: ${layoutMode}`);
        }
      }
    };

    const debouncedCheck = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(checkFrameVisibility, 120);
    };

    // Check on mount and resize
    checkFrameVisibility();
    window.addEventListener("resize", debouncedCheck);
    
    const handleFullscreenChange = () => {
      setTimeout(checkFrameVisibility, 100);
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    
    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener("resize", debouncedCheck);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [framesVisible, titleVisible, gameScale, disableAutoZoom, SCALED_CANVAS_HEIGHT]);

  return (
    <div
      ref={fullscreenContainerRef}
      className={`flex items-center justify-center ${
        isFullscreen ? "h-screen bg-background overflow-hidden" : "h-screen overflow-hidden"
      }`}
    >
      {showEndScreen ? (
        <EndScreen onContinue={handleEndScreenContinue} onReturnToMenu={onReturnToMenu} />
      ) : showHighScoreDisplay ? (
        <HighScoreDisplay scores={highScores} onClose={handleCloseHighScoreDisplay} />
      ) : (
        <>
          {showHighScoreEntry ? (
            <HighScoreEntry score={score} level={level} onSubmit={handleHighScoreSubmit} />
          ) : (
            <div className="metal-frame">
              {/* Title Bar - Adaptive Visibility (Desktop: only title hides, Mobile: all hides) */}
              <div 
                className={`metal-title-bar transition-all duration-150 ${
                  titleVisible ? 'opacity-100 max-h-[60px]' : 'opacity-0 max-h-0 overflow-hidden'
                }`}
                style={{
                  transform: titleVisible ? 'translateY(0)' : 'translateY(-10px)',
                  transition: 'opacity 150ms ease-in-out, max-height 150ms ease-in-out, transform 150ms ease-in-out',
                }}
              >
                <h1
                  className="text-2xl sm:text-3xl lg:text-4xl retro-pixel-text tracking-widest text-center"
                  style={{ color: "hsl(0, 0%, 95%)", textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                >
                  Vibing Arkanoid
                </h1>
              </div>

              {/* Stats Bar - Adaptive Visibility */}
              <div 
                className={`metal-stats-bar transition-all duration-150 ${
                  framesVisible ? 'opacity-100 max-h-[100px]' : 'opacity-0 max-h-0 overflow-hidden'
                }`}
                style={{
                  transform: framesVisible ? 'translateY(0)' : 'translateY(-10px)',
                }}
              >
                <div className="stats-container">
                  {/* Score */}
                  <div className="stat-box">
                    <div className="stat-label" style={{ color: "hsl(180, 70%, 60%)" }}>
                      SCORE
                    </div>
                    <div className={`stat-value ${scoreBlinking ? "animate-pulse" : ""}`}>
                      {score.toString().padStart(6, "0")}
                    </div>
                  </div>

                  {/* Level */}
                  <div className="stat-box">
                    <div className="stat-label" style={{ color: "hsl(30, 75%, 55%)" }}>
                      LEVEL
                    </div>
                    <div className="stat-value">{level.toString().padStart(2, "0")}</div>
                  </div>

                  {/* Lives */}
                  <div className="stat-box">
                    <div className="stat-label" style={{ color: "hsl(0, 70%, 55%)" }}>
                      LIVES
                    </div>
                    <div className="stat-value">{lives}</div>
                  </div>

                  {/* Timer */}
                  <div className="stat-box">
                    <div className="stat-label" style={{ color: "hsl(210, 60%, 55%)" }}>
                      TIMER
                    </div>
                    <div className="stat-value">{timer}s</div>
                  </div>

                  {/* Speed */}
                  <div className="stat-box">
                    <div className="stat-label" style={{ color: "hsl(120, 50%, 50%)" }}>
                      SPEED
                    </div>
                    <div className="stat-value">{Math.round(speedMultiplier * 100)}%</div>
                  </div>

                  {/* Turret Ammo - Only show when turrets are active */}
                  {paddle?.hasTurrets && paddle?.turretShots !== undefined && (
                    <div className="stat-box">
                      <div 
                        className="stat-label" 
                        style={{ 
                          color: paddle.turretShots <= 5 ? "hsl(0, 80%, 60%)" : "hsl(280, 60%, 60%)" 
                        }}
                      >
                        AMMO
                      </div>
                      <div 
                        className={`stat-value ${paddle.turretShots <= 5 ? 'animate-pulse' : ''}`}
                        style={{
                          color: paddle.turretShots <= 5 ? "hsl(0, 80%, 65%)" : "hsl(0, 0%, 85%)"
                        }}
                      >
                        {paddle.turretShots}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={onReturnToMenu} className="fullscreen-btn" title="Return to Main Menu">
                    <Home size={18} />
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="fullscreen-btn"
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                </div>
              </div>

              {/* Main Content with Side Panels */}
              <div className="metal-main-content">
                {/* Left Panel */}
                <div className="metal-side-panel metal-side-panel-left">
                  <div className="panel-decoration"></div>
                  <div className="panel-decoration"></div>
                  <div className="panel-decoration"></div>
                </div>

                {/* Game Canvas - Apply scale transform when title is hidden (desktop only) */}
                <div className="metal-game-area">
                  <div 
                    className={`game-glow ${isFullscreen ? "game-canvas-wrapper" : ""}`}
                    style={{
                      transform: `scale(${gameScale})`,
                      transformOrigin: 'top center',
                      transition: 'transform 150ms ease-in-out',
                    }}
                  >
                    <GameCanvas
                      ref={canvasRef}
                      width={SCALED_CANVAS_WIDTH}
                      height={SCALED_CANVAS_HEIGHT}
                      bricks={bricks}
                      balls={balls}
                      paddle={paddle}
                      gameState={gameState}
                      powerUps={powerUps}
                      bullets={bullets}
                      enemy={enemies}
                      bombs={bombs}
                      level={level}
                      backgroundPhase={backgroundPhase}
                      explosions={explosions}
                      launchAngle={launchAngle}
                      bonusLetters={bonusLetters}
                      collectedLetters={collectedLetters}
                      screenShake={screenShake}
                      backgroundFlash={backgroundFlash}
                    />
                  </div>
                </div>

                {/* Right Panel */}
                <div className="metal-side-panel metal-side-panel-right">
                  <div className="panel-decoration"></div>
                  <div className="panel-decoration"></div>
                  <div className="panel-decoration"></div>
                </div>
              </div>

              {/* Compact HUD Overlay - Shown when frames are hidden */}
              {!framesVisible && (
                <div 
                  className="fixed top-4 left-4 z-50 flex flex-col gap-2 pointer-events-none"
                  style={{
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  <div className="flex gap-4 items-center bg-black/30 backdrop-blur-sm px-3 py-2 rounded">
                    <div className="retro-pixel-text text-xs" style={{ color: "hsl(180, 70%, 60%)" }}>
                      SCORE: <span style={{ color: "hsl(0, 0%, 95%)" }}>{score.toString().padStart(6, "0")}</span>
                    </div>
                    <div className="retro-pixel-text text-xs" style={{ color: "hsl(30, 75%, 55%)" }}>
                      LV: <span style={{ color: "hsl(0, 0%, 95%)" }}>{level.toString().padStart(2, "0")}</span>
                    </div>
                    <div className="retro-pixel-text text-xs" style={{ color: "hsl(0, 70%, 55%)" }}>
                      LIVES: <span style={{ color: "hsl(0, 0%, 95%)" }}>{lives}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Controls - Adaptive Visibility */}
              <div 
                className={`metal-bottom-bar transition-all duration-150 ${
                  framesVisible ? 'opacity-100 max-h-[80px]' : 'opacity-0 max-h-0 overflow-hidden'
                }`}
                style={{
                  transform: framesVisible ? 'translateY(0)' : 'translateY(10px)',
                }}
              >
                <div className="flex gap-4 justify-center items-center">
                  {gameState === "ready" && (
                    <button
                      onClick={handleStart}
                      className="amiga-box px-8 py-3 retro-pixel-text hover:bg-muted/50 transition-all text-sm"
                      style={{ color: "hsl(0, 0%, 85%)" }}
                    >
                      {bricks.every((brick) => !brick.visible) && level > 0 ? "NEXT LEVEL" : "START GAME"}
                    </button>
                  )}
                  {(gameState === "gameOver" || gameState === "won") && (
                    <button
                      onClick={handleRestart}
                      className="amiga-box px-8 py-3 retro-pixel-text hover:bg-muted/50 transition-all text-sm"
                      style={{ color: "hsl(0, 0%, 85%)" }}
                    >
                      PLAY AGAIN
                    </button>
                  )}
                  {gameState === "playing" && (
                    <div className="retro-pixel-text text-xs" style={{ color: "hsl(0, 0%, 60%)" }}>
                      Move your mouse or touch to control the paddle • Press ESC to release mouse • Click canvas to
                      recapture
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
