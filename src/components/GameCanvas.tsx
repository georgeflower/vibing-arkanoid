import { forwardRef, useEffect, useRef } from "react";
import type { Brick, Ball, Paddle, GameState, PowerUp, Bullet, Enemy, Bomb, Explosion, BonusLetter, BonusLetterType, Particle, Boss, BossAttack } from "@/types/game";
import type { QualitySettings } from "@/hooks/useAdaptiveQuality";
import { powerUpImages } from "@/utils/powerUpImages";
import { bonusLetterImages } from "@/utils/bonusLetterImages";
import paddleImg from "@/assets/paddle.png";
import paddleTurretsImg from "@/assets/paddle-turrets.png";

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
  bonusLetters: BonusLetter[];
  collectedLetters: Set<BonusLetterType>;
  screenShake: number;
  backgroundFlash: number;
  qualitySettings: QualitySettings;
  boss: Boss | null;
  resurrectedBosses: Boss[];
  bossAttacks: BossAttack[];
  laserWarnings: Array<{ x: number; startTime: number }>;
}

export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ width, height, bricks, balls, paddle, gameState, powerUps, bullets, enemy, bombs, level, backgroundPhase, explosions, launchAngle, bonusLetters, collectedLetters, screenShake, backgroundFlash, qualitySettings, boss, resurrectedBosses, bossAttacks, laserWarnings }, ref) => {
    const loadedImagesRef = useRef<Record<string, HTMLImageElement>>({});
    const bonusLetterImagesRef = useRef<Record<string, HTMLImageElement>>({});
    const paddleImageRef = useRef<HTMLImageElement | null>(null);
    const paddleTurretsImageRef = useRef<HTMLImageElement | null>(null);
    const bgRotationRef = useRef(0);
    const bgZoomRef = useRef(1);
    const rotationSpeedRef = useRef(0.5);
    const zoomSpeedRef = useRef(0.3);
    const zoomDirectionRef = useRef(1);
    const dashOffsetRef = useRef(0);
    
    // Helper function to check if image is valid and loaded
    const isImageValid = (img: HTMLImageElement | null): img is HTMLImageElement => {
      return !!(img && img.complete && img.naturalHeight !== 0);
    };
    
    // Load power-up images, bonus letter images, and paddle image
    useEffect(() => {
      Object.entries(powerUpImages).forEach(([type, src]) => {
        const img = new Image();
        img.src = src;
        loadedImagesRef.current[type] = img;
      });
      
      Object.entries(bonusLetterImages).forEach(([type, src]) => {
        const img = new Image();
        img.src = src;
        bonusLetterImagesRef.current[type] = img;
      });
      
      const paddleImage = new Image();
      paddleImage.src = paddleImg;
      paddleImageRef.current = paddleImage;
      
      const paddleTurretsImage = new Image();
      paddleTurretsImage.src = paddleTurretsImg;
      paddleTurretsImageRef.current = paddleTurretsImage;
    }, []);

    useEffect(() => {
      const canvas = ref as React.RefObject<HTMLCanvasElement>;
      if (!canvas.current) return;

      const ctx = canvas.current.getContext("2d");
      if (!ctx) return;

      // Apply screen shake
      ctx.save();
      if (screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake;
        const shakeY = (Math.random() - 0.5) * screenShake;
        ctx.translate(shakeX, shakeY);
      }

      // Clear canvas - retro Amiga background with flash
      const flashIntensity = backgroundFlash;
      const bgLightness = 12 + (flashIntensity * 40); // Flash makes background brighter
      ctx.fillStyle = `hsl(220, 25%, ${bgLightness}%)`;
      ctx.fillRect(0, 0, width, height);

      // Draw bricks with 16-bit Turrican 2 style texture
      bricks.forEach((brick) => {
        if (brick.visible) {
          // Reset shadow to prevent bleeding from other elements
          ctx.shadowBlur = 0;
          
          // Indestructible bricks - steel appearance
          if (brick.isIndestructible) {
            // Steel base color
            ctx.fillStyle = '#555555';
            ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            
            // Metallic highlight
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(200, 200, 200, 0.4)";
            ctx.fillRect(brick.x, brick.y, brick.width, 4);
            
            // Left metallic shine
            ctx.fillRect(brick.x, brick.y, 4, brick.height);
            
            // Darker bottom
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(brick.x, brick.y + brick.height - 4, brick.width, 4);
            
            // Right shadow
            ctx.fillRect(brick.x + brick.width - 4, brick.y, 4, brick.height);
            
            // Steel rivets pattern
            ctx.fillStyle = "rgba(100, 100, 100, 0.8)";
            const rivetSize = 3;
            const spacing = 12;
            for (let py = brick.y + spacing / 2; py < brick.y + brick.height; py += spacing) {
              for (let px = brick.x + spacing / 2; px < brick.x + brick.width; px += spacing) {
                ctx.beginPath();
                ctx.arc(px, py, rivetSize, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            
            // Diagonal hatching pattern
            ctx.strokeStyle = "rgba(150, 150, 150, 0.15)";
            ctx.lineWidth = 1;
            for (let i = 0; i < brick.width + brick.height; i += 6) {
              ctx.beginPath();
              ctx.moveTo(brick.x + i, brick.y);
              ctx.lineTo(brick.x, brick.y + i);
              ctx.stroke();
            }
          } else {
            // Normal brick - Base brick color
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
              ctx.font = "bold 12px 'Courier New', monospace";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(
                brick.hitsRemaining.toString(),
                brick.x + brick.width / 2,
                brick.y + brick.height / 2
              );
            }
          }
        }
      });

      // Draw paddle (always use regular paddle image, turrets drawn separately)
      if (paddle) {
        const img = paddleImageRef.current;
        
        if (isImageValid(img)) {
          if (qualitySettings.shadowsEnabled) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = "hsl(200, 70%, 50%)";
          }
          ctx.drawImage(img, paddle.x, paddle.y, paddle.width, paddle.height);
          ctx.shadowBlur = 0;
        } else {
          // Fallback while image loads
          if (qualitySettings.shadowsEnabled) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = "hsl(200, 70%, 50%)";
          }
          ctx.fillStyle = "hsl(200, 70%, 50%)";
          ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
          ctx.shadowBlur = 0;
          
          // Paddle highlight
          ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
          ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height / 2);
        }
      }

      // Draw balls
      balls.forEach((ball) => {
        const ballColor = ball.isFireball ? "hsl(30, 85%, 55%)" : "hsl(0, 0%, 70%)";
        const ballRotation = ball.rotation || 0;
        
        ctx.save();
        ctx.translate(ball.x, ball.y);
        
        // Create 3D sphere with gradient
        const gradient = ctx.createRadialGradient(
          -ball.radius * 0.3,
          -ball.radius * 0.3,
          0,
          0,
          0,
          ball.radius
        );
        
        if (ball.isFireball) {
          gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
          gradient.addColorStop(0.3, "hsl(30, 85%, 65%)");
          gradient.addColorStop(0.7, ballColor);
          gradient.addColorStop(1, "hsl(30, 85%, 35%)");
        } else {
          gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
          gradient.addColorStop(0.3, "hsl(0, 0%, 85%)");
          gradient.addColorStop(0.7, ballColor);
          gradient.addColorStop(1, "hsl(0, 0%, 40%)");
        }
        
        if (qualitySettings.shadowsEnabled) {
          ctx.shadowBlur = 14;
          ctx.shadowColor = ballColor;
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Retro spinning pattern - rotating horizontal bands
        if (!ball.isFireball) {
          ctx.shadowBlur = 0;
          ctx.rotate((ballRotation * Math.PI) / 180);
          ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
          for (let i = -ball.radius; i < ball.radius; i += 4) {
            const lineWidth = Math.sqrt(ball.radius * ball.radius - i * i) * 2;
            ctx.fillRect(-lineWidth / 2, i, lineWidth, 2);
          }
        }
        
        ctx.restore();

        // Fireball trail effect
        if (ball.isFireball && qualitySettings.glowEnabled) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = "hsl(30, 85%, 55%)";
          ctx.fillStyle = "hsla(30, 85%, 55%, 0.25)";
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
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

      // Draw power-ups with pulse animation (zoom in/out 5%)
      powerUps.forEach((powerUp) => {
        if (!powerUp.active) return;

        const img = loadedImagesRef.current[powerUp.type];
        const size = powerUp.width; // Square power-up
        const cornerRadius = 4;
        
        // Pulse animation: zoom in 5% and out 5% on 1 second interval
        const pulsePhase = (Date.now() % 1000) / 1000; // 0 to 1 over 1 second
        const pulseScale = 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.05; // 0.95 to 1.05
        
        ctx.save();
        ctx.translate(powerUp.x + size / 2, powerUp.y + size / 2);
        ctx.scale(pulseScale, pulseScale);
        
        // Draw background (light grey with rounded corners)
        ctx.fillStyle = "hsl(0, 0%, 70%)";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "hsl(280, 60%, 55%)";
        ctx.beginPath();
        ctx.roundRect(-size / 2, -size / 2, size, size, cornerRadius);
        ctx.fill();
        
        // 16-bit pixel texture (grey retro pattern)
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        for (let py = -size / 2 + 2; py < size / 2 - 2; py += 3) {
          for (let px = -size / 2 + 2; px < size / 2 - 2; px += 3) {
            if ((px + py) % 6 === 0) {
              ctx.fillRect(px, py, 2, 2);
            }
          }
        }
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        for (let py = -size / 2 + 3; py < size / 2 - 3; py += 3) {
          for (let px = -size / 2 + 3; px < size / 2 - 3; px += 3) {
            if ((px - py) % 6 === 0) {
              ctx.fillRect(px, py, 1, 1);
            }
          }
        }
        
        // Draw the icon
        if (isImageValid(img)) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(-size / 2, -size / 2, size, size, cornerRadius);
          ctx.clip();
          ctx.globalAlpha = 0.9;
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
          ctx.restore();
        }
        
        // Add subtle highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.roundRect(-size / 2, -size / 2, size, size / 3, [cornerRadius, cornerRadius, 0, 0]);
        ctx.fill();
        
        ctx.restore();
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

      // Draw shield if paddle has it - wraps around paddle
      if (paddle && paddle.hasShield) {
        const topHeight = 8;
        const sideWidth = 3;
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = "hsl(280, 100%, 70%)";
        ctx.fillStyle = "hsl(280, 80%, 60%)";
        
        // Top shield (thicker)
        ctx.fillRect(paddle.x, paddle.y - topHeight - 2, paddle.width, topHeight);
        
        // Left side (thin)
        ctx.fillRect(paddle.x - sideWidth, paddle.y - topHeight, sideWidth, paddle.height + topHeight);
        
        // Right side (thin)
        ctx.fillRect(paddle.x + paddle.width, paddle.y - topHeight, sideWidth, paddle.height + topHeight);
        
        // Bottom (thin)
        ctx.fillRect(paddle.x - sideWidth, paddle.y + paddle.height, paddle.width + sideWidth * 2, sideWidth);
        
        // Shield highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillRect(paddle.x, paddle.y - topHeight - 2, paddle.width, 2);
      }

      // Draw turrets if paddle has them
      if (paddle && paddle.hasTurrets) {
        const turretWidth = 10; // Narrower turrets
        const turretHeight = 12;
        
        // Left turret
        ctx.shadowBlur = 6;
        ctx.shadowColor = "hsl(0, 0%, 60%)";
        ctx.fillStyle = "hsl(0, 0%, 60%)"; // Grey
        ctx.fillRect(paddle.x + 5, paddle.y - turretHeight, turretWidth, turretHeight);
        
        // Retro pattern - darker lines
        ctx.shadowBlur = 0;
        ctx.fillStyle = "hsl(0, 0%, 40%)";
        for (let i = 0; i < turretHeight; i += 3) {
          ctx.fillRect(paddle.x + 5, paddle.y - turretHeight + i, turretWidth, 1);
        }
        
        // Highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(paddle.x + 5, paddle.y - turretHeight, turretWidth, 2);
        
        // Right turret
        ctx.shadowBlur = 6;
        ctx.shadowColor = "hsl(0, 0%, 60%)";
        ctx.fillStyle = "hsl(0, 0%, 60%)"; // Grey
        ctx.fillRect(paddle.x + paddle.width - 15, paddle.y - turretHeight, turretWidth, turretHeight);
        
        // Retro pattern - darker lines
        ctx.shadowBlur = 0;
        ctx.fillStyle = "hsl(0, 0%, 40%)";
        for (let i = 0; i < turretHeight; i += 3) {
          ctx.fillRect(paddle.x + paddle.width - 15, paddle.y - turretHeight + i, turretWidth, 1);
        }
        
        // Highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(paddle.x + paddle.width - 15, paddle.y - turretHeight, turretWidth, 2);
      }

      // Draw enemies (cubes and spheres)
      enemy.forEach((singleEnemy) => {
        ctx.save();
        const centerX = singleEnemy.x + singleEnemy.width / 2;
        const centerY = singleEnemy.y + singleEnemy.height / 2;
        
        if (singleEnemy.type === "sphere") {
          // Draw 3D spinning sphere with enhanced depth
          const radius = singleEnemy.width / 2;
          
          // Determine color based on state
          let baseColor = "hsl(200, 70%, 50%)";
          let highlightColor = "hsl(200, 80%, 70%)";
          if (singleEnemy.isAngry) {
            // Blinking red when angry
            const blinkPhase = Math.floor(Date.now() / 150) % 2;
            baseColor = blinkPhase === 0 ? "hsl(0, 85%, 55%)" : "hsl(0, 75%, 40%)";
            highlightColor = "hsl(0, 90%, 75%)";
          }
          
          // Calculate light position based on rotation for 3D effect
          const lightX = Math.cos(singleEnemy.rotationY) * radius * 0.4;
          const lightY = Math.sin(singleEnemy.rotationX) * radius * 0.4;
          
          // Draw sphere with enhanced 3D gradient
          const gradient = ctx.createRadialGradient(
            centerX + lightX,
            centerY + lightY,
            radius * 0.1,
            centerX,
            centerY,
            radius * 1.2
          );
          gradient.addColorStop(0, highlightColor);
          gradient.addColorStop(0.3, baseColor);
          gradient.addColorStop(0.7, `hsl(${singleEnemy.isAngry ? 0 : 200}, 60%, 30%)`);
          gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");
          
          ctx.shadowBlur = 20;
          ctx.shadowColor = baseColor;
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw rotating latitude/longitude lines for spinning effect
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = 1.5;
          
          // Latitude lines
          for (let i = -2; i <= 2; i++) {
            const latY = centerY + i * radius * 0.3;
            const latRadius = Math.sqrt(radius * radius - (i * radius * 0.3) * (i * radius * 0.3));
            const squeeze = Math.abs(Math.cos(singleEnemy.rotationX + i * 0.5));
            
            ctx.beginPath();
            ctx.ellipse(centerX, latY, latRadius * squeeze, latRadius * 0.3, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          
          // Longitude lines
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI + singleEnemy.rotationY;
            const x1 = centerX + Math.cos(angle) * radius * 0.8;
            const x2 = centerX - Math.cos(angle) * radius * 0.8;
            
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, Math.abs(Math.cos(angle)) * radius, radius, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          
          // Add specular highlight for extra 3D depth
          const specGradient = ctx.createRadialGradient(
            centerX + lightX * 0.7,
            centerY + lightY * 0.7,
            0,
            centerX + lightX * 0.7,
            centerY + lightY * 0.7,
            radius * 0.4
          );
          specGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
          specGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = specGradient;
          ctx.beginPath();
          ctx.arc(centerX + lightX * 0.7, centerY + lightY * 0.7, radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
          
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
        } else if (singleEnemy.type === "pyramid") {
          // Draw 3D spinning pyramid with retro style
          const size = singleEnemy.width;
          
          // Determine color based on hits
          let baseHue = 280; // Purple/magenta for no hits
          if (singleEnemy.hits === 1) {
            baseHue = 50; // Yellow for 1 hit
          } else if (singleEnemy.hits === 2) {
            baseHue = 0; // Red for 2 hits (angry)
          }
          
          // Blink effect when angry
          let colorIntensity = 60;
          if (singleEnemy.isAngry) {
            const blinkPhase = Math.floor(Date.now() / 150) % 2;
            colorIntensity = blinkPhase === 0 ? 75 : 50;
          }
          
          // Simple 3D projection
          const cos = Math.cos(singleEnemy.rotationY);
          const sin = Math.sin(singleEnemy.rotationY);
          const cosX = Math.cos(singleEnemy.rotationX);
          const sinX = Math.sin(singleEnemy.rotationX);
          
          // Define pyramid vertices: 4 base points + 1 apex
          const vertices = [
            [-1, 1, -1],  // base back-left
            [1, 1, -1],   // base back-right
            [1, 1, 1],    // base front-right
            [-1, 1, 1],   // base front-left
            [0, -1, 0]    // apex (top)
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
          
          // Define pyramid faces
          const faces = [
            { indices: [0, 1, 4], color: `hsl(${baseHue}, ${colorIntensity}%, 40%)` }, // back face
            { indices: [1, 2, 4], color: `hsl(${baseHue}, ${colorIntensity}%, 50%)` }, // right face
            { indices: [2, 3, 4], color: `hsl(${baseHue}, ${colorIntensity}%, 60%)` }, // front face
            { indices: [3, 0, 4], color: `hsl(${baseHue}, ${colorIntensity}%, 45%)` }, // left face
            { indices: [0, 1, 2, 3], color: `hsl(${baseHue}, ${colorIntensity}%, 35%)` }  // base
          ];
          
          // Sort faces by average z-depth
          const sortedFaces = faces.map(face => ({
            ...face,
            avgZ: face.indices.reduce((sum, i) => sum + projected[i][2], 0) / face.indices.length
          })).sort((a, b) => a.avgZ - b.avgZ);
          
          // Draw each face
          sortedFaces.forEach(face => {
            ctx.shadowBlur = 15;
            ctx.shadowColor = `hsl(${baseHue}, ${colorIntensity}%, 55%)`;
            ctx.fillStyle = face.color;
            ctx.beginPath();
            ctx.moveTo(projected[face.indices[0]][0], projected[face.indices[0]][1]);
            face.indices.forEach(i => {
              ctx.lineTo(projected[i][0], projected[i][1]);
            });
            ctx.closePath();
            ctx.fill();
            
            // Add edge lines with retro style
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Add retro scanline texture
            if (face.indices.length === 3) {
              ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
              ctx.lineWidth = 1;
              for (let i = 0; i < 3; i++) {
                const t = (i + 1) / 4;
                const x1 = projected[face.indices[0]][0] * (1 - t) + projected[face.indices[2]][0] * t;
                const y1 = projected[face.indices[0]][1] * (1 - t) + projected[face.indices[2]][1] * t;
                const x2 = projected[face.indices[1]][0] * (1 - t) + projected[face.indices[2]][0] * t;
                const y2 = projected[face.indices[1]][1] * (1 - t) + projected[face.indices[2]][1] * t;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
              }
            }
          });
          
          // Draw angry eyes when angry
          if (singleEnemy.isAngry) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.shadowBlur = 5;
            ctx.shadowColor = "rgba(255, 0, 0, 0.8)";
            
            // Angry eyes (small triangles)
            ctx.beginPath();
            ctx.moveTo(centerX - 10, centerY - 5);
            ctx.lineTo(centerX - 5, centerY - 5);
            ctx.lineTo(centerX - 7, centerY);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(centerX + 10, centerY - 5);
            ctx.lineTo(centerX + 5, centerY - 5);
            ctx.lineTo(centerX + 7, centerY);
            ctx.closePath();
            ctx.fill();
          }
        } else {
          // Draw cube enemy
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

      // Draw explosions with debris particles
      explosions.forEach((explosion) => {
        const progress = explosion.frame / explosion.maxFrames;
        const radius = 15 * (1 + progress * 2);
        const alpha = 1 - progress;
        
        // Determine explosion color based on enemy type
        let primaryHue = 30; // Default orange
        let secondaryHue = 60; // Default yellow
        
        if (explosion.enemyType === "cube") {
          primaryHue = 200; // Cyan
          secondaryHue = 180; // Blue-cyan
        } else if (explosion.enemyType === "sphere") {
          primaryHue = 330; // Pink/magenta
          secondaryHue = 350; // Red-pink
        } else if (explosion.enemyType === "pyramid") {
          primaryHue = 280; // Purple
          secondaryHue = 260; // Blue-purple
        }
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Outer ring
        if (qualitySettings.glowEnabled) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = `hsla(${primaryHue}, 100%, 50%, ${alpha})`;
        }
        ctx.strokeStyle = `hsla(${primaryHue}, 100%, 50%, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Inner glow
        ctx.fillStyle = `hsla(${secondaryHue}, 100%, 60%, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw debris particles (with quality-based sampling)
        const particleStep = Math.ceil(1 / qualitySettings.particleMultiplier);
        explosion.particles.forEach((particle: Particle, index: number) => {
          // Skip particles based on quality
          if (index % particleStep !== 0) return;
          
          const particleAlpha = particle.life / particle.maxLife;
          ctx.globalAlpha = particleAlpha;
          
          // Draw particle with glow
          if (qualitySettings.glowEnabled) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = particle.color;
          }
          ctx.fillStyle = particle.color;
          
          // Draw as small square debris
          ctx.fillRect(
            particle.x - particle.size / 2,
            particle.y - particle.size / 2,
            particle.size,
            particle.size
          );
          
          // Add a bright center
          ctx.fillStyle = `rgba(255, 255, 255, ${particleAlpha * 0.8})`;
          ctx.fillRect(
            particle.x - particle.size / 4,
            particle.y - particle.size / 4,
            particle.size / 2,
            particle.size / 2
          );
        });
        
        ctx.restore();
      });

      // Draw bombs and rockets
      bombs.forEach((bomb) => {
        const bombCenterX = bomb.x + bomb.width / 2;
        const bombCenterY = bomb.y + bomb.height / 2;
        
        // Spinning rotation
        const bombRotation = (Date.now() / 30) % 360;
        
        ctx.save();
        ctx.translate(bombCenterX, bombCenterY);
        ctx.rotate((bombRotation * Math.PI) / 180);
        
        if (bomb.type === "pyramidBullet") {
          // Draw pyramid bullet - elongated diamond shape
          ctx.shadowBlur = 8;
          ctx.shadowColor = "hsl(280, 70%, 55%)";
          ctx.fillStyle = "hsl(280, 70%, 55%)";
          ctx.beginPath();
          ctx.moveTo(0, -bomb.height / 2); // top
          ctx.lineTo(bomb.width / 2, 0); // right
          ctx.lineTo(0, bomb.height / 2); // bottom
          ctx.lineTo(-bomb.width / 2, 0); // left
          ctx.closePath();
          ctx.fill();
          
          // Bullet highlight
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.beginPath();
          ctx.arc(-1, -2, bomb.width / 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (bomb.type === "rocket") {
          // Draw yellow rocket (from sphere)
          ctx.shadowBlur = 8;
          ctx.shadowColor = "hsl(50, 85%, 55%)";
          ctx.fillStyle = "hsl(50, 85%, 55%)";
          ctx.beginPath();
          ctx.arc(0, 0, bomb.width / 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Rocket highlight
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.beginPath();
          ctx.arc(-2, -2, bomb.width / 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Draw regular bomb (red)
          ctx.shadowBlur = 8;
          ctx.shadowColor = "hsl(0, 85%, 55%)";
          ctx.fillStyle = "hsl(0, 85%, 55%)";
          ctx.beginPath();
          ctx.arc(0, 0, bomb.width / 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Bomb highlight
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.beginPath();
          ctx.arc(-2, -2, bomb.width / 4, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
      });

      // Draw laser warnings
      laserWarnings.forEach(warning => {
        const elapsed = Date.now() - warning.startTime;
        const alpha = Math.sin((elapsed / 800) * Math.PI);
        
        ctx.strokeStyle = `rgba(255, 0, 0, ${alpha * 0.7})`;
        ctx.lineWidth = 8;
        ctx.setLineDash([10, 10]);
        ctx.lineDashOffset = (Date.now() / 50) % 20;
        ctx.beginPath();
        ctx.moveTo(warning.x + 4, 0);
        ctx.lineTo(warning.x + 4, height);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw boss attacks
      bossAttacks.forEach(attack => {
        if (attack.type === 'laser') {
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
          ctx.fillStyle = 'rgba(255, 50, 50, 0.9)';
          ctx.fillRect(attack.x, attack.y, attack.width, attack.height);
          
          ctx.fillStyle = 'rgba(255, 200, 200, 0.6)';
          ctx.fillRect(attack.x + attack.width * 0.2, attack.y, attack.width * 0.6, attack.height);
        } else {
          ctx.save();
          ctx.translate(attack.x + attack.width / 2, attack.y + attack.height / 2);
          ctx.rotate((Date.now() / 30) * Math.PI / 180);
          
          ctx.shadowBlur = 10;
          ctx.shadowColor = attack.type === 'super' ? 'hsl(280, 100%, 60%)' : 'hsl(0, 100%, 60%)';
          ctx.fillStyle = attack.type === 'super' ? 'hsl(280, 80%, 60%)' : 'hsl(0, 80%, 60%)';
          ctx.beginPath();
          ctx.arc(0, 0, attack.width / 2, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.beginPath();
          ctx.arc(-2, -2, attack.width / 4, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        }
      });

      // Draw boss
      if (boss) {
        const centerX = boss.x + boss.width / 2;
        const centerY = boss.y + boss.height / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        
        if (boss.type === 'cube') {
          ctx.rotate(boss.rotationY);
          const size = boss.width / 2;
          
          const baseHue = boss.isAngry ? 0 : 200;
          ctx.shadowBlur = 20;
          ctx.shadowColor = `hsl(${baseHue}, 100%, 60%)`;
          ctx.fillStyle = `hsl(${baseHue}, 80%, 50%)`;
          ctx.fillRect(-size, -size, size * 2, size * 2);
          
          ctx.fillStyle = `hsl(${baseHue}, 70%, 60%)`;
          ctx.fillRect(-size, -size, size * 2, size * 0.5);
          
          ctx.strokeStyle = `hsl(${baseHue}, 90%, 70%)`;
          ctx.lineWidth = 3;
          ctx.strokeRect(-size, -size, size * 2, size * 2);
        } else if (boss.type === 'sphere') {
          const radius = boss.width / 2;
          const baseHue = boss.isAngry ? 330 : 330;
          const intensity = boss.isAngry ? 70 : 60;
          
          const gradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius);
          gradient.addColorStop(0, `hsl(${baseHue}, 100%, ${intensity + 20}%)`);
          gradient.addColorStop(0.7, `hsl(${baseHue}, 90%, ${intensity}%)`);
          gradient.addColorStop(1, `hsl(${baseHue}, 70%, ${intensity - 20}%)`);
          
          ctx.shadowBlur = 25;
          ctx.shadowColor = `hsl(${baseHue}, 100%, 60%)`;
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();
          
          if (boss.isAngry) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.beginPath();
            ctx.moveTo(-8, -5);
            ctx.lineTo(-5, 0);
            ctx.moveTo(8, -5);
            ctx.lineTo(5, 0);
            ctx.stroke();
          }
        } else if (boss.type === 'pyramid') {
          const size = boss.width / 2;
          const baseHue = boss.isAngry ? 0 : (boss.isSuperAngry ? 280 : 280);
          const intensity = boss.isSuperAngry ? 75 : (boss.isAngry ? 65 : 60);
          
          ctx.rotate(boss.rotationY);
          ctx.shadowBlur = 25;
          ctx.shadowColor = `hsl(${baseHue}, 100%, 60%)`;
          
          ctx.fillStyle = `hsl(${baseHue}, 80%, ${intensity}%)`;
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size, size);
          ctx.lineTo(-size, size);
          ctx.closePath();
          ctx.fill();
          
          ctx.fillStyle = `hsl(${baseHue}, 70%, ${intensity + 10}%)`;
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(0, 0);
          ctx.lineTo(-size, size);
          ctx.closePath();
          ctx.fill();
          
          ctx.strokeStyle = `hsl(${baseHue}, 90%, 70%)`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size, size);
          ctx.lineTo(-size, size);
          ctx.closePath();
          ctx.stroke();
        }
        
        ctx.restore();
        
        // Draw boss health bar
        const healthBarWidth = boss.width;
        const healthBarHeight = 8;
        const healthBarX = boss.x;
        const healthBarY = boss.y - 25;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        const healthPercent = boss.currentHealth / boss.maxHealth;
        const fillColor = healthPercent > 0.5 ? 'hsl(120, 80%, 50%)' : 
                          healthPercent > 0.25 ? 'hsl(50, 80%, 50%)' : 'hsl(0, 80%, 50%)';
        ctx.fillStyle = fillColor;
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${boss.type.toUpperCase()} BOSS`, boss.x + boss.width / 2, healthBarY - 8);
      }

      // Draw resurrected bosses
      resurrectedBosses.forEach(resBoss => {
        const centerX = resBoss.x + resBoss.width / 2;
        const centerY = resBoss.y + resBoss.height / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(resBoss.rotationY);
        
        const size = resBoss.width / 2;
        const baseHue = resBoss.isSuperAngry ? 0 : 280;
        const intensity = resBoss.isSuperAngry ? 75 : 65;
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = `hsl(${baseHue}, 100%, 60%)`;
        ctx.fillStyle = `hsl(${baseHue}, 80%, ${intensity}%)`;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size, size);
        ctx.lineTo(-size, size);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = `hsl(${baseHue}, 90%, 70%)`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
        
        // Mini health bar
        const hbW = resBoss.width;
        const hbH = 4;
        const hbX = resBoss.x;
        const hbY = resBoss.y - 10;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(hbX, hbY, hbW, hbH);
        
        const hpPercent = resBoss.currentHealth / resBoss.maxHealth;
        ctx.fillStyle = hpPercent > 0.5 ? 'hsl(120, 80%, 50%)' : 'hsl(0, 80%, 50%)';
        ctx.fillRect(hbX, hbY, hbW * hpPercent, hbH);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(hbX, hbY, hbW, hbH);
      });

      // Draw bonus letters as 3D spheres with letter images
      bonusLetters.forEach((letter) => {
        if (!letter.active) return;

        const img = bonusLetterImagesRef.current[letter.type];
        const size = letter.width;
        
        ctx.save();
        ctx.translate(letter.x + size / 2, letter.y + size / 2);
        
        // Draw sphere with glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = "hsl(280, 90%, 60%)";
        
        if (isImageValid(img)) {
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
        } else {
          // Fallback circle if image not loaded
          ctx.fillStyle = "hsl(280, 90%, 60%)";
          ctx.beginPath();
          ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
      });

      // Draw collected letters at top center
      const letterOrder: BonusLetterType[] = ["Q", "U", "M", "R", "A", "N"];
      const size = 40;
      const spacing = 20;
      const totalWidth = letterOrder.length * size + (letterOrder.length - 1) * spacing;
      const startX = (width - totalWidth) / 2;
      const y = 20;
      
      letterOrder.forEach((letter, index) => {
        const img = bonusLetterImagesRef.current[letter];
        const x = startX + index * (size + spacing);
        const isCollected = collectedLetters.has(letter as BonusLetterType);
        
        ctx.save();
        
        if (isImageValid(img)) {
          ctx.globalAlpha = isCollected ? 1 : 0.3;
          ctx.drawImage(img, x, y, size, size);
        }
        
        ctx.restore();
      });

      // Game state overlay
      if (gameState !== "playing") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, width, height);
        
        if (gameState === "paused") {
          // Retro "PAUSED" text with individual spaced letters
          const letters = ["P", "A", "U", "S", "E", "D"];
          const letterSpacing = 60;
          const totalWidth = (letters.length - 1) * letterSpacing;
          const startX = width / 2 - totalWidth / 2;
          const y = height / 2;
          
          ctx.font = "bold 48px 'Courier New', monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          
          letters.forEach((letter, index) => {
            const x = startX + index * letterSpacing;
            
            // Shadow for 3D depth effect
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillText(letter, x + 3, y + 3);
            
            // Outer glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = "hsl(50, 100%, 50%)";
            
            // Main letter - bright yellow/gold
            ctx.fillStyle = "hsl(50, 100%, 60%)";
            ctx.fillText(letter, x, y);
            
            // Highlight for retro effect
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.fillText(letter, x - 1, y - 1);
          });
        } else {
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
      }

      // Amiga-style instructions overlay (when ball is waiting to launch)
      const waitingBall = balls.find(ball => ball.waitingToLaunch);
      if (waitingBall && gameState === "playing") {
        // Amiga retro demo style - grey blockish pixelated text
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(160, 160, 160, 0.95)";
        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Draw with pixel-like effect by drawing twice with slight offset
        const instructionY1 = height * 0.78;
        const instructionY2 = height * 0.83;
        const instructionY3 = height * 0.88;
        const text1 = "USE A AND D OR LEFT AND RIGHT TO CHANGE THE ANGLE";
        const text2 = "MUSIC: N - NEXT | B - PREVIOUS | M - MUTE/UNMUTE | P - PAUSE";
        const text3 = "F - FULLSCREEN | ESC - RELEASE MOUSE";
        
        // Shadow for depth - line 1
        ctx.fillStyle = "rgba(80, 80, 80, 0.8)";
        ctx.fillText(text1, width / 2 + 2, instructionY1 + 2);
        
        // Main text - line 1
        ctx.fillStyle = "rgba(180, 180, 180, 0.95)";
        ctx.fillText(text1, width / 2, instructionY1);
        
        // Shadow for depth - line 2
        ctx.fillStyle = "rgba(80, 80, 80, 0.8)";
        ctx.fillText(text2, width / 2 + 2, instructionY2 + 2);
        
        // Main text - line 2
        ctx.fillStyle = "rgba(180, 180, 180, 0.95)";
        ctx.fillText(text2, width / 2, instructionY2);
        
        // Shadow for depth - line 3
        ctx.fillStyle = "rgba(80, 80, 80, 0.8)";
        ctx.fillText(text3, width / 2 + 2, instructionY3 + 2);
        
        // Main text - line 3
        ctx.fillStyle = "rgba(180, 180, 180, 0.95)";
        ctx.fillText(text3, width / 2, instructionY3);
      }
    
      // Restore context after shake
      ctx.restore();
    
    }, [ref, width, height, bricks, balls, paddle, gameState, powerUps, bullets, enemy, bombs, level, backgroundPhase, explosions, launchAngle, bonusLetters, collectedLetters, screenShake, backgroundFlash, boss, resurrectedBosses, bossAttacks, laserWarnings]);

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
