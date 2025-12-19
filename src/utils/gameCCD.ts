import { processBallCCD, Ball as CCDBall, Brick as CCDBrick, Paddle as CCDPaddle, CollisionEvent } from './processBallCCD';
import { Brick, Ball, Paddle, Boss, Enemy } from '@/types/game';

// Debug flag - set to false for production
const ENABLE_CCD_PROFILING = false;

export interface CCDResult {
  ball: Ball | null;
  events: CollisionEvent[];
  debug?: any;
  substepsUsed: number;
  maxIterations: number;
  collisionCount: number;
  toiIterationsUsed: number;
  performance?: {
    bossFirstSweepMs: number;
    ccdCoreMs: number;
    postProcessingMs: number;
    totalMs: number;
  };
}

// Pre-allocated brick pool to avoid per-frame allocations
const BRICK_POOL_SIZE = 250;
const reusableCCDBricks: CCDBrick[] = [];

// Initialize pool once
for (let i = 0; i < BRICK_POOL_SIZE; i++) {
  reusableCCDBricks.push({
    id: 0,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false,
    isIndestructible: false
  });
}

// Pre-allocated CCD conversion objects (Phase 2 optimization)
const reusableCCDBall: CCDBall = {
  id: 0,
  x: 0,
  y: 0,
  dx: 0,
  dy: 0,
  radius: 0,
  lastHitTick: 0,
  isFireball: false
};

const reusableCCDPaddle: CCDPaddle = {
  id: 0,
  x: 0,
  y: 0,
  width: 0,
  height: 0
};

// Pre-allocated result object (reused each frame)
const reusableResult: CCDResult = {
  ball: null,
  events: [],
  debug: undefined,
  substepsUsed: 0,
  maxIterations: 3,
  collisionCount: 0,
  toiIterationsUsed: 0,
  performance: {
    bossFirstSweepMs: 0,
    ccdCoreMs: 0,
    postProcessingMs: 0,
    totalMs: 0
  }
};

// NOTE: We intentionally create a fresh Ball object per call instead of reusing one.
// Sharing a single reusableReturnBall caused multiball synchronization bugs where
// all balls would share the same position/velocity state.

