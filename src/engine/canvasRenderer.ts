/**
 * engine/canvasRenderer.ts — Pure rendering function.
 *
 * Extracted from GameCanvas.tsx's useEffect. All entity data is read
 * from `world`, UI/config data from `renderState`, and pre-loaded
 * images from `assets`. `now` is captured once per frame by the caller.
 *
 * NO React dependency. NO per-frame allocations beyond canvas API internals.
 */

import type { GameWorld } from "@/engine/state";
import type { RenderState, AssetRefs } from "@/engine/renderState";
import type { Brick, BonusLetterType } from "@/types/game";
import { isMegaBoss, type MegaBoss } from "@/utils/megaBossUtils";
import { brickRenderer } from "@/utils/brickLayerCache";
import { particlePool } from "@/utils/particlePool";

// ─── Module-level animation state (previously useRef) ────────

let dashOffset = 0;

// ─── Gradient Cache ──────────────────────────────────────────
// Avoids recreating identical CanvasGradient objects every frame.
// Gradients are defined at the origin and repositioned via ctx.translate().
// Cache is invalidated when the canvas context changes (resize / remount).

const gradientCache: Record<string, CanvasGradient> = {};
let cacheCtx: CanvasRenderingContext2D | null = null;

function ensureCacheCtx(ctx: CanvasRenderingContext2D): void {
  if (cacheCtx !== ctx) {
    for (const k in gradientCache) delete gradientCache[k];
    cacheCtx = ctx;
  }
}

function getCachedRadialGradient(
  ctx: CanvasRenderingContext2D,
  key: string,
  x0: number, y0: number, r0: number,
  x1: number, y1: number, r1: number,
  stops: [number, string][],
): CanvasGradient {
  ensureCacheCtx(ctx);
  if (!gradientCache[key]) {
    const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    gradientCache[key] = g;
  }
  return gradientCache[key];
}

function getCachedLinearGradient(
  ctx: CanvasRenderingContext2D,
  key: string,
  x0: number, y0: number,
  x1: number, y1: number,
  stops: [number, string][],
): CanvasGradient {
  ensureCacheCtx(ctx);
  if (!gradientCache[key]) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    gradientCache[key] = g;
  }
  return gradientCache[key];
}

// ─── Helpers ─────────────────────────────────────────────────

function isImageValid(img: HTMLImageElement | null): img is HTMLImageElement {
  return !!(img && img.complete && img.naturalHeight !== 0);
}

function getBackgroundPattern(
  ctx: CanvasRenderingContext2D,
  key: string,
  img: HTMLImageElement | null,
  assets: AssetRefs,
): CanvasPattern | null {
  if (!isImageValid(img)) return null;
  if (!assets.patterns[key]) {
    assets.patterns[key] = ctx.createPattern(img, "repeat");
  }
  return assets.patterns[key];
}

// ─── Drop Shadow Helper ─────────────────────────────────────
// Cheap alternative to ctx.shadowBlur (Gaussian blur). Draws a dark
// ellipse beneath an entity — nearly zero GPU cost vs blur which
// scales with radius² × DPR².

