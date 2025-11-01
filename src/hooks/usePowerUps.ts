import { useState, useCallback } from "react";
import type { PowerUp, PowerUpType, Ball, Paddle, Brick } from "@/types/game";
import { POWERUP_SIZE, POWERUP_FALL_SPEED, POWERUP_DROP_CHANCE, CANVAS_HEIGHT, FIREBALL_DURATION } from "@/constants/game";
import { toast } from "sonner";
import { soundManager } from "@/utils/sounds";

const powerUpTypes: PowerUpType[] = ["multiball", "turrets", "fireball", "life", "slowdown", "paddleExtend", "paddleShrink"];

export const usePowerUps = (
  currentLevel: number,
  setLives: React.Dispatch<React.SetStateAction<number>>
) => {
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [extraLifeUsedLevels, setExtraLifeUsedLevels] = useState<number[]>([]);

  const createPowerUp = useCallback((brick: Brick): PowerUp | null => {
    if (Math.random() > POWERUP_DROP_CHANCE) return null;

    let availableTypes = [...powerUpTypes];
    
    // Extra life only once per 5 levels
    const levelGroup = Math.floor(currentLevel / 5);
    if (extraLifeUsedLevels.includes(levelGroup)) {
      availableTypes = availableTypes.filter(t => t !== "life");
    }

    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];

    return {
      x: brick.x + brick.width / 2 - POWERUP_SIZE / 2,
      y: brick.y,
      width: POWERUP_SIZE,
      height: POWERUP_SIZE,
      type,
      speed: POWERUP_FALL_SPEED,
      active: true,
    };
  }, [currentLevel, extraLifeUsedLevels]);

  const updatePowerUps = useCallback(() => {
    setPowerUps(prev => 
      prev
        .map(p => ({ ...p, y: p.y + p.speed }))
        .filter(p => p.y < CANVAS_HEIGHT && p.active)
    );
  }, []);

  const checkPowerUpCollision = useCallback((
    paddle: Paddle,
    balls: Ball[],
    setBalls: React.Dispatch<React.SetStateAction<Ball[]>>,
    setPaddle: React.Dispatch<React.SetStateAction<Paddle | null>>,
    setSpeedMultiplier: React.Dispatch<React.SetStateAction<number>>
  ) => {
    setPowerUps(prev => {
      return prev.map(powerUp => {
        if (
          powerUp.active &&
          powerUp.x + powerUp.width > paddle.x &&
          powerUp.x < paddle.x + paddle.width &&
          powerUp.y + powerUp.height > paddle.y &&
          powerUp.y < paddle.y + paddle.height
        ) {
          // Apply power-up effect
          soundManager.playPowerUp();
          
          switch (powerUp.type) {
            case "multiball":
              if (balls.length > 0) {
                const baseBall = balls[0];
                const newBalls: Ball[] = [
                  { ...baseBall, id: Date.now() + 1, dx: baseBall.dx - 2 },
                  { ...baseBall, id: Date.now() + 2, dx: baseBall.dx + 2 },
                ];
                setBalls(prev => [...prev, ...newBalls]);
                toast.success("Multi-ball activated!");
              }
              break;
            
            case "turrets":
              setPaddle(prev => prev ? { ...prev, hasTurrets: true } : null);
              toast.success("Turrets activated!");
              break;
            
            case "fireball":
              setBalls(prev => prev.map(ball => ({ ...ball, isFireball: true })));
              setTimeout(() => {
                setBalls(prev => prev.map(ball => ({ ...ball, isFireball: false })));
              }, FIREBALL_DURATION);
              toast.success("Fireball activated!");
              break;
            
            case "life":
              const levelGroup = Math.floor(currentLevel / 5);
              if (!extraLifeUsedLevels.includes(levelGroup)) {
                setLives(prev => prev + 1);
                setExtraLifeUsedLevels(prev => [...prev, levelGroup]);
                toast.success("Extra life!");
              }
              break;
            
            case "slowdown":
              setSpeedMultiplier(prev => Math.max(0.5, prev - 0.1));
              toast.success("Speed reduced by 10%!");
              break;
            
            case "paddleExtend":
              setPaddle(prev => prev ? { ...prev, width: Math.min(200, prev.width + 30) } : null);
              toast.success("Paddle extended!");
              break;
            
            case "paddleShrink":
              setPaddle(prev => prev ? { ...prev, width: Math.max(60, prev.width - 30) } : null);
              toast.success("Paddle shrunk!");
              break;
          }

          return { ...powerUp, active: false };
        }
        return powerUp;
      });
    });
  }, [currentLevel, extraLifeUsedLevels, setLives]);

  return {
    powerUps,
    setPowerUps,
    createPowerUp,
    updatePowerUps,
    checkPowerUpCollision,
  };
};
