import { forwardRef, useEffect, useRef } from "react";
import type { Brick, Ball, Paddle, GameState, PowerUp, Bullet, Enemy, Bomb } from "@/types/game";
import { powerUpImages } from "@/utils/powerUpImages";
import paddleImg from "@/assets/paddle.png";

interface GameCanvasProps {
  width: number;
  height: number;
  bricks: Brick[];
  balls: Ball[];
  paddle: Paddle | null;
  gameState: GameState;
  powerUps: PowerUp[];
  bullets: Bullet[];
  enemy: Enemy | null;
  bombs: Bomb[];
  level: number;
  backgroundPhase: number;
}

export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ width, height, bricks, balls, paddle, gameState, powerUps, bullets, enemy, bombs, level, backgroundPhase }, ref) => {
    const loadedImagesRef = useRef<Record<string, HTMLImageElement>>({});
    const paddleImageRef = useRef<HTMLImageElement | null>(null);
    
    // Load power-up images and paddle image
    useEffect(() => {
      Object.entries(powerUpImages).forEach(([type, src]) => {
        const img = new Image();
        img.src = src;
        loadedImagesRef.current[type] = img;
      });
      
      const paddleImage = new Image();
      paddleImage.src = paddleImg;
      paddleImageRef.current = paddleImage;
    }, []);

    useEffect(() => {
      const canvas = ref as React.RefObject<HTMLCanvasElement>;
      if (!canvas.current) return;

      const ctx = canvas.current.getContext("2d");
      if (!ctx) return;

      // Clear canvas - retro Amiga background
      ctx.fillStyle = "hsl(220, 25%, 12%)";
      ctx.fillRect(0, 0, width, height);

      // Draw animated retro background (changes every 5 levels)
      const backgroundStyle = Math.floor((level - 1) / 5) % 4;
      ctx.strokeStyle = "rgba(100, 180, 255, 0.15)";
      ctx.lineWidth = 2;

      if (backgroundStyle === 0) {
        // Style 1: Grid pattern
        for (let i = 0; i < width; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i + (backgroundPhase % 40), 0);
          ctx.lineTo(i + (backgroundPhase % 40), height);
          ctx.stroke();
        }
        for (let i = 0; i < height; i += 40) {
          ctx.beginPath();
          ctx.moveTo(0, i + (backgroundPhase % 40));
          ctx.lineTo(width, i + (backgroundPhase % 40));
          ctx.stroke();
        }
      } else if (backgroundStyle === 1) {
        // Style 2: Diagonal lines
        ctx.strokeStyle = "rgba(255, 100, 180, 0.15)";
        for (let i = -height; i < width + height; i += 30) {
          ctx.beginPath();
          ctx.moveTo(i + (backgroundPhase * 2) % 60, 0);
          ctx.lineTo(i + (backgroundPhase * 2) % 60 - height, height);
          ctx.stroke();
        }
      } else if (backgroundStyle === 2) {
        // Style 3: Circles
        ctx.strokeStyle = "rgba(100, 255, 180, 0.15)";
        const centerX = width / 2;
        const centerY = height / 2;
        for (let r = 50; r < width; r += 60) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, r + (backgroundPhase % 60), 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        // Style 4: Sine waves
        ctx.strokeStyle = "rgba(255, 180, 100, 0.15)";
        for (let y = 50; y < height; y += 60) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          for (let x = 0; x < width; x += 10) {
            const wave = Math.sin((x + backgroundPhase * 3) * 0.02) * 20;
            ctx.lineTo(x, y + wave);
          }
          ctx.stroke();
        }
      }

      // Draw bricks with 16-bit Turrican 2 style texture
      bricks.forEach((brick) => {
        if (brick.visible) {
          // Base brick color with glow
          ctx.shadowBlur = 8;
          ctx.shadowColor = brick.color;
          ctx.fillStyle = brick.color;
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
          
          // Top highlight
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
          ctx.fillRect(brick.x, brick.y, brick.width, 3);
          
          // Left highlight
          ctx.fillRect(brick.x, brick.y, 3, brick.height);
          
          // Bottom shadow
          ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
          ctx.fillRect(brick.x, brick.y + brick.height - 3, brick.width, 3);
          
          // Right shadow
          ctx.fillRect(brick.x + brick.width - 3, brick.y, 3, brick.height);
          
          // 16-bit pixel pattern texture (Turrican 2 style)
          ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
          for (let py = brick.y + 4; py < brick.y + brick.height - 4; py += 4) {
            for (let px = brick.x + 4; px < brick.x + brick.width - 4; px += 4) {
              if ((px + py) % 8 === 0) {
                ctx.fillRect(px, py, 2, 2);
              }
            }
          }
          
          // Draw hit counter for multi-hit bricks
          if (brick.maxHits > 1) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.font = "bold 12px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(brick.hitsRemaining.toString(), brick.x + brick.width / 2, brick.y + brick.height / 2);
          }
        }
      });

      // Draw paddle
      if (paddle) {
        const img = paddleImageRef.current;
        if (img && img.complete) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = "hsl(200, 70%, 50%)";
          ctx.drawImage(img, paddle.x, paddle.y, paddle.width, paddle.height);
        } else {
          // Fallback while image loads
          ctx.shadowBlur = 12;
          ctx.shadowColor = "hsl(200, 70%, 50%)";
          ctx.fillStyle = "hsl(200, 70%, 50%)";
          ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
          
          // Paddle highlight
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
          ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height / 2);
        }
      }

      // Draw balls
      balls.forEach((ball) => {
        const ballColor = ball.isFireball ? "hsl(30, 85%, 55%)" : "hsl(330, 70%, 55%)";
        
        ctx.shadowBlur = 14;
        ctx.shadowColor = ballColor;
        ctx.fillStyle = ballColor;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Ball highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(ball.x - 1.5, ball.y - 1.5, ball.radius / 2, 0, Math.PI * 2);
        ctx.fill();

        // Fireball trail effect
        if (ball.isFireball) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = "hsl(30, 85%, 55%)";
          ctx.fillStyle = "hsla(30, 85%, 55%, 0.25)";
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw power-ups
      powerUps.forEach((powerUp) => {
        if (!powerUp.active) return;

        const img = loadedImagesRef.current[powerUp.type];
        if (img && img.complete) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = "hsl(280, 60%, 55%)";
          ctx.drawImage(img, powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        } else {
          // Fallback to colored square while image loads
          ctx.shadowBlur = 10;
          ctx.shadowColor = "hsl(280, 60%, 55%)";
          ctx.fillStyle = "hsl(280, 60%, 55%)";
          ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        }
      });

      // Draw bullets
      bullets.forEach((bullet) => {
        ctx.shadowBlur = 8;
        ctx.shadowColor = "hsl(200, 70%, 50%)";
        ctx.fillStyle = "hsl(200, 70%, 50%)";
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      });

      // Draw turrets on paddle
      if (paddle && paddle.hasTurrets) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = "hsl(30, 85%, 55%)";
        ctx.fillStyle = "hsl(30, 85%, 55%)";
        ctx.fillRect(paddle.x + 5, paddle.y - 10, 8, 10);
        ctx.fillRect(paddle.x + paddle.width - 13, paddle.y - 10, 8, 10);
      }

      // Draw enemy
      if (enemy) {
        ctx.save();
        ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        ctx.rotate(enemy.rotation);
        
        ctx.shadowBlur = 12;
        ctx.shadowColor = "hsl(0, 85%, 55%)";
        ctx.fillStyle = "hsl(0, 85%, 55%)";
        ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        
        // Enemy pattern
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(-enemy.width / 4, -enemy.height / 4, enemy.width / 2, enemy.height / 2);
        
        ctx.restore();
      }

      // Draw bombs
      bombs.forEach((bomb) => {
        ctx.shadowBlur = 8;
        ctx.shadowColor = "hsl(0, 85%, 55%)";
        ctx.fillStyle = "hsl(0, 85%, 55%)";
        ctx.beginPath();
        ctx.arc(bomb.x + bomb.width / 2, bomb.y + bomb.height / 2, bomb.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Bomb highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath();
        ctx.arc(bomb.x + bomb.width / 2 - 2, bomb.y + bomb.height / 2 - 2, bomb.width / 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Game state overlay
      if (gameState !== "playing") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, width, height);
        
        ctx.shadowBlur = 12;
        ctx.shadowColor = "hsl(280, 60%, 55%)";
        ctx.fillStyle = "hsl(280, 60%, 55%)";
        ctx.font = "bold 32px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        if (gameState === "ready") {
          ctx.fillText("READY TO PLAY", width / 2, height / 2);
        } else if (gameState === "gameOver") {
          ctx.shadowColor = "hsl(0, 75%, 55%)";
          ctx.fillStyle = "hsl(0, 75%, 55%)";
          ctx.fillText("GAME OVER", width / 2, height / 2);
        } else if (gameState === "won") {
          ctx.shadowColor = "hsl(120, 60%, 45%)";
          ctx.fillStyle = "hsl(120, 60%, 45%)";
          ctx.fillText("YOU WON!", width / 2, height / 2);
        }
      }
    }, [ref, width, height, bricks, balls, paddle, gameState, powerUps, bullets, enemy, bombs, level, backgroundPhase]);

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
