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
    const bulletsToRemove = new Set<number>();
    
    // Move bullets and check collisions in one pass
    setBullets(prev => {
      const movedBullets = prev
        .map((b, idx) => ({ ...b, y: b.y - b.speed, idx }))
        .filter(b => b.y > 0);

      // Check collisions for each bullet
      movedBullets.forEach((bullet) => {
        if (bulletsToRemove.has(bullet.idx)) return;
        
        setBricks(prevBricks => {
          let brickWasHit = false;
          
          return prevBricks.map(brick => {
            if (
              !brickWasHit &&
              brick.visible &&
              bullet.x + bullet.width > brick.x &&
              bullet.x < brick.x + brick.width &&
              bullet.y < brick.y + brick.height &&
              bullet.y + bullet.height > brick.y
            ) {
              brickWasHit = true;
              bulletsToRemove.add(bullet.idx);
              soundManager.playBrickHit();
              setScore(prev => prev + brick.points);
              return { ...brick, visible: false };
            }
            return brick;
          });
        });
      });

      // Return only bullets that didn't hit anything
      return movedBullets.filter(b => !bulletsToRemove.has(b.idx)).map(({ idx, ...bullet }) => bullet);
    });
  }, [setBricks, setScore]);

  return {
    bullets,
    setBullets,
    fireBullets,
    updateBullets,
  };
};
