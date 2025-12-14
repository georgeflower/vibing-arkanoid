import { forwardRef, useEffect, useRef, useCallback } from "react";
import type {
  Brick,
  Ball,
  Paddle,
  GameState,
  PowerUp,
  Bullet,
  Enemy,
  Bomb,
  Explosion,
  BonusLetter,
  BonusLetterType,
  Particle,
  Boss,
  BossAttack,
  ShieldImpact,
} from "@/types/game";
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
import backgroundTile69 from "@/assets/background-tile-6-9.png";
import backgroundTile1114 from "@/assets/background-tile-11-14.png";
import backgroundTile1620 from "@/assets/background-tile-16-20.png";
import bossLevel5Bg from "@/assets/boss-level-5-bg.png";
import bossLevel10Bg from "@/assets/boss-level-10-bg.png";
import bossLevel15Bg from "@/assets/boss-level-15-bg.png";

/**
 * GameCanvasProps
 * - keep props minimal and explicit
 */
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
  explosions: Explosion[];
  launchAngle: number;
  bonusLetters: BonusLetter[];
  collectedLetters: Set<BonusLetterType>;
  screenShake: number;
  backgroundFlash: number;
  highlightFlash?: number;
  qualitySettings: QualitySettings;
  boss: Boss | null;
  resurrectedBosses: Boss[];
  bossAttacks: BossAttack[];
  laserWarnings: Array<{ x: number; startTime: number }>;
  gameOverParticles: Particle[];
  highScoreParticles: Particle[];
  showHighScoreEntry: boolean;
  bossIntroActive: boolean;
  bossSpawnAnimation: { active: boolean; startTime: number } | null;
  shieldImpacts: ShieldImpact[];
  bulletImpacts?: Array<{ x: number; y: number; startTime: number; isSuper: boolean }>;
  tutorialHighlight?: { type: "power_up" | "boss" | "enemy" | "bonus_letter"; zoomScale?: number } | null;
  debugEnabled?: boolean;
  getReadyGlow?: { opacity: number } | null;
  isMobile?: boolean;
}

/*
  Improvements applied:
  - Centralized image loader (loadImage) with caching
  - Create canvas patterns once and reuse (pattern refs)
  - Defensive isImageValid helper
  - Cleanup on unmount (no leaked timers)
  - Gate debug logging behind debugEnabled
  - Minimize per-frame allocations where reasonable
*/

