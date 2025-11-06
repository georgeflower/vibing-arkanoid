import { useState, useCallback, useRef } from "react";
import type { PowerUp, PowerUpType, Ball, Paddle, Brick, Difficulty } from "@/types/game";
import { POWERUP_SIZE, POWERUP_FALL_SPEED, POWERUP_DROP_CHANCE, CANVAS_HEIGHT, FIREBALL_DURATION } from "@/constants/game";
import { toast } from "sonner";
import { soundManager } from "@/utils/sounds";

const powerUpTypes: PowerUpType[] = ["multiball", "turrets", "fireball", "life", "slowdown", "paddleExtend", "paddleShrink", "shield"];

export const usePowerUps = (
  currentLevel: number,
  setLives: React.Dispatch<React.SetStateAction<number>>,
  timer: number = 0,
  difficulty: Difficulty = "normal",
  setBrickHitSpeedAccumulated?: React.Dispatch<React.SetStateAction<number>>
) => {
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [extraLifeUsedLevels, setExtraLifeUsedLevels] = useState<number[]>([]);
  const fireballTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createPowerUp = useCallback((brick: Brick): PowerUp | null => {
    // Increase drop chance by 5% every 30 seconds
    const timeBonus = Math.floor(timer / 30) * 0.05;
    const adjustedDropChance = Math.min(0.5, POWERUP_DROP_CHANCE + timeBonus); // Cap at 50%
    
    // 50% chance to drop turrets at 90+ seconds
    if (timer >= 90 && Math.random() < 0.5) {
      return {
        x: brick.x + brick.width / 2 - POWERUP_SIZE / 2,
        y: brick.y,
        width: POWERUP_SIZE,
        height: POWERUP_SIZE,
        type: "turrets",
        speed: POWERUP_FALL_SPEED,
        active: true,
      };
    }
    
    if (Math.random() > adjustedDropChance) return null;

    let availableTypes = [...powerUpTypes];
    
    // In godlike mode, never drop extra lives
    if (difficulty === "godlike") {
      availableTypes = availableTypes.filter(t => t !== "life");
    } else {
      // Extra life only once per 5 levels in normal mode
      const levelGroup = Math.floor(currentLevel / 5);
      if (extraLifeUsedLevels.includes(levelGroup)) {
        availableTypes = availableTypes.filter(t => t !== "life");
      }
    }

    // Make shield less common (weight it lower)
    const weightedTypes: PowerUpType[] = [];
    availableTypes.forEach(type => {
      if (type === "shield") {
        weightedTypes.push(type); // Add shield once
      } else {
        weightedTypes.push(type, type); // Add others twice
      }
    });

    const type = weightedTypes[Math.floor(Math.random() * weightedTypes.length)];

    return {
      x: brick.x + brick.width / 2 - POWERUP_SIZE / 2,
      y: brick.y,
      width: POWERUP_SIZE,
      height: POWERUP_SIZE,
      type,
      speed: POWERUP_FALL_SPEED,
      active: true,
    };
  }, [currentLevel, extraLifeUsedLevels, timer, difficulty]);

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
          
          switch (powerUp.type) {
            case "multiball":
              soundManager.playMultiballSound();
              if (balls.length > 0) {
                const baseBall = balls[0];
                const newBalls: Ball[] = [
                  { ...baseBall, id: Date.now() + 1, dx: baseBall.dx - 2, rotation: Math.random() * 360 },
                  { ...baseBall, id: Date.now() + 2, dx: baseBall.dx + 2, rotation: Math.random() * 360 },
                ];
                setBalls(prev => [...prev, ...newBalls]);
                toast.success("Multi-ball activated!");
              }
              break;
            
            case "turrets":
              soundManager.playTurretsSound();
              setPaddle(prev => prev ? { ...prev, hasTurrets: true } : null);
              toast.success("Turrets activated!");
              break;
            
            case "fireball":
              soundManager.playFireballSound();
              setBalls(prev => prev.map(ball => ({ ...ball, isFireball: true })));
              // Clear existing timeout if fireball is already active
              if (fireballTimeoutRef.current) {
                clearTimeout(fireballTimeoutRef.current);
              }
              // Set new timeout and store reference
              fireballTimeoutRef.current = setTimeout(() => {
                setBalls(prev => prev.map(ball => ({ ...ball, isFireball: false })));
                fireballTimeoutRef.current = null;
              }, FIREBALL_DURATION);
              toast.success("Fireball activated!");
              break;
            
            case "life":
              const levelGroup = Math.floor(currentLevel / 5);
              if (!extraLifeUsedLevels.includes(levelGroup)) {
                soundManager.playExtraLifeSound();
                setLives(prev => prev + 1);
                setExtraLifeUsedLevels(prev => [...prev, levelGroup]);
                toast.success("Extra life!");
              }
              break;
            
            case "slowdown":
              soundManager.playSlowerSound();
              setSpeedMultiplier(prev => {
                const newSpeed = Math.max(0.9, prev - 0.1);
                // Apply speed change to balls immediately
                setBalls(prevBalls => prevBalls.map(ball => {
                  const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                  const newBallSpeed = currentSpeed * (newSpeed / prev);
                  const angle = Math.atan2(ball.dx, -ball.dy);
                  return {
                    ...ball,
                    speed: newBallSpeed,
                    dx: newBallSpeed * Math.sin(angle),
                    dy: -newBallSpeed * Math.cos(angle),
                  };
                }));
                return newSpeed;
              });
              // Reset accumulated brick hit speed on slowdown
              if (setBrickHitSpeedAccumulated) {
                setBrickHitSpeedAccumulated(0);
              }
              toast.success("Speed reduced by 10%!");
              break;
            
            case "paddleExtend":
              soundManager.playWiderSound();
              setPaddle(prev => prev ? { ...prev, width: Math.min(200, prev.width + 30) } : null);
              toast.success("Paddle extended!");
              break;
            
            case "paddleShrink":
              soundManager.playShrinkSound();
              setPaddle(prev => prev ? { ...prev, width: Math.max(60, prev.width - 30) } : null);
              toast.success("Paddle shrunk!");
              break;
            
            case "shield":
              soundManager.playShieldSound();
              setPaddle(prev => prev ? { ...prev, hasShield: true } : null);
              toast.success("Shield activated!");
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
