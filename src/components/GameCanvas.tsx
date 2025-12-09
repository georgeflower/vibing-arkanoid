import { forwardRef, useEffect, useRef } from "react";
import type { Brick, Ball, Paddle, GameState, PowerUp, Bullet, Enemy, Bomb, Explosion, BonusLetter, BonusLetterType, Particle, Boss, BossAttack, ShieldImpact } from "@/types/game";
import type { QualitySettings } from "@/hooks/useAdaptiveQuality";
import { powerUpImages } from "@/utils/powerUpImages";
import { bonusLetterImages } from "@/utils/bonusLetterImages";
import paddleImg from "@/assets/paddle.png";
import paddleTurretsImg from "@/assets/paddle-turrets.png";
import crackedBrick1 from "@/assets/brick-cracked-1.png";
import crackedBrick2 from "@/assets/brick-cracked-2.png";
import crackedBrick3 from "@/assets/brick-cracked-3.png";
import backgroundTile1 from "@/assets/background-tile.png";
import backgroundTile2 from "@/assets/background-tile-2.png";
import backgroundTile3 from "@/assets/background-tile-3.png";
import backgroundTile4 from "@/assets/background-tile-4.png";

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
  highlightFlash?: number; // New: Flash effect for explosions/kills/extra life (0-1.5)
  qualitySettings: QualitySettings;
  boss: Boss | null;
  resurrectedBosses: Boss[];
  bossAttacks: BossAttack[];
  laserWarnings: Array<{ x: number; startTime: number }>;
  gameOverParticles: Particle[];
  highScoreParticles: Particle[];
  showHighScoreEntry: boolean;
  bossIntroActive: boolean;
  bossSpawnAnimation: {active: boolean; startTime: number} | null;
  shieldImpacts: ShieldImpact[];
  bulletImpacts?: Array<{ x: number; y: number; startTime: number; isSuper: boolean }>;
  tutorialHighlight?: { type: 'power_up' | 'boss' | 'enemy' | 'bonus_letter'; zoomScale?: number } | null;
  debugEnabled?: boolean; // DEBUG: Remove before production
  getReadyGlow?: { opacity: number } | null; // Mobile ball glow during Get Ready sequence
}

