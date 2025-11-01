import { useState, useCallback } from "react";
import type { Bullet, Paddle, Brick } from "@/types/game";
import { BULLET_WIDTH, BULLET_HEIGHT, BULLET_SPEED, CANVAS_HEIGHT } from "@/constants/game";
import { soundManager } from "@/utils/sounds";
import { getHitColor } from "@/constants/game";

export const useBullets = (
  setScore: React.Dispatch<React.SetStateAction<number>>,
  setBricks: React.Dispatch<React.SetStateAction<Brick[]>>,
  bricks: Brick[]
) => {
  const [bullets, setBullets] = useState<Bullet[]>([]);

  const fireBullets = useCallback((paddle: Paddle) => {
    if (!paddle.hasTurrets) return;

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
  }, []);

  const updateBullets = useCallback((currentBricks: Brick[]) => {
    // Move bullets and collect collision information
    setBullets(prev => {
      const movedBullets = prev
        .map(b => ({ ...b, y: b.y - b.speed }))
        .filter(b => b.y > 0);
      
      const bulletIndicesHit = new Set<number>();
      const brickIndicesToDestroy = new Set<number>();
      
      // Check all collisions
      movedBullets.forEach((bullet, bulletIdx) => {
        if (bulletIndicesHit.has(bulletIdx)) return;
        
        currentBricks.forEach((brick, brickIdx) => {
          if (
            bulletIndicesHit.has(bulletIdx) ||
            brickIndicesToDestroy.has(brickIdx) ||
            !brick.visible ||
            bullet.x + bullet.width <= brick.x ||
            bullet.x >= brick.x + brick.width ||
            bullet.y >= brick.y + brick.height ||
            bullet.y + bullet.height <= brick.y
          ) {
            return;
          }
          
          // Collision detected
          bulletIndicesHit.add(bulletIdx);
          brickIndicesToDestroy.add(brickIdx);
        });
      });
      
      // Update bricks if any collisions occurred
      if (brickIndicesToDestroy.size > 0) {
        setBricks(prevBricks => 
          prevBricks.map((brick, idx) => {
            if (brickIndicesToDestroy.has(idx)) {
              soundManager.playBrickHit();
              const updatedBrick = { ...brick, hitsRemaining: brick.hitsRemaining - 1 };
              
              // Update brick color or make invisible
              if (updatedBrick.hitsRemaining > 0) {
                updatedBrick.color = getHitColor(brick.color, updatedBrick.hitsRemaining, brick.maxHits);
              } else {
                updatedBrick.visible = false;
                setScore(prev => prev + brick.points);
              }
              
              return updatedBrick;
            }
            return brick;
          })
        );
      }
      
      // Return bullets that didn't hit anything
      return movedBullets.filter((_, idx) => !bulletIndicesHit.has(idx));
    });
  }, [setBricks, setScore]);

  return {
    bullets,
    setBullets,
    fireBullets,
    updateBullets,
  };
};
