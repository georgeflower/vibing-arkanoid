import { useState, useCallback } from "react";
import type { Bullet, Paddle, Brick, Enemy } from "@/types/game";
import { BULLET_WIDTH, BULLET_HEIGHT, BULLET_SPEED, CANVAS_HEIGHT, BRICK_PADDING } from "@/constants/game";
import { soundManager } from "@/utils/sounds";
import { getHitColor } from "@/constants/game";
import { toast } from "sonner";

export const useBullets = (
  setScore: React.Dispatch<React.SetStateAction<number>>,
  setBricks: React.Dispatch<React.SetStateAction<Brick[]>>,
  bricks: Brick[],
  enemies: Enemy[],
  setPaddle: React.Dispatch<React.SetStateAction<Paddle | null>>,
  onBrickDestroyedByTurret?: () => void
) => {
  const [bullets, setBullets] = useState<Bullet[]>([]);

  const fireBullets = useCallback((paddle: Paddle) => {
    if (!paddle.hasTurrets || !paddle.turretShots || paddle.turretShots <= 0) return;

    soundManager.playShoot();

    const leftBullet: Bullet = {
      x: paddle.x + 10,
      y: paddle.y,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      speed: BULLET_SPEED,
    };

    const rightBullet: Bullet = {
      x: paddle.x + paddle.width - 10 - BULLET_WIDTH,
      y: paddle.y,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      speed: BULLET_SPEED,
    };

    setBullets(prev => [...prev, leftBullet, rightBullet]);
    
    // Decrement turret shots and remove turrets if depleted
    setPaddle(prev => {
      if (!prev) return null;
      const newShots = (prev.turretShots || 0) - 1;
      if (newShots <= 0) {
        toast.info("Turrets depleted!");
        return { ...prev, hasTurrets: false, turretShots: 0 };
      }
      return { ...prev, turretShots: newShots };
    });
  }, [setPaddle]);

  const updateBullets = useCallback((currentBricks: Brick[]) => {
    // Move bullets and collect collision information
    setBullets(prev => {
      const movedBullets = prev
        .map(b => ({ 
          ...b, 
          y: b.isBounced ? b.y + b.speed : b.y - b.speed 
        }))
        .filter(b => b.y > 0 && b.y < CANVAS_HEIGHT);
      
      const bulletIndicesHit = new Set<number>();
      const bulletIndicesToBounce = new Set<number>();
      const brickIndicesToDestroy = new Set<number>();
      
      // Check enemy collisions first (only for bullets going up)
      movedBullets.forEach((bullet, bulletIdx) => {
        if (bulletIndicesHit.has(bulletIdx) || bullet.isBounced) return;
        
        enemies.forEach((enemy) => {
          if (
            bulletIndicesHit.has(bulletIdx) ||
            bullet.x + bullet.width <= enemy.x ||
            bullet.x >= enemy.x + enemy.width ||
            bullet.y >= enemy.y + enemy.height ||
            bullet.y + bullet.height <= enemy.y
          ) {
            return;
          }
          
          // Collision with enemy - bounce bullet back
          bulletIndicesToBounce.add(bulletIdx);
          soundManager.playBounce();
        });
      });
      
      // Check brick collisions (only for bullets going up)
      movedBullets.forEach((bullet, bulletIdx) => {
        if (bulletIndicesHit.has(bulletIdx) || bulletIndicesToBounce.has(bulletIdx) || bullet.isBounced) return;
        
        currentBricks.forEach((brick, brickIdx) => {
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
            return;
          }
          
          // Collision detected
          if (brick.isIndestructible) {
            // Metal brick: remove bullet but don't damage brick
            bulletIndicesHit.add(bulletIdx);
            soundManager.playBounce(); // Metallic ricochet sound
          } else {
            // Normal brick: remove bullet and damage brick
            bulletIndicesHit.add(bulletIdx);
            brickIndicesToDestroy.add(brickIdx);
          }
        });
      });
      
      // Update bricks if any collisions occurred
      if (brickIndicesToDestroy.size > 0) {
        setBricks(prevBricks => 
          prevBricks.map((brick, idx) => {
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
          })
        );
      }
      
      // Return bullets: bounce the ones that hit enemies, remove ones that hit bricks
      return movedBullets
        .filter((_, idx) => !bulletIndicesHit.has(idx))
        .map((bullet, idx) => {
          if (bulletIndicesToBounce.has(idx)) {
            return { ...bullet, isBounced: true };
          }
          return bullet;
        });
    });
  }, [setBricks, setScore, enemies]);

  return {
    bullets,
    setBullets,
    fireBullets,
    updateBullets,
  };
};
