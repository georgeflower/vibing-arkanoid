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

export type GameState = "ready" | "playing" | "paused" | "gameOver" | "won";