export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ width, height, bricks, balls, paddle, gameState, powerUps, bullets, enemy, bombs, level, backgroundPhase, explosions, launchAngle, bonusLetters, collectedLetters, screenShake, backgroundFlash, highlightFlash = 0, qualitySettings, boss, resurrectedBosses, bossAttacks, laserWarnings, gameOverParticles, highScoreParticles, showHighScoreEntry, bossIntroActive, bossSpawnAnimation, shieldImpacts, bulletImpacts = [], tutorialHighlight = null, debugEnabled = false, getReadyGlow = null }, ref) => {
    const loadedImagesRef = useRef<Record<string, HTMLImageElement>>({});
    const bonusLetterImagesRef = useRef<Record<string, HTMLImageElement>>({});
    const paddleImageRef = useRef<HTMLImageElement | null>(null);
    const paddleTurretsImageRef = useRef<HTMLImageElement | null>(null);
    const crackedBrick1Ref = useRef<HTMLImageElement | null>(null);
    const crackedBrick2Ref = useRef<HTMLImageElement | null>(null);
    const crackedBrick3Ref = useRef<HTMLImageElement | null>(null);
    const backgroundImage1Ref = useRef<HTMLImageElement | null>(null);
    const backgroundImage2Ref = useRef<HTMLImageElement | null>(null);
    const backgroundImage3Ref = useRef<HTMLImageElement | null>(null);
    const backgroundImage4Ref = useRef<HTMLImageElement | null>(null);
    const backgroundPattern1Ref = useRef<CanvasPattern | null>(null);
    const backgroundPattern2Ref = useRef<CanvasPattern | null>(null);
    const backgroundPattern3Ref = useRef<CanvasPattern | null>(null);
    const backgroundPattern4Ref = useRef<CanvasPattern | null>(null);
    const currentBgLevelRangeRef = useRef<number>(0);
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
    
    // Debug flag for boss hitbox
    const SHOW_BOSS_HITBOX = false;
    
    // Helper function to detect adjacent metal bricks for seamless rendering
    const getAdjacentMetalBricks = (brick: Brick, allBricks: Brick[]) => {
      const tolerance = 6; // Increased to detect bricks across padding boundaries
      return {
        top: allBricks.find(b => 
          b.visible && b.type === "metal" && 
          Math.abs(b.x - brick.x) < tolerance && 
          Math.abs((b.y + b.height) - brick.y) < tolerance
        ),
        bottom: allBricks.find(b => 
          b.visible && b.type === "metal" && 
          Math.abs(b.x - brick.x) < tolerance && 
          Math.abs(b.y - (brick.y + brick.height)) < tolerance
        ),
        left: allBricks.find(b => 
          b.visible && b.type === "metal" && 
          Math.abs(b.y - brick.y) < tolerance && 
          Math.abs((b.x + b.width) - brick.x) < tolerance
        ),
        right: allBricks.find(b => 
          b.visible && b.type === "metal" && 
          Math.abs(b.y - brick.y) < tolerance && 
          Math.abs(b.x - (brick.x + brick.width)) < tolerance
        )
      };
    };
    
    // Load power-up images, bonus letter images, and paddle image
    useEffect(() => {
      // Power-up images - wait for onload before storing (iOS Safari compatibility)
      Object.entries(powerUpImages).forEach(([type, src]) => {
        if (!src) return; // Skip empty sources (boss power-ups use emoji)
        const img = new Image();
        img.onload = () => {
          loadedImagesRef.current[type] = img;
        };
        img.src = src;
      });
      
      // Bonus letter images - wait for onload before storing (iOS Safari compatibility)
      Object.entries(bonusLetterImages).forEach(([type, src]) => {
        const img = new Image();
        img.onload = () => {
          bonusLetterImagesRef.current[type] = img;
        };
        img.src = src;
      });
      
      const paddleImage = new Image();
      paddleImage.onload = () => {
        paddleImageRef.current = paddleImage;
      };
      paddleImage.src = paddleImg;
      
      const paddleTurretsImage = new Image();
      paddleTurretsImage.onload = () => {
        paddleTurretsImageRef.current = paddleTurretsImage;
      };
      paddleTurretsImage.src = paddleTurretsImg;
      
      const crackedBrick1Image = new Image();
      crackedBrick1Image.onload = () => {
        crackedBrick1Ref.current = crackedBrick1Image;
      };
      crackedBrick1Image.src = crackedBrick1;
      
      const crackedBrick2Image = new Image();
      crackedBrick2Image.onload = () => {
        crackedBrick2Ref.current = crackedBrick2Image;
      };
      crackedBrick2Image.src = crackedBrick2;
      
      const crackedBrick3Image = new Image();
      crackedBrick3Image.onload = () => {
        crackedBrick3Ref.current = crackedBrick3Image;
      };
      crackedBrick3Image.src = crackedBrick3;
      
      const backgroundImage1 = new Image();
      backgroundImage1.src = backgroundTile1;
      backgroundImage1.onload = () => {
        backgroundImage1Ref.current = backgroundImage1;
        backgroundPattern1Ref.current = null;
      };
      
      const backgroundImage2 = new Image();
      backgroundImage2.src = backgroundTile2;
      backgroundImage2.onload = () => {
        backgroundImage2Ref.current = backgroundImage2;
        backgroundPattern2Ref.current = null;
      };
      
      // Background 3 for levels 11-15
      const backgroundImage3 = new Image();
      backgroundImage3.src = backgroundTile3;
      backgroundImage3.onload = () => {
        backgroundImage3Ref.current = backgroundImage3;
        backgroundPattern3Ref.current = null;
      };
      
      // Background 4 for levels 1-4
      const backgroundImage4 = new Image();
      backgroundImage4.src = backgroundTile4;
      backgroundImage4.onload = () => {
        backgroundImage4Ref.current = backgroundImage4;
        backgroundPattern4Ref.current = null;
      };
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

      // Clear canvas - tiled background with flash overlay
      ctx.fillStyle = 'hsl(220, 25%, 12%)'; // Fallback color while image loads
      ctx.fillRect(0, 0, width, height);
      
      // Draw tiled background based on level
      let bgImg: HTMLImageElement | null;
      let bgPatternRef: React.MutableRefObject<CanvasPattern | null>;
      
      if (level >= 11 && level <= 15) {
        bgImg = backgroundImage3Ref.current;
        bgPatternRef = backgroundPattern3Ref;
      } else if (level >= 6 && level <= 10) {
        bgImg = backgroundImage2Ref.current;
        bgPatternRef = backgroundPattern2Ref;
      } else if (level === 5) {
        bgImg = backgroundImage1Ref.current;
        bgPatternRef = backgroundPattern1Ref;
      } else {
        // Levels 1-4
        bgImg = backgroundImage4Ref.current;
        bgPatternRef = backgroundPattern4Ref;
      }
      
      if (isImageValid(bgImg)) {
        // Create pattern if not already created
        if (!bgPatternRef.current) {
          bgPatternRef.current = ctx.createPattern(bgImg, 'repeat');
        }
        
        if (bgPatternRef.current) {
          ctx.fillStyle = bgPatternRef.current;
          ctx.fillRect(0, 0, width, height);
          
          // Dim background for levels 1-4 (40% darker)
          if (level >= 1 && level <= 4) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, width, height);
            
            // Subtle ambient flicker on brighter areas (only levels 1-4)
            const ambientFlicker = Math.sin(Date.now() / 500) * 0.03 + 0.03;
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = `rgba(100, 150, 200, ${ambientFlicker})`;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
          }
        }
      }
      
      // Apply highlight flash effect for explosions/kills/extra life (levels 1-4 only)
      if (highlightFlash > 0 && level >= 1 && level <= 4) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; // Only affects bright pixels
        
        // Determine flash color based on intensity
        const isGolden = highlightFlash > 1.2; // Extra life = golden flash
        const intensity = Math.min(highlightFlash, 1.0);
        
        if (isGolden) {
          // Golden/warm flash for extra life
          ctx.fillStyle = `rgba(255, 200, 100, ${intensity * 0.5})`;
        } else {
          // White/cyan flash for explosions and kills
          ctx.fillStyle = `rgba(150, 220, 255, ${intensity * 0.4})`;
        }
        
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
      
      // Apply flash effect as overlay
      if (backgroundFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${backgroundFlash * 0.4})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw bricks with 16-bit Turrican 2 style texture
      bricks.forEach((brick) => {
        if (brick.visible) {
          // Reset shadow to prevent bleeding from other elements
          ctx.shadowBlur = 0;
          
          // Metal (Indestructible) bricks - steel appearance
        if (brick.type === "metal") {
          // Detect adjacent metal bricks for seamless melting
          const adjacent = getAdjacentMetalBricks(brick, bricks);
          
          // Steel base color - fill entire brick area
          ctx.fillStyle = 'hsl(0, 0%, 33%)';
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
          
          ctx.shadowBlur = 0;
          
          // Top metallic highlight - only if no brick above
          if (!adjacent.top) {
            ctx.fillStyle = "rgba(200, 200, 200, 0.4)";
            ctx.fillRect(brick.x, brick.y, brick.width, 4);
          }
          
          // Left metallic shine - only if no brick to the left
          if (!adjacent.left) {
            ctx.fillStyle = "rgba(200, 200, 200, 0.4)";
            ctx.fillRect(brick.x, brick.y, 4, brick.height);
          }
          
          // Darker bottom - only if no brick below
          if (!adjacent.bottom) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(brick.x, brick.y + brick.height - 4, brick.width, 4);
          }
          
          // Right shadow - only if no brick to the right
          if (!adjacent.right) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(brick.x + brick.width - 4, brick.y, 4, brick.height);
          }
          
          // Steel rivets pattern - draw across entire brick
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
          
          // Diagonal hatching pattern - continuous across brick
          ctx.strokeStyle = "rgba(150, 150, 150, 0.15)";
          ctx.lineWidth = 1;
          for (let i = 0; i < brick.width + brick.height; i += 6) {
            ctx.beginPath();
            ctx.moveTo(brick.x + i, brick.y);
            ctx.lineTo(brick.x, brick.y + i);
            ctx.stroke();
          }
        } else if (brick.type === "explosive") {
            // Explosive brick - orange/red with warning pattern
            ctx.fillStyle = brick.color;
            ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            
            // Pulsing glow effect (if quality allows)
            if (qualitySettings.glowEnabled) {
              const pulseIntensity = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
              ctx.shadowBlur = 8 * pulseIntensity;
              ctx.shadowColor = 'hsl(15, 100%, 50%)';
            }
            
            // Top highlight
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(255, 255, 100, 0.3)";
            ctx.fillRect(brick.x, brick.y, brick.width, 3);
            
            // Bottom shadow
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(brick.x, brick.y + brick.height - 3, brick.width, 3);
            
            // Warning pattern (dotted)
            ctx.strokeStyle = "rgba(50, 50, 50, 0.4)";
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            for (let i = 0; i < brick.width + brick.height; i += 8) {
              ctx.beginPath();
              ctx.moveTo(brick.x + i, brick.y);
              ctx.lineTo(brick.x, brick.y + i);
              ctx.stroke();
            }
            ctx.setLineDash([]);
            
            // Show bomb emojis representing hits required
            ctx.fillStyle = "rgba(255, 200, 0, 0.8)";
            ctx.font = "bold 14px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const bombsText = "💥".repeat(brick.hitsRemaining);
            ctx.fillText(bombsText, brick.x + brick.width / 2, brick.y + brick.height / 2);
            
            ctx.shadowBlur = 0;
          } else if (brick.type === "cracked") {
            // Cracked brick - use texture based on hits remaining (1.png = least damaged, 3.png = most damaged)
            let crackedImage: HTMLImageElement | null = null;
            if (brick.hitsRemaining === 3 && crackedBrick1Ref.current) {
              crackedImage = crackedBrick1Ref.current;
            } else if (brick.hitsRemaining === 2 && crackedBrick2Ref.current) {
              crackedImage = crackedBrick2Ref.current;
            } else if (brick.hitsRemaining === 1 && crackedBrick3Ref.current) {
              crackedImage = crackedBrick3Ref.current;
            }
            
            if (crackedImage && isImageValid(crackedImage)) {
              // Draw the texture image, ensuring it stays within brick dimensions
              ctx.drawImage(
                crackedImage,
                brick.x,
                brick.y,
                brick.width,
                brick.height
              );
            } else {
              // Fallback rendering if texture not loaded
              ctx.fillStyle = brick.color;
              ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
              
              ctx.shadowBlur = 0;
              ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
              ctx.fillRect(brick.x, brick.y, brick.width, 3);
              ctx.fillRect(brick.x, brick.y, 3, brick.height);
              
              ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
              ctx.fillRect(brick.x, brick.y + brick.height - 3, brick.width, 3);
              ctx.fillRect(brick.x + brick.width - 3, brick.y, 3, brick.height);
            }
            
            // No hit counter for cracked bricks - texture shows damage progression
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
        
        // Get Ready glow effect (mobile) - draw BEFORE ball for proper layering
        if (getReadyGlow && getReadyGlow.opacity > 0) {
          ctx.save();
          // Light blue glow around the ball
          const glowRadius = ball.radius * 3;
          const glowGradient = ctx.createRadialGradient(
            ball.x, ball.y, ball.radius,
            ball.x, ball.y, glowRadius
          );
          glowGradient.addColorStop(0, `rgba(100, 200, 255, ${getReadyGlow.opacity * 0.6})`);
          glowGradient.addColorStop(0.5, `rgba(100, 200, 255, ${getReadyGlow.opacity * 0.3})`);
          glowGradient.addColorStop(1, `rgba(100, 200, 255, 0)`);
          
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, glowRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // Add extra glow ring
          ctx.strokeStyle = `rgba(100, 200, 255, ${getReadyGlow.opacity * 0.8})`;
          ctx.lineWidth = 2;
          ctx.shadowColor = 'rgba(100, 200, 255, 1)';
          ctx.shadowBlur = 15 * getReadyGlow.opacity;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        
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
        
        // Homing ball trail effect
        if (ball.isHoming && boss) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(ball.x, ball.y);
          ctx.lineTo(boss.x + boss.width / 2, boss.y + boss.height / 2);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Red glow around homing ball
          ctx.shadowColor = 'red';
          ctx.shadowBlur = 15;
          ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
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
        
        // Tutorial highlight - power-up is rendered with zoom in TutorialOverlay
        // Skip normal rendering if this power-up is being highlighted (first power-up)
        const isHighlighted = tutorialHighlight?.type === 'power_up' && powerUps.indexOf(powerUp) === 0;
        if (isHighlighted) {
          // Don't render here - TutorialOverlay handles the zoomed spotlight view
          return;
        }
        
        // Pulse animation: zoom in 5% and out 5% on 1 second interval
        const pulsePhase = (Date.now() % 1000) / 1000; // 0 to 1 over 1 second
        const pulseScale = 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.05; // 0.95 to 1.05
        
        ctx.save();
        ctx.translate(powerUp.x + size / 2, powerUp.y + size / 2);
        ctx.scale(pulseScale, pulseScale);
        ctx.translate(-size / 2, -size / 2);

        // Boss power-ups - render with emoji
        if (powerUp.type === 'bossStunner' || powerUp.type === 'reflectShield' || powerUp.type === 'homingBall') {
          ctx.font = '48px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const emoji = powerUp.type === 'bossStunner' ? '⚡' : powerUp.type === 'reflectShield' ? '🪞' : '🎯';
          ctx.fillText(emoji, size / 2, size / 2);
          ctx.restore();
          return;
        }
        
        // Yellow rectangle with blur effect (static, like low-quality shield)
        const padding = 4;
        const rectX = -padding;
        const rectY = -padding;
        const rectWidth = size + padding * 2;
        const rectHeight = size + padding * 2;
        const radius = 6;

        // Draw metallic background
        const metalGradient = ctx.createLinearGradient(rectX, rectY, rectX, rectY + rectHeight);
        metalGradient.addColorStop(0, 'hsl(220, 10%, 65%)');    // Light steel top
        metalGradient.addColorStop(0.3, 'hsl(220, 8%, 50%)');   // Mid steel
        metalGradient.addColorStop(0.5, 'hsl(220, 10%, 60%)');  // Highlight band
        metalGradient.addColorStop(0.7, 'hsl(220, 8%, 45%)');   // Dark steel
        metalGradient.addColorStop(1, 'hsl(220, 10%, 35%)');    // Bottom shadow

        // Draw rounded rectangle path
        ctx.beginPath();
        ctx.moveTo(rectX + radius, rectY);
        ctx.lineTo(rectX + rectWidth - radius, rectY);
        ctx.quadraticCurveTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + radius);
        ctx.lineTo(rectX + rectWidth, rectY + rectHeight - radius);
        ctx.quadraticCurveTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - radius, rectY + rectHeight);
        ctx.lineTo(rectX + radius, rectY + rectHeight);
        ctx.quadraticCurveTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - radius);
        ctx.lineTo(rectX, rectY + radius);
        ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
        ctx.closePath();
        
        ctx.fillStyle = metalGradient;
        ctx.fill();
        
        // Add subtle inner highlight for 3D effect
        ctx.strokeStyle = 'hsla(220, 15%, 80%, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw rivets in corners
        const rivetRadius = 3;
        const rivetOffset = 6;
        const rivetPositions = [
          { x: rectX + rivetOffset, y: rectY + rivetOffset },
          { x: rectX + rectWidth - rivetOffset, y: rectY + rivetOffset },
          { x: rectX + rivetOffset, y: rectY + rectHeight - rivetOffset },
          { x: rectX + rectWidth - rivetOffset, y: rectY + rectHeight - rivetOffset }
        ];
        
        rivetPositions.forEach(pos => {
          // Rivet base (dark)
          const rivetGradient = ctx.createRadialGradient(
            pos.x - 0.5, pos.y - 0.5, 0,
            pos.x, pos.y, rivetRadius
          );
          rivetGradient.addColorStop(0, 'hsl(220, 8%, 70%)');   // Highlight
          rivetGradient.addColorStop(0.4, 'hsl(220, 8%, 50%)'); // Mid
          rivetGradient.addColorStop(1, 'hsl(220, 10%, 30%)');  // Shadow edge
          
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, rivetRadius, 0, Math.PI * 2);
          ctx.fillStyle = rivetGradient;
          ctx.fill();
          
          // Rivet rim shadow
          ctx.strokeStyle = 'hsla(220, 10%, 20%, 0.5)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        });

        // Dark grey outline with subtle shadow
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'hsla(220, 10%, 10%, 0.5)';
        ctx.strokeStyle = 'hsl(220, 10%, 25%)';
        ctx.lineWidth = 2;
        
        // Redraw the rounded rect outline over rivets
        ctx.beginPath();
        ctx.moveTo(rectX + radius, rectY);
        ctx.lineTo(rectX + rectWidth - radius, rectY);
        ctx.quadraticCurveTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + radius);
        ctx.lineTo(rectX + rectWidth, rectY + rectHeight - radius);
        ctx.quadraticCurveTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - radius, rectY + rectHeight);
        ctx.lineTo(rectX + radius, rectY + rectHeight);
        ctx.quadraticCurveTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - radius);
        ctx.lineTo(rectX, rectY + radius);
        ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw the icon - 5% transparent (0.95 alpha)
        if (isImageValid(img)) {
          ctx.globalAlpha = 0.95;
          ctx.drawImage(img, 0, 0, size, size);
        } else if (debugEnabled) {
          // ═══════════════════════════════════════════════════════════════
          // DEBUG: Show magenta rectangle if image not loaded
          // ═══════════════════════════════════════════════════════════════
          ctx.fillStyle = "magenta";
          ctx.fillRect(0, 0, size, size);
        }
        
        ctx.restore();
      });

      // Draw bullets
      bullets.forEach((bullet) => {
        if (bullet.isSuper && bullet.isBounced) {
          // Super bullets reflected from minion - RED with particle trail (dangerous!)
          ctx.shadowBlur = 20;
          ctx.shadowColor = "hsl(0, 100%, 50%)";
          ctx.fillStyle = "hsl(0, 90%, 55%)";
          
          // Draw bullet
          ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
          
          // Extra red glow effect
          ctx.fillStyle = "hsla(0, 100%, 60%, 0.6)";
          ctx.fillRect(bullet.x - 3, bullet.y, bullet.width + 6, bullet.height + 10);
          
          // Particle trail effect for reflected super bullets
          if (qualitySettings.level !== 'low') {
            const particleCount = 4;
            for (let i = 0; i < particleCount; i++) {
              const offset = i * 8;
              const alpha = 0.6 - i * 0.15;
              const size = 4 - i * 0.8;
              ctx.fillStyle = `hsla(30, 100%, 60%, ${alpha})`;
              ctx.beginPath();
              ctx.arc(
                bullet.x + bullet.width / 2 + (Math.random() - 0.5) * 6,
                bullet.y + bullet.height + offset,
                size,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          }
        } else if (bullet.isSuper) {
          // Super bullets - golden/yellow glow
          ctx.shadowBlur = 15;
          ctx.shadowColor = "hsl(45, 100%, 50%)";
          ctx.fillStyle = "hsl(45, 90%, 55%)";
          
          // Draw bullet with glow trail
          ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
          
          // Extra glow effect
          ctx.fillStyle = "hsla(45, 100%, 70%, 0.5)";
          ctx.fillRect(bullet.x - 2, bullet.y, bullet.width + 4, bullet.height + 8);
        } else if (bullet.isBounced) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = "hsl(0, 85%, 55%)";
          ctx.fillStyle = "hsl(0, 85%, 55%)";
          ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        } else {
        ctx.shadowBlur = 8;
          ctx.shadowColor = "hsl(200, 70%, 50%)";
          ctx.fillStyle = "hsl(200, 70%, 50%)";
          ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
      });

      // Draw DANGER text for bounced bullets
      bullets.filter(b => b.isBounced).forEach((bullet) => {
        // Calculate how close to bottom (0 = top, 1 = at paddle)
        const paddleY = paddle?.y ?? (height - 30);
        const dangerProgress = Math.min(1, Math.max(0, bullet.y / paddleY));
        
        // Scale from 1.0 to 2.0 based on proximity to paddle
        const textScale = 1 + dangerProgress * 1;
        
        // Opacity increases as it gets closer
        const textOpacity = 0.5 + dangerProgress * 0.5;
        
        // Pulsing animation based on time
        const pulse = 1 + Math.sin(Date.now() / 100) * 0.15;
        const finalScale = textScale * pulse;
        
        ctx.save();
        ctx.font = `bold ${Math.floor(14 * finalScale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255, 50, 0, ${textOpacity})`;
        ctx.shadowBlur = 15 * finalScale;
        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        
        // Position above the bullet
        ctx.fillText('⚠ DANGER!', bullet.x + bullet.width / 2, bullet.y - 10 * finalScale);
        ctx.restore();
      });

      // Draw bullet impact effects on boss hits
      bulletImpacts.forEach(impact => {
        const elapsed = Date.now() - impact.startTime;
        if (elapsed >= 500) return;
        
        const progress = elapsed / 500;
        const fadeOut = 1 - progress;
        
        // Expanding rings
        const ringCount = impact.isSuper ? 4 : 2;
        for (let i = 0; i < ringCount; i++) {
          const ringRadius = 10 + progress * 50 + i * 10;
          const ringAlpha = fadeOut * (1 - i * 0.2);
          
          const color = impact.isSuper ? `hsla(45, 100%, 60%, ${ringAlpha})` : `hsla(200, 100%, 60%, ${ringAlpha})`;
          ctx.strokeStyle = color;
          ctx.lineWidth = 3 - i * 0.5;
          ctx.shadowBlur = impact.isSuper ? 15 : 8;
          ctx.shadowColor = impact.isSuper ? 'hsl(45, 100%, 50%)' : 'hsl(200, 100%, 50%)';
          
          ctx.beginPath();
          ctx.arc(impact.x, impact.y, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        // Central flash
        const flashSize = (impact.isSuper ? 20 : 12) * (1 - progress * 0.5);
        const flashGradient = ctx.createRadialGradient(impact.x, impact.y, 0, impact.x, impact.y, flashSize);
        if (impact.isSuper) {
          flashGradient.addColorStop(0, `rgba(255, 255, 200, ${fadeOut})`);
          flashGradient.addColorStop(0.5, `rgba(255, 220, 50, ${fadeOut * 0.7})`);
          flashGradient.addColorStop(1, `rgba(255, 180, 0, 0)`);
        } else {
          flashGradient.addColorStop(0, `rgba(200, 255, 255, ${fadeOut})`);
          flashGradient.addColorStop(0.5, `rgba(50, 200, 255, ${fadeOut * 0.7})`);
          flashGradient.addColorStop(1, `rgba(0, 150, 255, 0)`);
        }
        ctx.fillStyle = flashGradient;
        ctx.beginPath();
        ctx.arc(impact.x, impact.y, flashSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Spark particles (for super bullets)
        if (impact.isSuper && qualitySettings.level !== 'low') {
          const sparkCount = 6;
          for (let i = 0; i < sparkCount; i++) {
            const angle = (i / sparkCount) * Math.PI * 2 + progress * 3;
            const sparkDist = 15 + progress * 40;
            const sparkX = impact.x + Math.cos(angle) * sparkDist;
            const sparkY = impact.y + Math.sin(angle) * sparkDist;
            
            ctx.fillStyle = `rgba(255, 220, 50, ${fadeOut * 0.8})`;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 3 * fadeOut, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        ctx.shadowBlur = 0;
      });

      // Draw shield if paddle has it - animated yellow energy force field (static on low quality)
      if (paddle && paddle.hasShield) {
        const shieldPadding = 8;
        const shieldX = paddle.x - shieldPadding;
        const shieldY = paddle.y - shieldPadding - 5;
        const shieldWidth = paddle.width + shieldPadding * 2;
        const shieldHeight = paddle.height + shieldPadding * 2 + 5;
        
        if (qualitySettings.level === 'low') {
          // LOW QUALITY: Static simple yellow outline
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(255, 220, 0, 0.6)';
          ctx.strokeStyle = 'rgba(255, 220, 0, 0.8)';
          ctx.lineWidth = 3;
          
          // Draw simple rounded rectangle
          ctx.beginPath();
          const radius = 8;
          ctx.moveTo(shieldX + radius, shieldY);
          ctx.lineTo(shieldX + shieldWidth - radius, shieldY);
          ctx.arcTo(shieldX + shieldWidth, shieldY, shieldX + shieldWidth, shieldY + radius, radius);
          ctx.lineTo(shieldX + shieldWidth, shieldY + shieldHeight - radius);
          ctx.arcTo(shieldX + shieldWidth, shieldY + shieldHeight, shieldX + shieldWidth - radius, shieldY + shieldHeight, radius);
          ctx.lineTo(shieldX + radius, shieldY + shieldHeight);
          ctx.arcTo(shieldX, shieldY + shieldHeight, shieldX, shieldY + shieldHeight - radius, radius);
          ctx.lineTo(shieldX, shieldY + radius);
          ctx.arcTo(shieldX, shieldY, shieldX + radius, shieldY, radius);
          ctx.closePath();
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          // MEDIUM/HIGH QUALITY: Animated shield effect
          const time = Date.now() / 1000;
          const pulseIntensity = 0.5 + Math.sin(time * 4) * 0.3;
          
          // Multiple layers for depth
          for (let layer = 0; layer < 3; layer++) {
            const layerOffset = layer * 2;
            const layerAlpha = (1 - layer * 0.3) * pulseIntensity;
            
            ctx.shadowBlur = 20 - layer * 5;
            ctx.shadowColor = `rgba(255, 220, 0, ${layerAlpha})`;
            ctx.strokeStyle = `rgba(255, 220, 0, ${layerAlpha * 0.8})`;
            ctx.lineWidth = 3 - layer;
            
            // Draw rounded shield outline
            ctx.beginPath();
            const radius = 8;
            ctx.moveTo(shieldX - layerOffset + radius, shieldY - layerOffset);
            ctx.lineTo(shieldX - layerOffset + shieldWidth - radius, shieldY - layerOffset);
            ctx.arcTo(shieldX - layerOffset + shieldWidth, shieldY - layerOffset, 
                      shieldX - layerOffset + shieldWidth, shieldY - layerOffset + radius, radius);
            ctx.lineTo(shieldX - layerOffset + shieldWidth, shieldY - layerOffset + shieldHeight - radius);
            ctx.arcTo(shieldX - layerOffset + shieldWidth, shieldY - layerOffset + shieldHeight, 
                      shieldX - layerOffset + shieldWidth - radius, shieldY - layerOffset + shieldHeight, radius);
            ctx.lineTo(shieldX - layerOffset + radius, shieldY - layerOffset + shieldHeight);
            ctx.arcTo(shieldX - layerOffset, shieldY - layerOffset + shieldHeight, 
                      shieldX - layerOffset, shieldY - layerOffset + shieldHeight - radius, radius);
            ctx.lineTo(shieldX - layerOffset, shieldY - layerOffset + radius);
            ctx.arcTo(shieldX - layerOffset, shieldY - layerOffset, 
                      shieldX - layerOffset + radius, shieldY - layerOffset, radius);
            ctx.closePath();
            ctx.stroke();
          }
          
          // Electrical arcs animation (only on medium/high)
          const arcCount = 6;
          for (let i = 0; i < arcCount; i++) {
            const arcTime = time * 3 + i * (Math.PI * 2 / arcCount);
            const arcX = shieldX + shieldWidth / 2 + Math.cos(arcTime) * (shieldWidth / 2 - 5);
            const arcY = shieldY + shieldHeight / 2 + Math.sin(arcTime) * (shieldHeight / 2 - 5);
            const arcEndX = shieldX + shieldWidth / 2 + Math.cos(arcTime + 0.5) * (shieldWidth / 2);
            const arcEndY = shieldY + shieldHeight / 2 + Math.sin(arcTime + 0.5) * (shieldHeight / 2);
            
            const branchIntensity = (Math.sin(arcTime * 5) + 1) / 2;
            
            ctx.strokeStyle = `rgba(255, 255, 100, ${branchIntensity * 0.7})`;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = "rgba(255, 220, 0, 0.8)";
            
            ctx.beginPath();
            ctx.moveTo(arcX, arcY);
            
            // Create jagged electrical path
            const segments = 4;
            for (let s = 1; s <= segments; s++) {
              const t = s / segments;
              const baseX = arcX + (arcEndX - arcX) * t;
              const baseY = arcY + (arcEndY - arcY) * t;
              const jitterX = (Math.random() - 0.5) * 8;
              const jitterY = (Math.random() - 0.5) * 8;
              ctx.lineTo(baseX + jitterX, baseY + jitterY);
            }
            ctx.stroke();
          }
          
          // Inner energy fill (semi-transparent)
          const gradient = ctx.createRadialGradient(
            shieldX + shieldWidth / 2, shieldY + shieldHeight / 2, 0,
            shieldX + shieldWidth / 2, shieldY + shieldHeight / 2, shieldWidth / 2
          );
          gradient.addColorStop(0, `rgba(255, 255, 150, ${0.15 * pulseIntensity})`);
          gradient.addColorStop(1, `rgba(255, 220, 0, 0)`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(shieldX + 8, shieldY);
          ctx.lineTo(shieldX + shieldWidth - 8, shieldY);
          ctx.arcTo(shieldX + shieldWidth, shieldY, shieldX + shieldWidth, shieldY + 8, 8);
          ctx.lineTo(shieldX + shieldWidth, shieldY + shieldHeight - 8);
          ctx.arcTo(shieldX + shieldWidth, shieldY + shieldHeight, shieldX + shieldWidth - 8, shieldY + shieldHeight, 8);
          ctx.lineTo(shieldX + 8, shieldY + shieldHeight);
          ctx.arcTo(shieldX, shieldY + shieldHeight, shieldX, shieldY + shieldHeight - 8, 8);
          ctx.lineTo(shieldX, shieldY + 8);
          ctx.arcTo(shieldX, shieldY, shieldX + 8, shieldY, 8);
          ctx.closePath();
          ctx.fill();
          
          ctx.shadowBlur = 0;
        }
        
        // Draw impact effects
        const now = Date.now();
        shieldImpacts.forEach(impact => {
          const elapsed = now - impact.startTime;
          if (elapsed >= impact.duration) return;
          
          const progress = elapsed / impact.duration;
          const fadeOut = 1 - progress;
          
          // Expanding ripple effect
          const rippleRadius = 15 + progress * 40;
          const rippleCount = qualitySettings.level !== 'low' ? 3 : 2;
          
          for (let i = 0; i < rippleCount; i++) {
            const offset = i * 10;
            const alpha = fadeOut * (1 - i * 0.3);
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            ctx.lineWidth = 3 - i;
            ctx.shadowBlur = 15;
            ctx.shadowColor = `rgba(255, 255, 100, ${alpha})`;
            
            ctx.beginPath();
            ctx.arc(impact.x, impact.y, rippleRadius + offset, 0, Math.PI * 2);
            ctx.stroke();
          }
          
          // Flash effect at impact point
          const flashSize = 8 * (1 - progress * 0.5);
          const flashGradient = ctx.createRadialGradient(
            impact.x, impact.y, 0,
            impact.x, impact.y, flashSize
          );
          flashGradient.addColorStop(0, `rgba(255, 255, 255, ${fadeOut * 0.9})`);
          flashGradient.addColorStop(0.5, `rgba(255, 220, 0, ${fadeOut * 0.6})`);
          flashGradient.addColorStop(1, `rgba(255, 220, 0, 0)`);
          
          ctx.fillStyle = flashGradient;
          ctx.beginPath();
          ctx.arc(impact.x, impact.y, flashSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Spark particles
          if (qualitySettings.level !== 'low') {
            const sparkCount = 6;
            for (let i = 0; i < sparkCount; i++) {
              const angle = (i / sparkCount) * Math.PI * 2 + progress * Math.PI;
              const dist = 5 + progress * 25;
              const sx = impact.x + Math.cos(angle) * dist;
              const sy = impact.y + Math.sin(angle) * dist;
              const sparkSize = 3 * fadeOut;
              
              ctx.fillStyle = `rgba(255, 255, 200, ${fadeOut * 0.8})`;
              ctx.shadowBlur = 8;
              ctx.shadowColor = `rgba(255, 220, 0, ${fadeOut})`;
              ctx.fillRect(sx - sparkSize / 2, sy - sparkSize / 2, sparkSize, sparkSize);
            }
          }
          
          ctx.shadowBlur = 0;
        });
      }

      // Reflect shield visual effect (smaller/thinner)
      if (paddle?.hasReflectShield) {
        ctx.save();
        const gradient = ctx.createLinearGradient(
          paddle.x, paddle.y - 18,
          paddle.x + paddle.width, paddle.y - 18
        );
        gradient.addColorStop(0, 'rgba(192, 192, 192, 0.3)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(192, 192, 192, 0.3)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(paddle.x - 5, paddle.y - 18, paddle.width + 10, 12);
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(Date.now() / 200) * 0.3})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(paddle.x - 5, paddle.y - 18, paddle.width + 10, 12);
        ctx.restore();
      }
      
      // Draw turrets if paddle has them
      if (paddle && paddle.hasTurrets) {
        const turretWidth = 10; // Narrower turrets
        const turretHeight = 12;
        
        // Calculate turret color based on super status and ammo
        let turretHue = 0; // Grey (achromatic)
        let turretSat = 0;
        let turretLight = 60;
        let glowColor = "hsl(0, 0%, 60%)";
        
        if (paddle.hasSuperTurrets) {
          // Super turrets: yellow to red based on ammo (45 max)
          const maxShots = 45;
          const ammoRatio = Math.min((paddle.turretShots || 0) / maxShots, 1);
          // Yellow (50) to Red (0) as ammo depletes
          turretHue = ammoRatio * 50;
          turretSat = 90;
          turretLight = 55;
          glowColor = `hsl(${turretHue}, ${turretSat}%, ${turretLight}%)`;
        }
        
        const mainColor = paddle.hasSuperTurrets 
          ? `hsl(${turretHue}, ${turretSat}%, ${turretLight}%)`
          : "hsl(0, 0%, 60%)";
        const darkColor = paddle.hasSuperTurrets
          ? `hsl(${turretHue}, ${turretSat}%, ${turretLight - 20}%)`
          : "hsl(0, 0%, 40%)";
        
        // Left turret
        ctx.shadowBlur = paddle.hasSuperTurrets ? 10 : 6;
        ctx.shadowColor = glowColor;
        ctx.fillStyle = mainColor;
        ctx.fillRect(paddle.x + 5, paddle.y - turretHeight, turretWidth, turretHeight);
        
        // Retro pattern - darker lines
        ctx.shadowBlur = 0;
        ctx.fillStyle = darkColor;
        for (let i = 0; i < turretHeight; i += 3) {
          ctx.fillRect(paddle.x + 5, paddle.y - turretHeight + i, turretWidth, 1);
        }
        
        // Highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(paddle.x + 5, paddle.y - turretHeight, turretWidth, 2);
        
        // Right turret
        ctx.shadowBlur = paddle.hasSuperTurrets ? 10 : 6;
        ctx.shadowColor = glowColor;
        ctx.fillStyle = mainColor;
        ctx.fillRect(paddle.x + paddle.width - 15, paddle.y - turretHeight, turretWidth, turretHeight);
        
        // Retro pattern - darker lines
        ctx.shadowBlur = 0;
        ctx.fillStyle = darkColor;
        for (let i = 0; i < turretHeight; i += 3) {
          ctx.fillRect(paddle.x + paddle.width - 15, paddle.y - turretHeight + i, turretWidth, 1);
        }
        
        // Highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(paddle.x + paddle.width - 15, paddle.y - turretHeight, turretWidth, 2);
        
        // Draw turret ammo counter near paddle
        if (paddle.turretShots && paddle.turretShots > 0) {
          ctx.save();
          ctx.font = '10px "Press Start 2P", monospace';
          ctx.fillStyle = paddle.hasSuperTurrets ? 'hsl(45, 90%, 60%)' : 'hsl(0, 0%, 80%)';
          ctx.shadowBlur = 4;
          ctx.shadowColor = paddle.hasSuperTurrets ? 'hsl(45, 100%, 50%)' : 'hsl(0, 0%, 60%)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            paddle.turretShots.toString(),
            paddle.x + paddle.width / 2,
            paddle.y - turretHeight - 8
          );
          ctx.restore();
        }
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

      // Draw laser warnings with enhanced pulsating dotted effect
      laserWarnings.forEach(warning => {
        const elapsed = Date.now() - warning.startTime;
        const progress = elapsed / 800; // 0 to 1
        
        // Pulsating effect - faster and more dramatic
        const pulse = Math.abs(Math.sin(elapsed / 100)); // Fast pulse
        const alpha = 0.4 + (pulse * 0.6); // Range: 0.4 to 1.0
        
        // Find the boss position to draw from boss to bottom
        const bossSource = boss || resurrectedBosses.find(b => 
          Math.abs((b.x + b.width / 2) - (warning.x + 4)) < 10
        );
        
        const startY = bossSource ? bossSource.y + bossSource.height : 0;
        
        // Draw thick dotted warning line
        ctx.strokeStyle = `rgba(255, ${40 + pulse * 100}, 0, ${alpha})`;
        ctx.lineWidth = 10 + (pulse * 6); // Pulsating width
        ctx.setLineDash([5, 15]); // Dotted pattern (short dots, long gaps)
        ctx.lineDashOffset = (Date.now() / 30) % 20; // Animated dots
        
        ctx.beginPath();
        ctx.moveTo(warning.x + 4, startY);
        ctx.lineTo(warning.x + 4, height);
        ctx.stroke();
        
        // Draw glowing center line
        ctx.strokeStyle = `rgba(255, 255, 100, ${alpha * 0.8})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(warning.x + 4, startY);
        ctx.lineTo(warning.x + 4, height);
        ctx.stroke();
        
        // Reset line dash
        ctx.setLineDash([]);
        
        // Add warning text near paddle area
        if (progress > 0.3) {
          ctx.fillStyle = `rgba(255, 50, 0, ${alpha})`;
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('!! LASER !!', warning.x + 4, height - 80);
        }
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
        // Boss stun visual effect
        if (boss.isStunned) {
          ctx.save();
          ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
          ctx.strokeStyle = '#00FFFF';
          ctx.lineWidth = 3;
          for (let i = 0; i < 6; i++) {
            const angle = (Date.now() / 500 + i * Math.PI / 3) % (2 * Math.PI);
            const r = boss.width / 2 + 10;
            const x = boss.x + boss.width / 2 + Math.cos(angle) * r;
            const y = boss.y + boss.height / 2 + Math.sin(angle) * r;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.random() * 10 - 5, y + Math.random() * 10 - 5);
            ctx.stroke();
          }
          ctx.restore();
        }
        
        // Debug: Draw shape-specific, rotating boss hitbox (1px wider than visual)
        if (SHOW_BOSS_HITBOX) {
          const centerX = boss.x + boss.width / 2;
          const centerY = boss.y + boss.height / 2;
          const HITBOX_EXPAND = 1;
          
          ctx.save();
          ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
          
          ctx.translate(centerX, centerY);
          
          if (boss.type === 'cube') {
            ctx.rotate(boss.rotationY);
            const halfSize = (boss.width + 2 * HITBOX_EXPAND) / 2;
            ctx.strokeRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);
            ctx.fillRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);
          } else if (boss.type === 'sphere') {
            const radius = boss.width / 2 + HITBOX_EXPAND;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fill();
          } else if (boss.type === 'pyramid') {
            ctx.rotate(boss.rotationY);
            const size = boss.width / 2 + HITBOX_EXPAND;
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size, size);
            ctx.lineTo(-size, size);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
          }
          
          ctx.restore();
          
          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 1)';
          ctx.font = 'bold 10px monospace';
          const rotDeg = (boss.rotationY * 180 / Math.PI).toFixed(0);
          ctx.fillText(
            `${boss.type.toUpperCase()} hitbox (rot: ${rotDeg}°)`, 
            centerX - 50, 
            centerY - boss.height / 2 - 10
          );
          ctx.restore();
        }
        
        const centerX = boss.x + boss.width / 2;
        const centerY = boss.y + boss.height / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        
        if (boss.type === 'cube') {
          // 3D retro pixel cube with depth-sorted faces
          const size = boss.width / 2;
          const baseHue = boss.isAngry ? 0 : 180;
          
          // Define 3D cube vertices
          const vertices = [
            [-size, -size, -size], // 0: back-bottom-left
            [size, -size, -size],  // 1: back-bottom-right
            [size, size, -size],   // 2: back-top-right
            [-size, size, -size],  // 3: back-top-left
            [-size, -size, size],  // 4: front-bottom-left
            [size, -size, size],   // 5: front-bottom-right
            [size, size, size],    // 6: front-top-right
            [-size, size, size]    // 7: front-top-left
          ];
          
          // Apply 3D rotation
          const cosX = Math.cos(boss.rotationX);
          const sinX = Math.sin(boss.rotationX);
          const cosY = Math.cos(boss.rotationY);
          const sinY = Math.sin(boss.rotationY);
          const cosZ = Math.cos(boss.rotationZ);
          const sinZ = Math.sin(boss.rotationZ);
          
          // Project vertices to 2D
          const projected = vertices.map(([x, y, z]) => {
            // Rotate around X axis
            let y1 = y * cosX - z * sinX;
            let z1 = y * sinX + z * cosX;
            
            // Rotate around Y axis
            let x2 = x * cosY + z1 * sinY;
            let z2 = -x * sinY + z1 * cosY;
            
            // Rotate around Z axis
            let x3 = x2 * cosZ - y1 * sinZ;
            let y3 = x2 * sinZ + y1 * cosZ;
            
            // Project to 2D with perspective
            const scale = 300 / (300 + z2);
            return [x3 * scale, y3 * scale, z2];
          });
          
          // Define faces with indices and colors
          const faces = [
            { indices: [0, 1, 2, 3], name: 'back', lightness: 40 },
            { indices: [4, 5, 6, 7], name: 'front', lightness: 60 },
            { indices: [0, 3, 7, 4], name: 'left', lightness: 48 },
            { indices: [1, 2, 6, 5], name: 'right', lightness: 52 },
            { indices: [3, 2, 6, 7], name: 'top', lightness: 55 },
            { indices: [0, 1, 5, 4], name: 'bottom', lightness: 45 }
          ];
          
          // Sort faces by depth (back to front)
          const sortedFaces = faces.map(face => {
            const avgZ = face.indices.reduce((sum, i) => sum + projected[i][2], 0) / 4;
            return { ...face, avgZ };
          }).sort((a, b) => a.avgZ - b.avgZ);
          
          // Draw each face
          sortedFaces.forEach(face => {
            const points = face.indices.map(i => projected[i]);
            
            // Only draw if face is visible (front-facing)
            const [p0, p1, p2] = points;
            const cross = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
            // Render all faces for solid retro aesthetic
            
            // Fill base color
            ctx.fillStyle = `hsl(${baseHue}, 80%, ${face.lightness}%)`;
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
            ctx.fill();
            
            // Draw retro pixel grid (quality-dependent)
            if (qualitySettings.particleMultiplier > 0.5) {
              const gridSize = qualitySettings.glowEnabled ? 8 : 6;
              ctx.strokeStyle = `rgba(255, 255, 255, ${boss.isAngry ? 0.25 : 0.15})`;
              ctx.lineWidth = 1;
              
              // Horizontal grid lines
              for (let i = 1; i < gridSize; i++) {
                const t = i / gridSize;
                const x1 = points[0][0] + (points[3][0] - points[0][0]) * t;
                const y1 = points[0][1] + (points[3][1] - points[0][1]) * t;
                const x2 = points[1][0] + (points[2][0] - points[1][0]) * t;
                const y2 = points[1][1] + (points[2][1] - points[1][1]) * t;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
              }
              
              // Vertical grid lines
              for (let i = 1; i < gridSize; i++) {
                const t = i / gridSize;
                const x1 = points[0][0] + (points[1][0] - points[0][0]) * t;
                const y1 = points[0][1] + (points[1][1] - points[0][1]) * t;
                const x2 = points[3][0] + (points[2][0] - points[3][0]) * t;
                const y2 = points[3][1] + (points[2][1] - points[3][1]) * t;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
              }
            }
            
            // Draw edge lines
            ctx.strokeStyle = `hsl(${baseHue}, 90%, 70%)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
            ctx.stroke();
            
            // Add corner highlights (16-bit style)
            if (qualitySettings.shadowsEnabled) {
              points.forEach(([x, y, z]) => {
                if (z > 0) {
                  ctx.fillStyle = `rgba(255, 255, 255, ${boss.isAngry ? 0.7 : 0.5})`;
                  ctx.fillRect(x - 2, y - 2, 4, 4);
                }
              });
            }
          });
          
          // Angry state: pulsing edge glow
          if (boss.isAngry && qualitySettings.glowEnabled) {
            const pulse = Math.sin(Date.now() / 150) * 0.5 + 0.5;
            ctx.shadowBlur = 20 * pulse;
            ctx.shadowColor = `hsl(${baseHue}, 100%, 60%)`;
            
            // Redraw outer edges with glow
            sortedFaces.forEach(face => {
              const points = face.indices.map(i => projected[i]);
              const [p0, p1, p2] = points;
              const cross = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
              if (cross < 0) return;
              
              ctx.strokeStyle = `hsl(${baseHue}, 100%, 75%)`;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(points[0][0], points[0][1]);
              for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
              }
              ctx.closePath();
              ctx.stroke();
            });
            
            ctx.shadowBlur = 0;
          }
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
        
        // Boss spawn animation overlay
        if (bossSpawnAnimation?.active) {
          const elapsed = Date.now() - bossSpawnAnimation.startTime;
          const progress = Math.min(elapsed / 500, 1); // 500ms animation
          
          // Pulsing glow effect
          const glowIntensity = Math.sin(progress * Math.PI * 4) * (1 - progress);
          ctx.shadowBlur = 30 * glowIntensity;
          ctx.shadowColor = '#00ffff';
          
          // Draw hatch opening lines (expanding from center)
          ctx.strokeStyle = `rgba(0, 255, 255, ${1 - progress})`;
          ctx.lineWidth = 3;
          const hatchSize = boss.width * 0.35 * progress;
          
          ctx.beginPath();
          ctx.moveTo(boss.x + boss.width / 2 - hatchSize, boss.y + boss.height / 2);
          ctx.lineTo(boss.x + boss.width / 2 + hatchSize, boss.y + boss.height / 2);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(boss.x + boss.width / 2, boss.y + boss.height / 2 - hatchSize);
          ctx.lineTo(boss.x + boss.width / 2, boss.y + boss.height / 2 + hatchSize);
          ctx.stroke();
          
          // Particle burst effect
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = 35 * progress;
            const px = boss.x + boss.width / 2 + Math.cos(angle) * dist;
            const py = boss.y + boss.height / 2 + Math.sin(angle) * dist;
            const size = 4 * (1 - progress);
            
            ctx.fillStyle = `rgba(0, 255, 255, ${1 - progress})`;
            ctx.fillRect(px - size/2, py - size/2, size, size);
          }
          
          ctx.shadowBlur = 0;
        }
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
          // Paused state - overlay handled by React component, no canvas text needed
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
    
      // Draw game over particles
      if (gameOverParticles.length > 0) {
        ctx.save();
        gameOverParticles.forEach((particle: Particle) => {
          const particleAlpha = particle.life / particle.maxLife;
          ctx.globalAlpha = particleAlpha;
          
          // Draw particle with glow
          if (qualitySettings.glowEnabled) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = particle.color;
          }
          ctx.fillStyle = particle.color;
          
          // Draw as small glowing circle
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Add a bright center
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(255, 255, 255, ${particleAlpha * 0.9})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
      
      // Draw high score celebration particles
      if (showHighScoreEntry && highScoreParticles.length > 0) {
        ctx.save();
        highScoreParticles.forEach((particle: Particle) => {
          const alpha = particle.life / particle.maxLife;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = particle.color;
          
          // Draw as confetti rectangles with rotation
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(particle.life * 0.1);
          ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 2);
          ctx.restore();
        });
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      
      // Boss intro cinematic overlay
      if (bossIntroActive) {
        ctx.save();
        
        // Dark overlay with pulsing effect
        const pulseAlpha = 0.7 + Math.sin(Date.now() / 300) * 0.2;
        ctx.fillStyle = `rgba(0, 0, 0, ${pulseAlpha})`;
        ctx.fillRect(0, 0, width, height);
        
        // Red warning borders pulsing
        const borderPulse = 5 + Math.sin(Date.now() / 200) * 3;
        ctx.strokeStyle = `rgba(255, 0, 0, ${0.6 + Math.sin(Date.now() / 250) * 0.4})`;
        ctx.lineWidth = borderPulse;
        ctx.strokeRect(borderPulse/2, borderPulse/2, width - borderPulse, height - borderPulse);
        
        // Dramatic zoom effect on boss position (if boss exists)
        if (boss) {
          const zoomPulse = 1 + Math.sin(Date.now() / 400) * 0.1;
          ctx.save();
          ctx.translate(boss.x + boss.width / 2, boss.y + boss.height / 2);
          ctx.scale(zoomPulse, zoomPulse);
          ctx.translate(-(boss.x + boss.width / 2), -(boss.y + boss.height / 2));
          
          // Spotlight on boss
          const gradient = ctx.createRadialGradient(
            boss.x + boss.width / 2, 
            boss.y + boss.height / 2, 
            0,
            boss.x + boss.width / 2, 
            boss.y + boss.height / 2, 
            150
          );
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
          
          ctx.restore();
        }
        
        // "WARNING" text at top
        ctx.font = "bold 36px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        const warningY = height * 0.2;
        const textFlash = Math.sin(Date.now() / 150) > 0 ? 1 : 0.5;
        
        // Shadow
        ctx.shadowBlur = 20;
        ctx.shadowColor = `rgba(255, 0, 0, ${textFlash})`;
        ctx.fillStyle = `rgba(255, 50, 50, ${textFlash})`;
        ctx.fillText("⚠ WARNING ⚠", width / 2, warningY);
        
        // Subtitle
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(255, 255, 0, 0.5)";
        ctx.font = "bold 24px monospace";
        ctx.fillStyle = "rgba(255, 255, 100, 0.9)";
        ctx.fillText("BOSS APPROACHING", width / 2, warningY + 50);
        
        ctx.restore();
      }
    
      // Restore context after shake
      ctx.restore();
    
    }, [ref, width, height, bricks, balls, paddle, gameState, powerUps, bullets, enemy, bombs, level, backgroundPhase, explosions, launchAngle, bonusLetters, collectedLetters, screenShake, backgroundFlash, boss, resurrectedBosses, bossAttacks, laserWarnings, gameOverParticles, highScoreParticles, showHighScoreEntry, bossIntroActive, qualitySettings]);

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
