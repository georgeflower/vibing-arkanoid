import { useState, useCallback } from "react";
import type { Bullet, Paddle, Brick } from "@/types/game";
import { BULLET_WIDTH, BULLET_HEIGHT, BULLET_SPEED, CANVAS_HEIGHT } from "@/constants/game";
import { soundManager } from "@/utils/sounds";

export const useBullets = (
  setScore: React.Dispatch<React.SetStateAction<number>>,
  setBricks: React.Dispatch<React.SetStateAction<Brick[]>>
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

  const updateBullets = useCallback(() => {
    // Move bullets
    setBullets(prev => prev
      .map(b => ({ ...b, y: b.y - b.speed }))
      .filter(b => b.y > 0)
    );

    // Check collisions - do this after movement is complete
    setBullets(prevBullets => {
      const bulletIndicesHit = new Set<number>();
      const brickIndicesToDestroy = new Set<number>();
      
      // First pass: find all collisions
      setBricks(prevBricks => {
        prevBullets.forEach((bullet, bulletIdx) => {
          if (bulletIndicesHit.has(bulletIdx)) return;
          
          prevBricks.forEach((brick, brickIdx) => {
            if (
              bulletIndicesHit.has(bulletIdx) || // bullet already hit something
              brickIndicesToDestroy.has(brickIdx) || // brick already being destroyed
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
            soundManager.playBrickHit();
            setScore(prev => prev + brick.points);
          });
        });
        
        // Update bricks
        return prevBricks.map((brick, idx) => 
          brickIndicesToDestroy.has(idx) ? { ...brick, visible: false } : brick
        );
      });
      
      // Return bullets that didn't hit anything
      return prevBullets.filter((_, idx) => !bulletIndicesHit.has(idx));
    });
  }, [setBricks, setScore]);

  return {
    bullets,
    setBullets,
    fireBullets,
    updateBullets,
  };
};
