import { processBallCCD, Ball as CCDBall, Brick as CCDBrick, Paddle as CCDPaddle, CollisionEvent } from './processBallCCD';
import { Brick, Ball, Paddle } from '@/types/game';

export interface CCDResult {
  ball: Ball | null;
  events: CollisionEvent[];
  debug?: any;
  substepsUsed: number;
  maxIterations: number;
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

  // Convert result back to game types
  if (!result.ball) {
    return {
      ball: null,
      events: result.events,
      debug: result.debug,
      substepsUsed: PHYSICS_SUBSTEPS,
      maxIterations: 3
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
    maxIterations: 3
  };
}
