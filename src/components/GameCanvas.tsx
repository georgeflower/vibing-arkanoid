import { forwardRef, useEffect, useRef } from "react";
import type { Brick, Ball, Paddle, GameState, PowerUp, Bullet, Enemy, Bomb, Explosion } from "@/types/game";
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
  enemy: Enemy[];
  bombs: Bomb[];
  level: number;
  backgroundPhase: number;
  explosions: Explosion[];
  launchAngle: number;
}

export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ width, height, bricks, balls, paddle, gameState, powerUps, bullets, enemy, bombs, level, backgroundPhase, explosions, launchAngle }, ref) => {
    const loadedImagesRef = useRef<Record<string, HTMLImageElement>>({});
    const paddleImageRef = useRef<HTMLImageElement | null>(null);
    const bgRotationRef = useRef(0);
    const bgZoomRef = useRef(1);
    const rotationSpeedRef = useRef(0.5);
    const zoomSpeedRef = useRef(0.3);
    const zoomDirectionRef = useRef(1);
    const dashOffsetRef = useRef(0);
    
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

        // Draw launch indicator if ball is waiting to launch
        if (ball.waitingToLaunch) {
          const angle = (launchAngle * Math.PI) / 180;
          const lineLength = 100;
          const endX = ball.x + Math.sin(angle) * lineLength;
          const endY = ball.y - Math.cos(angle) * lineLength;
          
          // Animate dash offset for moving dots effect
          dashOffsetRef.current = (dashOffsetRef.current + 1) % 20;
          
          // Draw dotted line
          ctx.shadowBlur = 10;
          ctx.shadowColor = "hsl(0, 85%, 55%)";
          ctx.strokeStyle = "hsl(0, 85%, 55%)";
          ctx.lineWidth = 4;
          ctx.setLineDash([8, 8]);
          ctx.lineDashOffset = -dashOffsetRef.current;
          ctx.beginPath();
          ctx.moveTo(ball.x, ball.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          ctx.setLineDash([]); // Reset dash pattern
          ctx.lineDashOffset = 0;
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
        if (bullet.isBounced) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = "hsl(0, 85%, 55%)";
          ctx.fillStyle = "hsl(0, 85%, 55%)";
        } else {
          ctx.shadowBlur = 8;
          ctx.shadowColor = "hsl(200, 70%, 50%)";
          ctx.fillStyle = "hsl(200, 70%, 50%)";
        }
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

      // Draw enemies (cubes and spheres)
      enemy.forEach((singleEnemy) => {
        ctx.save();
        const centerX = singleEnemy.x + singleEnemy.width / 2;
        const centerY = singleEnemy.y + singleEnemy.height / 2;
        
        if (singleEnemy.type === "sphere") {
          // Draw 3D rotating sphere with 16-bit texture
          const radius = singleEnemy.width / 2;
          
          // Determine color based on state
          let baseColor = "hsl(200, 70%, 50%)";
          if (singleEnemy.isAngry) {
            // Blinking red when angry
            const blinkPhase = Math.floor(Date.now() / 150) % 2;
            baseColor = blinkPhase === 0 ? "hsl(0, 85%, 55%)" : "hsl(0, 75%, 40%)";
          }
          
          // Draw sphere with rotation-based shading
          const gradient = ctx.createRadialGradient(
            centerX - radius * 0.3,
            centerY - radius * 0.3,
            0,
            centerX,
            centerY,
            radius
          );
          gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
          gradient.addColorStop(0.5, baseColor);
          gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");
          
          ctx.shadowBlur = 15;
          ctx.shadowColor = baseColor;
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Add 16-bit pixel texture pattern
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
          const pixelSize = 4;
          for (let py = -radius; py < radius; py += pixelSize) {
            for (let px = -radius; px < radius; px += pixelSize) {
              // Check if pixel is within sphere
              if (px * px + py * py < radius * radius) {
                // Rotate pixel coordinates
                const rotatedX = px * Math.cos(singleEnemy.rotationY) - py * Math.sin(singleEnemy.rotationY);
                const rotatedY = px * Math.sin(singleEnemy.rotationY) + py * Math.cos(singleEnemy.rotationY);
                
                if ((Math.floor(rotatedX / pixelSize) + Math.floor(rotatedY / pixelSize)) % 3 === 0) {
                  ctx.fillRect(centerX + px, centerY + py, 2, 2);
                }
              }
            }
          }
          
          // Draw angry expression if angry
          if (singleEnemy.isAngry) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
            ctx.lineWidth = 2;
            
            // Angry eyes (V shape)
            ctx.beginPath();
            ctx.moveTo(centerX - 8, centerY - 5);
            ctx.lineTo(centerX - 5, centerY);
            ctx.moveTo(centerX + 8, centerY - 5);
            ctx.lineTo(centerX + 5, centerY);
            ctx.stroke();
            
            // Angry mouth (down curve)
            ctx.beginPath();
            ctx.arc(centerX, centerY + 8, 6, 0.2 * Math.PI, 0.8 * Math.PI);
            ctx.stroke();
          }
        } else {
          // Draw cube enemy (existing code)
          const size = singleEnemy.width;
          const depth = size * 0.7;
          
          // Simple 3D projection
          const cos = Math.cos(singleEnemy.rotationY);
          const sin = Math.sin(singleEnemy.rotationY);
          const cosX = Math.cos(singleEnemy.rotationX);
          const sinX = Math.sin(singleEnemy.rotationX);
          
          // Define cube vertices (x, y, z)
          const vertices = [
            [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], // back face
            [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]  // front face
          ];
          
          // Project 3D vertices to 2D
          const projected = vertices.map(([x, y, z]) => {
            // Apply rotation
            const rx = x;
            const ry = y * cosX - z * sinX;
            const rz = y * sinX + z * cosX;
            
            const rx2 = rx * cos - rz * sin;
            const rz2 = rx * sin + rz * cos;
            
            // Apply size and position
            return [
              centerX + rx2 * size / 2,
              centerY + ry * size / 2,
              rz2
            ];
          });
          
          // Draw faces (back to front for proper depth)
          const faces = [
            { indices: [0, 1, 2, 3], color: "hsl(0, 75%, 40%)" }, // back
            { indices: [0, 3, 7, 4], color: "hsl(0, 80%, 45%)" }, // left
            { indices: [1, 5, 6, 2], color: "hsl(0, 80%, 50%)" }, // right
            { indices: [0, 1, 5, 4], color: "hsl(0, 85%, 45%)" }, // bottom
            { indices: [3, 2, 6, 7], color: "hsl(0, 85%, 55%)" }, // top
            { indices: [4, 5, 6, 7], color: "hsl(0, 90%, 60%)" }  // front
          ];
          
          // Sort faces by average z-depth
          const sortedFaces = faces.map(face => ({
            ...face,
            avgZ: face.indices.reduce((sum, i) => sum + projected[i][2], 0) / 4
          })).sort((a, b) => a.avgZ - b.avgZ);
          
          // Draw each face
          sortedFaces.forEach(face => {
            ctx.shadowBlur = 15;
            ctx.shadowColor = "hsl(0, 85%, 55%)";
            ctx.fillStyle = face.color;
            ctx.beginPath();
            ctx.moveTo(projected[face.indices[0]][0], projected[face.indices[0]][1]);
            face.indices.forEach(i => {
              ctx.lineTo(projected[i][0], projected[i][1]);
            });
            ctx.closePath();
            ctx.fill();
            
            // Add edge lines
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          });
        }
        
        ctx.restore();
      });

      // Draw explosions
      explosions.forEach((explosion) => {
        const progress = explosion.frame / explosion.maxFrames;
        const radius = 15 * (1 + progress * 2);
        const alpha = 1 - progress;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Outer ring
        ctx.shadowBlur = 20;
        ctx.shadowColor = `hsla(30, 100%, 50%, ${alpha})`;
        ctx.strokeStyle = `hsla(30, 100%, 50%, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner glow
        ctx.fillStyle = `hsla(60, 100%, 60%, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Particles
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + progress * Math.PI;
          const dist = radius * 0.8;
          const px = explosion.x + Math.cos(angle) * dist;
          const py = explosion.y + Math.sin(angle) * dist;
          
          ctx.fillStyle = `hsla(${30 + i * 10}, 100%, 60%, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
      });

      // Draw bombs and rockets
      bombs.forEach((bomb) => {
        if (bomb.type === "rocket") {
          // Draw rocket with flame trail
          ctx.shadowBlur = 12;
          ctx.shadowColor = "hsl(30, 85%, 55%)";
          
          // Rocket body
          ctx.fillStyle = "hsl(0, 75%, 50%)";
          ctx.beginPath();
          ctx.moveTo(bomb.x + bomb.width / 2, bomb.y);
          ctx.lineTo(bomb.x + bomb.width, bomb.y + bomb.height * 0.7);
          ctx.lineTo(bomb.x + bomb.width * 0.6, bomb.y + bomb.height * 0.7);
          ctx.lineTo(bomb.x + bomb.width * 0.6, bomb.y + bomb.height);
          ctx.lineTo(bomb.x + bomb.width * 0.4, bomb.y + bomb.height);
          ctx.lineTo(bomb.x + bomb.width * 0.4, bomb.y + bomb.height * 0.7);
          ctx.lineTo(bomb.x, bomb.y + bomb.height * 0.7);
          ctx.closePath();
          ctx.fill();
          
          // Rocket nose cone
          ctx.fillStyle = "hsl(0, 85%, 60%)";
          ctx.beginPath();
          ctx.moveTo(bomb.x + bomb.width / 2, bomb.y);
          ctx.lineTo(bomb.x + bomb.width, bomb.y + bomb.height * 0.4);
          ctx.lineTo(bomb.x, bomb.y + bomb.height * 0.4);
          ctx.closePath();
          ctx.fill();
          
          // Flame trail
          ctx.shadowBlur = 15;
          ctx.shadowColor = "hsl(30, 100%, 50%)";
          ctx.fillStyle = "hsla(30, 100%, 60%, 0.7)";
          ctx.beginPath();
          ctx.moveTo(bomb.x + bomb.width * 0.4, bomb.y + bomb.height);
          ctx.lineTo(bomb.x + bomb.width / 2, bomb.y + bomb.height + 8);
          ctx.lineTo(bomb.x + bomb.width * 0.6, bomb.y + bomb.height);
          ctx.fill();
        } else {
          // Draw regular bomb
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
        }
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
    }, [ref, width, height, bricks, balls, paddle, gameState, powerUps, bullets, enemy, bombs, level, backgroundPhase, explosions, launchAngle]);

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
