// Mega Boss creation and management utilities
import type { Boss, Ball } from "@/types/game";
import { MEGA_BOSS_CONFIG, MEGA_BOSS_POSITIONS, MEGA_BOSS_LEVEL } from "@/constants/megaBossConfig";

// Phase represents the current stage of the boss fight
export type MegaBossCorePhase = 1 | 2 | 3;

// Extended MegaBoss interface (used internally, extends Boss)
export interface MegaBoss extends Boss {
  isMegaBoss: true;
  
  // Core phase tracking (1 = normal, 2 = angry, 3 = very angry)
  corePhase: MegaBossCorePhase;
  
  // Outer shield HP (depletes to 0, then core is exposed)
  outerShieldHP: number;
  outerShieldMaxHP: number;
  
  // Core state
  coreExposed: boolean;
  coreExposedTime: number | null;
  coreHit: boolean; // Ball has hit the core this phase
  
  // Trapped ball state
  trappedBall: Ball | null;
  cannonExtended: boolean;
  cannonExtendedTime: number | null;
  
  // Danger ball tracking
  dangerBallsCaught: number;
  dangerBallsFired: number;
  scheduledDangerBalls: number[]; // Timestamps for scheduled danger ball spawns
  
  // Legacy compatibility
  hatchOpen: boolean;
  hatchOpenStartTime: number | null;
  lastTrapTime: number;
  hasResurrected: boolean; // For visual indicator only
  isInvulnerable: boolean;
  invulnerableUntil: number;
  
  // Swarm tracking (phase 3)
  lastSwarmSpawnTime: number;
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
    maxHealth: config.outerShieldHP,
    currentHealth: config.outerShieldHP,
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
    corePhase: 1,
    outerShieldHP: config.outerShieldHP,
    outerShieldMaxHP: config.outerShieldHP,
    coreExposed: false,
    coreExposedTime: null,
    coreHit: false,
    trappedBall: null,
    cannonExtended: false,
    cannonExtendedTime: null,
    dangerBallsCaught: 0,
    dangerBallsFired: 0,
    scheduledDangerBalls: [],
    hatchOpen: false,
    hatchOpenStartTime: null,
    lastTrapTime: 0,
    hasResurrected: false,
    isInvulnerable: false,
    invulnerableUntil: 0,
    lastSwarmSpawnTime: 0
  };
}

export function isMegaBoss(boss: Boss | null): boss is MegaBoss {
  return boss !== null && 'isMegaBoss' in boss && (boss as MegaBoss).isMegaBoss === true;
}

// Handle damage to outer shield - returns new state info
export function handleMegaBossOuterDamage(boss: MegaBoss, damage: number): {
  newOuterHP: number;
  shouldExposeCore: boolean;
} {
  // Check invulnerability
  if (boss.isInvulnerable && Date.now() < boss.invulnerableUntil) {
    return { newOuterHP: boss.outerShieldHP, shouldExposeCore: false };
  }
  
  // Don't damage if core is already exposed
  if (boss.coreExposed) {
    return { newOuterHP: boss.outerShieldHP, shouldExposeCore: false };
  }
  
  const newOuterHP = Math.max(0, boss.outerShieldHP - damage);
  const shouldExposeCore = newOuterHP <= 0;
  
  return { newOuterHP, shouldExposeCore };
}

// Expose the core (hatch opens)
export function exposeMegaBossCore(boss: MegaBoss): MegaBoss {
  const now = Date.now();
  return {
    ...boss,
    coreExposed: true,
    coreExposedTime: now,
    hatchOpen: true,
    hatchOpenStartTime: now
  };
}

// Handle core hit (ball enters and hits the core)
export function handleMegaBossCoreHit(boss: MegaBoss, ball: Ball): MegaBoss {
  const config = MEGA_BOSS_CONFIG;
  const now = Date.now();
  
  // Schedule danger ball spawns
  const scheduledDangerBalls: number[] = [];
  let nextTime = now + 1000; // First one after 1 second
  
  for (let i = 0; i < config.dangerBallCount; i++) {
    const interval = config.dangerBallIntervalMin + 
      Math.random() * (config.dangerBallIntervalMax - config.dangerBallIntervalMin);
    nextTime += interval;
    scheduledDangerBalls.push(nextTime);
  }
  
  return {
    ...boss,
    coreHit: true,
    trappedBall: { ...ball } as Ball,
    cannonExtended: true,
    cannonExtendedTime: now,
    scheduledDangerBalls,
    dangerBallsFired: 0,
    dangerBallsCaught: 0,
    hatchOpen: false, // Close hatch after ball trapped
    coreExposed: false, // Core no longer exposed
    lastTrapTime: now
  };
}

// Increment danger balls caught
export function catchDangerBall(boss: MegaBoss): MegaBoss {
  return {
    ...boss,
    dangerBallsCaught: boss.dangerBallsCaught + 1
  };
}

// Check if all danger balls have been caught and player ball should be released
export function shouldReleaseBall(boss: MegaBoss): boolean {
  const config = MEGA_BOSS_CONFIG;
  return (
    boss.trappedBall !== null &&
    boss.dangerBallsCaught >= config.dangerBallsToComplete &&
    boss.scheduledDangerBalls.length === 0
  );
}

