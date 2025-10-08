import { useEffect, useRef, useState, useCallback } from "react";
import { GameCanvas } from "./GameCanvas";
import { GameUI } from "./GameUI";
import { toast } from "sonner";

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  visible: boolean;
  points: number;
}

export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  speed: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GameState = "ready" | "playing" | "paused" | "gameOver" | "won";

export const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<GameState>("ready");
  const [bricks, setBricks] = useState<Brick[]>([]);
  const ballRef = useRef<Ball | null>(null);
  const paddleRef = useRef<Paddle | null>(null);
  const animationFrameRef = useRef<number>();

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const PADDLE_WIDTH = 100;
  const PADDLE_HEIGHT = 12;
  const BALL_RADIUS = 8;
  const BRICK_ROWS = 5;
  const BRICK_COLS = 10;
  const BRICK_WIDTH = 70;
  const BRICK_HEIGHT = 25;
  const BRICK_PADDING = 10;
  const BRICK_OFFSET_TOP = 60;
  const BRICK_OFFSET_LEFT = 35;

  const brickColors = [
    "hsl(330, 100%, 65%)", // pink
    "hsl(30, 100%, 60%)",  // orange
    "hsl(280, 100%, 70%)", // purple
    "hsl(180, 100%, 60%)", // cyan
    "hsl(120, 100%, 60%)", // green
  ];

  const initGame = useCallback(() => {
    // Initialize paddle
    paddleRef.current = {
      x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: CANVAS_HEIGHT - 40,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    };

    // Initialize ball
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 60,
      dx: 3,
      dy: -3,
      radius: BALL_RADIUS,
      speed: 3,
    };

    // Initialize bricks
    const newBricks: Brick[] = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        newBricks.push({
          x: col * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT,
          y: row * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          color: brickColors[row],
          visible: true,
          points: (BRICK_ROWS - row) * 10,
        });
      }
    }
    setBricks(newBricks);
    setScore(0);
    setLives(3);
    setGameState("ready");
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current || !paddleRef.current || gameState !== "playing") return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    paddleRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, mouseX - PADDLE_WIDTH / 2));
  }, [gameState, CANVAS_WIDTH, PADDLE_WIDTH]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!canvasRef.current || !paddleRef.current || gameState !== "playing") return;
    
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    paddleRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, touchX - PADDLE_WIDTH / 2));
  }, [gameState, CANVAS_WIDTH, PADDLE_WIDTH]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchmove", handleTouchMove);
    };
  }, [handleMouseMove, handleTouchMove]);

  const checkCollision = useCallback(() => {
    const ball = ballRef.current;
    const paddle = paddleRef.current;
    if (!ball || !paddle) return;

    // Wall collision
    if (ball.x + ball.dx > CANVAS_WIDTH - ball.radius || ball.x + ball.dx < ball.radius) {
      ball.dx = -ball.dx;
    }
    if (ball.y + ball.dy < ball.radius) {
      ball.dy = -ball.dy;
    }

    // Paddle collision
    if (
      ball.y + ball.dy > paddle.y - ball.radius &&
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.width &&
      ball.dy > 0
    ) {
      const hitPos = (ball.x - paddle.x) / paddle.width;
      const angle = (hitPos - 0.5) * Math.PI * 0.6;
      const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
      ball.dx = speed * Math.sin(angle);
      ball.dy = -speed * Math.cos(angle);
    }

    // Bottom collision (lose life)
    if (ball.y + ball.dy > CANVAS_HEIGHT - ball.radius) {
      setLives((prev) => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState("gameOver");
          toast.error("Game Over!");
        } else {
          // Reset ball
          ball.x = CANVAS_WIDTH / 2;
          ball.y = CANVAS_HEIGHT - 60;
          ball.dx = 3;
          ball.dy = -3;
          toast("Life lost!");
        }
        return newLives;
      });
    }

    // Brick collision
    setBricks((prevBricks) => {
      let brickHit = false;
      const newBricks = prevBricks.map((brick) => {
        if (
          !brickHit &&
          brick.visible &&
          ball.x + ball.radius > brick.x &&
          ball.x - ball.radius < brick.x + brick.width &&
          ball.y + ball.radius > brick.y &&
          ball.y - ball.radius < brick.y + brick.height
        ) {
          brickHit = true;
          ball.dy = -ball.dy;
          setScore((prev) => prev + brick.points);
          return { ...brick, visible: false };
        }
        return brick;
      });

      // Check win condition
      if (newBricks.every((brick) => !brick.visible)) {
        setGameState("won");
        toast.success("You Won! 🎉");
      }

      return newBricks;
    });
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  const gameLoop = useCallback(() => {
    const ball = ballRef.current;
    if (!ball || gameState !== "playing") return;

    checkCollision();
    ball.x += ball.dx;
    ball.y += ball.dy;

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, checkCollision]);

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
      setGameState("playing");
      toast.success("Game Started!");
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
      
      <GameUI score={score} lives={lives} />
      
      <div className="game-glow rounded-lg overflow-hidden">
        <GameCanvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          bricks={bricks}
          ball={ballRef.current}
          paddle={paddleRef.current}
          gameState={gameState}
        />
      </div>

      <div className="flex gap-4">
        {gameState === "ready" && (
          <button
            onClick={handleStart}
            className="px-8 py-3 bg-neon-purple text-white font-bold rounded-lg neon-text hover:scale-105 transition-transform"
          >
            START GAME
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
