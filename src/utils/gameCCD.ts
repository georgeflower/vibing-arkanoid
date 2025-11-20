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
}

export function processBallWithCCD(
  ball: Ball,
  dt: number,
  gameState: {
    bricks: Brick[];
    paddle: Paddle;
    canvasSize: { w: number; h: number };
    speedMultiplier: number;
    minBrickDimension: number;
    boss?: Boss | null;
    resurrectedBosses?: Boss[];
    enemies?: Enemy[];
  }
): CCDResult {
  // Calculate adaptive substeps based on ball speed
  const ballSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
  const PHYSICS_SUBSTEPS = Math.max(2, Math.ceil(ballSpeed / (gameState.minBrickDimension * 0.15)));

  // Convert game types to CCD types
  const ccdBall: CCDBall = {
    id: ball.id,
    x: ball.x,
    y: ball.y,
    dx: ball.dx * 60 * gameState.speedMultiplier, // Convert px/frame to px/sec and apply multiplier
    dy: ball.dy * 60 * gameState.speedMultiplier,
    radius: ball.radius,
    lastHitTick: ball.lastHitTime
  };

  // Convert bricks to CCD format, including visible bricks
  const ccdBricks: CCDBrick[] = gameState.bricks
    .map((b, index) => ({
      id: index,
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      visible: b.visible
    }))
    .filter(b => b.visible);

  // Add boss as a large brick if present (use negative ID to distinguish from bricks)
  if (gameState.boss) {
    ccdBricks.push({
      id: -1, // Boss ID
      x: gameState.boss.x,
      y: gameState.boss.y,
      width: gameState.boss.width,
      height: gameState.boss.height,
      visible: true
    });
  }

  // Add resurrected bosses as bricks (use negative IDs)
  if (gameState.resurrectedBosses) {
    gameState.resurrectedBosses.forEach((resBoss, idx) => {
      ccdBricks.push({
        id: -(idx + 2), // Resurrected boss IDs: -2, -3, -4
        x: resBoss.x,
        y: resBoss.y,
        width: resBoss.width,
        height: resBoss.height,
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

  const ccdPaddle: CCDPaddle = {
    x: gameState.paddle.x,
    y: gameState.paddle.y,
    width: gameState.paddle.width,
    height: gameState.paddle.height
  };

  // Run CCD
  const result = processBallCCD(ccdBall, {
    dt,
    substeps: PHYSICS_SUBSTEPS,
    maxToiIterations: 3,
    epsilon: 0.5, // Small separation after collision
    minBrickDimension: gameState.minBrickDimension,
    paddle: ccdPaddle,
    bricks: ccdBricks,
    canvasSize: gameState.canvasSize,
    currentTick: Date.now(),
    maxSubstepTravelFactor: 0.9
  });

  // Calculate collision count and max TOI iterations from debug data
  const collisionCount = result.events.length;
  const toiIterationsUsed = result.debug && Array.isArray(result.debug) 
    ? Math.max(...result.debug.map((d: any) => d.iter || 0), 0)
    : 0;

  // Convert result back to game types
  if (!result.ball) {
    return {
      ball: null,
      events: result.events,
      debug: result.debug,
      substepsUsed: PHYSICS_SUBSTEPS,
      maxIterations: 3,
      collisionCount,
      toiIterationsUsed
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

  return {
    ball: updatedBall,
    events: result.events,
    debug: result.debug,
    substepsUsed: PHYSICS_SUBSTEPS,
    maxIterations: 3,
    collisionCount,
    toiIterationsUsed
  };
}