// Release trapped ball and transition to next phase
export function releaseBallAndNextPhase(boss: MegaBoss): { boss: MegaBoss; releasedBall: Ball | null; isDefeated: boolean } {
  const config = MEGA_BOSS_CONFIG;
  
  if (!boss.trappedBall) {
    return { boss, releasedBall: null, isDefeated: false };
  }
  
  const releasedBall: Ball = {
    ...boss.trappedBall,
    x: boss.x + boss.width / 2,
    y: boss.y + boss.height + 15,
    dx: 0,
    dy: 4,
    waitingToLaunch: false
  };
  
  const nextPhase = (boss.corePhase + 1) as MegaBossCorePhase;
  
  // Check if boss is defeated (completed phase 3)
  if (boss.corePhase >= 3) {
    return {
      boss: {
        ...boss,
        trappedBall: null,
        cannonExtended: false,
        currentHealth: 0
      },
      releasedBall,
      isDefeated: true
    };
  }
  
  // Transition to next phase
  const isAngry = nextPhase >= 2;
  const isVeryAngry = nextPhase >= 3;
  const newSpeed = isVeryAngry ? config.veryAngryMoveSpeed : (isAngry ? config.angryMoveSpeed : config.moveSpeed);
  const newAttackInterval = isVeryAngry ? config.veryAngryAttackInterval : (isAngry ? config.angryAttackInterval : config.attackInterval);
  
  return {
    boss: {
      ...boss,
      corePhase: nextPhase,
      outerShieldHP: config.outerShieldHP,
      outerShieldMaxHP: config.outerShieldHP,
      currentHealth: config.outerShieldHP, // For health bar display
      maxHealth: config.outerShieldHP,
      coreExposed: false,
      coreHit: false,
      trappedBall: null,
      cannonExtended: false,
      cannonExtendedTime: null,
      dangerBallsCaught: 0,
      dangerBallsFired: 0,
      scheduledDangerBalls: [],
      isAngry,
      isSuperAngry: isVeryAngry,
      hasResurrected: nextPhase >= 2, // Visual indicator
      speed: newSpeed,
      attackCooldown: newAttackInterval,
      isInvulnerable: true,
      invulnerableUntil: Date.now() + 1500 // Brief invuln after phase change
    },
    releasedBall,
    isDefeated: false
  };
}

// Legacy compatibility functions
export function handleMegaBossDamage(boss: MegaBoss, damage: number): {
  newHealth: number;
  shouldResurrect: boolean;
  isDefeated: boolean;
} {
  // Use the new outer damage system
  const result = handleMegaBossOuterDamage(boss, damage);
  return { 
    newHealth: result.newOuterHP, 
    shouldResurrect: false, 
    isDefeated: false 
  };
}

export function triggerMegaBossResurrection(boss: MegaBoss): MegaBoss {
  // Not used in new system, but kept for compatibility
  return boss;
}

export function openMegaBossHatch(boss: MegaBoss): MegaBoss {
  return exposeMegaBossCore(boss);
}

export function closeMegaBossHatch(boss: MegaBoss): MegaBoss {
  return {
    ...boss,
    hatchOpen: false,
    hatchOpenStartTime: null,
    coreExposed: false
  };
}

export function trapBallInMegaBoss(boss: MegaBoss, ball: Ball): MegaBoss {
  return handleMegaBossCoreHit(boss, ball);
}

export function releaseBallFromMegaBoss(boss: MegaBoss): { boss: MegaBoss; releasedBall: Ball | null } {
  const result = releaseBallAndNextPhase(boss);
  return { boss: result.boss, releasedBall: result.releasedBall };
}

export function getMegaBossPhase(boss: MegaBoss): 1 | 2 | 3 {
  return boss.corePhase;
}

export function shouldOpenHatch(boss: MegaBoss): boolean {
  // In new system, core exposes automatically when outer shield HP reaches 0
  // This function is kept for compatibility but returns false
  return false;
}

// Check if ball enters hatch/core area
export function isBallInHatchArea(ball: Ball, boss: MegaBoss): boolean {
  if (!boss.coreExposed) return false;
  
  // Core is at center of boss
  const coreX = boss.x + boss.width / 2;
  const coreY = boss.y + boss.height / 2;
  const coreRadius = 35; // Larger hit area for the core
  
  const dx = ball.x - coreX;
  const dy = ball.y - coreY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  return dist < coreRadius + ball.radius;
}

// Check if should spawn swarm enemies (phase 3)
export function shouldSpawnSwarm(boss: MegaBoss): boolean {
  if (boss.corePhase < 3) return false;
  
  const config = MEGA_BOSS_CONFIG;
  const now = Date.now();
  
  return now - boss.lastSwarmSpawnTime >= config.swarmSpawnInterval;
}

export function markSwarmSpawned(boss: MegaBoss): MegaBoss {
  return {
    ...boss,
    lastSwarmSpawnTime: Date.now()
  };
}
