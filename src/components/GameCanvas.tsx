import { forwardRef, useEffect, useRef } from "react";
import type { Brick, Ball, Paddle, GameState, PowerUp, Bullet, Enemy, Bomb, Explosion, BonusLetter, BonusLetterType, Particle, Boss, BossAttack, ShieldImpact } from "@/types/game";
import type { QualitySettings } from "@/hooks/useAdaptiveQuality";
import type { DangerBall } from "@/utils/megaBossAttacks";
import type { MegaBoss } from "@/utils/megaBossUtils";
import { powerUpImages } from "@/utils/powerUpImages";
import { particlePool } from "@/utils/particlePool";
import { bonusLetterImages } from "@/utils/bonusLetterImages";
import { isMegaBoss } from "@/utils/megaBossUtils";
import paddleImg from "@/assets/paddle.png";
import paddleTurretsImg from "@/assets/paddle-turrets.png";
import crackedBrick1 from "@/assets/brick-cracked-1.png";
import crackedBrick2 from "@/assets/brick-cracked-2.png";
import crackedBrick3 from "@/assets/brick-cracked-3.png";
import backgroundTile1 from "@/assets/background-tile.png";
import backgroundTile2 from "@/assets/background-tile-2.png";
import backgroundTile3 from "@/assets/background-tile-3.png";
import backgroundTile4 from "@/assets/background-tile-4.png";
import backgroundTile69 from "@/assets/background-tile-6-9.png";
import backgroundTile1114 from "@/assets/background-tile-11-14.png";
import backgroundTile1620 from "@/assets/background-tile-16-20.png";
import bossLevel5Bg from "@/assets/boss-level-5-bg.png";
import bossLevel10Bg from "@/assets/boss-level-10-bg.png";
import bossLevel15Bg from "@/assets/boss-level-15-bg.png";
import bossLevel20Bg from "@/assets/boss-level-20-bg.png";
import megaBossSprite from "@/assets/mega-boss.png";

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
  superWarnings: Array<{ x: number; y: number; startTime: number }>;
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
  isMobile?: boolean; // Mobile device flag for disabling certain effects
  secondChanceImpact?: { x: number; y: number; startTime: number } | null;
  // Mega Boss (Level 20) props
  dangerBalls?: DangerBall[];
  empSlowActive?: boolean; // EMP pulse effect active
  empPulseStartTime?: number | null; // For visual animation timing
  ballReleaseHighlight?: { active: boolean; startTime: number } | null; // Ball release slow-mo highlight
}

