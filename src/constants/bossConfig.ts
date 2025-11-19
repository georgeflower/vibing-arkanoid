export const BOSS_LEVELS = [5, 10, 15];

export const BOSS_CONFIG = {
  cube: {
    level: 5,
    size: 80,
    health: 10,
    positions: 9,
    moveSpeed: 2.5,
    attackTypes: ['shot', 'super'] as const,
    attackInterval: 3000,
    points: 5000
  },
  sphere: {
    level: 10,
    size: 90,
    healthPhase1: 10,
    healthPhase2: 10,
    positions: 9,
    moveSpeed: 2.0,
    angryMoveSpeed: 3.5,
    attackTypes: ['shot', 'laser', 'super'] as const,
    attackInterval: 2500,
    points: 10000
  },
  pyramid: {
    level: 15,
    size: 100,
    healthPhase1: 10,
    healthPhase2: 10,
    resurrections: 3,
    resurrectedSize: 50,
    resurrectedHealth: 5,
    positions: 9,
    moveSpeed: 1.8,
    angryMoveSpeed: 3.0,
    superAngryMoveSpeed: 4.5,
    attackTypes: ['shot', 'laser', 'super', 'spiral', 'cross'] as const,
    attackInterval: 1500,
    points: 20000,
    resurrectedPoints: 3000
  }
} as const;

export const BOSS_POSITIONS = [
  { x: 0.15, y: 0.2 },
  { x: 0.5, y: 0.15 },
  { x: 0.85, y: 0.2 },
  { x: 0.2, y: 0.4 },
  { x: 0.5, y: 0.35 },
  { x: 0.8, y: 0.4 },
  { x: 0.15, y: 0.6 },
  { x: 0.5, y: 0.55 },
  { x: 0.85, y: 0.6 }
];

export const ATTACK_PATTERNS = {
  shot: {
    count: 1,
    speed: 4,
    size: 12
  },
  laser: {
    width: 8,
    height: 400,
    duration: 1000,
    warningDuration: 800,
    speed: 0
  },
  super: {
    count: 12,
    speed: 3.5,
    size: 10,
    spreadAngle: 360
  },
  spiral: {
    count: 16,
    speed: 3.0,
    size: 10,
    rotationSpeed: 0.3
  },
  cross: {
    count: 4,
    speed: 4.5,
    size: 12,
    directions: [0, 90, 180, 270]
  }
} as const;
