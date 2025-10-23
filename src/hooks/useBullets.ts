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
    // First move bullets up
    setBullets(prev => 
      prev
        .map(b => ({ ...b, y: b.y - b.speed }))
        .filter(b => b.y > 0)
    );

    // Then check collisions in a separate update
    setBullets(prevBullets => {
      const bulletsToKeep: Bullet[] = [];
      
      prevBullets.forEach((bullet) => {
        let bulletHit = false;
        
        setBricks(prevBricks => {
          return prevBricks.map(brick => {
            if (
              !bulletHit &&
              brick.visible &&
              bullet.x + bullet.width > brick.x &&
              bullet.x < brick.x + brick.width &&
              bullet.y < brick.y + brick.height &&
              bullet.y + bullet.height > brick.y
            ) {
              bulletHit = true;
              soundManager.playBrickHit();
              setScore(prev => prev + brick.points);
              return { ...brick, visible: false };
            }
            return brick;
          });
        });

        // Only keep bullet if it didn't hit anything
        if (!bulletHit) {
          bulletsToKeep.push(bullet);
        }
      });

      return bulletsToKeep;
    });
  }, [setBricks, setScore]);

  return {
    bullets,
    setBullets,
    fireBullets,
    updateBullets,
  };
};
