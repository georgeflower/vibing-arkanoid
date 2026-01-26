import { useState, useCallback } from "react";
import type { Bullet, Paddle, Brick, Enemy, Boss } from "@/types/game";
import { BULLET_WIDTH, BULLET_HEIGHT, BULLET_SPEED, CANVAS_HEIGHT, BRICK_PADDING } from "@/constants/game";
import { soundManager } from "@/utils/sounds";
import { getHitColor } from "@/constants/game";
import { toast } from "sonner";
import { isMegaBoss, handleMegaBossOuterDamage, exposeMegaBossCore, MegaBoss } from "@/utils/megaBossUtils";

export const useBullets = (
  setScore: React.Dispatch<React.SetStateAction<number>>,
  setBricks: React.Dispatch<React.SetStateAction<Brick[]>>,
  bricks: Brick[],
  enemies: Enemy[],
  setPaddle: React.Dispatch<React.SetStateAction<Paddle | null>>,
  onBrickDestroyedByTurret?: () => void,
  boss?: Boss | null,
  resurrectedBosses?: Boss[],
  setBoss?: React.Dispatch<React.SetStateAction<Boss | null>>,
  setResurrectedBosses?: React.Dispatch<React.SetStateAction<Boss[]>>,
  onLevelComplete?: () => void,
  onTurretDepleted?: () => void,
  onBossDefeated?: (bossType: 'cube' | 'sphere' | 'pyramid' | 'mega', boss: Boss) => void,
  onResurrectedBossDefeated?: (boss: Boss, index: number) => void,
  onSpherePhaseChange?: (boss: Boss) => Boss,
  onPyramidSplit?: (boss: Boss) => void,
  onBossHit?: (x: number, y: number, isSuper: boolean) => void
) => {
  const [bullets, setBullets] = useState<Bullet[]>([]);

  const fireBullets = useCallback((paddle: Paddle) => {
    if (!paddle.hasTurrets || !paddle.turretShots || paddle.turretShots <= 0) return;

    soundManager.playShoot();

    const isSuper = paddle.hasSuperTurrets || false;

    const leftBullet: Bullet = {
      x: paddle.x + 10,
      y: paddle.y,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      speed: BULLET_SPEED,
      isSuper,
    };

    const rightBullet: Bullet = {
      x: paddle.x + paddle.width - 10 - BULLET_WIDTH,
      y: paddle.y,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      speed: BULLET_SPEED,
      isSuper,
    };

    setBullets(prev => [...prev, leftBullet, rightBullet]);
    
    // Decrement turret shots and remove turrets if depleted
    setPaddle(prev => {
      if (!prev) return null;
      const newShots = (prev.turretShots || 0) - 1;
      if (newShots <= 0) {
        // Turrets depleted - trigger callback
        onTurretDepleted?.();
        return { ...prev, hasTurrets: false, turretShots: 0 };
      }
      return { ...prev, turretShots: newShots };
    });
  }, [setPaddle, onTurretDepleted]);

  const updateBullets = useCallback((currentBricks: Brick[]) => {
    // Move bullets and collect collision information
    setBullets(prev => {
      // In-place mutation: update positions without creating new objects
      for (let i = 0; i < prev.length; i++) {
        const b = prev[i];
        b.y = b.isBounced ? b.y + b.speed : b.y - b.speed;
      }
      
      // Filter out-of-bounds bullets (only creates new array if needed)
      let movedBullets = prev;
      const inBoundsCount = prev.filter(b => b.y > 0 && b.y < CANVAS_HEIGHT).length;
      if (inBoundsCount !== prev.length) {
        movedBullets = prev.filter(b => b.y > 0 && b.y < CANVAS_HEIGHT);
      }
      
      const bulletIndicesHit = new Set<number>();
      const bulletIndicesToBounce = new Set<number>();
      const brickIndicesToDestroy = new Set<number>();
      
      // Check enemy collisions first (only for bullets going up)
      for (let bulletIdx = 0; bulletIdx < movedBullets.length; bulletIdx++) {
        const bullet = movedBullets[bulletIdx];
        if (bulletIndicesHit.has(bulletIdx) || bullet.isBounced) continue;
        
        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (
            bulletIndicesHit.has(bulletIdx) ||
            bullet.x + bullet.width <= enemy.x ||
            bullet.x >= enemy.x + enemy.width ||
            bullet.y >= enemy.y + enemy.height ||
            bullet.y + bullet.height <= enemy.y
          ) {
            continue;
          }
          
          // Collision with enemy - bounce bullet back
          bulletIndicesToBounce.add(bulletIdx);
          soundManager.playBounce();
        }
      }
      
      // Check boss collisions (only for bullets going up, not bounced)
      const bossDamageMap = new Map<number, number>();
      const bossHitEffects: Array<{ x: number; y: number; isSuper: boolean }> = [];
      
      if (boss || (resurrectedBosses && resurrectedBosses.length > 0)) {
        for (let bulletIdx = 0; bulletIdx < movedBullets.length; bulletIdx++) {
          const bullet = movedBullets[bulletIdx];
          if (bulletIndicesHit.has(bulletIdx) || bulletIndicesToBounce.has(bulletIdx) || bullet.isBounced) continue;
          
          // Check main boss
          if (boss) {
            if (
              bullet.x + bullet.width > boss.x &&
              bullet.x < boss.x + boss.width &&
              bullet.y < boss.y + boss.height &&
              bullet.y + bullet.height > boss.y
            ) {
              bulletIndicesHit.add(bulletIdx);
              bossDamageMap.set(boss.id, (bossDamageMap.get(boss.id) || 0) + (bullet.isSuper ? 1 : 0.5));
              bossHitEffects.push({ x: bullet.x + bullet.width / 2, y: bullet.y, isSuper: bullet.isSuper || false });
              soundManager.playBounce();
            }
          }
          
          // Check resurrected bosses
          if (resurrectedBosses) {
            for (let i = 0; i < resurrectedBosses.length; i++) {
              const resBoss = resurrectedBosses[i];
              if (bulletIndicesHit.has(bulletIdx)) break;
              
              if (
                bullet.x + bullet.width > resBoss.x &&
                bullet.x < resBoss.x + resBoss.width &&
                bullet.y < resBoss.y + resBoss.height &&
                bullet.y + bullet.height > resBoss.y
              ) {
                bulletIndicesHit.add(bulletIdx);
                bossDamageMap.set(resBoss.id, (bossDamageMap.get(resBoss.id) || 0) + (bullet.isSuper ? 1 : 0.5));
                bossHitEffects.push({ x: bullet.x + bullet.width / 2, y: bullet.y, isSuper: bullet.isSuper || false });
                soundManager.playBounce();
              }
            }
          }
        }
        
        // Trigger boss hit visual effects
        for (let i = 0; i < bossHitEffects.length; i++) {
          const effect = bossHitEffects[i];
          onBossHit?.(effect.x, effect.y, effect.isSuper);
        }
        
        // Apply boss damage
        if (bossDamageMap.size > 0 && setBoss && setResurrectedBosses) {
          // Damage main boss
          if (boss && bossDamageMap.has(boss.id)) {
            const damage = bossDamageMap.get(boss.id)!;
            
            // Check if this is a Mega Boss - route damage to outer shield HP
            if (isMegaBoss(boss)) {
              setBoss(prev => {
                if (!prev || !isMegaBoss(prev)) return prev;
                const megaBoss = prev as MegaBoss;
                
                // Don't damage if core is already exposed (should hit core with ball)
                if (megaBoss.coreExposed) {
                  return prev;
                }
                
                const result = handleMegaBossOuterDamage(megaBoss, damage);
                soundManager.playBossHitSound();
                
                if (result.shouldExposeCore) {
                  // Expose the core!
                  const exposedBoss = exposeMegaBossCore({
                    ...megaBoss,
                    outerShieldHP: result.newOuterHP,
                    innerShieldHP: result.newInnerHP,
                    currentHealth: 0
                  } as MegaBoss);
                  toast.success("💥 CORE EXPOSED! Hit the core with the ball!", { duration: 3000 });
                  return exposedBoss as unknown as Boss;
                }
                
                // Update shield HP
                return {
                  ...megaBoss,
                  outerShieldHP: result.newOuterHP,
                  innerShieldHP: result.newInnerHP,
                  currentHealth: megaBoss.outerShieldRemoved ? result.newInnerHP : result.newOuterHP
                } as unknown as Boss;
              });
            } else {
              // Regular boss damage
              setBoss(prev => {
                if (!prev) return null;
                const newHealth = Math.max(0, prev.currentHealth - damage);
                
                soundManager.playBossHitSound();
                
                // Check for defeat/phase change
                if (newHealth <= 0) {
                  // Mega Boss is never defeated by bullets directly - has its own defeat system
                  if (prev.type === "mega") {
                    console.log(`[MEGA BOSS DEBUG] ⚠️ Bullet defeat blocked - type: ${prev.type}, health: ${prev.currentHealth}, phase: ${prev.currentStage}`);
                    return prev;
                  }
                  if (prev.type === "cube") {
                    onBossDefeated?.("cube", prev);
                    return null;
                  } else if (prev.type === "sphere") {
                    if (prev.currentStage === 1) {
                      // Phase 2 transition
                      const phase2Boss = onSpherePhaseChange?.(prev);
                      return phase2Boss || null;
                    } else {
                      // Sphere defeated
                      onBossDefeated?.("sphere", prev);
                      return null;
                    }
                  } else if (prev.type === "pyramid") {
                    if (prev.currentStage === 1) {
                      // Pyramid split
                      onPyramidSplit?.(prev);
                      return null;
                    }
                  }
                }
                
                // Health updated but boss still alive
                return { ...prev, currentHealth: newHealth };
              });
            }
          }
          
          // Damage resurrected bosses
          setResurrectedBosses(prev => {
            let hasChanges = false;
            for (let i = 0; i < prev.length; i++) {
              const resBoss = prev[i];
              if (bossDamageMap.has(resBoss.id)) {
                hasChanges = true;
                break;
              }
            }
            if (!hasChanges) return prev;
            
            return prev.map((resBoss, idx) => {
              if (bossDamageMap.has(resBoss.id)) {
                const damage = bossDamageMap.get(resBoss.id)!;
                const newHealth = Math.max(0, resBoss.currentHealth - damage);
                
                soundManager.playBossHitSound();
                
                if (newHealth <= 0) {
                  onResurrectedBossDefeated?.(resBoss, idx);
                  return { ...resBoss, currentHealth: 0 }; // Mark for removal
                }
                
                return { ...resBoss, currentHealth: newHealth };
              }
              return resBoss;
            }).filter(b => b.currentHealth > 0);
          });
        }
      }
      
      // Check brick collisions (only for bullets going up)
      for (let bulletIdx = 0; bulletIdx < movedBullets.length; bulletIdx++) {
        const bullet = movedBullets[bulletIdx];
        if (bulletIndicesHit.has(bulletIdx) || bulletIndicesToBounce.has(bulletIdx) || bullet.isBounced) continue;
        
        for (let brickIdx = 0; brickIdx < currentBricks.length; brickIdx++) {
          const brick = currentBricks[brickIdx];
          // Expand collision box to cover padding gaps
          const collisionX = brick.x - BRICK_PADDING / 2;
          const collisionY = brick.y - BRICK_PADDING / 2;
          const collisionWidth = brick.width + BRICK_PADDING;
          const collisionHeight = brick.height + BRICK_PADDING;
          
          if (
            bulletIndicesHit.has(bulletIdx) ||
            brickIndicesToDestroy.has(brickIdx) ||
            !brick.visible ||
            bullet.x + bullet.width <= collisionX ||
            bullet.x >= collisionX + collisionWidth ||
            bullet.y >= collisionY + collisionHeight ||
            bullet.y + bullet.height <= collisionY
          ) {
            continue;
          }
          
          // Collision detected
          if (brick.isIndestructible) {
            // Metal brick: super bullets destroy it, normal bullets bounce
            if (bullet.isSuper) {
              bulletIndicesHit.add(bulletIdx);
              brickIndicesToDestroy.add(brickIdx);
            } else {
              bulletIndicesHit.add(bulletIdx);
              soundManager.playBounce(); // Metallic ricochet sound
            }
          } else {
            // Normal brick: remove bullet and damage brick
            bulletIndicesHit.add(bulletIdx);
            brickIndicesToDestroy.add(brickIdx);
          }
        }
      }
      
      // Update bricks if any collisions occurred
      if (brickIndicesToDestroy.size > 0) {
        setBricks(prevBricks => {
          const updatedBricks = prevBricks.map((brick, idx) => {
            if (brickIndicesToDestroy.has(idx)) {
              soundManager.playBrickHit(brick.type, brick.hitsRemaining);
              const updatedBrick = { ...brick, hitsRemaining: brick.hitsRemaining - 1 };
              
              // Update brick color or make invisible
              if (updatedBrick.hitsRemaining > 0) {
                updatedBrick.color = getHitColor(brick.color, updatedBrick.hitsRemaining, brick.maxHits);
              } else {
                updatedBrick.visible = false;
                setScore(prev => prev + brick.points);
                onBrickDestroyedByTurret?.();
              }
              
              return updatedBrick;
            }
            return brick;
          });
          
          // Check if level complete after turret shot
          const remainingBricks = updatedBricks.filter(b => b.visible && !b.isIndestructible);
          if (remainingBricks.length === 0) {
            onLevelComplete?.();
          }
          
          return updatedBricks;
        });
      }
      
      // Return bullets: bounce the ones that hit enemies, remove ones that hit bricks/bosses
      // Only create new array if there are changes
      if (bulletIndicesHit.size === 0 && bulletIndicesToBounce.size === 0) {
        return movedBullets;
      }
      
      // Filter hit bullets and mutate bounced ones in-place
      const result: Bullet[] = [];
      for (let i = 0; i < movedBullets.length; i++) {
        if (bulletIndicesHit.has(i)) continue;
        const bullet = movedBullets[i];
        if (bulletIndicesToBounce.has(i)) {
          bullet.isBounced = true; // Mutate in-place
        }
        result.push(bullet);
      }
      return result;
    });
  }, [setBricks, setScore, enemies, boss, resurrectedBosses, setBoss, setResurrectedBosses, onLevelComplete]);

  return {
    bullets,
    setBullets,
    fireBullets,
    updateBullets,
  };
};