export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ width, height, bricks, balls, paddle, gameState, powerUps, bullets, enemy, bombs, level, backgroundPhase, explosions, launchAngle, bonusLetters, collectedLetters, screenShake, backgroundFlash, highlightFlash = 0, qualitySettings, boss, resurrectedBosses, bossAttacks, laserWarnings, superWarnings, gameOverParticles, highScoreParticles, showHighScoreEntry, bossIntroActive, bossSpawnAnimation, shieldImpacts, bulletImpacts = [], tutorialHighlight = null, debugEnabled = false, getReadyGlow = null, isMobile = false, secondChanceImpact = null, dangerBalls = [], empSlowActive = false, empPulseStartTime = null, ballReleaseHighlight = null }, ref) => {
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
    const backgroundImage69Ref = useRef<HTMLImageElement | null>(null);
    const backgroundImage1114Ref = useRef<HTMLImageElement | null>(null);
    const backgroundImage1620Ref = useRef<HTMLImageElement | null>(null);
    const bossLevel5BgRef = useRef<HTMLImageElement | null>(null);
    const bossLevel10BgRef = useRef<HTMLImageElement | null>(null);
    const bossLevel15BgRef = useRef<HTMLImageElement | null>(null);
    const bossLevel20BgRef = useRef<HTMLImageElement | null>(null);
    const megaBossImageRef = useRef<HTMLImageElement | null>(null);
    const backgroundPattern1Ref = useRef<CanvasPattern | null>(null);
    const backgroundPattern2Ref = useRef<CanvasPattern | null>(null);
    const backgroundPattern3Ref = useRef<CanvasPattern | null>(null);
    const backgroundPattern4Ref = useRef<CanvasPattern | null>(null);
    const backgroundPattern69Ref = useRef<CanvasPattern | null>(null);
    const backgroundPattern1114Ref = useRef<CanvasPattern | null>(null);
    const backgroundPattern1620Ref = useRef<CanvasPattern | null>(null);
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
    
    // Debug flag for boss hitbox - now connected to debugEnabled prop
    const SHOW_BOSS_HITBOX = debugEnabled;
    
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
      
      // Background for levels 6-9 (tiled)
      const backgroundImage69 = new Image();
      backgroundImage69.src = backgroundTile69;
      backgroundImage69.onload = () => {
        backgroundImage69Ref.current = backgroundImage69;
        backgroundPattern69Ref.current = null;
      };
      
      // Background for levels 11-14 (tiled)
      const backgroundImage1114 = new Image();
      backgroundImage1114.src = backgroundTile1114;
      backgroundImage1114.onload = () => {
        backgroundImage1114Ref.current = backgroundImage1114;
        backgroundPattern1114Ref.current = null;
      };
      
      // Background for levels 16-20 (tiled)
      const backgroundImage1620 = new Image();
      backgroundImage1620.src = backgroundTile1620;
      backgroundImage1620.onload = () => {
        backgroundImage1620Ref.current = backgroundImage1620;
        backgroundPattern1620Ref.current = null;
      };
      
      // Boss level 5 background (fitted, not tiled)
      const bossLevel5BgImage = new Image();
      bossLevel5BgImage.src = bossLevel5Bg;
      bossLevel5BgImage.onload = () => {
        bossLevel5BgRef.current = bossLevel5BgImage;
      };
      
      // Boss level 10 background (fitted, not tiled)
      const bossLevel10BgImage = new Image();
      bossLevel10BgImage.src = bossLevel10Bg;
      bossLevel10BgImage.onload = () => {
        bossLevel10BgRef.current = bossLevel10BgImage;
      };
      
      // Boss level 15 background (fitted, not tiled)
      const bossLevel15BgImage = new Image();
      bossLevel15BgImage.src = bossLevel15Bg;
      bossLevel15BgImage.onload = () => {
        bossLevel15BgRef.current = bossLevel15BgImage;
      };
      
      // Boss level 20 (Mega Boss) background (fitted, not tiled)
      const bossLevel20BgImage = new Image();
      bossLevel20BgImage.src = bossLevel20Bg;
      bossLevel20BgImage.onload = () => {
        bossLevel20BgRef.current = bossLevel20BgImage;
      };
      
      // Mega Boss sprite
      const megaBossImage = new Image();
      megaBossImage.src = megaBossSprite;
      megaBossImage.onload = () => {
        megaBossImageRef.current = megaBossImage;
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
      let useFittedBackground = false;
      
      // Boss levels use fitted backgrounds (not tiled)
      if (level === 5 && isImageValid(bossLevel5BgRef.current)) {
        ctx.drawImage(bossLevel5BgRef.current, 0, 0, width, height);
        useFittedBackground = true;
      } else if (level === 10 && isImageValid(bossLevel10BgRef.current)) {
        ctx.drawImage(bossLevel10BgRef.current, 0, 0, width, height);
        useFittedBackground = true;
      } else if (level === 15 && isImageValid(bossLevel15BgRef.current)) {
        ctx.drawImage(bossLevel15BgRef.current, 0, 0, width, height);
        useFittedBackground = true;
      } else if (level === 20 && isImageValid(bossLevel20BgRef.current)) {
        ctx.drawImage(bossLevel20BgRef.current, 0, 0, width, height);
        useFittedBackground = true;
      }
      
      if (!useFittedBackground) {
        // Determine which background tile to use based on level
        let bgImg: HTMLImageElement | null = null;
        let bgPatternRef: React.MutableRefObject<CanvasPattern | null> = backgroundPattern4Ref;
        
        if (level >= 16 && level <= 19) {
          bgImg = backgroundImage1620Ref.current;
          bgPatternRef = backgroundPattern1620Ref;
        } else if (level >= 11 && level <= 14) {
          bgImg = backgroundImage1114Ref.current;
          bgPatternRef = backgroundPattern1114Ref;
        } else if (level >= 6 && level <= 9) {
          bgImg = backgroundImage69Ref.current;
          bgPatternRef = backgroundPattern69Ref;
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
          }
        }
      }
          
      // Dim background for levels 1-4 (40% darker)
      if (level >= 1 && level <= 4) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, width, height);
        
        // Subtle ambient flicker on brighter areas (only levels 1-4, disabled on mobile)
        if (!isMobile) {
          const ambientFlicker = Math.sin(Date.now() / 500) * 0.03 + 0.03;
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = `rgba(100, 150, 200, ${ambientFlicker})`;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }
      }
      
      // Apply highlight flash effect for explosions/kills/extra life (levels 1-4 only)
      // Uses overlay/soft-light blend modes - dark areas stay dark, bright tech lines glow
      if (highlightFlash > 0 && level >= 1 && level <= 4) {
        ctx.save();
        
        // Determine flash color based on intensity
        const isGolden = highlightFlash > 1.2; // Extra life = golden flash
        const intensity = Math.min(highlightFlash, 1.0);
        
        // First pass: 'overlay' mode - multiplies dark areas (keeps them dark)
        // and screens light areas (makes them glow)
        ctx.globalCompositeOperation = 'overlay';
        
        if (isGolden) {
          // Golden flash - only bright areas will glow golden
          ctx.fillStyle = `rgba(255, 200, 100, ${intensity * 0.6})`;
        } else {
          // Cyan flash for explosions and kills
          ctx.fillStyle = `rgba(100, 200, 255, ${intensity * 0.5})`;
        }
        ctx.fillRect(0, 0, width, height);
        
        // Second pass: 'soft-light' for additional glow on bright spots only
        ctx.globalCompositeOperation = 'soft-light';
        if (isGolden) {
          ctx.fillStyle = `rgba(255, 220, 150, ${intensity * 0.7})`;
        } else {
          ctx.fillStyle = `rgba(150, 220, 255, ${intensity * 0.6})`;
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

      // Draw paddle (with rotation support for perimeter mode)
      if (paddle) {
        const img = paddleImageRef.current;
        
        ctx.save();
        
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
        
        ctx.restore();
      }
      
      // ═══ DANGER BALL RENDERING ═══
      if (dangerBalls && dangerBalls.length > 0) {
        dangerBalls.forEach((dangerBall) => {
          ctx.save();
          
          // Different appearance for reflected (homing) vs normal danger balls
          const isHoming = dangerBall.isReflected;
          
          // Flashing animation between red and white (green for homing)
          const flashPhase = Math.sin(Date.now() / 80);
          const isWhitePhase = flashPhase > 0;
          
          // Draw targeting line from danger ball to paddle (non-reflected only)
          if (!isHoming && paddle) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.lineDashOffset = -Date.now() / 50;
            ctx.beginPath();
            ctx.moveTo(dangerBall.x, dangerBall.y);
            ctx.lineTo(paddle.x + paddle.width / 2, paddle.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }
          
          // Enhanced outer glow with larger radius
          if (qualitySettings.glowEnabled) {
            ctx.shadowBlur = 35;
            if (isHoming) {
              ctx.shadowColor = isWhitePhase ? 'rgba(100, 255, 100, 0.9)' : 'rgba(50, 200, 50, 0.9)';
            } else {
              ctx.shadowColor = isWhitePhase ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 50, 50, 0.9)';
            }
          }
          
          // Draw danger ball
          ctx.beginPath();
          ctx.arc(dangerBall.x, dangerBall.y, dangerBall.radius, 0, Math.PI * 2);
          
          // Gradient fill
          const grad = ctx.createRadialGradient(
            dangerBall.x - dangerBall.radius * 0.3,
            dangerBall.y - dangerBall.radius * 0.3,
            0,
            dangerBall.x,
            dangerBall.y,
            dangerBall.radius
          );
          
          if (isHoming) {
            // Green gradient for homing balls
            if (isWhitePhase) {
              grad.addColorStop(0, '#ffffff');
              grad.addColorStop(0.5, '#aaffaa');
              grad.addColorStop(1, '#44cc44');
            } else {
              grad.addColorStop(0, '#88ff88');
              grad.addColorStop(0.5, '#22cc22');
              grad.addColorStop(1, '#006600');
            }
          } else {
            // Red gradient for normal balls
            if (isWhitePhase) {
              grad.addColorStop(0, '#ffffff');
              grad.addColorStop(0.5, '#ffcccc');
              grad.addColorStop(1, '#ff6666');
            } else {
              grad.addColorStop(0, '#ff8888');
              grad.addColorStop(0.5, '#ff2222');
              grad.addColorStop(1, '#aa0000');
            }
          }
          
          ctx.fillStyle = grad;
          ctx.fill();
          
          // Inner warning symbol (star for normal, arrow for homing)
          ctx.shadowBlur = 0;
          ctx.fillStyle = isWhitePhase ? (isHoming ? '#006600' : '#ff0000') : '#ffffff';
          ctx.font = `bold ${dangerBall.radius * 1.2}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isHoming ? '↑' : '★', dangerBall.x, dangerBall.y);
          
          // Outer ring pulse
          const pulseScale = 1 + Math.sin(Date.now() / 150) * 0.2;
          ctx.strokeStyle = isHoming 
            ? (isWhitePhase ? 'rgba(100, 255, 100, 0.6)' : 'rgba(255, 255, 255, 0.6)')
            : (isWhitePhase ? 'rgba(255, 100, 100, 0.6)' : 'rgba(255, 255, 255, 0.6)');
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(dangerBall.x, dangerBall.y, dangerBall.radius * pulseScale * 1.3, 0, Math.PI * 2);
          ctx.stroke();
          
          // Flashing "CATCH!" text above non-reflected danger balls
          if (!isHoming) {
            const textFlash = Math.sin(Date.now() / 120) > 0;
            ctx.fillStyle = textFlash ? '#FFFF00' : '#FF8800';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            if (qualitySettings.glowEnabled) {
              ctx.shadowColor = '#FF0000';
              ctx.shadowBlur = 10;
            }
            ctx.fillText('CATCH!', dangerBall.x, dangerBall.y - dangerBall.radius - 8);
            ctx.shadowBlur = 0;
          }
          
          ctx.restore();
        });
        
        // Draw paddle highlight when danger balls are incoming (non-reflected)
        const incomingDangerBalls = dangerBalls.filter(b => !b.isReflected);
        if (incomingDangerBalls.length > 0 && paddle) {
          ctx.save();
          const highlightPulse = Math.sin(Date.now() / 100) * 0.4 + 0.6;
          ctx.strokeStyle = `rgba(0, 200, 255, ${highlightPulse})`;
          ctx.lineWidth = 4;
          if (qualitySettings.glowEnabled) {
            ctx.shadowColor = 'rgba(0, 200, 255, 0.8)';
            ctx.shadowBlur = 20;
          }
          ctx.beginPath();
          ctx.roundRect(paddle.x - 4, paddle.y - 4, paddle.width + 8, paddle.height + 8, 6);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Calculate chaos level for ball visibility (0-1)
      const chaosLevel = Math.min(1, 
        (bombs.length + bossAttacks.length + enemy.length + explosions.length + dangerBalls.length) / 10
      );
      
      // Draw balls
      balls.forEach((ball) => {
        const ballColor = ball.isFireball ? "hsl(30, 85%, 55%)" : "hsl(0, 0%, 92%)";
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
        
        // Ball release highlight effect (Mega Boss phase transition)
        if (ballReleaseHighlight && ballReleaseHighlight.active) {
          ctx.save();
          const elapsed = Date.now() - ballReleaseHighlight.startTime;
          const duration = 1500;
          const progress = Math.min(elapsed / duration, 1);
          
          // Fade out as we approach normal speed
          const glowOpacity = 1 - progress;
          
          // Pulsing glow effect
          const pulsePhase = (Date.now() % 400) / 400;
          const pulseIntensity = 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.3;
          
          // Large golden/cyan glow
          const releaseGlowRadius = ball.radius * 4 * pulseIntensity;
          const releaseGradient = ctx.createRadialGradient(
            ball.x, ball.y, ball.radius,
            ball.x, ball.y, releaseGlowRadius
          );
          releaseGradient.addColorStop(0, `rgba(255, 220, 100, ${glowOpacity * 0.8})`);
          releaseGradient.addColorStop(0.4, `rgba(100, 255, 255, ${glowOpacity * 0.5})`);
          releaseGradient.addColorStop(1, `rgba(100, 200, 255, 0)`);
          
          ctx.fillStyle = releaseGradient;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, releaseGlowRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // Pulsing ring
          ctx.strokeStyle = `rgba(255, 255, 100, ${glowOpacity * 0.9})`;
          ctx.lineWidth = 3;
          ctx.shadowColor = 'rgba(255, 220, 100, 1)';
          ctx.shadowBlur = 25 * glowOpacity;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 2.5 * pulseIntensity, 0, Math.PI * 2);
          ctx.stroke();
          
          // Second ring
          ctx.strokeStyle = `rgba(100, 255, 255, ${glowOpacity * 0.6})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 3.5 * pulseIntensity, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.restore();
          
          // Draw trajectory line from released ball to paddle center
          if (paddle) {
            ctx.save();
            ctx.strokeStyle = `rgba(100, 255, 200, ${glowOpacity * 0.7})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 6]);
            ctx.lineDashOffset = -Date.now() / 40; // Animated dashes
            ctx.beginPath();
            ctx.moveTo(ball.x, ball.y);
            ctx.lineTo(paddle.x + paddle.width / 2, paddle.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }
        }
        
        // Visual radius is 2px larger than collision radius for better visibility
        const visualRadius = ball.radius + 2;
        
        // ═══ CHAOS-AWARE VISIBILITY ENHANCEMENTS ═══
        // Dynamic glow when screen gets busy (chaosLevel > 0.2)
        if (chaosLevel > 0.2 && !ball.isFireball && qualitySettings.glowEnabled) {
          ctx.save();
          const chaosPulse = 1 + Math.sin(Date.now() / 200) * 0.2;
          const chaosGlowRadius = visualRadius * (2 + chaosLevel * 2) * chaosPulse;
          const chaosGlowOpacity = (chaosLevel - 0.2) * 0.875; // Scale 0.2-1.0 to 0-0.7
          
          const chaosGradient = ctx.createRadialGradient(
            ball.x, ball.y, visualRadius * 0.5,
            ball.x, ball.y, chaosGlowRadius
          );
          chaosGradient.addColorStop(0, `rgba(150, 230, 255, ${chaosGlowOpacity})`);
          chaosGradient.addColorStop(0.5, `rgba(100, 200, 255, ${chaosGlowOpacity * 0.5})`);
          chaosGradient.addColorStop(1, `rgba(80, 180, 255, 0)`);
          
          ctx.fillStyle = chaosGradient;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, chaosGlowRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        
        // Dark contrasting outline (always-on for non-fireball)
        if (!ball.isFireball) {
          ctx.save();
          ctx.fillStyle = `rgba(0, 0, 0, ${0.5 + chaosLevel * 0.2})`;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, visualRadius + 2 + chaosLevel, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        
        ctx.save();
        ctx.translate(ball.x, ball.y);
        
        // Create 3D sphere with gradient
        const gradient = ctx.createRadialGradient(
          -visualRadius * 0.3,
          -visualRadius * 0.3,
          0,
          0,
          0,
          visualRadius
        );
        
        if (ball.isFireball) {
          gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
          gradient.addColorStop(0.3, "hsl(30, 85%, 65%)");
          gradient.addColorStop(0.7, ballColor);
          gradient.addColorStop(1, "hsl(30, 85%, 35%)");
        } else {
          gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
          gradient.addColorStop(0.3, "hsl(0, 0%, 95%)");
          gradient.addColorStop(0.7, ballColor);
          gradient.addColorStop(1, "hsl(0, 0%, 60%)");
        }
        
        // Enhanced shadow based on chaos level
        if (qualitySettings.shadowsEnabled) {
          const dynamicShadowBlur = 14 + chaosLevel * 20;
          ctx.shadowBlur = dynamicShadowBlur;
          // Shift shadow color slightly cyan during chaos
          if (chaosLevel > 0.2 && !ball.isFireball) {
            ctx.shadowColor = `hsl(190, ${chaosLevel * 50}%, ${70 + chaosLevel * 20}%)`;
          } else {
            ctx.shadowColor = ballColor;
          }
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, visualRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Retro spinning pattern - rotating horizontal bands
        if (!ball.isFireball) {
          ctx.shadowBlur = 0;
          ctx.rotate((ballRotation * Math.PI) / 180);
          ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
          for (let i = -visualRadius; i < visualRadius; i += 4) {
            const lineWidth = Math.sqrt(visualRadius * visualRadius - i * i) * 2;
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
        
        // Tutorial highlight - render power-up with glow effect
        const isHighlighted = tutorialHighlight?.type === 'power_up' && powerUps.indexOf(powerUp) === 0;
        
        // Pulse animation: zoom in 5% and out 5% on 1 second interval
        const pulsePhase = (Date.now() % 1000) / 1000; // 0 to 1 over 1 second
        const pulseScale = 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.05; // 0.95 to 1.05
        
        ctx.save();
        ctx.translate(powerUp.x + size / 2, powerUp.y + size / 2);
        ctx.scale(pulseScale, pulseScale);
        ctx.translate(-size / 2, -size / 2);
        
        // Apply glow effect when highlighted in tutorial
        if (isHighlighted) {
          const glowPulse = (Date.now() % 800) / 800;
          const glowIntensity = 20 + Math.sin(glowPulse * Math.PI * 2) * 10;
          ctx.shadowColor = 'rgba(0, 255, 255, 0.9)';
          ctx.shadowBlur = glowIntensity;
        }

        // Boss power-ups - now use uploaded images (handled below with other power-ups)
        
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
        const enableGlow = qualitySettings.glowEnabled;
        
        if (bullet.isSuper && bullet.isBounced) {
          // Super bullets reflected from minion - RED with particle trail (dangerous!)
          if (enableGlow) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = "hsl(0, 100%, 50%)";
          }
          ctx.fillStyle = "hsl(0, 90%, 55%)";
          
          // Draw bullet
          ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
          
          // Extra red glow effect (only on high quality)
          if (enableGlow) {
            ctx.fillStyle = "hsla(0, 100%, 60%, 0.6)";
            ctx.fillRect(bullet.x - 3, bullet.y, bullet.width + 6, bullet.height + 10);
          }
          
          // Particle trail effect for reflected super bullets (only on high quality)
          if (qualitySettings.level === 'high') {
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
          if (enableGlow) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = "hsl(45, 100%, 50%)";
          }
          ctx.fillStyle = "hsl(45, 90%, 55%)";
          
          // Draw bullet with glow trail
          ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
          
          // Extra glow effect (only on high quality)
          if (enableGlow) {
            ctx.fillStyle = "hsla(45, 100%, 70%, 0.5)";
            ctx.fillRect(bullet.x - 2, bullet.y, bullet.width + 4, bullet.height + 8);
          }
        } else if (bullet.isBounced) {
          if (enableGlow) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = "hsl(0, 85%, 55%)";
          }
          ctx.fillStyle = "hsl(0, 85%, 55%)";
          ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        } else {
          if (enableGlow) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = "hsl(200, 70%, 50%)";
          }
          ctx.fillStyle = "hsl(200, 70%, 50%)";
          ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
        ctx.shadowBlur = 0; // Reset shadow after each bullet
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

      // Second Chance safety net - animated electricity line below paddle
      if (paddle?.hasSecondChance) {
        const safetyNetY = paddle.y + paddle.height + 35;
        const lineStartX = 10;
        const lineEndX = width - 10;
        const time = Date.now() / 1000;
        
        ctx.save();
        
        if (qualitySettings.level === 'low') {
          // LOW QUALITY: Static cyan line
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(0, 200, 255, 0.8)';
          ctx.strokeStyle = 'rgba(0, 200, 255, 0.9)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(lineStartX, safetyNetY);
          ctx.lineTo(lineEndX, safetyNetY);
          ctx.stroke();
        } else {
          // MEDIUM/HIGH QUALITY: Animated electricity effect
          const pulseIntensity = 0.6 + Math.sin(time * 6) * 0.4;
          
          // Main glow line
          ctx.shadowBlur = 20;
          ctx.shadowColor = `rgba(0, 200, 255, ${pulseIntensity})`;
          ctx.strokeStyle = `rgba(0, 200, 255, ${pulseIntensity * 0.9})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lineStartX, safetyNetY);
          ctx.lineTo(lineEndX, safetyNetY);
          ctx.stroke();
          
          // Electrical arcs along the line
          const arcCount = 12;
          for (let i = 0; i < arcCount; i++) {
            const arcProgress = (i + 1) / (arcCount + 1);
            const arcX = lineStartX + (lineEndX - lineStartX) * arcProgress;
            const arcPhase = time * 8 + i * 1.5;
            const arcHeight = Math.sin(arcPhase) * 12 * pulseIntensity;
            const branchIntensity = (Math.sin(arcPhase * 2) + 1) / 2;
            
            if (Math.abs(arcHeight) > 3) {
              ctx.strokeStyle = `rgba(100, 220, 255, ${branchIntensity * 0.8})`;
              ctx.lineWidth = 1.5;
              ctx.shadowBlur = 10;
              ctx.shadowColor = "rgba(0, 200, 255, 0.9)";
              
              ctx.beginPath();
              ctx.moveTo(arcX, safetyNetY);
              
              // Create jagged electrical path
              const segments = 3;
              const targetY = safetyNetY - arcHeight;
              for (let s = 1; s <= segments; s++) {
                const t = s / segments;
                const segY = safetyNetY + (targetY - safetyNetY) * t;
                const jitterX = (Math.random() - 0.5) * 6;
                ctx.lineTo(arcX + jitterX, segY);
              }
              ctx.stroke();
            }
          }
          
          // Traveling spark effect
          const sparkCount = 3;
          for (let s = 0; s < sparkCount; s++) {
            const sparkPhase = (time * 2 + s * 0.33) % 1;
            const sparkX = lineStartX + (lineEndX - lineStartX) * sparkPhase;
            const sparkGlow = Math.sin(sparkPhase * Math.PI);
            
            ctx.fillStyle = `rgba(255, 255, 255, ${sparkGlow * 0.9})`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = "rgba(100, 220, 255, 1)";
            ctx.beginPath();
            ctx.arc(sparkX, safetyNetY, 3 + sparkGlow * 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        ctx.restore();
      }
      
      // Second Chance impact effect
      if (secondChanceImpact) {
        const elapsed = Date.now() - secondChanceImpact.startTime;
        const impactDuration = 500;
        
        if (elapsed < impactDuration) {
          const progress = elapsed / impactDuration;
          const fadeOut = 1 - progress;
          
          ctx.save();
          
          // Expanding energy wave
          const waveRadius = 20 + progress * 80;
          const waveGradient = ctx.createRadialGradient(
            secondChanceImpact.x, secondChanceImpact.y, 0,
            secondChanceImpact.x, secondChanceImpact.y, waveRadius
          );
          waveGradient.addColorStop(0, `rgba(0, 255, 255, ${fadeOut * 0.8})`);
          waveGradient.addColorStop(0.5, `rgba(0, 200, 255, ${fadeOut * 0.4})`);
          waveGradient.addColorStop(1, `rgba(0, 200, 255, 0)`);
          
          ctx.fillStyle = waveGradient;
          ctx.beginPath();
          ctx.arc(secondChanceImpact.x, secondChanceImpact.y, waveRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // Flash at impact point
          ctx.fillStyle = `rgba(255, 255, 255, ${fadeOut * 0.9})`;
          ctx.shadowBlur = 20;
          ctx.shadowColor = "rgba(0, 200, 255, 1)";
          ctx.beginPath();
          ctx.arc(secondChanceImpact.x, secondChanceImpact.y, 8 * fadeOut, 0, Math.PI * 2);
          ctx.fill();
          
          // Electric sparks
          if (qualitySettings.level !== 'low') {
            const sparkCount = 8;
            for (let i = 0; i < sparkCount; i++) {
              const angle = (i / sparkCount) * Math.PI * 2 + progress * Math.PI * 2;
              const dist = 15 + progress * 40;
              const sx = secondChanceImpact.x + Math.cos(angle) * dist;
              const sy = secondChanceImpact.y + Math.sin(angle) * dist;
              
              ctx.strokeStyle = `rgba(100, 220, 255, ${fadeOut * 0.8})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(secondChanceImpact.x, secondChanceImpact.y);
              
              // Jagged path to spark
              const midX = (secondChanceImpact.x + sx) / 2 + (Math.random() - 0.5) * 10;
              const midY = (secondChanceImpact.y + sy) / 2 + (Math.random() - 0.5) * 10;
              ctx.lineTo(midX, midY);
              ctx.lineTo(sx, sy);
              ctx.stroke();
            }
          }
          
          ctx.restore();
        }
      }
      
      // ═══ EMP PULSE VISUAL EFFECT (Mega Boss Level 20) ═══
      if (empSlowActive && empPulseStartTime && boss && level === 20) {
        const elapsed = Date.now() - empPulseStartTime;
        const empDuration = 1500; // Match EMP_CONFIG.duration
        
        if (elapsed < empDuration) {
          const progress = elapsed / empDuration;
          
          ctx.save();
          
          // Screen-wide blue/purple tint overlay with pulsing intensity
          const pulseIntensity = 0.15 + Math.sin(elapsed / 100) * 0.08;
          ctx.fillStyle = `rgba(50, 100, 255, ${pulseIntensity * (1 - progress * 0.5)})`;
          ctx.fillRect(0, 0, width, height);
          
          // Expanding shockwave ring from boss center
          const bossX = boss.x + boss.width / 2;
          const bossY = boss.y + boss.height / 2;
          const maxRadius = Math.max(width, height);
          const waveRadius = progress * maxRadius * 1.5;
          const waveFade = Math.max(0, 1 - progress * 1.2);
          
          if (waveRadius < maxRadius * 1.2) {
            ctx.strokeStyle = `rgba(100, 180, 255, ${waveFade * 0.8})`;
            ctx.lineWidth = 8 - progress * 6;
            ctx.beginPath();
            ctx.arc(bossX, bossY, waveRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Inner glow ring
            ctx.strokeStyle = `rgba(150, 220, 255, ${waveFade * 0.5})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(bossX, bossY, waveRadius * 0.9, 0, Math.PI * 2);
            ctx.stroke();
          }
          
          // Radial distortion lines spreading outward
          if (qualitySettings.level !== 'low') {
            const lineCount = 16;
            for (let i = 0; i < lineCount; i++) {
              const angle = (i / lineCount) * Math.PI * 2 + elapsed * 0.002;
              const innerDist = 40 + progress * 80;
              const outerDist = 100 + progress * maxRadius * 0.8;
              const lineAlpha = waveFade * 0.6;
              
              const startX = bossX + Math.cos(angle) * innerDist;
              const startY = bossY + Math.sin(angle) * innerDist;
              const endX = bossX + Math.cos(angle) * outerDist;
              const endY = bossY + Math.sin(angle) * outerDist;
              
              ctx.strokeStyle = `rgba(100, 200, 255, ${lineAlpha})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(endX, endY);
              ctx.stroke();
            }
          }
          
          // Electric sparks on the paddle (slowed effect indicator)
          if (paddle) {
            const sparkCount = 6;
            const paddleCenterX = paddle.x + paddle.width / 2;
            const paddleCenterY = paddle.y + paddle.height / 2;
            
            for (let i = 0; i < sparkCount; i++) {
              const sparkPhase = (elapsed + i * 150) % 300;
              const sparkProgress = sparkPhase / 300;
              const sparkAlpha = Math.sin(sparkProgress * Math.PI) * 0.9;
              
              if (sparkAlpha > 0.1) {
                const offsetX = (Math.random() - 0.5) * paddle.width * 1.2;
                const offsetY = (Math.random() - 0.5) * paddle.height * 2;
                
                ctx.strokeStyle = `rgba(100, 220, 255, ${sparkAlpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(paddleCenterX + offsetX, paddleCenterY);
                
                // Jagged lightning path
                const midX = paddleCenterX + offsetX + (Math.random() - 0.5) * 15;
                const midY = paddleCenterY + offsetY * 0.5;
                ctx.lineTo(midX, midY);
                ctx.lineTo(paddleCenterX + offsetX + (Math.random() - 0.5) * 20, paddleCenterY + offsetY);
                ctx.stroke();
              }
            }
            
            // Blue "stunned" glow around paddle
            ctx.shadowBlur = 20;
            ctx.shadowColor = `rgba(50, 150, 255, ${0.5 + Math.sin(elapsed / 80) * 0.3})`;
            ctx.strokeStyle = `rgba(100, 200, 255, ${0.4 + Math.sin(elapsed / 80) * 0.2})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(paddle.x - 3, paddle.y - 3, paddle.width + 6, paddle.height + 6);
            ctx.shadowBlur = 0;
          }
          
          // Edge flashes (electrical arcs at screen corners)
          if (!isMobile && qualitySettings.level !== 'low') {
            const flashIntensity = Math.sin(elapsed / 50) * 0.5 + 0.5;
            const corners = [
              { x: 0, y: 0 },
              { x: width, y: 0 },
              { x: 0, y: height },
              { x: width, y: height }
            ];
            
            corners.forEach((corner, idx) => {
              const arcAlpha = flashIntensity * 0.4 * (1 - progress);
              const arcRadius = 60 + Math.sin(elapsed / 100 + idx) * 20;
              
              const gradient = ctx.createRadialGradient(
                corner.x, corner.y, 0,
                corner.x, corner.y, arcRadius
              );
              gradient.addColorStop(0, `rgba(100, 180, 255, ${arcAlpha})`);
              gradient.addColorStop(0.5, `rgba(50, 100, 200, ${arcAlpha * 0.5})`);
              gradient.addColorStop(1, 'rgba(50, 100, 200, 0)');
              
              ctx.fillStyle = gradient;
              ctx.fillRect(
                corner.x - arcRadius, 
                corner.y - arcRadius, 
                arcRadius * 2, 
                arcRadius * 2
              );
            });
          }
          
          ctx.restore();
        }
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
          
          if (qualitySettings.glowEnabled) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = baseColor;
          }
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          
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
            if (qualitySettings.glowEnabled) {
              ctx.shadowBlur = 15;
              ctx.shadowColor = `hsl(${baseHue}, ${colorIntensity}%, 55%)`;
            }
            ctx.fillStyle = face.color;
            ctx.beginPath();
            ctx.moveTo(projected[face.indices[0]][0], projected[face.indices[0]][1]);
            face.indices.forEach(i => {
              ctx.lineTo(projected[i][0], projected[i][1]);
            });
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            
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
            if (qualitySettings.glowEnabled) {
              ctx.shadowBlur = 15;
              ctx.shadowColor = "hsl(0, 85%, 55%)";
            }
            ctx.fillStyle = face.color;
            ctx.beginPath();
            ctx.moveTo(projected[face.indices[0]][0], projected[face.indices[0]][1]);
            face.indices.forEach(i => {
              ctx.lineTo(projected[i][0], projected[i][1]);
            });
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            
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
      // Step 1: Draw explosion rings/glows only (fast)
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
        
        ctx.restore();
      });
      
      // Step 2: Draw ALL pooled particles ONCE (outside explosion loop - critical fix!)
      const pooledParticles = particlePool.getActive();
      if (pooledParticles.length > 0) {
        ctx.save();
        const particleStep = Math.ceil(1 / qualitySettings.particleMultiplier);
        const enableGlow = qualitySettings.glowEnabled;
        
        for (let index = 0; index < pooledParticles.length; index += particleStep) {
          const particle = pooledParticles[index];
          const particleAlpha = particle.life / particle.maxLife;
          ctx.globalAlpha = particleAlpha;
          
          // Draw particle with glow (only if enabled)
          if (enableGlow) {
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
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(255, 255, 255, ${particleAlpha * 0.8})`;
          ctx.fillRect(
            particle.x - particle.size / 4,
            particle.y - particle.size / 4,
            particle.size / 2,
            particle.size / 2
          );
        }
        ctx.restore();
      }

      // Draw bombs and rockets
      bombs.forEach((bomb) => {
        const bombCenterX = bomb.x + bomb.width / 2;
        const bombCenterY = bomb.y + bomb.height / 2;
        
        // Spinning rotation
        const bombRotation = (Date.now() / 30) % 360;
        
        ctx.save();
        ctx.translate(bombCenterX, bombCenterY);
        ctx.rotate((bombRotation * Math.PI) / 180);
        
        const enableGlow = qualitySettings.glowEnabled;
        
        if (bomb.type === "pyramidBullet") {
          // Draw pyramid bullet - elongated diamond shape
          if (enableGlow) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = "hsl(280, 70%, 55%)";
          }
          ctx.fillStyle = "hsl(280, 70%, 55%)";
          ctx.beginPath();
          ctx.moveTo(0, -bomb.height / 2); // top
          ctx.lineTo(bomb.width / 2, 0); // right
          ctx.lineTo(0, bomb.height / 2); // bottom
          ctx.lineTo(-bomb.width / 2, 0); // left
          ctx.closePath();
          ctx.fill();
          
          // Pulsing white border
          const pyramidPulse = Math.abs(Math.sin(Date.now() / 150));
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + pyramidPulse * 0.5})`;
          ctx.lineWidth = 1.5 + pyramidPulse * 1.5;
          ctx.stroke();
          
          // Bullet highlight
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.beginPath();
          ctx.arc(-1, -2, bomb.width / 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (bomb.type === "rocket") {
          // Draw white rocket with flame trail
          const rocketLength = bomb.width * 1.8;
          const rocketWidth = bomb.width * 0.6;
          
          // Calculate rotation based on velocity
          const angle = Math.atan2(bomb.dy || 1, bomb.dx || 0);
          ctx.rotate(angle + Math.PI / 2);
          
          // Flame trail
          const flameFlicker = 0.7 + Math.random() * 0.3;
          const flameGrad = ctx.createLinearGradient(0, rocketLength * 0.3, 0, rocketLength * 0.9);
          flameGrad.addColorStop(0, `rgba(255, 200, 50, ${flameFlicker})`);
          flameGrad.addColorStop(0.4, `rgba(255, 100, 0, ${flameFlicker * 0.8})`);
          flameGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
          
          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.moveTo(-rocketWidth * 0.5, rocketLength * 0.3);
          ctx.quadraticCurveTo(0, rocketLength * 1.2, rocketWidth * 0.5, rocketLength * 0.3);
          ctx.fill();
          
          // Rocket body (white)
          if (enableGlow) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
          }
          
          const bodyGrad = ctx.createLinearGradient(-rocketWidth, 0, rocketWidth, 0);
          bodyGrad.addColorStop(0, '#cccccc');
          bodyGrad.addColorStop(0.3, '#ffffff');
          bodyGrad.addColorStop(0.7, '#ffffff');
          bodyGrad.addColorStop(1, '#aaaaaa');
          
          ctx.fillStyle = bodyGrad;
          ctx.beginPath();
          ctx.moveTo(0, -rocketLength * 0.5); // Nose
          ctx.lineTo(rocketWidth * 0.5, -rocketLength * 0.1);
          ctx.lineTo(rocketWidth * 0.5, rocketLength * 0.3);
          ctx.lineTo(-rocketWidth * 0.5, rocketLength * 0.3);
          ctx.lineTo(-rocketWidth * 0.5, -rocketLength * 0.1);
          ctx.closePath();
          ctx.fill();
          
          // Rocket nose cone (red tip)
          ctx.fillStyle = '#ff3333';
          ctx.beginPath();
          ctx.moveTo(0, -rocketLength * 0.5);
          ctx.lineTo(rocketWidth * 0.35, -rocketLength * 0.2);
          ctx.lineTo(-rocketWidth * 0.35, -rocketLength * 0.2);
          ctx.closePath();
          ctx.fill();
          
          // Fins
          ctx.fillStyle = '#ff4444';
          // Left fin
          ctx.beginPath();
          ctx.moveTo(-rocketWidth * 0.5, rocketLength * 0.1);
          ctx.lineTo(-rocketWidth * 1.0, rocketLength * 0.4);
          ctx.lineTo(-rocketWidth * 0.5, rocketLength * 0.3);
          ctx.closePath();
          ctx.fill();
          // Right fin
          ctx.beginPath();
          ctx.moveTo(rocketWidth * 0.5, rocketLength * 0.1);
          ctx.lineTo(rocketWidth * 1.0, rocketLength * 0.4);
          ctx.lineTo(rocketWidth * 0.5, rocketLength * 0.3);
          ctx.closePath();
          ctx.fill();
          
          ctx.shadowBlur = 0;
        } else {
          // Draw regular bomb (red)
          if (enableGlow) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = "hsl(0, 85%, 55%)";
          }
          ctx.fillStyle = "hsl(0, 85%, 55%)";
          ctx.beginPath();
          ctx.arc(0, 0, bomb.width / 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Pulsing white border
          const bombPulse = Math.abs(Math.sin(Date.now() / 100));
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + bombPulse * 0.5})`;
          ctx.lineWidth = 1.5 + bombPulse * 1.5;
          ctx.stroke();
          
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

      // Draw super attack warnings with expanding ring effect
      superWarnings.forEach(warning => {
        const elapsed = Date.now() - warning.startTime;
        const progress = elapsed / 600; // 0 to 1 over 600ms
        
        // Pulsating effect
        const pulse = Math.abs(Math.sin(elapsed / 60)); // Fast pulse
        const alpha = 0.5 + (pulse * 0.5);
        
        // Draw expanding rings
        ctx.save();
        for (let ring = 0; ring < 3; ring++) {
          const ringProgress = (progress + ring * 0.15) % 1;
          const ringRadius = 20 + ringProgress * 60;
          const ringAlpha = alpha * (1 - ringProgress);
          
          ctx.strokeStyle = `rgba(255, ${100 + pulse * 100}, 0, ${ringAlpha})`;
          ctx.lineWidth = 3 + pulse * 2;
          ctx.beginPath();
          ctx.arc(warning.x, warning.y, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        // Draw warning indicator lines showing attack spread
        ctx.strokeStyle = `rgba(255, 200, 50, ${alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 8]);
        ctx.lineDashOffset = -Date.now() / 20;
        
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(warning.x, warning.y);
          ctx.lineTo(
            warning.x + Math.cos(angle) * 100,
            warning.y + Math.sin(angle) * 100
          );
          ctx.stroke();
        }
        ctx.setLineDash([]);
        
        // Central glow
        const gradient = ctx.createRadialGradient(warning.x, warning.y, 0, warning.x, warning.y, 30);
        gradient.addColorStop(0, `rgba(255, 200, 100, ${alpha * 0.8})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.4})`);
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(warning.x, warning.y, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // Warning text
        if (progress > 0.2) {
          ctx.fillStyle = `rgba(255, 200, 50, ${alpha})`;
          ctx.font = 'bold 16px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('!! SUPER !!', warning.x, warning.y - 50);
        }
        
        ctx.restore();
      });

      // Draw boss attacks
      const enableBossGlow = qualitySettings.glowEnabled;
      bossAttacks.forEach(attack => {
        if (attack.type === 'laser') {
          if (enableBossGlow) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
          }
          ctx.fillStyle = 'rgba(255, 50, 50, 0.9)';
          ctx.fillRect(attack.x, attack.y, attack.width, attack.height);
          
          ctx.fillStyle = 'rgba(255, 200, 200, 0.6)';
          ctx.fillRect(attack.x + attack.width * 0.2, attack.y, attack.width * 0.6, attack.height);
          
          // Pulsing white border around laser
          const laserPulse = Math.abs(Math.sin(Date.now() / 80));
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + laserPulse * 0.4})`;
          ctx.lineWidth = 2 + laserPulse * 2;
          ctx.strokeRect(attack.x, attack.y, attack.width, attack.height);
          ctx.shadowBlur = 0;
        } else if (attack.type === 'rocket') {
          // White rocket with red nose cone and flame trail
          ctx.save();
          ctx.translate(attack.x + attack.width / 2, attack.y + attack.height / 2);
          
          const rocketLength = attack.height * 1.2;
          const rocketWidth = attack.width * 0.8;
          
          // Calculate rotation based on velocity (pointing down)
          const angle = Math.atan2(attack.dy || 1, attack.dx || 0);
          ctx.rotate(angle + Math.PI / 2);
          
          // Flame trail (animated)
          const flameFlicker = 0.7 + Math.random() * 0.3;
          const flameGrad = ctx.createLinearGradient(0, rocketLength * 0.3, 0, rocketLength * 0.9);
          flameGrad.addColorStop(0, `rgba(255, 200, 50, ${flameFlicker})`);
          flameGrad.addColorStop(0.4, `rgba(255, 100, 0, ${flameFlicker * 0.8})`);
          flameGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
          
          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.moveTo(-rocketWidth * 0.5, rocketLength * 0.3);
          ctx.quadraticCurveTo(0, rocketLength * 1.2, rocketWidth * 0.5, rocketLength * 0.3);
          ctx.fill();
          
          // Rocket body (white with gradient)
          if (enableBossGlow) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
          }
          
          const bodyGrad = ctx.createLinearGradient(-rocketWidth, 0, rocketWidth, 0);
          bodyGrad.addColorStop(0, '#cccccc');
          bodyGrad.addColorStop(0.3, '#ffffff');
          bodyGrad.addColorStop(0.7, '#ffffff');
          bodyGrad.addColorStop(1, '#aaaaaa');
          
          ctx.fillStyle = bodyGrad;
          ctx.beginPath();
          ctx.moveTo(0, -rocketLength * 0.5);
          ctx.lineTo(rocketWidth * 0.5, -rocketLength * 0.1);
          ctx.lineTo(rocketWidth * 0.5, rocketLength * 0.3);
          ctx.lineTo(-rocketWidth * 0.5, rocketLength * 0.3);
          ctx.lineTo(-rocketWidth * 0.5, -rocketLength * 0.1);
          ctx.closePath();
          ctx.fill();
          
          // Rocket nose cone (red tip)
          ctx.fillStyle = '#ff3333';
          ctx.beginPath();
          ctx.moveTo(0, -rocketLength * 0.5);
          ctx.lineTo(rocketWidth * 0.35, -rocketLength * 0.2);
          ctx.lineTo(-rocketWidth * 0.35, -rocketLength * 0.2);
          ctx.closePath();
          ctx.fill();
          
          // Red fins
          ctx.fillStyle = '#ff4444';
          ctx.beginPath();
          ctx.moveTo(-rocketWidth * 0.5, rocketLength * 0.1);
          ctx.lineTo(-rocketWidth * 1.0, rocketLength * 0.4);
          ctx.lineTo(-rocketWidth * 0.5, rocketLength * 0.3);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(rocketWidth * 0.5, rocketLength * 0.1);
          ctx.lineTo(rocketWidth * 1.0, rocketLength * 0.4);
          ctx.lineTo(rocketWidth * 0.5, rocketLength * 0.3);
          ctx.closePath();
          ctx.fill();
          
          ctx.shadowBlur = 0;
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(attack.x + attack.width / 2, attack.y + attack.height / 2);
          ctx.rotate((Date.now() / 30) * Math.PI / 180);
          
          if (enableBossGlow) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = attack.type === 'super' ? 'hsl(280, 100%, 60%)' : 'hsl(25, 100%, 50%)';
          }
          ctx.fillStyle = attack.type === 'super' ? 'hsl(280, 80%, 60%)' : 'hsl(25, 85%, 50%)';
          ctx.beginPath();
          ctx.arc(0, 0, attack.width / 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Pulsing white border
          const projectilePulse = Math.abs(Math.sin(Date.now() / 100));
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + projectilePulse * 0.5})`;
          ctx.lineWidth = 1.5 + projectilePulse * 1.5;
          ctx.stroke();
          
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
            // Draw octagon instead of square
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
              const angle = (Math.PI / 4) * i - Math.PI / 8;
              const ox = Math.cos(angle) * halfSize;
              const oy = Math.sin(angle) * halfSize;
              if (i === 0) ctx.moveTo(ox, oy);
              else ctx.lineTo(ox, oy);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
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
        
        // Check if this is a Mega Boss (level 20)
        if (level === 20 && isMegaBoss(boss)) {
          // Render Mega Boss as rotating hexagon
          const megaBoss = boss as MegaBoss;
          const radius = boss.width / 2;
          const baseHue = megaBoss.corePhase === 3 ? 0 : (megaBoss.corePhase === 2 ? 30 : 220); // Blue -> Orange -> Red
          
          // DEBUG: Draw collision hit areas
          if (SHOW_BOSS_HITBOX) {
            ctx.save();
            ctx.setLineDash([6, 4]);
            
            // Outer shield hitbox (OCTAGON - 8 sides to match visual)
            if (!megaBoss.outerShieldRemoved) {
              ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
              ctx.lineWidth = 2;
              ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
              ctx.beginPath();
              for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i - Math.PI / 8;
                const hx = Math.cos(angle) * radius;
                const hy = Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
              }
              ctx.closePath();
              ctx.stroke();
              ctx.fill();
            }
            
            // Circle hitbox tightly around the boss core (Phase 2/3)
            if (megaBoss.outerShieldRemoved && !megaBoss.coreExposed) {
              const circleRadius = 45; // Tight circle around the visible boss core
              ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
              ctx.lineWidth = 2;
              ctx.fillStyle = 'rgba(255, 165, 0, 0.15)';
              ctx.beginPath();
              ctx.arc(0, 0, circleRadius, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fill();
            }
            
            // Core hitbox (when exposed)
            if (megaBoss.coreExposed) {
              const coreHitRadius = 60; // Match isBallInHatchArea radius
              ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
              ctx.lineWidth = 3;
              ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
              ctx.beginPath();
              ctx.arc(0, 0, coreHitRadius, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fill();
              
              // Label
              ctx.fillStyle = '#ffff00';
              ctx.font = 'bold 10px monospace';
              ctx.textAlign = 'center';
              ctx.fillText('CORE HIT AREA', 0, -coreHitRadius - 8);
            }
            
            // Hitbox label
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            const stateLabel = megaBoss.coreExposed ? 'EXPOSED' : 
                              megaBoss.outerShieldRemoved ? 'INNER SHIELD' : 'OUTER SHIELD';
            ctx.fillText(`MEGA BOSS - ${stateLabel}`, 0, -radius - 20);
            
            ctx.setLineDash([]);
            ctx.restore();
          }
          // Slow rotation based on time and phase
          const rotationSpeed = megaBoss.corePhase === 3 ? 0.003 : (megaBoss.corePhase === 2 ? 0.002 : 0.001);
          const hexRotation = (Date.now() * rotationSpeed) % (Math.PI * 2);
          ctx.rotate(hexRotation);
          
          if (qualitySettings.glowEnabled) {
            ctx.shadowBlur = 30;
            const glowColor = megaBoss.corePhase === 3 ? 'rgba(255, 50, 50, 0.9)' : 
                              megaBoss.corePhase === 2 ? 'rgba(255, 150, 50, 0.9)' : 'rgba(50, 150, 255, 0.9)';
            ctx.shadowColor = glowColor;
          }
          
          // Draw hexagon body (only if outer shield NOT removed)
          if (!megaBoss.outerShieldRemoved) {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i - Math.PI / 2;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.closePath();
            
            // Hexagon gradient fill
            const hexGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
            hexGrad.addColorStop(0, `hsl(${baseHue}, 60%, 45%)`);
            hexGrad.addColorStop(0.7, `hsl(${baseHue}, 70%, 30%)`);
            hexGrad.addColorStop(1, `hsl(${baseHue}, 80%, 20%)`);
            ctx.fillStyle = hexGrad;
            ctx.fill();
            
            // Hexagon border - dotted when core is exposed (penetrable)
            if (megaBoss.coreExposed) {
              ctx.setLineDash([12, 8]); // Dotted line to show penetrability
              ctx.strokeStyle = `rgba(255, 255, 0, ${0.5 + Math.sin(Date.now() / 100) * 0.3})`; // Pulsing yellow
              ctx.lineWidth = 3;
            } else {
              ctx.setLineDash([]); // Solid line
              ctx.strokeStyle = `hsl(${baseHue}, 80%, 60%)`;
              ctx.lineWidth = 4;
            }
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash pattern
          }
          
          // ═══ INNER OCTAGON SHIELD (visible after outer shield is removed in phase 2+) ═══
          if (megaBoss.outerShieldRemoved && megaBoss.innerShieldHP > 0) {
            const innerOctRadius = radius * 0.5; // Smaller octagon around core
            const innerShieldHue = megaBoss.corePhase === 3 ? 0 : (megaBoss.corePhase === 2 ? 30 : 50); // More orange/red
            
            // Draw octagon (8 sides)
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
              const angle = (Math.PI / 4) * i - Math.PI / 8; // Offset to point up
              const ox = Math.cos(angle) * innerOctRadius;
              const oy = Math.sin(angle) * innerOctRadius;
              if (i === 0) {
                ctx.moveTo(ox, oy);
              } else {
                ctx.lineTo(ox, oy);
              }
            }
            ctx.closePath();
            
            // Inner shield gradient fill - more intense color
            const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerOctRadius);
            innerGrad.addColorStop(0, `hsla(${innerShieldHue}, 90%, 60%, 0.3)`);
            innerGrad.addColorStop(0.6, `hsla(${innerShieldHue}, 85%, 45%, 0.5)`);
            innerGrad.addColorStop(1, `hsla(${innerShieldHue}, 80%, 30%, 0.7)`);
            ctx.fillStyle = innerGrad;
            ctx.fill();
            
            // Pulsing border to indicate active inner shield
            const innerPulse = Math.sin(Date.now() / 120) * 0.3 + 0.7;
            ctx.strokeStyle = `hsla(${innerShieldHue}, 100%, 70%, ${innerPulse})`;
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Shield HP indicator nodes at each vertex
            const hpRatio = megaBoss.innerShieldHP / megaBoss.innerShieldMaxHP;
            for (let i = 0; i < 8; i++) {
              const angle = (Math.PI / 4) * i - Math.PI / 8;
              const nx = Math.cos(angle) * innerOctRadius;
              const ny = Math.sin(angle) * innerOctRadius;
              const nodeActive = (i / 8) < hpRatio;
              
              ctx.beginPath();
              ctx.arc(nx, ny, 5, 0, Math.PI * 2);
              ctx.fillStyle = nodeActive ? `hsl(${innerShieldHue}, 100%, 60%)` : 'rgba(100, 100, 100, 0.5)';
              ctx.fill();
              if (nodeActive) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
              }
            }
          }
          
          // Inner hexagon detail (only show if outer shield NOT removed)
          if (!megaBoss.outerShieldRemoved) {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i - Math.PI / 2;
              const x = Math.cos(angle) * (radius * 0.65);
              const y = Math.sin(angle) * (radius * 0.65);
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.closePath();
            ctx.strokeStyle = `hsl(${baseHue}, 70%, 50%)`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          
          // Outer ring details at each vertex (only if outer shield NOT removed)
          if (!megaBoss.outerShieldRemoved) {
            ctx.shadowBlur = 0;
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i - Math.PI / 2;
              const vx = Math.cos(angle) * (radius * 0.85);
              const vy = Math.sin(angle) * (radius * 0.85);
              ctx.beginPath();
              ctx.arc(vx, vy, 8, 0, Math.PI * 2);
              ctx.fillStyle = `hsl(${baseHue}, 60%, 40%)`;
              ctx.fill();
              ctx.strokeStyle = `hsl(${baseHue}, 80%, 65%)`;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }
          
          // Central core/eye - changes based on state
          const coreRadius = megaBoss.coreExposed ? radius * 0.4 : radius * 0.3;
          ctx.beginPath();
          ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
          
          const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
          if (megaBoss.coreExposed) {
            // Exposed core - pulsing yellow/white (vulnerable!)
            const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
            coreGrad.addColorStop(0, `rgba(255, 255, 200, ${pulse})`);
            coreGrad.addColorStop(0.5, `rgba(255, 200, 50, ${pulse})`);
            coreGrad.addColorStop(1, `rgba(200, 100, 0, ${pulse * 0.8})`);
          } else {
            // Normal core
            const coreColor1 = megaBoss.corePhase === 3 ? '#ff8888' : megaBoss.corePhase === 2 ? '#ffaa88' : '#88ddff';
            const coreColor2 = megaBoss.corePhase === 3 ? '#ff2222' : megaBoss.corePhase === 2 ? '#ff6622' : '#0099ff';
            const coreColor3 = megaBoss.corePhase === 3 ? '#990000' : megaBoss.corePhase === 2 ? '#993300' : '#005588';
            coreGrad.addColorStop(0, coreColor1);
            coreGrad.addColorStop(0.5, coreColor2);
            coreGrad.addColorStop(1, coreColor3);
          }
          ctx.fillStyle = coreGrad;
          ctx.fill();
          
          // Core border
          const coreBorderColor = megaBoss.coreExposed ? '#ffff00' : 
                                   megaBoss.corePhase === 3 ? '#ffcccc' : 
                                   megaBoss.corePhase === 2 ? '#ffddaa' : '#bbddff';
          ctx.strokeStyle = coreBorderColor;
          ctx.lineWidth = megaBoss.coreExposed ? 4 : 3;
          ctx.stroke();
          
          // Inner core pulse
          if (!megaBoss.coreExposed) {
            const pulseScale = 0.15 + Math.sin(Date.now() / 200) * 0.05;
            ctx.beginPath();
            ctx.arc(0, 0, radius * pulseScale, 0, Math.PI * 2);
            ctx.fillStyle = megaBoss.corePhase >= 2 ? 'rgba(255, 255, 200, 0.9)' : 'rgba(200, 255, 255, 0.9)';
            ctx.fill();
          }
          
          // "CORE EXPOSED!" pulsing ring when vulnerable
          if (megaBoss.coreExposed) {
            const hatchPulse = Math.sin(Date.now() / 80) * 0.4 + 0.6;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 0, ${hatchPulse})`;
            ctx.lineWidth = 5;
            ctx.stroke();
          }
          
          // Cannon extension (when danger balls are being fired) - tracks paddle
          if (megaBoss.cannonExtended && megaBoss.trappedBall && paddle) {
            ctx.save();
            
            // Calculate angle to paddle
            const paddleCenterX = paddle.x + paddle.width / 2 - (boss.x + boss.width / 2);
            const paddleCenterY = paddle.y - (boss.y + boss.height / 2);
            const angleToTarget = Math.atan2(paddleCenterY, paddleCenterX) - Math.PI / 2;
            
            // Smooth rotation toward paddle (counter-rotate from hex rotation first)
            ctx.rotate(-hexRotation + angleToTarget);
            
            // Hexagonal cannon barrel design
            const cannonWidth = 36;
            const cannonLength = 55;
            const cannonBaseY = radius * 0.5;
            
            // Hexagonal mounting plate
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i - Math.PI / 2;
              const hx = Math.cos(angle) * 22;
              const hy = Math.sin(angle) * 22 + cannonBaseY - 5;
              if (i === 0) ctx.moveTo(hx, hy);
              else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            const mountGrad = ctx.createLinearGradient(-22, cannonBaseY - 27, 22, cannonBaseY + 17);
            mountGrad.addColorStop(0, `hsl(${baseHue}, 40%, 45%)`);
            mountGrad.addColorStop(0.5, `hsl(${baseHue}, 50%, 55%)`);
            mountGrad.addColorStop(1, `hsl(${baseHue}, 40%, 35%)`);
            ctx.fillStyle = mountGrad;
            ctx.fill();
            ctx.strokeStyle = `hsl(${baseHue}, 70%, 60%)`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Main cannon barrel with beveled hexagonal edges
            const barrelGrad = ctx.createLinearGradient(-cannonWidth / 2, 0, cannonWidth / 2, 0);
            barrelGrad.addColorStop(0, `hsl(${baseHue}, 30%, 20%)`);
            barrelGrad.addColorStop(0.3, `hsl(${baseHue}, 40%, 35%)`);
            barrelGrad.addColorStop(0.5, `hsl(${baseHue}, 50%, 40%)`);
            barrelGrad.addColorStop(0.7, `hsl(${baseHue}, 40%, 35%)`);
            barrelGrad.addColorStop(1, `hsl(${baseHue}, 30%, 20%)`);
            
            // Draw faceted barrel (hexagonal cross-section look)
            ctx.fillStyle = barrelGrad;
            ctx.beginPath();
            ctx.moveTo(-cannonWidth / 2 + 4, cannonBaseY);
            ctx.lineTo(-cannonWidth / 2, cannonBaseY + 8);
            ctx.lineTo(-cannonWidth / 2, cannonBaseY + cannonLength - 8);
            ctx.lineTo(-cannonWidth / 2 + 4, cannonBaseY + cannonLength);
            ctx.lineTo(cannonWidth / 2 - 4, cannonBaseY + cannonLength);
            ctx.lineTo(cannonWidth / 2, cannonBaseY + cannonLength - 8);
            ctx.lineTo(cannonWidth / 2, cannonBaseY + 8);
            ctx.lineTo(cannonWidth / 2 - 4, cannonBaseY);
            ctx.closePath();
            ctx.fill();
            
            // Cannon edge highlights
            ctx.strokeStyle = `hsl(${baseHue}, 70%, 55%)`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Center energy channel (glowing)
            const energyPulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
            const energyGrad = ctx.createLinearGradient(0, cannonBaseY, 0, cannonBaseY + cannonLength);
            energyGrad.addColorStop(0, `rgba(255, 100, 100, ${energyPulse * 0.3})`);
            energyGrad.addColorStop(0.5, `rgba(255, 200, 100, ${energyPulse})`);
            energyGrad.addColorStop(1, `rgba(255, 50, 50, ${energyPulse})`);
            ctx.fillStyle = energyGrad;
            ctx.fillRect(-4, cannonBaseY + 5, 8, cannonLength - 10);
            
            // Hexagonal muzzle ring
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i;
              const mx = Math.cos(angle) * (cannonWidth / 2 + 2);
              const my = Math.sin(angle) * (cannonWidth / 2 + 2) + cannonBaseY + cannonLength;
              if (i === 0) ctx.moveTo(mx, my);
              else ctx.lineTo(mx, my);
            }
            ctx.closePath();
            ctx.fillStyle = `hsl(0, 70%, 35%)`;
            ctx.fill();
            ctx.strokeStyle = `hsl(0, 80%, 50%)`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Pulsing glow at muzzle
            const muzzlePulse = Math.sin(Date.now() / 150) * 0.5 + 0.5;
            ctx.shadowBlur = 20 * muzzlePulse;
            ctx.shadowColor = 'rgba(255, 100, 100, 0.9)';
            ctx.beginPath();
            ctx.arc(0, cannonBaseY + cannonLength, 10, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 200, 100, ${muzzlePulse})`;
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.restore();
          }
          
          // Invulnerability glow effect (subtle pulsing outline, not a blinking square)
          if (megaBoss.isInvulnerable && Date.now() < megaBoss.invulnerableUntil) {
            const pulsePhase = (Date.now() % 300) / 300;
            const pulseIntensity = 0.4 + Math.sin(pulsePhase * Math.PI * 2) * 0.3;
            ctx.strokeStyle = `rgba(255, 255, 255, ${pulseIntensity})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, boss.width / 2 + 10, 0, Math.PI * 2);
            ctx.stroke();
          }
          
          ctx.restore();
          
          // Only show HP bar in phase 1 (before outer shield is removed)
          if (megaBoss.corePhase === 1 && !megaBoss.outerShieldRemoved) {
            // Draw Mega Boss health bar (outer shield HP)
            const hbWidth = boss.width + 60;
            const hbHeight = 14;
            const hbX = boss.x + boss.width / 2 - hbWidth / 2;
            const hbY = boss.y - 35;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(hbX, hbY, hbWidth, hbHeight);
            
            const hpPercent = megaBoss.outerShieldHP / megaBoss.outerShieldMaxHP;
            ctx.fillStyle = megaBoss.coreExposed ? 'hsl(60, 100%, 50%)' : 'hsl(280, 80%, 50%)';
            ctx.fillRect(hbX + 2, hbY + 2, (hbWidth - 4) * hpPercent, hbHeight - 4);
            
            ctx.strokeStyle = 'rgba(200, 150, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(hbX, hbY, hbWidth, hbHeight);
            
            // Phase label
            ctx.fillStyle = megaBoss.coreExposed ? '#ffff00' : '#aa77ff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(megaBoss.coreExposed ? 'CORE EXPOSED!' : 'MEGA BOSS', boss.x + boss.width / 2, hbY - 5);
            ctx.textAlign = 'left';
          }
          
          // Dramatic cannon mode transition effect
          if (megaBoss.cannonExtended && megaBoss.cannonExtendedTime) {
            const timeSinceExtend = Date.now() - megaBoss.cannonExtendedTime;
            const transitionDuration = 1200; // 1.2 second dramatic transition
            
            if (timeSinceExtend < transitionDuration) {
              const progress = timeSinceExtend / transitionDuration;
              
              // Screen flash effect (fades out)
              if (progress < 0.3) {
                const flashIntensity = (1 - progress / 0.3) * 0.6;
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to draw over entire canvas
                ctx.fillStyle = `rgba(255, 100, 50, ${flashIntensity})`;
                ctx.fillRect(0, 0, canvas.current?.width || 0, canvas.current?.height || 0);
                ctx.restore();
              }
              
              // Expanding shockwave rings
              const ringCount = 3;
              for (let i = 0; i < ringCount; i++) {
                const ringProgress = Math.max(0, progress - i * 0.15);
                if (ringProgress > 0 && ringProgress < 1) {
                  const ringRadius = ringProgress * 200;
                  const ringAlpha = (1 - ringProgress) * 0.8;
                  
                  ctx.save();
                  ctx.translate(boss.x + boss.width / 2, boss.y + boss.height / 2);
                  ctx.beginPath();
                  ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
                  ctx.strokeStyle = `rgba(255, ${150 + i * 30}, 50, ${ringAlpha})`;
                  ctx.lineWidth = 4 - i;
                  ctx.stroke();
                  ctx.restore();
                }
              }
              
              // "CANNON MODE" dramatic text
              if (progress > 0.2 && progress < 0.9) {
                const textAlpha = progress < 0.4 ? (progress - 0.2) / 0.2 : (0.9 - progress) / 0.5;
                const textScale = 1 + Math.sin(progress * Math.PI * 4) * 0.1;
                
                ctx.save();
                ctx.translate(boss.x + boss.width / 2, boss.y - 60);
                ctx.scale(textScale, textScale);
                ctx.fillStyle = `rgba(255, 100, 50, ${textAlpha})`;
                ctx.font = 'bold 18px monospace';
                ctx.textAlign = 'center';
                ctx.shadowColor = 'rgba(255, 50, 0, 0.8)';
                ctx.shadowBlur = 15;
                ctx.fillText('⚠ CANNON MODE ⚠', 0, 0);
                ctx.restore();
              }
            }
          }
          
          // Danger ball core hit counter (when cannon is active, after transition)
          if (megaBoss.cannonExtended && megaBoss.trappedBall && megaBoss.cannonExtendedTime) {
            const timeSinceExtend = Date.now() - megaBoss.cannonExtendedTime;
            if (timeSinceExtend > 1200) {
              const hbY = boss.y - 35;
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 14px monospace';
              ctx.textAlign = 'center';
              ctx.fillText(`CORE HITS: ${megaBoss.coreHitsFromDangerBalls || 0}/5`, boss.x + boss.width / 2, hbY + 25);
              ctx.textAlign = 'left';
            }
          }
        } else if (boss.type === 'cube') {
          // 2D isometric cube that emulates 3D
          const size = boss.width / 2;
          const baseHue = boss.isAngry ? 0 : 180;
          const offset = size * 0.5; // Isometric offset for depth
          
          ctx.rotate(boss.rotationY);
          
          if (qualitySettings.glowEnabled) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = `hsl(${baseHue}, 100%, 60%)`;
          }
          
          // Front face (square)
          ctx.fillStyle = `hsl(${baseHue}, 80%, 55%)`;
          ctx.fillRect(-size, -size, size * 2, size * 2);
          
          // Top face (parallelogram) - lighter
          ctx.fillStyle = `hsl(${baseHue}, 80%, 70%)`;
          ctx.beginPath();
          ctx.moveTo(-size, -size);
          ctx.lineTo(-size + offset, -size - offset);
          ctx.lineTo(size + offset, -size - offset);
          ctx.lineTo(size, -size);
          ctx.closePath();
          ctx.fill();
          
          // Right face (parallelogram) - darker
          ctx.fillStyle = `hsl(${baseHue}, 80%, 40%)`;
          ctx.beginPath();
          ctx.moveTo(size, -size);
          ctx.lineTo(size + offset, -size - offset);
          ctx.lineTo(size + offset, size - offset);
          ctx.lineTo(size, size);
          ctx.closePath();
          ctx.fill();
          
          // Draw retro pixel grid on front face (quality-dependent)
          if (qualitySettings.particleMultiplier > 0.5) {
            const gridSize = qualitySettings.glowEnabled ? 6 : 4;
            ctx.strokeStyle = `rgba(255, 255, 255, ${boss.isAngry ? 0.25 : 0.15})`;
            ctx.lineWidth = 1;
            const step = (size * 2) / gridSize;
            
            for (let i = 1; i < gridSize; i++) {
              // Horizontal lines
              ctx.beginPath();
              ctx.moveTo(-size, -size + i * step);
              ctx.lineTo(size, -size + i * step);
              ctx.stroke();
              // Vertical lines
              ctx.beginPath();
              ctx.moveTo(-size + i * step, -size);
              ctx.lineTo(-size + i * step, size);
              ctx.stroke();
            }
          }
          
          // Draw all edges
          ctx.strokeStyle = `hsl(${baseHue}, 90%, 70%)`;
          ctx.lineWidth = 2;
          
          // Front face edges
          ctx.strokeRect(-size, -size, size * 2, size * 2);
          
          // Top face edges
          ctx.beginPath();
          ctx.moveTo(-size, -size);
          ctx.lineTo(-size + offset, -size - offset);
          ctx.lineTo(size + offset, -size - offset);
          ctx.lineTo(size, -size);
          ctx.stroke();
          
          // Right face edges
          ctx.beginPath();
          ctx.moveTo(size, -size);
          ctx.lineTo(size + offset, -size - offset);
          ctx.lineTo(size + offset, size - offset);
          ctx.lineTo(size, size);
          ctx.stroke();
          
          // Add corner highlights (16-bit style)
          if (qualitySettings.shadowsEnabled) {
            ctx.fillStyle = `rgba(255, 255, 255, ${boss.isAngry ? 0.7 : 0.5})`;
            // Front corners
            ctx.fillRect(-size - 2, -size - 2, 4, 4);
            ctx.fillRect(size - 2, -size - 2, 4, 4);
            ctx.fillRect(-size - 2, size - 2, 4, 4);
            ctx.fillRect(size - 2, size - 2, 4, 4);
            // Back corners
            ctx.fillRect(-size + offset - 2, -size - offset - 2, 4, 4);
            ctx.fillRect(size + offset - 2, -size - offset - 2, 4, 4);
            ctx.fillRect(size + offset - 2, size - offset - 2, 4, 4);
          }
          
          // Angry state: pulsing edge glow
          if (boss.isAngry && qualitySettings.glowEnabled) {
            const pulse = Math.sin(Date.now() / 150) * 0.5 + 0.5;
            ctx.shadowBlur = 25 * pulse;
            ctx.shadowColor = `hsl(${baseHue}, 100%, 60%)`;
            ctx.strokeStyle = `hsl(${baseHue}, 100%, 75%)`;
            ctx.lineWidth = 3;
            ctx.strokeRect(-size, -size, size * 2, size * 2);
            ctx.shadowBlur = 0;
          }
        } else if (boss.type === 'sphere') {
          const radius = boss.width / 2;
          const baseHue = boss.isAngry ? 0 : 330; // Red when angry, pink otherwise
          const intensity = boss.isAngry ? 70 : 60;
          
          // Oscillating rotation: -90 to +90 degrees over time
          const oscillation = Math.sin(Date.now() / 1500) * (Math.PI / 2); // 90 degrees
          
          // Enhanced glow when angry
          if (qualitySettings.glowEnabled) {
            const glowIntensity = boss.isAngry ? 50 + Math.sin(Date.now() / 100) * 20 : 30;
            ctx.shadowBlur = glowIntensity;
            ctx.shadowColor = boss.isAngry 
              ? `hsl(0, 100%, 60%)` 
              : `hsl(${baseHue}, 100%, 60%)`;
          }
          
          // Base sphere with gradient for 3D effect
          const gradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius);
          gradient.addColorStop(0, `hsl(${baseHue}, 90%, ${intensity + 30}%)`);
          gradient.addColorStop(0.4, `hsl(${baseHue}, 85%, ${intensity + 10}%)`);
          gradient.addColorStop(0.7, `hsl(${baseHue}, 80%, ${intensity}%)`);
          gradient.addColorStop(1, `hsl(${baseHue}, 75%, ${intensity - 25}%)`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Horizontal bands for 3D sphere illusion (latitude lines)
          ctx.strokeStyle = `hsla(${baseHue}, 70%, ${intensity - 15}%, 0.5)`;
          ctx.lineWidth = 2;
          const bandCount = 5;
          for (let i = 1; i < bandCount; i++) {
            const yPos = -radius + (radius * 2 * i / bandCount);
            const bandRadius = Math.sqrt(radius * radius - yPos * yPos);
            if (bandRadius > 0) {
              ctx.beginPath();
              ctx.ellipse(0, yPos, bandRadius, bandRadius * 0.15, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          
          // Vertical meridian line that rotates with oscillation
          ctx.save();
          ctx.rotate(oscillation);
          ctx.strokeStyle = `hsla(${baseHue}, 70%, ${intensity - 10}%, 0.6)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, radius * 0.15, radius, 0, 0, Math.PI * 2);
          ctx.stroke();
          
          // Second meridian at 90 degrees
          ctx.beginPath();
          ctx.ellipse(0, 0, radius, radius * 0.15, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          
          // Specular highlight (moves slightly with rotation)
          const highlightOffset = Math.sin(oscillation) * radius * 0.1;
          ctx.fillStyle = `rgba(255, 255, 255, ${boss.isAngry ? 0.6 : 0.4})`;
          ctx.beginPath();
          ctx.ellipse(-radius * 0.3 + highlightOffset, -radius * 0.35, radius * 0.2, radius * 0.12, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          
          // Pixel retro angry eyes when angry
          if (boss.isAngry) {
            ctx.shadowBlur = 0;
            const eyeSize = radius * 0.12;
            const eyeY = -radius * 0.1;
            const eyeSpacing = radius * 0.35;
            
            // Eye backgrounds (white)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-eyeSpacing - eyeSize, eyeY - eyeSize, eyeSize * 2, eyeSize * 2);
            ctx.fillRect(eyeSpacing - eyeSize, eyeY - eyeSize, eyeSize * 2, eyeSize * 2);
            
            // Pupils (black, offset based on oscillation for tracking effect)
            const pupilOffset = Math.sin(oscillation) * eyeSize * 0.3;
            ctx.fillStyle = '#000000';
            ctx.fillRect(-eyeSpacing - eyeSize * 0.5 + pupilOffset, eyeY - eyeSize * 0.5, eyeSize, eyeSize);
            ctx.fillRect(eyeSpacing - eyeSize * 0.5 + pupilOffset, eyeY - eyeSize * 0.5, eyeSize, eyeSize);
            
            // Angry eyebrows (diagonal pixel lines)
            ctx.fillStyle = '#000000';
            const browY = eyeY - eyeSize * 1.8;
            const browThickness = eyeSize * 0.5;
            
            // Left eyebrow (angled down toward center) - pixel blocks
            for (let i = 0; i < 4; i++) {
              ctx.fillRect(-eyeSpacing - eyeSize + i * eyeSize * 0.6, browY + i * browThickness * 0.4, eyeSize * 0.7, browThickness);
            }
            
            // Right eyebrow (angled down toward center) - pixel blocks
            for (let i = 0; i < 4; i++) {
              ctx.fillRect(eyeSpacing + eyeSize - i * eyeSize * 0.6 - eyeSize * 0.7, browY + i * browThickness * 0.4, eyeSize * 0.7, browThickness);
            }
            
            // Angry mouth (jagged pixel line)
            const mouthY = radius * 0.35;
            const mouthWidth = radius * 0.5;
            ctx.fillStyle = '#000000';
            // Jagged angry mouth
            ctx.fillRect(-mouthWidth, mouthY, mouthWidth * 0.3, eyeSize * 0.6);
            ctx.fillRect(-mouthWidth * 0.5, mouthY + eyeSize * 0.4, mouthWidth * 0.3, eyeSize * 0.6);
            ctx.fillRect(0, mouthY, mouthWidth * 0.3, eyeSize * 0.6);
            ctx.fillRect(mouthWidth * 0.5, mouthY + eyeSize * 0.4, mouthWidth * 0.3, eyeSize * 0.6);
          }
          
          // Pulsing edge glow when angry
          if (boss.isAngry && qualitySettings.glowEnabled) {
            const pulse = Math.sin(Date.now() / 100) * 0.5 + 0.5;
            ctx.shadowBlur = 35 * pulse;
            ctx.shadowColor = `hsl(0, 100%, 50%)`;
            ctx.strokeStyle = `hsla(0, 100%, 70%, ${0.5 + pulse * 0.5})`;
            ctx.lineWidth = 3 + pulse * 2;
            ctx.beginPath();
            ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
          
        } else if (boss.type === 'pyramid') {
          const size = boss.width / 2;
          const baseHue = boss.isAngry ? 0 : (boss.isSuperAngry ? 280 : 280);
          const intensity = boss.isSuperAngry ? 75 : (boss.isAngry ? 65 : 60);
          
          ctx.rotate(boss.rotationY);
          if (qualitySettings.glowEnabled) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = `hsl(${baseHue}, 100%, 60%)`;
          }
          
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
        
        // Draw boss health bar (skip for Mega Boss - it has its own health bar)
        if (!(level === 20 && isMegaBoss(boss))) {
          const hbWidth = boss.width + 40;
          const hbHeight = 10;
          const hbX = boss.x + boss.width / 2 - hbWidth / 2;
          const hbY = boss.y - 25;
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(hbX, hbY, hbWidth, hbHeight);
          
          const hpPercent = boss.currentHealth / boss.maxHealth;
          const hpHue = hpPercent > 0.5 ? 120 : (hpPercent > 0.25 ? 60 : 0);
          ctx.fillStyle = `hsl(${hpHue}, 80%, 50%)`;
          ctx.fillRect(hbX, hbY, hbWidth * hpPercent, hbHeight);
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 2;
          ctx.strokeRect(hbX, hbY, hbWidth, hbHeight);
        }
      }


      resurrectedBosses.forEach(resBoss => {
        const centerX = resBoss.x + resBoss.width / 2;
        const centerY = resBoss.y + resBoss.height / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(resBoss.rotationY);
        
        const size = resBoss.width / 2;
        const baseHue = resBoss.isSuperAngry ? 0 : 280;
        const intensity = resBoss.isSuperAngry ? 75 : 65;
        
        if (qualitySettings.glowEnabled) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = `hsl(${baseHue}, 100%, 60%)`;
        }
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
    
      // Draw all pooled particles (includes gameOver and highScore particles)
      const activeParticles = particlePool.getActive();
      if (activeParticles.length > 0) {
        ctx.save();
        for (let i = 0; i < activeParticles.length; i++) {
          const particle = activeParticles[i];
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
          
          // Add a bright center for larger particles (game over / high score effects)
          if (particle.size > 3) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(255, 255, 255, ${particleAlpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
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
