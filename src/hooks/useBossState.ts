import { useState, useCallback, useRef } from "react";
import type { Boss, BossProjectile, BossDebugInfo } from "@/types/boss";
import { DEFAULT_BOSS_CONFIG, BOSS_SIZE } from "@/constants/bossConfig";
import { useBossAI } from "./useBossAI";
import { soundManager } from "@/utils/sounds";

export const useBossState = (canvasWidth: number, canvasHeight: number) => {
  const [boss, setBoss] = useState<Boss | null>(null);
  const [bossProjectiles, setBossProjectiles] = useState<BossProjectile[]>([]);
  const bossAI = useBossAI(canvasWidth, canvasHeight);
  const debugInfo = useRef<BossDebugInfo>({
    bossMode: "idle",
    bossPatternIndex: 0,
    bossHealth: 0,
    bossCyclesCompleted: 0,
    layoutMode: "headerVisible",
    bossDebugVisuals: false,
    readyTapStart: "enabled",
  });

  // Spawn boss
  const spawnBoss = useCallback(() => {
    const bounds = bossAI.getBossBounds();
    const initialPattern = bossAI.pickRandomPattern();
    const centerX = (bounds.left + bounds.right) / 2;
    const startY = bounds.top + 20;

    const newBoss: Boss = {
      id: DEFAULT_BOSS_CONFIG.id,
      x: centerX - BOSS_SIZE.width / 2,
      y: startY,
      width: BOSS_SIZE.width,
      height: BOSS_SIZE.height,
      state: "idle",
      currentHealth: DEFAULT_BOSS_CONFIG.maxHealth,
      maxHealth: DEFAULT_BOSS_CONFIG.maxHealth,
      cyclesCompleted: 0,
      isAngry: false,
      currentPattern: initialPattern,
      patternStartTime: Date.now(),
      patternWaypoints: bossAI.generatePatternWaypoints(initialPattern, centerX, startY),
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
    debugInfo.current.bossMode = "idle";
    debugInfo.current.bossHealth = newBoss.currentHealth;
    debugInfo.current.bossCyclesCompleted = 0;
    console.log("[Boss Debug] Boss spawned:", newBoss.id);
    return newBoss;
  }, [bossAI]);

  // Register hit on boss
  const registerBossHit = useCallback(() => {
    setBoss((prevBoss) => {
      if (!prevBoss || prevBoss.state === "dead" || prevBoss.state === "stunned") return prevBoss;

      const now = Date.now();
      const newHealth = prevBoss.currentHealth - 1;

      console.log(`[Boss Debug] Boss hit! Health: ${newHealth}/${prevBoss.maxHealth}`);

      soundManager.playBrickHit(); // Boss hit sound

      // Flash effect
      const updatedBoss: Boss = {
        ...prevBoss,
        currentHealth: newHealth,
        state: "stunned",
        lastHitTime: now,
        hitFlashTime: now,
      };

      // Check if cycle complete
      if (newHealth <= 0) {
        updatedBoss.cyclesCompleted = prevBoss.cyclesCompleted + 1;
        console.log(`[Boss Debug] Boss cycle ${updatedBoss.cyclesCompleted} complete!`);

        // Check if should enter angry mode
        if (updatedBoss.cyclesCompleted === 1) {
          console.log("[Boss Debug] Boss entering ANGRY mode!");
          setTimeout(() => {
            setBoss((b) => {
              if (!b) return b;
              return {
                ...b,
                state: "angry",
                isAngry: true,
                currentHealth: b.maxHealth,
                animation: { ...b.animation, currentFrame: "angry", frameTime: 200 / b.config.angryMultiplier },
              };
            });
          }, 800);
        } else if (updatedBoss.cyclesCompleted >= 2) {
          // Final defeat
          console.log("[Boss Debug] Boss defeated!");
          updatedBoss.state = "dead";
        }
      } else {
        // Resume after stun
        setTimeout(() => {
          setBoss((b) => {
            if (!b || b.state !== "stunned") return b;
            return { ...b, state: b.isAngry ? "angry" : "moving" };
          });
        }, prevBoss.config.stunMs);
      }

      debugInfo.current.bossHealth = newHealth;
      debugInfo.current.bossCyclesCompleted = updatedBoss.cyclesCompleted;
      debugInfo.current.bossMode = updatedBoss.state;

      return updatedBoss;
    });
  }, []);

  // Update boss AI and movement
  const updateBoss = useCallback(
    (deltaTime: number, paddleX?: number) => {
      setBoss((prevBoss) => {
        if (!prevBoss) return prevBoss;
        if (prevBoss.state === "dead" || prevBoss.state === "stunned") return prevBoss;

        const now = Date.now();
        const speedMultiplier = prevBoss.isAngry ? prevBoss.config.movementSpeedMultiplier : 1;
        const moveSpeed = (prevBoss.config.baseSpeed * speedMultiplier * deltaTime) / 1000;

        // Check if pattern should change
        const patternDuration = prevBoss.config.patternDurationRange[0] + 
          Math.random() * (prevBoss.config.patternDurationRange[1] - prevBoss.config.patternDurationRange[0]);

        let updatedBoss = { ...prevBoss };

        if (now - prevBoss.patternStartTime > patternDuration || prevBoss.currentWaypointIndex >= prevBoss.patternWaypoints.length) {
          // Pick new pattern
          const newPattern = bossAI.pickRandomPattern();
          updatedBoss.currentPattern = newPattern;
          updatedBoss.patternWaypoints = bossAI.generatePatternWaypoints(newPattern, prevBoss.x, prevBoss.y);
          updatedBoss.currentWaypointIndex = 0;
          updatedBoss.patternStartTime = now;
          console.log(`[Boss Debug] New pattern: ${newPattern}`);
        }

        // Move towards current waypoint
        if (updatedBoss.currentWaypointIndex < updatedBoss.patternWaypoints.length) {
          const waypoint = updatedBoss.patternWaypoints[updatedBoss.currentWaypointIndex];
          const dx = waypoint.x - updatedBoss.x;
          const dy = waypoint.y - updatedBoss.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < moveSpeed * 2) {
            // Reached waypoint
            updatedBoss.x = waypoint.x;
            updatedBoss.y = waypoint.y;
            updatedBoss.currentWaypointIndex++;
            
            // Perform waypoint action
            if (waypoint.action) {
              updatedBoss.lastAttackTime = now; // Trigger attack on next update
            }
          } else {
            // Move towards waypoint with easing
            const easing = Math.min(1, distance / 100);
            updatedBoss.x += (dx / distance) * moveSpeed * easing;
            updatedBoss.y += (dy / distance) * moveSpeed * easing;
          }
        }

        // Handle blinking animation
        if (now - updatedBoss.lastBlinkTime > 3000 + Math.random() * 2000) {
          updatedBoss.isBlinking = true;
          updatedBoss.lastBlinkTime = now;
          setTimeout(() => {
            setBoss((b) => (b ? { ...b, isBlinking: false } : b));
          }, 150);
        }

        // Update animation frame
        updatedBoss.animation = {
          ...updatedBoss.animation,
          currentFrame: updatedBoss.isAngry ? "angry" : "idle",
        };

        debugInfo.current.bossMode = updatedBoss.state;
        return updatedBoss;
      });
    },
    [bossAI]
  );

  // Fire projectile
  const fireBossProjectile = useCallback(
    (type: "laser" | "missile" | "homingMissile", targetX?: number, targetY?: number) => {
      if (!boss) return;
      if (bossProjectiles.length >= boss.config.maxActiveProjectiles) return;

      const projectile = bossAI.createProjectile(boss, type, targetX, targetY);
      setBossProjectiles((prev) => [...prev, projectile]);
      
      soundManager.playBombDropSound(); // Temporary projectile sound
      console.log(`[Boss Debug] Fired ${type}`);
    },
    [boss, bossProjectiles, bossAI]
  );

  // Update projectiles
  const updateBossProjectiles = useCallback(
    (deltaTime: number, paddleX?: number, paddleY?: number) => {
      setBossProjectiles((prev) =>
        prev
          .map((proj) => {
            let { dx, dy } = proj;

            // Homing behavior
            if (proj.isHoming && paddleX !== undefined && paddleY !== undefined) {
              const angle = Math.atan2(paddleY - proj.y, paddleX - proj.x);
              const homingForce = boss?.config.homingStrength || 0.3;
              dx += Math.cos(angle) * proj.speed * homingForce * (deltaTime / 1000);
              dy += Math.sin(angle) * proj.speed * homingForce * (deltaTime / 1000);

              // Normalize speed
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
              rotation: proj.rotation + (deltaTime / 50),
              spinFrame: proj.spinFrame !== undefined ? (proj.spinFrame + deltaTime / 100) % 3 : 0,
            };
          })
          .filter((proj) => proj.y < canvasHeight + 50) // Remove off-screen projectiles
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
    debugInfo: debugInfo.current,
  };
};