export function processBallWithCCD(
  ball: Ball,
  dtSeconds: number, // Changed from dt (ms) to dtSeconds
  frameTick: number, // Added deterministic frame counter
  gameState: {
    bricks: Brick[];
    paddle: Paddle;
    canvasSize: { w: number; h: number };
    speedMultiplier: number;
    minBrickDimension: number;
    boss?: Boss | null;
    resurrectedBosses?: Boss[];
    enemies?: Enemy[];
    qualityLevel?: 'low' | 'medium' | 'high';
  }
): CCDResult {
  // Only profile when enabled (Phase 5: throttle performance.now() calls)
  const perfStart = ENABLE_CCD_PROFILING ? performance.now() : 0;
  
  // Quality-aware substep limits
  const qualitySubstepCaps = {
    low: 8,
    medium: 12,
    high: 20
  };
  const MAX_SUBSTEPS = qualitySubstepCaps[gameState.qualityLevel || 'high'];
  
  // Calculate adaptive substeps based on ball speed
  const ballSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
  const desiredSubsteps = Math.ceil(ballSpeed * gameState.speedMultiplier / (gameState.minBrickDimension * 0.15));
  const PHYSICS_SUBSTEPS = Math.max(2, Math.min(desiredSubsteps, MAX_SUBSTEPS));
  
  // Log high substep counts for debugging (throttled)
  if (ENABLE_CCD_PROFILING && PHYSICS_SUBSTEPS > 12) {
    console.warn(`[CCD] High substeps: ${PHYSICS_SUBSTEPS}, ballSpeed: ${ballSpeed.toFixed(2)}, speedMult: ${gameState.speedMultiplier.toFixed(2)}, quality: ${gameState.qualityLevel}`);
  }
  
  // Boss-first sweep timing - only when profiling enabled
  const bossFirstSweepStart = ENABLE_CCD_PROFILING ? performance.now() : 0;
  // No boss sweep currently - handled in Game.tsx before CCD
  const bossFirstSweepEnd = ENABLE_CCD_PROFILING ? performance.now() : 0;

  // Populate reusable CCD ball in-place (Phase 2: no object allocation)
  reusableCCDBall.id = ball.id;
  reusableCCDBall.x = ball.x;
  reusableCCDBall.y = ball.y;
  reusableCCDBall.dx = ball.dx * 60 * gameState.speedMultiplier; // Convert px/frame to px/sec
  reusableCCDBall.dy = ball.dy * 60 * gameState.speedMultiplier;
  reusableCCDBall.radius = ball.radius;
  reusableCCDBall.lastHitTick = ball.lastHitTime;
  reusableCCDBall.isFireball = !!ball.isFireball;

  // Populate reusable brick pool in-place (no new object creation)
  let brickIndex = 0;
  const gameBricks = gameState.bricks;
  for (let i = 0; i < gameBricks.length && brickIndex < BRICK_POOL_SIZE; i++) {
    const b = gameBricks[i];
    if (!b.visible) continue;
    
    const ccdBrick = reusableCCDBricks[brickIndex];
    ccdBrick.id = b.id;
    ccdBrick.x = b.x;
    ccdBrick.y = b.y;
    ccdBrick.width = b.width;
    ccdBrick.height = b.height;
    ccdBrick.visible = true;
    ccdBrick.isIndestructible = b.isIndestructible;
    brickIndex++;
  }
  
  // Use the pool directly - resurrected bosses and enemies will be added after the brick index
  // This avoids creating a new array with slice()
  const ccdBricks = reusableCCDBricks;
  let totalBrickCount = brickIndex;

  // Boss collision is now handled by explicit shape-specific collision checks in Game.tsx
  // (CCD cannot handle rotating shapes like cube and pyramid)
  // Boss has been removed from CCD system

  // Add resurrected bosses as bricks (use negative IDs)
  // Resurrected bosses also use TOP-LEFT coordinates
  if (gameState.resurrectedBosses && totalBrickCount < BRICK_POOL_SIZE) {
    const HITBOX_MARGIN = 2;
    for (let idx = 0; idx < gameState.resurrectedBosses.length && totalBrickCount < BRICK_POOL_SIZE; idx++) {
      const resBoss = gameState.resurrectedBosses[idx];
      const ccdBrick = reusableCCDBricks[totalBrickCount];
      ccdBrick.id = -(idx + 2); // Resurrected boss IDs: -2, -3, -4
      ccdBrick.x = resBoss.x + HITBOX_MARGIN;
      ccdBrick.y = resBoss.y + HITBOX_MARGIN;
      ccdBrick.width = resBoss.width - 2 * HITBOX_MARGIN;
      ccdBrick.height = resBoss.height - 2 * HITBOX_MARGIN;
      ccdBrick.visible = true;
      ccdBrick.isIndestructible = false;
      totalBrickCount++;
    }
  }

  // Add enemies as small bricks (use large positive IDs to avoid collision with brick indices)
  if (gameState.enemies && totalBrickCount < BRICK_POOL_SIZE) {
    for (let idx = 0; idx < gameState.enemies.length && totalBrickCount < BRICK_POOL_SIZE; idx++) {
      const enemy = gameState.enemies[idx];
      const ccdBrick = reusableCCDBricks[totalBrickCount];
      ccdBrick.id = 100000 + idx; // Enemy IDs: 100000+
      ccdBrick.x = enemy.x;
      ccdBrick.y = enemy.y;
      ccdBrick.width = enemy.width;
      ccdBrick.height = enemy.height;
      ccdBrick.visible = true;
      ccdBrick.isIndestructible = false;
      totalBrickCount++;
    }
  }

  // Populate reusable paddle in-place (Phase 2: no object allocation)
  reusableCCDPaddle.id = 0;
  reusableCCDPaddle.x = gameState.paddle.x;
  reusableCCDPaddle.y = gameState.paddle.y;
  reusableCCDPaddle.width = gameState.paddle.width;
  reusableCCDPaddle.height = gameState.paddle.height;
  
  // CCD core timing - only when profiling enabled
  const ccdCoreStart = ENABLE_CCD_PROFILING ? performance.now() : 0;
  
  // Run CCD with paddle included
  // Pass brickCount directly to avoid .slice() allocation
  const result = processBallCCD(reusableCCDBall, {
    dt: dtSeconds, // Pass seconds, not milliseconds
    substeps: PHYSICS_SUBSTEPS,
    maxToiIterations: 3,
    epsilon: 0.5, // Small separation after collision
    minBrickDimension: gameState.minBrickDimension,
    paddle: reusableCCDPaddle, // Use pre-allocated paddle
    bricks: ccdBricks, // Pass full pool
    brickCount: totalBrickCount, // Limit to valid bricks only
    canvasSize: gameState.canvasSize,
    currentTick: frameTick, // Pass deterministic frame tick
    maxSubstepTravelFactor: 0.9
  });
  
  const ccdCoreEnd = ENABLE_CCD_PROFILING ? performance.now() : 0;
  
  // Post-processing timing - only when profiling enabled
  const postProcessingStart = ENABLE_CCD_PROFILING ? performance.now() : 0;

  // Calculate collision count and max TOI iterations from debug data
  const collisionCount = result.events.length;
  const toiIterationsUsed = result.debug && Array.isArray(result.debug) 
    ? Math.max(...result.debug.map((d: any) => d.iter || 0), 0)
    : 0;

  // Convert result back to game types
  if (!result.ball) {
    const postProcessingEnd = ENABLE_CCD_PROFILING ? performance.now() : 0;
    const perfEnd = ENABLE_CCD_PROFILING ? performance.now() : 0;
    
    // Populate reusable result in-place
    reusableResult.ball = null;
    reusableResult.events = result.events;
    reusableResult.debug = result.debug;
    reusableResult.substepsUsed = PHYSICS_SUBSTEPS;
    reusableResult.maxIterations = 3;
    reusableResult.collisionCount = collisionCount;
    reusableResult.toiIterationsUsed = toiIterationsUsed;
    if (ENABLE_CCD_PROFILING && reusableResult.performance) {
      reusableResult.performance.bossFirstSweepMs = bossFirstSweepEnd - bossFirstSweepStart;
      reusableResult.performance.ccdCoreMs = ccdCoreEnd - ccdCoreStart;
      reusableResult.performance.postProcessingMs = postProcessingEnd - postProcessingStart;
      reusableResult.performance.totalMs = perfEnd - perfStart;
    }
    return reusableResult;
  }

  // Create a fresh Ball object for each call to avoid multiball synchronization bugs
  const returnBall: Ball = {
    id: ball.id,
    x: result.ball.x,
    y: result.ball.y,
    dx: result.ball.dx / (60 * gameState.speedMultiplier), // Convert px/sec back to px/frame
    dy: result.ball.dy / (60 * gameState.speedMultiplier),
    radius: ball.radius,
    speed: ball.speed,
    isFireball: ball.isFireball,
    lastHitTime: result.ball.lastHitTick,
    waitingToLaunch: ball.waitingToLaunch
  };
  
  const postProcessingEnd = ENABLE_CCD_PROFILING ? performance.now() : 0;
  const perfEnd = ENABLE_CCD_PROFILING ? performance.now() : 0;

  // Populate reusable result in-place
  reusableResult.ball = returnBall;
  reusableResult.events = result.events;
  reusableResult.debug = result.debug;
  reusableResult.substepsUsed = PHYSICS_SUBSTEPS;
  reusableResult.maxIterations = 3;
  reusableResult.collisionCount = collisionCount;
  reusableResult.toiIterationsUsed = toiIterationsUsed;
  if (ENABLE_CCD_PROFILING && reusableResult.performance) {
    reusableResult.performance.bossFirstSweepMs = bossFirstSweepEnd - bossFirstSweepStart;
    reusableResult.performance.ccdCoreMs = ccdCoreEnd - ccdCoreStart;
    reusableResult.performance.postProcessingMs = postProcessingEnd - postProcessingStart;
    reusableResult.performance.totalMs = perfEnd - perfStart;
  }
  return reusableResult;
}
