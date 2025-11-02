import { useEffect, useRef, useState, useCallback } from "react";
import { GameCanvas } from "./GameCanvas";
import { GameUI } from "./GameUI";
import { HighScoreTable } from "./HighScoreTable";
import { HighScoreEntry } from "./HighScoreEntry";
import { HighScoreDisplay } from "./HighScoreDisplay";
import { toast } from "sonner";
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
  getBrickColors
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
  const launchAngleDirectionRef = useRef(1);
  const animationFrameRef = useRef<number>();
  const nextBallId = useRef(1);
  const nextEnemyId = useRef(1);
  const timerIntervalRef = useRef<NodeJS.Timeout>();
  const bombIntervalsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const launchAngleIntervalRef = useRef<NodeJS.Timeout>();

  const { highScores, isHighScore, addHighScore } = useHighScores();

  const { powerUps, createPowerUp, updatePowerUps, checkPowerUpCollision, setPowerUps } = usePowerUps(level, setLives);
  const { bullets, setBullets, fireBullets, updateBullets } = useBullets(setScore, setBricks, bricks, enemies);

  const initBricksForLevel = useCallback((currentLevel: number) => {
    const layoutIndex = ((currentLevel - 1) % 10);
    const layout = levelLayouts[layoutIndex];
    const levelColors = getBrickColors(currentLevel);
    
    const newBricks: Brick[] = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        if (layout[row][col]) {
          const hasPowerUp = Math.random() < POWERUP_DROP_CHANCE;
          const maxHits = getBrickHits(currentLevel, row);
          const baseColor = levelColors[row % levelColors.length];
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
    };
    setBalls([initialBall]);
    setLaunchAngle(-60); // Start from left side
    launchAngleDirectionRef.current = 1; // Move right initially

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
    bombIntervalsRef.current.forEach(interval => clearInterval(interval));
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
    bombIntervalsRef.current.forEach(interval => clearInterval(interval));
    bombIntervalsRef.current.clear();
    
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
    bombIntervalsRef.current.forEach(interval => clearInterval(interval));
    bombIntervalsRef.current.clear();
    setGameState("playing");
    soundManager.playBackgroundMusic(newLevel);
    
    if (newLevel === 10) {
      toast.success(`Level ${newLevel}! New music unlocked!`);
    } else {
      toast.success(`Level ${newLevel}! Speed: ${Math.round(newSpeedMultiplier * 100)}%`);
    }
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
    // If game is ready, start the game first
    if (gameState === "ready" && bricks.length > 0) {
      const isLevelComplete = bricks.every(brick => !brick.visible) && bricks.length > 0;
      
      if (isLevelComplete) {
        nextLevel();
      } else {
        setGameState("playing");
        soundManager.playBackgroundMusic(level);
        toast.success("Click again to launch!");
      }
      return;
    }

    if (!paddle || gameState !== "playing") return;

    // Check if ball is waiting to launch
    const waitingBall = balls.find(ball => ball.waitingToLaunch);
    if (waitingBall) {
      // Launch ball in the direction of the current angle
      setBalls(prev => prev.map(ball => {
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
      }));
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
              waitingToLaunch: true,
            };
            setBalls([resetBall]);
            setLaunchAngle(-60); // Start from left side
            launchAngleDirectionRef.current = 1; // Move right initially
            setPowerUps([]);
            setPaddle(prev => prev ? { ...prev, hasTurrets: false } : null);
            setTimer(0);
            setEnemies([]);
            setBombs([]);
            setExplosions([]);
            bombIntervalsRef.current.forEach(interval => clearInterval(interval));
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
    setBackgroundPhase(prev => (prev + 1) % 360);

    // Update balls (only if not waiting to launch)
    setBalls(prev => prev.map(ball => {
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
      };
    }));

    // Update power-ups
    updatePowerUps();

    // Update bullets
    updateBullets(bricks);

    // Update enemies
    setEnemies(prev => prev.map(enemy => {
      let newX = enemy.x + enemy.dx;
      let newY = enemy.y + enemy.dy;
      let newDx = enemy.dx;
      let newDy = enemy.dy;
      
      // Sphere enemies have more random movement
      if (enemy.type === "sphere") {
        // Add some randomness to movement
        if (Math.random() < 0.05) {
          const randomAngle = (Math.random() - 0.5) * Math.PI / 4;
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
        rotationX: enemy.rotationX + (enemy.type === "sphere" ? 0.08 : 0.05),
        rotationY: enemy.rotationY + (enemy.type === "sphere" ? 0.12 : 0.08),
        rotationZ: enemy.rotationZ + (enemy.type === "sphere" ? 0.06 : 0.03),
      };
    }));

    // Check if balls hit enemies (bounce AND damage/destroy)
    const hitEnemies = new Set<number>();
    const currentEnemies = enemies; // Capture current enemies for collision detection
    setBalls(prevBalls => {
      let ballsUpdated = false;
      const newBalls = prevBalls.map(ball => {
        if (ball.waitingToLaunch) return ball;
        
        for (const enemy of currentEnemies) {
          if (ball.x + ball.radius > enemy.x &&
            ball.x - ball.radius < enemy.x + enemy.width &&
            ball.y + ball.radius > enemy.y &&
            ball.y - ball.radius < enemy.y + enemy.height) {
            // Mark enemy as hit
            if (enemy.id !== undefined) {
              hitEnemies.add(enemy.id);
            }
            
            // Bounce the ball
            soundManager.playBounce();
            ballsUpdated = true;
            
            // Determine which side was hit and bounce accordingly
            const ballCenterX = ball.x;
            const ballCenterY = ball.y;
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            
            const dx = ballCenterX - enemyCenterX;
            const dy = ballCenterY - enemyCenterY;
            
            // Bounce based on which side was hit
            if (Math.abs(dx) > Math.abs(dy)) {
              // Hit from left or right
              return { ...ball, dx: -ball.dx };
            } else {
              // Hit from top or bottom
              return { ...ball, dy: -ball.dy };
            }
          }
        }
        return ball;
      });
      
      return ballsUpdated ? newBalls : prevBalls;
    });

    // Process enemy hits
    if (hitEnemies.size > 0) {
      setEnemies(prev => {
        const updatedEnemies: typeof prev = [];
        
        prev.forEach(enemy => {
          if (enemy.id === undefined || !hitEnemies.has(enemy.id)) {
            // Enemy not hit, keep as is
            updatedEnemies.push(enemy);
            return;
          }
          
          // Handle sphere enemy (2 hits)
          if (enemy.type === "sphere") {
            const currentHits = enemy.hits || 0;
            if (currentHits === 0) {
              // First hit - make it angry and faster
              soundManager.playBounce();
              toast.warning("Sphere enemy is angry!");
              updatedEnemies.push({
                ...enemy,
                hits: 1,
                isAngry: true,
                speed: enemy.speed * 1.3,
                dx: enemy.dx * 1.3,
                dy: enemy.dy * 1.3,
              });
            } else {
              // Second hit - destroy it
              setExplosions(prev => [...prev, {
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                frame: 0,
                maxFrames: 20,
              }]);
              soundManager.playBrickHit();
              setScore(s => s + 200);
              toast.success("Sphere enemy destroyed! +200 points");
              // Clear bomb interval for this enemy
              const interval = bombIntervalsRef.current.get(enemy.id);
              if (interval) {
                clearInterval(interval);
                bombIntervalsRef.current.delete(enemy.id);
              }
              // Don't add to updatedEnemies (remove it)
            }
          } else {
            // Cube enemy - destroy on first hit
            setExplosions(prev => [...prev, {
              x: enemy.x + enemy.width / 2,
              y: enemy.y + enemy.height / 2,
              frame: 0,
              maxFrames: 20,
            }]);
            soundManager.playBrickHit();
            setScore(s => s + 100);
            toast.success("Enemy destroyed! +100 points");
            // Clear bomb interval for this enemy
            const interval = bombIntervalsRef.current.get(enemy.id);
            if (interval) {
              clearInterval(interval);
              bombIntervalsRef.current.delete(enemy.id);
            }
            // Don't add to updatedEnemies (remove it)
          }
        });
        
        return updatedEnemies;
      });
    }

    // Update explosions
    setExplosions(prev => prev.map(exp => ({
      ...exp,
      frame: exp.frame + 1,
    })).filter(exp => exp.frame < exp.maxFrames));

    // Update bombs and rockets with magnetic behavior
    setBombs(prev => prev.map(bomb => {
      let newX = bomb.x;
      let newY = bomb.y + bomb.speed;
      let newDx = bomb.dx || 0;
      
      // Rockets have magnetic behavior towards paddle only (1% attraction)
      if (bomb.type === "rocket" && paddle) {
        // 1% attraction towards paddle
        const paddleCenterX = paddle.x + paddle.width / 2;
        const toPaddleX = paddleCenterX - bomb.x;
        newDx += toPaddleX * 0.0001;
        
        // Apply horizontal movement
        newX += newDx;
        
        // Clamp to canvas bounds
        newX = Math.max(0, Math.min(CANVAS_WIDTH - bomb.width, newX));
      }
      
      return {
        ...bomb,
        x: newX,
        y: newY,
        dx: newDx,
      };
    }).filter(bomb => bomb.y < CANVAS_HEIGHT));

    // Check bomb-paddle collision
    if (paddle) {
      bombs.forEach(bomb => {
        if (bomb.x + bomb.width > paddle.x &&
          bomb.x < paddle.x + paddle.width &&
          bomb.y + bomb.height > paddle.y &&
          bomb.y < paddle.y + paddle.height) {
          // Bomb hit paddle - lose a life
          soundManager.playLoseLife();
          setBombs(prev => prev.filter(b => b.enemyId !== bomb.enemyId));
          
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
                waitingToLaunch: true,
              };
              setBalls([resetBall]);
              setLaunchAngle(-60);
              launchAngleDirectionRef.current = 1;
              setPowerUps([]);
              setPaddle(prev => prev ? { ...prev, hasTurrets: false } : null);
              setTimer(0);
              setLastEnemySpawnTime(0);
              setExplosions([]);
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
      bullets.forEach(bullet => {
        if (bullet.isBounced &&
          bullet.x + bullet.width > paddle.x &&
          bullet.x < paddle.x + paddle.width &&
          bullet.y + bullet.height > paddle.y &&
          bullet.y < paddle.y + paddle.height) {
          // Bounced bullet hit paddle - lose a life
          soundManager.playLoseLife();
          setBullets(prev => prev.filter(b => b !== bullet));
          
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
                waitingToLaunch: true,
              };
              setBalls([resetBall]);
              setLaunchAngle(-60);
              launchAngleDirectionRef.current = 1;
              setPowerUps([]);
              setPaddle(prev => prev ? { ...prev, hasTurrets: false } : null);
              setTimer(0);
              setLastEnemySpawnTime(0);
              setExplosions([]);
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
  }, [gameState, checkCollision, updatePowerUps, updateBullets, paddle, balls, checkPowerUpCollision, speedMultiplier, enemies, bombs, bricks, score, isHighScore, explosions]);

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
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      bombIntervalsRef.current.forEach(interval => clearInterval(interval));
      bombIntervalsRef.current.clear();
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      bombIntervalsRef.current.forEach(interval => clearInterval(interval));
      bombIntervalsRef.current.clear();
    };
  }, [gameState]);

  // Enemy spawn at regular intervals
  useEffect(() => {
    if (gameState === "playing" && timer > 0) {
      // Spawn interval decreases with level (30s at level 1, 20s at level 2, 15s at level 3+)
      const spawnInterval = Math.max(15, 30 - (level - 1) * 5);
      
      if (timer - lastEnemySpawnTime >= spawnInterval) {
        const speedIncrease = 1 + (enemySpawnCount * 0.3); // 30% faster each spawn
        const enemyId = nextEnemyId.current++;
        
        // Determine enemy type - sphere enemies from level 3+
        const enemyType: "cube" | "sphere" = level >= 3 && Math.random() > 0.5 ? "sphere" : "cube";
        
        let newEnemy: Enemy;
        
        if (enemyType === "sphere") {
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
        
        setEnemies(prev => [...prev, newEnemy]);
        setLastEnemySpawnTime(timer);
        setEnemySpawnCount(prev => prev + 1);
        toast.warning(`${enemyType === "sphere" ? "Sphere" : "Cube"} enemy ${enemySpawnCount + 1} appeared! Speed: ${Math.round(speedIncrease * 100)}%`);

        // Start dropping projectiles for this enemy
        const projectileInterval = setInterval(() => {
          setEnemies(currentEnemies => {
            const currentEnemy = currentEnemies.find(e => e.id === enemyId);
            if (!currentEnemy) {
              clearInterval(projectileInterval);
              bombIntervalsRef.current.delete(enemyId);
              return currentEnemies;
            }
            
            const newProjectile: Bomb = {
              x: currentEnemy.x + currentEnemy.width / 2 - (currentEnemy.type === "sphere" ? 10 : 5),
              y: currentEnemy.y + currentEnemy.height,
              width: currentEnemy.type === "sphere" ? 20 : 10,
              height: currentEnemy.type === "sphere" ? 20 : 10,
              speed: currentEnemy.type === "sphere" ? 1.5 : 3,
              enemyId: enemyId,
              type: currentEnemy.type === "sphere" ? "rocket" : "bomb",
              dx: 0, // Initialize horizontal velocity for rockets
            };
            setBombs(prev => [...prev, newProjectile]);
            return currentEnemies;
          });
        }, 2000);
        bombIntervalsRef.current.set(enemyId, projectileInterval);
      }
    }
  }, [timer, gameState, lastEnemySpawnTime, enemySpawnCount, level]);

  // Animate launch angle indicator - continues until ball leaves paddle area
  useEffect(() => {
    const waitingBall = balls.find(ball => ball.waitingToLaunch);
    const ballOnPaddle = paddle && balls.some(ball => 
      Math.abs(ball.y - (paddle.y - ball.radius - 5)) < 10 && 
      Math.abs(ball.x - (paddle.x + paddle.width / 2)) < paddle.width / 2 + ball.radius
    );
    const shouldAnimate = (gameState === "playing" || gameState === "ready") && (waitingBall || ballOnPaddle);
    
    // Only manage interval when animation state changes
    if (shouldAnimate && !launchAngleIntervalRef.current) {
      // Start animation
      launchAngleIntervalRef.current = setInterval(() => {
        setLaunchAngle(prev => {
          // Oscillate between -60 and 60 degrees
          let newAngle = prev + (launchAngleDirectionRef.current * 2);
          
          // Reverse direction at boundaries
          if (newAngle >= 60) {
            newAngle = 60;
            launchAngleDirectionRef.current = -1;
          } else if (newAngle <= -60) {
            newAngle = -60;
            launchAngleDirectionRef.current = 1;
          }
          
          return newAngle;
        });
      }, 20);
    } else if (!shouldAnimate && launchAngleIntervalRef.current) {
      // Stop animation
      clearInterval(launchAngleIntervalRef.current);
      launchAngleIntervalRef.current = null;
    }

    return () => {
      if (launchAngleIntervalRef.current) {
        clearInterval(launchAngleIntervalRef.current);
        launchAngleIntervalRef.current = null;
      }
    };
  }, [gameState, balls]);

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
        soundManager.playBackgroundMusic(level);
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      {showHighScoreDisplay ? (
        <HighScoreDisplay scores={highScores} onClose={handleCloseHighScoreDisplay} />
      ) : (
        <>
          <h1 className="text-5xl font-bold neon-text text-neon-cyan">
            NEON BREAKER
          </h1>
          
          {showHighScoreEntry ? (
            <HighScoreEntry
              score={score}
              level={level}
              onSubmit={handleHighScoreSubmit}
            />
          ) : (
            <>
              <GameUI score={score} lives={lives} level={level} timer={timer} speed={speedMultiplier} />
          
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
          
          {highScores.length > 0 && (
            <HighScoreTable scores={highScores} />
          )}
            </>
          )}
        </>
      )}
    </div>
  );
};
