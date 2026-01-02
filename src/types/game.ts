export type BrickType = "normal" | "metal" | "cracked" | "explosive";

export interface Brick {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  visible: boolean;
  points: number;
  hasPowerUp?: boolean;
  maxHits: number;
  hitsRemaining: number;
  isIndestructible?: boolean;
  type: BrickType;
}

export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  speed: number;
  id: number;
  isFireball?: boolean;
  waitingToLaunch?: boolean;
  rotation?: number; // For 3D spinning effect
  lastHitTime?: number; // Timestamp of last brick hit
  lastWallHitTime?: number; // Timestamp of last wall hit (for cooldown)
  skipRemainingSubsteps?: boolean; // Exit substep loop after brick hit to prevent tunneling
  isHoming?: boolean; // Ball curves toward boss
  previousY?: number; // Y position before CCD pass (for anti-rescue check)
  lastHitTick?: number; // Frame tick of last paddle hit (for cooldown)
  releasedFromBossTime?: number; // Timestamp when ball was released from Mega Boss
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  hasTurrets?: boolean;
  hasShield?: boolean;
  turretShots?: number;
  hasReflectShield?: boolean;
  hasSuperTurrets?: boolean;
  hasSecondChance?: boolean;
}

export interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  isBounced?: boolean;
  isSuper?: boolean;
}

export type PowerUpType = "multiball" | "turrets" | "fireball" | "life" | "slowdown" | "paddleExtend" | "paddleShrink" | "shield" | "bossStunner" | "reflectShield" | "homingBall" | "secondChance";

export interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  type: PowerUpType;
  speed: number;
  active: boolean;
}

export type EnemyType = "cube" | "sphere" | "pyramid";

export interface Enemy {
  id?: number;
  type: EnemyType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  speed: number;
  dx: number;
  dy: number;
  hits?: number; // For sphere enemies (2 hits to destroy)
  isAngry?: boolean; // For sphere enemies after first hit
}

export type ProjectileType = "bomb" | "rocket" | "pyramidBullet";

export interface Bomb {
  id: number; // Unique bomb identifier for reliable removal
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  enemyId?: number;
  type: ProjectileType;
  dx?: number; // For rockets with magnetic behavior
  dy?: number; // Vertical velocity for homing
  isReflected?: boolean; // Track if bomb is reflected on boss levels
}

export type BonusLetterType = "Q" | "U" | "M" | "R" | "A" | "N";

export interface BonusLetter {
  x: number;
  y: number;
  originX: number; // Original X position for sine wave calculation
  spawnTime: number; // Time when letter was spawned for sine wave phase
  width: number;
  height: number;
  type: BonusLetterType;
  speed: number;
  active: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface ShieldImpact {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export interface Explosion {
  x: number;
  y: number;
  frame: number;
  maxFrames: number;
  enemyType?: EnemyType;
  particles: Particle[];
}

export type BossType = "cube" | "sphere" | "pyramid";
export type BossPhase = "idle" | "moving" | "attacking" | "transitioning" | "defeated";
export type BossAttackType = "shot" | "laser" | "super" | "spiral" | "cross" | "rocket";

export interface Boss {
  id: number;
  type: BossType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  speed: number;
  dx: number;
  dy: number;
  
  // Boss-specific properties
  maxHealth: number;
  currentHealth: number;
  phase: BossPhase;
  currentStage: number;
  isAngry: boolean;
  isSuperAngry: boolean;
  
  // Movement pattern
  targetPosition: { x: number; y: number };
  currentPositionIndex: number;
  positions: Array<{ x: number; y: number }>;
  waitTimeAtPosition: number;
  
  // Attack system
  attackCooldown: number;
  lastAttackTime: number;
  isCharging: boolean;
  
  // Resurrection (for pyramid)
  parentBossId?: number;
  isResurrected?: boolean;
  
  // Boss-local hit cooldown timestamp
  lastHitAt?: number;
  
  // Boss stun
  isStunned?: boolean;
  stunnedUntil?: number;
}

export interface BossAttack {
  bossId: number;
  type: BossAttackType;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  angle?: number;
  damage: number;
  dx?: number;
  dy?: number;
  isReflected?: boolean; // Marked as reflected by reflect shield
}

export type GameState = "ready" | "playing" | "paused" | "gameOver" | "won";

export type Difficulty = "normal" | "godlike";

export interface GameSettings {
  startingLives: number;
  difficulty: Difficulty;
  startingLevel: number;
}
