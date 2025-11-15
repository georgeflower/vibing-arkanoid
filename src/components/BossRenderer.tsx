import { useEffect, useRef } from "react";
import type { Boss, BossProjectile } from "@/types/boss";
import { BOSS_SPRITE_COORDS } from "@/constants/bossConfig";
import bossSpritesheetImg from "@/assets/boss-spritesheet.png";

interface BossRendererProps {
  boss: Boss | null;
  projectiles: BossProjectile[];
  canvas: HTMLCanvasElement;
  debugVisuals?: boolean;
}

export const BossRenderer = ({ boss, projectiles, canvas, debugVisuals = false }: BossRendererProps) => {
  const spritesheetRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = bossSpritesheetImg;
    spritesheetRef.current = img;
  }, []);

  useEffect(() => {
    if (!boss || !spritesheetRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderBoss = () => {
      if (!boss || !spritesheetRef.current || !spritesheetRef.current.complete) return;

      ctx.save();

      // Flash effect on hit
      const now = Date.now();
      if (now - boss.hitFlashTime < 150) {
        ctx.globalAlpha = 0.5 + Math.sin(now * 0.05) * 0.3;
      }

      // Determine sprite frame
      let spriteCoord = BOSS_SPRITE_COORDS.idle;
      
      if (boss.state === "stunned") {
        spriteCoord = boss.isAngry ? BOSS_SPRITE_COORDS.blinkAngry : BOSS_SPRITE_COORDS.blink;
      } else if (boss.isBlinking) {
        spriteCoord = boss.isAngry ? BOSS_SPRITE_COORDS.blinkAngry : BOSS_SPRITE_COORDS.blink;
      } else if (boss.state === "angry" || boss.isAngry) {
        spriteCoord = BOSS_SPRITE_COORDS.angry;
      } else if (boss.isTelegraphing) {
        spriteCoord = Math.random() > 0.5 ? BOSS_SPRITE_COORDS.leftArm : BOSS_SPRITE_COORDS.rightArm;
      } else {
        spriteCoord = BOSS_SPRITE_COORDS.idle;
      }

      // Draw boss sprite
      ctx.drawImage(
        spritesheetRef.current,
        spriteCoord.x,
        spriteCoord.y,
        spriteCoord.w,
        spriteCoord.h,
        boss.x,
        boss.y,
        boss.width,
        boss.height
      );

      ctx.restore();

      // Debug visuals
      if (debugVisuals) {
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        ctx.strokeRect(boss.x, boss.y, boss.width, boss.height);

        // Draw waypoints
        if (boss.patternWaypoints) {
          ctx.fillStyle = "cyan";
          boss.patternWaypoints.forEach((wp, i) => {
            ctx.beginPath();
            ctx.arc(wp.x, wp.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillText(`${i}`, wp.x + 10, wp.y);
          });
        }

        // Draw health bar
        const barWidth = boss.width;
        const barHeight = 8;
        const barX = boss.x;
        const barY = boss.y - 15;
        
        ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
        const healthPercent = boss.currentHealth / boss.maxHealth;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
      }
    };

    const renderProjectiles = () => {
      if (!spritesheetRef.current || !spritesheetRef.current.complete) return;

      projectiles.forEach((proj) => {
        ctx.save();
        ctx.translate(proj.x + proj.width / 2, proj.y + proj.height / 2);
        ctx.rotate(proj.rotation);

        let spriteCoord = BOSS_SPRITE_COORDS.projectileLaser;

        if (proj.type === "missile" || proj.type === "homingMissile") {
          if (proj.spinFrame !== undefined) {
            const frame = Math.floor(proj.spinFrame) % 3;
            spriteCoord = frame === 0 ? BOSS_SPRITE_COORDS.missileSpin1 
                        : frame === 1 ? BOSS_SPRITE_COORDS.missileSpin2 
                        : BOSS_SPRITE_COORDS.missileSpin3;
          } else {
            spriteCoord = BOSS_SPRITE_COORDS.projectileMissile;
          }
        }

        ctx.drawImage(
          spritesheetRef.current,
          spriteCoord.x,
          spriteCoord.y,
          spriteCoord.w,
          spriteCoord.h,
          -proj.width / 2,
          -proj.height / 2,
          proj.width,
          proj.height
        );

        ctx.restore();

        // Debug hitbox
        if (debugVisuals) {
          ctx.strokeStyle = "red";
          ctx.lineWidth = 1;
          ctx.strokeRect(proj.x, proj.y, proj.width, proj.height);
        }
      });
    };

    renderBoss();
    renderProjectiles();
  }, [boss, projectiles, canvas, debugVisuals]);

  return null;
};
