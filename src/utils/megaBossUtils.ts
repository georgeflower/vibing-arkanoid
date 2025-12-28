// Mega Boss creation and management utilities
import type { Boss, Ball } from "@/types/game";
import { MEGA_BOSS_CONFIG, MEGA_BOSS_POSITIONS, MEGA_BOSS_LEVEL } from "@/constants/megaBossConfig";

// Extended MegaBoss interface (used internally, extends Boss)
export interface MegaBoss extends Boss {
  isMegaBoss: true;
  hatchOpen: boolean;
  hatchOpenStartTime: number | null;
  trappedBall: Ball | null;
  scheduledDangerBalls: number[]; // Timestamps for scheduled danger ball spawns
  dangerBallsFired: number;
  hasResurrected: boolean;
  lastTrapTime: number; // Last time a ball was trapped (for cooldown)
  isInvulnerable: boolean;
  invulnerableUntil: number;
}

// Monotonic ID counter for mega boss
let nextMegaBossId = 2000;

export function createMegaBoss(canvasWidth: number, canvasHeight: number): MegaBoss {
  const config = MEGA_BOSS_CONFIG;
  
  const positions = MEGA_BOSS_POSITIONS.map(pos => ({
    x: pos.x * canvasWidth - config.size / 2,
    y: pos.y * canvasHeight - config.size / 2
  }));
  
  return {
    id: nextMegaBossId++,
    type: 'cube', // Visual type - we'll render it differently
    x: positions[0].x,
    y: positions[0].y,
    width: config.size,
    height: config.size,
    rotation: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    speed: config.moveSpeed,
    dx: 0,
    dy: 0,
    maxHealth: config.healthPhase1,
    currentHealth: config.healthPhase1,
    phase: 'moving',
    currentStage: 1,
    isAngry: false,
    isSuperAngry: false,
    targetPosition: positions[1],
    currentPositionIndex: 0,
    positions: positions,
    waitTimeAtPosition: 0,
    attackCooldown: config.attackInterval,
    lastAttackTime: Date.now(),
    isCharging: false,
    lastHitAt: 0,
    
    // MegaBoss specific
    isMegaBoss: true,
    hatchOpen: false,
    hatchOpenStartTime: null,
    trappedBall: null,
    scheduledDangerBalls: [],
    dangerBallsFired: 0,
    hasResurrected: false,
    lastTrapTime: 0,
    isInvulnerable: false,
    invulnerableUntil: 0
  };
}

export function isMegaBoss(boss: Boss | null): boss is MegaBoss {
  return boss !== null && 'isMegaBoss' in boss && (boss as MegaBoss).isMegaBoss === true;
}

export function handleMegaBossDamage(boss: MegaBoss, damage: number): {
  newHealth: number;
  shouldResurrect: boolean;
  isDefeated: boolean;
} {
  // Check invulnerability
  if (boss.isInvulnerable && Date.now() < boss.invulnerableUntil) {
    return { newHealth: boss.currentHealth, shouldResurrect: false, isDefeated: false };
  }
  
  const newHealth = boss.currentHealth - damage;
  
  if (newHealth <= 0) {
    if (!boss.hasResurrected) {
      // First death - trigger resurrection
      return { newHealth: 0, shouldResurrect: true, isDefeated: false };
    } else {
      // Second death - truly defeated
      return { newHealth: 0, shouldResurrect: false, isDefeated: true };
    }
  }
  
  return { newHealth, shouldResurrect: false, isDefeated: false };
}

export function triggerMegaBossResurrection(boss: MegaBoss): MegaBoss {
  const config = MEGA_BOSS_CONFIG;
  const now = Date.now();
  
  return {
    ...boss,
    currentHealth: config.healthPhase2,
    maxHealth: config.healthPhase2,
    hasResurrected: true,
    isAngry: true,
    isSuperAngry: true,
    speed: config.angryMoveSpeed,
    isInvulnerable: true,
    invulnerableUntil: now + config.resurrectionInvulnDuration,
    phase: 'moving',
    hatchOpen: false,
    trappedBall: null,
    scheduledDangerBalls: [],
    dangerBallsFired: 0
  };
}

export function openMegaBossHatch(boss: MegaBoss): MegaBoss {
  return {
    ...boss,
    hatchOpen: true,
    hatchOpenStartTime: Date.now()
  };
}

export function closeMegaBossHatch(boss: MegaBoss): MegaBoss {
  return {
    ...boss,
    hatchOpen: false,
    hatchOpenStartTime: null
  };
}

export function trapBallInMegaBoss(boss: MegaBoss, ball: Ball): MegaBoss {
  const config = MEGA_BOSS_CONFIG;
  const now = Date.now();
  
  // Schedule 3 danger ball spawns with random intervals
  const scheduledDangerBalls: number[] = [];
  let nextTime = now;
  
  for (let i = 0; i < config.dangerBallCount; i++) {
    const interval = config.dangerBallIntervalMin + 
      Math.random() * (config.dangerBallIntervalMax - config.dangerBallIntervalMin);
    nextTime += interval;
    scheduledDangerBalls.push(nextTime);
  }
  
  return {
    ...boss,
    trappedBall: { ...ball, isTrapped: true } as Ball & { isTrapped: boolean },
    scheduledDangerBalls,
    dangerBallsFired: 0,
    lastTrapTime: now
  };
}

export function releaseBallFromMegaBoss(boss: MegaBoss): { boss: MegaBoss; releasedBall: Ball | null } {
  if (!boss.trappedBall) {
    return { boss, releasedBall: null };
  }
  
  const releasedBall: Ball = {
    ...boss.trappedBall,
    x: boss.x + boss.width / 2,
    y: boss.y + boss.height + 10, // Eject below the boss
    dx: 0,
    dy: 4, // Eject downward with some speed
    waitingToLaunch: false
  };
  
  return {
    boss: {
      ...boss,
      trappedBall: null,
      hatchOpen: false,
      scheduledDangerBalls: [],
      dangerBallsFired: 0
    },
    releasedBall
  };
}

export function getMegaBossPhase(boss: MegaBoss): 1 | 2 | 3 {
  const config = MEGA_BOSS_CONFIG;
  
  if (boss.hasResurrected) {
    return 3; // Resurrected = phase 3
  }
  
  if (boss.currentHealth <= 6) {
    return 2; // Low health = phase 2
  }
  
  return 1; // Full health = phase 1
}

export function shouldOpenHatch(boss: MegaBoss): boolean {
  const config = MEGA_BOSS_CONFIG;
  const now = Date.now();
  
  // Don't open if already open or ball is trapped
  if (boss.hatchOpen || boss.trappedBall) return false;
  
  // Check cooldown
  if (now - boss.lastTrapTime < config.hatchCooldown) return false;
  
  // Only open in phase 2+
  if (getMegaBossPhase(boss) < 2) return false;
  
  // Random chance to open (checked externally during attack phase)
  return Math.random() < 0.3;
}

// Check if ball enters hatch area
export function isBallInHatchArea(ball: Ball, boss: MegaBoss): boolean {
  if (!boss.hatchOpen) return false;
  
  // Hatch is at bottom center of boss
  const hatchX = boss.x + boss.width / 2;
  const hatchY = boss.y + boss.height;
  const hatchWidth = 40;
  const hatchHeight = 20;
  
  return (
    ball.x > hatchX - hatchWidth / 2 &&
    ball.x < hatchX + hatchWidth / 2 &&
    ball.y > hatchY - hatchHeight &&
    ball.y < hatchY + hatchHeight
  );
}
