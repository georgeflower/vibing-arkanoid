export interface Brick {
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
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  hasTurrets?: boolean;
}

export interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  isBounced?: boolean;
}

export type PowerUpType = "multiball" | "turrets" | "fireball" | "life" | "slowdown" | "paddleExtend" | "paddleShrink";

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
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  enemyId?: number;
  type: ProjectileType;
  dx?: number; // For rockets with magnetic behavior
}

export type BonusLetterType = "Q" | "U" | "M" | "R" | "A" | "N";

export interface BonusLetter {
  x: number;
  y: number;
  width: number;
  height: number;
  type: BonusLetterType;
  speed: number;
  active: boolean;
}

export interface Explosion {
  x: number;
  y: number;
  frame: number;
  maxFrames: number;
}

export type GameState = "ready" | "playing" | "paused" | "gameOver" | "won";
