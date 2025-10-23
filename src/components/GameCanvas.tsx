import { forwardRef, useEffect } from "react";
import type { Brick, Ball, Paddle, GameState, PowerUp, Bullet } from "@/types/game";

interface GameCanvasProps {
  width: number;
  height: number;
  bricks: Brick[];
  balls: Ball[];
  paddle: Paddle | null;
  gameState: GameState;
  powerUps: PowerUp[];
  bullets: Bullet[];
}

export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ width, height, bricks, balls, paddle, gameState, powerUps, bullets }, ref) => {
    useEffect(() => {
      const canvas = ref as React.RefObject<HTMLCanvasElement>;
      if (!canvas.current) return;

      const ctx = canvas.current.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.fillStyle = "hsl(250, 40%, 8%)";
      ctx.fillRect(0, 0, width, height);

      // Draw bricks
      bricks.forEach((brick) => {
        if (brick.visible) {
          // Glow effect
          ctx.shadowBlur = 15;
          ctx.shadowColor = brick.color;
          ctx.fillStyle = brick.color;
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
          
          // Inner highlight
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height / 3);
        }
      });

      // Draw paddle
      if (paddle) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = "hsl(180, 100%, 60%)";
        ctx.fillStyle = "hsl(180, 100%, 60%)";
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
        
        // Paddle highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height / 2);
      }

      // Draw balls
      balls.forEach((ball) => {
        const ballColor = ball.isFireball ? "hsl(30, 100%, 60%)" : "hsl(330, 100%, 65%)";
        
        ctx.shadowBlur = 25;
        ctx.shadowColor = ballColor;
        ctx.fillStyle = ballColor;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Ball highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.beginPath();
        ctx.arc(ball.x - 2, ball.y - 2, ball.radius / 2, 0, Math.PI * 2);
        ctx.fill();

        // Fireball trail effect
        if (ball.isFireball) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = "hsl(30, 100%, 60%)";
          ctx.fillStyle = "hsla(30, 100%, 60%, 0.3)";
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw power-ups
      powerUps.forEach((powerUp) => {
        if (!powerUp.active) return;

        ctx.shadowBlur = 15;
        ctx.shadowColor = "hsl(280, 100%, 70%)";
        ctx.fillStyle = "hsl(280, 100%, 70%)";
        ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
      });

      // Draw bullets
      bullets.forEach((bullet) => {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "hsl(180, 100%, 60%)";
        ctx.fillStyle = "hsl(180, 100%, 60%)";
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      });

      // Draw turrets on paddle
      if (paddle && paddle.hasTurrets) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "hsl(30, 100%, 60%)";
        ctx.fillStyle = "hsl(30, 100%, 60%)";
        ctx.fillRect(paddle.x + 5, paddle.y - 10, 8, 10);
        ctx.fillRect(paddle.x + paddle.width - 13, paddle.y - 10, 8, 10);
      }

      // Game state overlay
      if (gameState !== "playing") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, width, height);
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = "hsl(280, 100%, 70%)";
        ctx.fillStyle = "hsl(280, 100%, 70%)";
        ctx.font = "bold 32px Inter";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        if (gameState === "ready") {
          ctx.fillText("READY TO PLAY", width / 2, height / 2);
        } else if (gameState === "gameOver") {
          ctx.shadowColor = "hsl(0, 100%, 60%)";
          ctx.fillStyle = "hsl(0, 100%, 60%)";
          ctx.fillText("GAME OVER", width / 2, height / 2);
        } else if (gameState === "won") {
          ctx.shadowColor = "hsl(120, 100%, 60%)";
          ctx.fillStyle = "hsl(120, 100%, 60%)";
          ctx.fillText("YOU WON!", width / 2, height / 2);
        }
      }
    }, [ref, width, height, bricks, balls, paddle, gameState, powerUps, bullets]);

    return (
      <canvas
        ref={ref}
        width={width}
        height={height}
        className="cursor-none"
        style={{ display: "block" }}
      />
    );
  }
);

GameCanvas.displayName = "GameCanvas";