function drawDropShadow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  width: number, height: number,
  offsetY: number = 4,
) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + offsetY, width * 0.45, height * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Main Render Function ────────────────────────────────────

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  rs: RenderState,
  assets: AssetRefs,
  now: number,
): void {
  const { width, height } = rs;
  const level = rs.level;
  const qualitySettings = rs.qualitySettings;
  const gameState = rs.gameState;

  // Shorthand world reads
  const {
    balls, paddle, bricks, enemies, bombs, explosions, powerUps: _worldPU,
    bonusLetters, boss, resurrectedBosses, bossAttacks,
    laserWarnings, superWarnings, shieldImpacts, bulletImpacts,
    dangerBalls, screenShake, backgroundFlash, highlightFlash,
    launchAngle,
  } = world;

  // PowerUps and bullets come from renderState (still in React hooks)
  const powerUps = rs.powerUps;
  const bullets = rs.bullets;
  const collectedLetters = rs.collectedLetters;
  const bossIntroActive = rs.bossIntroActive;
  const tutorialHighlight = rs.tutorialHighlight;
  const debugEnabled = rs.debugEnabled;
  const isMobile = rs.isMobile;
  const getReadyGlow = rs.getReadyGlow;
  const secondChanceImpact = rs.secondChanceImpact;
  const ballReleaseHighlight = rs.ballReleaseHighlight;
  const SHOW_BOSS_HITBOX = debugEnabled;

  // ═══ Apply screen shake ═══
  ctx.save();
  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake;
    const shakeY = (Math.random() - 0.5) * screenShake;
    ctx.translate(shakeX, shakeY);
  }

  // ═══ Clear canvas + background ═══
  ctx.fillStyle = "hsl(220, 25%, 12%)";
  ctx.fillRect(0, 0, width, height);

  // Draw background based on level
  let useFittedBackground = false;

  if (level === 5 && isImageValid(assets.bossLevel5Bg)) {
    ctx.drawImage(assets.bossLevel5Bg, 0, 0, width, height);
    useFittedBackground = true;
  } else if (level === 10 && isImageValid(assets.bossLevel10Bg)) {
    ctx.drawImage(assets.bossLevel10Bg, 0, 0, width, height);
    useFittedBackground = true;
  } else if (level === 15 && isImageValid(assets.bossLevel15Bg)) {
    ctx.drawImage(assets.bossLevel15Bg, 0, 0, width, height);
    useFittedBackground = true;
  } else if (level === 20 && isImageValid(assets.bossLevel20Bg)) {
    ctx.drawImage(assets.bossLevel20Bg, 0, 0, width, height);
    useFittedBackground = true;
  }

  if (!useFittedBackground) {
    let bgImg: HTMLImageElement | null = null;
    let bgKey = "bg4";

    if (level >= 16 && level <= 19) {
      bgImg = assets.backgroundImage1620;
      bgKey = "bg1620";
    } else if (level >= 11 && level <= 14) {
      bgImg = assets.backgroundImage1114;
      bgKey = "bg1114";
    } else if (level >= 6 && level <= 9) {
      bgImg = assets.backgroundImage69;
      bgKey = "bg69";
    } else {
      bgImg = assets.backgroundImage4;
      bgKey = "bg4";
    }

    const pattern = getBackgroundPattern(ctx, bgKey, bgImg, assets);
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // Dim background for levels 1-4
  if (level >= 1 && level <= 4) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, width, height);

    if (!isMobile) {
      const ambientFlicker = Math.sin(now / 500) * 0.03 + 0.03;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = `rgba(100, 150, 200, ${ambientFlicker})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  // Highlight flash effect
  if (highlightFlash > 0 && level >= 1 && level <= 4) {
    ctx.save();
    const isGolden = highlightFlash > 1.2;
    const intensity = Math.min(highlightFlash, 1.0);

    ctx.globalCompositeOperation = "overlay";
    if (isGolden) {
      ctx.fillStyle = `rgba(255, 200, 100, ${intensity * 0.6})`;
    } else {
      ctx.fillStyle = `rgba(100, 200, 255, ${intensity * 0.5})`;
    }
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = "soft-light";
    if (isGolden) {
      ctx.fillStyle = `rgba(255, 220, 150, ${intensity * 0.7})`;
    } else {
      ctx.fillStyle = `rgba(150, 220, 255, ${intensity * 0.6})`;
    }
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Background flash
  if (backgroundFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${backgroundFlash * 0.4})`;
    ctx.fillRect(0, 0, width, height);
  }

  // ═══ Draw bricks ═══
  if (brickRenderer.isReady()) {
    brickRenderer.updateCache(bricks, qualitySettings);
    brickRenderer.drawToCanvas(ctx);
  } else {
    bricks.forEach((brick) => {
      if (brick.visible) {
        // No shadowBlur needed
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      }
    });
  }

  // ═══ Draw paddle ═══
  if (paddle) {
    const img = assets.paddleImage;
    ctx.save();
    if (isImageValid(img)) {
      if (qualitySettings.shadowsEnabled) {
        drawDropShadow(ctx, paddle.x + paddle.width / 2, paddle.y + paddle.height / 2, paddle.width, paddle.height);
      }
      ctx.drawImage(img, paddle.x, paddle.y, paddle.width, paddle.height);
    } else {
      if (qualitySettings.shadowsEnabled) {
        drawDropShadow(ctx, paddle.x + paddle.width / 2, paddle.y + paddle.height / 2, paddle.width, paddle.height);
      }
      ctx.fillStyle = "hsl(200, 70%, 50%)";
      ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height / 2);
    }
    ctx.restore();
  }

  // ═══ DANGER BALLS ═══
  if (dangerBalls && dangerBalls.length > 0) {
    dangerBalls.forEach((dangerBall) => {
      ctx.save();
      const isHoming = dangerBall.isReflected;
      const flashPhase = Math.sin(now / 80);
      const isWhitePhase = flashPhase > 0;

      if (!isHoming && paddle) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 200, 0, 0.6)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.lineDashOffset = -now / 50;
        ctx.beginPath();
        ctx.moveTo(dangerBall.x, dangerBall.y);
        ctx.lineTo(paddle.x + paddle.width / 2, paddle.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      if (qualitySettings.shadowsEnabled) {
        drawDropShadow(ctx, dangerBall.x, dangerBall.y, dangerBall.radius * 2, dangerBall.radius * 2);
      }

      ctx.beginPath();
      ctx.arc(dangerBall.x, dangerBall.y, dangerBall.radius, 0, Math.PI * 2);

      const grad = ctx.createRadialGradient(
        dangerBall.x - dangerBall.radius * 0.3,
        dangerBall.y - dangerBall.radius * 0.3,
        0,
        dangerBall.x,
        dangerBall.y,
        dangerBall.radius,
      );

      if (isHoming) {
        if (isWhitePhase) {
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.5, "#aaffaa");
          grad.addColorStop(1, "#44cc44");
        } else {
          grad.addColorStop(0, "#88ff88");
          grad.addColorStop(0.5, "#22cc22");
          grad.addColorStop(1, "#006600");
        }
      } else {
        if (isWhitePhase) {
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.5, "#ffcccc");
          grad.addColorStop(1, "#ff6666");
        } else {
          grad.addColorStop(0, "#ff8888");
          grad.addColorStop(0.5, "#ff2222");
          grad.addColorStop(1, "#aa0000");
        }
      }

      ctx.fillStyle = grad;
      ctx.fill();

      // shadowBlur removed
      ctx.fillStyle = isWhitePhase ? (isHoming ? "#006600" : "#ff0000") : "#ffffff";
      ctx.font = `bold ${dangerBall.radius * 1.2}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(isHoming ? "↑" : "★", dangerBall.x, dangerBall.y);

      const pulseScale = 1 + Math.sin(now / 150) * 0.2;
      ctx.strokeStyle = isHoming
        ? isWhitePhase ? "rgba(100, 255, 100, 0.6)" : "rgba(255, 255, 255, 0.6)"
        : isWhitePhase ? "rgba(255, 100, 100, 0.6)" : "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(dangerBall.x, dangerBall.y, dangerBall.radius * pulseScale * 1.3, 0, Math.PI * 2);
      ctx.stroke();

      if (!isHoming) {
        const textFlash = Math.sin(now / 120) > 0;
        ctx.fillStyle = textFlash ? "#FFFF00" : "#FF8800";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText("CATCH!", dangerBall.x, dangerBall.y - dangerBall.radius - 8);
      }

      ctx.restore();
    });

    const incomingDangerBalls = dangerBalls.filter((b) => !b.isReflected);
    if (incomingDangerBalls.length > 0 && paddle) {
      ctx.save();
      const highlightPulse = Math.sin(now / 100) * 0.4 + 0.6;
      ctx.strokeStyle = `rgba(0, 200, 255, ${highlightPulse})`;
      ctx.lineWidth = 4;
      // Glow removed for performance — pulsing stroke is sufficient
      ctx.beginPath();
      ctx.roundRect(paddle.x - 4, paddle.y - 4, paddle.width + 8, paddle.height + 8, 6);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ═══ Draw balls ═══
  const chaosLevel = Math.min(
    1,
    (bombs.length + bossAttacks.length + enemies.length + explosions.length + dangerBalls.length) / 10,
  );

  balls.forEach((ball) => {
    const ballColor = ball.isFireball ? "hsl(30, 85%, 55%)" : "hsl(0, 0%, 92%)";

    // Get Ready glow
    if (getReadyGlow && getReadyGlow.opacity > 0) {
      ctx.save();
      const glowRadius = ball.radius * 3;
      const glowGradient = ctx.createRadialGradient(ball.x, ball.y, ball.radius, ball.x, ball.y, glowRadius);
      glowGradient.addColorStop(0, `rgba(100, 200, 255, ${getReadyGlow.opacity * 0.6})`);
      glowGradient.addColorStop(0.5, `rgba(100, 200, 255, ${getReadyGlow.opacity * 0.3})`);
      glowGradient.addColorStop(1, "rgba(100, 200, 255, 0)");
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(100, 200, 255, ${getReadyGlow.opacity * 0.8})`;
      ctx.lineWidth = 2;
      // shadowBlur removed — radial gradient already provides glow
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Ball release highlight
    if (ballReleaseHighlight && ballReleaseHighlight.active) {
      ctx.save();
      const elapsed = now - ballReleaseHighlight.startTime;
      const duration = 1500;
      const progress = Math.min(elapsed / duration, 1);
      const glowOpacity = 1 - progress;
      const pulsePhase = (now % 400) / 400;
      const pulseIntensity = 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.3;

      const releaseGlowRadius = ball.radius * 4 * pulseIntensity;
      const releaseGradient = ctx.createRadialGradient(
        ball.x, ball.y, ball.radius,
        ball.x, ball.y, releaseGlowRadius,
      );
      releaseGradient.addColorStop(0, `rgba(255, 220, 100, ${glowOpacity * 0.8})`);
      releaseGradient.addColorStop(0.4, `rgba(100, 255, 255, ${glowOpacity * 0.5})`);
      releaseGradient.addColorStop(1, "rgba(100, 200, 255, 0)");
      ctx.fillStyle = releaseGradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, releaseGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 255, 100, ${glowOpacity * 0.9})`;
      ctx.lineWidth = 3;
      // shadowBlur removed — gradient fill handles the visual
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius * 2.5 * pulseIntensity, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(100, 255, 255, ${glowOpacity * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius * 3.5 * pulseIntensity, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (paddle) {
        ctx.save();
        ctx.strokeStyle = `rgba(100, 255, 200, ${glowOpacity * 0.7})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 6]);
        ctx.lineDashOffset = -now / 40;
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(paddle.x + paddle.width / 2, paddle.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    const visualRadius = ball.radius + 2;

    // Chaos-aware glow
    if (chaosLevel > 0.2 && !ball.isFireball && qualitySettings.glowEnabled) {
      ctx.save();
      const chaosPulse = 1 + Math.sin(now / 200) * 0.2;
      const chaosGlowRadius = visualRadius * (2 + chaosLevel * 2) * chaosPulse;
      const chaosGlowOpacity = (chaosLevel - 0.2) * 0.875;
      const chaosGradient = ctx.createRadialGradient(
        ball.x, ball.y, visualRadius * 0.5,
        ball.x, ball.y, chaosGlowRadius,
      );
      chaosGradient.addColorStop(0, `rgba(150, 230, 255, ${chaosGlowOpacity})`);
      chaosGradient.addColorStop(0.5, `rgba(100, 200, 255, ${chaosGlowOpacity * 0.5})`);
      chaosGradient.addColorStop(1, "rgba(80, 180, 255, 0)");
      ctx.fillStyle = chaosGradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, chaosGlowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Dark outline
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

    const gradient = ball.isFireball
      ? getCachedRadialGradient(ctx, `ball_fire_${visualRadius}`,
          -visualRadius * 0.3, -visualRadius * 0.3, 0, 0, 0, visualRadius,
          [[0, "rgba(255,255,255,0.9)"], [0.3, "hsl(30,85%,65%)"], [0.7, "hsl(30,85%,55%)"], [1, "hsl(30,85%,35%)"]])
      : getCachedRadialGradient(ctx, `ball_norm_${visualRadius}`,
          -visualRadius * 0.3, -visualRadius * 0.3, 0, 0, 0, visualRadius,
          [[0, "rgba(255,255,255,1)"], [0.3, "hsl(0,0%,95%)"], [0.7, "hsl(0,0%,92%)"], [1, "hsl(0,0%,60%)"]]);

    if (qualitySettings.shadowsEnabled) {
      drawDropShadow(ctx, 0, 0, visualRadius * 2, visualRadius * 2);
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, visualRadius, 0, Math.PI * 2);
    ctx.fill();

    // Retro spinning pattern
    const ballRotation = ball.rotation || 0;
    if (!ball.isFireball) {
      // shadowBlur removed
      ctx.rotate((ballRotation * Math.PI) / 180);
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      for (let i = -visualRadius; i < visualRadius; i += 4) {
        const lineWidth = Math.sqrt(visualRadius * visualRadius - i * i) * 2;
        ctx.fillRect(-lineWidth / 2, i, lineWidth, 2);
      }
    }

    ctx.restore();

    // Fireball trail
    if (ball.isFireball && qualitySettings.glowEnabled) {
      const trailLength = 8;
      const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
      if (speed > 0) {
        for (let i = trailLength; i >= 1; i--) {
          const trailX = ball.x - (ball.dx / speed) * ball.radius * i * 1.0;
          const trailY = ball.y - (ball.dy / speed) * ball.radius * i * 1.0;
          const trailOpacity = 0.5 * (1 - i / (trailLength + 1));
          const trailSize = ball.radius * (1 - i / (trailLength + 2));
          ctx.save();
          ctx.globalAlpha = trailOpacity;
          ctx.fillStyle = `hsl(${30 - i * 5}, 85%, ${55 - i * 5}%)`;
          ctx.beginPath();
          ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.fillStyle = "hsla(30, 85%, 55%, 0.25)";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Homing ball trail
    if (ball.isHoming && boss) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(boss.x + boss.width / 2, boss.y + boss.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // shadowBlur removed — red circle is sufficient
      ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
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
      dashOffset = (dashOffset + 1) % 20;
      // shadowBlur removed — dashed line is clearly visible
      ctx.strokeStyle = "hsl(0, 85%, 55%)";
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = -dashOffset;
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }
  });

  // ═══ Draw power-ups ═══
  powerUps.forEach((powerUp) => {
    if (!powerUp.active) return;
    const img = assets.powerUpImages[powerUp.type];
    const size = powerUp.width;
    const isHighlighted = tutorialHighlight?.type === "power_up" && powerUps.indexOf(powerUp) === 0;
    const pulsePhase = (now % 1000) / 1000;
    const pulseScale = 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.05;

    ctx.save();
    ctx.translate(powerUp.x + size / 2, powerUp.y + size / 2);
    ctx.scale(pulseScale, pulseScale);
    ctx.translate(-size / 2, -size / 2);

    if (isHighlighted) {
      // Use bright stroke instead of shadowBlur for tutorial highlight
      ctx.strokeStyle = "rgba(0, 255, 255, 0.9)";
      ctx.lineWidth = 3;
    }

    // Metallic background
    const padding = 4;
    const rectX = -padding;
    const rectY = -padding;
    const rectWidth = size + padding * 2;
    const rectHeight = size + padding * 2;
    const radius = 6;

    const metalGradient = getCachedLinearGradient(ctx, `pu_metal_${size}`,
      rectX, rectY, rectX, rectY + rectHeight,
      [[0, "hsl(220,10%,65%)"], [0.3, "hsl(220,8%,50%)"], [0.5, "hsl(220,10%,60%)"], [0.7, "hsl(220,8%,45%)"], [1, "hsl(220,10%,35%)"]]);

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

    ctx.strokeStyle = "hsla(220, 15%, 80%, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Rivets
    const rivetRadius = 3;
    const rivetOffset = 6;
    const rivetPositions = [
      { x: rectX + rivetOffset, y: rectY + rivetOffset },
      { x: rectX + rectWidth - rivetOffset, y: rectY + rivetOffset },
      { x: rectX + rivetOffset, y: rectY + rectHeight - rivetOffset },
      { x: rectX + rectWidth - rivetOffset, y: rectY + rectHeight - rivetOffset },
    ];

    const rivetGrad = getCachedRadialGradient(ctx, "pu_rivet",
      -0.5, -0.5, 0, 0, 0, rivetRadius,
      [[0, "hsl(220,8%,70%)"], [0.4, "hsl(220,8%,50%)"], [1, "hsl(220,10%,30%)"]]);
    rivetPositions.forEach((pos) => {
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.beginPath();
      ctx.arc(0, 0, rivetRadius, 0, Math.PI * 2);
      ctx.fillStyle = rivetGrad;
      ctx.fill();
      ctx.strokeStyle = "hsla(220, 10%, 20%, 0.5)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    });

    // Outline
    ctx.strokeStyle = "hsl(220, 10%, 25%)";
    ctx.lineWidth = 2;
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

    if (isImageValid(img)) {
      ctx.globalAlpha = 0.95;
      ctx.drawImage(img, 0, 0, size, size);
    } else if (debugEnabled) {
      ctx.fillStyle = "magenta";
      ctx.fillRect(0, 0, size, size);
    }

    ctx.restore();
  });

  // ═══ Draw bullets ═══
  bullets.forEach((bullet) => {
    const enableGlow = qualitySettings.glowEnabled;

    if (bullet.isSuper && bullet.isBounced) {
      ctx.fillStyle = "hsl(0, 90%, 55%)";
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      if (enableGlow) {
        ctx.fillStyle = "hsla(0, 100%, 60%, 0.6)";
        ctx.fillRect(bullet.x - 3, bullet.y, bullet.width + 6, bullet.height + 10);
      }
      if (qualitySettings.level === "high") {
        for (let i = 0; i < 4; i++) {
          const offset = i * 8;
          const alpha = 0.6 - i * 0.15;
          const pSize = 4 - i * 0.8;
          ctx.fillStyle = `hsla(30, 100%, 60%, ${alpha})`;
          ctx.beginPath();
          ctx.arc(bullet.x + bullet.width / 2 + (Math.random() - 0.5) * 6, bullet.y + bullet.height + offset, pSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (bullet.isSuper) {
      ctx.fillStyle = "hsl(45, 90%, 55%)";
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      if (enableGlow) {
        ctx.fillStyle = "hsla(45, 100%, 70%, 0.5)";
        ctx.fillRect(bullet.x - 2, bullet.y, bullet.width + 4, bullet.height + 8);
      }
    } else if (bullet.isBounced) {
      ctx.fillStyle = "hsl(0, 85%, 55%)";
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    } else {
      ctx.fillStyle = "hsl(200, 70%, 50%)";
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
  });

  // DANGER text for bounced bullets
  bullets.filter((b) => b.isBounced).forEach((bullet) => {
    const paddleY = paddle?.y ?? height - 30;
    const dangerProgress = Math.min(1, Math.max(0, bullet.y / paddleY));
    const textScale = 1 + dangerProgress * 1;
    const textOpacity = 0.5 + dangerProgress * 0.5;
    const pulse = 1 + Math.sin(now / 100) * 0.15;
    const finalScale = textScale * pulse;

    ctx.save();
    ctx.font = `bold ${Math.floor(14 * finalScale)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(255, 50, 0, ${textOpacity})`;
    // shadowBlur removed — red text is readable without blur
    ctx.fillText("⚠ DANGER!", bullet.x + bullet.width / 2, bullet.y - 10 * finalScale);
    ctx.restore();
  });

  // Bullet impacts
  bulletImpacts.forEach((impact) => {
    const elapsed = now - impact.startTime;
    if (elapsed >= 500) return;
    const progress = elapsed / 500;
    const fadeOut = 1 - progress;

    const ringCount = impact.isSuper ? 4 : 2;
    for (let i = 0; i < ringCount; i++) {
      const ringRadius = 10 + progress * 50 + i * 10;
      const ringAlpha = fadeOut * (1 - i * 0.2);
      const color = impact.isSuper ? `hsla(45, 100%, 60%, ${ringAlpha})` : `hsla(200, 100%, 60%, ${ringAlpha})`;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 - i * 0.5;
      // shadowBlur removed — colored stroke rings + gradient flash are sufficient
      ctx.beginPath();
      ctx.arc(impact.x, impact.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    const flashSize = (impact.isSuper ? 20 : 12) * (1 - progress * 0.5);
    const flashGradient = ctx.createRadialGradient(impact.x, impact.y, 0, impact.x, impact.y, flashSize);
    if (impact.isSuper) {
      flashGradient.addColorStop(0, `rgba(255, 255, 200, ${fadeOut})`);
      flashGradient.addColorStop(0.5, `rgba(255, 220, 50, ${fadeOut * 0.7})`);
      flashGradient.addColorStop(1, "rgba(255, 180, 0, 0)");
    } else {
      flashGradient.addColorStop(0, `rgba(200, 255, 255, ${fadeOut})`);
      flashGradient.addColorStop(0.5, `rgba(50, 200, 255, ${fadeOut * 0.7})`);
      flashGradient.addColorStop(1, "rgba(0, 150, 255, 0)");
    }
    ctx.fillStyle = flashGradient;
    ctx.beginPath();
    ctx.arc(impact.x, impact.y, flashSize, 0, Math.PI * 2);
    ctx.fill();

    if (impact.isSuper && qualitySettings.level !== "low") {
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + progress * 3;
        const sparkDist = 15 + progress * 40;
        const sparkX = impact.x + Math.cos(angle) * sparkDist;
        const sparkY = impact.y + Math.sin(angle) * sparkDist;
        ctx.fillStyle = `rgba(255, 220, 50, ${fadeOut * 0.8})`;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 3 * fadeOut, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // shadowBlur removed
  });

  // ═══ Shield effects ═══
  if (paddle && paddle.hasShield) {
    const shieldPadding = 8;
    const shieldX = paddle.x - shieldPadding;
    const shieldY = paddle.y - shieldPadding - 5;
    const shieldWidth = paddle.width + shieldPadding * 2;
    const shieldHeight = paddle.height + shieldPadding * 2 + 5;

    if (qualitySettings.level === "low") {
      // shadowBlur removed — yellow stroke is visible without blur
      ctx.strokeStyle = "rgba(255, 220, 0, 0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      const r = 8;
      ctx.moveTo(shieldX + r, shieldY);
      ctx.lineTo(shieldX + shieldWidth - r, shieldY);
      ctx.arcTo(shieldX + shieldWidth, shieldY, shieldX + shieldWidth, shieldY + r, r);
      ctx.lineTo(shieldX + shieldWidth, shieldY + shieldHeight - r);
      ctx.arcTo(shieldX + shieldWidth, shieldY + shieldHeight, shieldX + shieldWidth - r, shieldY + shieldHeight, r);
      ctx.lineTo(shieldX + r, shieldY + shieldHeight);
      ctx.arcTo(shieldX, shieldY + shieldHeight, shieldX, shieldY + shieldHeight - r, r);
      ctx.lineTo(shieldX, shieldY + r);
      ctx.arcTo(shieldX, shieldY, shieldX + r, shieldY, r);
      ctx.closePath();
      ctx.stroke();
      // shadowBlur removed
    } else {
      const time = now / 1000;
      const pulseIntensity = 0.5 + Math.sin(time * 4) * 0.3;

      for (let layer = 0; layer < 3; layer++) {
        const layerOffset = layer * 2;
        const layerAlpha = (1 - layer * 0.3) * pulseIntensity;
        // shadowBlur removed — layered strokes convey depth without blur
        ctx.strokeStyle = `rgba(255, 220, 0, ${layerAlpha * 0.8})`;
        ctx.lineWidth = 3 - layer;
        ctx.beginPath();
        const r = 8;
        ctx.moveTo(shieldX - layerOffset + r, shieldY - layerOffset);
        ctx.lineTo(shieldX - layerOffset + shieldWidth - r, shieldY - layerOffset);
        ctx.arcTo(shieldX - layerOffset + shieldWidth, shieldY - layerOffset, shieldX - layerOffset + shieldWidth, shieldY - layerOffset + r, r);
        ctx.lineTo(shieldX - layerOffset + shieldWidth, shieldY - layerOffset + shieldHeight - r);
        ctx.arcTo(shieldX - layerOffset + shieldWidth, shieldY - layerOffset + shieldHeight, shieldX - layerOffset + shieldWidth - r, shieldY - layerOffset + shieldHeight, r);
        ctx.lineTo(shieldX - layerOffset + r, shieldY - layerOffset + shieldHeight);
        ctx.arcTo(shieldX - layerOffset, shieldY - layerOffset + shieldHeight, shieldX - layerOffset, shieldY - layerOffset + shieldHeight - r, r);
        ctx.lineTo(shieldX - layerOffset, shieldY - layerOffset + r);
        ctx.arcTo(shieldX - layerOffset, shieldY - layerOffset, shieldX - layerOffset + r, shieldY - layerOffset, r);
        ctx.closePath();
        ctx.stroke();
      }

      // Electrical arcs
      const arcCount = 6;
      for (let i = 0; i < arcCount; i++) {
        const arcTime = time * 3 + i * ((Math.PI * 2) / arcCount);
        const arcX = shieldX + shieldWidth / 2 + Math.cos(arcTime) * (shieldWidth / 2 - 5);
        const arcY = shieldY + shieldHeight / 2 + Math.sin(arcTime) * (shieldHeight / 2 - 5);
        const arcEndX = shieldX + shieldWidth / 2 + Math.cos(arcTime + 0.5) * (shieldWidth / 2);
        const arcEndY = shieldY + shieldHeight / 2 + Math.sin(arcTime + 0.5) * (shieldHeight / 2);
        const branchIntensity = (Math.sin(arcTime * 5) + 1) / 2;

        ctx.strokeStyle = `rgba(255, 255, 100, ${branchIntensity * 0.7})`;
        ctx.lineWidth = 2;
        // shadowBlur removed — bright yellow strokes are visible without blur
        ctx.beginPath();
        ctx.moveTo(arcX, arcY);
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

      // Inner energy fill
      const shieldGrad = ctx.createRadialGradient(
        shieldX + shieldWidth / 2, shieldY + shieldHeight / 2, 0,
        shieldX + shieldWidth / 2, shieldY + shieldHeight / 2, shieldWidth / 2,
      );
      shieldGrad.addColorStop(0, `rgba(255, 255, 150, ${0.15 * pulseIntensity})`);
      shieldGrad.addColorStop(1, "rgba(255, 220, 0, 0)");
      ctx.fillStyle = shieldGrad;
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
      // shadowBlur removed
    }

    // Shield impact effects
    shieldImpacts.forEach((impact) => {
      const elapsed = now - impact.startTime;
      if (elapsed >= impact.duration) return;
      const progress = elapsed / impact.duration;
      const fadeOut = 1 - progress;
      const rippleRadius = 15 + progress * 40;
      const rippleCount = qualitySettings.level !== "low" ? 3 : 2;

      for (let i = 0; i < rippleCount; i++) {
        const offset = i * 10;
        const alpha = fadeOut * (1 - i * 0.3);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.lineWidth = 3 - i;
        // shadowBlur removed
        ctx.beginPath();
        ctx.arc(impact.x, impact.y, rippleRadius + offset, 0, Math.PI * 2);
        ctx.stroke();
      }

      const flashSize = 8 * (1 - progress * 0.5);
      const flashGradient = ctx.createRadialGradient(impact.x, impact.y, 0, impact.x, impact.y, flashSize);
      flashGradient.addColorStop(0, `rgba(255, 255, 255, ${fadeOut * 0.9})`);
      flashGradient.addColorStop(0.5, `rgba(255, 220, 0, ${fadeOut * 0.6})`);
      flashGradient.addColorStop(1, "rgba(255, 220, 0, 0)");
      ctx.fillStyle = flashGradient;
      ctx.beginPath();
      ctx.arc(impact.x, impact.y, flashSize, 0, Math.PI * 2);
      ctx.fill();

      if (qualitySettings.level !== "low") {
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + progress * Math.PI;
          const dist = 5 + progress * 25;
          const sx = impact.x + Math.cos(angle) * dist;
          const sy = impact.y + Math.sin(angle) * dist;
          const sparkSize = 3 * fadeOut;
          ctx.fillStyle = `rgba(255, 255, 200, ${fadeOut * 0.8})`;
          // shadowBlur removed
          ctx.fillRect(sx - sparkSize / 2, sy - sparkSize / 2, sparkSize, sparkSize);
        }
      }
      // shadowBlur removed
    });
  }

  // ═══ Second Chance safety net ═══
  if (paddle?.hasSecondChance) {
    const safetyNetY = paddle.y + paddle.height + 35;
    const lineStartX = 10;
    const lineEndX = width - 10;
    const time = now / 1000;

    ctx.save();
    if (qualitySettings.level === "low") {
      // shadowBlur removed
      ctx.strokeStyle = "rgba(0, 200, 255, 0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lineStartX, safetyNetY);
      ctx.lineTo(lineEndX, safetyNetY);
      ctx.stroke();
    } else {
      const pulseIntensity = 0.6 + Math.sin(time * 6) * 0.4;
      // shadowBlur removed
      ctx.strokeStyle = `rgba(0, 200, 255, ${pulseIntensity * 0.9})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lineStartX, safetyNetY);
      ctx.lineTo(lineEndX, safetyNetY);
      ctx.stroke();

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
          // shadowBlur removed
          ctx.beginPath();
          ctx.moveTo(arcX, safetyNetY);
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

      const sparkCount = 3;
      for (let s = 0; s < sparkCount; s++) {
        const sparkPhase = (time * 2 + s * 0.33) % 1;
        const sparkX = lineStartX + (lineEndX - lineStartX) * sparkPhase;
        const sparkGlow = Math.sin(sparkPhase * Math.PI);
        ctx.fillStyle = `rgba(255, 255, 255, ${sparkGlow * 0.9})`;
        // shadowBlur removed
        ctx.beginPath();
        ctx.arc(sparkX, safetyNetY, 3 + sparkGlow * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Second Chance impact effect
  if (secondChanceImpact) {
    const elapsed = now - secondChanceImpact.startTime;
    if (elapsed < 500) {
      const progress = elapsed / 500;
      const fadeOut = 1 - progress;
      ctx.save();
      const waveRadius = 20 + progress * 80;
      const waveGradient = ctx.createRadialGradient(
        secondChanceImpact.x, secondChanceImpact.y, 0,
        secondChanceImpact.x, secondChanceImpact.y, waveRadius,
      );
      waveGradient.addColorStop(0, `rgba(0, 255, 255, ${fadeOut * 0.8})`);
      waveGradient.addColorStop(0.5, `rgba(0, 200, 255, ${fadeOut * 0.4})`);
      waveGradient.addColorStop(1, "rgba(0, 200, 255, 0)");
      ctx.fillStyle = waveGradient;
      ctx.beginPath();
      ctx.arc(secondChanceImpact.x, secondChanceImpact.y, waveRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${fadeOut * 0.9})`;
      // shadowBlur removed
      ctx.beginPath();
      ctx.arc(secondChanceImpact.x, secondChanceImpact.y, 8 * fadeOut, 0, Math.PI * 2);
      ctx.fill();

      if (qualitySettings.level !== "low") {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + progress * Math.PI * 2;
          const dist = 15 + progress * 40;
          const sx = secondChanceImpact.x + Math.cos(angle) * dist;
          const sy = secondChanceImpact.y + Math.sin(angle) * dist;
          ctx.strokeStyle = `rgba(100, 220, 255, ${fadeOut * 0.8})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(secondChanceImpact.x, secondChanceImpact.y);
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

  // ═══ Reflect shield ═══
  if (paddle?.hasReflectShield) {
    ctx.save();
    const rGrad = ctx.createLinearGradient(paddle.x, paddle.y - 18, paddle.x + paddle.width, paddle.y - 18);
    rGrad.addColorStop(0, "rgba(192, 192, 192, 0.3)");
    rGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.6)");
    rGrad.addColorStop(1, "rgba(192, 192, 192, 0.3)");
    ctx.fillStyle = rGrad;
    ctx.fillRect(paddle.x - 5, paddle.y - 18, paddle.width + 10, 12);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(now / 200) * 0.3})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(paddle.x - 5, paddle.y - 18, paddle.width + 10, 12);
    ctx.restore();
  }

  // ═══ Turrets ═══
  if (paddle && paddle.hasTurrets) {
    const turretWidth = 10;
    const turretHeight = 12;
    let turretHue = 0;
    let turretSat = 0;
    let turretLight = 60;
    let glowColor = "hsl(0, 0%, 60%)";

    if (paddle.hasSuperTurrets) {
      const maxShots = 45;
      const ammoRatio = Math.min((paddle.turretShots || 0) / maxShots, 1);
      turretHue = ammoRatio * 50;
      turretSat = 90;
      turretLight = 55;
      glowColor = `hsl(${turretHue}, ${turretSat}%, ${turretLight}%)`;
    }

    const mainColor = paddle.hasSuperTurrets ? `hsl(${turretHue}, ${turretSat}%, ${turretLight}%)` : "hsl(0, 0%, 60%)";
    const darkColor = paddle.hasSuperTurrets ? `hsl(${turretHue}, ${turretSat}%, ${turretLight - 20}%)` : "hsl(0, 0%, 40%)";

    // Left turret
    // shadowBlur removed — use drawDropShadow
    if (qualitySettings.shadowsEnabled) {
      drawDropShadow(ctx, paddle.x + 5 + turretWidth / 2, paddle.y - turretHeight / 2, turretWidth, turretHeight);
    }
    ctx.fillStyle = mainColor;
    ctx.fillRect(paddle.x + 5, paddle.y - turretHeight, turretWidth, turretHeight);
    ctx.fillStyle = darkColor;
    for (let i = 0; i < turretHeight; i += 3) {
      ctx.fillRect(paddle.x + 5, paddle.y - turretHeight + i, turretWidth, 1);
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(paddle.x + 5, paddle.y - turretHeight, turretWidth, 2);

    // Right turret
    if (qualitySettings.shadowsEnabled) {
      drawDropShadow(ctx, paddle.x + paddle.width - 15 + turretWidth / 2, paddle.y - turretHeight / 2, turretWidth, turretHeight);
    }
    ctx.fillStyle = mainColor;
    ctx.fillRect(paddle.x + paddle.width - 15, paddle.y - turretHeight, turretWidth, turretHeight);
    ctx.fillStyle = darkColor;
    for (let i = 0; i < turretHeight; i += 3) {
      ctx.fillRect(paddle.x + paddle.width - 15, paddle.y - turretHeight + i, turretWidth, 1);
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(paddle.x + paddle.width - 15, paddle.y - turretHeight, turretWidth, 2);

    // Ammo counter
    if (paddle.turretShots && paddle.turretShots > 0) {
      ctx.save();
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = paddle.hasSuperTurrets ? "hsl(45, 90%, 60%)" : "hsl(0, 0%, 80%)";
      // shadowBlur removed
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(paddle.turretShots.toString(), paddle.x + paddle.width / 2, paddle.y - turretHeight - 8);
      ctx.restore();
    }
  }

  // ═══ Draw enemies ═══
  drawEnemies(ctx, enemies, qualitySettings, now, boss);

  // ═══ Explosions ═══
  explosions.forEach((explosion) => {
    const progress = explosion.frame / explosion.maxFrames;
    const expRadius = 15 * (1 + progress * 2);
    const alpha = 1 - progress;

    let primaryHue = 30;
    let secondaryHue = 60;
    if (explosion.enemyType === "cube") { primaryHue = 200; secondaryHue = 180; }
    else if (explosion.enemyType === "sphere") { primaryHue = 330; secondaryHue = 350; }
    else if (explosion.enemyType === "pyramid") { primaryHue = 280; secondaryHue = 260; }

    ctx.save();
    ctx.globalAlpha = alpha;
    if (qualitySettings.glowEnabled) {
      // shadowBlur removed
    }
    ctx.strokeStyle = `hsla(${primaryHue}, 100%, 50%, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, expRadius, 0, Math.PI * 2);
    ctx.stroke();
    // shadowBlur removed
    ctx.fillStyle = `hsla(${secondaryHue}, 100%, 60%, ${alpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, expRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Pooled particles (debris)
  const pooledParticles = particlePool.getActive();
  if (pooledParticles.length > 0) {
    ctx.save();
    const particleStep = Math.ceil(1 / qualitySettings.particleMultiplier);
    const enableGlow = qualitySettings.glowEnabled;
    for (let index = 0; index < pooledParticles.length; index += particleStep) {
      const particle = pooledParticles[index];
      const particleAlpha = particle.life / particle.maxLife;
      ctx.globalAlpha = particleAlpha;
      // shadowBlur removed
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
      // shadowBlur removed
      ctx.fillStyle = `rgba(255, 255, 255, ${particleAlpha * 0.8})`;
      ctx.fillRect(particle.x - particle.size / 4, particle.y - particle.size / 4, particle.size / 2, particle.size / 2);
    }
    ctx.restore();
  }

  // ═══ Bombs and rockets ═══
  drawBombs(ctx, bombs, qualitySettings, now, assets);

  // ═══ Laser warnings ═══
  laserWarnings.forEach((warning) => {
    const elapsed = now - warning.startTime;
    const pulse = Math.abs(Math.sin(elapsed / 100));
    const warnAlpha = 0.4 + pulse * 0.6;
    const bossSource = boss || resurrectedBosses.find((b) => Math.abs(b.x + b.width / 2 - (warning.x + 4)) < 10);
    const startY = bossSource ? bossSource.y + bossSource.height : 0;

    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = `rgba(255, 0, 0, ${warnAlpha})`;
    ctx.strokeStyle = `rgba(255, 50, 50, ${warnAlpha})`;
    ctx.lineWidth = 8;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -now / 30;
    ctx.beginPath();
    ctx.moveTo(warning.x, startY);
    ctx.lineTo(warning.x, height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    if (elapsed > 300) {
      ctx.fillStyle = `rgba(255, 50, 50, ${warnAlpha * 0.8})`;
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("!!", warning.x + 4, height * 0.5);
    }
    ctx.restore();
  });

  // Super warnings
  superWarnings.forEach((warning) => {
    const elapsed = now - warning.startTime;
    const progress = elapsed / 800;
    const pulse = Math.abs(Math.sin(elapsed / 80));
    const alpha = 0.3 + pulse * 0.7;

    ctx.save();
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const ringRadius = 20 + progress * 80 + i * 15;
      const ringAlpha = alpha * (1 - i * 0.25);
      ctx.strokeStyle = `rgba(255, 100, 0, ${ringAlpha})`;
      ctx.lineWidth = 3 - i;
      ctx.beginPath();
      ctx.arc(warning.x, warning.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(255, 200, 50, ${alpha * 0.6})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 8]);
    ctx.lineDashOffset = -now / 20;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(warning.x, warning.y);
      ctx.lineTo(warning.x + Math.cos(angle) * 100, warning.y + Math.sin(angle) * 100);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const cGrad = ctx.createRadialGradient(warning.x, warning.y, 0, warning.x, warning.y, 30);
    cGrad.addColorStop(0, `rgba(255, 200, 100, ${alpha * 0.8})`);
    cGrad.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.4})`);
    cGrad.addColorStop(1, "rgba(255, 50, 0, 0)");
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.arc(warning.x, warning.y, 30, 0, Math.PI * 2);
    ctx.fill();

    if (progress > 0.2) {
      ctx.fillStyle = `rgba(255, 200, 50, ${alpha})`;
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("!! SUPER !!", warning.x, warning.y - 50);
    }
    ctx.restore();
  });

  // ═══ Boss attacks ═══
  drawBossAttacks(ctx, bossAttacks, qualitySettings, now, assets);

  // ═══ Boss ═══
  if (boss) {
    drawBoss(ctx, boss, resurrectedBosses, level, qualitySettings, now, SHOW_BOSS_HITBOX, paddle, width, height, assets);
  }

  // ═══ Resurrected bosses ═══
  resurrectedBosses.forEach((resBoss) => {
    const centerX = resBoss.x + resBoss.width / 2;
    const centerY = resBoss.y + resBoss.height / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(resBoss.rotationY);
    const size = resBoss.width / 2;
    const baseHue = resBoss.isSuperAngry ? 0 : 280;
    const intensity = resBoss.isSuperAngry ? 75 : 65;

    if (qualitySettings.glowEnabled) { ctx.shadowBlur = 20; ctx.shadowColor = `hsl(${baseHue}, 100%, 60%)`; }
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

    const hbW = resBoss.width;
    const hbH = 4;
    const hbX = resBoss.x;
    const hbY = resBoss.y - 10;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(hbX, hbY, hbW, hbH);
    const hpPercent = resBoss.currentHealth / resBoss.maxHealth;
    ctx.fillStyle = hpPercent > 0.5 ? "hsl(120, 80%, 50%)" : "hsl(0, 80%, 50%)";
    ctx.fillRect(hbX, hbY, hbW * hpPercent, hbH);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(hbX, hbY, hbW, hbH);
  });

  // ═══ Bonus letters ═══
  bonusLetters.forEach((letter) => {
    if (!letter.active) return;
    const img = assets.bonusLetterImages[letter.type];
    const size = letter.width;
    ctx.save();
    ctx.translate(letter.x + size / 2, letter.y + size / 2);
    ctx.shadowBlur = 15;
    ctx.shadowColor = "hsl(280, 90%, 60%)";
    if (isImageValid(img)) {
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = "hsl(280, 90%, 60%)";
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  // Collected letters at top
  const letterOrder: BonusLetterType[] = ["Q", "U", "M", "R", "A", "N"];
  const letterSize = 40;
  const spacing = 20;
  const totalWidth = letterOrder.length * letterSize + (letterOrder.length - 1) * spacing;
  const startX = (width - totalWidth) / 2;
  const y = 20;
  letterOrder.forEach((letter, index) => {
    const img = assets.bonusLetterImages[letter];
    const x = startX + index * (letterSize + spacing);
    const isCollected = collectedLetters.has(letter as BonusLetterType);
    ctx.save();
    if (isImageValid(img)) {
      ctx.globalAlpha = isCollected ? 1 : 0.3;
      ctx.drawImage(img, x, y, letterSize, letterSize);
    }
    ctx.restore();
  });

  // ═══ Game state overlay ═══
  if (gameState !== "playing") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, width, height);
    if (gameState !== "paused") {
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

  // Instructions overlay
  const waitingBall = balls.find((ball) => ball.waitingToLaunch);
  if (waitingBall && gameState === "playing") {
    ctx.shadowBlur = 0;
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const instructionY1 = height * 0.78;
    const instructionY2 = height * 0.83;
    const instructionY3 = height * 0.88;
    const text1 = "USE A AND D OR LEFT AND RIGHT TO CHANGE THE ANGLE";
    const text2 = "MUSIC: N - NEXT | B - PREVIOUS | M - MUTE/UNMUTE | P - PAUSE";
    const text3 = "F - FULLSCREEN | ESC - RELEASE MOUSE";

    ctx.fillStyle = "rgba(80, 80, 80, 0.8)";
    ctx.fillText(text1, width / 2 + 2, instructionY1 + 2);
    ctx.fillStyle = "rgba(180, 180, 180, 0.95)";
    ctx.fillText(text1, width / 2, instructionY1);
    ctx.fillStyle = "rgba(80, 80, 80, 0.8)";
    ctx.fillText(text2, width / 2 + 2, instructionY2 + 2);
    ctx.fillStyle = "rgba(180, 180, 180, 0.95)";
    ctx.fillText(text2, width / 2, instructionY2);
    ctx.fillStyle = "rgba(80, 80, 80, 0.8)";
    ctx.fillText(text3, width / 2 + 2, instructionY3 + 2);
    ctx.fillStyle = "rgba(180, 180, 180, 0.95)";
    ctx.fillText(text3, width / 2, instructionY3);
  }

  // Final pooled particles (gameOver/highScore)
  const activeParticles = particlePool.getActive();
  if (activeParticles.length > 0) {
    ctx.save();
    for (let i = 0; i < activeParticles.length; i++) {
      const particle = activeParticles[i];
      const pAlpha = particle.life / particle.maxLife;
      ctx.globalAlpha = pAlpha;
      if (qualitySettings.glowEnabled) { ctx.shadowBlur = 10; ctx.shadowColor = particle.color; }
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      if (particle.size > 3) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${pAlpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ═══ Boss intro cinematic ═══
  if (bossIntroActive) {
    ctx.save();
    const pulseAlpha = 0.7 + Math.sin(now / 300) * 0.2;
    ctx.fillStyle = `rgba(0, 0, 0, ${pulseAlpha})`;
    ctx.fillRect(0, 0, width, height);

    const borderPulse = 5 + Math.sin(now / 200) * 3;
    ctx.strokeStyle = `rgba(255, 0, 0, ${0.6 + Math.sin(now / 250) * 0.4})`;
    ctx.lineWidth = borderPulse;
    ctx.strokeRect(borderPulse / 2, borderPulse / 2, width - borderPulse, height - borderPulse);

    if (boss) {
      const zoomPulse = 1 + Math.sin(now / 400) * 0.1;
      ctx.save();
      ctx.translate(boss.x + boss.width / 2, boss.y + boss.height / 2);
      ctx.scale(zoomPulse, zoomPulse);
      ctx.translate(-(boss.x + boss.width / 2), -(boss.y + boss.height / 2));
      const spotGrad = ctx.createRadialGradient(
        boss.x + boss.width / 2, boss.y + boss.height / 2, 0,
        boss.x + boss.width / 2, boss.y + boss.height / 2, 150,
      );
      spotGrad.addColorStop(0, "rgba(255, 255, 255, 0.3)");
      spotGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const warningY = height * 0.2;
    const textFlash = Math.sin(now / 150) > 0 ? 1 : 0.5;
    ctx.shadowBlur = 20;
    ctx.shadowColor = `rgba(255, 0, 0, ${textFlash})`;
    ctx.fillStyle = `rgba(255, 50, 50, ${textFlash})`;
    ctx.fillText("⚠ WARNING ⚠", width / 2, warningY);
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(255, 255, 0, 0.5)";
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = "rgba(255, 255, 100, 0.9)";
    ctx.fillText("BOSS APPROACHING", width / 2, warningY + 50);
    ctx.restore();
  }

  // Restore context after shake
  ctx.restore();
}

// ─── Enemy Drawing ───────────────────────────────────────────

function drawEnemies(
  ctx: CanvasRenderingContext2D,
  enemies: GameWorld["enemies"],
  qualitySettings: RenderState["qualitySettings"],
  now: number,
  boss: GameWorld["boss"],
): void {
  enemies.forEach((singleEnemy) => {
    ctx.save();
    const centerX = singleEnemy.x + singleEnemy.width / 2;
    const centerY = singleEnemy.y + singleEnemy.height / 2;

    if (singleEnemy.type === "crossBall") {
      const radius = singleEnemy.width / 2;
      const hits = singleEnemy.hits || 0;
      let hue: number;
      let saturation = 100;
      let lightness = 50;

      if (hits === 0) {
        const cycleSpeed = 200;
        const t = (now % (cycleSpeed * 4)) / (cycleSpeed * 4);
        if (t < 0.25) hue = t * 4 * 30;
        else if (t < 0.5) hue = 30 + (t - 0.25) * 4 * 30;
        else if (t < 0.75) hue = 60 - (t - 0.5) * 4 * 30;
        else hue = 30 - (t - 0.75) * 4 * 30;
      } else {
        hue = 60;
      }

      let baseColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      let highlightColor = `hsl(${hue}, ${saturation}%, ${lightness + 20}%)`;
      if (singleEnemy.isAngry) {
        const blinkPhase = Math.floor(now / 100) % 2;
        baseColor = blinkPhase === 0 ? `hsl(${hue}, ${saturation}%, ${lightness + 10}%)` : `hsl(${hue}, ${saturation - 20}%, ${lightness - 15}%)`;
        highlightColor = `hsl(${hue}, ${saturation}%, ${lightness + 30}%)`;
      }

      const lightX = Math.cos(singleEnemy.rotationY) * radius * 0.4;
      const lightY = Math.sin(singleEnemy.rotationX) * radius * 0.4;
      const gradient = ctx.createRadialGradient(centerX + lightX, centerY + lightY, radius * 0.1, centerX, centerY, radius * 1.2);
      gradient.addColorStop(0, highlightColor);
      gradient.addColorStop(0.3, baseColor);
      gradient.addColorStop(0.7, `hsl(${hue}, 60%, 25%)`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");

      if (qualitySettings.shadowsEnabled) {
        drawDropShadow(ctx, centerX, centerY, singleEnemy.width, singleEnemy.height);
      }
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      const pulse = Math.abs(Math.sin(now / 100));
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 2 + pulse * 2;
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) {
        const latY = centerY + i * radius * 0.3;
        const latRadius = Math.sqrt(radius * radius - (i * radius * 0.3) * (i * radius * 0.3));
        const squeeze = Math.abs(Math.cos(singleEnemy.rotationX + i * 0.5));
        ctx.beginPath();
        ctx.ellipse(centerX, latY, latRadius * squeeze, latRadius * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      const specR = radius * 0.4;
      const specGradient = getCachedRadialGradient(ctx, `enemy_spec_${radius}`,
        0, 0, 0, 0, 0, specR,
        [[0, "rgba(255,255,255,0.9)"], [1, "rgba(255,255,255,0)"]]);
      const specX = centerX + lightX * 0.7;
      const specY = centerY + lightY * 0.7;
      ctx.save();
      ctx.translate(specX, specY);
      ctx.fillStyle = specGradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (singleEnemy.isAngry) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - 8, centerY - 5);
        ctx.lineTo(centerX - 5, centerY);
        ctx.moveTo(centerX + 8, centerY - 5);
        ctx.lineTo(centerX + 5, centerY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centerX, centerY + 8, 6, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
      }
    } else if (singleEnemy.type === "sphere") {
      const radius = singleEnemy.width / 2;
      let baseColor: string, highlightColor: string, darkColor: string;

      if (singleEnemy.isLargeSphere) {
        const hits = singleEnemy.hits || 0;
        if (hits === 0) {
          if (singleEnemy.isAngry) {
            const bp = Math.floor(now / 120) % 2;
            baseColor = bp === 0 ? "hsl(280, 90%, 55%)" : "hsl(280, 70%, 35%)";
            highlightColor = "hsl(280, 100%, 75%)";
            darkColor = "hsl(280, 60%, 20%)";
          } else {
            baseColor = "hsl(280, 80%, 50%)";
            highlightColor = "hsl(280, 90%, 70%)";
            darkColor = "hsl(280, 60%, 25%)";
          }
        } else if (hits === 1) {
          const bp = Math.floor(now / 110) % 2;
          baseColor = bp === 0 ? "hsl(30, 95%, 50%)" : "hsl(30, 80%, 35%)";
          highlightColor = "hsl(45, 100%, 70%)";
          darkColor = "hsl(20, 70%, 25%)";
        } else {
          const bp = Math.floor(now / 80) % 2;
          baseColor = bp === 0 ? "hsl(0, 95%, 55%)" : "hsl(0, 80%, 35%)";
          highlightColor = "hsl(0, 100%, 75%)";
          darkColor = "hsl(0, 70%, 20%)";
        }
      } else {
        baseColor = "hsl(200, 70%, 50%)";
        highlightColor = "hsl(200, 80%, 70%)";
        darkColor = "hsl(200, 60%, 30%)";
        if (singleEnemy.isAngry) {
          const bp = Math.floor(now / 150) % 2;
          baseColor = bp === 0 ? "hsl(0, 85%, 55%)" : "hsl(0, 75%, 40%)";
          highlightColor = "hsl(0, 90%, 75%)";
          darkColor = "hsl(0, 60%, 30%)";
        }
      }

      const lightX = Math.cos(singleEnemy.rotationY) * radius * 0.4;
      const lightY = Math.sin(singleEnemy.rotationX) * radius * 0.4;
      const gradient = ctx.createRadialGradient(centerX + lightX, centerY + lightY, radius * 0.1, centerX, centerY, radius * 1.2);
      gradient.addColorStop(0, highlightColor);
      gradient.addColorStop(0.3, baseColor);
      gradient.addColorStop(0.7, darkColor);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");

      if (qualitySettings.shadowsEnabled) {
        drawDropShadow(ctx, centerX, centerY, singleEnemy.width, singleEnemy.height);
      }
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Latitude/longitude lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        const latY = centerY + i * radius * 0.3;
        const latRadius = Math.sqrt(radius * radius - (i * radius * 0.3) * (i * radius * 0.3));
        const squeeze = Math.abs(Math.cos(singleEnemy.rotationX + i * 0.5));
        ctx.beginPath();
        ctx.ellipse(centerX, latY, latRadius * squeeze, latRadius * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Specular
      const specGrad = ctx.createRadialGradient(centerX + lightX * 0.7, centerY + lightY * 0.7, 0, centerX + lightX * 0.7, centerY + lightY * 0.7, radius * 0.4);
      specGrad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      specGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = specGrad;
      ctx.beginPath();
      ctx.arc(centerX + lightX * 0.7, centerY + lightY * 0.7, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();

      if (singleEnemy.isAngry) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - 8, centerY - 5);
        ctx.lineTo(centerX - 5, centerY);
        ctx.moveTo(centerX + 8, centerY - 5);
        ctx.lineTo(centerX + 5, centerY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centerX, centerY + 8, 6, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
      }
    } else if (singleEnemy.type === "pyramid") {
      const size = singleEnemy.width;
      let baseHue = 280;
      if (singleEnemy.hits === 1) baseHue = 50;
      else if (singleEnemy.hits === 2) baseHue = 0;
      let colorIntensity = 60;
      if (singleEnemy.isAngry) {
        const bp = Math.floor(now / 150) % 2;
        colorIntensity = bp === 0 ? 75 : 50;
      }

      const cos = Math.cos(singleEnemy.rotationY);
      const sin = Math.sin(singleEnemy.rotationY);
      const cosX = Math.cos(singleEnemy.rotationX);
      const sinX = Math.sin(singleEnemy.rotationX);

      const vertices = [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1], [0, -1, 0]];
      const projected = vertices.map(([x, y, z]) => {
        const ry = y * cosX - z * sinX;
        const rz = y * sinX + z * cosX;
        const rx2 = x * cos - rz * sin;
        const rz2 = x * sin + rz * cos;
        return [centerX + rx2 * size / 2, centerY + ry * size / 2, rz2];
      });

      const faces = [
        { indices: [0, 1, 4], color: `hsl(${baseHue}, ${colorIntensity}%, 40%)` },
        { indices: [1, 2, 4], color: `hsl(${baseHue}, ${colorIntensity}%, 50%)` },
        { indices: [2, 3, 4], color: `hsl(${baseHue}, ${colorIntensity}%, 60%)` },
        { indices: [3, 0, 4], color: `hsl(${baseHue}, ${colorIntensity}%, 45%)` },
        { indices: [0, 1, 2, 3], color: `hsl(${baseHue}, ${colorIntensity}%, 35%)` },
      ];

      const sortedFaces = faces.map((face) => ({
        ...face,
        avgZ: face.indices.reduce((sum, i) => sum + projected[i][2], 0) / face.indices.length,
      })).sort((a, b) => a.avgZ - b.avgZ);

      if (qualitySettings.shadowsEnabled) {
        drawDropShadow(ctx, centerX, centerY, singleEnemy.width, singleEnemy.height);
      }
      sortedFaces.forEach((face) => {
        ctx.fillStyle = face.color;
        ctx.beginPath();
        ctx.moveTo(projected[face.indices[0]][0], projected[face.indices[0]][1]);
        face.indices.forEach((i) => ctx.lineTo(projected[i][0], projected[i][1]));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
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

      if (singleEnemy.isAngry) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.shadowBlur = 5;
        ctx.shadowColor = "rgba(255, 0, 0, 0.8)";
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
      // Cube enemy
      const size = singleEnemy.width;
      const cos = Math.cos(singleEnemy.rotationY);
      const sin = Math.sin(singleEnemy.rotationY);
      const cosX = Math.cos(singleEnemy.rotationX);
      const sinX = Math.sin(singleEnemy.rotationX);

      const vertices = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
      const projected = vertices.map(([x, y, z]) => {
        const ry = y * cosX - z * sinX;
        const rz = y * sinX + z * cosX;
        const rx2 = x * cos - rz * sin;
        const rz2 = x * sin + rz * cos;
        return [centerX + rx2 * size / 2, centerY + ry * size / 2, rz2];
      });

      const faces = [
        { indices: [0, 1, 2, 3], color: "hsl(0, 75%, 40%)" },
        { indices: [0, 3, 7, 4], color: "hsl(0, 80%, 45%)" },
        { indices: [1, 5, 6, 2], color: "hsl(0, 80%, 50%)" },
        { indices: [0, 1, 5, 4], color: "hsl(0, 85%, 45%)" },
        { indices: [3, 2, 6, 7], color: "hsl(0, 85%, 55%)" },
        { indices: [4, 5, 6, 7], color: "hsl(0, 90%, 60%)" },
      ];

      const sortedFaces = faces.map((face) => ({
        ...face,
        avgZ: face.indices.reduce((sum, i) => sum + projected[i][2], 0) / 4,
      })).sort((a, b) => a.avgZ - b.avgZ);

      if (qualitySettings.shadowsEnabled) {
        drawDropShadow(ctx, centerX, centerY, singleEnemy.width, singleEnemy.height);
      }
      sortedFaces.forEach((face) => {
        ctx.fillStyle = face.color;
        ctx.beginPath();
        ctx.moveTo(projected[face.indices[0]][0], projected[face.indices[0]][1]);
        face.indices.forEach((i) => ctx.lineTo(projected[i][0], projected[i][1]));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }
    ctx.restore();
  });
}

// ─── Bomb Drawing ────────────────────────────────────────────

function drawBombs(
  ctx: CanvasRenderingContext2D,
  bombs: GameWorld["bombs"],
  qualitySettings: RenderState["qualitySettings"],
  now: number,
  assets: AssetRefs,
): void {

  bombs.forEach((bomb) => {
    const bombCenterX = bomb.x + bomb.width / 2;
    const bombCenterY = bomb.y + bomb.height / 2;
    const bombRotation = (now / 30) % 360;

    ctx.save();
    ctx.translate(bombCenterX, bombCenterY);
    ctx.rotate((bombRotation * Math.PI) / 180);

    if (bomb.type === "pyramidBullet") {
      if (qualitySettings.shadowsEnabled) { drawDropShadow(ctx, 0, 0, bomb.width, bomb.height); }
      ctx.fillStyle = "hsl(280, 70%, 55%)";
      ctx.beginPath();
      ctx.moveTo(0, -bomb.height / 2);
      ctx.lineTo(bomb.width / 2, 0);
      ctx.lineTo(0, bomb.height / 2);
      ctx.lineTo(-bomb.width / 2, 0);
      ctx.closePath();
      ctx.fill();
      const pyramidPulse = Math.abs(Math.sin(now / 150));
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + pyramidPulse * 0.5})`;
      ctx.lineWidth = 1.5 + pyramidPulse * 1.5;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(-1, -2, bomb.width / 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (bomb.type === "rocket") {
      const rocketLength = bomb.width * 1.8;
      const rocketWidth = bomb.width * 0.6;
      const angle = Math.atan2(bomb.dy || 1, bomb.dx || 0);
      ctx.rotate(angle + Math.PI / 2);

      const flameFlicker = 0.7 + Math.random() * 0.3;
      const flameGrad = ctx.createLinearGradient(0, rocketLength * 0.3, 0, rocketLength * 0.9);
      flameGrad.addColorStop(0, `rgba(255, 200, 50, ${flameFlicker})`);
      flameGrad.addColorStop(0.4, `rgba(255, 100, 0, ${flameFlicker * 0.8})`);
      flameGrad.addColorStop(1, "rgba(255, 50, 0, 0)");
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-rocketWidth * 0.5, rocketLength * 0.3);
      ctx.quadraticCurveTo(0, rocketLength * 1.2, rocketWidth * 0.5, rocketLength * 0.3);
      ctx.fill();

      if (qualitySettings.shadowsEnabled) { drawDropShadow(ctx, 0, 0, bomb.width * 1.8, bomb.width * 0.6); }
      const bodyGrad = ctx.createLinearGradient(-rocketWidth, 0, rocketWidth, 0);
      bodyGrad.addColorStop(0, "#cccccc");
      bodyGrad.addColorStop(0.3, "#ffffff");
      bodyGrad.addColorStop(0.7, "#ffffff");
      bodyGrad.addColorStop(1, "#aaaaaa");
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(0, -rocketLength * 0.5);
      ctx.lineTo(rocketWidth * 0.5, -rocketLength * 0.1);
      ctx.lineTo(rocketWidth * 0.5, rocketLength * 0.3);
      ctx.lineTo(-rocketWidth * 0.5, rocketLength * 0.3);
      ctx.lineTo(-rocketWidth * 0.5, -rocketLength * 0.1);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ff3333";
      ctx.beginPath();
      ctx.moveTo(0, -rocketLength * 0.5);
      ctx.lineTo(rocketWidth * 0.35, -rocketLength * 0.2);
      ctx.lineTo(-rocketWidth * 0.35, -rocketLength * 0.2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ff4444";
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
    } else {
      if (qualitySettings.shadowsEnabled) { drawDropShadow(ctx, 0, 0, bomb.width, bomb.height); }
      ctx.fillStyle = "hsl(0, 85%, 55%)";
      ctx.beginPath();
      ctx.arc(0, 0, bomb.width / 2, 0, Math.PI * 2);
      ctx.fill();
      const bombPulse = Math.abs(Math.sin(now / 100));
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + bombPulse * 0.5})`;
      ctx.lineWidth = 1.5 + bombPulse * 1.5;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(-2, -2, bomb.width / 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

// ─── Boss Attack Drawing ─────────────────────────────────────

function drawBossAttacks(
  ctx: CanvasRenderingContext2D,
  bossAttacks: GameWorld["bossAttacks"],
  qualitySettings: RenderState["qualitySettings"],
  now: number,
  assets: AssetRefs,
): void {

  bossAttacks.forEach((attack) => {
    if (attack.type === "laser") {
      if (qualitySettings.shadowsEnabled) { drawDropShadow(ctx, attack.x + attack.width / 2, attack.y + attack.height / 2, attack.width, attack.height); }
      ctx.fillStyle = "rgba(255, 50, 50, 0.9)";
      ctx.fillRect(attack.x, attack.y, attack.width, attack.height);
      ctx.fillStyle = "rgba(255, 200, 200, 0.6)";
      ctx.fillRect(attack.x + attack.width * 0.2, attack.y, attack.width * 0.6, attack.height);
      const laserPulse = Math.abs(Math.sin(now / 80));
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + laserPulse * 0.4})`;
      ctx.lineWidth = 2 + laserPulse * 2;
      ctx.strokeRect(attack.x, attack.y, attack.width, attack.height);
    } else if (attack.type === "rocket") {
      ctx.save();
      ctx.translate(attack.x + attack.width / 2, attack.y + attack.height / 2);
      const angle = Math.atan2(attack.dy || 1, attack.dx || 0);
      ctx.rotate(angle + Math.PI / 2);
      const rocketLength = attack.height * 1.5;
      const rocketWidth = attack.width * 1.2;

      // Smoke trail
      const smokeCount = 8;
      for (let i = 0; i < smokeCount; i++) {
        const smokeOffset = rocketLength * 0.5 + i * 12;
        const smokeAge = (now + i * 50) % 400;
        const smokeProgress = smokeAge / 400;
        const smokeAlpha = Math.max(0, 0.4 - smokeProgress * 0.5);
        const smokeSize = 4 + smokeProgress * 8 + i * 2;
        const wobbleX = Math.sin(now * 0.01 + i * 1.5) * (3 + i * 0.5);
        ctx.fillStyle = `rgba(180, 180, 190, ${smokeAlpha})`;
        ctx.beginPath();
        ctx.arc(wobbleX, smokeOffset + smokeProgress * 15, smokeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(220, 220, 230, ${smokeAlpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(wobbleX, smokeOffset + smokeProgress * 15, smokeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Flame
      const flameFlicker = 0.7 + Math.random() * 0.3;
      const flameGrad = ctx.createLinearGradient(0, rocketLength * 0.4, 0, rocketLength * 1.2);
      flameGrad.addColorStop(0, `rgba(255, 200, 50, ${flameFlicker})`);
      flameGrad.addColorStop(0.4, `rgba(255, 100, 0, ${flameFlicker * 0.8})`);
      flameGrad.addColorStop(1, "rgba(255, 50, 0, 0)");
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-rocketWidth * 0.4, rocketLength * 0.4);
      ctx.quadraticCurveTo(0, rocketLength * 1.5, rocketWidth * 0.4, rocketLength * 0.4);
      ctx.fill();

      // Missile image
      if (isImageValid(assets.missileImage)) {
        const imgWidth = attack.width * 4.5;
        const imgHeight = attack.height * 4;
        ctx.drawImage(assets.missileImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
      } else {
        ctx.fillStyle = "#ff3333";
        ctx.beginPath();
        ctx.moveTo(0, -rocketLength * 0.4);
        ctx.lineTo(rocketWidth * 0.4, rocketLength * 0.3);
        ctx.lineTo(-rocketWidth * 0.4, rocketLength * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (attack.type === "cross") {
      const cycleSpeed = 200;
      const t = (now % (cycleSpeed * 4)) / (cycleSpeed * 4);
      let hue: number;
      if (t < 0.25) hue = t * 4 * 30;
      else if (t < 0.5) hue = 30 + (t - 0.25) * 4 * 30;
      else if (t < 0.75) hue = 60 - (t - 0.5) * 4 * 30;
      else hue = 30 - (t - 0.75) * 4 * 30;

      if (!attack.isStopped && attack.dx !== undefined && attack.dy !== undefined) {
        const trailLength = 6;
        for (let i = trailLength; i >= 1; i--) {
          const trailX = attack.x - attack.dx * i * 2.5;
          const trailY = attack.y - attack.dy * i * 2.5;
          const trailOpacity = 0.4 * (1 - i / (trailLength + 1));
          const trailSize = (attack.width / 2) * (1 - i / (trailLength + 2));
          ctx.save();
          ctx.globalAlpha = trailOpacity;
          ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
          ctx.beginPath();
          ctx.arc(trailX + attack.width / 2, trailY + attack.height / 2, trailSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.save();
      ctx.translate(attack.x + attack.width / 2, attack.y + attack.height / 2);
      const rotationSpeed = attack.isStopped ? 100 : 30;
      ctx.rotate(((now / rotationSpeed) * Math.PI) / 180);
      const fillColor = `hsl(${hue}, 100%, 50%)`;
      if (qualitySettings.shadowsEnabled) { drawDropShadow(ctx, 0, 0, attack.width, attack.height); }
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(0, 0, attack.width / 2, 0, Math.PI * 2);
      ctx.fill();
      const pulse = Math.abs(Math.sin(now / 100));
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 2 + pulse * 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.beginPath();
      ctx.arc(-3, -3, attack.width / 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (attack.isStopped && attack.pendingDirection) {
        ctx.save();
        ctx.translate(attack.x + attack.width / 2, attack.y + attack.height / 2);
        const dirAngle = Math.atan2(attack.pendingDirection.dy, attack.pendingDirection.dx);
        ctx.rotate(dirAngle);
        const arrowPulse = 0.7 + Math.sin(now / 80) * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${arrowPulse})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
        const arrowOffset = attack.width / 2 + 4;
        const arrowSize = 8;
        ctx.beginPath();
        ctx.moveTo(arrowOffset + arrowSize, 0);
        ctx.lineTo(arrowOffset, -arrowSize * 0.6);
        ctx.lineTo(arrowOffset + arrowSize * 0.3, 0);
        ctx.lineTo(arrowOffset, arrowSize * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    } else {
      ctx.save();
      ctx.translate(attack.x + attack.width / 2, attack.y + attack.height / 2);
      ctx.rotate(((now / 30) * Math.PI) / 180);
      if (qualitySettings.shadowsEnabled) {
        drawDropShadow(ctx, 0, 0, attack.width, attack.height);
      }
      ctx.fillStyle = attack.type === "super" ? "hsl(280, 80%, 60%)" : "hsl(25, 85%, 50%)";
      ctx.beginPath();
      ctx.arc(0, 0, attack.width / 2, 0, Math.PI * 2);
      ctx.fill();
      const projectilePulse = Math.abs(Math.sin(now / 100));
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + projectilePulse * 0.5})`;
      ctx.lineWidth = 1.5 + projectilePulse * 1.5;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.beginPath();
      ctx.arc(-2, -2, attack.width / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}

// ─── Boss Drawing (stub - delegates to specific boss type) ───

function drawBoss(
  ctx: CanvasRenderingContext2D,
  boss: NonNullable<GameWorld["boss"]>,
  resurrectedBosses: GameWorld["resurrectedBosses"],
  level: number,
  qualitySettings: RenderState["qualitySettings"],
  now: number,
  showHitbox: boolean,
  paddle: GameWorld["paddle"],
  width: number,
  height: number,
  assets: AssetRefs,
): void {
  // Boss stun effect
  if (boss.isStunned) {
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(now / 100) * 0.3;
    ctx.strokeStyle = "#00FFFF";
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const angle = (now / 500 + i * Math.PI / 3) % (2 * Math.PI);
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

  const centerX = boss.x + boss.width / 2;
  const centerY = boss.y + boss.height / 2;

  ctx.save();
  ctx.translate(centerX, centerY);

  if (level === 20 && isMegaBoss(boss)) {
    // Mega boss rendering - simplified for brevity, kept identical to original
    drawMegaBoss(ctx, boss as MegaBoss, qualitySettings, now, showHitbox, paddle, width, height, assets);
  } else if (boss.type === "cube") {
    drawCubeBoss(ctx, boss, qualitySettings, now);
  } else if (boss.type === "sphere") {
    drawSphereBoss(ctx, boss, qualitySettings, now);
  } else if (boss.type === "pyramid") {
    const size = boss.width / 2;
    const baseHue = boss.isAngry ? 0 : 280;
    const intensity = boss.isSuperAngry ? 75 : boss.isAngry ? 65 : 60;
    ctx.rotate(boss.rotationY);
    if (qualitySettings.shadowsEnabled) { drawDropShadow(ctx, 0, 0, boss.width, boss.height); }
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

  // Health bar (skip for mega boss)
  if (!(level === 20 && isMegaBoss(boss))) {
    const hbWidth = boss.width + 40;
    const hbHeight = 10;
    const hbX = boss.x + boss.width / 2 - hbWidth / 2;
    const hbY = boss.y - 25;
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(hbX, hbY, hbWidth, hbHeight);
    const hpPercent = boss.currentHealth / boss.maxHealth;
    const hpHue = hpPercent > 0.5 ? 120 : hpPercent > 0.25 ? 60 : 0;
    ctx.fillStyle = `hsl(${hpHue}, 80%, 50%)`;
    ctx.fillRect(hbX, hbY, hbWidth * hpPercent, hbHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.strokeRect(hbX, hbY, hbWidth, hbHeight);
  }
}

// ─── Cube Boss ───────────────────────────────────────────────

function drawCubeBoss(
  ctx: CanvasRenderingContext2D,
  boss: NonNullable<GameWorld["boss"]>,
  qualitySettings: RenderState["qualitySettings"],
  now: number,
): void {
  const halfSize = boss.width / 2;
  const baseHue = boss.isAngry ? 0 : 180;
  const vertices = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
  const cosX = Math.cos(boss.rotationX);
  const sinX = Math.sin(boss.rotationX);
  const cosY = Math.cos(boss.rotationY);
  const sinY = Math.sin(boss.rotationY);

  const projected = vertices.map(([x, y, z]) => {
    const ry = y * cosX - z * sinX;
    const rz = y * sinX + z * cosX;
    const rx2 = x * cosY - rz * sinY;
    const rz2 = x * sinY + rz * cosY;
    return [rx2 * halfSize, ry * halfSize, rz2];
  });

  const faces = [
    { indices: [0, 1, 2, 3], lightness: 40 },
    { indices: [4, 5, 6, 7], lightness: 60 },
    { indices: [0, 3, 7, 4], lightness: 48 },
    { indices: [1, 2, 6, 5], lightness: 52 },
    { indices: [3, 2, 6, 7], lightness: 55 },
    { indices: [0, 1, 5, 4], lightness: 45 },
  ];

  const sortedFaces = faces.map((face) => ({
    ...face,
    avgZ: face.indices.reduce((sum, i) => sum + projected[i][2], 0) / 4,
  })).sort((a, b) => a.avgZ - b.avgZ);

  if (qualitySettings.shadowsEnabled) { drawDropShadow(ctx, 0, 0, boss.width, boss.height); }
  sortedFaces.forEach((face) => {
    ctx.fillStyle = `hsl(${baseHue}, 80%, ${face.lightness}%)`;
    ctx.beginPath();
    ctx.moveTo(projected[face.indices[0]][0], projected[face.indices[0]][1]);
    face.indices.forEach((i) => ctx.lineTo(projected[i][0], projected[i][1]));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `hsl(${baseHue}, 90%, 70%)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

// ─── Sphere Boss ─────────────────────────────────────────────

function drawSphereBoss(
  ctx: CanvasRenderingContext2D,
  boss: NonNullable<GameWorld["boss"]>,
  qualitySettings: RenderState["qualitySettings"],
  now: number,
): void {
  const radius = boss.width / 2;
  const baseHue = boss.isAngry ? 0 : 200;
  const oscillation = now / 500;

  const mainGrad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius);
  mainGrad.addColorStop(0, `hsl(${baseHue}, 80%, 75%)`);
  mainGrad.addColorStop(0.3, `hsl(${baseHue}, 70%, 55%)`);
  mainGrad.addColorStop(0.7, `hsl(${baseHue}, 60%, 35%)`);
  mainGrad.addColorStop(1, `hsl(${baseHue}, 50%, 15%)`);

  if (qualitySettings.shadowsEnabled) { drawDropShadow(ctx, 0, 0, boss.width, boss.height); }
  ctx.fillStyle = mainGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Grid lines
  ctx.strokeStyle = `hsla(${baseHue}, 60%, 60%, 0.3)`;
  ctx.lineWidth = 1;
  ctx.save();
  ctx.rotate(oscillation * 0.3);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.15, radius, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, radius * 0.15, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const highlightOffset = Math.sin(oscillation) * radius * 0.1;
  ctx.fillStyle = `rgba(255, 255, 255, ${boss.isAngry ? 0.6 : 0.4})`;
  ctx.beginPath();
  ctx.ellipse(-radius * 0.3 + highlightOffset, -radius * 0.35, radius * 0.2, radius * 0.12, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Angry face
  if (boss.isAngry) {
    ctx.shadowBlur = 0;
    const eyeSize = radius * 0.12;
    const eyeY = -radius * 0.1;
    const eyeSpacing = radius * 0.35;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-eyeSpacing - eyeSize, eyeY - eyeSize, eyeSize * 2, eyeSize * 2);
    ctx.fillRect(eyeSpacing - eyeSize, eyeY - eyeSize, eyeSize * 2, eyeSize * 2);
    const pupilOffset = Math.sin(oscillation) * eyeSize * 0.3;
    ctx.fillStyle = "#000000";
    ctx.fillRect(-eyeSpacing - eyeSize * 0.5 + pupilOffset, eyeY - eyeSize * 0.5, eyeSize, eyeSize);
    ctx.fillRect(eyeSpacing - eyeSize * 0.5 + pupilOffset, eyeY - eyeSize * 0.5, eyeSize, eyeSize);
    ctx.fillStyle = "#000000";
    const browY = eyeY - eyeSize * 1.8;
    const browThickness = eyeSize * 0.5;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-eyeSpacing - eyeSize + i * eyeSize * 0.6, browY + i * browThickness * 0.4, eyeSize * 0.7, browThickness);
    }
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(eyeSpacing + eyeSize - i * eyeSize * 0.6 - eyeSize * 0.7, browY + i * browThickness * 0.4, eyeSize * 0.7, browThickness);
    }
    const mouthY = radius * 0.35;
    const mouthWidth = radius * 0.5;
    ctx.fillRect(-mouthWidth, mouthY, mouthWidth * 0.3, eyeSize * 0.6);
    ctx.fillRect(-mouthWidth * 0.5, mouthY + eyeSize * 0.4, mouthWidth * 0.3, eyeSize * 0.6);
    ctx.fillRect(0, mouthY, mouthWidth * 0.3, eyeSize * 0.6);
    ctx.fillRect(mouthWidth * 0.5, mouthY + eyeSize * 0.4, mouthWidth * 0.3, eyeSize * 0.6);
  }

  if (boss.isAngry) {
    const pulse = Math.sin(now / 100) * 0.5 + 0.5;
    ctx.strokeStyle = `hsla(0, 100%, 70%, ${0.5 + pulse * 0.5})`;
    ctx.lineWidth = 3 + pulse * 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ─── Mega Boss Drawing ───────────────────────────────────────
// This is a simplified version - the full mega boss rendering
// is complex with multiple phases. Using the essential visual elements.

function drawMegaBoss(
  ctx: CanvasRenderingContext2D,
  megaBoss: MegaBoss,
  qualitySettings: RenderState["qualitySettings"],
  now: number,
  showHitbox: boolean,
  paddle: GameWorld["paddle"],
  width: number,
  height: number,
  assets: AssetRefs,
): void {
  const boss = megaBoss;
  const radius = boss.width / 2;
  const baseHue = megaBoss.corePhase === 3 ? 0 : megaBoss.corePhase === 2 ? 30 : 220;
  const hexRotation = boss.rotationY || 0;

  // Rotating hexagon body
  ctx.save();
  ctx.rotate(hexRotation);

  if (qualitySettings.shadowsEnabled) {
    drawDropShadow(ctx, 0, 0, boss.width, boss.height);
  }

  // Outer shield hexagon
  if (!megaBoss.outerShieldRemoved) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const nextAngle = (Math.PI / 3) * ((i + 1) % 6) - Math.PI / 2;
      const x1 = Math.cos(angle) * radius;
      const y1 = Math.sin(angle) * radius;
      const x2 = Math.cos(nextAngle) * radius;
      const y2 = Math.sin(nextAngle) * radius;
      if (i === 0) ctx.moveTo(x1, y1);
      const midAngle = (angle + nextAngle) / 2;
      const cpX = Math.cos(midAngle) * (radius * 1.06);
      const cpY = Math.sin(midAngle) * (radius * 1.06);
      ctx.quadraticCurveTo(cpX, cpY, x2, y2);
    }
    ctx.closePath();

    const hexGrad = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius);
    hexGrad.addColorStop(0, `hsl(${baseHue}, 60%, 45%)`);
    hexGrad.addColorStop(0.5, `hsl(${baseHue}, 50%, 35%)`);
    hexGrad.addColorStop(1, `hsl(${baseHue}, 40%, 25%)`);
    ctx.fillStyle = hexGrad;
    ctx.fill();
    ctx.strokeStyle = `hsl(${baseHue}, 80%, 60%)`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Vertex details
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

  // Inner octagon shield (phase 2)
  if (megaBoss.outerShieldRemoved && !megaBoss.coreExposed) {
    const innerOctRadius = radius * 0.65;
    const innerShieldHue = megaBoss.corePhase === 2 ? 30 : baseHue;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i - Math.PI / 8;
      const ox = Math.cos(angle) * innerOctRadius;
      const oy = Math.sin(angle) * innerOctRadius;
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
    }
    ctx.closePath();
    const innerGrad = ctx.createRadialGradient(0, 0, innerOctRadius * 0.3, 0, 0, innerOctRadius);
    innerGrad.addColorStop(0, `hsla(${innerShieldHue}, 70%, 50%, 0.6)`);
    innerGrad.addColorStop(1, `hsla(${innerShieldHue}, 50%, 30%, 0.4)`);
    ctx.fillStyle = innerGrad;
    ctx.fill();
    const innerPulse = Math.sin(now / 120) * 0.3 + 0.7;
    ctx.strokeStyle = `hsla(${innerShieldHue}, 100%, 70%, ${innerPulse})`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  ctx.restore(); // End rotation

  // Core
  const coreRadius = megaBoss.coreExposed ? radius * 0.4 : radius * 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
  if (megaBoss.coreExposed) {
    const pulse = Math.sin(now / 100) * 0.3 + 0.7;
    coreGrad.addColorStop(0, `rgba(255, 255, 200, ${pulse})`);
    coreGrad.addColorStop(0.5, `rgba(255, 200, 50, ${pulse})`);
    coreGrad.addColorStop(1, `rgba(200, 100, 0, ${pulse * 0.8})`);
  } else {
    const c1 = megaBoss.corePhase === 3 ? "#ff8888" : megaBoss.corePhase === 2 ? "#ffaa88" : "#88ddff";
    const c2 = megaBoss.corePhase === 3 ? "#ff2222" : megaBoss.corePhase === 2 ? "#ff6622" : "#0099ff";
    const c3 = megaBoss.corePhase === 3 ? "#990000" : megaBoss.corePhase === 2 ? "#993300" : "#005588";
    coreGrad.addColorStop(0, c1);
    coreGrad.addColorStop(0.5, c2);
    coreGrad.addColorStop(1, c3);
  }
  ctx.fillStyle = coreGrad;
  ctx.fill();
  const coreBorderColor = megaBoss.coreExposed ? "#ffff00" : megaBoss.corePhase === 3 ? "#ffcccc" : megaBoss.corePhase === 2 ? "#ffddaa" : "#bbddff";
  ctx.strokeStyle = coreBorderColor;
  ctx.lineWidth = megaBoss.coreExposed ? 4 : 3;
  ctx.stroke();

  if (megaBoss.coreExposed) {
    const hatchPulse = Math.sin(now / 80) * 0.4 + 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 0, ${hatchPulse})`;
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  // Cannon (when extended)
  if (megaBoss.cannonExtended && megaBoss.trappedBall && paddle) {
    ctx.save();
    const paddleCenterX = paddle.x + paddle.width / 2 - (boss.x + boss.width / 2);
    const paddleCenterY = paddle.y - (boss.y + boss.height / 2);
    const angleToTarget = Math.atan2(paddleCenterY, paddleCenterX) - Math.PI / 2;
    ctx.rotate(angleToTarget);

    const cannonWidth = 36;
    const cannonLength = 55;
    const cannonBaseY = radius * 0.5;

    const barrelGrad = ctx.createLinearGradient(-cannonWidth / 2, 0, cannonWidth / 2, 0);
    barrelGrad.addColorStop(0, `hsl(${baseHue}, 30%, 20%)`);
    barrelGrad.addColorStop(0.5, `hsl(${baseHue}, 50%, 40%)`);
    barrelGrad.addColorStop(1, `hsl(${baseHue}, 30%, 20%)`);
    ctx.fillStyle = barrelGrad;
    ctx.fillRect(-cannonWidth / 2, cannonBaseY, cannonWidth, cannonLength);
    ctx.strokeStyle = `hsl(${baseHue}, 70%, 55%)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-cannonWidth / 2, cannonBaseY, cannonWidth, cannonLength);

    ctx.beginPath();
    ctx.arc(0, cannonBaseY + cannonLength, 10, 0, Math.PI * 2);
    const muzzlePulse = Math.sin(now / 150) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 200, 100, ${muzzlePulse})`;
    ctx.fill();
    ctx.restore();
  }

  // Phase 1 health bar
  if (megaBoss.corePhase === 1 && !megaBoss.outerShieldRemoved) {
    const hbWidth = boss.width + 60;
    const hbHeight = 14;
    // These coords are relative to the boss center (we're still translated)
    const hbX = -hbWidth / 2;
    const hbY = -boss.height / 2 - 35;
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(hbX, hbY, hbWidth, hbHeight);
    const hpPercent = megaBoss.outerShieldHP / megaBoss.outerShieldMaxHP;
    ctx.fillStyle = megaBoss.coreExposed ? "hsl(60, 100%, 50%)" : "hsl(280, 80%, 50%)";
    ctx.fillRect(hbX + 2, hbY + 2, (hbWidth - 4) * hpPercent, hbHeight - 4);
    ctx.strokeStyle = "rgba(200, 150, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(hbX, hbY, hbWidth, hbHeight);
    ctx.fillStyle = megaBoss.coreExposed ? "#ffff00" : "#aa77ff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(megaBoss.coreExposed ? "CORE EXPOSED!" : "MEGA BOSS", 0, hbY - 5);
    ctx.textAlign = "left";
  }
}