export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(function GameCanvas(props, ref) {
  const {
    width,
    height,
    bricks,
    balls,
    paddle,
    powerUps,
    bullets,
    enemy,
    bombs,
    level,
    backgroundPhase,
    explosions,
    launchAngle,
    bonusLetters,
    collectedLetters,
    screenShake,
    backgroundFlash,
    highlightFlash = 0,
    qualitySettings,
    boss,
    resurrectedBosses,
    bossAttacks,
    laserWarnings,
    gameOverParticles,
    highScoreParticles,
    showHighScoreEntry,
    bossIntroActive,
    bossSpawnAnimation,
    shieldImpacts,
    bulletImpacts = [],
    tutorialHighlight = null,
    debugEnabled = false,
    getReadyGlow = null,
    isMobile = false,
  } = props;

  // Image refs and pattern refs
  const imagesRef = useRef<Record<string, HTMLImageElement | null>>({});
  const patternsRef = useRef<Record<string, CanvasPattern | null>>({});
  const loadedRef = useRef<Record<string, boolean>>({});

  // Specific image refs for assets used frequently
  const paddleImageRef = useRef<HTMLImageElement | null>(null);
  const paddleTurretsImageRef = useRef<HTMLImageElement | null>(null);
  const crackedRefs = useRef<{ [k: string]: HTMLImageElement | null }>({
    cracked1: null,
    cracked2: null,
    cracked3: null,
  });
  const bossBgRefs = useRef<{ [k: string]: HTMLImageElement | null }>({
    level5: null,
    level10: null,
    level15: null,
  });

  // Helper: load an image once and cache it
  const loadImage = useCallback((key: string, src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
      const existing = imagesRef.current[key];
      if (existing && existing.complete && existing.naturalHeight !== 0) {
        loadedRef.current[key] = true;
        resolve(existing);
        return;
      }
      const img = new Image();
      img.onload = () => {
        imagesRef.current[key] = img;
        loadedRef.current[key] = true;
        resolve(img);
      };
      img.onerror = () => {
        imagesRef.current[key] = null;
        loadedRef.current[key] = false;
        resolve(img); // resolve anyway to avoid hanging
      };
      img.src = src;
    });
  }, []);

  // Helper: check image validity
  const isImageValid = (img: HTMLImageElement | null | undefined): img is HTMLImageElement =>
    !!(img && img.complete && img.naturalHeight !== 0);

  // Preload images once
  useEffect(() => {
    let mounted = true;
    (async () => {
      // power-ups and bonus letters (may be many; only load defined ones)
      const powerUpEntries = Object.entries(powerUpImages).filter(([, src]) => !!src);
      await Promise.all(powerUpEntries.map(([k, src]) => loadImage(`power_${k}`, src)));

      const bonusEntries = Object.entries(bonusLetterImages).filter(([, src]) => !!src);
      await Promise.all(bonusEntries.map(([k, src]) => loadImage(`bonus_${k}`, src)));

      // Paddle and cracked bricks
      const p = await loadImage("paddle", paddleImg);
      paddleImageRef.current = p;
      const pt = await loadImage("paddleTurrets", paddleTurretsImg);
      paddleTurretsImageRef.current = pt;

      crackedRefs.current.cracked1 = await loadImage("cracked1", crackedBrick1);
      crackedRefs.current.cracked2 = await loadImage("cracked2", crackedBrick2);
      crackedRefs.current.cracked3 = await loadImage("cracked3", crackedBrick3);

      // Background tiles
      await loadImage("bg1", backgroundTile1);
      await loadImage("bg2", backgroundTile2);
      await loadImage("bg3", backgroundTile3);
      await loadImage("bg4", backgroundTile4);
      await loadImage("bg69", backgroundTile69);
      await loadImage("bg1114", backgroundTile1114);
      await loadImage("bg1620", backgroundTile1620);

      // Boss fitted backgrounds
      bossBgRefs.current.level5 = await loadImage("boss5", bossLevel5Bg);
      bossBgRefs.current.level10 = await loadImage("boss10", bossLevel10Bg);
      bossBgRefs.current.level15 = await loadImage("boss15", bossLevel15Bg);

      if (!mounted) return;
      // Patterns will be created lazily in draw effect when ctx is available
    })();

    return () => {
      mounted = false;
    };
  }, [loadImage]);

  // Cleanup on unmount: clear patterns and image caches to avoid memory leaks
  useEffect(() => {
    return () => {
      patternsRef.current = {};
      imagesRef.current = {};
      loadedRef.current = {};
      paddleImageRef.current = null;
      paddleTurretsImageRef.current = null;
      crackedRefs.current = { cracked1: null, cracked2: null, cracked3: null };
      bossBgRefs.current = { level5: null, level10: null, level15: null };
    };
  }, []);

  // Draw function: runs when relevant props change
  useEffect(() => {
    const canvasRef = ref as React.RefObject<HTMLCanvasElement>;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Save/restore around whole frame to isolate transforms
    ctx.save();

    // Screen shake transform
    if (screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * screenShake;
      const shakeY = (Math.random() - 0.5) * screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // Clear
    ctx.fillStyle = "hsl(220, 25%, 12%)";
    ctx.fillRect(0, 0, width, height);

    // Background selection helper
    const drawBackground = () => {
      // Boss fitted backgrounds (draw full image if loaded)
      if (level === 5 && isImageValid(bossBgRefs.current.level5)) {
        ctx.drawImage(bossBgRefs.current.level5!, 0, 0, width, height);
        return;
      }
      if (level === 10 && isImageValid(bossBgRefs.current.level10)) {
        ctx.drawImage(bossBgRefs.current.level10!, 0, 0, width, height);
        return;
      }
      if (level === 15 && isImageValid(bossBgRefs.current.level15)) {
        ctx.drawImage(bossBgRefs.current.level15!, 0, 0, width, height);
        return;
      }

      // Choose tile based on level ranges
      let patternKey = "bg4";
      if (level >= 16 && level <= 19) patternKey = "bg1620";
      else if (level >= 11 && level <= 14) patternKey = "bg1114";
      else if (level >= 6 && level <= 9) patternKey = "bg69";
      else patternKey = "bg4";

      // Create pattern lazily and cache it
      if (!patternsRef.current[patternKey]) {
        const img = imagesRef.current[patternKey];
        if (isImageValid(img)) {
          try {
            patternsRef.current[patternKey] = ctx.createPattern(img, "repeat");
          } catch {
            patternsRef.current[patternKey] = null;
          }
        }
      }

      const pattern = patternsRef.current[patternKey];
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
      } else {
        // fallback solid fill
        ctx.fillStyle = "hsl(220, 25%, 12%)";
        ctx.fillRect(0, 0, width, height);
      }
    };

    drawBackground();

    // Level-specific dimming and ambient flicker (levels 1-4)
    if (level >= 1 && level <= 4) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, width, height);
      if (!isMobile) {
        const ambientFlicker = Math.sin(Date.now() / 500) * 0.03 + 0.03;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = `rgba(100,150,200,${ambientFlicker})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    // Highlight flash overlay (levels 1-4)
    if (highlightFlash > 0 && level >= 1 && level <= 4) {
      ctx.save();
      const isGolden = highlightFlash > 1.2;
      const intensity = Math.min(highlightFlash, 1.0);
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = isGolden ? `rgba(255,200,100,${intensity * 0.6})` : `rgba(100,200,255,${intensity * 0.5})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "soft-light";
      ctx.fillStyle = isGolden ? `rgba(255,220,150,${intensity * 0.7})` : `rgba(150,220,255,${intensity * 0.6})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Background flash overlay
    if (backgroundFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${backgroundFlash * 0.4})`;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw bricks (optimized: reuse local variables, avoid heavy allocations)
    for (let i = 0; i < bricks.length; i++) {
      const brick = bricks[i];
      if (!brick.visible) continue;

      ctx.shadowBlur = 0;

      if (brick.type === "metal") {
        // metal brick rendering (keeps previous logic but avoids allocations)
        ctx.fillStyle = "hsl(0,0%,33%)";
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

        // adjacent detection (small helper inline to avoid extra function calls)
        const tolerance = 6;
        const top = bricks.find(
          (b) =>
            b.visible &&
            b.type === "metal" &&
            Math.abs(b.x - brick.x) < tolerance &&
            Math.abs(b.y + b.height - brick.y) < tolerance,
        );
        const bottom = bricks.find(
          (b) =>
            b.visible &&
            b.type === "metal" &&
            Math.abs(b.x - brick.x) < tolerance &&
            Math.abs(b.y - (brick.y + brick.height)) < tolerance,
        );
        const left = bricks.find(
          (b) =>
            b.visible &&
            b.type === "metal" &&
            Math.abs(b.y - brick.y) < tolerance &&
            Math.abs(b.x + b.width - brick.x) < tolerance,
        );
        const right = bricks.find(
          (b) =>
            b.visible &&
            b.type === "metal" &&
            Math.abs(b.y - brick.y) < tolerance &&
            Math.abs(b.x - (brick.x + brick.width)) < tolerance,
        );

        if (!top) {
          ctx.fillStyle = "rgba(200,200,200,0.4)";
          ctx.fillRect(brick.x, brick.y, brick.width, 4);
        }
        if (!left) {
          ctx.fillStyle = "rgba(200,200,200,0.4)";
          ctx.fillRect(brick.x, brick.y, 4, brick.height);
        }
        if (!bottom) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(brick.x, brick.y + brick.height - 4, brick.width, 4);
        }
        if (!right) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(brick.x + brick.width - 4, brick.y, 4, brick.height);
        }

        // rivets
        ctx.fillStyle = "rgba(100,100,100,0.8)";
        const rivetSize = 3;
        const spacing = 12;
        for (let py = brick.y + spacing / 2; py < brick.y + brick.height; py += spacing) {
          for (let px = brick.x + spacing / 2; px < brick.x + brick.width; px += spacing) {
            ctx.beginPath();
            ctx.arc(px, py, rivetSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // diagonal hatching
        ctx.strokeStyle = "rgba(150,150,150,0.15)";
        ctx.lineWidth = 1;
        for (let i2 = 0; i2 < brick.width + brick.height; i2 += 6) {
          ctx.beginPath();
          ctx.moveTo(brick.x + i2, brick.y);
          ctx.lineTo(brick.x, brick.y + i2);
          ctx.stroke();
        }
      } else if (brick.type === "explosive") {
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        if (qualitySettings.glowEnabled) {
          const pulseIntensity = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
          ctx.shadowBlur = 8 * pulseIntensity;
          ctx.shadowColor = "hsl(15,100%,50%)";
        }
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,100,0.3)";
        ctx.fillRect(brick.x, brick.y, brick.width, 3);
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(brick.x, brick.y + brick.height - 3, brick.width, 3);

        ctx.strokeStyle = "rgba(50,50,50,0.4)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        for (let i2 = 0; i2 < brick.width + brick.height; i2 += 8) {
          ctx.beginPath();
          ctx.moveTo(brick.x + i2, brick.y);
          ctx.lineTo(brick.x, brick.y + i2);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(255,200,0,0.8)";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const bombsText = "💥".repeat(Math.max(0, brick.hitsRemaining || 1));
        ctx.fillText(bombsText, brick.x + brick.width / 2, brick.y + brick.height / 2);
        ctx.shadowBlur = 0;
      } else if (brick.type === "cracked") {
        // choose cracked image
        let crackedImage: HTMLImageElement | null = null;
        if (brick.hitsRemaining === 3) crackedImage = crackedRefs.current.cracked1;
        else if (brick.hitsRemaining === 2) crackedImage = crackedRefs.current.cracked2;
        else if (brick.hitsRemaining === 1) crackedImage = crackedRefs.current.cracked3;

        if (isImageValid(crackedImage)) {
          ctx.drawImage(crackedImage, brick.x, brick.y, brick.width, brick.height);
        } else {
          ctx.fillStyle = brick.color;
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.fillRect(brick.x, brick.y, brick.width, 3);
          ctx.fillRect(brick.x, brick.y, 3, brick.height);
          ctx.fillStyle = "rgba(0,0,0,0.4)";
          ctx.fillRect(brick.x, brick.y + brick.height - 3, brick.width, 3);
          ctx.fillRect(brick.x + brick.width - 3, brick.y, 3, brick.height);
        }
      } else {
        // normal brick
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(brick.x, brick.y, brick.width, 3);
        ctx.fillRect(brick.x, brick.y, 3, brick.height);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(brick.x, brick.y + brick.height - 3, brick.width, 3);
        ctx.fillRect(brick.x + brick.width - 3, brick.y, 3, brick.height);

        // 16-bit pixel pattern
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        for (let py = brick.y + 4; py < brick.y + brick.height - 4; py += 4) {
          for (let px = brick.x + 4; px < brick.x + brick.width - 4; px += 4) {
            if (((px + py) & 7) === 0) {
              ctx.fillRect(px, py, 2, 2);
            }
          }
        }

        if (brick.maxHits > 1) {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = "bold 12px 'Courier New', monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(brick.hitsRemaining), brick.x + brick.width / 2, brick.y + brick.height / 2);
        }
      }
    }

    // Draw paddle
    if (paddle) {
      const img = paddleImageRef.current;
      if (isImageValid(img)) {
        if (qualitySettings.shadowsEnabled) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = "hsl(200,70%,50%)";
        }
        ctx.drawImage(img, paddle.x, paddle.y, paddle.width, paddle.height);
        ctx.shadowBlur = 0;
      } else {
        if (qualitySettings.shadowsEnabled) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = "hsl(200,70%,50%)";
        }
        ctx.fillStyle = "hsl(200,70%,50%)";
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height / 2);
      }
    }

    // Draw balls
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      const ballColor = ball.isFireball ? "hsl(30,85%,55%)" : "hsl(0,0%,70%)";
      const ballRotation = ball.rotation || 0;

      // Get ready glow (mobile)
      if (getReadyGlow && getReadyGlow.opacity > 0) {
        ctx.save();
        const glowRadius = ball.radius * 3;
        const glowGradient = ctx.createRadialGradient(ball.x, ball.y, ball.radius, ball.x, ball.y, glowRadius);
        glowGradient.addColorStop(0, `rgba(100,200,255,${getReadyGlow.opacity * 0.6})`);
        glowGradient.addColorStop(0.5, `rgba(100,200,255,${getReadyGlow.opacity * 0.3})`);
        glowGradient.addColorStop(1, `rgba(100,200,255,0)`);
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(100,200,255,${getReadyGlow.opacity * 0.8})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(100,200,255,1)";
        ctx.shadowBlur = 15 * getReadyGlow.opacity;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(ball.x, ball.y);

      const gradient = ctx.createRadialGradient(-ball.radius * 0.3, -ball.radius * 0.3, 0, 0, 0, ball.radius);
      if (ball.isFireball) {
        gradient.addColorStop(0, "rgba(255,255,255,0.9)");
        gradient.addColorStop(0.3, "hsl(30,85%,65%)");
        gradient.addColorStop(0.7, ballColor);
        gradient.addColorStop(1, "hsl(30,85%,35%)");
      } else {
        gradient.addColorStop(0, "rgba(255,255,255,0.9)");
        gradient.addColorStop(0.3, "hsl(0,0%,85%)");
        gradient.addColorStop(0.7, ballColor);
        gradient.addColorStop(1, "hsl(0,0%,40%)");
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

      if (!ball.isFireball) {
        ctx.rotate((ballRotation * Math.PI) / 180);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        for (let y = -ball.radius; y < ball.radius; y += 4) {
          const lineWidth = Math.sqrt(Math.max(0, ball.radius * ball.radius - y * y)) * 2;
          ctx.fillRect(-lineWidth / 2, y, lineWidth, 2);
        }
      }
      ctx.restore();

      // Fireball trail
      if (ball.isFireball && qualitySettings.glowEnabled) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "hsl(30,85%,55%)";
        ctx.fillStyle = "hsla(30,85%,55%,0.25)";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Homing trail
      if (ball.isHoming && boss) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,0,0,0.5)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(boss.x + boss.width / 2, boss.y + boss.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowColor = "red";
        ctx.shadowBlur = 15;
        ctx.fillStyle = "rgba(255,0,0,0.3)";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Launch indicator
      if (ball.waitingToLaunch) {
        const angle = (launchAngle * Math.PI) / 180;
        const lineLength = 100;
        const endX = ball.x + Math.sin(angle) * lineLength;
        const endY = ball.y - Math.cos(angle) * lineLength;
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Optional debug overlay (gated)
    if (debugEnabled) {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "12px monospace";
      ctx.fillText(`Bricks: ${bricks.length}`, 8, 16);
      ctx.fillText(`Balls: ${balls.length}`, 8, 32);
      ctx.restore();
    }

    // Restore canvas state
    ctx.restore();
  }, [
    ref,
    width,
    height,
    bricks,
    balls,
    paddle,
    level,
    backgroundPhase,
    highlightFlash,
    backgroundFlash,
    qualitySettings,
    boss,
    getReadyGlow,
    screenShake,
    debugEnabled,
    isMobile,
    launchAngle,
  ]);

  return <canvas ref={ref} width={width} height={height} style={{ width, height, display: "block" }} />;
});
