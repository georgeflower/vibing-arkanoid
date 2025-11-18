import type { Boss, BossType } from "@/types/game";
import { BOSS_CONFIG, BOSS_POSITIONS } from "@/constants/bossConfig";

export function createBoss(level: number, canvasWidth: number, canvasHeight: number): Boss | null {
  let bossType: BossType;
  let config;
  
  if (level === 5) {
    bossType = 'cube';
    config = BOSS_CONFIG.cube;
  } else if (level === 10) {
    bossType = 'sphere';
    config = BOSS_CONFIG.sphere;
  } else if (level === 15) {
    bossType = 'pyramid';
    config = BOSS_CONFIG.pyramid;
  } else {
    return null;
  }
  
  const positions = BOSS_POSITIONS.map(pos => ({
    x: pos.x * canvasWidth - config.size / 2,
    y: pos.y * canvasHeight - config.size / 2
  }));
  
  const maxHealth = bossType === 'cube' 
    ? config.health 
    : ('healthPhase1' in config && 'healthPhase2' in config 
        ? config.healthPhase1 + config.healthPhase2 
        : 20);
  
  const currentHealth = bossType === 'cube' 
    ? config.health 
    : ('healthPhase1' in config ? config.healthPhase1 : 10);
  
  return {
    id: Date.now(),
    type: bossType,
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
    maxHealth,
    currentHealth,
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
    isCharging: false
  };
}

export function createResurrectedPyramid(
  parentBoss: Boss, 
  index: number, 
  canvasWidth: number, 
  canvasHeight: number
): Boss {
  const config = BOSS_CONFIG.pyramid;
  const angleOffset = (index * 120) * (Math.PI / 180);
  const spawnRadius = 60;
  
  return {
    id: Date.now() + index,
    type: 'pyramid',
    x: parentBoss.x + Math.cos(angleOffset) * spawnRadius,
    y: parentBoss.y + Math.sin(angleOffset) * spawnRadius,
    width: config.resurrectedSize,
    height: config.resurrectedSize,
    rotation: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    speed: config.angryMoveSpeed,
    dx: Math.cos(angleOffset) * 2,
    dy: Math.sin(angleOffset) * 2,
    maxHealth: config.resurrectedHealth,
    currentHealth: config.resurrectedHealth,
    phase: 'moving',
    currentStage: 2,
    isAngry: true,
    isSuperAngry: false,
    targetPosition: parentBoss.positions[Math.floor(Math.random() * 9)],
    currentPositionIndex: Math.floor(Math.random() * 9),
    positions: parentBoss.positions,
    waitTimeAtPosition: 0,
    attackCooldown: config.attackInterval * 0.7,
    lastAttackTime: Date.now(),
    isCharging: false,
    parentBossId: parentBoss.id,
    isResurrected: true
  };
}
