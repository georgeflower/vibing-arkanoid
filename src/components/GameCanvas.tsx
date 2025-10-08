import { forwardRef, useEffect } from "react";
import type { Brick, Ball, Paddle, GameState } from "./Game";

interface GameCanvasProps {
  width: number;
  height: number;
  bricks: Brick[];
  ball: Ball | null;
  paddle: Paddle | null;
  gameState: GameState;
}

export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ width, height, bricks, ball, paddle, gameState }, ref) => {
    useEffect(() => {
      const canvas = ref as React.RefObject<HTMLCanvasElement>;
      if (!canvas.current) return;

      const ctx = canvas.current.getContext("2d");
      if (!ctx) return;

      const render = () => {
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

        // Draw ball
        if (ball) {
          ctx.shadowBlur = 25;
          ctx.shadowColor = "hsl(330, 100%, 65%)";
          ctx.fillStyle = "hsl(330, 100%, 65%)";
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Ball highlight
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
          ctx.beginPath();
          ctx.arc(ball.x - 2, ball.y - 2, ball.radius / 2, 0, Math.PI * 2);
          ctx.fill();
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
      };

      const animate = () => {
        render();
        requestAnimationFrame(animate);
      };

      animate();
    }, [ref, width, height, bricks, ball, paddle, gameState]);

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
