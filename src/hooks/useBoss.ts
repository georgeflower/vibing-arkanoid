import { useState, useCallback, useRef } from "react";
import { DEFAULT_BOSS_CONFIG, BOSS_SIZE, BOSS_BOUNDS } from "@/constants/bossConfig";
import type { Boss, BossProjectile, BossMovementPattern, BossWaypoint } from "@/types/boss";
import { soundManager } from "@/utils/sounds";

export const useBoss = (canvasWidth: number, canvasHeight: number) => {
  const [boss, setBoss] = useState<Boss | null>(null);
  const [bossProjectiles, setBossProjectiles] = useState<BossProjectile[]>([]);

  const getBossBounds = useCallback(() => {
    return {
      top: canvasHeight * BOSS_BOUNDS.topPercent,
      bottom: canvasHeight * BOSS_BOUNDS.bottomPercent,
      left: BOSS_BOUNDS.leftPadding,
      right: canvasWidth - BOSS_BOUNDS.rightPadding,
    };
  }, [canvasWidth, canvasHeight]);

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

  const generatePatternWaypoints = useCallback((pattern: BossMovementPattern): BossWaypoint[] => {
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
      default:
        return [{ x: centerX, y: centerY, pauseMs: 1000 }];
    }
  }, [getBossBounds]);

  const spawnBoss = useCallback(() => {
    const bounds = getBossBounds();
    const centerX = (bounds.left + bounds.right) / 2;
    const startY = bounds.top + 20;
    const initialPattern = pickRandomPattern();

    const newBoss: Boss = {
      id: DEFAULT_BOSS_CONFIG.id,
      x: centerX - BOSS_SIZE.width / 2,
      y: startY,
      width: BOSS_SIZE.width,
      height: BOSS_SIZE.height,
      state: "moving",
      currentHealth: DEFAULT_BOSS_CONFIG.maxHealth,
      maxHealth: DEFAULT_BOSS_CONFIG.maxHealth,
      cyclesCompleted: 0,
      isAngry: false,
      currentPattern: initialPattern,
      patternStartTime: Date.now(),
      patternWaypoints: generatePatternWaypoints(initialPattern),
      currentWaypointIndex: 0,
      lastAttackTime: 0,
      config: { ...DEFAULT_BOSS_CONFIG },
      animation: {
        currentFrame: "idle",
        frameTime: 200,
        lastFrameChange: Date.now(),
      },
      velocity: { dx: 0, dy: 0 },
      lastHitTime: 0,
      isBlinking: false,
      lastBlinkTime: 0,
      isTelegraphing: false,
      telegraphStartTime: 0,
      hitFlashTime: 0,
    };

    setBoss(newBoss);
    console.log("[Boss] Spawned:", newBoss.id);
    return newBoss;
  }, [getBossBounds, pickRandomPattern, generatePatternWaypoints]);

  const registerBossHit = useCallback(() => {
    setBoss((prevBoss) => {
      if (!prevBoss || prevBoss.state === "dead" || prevBoss.state === "stunned") return prevBoss;

      const now = Date.now();
      const newHealth = prevBoss.currentHealth - 1;

      console.log(`[Boss] Hit! Health: ${newHealth}/${prevBoss.maxHealth}`);
      soundManager.playBrickHit();

      const updatedBoss: Boss = {
        ...prevBoss,
        currentHealth: newHealth,
        state: "stunned",
        lastHitTime: now,
        hitFlashTime: now,
      };

      if (newHealth <= 0) {
        updatedBoss.cyclesCompleted = prevBoss.cyclesCompleted + 1;
        console.log(`[Boss] Cycle ${updatedBoss.cyclesCompleted} complete!`);

        if (updatedBoss.cyclesCompleted === 1) {
          console.log("[Boss] Entering ANGRY mode!");
          soundManager.playExplosion();
          setTimeout(() => {
            setBoss((b) => {
              if (!b) return b;
              return {
                ...b,
                state: "moving",
                isAngry: true,
                currentHealth: b.maxHealth,
                animation: { ...b.animation, currentFrame: "angry", frameTime: 200 / b.config.angryMultiplier },
              };
            });
          }, 800);
        } else {
          console.log("[Boss] Defeated!");
          updatedBoss.state = "dead";
          soundManager.playExplosion();
        }
      } else {
        setTimeout(() => {
          setBoss((b) => {
            if (!b || b.state !== "stunned") return b;
            return { ...b, state: b.isAngry ? "moving" : "moving" };
          });
        }, prevBoss.config.stunMs);
      }

      return updatedBoss;
    });
  }, []);

  const updateBoss = useCallback((deltaTime: number) => {
    setBoss((prevBoss) => {
      if (!prevBoss || prevBoss.state === "dead" || prevBoss.state === "stunned") return prevBoss;

      const now = Date.now();
      const speedMultiplier = prevBoss.isAngry ? prevBoss.config.movementSpeedMultiplier : 1;
      const moveSpeed = (prevBoss.config.baseSpeed * speedMultiplier * deltaTime) / 1000;

      let updatedBoss = { ...prevBoss };

      const patternDuration =
        prevBoss.config.patternDurationRange[0] +
        Math.random() * (prevBoss.config.patternDurationRange[1] - prevBoss.config.patternDurationRange[0]);

      if (
        now - prevBoss.patternStartTime > patternDuration ||
        prevBoss.currentWaypointIndex >= prevBoss.patternWaypoints.length
      ) {
        const newPattern = pickRandomPattern();
        updatedBoss.currentPattern = newPattern;
        updatedBoss.patternWaypoints = generatePatternWaypoints(newPattern);
        updatedBoss.currentWaypointIndex = 0;
        updatedBoss.patternStartTime = now;
      }

      if (updatedBoss.currentWaypointIndex < updatedBoss.patternWaypoints.length) {
        const waypoint = updatedBoss.patternWaypoints[updatedBoss.currentWaypointIndex];
        const dx = waypoint.x - updatedBoss.x;
        const dy = waypoint.y - updatedBoss.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < moveSpeed * 2) {
          updatedBoss.x = waypoint.x;
          updatedBoss.y = waypoint.y;
          updatedBoss.currentWaypointIndex++;
        } else {
          const easing = Math.min(1, distance / 100);
          updatedBoss.x += (dx / distance) * moveSpeed * easing;
          updatedBoss.y += (dy / distance) * moveSpeed * easing;
        }
      }

      if (now - updatedBoss.lastBlinkTime > 3000 + Math.random() * 2000) {
        updatedBoss.isBlinking = true;
        updatedBoss.lastBlinkTime = now;
        setTimeout(() => {
          setBoss((b) => (b ? { ...b, isBlinking: false } : b));
        }, 150);
      }

      return updatedBoss;
    });
  }, [pickRandomPattern, generatePatternWaypoints]);

  const createProjectile = useCallback(
    (type: "laser" | "missile" | "homingMissile", targetX?: number, targetY?: number): BossProjectile | null => {
      if (!boss) return null;

      const isHoming = type === "homingMissile";
      const speed = type === "laser" ? boss.config.laserSpeed : boss.config.missileSpeed;

      let dx = 0;
      let dy = 1;

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
    [boss]
  );

  const fireBossProjectile = useCallback(
    (type: "laser" | "missile" | "homingMissile", targetX?: number, targetY?: number) => {
      if (!boss) return;
      if (bossProjectiles.length >= boss.config.maxActiveProjectiles) return;

      const projectile = createProjectile(type, targetX, targetY);
      if (projectile) {
        setBossProjectiles((prev) => [...prev, projectile]);
        soundManager.playBombDropSound();
      }
    },
    [boss, bossProjectiles, createProjectile]
  );

  const updateBossProjectiles = useCallback(
    (deltaTime: number, paddleX?: number, paddleY?: number) => {
      setBossProjectiles((prev) =>
        prev
          .map((proj) => {
            let { dx, dy } = proj;

            if (proj.isHoming && paddleX !== undefined && paddleY !== undefined) {
              const angle = Math.atan2(paddleY - proj.y, paddleX - proj.x);
              const homingForce = boss?.config.homingStrength || 0.3;
              dx += Math.cos(angle) * proj.speed * homingForce * (deltaTime / 1000);
              dy += Math.sin(angle) * proj.speed * homingForce * (deltaTime / 1000);

              const currentSpeed = Math.sqrt(dx * dx + dy * dy);
              if (currentSpeed > proj.speed) {
                dx = (dx / currentSpeed) * proj.speed;
                dy = (dy / currentSpeed) * proj.speed;
              }
            }

            return {
              ...proj,
              x: proj.x + dx * (deltaTime / 1000),
              y: proj.y + dy * (deltaTime / 1000),
              dx,
              dy,
              rotation: proj.rotation + deltaTime / 50,
              spinFrame: proj.spinFrame !== undefined ? (proj.spinFrame + deltaTime / 100) % 3 : 0,
            };
          })
          .filter((proj) => proj.y < canvasHeight + 50)
      );
    },
    [boss, canvasHeight]
  );

  return {
    boss,
    bossProjectiles,
    spawnBoss,
    registerBossHit,
    updateBoss,
    updateBossProjectiles,
    fireBossProjectile,
    setBoss,
    setBossProjectiles,
  };
};
