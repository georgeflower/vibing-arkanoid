import { useCallback } from "react";
import type { Boss, BossMovementPattern, BossWaypoint, BossProjectile, BossAttackType } from "@/types/boss";
import { BOSS_BOUNDS } from "@/constants/bossConfig";

export const useBossAI = (canvasWidth: number, canvasHeight: number) => {
  // Calculate boss movement bounds
  const getBossBounds = useCallback(() => {
    return {
      top: canvasHeight * BOSS_BOUNDS.topPercent,
      bottom: canvasHeight * BOSS_BOUNDS.bottomPercent,
      left: BOSS_BOUNDS.leftPadding,
      right: canvasWidth - BOSS_BOUNDS.rightPadding,
    };
  }, [canvasWidth, canvasHeight]);

  // Generate waypoints for each movement pattern
  const generatePatternWaypoints = useCallback((pattern: BossMovementPattern, bossX: number, bossY: number): BossWaypoint[] => {
    const bounds = getBossBounds();
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;
    const jitter = () => (Math.random() - 0.5) * 10;

    switch (pattern) {
      case "horizontalSweep":
        return [
          { x: bounds.left + jitter(), y: centerY + jitter(), pauseMs: 400, action: "shoot" },
          { x: centerX + jitter(), y: centerY + jitter(), pauseMs: 500, action: "shoot" },
          { x: bounds.right + jitter(), y: centerY + jitter(), pauseMs: 400, action: "shoot" },
        ];

      case "zigzagDescent":
        const zigzagPoints: BossWaypoint[] = [];
        let x = bounds.left;
        let y = bounds.top + 50;
        for (let i = 0; i < 4; i++) {
          zigzagPoints.push({ x: x + jitter(), y: y + jitter(), pauseMs: 200, action: "dropMissile" });
          x = x === bounds.left ? bounds.right : bounds.left;
          y += (bounds.bottom - bounds.top) / 5;
        }
        return zigzagPoints;

      case "cornerDarts":
        return [
          { x: bounds.left + 20 + jitter(), y: bounds.top + 20 + jitter(), pauseMs: 300, action: "shoot" },
          { x: bounds.right - 20 + jitter(), y: bounds.top + 20 + jitter(), pauseMs: 300, action: "shoot" },
        ];

      case "centerBob":
        const bobPoints: BossWaypoint[] = [];
        for (let i = 0; i < 5; i++) {
          bobPoints.push({
            x: centerX + jitter(),
            y: centerY + Math.sin(i * 0.8) * 30 + jitter(),
            pauseMs: i === 2 ? 600 : 200,
            action: i === 2 ? "charge" : undefined,
          });
        }
        return bobPoints;

      case "spiralOrbit":
        const spiralPoints: BossWaypoint[] = [];
        const radius = 80;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          spiralPoints.push({
            x: centerX + Math.cos(angle) * radius + jitter(),
            y: centerY + Math.sin(angle) * radius + jitter(),
            pauseMs: i % 4 === 0 ? 300 : 100,
            action: i % 4 === 0 ? "dropMissile" : undefined,
          });
        }
        return spiralPoints;

      case "waveSweep":
        const wavePoints: BossWaypoint[] = [];
        for (let i = 0; i < 6; i++) {
          const progress = i / 5;
          wavePoints.push({
            x: bounds.left + (bounds.right - bounds.left) * progress + jitter(),
            y: centerY + Math.sin(progress * Math.PI * 2) * 40 + jitter(),
            pauseMs: i % 2 === 0 ? 250 : 150,
            action: i % 2 === 0 ? "shoot" : undefined,
          });
        }
        return wavePoints;

      case "telegraphedDive":
        return [
          { x: centerX + jitter(), y: bounds.top + 30 + jitter(), pauseMs: 800, action: "charge" },
          { x: centerX + jitter(), y: bounds.bottom - 30 + jitter(), pauseMs: 200, action: "dropMissile" },
          { x: centerX + 50 + jitter(), y: bounds.top + 40 + jitter(), pauseMs: 300, action: "dropMissile" },
        ];

      case "patrolLanes":
        return [
          { x: bounds.left + 60 + jitter(), y: centerY + jitter(), pauseMs: 400 },
          { x: centerX + jitter(), y: centerY + jitter(), pauseMs: 800, action: "shoot" },
          { x: bounds.right - 60 + jitter(), y: centerY + jitter(), pauseMs: 400 },
        ];

      case "randomWaypoints":
        const randomPoints: BossWaypoint[] = [];
        for (let i = 0; i < 4; i++) {
          randomPoints.push({
            x: bounds.left + Math.random() * (bounds.right - bounds.left) + jitter(),
            y: bounds.top + Math.random() * (bounds.bottom - bounds.top) + jitter(),
            pauseMs: 300 + Math.random() * 300,
            action: Math.random() > 0.5 ? "shoot" : "dropMissile",
          });
        }
        return randomPoints;

      default:
        return [{ x: centerX, y: centerY, pauseMs: 1000 }];
    }
  }, [getBossBounds]);

  // Pick a random movement pattern
  const pickRandomPattern = useCallback((): BossMovementPattern => {
    const patterns: BossMovementPattern[] = [
      "horizontalSweep",
      "zigzagDescent",
      "cornerDarts",
      "centerBob",
      "spiralOrbit",
      "waveSweep",
      "telegraphedDive",
      "patrolLanes",
      "randomWaypoints",
    ];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }, []);

  // Create projectile based on attack type
  const createProjectile = useCallback(
    (boss: Boss, type: BossAttackType, targetX?: number, targetY?: number): BossProjectile => {
      const isHoming = type === "homingMissile";
      const speed = type === "laser" ? boss.config.laserSpeed : boss.config.missileSpeed;

      // Calculate direction
      let dx = 0;
      let dy = 1; // Default downward

      if (targetX !== undefined && targetY !== undefined) {
        const angle = Math.atan2(targetY - boss.y, targetX - boss.x);
        dx = Math.cos(angle) * speed;
        dy = Math.sin(angle) * speed;
      } else {
        dy = speed;
      }

      return {
        x: boss.x + boss.width / 2,
        y: boss.y + boss.height,
        width: type === "laser" ? 16 : 24,
        height: type === "laser" ? 16 : 20,
        dx,
        dy,
        type,
        speed,
        rotation: 0,
        spinFrame: 0,
        isHoming,
      };
    },
    []
  );

  return {
    getBossBounds,
    generatePatternWaypoints,
    pickRandomPattern,
    createProjectile,
  };
};
