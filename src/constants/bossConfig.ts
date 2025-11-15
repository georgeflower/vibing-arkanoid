import type { BossConfig } from "@/types/boss";

export const DEFAULT_BOSS_CONFIG: BossConfig = {
  id: "boss_alpha",
  maxHealth: 10,
  baseSpeed: 80, // pixels per second
  movementSpeedMultiplier: 1.4, // Applied in angry mode
  attackRateMultiplier: 1.35, // Applied in angry mode
  angryMultiplier: 1.2, // Animation frame rate multiplier
  attackIntervalBase: 2000, // ms between attacks
  laserSpeed: 300, // pixels per second
  missileSpeed: 150, // pixels per second
  homingStrength: 0.3, // 0-1, strength of homing behavior
  telegraphMs: 250, // Telegraph time before laser
  stunMs: 110, // Stun duration on hit
  patternDurationRange: [4000, 8000], // min/max ms per pattern
  missileCountRange: [1, 3], // min/max missiles per drop
  maxActiveProjectiles: 6,
};

export const BOSS_BOUNDS = {
  topPercent: 0.10,
  bottomPercent: 0.45,
  leftPadding: 50,
  rightPadding: 50,
};

export const BOSS_SIZE = {
  width: 120,
  height: 100,
};

// Sprite coordinates in the sprite sheet (approximate based on visual inspection)
export const BOSS_SPRITE_COORDS = {
  idle: { x: 0, y: 0, w: 80, h: 60 },
  angry: { x: 80, y: 0, w: 80, h: 60 },
  leftArm: { x: 160, y: 0, w: 80, h: 60 },
  rightArm: { x: 0, y: 60, w: 80, h: 60 },
  blink: { x: 240, y: 0, w: 80, h: 60 },
  blinkAngry: { x: 80, y: 60, w: 80, h: 60 },
  projectileLaser: { x: 0, y: 120, w: 32, h: 32 },
  projectileMissile: { x: 32, y: 120, w: 40, h: 24 },
  missileSpin1: { x: 72, y: 120, w: 32, h: 32 },
  missileSpin2: { x: 104, y: 120, w: 32, h: 32 },
  missileSpin3: { x: 136, y: 120, w: 32, h: 32 },
  explosionHit: { x: 0, y: 152, w: 48, h: 48 },
  explosionLarge: { x: 48, y: 152, w: 64, h: 64 },
  explosionAlt: { x: 112, y: 152, w: 48, h: 48 },
};
