import { useEffect, useRef, useState, useCallback } from "react";
import { GameCanvas } from "./GameCanvas";
import { GameUI } from "./GameUI";
import { toast } from "sonner";
import type { Brick, Ball, Paddle, GameState } from "@/types/game";
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
  getHitColor
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
  const animationFrameRef = useRef<number>();
  const nextBallId = useRef(1);

  const { powerUps, createPowerUp, updatePowerUps, checkPowerUpCollision, setPowerUps } = usePowerUps(level, setLives);
  const { bullets, fireBullets, updateBullets } = useBullets(setScore, setBricks, bricks);

  const initBricksForLevel = useCallback((currentLevel: number) => {
    const layoutIndex = ((currentLevel - 1) % 10);
    const layout = levelLayouts[layoutIndex];
    
    const newBricks: Brick[] = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        if (layout[row][col]) {
          const hasPowerUp = Math.random() < POWERUP_DROP_CHANCE;
          const maxHits = getBrickHits(currentLevel, row);
          const baseColor = brickColors[row % brickColors.length];
          newBricks.push({
            x: col * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT,
            y: row * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
            width: BRICK_WIDTH,
            height: BRICK_HEIGHT,
            color: baseColor,
            visible: true,
            points: (BRICK_ROWS - row) * 10 * maxHits,
            hasPowerUp,
            maxHits,
            hitsRemaining: maxHits,
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

    // Initialize ball with speed multiplier
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
    };
    setBalls([initialBall]);

    // Initialize bricks for level 1
    setBricks(initBricksForLevel(1));
    setScore(0);
    setLives(3);
    setLevel(1);
    setSpeedMultiplier(1);
    setGameState("ready");
    setPowerUps([]);
  }, [setPowerUps, initBricksForLevel]);

  const nextLevel = useCallback(() => {
    // Cancel any running animation frame before starting new level
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    const newLevel = level + 1;
    const newSpeedMultiplier = 1 + ((newLevel - 1) * 0.05); // 5% faster per level
    
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

    // Initialize ball with new speed
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
    };
    setBalls([initialBall]);
    
    // Initialize bricks for new level
    setBricks(initBricksForLevel(newLevel));
    setPowerUps([]);
    setGameState("playing");
    
    toast.success(`Level ${newLevel}! Speed: ${Math.round(newSpeedMultiplier * 100)}%`);
  }, [level, initBricksForLevel, setPowerUps]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current || !paddle || gameState !== "playing") return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const newX = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, mouseX - PADDLE_WIDTH / 2));
    
    setPaddle(prev => prev ? { ...prev, x: newX } : null);
  }, [gameState, paddle]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!canvasRef.current || !paddle || gameState !== "playing") return;
    
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const newX = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, touchX - PADDLE_WIDTH / 2));
    
    setPaddle(prev => prev ? { ...prev, x: newX } : null);
  }, [gameState, paddle]);

  const handleClick = useCallback(() => {
    if (!paddle || gameState !== "playing") return;

    // Fire turrets
    if (paddle.hasTurrets) {
      fireBullets(paddle);
    }
  }, [paddle, gameState, fireBullets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("click", handleClick);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("click", handleClick);
    };
  }, [handleMouseMove, handleTouchMove, handleClick]);

  const checkCollision = useCallback(() => {
    if (!paddle || balls.length === 0) return;

    setBalls(prevBalls => {
      let updatedBalls = prevBalls.map(ball => {
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

        // Brick collision
        setBricks((prevBricks) => {
          let brickHit = false;
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
              
              // Only bounce if not fireball
              if (!newBall.isFireball) {
                newBall.dy = -newBall.dy;
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
                    setPowerUps(prev => [...prev, powerUp]);
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

          // Check win condition
          if (newBricks.every((brick) => !brick.visible)) {
            soundManager.playWin();
            setGameState("ready"); // Wait for click to start next level
            toast.success(`Level ${level} Complete! Click to continue.`);
          }

          return newBricks;
        });

        return newBall;
      }).filter(Boolean) as Ball[];

      // Check if all balls are lost
      if (updatedBalls.length === 0) {
        setLives((prev) => {
          const newLives = prev - 1;
          soundManager.playLoseLife();
          
          if (newLives <= 0) {
            setGameState("gameOver");
            toast.error("Game Over!");
          } else {
            // Reset ball and clear power-ups, but wait for click to continue
            const baseSpeed = 3 * speedMultiplier;
            const resetBall: Ball = {
              x: CANVAS_WIDTH / 2,
              y: CANVAS_HEIGHT - 60,
              dx: baseSpeed,
              dy: -baseSpeed,
              radius: BALL_RADIUS,
              speed: baseSpeed,
              id: nextBallId.current++,
              isFireball: false,
            };
            setBalls([resetBall]);
            setPowerUps([]);
            setPaddle(prev => prev ? { ...prev, hasTurrets: false } : null);
            setGameState("ready");
            toast(`Life lost! ${newLives} lives remaining. Click to continue.`);
          }
          return newLives;
        });
      }

      return updatedBalls;
    });
  }, [paddle, balls, createPowerUp, setPowerUps, nextLevel]);

  const gameLoop = useCallback(() => {
    if (gameState !== "playing") return;

    // Update balls
    setBalls(prev => prev.map(ball => ({
      ...ball,
      x: ball.x + ball.dx * speedMultiplier,
      y: ball.y + ball.dy * speedMultiplier,
    })));

    // Update power-ups
    updatePowerUps();

    // Update bullets
    updateBullets(bricks);

    // Check collisions
    checkCollision();

    // Check power-up collision
    if (paddle) {
      checkPowerUpCollision(paddle, balls, setBalls, setPaddle);
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, checkCollision, updatePowerUps, updateBullets, paddle, balls, checkPowerUpCollision, speedMultiplier]);

  useEffect(() => {
    if (gameState === "playing") {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, gameLoop]);

  const handleStart = () => {
    if (gameState === "ready") {
      // Check if this is level completion (all bricks destroyed)
      const isLevelComplete = bricks.every(brick => !brick.visible) && bricks.length > 0;
      
      if (isLevelComplete) {
        // Start next level
        nextLevel();
      } else {
        // Continue current level
        setGameState("playing");
        toast.success("Continue!");
      }
    }
  };

  const handleRestart = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    initGame();
    toast("Game Reset!");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      <h1 className="text-5xl font-bold neon-text text-neon-cyan">
        NEON BREAKER
      </h1>
      
      <GameUI score={score} lives={lives} level={level} />
      
      <div className="game-glow rounded-lg overflow-hidden">
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
        />
      </div>

      <div className="flex gap-4">
        {gameState === "ready" && (
          <button
            onClick={handleStart}
            className="px-8 py-3 bg-neon-purple text-white font-bold rounded-lg neon-text hover:scale-105 transition-transform"
          >
            {bricks.every(brick => !brick.visible) && level > 0 ? "NEXT LEVEL" : "START GAME"}
          </button>
        )}
        {(gameState === "gameOver" || gameState === "won") && (
          <button
            onClick={handleRestart}
            className="px-8 py-3 bg-neon-pink text-white font-bold rounded-lg neon-text hover:scale-105 transition-transform"
          >
            PLAY AGAIN
          </button>
        )}
      </div>

      <div className="text-muted-foreground text-sm text-center">
        Move your mouse or touch to control the paddle
      </div>
    </div>
  );
};
