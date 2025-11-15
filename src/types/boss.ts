export type BossState = "idle" | "moving" | "attacking" | "stunned" | "angry" | "dead";

export type BossMovementPattern = 
  | "horizontalSweep"
  | "zigzagDescent"
  | "cornerDarts"
  | "centerBob"
  | "spiralOrbit"
  | "waveSweep"
  | "telegraphedDive"
  | "patrolLanes"
  | "randomWaypoints";

export type BossAttackType = "laser" | "missile" | "homingMissile";

export interface BossConfig {
  id: string;
  maxHealth: number;
  baseSpeed: number;
  movementSpeedMultiplier: number;
  attackRateMultiplier: number;
  angryMultiplier: number;
  attackIntervalBase: number;
  laserSpeed: number;
  missileSpeed: number;
  homingStrength: number;
  telegraphMs: number;
  stunMs: number;
  patternDurationRange: [number, number];
  missileCountRange: [number, number];
  maxActiveProjectiles: number;
}

export interface BossProjectile {
  x: number;
  y: number;
  width: number;
  height: number;
  dx: number;
  dy: number;
  type: BossAttackType;
  speed: number;
  rotation: number;
  spinFrame?: number;
  isHoming?: boolean;
}

export interface BossWaypoint {
  x: number;
  y: number;
  pauseMs: number;
  action?: "shoot" | "dropMissile" | "charge";
}

export interface BossAnimation {
  currentFrame: string;
  frameTime: number;
  lastFrameChange: number;
}

export interface Boss {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  state: BossState;
  currentHealth: number;
  maxHealth: number;
  cyclesCompleted: number;
  isAngry: boolean;
  currentPattern: BossMovementPattern;
  patternStartTime: number;
  patternWaypoints: BossWaypoint[];
  currentWaypointIndex: number;
  lastAttackTime: number;
  config: BossConfig;
  animation: BossAnimation;
  velocity: { dx: number; dy: number };
  lastHitTime: number;
  isBlinking: boolean;
  lastBlinkTime: number;
  isTelegraphing: boolean;
  telegraphStartTime: number;
  hitFlashTime: number;
}

export interface BossDebugInfo {
  bossMode: BossState;
  bossPatternIndex: number;
  bossHealth: number;
  bossCyclesCompleted: number;
  layoutMode: string;
  bossDebugVisuals: boolean;
  readyTapStart: string;
}
