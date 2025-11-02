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

export interface Enemy {
  id?: number;
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
}

export interface Bomb {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  enemyId?: number;
}

export interface Explosion {
  x: number;
  y: number;
  frame: number;
  maxFrames: number;
}

export type GameState = "ready" | "playing" | "paused" | "gameOver" | "won";
