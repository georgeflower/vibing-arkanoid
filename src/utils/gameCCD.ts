import { processBallCCD, Ball as CCDBall, Brick as CCDBrick, Paddle as CCDPaddle, CollisionEvent } from './processBallCCD';
import { Brick, Ball, Paddle, Boss, Enemy } from '@/types/game';

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
  // Start total performance timer
  const perfStart = performance.now();
  
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
  
  // Boss-first sweep timing (currently we don't have a separate boss sweep phase)
  // This is a placeholder for when boss collision is separate from CCD
  const bossFirstSweepStart = performance.now();
  // No boss sweep currently - handled in Game.tsx before CCD
  const bossFirstSweepEnd = performance.now();

  // Convert game types to CCD types
  const ccdBall: CCDBall = {
    id: ball.id,
    x: ball.x,
    y: ball.y,
    dx: ball.dx * 60 * gameState.speedMultiplier, // Convert px/frame to px/sec and apply multiplier
    dy: ball.dy * 60 * gameState.speedMultiplier,
    radius: ball.radius,
    lastHitTick: ball.lastHitTime,
    isFireball: !!ball.isFireball // Propagate fireball flag to CCD system
  };

  // Convert bricks to CCD format, using actual brick IDs and metadata
  const ccdBricks: CCDBrick[] = gameState.bricks
    .map((b) => ({
      id: b.id, // Use actual brick ID instead of array index
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      visible: b.visible,
      isIndestructible: b.isIndestructible // Pass indestructible flag for fireball logic
    }))
    .filter(b => b.visible);

  // Boss collision is now handled by explicit shape-specific collision checks in Game.tsx
  // (CCD cannot handle rotating shapes like cube and pyramid)
  // Boss has been removed from CCD system

  // Add resurrected bosses as bricks (use negative IDs)
  // Resurrected bosses also use TOP-LEFT coordinates
  if (gameState.resurrectedBosses) {
    const HITBOX_MARGIN = 2;
    gameState.resurrectedBosses.forEach((resBoss, idx) => {
      ccdBricks.push({
        id: -(idx + 2), // Resurrected boss IDs: -2, -3, -4
        x: resBoss.x + HITBOX_MARGIN,
        y: resBoss.y + HITBOX_MARGIN,
        width: resBoss.width - 2 * HITBOX_MARGIN,
        height: resBoss.height - 2 * HITBOX_MARGIN,
        visible: true
      });
    });
  }

  // Add enemies as small bricks (use large positive IDs to avoid collision with brick indices)
  if (gameState.enemies) {
    gameState.enemies.forEach((enemy, idx) => {
      ccdBricks.push({
        id: 100000 + idx, // Enemy IDs: 100000+
        x: enemy.x,
        y: enemy.y,
        width: enemy.width,
        height: enemy.height,
        visible: true
      });
    });
  }

  // Convert paddle to CCD format
  const ccdPaddle = {
    id: 0,
    x: gameState.paddle.x,
    y: gameState.paddle.y,
    width: gameState.paddle.width,
    height: gameState.paddle.height
  };
  
  // CCD core timing
  const ccdCoreStart = performance.now();
  
  // Run CCD with paddle included
  const result = processBallCCD(ccdBall, {
    dt: dtSeconds, // Pass seconds, not milliseconds
    substeps: PHYSICS_SUBSTEPS,
    maxToiIterations: 3,
    epsilon: 0.5, // Small separation after collision
    minBrickDimension: gameState.minBrickDimension,
    paddle: ccdPaddle, // Re-included in CCD
    bricks: ccdBricks,
    canvasSize: gameState.canvasSize,
    currentTick: frameTick, // Pass deterministic frame tick
    maxSubstepTravelFactor: 0.9
  });
  
  const ccdCoreEnd = performance.now();
  
  // Post-processing timing
  const postProcessingStart = performance.now();

  // Calculate collision count and max TOI iterations from debug data
  const collisionCount = result.events.length;
  const toiIterationsUsed = result.debug && Array.isArray(result.debug) 
    ? Math.max(...result.debug.map((d: any) => d.iter || 0), 0)
    : 0;

  // Convert result back to game types
  if (!result.ball) {
    const postProcessingEnd = performance.now();
    const perfEnd = performance.now();
    
    return {
      ball: null,
      events: result.events,
      debug: result.debug,
      substepsUsed: PHYSICS_SUBSTEPS,
      maxIterations: 3,
      collisionCount,
      toiIterationsUsed,
      performance: {
        bossFirstSweepMs: bossFirstSweepEnd - bossFirstSweepStart,
        ccdCoreMs: ccdCoreEnd - ccdCoreStart,
        postProcessingMs: postProcessingEnd - postProcessingStart,
        totalMs: perfEnd - perfStart
      }
    };
  }

  const updatedBall: Ball = {
    ...ball,
    x: result.ball.x,
    y: result.ball.y,
    dx: result.ball.dx / (60 * gameState.speedMultiplier), // Convert px/sec back to px/frame
    dy: result.ball.dy / (60 * gameState.speedMultiplier),
    lastHitTime: result.ball.lastHitTick
  };
  
  const postProcessingEnd = performance.now();
  const perfEnd = performance.now();

  return {
    ball: updatedBall,
    events: result.events,
    debug: result.debug,
    substepsUsed: PHYSICS_SUBSTEPS,
    maxIterations: 3,
    collisionCount,
    toiIterationsUsed,
    performance: {
      bossFirstSweepMs: bossFirstSweepEnd - bossFirstSweepStart,
      ccdCoreMs: ccdCoreEnd - ccdCoreStart,
      postProcessingMs: postProcessingEnd - postProcessingStart,
      totalMs: perfEnd - perfStart
    }
  };
}
