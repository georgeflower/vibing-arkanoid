import { useState, useCallback, useRef } from "react";
import type { PowerUp, PowerUpType, Ball, Paddle, Brick, Difficulty } from "@/types/game";
import { POWERUP_SIZE, POWERUP_FALL_SPEED, POWERUP_DROP_CHANCE, CANVAS_HEIGHT, FIREBALL_DURATION } from "@/constants/game";
import { toast } from "sonner";
import { soundManager } from "@/utils/sounds";

const regularPowerUpTypes: PowerUpType[] = ["multiball", "turrets", "fireball", "life", "slowdown", "paddleExtend", "paddleShrink", "shield", "secondChance"];
const bossPowerUpTypes: PowerUpType[] = ["bossStunner", "reflectShield", "homingBall"];

export const usePowerUps = (
  currentLevel: number,
  setLives: React.Dispatch<React.SetStateAction<number>>,
  timer: number = 0,
  difficulty: Difficulty = "normal",
  setBrickHitSpeedAccumulated?: React.Dispatch<React.SetStateAction<number>>,
  onPowerUpCollected?: (type: string) => void,
  powerUpAssignments?: Map<number, PowerUpType>, // Pre-assigned power-ups
  onBossStunner?: () => void,
  onReflectShield?: () => void,
  onHomingBall?: () => void,
  onFireballStart?: () => void,
  onFireballEnd?: () => void,
  onSecondChance?: () => void,
) => {
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [extraLifeUsedLevels, setExtraLifeUsedLevels] = useState<number[]>([]);
  const fireballTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createPowerUp = useCallback((brick: Brick, isBossMinion: boolean = false, forceBossPowerUp: boolean = false): PowerUp | null => {
    const isEnemyDrop = brick.id < 0; // Enemies use fakeBricks with id: -1
    
    // Boss minions: 50% chance to drop power-up (or forced drop)
    if (isBossMinion && (forceBossPowerUp || Math.random() < 0.5)) {
      const isBossLevel = [5, 10, 15].includes(currentLevel);
      
      // Force boss-exclusive power-up if requested, otherwise 50% chance on boss levels
      const useBossPowerUp = forceBossPowerUp || (isBossLevel && Math.random() < 0.5);
      
      let availableTypes: PowerUpType[];
      
      if (useBossPowerUp) {
        availableTypes = [...bossPowerUpTypes];
      } else {
        availableTypes = [...regularPowerUpTypes];
        
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
    }
    
    // Regular enemy drops (non-boss minions) - every 3rd kill triggers this
    if (isEnemyDrop) {
      let availableTypes = [...regularPowerUpTypes];
      
      if (difficulty === "godlike") {
        availableTypes = availableTypes.filter(t => t !== "life");
      } else {
        const levelGroup = Math.floor(currentLevel / 5);
        if (extraLifeUsedLevels.includes(levelGroup)) {
          availableTypes = availableTypes.filter(t => t !== "life");
        }
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
    }
    
    // Regular bricks: use pre-assigned power-ups
    if (!powerUpAssignments) return null;
    
    const assignedType = powerUpAssignments.get(brick.id);
    if (!assignedType) return null;

    return {
      x: brick.x + brick.width / 2 - POWERUP_SIZE / 2,
      y: brick.y,
      width: POWERUP_SIZE,
      height: POWERUP_SIZE,
      type: assignedType,
      speed: POWERUP_FALL_SPEED,
      active: true,
    };
  }, [currentLevel, extraLifeUsedLevels, difficulty, powerUpAssignments]);

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
          onPowerUpCollected?.(powerUp.type);
          
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
              const shotsCount = difficulty === "godlike" ? 15 : 30;
              const maxShots = 45;
              setPaddle(prev => {
                if (!prev) return null;
                if (prev.hasTurrets && (prev.turretShots || 0) > 0) {
                  // Already have turrets - upgrade to super + add shots (capped at max)
                  const newShots = Math.min((prev.turretShots || 0) + shotsCount, maxShots);
                  toast.success(`Super Turrets! (${newShots} shots)`);
                  return { ...prev, turretShots: newShots, hasSuperTurrets: true };
                }
                // First turret pickup
                toast.success(`Turrets activated! (${shotsCount} shots)`);
                return { ...prev, hasTurrets: true, turretShots: shotsCount, hasSuperTurrets: false };
              });
              break;
            
            case "fireball":
              soundManager.playFireballSound();
              setBalls(prev => prev.map(ball => ({ ...ball, isFireball: true })));
              // Clear existing timeout if fireball is already active
              if (fireballTimeoutRef.current) {
                clearTimeout(fireballTimeoutRef.current);
              }
              // Notify start for timer display
              onFireballStart?.();
              // Set new timeout and store reference
              fireballTimeoutRef.current = setTimeout(() => {
                setBalls(prev => prev.map(ball => ({ ...ball, isFireball: false })));
                fireballTimeoutRef.current = null;
                onFireballEnd?.();
              }, FIREBALL_DURATION);
              toast.success("Fireball activated!");
              break;
            
            case "life":
              const levelGroup = Math.floor(currentLevel / 5);
              // Safeguard: check again (should be marked on creation, but double-check)
              if (!extraLifeUsedLevels.includes(levelGroup)) {
                soundManager.playExtraLifeSound();
                setLives(prev => prev + 1);
                setExtraLifeUsedLevels(prev => [...prev, levelGroup]);
                toast.success("Extra life!");
              } else {
                console.warn("[Power-Up] Extra life collected but already used for this level group");
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
            
            case "bossStunner":
              soundManager.playBossStunnerSound();
              onBossStunner?.();
              toast.success("Boss Stunner! Boss frozen for 5 seconds!");
              break;

            case "reflectShield":
              soundManager.playReflectShieldSound();
              onReflectShield?.();
              toast.success("Reflect Shield! Boss attacks reflected for 15 seconds!");
              break;

            case "homingBall":
              soundManager.playHomingBallSound();
              onHomingBall?.();
              toast.success("Homing Ball! Ball seeks the boss for 8 seconds!");
              break;

            case "secondChance":
              soundManager.playSecondChanceSound();
              setPaddle(prev => prev ? { ...prev, hasSecondChance: true } : null);
              onSecondChance?.();
              toast.success("Second Chance! Safety net activated!");
              break;

          }

          return { ...powerUp, active: false };
        }
        return powerUp;
      });
    });
  }, [currentLevel, extraLifeUsedLevels, setLives, onBossStunner, onReflectShield, onHomingBall, onSecondChance]);

  return {
    powerUps,
    setPowerUps,
    createPowerUp,
    updatePowerUps,
    checkPowerUpCollision,
    extraLifeUsedLevels, // Export for power-up assignment system
  };
};
