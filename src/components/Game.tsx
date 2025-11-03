import { useEffect, useRef, useState, useCallback } from "react";
import { GameCanvas } from "./GameCanvas";
import { GameUI } from "./GameUI";
import { HighScoreTable } from "./HighScoreTable";
import { HighScoreEntry } from "./HighScoreEntry";
import { HighScoreDisplay } from "./HighScoreDisplay";
import { toast } from "sonner";
import { Maximize2, Minimize2 } from "lucide-react";
import type { Brick, Ball, Paddle, GameState, Enemy, Bomb, Explosion } from "@/types/game";
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

export const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>("ready");
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [showHighScoreEntry, setShowHighScoreEntry] = useState(false);
  const [showHighScoreDisplay, setShowHighScoreDisplay] = useState(false);
  const [timer, setTimer] = useState(0);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [backgroundPhase, setBackgroundPhase] = useState(0);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [enemySpawnCount, setEnemySpawnCount] = useState(0);
  const [lastEnemySpawnTime, setLastEnemySpawnTime] = useState(0);
  const [launchAngle, setLaunchAngle] = useState(-60);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const launchAngleDirectionRef = useRef(1);
  const animationFrameRef = useRef<number>();
  const nextBallId = useRef(1);
  const nextEnemyId = useRef(1);
  const timerIntervalRef = useRef<NodeJS.Timeout>();
  const bombIntervalsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const launchAngleIntervalRef = useRef<NodeJS.Timeout>();
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  const { highScores, isHighScore, addHighScore } = useHighScores();

  const { powerUps, createPowerUp, updatePowerUps, checkPowerUpCollision, setPowerUps } = usePowerUps(level, setLives);
  const { bullets, setBullets, fireBullets, updateBullets } = useBullets(setScore, setBricks, bricks, enemies);

  const initBricksForLevel = useCallback((currentLevel: number) => {
    const layoutIndex = (currentLevel - 1) % 10;
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
          newBricks.push({
            x: col * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT,
            y: row * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
            width: BRICK_WIDTH,
            height: BRICK_HEIGHT,
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
      x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: CANVAS_HEIGHT - 40,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      hasTurrets: false,
    });

    // Initialize ball with speed multiplier - waiting to launch
    const baseSpeed = 3;
    const initialBall: Ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 60,
      dx: baseSpeed,
      dy: -baseSpeed,
      radius: BALL_RADIUS,
      speed: baseSpeed,
      id: nextBallId.current++,
      isFireball: false,
      waitingToLaunch: true,
      rotation: 0,
    };
    setBalls([initialBall]);
    setLaunchAngle(-60); // Start from left side
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
    setEnemies([]);
    setBombs([]);
    setBackgroundPhase(0);
    setExplosions([]);
    setEnemySpawnCount(0);
    setLastEnemySpawnTime(0);
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
    bombIntervalsRef.current.forEach((interval) => clearInterval(interval));
    bombIntervalsRef.current.clear();

    const newLevel = level + 1;
    const newSpeedMultiplier = Math.min(2.0, 1 + (newLevel - 1) * 0.05); // 5% faster per level, max 200%

    setLevel(newLevel);
    setSpeedMultiplier(newSpeedMultiplier);

    // Reset paddle
    setPaddle({
      x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: CANVAS_HEIGHT - 40,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      hasTurrets: false,
    });

    // Initialize ball with new speed - waiting to launch
    const baseSpeed = 3 * newSpeedMultiplier;
    const initialBall: Ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 60,
      dx: baseSpeed,
      dy: -baseSpeed,
      radius: BALL_RADIUS,
      speed: baseSpeed,
      id: nextBallId.current++,
      isFireball: false,
      waitingToLaunch: true,
    };
    setBalls([initialBall]);
    setLaunchAngle(-60); // Start from left side
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
      if (!canvasRef.current || !paddle || gameState !== "playing") return;

      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const newX = Math.max(0, Math.min(CANVAS_WIDTH - paddle.width, mouseX - paddle.width / 2));

      setPaddle((prev) => (prev ? { ...prev, x: newX } : null));
    },
    [gameState, paddle],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!canvasRef.current || !paddle || gameState !== "playing") return;

      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const touchX = (e.touches[0].clientX - rect.left) * scaleX;
      const newX = Math.max(0, Math.min(CANVAS_WIDTH - paddle.width, touchX - paddle.width / 2));

      setPaddle((prev) => (prev ? { ...prev, x: newX } : null));
    },
    [gameState, paddle],
  );

  const handleClick = useCallback(() => {
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
      if (e.key === "n" || e.key === "N") {
        soundManager.nextTrack();
        toast.success("Next track");
      } else if (e.key === "p" || e.key === "P") {
        soundManager.previousTrack();
        toast.success("Previous track");
      } else if (e.key === "m" || e.key === "M") {
        const enabled = soundManager.toggleMute();
        toast.success(enabled ? "Music on" : "Music muted");
      } else if (e.key === "0") {
        // Clear level and advance
        nextLevel();
        toast.success("Level skipped!");
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyPress);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleMouseMove, handleTouchMove, handleClick, nextLevel]);

  const checkCollision = useCallback(() => {
    if (!paddle || balls.length === 0) return;

    setBalls((prevBalls) => {
      let updatedBalls = prevBalls
        .map((ball) => {
          let newBall = { ...ball };

          // Wall collision
          if (newBall.x + newBall.dx > CANVAS_WIDTH - newBall.radius || newBall.x + newBall.dx < newBall.radius) {
            newBall.dx = -newBall.dx;
          }
          if (newBall.y + newBall.dy < newBall.radius) {
            newBall.dy = -newBall.dy;
          }

          // Paddle collision
          if (
            newBall.y + newBall.dy > paddle.y - newBall.radius &&
            newBall.x > paddle.x &&
            newBall.x < paddle.x + paddle.width &&
            newBall.dy > 0
          ) {
            soundManager.playBounce();

            const hitPos = (newBall.x - paddle.x) / paddle.width;
            const angle = (hitPos - 0.5) * Math.PI * 0.6;
            const speed = Math.sqrt(newBall.dx * newBall.dx + newBall.dy * newBall.dy);
            newBall.dx = speed * Math.sin(angle);
            newBall.dy = -speed * Math.cos(angle);
          }

          // Bottom collision (lose life)
          if (newBall.y + newBall.dy > CANVAS_HEIGHT - newBall.radius) {
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
            const indestructibleBricks = prevBricks.filter(b => b.isIndestructible && b.visible);
            for (const brick of indestructibleBricks) {
              // Check for adjacent indestructible bricks and create invisible walls in padding
              const rightNeighbor = indestructibleBricks.find(
                b => b.x === brick.x + brick.width + BRICK_PADDING && 
                     Math.abs(b.y - brick.y) < 1
              );
              const bottomNeighbor = indestructibleBricks.find(
                b => b.y === brick.y + brick.height + BRICK_PADDING && 
                     Math.abs(b.x - brick.x) < 1
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
                  if (newBall.x < paddingLeft + BRICK_PADDING / 2) {
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
                  if (newBall.y < paddingTop + BRICK_PADDING / 2) {
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
                const leftPenetration = (newBall.x + newBall.radius) - brick.x;
                const rightPenetration = (brick.x + brick.width) - (newBall.x - newBall.radius);
                const topPenetration = (newBall.y + newBall.radius) - brick.y;
                const bottomPenetration = (brick.y + brick.height) - (newBall.y - newBall.radius);
                
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

                // Increase ball speed slightly with each brick hit
                newBall.dx *= 1.005;
                newBall.dy *= 1.005;

                return updatedBrick;
              }
              return brick;
            });

            // Check win condition (don't count indestructible bricks)
            if (newBricks.every((brick) => !brick.visible || brick.isIndestructible)) {
              soundManager.playWin();
              setGameState("ready"); // Wait for click to start next level
              toast.success(`Level ${level} Complete! Click to continue.`);
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
            const baseSpeed = 3;
            const resetBall: Ball = {
              x: CANVAS_WIDTH / 2,
              y: CANVAS_HEIGHT - 60,
              dx: baseSpeed,
              dy: -baseSpeed,
              radius: BALL_RADIUS,
              speed: baseSpeed,
              id: nextBallId.current++,
              isFireball: false,
              waitingToLaunch: true,
            };
            setBalls([resetBall]);
            setLaunchAngle(-60); // Start from left side
            launchAngleDirectionRef.current = 1; // Move right initially
            setShowInstructions(true); // Show instructions when resetting ball
            setPowerUps([]);
            setPaddle((prev) => (prev ? { ...prev, hasTurrets: false, width: PADDLE_WIDTH } : null));
            setBullets([]); // Clear all bullets
            // Only reset speed if it's slower than base speed
            if (speedMultiplier < 1) {
              setSpeedMultiplier(1);
            }
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
        if (newX <= 0 || newX >= CANVAS_WIDTH - enemy.width) {
          newDx = -enemy.dx;
          newX = Math.max(0, Math.min(CANVAS_WIDTH - enemy.width, newX));
        }

        // Bounce off top and 60% boundary
        const maxY = CANVAS_HEIGHT * 0.6;
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
    setBalls((prevBalls) => {
      let ballsUpdated = false;
      const newBalls = prevBalls.map((ball) => {
        if (ball.waitingToLaunch) return ball;

        for (const enemy of enemies) {
          if (
            ball.x + ball.radius > enemy.x &&
            ball.x - ball.radius < enemy.x + enemy.width &&
            ball.y + ball.radius > enemy.y &&
            ball.y - ball.radius < enemy.y + enemy.height
          ) {
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
                  },
                ]);
                soundManager.playExplosion();
                setScore((s) => s + 300);
                toast.success("Pyramid destroyed! +300 points");

                // Remove enemy
                setEnemies((prev) => prev.filter((e) => e.id !== enemy.id));

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
                  },
                ]);
                soundManager.playExplosion();
                setScore((s) => s + 200);
                toast.success("Sphere enemy destroyed! +200 points");

                // Remove enemy
                setEnemies((prev) => prev.filter((e) => e.id !== enemy.id));

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
              setExplosions((prev) => [
                ...prev,
                {
                  x: enemy.x + enemy.width / 2,
                  y: enemy.y + enemy.height / 2,
                  frame: 0,
                  maxFrames: 20,
                },
              ]);
              soundManager.playExplosion();
              setScore((s) => s + 100);
              toast.success("Enemy destroyed! +100 points");

              // Remove enemy
              setEnemies((prev) => prev.filter((e) => e.id !== enemy.id));

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

    // Update explosions
    setExplosions((prev) =>
      prev
        .map((exp) => ({
          ...exp,
          frame: exp.frame + 1,
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
        .filter((bomb) => bomb.y < CANVAS_HEIGHT),
    );

    // Check bomb-paddle collision
    if (paddle) {
      bombs.forEach((bomb) => {
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
              const baseSpeed = 3;
              const resetBall: Ball = {
                x: CANVAS_WIDTH / 2,
                y: CANVAS_HEIGHT - 60,
                dx: baseSpeed,
                dy: -baseSpeed,
                radius: BALL_RADIUS,
                speed: baseSpeed,
                id: nextBallId.current++,
                isFireball: false,
                waitingToLaunch: true,
              };
              setBalls([resetBall]);
              setLaunchAngle(-60);
              launchAngleDirectionRef.current = 1;
              setShowInstructions(true); // Show instructions when resetting ball
              setPowerUps([]);
              setPaddle((prev) => (prev ? { ...prev, hasTurrets: false, width: PADDLE_WIDTH } : null));
              setBullets([]); // Clear all bullets
              // Only reset speed if it's slower than base speed
              if (speedMultiplier < 1) {
                setSpeedMultiplier(1);
              }
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
              const baseSpeed = 3;
              const resetBall: Ball = {
                x: CANVAS_WIDTH / 2,
                y: CANVAS_HEIGHT - 60,
                dx: baseSpeed,
                dy: -baseSpeed,
                radius: BALL_RADIUS,
                speed: baseSpeed,
                id: nextBallId.current++,
                isFireball: false,
                waitingToLaunch: true,
              };
              setBalls([resetBall]);
              setLaunchAngle(-60);
              launchAngleDirectionRef.current = 1;
              setShowInstructions(true); // Show instructions when resetting ball
              setPowerUps([]);
              setPaddle((prev) => (prev ? { ...prev, hasTurrets: false, width: PADDLE_WIDTH } : null));
              setBullets([]); // Clear all bullets
              // Only reset speed if it's slower than base speed
              if (speedMultiplier < 1) {
                setSpeedMultiplier(1);
              }
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

  // Separate useEffect for timer management
  useEffect(() => {
    if (gameState === "playing") {
      // Start timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
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
      // Spawn interval decreases with level (30s at level 1, 20s at level 2, 15s at level 3+)
      const spawnInterval = Math.max(15, 30 - (level - 1) * 5);

      if (timer - lastEnemySpawnTime >= spawnInterval) {
        const speedIncrease = 1 + enemySpawnCount * 0.3; // 30% faster each spawn
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
            x: Math.random() * (CANVAS_WIDTH - 40),
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
            x: Math.random() * (CANVAS_WIDTH - 40),
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
            x: Math.random() * (CANVAS_WIDTH - 40),
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
        }, 2000);
        bombIntervalsRef.current.set(enemyId, projectileInterval);
      }
    }
  }, [timer, gameState, lastEnemySpawnTime, enemySpawnCount, level]);

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
    initGame();
    toast("Game Reset!");
  }, [initGame]);

  const handleHighScoreSubmit = (name: string) => {
    addHighScore(name, score, level);
    setShowHighScoreEntry(false);
    setShowHighScoreDisplay(true);
    toast.success("High score saved!");
  };

  const handleCloseHighScoreDisplay = () => {
    setShowHighScoreDisplay(false);
    soundManager.stopHighScoreMusic();
    handleRestart();
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

  return (
    <div
      ref={fullscreenContainerRef}
      className={`flex flex-col items-center justify-center gap-6 p-4 ${
        isFullscreen ? "min-h-screen bg-background" : "min-h-screen"
      }`}
    >
      {showHighScoreDisplay ? (
        <HighScoreDisplay scores={highScores} onClose={handleCloseHighScoreDisplay} />
      ) : (
        <>
          <h1
            className="text-4xl retro-pixel-text tracking-wider"
            style={{
              color: "hsl(0, 0%, 85%)",
              textShadow: "3px 3px 0px hsl(0, 0%, 30%), 0 0 20px hsl(210, 60%, 55%, 0.3)",
            }}
          >
            VIBING ARKANOID
          </h1>

          {showHighScoreEntry ? (
            <HighScoreEntry score={score} level={level} onSubmit={handleHighScoreSubmit} />
          ) : (
            <>
              {/* Control buttons and stats above playable area */}
              <div className="flex gap-4 w-full max-w-[1200px] justify-between items-center mb-2">
                {/* Score, Level, Lives, Timer, Speed in horizontal row */}
                <div className="flex gap-3 flex-1 justify-center">
                  {/* Score */}
                  <div className="bg-transparent border border-border/30 rounded-lg px-3 py-2 min-w-[100px]">
                    <div className="text-[8px] retro-pixel-text mb-1 text-center" style={{ color: "hsl(0, 0%, 60%)" }}>
                      SCORE
                    </div>
                    <div className="text-base retro-pixel-text text-center" style={{ color: "hsl(0, 0%, 85%)" }}>
                      {score.toString().padStart(6, "0")}
                    </div>
                  </div>

                  {/* Level */}
                  <div className="bg-transparent border border-border/30 rounded-lg px-3 py-2 min-w-[80px]">
                    <div
                      className="text-[8px] retro-pixel-text mb-1 text-center"
                      style={{ color: "hsl(30, 75%, 55%)" }}
                    >
                      LEVEL
                    </div>
                    <div className="text-base retro-pixel-text text-center" style={{ color: "hsl(0, 0%, 85%)" }}>
                      {level.toString().padStart(2, "0")}
                    </div>
                  </div>

                  {/* Lives */}
                  <div className="bg-transparent border border-border/30 rounded-lg px-3 py-2 min-w-[80px]">
                    <div className="text-[8px] retro-pixel-text mb-1 text-center" style={{ color: "hsl(0, 70%, 55%)" }}>
                      LIVES
                    </div>
                    <div className="text-base retro-pixel-text text-center" style={{ color: "hsl(0, 0%, 85%)" }}>
                      {lives}
                    </div>
                  </div>

                  {/* Timer */}
                  <div className="bg-transparent border border-border/30 rounded-lg px-3 py-2 min-w-[80px]">
                    <div
                      className="text-[8px] retro-pixel-text mb-1 text-center"
                      style={{ color: "hsl(210, 60%, 55%)" }}
                    >
                      TIMER
                    </div>
                    <div className="text-base retro-pixel-text text-center" style={{ color: "hsl(0, 0%, 85%)" }}>
                      {timer}s
                    </div>
                  </div>

                  {/* Speed */}
                  <div className="bg-transparent border border-border/30 rounded-lg px-3 py-2 min-w-[80px]">
                    <div
                      className="text-[8px] retro-pixel-text mb-1 text-center"
                      style={{ color: "hsl(120, 50%, 50%)" }}
                    >
                      SPEED
                    </div>
                    <div className="text-base retro-pixel-text text-center" style={{ color: "hsl(0, 0%, 85%)" }}>
                      {Math.round(speedMultiplier * 100)}%
                    </div>
                  </div>
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="amiga-box px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 size={16} style={{ color: "hsl(0, 0%, 85%)" }} />
                  ) : (
                    <Maximize2 size={16} style={{ color: "hsl(0, 0%, 85%)" }} />
                  )}
                </button>
              </div>

              <div className={`game-glow rounded-lg overflow-hidden ${isFullscreen ? "game-canvas-wrapper" : ""}`}>
                <GameCanvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
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
                />
              </div>

              <div className="flex gap-4">
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
              </div>

              <div className="retro-pixel-text text-xs" style={{ color: "hsl(0, 0%, 60%)" }}>
                Move your mouse or touch to control the paddle
              </div>

              {!isFullscreen && highScores.length > 0 && <HighScoreTable scores={highScores} />}
            </>
          )}
        </>
      )}
    </div>
  );
};
